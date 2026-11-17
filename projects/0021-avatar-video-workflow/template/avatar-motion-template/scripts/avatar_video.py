"""Config-driven presenter postproduction. No generation API or speech replacement."""
from __future__ import annotations
import argparse,copy,datetime,hashlib,importlib.util,json,math,os,re,shutil,subprocess,sys
from pathlib import Path

SKILL=Path(__file__).resolve().parents[1]
W,H=1280,720

def read_json(path):return json.loads(Path(path).read_text(encoding='utf-8-sig'))
def write_json(path,obj):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        for data in iter(lambda:f.read(1024*1024),b''):h.update(data)
    return h.hexdigest()
def fingerprint(obj):return hashlib.sha256(json.dumps(obj,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:20]
def probe(path):
    result=subprocess.run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)],check=True,capture_output=True,text=True)
    return json.loads(result.stdout)
def resolved(value,base):
    path=Path(os.path.expandvars(os.path.expanduser(str(value))))
    return path.resolve() if path.is_absolute() else (Path(base)/path).resolve()
def log(message):print(message,flush=True)
def finite(value,label):
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value):raise ValueError(f'{label} must be finite numeric')
    return value

def parse_srt(path):
    def seconds(value):
        h,m,s,ms=map(int,re.split('[:,.]',value));return h*3600+m*60+s+ms/1000
    result=[]
    for block in re.split(r'\n\s*\n',Path(path).read_text(encoding='utf-8-sig').strip().replace('\r','')):
        lines=block.splitlines();idx=next((i for i,x in enumerate(lines) if '-->' in x),None)
        if idx is None:raise ValueError('SRT block lacks a timestamp')
        match=re.fullmatch(r'\s*(\d+:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d+:\d{2}:\d{2}[,.]\d{3})\s*',lines[idx])
        if not match:raise ValueError(f'Unsupported SRT timestamp: {lines[idx]}')
        result.append({'start':seconds(match[1]),'end':seconds(match[2]),'text':'\n'.join(lines[idx+1:])})
    return result

def validate(cfg):
    if cfg.get('schema_version')!=1:raise ValueError('schema_version must be 1')
    src=cfg['source'];duration=finite(src['duration_seconds'],'duration')
    if not 5<=duration<=180:raise ValueError('Duration must be between 5 and 180 seconds')
    if finite(src['start_seconds'],'start')<0:raise ValueError('start_seconds must be nonnegative')
    fps=cfg['output']['fps']
    if isinstance(fps,bool) or not isinstance(fps,int) or not 12<=fps<=60:raise ValueError('fps must be an integer in 12–60')
    crop=src.get('crop')
    if crop is not None:
        if len(crop)!=4 or any(not 0<=finite(x,'crop')<=1 for x in crop) or crop[0]>=crop[2] or crop[1]>=crop[3]:raise ValueError('crop is normalized [left,top,right,bottom] within the letterboxed 1280×720 frame')
    positions=[0]+[finite(cfg['timeline'][k],k) for k in ('reveal','reveal_done','city','city_done','keywords','keywords_done','outro')]+[1]
    if any(a>=b for a,b in zip(positions,positions[1:])):raise ValueError('Timeline ratios must strictly increase between 0 and 1')
    for k in ('paper','ink','accent','screen'):
        if not re.fullmatch('#[0-9a-fA-F]{6}',cfg['style'][k]):raise ValueError(f'Invalid style color: {k}')
    for k in ('pink','cyan','gold'):
        if not re.fullmatch('#[0-9a-fA-F]{6}',cfg['scene'][k]):raise ValueError(f'Invalid scene color: {k}')
    if cfg['scene']['device'] not in ('auto','cpu','optix','cuda'):raise ValueError('scene.device must be auto/cpu/optix/cuda')
    if not 1<=finite(cfg['scene']['samples'],'samples')<=4096:raise ValueError('samples must be 1–4096')
    for k in ('camera_near','camera_far'):
        if len(cfg['scene'][k])!=3:raise ValueError(f'{k} must contain xyz')
        for x in cfg['scene'][k]:finite(x,k)
    if not .1<=finite(cfg['matting']['downsample_ratio'],'downsample_ratio')<=1:raise ValueError('Matting downsample_ratio must be .1–1')
    if not 0<=finite(cfg['style']['outline_pixels'],'outline_pixels')<=30:raise ValueError('outline_pixels must be 0–30')
    for x in cfg['matting']['reset_at_seconds']:
        if not 0<=finite(x,'reset')<duration:raise ValueError('Matting resets must lie within the clip')
    cp=cfg['copy']
    for k,length in (('title_lines',2),('outro_lines',2),('chips',3),('keywords',3)):
        if len(cp[k])!=length or any(not isinstance(x,str) or not x.strip() for x in cp[k]):raise ValueError(f'copy.{k} requires {length} nonempty strings')
    if cp['caption_kind'] not in ('effect_demo','transcript'):raise ValueError('caption_kind must be effect_demo or transcript')
    if cp['caption_kind']=='effect_demo' and not cp['footer'].strip():raise ValueError('Effect captions need an explicit footer distinguishing them from speech')
    last=0.
    for c in cp['captions']:
        start=finite(c['start'],'caption start');end=finite(c['end'],'caption end')
        if not last<=start<end<=duration+1e-6:raise ValueError('Captions must be ordered, nonoverlapping and inside clip duration')
        if not isinstance(c['text'],str) or not c['text'].strip():raise ValueError('Caption text cannot be empty')
        last=end
    return cfg

def load_config(path):
    cfg=read_json(path);validate(cfg);base=Path(path).resolve().parent
    cfg['source']['video']=str(resolved(cfg['source']['video'],base))
    cfg['output']['directory']=str(resolved(cfg['output']['directory'],base))
    if cfg['runtime'].get('profile'):
        profile=read_json(resolved(cfg['runtime']['profile'],base))
        cfg['runtime']={**profile,**{k:v for k,v in cfg['runtime'].items() if v and k!='profile'}}
    local=SKILL/'references'/'local-runtime.json'
    defaults=read_json(local) if local.is_file() else {}
    for key,env in [('model','AVATAR_RVM_MODEL'),('blender','AVATAR_BLENDER')]:
        value=cfg['runtime'].get(key) or os.environ.get(env) or defaults.get(key)
        if not value and key=='blender':value=shutil.which('blender')
        if not value:raise ValueError(f'Provide runtime.{key} or {env}')
        cfg['runtime'][key]=str(resolved(value,base))
    fonts={'font_regular':['C:/Windows/Fonts/msyh.ttc','/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'],
           'font_bold':['C:/Windows/Fonts/msyhbd.ttc','/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc']}
    for key,candidates in fonts.items():
        value=cfg['style'].get(key) or cfg['runtime'].get(key) or defaults.get(key) or next((p for p in candidates if Path(p).is_file()),'')
        if not value:raise ValueError(f'Provide a Chinese-capable {key}')
        cfg['runtime'][key]=str(resolved(value,base))
    for key in ('model','blender','font_regular','font_bold'):
        if not Path(cfg['runtime'][key]).is_file():raise ValueError(f'File missing: runtime.{key}')
    if not Path(cfg['source']['video']).is_file():raise ValueError('Source video missing')
    for tool in ('ffmpeg','ffprobe'):
        if not shutil.which(tool):raise ValueError(f'{tool} is not in PATH')
    return cfg

def timing(cfg):
    fps=cfg['output']['fps'];n=round(cfg['source']['duration_seconds']*fps)
    return {**{k:round(v*n) for k,v in cfg['timeline'].items()},'frames':n,'fps':fps,'duration':n/fps}

def init_job(args):
    dest=Path(args.job_dir).resolve();config=dest/'project.json'
    if config.exists():raise ValueError('project.json already exists; choose a new job directory')
    cfg=read_json(SKILL/'assets'/'preset.json');info=probe(Path(args.video).resolve())
    duration=float(info['format']['duration'])-args.start
    wanted=args.duration if args.duration is not None else min(10,duration)
    cfg['source'].update(video=str(Path(args.video).resolve()),start_seconds=args.start,duration_seconds=wanted)
    # Template example timings scale with the requested clip duration.
    for c in cfg['copy']['captions']:
        c['start']=round(c['start']*wanted/10,3);c['end']=round(c['end']*wanted/10,3)
    if args.copy:
        cfg['copy'].update(read_json(Path(args.copy)))
    if args.srt:
        cfg['copy']['captions']=parse_srt(args.srt);cfg['copy']['caption_kind']='transcript';cfg['copy']['footer']='字幕由用户提供'
    validate(cfg);write_json(config,cfg)
    log(f'Created {config}')

def check(args):
    cfg=load_config(args.config);info=probe(cfg['source']['video'])
    if cfg['source']['start_seconds']+cfg['source']['duration_seconds']>float(info['format']['duration'])+.03:raise ValueError('Requested segment exceeds source duration')
    if not any(s['codec_type']=='audio' for s in info['streams']):raise ValueError('Presenter video must contain its synchronized voice/audio')
    for module in ('cv2','numpy','PIL','onnxruntime'):
        if importlib.util.find_spec(module) is None:raise ValueError(f'Missing Python package: {module}')
    # Validate glyph layout before an expensive render.
    from composition import validate_layout
    validate_layout(cfg)
    log(json.dumps({'status':'ready','timing':timing(cfg),'video':cfg['source']['video'],'runtime':cfg['runtime']},ensure_ascii=False,indent=2))
    return cfg

def run(args):
    cfg=check(args);job=Path(args.config).resolve().parent;t=timing(cfg)
    source_hash=digest(cfg['source']['video']);model_hash=digest(cfg['runtime']['model'])
    prep_key=fingerprint({'source':source_hash,'settings':cfg['source'],'matting':cfg['matting'],'fps':t['fps'],
        'model':model_hash,'code':digest(SKILL/'scripts'/'preparation.py')})
    prep=job/'cache'/('matte-'+prep_key);prep.mkdir(parents=True,exist_ok=True)
    from preparation import prepare,prepare_screen
    marker=prep/'prepared.json'
    reused_prep=marker.exists() and len(list((prep/'mattes').glob('*.png')))==t['frames']
    if reused_prep:log('Reusing validated source/matte cache')
    else:prepare(cfg,t,prep)
    quality=read_json(marker)
    # Apply the current edit's visibility requirements, even when reusing a matte cache.
    used=lambda i:t['reveal']<=i<t['keywords_done'] or i>=t['outro']
    visible_bad=[i for i in quality['suspect_frames'] if used(i)]
    if visible_bad and not cfg['matting']['allow_suspect_frames']:
        raise ValueError(f'Suspect matte on visible frames {visible_bad[:12]}; inspect cache quality report/crop or reset_at_seconds before allowing those frames')
    city_key=fingerprint({'prep':prep_key,'subject_box':quality['subject_box'],'timing':{k:t[k] for k in ('city','keywords_done','fps')},
        'screen':cfg['style']['screen'],'scene':cfg['scene'],'blender':cfg['runtime']['blender'],
        'code':digest(SKILL/'scripts'/'scene.py'),'preparation':digest(SKILL/'scripts'/'preparation.py')})
    city=job/'cache'/('city-'+city_key);city.mkdir(parents=True,exist_ok=True)
    context={'config':cfg,'timing':t,'prep':str(prep),'city':str(city),'subject_box':quality['subject_box']}
    write_json(city/'context.json',context)
    city_count=t['keywords_done']-t['city']
    city_marker=city/'rendered.json'
    existing={int(p.stem.split('_')[-1]) for p in (city/'render-frames').glob('frame_*.png')}
    reused_city=city_marker.exists() and all(i in existing for i in range(1,city_count+1))
    if reused_city:log('Reusing synchronized 3D cache (copy changes do not trigger a rerender)')
    else:
        prepare_screen(context)
        missing=next((i for i in range(1,city_count+1) if i not in existing),city_count+1)
        if missing<=city_count:
            log(f'Rendering 3D frames {missing}–{city_count}')
            with (city/'blender.log').open('w',encoding='utf-8') as out:
                result=subprocess.run([cfg['runtime']['blender'],'--background','--factory-startup','--python-exit-code','1',
                    '--python',str(SKILL/'scripts'/'scene.py'),'--','--context',str(city/'context.json'),'--start-frame',str(missing)],stdout=out,stderr=subprocess.STDOUT)
            if result.returncode:raise RuntimeError(f'Blender failed; inspect {city / "blender.log"}')
        if not all((city/'render-frames'/f'frame_{i:04d}.png').is_file() for i in range(1,city_count+1)):raise RuntimeError('Incomplete 3D render')
        write_json(city_marker,{'frames':city_count,'scene':cfg['scene']})
    stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    output=Path(cfg['output']['directory'])/stamp;output.mkdir(parents=True,exist_ok=False)
    context['output']=str(output);write_json(output/'project.resolved.json',cfg)
    from composition import render
    render(context)
    from verification import verify
    verification=verify(context)
    # A portable scene bundle, separate from cache and from the original person video.
    bundle=output/'scene';bundle.mkdir();shutil.copy2(city/'scene.blend',bundle/'scene.blend')
    shutil.copytree(city/'screen-frames',bundle/'screen-frames')
    report={'template_version':1,'source_sha256':source_hash,'model_sha256':model_hash,'fps':t['fps'],'frames':t['frames'],
        'duration_seconds':t['duration'],'prep_cache':str(prep),'city_cache':str(city),'reused_matting':reused_prep,
        'reused_3d':reused_city,'matting_quality':quality,'verification':verification,
        'method':'Local RVM + Python composition + real Blender scene, original continuous audio, no new speech or avatar generation'}
    write_json(output/'manifest.json',report)
    write_json(job/'latest.json',{'output':str(output),'video':str(output/'video.mp4')})
    log(f'COMPLETE {output / "video.mp4"}')

def main():
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='command',required=True)
    p=sub.add_parser('init');p.add_argument('--job-dir',required=True);p.add_argument('--video',required=True)
    p.add_argument('--duration',type=float);p.add_argument('--start',type=float,default=0);p.add_argument('--copy');p.add_argument('--srt')
    for name in ('check','run'):
        p=sub.add_parser(name);p.add_argument('--config',required=True)
    args=parser.parse_args()
    try:{'init':init_job,'check':check,'run':run}[args.command](args)
    except (ValueError,RuntimeError,FileNotFoundError,subprocess.CalledProcessError) as error:
        log(f'ERROR: {error}');return 1
    return 0

if __name__=='__main__':sys.exit(main())

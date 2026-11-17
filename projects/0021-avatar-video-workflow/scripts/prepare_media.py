"""Register existing local videos, preserve checked stills and portable template source."""
from pathlib import Path
import argparse,hashlib,json,shutil,subprocess

ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def save(p,obj):
    p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--artifact-root',required=True);p.add_argument('--skill-root',required=True);p.add_argument('--media-only',action='store_true',help='Reconnect archived videos after validating existing hashes; preserve images and template');args=p.parse_args()
    artifacts=Path(args.artifact_root).resolve();skill=Path(args.skill_root).resolve();assets=ROOT/'assets';assets.mkdir(exist_ok=True)
    flat=artifacts/'avatar-postproduction-sample';space=artifacts/'avatar-3d-screen-sample';complete=artifacts/'avatar-complete-sample'
    trial=Path(read(artifacts/'reusable-template'/'validation-job'/'latest.json')['output'])
    videos={'reference.mp4':flat/'reference.mp4','matting.mp4':flat/'avatar-sample-5s.mp4','comparison.mp4':flat/'comparison-5s.mp4',
        'scene.mp4':space/'avatar-3d-screen-5s.mp4','complete.mp4':complete/'avatar-complete-10s.mp4','template.mp4':trial/'video.mp4'}
    destination=ROOT/'template'/'avatar-motion-template'
    if args.media_only:
        expected={x['alias']:x['sha256'] for x in read(ROOT/'media.json')['videos']}
        for alias,src in videos.items():
            if not src.is_file() or sha(src)!=expected.get(alias):raise ValueError(f'Archived video hash mismatch: {alias}')
        save(ROOT/'.local'/'media-map.json',{alias:str(src.resolve()) for alias,src in videos.items()})
        print(json.dumps({'reconnected_videos':len(videos),'hashes_match':True,'template_changed':False}));return
    if destination.exists():raise ValueError('Template snapshot exists; use --media-only to reconnect videos without overwriting it')
    images={'complete-poster.jpg':complete/'poster.jpg','complete-storyboard.jpg':complete/'storyboard.jpg',
        'matting-poster.jpg':flat/'preview-060.jpg','comparison.jpg':flat/'comparison.jpg',
        'scene-poster.jpg':space/'poster.jpg','scene-overview.jpg':space/'camera-path-overview.jpg',
        'template-poster.jpg':trial/'poster.jpg','template-storyboard.jpg':trial/'storyboard.jpg','presenter.png':flat/'matte-frames'/'0060.png'}
    records=[]
    for name,src in images.items():
        shutil.copy2(src,assets/name);records.append({'file':name,'sha256':sha(src),'source':'local postproduction sample; original presenter @tm_uchal'})
    for name,second in [('reference-poster.jpg',.5),('reference-city.jpg',15)]:
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(second),'-i',str(flat/'reference.mp4'),'-frames:v','1',str(assets/name)],check=True)
        records.append({'file':name,'sha256':sha(assets/name),'source':f'@tm_uchal original video, frame around {second}s'})
    manifest=[];local={}
    for alias,src in videos.items():
        if not src.is_file():raise FileNotFoundError(src)
        manifest.append({'alias':alias,'sha256':sha(src),'bytes':src.stat().st_size,'use':'local research only; not published'})
        local[alias]=str(src.resolve())
    save(ROOT/'media.json',{'schema_version':1,'published':False,'videos':manifest})
    save(ROOT/'.local'/'media-map.json',local)
    save(assets/'image-manifest.json',records)
    evidence=ROOT/'evidence';evidence.mkdir(exist_ok=True)
    save(evidence/'matting.json',read(flat/'manifest.json'))
    save(evidence/'scene.json',{'render':read(space/'render-report.json'),'verification':read(space/'verification.json')})
    save(evidence/'complete.json',{'manifest':read(complete/'manifest.json'),'verification':read(complete/'verification.json')})
    template=read(trial/'manifest.json')
    for key in ('prep_cache','city_cache'):template.pop(key,None)
    save(evidence/'template.json',template)
    save(evidence/'portability.json',read(artifacts/'reusable-template'/'scene-portability.json'))
    shutil.copytree(skill,destination,ignore=shutil.ignore_patterns('__pycache__','*.pyc','local-runtime.json'))
    save(ROOT/'template-manifest.json',{'skill':'avatar-motion-template','snapshot_date':'2026-11-17',
        'machine_profile_included':False,'model_weights_included':False,'original_video_included':False,
        'files':[{'path':q.relative_to(destination).as_posix(),'sha256':sha(q)} for q in sorted(destination.rglob('*')) if q.is_file()]})
    print(json.dumps({'images':len(records),'videos':len(videos),'template':str(destination),'published':False}))

if __name__=='__main__':main()

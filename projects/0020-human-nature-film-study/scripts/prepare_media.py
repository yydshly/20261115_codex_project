"""Create explicitly selected web media; never alter original film files."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse
import hashlib
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(args):
    subprocess.run([str(x) for x in args], check=True, capture_output=True)

def probe(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)], check=True, capture_output=True, text=True, encoding='utf-8')
    data = json.loads(result.stdout)
    video = next(x for x in data['streams'] if x['codec_type'] == 'video')
    return {'duration': float(data['format']['duration']), 'width': video['width'], 'height': video['height']}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--episode-root', type=Path, required=True)
    args = parser.parse_args()
    source = args.episode_root.resolve(strict=True)
    assets = ROOT / 'assets'
    for folder in ('videos', 'stills', 'prompts'):
        (assets / folder).mkdir(parents=True, exist_ok=True)
    media = [
        ('film-v1', source / 'renders/run-20261117-031345-e9277b/多停一会儿-v001.mp4', 'videos/film-v1-60s.mp4'),
        ('film-v2', source / 'renders/run-20261117-093928-7e180a/多停一会儿-30秒重剪-v002.mp4', 'videos/film-v2-30s.mp4'),
    ]
    media += [(f'shot-{sid}', source / f'raw/shot{sid}/shot{sid}_complete_v001.mp4', f'videos/shot-{sid}.mp4') for sid in ('01','02','03','04','05','06')]
    old_path = assets / 'media-manifest.json'
    old = {x['id']: x for x in json.loads(old_path.read_text(encoding='utf-8'))['videos']} if old_path.exists() else {}
    def encode(item):
        key, original, relative = item
        original_hash = sha(original)
        output = assets / relative
        if output.exists():
            if key not in old or old[key]['original_sha256'] != original_hash or old[key]['sha256'] != sha(output):
                raise RuntimeError('Existing output is not a verified match; preserve it and use a new version: ' + relative)
        else:
            run(['ffmpeg','-hide_banner','-nostdin','-v','error','-n','-i',original,
                 '-map','0:v:0','-map','0:a:0','-c:v','libx264','-preset','medium','-crf','26','-threads','2',
                 '-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',output])
        run(['ffmpeg','-hide_banner','-nostdin','-v','error','-xerror','-i',output,'-f','null','-'])
        return {'id': key, 'file': relative, 'original_name': original.name, 'original_sha256': original_hash,
                'sha256': sha(output), 'bytes': output.stat().st_size, 'decode_ok': True, **probe(output)}
    with ThreadPoolExecutor(max_workers=2) as pool:
        videos = list(pool.map(encode, media))
    originals = {x[0]: x[1] for x in media}
    frames = [
        ('person', 'shot-01', 6.2, '衣领、伸手与抬头的实际画面'),
        ('leaf', 'shot-02', 9.0, '新叶与水滴的实际画面'),
        ('ground', 'shot-03', 7.6, '湿土、枯叶与新草的实际画面'),
        ('water', 'shot-04', 6.8, '浅沟汇入河面的实际画面'),
        ('tree', 'shot-05', 7.8, '原始第五镜柳树与人物的实际画面，未镜像'),
        ('landscape', 'shot-06', 13.4, '人物坐在河岸的实际全景'),
        ('poster-v1', 'film-v1', 6.1, '60秒初版海报帧'),
        ('poster-v2', 'film-v2', 26.0, '30秒重剪海报帧'),
    ]
    stills = []
    for key, origin, time, caption in frames:
        output = assets / 'stills' / (key+'.jpg')
        if not output.exists():
            run(['ffmpeg','-hide_banner','-nostdin','-v','error','-n','-ss',str(time),'-i',originals[origin],'-frames:v','1','-q:v','2',output])
        stills.append({'file':'stills/'+key+'.jpg','source_id':origin,'source_time_seconds':time,'caption':caption,'sha256':sha(output)})
    reference = source / 'references/person-courtyard_v001.png'
    shutil.copy2(reference, assets / 'person-courtyard-reference.png')
    shots = []
    names = ['身体先察觉','目光找到变化','春来到脚下','细节彼此相连','春有了纵深','整个春日展开']
    for index, sid in enumerate(('01','02','03','04','05','06')):
        original = source / f'prompts/shot{sid}_v001.txt'
        shutil.copy2(original, assets / f'prompts/shot-{sid}.txt')
        generation = json.loads((source / f'reports/shot{sid}_generation.json').read_text(encoding='utf-8'))
        shots.append({'id':sid,'title':names[index],'duration':15 if sid=='06' else 10,
                      'task_id':generation['task_id'],'credits':generation['reported_cost_credits'],
                      'prompt':original.read_text(encoding='utf-8'),'prompt_file':f'assets/prompts/shot-{sid}.txt',
                      'video':f'assets/videos/shot-{sid}.mp4','poster':f'assets/stills/{["person","leaf","ground","water","tree","landscape"][index]}.jpg'})
    assert len({x['task_id'] for x in shots}) == 6 and sum(x['credits'] for x in shots) == 975
    production = {'model':'Seedance 2.0','aspect_ratio':'9:16','width':720,'height':1280,'fps':24,
                  'total_credits':975,'approved_budget':1500,'recut_additional_credits':0,'shots':shots,
                  'audio_listening':'未完成听审','third_party_reference_video_copied':False}
    (ROOT / 'production.json').write_text(json.dumps(production,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    manifest = {'kind':'本次原创AI短片的网页播放副本','originals_preserved':True,
                'encoding':'H.264 CRF26 / AAC 96kbps / 720×1280 / faststart；只压缩编码，不改镜头与声音内容',
                'videos':videos,'stills':stills,'reference':{'file':'person-courtyard-reference.png','sha256':sha(reference),'kind':'内置图像生成的虚构人物与院落参考，非真人照片'}}
    old_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'videos':len(videos),'stills':len(stills),'web_video_mb':round(sum(x['bytes'] for x in videos)/1048576,2),'credits_added':0},ensure_ascii=False),flush=True)

if __name__ == '__main__':
    main()

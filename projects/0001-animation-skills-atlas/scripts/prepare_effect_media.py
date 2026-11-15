"""Extract real preview frames; no synthetic screenshot or replacement artwork."""
from pathlib import Path
import json
import shutil
import subprocess
import cv2
from PIL import Image, ImageOps, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'web/public'
OUT=PUBLIC/'summary/effects'
DATA=json.loads((ROOT/'effect-media.json').read_text(encoding='utf-8'))
FFMPEG=shutil.which('ffmpeg') or r'D:\26project\26audio_and_video_project\ffmpeg-n6.1.3-win64-gpl-shared-6.1\bin\ffmpeg.exe'

for key,media in DATA.items():
    source=PUBLIC/media['play'].removeprefix('./') if media.get('play') else OUT/media['file']
    if not source.exists():
        raise SystemExit(f'Missing {key}: {source}')
    if media['type']=='video':
        video=cv2.VideoCapture(str(source))
        frames=int(video.get(cv2.CAP_PROP_FRAME_COUNT)); fps=video.get(cv2.CAP_PROP_FPS)
        fraction={'remotion':.58,'motion-canvas':.64,'manim':.72,'motion':.32}.get(key,.5)
        frame=int(frames*fraction);video.set(cv2.CAP_PROP_POS_FRAMES,frame)
        ok,bgr=video.read();video.release()
        if not ok:raise SystemExit(f'Cannot read actual frame: {key}')
        im=Image.fromarray(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB))
        media['frame']=round(frame/fps,3)
    else:
        im=Image.open(source)
        if media['type']=='gif':
            frame=int((im.n_frames-1)*{'anime':.85,'lottie':.45,'shifty':.58,'gifenc':.36}.get(key,.5))
            im.seek(frame);media['frameIndex']=frame
            movie=OUT/f'{key}-loop.mp4'
            subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-y','-i',str(source),'-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2','-pix_fmt','yuv420p','-movflags','+faststart',str(movie)],check=True)
            media['loop']=movie.name
        # Transparent source pixels are composited onto their neutral preview ground.
        rgba=im.convert('RGBA');ground=Image.new('RGBA',rgba.size,'#202329');ground.alpha_composite(rgba);im=ground.convert('RGB')
    im.thumbnail((1400,1000))
    im.convert('RGB').save(OUT/media['poster'],quality=92)

(OUT/'prepared.json').write_text(json.dumps(DATA,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
sheet=Image.new('RGB',(1500,6*240),'#101b23');draw=ImageDraw.Draw(sheet)
for i,(key,media) in enumerate(DATA.items()):
    im=Image.open(OUT/media['poster']);tile=ImageOps.contain(im,(480,210));x=i%3*500;y=i//3*240
    sheet.paste(tile,(x+(480-tile.width)//2,y));draw.text((x+8,y+214),key,fill='white')
sheet.save(OUT/'all-effects-proof.jpg',quality=92)
print(json.dumps({'posters':len(DATA),'animated':sum(m['type'] in ['video','gif'] for m in DATA.values())}))

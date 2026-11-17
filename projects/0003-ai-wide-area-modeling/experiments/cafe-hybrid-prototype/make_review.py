"""Label actual renders and concatenate an evidence video; no AI video synthesis."""
import argparse,os,shutil
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
p=argparse.ArgumentParser();p.add_argument('--out',required=True);a=p.parse_args();out=Path(a.out);frames=out/'review-frames';frames.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',25);entries=[]
def labelled(src,name,label):
    b=Image.new('RGB',(1000,700),'#14202d');b.paste(Image.open(src).convert('RGB'),(0,45));ImageDraw.Draw(b).text((15,8),label,font=font,fill='white');dest=frames/name;b.save(dest);return dest
for i,src in enumerate(sorted((out/'door-frames').glob('*.png'))):
    dest=labelled(src,f'door-{i:03d}.png','高斯外观跟随 Blender 实体门：开门 → 复位')
    entries.append((dest,1/12))
for name,label in [('blender-exterior-open','Blender 实体：外侧看进新房间'),('blender-interior-warm','同一室内机位：暖色独立光源'),('blender-interior-day','同一室内机位：改为窗侧日光'),('blender-interior-reverse','Blender 实体：室内看向门外')]:
    dest=labelled(out/(name+'.png'),name+'.png',label);entries.append((dest,2))
text=['ffconcat version 1.0']
for f,duration in entries:text.extend(["file '"+f.as_posix()+"'",f'duration {duration:.8f}'])
text.append("file '"+entries[-1][0].as_posix()+"'")
(out/'review.ffconcat').write_text('\n'.join(text)+'\n',encoding='utf-8')
cfr=out/'review-cfr';cfr.mkdir(exist_ok=True);index=0
for src,duration in entries:
    for _ in range(round(duration*12)):
        dest=cfr/f'{index:03d}.png'
        if not dest.exists():
            try:os.link(src,dest)
            except PermissionError:shutil.copy2(src,dest)
        index+=1
print('Prepared',len(entries),'labelled frames/scenes')

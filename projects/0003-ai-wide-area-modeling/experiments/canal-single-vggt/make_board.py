import argparse,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
p=argparse.ArgumentParser();p.add_argument('--results',required=True);p.add_argument('--out',required=True);a=p.parse_args();r=Path(a.results)
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',25)
board=Image.new('RGB',(1600,520),'#151b24');d=ImageDraw.Draw(board)
for x,name,label in [(0,'A-old-v4.png','A 旧版 V4：本次重渲染'),(800,'B-vggt-guided.png','B 单图 VGGT 深度辅助：几何校正')]:
    im=Image.open(r/name).convert('RGB').resize((800,450),Image.Resampling.LANCZOS);board.paste(im,(x,60));d.text((x+16,16),label,font=font,fill='white')
board.save(a.out)
print(a.out)

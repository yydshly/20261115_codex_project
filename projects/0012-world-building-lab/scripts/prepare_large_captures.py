"""Lay out real ground-level browser screenshots; requires Pillow and Windows YaHei."""
from pathlib import Path
import json
import shutil
from PIL import Image, ImageDraw, ImageFont

ASSETS = Path(__file__).resolve().parents[1] / 'assets'
data = json.loads((ASSETS / 'large-scenes/manifest.json').read_text(encoding='utf-8'))
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 23)
small = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 16)
title = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 34)
w, h, gap, margin, header = 480, 449, 16, 25, 105
atlas = Image.new('RGB', (margin*2+5*w+4*gap, header+2*h+gap+margin), '#e9ecdf')
draw = ImageDraw.Draw(atlas)
draw.text((margin,18), '走进大地图 · 十类地面场景', font=title, fill='#29463a')
draw.text((margin,68), '同一个连续三维世界的实际运行截图 · 约1.72米眼高 · 右上角为三维导航小地图', font=small, fill='#64775f')
for i, item in enumerate(data['scenes']):
    image = Image.open(ASSETS / 'large-scenes' / item['file']).convert('RGB')
    image.thumbnail((w,412), Image.Resampling.LANCZOS)
    x, y = margin+(i%5)*(w+gap), header+(i//5)*(h+gap)
    atlas.paste(image, (x,y))
    draw.text((x+8,y+417), item['chapter'], font=font, fill='#29463a')
atlas.save(ASSETS / 'large-world-atlas.jpg', quality=92)
shutil.copyfile(ASSETS/'large-scenes/01-coast.jpg', ASSETS/'large-world-entry.jpg')
print('Prepared real large-world scene atlas and entry screenshot.')

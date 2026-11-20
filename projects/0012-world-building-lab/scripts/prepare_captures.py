"""Crop actual browser captures using their recorded viewport coordinates."""
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw, ImageFont

PROJECT = Path(__file__).resolve().parents[1]
capture_dir = Path(sys.argv[1])
records = json.loads((capture_dir / 'manifest.json').read_text(encoding='utf-8'))
previews = PROJECT / 'web/assets/previews'
previews.mkdir(parents=True, exist_ok=True)
for item in records:
    image = Image.open(capture_dir / f"{item['id']}.jpg")
    r = item['rect']
    sx, sy = image.width / item['width'], image.height / item['height']
    box = (round(r['left']*sx), round(r['top']*sy), round(r['right']*sx), round(r['bottom']*sy))
    image.crop(box).save(previews / f"{item['id']}.jpg", quality=91)

font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 23)
small = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 17)
title_font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 34)
def atlas(items, filename, title, subtitle, cols):
    w, h, gap, margin, header = 480, 328, 20, 30, 125
    rows = (len(items)+cols-1)//cols
    sheet = Image.new('RGB',(margin*2+cols*w+(cols-1)*gap, header+rows*h+(rows-1)*gap+margin),'#f3f2eb')
    draw=ImageDraw.Draw(sheet)
    draw.text((margin,23),title,font=title_font,fill='#263c34')
    draw.text((margin,77),subtitle,font=small,fill='#667467')
    for i,item in enumerate(items):
        x=margin+(i%cols)*(w+gap); y=header+(i//cols)*(h+gap)
        image=Image.open(previews/f"{item['id']}.jpg")
        image.thumbnail((w,287),Image.Resampling.LANCZOS)
        sheet.paste(image,(x+(w-image.width)//2,y))
        draw.text((x+10,y+294),item['name'],font=font,fill='#263c34')
    sheet.save(PROJECT/'assets'/filename,quality=92)

atlas(records[:10],'terrain-atlas.jpg','世界构建图谱 · 十类环境','本实验室实时三维画面的实际截图；程序化风格示意，非真实地理复原。',5)
atlas(records[10:19],'surface-atlas.jpg','同一地形 · 九种地表选择','相同溪谷、相同相机、相同高差；仅改变地表，隐藏立体元素。自然混合为组合规则。',3)
atlas(records[19:22],'layer-atlas.jpg','从骨架到场景 · 三层对照','同一块溪谷：形状 → 地表覆盖 → 植被、建筑与活动线索。',3)
atlas(records[22:28],'element-atlas.jpg','上层元素 · 空间近景','程序化模型的实际三维近景：看落点、尺度与周围环境的关系。',3)
(PROJECT/'assets/capture-manifest.json').write_text(json.dumps({'date':'2026-11-16','source':'http://127.0.0.1:52932/','description':'Real CUA browser viewport captures, cropped to the canvas using recorded DOM rectangles.','captures':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Prepared {len(records)} real scene previews and 4 atlases.')

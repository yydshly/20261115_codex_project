"""Build the editable v2 research map from original assets and real evidence.

This edits the project's code-native diagram. Images remain documentary inserts;
no generated scene, retouched evidence or model service is used.
"""
from pathlib import Path
from html import escape
import argparse
import base64
import hashlib
import io
import json
import shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--publication', action='store_true', help='Keep the v2 layout/evidence and update the publication footnote in a sibling file')
PUBLICATION = parser.parse_args().publication
OUT = ROOT / 'assets'
WEB = ROOT / 'web/assets/journal'
W, H, SCALE = 3200, 4400, 2
PAPER, INK, MUTED = '#f2efdf', '#435d48', '#687b60'
LINE, GREEN, CREAM, GOLD = '#cbd4bb', '#e5ead7', '#faf5e6', '#927c50'
FONTS = Path('C:/Windows/Fonts')
FONT_PATHS = {'body': FONTS/'msyh.ttc', 'bold': FONTS/'msyhbd.ttc', 'serif': FONTS/'simsun.ttc'}
canvas = Image.new('RGB', (W*SCALE, H*SCALE), PAPER)
draw = ImageDraw.Draw(canvas)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
       '<title id="title">风归小庭：从原始素材到研究效果，再到共同生活的游戏方向</title>',
       '<desc id="desc">包含 SpriteCook 橡树与松树原始分区图、免费样例、真实风动实验截图及庭院、小屋、夜雨实景。按素材入口、效果研究、庭院使用、创作价值、参考与后续问题组织。AI 居民仍为目标设计；图像来源与使用边界另行标注。</desc>']
cache, sources, text_boxes = {}, [], []


def font(size, kind='body'):
    key = (size, kind)
    if key not in cache:
        cache[key] = ImageFont.truetype(str(FONT_PATHS[kind]), round(size*SCALE))
    return cache[key]


def text(x, y, value, size=32, color=INK, kind='body'):
    f = font(size, kind)
    ascent = f.getmetrics()[0]/SCALE
    draw.text((round(x*SCALE), round((y+ascent)*SCALE)), value, font=f, fill=color, anchor='ls')
    family = 'SimSun,Noto Serif CJK SC,serif' if kind == 'serif' else 'Microsoft YaHei,Noto Sans CJK SC,sans-serif'
    svg.append(f'<text x="{x}" y="{y+ascent:.2f}" fill="{color}" font-family="{family}" font-size="{size}" font-weight="{700 if kind == "bold" else 400}">{escape(value)}</text>')
    text_boxes.append((x, y, draw.textlength(value,font=f)/SCALE, size, value))


def lines(x, y, values, size=30, color=MUTED, step=48, kind='body'):
    for i, value in enumerate(values):
        text(x,y+i*step,value,size,color,kind)


def rect(x,y,w,h,fill=PAPER,radius=20,stroke=LINE):
    draw.rounded_rectangle(tuple(round(v*SCALE) for v in (x,y,x+w,y+h)),radius*SCALE,fill,outline=stroke,width=2*SCALE)
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')


def line(x1,y1,x2,y2,color=LINE,width=3):
    draw.line(tuple(round(v*SCALE) for v in (x1,y1,x2,y2)),fill=color,width=width*SCALE)
    svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"/>')


def photo(path,x,y,w,h,role,crop=None,pixel=False):
    """Contain an original/evidence insert; record every crop, source and hash."""
    p=ROOT/path
    raw=p.read_bytes()
    original=Image.open(io.BytesIO(raw)).convert('RGBA')
    im=original.crop(crop) if crop else original
    scale=min(w/im.width,h/im.height)
    pw,ph=round(im.width*scale),round(im.height*scale)
    px,py=x+(w-pw)/2,y+(h-ph)/2
    resample=Image.Resampling.NEAREST if pixel else Image.Resampling.LANCZOS
    canvas.paste(im.resize((pw*SCALE,ph*SCALE),resample),(round(px*SCALE),round(py*SCALE)),im.resize((pw*SCALE,ph*SCALE),resample))
    # Embed the same documentary pixels so the SVG is self-contained.
    if crop:
        stream=io.BytesIO();im.save(stream,format='PNG');encoded=stream.getvalue();mime='image/png'
    else:
        encoded=raw;mime='image/jpeg' if p.suffix.lower() in ('.jpg','.jpeg') else 'image/png'
    rendering=' style="image-rendering:pixelated"' if pixel else ''
    svg.append(f'<image x="{px:.2f}" y="{py:.2f}" width="{pw}" height="{ph}" href="data:{mime};base64,{base64.b64encode(encoded).decode()}"{rendering}><title>{escape(role)}</title></image>')
    sources.append({'path':path,'sha256':hashlib.sha256(raw).hexdigest(),'original_size':list(original.size),'crop_xyxy':list(crop) if crop else None,'role':role,'placement':[x,y,w,h]})


def stage(y,num,title,question):
    text(110,y,f'{num}  {title}',49,kind='bold')
    text(110,y+75,question,31,MUTED)


def chip(x,y,w,label):
    rect(x,y,w,54,GREEN,10)
    text(x+24,y+7,label,28)


text(110,55,'MATERIAL → EFFECT → EXPERIENCE / 研究路径图 · v2',29,MUTED)
text(110,116,'从一张素材，到一个可以共同生活的世界',76,kind='serif')
text(110,224,'素材是入口；我们研究的是怎样让形象产生可控的变化，再让变化回应人的行动。',34)
for x,w,label in [(110,490,'原素材与免费样例'),(690,490,'拆分与风动效果'),(1270,490,'真实庭院与日常'),(1850,490,'玩法、情绪与价值'),(2430,660,'AI 居民与下一步验证')]:
    chip(x,302,w,label)
    if x<2430:text(x+w+30,307,'→',35,GOLD)

# 1. The actual entry point: original article diagrams and selected samples.
stage(410,'01','我们是从什么走进来的？','先看见素材与表现，再追问：它提供的是图像、可复用效果，还是完整游戏？')
rect(110,535,1120,495,CREAM)
text(145,560,'A / 原文章橡树分区示意图',32,kind='bold')
photo('web/assets/local-source/oak-diagram.png',140,625,1060,275,'SpriteCook 原始橡树分区示意图；整幅等比展示',pixel=True)
lines(145,932,['原貌 → 着色分区 → 固定结构 → 树冠','从图中恢复网格，分出 14 个可动叶团。'],27,step=41)
rect(1260,535,790,495,CREAM)
text(1295,560,'B / 原文章松树分层示意图',32,kind='bold')
photo('web/assets/local-source/pine-diagram.png',1350,615,610,338,'SpriteCook 原始松树分层示意图；整幅等比展示',pixel=True)
text(1295,978,'8 层枝叶；本地版本仍固定主干。',27)
rect(2080,535,1010,495,CREAM)
text(2115,560,'C / 已实际使用的官方免费样例',32,kind='bold')
samples=[('traveler/idle_sheet.png','旅人', (0,0,98,98)),('cat/walk_sheet.png','橘猫',(0,0,86,86)),('cottage/building5.png','蓝瓦小屋',None)]
for i,(p,label,crop) in enumerate(samples):
    x=2140+i*285
    photo('web/assets/free-samples/'+p,x,615,225,175,'官方免费样例预览：'+label,crop,pixel=True)
    text(x+45,802,label,28)
props=[('well/stone_well.png','井'),('barrel/barrel.png','桶'),('crate/crate_intact.png','箱'),('pot/pot.png','盆'),('bread/bread.png','面包'),('apple/apple.png','苹果')]
for i,(p,label) in enumerate(props):
    x=2128+i*154
    photo('web/assets/free-samples/'+p,x,855,125,100,'官方免费道具预览：'+label,pixel=True)
    text(x+26,959,label,25)
text(110,1061,'入口判断：SpriteCook 属于素材制作与工具接入方向；本轮使用文章图与免费样例，未连接在线生成 / MCP / API。',29,GOLD)

# 2. Documentary comparison plus the semantic decomposition we implemented.
stage(1155,'02','把“一个效果”，拆成可以控制和检验的能力','同一素材、同一风场做对照：看固定结构、运动先后、像素边缘，以及风停后的回落。')
rect(110,1280,1815,720,GREEN)
text(145,1305,'真实实验截图 / 静止 · 整树逐行摆动 · 分层展开',32,kind='bold')
photo('assets/lab-layered-live.jpg',145,1377,1745,560,'2026-11-15 风动实验真实截图；裁取三种方式对照区',(40,405,1226,840))
text(145,1948,'这是静帧证据；网页提供同模块的实时对照，可送风、展开和切换树种。',27)
rect(1960,1280,1130,720,CREAM)
text(2000,1305,'我们实际实现的结构',34,kind='bold')
for i,(p,label) in enumerate([('oak-full.png','提取树图'),('oak-trunk.png','固定树干'),('oak-clump-00.png','叶团之一')]):
    x=2010+i*345
    photo('web/assets/trees/'+p,x,1395,240,185,'本地提取：'+label,pixel=True)
    text(x+30,1596,label,28)
    if i<2:text(x+273,1478,'→' if i==0 else '+',35,GOLD)
lines(2000,1665,['14 个橡树叶团 / 8 层松枝 / 共 28 PNG','空间行波 + 局部阵风 + 弹簧回弹','10 Hz 姿态更新 + 整像素位移','树叶、落叶、草地响应同一个风场'],31,step=54)
text(2000,1910,'检查：静止重组、补缝、时序、树干稳定。',28,GOLD)
rect(110,2030,2980,82,'#dfe5ce',12)
text(145,2049,'沉淀的能力：把外观与运动分开，保留来源、图层、参数和对照；下次换素材，也知道从哪里开始检查。',32)

# 3. Assets actually enter a playable world. Every image is pre-existing evidence.
stage(2200,'03','素材和效果，怎样真的进入我们的作品？','形象 → 空间与通行 → 玩家动作 → 世界回应 → 本地保存。每一步都有实际用途。')
for x,title in [(110,'庭院 / 花、猫、可移动布置与来信'),(1120,'小屋 / 灯、炉边与同一庭院的窗景'),(2130,'夜雨 / 光线、植物与小猫的响应')]:
    rect(x,2325,960,820,CREAM)
    text(x+28,2350,title,31,kind='bold')
photo('assets/arranging-story-scene.jpg',130,2420,920,615,'2026-11-16 独立庭院真实画面，沿用已记录的场景裁切')
photo('assets/home-night-scene.jpg',1140,2420,920,615,'2026-11-16 小屋真实画面，沿用已记录的场景裁切')
photo('assets/garden-night-rain.jpg',2150,2420,920,615,'2026-11-16 夜雨真实截图的庭院区域',(0,84,768,566))
text(140,3073,'真实原型：免费形象 + 本站规则与布置。',27)
text(1150,3073,'室内为本站绘制；窗景复用真实庭院。',27)
text(2160,3073,'雨水进入生长，猫沿可行路线回屋。',27)
text(110,3180,'已完成：风铃纸笺、种植照料、规则猫、小屋、昼夜天气、布置、五封预写来信、本地存档。',31)
text(110,3230,'创作取舍：灰绿与纸色、少量暖色；无武器、无倒计时、不因缺席惩罚。安静与温暖由行动和回应支撑。',29,MUTED)

# 4. Why we followed the thread and where actual proof ends.
rect(110,3340,1450,410,GREEN)
text(150,3370,'04  从实践中，我们真正获得了什么？',42,kind='bold')
lines(150,3446,['制作价值：素材 → 可调效果 → 场景 → 玩法 → 持续状态。','玩家价值假设：有自己的地方、想完成的事、在意的人。','迁移方向：环境短片 / AI 视频参考 / 三维花园的运动规则。','其中，2D 庭院已验证；视频导出、3D 集成仍待做。'],31,step=58)
text(150,3700,'已有 39 项功能检查；情绪与长期停留仍需真实试玩。',28,GOLD)
rect(1600,3340,1490,410,CREAM)
text(1640,3370,'05  下一步怎样沿着证据继续思考？',42,kind='bold')
lines(1640,3446,['素材能表达谁？ → 稳定性格、特点与自己的日常。','效果能回应什么？ → 走到、使用、协商并实际完成。','什么值得一起做？ → 雨天阅读角等有选择、有结果的事件。','什么让人回来？ → 持续变化、未完计划与共同经历。'],31,step=58)
text(1640,3700,'下一步：真实 AI 居民动作闭环 + 一段完整可玩事件。',28,GOLD)

# 5. References inform choices rather than replace the material/effect origin.
text(110,3820,'参考怎样帮助我们判断，而不是替代自己的实践？',42,kind='bold')
references=[('动森','地方归属与邻里日常'),('牧场物语 / 星露谷','身份、经营与能力成长'),('模拟人生','性格、愿望与生活系统'),('时光系列','建设成果被社区使用'),('Spiritfarer','行动与人物旅程相连'),('inZOI 开发思路','自主行为要在世界落地')]
for i,(name,meaning) in enumerate(references):
    col,row=i%3,i//3
    x,y=110+col*1020,3900+row*84
    text(x,y,name,30,kind='bold')
    text(x,y+41,meaning,28,MUTED)
rect(110,4100,2980,165,'#506a52',16,stroke='#506a52')
text(150,4122,'目标方向：与有自主日常和主见的 AI 居民，平等共处，参与有规则、有选择、有结果的生活事件。',35,'#faf4df','bold')
text(150,4191,'目标模式：日常生活 / 事件短篇 / 庭院创作。当前 AI 居民、自然对话、完整模式尚未接入。',30,'#ede9cf')
text(110,4307,'阅读方法：看原图 → 试效果 → 玩庭院 → 问价值 → 选择下一项验证。图内画面为素材原件或已记录的真实截图。',28)
text(110,4353,('研究图谱 · 2026.11.17 ｜ 原图与截图分别署名；免费样例保留许可。本文研究展示不另授第三方素材使用权，来源与验证范围见网页。' if PUBLICATION else '本地研究图谱 · 2026.11.17 ｜ 原图与权利归相应权利人；文章图再分发未确认，本图暂不公开发布。出处与裁切记录见网页。'),25,MUTED)

svg.append('</svg>')
for x,y,width,size,value in text_boxes:
    assert x+width < W-55, f'Text exceeds right edge: {value}'
    assert y+size*1.5 < H, f'Text exceeds bottom edge: {value}'
OUT.mkdir(exist_ok=True);WEB.mkdir(parents=True,exist_ok=True)
stem='understanding-research-map-v2-public' if PUBLICATION else 'understanding-research-map-v2'
paths=[OUT/(stem+'.svg'),OUT/(stem+'.png')]
paths[0].write_text('\n'.join(svg)+'\n',encoding='utf-8')
canvas.resize((W,H),Image.Resampling.LANCZOS).save(paths[1],optimize=True)
for p in paths:shutil.copyfile(p,WEB/p.name)
for name in ['lab-layered-live.jpg','home-night-scene.jpg','garden-night-rain.jpg']:
    shutil.copyfile(OUT/name,WEB/name)
manifest={'date':'2026-11-17','size':[W,H],'script':'scripts/render_research_map.py','method':'Code-native SVG composition and matching Pillow PNG; documentary source inserts; no generated imagery','usage':('Research presentation with attribution; no third-party asset relicensing or standalone asset pack' if PUBLICATION else 'LOCAL STUDY ONLY: contains article artwork; redistribution permission unconfirmed'),'previous_version':('assets/understanding-research-map-v2.svg' if PUBLICATION else 'assets/understanding-overview-v1.svg'),'sources':sources,'files':[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]}
(OUT/(stem+'.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Rendered {W}x{H} research map with {len(sources)} documentary inserts.')

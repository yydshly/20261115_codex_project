"""Render the project understanding as one self-contained SVG and a high-res PNG.

Uses structured notes, real rendered frames and attributed public previews.
The approved guide SVG/PNG are editorial assets; raw media and build output stay outside Git history.
Run from any directory: python projects/0001-animation-skills-atlas/scripts/render_understanding.py
"""
from pathlib import Path
from html import escape
import base64
import json
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'understanding.json').read_text(encoding='utf-8'))
MEDIA = json.loads((ROOT / 'effect-media.json').read_text(encoding='utf-8'))
OUT = ROOT / 'web/public/summary'
OUT.mkdir(parents=True, exist_ok=True)
FONT = Path('C:/Windows/Fonts/msyh.ttc')
BOLD = Path('C:/Windows/Fonts/msyhbd.ttc')
W, H = 3600, 8300
BG, PANEL, LINE, INK, MUTED = '#101b23', '#192730', '#34434b', '#e5eadd', '#9caea8'
COLORS = {'green':'#cae69b','cyan':'#82c6c7','amber':'#e8c886','blue':'#9abce0','purple':'#b8a9db','coral':'#dea88d'}
image = Image.new('RGB', (W,H), BG)
draw = ImageDraw.Draw(image)
parts = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
 '<title>AI 视频制作技术能力全景：18 项资源的职责、场景、效果与选择</title>',
 '<desc>阶段总结，不是能力上限排名。18 张卡片使用实际成片、官方公开预览或注明的模型资产图。每张图片标明来源，工具作用和验证状态分别说明。SVG 技术名链接仓库，效果图链接原作。</desc>',
 f'<rect width="{W}" height="{H}" fill="{BG}"/>']
fonts = {}
warnings = []

def font(size, bold=False):
    key = size,bold
    if key not in fonts:
        fonts[key] = ImageFont.truetype(str(BOLD if bold else FONT), size)
    return fonts[key]

def rect(x,y,w,h,fill,stroke=None,r=0):
    draw.rounded_rectangle((x,y,x+w,y+h),radius=r,fill=fill,outline=stroke,width=2)
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="2"' if stroke else '')+'/>')

def line(x1,y1,x2,y2,fill=LINE,width=2):
    draw.line((x1,y1,x2,y2),fill=fill,width=width)
    parts.append(f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="{fill}" stroke-width="{width}" stroke-linecap="round"/>')

def poly(points,fill=None,stroke=None,width=2,close=False):
    if fill: draw.polygon(points,fill=fill)
    if stroke: draw.line(points+([points[0]] if close else []),fill=stroke,width=width,joint='curve')
    cmd='M'+'L'.join(f'{x},{y}' for x,y in points)+('Z' if close else '')
    parts.append(f'<path d="{cmd}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{width}" stroke-linejoin="round"/>')

def circle(x,y,r,fill=None,stroke=None,width=2):
    draw.ellipse((x-r,y-r,x+r,y+r),fill=fill,outline=stroke,width=width)
    parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{width}"/>')

def text(x,y,s,size=28,color=INK,bold=False,href=None):
    draw.text((x,y),s,font=font(size,bold),fill=color,anchor='lt')
    if href: parts.append(f'<a href="{escape(href,quote=True)}" target="_blank">')
    parts.append(f'<text x="{x}" y="{y}" dominant-baseline="text-before-edge" font-family="Microsoft YaHei,Noto Sans CJK SC,sans-serif" font-size="{size}" font-weight="{650 if bold else 400}" fill="{color}">{escape(s)}</text>')
    if href: parts.append('</a>')

def wrap(s,maxw,size,bold=False):
    result=[]; current=''
    for char in s:
        if draw.textlength(current+char,font=font(size,bold))>maxw and current:
            result.append(current);current=char
        else: current+=char
    if current: result.append(current)
    return result

def block(x,y,s,maxw,size=28,color=MUTED,bold=False,leading=40,maxlines=None,label=''):
    rows=wrap(s,maxw,size,bold)
    if maxlines and len(rows)>maxlines: warnings.append(f'{label}: {len(rows)} lines > {maxlines}: {s}')
    for n,row in enumerate(rows): text(x,y+n*leading,row,size,color,bold)
    return y+len(rows)*leading

def picture(path,x,y,w,h):
    original=Image.open(path).convert('RGB')
    image.paste(ImageOps.fit(original,(w,h),method=Image.Resampling.LANCZOS),(x,y))
    mime='image/jpeg'
    encoded=base64.b64encode(path.read_bytes()).decode('ascii')
    clip=f'picture-{x}-{y}'
    parts.append(f'<clipPath id="{clip}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8"/></clipPath>')
    parts.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#{clip})" xlink:href="data:{mime};base64,{encoded}"/>')

def effect_picture(path,x,y,w,h):
    """Keep whole source in view, including editor controls and portrait assets."""
    original=Image.open(path).convert('RGB')
    foreground=ImageOps.contain(original,(w,h),method=Image.Resampling.LANCZOS)
    tile=Image.new('RGB',(w,h),'#131b22')
    tile.paste(foreground,((w-foreground.width)//2,(h-foreground.height)//2))
    image.paste(tile,(x,y))
    import io
    buffer=io.BytesIO();tile.save(buffer,format='JPEG',quality=91)
    encoded=base64.b64encode(buffer.getvalue()).decode('ascii')
    parts.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" xlink:href="data:image/jpeg;base64,{encoded}"/>')

def motif(kind,x,y,c):
    # Original explanatory diagrams; these are not screenshots of the libraries.
    dim='#527078'; soft='#293b44'
    if kind=='film':
        for i,ww in enumerate([76,54,89]): rect(x+i*86,y+25,ww,38,c if i==0 else soft,r=4)
        line(x,y+91,x+255,y+91,dim); line(x+72,y+10,x+72,y+105,c,3)
    elif kind in ('flow','sequence'):
        for i in range(3):
            rect(x+i*90,y+35,65,45,soft,c if i==1 else dim,7)
            if i<2: line(x+i*90+65,y+57,x+(i+1)*90-7,y+57,c,2)
        if kind=='sequence':
            for i in range(3): circle(x+32+i*90,y+99,4,c)
    elif kind=='math':
        line(x+20,y+92,x+235,y+92,dim);line(x+35,y+110,x+35,y+5,dim)
        line(x+35,y+92,x+225,y+32,c,5);line(x+35,y+92,x+176,y+72,'#7eaaa0',4)
        poly([(x+210,y+28),(x+225,y+32),(x+216,y+44)],stroke=c,width=3)
    elif kind=='asset':
        circle(x+148,y+62,43,None,dim);circle(x+148,y+62,30,soft,c)
        poly([(x+131,y+61),(x+145,y+75),(x+169,y+46)],stroke=c,width=4)
        for i in range(5):
            a=i*math.tau/5;circle(x+148+math.cos(a)*60,y+62+math.sin(a)*48,3,c)
    elif kind=='letters':
        for i,ch in enumerate('AURA'): text(x+i*65,y+12+(3-i)*13,ch,48,c if i==3 else dim,True)
        line(x,y+106,x+250,y+106,dim)
    elif kind in ('spring','signal'):
        pts=[]
        for i in range(91):
            xx=i*2.8
            yy=55+math.sin(i*.15)*math.exp(-i/38)*40 if kind=='spring' else 60-30*math.tanh((i-34)/12)+8*math.sin(i*.07)
            pts.append((x+xx,y+yy))
        poly(pts,stroke=c,width=3)
        if kind=='signal': poly([(x,y+90),(x+80,y+90),(x+80,y+20),(x+250,y+20)],stroke=dim,width=2)
    elif kind=='gauge':
        circle(x+135,y+62,48,None,dim,4);line(x+135,y+62,x+170,y+27,c,5);circle(x+135,y+62,7,c)
        text(x+206,y+55,'%',26,c)
    elif kind=='shapes':
        circle(x+58,y+62,30,None,c,3);rect(x+110,y+32,59,59,soft,dim,5)
        poly([(x+202,y+92),(x+235,y+25),(x+268,y+92)],stroke=c,width=3,close=True)
    elif kind=='editor':
        rect(x+58,y+20,170,80,soft,dim,4)
        for xx in [58,228]:
            for yy in [20,100]: rect(x+xx-5,y+yy-5,10,10,c,r=1)
        poly([(x+153,y+42),(x+167,y+73),(x+161,y+77),(x+153,y+61)],fill=c,close=True)
    elif kind=='particles':
        rng=random.Random(42)
        for _ in range(48):
            a=rng.random()*math.tau;r=rng.random()*110
            circle(x+140+math.cos(a)*r,y+58+math.sin(a)*r*.45,rng.randint(2,4),c if rng.random()>.5 else dim)
    elif kind in ('cube','render','layers','world'):
        if kind=='world':
            circle(x+142,y+61,48,None,c,2)
            for i in [-1,0,1]: line(x+97,y+61+i*20,x+187,y+61+i*20,dim)
            poly([(x+142,y+13),(x+120,y+61),(x+142,y+109),(x+165,y+61),(x+142,y+13)],stroke=dim,width=2)
        elif kind=='layers':
            for dy in [40,20,0]: poly([(x+60,y+35+dy),(x+150,y+5+dy),(x+240,y+35+dy),(x+150,y+65+dy)],fill=soft,stroke=c if dy==0 else dim,close=True)
        else:
            pts=[(x+145,y+4),(x+207,y+36),(x+145,y+70),(x+83,y+36)]
            poly(pts,fill=soft,stroke=c,width=2,close=True)
            poly([(x+83,y+36),(x+83,y+85),(x+145,y+118),(x+207,y+85),(x+207,y+36)],stroke=dim,width=2)
            line(x+145,y+70,x+145,y+118,c)
            if kind=='render':line(x+30,y+7,x+85,y+50,c);circle(x+23,y+2,8,c)
    elif kind=='game':
        rect(x+50,y+25,200,80,soft,dim,25)
        rect(x+76,y+57,48,12,c,r=3);rect(x+94,y+39,12,48,c,r=3)
        circle(x+203,y+54,9,c);circle(x+224,y+76,9,dim)
    elif kind=='palette':
        pal=['#d7e6a6','#7ea589','#587c83','#baafcf','#d6b583','#a96e63']
        for i in range(12):rect(x+(i%6)*39,y+25+(i//6)*38,31,31,pal[i%6],r=3)
        line(x+5,y+109,x+225,y+109,dim)

# Header, framework, and actual rendered evidence strip.
text(120,75,'MOTION ATLAS  /  RESEARCH 0001  /  '+DATA['date'],28,MUTED)
text(120,140,DATA['title'],104,INK,True)
text(120,285,DATA['subtitle'],42,MUTED)
rect(120,375,3360,88,'#263a31',r=10)
text(155,398,'当前选择：Remotion 为主干  ·  Lottie 学素材接入  ·  Anime.js 按需  ·  小库不必学全',40,COLORS['green'],True)
for i,item in enumerate(DATA['layers']):
    x=120+i*1130
    rect(x,510,1100,224,PANEL,LINE,12)
    text(x+30,536,f'0{i+1}  '+item['name'],44,INK,True)
    block(x+30,605,item['what'],1010,30,MUTED,leading=44,maxlines=2,label='layer')
    text(x+30,688,item['effect'],26,COLORS['cyan'])
text(120,773,'SKILL 在流程之上：指导 AI 怎么做；库与软件负责运行。精品还需要素材、构图、节奏与声音。',32,MUTED)
text(120,841,'先看结果 / 电影影像 · 可玩世界 · 粒子视觉；工具各管哪一层，见下方对应卡片',28,COLORS['cyan'])
for i,(key,detail) in enumerate([
    ('blender','Blender / 角色、材质与电影镜头'),
    ('godot','Godot / 可操作的游戏世界'),
    ('proton','Proton / 粒子行为与视觉氛围')]):
    x=120+i*1130
    rect(x,902,1100,290,PANEL,LINE,10)
    picture(OUT/'effects'/MEDIA[key]['poster'],x+4,906,1092,282)
    rect(x+4,1100,1092,88,'#14212b',r=0)
    text(x+25,1110,detail,31,INK,True)
    text(x+25,1157,MEDIA[key]['credit'],20,MUTED)
text(120,1232,'让结果说话 / 真实画面 × 作用 × 场景 × 引入成本',37,INK,True)
text(2510,1246,'原作、实测与资产预览分别署名',24,MUTED)

# 18 cards. Every body field has an explicit line budget checked below.
for index,t in enumerate(DATA['tools']):
    row,col=divmod(index,3);x=120+col*1130;y=1320+row*1030;c=COLORS[t['color']]
    media=MEDIA[t['id']]
    rect(x,y,1100,1000,PANEL,LINE,12)
    rect(x,y,7,1000,c,r=3)
    text(x+31,y+23,f'{index+1:02d} / '+t['category'],24,c)
    text(x+31,y+63,t['name'],44,INK,True,t['repository'])
    path=OUT/'effects'/media['poster']
    if not path.exists():raise SystemExit(f'Missing real effect poster: {path}')
    source=media['source'] if media['source'].startswith('https://') else 'https://yydshly.github.io/20261115_codex_project/demos/0001-animation-skills-atlas/'+media['source'].removeprefix('./')
    parts.append(f'<a href="{escape(source,quote=True)}" target="_blank"><title>{escape(media["credit"]+"；"+media["note"])}</title>')
    effect_picture(path,x+17,y+130,1066,390)
    parts.append('</a>')
    text(x+31,y+536,media['title'],29,INK,True)
    block(x+31,y+580,media['credit'],1030,21,'#849d98',leading=30,maxlines=2,label=t['id']+' credit')
    text(x+31,y+638,t['input']+'  →  '+t['output'],25,c)
    for label,key,dy in [('作用','role',690),('场景','when',754),('效果','effect',818),('成本','cost',882)]:
        text(x+31,y+dy,label,26,c,True)
        block(x+119,y+dy,t[key],938,26,INK if key=='effect' else MUTED,leading=36,maxlines=2,label=t['id']+' '+key)
    rect(x+31,y+956,500,33,'#263b36',r=4)
    text(x+44,y+961,'AI 视频：'+t['advice'],22,c)
    # Evidence category is written, rather than implying every tool was run.
    text(x+650,y+961,t['evidence'],21,'#9cb1a7')

# Decision / honesty footer, preserved inside the single image.
fy=7540
text(120,fy,'怎么配合？按任务增加，不按清单堆叠。',47,INK,True)
routes=[('普通成片','AI 素材 / 文案  →  Remotion 镜头、字幕、音频  →  MP4 / GIF'),('专业片段','数学用 Manim，流程用 Motion Canvas，三维按题材选工具  →  素材回到成片'),('资产复用','优质 Lottie 或现成复杂 Anime 片段  →  按帧接入、验片  →  减少重复制作')]
for i,(name,desc) in enumerate(routes):
    yy=fy+90+i*72
    rect(120,yy,170,49,'#2b4137',r=4);text(139,yy+8,name,27,COLORS['green'],True)
    text(326,yy+8,desc,31,MUTED)
line(120,fy+335,3480,fy+335)
text(120,fy+368,'理解边界',30,COLORS['amber'],True)
text(340,fy+368,'① 画面能相似，工作流不同。  ② 复用收益不等于渲染提速。  ③ 没有素材或现成逻辑时，可以不加库。',29,MUTED)
text(120,fy+420,'验证口径',30,COLORS['amber'],True)
text(340,fy+420,'官方预览不等于本地实测；LUME 图为示例模型资产预览。Ola / TweenJS 只承担作品中的一层。',28,MUTED)
text(120,fy+482,'真实案例',30,COLORS['amber'],True)
text(340,fy+482,'Lottie 官方产品动效 · DARK · ZIM · Polotno · Sprite Fright · DOGWALK；gifenc 仅编码，不负责画稿。',27,MUTED)
text(120,fy+553,'资料截至本轮研究。完整证据见项目 cases.html；SVG 技术名称可点击打开仓库。未核实的商业使用与性能收益不作推断。',26,'#7f9691')
parts.append('</svg>')
if warnings:
    raise SystemExit('Layout budget exceeded:\n'+'\n'.join(warnings))
svg=ROOT/'assets/technology-understanding.svg'
svg.write_text('\n'.join(parts),encoding='utf-8')
png=OUT/'technology-understanding.png'
image.save(png,optimize=True)
# A small QA contact sheet, never substituted for the full-size artifact.
proof=image.copy();proof.thumbnail((1440,3320));proof.save(OUT/'technology-understanding-preview.jpg',quality=90)
print(json.dumps({'svg':str(svg),'png':str(png),'dimensions':[W,H],'cards':len(DATA['tools']),'layout_warnings':warnings},ensure_ascii=False))

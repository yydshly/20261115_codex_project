"""Render one editable SVG overview and its matching high-resolution PNG.

Code-native information design, not an AI-generated illustration or a game screenshot.
Uses the same locally available Pillow/font setup as the project's asset tools.
"""
from html import escape
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
WEB = ROOT / 'web/assets/journal'
W, H, SCALE = 2400, 1800, 2
PAPER, INK, MUTED = '#f2efdf', '#435d48', '#75846b'
LINE, GREEN, GOLD = '#cad3b8', '#e5ead6', '#a38d60'
FONTS = Path('C:/Windows/Fonts')
FILES = {'body': FONTS/'msyh.ttc', 'bold': FONTS/'msyhbd.ttc', 'serif': FONTS/'simsun.ttc'}
assert all(path.is_file() for path in FILES.values()), 'Expected the project Windows fonts'
image = Image.new('RGB', (W*SCALE, H*SCALE), PAPER)
draw = ImageDraw.Draw(image)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
       '<title id="title">风归小庭：做了什么、价值、扩展与参考思路</title>',
       '<desc id="desc">当前为可玩的庭院原型。目标是 AI 居民驱动的共同生活模拟。图分开说明已实现功能、待验证价值、尚未接入的扩展和六组参考方法。</desc>']
font_cache = {}


def font(size, kind='body'):
    key = (size, kind)
    if key not in font_cache:
        font_cache[key] = ImageFont.truetype(str(FILES[kind]), round(size*SCALE))
    return font_cache[key]


def text(x, y, value, size=28, color=INK, kind='body'):
    f = font(size, kind)
    ascent = f.getmetrics()[0]/SCALE
    draw.text((round(x*SCALE), round((y+ascent)*SCALE)), value, font=f, fill=color, anchor='ls')
    family = 'SimSun,Noto Serif CJK SC,serif' if kind == 'serif' else 'Microsoft YaHei,Noto Sans CJK SC,sans-serif'
    weight = 700 if kind == 'bold' else 400
    svg.append(f'<text x="{x}" y="{y+ascent:.2f}" fill="{color}" font-family="{family}" font-size="{size}" font-weight="{weight}">{escape(value)}</text>')


def rect(x, y, w, h, fill, radius=0, stroke=None, width=1):
    box = tuple(round(v*SCALE) for v in (x, y, x+w, y+h))
    draw.rounded_rectangle(box, round(radius*SCALE), fill=fill, outline=stroke, width=max(1, round(width*SCALE)))
    outline = f' stroke="{stroke}" stroke-width="{width}"' if stroke else ''
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}"{outline}/>')


def line(x1, y1, x2, y2, color=LINE, width=2):
    draw.line(tuple(round(v*SCALE) for v in (x1, y1, x2, y2)), fill=color, width=round(width*SCALE))
    svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"/>')


def circle(x, y, r, fill, stroke=None, width=1):
    draw.ellipse(tuple(round(v*SCALE) for v in (x-r, y-r, x+r, y+r)), fill=fill, outline=stroke, width=max(1, round(width*SCALE)))
    outline = f' stroke="{stroke}" stroke-width="{width}"' if stroke else ''
    svg.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"{outline}/>')


def bullet(x, y, value, size=29):
    circle(x+6, y+22, 4, GOLD)
    text(x+27, y, value, size)


def card(x, y, title, status, fill=GREEN):
    rect(x, y, 1068, 500 if y == 370 else 550, fill, 22, LINE, 1.5)
    text(x+40, y+29, title, 39, kind='bold')
    text(x+40, y+88, status, 23, MUTED)
    line(x+40, y+139, x+1028, y+139)


rect(0, 0, W, H, PAPER)
text(100, 52, 'OUR UNDERSTANDING / 一张图看清现状与方向', 24, MUTED)
text(100, 105, '风归小庭｜我们的理解总览', 76, kind='serif')
text(100, 217, '定位方向：与有自主日常和主见的 AI 居民，共同建设并经历生活事件。', 31)

# Abstract relationship symbols; no third-party game artwork or fabricated NPC portrait.
line(2064, 110, 2220, 164, '#b9c5a8', 3)
line(2220, 164, 2078, 220, '#b9c5a8', 3)
line(2078, 220, 2064, 110, '#b9c5a8', 3)
for x, y, label in [(2064,110,'世界'),(2220,164,'人物'),(2078,220,'玩法')]:
    circle(x,y,39,'#e4e8d3', '#b4c29e', 2)
    text(x-25,y-18,label,25)

rect(100, 295, 2180, 46, '#e6e7d6', 8)
text(124, 303, '已实现：庭院原型', 24, '#526e4c', 'bold')
text(620, 303, '目标设计：AI 居民与完整模式', 24, '#957d4f', 'bold')
text(1510, 303, '价值判断：仍需真实试玩验证', 24, MUTED)

card(100,370,'01  做了什么','现有可玩原型 · 功能与状态已有验证')
for i, value in enumerate(['风铃纸笺 · 种植照料','自主橘猫 · 小屋与昼夜晴雨','花盆、长椅、茶桌与小径的实际布置','五封预写来信 · 当前浏览器存档']):
    bullet(143, 536+i*57, value, 30)
text(143, 790, '既有 39 项规则与数据检查通过。', 24, MUTED)
text(143, 829, '功能可用，不等于已证明玩家会长期停留。', 24, MUTED)

card(1232,370,'02  价值是什么','设计价值与待验证假设 · 不把意图当作效果', '#f8f3e4')
text(1275, 535, '对玩家', 29, kind='bold')
for i, value in enumerate(['有自己的地方：能认出亲手留下的改变','有想完成的事：观察、判断、行动与结果','有在意的人：平等相处，积累共同经历']):
    bullet(1275, 585+i*52, value, 28)
text(1275, 751, '对我们：素材 → 场景 → 玩法 → 持续状态', 28, kind='bold')
text(1275, 815, '还要验证：他能独立生活吗？一起做事好玩吗？', 24, MUTED)

card(100,915,'03  可以怎样扩展','以下均为目标路线 · AI 居民与完整模式尚未接入', '#f8f3e4')
for y, title, detail in [
    (1080,'先：一名真实 AI 居民','观察 → 计划 → 动作 → 事实 → 记忆 → 交流'),
    (1181,'再：一个完整事件短篇','有具体目标、空间约束、共同行动和不同结果'),
    (1282,'后：连续关系与更大的日常','自己的日程、来访、溪岸、季节与跨次共同经历'),
]:
    text(143,y,title,31,kind='bold')
    text(143,y+47,detail,26,MUTED)
for x, label in [(143,'日常生活'),(460,'事件短篇'),(777,'庭院创作')]:
    rect(x,1391,276,45,'#e1e7cf',7)
    text(x+66,1398,label,25)

card(1232,915,'04  参考哪些思路','以官方资料为依据 · 取设计方法，建立自己的定位')
references=[
    ('动森','地方归属与邻里日常'),
    ('牧场物语／星露谷','经营成长与明确目标'),
    ('模拟人生','性格、日程与生活系统'),
    ('时光系列','建设成果被社区实际使用'),
    ('Spiritfarer','行动与人物旅程相连'),
    ('inZOI','合理自主行为要在世界中落地'),
]
for i,(name,meaning) in enumerate(references):
    y=1081+i*55
    text(1275,y,name,27,kind='bold')
    text(1635,y,meaning,27)
text(1275,1421,'官方定位、我们的判断、当前实现分别记录。',23,MUTED)

rect(100,1510,2180,159,'#516b53',17)
text(140,1530,'目标核心循环｜角色有自己的生活，游戏有独立规则与可玩的事情',27,'#ede9cf')
text(165,1590,'发现问题  →  表达意见  →  协商与行动  →  世界变化  →  共同记忆',35,'#fbf4df','bold')
text(100,1700,'当前边界：规则驱动的猫 ＋ 预写来信；AI 居民、自然对话与完整模式体系尚未接入。',27,'#8a754f','bold')
text(100,1753,'风归小庭 · 理解总览 v1 · 2026.11.17 ｜ 原创信息图，非游戏截图 ｜ 参考出处与完整说明见网页',22,MUTED)
svg.append('</svg>')

OUT.mkdir(exist_ok=True)
WEB.mkdir(parents=True, exist_ok=True)
svg_path = OUT/'understanding-overview-v1.svg'
png_path = OUT/'understanding-overview-v1.png'
svg_path.write_text('\n'.join(svg)+'\n',encoding='utf-8')
image.resize((W,H),Image.Resampling.LANCZOS).save(png_path,optimize=True)
for path in [svg_path,png_path]:
    shutil.copyfile(path,WEB/path.name)
manifest={
    'date':'2026-11-17','size':[W,H],'method':'Original code-native SVG + Pillow PNG, no image-generation service',
    'script':'scripts/render_understanding_overview.py',
    'scope':'Current prototype / target design / value hypotheses are explicitly separated',
    'artwork':'Original typography, shapes and relationship symbols; no third-party artwork embedded',
    'fonts':'System Microsoft YaHei and SimSun; SVG keeps editable text with font fallback; no font files embedded',
    'files':[{'path':str(path.relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()} for path in [svg_path,png_path]],
}
(OUT/'understanding-overview-v1.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Rendered {W}x{H}: {svg_path} and {png_path}')

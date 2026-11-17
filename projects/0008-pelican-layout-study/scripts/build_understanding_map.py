"""Author a single illustrated research map as an editable SVG and a sharp PNG.

This is deterministic diagram composition, not image generation or a modification
of the quoted artwork. Existing source images are fitted without cropping;
text/shapes are mirrored into SVG, and source/attribution records are preserved.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import base64
import hashlib
import html
import json

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
W, H, SCALE = 1800, 1350, 3
BG = '#f3f0e7'
INK = '#234338'
MUTED = '#6c796a'
GOLD = '#b5824f'
LINE = '#d4d9c9'
FOREST = '#183a30'
CREAM = '#f1ead8'
PALE = '#c3d0bd'
FONTS = {
    'regular': Path('C:/Windows/Fonts/msyh.ttc'),
    'bold': Path('C:/Windows/Fonts/msyhbd.ttc'),
    'serif': Path('C:/Windows/Fonts/simsun.ttc'),
}


class Map:
    def __init__(self):
        self.image = Image.new('RGB', (W*SCALE, H*SCALE), BG)
        self.draw = ImageDraw.Draw(self.image)
        self.svg = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
                    '<title id="title">艺术巡游研究：我们的理解与创作价值</title>',
                    '<desc id="desc">上方为五幅原片证据，中间从原作的组织关系提炼艺术统筹、叙事规划、情绪组织和跨题材迁移的价值，右侧连接艺术、历史与氛围的应用方向，下方是光、雨与传送实验的教训及后续工作顺序。</desc>',
                    f'<rect width="{W}" height="{H}" fill="{BG}"/>']
        self.fonts = {}
        self.sources = []
        self.text_boxes = []
        self.counter = 0

    def font(self, size, family='regular'):
        key = (size, family)
        if key not in self.fonts:
            self.fonts[key] = ImageFont.truetype(str(FONTS[family]), round(size*SCALE))
        return self.fonts[key]

    def rect(self, x, y, w, h, fill, radius=0, stroke=None, width=1):
        box = tuple(round(n*SCALE) for n in (x, y, x+w, y+h))
        if radius:
            self.draw.rounded_rectangle(box, round(radius*SCALE), fill=fill, outline=stroke, width=round(width*SCALE))
        else:
            self.draw.rectangle(box, fill=fill, outline=stroke, width=round(width*SCALE))
        self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{width}"' if stroke else '')+'/>')

    def line(self, points, color=LINE, width=1):
        self.draw.line([(round(x*SCALE), round(y*SCALE)) for x, y in points], fill=color, width=round(width*SCALE), joint='curve')
        self.svg.append('<polyline points="'+' '.join(f'{x},{y}' for x, y in points)+f'" fill="none" stroke="{color}" stroke-width="{width}"/>')

    def arrow(self, x1, y1, x2, y2, color=GOLD, width=2):
        self.line([(x1,y1),(x2,y2)], color, width)
        if abs(x2-x1) >= abs(y2-y1):
            sign = 1 if x2>x1 else -1
            head = [(x2-sign*7,y2-5),(x2,y2),(x2-sign*7,y2+5)]
        else:
            sign = 1 if y2>y1 else -1
            head = [(x2-5,y2-sign*7),(x2,y2),(x2+5,y2-sign*7)]
        self.line(head, color, width)

    def circle(self, x, y, radius, fill, stroke=None):
        self.draw.ellipse([(x-radius)*SCALE,(y-radius)*SCALE,(x+radius)*SCALE,(y+radius)*SCALE],fill=fill,outline=stroke,width=SCALE)
        self.svg.append(f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{fill}"'+(f' stroke="{stroke}"' if stroke else '')+'/>')

    def text(self, x, y, content, size=16, color=INK, family='regular', max_width=None, line_height=None, align='left', region=None):
        font = self.font(size, family)
        line_height = line_height or size*1.48
        lines = []
        for paragraph in content.split('\n'):
            line = ''
            for char in paragraph:
                if max_width and line and self.draw.textlength(line+char, font=font) > max_width*SCALE:
                    lines.append(line); line = char
                else:
                    line += char
            lines.append(line)
        ascent = font.getmetrics()[0]
        svg_family = 'SimSun,serif' if family == 'serif' else 'Microsoft YaHei,Noto Sans CJK SC,sans-serif'
        for index, value in enumerate(lines):
            width = self.draw.textlength(value, font=font)/SCALE
            left = x-width/2 if align=='center' else x-width if align=='right' else x
            baseline = (y+index*line_height)*SCALE+ascent
            self.draw.text((left*SCALE,baseline),value,font=font,fill=color,anchor='ls')
            bbox = self.draw.textbbox((left*SCALE,baseline),value,font=font,anchor='ls')
            bbox = [v/SCALE for v in bbox]
            assert bbox[0]>=0 and bbox[1]>=0 and bbox[2]<=W and bbox[3]<=H, (value,bbox)
            if region:
                a,b,c,d=region
                assert bbox[0]>=a-1 and bbox[1]>=b-1 and bbox[2]<=c+1 and bbox[3]<=d+1,(value,bbox,region)
            self.text_boxes.append({'text':value,'box':bbox})
            self.svg.append(f'<text x="{left:.2f}" y="{baseline/SCALE:.2f}" font-family="{svg_family}" font-size="{size}" font-weight="{700 if family=="bold" else 400}" fill="{color}">{html.escape(value)}</text>')
        return y+len(lines)*line_height

    def photo(self, source, x, y, w, h, label):
        path = ASSETS / source
        original = Image.open(path).convert('RGB')
        # Fit the complete frame: no cropping/redrawing of evidence.
        ratio = min(w/original.width, h/original.height)
        dw,dh=original.width*ratio,original.height*ratio
        left,top=x+(w-dw)/2,y+(h-dh)/2
        raster=original.resize((round(dw*SCALE),round(dh*SCALE)),Image.Resampling.LANCZOS)
        self.image.paste(raster,(round(left*SCALE),round(top*SCALE)))
        thumb=original.copy();thumb.thumbnail((round(w*2),round(h*2)),Image.Resampling.LANCZOS)
        data=BytesIO();thumb.save(data,format='JPEG',quality=92,subsampling=0)
        encoded=base64.b64encode(data.getvalue()).decode('ascii')
        self.svg.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/jpeg;base64,{encoded}"><title>{html.escape(label)}</title></image>')
        self.sources.append({'source':source,'role':label,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'display':'full frame, aspect fitted without crop'})

    def save(self):
        stem=ASSETS/'research-understanding-map-20261117'
        self.svg.append('</svg>')
        stem.with_suffix('.svg').write_text('\n'.join(self.svg)+'\n',encoding='utf-8')
        self.image.save(stem.with_suffix('.png'),optimize=True,dpi=(300,300))
        self.image.save(stem.with_suffix('.jpg'),quality=94,subsampling=0,optimize=True,dpi=(300,300))
        # Inspection-only copies; the delivered map remains one complete image.
        self.image.resize((1800,1350),Image.Resampling.LANCZOS).save(ASSETS/'understanding-map-layout-check.jpg',quality=94)
        self.image.crop((485*SCALE,460*SCALE,1315*SCALE,896*SCALE)).save(ASSETS/'understanding-map-value-check.png')
        record={'date':'2026-11-17','type':'deterministic illustrated research diagram','canvas_svg':[W,H],'raster':[W*SCALE,H*SCALE],
                'new_ai_images':False,'source_artwork_edited':False,'source_images':self.sources,
                'text_runs':len(self.text_boxes),'text_region_bounds':'passed','sources_and_interpretation':'Original frames quoted from NFT_Chen post; values/methods are our research interpretation. Experiment images are our prior screenshots, not original work and not validated art-quality reproductions.',
                'original_post':'https://x.com/nft_chen/status/2121616583110115341',
                'unknown':['author workflow/source code/model claims not independently verified','history sequence is a reading thread, not strict chronology'],
                'outputs':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [stem.with_suffix('.png'),stem.with_suffix('.svg'),stem.with_suffix('.jpg')]}}
        (ASSETS/'research-understanding-map-record.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({'outputs':record['outputs'],'text_runs':record['text_runs']},ensure_ascii=False,indent=2))


def main():
    m=Map()
    m.rect(0,0,W,148,FOREST)
    m.text(54,20,'FIELD STUDY 008   /   原作证据 → 创作价值 → 实践校准',12,PALE)
    m.text(54,50,'艺术巡游：我们的理解与创作价值',43,CREAM,'serif')
    m.text(56,111,'把一个主题组织成可跟随、可感受、能留下余味的完整经历。',18,'#d2dccc')
    m.text(1746,27,'研究汇总',17,'#e0bb85',align='right')
    m.text(1746,57,'2026.11.17',14,PALE,align='right')
    m.text(1746,104,'原片观察  /  我们的解读  /  本站实验',12,PALE,align='right')

    m.text(54,169,'原作证据｜同一个题目，进入不同的表达系统',20,INK,'bold')
    m.text(1746,175,'20 个艺术场景 + 真实结尾 · 以下选取 5 个观察点',12,MUTED,align='right')
    originals=[
        ('reference/scene-05.jpg','山水｜尺度与路径','角色成为天地里的小小点景'),
        ('reference/scene-09.jpg','写意｜墨线与留白','主角与空间共享表达规则'),
        ('reference/scene-12.jpg','星夜｜笔触与动势','材料语言塑造整个画面'),
        ('reference/scene-17.jpg','界面｜观看身份改变','主角成为交流与观看的内容'),
        ('reference/ending-126.jpg','结尾｜把题目交回“本人”','局部 → 总览 → 空置发布席'),
    ]
    for i,(source,title,detail) in enumerate(originals):
        x=54+i*342
        m.rect(x-1,208,326,183,FOREST)
        m.photo(source,x,209,324,182.25,'原片引用：'+title)
        m.text(x,399,title,15,INK,'bold',max_width=324,region=(x,395,x+324,427))
        m.text(x,423,detail,12,MUTED,max_width=324,region=(x,420,x+324,447))
    m.line([(54,451),(1746,451)],LINE)

    # Reading direction: observed relationships -> transferable value -> future use.
    m.rect(485,466,830,430,FOREST,radius=12)
    m.text(54,476,'原作怎样成立',26,INK,'serif')
    m.text(54,514,'组织关系 / 观察与本次解读',12,MUTED)
    observations=[('持续题目','同一鸟、车与行动，提供稳定参照。'),('整幕艺术','画风同时塑造主角、环境与观看。'),('相邻承接','用疏密、明暗与尺度接住前后感受。'),('空间带路','路径、展板与镜头，让经历可跟随。'),('整体收束','从局部到总览，再回到“本人”空席。')]
    for i,(title,body) in enumerate(observations):
        y=550+i*55
        m.circle(65,y+13,11,'#e6e5d8')
        m.text(65,y+3,str(i+1),12,GOLD,'bold',align='center')
        m.text(88,y,title,18,INK,'bold')
        m.text(88,y+27,body,14,MUTED,max_width=360,region=(88,y+22,454,y+53))
    m.line([(54,833),(454,833)],LINE)
    m.text(54,844,'图像记录 → 绘画与舞台 → 电子媒介',13,GOLD,'bold')
    m.text(54,868,'有展开方向；这是阅读线索，不是严格历史年表。',12,MUTED,max_width=400)
    m.arrow(458,690,481,690)
    m.text(470,665,'提炼',10,MUTED,align='center')

    m.text(522,488,'对我们的价值与意义',30,CREAM,'serif')
    m.text(522,540,'沉淀组织艺术体验的能力，让下一次创作可以换题。',20,'#ddbe8d')
    values=[
        (522,589,'艺术统筹','让构图、造型、材料、光色与角色\n共同构成一个完整世界。','意义｜每幕有独立观看价值'),
        (923,589,'叙事规划','建立持续参照，分配每幕职责，\n安排整篇节奏与结尾回扣。','意义｜多个场景形成整体'),
        (522,733,'情绪组织','用尺度、疏密、明暗、揭示与停留，\n给惊奇和向往以画面依据。','意义｜感受可以被具体规划'),
        (923,733,'跨题材迁移','先定艺术、历史与氛围，\n再选择主体、场景与表达形式。','意义｜题材可换，方法可复用'),
    ]
    for x,y,title,body,meaning in values:
        m.rect(x,y,355,124,'#24463a',radius=7)
        m.text(x+16,y+10,title,24,CREAM,'bold')
        m.text(x+16,y+47,body,14.5,PALE,line_height=21,max_width=329,region=(x+12,y+42,x+344,y+95))
        m.text(x+16,y+96,meaning,15.5,'#e0ba81','bold',max_width=330,region=(x+12,y+91,x+345,y+123))
    m.text(900,868,'可复用的是组织关系；角色与技术要服务内容和感受。',13,'#b4c7b1',align='center')

    m.arrow(1319,690,1342,690)
    m.text(1330,665,'迁移',10,MUTED,align='center')
    m.text(1346,476,'可以用到哪里',26,INK,'serif')
    m.text(1346,514,'方向提案 / 尚待具体作品验证',12,MUTED)
    proposals=[
        ('艺术体验','用光、材料与画风组织空间。','艺术导览 / 互动展陈 / 视觉叙事'),
        ('历史叙事','把语境变成可进入的生活。','地方记忆 / 工艺演变 / 文化展示'),
        ('氛围旅程','让自然变化与人物回应相互接续。','风雨与季节 / 主题网站 / 短片'),
    ]
    for i,(title,body,uses) in enumerate(proposals):
        y=548+i*77
        m.text(1346,y,title,19,INK,'bold')
        m.text(1346,y+29,body,14,MUTED,max_width=400)
        m.text(1346,y+50,uses,12.5,GOLD)
    m.line([(1346,785),(1746,785)],LINE)
    m.text(1346,798,'内容明确后，再选择连接方式',15,INK,'bold')
    for row,labels in enumerate([['行旅','传送','进入细节','世界形变'],['同地换时','行动触发','形状接棒']]):
        x=1346
        for label in labels:
            width=m.draw.textlength(label,font=m.font(12.5))/SCALE+20
            m.rect(x,830+row*28,width,23,'#e4e8dc',radius=4)
            m.text(x+10,832+row*28,label,12.5,'#596e55')
            x+=width+8
    m.text(1346,888,'主体可以改变，历史题材另核对依据。',11.5,MUTED)

    m.text(54,926,'实践校准｜机制验证之后，仍要验收画面与感受',22,INK,'bold')
    m.text(1746,934,'以下均为本站实验截图，艺术完成度未达到原作参考标准',12,MUTED,align='right')
    examples=[
        (54,'light-emotion-playing.jpg','《光》｜静帧与网页动效','用户反馈：首版没有明显情绪。\n修订目标：近处惊奇 → 远处向往。','我们得到：感受必须有画面依据',False),
        (628,'rain-art-river.jpg','《雨》｜主角与连续空间','空间连上了，仍有普通 demo 感。\n材料、构图与观看内容仍需成立。','我们得到：连续性还需整幕美术',False),
        (1202,'review-20261117-garden.jpg','传送｜发现、穿越与回望','实际检查：巨叶遮挡主角与远方。\n艺术质量未达标，保留作反例。','我们得到：技术测试 ≠ 艺术验收',True),
    ]
    for x,source,title,body,lesson,failed in examples:
        m.rect(x,971,544,174,'#eeece1',radius=6,stroke='#d2c8b7' if failed else LINE)
        m.rect(x+14,985,176,99,FOREST)
        m.photo(source,x+14,985,176,99,'本站实验截图：'+title)
        m.text(x+14,1090,'实际页面截图 / 研究对照',10.5,MUTED)
        m.text(x+207,983,title,19,INK,'bold',max_width=323,region=(x+203,976,x+534,1015))
        m.text(x+207,1020,body,13.5,MUTED,line_height=23,max_width=323,region=(x+202,1018,x+534,1085))
        m.line([(x+14,1109),(x+530,1109)],LINE)
        m.text(x+14,1118,lesson,15.5,'#966547' if failed else '#5c7655','bold',max_width=516,region=(x+10,1113,x+533,1144))

    m.text(54,1170,'更可靠的工作顺序',18,INK,'bold')
    steps=[('艺术命题','想让人理解、感受什么'),('历史 / 文化依据','明确语境、核对来源'),('每幕关键画面','先让构图与美术成立'),('前后承接与结尾','让局部成为完整经历'),('主体 · 摄影 · 技术','把目标落实到真实观看'),('分开验收与记录','工程 / 画面 / 动态 / 反馈')]
    for i,(title,body) in enumerate(steps):
        x=54+i*287
        m.text(x,1203,title,17,INK,'bold',max_width=242)
        m.text(x,1231,body,12.5,MUTED,max_width=242)
        if i<5:m.arrow(x+247,1215,x+275,1215,'#9fae92',1.5)
    m.line([(54,1270),(1746,1270)],LINE)
    m.text(54,1284,'原片画面：@NFT_Chen 帖文引用，权利仍属相关权利人。氛围、价值与规划为本次研究解读，非作者公开总纲。',11.5,MUTED)
    m.text(54,1307,'来源：x.com/nft_chen/status/2121616583110115341   ·   详细依据：原作逐幕分析、创作方法与实验复盘。',11.5,MUTED)
    m.text(1746,1307,'20 幕 + 结尾  /  原作观察 · 研究解读 · 方向提案 · 本站实验',11.5,GOLD,align='right')
    m.save()


if __name__=='__main__':
    main()

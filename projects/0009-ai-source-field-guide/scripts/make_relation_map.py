"""Draw a concise research relationship map, using the existing source list."""
from html import escape
import json
import math
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw

from make_source_map import Drawing, source_data, ASSETS, PAPER, INK, MUTED, WHITE

WIDTH, HEIGHT = 2400, 1500
COLS = [80, 650, 1220, 1790]
COL_W = 500
COLORS = ["#315BBA", "#AA673F", "#50806D", "#745E9C"]
SOFT = ["#EAF0F9", "#F4ECE3", "#E8F0EA", "#EEEAF5"]


class RelationDrawing(Drawing):
    def __init__(self):
        super().__init__()
        self.image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
        self.draw = ImageDraw.Draw(self.image)
        self.nodes = []
        self.edges = []

    def path(self, points, color, width=3, dashed=False, arrow=True, relation=""):
        coordinates = " ".join(f"{x},{y}" for x,y in points)
        dash = ' stroke-dasharray="11 10"' if dashed else ''
        self.svg.append(f'<polyline points="{coordinates}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"{dash}/>')
        for start,end in zip(points, points[1:]):
            if dashed:
                length = math.dist(start,end)
                for offset in range(0,int(length),21):
                    a=offset/length; b=min(offset+11,length)/length
                    p1=tuple(start[i]+(end[i]-start[i])*a for i in (0,1))
                    p2=tuple(start[i]+(end[i]-start[i])*b for i in (0,1))
                    self.draw.line((*p1,*p2),fill=color,width=width)
            else:
                self.draw.line((*start,*end),fill=color,width=width)
        if arrow:
            previous,end=points[-2:]
            angle=math.atan2(end[1]-previous[1],end[0]-previous[0])
            for change in (-.55,.55):
                point=(end[0]-16*math.cos(angle+change),end[1]-16*math.sin(angle+change))
                self.line(*point,*end,color,width)
        self.edges.append({"points":points,"relation":relation,"type":"feedback" if dashed else "use"})

    def center(self, label,x,y,w,size=28,color=INK,bold=False):
        self.text(label,x+(w-self.width(label,size,bold))/2,y,size,color,bold,max_width=w)

    def node(self, key, name, role, x,y,w,h,url,kind="platform",color=COLORS[0],full_name=None):
        assert url.startswith("https://")
        self.svg.append(f'<a href="{escape(url,quote=True)}" target="_blank" rel="noopener noreferrer" aria-label="{escape((full_name or name)+"："+role,quote=True)}"><title>{escape((full_name or name)+"｜"+role+"｜"+url)}</title>')
        radius=52 if kind=="author" else 14
        fill="#FFFBF5" if kind=="author" else WHITE
        self.rect(x,y,w,h,fill,radius,"#D5DDD3",2)
        if kind=="project":
            self.line(x+w-29,y,x+w-29,y+29,"#BAAFCE",2)
            self.line(x+w-29,y+29,x+w,y+29,"#BAAFCE",2)
        elif kind=="platform":
            self.rect(x,y+22,5,h-44,color,2)
        size=32
        while self.width(name,size,True)>w-34:
            size-=1
        assert size>=23, name
        self.center(name,x,y+17,w,size,color,True)
        self.center(role,x,y+64,w,23,MUTED)
        self.svg.append('</a>')
        self.links.append(url)
        self.nodes.append({"id":key,"name":full_name or name,"kind":kind,"url":url,"x":x,"y":y,"width":w,"height":h,"value":role})

    def label(self,label,x,y,width,color=MUTED,size=23):
        self.rect(x-10,y-6,width+20,size+15,PAPER,4)
        self.text(label,x,y,size,color,max_width=width)


def main():
    data=source_data()
    platforms={p['id']:p for p in data['platforms']}
    authors={a['name']:a for a in data['authors']}
    repos={r['name']:r for r in data['repos']}
    d=RelationDrawing()
    d.rect(80,54,48,48,COLORS[0],7)
    d.text("知",91,61,29,WHITE,True)
    d.text("知源 / 关系总览",147,65,26,COLORS[0],True)
    d.text("AI 与开源：从信息入口，到自己的能力。",80,120,60,INK,True)
    d.text("从你的问题出发",80,208,25,INK,True)
    d.text("平台找线索  ·  作者讲清楚  ·  项目让你验证",340,209,25,MUTED)
    # Shape legend, separate from stage color: role and research phase are
    # different dimensions and must not imply an affiliation.
    for x,label,kind in [(1625,"平台","platform"),(1830,"作者","author"),(2035,"项目","project")]:
        d.rect(x,201,37,30,WHITE,15 if kind=="author" else 4,"#9CA99A",2)
        if kind=="project": d.line(x+25,201,x+25,212,"#9CA99A",2)
        d.text(label,x+51,201,23,MUTED)

    stages=[("发现","找到值得研究的候选"),("理解","读懂机制与取舍"),("验证","拿证据做判断"),("实践","跑通并改进项目")]
    for i,(title,sub) in enumerate(stages):
        x=COLS[i]
        d.rect(x,278,COL_W,126,COLORS[i],18)
        d.text(f"0{i+1}",x+28,303,25,"#DCE5EE")
        d.text(title,x+89,296,47,WHITE,True)
        d.text(sub,x+89,361,24,WHITE)
        d.rect(x,442,COL_W,780,SOFT[i],17)
        d.path([(x+250,405),(x+250,442)],COLORS[i],3,relation=f"{title}阶段使用下方来源")
        if i<3:
            d.path([(x+COL_W+9,340),(COLS[i+1]-11,340)],"#89978E",4,relation=f"{title} → {stages[i+1][0]}")

    def platform(pid,name,role,col,row,wide=False):
        x=COLS[col]+18+(0 if wide else (row[1]*244))
        y=row[0]
        p=platforms[pid]
        d.node(pid,name,role,x,y,464 if wide else 220,110,p['links'][0][1],color=COLORS[col],full_name=p['name'])

    # Discovery: four candidate sources, plus a smaller social supplement.
    platform("github","GitHub","开源代码",0,(475,0))
    platform("huggingface","Hugging Face","模型 / 论文 / 演示",0,(475,1))
    platform("hackernews","Show HN","作者发布与讨论",0,(650,0))
    platform("producthunt","Product Hunt","新工具与产品",0,(650,1))
    platform("linkedin","LinkedIn","跟踪从业者",0,(825,0))
    platform("threads","Threads","补充创作者线索",0,(825,1))
    d.center("主看代码与模型，社交入口按需补充",COLS[0],966,COL_W,23,MUTED)
    a=authors['阮一峰']
    d.node("ruanyifeng",a['name'],"作者推荐：发现工具",98,1062,464,110,a['url'],"author",COLORS[0])

    # Reading platforms are not attached to individual authors: these are two
    # independent inputs to understanding, not a publishing membership claim.
    platform("substack","Substack","跟作者，持续读",1,(475,0))
    platform("medium","Medium","带问题，找文章",1,(475,1))
    d.center("这一步，也可以直接读作者的博客",COLS[1],697,COL_W,23,MUTED)
    author_nodes=[('Simon Willison','Simon Willison','动手实验',668,770),('宝玉','宝玉','中文解读',912,770),('Andrej Karpathy','Karpathy','模型原理',668,952),('Sebastian Raschka','Raschka','架构与研究',912,952)]
    for key,name,role,x,y in author_nodes:
        d.node(key,name,role,x,y,220,110,authors[key]['url'],"author",COLORS[1],key)
    d.center("作者与证据，比付费和篇幅更重要",COLS[1],1130,COL_W,22,MUTED)

    # The same code/model hubs reappear as evidence, a deliberate cross-stage
    # relationship rather than assigning each platform to just one box.
    platform("reddit","Reddit · LocalLLaMA","实测 / 配置 / 失败案例",2,(475,0),True)
    d.node("github-evidence","仓库讨论","看维护回应",1238,700,220,110,platforms['github']['links'][1][1],color=COLORS[2])
    d.node("hf-evidence","模型卡","查条件与限制",1482,700,220,110,platforms['huggingface']['links'][0][1],color=COLORS[2])
    platform("discord","Discord","提问与复现",2,(865,0))
    platform("telegram","Telegram","核实项目公告",2,(865,1))
    a=authors['Hamel Husain']
    d.node("hamel",a['name'],"评估效果，分析失败",1238,1062,464,110,a['url'],"author",COLORS[2])

    # Repositories are alternatives for different jobs, not a required stack.
    project_nodes=[('llama.cpp','本地运行模型',475),('vLLM','提供推理服务',615),('Transformers','使用与理解模型',755),('LangGraph','组织 Agent 工作流',895)]
    for name,role,y in project_nodes:
        r=repos[name]
        d.node(name,name,role,1808,y,464,110,r['url'],"project",COLORS[3])
    a=authors['Eugene Yan']
    d.node("eugene",a['name'],"系统工程与产品实践",1808,1062,464,110,a['url'],"author",COLORS[3])

    # Cross-links: raw evidence joins the verification phase through an open
    # corridor; avoid edges over text or a tangle of all-to-all connections.
    d.path([(208,585),(208,619),(1470,619)],"#7F98B8",3,arrow=False,relation="GitHub 提供原始实现与维护证据")
    d.path([(452,585),(452,619)],"#7F98B8",3,arrow=False,relation="Hugging Face 提供模型卡与运行条件")
    d.path([(1470,619),(1470,660),(1348,660),(1348,700)],"#7F98B8",3,relation="回到仓库核对")
    d.path([(1470,660),(1592,660),(1592,700)],"#7F98B8",3,relation="回到模型卡核对")
    d.label("回到原始证据",869,603,250,COLORS[0],24)

    # A feedback loop makes the learning cycle explicit without another block
    # of instructions or pseudo-quantitative scores.
    d.path([(2040,1222),(2040,1280),(1470,1280),(1470,1222)],COLORS[2],3,True,relation="把实测与报错带回社区，更新判断")
    d.label("实测 / 报错 → 再核对",1535,1260,380,COLORS[2],25)
    d.text("你得到的价值",80,1270,27,INK,True)
    d.text("候选 → 解释 → 有依据的选择 → 自己验证过的能力",80,1322,35,COLORS[0],True)
    d.line(80,1400,2290,1400,"#D5DDD3",2)
    d.text("连线表示研究用途与使用顺序，不表示作者隶属平台或参与项目；四个项目按任务选用。",80,1431,23,MUTED)
    d.svg.append('<a href="source-map.svg" target="_blank" aria-label="查看包含全部链接与边界的详细清单图"><title>详细清单图</title>')
    d.text("详细链接与边界 →",2030,1431,23,COLORS[0])
    d.svg.append('</a>')

    for name,x,y,w,size in d.text_bounds:
        assert x>=0 and x+w<=WIDTH and y>=0 and y+size*1.5<HEIGHT,(name,x,y,w)
    for a in d.nodes:
        for b in d.nodes:
            if a is b:continue
            overlap=min(a['x']+a['width'],b['x']+b['width'])>max(a['x'],b['x']) and min(a['y']+a['height'],b['y']+b['height'])>max(a['y'],b['y'])
            assert not overlap,(a['id'],b['id'])
    desc="发现、理解、验证、实践四个阶段；11个平台、7位作者和4个项目放在对应研究用途下。平台提供候选与证据，作者补充解释与评估，项目承接实践；实测结果反馈到验证阶段。关系代表使用建议，不代表隶属或合作。"
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" aria-labelledby="title desc">
<title id="title">知源：AI 与开源信息源关系图</title><desc id="desc">{desc}</desc>
<style>text{{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif}}a:hover rect{{stroke:#315bba;stroke-width:3}}a:focus{{outline:4px solid #315bba}}</style>
<rect width="100%" height="100%" fill="{PAPER}"/>{''.join(d.svg)}</svg>'''
    root=ET.fromstring(svg)
    hrefs={node.get('href') for node in root.iter() if node.get('href','').startswith('https://')}
    expected={p['links'][0][1] for p in data['platforms']}
    expected.update(a['url'] for a in data['authors'])
    expected.update(r['url'] for r in data['repos'])
    assert expected.issubset(hrefs), expected-hrefs
    (ASSETS/'relation-map.svg').write_text(svg,encoding='utf-8')
    d.image.save(ASSETS/'relation-map.png',optimize=True)
    report={'width':WIDTH,'height':HEIGHT,'platforms':11,'authors':7,'repositories':4,'nodes':len(d.nodes),'external_links':len(hrefs),'text_lines':len(d.text_bounds),'node_overlap':False,'date':'2026-11-16','relation_meaning':'研究用途和使用顺序；不是作者隶属、项目合作或必须组合使用。','nodes_data':d.nodes,'edges_data':d.edges}
    (ASSETS/'relation-map-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({key:report[key] for key in ('width','height','nodes','external_links','text_lines','node_overlap')},ensure_ascii=False))


if __name__=='__main__':main()

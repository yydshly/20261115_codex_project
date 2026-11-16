"""Render one linked SVG and matching PNG from the guide's public source data.

Requires the existing Node.js runtime and Pillow. No downloads or remote fonts.
"""
from __future__ import annotations

from html import escape
import json
from pathlib import Path
import subprocess
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
W, MAX_H, M = 3000, 6200, 130
FONT = Path("C:/Windows/Fonts/msyh.ttc")
BOLD = Path("C:/Windows/Fonts/msyhbd.ttc")
PAPER, INK, MUTED = "#F7F6F0", "#26364A", "#667267"
BLUE, GREEN, ORANGE = "#315BBA", "#5B775B", "#BA6844"
LINE, WHITE = "#D9DED4", "#FFFEFA"


def source_data():
    code = "const fs=require('fs'),vm=require('vm');const c={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),c);process.stdout.write(JSON.stringify(c.window.sourceGuide));"
    result = subprocess.run(["node", "-e", code, str(ROOT / "web/data.js")], check=True, capture_output=True, text=True, encoding="utf-8")
    return json.loads(result.stdout)


class Drawing:
    def __init__(self):
        self.image = Image.new("RGB", (W, MAX_H), PAPER)
        self.draw = ImageDraw.Draw(self.image)
        self.svg = []
        self.links = []
        self.fonts = {}
        self.text_bounds = []

    def font(self, size, bold=False):
        key = (size, bold)
        if key not in self.fonts:
            self.fonts[key] = ImageFont.truetype(str(BOLD if bold else FONT), size)
        return self.fonts[key]

    def width(self, text, size, bold=False):
        return self.draw.textlength(text, font=self.font(size, bold))

    def rect(self, x, y, w, h, fill, radius=0, stroke=None, sw=1):
        self.draw.rounded_rectangle((x,y,x+w,y+h), radius=radius, fill=fill, outline=stroke, width=sw)
        self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke or "none"}" stroke-width="{sw}"/>')

    def line(self, x1, y1, x2, y2, color=LINE, width=2):
        self.draw.line((x1,y1,x2,y2), fill=color, width=width)
        self.svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"/>')

    def text(self, value, x, y, size=30, color=INK, bold=False, max_width=None):
        width = self.width(value,size,bold)
        if max_width is not None and width > max_width + 1:
            raise ValueError(f"Text overflow: {value} ({width:.1f} > {max_width})")
        assert 0 <= x and x + width <= W, value
        self.draw.text((x,y),value,font=self.font(size,bold),fill=color,anchor="lt")
        # SVG's hanging baseline differs by font. The explicit baseline keeps both
        # formats aligned for the Microsoft YaHei font used to measure the layout.
        self.svg.append(f'<text x="{x}" y="{y+size*.88:.2f}" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{escape(value)}</text>')
        self.text_bounds.append((value,x,y,width,size))

    def wrap(self, value, x, y, width, size=30, color=INK, bold=False, leading=None, max_lines=4):
        lines=[]
        for paragraph in value.split("\n"):
            line=""
            for char in paragraph:
                if line and self.width(line+char,size,bold)>width:
                    if char in '，。；：！？、）》”’' and len(line)>1:
                        lines.append(line[:-1]); line=line[-1]+char
                    else:
                        lines.append(line); line=char
                else:
                    line+=char
            lines.append(line)
        if len(lines)>max_lines:
            raise ValueError(f"Too many lines ({len(lines)}): {value}")
        leading=leading or round(size*1.5)
        for index,line in enumerate(lines):
            self.text(line,x,y+index*leading,size,color,bold,width)
        return len(lines)*leading

    def link(self, label, url, x, y, size=25, bold=False, max_width=None):
        assert url.startswith("https://"), url
        self.svg.append(f'<a href="{escape(url,quote=True)}" target="_blank" rel="noopener noreferrer" aria-label="{escape(label,quote=True)}"><title>{escape(url)}</title>')
        width=self.width(label,size,bold)
        self.svg.append(f'<rect x="{x-4}" y="{y-5}" width="{width+8}" height="{size+17}" fill="transparent"/>')
        self.text(label,x,y,size,BLUE,bold,max_width)
        self.line(x,y+size+8,x+width,y+size+8,"#A9BCE4",1)
        self.svg.append('</a>')
        self.links.append(url)
        return width

    def arrow(self,x,y,length=44,color=BLUE):
        self.line(x,y,x+length,y,color,3)
        self.line(x+length-11,y-8,x+length,y,color,3)
        self.line(x+length-11,y+8,x+length,y,color,3)

    def section(self, number, title, y, note=""):
        self.text(number,M,y+5,28,BLUE,True)
        self.text(title,M+78,y,45,INK,True)
        if note:
            self.text(note,M,y+67,27,MUTED)
        return y+115

    def save(self, height):
        self.image.crop((0,0,W,height)).save(ASSETS/"source-map.png", optimize=True)
        body='\n'.join(self.svg)
        full=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{height}" viewBox="0 0 {W} {height}" aria-labelledby="map-title map-description">
<title id="map-title">知源：AI 与开源信息源全景图</title>
<desc id="map-description">11 个平台的链接、作用、意义和使用边界，7 位作者、4 个项目、3 条研究路径、5 项检查标准，以及全部原始来源链接。蓝色名称可以点击。</desc>
<style>text{{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif}}a:hover text{{fill:#173D92}}a:focus{{outline:4px solid #315BBA}}</style>
<rect width="100%" height="100%" fill="{PAPER}"/>
{body}
</svg>'''
        (ASSETS/"source-map.svg").write_text(full,encoding="utf-8")
        parsed=ET.fromstring(full)
        hrefs={node.attrib['href'] for node in parsed.iter() if 'href' in node.attrib}
        return hrefs


def main():
    data=source_data()
    d=Drawing()
    inner=W-2*M
    d.rect(M,92,64,64,BLUE,7)
    d.text("知",M+13,101,38,WHITE,True)
    d.text("知源 / SOURCE FIELD NOTES",M+88,104,27,BLUE,True)
    d.text("0009  ·  2026.11.16  ·  AI & OPEN SOURCE",1945,110,24,MUTED)
    d.text("AI 与开源信息源，一张图读懂怎么用。",M,200,79,INK,True)
    d.text("11 个平台  /  7 位作者  /  4 个项目  /  3 条研究路径  ·  蓝色名称在矢量版与网页版中可点击",M,319,29,MUTED)
    d.rect(M,390,inner,110,"#E9EEE2",8)
    d.text("核心判断",M+28,425,31,GREEN,True)
    d.text("价值来自具体作者、原始证据与当前用途。能帮助你做选择、解决问题，才值得继续读。",M+215,426,30,INK,max_width=inner-250)

    stages=[("具体问题","先说清自己想解决什么"),("发现候选","找项目、模型与完整解释"),("核验证据","查原文、代码、配置与限制"),("形成判断","区分作者声明与自己的推断"),("最小实践","试一次，记录结果与边界")]
    stage_w=484; stage_gap=80
    for index,(title,meaning) in enumerate(stages):
        x=M+index*(stage_w+stage_gap)
        d.rect(x,555,stage_w,165,WHITE,10,LINE)
        d.text(f"0{index+1}",x+25,576,23,BLUE)
        d.text(title,x+78,572,37,INK,True)
        d.text(meaning,x+25,646,25,MUTED,max_width=stage_w-45)
        if index<4:d.arrow(x+stage_w+17,636,45)

    y=d.section("01","信息源地图：入口、价值、用法与判断边界",795,"阅读建议按 AI 与开源项目研究安排；这是用途划分，不是平台质量排行榜。")
    cols=[M,655,1385,2180]
    widths=[475,670,735,650]
    d.rect(M,y,inner,67,"#E7EBE3",5)
    for x,title in zip(cols,["入口 / 链接","作用与意义","怎样使用","需要核对的边界"]):d.text(title,x+20,y+18,27,INK,True)
    y+=67
    notes={
      "github":("代码与维护状态的直接证据。\n帮助判断项目是否值得进入候选。","周榜发现 → 查 README、许可证、近期提交和 Issue → 安排试跑。","Star 和榜单反映关注度；适配程度与可靠性需要另行验证。"),
      "huggingface":("把模型、论文、代码和演示串起来。\n方便从效果追到实现与研究。","从模型、论文榜或 Spaces 切入；继续查模型卡、数据、代码和论坛。","模型许可与软件许可分别查看；在线演示不能代替本地测试。"),
      "reddit":("找到用户的配置、踩坑和失败经验。\n帮助发现演示之外的问题。","在 r/LocalLLaMA 搜具体模型或工具，比较版本、硬件与测试方法。","实测与争论混杂；个人体验有环境限制，评论需追溯证据。"),
      "hackernews":("发现开发者作品与技术讨论。\n看作者如何解释取舍、回应质疑。","从 Show HN 进入项目与评论，关注性能、成本和替代方案。","不限 AI，也不保证全部开源；技术结论与许可证需逐项查。"),
      "substack":("持续阅读一位作者怎样形成判断。\n适合系统跟踪研究与技术趋势。","先读免费内容；挑两三位适合当前问题的作者，再决定长期订阅。","付费与长篇幅不证明质量；区分观点、研究事实和适用条件。"),
      "medium":("查完整教程、实现过程与项目复盘。\n补充“为什么这样做”的解释。","按工具名或具体问题找文章，检查日期、版本、代码与实验条件。","逐篇核验；热门推荐不能代替证据，旧教程可能不适配。"),
      "producthunt":("发现新产品及其使用场景。\n为选工具、看产品设计提供线索。","看到产品后进入官网与仓库，核对功能、定价、数据去向和源码。","发布信息有推广目的；榜单成绩与产品适用性要分别判断。"),
      "linkedin":("跟踪从业者与团队的公开经验。\n补充项目背景、人才与组织线索。","围绕明确的作者或团队关注，沿文章追到正式公告和原项目。","自述可能带有品牌宣传；技术能力与产品效果仍需核验。"),
      "discord":("进入具体项目的协作现场。\n查问题、提问、了解开发进展。","从项目官网或 README 加入；先搜旧问题，再带版本和复现提问。","价值来自具体社区；重要聊天结论追到 Issue、文档或版本记录。"),
      "telegram":("接收已确认来源的频道公告。\n补充项目消息与交流。","仅从项目官网或维护者提供的链接加入，收到消息后查正式资料。","传播快不证明准确；本轮未逐一审阅具体频道，不推荐未知群组。"),
      "threads":("补充跟踪创作者和开发者。\n通过人及作品发现新线索。","已有明确关注对象时使用，再沿作品链接进入文章与代码。","本轮官网抓取遇 429，未核对内容样本；作为可选补充入口。")
    }
    link_names={"github":["周榜","项目讨论"],"huggingface":["模型","论文","Spaces","论坛"],"reddit":["r/LocalLLaMA"],"hackernews":["Show HN","首页"],"substack":["Ahead of AI","读者指南"],"medium":["LLM 主题","关注说明"],"producthunt":["产品发布"],"linkedin":["职业社区"],"discord":["官网","项目社区入口"],"telegram":["官网"],"threads":["官网 / 访问受限"]}
    row_h=151
    for index,p in enumerate(data['platforms']):
        if index%2==0:d.rect(M,y,inner,row_h,"#F0F2EB")
        d.rect(M,y+19,5,row_h-38,BLUE if p.get('core') else "#A9B49E",2)
        d.link(p['name'],p['links'][0][1],cols[0]+21,y+14,35,True,widths[0]-22)
        d.text(p['level']+(' · 本次补充' if p.get('extra') else ''),cols[0]+21,y+69,23,MUTED,max_width=widths[0]-22)
        x=cols[0]+21
        for (unused,url),label in zip(p['links'],link_names[p['id']]):
            x+=d.link(label,url,x,y+111,23)+22
        for text,x,w in zip(notes[p['id']],cols[1:],widths[1:]):
            d.wrap(text,x+20,y+24,w-30,28,leading=41,max_lines=3)
        d.line(M,y+row_h,W-M,y+row_h)
        y+=row_h

    y+=65
    y=d.section("02","长文的价值：理解一个选择是怎样形成的",y)
    box_w=(inner-30)//2
    for i,(name,tag,title,body,fee,bg,color) in enumerate([
      ("Substack","从作者出发 · 持续跟踪","追踪观点怎样随新证据更新","订阅具体作者或刊物，通过邮件、网页与 App 阅读；先看原始引用、实验与判断边界。","通常按具体专栏付费；也有免费内容。","#F0E5DB",ORANGE),
      ("Medium","从问题出发 · 寻找文章","看清一次实践怎样走到结果","通过作者、主题与刊物发现教程和复盘；追到原代码，核对日期、依赖版本与实验条件。","主要通过平台会员读会员限定文章。","#E6ECE1",GREEN)]):
        x=M+i*(box_w+30)
        d.rect(x,y,box_w,292,bg,9)
        d.text(name,x+29,y+22,40,color,True)
        d.text(tag,x+430,y+34,26,color)
        d.text(title,x+29,y+93,34,INK,True)
        d.wrap(body,x+29,y+150,box_w-60,28,leading=43,max_lines=2)
        d.text(fee,x+29,y+249,25,MUTED)
    y+=331
    d.text("两者都能关注作者、发现文章。按作者和具体内容判断质量，先读免费内容再决定是否订阅。",M,y,28,MUTED)
    y+=110

    # Authors and projects are intentionally parallel: people explain; repositories
    # let the reader inspect implementations. All links stay visible in the SVG.
    left_w,right_x=1740,1950
    d.text("03",M,y+6,28,BLUE,True);d.text("具体关注：7 位作者",M+78,y,43,INK,True)
    d.text("04",right_x,y+6,28,BLUE,True);d.text("长期跟踪：4 个仓库",right_x+78,y,43,INK,True)
    y+=90
    author_start=y
    focuses={"Simon Willison":"LLM 动手实验、工具与开源实践","阮一峰":"中文工具发现、开发资源与技术趋势","Andrej Karpathy":"神经网络、LLM 原理与小型实现","Sebastian Raschka":"模型架构、训练、推理与论文解读","Hamel Husain":"AI 效果评估、错误分析与调试","Eugene Yan":"AI 系统、搜索推荐与产品工程","宝玉":"AI 编程实践、中文解读与翻译"}
    for i,a in enumerate(data['authors']):
        ay=author_start+i*90
        d.text(f"0{i+1}",M,ay+3,23,MUTED)
        d.link(a['name'],a['url'],M+55,ay,30,True,425)
        d.text(focuses[a['name']],M+510,ay+2,28,INK,max_width=1120)
        d.text(urlsplit(a['url']).hostname,M+510,ay+43,23,MUTED)
        d.line(M,ay+80,M+left_w,ay+80)
    for i,r in enumerate(data['repos']):
        ry=author_start+i*160
        d.link(r['name'],r['url'],right_x,ry,34,True)
        d.text(r['focus'],right_x,ry+48,28,INK)
        d.text(r['watch'].removeprefix('关注').rstrip('。'),right_x,ry+88,24,MUTED,max_width=920)
        d.text(f"{r['owner']}  ·  {r['license']}",right_x,ry+124,21,MUTED,max_width=920)
        d.line(right_x,ry+151,W-M,ry+151)
    y=author_start+7*90+38
    d.rect(M,y,inner,78,"#E9EEE2",6)
    d.text("先建立小清单",M+24,y+24,27,GREEN,True)
    d.text("GitHub + Hugging Face + LocalLLaMA 查项目；Simon Willison + 阮一峰补充阅读。其余随问题加入。",M+240,y+24,27,INK,max_width=inner-270)
    y+=143

    y=d.section("05","三条研究路径：把阅读带回实际问题",y)
    card_w=(inner-60)//3
    path_labels=[("find","找一个能用的工具","例：中文文档检索"),("evaluate","判断项目是否值得研究","例：新出现的 AI Agent"),("understand","深入理解一项技术","例：模型为何更省内存")]
    for i,(key,title,example) in enumerate(path_labels):
        x=M+i*(card_w+30)
        d.rect(x,y,card_w,383,WHITE,9,LINE)
        d.text(title,x+27,y+23,34,BLUE,True,max_width=card_w-55)
        d.text(example,x+27,y+78,25,MUTED)
        for j,step in enumerate(data['paths'][key]['steps']):
            sy=y+139+j*48
            d.text(f"0{j+1}",x+27,sy,23,BLUE)
            d.text(step['title'],x+78,sy-2,29,INK,True)
        short={"find":"发现 → 条件 → 反馈 → 样本文档试跑","evaluate":"声明 → 证据 → 维护回应 → 限定结论","understand":"缩小问题 → 长文 → 原资料 → 对照实验"}[key]
        d.text(short,x+27,y+346,23,MUTED,max_width=card_w-55)
    y+=448

    y=d.section("06","五项阅读检查：勾选是进度，结论需要验证",y)
    check_w=(inner-80)//5
    for i,(title,body) in enumerate([("来源可追溯","作者、原文、原仓库明确"),("有原始证据","代码、配置、实验或直接资料"),("运行条件清楚","版本、硬件、数据与依赖"),("限制有说明","失败情形、成本和适用边界"),("对当前有用","帮助选择或安排一次验证")]):
        x=M+i*(check_w+20)
        d.rect(x,y,check_w,133,"#E9EEE2",6)
        d.text(f"0{i+1}",x+20,y+18,23,GREEN)
        d.text(title,x+71,y+16,29,INK,True)
        d.wrap(body,x+20,y+72,check_w-40,25,MUTED,leading=35,max_lines=2)
    y+=176
    d.text("留下一份研究记录",M,y,31,INK,True)
    d.text("研究问题 / 原始链接 / 版本与许可 / 作者声明 / 我的推断 / 实际验证 / 失败与未确认项 / 下一步",M+320,y+2,27,MUTED,max_width=inner-330)
    y+=100
    d.line(M,y,W-M,y,LINE,3)
    y+=42
    boundaries=[("作者声明","原帖的“每天半小时”收益承诺未见统计依据；平台介绍以官方说明为来源。"),("整理判断","平台优先级、阅读方法和研究路径，按我们当前的 AI 与开源项目研究需求安排。"),("验证边界","查看过入口与部分内容样本；未逐篇审阅，未在本项目运行第三方软件；规则可能变化。")]
    for i,(title,body) in enumerate(boundaries):
        x=M+i*(card_w+30)
        d.text(title,x,y,29,[ORANGE,BLUE,GREEN][i],True)
        d.wrap(body,x,y+52,card_w-28,26,MUTED,leading=40,max_lines=3)
    y+=205
    d.text("参考来源与进一步阅读",M,y,29,INK,True)
    y+=66
    source_labels=["原帖","GitHub 周榜","HF 论文榜机制","Hugging Face 官网","LocalLLaMA","Show HN","Substack 订阅说明","Substack 付费说明","Medium 关注说明","Medium 会员说明","Medium LLM 主题","Simon 的实验记录","Raschka 文章目录","Hamel 评估指南","Eugene 文章入口","Product Hunt","Threads / 访问受限"]
    x=M; row=0
    for source,label in zip(data['sources'],source_labels):
        width=d.width(label,24)
        if x+width>W-M:
            row+=1;x=M
        d.link(label,source['url'],x,y+row*52,24)
        x+=width+40
    y+=(row+1)*52+45
    d.line(M,y,W-M,y)
    d.text("知源 · 本库原创整理 · 来源查看时间：2026.11.15—16 · 图中路径为研究建议，不代表第三方能力已验证。",M,y+32,25,MUTED)
    d.text("高清 PNG 适合保存；SVG / 网页版保留全部入口与来源的可点击链接。放大后逐行阅读。",M,y+80,25,MUTED)
    height=y+155
    assert height<MAX_H, height
    hrefs=d.save(height)
    expected={url for p in data['platforms'] for _,url in p['links']}
    expected.update(a['url'] for a in data['authors'])
    expected.update(r['url'] for r in data['repos'])
    expected.update(s['url'] for s in data['sources'])
    assert expected.issubset(hrefs), f"Missing links: {expected-hrefs}"
    assert all(0<=y0 and y0+size*1.6<height for _,_,y0,_,size in d.text_bounds)
    report={"width":W,"height":height,"platforms":len(data['platforms']),"authors":len(data['authors']),"repositories":len(data['repos']),"paths":len(data['paths']),"unique_links":len(hrefs),"expected_links":len(expected),"all_links_covered":True,"rendered_text_lines":len(d.text_bounds),"date":"2026-11-16","note":"Typography and link coverage checked; SVG links need a supporting browser, PNG is static."}
    (ASSETS/"source-map-manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False))


if __name__=="__main__":
    main()

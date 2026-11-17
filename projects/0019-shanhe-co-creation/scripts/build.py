"""Render the research archive for local review or explicit Pages publication."""
from pathlib import Path
from html import escape as esc
from html.parser import HTMLParser
import argparse
import hashlib
import importlib.util
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
SLUG = ROOT.name
R = json.loads((ROOT / "research.json").read_text(encoding="utf-8"))
S = json.loads((ROOT / "story.json").read_text(encoding="utf-8"))
U = json.loads((ROOT / "understanding.json").read_text(encoding="utf-8"))
PUBLICATION = False
PUBLIC_URL = "https://yydshly.github.io/20261115_codex_project/demos/0019-shanhe-co-creation/index.html"
A = {a["id"]: a for a in R["assets"]}
if R.get("overview"):
    A[R["overview"]["id"]] = R["overview"]
MANIFEST = json.loads((ROOT / "assets/manifest.json").read_text(encoding="utf-8"))
DIMS = {x["file"]: (x["width"], x["height"]) for x in MANIFEST["files"] + MANIFEST.get("supplements", [])}
PAGES = [
    ("index", "项目总览", "从哪里出发"),
    ("exploration", "探索与效果", "看见选择的依据"),
    ("world", "环境与人物", "同一个族群的世界"),
    ("story", "完整故事", "从开端读到结局"),
    ("systems", "学习与多人机制", "故事怎样成为参与"),
    ("future", "后期产品", "从概念到可验证产品"),
    ("sources", "资料与边界", "出处、记录与待决事项"),
]

def e(value):
    return esc(str(value), quote=True)

def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")

def pill(text):
    css = "bad" if text == "被否定" else "good" if text in ("局部认可", "已选择", "已明确") else ""
    return f'<span class="pill {css}">{e(text)}</span>'

def figure(aid, caption=None, eager=False, extra=""):
    a = A[aid]
    w, h = DIMS[a["file"]]
    loading = "eager" if eager else "lazy"
    return f'''<figure class="art {extra}">
      <button class="image-button" data-lightbox="{e(aid)}" aria-label="放大：{e(a['title'])}">
      <img src="../assets/{e(a['file'])}" alt="{e(a['title'])}；{e(a['role'])}" width="{w}" height="{h}" loading="{loading}" decoding="async">
      <span class="image-zoom">查看原图 ↗</span></button>
      <figcaption><span>{e(caption or a['title'])}</span><span>{e(a['role'])}</span></figcaption></figure>'''

def lead(kicker, title, text, extra=""):
    return f'<header class="page-intro {extra}"><p class="eyebrow">{e(kicker)}</p><h1>{title}</h1><p class="intro-copy">{e(text)}</p></header>'

def section_head(number, title, text=""):
    return f'<div class="section-heading"><span class="section-number">{number}</span><div><h2>{e(title)}</h2>{f"<p>{e(text)}</p>" if text else ""}</div></div>'

def table(headers, rows):
    return '<div class="table-wrap"><table><thead><tr>' + ''.join(f'<th scope="col">{e(x)}</th>' for x in headers) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(f'<td>{e(x)}</td>' for x in row) + '</tr>' for row in rows) + '</tbody></table></div>'

def link(href, label, external=False):
    attrs = ' target="_blank" rel="noreferrer"' if external else ''
    return f'<a href="{e(href)}" class="text-link"{attrs}>{e(label)}</a>'

def timeline_entry(x):
    more = link("#asset-" + x["asset"], "查看对应效果 →") if x.get("asset") else ""
    return f'''<article class="timeline-item" id="step-{x["n"]}"><span class="timeline-number">{x["n"]}</span><div>{pill(x["state"])}<h3>{e(x["title"])}</h3><p>{e(x["issue"])}</p><p class="timeline-decision">{e(x["decision"])}</p>{more}</div></article>'''

def asset_entry(a):
    state = "rejected" if a["status"] == "被否定" else "reference" if a["id"] == "reference" else "kept"
    more = link("../assets/" + a["provenance"], "原始提示词与生成记录 ↗") if a.get("provenance") else link(a["source"], "原帖来源 ↗", True)
    return f'''<article class="asset-entry" id="asset-{a["id"]}" data-asset-state="{state}">{figure(a["id"])}<div class="asset-text">{pill(a["status"])}<h3>{e(a["title"])}</h3><p>{e(a["note"])}</p>{more}</div></article>'''

def source_entry(x):
    heading = link(x["url"], x["title"] + " ↗", True) if x["url"] else e(x["title"])
    return f'''<article class="source-entry" id="{x["id"]}"><span>{x["id"]}</span><div>{pill(x["type"])}<h3>{heading}</h3><p>{e(x["note"])}</p></div></article>'''

def shell(page, content):
    location = '公开研究档案' if PUBLICATION else '本地研究'
    publication_note = '故事与后期产品为草案 · 游戏未实现' if PUBLICATION else '故事与后期产品为草案 · 本地预览'
    if page == 'sources':
        content += '<div class="content-wrap"><section class="section" id="publication-record">' + section_head('发布','理解与真实发布记录','网页部署和内容验收，不代表游戏能力已经实现。') + '<div class="download-links">' + link('../understanding.json','参考、理解与价值数据 →') + link('../publication.md','真实提交与部署记录 →') + link('../online-verification.json','线上资源与原图核验 →') + '</div></section></div>'
    if page == "sources" and R.get("overview"):
        content += '<div class="content-wrap"><section class="section" id="overview-files">' + section_head('06','一图总览与排版来源','使用既有概念原图与可校对的中文排版，非游戏实机。') + '<div class="download-links">' + link('../assets/shanhe-understanding-overview-v1.png','高清 PNG · 3200×12684 ↗',True) + link('../overview-summary.json','可修订总览文字 JSON →') + link('../assets/overview/board-v1.html','排版源文件 HTML →') + link('../assets/overview/render-record-v1.json','渲染、来源与校验记录 →') + '</div></section></div>'
    label = next(x[1] for x in PAGES if x[0] == page)
    nav = ''.join(f'<a href="{key}.html" class="nav-item {"active" if page == key else ""}" {"aria-current=page" if page == key else ""}><span class="nav-number">{i:02}</span><span>{name}<small>{sub}</small></span><span aria-hidden="true">↗</span></a>' for i, (key,name,sub) in enumerate(PAGES,1))
    index = [x[0] for x in PAGES].index(page)
    prev = PAGES[index-1] if index else None
    nxt = PAGES[index+1] if index < len(PAGES)-1 else None
    footer_nav = (f'<a href="{prev[0]}.html">← {prev[1]}</a>' if prev else '<span>从一个钓点开始</span>') + (f'<a href="{nxt[0]}.html">{nxt[1]} →</a>' if nxt else '<a href="index.html">回到项目总览 ↗</a>')
    return f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(label)} · 山河共造创作档案</title><meta name="description" content="{e(U['summary'] if page == 'index' else R['meta']['position'])}">
<meta name="theme-color" content="#142326"><link rel="icon" href="mark.svg" type="image/svg+xml"><link rel="stylesheet" href="styles.css?v=publication-1">
<link rel="stylesheet" href="publication.css?v=1"><script src="data.js" defer></script><script src="app.js" defer></script></head>
<body data-page="{page}"><a class="skip-link" href="#main">跳至正文</a>
<aside class="sidebar" id="sidebar"><a href="index.html" class="brand"><img src="mark.svg" width="40" height="40" alt=""><span>山河共造<small>SHANHE · FIELD ARCHIVE</small></span></a>
<div class="sidebar-rule"><span>0019</span><span>创作档案 / {location}</span></div>
<nav aria-label="专题导航">{nav}</nav>
<div class="sidebar-bottom"><span class="status-dot"></span>概念与故事研究<p>2026.11.15 — 11.16</p><a href="sources.html#boundaries">查看当前边界 →</a></div></aside>
<div class="nav-backdrop" hidden></div>
<div class="page-root"><header class="topbar"><button class="menu-toggle" aria-label="打开导航" aria-controls="sidebar" aria-expanded="false">☰</button><p>创作研究 <span>/</span> {e(label)}</p><button class="search-trigger" aria-haspopup="dialog">搜索档案 <kbd>Ctrl K</kbd></button></header>
<main id="main" tabindex="-1">{content}</main>
<footer class="site-footer"><div class="page-links">{footer_nav}</div><div class="footer-meta"><span>图像为参考截图或 AI 概念，均已标注。</span><span>{publication_note}</span></div></footer></div>
<dialog id="lightbox" class="lightbox" aria-labelledby="lightbox-title"><button class="dialog-close" data-close="lightbox" aria-label="关闭原图">×</button><div class="lightbox-image"><img id="lightbox-img" alt=""></div><div class="lightbox-caption"><div><h2 id="lightbox-title"></h2><p id="lightbox-note"></p></div><a id="lightbox-download" download>保存原图 ↗</a></div></dialog>
<dialog id="search-dialog" class="search-dialog" aria-labelledby="search-title"><div class="search-heading"><h2 id="search-title">搜索这份创作档案</h2><button class="dialog-close" data-close="search-dialog" aria-label="关闭搜索">×</button></div><label for="archive-search">人物、效果、主线、机制或产品</label><input id="archive-search" type="search" placeholder="试试：渡石、被否定、平票、创作器" autocomplete="off"><p class="search-count" id="search-count" aria-live="polite">输入关键词，查找讨论和正文。</p><div id="search-results"></div></dialog>
<div class="toast" role="status" aria-live="polite"></div></body></html>'''

def home():
    decisions = ''.join(f'<article class="decision-item"><div>{pill(d["state"])}<h3>{e(d["title"])}</h3></div><p>{e(d["detail"])}</p><blockquote>“{e(d["quote"])}”</blockquote></article>' for d in R["decisions"])
    overview_html = ''
    overview_action = ''
    if R.get("overview"):
        overview_action = '<a class="button secondary" href="#overview">理解与能力 · 一图总览 ↓</a>'
        overview_html = f'''<div class="content-wrap overview-entry"><section class="section" id="overview">{section_head('00','用一张图，读懂我们的世界与能力','世界与人物、完整主线、游戏构造、当前能力与后期价值，汇总为一张可放大阅读的高清长图。')}<div class="overview-layout">{figure('summary','长图顶部预览；完整图片为 3200×12684',False,'overview-poster')}<div class="overview-copy">{pill('10 个模块 / 可保存原图')}<h3>从共同生活，<br>走向共同创造。</h3><p>把世界、角色与故事放在一起，也把当前已经做到的资料能力和真正开发仍需验证的系统分开。</p><ul><li>高地世界、六类区域与岚角族人物。</li><li>七章完整主线的因果、代价与结局。</li><li>游戏构造、学习创造和多人选择边界。</li><li>能力现状、验证路线与后期产品价值。</li><li>早期失败、反馈和必须保留的边界。</li></ul><div class="overview-actions"><a class="button primary" href="../assets/shanhe-understanding-overview-v1.png" target="_blank" rel="noreferrer">原尺寸查看完整长图 ↗</a><a class="button secondary" href="../assets/shanhe-understanding-overview-v1.png" download>保存高清 PNG</a></div><a class="text-link" href="../overview-summary.json" download>下载可修订的总览文字 →</a><p class="small-meta">使用既有概念原图与可校对的中文排版；总览图不是游戏实机，未来价值仍需验证。</p></div></div></section></div>'''
    reference = U['reference']
    principles = ''.join(f'<article class="understanding-card"><h3>{e(x["title"])}</h3><p>{e(x["text"])}</p></article>' for x in U['principles'])
    values = ''.join(f'<article class="understanding-card"><h3>{e(x["title"])}</h3><p>{e(x["text"])}</p></article>' for x in U['value'])
    capabilities = ''.join(f'<article class="understanding-card">{pill(x["status"])}<p>{e(x["text"])}</p></article>' for x in U['capabilities'])
    understanding = f'''<div class="content-wrap"><section class="section understanding-section" id="understanding">{section_head('理解','我们的参考、判断与项目意义',U['summary'])}<div class="reference-note"><h3>{e(reference['title'])}</h3><p>{link(reference['url'],reference['source']+' ↗',True)}</p><p>{e(reference['observation'])}</p><p>{e(reference['inference'])}</p><small>{e(reference['boundary'])}</small></div><div class="understanding-grid">{principles}</div><h2 class="understanding-subtitle">它对玩家、学习与我们有什么价值</h2><div class="understanding-grid value-grid">{values}</div><h2 class="understanding-subtitle">当前具备什么，下一步验证什么</h2><div class="understanding-grid capability-grid">{capabilities}</div><p class="note-line">{e(U['next'])}</p><p class="small-meta">{e(U['guide'])}</p></section></div>'''
    overview_html += understanding
    visual_order = ('character', 'village-v2', 'region', 'town-v1', 'village-v1', 'reference')
    atlas = ''.join(f'''<article class="home-image-card" id="visual-{aid}">{figure(aid)}<div class="home-image-copy">{pill(A[aid]["status"])}<p>{e(A[aid]["note"])}</p><a class="text-link" href="exploration.html#asset-{aid}">查看反馈与来源 →</a></div></article>''' for aid in visual_order)
    return f'''<section class="visual-home-hero"><div class="visual-home-intro"><div><p class="eyebrow">人物 · 环境 · 故事 · 共同创造</p><h1>山河共造</h1></div><div><p class="visual-home-deck">从一个鲜明的族群，<br>走进可以共同生活的世界。</p><p class="visual-home-description">先看角色与环境，再沿着探索过程阅读完整故事。所有图都可以点击放大。</p></div></div>
<div class="visual-home-spotlights"><div class="visual-spotlight" id="character-preview"><div class="visual-spotlight-title"><span>01 / 人物形象</span><h2>岚角族 · 渔夫与引路人</h2></div>{figure('character','角色概念：全身、头部与背面设计',True)}</div><div class="visual-spotlight"><div class="visual-spotlight-title"><span>02 / 居住点一角</span><h2>湖岸长屋 · 与角色搭配的环境</h2></div>{figure('village-v2','局部认可方向：厚木梁、岩岸与渔火',True)}</div></div>
<div class="visual-home-actions"><a class="button primary" href="#visuals">查看全部 6 份图像 ↓</a>{overview_action}<a class="button secondary" href="world.html#species">角色设定与制作路线 ↗</a><a class="text-link" href="story.html">阅读完整故事 →</a></div></section>
{overview_html}
<div class="content-wrap"><section class="section home-image-atlas" id="visuals">{section_head('01','角色、环境与探索图像总览','这里直接收录全部 6 份原始图像：当前沿用方向、地区总览、被否定的早期尝试和原帖参考。点击任一图片可放大并保存原图。')}<div class="home-image-grid">{atlas}</div></section><div class="orientation"><span>当前阶段<strong>概念与故事草案</strong></span><span>视觉档案<strong>1 份参考 / 5 张概念</strong></span><span>完整主线<strong>7 章 / 13 节正文</strong></span><span>下一道验证<strong>角色、实机与真实多人</strong></span></div>
<section class="section">{section_head('02','从一个钓点，走向一个共同生活的世界','这里保存的不只有最后一张图，还有我们为什么放弃、保留和改变。')}<div class="editorial-split"><div><p class="large-copy">玩家愿意停留，<br>世界才有继续发生的故事。</p><p>最初吸引我们的，是不同玩家围着水边生活的感觉。讨论逐渐走向：人为什么在这里相遇，创造的东西怎样进入生活，群体如何参与一条完整主线。</p><a class="text-link" href="exploration.html#timeline">沿着 13 次转向阅读 →</a></div>{figure('reference','原始社交场景参考；游戏与视频相关权利属于原权利人')}</div></section>
<section class="section">{section_head('03','目前共同明确了什么','用户的选择、局部认可与助手提案分别记录。')}<div class="decision-list">{decisions}</div></section>
<section class="section">{section_head('04','图像之后，怎样进入真正的游戏','种族设定、区域意向和角色制作流程在环境与人物页继续展开。')}<div class="note-line">角色是概念，不是模型；湖岸是居住点一角，不是完整世界。<a href="world.html">进入环境与人物 →</a><a href="world.html#production">查看模型、骨骼与动作制作路线 →</a></div></section>
<section class="section">{section_head('05','三条相互约束的创作线')}<div class="reading-routes"><a href="story.html"><span>01 / 故事</span><h3>一条有因果、有代价、<br>有结局的主线</h3><p>十八年前的白雨、失去上下文的图纸、洛恩的选择，以及后来的人。</p><b>连续阅读完整正文 →</b></a><a href="systems.html"><span>02 / 参与</span><h3>让学习与创造<br>真正改变经历</h3><p>观察、试验、协作、规则设计，以及不同玩家之间的分歧。</p><b>查看机制与规则示意 →</b></a><a href="future.html"><span>03 / 产品</span><h3>从一处可生活的湖岸，<br>逐步验证长期愿景</h3><p>多人原型、文明生活世界、游戏内创作器与学习平台。</p><b>查看候选路线与条件 →</b></a></div></section>
<aside class="boundary-note"><h2>这是一份创作档案</h2><p>{e(R['meta']['boundary'])}</p><a href="sources.html">查看来源与未决事项 ↗</a></aside></div>'''

def exploration():
    timeline = ''.join(timeline_entry(x) for x in R["timeline"])
    gallery = ''.join(asset_entry(a) for a in R["assets"])
    alternatives = ''.join(f'<details class="archive-detail"><summary><span>{e(x["name"])}</span>{pill(x["state"])}</summary><p>{e(x["idea"])}</p><dl><dt>留下的价值</dt><dd>{e(x["value"])}</dd><dt>未解决的问题</dt><dd>{e(x["gap"])}</dd></dl></details>' for x in R["alternatives"])
    return lead("EXPLORATION / 01","探索与效果","保留真实的方向变化。被否定的图片也有价值，它们说明哪些东西不能被下一轮悄悄带回来。") + f'''<div class="content-wrap">
<section class="section" id="comparison">{section_head('01','一次关键返修：角色没有变，环境需要重做','两张图构图不同；滑动仅比较美术方向，不表示像素锁定或同一实机场景。')}
<div class="comparison" id="comparison-view"><img class="comparison-base" src="../assets/{A['village-v1']['file']}" width="1536" height="1024" alt="被否定的明亮圆屋湖岸"><div class="comparison-after"><img src="../assets/{A['village-v2']['file']}" width="1536" height="1024" alt="局部认可的厚重公共长屋与岩岸"></div><span class="compare-label before">v1 / 被否定</span><span class="compare-label after">v2 / 局部认可</span><div class="compare-line"></div></div>
<label class="comparison-control" for="compare-range">拖动比较环境方向<input id="compare-range" type="range" min="0" max="100" value="50"><output id="compare-value">50%</output></label>
<div class="comparison-notes"><p><b>偏差：</b>圆屋、花草和缩小的居民偏向童话村落，与角色的体量不一致。</p><p><b>修正：</b>厚木梁、板岩、粗岩岸、公共作业与成年感居民，从身体和生活需要推导环境。</p></div></section>
<section class="section" id="gallery">{section_head('02','完整视觉档案','所有原图都可放大；图像的生成状态和用户反馈始终随图保留。')}<div class="filters" role="group" aria-label="视觉档案筛选"><button class="selected" data-filter="all" aria-pressed="true">全部 6 份</button><button data-filter="reference" aria-pressed="false">原始参考</button><button data-filter="rejected" aria-pressed="false">被否定的尝试</button><button data-filter="kept" aria-pressed="false">后续沿用与认可</button></div><div class="asset-archive">{gallery}</div><p id="filter-count" class="small-meta" aria-live="polite">显示全部 6 份视觉记录</p></section>
<section class="section" id="timeline">{section_head('03','讨论如何一步步改变方向','时间顺序依本次对话整理；不以网页整理时间冒充每个决定的精确发生时刻。')}<div class="timeline">{timeline}</div></section>
<section class="section" id="alternatives">{section_head('04','故事与产品也走过弯路','保留方案的价值，同时记下为什么没有直接定稿。')}{alternatives}</section></div>'''

def world():
    district_buttons = ''.join(f'<button class="district-tab {"selected" if i == 0 else ""}" data-district="{i}" aria-pressed="{"true" if i == 0 else "false"}"><span>0{i+1}</span>{e(x["name"])}</button>' for i,x in enumerate(R["world"]["districts"]))
    districts = ''.join(f'<article class="district-panel" id="district-{i}" {"hidden" if i else ""}><p class="eyebrow">区域意向 / 0{i+1}</p><h3>{e(x["name"])}</h3><dl><dt>生活作用</dt><dd>{e(x["use"])}</dd><dt>玩家体验</dt><dd>{e(x["experience"])}</dd><dt>下一道验证</dt><dd>{e(x["next"])}</dd></dl></article>' for i,x in enumerate(R["world"]["districts"]))
    species = R["world"]["species"]
    characters = ''.join(f'<article class="character-note"><span class="character-index">0{i+1}</span><div><h3>{e(x["name"])}</h3><p class="accent-copy">{e(x["role"])}</p><p>{e(x["wish"])}</p><p class="arc">{e(x["arc"])}</p><small>{e(x["visual"])}</small></div></article>' for i,x in enumerate(R["world"]["characters"]))
    production = ''.join(f'<li><span class="process-number">{i:02}</span><div><h3>{e(x["step"])}</h3><p>{e(x["output"])}</p><small>检查：{e(x["check"])}</small></div></li>' for i,x in enumerate(R["production"],1))
    return lead("WORLD / 02","环境与人物","从族群的身体、材料与生活需要，形成一个可以进入、可以居住，也值得走出去探索的地方。") + f'''<div class="content-wrap">
{figure('region','部落住宅区与周边生活网络的概念参照；不是完整世界或已验证地图',True)}
<section class="section" id="districts">{section_head('01','住宅区以外，还需要什么','分区按钮说明功能意向，不是图像中已经完成的精确地图定位。')}<div class="district-layout"><div class="district-tabs" role="group" aria-label="查看区域意向">{district_buttons}</div><div class="district-content">{districts}</div></div></section>
<section class="section" id="species">{section_head('02','岚角族：先有轮廓，再有文化','工作名与美术探索；角色身份和量产规格尚未正式定稿。')}{figure('character')}<div class="spec-sheet">{''.join(f'<div><h3>{label}</h3><p>{e(species[key])}</p></div>' for key,label in [('identity','种族身份'),('shape','轮廓与比例'),('materials','材质与配色'),('culture','文化与使用')])}</div><div class="note-line">{e(species['limits'])}</div></section>
<section class="section" id="characters">{section_head('03','三位贯穿故事的人','名字、人物弧和分工来自当前故事草案；不能把同一张渔夫图当作三个人的定稿。')}<div class="character-notes">{characters}</div></section>
<section class="section" id="production">{section_head('04','从图像到真正可操控的角色','以下是候选制作流程。目前只有二维概念图，尚无模型、骨骼、动画或联网资产。')}<ol class="production-route">{production}</ol><div class="note-line">UE5、Blender、自动绑定和 AI 初模都只是候选路线。引擎尚未锁定，也没有完成相关资产实测。<a href="sources.html#references">查看此前查阅的官方资料 ↗</a></div></section></div>'''

def story_page():
    toc = ''.join(f'<a href="#{x["id"]}"><span>{i:02}</span>{e(x["title"])}</a>' for i,x in enumerate(S["sections"],1))
    paragraphs = ''.join(f'<section class="story-section" id="{x["id"]}" data-story-section><p class="story-kicker">{i:02} / {e(x["time"])}</p><h2>{e(x["title"])}</h2>' + ''.join(f'<p>{e(p)}</p>' for p in x["paragraphs"]) + '</section>' for i,x in enumerate(S["sections"],1))
    chapter_rows = [(f'{x["n"]:02} · {x["name"]}', x["question"], x["change"]) for x in S["chapters"]]
    length = sum(len(''.join(x["paragraphs"])) for x in S["sections"])
    return lead("STORY / 03","山河共造<br><em>完整故事</em>","六个聚落、一套失衡的旧水道，以及人们怎样学会共同创造和承担。以下包含所有关键真相与结局。") + f'''<div class="content-wrap">
<div class="story-status">{pill('助手草案 / 未定稿')}<span>7 章 · 13 节 · 73 段 · 正文 {length:,} 字符</span><a href="../STORY.md" download>下载完整文字 ↗</a></div>
<div class="story-callout"><p>{e(S['intro'])}</p><p>玩家以多批新住民参与：不同队伍承担不同工作，世界记录共同事实。故事里的工程与历史属于虚构设定，学科内容需要审校后才能成为教学模型。</p></div>
<div class="reading-toolbar"><button id="focus-reading" aria-pressed="false">专注阅读</button><div class="font-controls" role="group" aria-label="调整正文字号"><button id="font-smaller" aria-label="减小字号">A−</button><output id="font-size">18</output><button id="font-larger" aria-label="增大字号">A＋</button></div><button id="resume-reading" hidden>继续上次阅读 →</button><a href="#chapter-map">查看七章结构 ↓</a></div>
<div class="story-layout"><nav class="story-toc" aria-label="完整故事目录"><p class="eyebrow">故事目录</p>{toc}</nav><article class="story-paper">{paragraphs}</article></div>
<section class="section" id="chapter-map">{section_head('07','七章结构与关键变化','这是正文的阅读索引；章节清单不能替代上面的完整因果。')}{table(['篇章','贯穿的问题','具体发生的变化'],chapter_rows)}</section>
<aside class="boundary-note"><h2>故事还有哪些工作要做</h2><p>当前正文已写出开端、真相、人物变化、实际代价、高潮与结局，但尚未形成全量任务剧本、对白、分支数据、关卡和玩家测试。用户尚未明确确认这一版剧情为定稿。</p><a href="systems.html#first-chapter">进入第一章的参与设计 →</a></aside></div>'''

def systems():
    layers = table(["层次","作者控制的事实","玩家可以影响"],[(x["name"],x["fixed"],x["change"]) for x in R["multiplayer"]["layers"]])
    learning = ''.join(f'<article class="learning-row" id="learning-{i}"><span>0{i+1}</span><div><h3>{e(x["layer"])}</h3><p>{e(x["action"])}</p></div><div><b>{e(x["value"])}</b><p>{e(x["boundary"])}</p></div></article>' for i,x in enumerate(R["learning"]))
    beats = ''.join(f'<article class="chapter-beat"><div class="beat-number">0{i+1}</div><div><h3>{e(x["title"])}</h3><p>{e(x["story"])}</p><dl><dt>玩家做什么</dt><dd>{e(x["play"])}</dd><dt>学习与创造</dt><dd>{e(x["learn"])}</dd><dt>多人参与</dt><dd>{e(x["team"])}</dd><dt>共同事实</dt><dd>{e(x["fact"])}</dd></dl></div></article>' for i,x in enumerate(R["first_chapter"]["beats"]))
    vote_fields = ''.join(f'<label class="vote-person">玩家 {i}<select id="vote-{i}" data-vote><option value="ditch">支持临时排水沟</option><option value="platform" {"selected" if i>2 else ""}>支持高架货台</option><option value="abstain">弃权 / 未投票</option></select></label>' for i in range(1,5))
    choices = ''.join(f'<article class="proposal"><span>方案 {"A" if x["id"]=="ditch" else "B"}</span><h3>{e(x["name"])}</h3><p>{e(x["benefit"])}</p><small>代价：{e(x["cost"])}</small></article>' for x in R["first_chapter"]["options"])
    return lead("PARTICIPATION / 04","学习与多人机制","把观察、试验、分歧和合作写进故事因果；用清楚的边界承接不同玩家的经历。") + f'''<div class="content-wrap">
<section class="section" id="layers">{section_head('01','谁能够改变哪些事情',R['multiplayer']['principle'])}{layers}<div class="note-line">当前是有作者主线的多人生活世界提案；没有承诺每个服务器可以无限改写全部历史。</div></section>
<section class="section" id="learning">{section_head('02','学习发生在行动中','从具体问题出发，让结果能够被观察、比较、修正和传给别人。')}<div class="learning-list">{learning}</div></section>
<section class="section" id="first-chapter">{section_head('03','第一章：第一场雨',R['first_chapter']['target'])}<div class="chapter-beats">{beats}</div></section>
<section class="section" id="conflicts">{section_head('04','选择冲突，先确认属于谁','个人关系、小队施工和公共建筑使用不同规则。规则应在选择前公开。')}{table(['冲突','当前提案中的处理方式','影响范围'],[(x['case'],x['rule'],x['scope']) for x in R['multiplayer']['conflict_rules']])}</section>
<section class="section" id="vote-demo">{section_head('05','四人小队表决示意','浏览器内的规则说明：未联网，没有真实玩家、服务端或游戏物理。')}<div class="proposals">{choices}</div><div class="vote-demo"><div class="vote-inputs">{vote_fields}<button id="reset-votes" class="button secondary">重置为二比二</button></div><div class="vote-result"><span class="eyebrow">本次剧情现场 / 施工结果</span><h3 id="vote-result-title"></h3><p id="vote-tally"></p><p id="vote-explanation" aria-live="polite"></p><div id="personal-positions"></div></div></div><p class="small-meta">当前默认方案仅属于这份设计草案；公平性和实际玩家感受尚待验证。</p></section>
<section class="section" id="progress-demo">{section_head('06','公共建设未完成，也能进入下一章','这里演示解锁条件的独立性；不限制你阅读网页中的任何故事。')}<div class="progress-demo"><fieldset><legend>本章个人 / 小队经历</legend>{''.join(f'<label><input type="checkbox" data-progress="{i}">{x}</label>' for i,x in enumerate(['完成一次有效试验','参与完成救援','记录六个聚落的共同标记','完成一次活动规则的试玩与修改']))}<label class="public-progress"><input id="public-complete" type="checkbox">公共建筑已经完工（不属于解锁条件）</label></fieldset><div><p class="eyebrow">章节出口示意</p><h3 id="progress-title">还需要共同完成四件事</h3><p id="progress-note" aria-live="polite"></p><a class="text-link" href="story.html#exchange">直接阅读第二章故事 →</a></div></div></section>
<aside class="boundary-note"><h2>必须用真实参与检验的问题</h2><ul>{''.join(f'<li>{e(x)}</li>' for x in R['multiplayer']['risks'])}</ul></aside></div>'''

def future():
    products = ''.join(f'<article class="product-stage" id="product-{i}"><div class="product-track"><span>{i:02}</span>{pill(x["horizon"])}</div><div><h2>{e(x["title"])}</h2><p class="product-value">{e(x["value"])}</p><dl><dt>面向谁</dt><dd>{e(x["audience"])}</dd><dt>候选内容</dt><dd>{e(x["content"])}</dd><dt>目前证据</dt><dd>{e(x["proof"])}</dd><dt>推进条件</dt><dd>{e(x["gate"])}</dd></dl></div></article>' for i,x in enumerate(R["products"],1))
    roadmap = ''.join(f'<article class="roadmap-step"><span>{e(x["phase"])}</span><h3>{e(x["title"])}</h3><p>{e(x["deliver"])}</p><small>{e(x["accept"])}</small></article>' for x in R["roadmap"])
    questions = ''.join(f'<label class="open-question"><input type="checkbox" data-question="{i}"><span>{e(x)}</span></label>' for i,x in enumerate(R["open_questions"]))
    return lead("POSSIBILITIES / 05","可构思的后期产品","愿景可以很远，推进必须依赖证据。每个候选产品都记录价值、当前缺口与下一道验收。") + f'''<div class="content-wrap"><div class="product-ladder">{products}</div>
<section class="section" id="roadmap">{section_head('01','按验证推进，而不是按想象堆功能','以下不是排期或预算承诺；不在首个子项目里同时开做所有层次。')}<div class="roadmap">{roadmap}</div></section>
<section class="section" id="questions">{section_head('02','下一轮需要真正讨论的事','勾选只保存在当前浏览器，用作个人阅读标记，不会改写研究结论或同步到其他人。')}<div class="question-list">{questions}</div><label class="notes-label" for="local-notes">你的讨论手记</label><textarea id="local-notes" rows="5" placeholder="例如：主线中最在意的人物变化、想保留的居住体验……"></textarea><div class="notes-actions"><button id="export-notes" class="button secondary">导出本机手记</button><span class="small-meta" id="notes-status">仅保存到本机浏览器</span></div></section>
<aside class="boundary-note"><h2>现在与未来之间</h2><p>当前完成的是研究网页、图像归档、完整故事整理和浏览器内规则示意。角色模型、游戏客户端、联网、持续世界、创作器和教学效果均未完成验证。</p></aside></div>'''

def sources():
    references = ''.join(source_entry(x) for x in R["sources"])
    return lead("EVIDENCE / 06","来源、边界与资料","视觉参考、生成记录、用户选择与助手构思分别保存；没有把概念图写成实机，也没有把草案写成定稿。") + f'''<div class="content-wrap"><section class="section" id="boundaries">{section_head('01','事实与提案的边界')}<div class="boundary-grid"><article><h3>已存在</h3><p>原始参考截图、五张生成概念、原始提示词与迭代记录；本次讨论、完整故事正文与当前网页。</p></article><article><h3>尚未实现</h3><p>可操控三维角色、游戏场景、物理/生态模型、真实多人服务、创作器、教学效果与上线产品。</p></article><article><h3>需要确认</h3><p>当前故事是否定稿、角色量产规范、公共时间与小队时间、投票公平性、技术选型与产品受众。</p></article></div></section>
<section class="section" id="references">{section_head('02','来源记录','官方链接是此前讨论查阅的制作参考，当前没有对这些软件和接口完成项目实测。')}<div class="source-list">{references}</div></section>
<section class="section" id="downloads">{section_head('03','离线资料与完整记录')}<div class="download-list"><a href="../research.json" download><strong>研究与决策数据</strong><span>JSON · 探索、反馈、机制、后期产品</span></a><a href="../story.json" download><strong>完整故事结构数据</strong><span>JSON · 13 节 / 73 段正文</span></a><a href="../STORY.md" download><strong>完整故事文字</strong><span>Markdown · 可离线阅读与修订</span></a><a href="../DISCUSSION.md" download><strong>探索与讨论纪要</strong><span>Markdown · 用户选择与助手提案分开记录</span></a><a href="../README.md"><strong>项目说明与运行方式</strong><span>本地启动、验证状态与范围</span></a><a href="../verification.json"><strong>本轮验证记录</strong><span>网页与内容检查，不是游戏验证</span></a><a href="../assets/manifest.json"><strong>图片清单与校验</strong><span>尺寸、字节与 SHA-256</span></a></div></section>
<section class="section" id="attribution">{section_head('04','图片与权利归属')}<p>原始参考截图来自用户提供的 Thorgram 帖子画面，《魔兽世界》相关角色、游戏画面及标识属于 Blizzard Entertainment 等相关权利人；帖子内容属于原作者。研究引用不表示拥有可复用游戏资产的授权。</p><p>其余五张图由本次对话使用内置图像生成工具制作。原始提交提示词、参考角色和失败重试记录保存在图像档案中，模型版本与种子未由工具提供。概念图不是实机画面、模型交付或最终角色定稿。</p><p>图像归档保留原文件，进行了逐文件 SHA-256 一致性核对。来源记录中的本机绝对路径已归一为文件名；实际提交的提示词保留原文。</p><a href="exploration.html#gallery" class="text-link">逐图查看来源与生成记录 →</a></section></div>'''

def discussion_md():
    lines = ["# 山河共造 · 探索与讨论纪要", "", "来源：2026-11-15—11-16 本次对话。用户选择、助手推断与未验证提案分别标注。", "", "## 当前共同认识", ""]
    for x in R["decisions"]:
        lines += [f"### {x['title']} · {x['state']}", "", x["detail"], "", f"> 用户：{x['quote']}", ""]
    lines += ["## 探索路径", ""]
    for x in R["timeline"]:
        lines += [f"### {x['n']} · {x['title']}", "", x["issue"], "", x["decision"], ""]
    lines += ["## 未决事项", "", *[f"- {x}" for x in R["open_questions"]], ""]
    return "\n".join(lines)

def story_md():
    lines = ["# 山河共造 · 完整故事", "", f"状态：{S['status']}。", "", S["intro"], ""]
    for x in S["sections"]:
        lines += [f"## {x['title']}", "", *sum(([p,""] for p in x["paragraphs"]), [])]
    return "\n".join(lines)

def main():
    global PUBLICATION
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publication', action='store_true', help='Build the explicitly authorized public research website')
    parser.add_argument("--site-preview", action="store_true")
    args = parser.parse_args()
    PUBLICATION = args.publication
    web, dest = ROOT / "web", ROOT / "dist"
    web.mkdir(exist_ok=True)
    renderers = {"index":home,"exploration":exploration,"world":world,"story":story_page,"systems":systems,"future":future,"sources":sources}
    for key, renderer in renderers.items():
        write(web / (key+".html"), shell(key,renderer()))
    write(ROOT / "DISCUSSION.md", discussion_md())
    write(ROOT / "STORY.md", story_md())
    records = [{"title":x[1],"url":x[0]+".html","text":x[2]} for x in PAGES]
    records.append({"title":"我们的参考、理解与价值","url":"index.html#understanding","text":json.dumps(U,ensure_ascii=False)})
    records += [{"title":x["title"],"url":"story.html#"+x["id"],"text":x["summary"]+" "+''.join(x["paragraphs"])} for x in S["sections"]]
    records += [{"title":x["title"],"url":"exploration.html#asset-"+x["id"],"text":x["status"]+" "+x["note"]} for x in R["assets"]]
    records += [{"title":x["title"],"url":"exploration.html#step-"+x["n"],"text":x["issue"]+" "+x["decision"]} for x in R["timeline"]]
    records += [{"title":x["title"],"url":"future.html#product-"+str(i),"text":x["value"]+" "+x["content"]+" "+x["proof"]} for i,x in enumerate(R["products"],1)]
    records += [{"title":x["case"],"url":"systems.html#conflicts","text":x["rule"]} for x in R["multiplayer"]["conflict_rules"]]
    records += [{"title":x["step"],"url":"world.html#production","text":x["output"]+" "+x["check"]} for x in R["production"]]
    records += [{"title":x["layer"],"url":"systems.html#learning","text":x["action"]+" "+x["boundary"]} for x in R["learning"]]
    if R.get("overview"):
        records.append({"title":R["overview"]["title"],"url":"index.html#overview","text":R["overview"]["note"]})
    write(web / "data.js", "window.SHANHE_ARCHIVE = "+json.dumps({"assets":list(A.values()),"search":records},ensure_ascii=False)+";\n")
    dest.mkdir(exist_ok=True)
    for path in web.iterdir():
        if path.is_file():
            text = path.read_text(encoding="utf-8")
            text = text.replace("../assets/","./assets/")
            for name in ("STORY.md","DISCUSSION.md","README.md","research.json","story.json","overview-summary.json","understanding.json","publication.md","online-verification.json","THIRD_PARTY_NOTICES.md","verification.json"):
                text = text.replace("../"+name,"./"+name)
            write(dest / path.name,text)
    shutil.copytree(ROOT/"assets",dest/"assets",dirs_exist_ok=True)
    for name in ("STORY.md","DISCUSSION.md","README.md","research.json","story.json","overview-summary.json","understanding.json","publication.md","online-verification.json","THIRD_PARTY_NOTICES.md","verification.json"):
        if (ROOT/name).exists():
            shutil.copy2(ROOT/name,dest/name)
    files=[{"path":p.relative_to(dest).as_posix(),"sha256":hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(dest.rglob("*")) if p.is_file() and p.name!="build-manifest.json"]
    write(dest/"build-manifest.json",json.dumps({"project":SLUG,"mode":"publication" if PUBLICATION else "local-preview","publication_url":PUBLIC_URL if PUBLICATION else None,"files":files},ensure_ascii=False,indent=2)+"\n")
    if args.site_preview:
        repo=ROOT.parents[1]
        spec=importlib.util.spec_from_file_location("research_site",repo/"scripts/build_site.py")
        site=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(site)
        output=repo/"_site"
        shutil.copytree(dest,output/"demos"/SLUG,dirs_exist_ok=True)
        local_projects = getattr(site, 'LOCAL_RESEARCH_PROJECTS', {})
        entries={site.SLUG:"summary.html",**site.STATIC_PROJECTS,**local_projects}
        available={slug for slug,entry in entries.items() if (output/"demos"/slug/entry).is_file()}
        write(output/"index.html",site.navigation(local_projects,available))
    print(json.dumps({"output":str(dest/"index.html"),"pages":len(PAGES),"story_characters":sum(len(''.join(x["paragraphs"])) for x in S["sections"]),"publication_build":PUBLICATION}))

if __name__=="__main__":
    main()

from pathlib import Path
import json, html, re, base64, io, hashlib, shutil
from PIL import Image, ImageDraw, ImageFont, ImageOps
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/"research.json").read_text(encoding="utf-8"))
ASSETS=ROOT/"assets"
THUMBS=ASSETS/"thumbs"
THUMBS.mkdir(parents=True,exist_ok=True)
FONT_DIR=Path("C:/Windows/Fonts")
def font(n,bold=False):
    return ImageFont.truetype(str(FONT_DIR/("msyhbd.ttc" if bold else "msyh.ttc")),n)
INK="#29483c"; MUTED="#5b7052"; BG="#f3f1e8"; PALE="#e3e9d9"; LINE="#b8c6aa"; ACCENT="#45634b"
# Existing attributed thumbnails are inputs; publication never redraws the guide.
def esc(x):return html.escape(str(x),quote=True)
def deep(t):
    if t["id"]=="lemo":return "../../0010-lemo-opuscar-trial/episodes/wind-in-the-garden/review.html"
    if t["id"]=="effectcraft":return "../../0014-effectcraft-trial/README.md"
    if t["project"].startswith("0001"):
        return "https://yydshly.github.io/20261115_codex_project/demos/0001-animation-skills-atlas/"+t.get("deep","summary.html")
    if t["id"]=="three":return "../../0012-world-building-lab/dist/journey.html"
    return "../../"+t["project"]+"/web/"+t.get("deep","index.html")
def tool_card(t,n):
    video=""
    if t.get("video"):
        video=f'<video controls playsinline preload="none" poster="../assets/thumbs/{t["media"]}.jpg" aria-label="{esc(t["name"])}来源视频"><source src="{esc(t["video"])}" type="video/mp4"></video><p class="small">'+('本库实测视频，制作与署名范围见专题；部分输出在克隆后需按说明重建。' if t.get("videoKind")=="ours" else '远程来源视频，静态缩图不能展示全部动作；若未加载，请使用作者来源入口。')+'</p>'
    elif t["id"]=="blender":
        video='<div class="youtube-slot"><button type="button" data-youtube>尝试在本页播放作者演示</button><p class="small">播放器受原站可用性影响；上方作者入口始终保留。</p></div>'
    measured=f'<p class="measurement"><strong>已有本机测量：</strong>{esc(t["measurement"])} <a href="{esc(t["measurementSource"])}" target="_blank">原始口径</a></p>' if t.get("measurement") else ''
    return f'''<article class="tool" id="tool-{t["id"]}" data-id="{t["id"]}" data-group="{t["group"]}">
<div class="tool-top"><span class="kind">{esc(t["kind"])}</span><label class="compare-pick"><input type="checkbox" data-compare="{t["id"]}" aria-label="对照选择{esc(t["name"])}"> 加入对照</label></div>
<button class="thumb-button" type="button" data-zoom="{t["id"]}" aria-label="放大{esc(t["name"])}效果图"><img src="../assets/thumbs/{t["media"]}.jpg" alt="{esc(t["effect"])}" loading="lazy" width="1280" height="720"></button>
<p class="media-credit"><b>{esc(t["identity"])}</b> · {esc(t["credit"])}</p>
<h3>{esc(t["name"])}</h3><p class="role">{esc(t["role"])}</p>
<dl><div><dt>对我们的价值</dt><dd>{esc(t["value"])}</dd></div><div><dt>什么时候参考</dt><dd>{esc(t["when"])}</dd></div><div><dt>理解边界</dt><dd>{esc(t["avoid"])}</dd></div></dl>
<p class="evidence"><span>{'本地制作／应用' if t["level"] in ["made","shared"] else "官方观察／资料"}</span>{esc(t["evidence"])}</p>
<div class="tool-links"><a href="{esc(t["source"])}" target="_blank" rel="noopener noreferrer">作者效果／来源</a><a href="{esc(deep(t))}" target="_blank" rel="noopener noreferrer">深入专题</a></div>
<details><summary>输入输出、参考后的目标与任务</summary><div class="expanded"><p class="io">{esc(t["input"])} <span>→</span> {esc(t["output"])}</p>{measured}<p><strong>我们的目标：</strong>{esc(t["goal"])}</p><p><strong>取舍与补充：</strong>{esc(t["adapt"])}</p><p class="small">下方为本库原创任务概括；完整参考原文、原始记录和较长任务书见专题。{esc(t["briefState"])}。</p><pre tabindex="0">{esc(t["brief"])}</pre>{video}<p class="small">许可与来源：{esc(t["license"])}。<a href="{esc(t["repo"])}" target="_blank" rel="noopener noreferrer">原仓库</a> · <a href="../../{t["project"]}/README.md" target="_blank">本库研究记录</a></p></div></details>
</article>'''
groups=[]
n=0
for key,name in DATA["groups"].items():
    cards=[]
    for t in DATA["tools"]:
        if t["group"]==key:
            n+=1;cards.append(tool_card(t,n))
    groups.append(f'<section class="tool-group" data-group-section="{key}"><h2>{esc(name)}</h2><div class="tool-grid">{"".join(cards)}</div></section>')
template=(ROOT/"web/template.html").read_text(encoding="utf-8")
template=template.replace("@@TOOL_GROUPS@@","\n".join(groups)).replace("@@DATA@@",json.dumps(DATA,ensure_ascii=False).replace("</","<\\/"))
(ROOT/"web/index.html").write_text(template,encoding="utf-8")
# Export one overview image with exact same content source; no invented media.
W=3200; H=11020
im=Image.new("RGB",(W,H),BG);d=ImageDraw.Draw(im)
bounds=[];sv=[]
def box(x,y,w,h,fill):d.rectangle((x,y,x+w,y+h),fill=fill);sv.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"/>')
def text(x,y,s,size=32,color=INK,bold=False):
    f=font(size,bold);d.text((x,y),s,font=f,fill=color)
    sv.append(f'<text x="{x}" y="{y+size}" font-family="Microsoft YaHei,sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{html.escape(s)}</text>')
    if x+d.textlength(s,font=f)>W-60:bounds.append({"text":s,"x":x,"y":y,"reason":"width"})
def wrap(s,maxw,size):
    f=font(size);lines=[];line=""
    for c in s:
        if c=="\n":lines.append(line);line="";continue
        if line and d.textlength(line+c,font=f)>maxw:lines.append(line);line=c
        else:line+=c
    if line:lines.append(line)
    return lines
def paragraph(x,y,s,maxw,size=32,color=INK,gap=15):
    for line in wrap(s,maxw,size):text(x,y,line,size,color);y+=size+gap
    return y
def picture(path,x,y,w,h):
    src=Image.open(path).convert("RGB");thumb=ImageOps.contain(src,(w,h),Image.Resampling.LANCZOS)
    bx=x+(w-thumb.width)//2;by=y+(h-thumb.height)//2
    box(x,y,w,h,"#dce3d3");im.paste(thumb,(bx,by))
    data=base64.b64encode(path.read_bytes()).decode()
    sv.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet" href="data:image/jpeg;base64,{data}"/>')
text(100,70,"创作工具总览",86,bold=True)
text(100,188,"15项库的效果、价值与使用时机",51)
paragraph(100,284,"从想法到画面：先理解作品与任务，再选素材、场景、动作和成片工具。",2960,37)
text(100,369,"作者案例、本库实测、共享样片与原理示意逐项标注；静态图不能展示全部动作。",31,MUTED)
box(100,453,3000,155,PALE)
text(135,475,"看参考 → 做素材 → 编排视频／三维空间 → 返修设计 → 保存方法",43,bold=True)
text(135,548,"按任务组合，不必全套引入；效果由素材、模型、设计、软件和执行共同形成。",30,MUTED)
text(100,654,"怎样读这张图",35,bold=True)
text(440,660,"每项依次看：画面身份 · 作用 · 价值 · 什么时候参考 · 已验证范围",31,MUTED)
y=755
for key,gname in DATA["groups"].items():
    box(100,y,3000,73,ACCENT);text(130,y+10,gname,37,"#faf8ec",True);y+=95
    for t in (x for x in DATA["tools"] if x["group"]==key):
        rowtop=y;rowh=545
        box(100,y,3000,rowh,"#f8f8ee")
        picture(THUMBS/(t["media"]+".jpg"),125,y+22,910,350)
        ycredit=paragraph(135,y+384,t["identity"]+" · "+t["credit"],890,22,MUTED,7)
        paragraph(135,max(ycredit+8,y+451),t["effect"],890,22,MUTED,7)
        text(1090,y+18,t["name"],49,bold=True)
        yy=paragraph(1090,y+91,t["role"],1940,33,INK,12)
        yy=paragraph(1090,yy+12,"价值："+t["value"],1940,31,INK,11)
        yy=paragraph(1090,yy+12,"何时参考："+t["when"],1940,31,INK,11)
        yy=paragraph(1090,yy+10,"边界："+t["avoid"],1940,27,MUTED,9)
        if yy>rowtop+446:bounds.append({"id":t["id"],"bottom":yy,"row_bottom":rowtop+446,"reason":"body height"})
        text(1090,rowtop+472,"验证："+t["evidence"],27,MUTED)
        if t.get("measurementShort"):text(1090,rowtop+511,"本机记录："+t["measurementShort"],23,MUTED)
        y=rowtop+rowh+17
y+=20
box(100,y,3000,545,PALE)
text(135,y+25,"按我们的任务选择组合",43,bold=True)
flows=[
"自然短片：作品／拆片参考 → Lemo或ComfyUI素材路线 → Remotion等编排 → 需要时加图层",
"数字人口播：准备人物与声音 → 选HyperFrames／Remotion／EffectCraft编排 → 需要时用GSAP动作",
"三维世界：理解环境关系 → Blender准备资产与场景 → Three.js实时空间 → 需要时加导览动作",
"研究网页：按问题选Unslop整页过程或Impeccable局部任务 → 实际验看 → 用Skills保存方法"
]
yy=y+105
for s in flows:yy=paragraph(135,yy,s,2910,30,INK,10)+21
text(135,y+458,"以上是组合建议，库之间没有在本轮全部接通；仍需按真实任务验收。",27,MUTED)
y+=590
paragraph(100,y,"来源与状态：各库作者及本库研究记录，2026-11-17汇总。图内照片为缩小引用，原作者与许可见网页来源台账。",3000,25,MUTED,10)
paragraph(100,y+80,"14幅不同视觉：12幅效果／实测图、GSAP静态构成与Blender连接原理；Remotion Skills共用Remotion样片。",3000,25,MUTED,10)
# The count line is calculated below to avoid stale editorial arithmetic.
actual_bottom=y+170
im=im.crop((0,0,W,actual_bottom))
im.save(ASSETS/"creative-tools-overview.png",optimize=True)
preview=im.copy();preview.thumbnail((1280,10000));preview.save(ASSETS/"creative-tools-overview-preview.jpg",quality=90,optimize=True)
cover=Image.new("RGB",(1600,800),BG);cd=ImageDraw.Draw(cover)
for i,t in enumerate(DATA["tools"]):
    x=25+(i%5)*315;y=20+(i//5)*255
    thumb=ImageOps.contain(Image.open(THUMBS/(t["media"]+".jpg")).convert("RGB"),(295,170),Image.Resampling.LANCZOS)
    cover.paste(thumb,(x+(295-thumb.width)//2,y+(170-thumb.height)//2))
    cd.text((x,y+180),t["name"],font=font(21,True),fill=INK)
    cd.text((x,y+213),t["identity"],font=font(17),fill=MUTED)
cover.save(ASSETS/"overview-cover.jpg",quality=92,optimize=True)
svgout=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{actual_bottom}" viewBox="0 0 {W} {actual_bottom}"><rect width="100%" height="100%" fill="{BG}"/>'+''.join(sv)+'</svg>'
(ASSETS/"creative-tools-overview.svg").write_text(svgout,encoding="utf-8")
report={"tools":len(DATA["tools"]),"groups":len(DATA["groups"]),"routes":len(DATA["routes"]),"image_dimensions":[W,actual_bottom],"preview_dimensions":list(preview.size),"layout_flags":bounds,"thumbnails":len(set(t["media"] for t in DATA["tools"])),"data_sha256":hashlib.sha256((ROOT/"research.json").read_bytes()).hexdigest()}
(ROOT/"build-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(report,ensure_ascii=False))

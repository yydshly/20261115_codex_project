"""Typeset the complete project understanding as one high-resolution image.

Source concept PNGs are embedded unchanged. All Chinese copy comes from the
editable overview-summary.json, not from generative lettering.
"""
from pathlib import Path
from html import escape
import argparse
import hashlib
import json
import os
import struct

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "overview" / "board-v1.html"
OUTPUT = ASSETS / "shanhe-understanding-overview-v1.png"
RECORD = ASSETS / "overview" / "render-record-v1.json"

def e(value):
    return escape(str(value), quote=True)

def head(number, title, status="设计草案"):
    return f'<div class="section-head"><span class="number">{number}</span><h2>{e(title)}</h2><span class="tag">{e(status)}</span></div>'

def rows(items, cls="rows"):
    return f'<div class="{cls}">' + ''.join(f'<div class="info-row"><h3>{e(title)}</h3><p>{e(text)}</p></div>' for title,text in items) + '</div>'

def bullets(items):
    return '<ul>' + ''.join(f'<li>{e(item)}</li>' for item in items) + '</ul>'

def write_source():
    d = json.loads((ROOT/"overview-summary.json").read_text(encoding="utf-8"))
    css = """
*{box-sizing:border-box}html,body{margin:0;padding:0;width:1600px;background:#12282a;color:#233c37}
body{font:22px/1.65 "Microsoft YaHei","Noto Sans CJK SC",sans-serif;-webkit-font-smoothing:antialiased}
.board{width:1600px;padding:58px 64px 46px;background:linear-gradient(155deg,#edf0e5 0%,#f1eee3 48%,#e8eee5 100%)}
header{display:grid;grid-template-columns:1fr auto;gap:25px;align-items:end;border-bottom:3px solid #274f48;padding-bottom:24px;margin-bottom:24px}
.kicker{font-size:17px;letter-spacing:4px;color:#59766b;margin:0 0 8px}.title{font:92px/1.22 "SimSun",serif;letter-spacing:9px;margin:0;color:#163e39}.subtitle{font-size:25px;letter-spacing:2px;margin:12px 0 0;color:#526858}
.stamp{border:1px solid #71927d;padding:16px 20px;text-align:right;color:#365b4d;font-size:17px;line-height:1.9}.stamp b{font-size:24px;display:block;font-weight:500}
.thesis{padding:19px 25px;background:#214e45;color:#f5efe1;font-size:28px;letter-spacing:1px;margin:0 0 20px}
.stage-line{font-size:19px;color:#657665;margin:0 0 19px;border-left:3px solid #a7824b;padding:5px 14px}
.position{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:25px}.position>div{border-left:3px solid #a88351;padding-left:15px}.position b{display:block;font-size:17px;color:#9a6d3c;margin-bottom:5px}.position p{font-size:21px;margin:0}
.legend{display:flex;gap:27px;align-items:center;justify-content:space-between;font-size:17px;color:#5f7468;margin:22px 0 0}.legend>span:first-child{font-size:19px;color:#244d43}.legend i{display:inline-block;width:12px;height:12px;margin-right:8px;background:#3c7658}.legend i.draft{background:#af7842}.legend i.pending{background:#84938b}
.two-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;align-items:stretch}.hero-cols{grid-template-columns:1.55fr 1fr}
.panel{border:1px solid #c1ccbb;background:#fffdf6;padding:24px 25px;min-width:0}.panel.full{margin-top:24px}.section-head{display:flex;align-items:center;gap:12px;padding-bottom:15px;margin-bottom:18px;border-bottom:1px solid #c8cfbe}.section-head h2{font:29px/1.5 "SimSun",serif;margin:0;flex:1;color:#204e43;font-weight:600}.number{font:23px/1.5 Georgia,serif;color:#ac7842}.tag{border:1px solid #b29364;color:#976937;font-size:15px;white-space:nowrap;padding:3px 8px}
h3{font-size:22px;line-height:1.5;margin:0 0 5px;color:#2c5146}p{margin:0 0 12px}.figure{margin:0 0 17px}.figure img{width:100%;height:auto;display:block}.figure figcaption{font-size:16px;color:#637567;line-height:1.7;padding:9px 0;border-bottom:1px solid #d9dece}
.world-style{font-size:21px;color:#4e6759}.districts{display:grid;grid-template-columns:1fr 1fr;gap:13px 18px}.districts .info-row{padding-top:10px;border-top:1px solid #d9dece}.districts h3{font-size:21px}.districts p{font-size:20px;line-height:1.65;margin:0}
.note{font-size:18px;line-height:1.7;border-left:3px solid #a57b4b;padding:10px 13px;background:#f3efe1;color:#657261;margin:15px 0 0}
.species-name{font-size:24px;color:#214f43}.people-detail{font-size:20px;line-height:1.7;color:#4f6858}.people-rows .info-row{border-top:1px solid #d8dece;padding:12px 0 0;margin-top:12px}.people-rows h3{font-size:22px}.people-rows p{font-size:19px;line-height:1.75;margin:0}
.premise{font-size:22px;color:#486355;line-height:1.8;margin-bottom:20px}.chapters{display:grid;grid-template-columns:repeat(7,1fr);gap:13px}.chapter{border:1px solid #c6cfbb;background:#edf1e4;padding:15px 13px;min-width:0}.chapter-index{font:27px/1 Georgia,serif;color:#a57540;display:block;margin-bottom:12px}.chapter h3{font-size:23px;line-height:1.6;margin-bottom:10px}.chapter p{font-size:20px;line-height:1.75;margin:0;color:#4b6253}
.layers .info-row{display:grid;grid-template-columns:170px 1fr;gap:17px;padding:14px 0;border-bottom:1px solid #d7dece}.layers h3{font-size:22px}.layers p{font-size:21px;line-height:1.7;margin:0;color:#536a5b}
.loop{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:17px}.loop span{border:1px solid #a9bfab;background:#e8f1e5;padding:11px 7px;text-align:center;font-size:21px;color:#2f5a48}.learning-rows .info-row{padding:10px 0;border-bottom:1px solid #d8dfce}.learning-rows h3{font-size:22px}.learning-rows p{font-size:21px;margin:0;color:#556c5c}
.scopes{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.scope{padding:15px;border:1px solid #c7d0bc;background:#f0f2e8}.scope h3{font-size:23px;color:#2d5f4b}.scope p{font-size:21px;margin:0;color:#556d5b}
.rule-lines{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:18px}.rule-lines p{font-size:21px;color:#536b5b;margin:0;padding-left:15px;border-left:3px solid #b58d56}.first-loop{margin:17px 0 0;padding:15px 18px;background:#e9eee0;color:#345846;font-size:22px;line-height:1.8}
.abilities{display:grid;grid-template-columns:1.16fr 1fr 1fr;gap:20px}.ability{padding:20px 21px;border:1px solid #cad4c0;background:#f0f4e8}.ability h3{font-size:24px;margin-bottom:12px}.ability.done{border-top:5px solid #3c7658}.ability.draft{border-top:5px solid #ad7b47;background:#f5f0e3}.ability.pending{border-top:5px solid #83938b;background:#eef1ec}
ul{padding:0 0 0 24px;margin:0}li{margin-bottom:11px;font-size:21px;line-height:1.75;color:#4d6557}li:last-child{margin:0}
.roadmap{display:grid;grid-template-columns:repeat(5,1fr);gap:17px}.road-step{border-left:3px solid #aa8653;padding-left:16px}.road-step>span{display:block;font:24px/1 Georgia,serif;color:#a67b43;margin-bottom:11px}.road-step h3{font-size:23px}.road-step p{font-size:21px;color:#586e5c;margin:0}
.products{display:grid;grid-template-columns:repeat(4,1fr);gap:17px}.product{padding:17px;background:#eaf0e2;border:1px solid #bdccb4}.product h3{font-size:24px;line-height:1.6}.product p{font-size:21px;color:#536e5b;margin:0}
.values{display:grid;grid-template-columns:repeat(4,1fr);gap:17px;margin-top:17px}.value{border-top:2px solid #b59b74;padding:13px 4px 0}.value h3{font-size:22px;color:#986b3e}.value p{font-size:21px;margin:0;color:#536b59}
.history{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.history figure{margin:0;border:1px solid #d0d5c4;background:#f7f4ea}.history img{width:100%;height:auto;aspect-ratio:3/2;object-fit:contain;display:block;background:#172e2a}.history figcaption{padding:14px 16px}.history h3{font-size:23px;margin-bottom:6px}.history p{font-size:21px;margin:0;color:#6b6e5c}
footer{margin-top:25px;padding:24px 0 0;border-top:2px solid #3c6353;display:grid;grid-template-columns:1fr 340px;gap:35px}footer p{font-size:18px;line-height:1.8;color:#667262;margin:0}footer .footer-mark{font-size:22px;color:#315644;text-align:right;line-height:1.7}
"""
    position = ''.join(f'<div><b>{e(a)}</b><p>{e(b)}</p></div>' for a,b in d["position"])
    world, people = d["world"], d["people"]
    chapters = ''.join(f'<article class="chapter"><span class="chapter-index">{i:02}</span><h3>{e(title[3:])}</h3><p>{e(text)}</p></article>' for i,(title,text) in enumerate(d["story"]["chapters"],1))
    scopes = ''.join(f'<article class="scope"><h3>{e(a)}</h3><p>{e(b)}</p></article>' for a,b in d["multiplayer"]["scopes"])
    roadmap = ''.join(f'<article class="road-step"><span>{i:02}</span><h3>{e(a[3:])}</h3><p>{e(b)}</p></article>' for i,(a,b) in enumerate(d["roadmap"]["steps"],1))
    products = ''.join(f'<article class="product"><h3>{e(a)}</h3><p>{e(b)}</p></article>' for a,b in d["value"]["products"])
    values = ''.join(f'<article class="value"><h3>{e(a)}</h3><p>{e(b)}</p></article>' for a,b in d["value"]["dimensions"])
    history = ''.join(f'<figure><img src="../{e(file)}" alt="{e(title)}"><figcaption><h3>{e(title)}</h3><p>{e(note)}</p></figcaption></figure>' for file,title,note in d["exploration"]["items"])
    html = f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>山河共造 · 理解、能力与价值总览</title><style>{css}</style></head><body><main class="board">
<header><div><p class="kicker">WORLD · PEOPLE · STORY · SYSTEM · VALUE</p><h1 class="title">{e(d["title"])}</h1><p class="subtitle">{e(d["subtitle"])}</p></div><div class="stamp"><b>{e(d["version"])}</b>{e(d["date"])}<br>共同生活 · 学习 · 创造 · 传承</div></header>
<p class="thesis">{e(d["thesis"])}</p><p class="stage-line">{e(d["stage"])}</p><div class="position">{position}</div>
<div class="two-cols hero-cols">
<section class="panel" data-module="world">{head("01",world["title"])}<figure class="figure"><img src="../{world["image"]}" alt="岚角族高地湖岸住宅区概念"><figcaption>{e(world["caption"])}</figcaption></figure><p class="world-style">{e(world["style"])}</p>{rows(world["districts"],"districts")}<p class="note">{e(world["principle"])}</p></section>
<section class="panel" data-module="people">{head("02",people["title"])}<figure class="figure"><img src="../{people["image"]}" alt="岚角族角色全身、头部与背面概念"><figcaption>{e(people["caption"])}</figcaption></figure><p class="species-name">{e(people["species"])}</p><p class="people-detail">{e(people["shape"])}</p><p class="people-detail">{e(people["culture"])}</p>{rows(people["characters"],"people-rows")}<p class="note"><b>从概念到模型：</b>{e(people["production"])}</p></section>
</div>
<section class="panel full" data-module="story">{head("03",d["story"]["title"])}<p class="premise">{e(d["story"]["premise"])}</p><div class="chapters">{chapters}</div><p class="note">{e(d["story"]["ending"])}</p></section>
<div class="two-cols"><section class="panel" data-module="construction">{head("04",d["construction"]["title"])}{rows(d["construction"]["layers"],"layers")}<p class="note">{e(d["construction"]["note"])}</p></section>
<section class="panel" data-module="learning">{head("05",d["learning"]["title"])}<div class="loop">{''.join(f"<span>{e(x)}</span>" for x in d["learning"]["loop"])}</div>{rows(d["learning"]["examples"],"learning-rows")}<p class="note">{e(d["learning"]["development"])}</p><p class="note">{e(d["learning"]["scope"])}{e(d["learning"]["boundary"])}</p></section></div>
<section class="panel full" data-module="multiplayer">{head("06",d["multiplayer"]["title"])}<div class="scopes">{scopes}</div><div class="rule-lines"><p>{e(d["multiplayer"]["rules"])}</p><p>{e(d["multiplayer"]["time"])}</p></div><p class="first-loop">{e(d["multiplayer"]["chapter1"])}</p></section>
<section class="panel full" data-module="abilities">{head("07",d["abilities"]["title"],"分清已做与待做")}<div class="abilities"><article class="ability done"><h3>已完成 / 已展示</h3>{bullets(d["abilities"]["done"])}</article><article class="ability draft"><h3>已形成的设计草案</h3>{bullets(d["abilities"]["draft"])}</article><article class="ability pending"><h3>后续制作与验证</h3>{bullets(d["abilities"]["pending"])}</article></div></section>
<section class="panel full" data-module="roadmap">{head("08",d["roadmap"]["title"],"候选路线")}<div class="roadmap">{roadmap}</div><p class="note">{e(d["roadmap"]["gate"])}</p></section>
<section class="panel full" data-module="value">{head("09",d["value"]["title"],"潜在价值")}<div class="products">{products}</div><div class="values">{values}</div><p class="note">{e(d["value"]["note"])}</p></section>
<section class="panel full" data-module="exploration">{head("10",d["exploration"]["title"],"保留真实反馈")}<div class="history">{history}</div><p class="note">{e(d["exploration"]["conclusion"])}</p></section>
<div class="legend"><span>能力、设计与产品价值分别标注</span><span><i></i>{e(d["legend"][0]["label"])}</span><span><i class="draft"></i>{e(d["legend"][1]["label"])}</span><span><i class="pending"></i>{e(d["legend"][2]["label"])}</span></div>
<footer><p>{e(d["footer"])}</p><div class="footer-mark">0019 · 多人文明世界创作档案<br>图像概念 ≠ 可玩游戏</div></footer>
</main></body></html>'''
    SOURCE.parent.mkdir(parents=True, exist_ok=True)
    SOURCE.write_text(html, encoding="utf-8", newline="\n")
    return d

def render(browser_path=None):
    from playwright.sync_api import sync_playwright
    errors = []
    with sync_playwright() as p:
        executable = browser_path
        if executable is None:
            runtime = Path(os.environ.get("LOCALAPPDATA", str(Path.home()/"AppData/Local")))/"ms-playwright"
            candidates = sorted(runtime.glob("chromium_headless_shell-*/chrome-headless-shell-win64/chrome-headless-shell.exe"), key=lambda path:int(path.parents[1].name.rsplit("-",1)[1]))
            executable = candidates[-1] if candidates else Path(p.chromium.executable_path)
        browser = p.chromium.launch(headless=True, executable_path=str(executable))
        context = browser.new_context(viewport={"width":1600,"height":1100},device_scale_factor=2,reduced_motion="reduce")
        page = context.new_page()
        page.on("pageerror", lambda error:errors.append(str(error)))
        page.goto(SOURCE.as_uri(), wait_until="load")
        page.evaluate("document.fonts.ready")
        page.wait_for_function("Array.from(document.images).every(img=>img.complete && img.naturalWidth>0)")
        audit = page.evaluate("""() => ({
          width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
          modules:document.querySelectorAll('[data-module]').length,
          images:Array.from(document.images).map(x=>({src:x.getAttribute('src'),width:x.naturalWidth,height:x.naturalHeight})),
          overflow:Array.from(document.querySelectorAll('.panel,.chapter,.ability,.product,.road-step,.scope')).filter(x=>x.scrollWidth>x.clientWidth+1).map(x=>x.className),
          text:document.querySelector('.board').innerText
        })""")
        assert audit["width"] == 1600 and audit["modules"] == 10
        assert not audit["overflow"], audit["overflow"]
        assert not errors
        for phrase in ("岚角族","洛恩","渡石","岚织","旧水道","后来的人","骨骼","服务器","尚未实现","潜在价值","规则创作器"):
            assert phrase in audit["text"], "Missing required content: "+phrase
        page.screenshot(path=str(OUTPUT),full_page=True)
        # Small independent viewport captures are QA views, not image edits.
        qa = ROOT.parents[1]/".local/shanhe-qa"
        qa.mkdir(parents=True,exist_ok=True)
        page.screenshot(path=str(qa/'overview-header-qa.png'),full_page=False)
        for name, module in (("top","world"),("middle","construction"),("value","value")):
            page.locator(f'[data-module="{module}"]').scroll_into_view_if_needed()
            page.screenshot(path=str(qa/f"overview-{name}-qa.png"),full_page=False)
        browser.close()
    width,height=struct.unpack(">II",OUTPUT.read_bytes()[16:24])
    sources=[]
    for name in sorted({item["src"].split("/")[-1] for item in audit["images"]}):
        path=ASSETS/name
        sources.append({"file":name,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()})
    record={
      "schema_version":1,"date":"2026-11-17","type":"original code-typeset overview with unchanged existing concept PNGs",
      "method":"Deterministic HTML/CSS layout; isolated local Chromium rasterization; no new image-generation call and no model-generated lettering",
      "source_data":"overview-summary.json","source_html":"overview/board-v1.html","output":OUTPUT.name,
      "width":width,"height":height,"bytes":OUTPUT.stat().st_size,"sha256":hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
      "rendered_modules":audit["modules"],"rendered_text_characters":len(audit["text"]),"layout_overflows":audit["overflow"],
      "console_errors":errors,"source_images":sources,"notes":"Story and game construction are design proposals; current validated capability is creative documentation and the local research website."
    }
    RECORD.write_text(json.dumps(record,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:record[k] for k in ("output","width","height","bytes","rendered_modules","rendered_text_characters")}))
    return record

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--render",action="store_true")
    parser.add_argument("--browser",type=Path)
    args=parser.parse_args()
    write_source()
    if args.render:
        render(args.browser)
    else:
        print(str(SOURCE))

if __name__=="__main__":
    main()

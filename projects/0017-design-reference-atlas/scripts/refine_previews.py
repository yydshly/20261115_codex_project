"""Apply reviewed, source-specific preview choices after the generic collector."""
import concurrent.futures
import argparse
import hashlib
import html
import importlib.util
import json
import os
import re
from pathlib import Path
from urllib.parse import urljoin
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("collector", ROOT / "scripts/collect_previews.py")
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
PROXY = None

# These URLs were extracted from the corresponding public official HTML page.
PICKS = {
    4: {"page_url": "https://thefwa.com/w/incredible-space", "image_source": "https://thefwa.com/img/submissions/f1c537d8-ee6b-4235-920b-3e0ffca37529/1-1a60fa24-5f44-458f-a05e-2e6ceb40f15d.webp?w=1200", "example_title": "Incredible Space · FWA / Vince Lee", "kind": "官方获奖作品图", "caption": "Incredible Space，作者 Vince Lee；封面与作品链接来自 FWA 官方获奖 RSS。"},
    5: {"page_url": "https://motionawards.com/winners-2025.html", "image_source": "https://motionawards.com/motion_awards_2025_thumbnails/shogun-thumb-1024x513.jpg", "example_title": "Shogun · 2025 获奖作品页", "kind": "官方作品图", "caption": "《Shogun》片头缩略图，来自 The Motion Awards 2025 获奖作品列表。"},
    7: {"page_url": "https://www.dandad.org/work/d-ad-awards-archive/bottega", "image_source": "https://cms.dandad.org/images/J_mTj5fAEp5lAKgFKi0ROUnb_dc=/134988/format-webp%7Cwidth-1600/3000x2560-inside_CngKtXC.jpeg", "example_title": "Bottega · D&AD 作品档案", "kind": "官方作品图", "caption": "Bottega 作品配图，来自 D&AD 官方作品档案。"},
    9: {"page_url": "https://aiff.runwayml.com/", "image_source": "https://runway-static-assets.s3.us-east-1.amazonaws.com/aiff/images/between-before-and-after-poster-laurel.png", "example_title": "AI Film Festival · 官网影片海报与放映入口", "kind": "官方影片海报", "caption": "Between Before and After 影片海报，来自 Runway AI Film Festival 官网。"},
    10: {"page_url": "https://tokyotypedirectorsclub.org/award/2026_grandprize/", "image_source": "https://tokyotypedirectorsclub.org/wp-content/uploads/2026/01/2026_01_Grand-Prize.png", "example_title": "Tokyo TDC 2026 Grand Prize", "kind": "官方作品图", "caption": "Tokyo TDC 2026 Grand Prize 页面所列作品配图。"},
    12: {"page_url": "https://www.ciclopefestival.com/behind-the-craft/ciclope-asia-pacific-brand-of-the-year-2026/", "image_source": "https://www.ciclopefestival.com/wp-content/uploads/2026/08/Telstra_WAGGA-WAGGA-1-1024x576.jpeg", "example_title": "Behind the Brand: Telstra · CICLOPE", "kind": "官方项目配图", "caption": "Telstra Wagga Wagga 项目配图，来自 CICLOPE 官方 Behind the Brand 文章。"},
    20: {"page_url": "https://blog.sakugabooru.com/2026/10/31/ghost-madoka-walpurgisnacht-rising/", "image_source": "https://blog.sakugabooru.com/wp-content/uploads/2026/10/ghostdoka-1038x576.jpg", "example_title": "Ghost Madoka · Sakuga Blog 动画分析", "kind": "关联博客动画配图", "caption": "来自关联站 Sakuga Blog 的 Ghost Madoka 动画分析配图；非 Sakugabooru 验证页或动画实播截图。"},
    22: {"page_url": "https://buck.co/work/jpmorgan-payments", "image_source": "https://cdn.sanity.io/images/uk7b627p/production/de23bc83ac74e595e685d01f1fe577ba080110a3-2076x1268.png?w=600&q=75&auto=format&dpr=2", "example_title": "J.P. Morgan Payments · BUCK", "kind": "官方作品图", "caption": "J.P. Morgan Payments 项目封面，来自 BUCK 官网首页的项目链接。"},
    26: {"page_url": "https://www.ordinaryfolk.co/project/distance", "image_source": "https://media.ordinary.co/img/home/distance.jpg", "example_title": "Distance · Ordinary Folk", "kind": "官方作品图", "caption": "Distance 项目封面，来自 Ordinary Folk 官方作品列表。"},
    29: {"page_url": "https://80.lv/articles/creating-a-ghibli-inspired-island-in-blender-ue5-substance-3d", "image_source": "https://cdn.80.lv/api/upload/meta/20385/images/6295006ecb32f/contain_1200x630.jpg", "example_title": "Creating a Ghibli-Inspired Island · 80 Level", "kind": "官方案例配图", "caption": "吉卜力风岛屿制作拆解配图，来自 80 Level 原文章。"},
    36: {"page_url": "https://community.shotdeck.com/articles/what-working-with-actor-directors-taught-dp-adam-newport-berra-for-club-kid/", "image_source": "https://community.shotdeck.com/wp-content/uploads/2026/11/Club-Kid-Thumbnail-1024x683.jpg", "example_title": "Club Kid 摄影访谈 · ShotDeck Community", "kind": "官方社区案例配图", "caption": "《Club Kid》摄影访谈封面，来自 ShotDeck 官方社区；非付费图库内部截图。"},
    50: {"page_url": "https://m3.material.io/components/buttons/overview", "image_source": "https://lh3.googleusercontent.com/iu0ghCr65S7lOuzD1FyNaql_XMiItRV2chZ8KPzCdE_ydVb8vS3GT25DnbVWTIsMYO4upfZyJim6urOt1cm8kOOGKeIYqX3Wbl1agO3BZfPgYOSJcw", "example_title": "Buttons · Material Design 3", "kind": "官方组件页面预览", "caption": "Material Design 3 按钮组件页面的官方预览图。"},
    60: {"page_url": "https://www.siteinspire.com/website/9116-husk", "image_source": "https://r2.siteinspire.com/cdn-cgi/image/width=640,height=400,quality=75,format=auto,metadata=none,gravity=top,fit=crop,compress=true/ffn79dTv__H6.jpg", "example_title": "Husk · Siteinspire 网站案例", "kind": "官方案例截图", "caption": "Husk 网站案例截图，来自 Siteinspire 公开案例页。"},
    69: {"page_url": "https://tympanus.net/codrops/2020/06/10/how-to-create-a-motion-hover-effect-for-a-background-image-grid/", "image_source": "https://tympanus.net/codrops2020/MotionGrid_featured.30ff2300.jpg", "example_title": "Motion Hover Effect for a Background Image Grid · Codrops", "kind": "官方示例截图", "caption": "Codrops 背景照片网格悬停交互示例截图，图源为原教程；非验证或加载页。"},
    73: {"page_url": "https://coalpy.org/", "image_source": "https://coalpy.org/images/seascape.png?raw=true", "example_title": "Seascape · TDM（Shadertoy 原作）", "example_url": "https://www.shadertoy.com/view/Ms2SD1", "kind": "原作移植效果截图", "caption": "Seascape 原作：Alexander Alekseev / TDM（2014，CC BY-NC-SA 3.0）；此图为 CoalPy 官网展示的移植效果，非 Shadertoy 页面截图。"},
}


def youtube_pick():
    raw, _, _, _ = c.get("https://www.youtube.com/@pwnisher", PROXY)
    text = raw.decode("utf-8", errors="replace")
    match = re.search(r"(?:var )?ytInitialData\s*=\s*", text)
    data = json.JSONDecoder().raw_decode(text[match.end():])[0]
    videos = []

    def walk(value):
        if isinstance(value, dict):
            if "lockupViewModel" in value:
                r = value["lockupViewModel"]
                title = r.get("metadata", {}).get("lockupMetadataViewModel", {}).get("title", {}).get("content", "")
                sources = r.get("contentImage", {}).get("thumbnailViewModel", {}).get("image", {}).get("sources", [])
                if r.get("contentId") and sources:
                    videos.append((r["contentId"], title, sources[-1]["url"]))
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(data)
    selected = next((v for v in videos if re.search(r"challenge|renders|rendering", v[1], re.I)), videos[0])
    return {"page_url": "https://www.youtube.com/watch?v=" + selected[0], "image_source": selected[2],
            "example_title": selected[1], "kind": "官方频道视频封面",
            "caption": "Pwnisher 官方频道视频封面：" + selected[1] + "。"}


def content_pick(ident, url):
    raw, _, _, actual = c.get(url, PROXY)
    page = c.Page(actual)
    page.feed(raw.decode("utf-8", errors="replace"))
    candidates = [v for v in page.candidates if v["kind"] == "官方内容图" and v["score"] > 0]
    if ident == 39:
        candidate = next(v for v in candidates if "film-" in v["url"])
    else:
        candidate = candidates[0]
    return {"page_url": actual, "image_source": candidate["url"], "example_title": candidate["alt"] or "查看官网中的示例画面",
            "kind": "官方内容图", "caption": "官网公开内容图；" + (candidate["alt"] or "画面来自该站首页，未单独核实影片名称") + "。"}


def apply_pick(row):
    ident, picked = row
    raw, mime, status, resolved = c.get(html.unescape(picked["image_source"]), PROXY, limit=7_000_000, timeout=22)
    processed, size = c.normalize_image(raw)
    path = c.DEST / f"{ident:03d}.jpg"
    path.write_bytes(processed)
    return ident, {**picked, "status": "ok", "src": f"../assets/previews/{path.name}",
                   "example_url": picked.get("example_url", picked["page_url"]), "image_resolved_url": resolved,
                   "image_mime": mime, "image_http_status": status, "width": size[0], "height": size[1],
                   "fetched_at": c.now(), "sha256": hashlib.sha256(processed).hexdigest(),
                   "error": None, "visual_qa": "pending-review-of-replacement", "license_note": c.NOTICE}


def main():
    global PROXY
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--proxy", default=os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy"))
    parser.add_argument("--ids", type=int, nargs="*")
    args = parser.parse_args()
    PROXY = args.proxy
    picks = dict(PICKS)
    if not args.ids or 1 in args.ids:
        try:
            picks[1] = youtube_pick()
        except Exception as error:
            print("youtube:", type(error).__name__, flush=True)
    for ident, url in [(21, "https://www.promonews.tv/"), (39, "https://flim.ai/")]:
        if args.ids and ident not in args.ids:
            continue
        try:
            picks[ident] = content_pick(ident, url)
        except Exception as error:
            print(f"{ident} content:", type(error).__name__, flush=True)
    if args.ids:
        picks = {ident: picked for ident, picked in picks.items() if ident in args.ids}
    overrides = {}
    previous = ROOT / "assets/preview-refinements.json"
    if previous.exists():
        overrides = json.loads(previous.read_text(encoding="utf-8"))["previews"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        jobs = {pool.submit(apply_pick, row): row[0] for row in picks.items()}
        for future in concurrent.futures.as_completed(jobs):
            try:
                ident, entry = future.result()
                overrides[str(ident)] = entry
                print(ident, "refined", flush=True)
            except Exception as error:
                print(jobs[future], type(error).__name__, str(error)[:160], flush=True)
    data = json.loads(c.OUTPUT.read_text(encoding="utf-8"))
    for ident, entry in overrides.items():
        data["previews"][ident].update(entry)
    data["generated_at"] = c.now()
    data["summary"] = {"total": len(data["previews"]), "available": sum(v["status"] == "ok" for v in data["previews"].values())}
    c.write_json(ROOT / "assets/preview-refinements.json", {"schema_version": 1, "generated_at": c.now(), "previews": overrides})
    c.write_json(c.OUTPUT, data)
    c.write_json(c.MANIFEST, data)
    print(data["summary"], flush=True)


if __name__ == "__main__":
    main()

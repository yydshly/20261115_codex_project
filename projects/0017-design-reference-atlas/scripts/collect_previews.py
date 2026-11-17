"""Collect small public, source-attributed preview images for local research.

Uses public HTML and image URLs only. Never logs in, bypasses challenges, or
downloads video. Re-run to resume successful records; --retry refreshes failures.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import gzip
import hashlib
import html
from html.parser import HTMLParser
import io
import json
import os
import re
import threading
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote, urljoin, urlsplit
from urllib.request import ProxyHandler, Request, build_opener

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "web/data/catalog.json"
OUTPUT = ROOT / "web/data/previews.json"
MANIFEST = ROOT / "assets/preview-sources.json"
DEST = ROOT / "assets/previews"
DATE = "2026-11-16"
NOTICE = ("仅作本地研究导航的小尺寸引用；画面、品牌和作品权利归原站点及相应创作者。"
          "未核实逐项再分发许可，不能将本素材目录直接当作商业素材包或公开发布授权。")
USER_AGENT = "Mozilla/5.0"
LOCAL = threading.local()


def now():
    return dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).isoformat(timespec="seconds")


class Page(HTMLParser):
    def __init__(self, base):
        super().__init__(convert_charrefs=True)
        self.base = base
        self.candidates = []
        self.title = ""
        self.in_title = False
        self.h1 = False
        self.heading = ""
        self.anchor = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a":
            self.anchor = urljoin(self.base, a.get("href", ""))
        if tag == "title":
            self.in_title = True
        if tag == "h1":
            self.h1 = True
        if tag == "meta" and a.get("property", a.get("name", "")).lower() in ("og:image", "og:image:url", "twitter:image", "twitter:image:src"):
            self.add(a.get("content"), 60, "官方页面预览", "")
        if tag == "img":
            source = a.get("data-src") or a.get("data-lazy-src") or a.get("src")
            source_set = a.get("data-srcset") or a.get("srcset")
            if source_set:
                sets = source_set.split(",")
                # A mid-sized source avoids oversized originals.
                options = [s.strip().split()[0] for s in sets if s.strip()]
                source = options[min(len(options) - 1, 2)] if options else source
            alt = a.get("alt", "")[:240]
            width = re.sub(r"\D", "", a.get("width", ""))
            height = re.sub(r"\D", "", a.get("height", ""))
            score = 35
            if width and int(width) >= 300:
                score += 12
            if height and int(height) >= 150:
                score += 6
            if re.search(r"project|work|gallery|film|render|design|thumbnail|poster|screen|case", (source or "") + " " + alt, re.I):
                score += 12
            if re.search(r"logo|avatar|icon|badge|payment|flag|sponsor|partner|arrow|rating|loading|spinner|favicon|author", (source or "") + " " + alt, re.I):
                score -= 80
            if source and not source.startswith("data:"):
                self.add(source, score, "官方内容图", alt, self.anchor)

    def add(self, url, score, kind, alt, target=None):
        if not url:
            return
        url = urljoin(self.base, html.unescape(url.strip()))
        if urlsplit(url).scheme not in ("http", "https"):
            return
        if re.search(r"\.svg(?:\?|$)|\.gif(?:\?|$)|\.ico(?:\?|$)|pixel|tracking|facebook\.com/tr(?:\?|/)|google-analytics", url, re.I):
            return
        if re.search(r"logo|favicon|avatar|icon", url, re.I):
            score -= 70
        if target and urlsplit(target).hostname != urlsplit(self.base).hostname:
            target = None
        self.candidates.append({"url": url, "score": score, "kind": kind, "alt": alt, "target": target})

    def handle_endtag(self, tag):
        if tag == "a":
            self.anchor = None
        if tag == "title":
            self.in_title = False
        if tag == "h1":
            self.h1 = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.h1:
            self.heading += data


def get(url, proxy, limit=3_200_000, timeout=18):
    if not hasattr(LOCAL, "opener"):
        handler = ProxyHandler({"http": proxy, "https": proxy}) if proxy else ProxyHandler()
        LOCAL.opener = build_opener(handler)
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "gzip", "Accept": "text/html,image/avif,image/webp,image/*,*/*;q=0.8"})
    with LOCAL.opener.open(request, timeout=timeout) as response:
        raw = response.read(limit + 1)
        if len(raw) > limit:
            raise ValueError(f"response larger than {limit} bytes")
        if response.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
        return raw, response.headers.get("Content-Type", ""), response.status, response.url


def normalize_image(raw):
    im = Image.open(io.BytesIO(raw))
    im.seek(0)
    if im.width < 280 or im.height < 140:
        raise ValueError(f"image too small: {im.size}")
    if max(im.size) / min(im.size) > 4.5:
        raise ValueError(f"image too narrow: {im.size}")
    im = im.convert("RGB")
    im.thumbnail((900, 650), Image.Resampling.LANCZOS)
    if sum(ImageStat.Stat(im.resize((64, 64))).stddev) < 5:
        raise ValueError("blank image")
    output = io.BytesIO()
    im.save(output, format="JPEG", quality=84, optimize=True)
    if len(output.getvalue()) > 2_000_000:
        raise ValueError("preview exceeds 2 MB")
    return output.getvalue(), im.size


def collect(site, proxy, screenshot=True):
    started = time.monotonic()
    ident = site["id"]
    example = site.get("example", {})
    entry = {"id": ident, "name": site["name"], "status": "unavailable", "src": None,
             "page_url": site["url"], "image_source": None, "kind": "暂无预览",
             "caption": "", "example_url": example.get("url") or site["url"],
             "example_title": example.get("title") or "前往官网查看作品与示例",
             "http_status": None, "fetched_at": now(), "license_note": NOTICE, "error": None}
    failures = []
    candidates = []
    page_url = site["url"]
    try:
        raw, mime, status, actual = get(page_url, proxy)
        entry["http_status"] = status
        entry["resolved_url"] = actual
        text = raw.decode("utf-8", errors="replace")
        if re.search(r"just a moment|verify you are human|cf-chl-|enable javascript and cookies to continue", text[:60000], re.I):
            raise ValueError("public page requires challenge")
        page = Page(actual)
        page.feed(text)
        entry["page_title"] = re.sub(r"\s+", " ", page.title).strip()[:220]
        candidates = sorted(page.candidates, key=lambda c: c["score"], reverse=True)
        seen = set()
        for candidate in candidates[:6]:
            if time.monotonic() - started > 45:
                failures.append("candidate image budget reached")
                break
            if candidate["url"] in seen or candidate["score"] < 0:
                continue
            seen.add(candidate["url"])
            try:
                data, image_mime, image_status, resolved = get(candidate["url"], proxy, limit=7_000_000, timeout=16)
                processed, size = normalize_image(data)
                if len(processed) > 2_000_000:
                    raise ValueError("preview too large")
                path = DEST / f"{ident:03d}.jpg"
                path.write_bytes(processed)
                entry.update(status="ok", src=f"../assets/previews/{path.name}", image_source=candidate["url"],
                             image_resolved_url=resolved, image_mime=image_mime, image_http_status=image_status,
                             kind=candidate["kind"], caption=(f"{site['name']} · {candidate['kind']}；画面来自该站公开页面。"),
                             image_alt=candidate["alt"], width=size[0], height=size[1], sha256=hashlib.sha256(processed).hexdigest())
                if candidate.get("target") and re.search(r"/(?:work|project|article|site|title|blog|case|gallery|film|post|entry|showcase)[s/-]", urlsplit(candidate["target"]).path, re.I):
                    entry["example_url"] = candidate["target"]
                    entry["example_title"] = candidate["alt"] or "查看预览图对应的原站页面"
                return entry
            except Exception as error:
                failures.append(f"image: {type(error).__name__}: {str(error)[:150]}")
    except HTTPError as error:
        entry["http_status"] = error.code
        failures.append(f"page: HTTP {error.code}")
    except Exception as error:
        failures.append(f"page: {type(error).__name__}: {str(error)[:160]}")
    if screenshot:
        # This is a real remote page screenshot, never described as a named work.
        url = "https://image.thum.io/get/width/800/crop/500/noanimate/" + site["url"]
        try:
            raw, mime, status, resolved = get(url, proxy, limit=5_000_000, timeout=35)
            processed, size = normalize_image(raw)
            path = DEST / f"{ident:03d}.jpg"
            path.write_bytes(processed)
            entry.update(status="ok", src=f"../assets/previews/{path.name}", image_source=url, image_resolved_url=resolved,
                         image_mime=mime, image_http_status=status, kind="第三方页面截图",
                         caption=f"{site['name']} · thum.io 页面截图，非特定作品；内容可能随官网更新。",
                         width=size[0], height=size[1], sha256=hashlib.sha256(processed).hexdigest(),
                         screenshot_service="https://www.thum.io/", error="; ".join(failures)[-800:])
            return entry
        except Exception as error:
            failures.append(f"screenshot: {type(error).__name__}: {str(error)[:160]}")
    entry["error"] = "; ".join(failures)[-1200:] or "No suitable public raster image found."
    entry["caption"] = "此站暂无可用缩略图，可通过作品入口查看原站效果。"
    return entry


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--proxy", default=os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy"))
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--ids", type=int, nargs="*")
    parser.add_argument("--retry", action="store_true", help="retry previously failed entries")
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--no-screenshot", action="store_true")
    args = parser.parse_args()
    if not CATALOG.is_file():
        raise SystemExit("catalog.json is not ready yet")
    data = json.loads(CATALOG.read_text(encoding="utf-8-sig"))
    sites = data["sites"]
    DEST.mkdir(parents=True, exist_ok=True)
    records = {}
    if OUTPUT.exists():
        records = json.loads(OUTPUT.read_text(encoding="utf-8"))["previews"]
    pending = [s for s in sites if (not args.ids or s["id"] in args.ids) and
               (args.refresh or str(s["id"]) not in records or
                (args.retry and records[str(s["id"])]["status"] != "ok"))]

    def save():
        result = {"schema_version": 1, "generated_at": now(), "license_note": NOTICE,
                  "summary": {"total": len(records), "available": sum(v["status"] == "ok" for v in records.values())},
                  "previews": dict(sorted(records.items(), key=lambda pair: int(pair[0])))}
        write_json(OUTPUT, result)
        write_json(MANIFEST, result)

    print(f"Collecting {len(pending)} public previews", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 16))) as pool:
        jobs = {pool.submit(collect, site, args.proxy, not args.no_screenshot): site for site in pending}
        for future in concurrent.futures.as_completed(jobs):
            site = jobs[future]
            try:
                entry = future.result()
            except Exception as error:
                entry = {"id": site["id"], "name": site["name"], "status": "unavailable", "src": None, "error": str(error)}
            records[str(site["id"])] = entry
            save()
            print(f"{site['id']:03d} {entry['status']} {entry.get('kind', '')} {site['name']}", flush=True)
    save()
    print(json.dumps({"total": len(records), "available": sum(v["status"] == "ok" for v in records.values())}), flush=True)


if __name__ == "__main__":
    main()

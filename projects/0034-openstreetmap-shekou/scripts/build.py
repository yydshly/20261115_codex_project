"""Assemble the research page and independently runnable archived scenes."""

import hashlib
import json
import re
import shutil
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "web"
OUTPUT = ROOT / "dist"
GUIDE = "assets/openstreetmap-summary.png"
GUIDE_SHA256 = "84263e53da3feaf7cef8f00c1f83045784041ef28d6495eccb437459ff6e3f68"
RELEASE_BASE = "https://github.com/yydshly/20261115_codex_project/releases/download/"


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.urls = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if "id" in attrs:
            if attrs["id"] in self.ids:
                raise ValueError(f"Duplicate page ID: {attrs['id']}")
            self.ids.add(attrs["id"])
        self.urls.extend(attrs[key] for key in ("href", "src") if attrs.get(key))


def scene_document(fragment, name):
    title = escape(name.removesuffix(".html").replace("-", " "))
    return (
        '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f'<title>{title} · 蛇口原型</title>\n'
        '<link rel="stylesheet" href="../scene.css">\n<script src="../scene-state.js"></script>\n'
        '</head>\n<body>\n<main class="scene-frame">\n'
        '<nav aria-label="返回研究">\n<a href="../index.html#archive">返回项目复盘与版本索引</a>\n</nav>\n'
        f'{fragment}\n</main>\n</body>\n</html>\n'
    )


def build():
    index = (INPUT / "index.html").read_text(encoding="utf-8")
    page = Page()
    page.feed(index)
    if "osm" not in page.ids:
        raise ValueError("The OpenStreetMap chapter is missing")
    files = json.loads((ROOT / "publication-data.json").read_text(encoding="utf-8"))
    downloads = {RELEASE_BASE + files["release_tag"] + "/" + entry["name"] for entry in files["files"]}
    if not downloads.issubset(page.urls):
        raise ValueError("A download link has no release manifest entry")

    scene_urls = {url for url in page.urls if url.startswith("previews/")}
    if len(scene_urls) != 20:
        raise ValueError("Expected the 20 archived scene entries")
    for url in scene_urls:
        if not re.fullmatch(r"previews/shekou-[a-z-]+\.html", url):
            raise ValueError(f"Invalid scene file: {url}")

    if hashlib.sha256((ROOT / GUIDE).read_bytes()).hexdigest() != GUIDE_SHA256:
        raise ValueError("The guide image does not match the original PNG")

    OUTPUT.mkdir(exist_ok=True)
    (OUTPUT / "previews").mkdir(exist_ok=True)
    (OUTPUT / "assets").mkdir(exist_ok=True)
    for url in sorted(set(page.urls)):
        if url == "../../":
            continue
        target = urlsplit(url)
        if target.scheme:
            if target.scheme != "https":
                raise ValueError(f"Only HTTPS external links are supported: {url}")
            continue
        if not target.path:
            if target.fragment not in page.ids:
                raise ValueError(f"Missing page anchor: {url}")
            continue
        path = Path(unquote(target.path))
        if path.is_absolute() or ".." in path.parts:
            raise ValueError(f"Invalid local path: {url}")
        if url in scene_urls:
            fragment = (INPUT / "scenes" / path.name).read_text(encoding="utf-8-sig")
            if re.search(r"<(?:!doctype|html|head|body)(?:\s|>)", fragment, re.I):
                raise ValueError(f"Scene is not a fragment: {path.name}")
            if re.search(r"file:///|\b[A-Za-z]:[/\\](?:Users|codex|DevelopmentCache)\b", fragment, re.I):
                raise ValueError(f"Local path in scene: {path.name}")
            (OUTPUT / path).write_text(scene_document(fragment, path.name), encoding="utf-8")
        else:
            source = ROOT / path if url.startswith("assets/") else INPUT / path
            shutil.copyfile(source, OUTPUT / path)

    for name in ("scene.css", "scene-state.js"):
        shutil.copyfile(INPUT / name, OUTPUT / name)
    (OUTPUT / "index.html").write_text(index, encoding="utf-8")
    if hashlib.sha256((OUTPUT / GUIDE).read_bytes()).hexdigest() != GUIDE_SHA256:
        raise ValueError("The published guide image changed during assembly")
    print(f"OpenStreetMap study: {len(scene_urls)} playable entries, {len(downloads)} downloads, original guide PNG verified")


if __name__ == "__main__":
    build()

"""Check the exported archive's evidence, complete text and local links."""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "dist"

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.images = []
        self.headings = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            assert attrs["id"] not in self.ids, "Duplicate element ID: " + attrs["id"]
            self.ids.add(attrs["id"])
        if tag == "h1":
            self.headings += 1
        for field in ("href", "src"):
            if attrs.get(field):
                self.links.append(attrs[field])
        if tag == "img":
            assert attrs.get("alt") is not None, "Image lacks alt attribute"
            if attrs.get("src"):
                self.images.append(attrs["src"])

def main():
    r = json.loads((ROOT/"research.json").read_text(encoding="utf-8"))
    story = json.loads((ROOT/"story.json").read_text(encoding="utf-8"))
    manifest = json.loads((ROOT/"assets/manifest.json").read_text(encoding="utf-8"))
    pages = {}
    for path in DEST.glob("*.html"):
        parser = Page()
        parser.feed(path.read_text(encoding="utf-8"))
        assert parser.headings == 1, "Expected one page heading: " + path.name
        pages[path.resolve()] = parser
    assert len(pages) == 7
    for name in ("styles.css", "app.js", "data.js"):
        assert (DEST/name).stat().st_size > 300, "Critical web asset is empty: " + name
    internal = 0
    for path, parser in pages.items():
        for raw in parser.links:
            split = urlsplit(raw)
            if split.scheme or split.netloc:
                continue
            target = (path.parent / unquote(split.path)).resolve() if split.path else path
            assert target.is_relative_to(DEST.resolve()), "Export link escapes: " + raw
            assert target.is_file(), f"Missing resource: {path.name} -> {raw}"
            if split.fragment and target.suffix == ".html":
                assert unquote(split.fragment) in pages[target].ids, f"Missing anchor: {path.name} -> {raw}"
            internal += 1
    story_html = (DEST/"story.html").read_text(encoding="utf-8")
    count = 0
    for section in story["sections"]:
        assert f'id="{section["id"]}"' in story_html
        for paragraph in section["paragraphs"]:
            assert "<p>"+escape(paragraph, quote=True)+"</p>" in story_html, "Complete story paragraph omitted"
            count += 1
    image_records = manifest["files"] + manifest.get("supplements", [])
    for record in image_records:
        path = ROOT/"assets"/record["file"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == record["sha256"], "Archived image differs"
        assert hashlib.sha256((DEST/"assets"/record["file"]).read_bytes()).hexdigest() == record["sha256"]
    build = json.loads((DEST/"build-manifest.json").read_text(encoding="utf-8"))
    for record in build["files"]:
        assert hashlib.sha256((DEST/record["path"]).read_bytes()).hexdigest() == record["sha256"], "Stale build manifest: " + record["path"]
    assert len(r["assets"]) == 6
    assert len(story["chapters"]) == 7
    assert len(story["sections"]) == 13 and count == 73
    registry = json.loads((ROOT.parents[1]/"projects.json").read_text(encoding="utf-8"))
    own = next(x for x in registry["projects"] if x["id"] == "0019")
    public_url = "https://yydshly.github.io/20261115_codex_project/demos/0019-shanhe-co-creation/index.html"
    assert own["slug"] == "shanhe-co-creation" and own["demo_url"] in (None, public_url)
    guide = "projects/0019-shanhe-co-creation/assets/shanhe-understanding-overview-v1.png"
    assert own["preview"]["path"] == guide and own["preview"]["full_path"] == guide
    home = (DEST/'index.html').read_text(encoding='utf-8')
    assert 'id="understanding"' in home and r['meta']['source_url'] in home
    if build['mode'] == 'publication':
        assert '未公开部署' not in home and '公开研究档案' in home
    result={"pages":len(pages),"local_links_checked":internal,"story_sections":13,"story_paragraphs_present":count,"image_hashes_verified":len(image_records),"publication_build":build['mode']=='publication'}
    print(json.dumps(result))
    return result

if __name__ == "__main__":
    main()

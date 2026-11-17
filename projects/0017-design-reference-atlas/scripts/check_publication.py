"""Verify the public reader, guide identity, data coverage and relative paths."""
from __future__ import annotations

import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import struct
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
GUIDE = "effects-principles-value-overview-v1"
GUIDE_HASH = "10e54cb14a276bd24e7fbbcbc4c6e0f29e160b13e29cd0888e00cfb267dfe525"


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        for attr in ("src", "href"):
            if attrs.get(attr):
                self.links.append(attrs[attr])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    site = args.site.resolve()
    page_text = (site / "index.html").read_text(encoding="utf-8")
    page = Page()
    page.feed(page_text)
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            assert url.scheme in ("https", "data"), f"Unexpected URL: {link}"
            continue
        if not url.path:
            assert not url.fragment or unquote(url.fragment) in page.ids, f"Missing anchor: {link}"
            continue
        assert not url.path.startswith("/"), f"Domain-root path: {link}"
        target = (site / unquote(url.path)).resolve()
        assert target.is_relative_to(site) and target.is_file(), f"Missing or escaping file: {link}"
    for fragment in ("我们的理解", "把参考，变成创作决定。", "45项官方资料", "保存高清图", "原图未重绘"):
        assert fragment in page_text, f"Missing published understanding: {fragment}"
    catalog = json.loads((site / "data/catalog.json").read_text(encoding="utf-8-sig"))
    assert len(catalog["sites"]) == 100 and len(catalog["categories"]) == 9
    analyses = {}
    for name in ("analysis-001-035.json", "analysis-036-068.json", "analysis-069-100.json"):
        data = json.loads((site / "data" / name).read_text(encoding="utf-8-sig"))
        analyses.update(data["sites"])
    assert set(analyses) == set(map(str, range(1, 101)))
    manifest = json.loads((site / "data/previews.json").read_text(encoding="utf-8"))
    available = 0
    for key, preview in manifest["previews"].items():
        if preview["status"] != "ok":
            assert key in ("27", "68") and not preview.get("src")
            continue
        image = (site / preview["src"]).resolve()
        assert image.is_relative_to(site / "assets/previews")
        assert hashlib.sha256(image.read_bytes()).hexdigest() == preview["sha256"]
        available += 1
    assert available == 98
    guide = site / "assets" / (GUIDE + ".png")
    guide_bytes = guide.read_bytes()
    assert hashlib.sha256(guide_bytes).hexdigest() == GUIDE_HASH, "Selected guide image changed"
    assert struct.unpack(">II", guide_bytes[16:24]) == (3200, 5768)
    sources = json.loads((site / "assets/overview-sources.json").read_text(encoding="utf-8"))
    assert sources["png_sha256"] == GUIDE_HASH and len(sources["referenced_previews"]) == 9
    svg_bytes = (site / "assets" / (GUIDE + ".svg")).read_bytes()
    assert hashlib.sha256(svg_bytes).hexdigest() == sources["svg_sha256"]
    files = sorted(p for p in site.rglob("*") if p.is_file())
    assert not any(p.name.startswith(".") or p.suffix in (".py", ".zip", ".exe") for p in files)
    total = sum(p.stat().st_size for p in files)
    assert total < 20 * 1024 * 1024, "Project exceeds its 20 MiB publication budget"
    print(json.dumps({"pages": 1, "sites": 100, "analyses": 100, "previews": available,
                      "guide_sha256": GUIDE_HASH, "guide_size": [3200, 5768],
                      "files": len(files), "bytes": total, "relative_paths": "passed"}, ensure_ascii=True))


if __name__ == "__main__":
    main()

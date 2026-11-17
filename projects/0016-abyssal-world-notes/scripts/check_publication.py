"""Verify publication content, portable paths and the exact selected guide image."""

import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import struct
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs, self.text = [], []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for field in ("href", "src"):
            if attrs.get(field):
                self.refs.append((tag, attrs[field]))

    def handle_data(self, data):
        self.text.append(data)


def check(site):
    site = site.resolve()
    page = Page()
    source = (site / "index.html").read_text(encoding="utf-8")
    page.feed(source)
    local = 0
    for tag, ref in page.refs:
        parts = urlsplit(ref)
        if parts.scheme or parts.netloc:
            assert parts.scheme in {"https", "data"}, ref
            assert tag == "a" or parts.scheme == "data", "Remote runtime asset"
            continue
        if not parts.path:
            continue
        assert not parts.path.startswith("/"), "Domain-root path breaks repository hosting"
        target = (site / unquote(parts.path)).resolve()
        assert target.is_relative_to(site), "Published page escapes its own package"
        assert target.is_file(), f"Missing public resource: {ref}"
        local += 1
    record = json.loads((ROOT / "assets/summary-verification.json").read_text(encoding="utf-8"))
    for name, expected in record["sha256"].items():
        data = (site / "assets" / name).read_bytes()
        assert hashlib.sha256(data).hexdigest() == expected, f"Selected artifact changed: {name}"
    image = (site / "assets/understanding-summary.png").read_bytes()
    assert image[:8] == b"\x89PNG\r\n\x1a\n"
    assert struct.unpack(">II", image[16:24]) == (2400, 5595)
    originals = json.loads((ROOT / "assets/summary-layout.json").read_text(encoding="utf-8"))
    for name, expected in originals["source_images_sha256"].items():
        assert hashlib.sha256((site / "assets" / name).read_bytes()).hexdigest() == expected
    normalize = lambda text: re.sub(r"\s+", "", text)
    visible = normalize("".join(page.text))
    paragraphs = (ROOT / "assets/our-sea-brief.txt").read_text(encoding="utf-8").strip().split("\n\n")
    assert len(paragraphs) == 7
    for paragraph in paragraphs:
        assert normalize(paragraph) in visible, "Original brief paragraph omitted from webpage"
    for phrase in ("原库的价值", "我们的提示词沉淀", "尚未执行"):
        assert phrase in source, f"Missing publication context: {phrase}"
    assert 'src="./assets/understanding-summary.png"' in source, "Guide is not displayed in webpage"
    assert (site / "assets/UPSTREAM-LICENSE.txt").read_text(encoding="utf-8").startswith("MIT License")
    assert not any(token in source for token in ("file:///", "F:\\", "D:\\")), "Local filesystem URL in public HTML"
    total = sum(path.stat().st_size for path in site.rglob("*") if path.is_file())
    assert total <= 8 * 1024 * 1024, "Publication exceeds the 8 MiB project budget"
    print(f"OK: sea publication; {local} portable references; exact guide and 3 scenes; 7 complete brief paragraphs; {total:,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    check(args.site)

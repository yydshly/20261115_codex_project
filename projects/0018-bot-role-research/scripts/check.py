"""Check evidence coverage, images, local links and JS syntax for this study."""
from html.parser import HTMLParser
import hashlib
import json
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("a", "img", "script", "iframe", "link"):
            value = attrs.get("src") or attrs.get("href")
            if value:
                self.links.append(value)


def main():
    data = json.loads((ROOT / "research.json").read_text(encoding="utf-8"))
    manifest = json.loads((ROOT / "assets/figure-manifest.json").read_text(encoding="utf-8"))
    assert data["schema_version"] == 1
    assert len(data["trading_roles"]) == 8 and len(data["research_roles"]) == 5
    assert len(data["conversions"]) == 5
    original = {r["id"] for r in data["trading_roles"]}
    research = {r["id"] for r in data["research_roles"]}
    assert {r for c in data["conversions"] for r in c["from"]} == original
    assert {c["to"] for c in data["conversions"]} == research
    assert len({s["id"] for s in data["sources"]}) == len(data["sources"])
    assert all(set(q["source_ids"]) <= {s["id"] for s in data["sources"]} for q in data["discussion"])
    for asset in manifest["files"]:
        assert hashlib.sha256((ROOT / "assets" / asset["path"]).read_bytes()).hexdigest() == asset["sha256"], asset["path"]
    with Image.open(ROOT / "assets/bot-role-overview.png") as image:
        assert image.size == (3200, 7230)
        image.verify()
    with Image.open(ROOT / "assets/role-conversion.png") as image:
        assert image.size == (3200, 1320)
    svg = ET.parse(ROOT / "assets/bot-role-overview.svg")
    hrefs = {node.attrib["href"] for node in svg.iter() if "href" in node.attrib}
    assert hrefs == {s["url"] for s in data["sources"]}
    text = " ".join(svg.getroot().itertext())
    for role in data["trading_roles"] + data["research_roles"]:
        for field in ("name", "input", "tools", "output", "value", "limit"):
            assert role[field] in text, (role["id"], field)
    origin = json.loads((ROOT / "assets/interaction-origin.json").read_text(encoding="utf-8"))
    assert hashlib.sha256((ROOT / "assets/conversation-map.fragment.html").read_bytes()).hexdigest() == origin["sha256"]
    for filename in ("web/app.js", "web/data.js"):
        subprocess.run(["node", "--check", str(ROOT / filename)], check=True, capture_output=True)
    parser = Links()
    parser.feed((ROOT / "web/index.html").read_text(encoding="utf-8"))
    checked = []
    for value in parser.links:
        parts = urlsplit(value)
        if parts.scheme or not parts.path:
            continue
        target = (ROOT / "web" / unquote(parts.path)).resolve()
        assert target.is_relative_to(ROOT) and target.is_file(), value
        checked.append(value)
    print(json.dumps({"data": "PASS", "all_role_fields_in_full_figure": "PASS", "conversion_coverage": "8 -> 5", "source_links": len(hrefs), "local_links": len(checked), "image_hashes": "PASS", "javascript_syntax": "PASS", "browser_execution": "see verification.md"}))


if __name__ == "__main__":
    main()

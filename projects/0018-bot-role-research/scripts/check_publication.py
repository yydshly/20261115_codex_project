"""Check the self-contained public export and, optionally, its live HTTPS files.

Standard library only. CI never redraws the selected guide or installs fonts.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
import hashlib
import json
from pathlib import Path
import struct
from urllib.parse import unquote, urljoin, urlsplit
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_URL = "https://yydshly.github.io/20261115_codex_project/demos/0018-bot-role-research/"
GUIDE = "assets/bot-role-overview.png"
CRITICAL = ("index.html", "styles.css", "app.js", "data.js", "graph.html", GUIDE,
            "assets/bot-role-overview.svg", "assets/role-conversion.png", "assets/role-conversion.svg",
            "assets/overview-preview.jpg", "assets/figure-manifest.json", "assets/SOURCES.md")


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.ids = set()
        self.guide_images = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            if a["id"] in self.ids:
                raise ValueError("Duplicate HTML id: " + a["id"])
            self.ids.add(a["id"])
        if tag in ("a", "img", "script", "iframe", "link"):
            ref = a.get("src") or a.get("href")
            if ref:
                self.refs.append(ref)
        if tag == "img" and "guide-image" in a.get("class", "").split():
            self.guide_images.append(a.get("src"))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify_site(site):
    site = site.resolve()
    page = Page()
    content = (site / "index.html").read_text(encoding="utf-8")
    page.feed(content)
    require(page.guide_images == ["./" + GUIDE], "Hero must use the selected complete guide")
    require("understanding" in page.ids and "data-understanding" in content, "Our understanding is missing")
    require("未实测" in content and "未部署" in content, "Evidence boundaries are missing")
    paths = []
    for ref in page.refs:
        parts = urlsplit(ref)
        if parts.scheme:
            require(parts.scheme == "https", "External links must use HTTPS")
            continue
        if not parts.path:
            require(not parts.fragment or parts.fragment in page.ids, "Missing anchor: " + ref)
            continue
        if ref == "../../index.html":
            continue
        require(not parts.path.startswith("/"), "Domain-root paths break repository hosting")
        target = (site / unquote(parts.path)).resolve()
        require(target.is_relative_to(site) and target.is_file(), "Missing or escaping export resource: " + ref)
        paths.append(parts.path)
    require("../../index.html" in page.refs, "Public library navigation is missing")
    raw_data = (site / "data.js").read_text(encoding="utf-8").strip()
    prefix = "window.botResearch = "
    require(raw_data.startswith(prefix) and raw_data.endswith(";"), "Invalid exported data")
    data = json.loads(raw_data[len(prefix):-1])
    require(len(data.get("understanding", [])) == 6, "Understanding must include all six conclusions")
    require(len(data["trading_roles"]) == 8 and len(data["research_roles"]) == 5, "Role coverage differs")
    original = {r["id"] for r in data["trading_roles"]}
    research = {r["id"] for r in data["research_roles"]}
    require({r for c in data["conversions"] for r in c["from"]} == original, "Missing original-role conversion")
    require({c["to"] for c in data["conversions"]} == research, "Missing research-role conversion")
    guide = (site / GUIDE).read_bytes()
    require(guide[:8] == b"\x89PNG\r\n\x1a\n" and struct.unpack(">II", guide[16:24]) == (3200, 7230), "Wrong guide dimensions")
    require(hashlib.sha256(guide).digest() == hashlib.sha256((ROOT / GUIDE).read_bytes()).digest(), "The chosen guide was changed during export")
    manifest = json.loads((site / "assets/figure-manifest.json").read_text(encoding="utf-8"))
    for item in manifest["files"]:
        require(hashlib.sha256((site / "assets" / item["path"]).read_bytes()).hexdigest() == item["sha256"], "Image manifest mismatch: " + item["path"])
    tree = ET.parse(site / "assets/bot-role-overview.svg")
    links = {node.attrib["href"] for node in tree.iter() if "href" in node.attrib}
    require(links == {s["url"] for s in data["sources"]}, "Source links differ")
    total = sum(p.stat().st_size for p in site.rglob("*") if p.is_file())
    require(total < 8 * 1024 * 1024, "Export exceeds 8 MiB budget")
    return {"export": "PASS", "resource_links": len(paths), "guide": GUIDE,
            "guide_sha256": hashlib.sha256(guide).hexdigest(), "guide_size": [3200, 7230],
            "sources": len(links), "roles": [8, 5], "understanding": 6, "bytes": total}


def live_check(site, base):
    require(base.rstrip("/") + "/" == PUBLIC_URL, "Live checks are limited to the authorized project URL")
    checks = []
    for path in CRITICAL:
        expected = (site / path).read_bytes()
        digest = hashlib.sha256(expected).hexdigest()
        url = urljoin(base, path) + "?verify=" + digest[:12]
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "BotRoleResearch/1.0", "Cache-Control": "no-cache"})
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = response.read(8 * 1024 * 1024 + 1)
                status, mime = response.status, response.headers.get_content_type()
            is_text = path.endswith((".html", ".css", ".js", ".md", ".svg", ".json"))
            same = (payload.replace(b"\r\n", b"\n") == expected.replace(b"\r\n", b"\n")) if is_text else payload == expected
            checks.append({"path": path, "status": status, "type": mime, "bytes": len(payload), "matches_export": same, "sha256": hashlib.sha256(payload).hexdigest()})
        except Exception as error:
            checks.append({"path": path, "error": str(error), "matches_export": False})
    home = "https://yydshly.github.io/20261115_codex_project/"
    try:
        with urllib.request.urlopen(home + "?verify=bot-role-research", timeout=30) as response:
            text = response.read().decode("utf-8")
            checks.append({"path": "library-home", "status": response.status,
                "matches_export": all(p in text for p in ("./demos/0018-bot-role-research/index.html", "./demos/0018-bot-role-research/" + GUIDE, "./demos/0001-animation-skills-atlas/summary.html", "./demos/0009-ai-source-field-guide/index.html"))})
    except Exception as error:
        checks.append({"path": "library-home", "error": str(error), "matches_export": False})
    record = {"checked_at": datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds"),
              "base_url": base, "all_passed": all(c["matches_export"] for c in checks), "checks": checks,
              "scope": "Public page/resources and chosen guide only; original product claims and research bots are not validated."}
    (ROOT / "publication-http-checks.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, default=ROOT / "dist")
    parser.add_argument("--url")
    args = parser.parse_args()
    result = verify_site(args.site)
    print(json.dumps(result))
    if args.url:
        record = live_check(args.site, args.url)
        print(json.dumps({"live": "PASS" if record["all_passed"] else "INCOMPLETE", "checks": len(record["checks"]), "failures": [c["path"] for c in record["checks"] if not c["matches_export"]]}))
        return 0 if record["all_passed"] else 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

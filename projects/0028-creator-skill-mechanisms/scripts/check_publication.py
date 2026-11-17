"""Check concrete public artifacts and optionally compare their live HTTPS bytes."""
from __future__ import annotations
import argparse
from datetime import datetime, timedelta, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import struct
from urllib.parse import unquote, urljoin, urlsplit
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_URL = "https://yydshly.github.io/20261115_codex_project/demos/0028-creator-skill-mechanisms/"
GUIDE = "assets/skill-constraints-overview.png"
CRITICAL = ("index.html", "styles.css", "app.js", "research.json", GUIDE, "assets/guide-manifest.json", "README.md", "DISCUSSION.md", "SOURCE-NOTES.md")


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.ids, self.flow_ids, self.guides = [], set(), [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            if a["id"] in self.ids:
                raise ValueError("Duplicate ID: " + a["id"])
            self.ids.add(a["id"])
        if tag == "article" and "flow" in a.get("class", "").split():
            self.flow_ids.append(a.get("id"))
        if tag == "img" and "guide-image" in a.get("class", "").split():
            self.guides.append(a.get("src"))
        if tag in ("a", "img", "script", "link"):
            ref = a.get("src") or a.get("href")
            if ref:
                self.refs.append(ref)


def check(site):
    page = Page()
    text = (site / "index.html").read_text(encoding="utf-8")
    page.feed(text)
    data = json.loads((site / "research.json").read_text(encoding="utf-8"))
    assert len(data["flows"]) == 5 and len(data["understanding"]) == 6
    assert page.flow_ids == ["flow-" + f["id"] for f in data["flows"]]
    assert page.guides == ["./" + GUIDE]
    assert "@@" not in text and "待补充" not in text
    for phrase in ("未做五套 Skill", "检查通过", "输入是什么", "内部怎样约束", "执行方式", "仍需自己验证"):
        assert phrase in text, "Missing research content: " + phrase
    assert len(data["upstreams"]) == 5 and all(re.fullmatch("[0-9a-f]{40}", u["commit"]) for u in data["upstreams"])
    for f in data["flows"]:
        assert all(f[k] for k in ("input", "process", "output", "mechanisms", "reuse", "boundary", "sources"))
        for m in f["mechanisms"]:
            assert all(m[k] for k in ("name", "rule", "purpose", "enforcement"))
    for ref in page.refs:
        parts = urlsplit(ref)
        if parts.scheme:
            assert parts.scheme == "https", "Only HTTPS external links: " + ref
            continue
        if not parts.path:
            assert not parts.fragment or unquote(parts.fragment) in page.ids, "Missing anchor: " + ref
            continue
        if ref == "../../index.html":
            continue
        assert not parts.path.startswith("/"), "Repository subpath required: " + ref
        path = (site / unquote(parts.path)).resolve()
        assert path.is_relative_to(site.resolve()) and path.is_file(), "Missing/escaping resource: " + ref
    image = (site / GUIDE).read_bytes()
    assert image[:8] == b"\x89PNG\r\n\x1a\n"
    manifest = json.loads((site / "assets/guide-manifest.json").read_text(encoding="utf-8"))
    digest = hashlib.sha256(image).hexdigest()
    assert digest == manifest["sha256"]
    assert digest == hashlib.sha256((ROOT / GUIDE).read_bytes()).hexdigest(), "Guide changed during export"
    assert list(struct.unpack(">II", image[16:24])) == manifest["dimensions"]
    size = sum(p.stat().st_size for p in site.rglob("*") if p.is_file())
    assert size < 6 * 1024 * 1024, "Publication budget exceeded"
    files = json.loads((site / "build-manifest.json").read_text(encoding="utf-8"))["files"]
    for item in files:
        assert hashlib.sha256((site / item["path"]).read_bytes()).hexdigest() == item["sha256"], "Export checksum mismatch"
    return {"result": "PASS", "flows": 5, "understanding": 6, "sources": len(data["sources"]), "guide_sha256": digest, "guide_dimensions": manifest["dimensions"], "resource_references": len(page.refs), "bytes": size}


def live_check(site):
    checks = []
    for path in CRITICAL:
        expected = (site / path).read_bytes()
        digest = hashlib.sha256(expected).hexdigest()
        url = urljoin(PUBLIC_URL, path) + "?verify=" + digest[:12]
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "CreatorSkillResearch/1.0", "Cache-Control": "no-cache"})
            with urllib.request.urlopen(req, timeout=30) as response:
                payload = response.read(6 * 1024 * 1024 + 1)
                status = response.status
            same = payload == expected if path.endswith(".png") else payload.replace(b"\r\n", b"\n") == expected.replace(b"\r\n", b"\n")
            checks.append({"path": path, "status": status, "matches_export": same, "sha256": hashlib.sha256(payload).hexdigest()})
        except Exception as error:
            checks.append({"path": path, "matches_export": False, "error": str(error)})
    try:
        with urllib.request.urlopen("https://yydshly.github.io/20261115_codex_project/?verify=creator-skills", timeout=30) as response:
            text = response.read().decode("utf-8")
        checks.append({"path": "library-home", "matches_export": all(x in text for x in ("./demos/0028-creator-skill-mechanisms/index.html", "./demos/0028-creator-skill-mechanisms/" + GUIDE, "./demos/0001-animation-skills-atlas/summary.html", "./demos/0018-bot-role-research/index.html"))})
    except Exception as error:
        checks.append({"path": "library-home", "matches_export": False, "error": str(error)})
    record = {"checked_at": datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds"), "base_url": PUBLIC_URL, "all_passed": all(c["matches_export"] for c in checks), "checks": checks, "scope": "Research website and resources; upstream creative effectiveness is not tested."}
    (ROOT / "publication-http-checks.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, default=ROOT / "dist")
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    print(json.dumps(check(args.site)))
    if args.live:
        record = live_check(args.site)
        print(json.dumps(record))
        if not record["all_passed"]:
            raise SystemExit(1)


if __name__ == "__main__":
    main()

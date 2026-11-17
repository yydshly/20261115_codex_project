"""Verify local runtime resources and record hashes for the 3D rain journey."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json
import re
import argparse

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.images = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.images += tag == "img"
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        for key in ["href", "src"]:
            if attrs.get(key):
                self.links.append(attrs[key])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default="assets/rain-3d-verification.json")
    args = parser.parse_args()
    report_path = (ROOT / args.report).resolve()
    if ROOT.resolve() not in report_path.parents:
        raise ValueError("Verification report must stay inside the project")
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {
        "date": "2026-11-16", "revision": "rain-continuous-3d",
        "browser": "pending", "emotion": "awaiting-user-feedback",
    }
    report["static"] = {}
    for name in ["index.html", "experiments.html", "light.html", "rain.html", "rain-still.html"]:
        path = ROOT / "dist" / name
        page = Page()
        page.feed(path.read_text(encoding="utf-8"))
        assert len(page.ids) == len(set(page.ids)), (name, "duplicate IDs")
        for link in page.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            target = path.parent / unquote(url.path) if url.path else path
            assert target.is_file(), (name, link)
            if url.fragment and target.suffix == ".html":
                other = Page()
                other.feed(target.read_text(encoding="utf-8"))
                assert url.fragment in other.ids, (name, link)
        report["static"][name] = {"local_resources": "pass", "unique_ids": len(page.ids), "html_images": page.images}
    imports = []
    for name in ["rain-journey.js", "rain-route.mjs", "rain-world.mjs", "rain-traveler.mjs", "rain-art.mjs", "rain-ink.mjs",
                 "vendor/three/Reflector.js", "vendor/three/three.module.min.js"]:
        text = (ROOT / "dist" / name).read_text(encoding="utf-8")
        text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        for module in re.findall(r'''(?:from\s*|import\s*)["']([^"']+)["']''', text):
            target = (ROOT / "dist/vendor/three/three.module.min.js" if module == "three"
                      else ROOT / "dist" / Path(name).parent / module)
            assert target.is_file(), (name, module)
            imports.append({"from": name, "module": module})
    report["module_imports"] = imports
    provenance = json.loads((ROOT / "web/vendor/three/provenance.json").read_text(encoding="utf-8"))
    for name, data in provenance["files"].items():
        for folder in ["web/vendor/three", "dist/vendor/three"]:
            assert hashlib.sha256((ROOT / folder / name).read_bytes()).hexdigest() == data["sha256"]
    report["vendor_integrity"] = "pass, pinned npm integrity and file hashes; MIT license exported"
    new_hashes = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
                               for name in ["web/rain-journey.html", "web/rain-journey.css", "web/rain-journey.js",
                                            "web/rain-route.mjs", "web/rain-world.mjs", "web/rain-traveler.mjs", "web/rain-art.mjs", "web/rain-ink.mjs"]}
    if report.get("source_hashes") != new_hashes:
        report["browser"] = "pending"
        for key in ["browser_checks", "result", "screenshots"]:
            report.pop(key, None)
    report["source_hashes"] = new_hashes
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print("PASS: 5 HTML pages, local ES modules, Three.js integrity/license, source hashes")


if __name__ == "__main__":
    main()

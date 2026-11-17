"""Validate the 100-site source catalogue and every local preview (stdlib only)."""
import hashlib
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit
from analysis_data import load_analysis

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = dict(zip(["awards", "motion", "three-d", "cinema", "ui", "web", "frontend", "type-color", "collect"], [12, 14, 9, 7, 16, 10, 16, 10, 6]))

def require(condition, message):
    if not condition:
        raise ValueError(message)

def https(value):
    parsed = urlsplit(value)
    return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username

def main():
    data = json.loads((ROOT / "web/data/catalog.json").read_text(encoding="utf-8"))
    require(data["schema_version"] == 1, "Unsupported catalogue version")
    sites = data["sites"]
    require([s["id"] for s in sites] == list(range(1, 101)), "Original IDs must be exactly 1–100")
    require(len({s["url"] for s in sites}) == 100, "Duplicate original URLs")
    require(Counter(s["category"] for s in sites) == EXPECTED, "Category distribution changed")
    require({c["id"]: c["count"] for c in data["categories"]} == EXPECTED, "Category labels/counts mismatch")
    require(https(data["source"]["url"]), "Missing source URL")
    for s in sites:
        for field in ("name", "purpose", "look_for", "access"):
            require(isinstance(s[field], str) and s[field].strip(), f"{s['id']}: missing {field}")
        require(https(s["url"]) and https(s["example"]["url"]), f"{s['id']}: invalid URL")
        require(len(s["tags"]) >= 2, f"{s['id']}: missing searchable tags")
    previews = json.loads((ROOT / "web/data/previews.json").read_text(encoding="utf-8"))
    require(set(map(int, previews["previews"])) == set(range(1, 101)), "Need a preview status for every site")
    available = 0
    kinds = Counter()
    for ident, p in previews["previews"].items():
        if p["status"] != "ok":
            require(bool(p.get("error")), f"{ident}: missing unavailable reason")
            require(not p.get("src"), f"{ident}: unavailable record must not display stale image")
            continue
        require(p.get("src"), f"{ident}: missing local image")
        image = (ROOT / "web" / p["src"]).resolve()
        require(image.is_relative_to((ROOT / "assets").resolve()), f"{ident}: image outside project assets")
        require(image.is_file() and 100 < image.stat().st_size <= 2_000_000, f"{ident}: invalid image size")
        require(hashlib.sha256(image.read_bytes()).hexdigest() == p["sha256"], f"{ident}: image hash mismatch")
        for field in ("image_source", "page_url", "example_url"):
            require(https(p[field]) or (field == "image_source" and urlsplit(p[field]).scheme == "http"), f"{ident}: invalid preview {field}")
        require(p.get("caption") and p.get("license_note"), f"{ident}: missing attribution")
        available += 1
        kinds[p["kind"]] += 1
    require(previews["summary"]["available"] == available, "Preview coverage count mismatch")
    interpretations = load_analysis()
    print(json.dumps({"analyses": len(interpretations["sites"]), "sites": len(sites), "categories": EXPECTED, "local_previews": available, "preview_types": dict(kinds), "hashes": "all passed"}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

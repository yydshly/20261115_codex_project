"""Load the three maintained analysis ranges and validate their source records."""
import json
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
FILES = ["analysis-001-035.json", "analysis-036-068.json", "analysis-069-100.json"]
FIELDS = ("subject", "effect", "mechanism", "value", "practice", "boundary", "evidence_level")

def load_analysis():
    sites = {}
    for name in FILES:
        data = json.loads((ROOT / "web/data" / name).read_text(encoding="utf-8-sig"))
        if data.get("schema_version") != 1:
            raise ValueError(f"Unsupported analysis version: {name}")
        for key, entry in data["sites"].items():
            if key in sites:
                raise ValueError(f"Duplicate analysis: {key}")
            for field in FIELDS:
                if not isinstance(entry.get(field), str) or not entry[field].strip():
                    raise ValueError(f"{key}: missing analysis {field}")
            if not isinstance(entry.get("sources"), list) or not entry["sources"]:
                raise ValueError(f"{key}: missing analysis sources")
            for source in entry["sources"]:
                url = urlsplit(source.get("url", ""))
                if url.scheme != "https" or not url.hostname or url.username:
                    raise ValueError(f"{key}: invalid analysis source")
                if not source.get("title") or not source.get("note"):
                    raise ValueError(f"{key}: source title and scope needed")
            sites[key] = entry
    if set(sites) != set(map(str, range(1, 101))):
        raise ValueError("Need an analysis record for every original site 1–100")
    for field in ("effect", "mechanism", "value"):
        if len({s[field] for s in sites.values()}) != 100:
            raise ValueError(f"Duplicate generic analysis: {field}")
    guide = json.loads((ROOT / "web/data/reading-guide.json").read_text(encoding="utf-8"))
    if len(guide["categories"]) != 10:
        raise ValueError("Need all-resources guide and nine category guides")
    for application in guide["applications"]:
        if any(str(ident) not in sites for ident in application["sites"]):
            raise ValueError("Application links to an unknown site")
    return {"sites": sites, "guide": guide}

if __name__ == "__main__":
    result = load_analysis()
    print(f"Analysis: {len(result['sites'])} individual records, {len(result['guide']['categories'])} reading guides")

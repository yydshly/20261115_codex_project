"""Apply reviewed preview overrides, checking the exact referenced local bytes."""
import hashlib
import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "web/data/previews.json"

def main():
    result = json.loads(OUTPUT.read_text(encoding="utf-8"))
    for name in ("preview-refinements.json", "example-overrides.json", "final-overrides.json"):
        path = ROOT / "assets" / name
        if not path.exists():
            continue
        changes = json.loads(path.read_text(encoding="utf-8"))
        changes = changes.get("previews", changes)
        for ident, update in changes.items():
            if not isinstance(update, dict) or update.get("status") != "ok":
                continue
            image = (ROOT / "web" / update["src"]).resolve()
            if not image.is_relative_to((ROOT / "assets").resolve()):
                raise ValueError(f"Unsafe image path: {ident}")
            if hashlib.sha256(image.read_bytes()).hexdigest() != update["sha256"]:
                raise ValueError(f"Reviewed override image changed: {ident}")
            previous = result["previews"][str(ident)]
            old_page = previous.get("page_url")
            if update.get("page_url") and update["page_url"] != old_page:
                previous.setdefault("original_site_http_status", previous.get("http_status"))
                previous["http_status"] = update.get("http_status")
            if previous.get("error"):
                previous.setdefault("acquisition_notes", previous["error"])
            previous.update(update)
            previous["error"] = None
            previous["visual_qa"] = "2026-11-16：已查看最终联系表或定向替换图片。"
    values = list(result["previews"].values())
    result["summary"] = {"total": len(values), "available": sum(p["status"] == "ok" for p in values),
                         "kinds": dict(Counter(p["kind"] for p in values if p["status"] == "ok"))}
    result["generated_at"] = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds")
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    for path in (OUTPUT, ROOT / "assets/preview-sources.json"):
        path.write_text(text, encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=True))

if __name__ == "__main__":
    main()

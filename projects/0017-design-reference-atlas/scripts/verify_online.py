"""Compare every published reader resource with the checked local export."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import hashlib
from html import escape
import importlib.util
import json
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = ROOT.parents[1]
ORIGIN = "https://yydshly.github.io/20261115_codex_project/"
BASE = ORIGIN + "demos/0017-design-reference-atlas/"
TEXT = {".html", ".css", ".js", ".json"}


def fetch(url):
    with urlopen(Request(url, headers={"User-Agent": "DesignAtlas-Publication-Verification/1.0"}), timeout=30) as response:
        assert response.status == 200, (url, response.status)
        return response.read(21 * 1024 * 1024), response.headers.get_content_type()


def main():
    site = ROOT / "dist"
    entry = next(x for x in json.loads((REPOSITORY / "projects.json").read_text(encoding="utf-8"))["projects"] if x["id"] == "0017")
    # Fail immediately if the deployment has not reached the entry page.
    entry_bytes, _ = fetch(BASE)
    assert "把参考，变成创作决定。" in entry_bytes.decode("utf-8")

    def check(path):
        relative = path.relative_to(site).as_posix()
        actual, content_type = fetch(BASE + quote(relative, safe="/"))
        expected = path.read_bytes()
        comparison = "exact bytes"
        if path.suffix in TEXT:
            actual = actual.replace(b"\r\n", b"\n")
            expected = expected.replace(b"\r\n", b"\n")
            comparison = "UTF-8 text, LF normalized"
        assert actual == expected, "Published content differs: " + relative
        return {"path": relative, "status": 200, "content_type": content_type,
                "comparison": comparison, "sha256": hashlib.sha256(actual).hexdigest()}

    with ThreadPoolExecutor(max_workers=6) as pool:
        records = list(pool.map(check, sorted(p for p in site.rglob("*") if p.is_file())))
    navigation_bytes, _ = fetch(ORIGIN)
    navigation = navigation_bytes.decode("utf-8")
    assert escape(entry["summary"]) in navigation
    guide = "demos/0017-design-reference-atlas/assets/effects-principles-value-overview-v1.png"
    assert 'src="./' + guide + '"' in navigation and 'href="./' + guide + '"' in navigation
    for highlight in entry["highlights"]:
        assert escape(highlight) in navigation

    spec = importlib.util.spec_from_file_location("research_site_builder", REPOSITORY / "scripts/build_site.py")
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    previous = {builder.SLUG: "summary.html", **builder.STATIC_PROJECTS}
    previous.pop("0017-design-reference-atlas")
    previous_records = []
    for slug, page in previous.items():
        url = ORIGIN + "demos/" + slug + "/" + page
        fetch(url)
        previous_records.append({"url": url, "status": 200})
    result = {"verified_at": datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds"),
              "url": BASE, "resources": records, "resource_count": len(records),
              "guide_sha256": next(r["sha256"] for r in records if r["path"].endswith("overview-v1.png")),
              "navigation": {"url": ORIGIN, "status": 200, "summary_and_guide": "matched registry"},
              "previous_public_entries": previous_records}
    (ROOT / "online-verification.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"url": BASE, "resources": len(records), "previous_entries": len(previous_records),
                      "guide_sha256": result["guide_sha256"], "verified_at": result["verified_at"]}, ensure_ascii=True))


if __name__ == "__main__":
    main()

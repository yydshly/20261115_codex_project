"""Export the local research page and its explicitly selected assets (stdlib)."""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
ASSETS = (
    "bot-role-overview.png", "bot-role-overview.svg", "role-conversion.png",
    "role-conversion.svg", "overview-preview.jpg", "SOURCES.md", "figure-manifest.json",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-preview", action="store_true", help="Copy only this project and refresh the local library homepage")
    parser.add_argument("--publication", action="store_true", help="Build the explicitly authorized public Pages artifact")
    args = parser.parse_args()
    data = json.loads((ROOT / "research.json").read_text(encoding="utf-8"))
    (ROOT / "web/data.js").write_text(
        "window.botResearch = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8", newline="\n",
    )
    dest = ROOT / "dist"
    (dest / "assets").mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "styles.css", "app.js", "data.js", "graph.html"):
        source = ROOT / "web" / name
        if name == "index.html":
            page = source.read_text(encoding="utf-8")
            if args.publication or args.site_preview:
                page = page.replace('href="../README.md" data-library-home', 'href="../../index.html" data-library-home')
            page = page.replace("../assets/", "./assets/")
            for document in ("README.md", "DISCUSSION.md", "verification.md", "publication.md"):
                page = page.replace("../" + document, "./" + document)
            (dest / name).write_text(page, encoding="utf-8", newline="\n")
        else:
            shutil.copy2(source, dest / name)
    for name in ASSETS:
        shutil.copy2(ROOT / "assets" / name, dest / "assets" / name)
    for name in ("README.md", "DISCUSSION.md", "verification.md", "publication.md"):
        shutil.copy2(ROOT / name, dest / name)
    for name in ("publication-http-checks.json",):
        if (ROOT / name).is_file():
            shutil.copy2(ROOT / name, dest / name)
    record = {
        "project": "0018-bot-role-research", "mode": "publication-candidate" if args.publication else "local-preview", "guide": "assets/bot-role-overview.png",
        "files": [{"path": p.relative_to(dest).as_posix(), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(dest.rglob("*")) if p.is_file() and p.name != "build-manifest.json"],
    }
    (dest / "build-manifest.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.site_preview:
        repository = ROOT.parents[1]
        spec = importlib.util.spec_from_file_location("research_site", repository / "scripts/build_site.py")
        site = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(site)
        output = repository / "_site"
        shutil.copytree(dest, output / "demos/0018-bot-role-research", dirs_exist_ok=True)
        local_projects = getattr(site, "LOCAL_RESEARCH_PROJECTS", {})
        entries = {site.SLUG: "summary.html", **site.STATIC_PROJECTS, **local_projects}
        available = {slug for slug, entry in entries.items() if (output / "demos" / slug / entry).is_file()}
        (output / "index.html").write_text(site.navigation(local_projects, available), encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(dest / "index.html"), "files": len(record["files"]), "mode": record["mode"]}))


if __name__ == "__main__":
    main()

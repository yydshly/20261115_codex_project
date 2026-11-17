"""Export the offline reader or the Pages static site using only the stdlib."""
import argparse
import base64
import copy
import json
import mimetypes
import shutil
import subprocess
import sys
from pathlib import Path
from analysis_data import load_analysis

ROOT = Path(__file__).resolve().parents[1]
GUIDE = "effects-principles-value-overview-v1"
PUBLIC_URL = "https://yydshly.github.io/20261115_codex_project/demos/0017-design-reference-atlas/"


def build_publication():
    """Copy only public reader files, referenced previews and the selected guide."""
    dest = ROOT / "dist"
    dest.mkdir(exist_ok=True)
    (dest / "data").mkdir(exist_ok=True)
    (dest / "assets/previews").mkdir(parents=True, exist_ok=True)
    for name in ("styles.css", "app.js", "icon.svg"):
        shutil.copy2(ROOT / "web" / name, dest / name)
    for source in (ROOT / "web/data").glob("*.json"):
        if source.name == "previews.json":
            continue
        shutil.copy2(source, dest / "data" / source.name)
    previews = json.loads((ROOT / "web/data/previews.json").read_text(encoding="utf-8"))
    for preview in previews["previews"].values():
        if preview.get("status") != "ok":
            continue
        image = (ROOT / "web" / preview["src"]).resolve()
        relative = image.relative_to((ROOT / "assets").resolve())
        shutil.copy2(image, dest / "assets" / relative)
        preview["src"] = "assets/" + relative.as_posix()
    (dest / "data/previews.json").write_text(json.dumps(previews, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for name in (GUIDE + ".png", GUIDE + ".svg", "overview-sources.json"):
        shutil.copy2(ROOT / "assets" / name, dest / "assets" / name)
    markup = (ROOT / "web/index.html").read_text(encoding="utf-8").replace("../assets/", "assets/")
    metadata = (f'<link rel="canonical" href="{PUBLIC_URL}">\n'
                f'<meta property="og:title" content="观式 · 效果、原理与我们的价值">\n'
                f'<meta property="og:image" content="{PUBLIC_URL}assets/{GUIDE}.png">\n')
    markup = markup.replace("  <title>", "  " + metadata + "  <title>", 1)
    (dest / "index.html").write_text(markup, encoding="utf-8")
    subprocess.run([sys.executable, str(ROOT / "scripts/check_publication.py")], check=True)
    print("Pages static reader: " + str(dest))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--publication", action="store_true", help="Export the public static reader with relative assets")
    args = parser.parse_args()
    subprocess.run([sys.executable, str(ROOT / "scripts/check.py")], check=True)
    if args.publication:
        build_publication()
        return
    catalog = json.loads((ROOT / "web/data/catalog.json").read_text(encoding="utf-8"))
    manifest = json.loads((ROOT / "web/data/previews.json").read_text(encoding="utf-8"))
    previews = copy.deepcopy(manifest)
    for p in previews["previews"].values():
        if p.get("status") == "ok" and p.get("src"):
            image = ROOT / "web" / p["src"]
            mime = mimetypes.guess_type(image)[0] or "image/jpeg"
            p["src"] = f"data:{mime};base64," + base64.b64encode(image.read_bytes()).decode("ascii")
    payload = json.dumps({"catalog": catalog, "previews": previews, "analysis": load_analysis()}, ensure_ascii=False).replace("<", "\\u003c")
    css = (ROOT / "web/styles.css").read_text(encoding="utf-8")
    js = (ROOT / "web/app.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
    markup = (ROOT / "web/index.html").read_text(encoding="utf-8")
    icon = "data:image/svg+xml;base64," + base64.b64encode((ROOT / "web/icon.svg").read_bytes()).decode("ascii")
    overview_path = ROOT / "assets/effects-principles-value-overview-v1.png"
    overview_uri = "data:image/png;base64," + base64.b64encode(overview_path.read_bytes()).decode("ascii")
    markup = markup.replace("../assets/effects-principles-value-overview-v1.png", overview_uri)
    markup = markup.replace('href="icon.svg"', f'href="{icon}"')
    markup = markup.replace('<link rel="stylesheet" href="styles.css">', f"<style>{css}</style>")
    markup = markup.replace('<script src="app.js" defer></script>', f"<script>window.ATLAS_PAYLOAD={payload};</script>")
    markup = markup.replace("</body>", f"<script>{js}</script></body>")
    dest = ROOT / "dist"
    dest.mkdir(exist_ok=True)
    (dest / "index.html").write_text(markup, encoding="utf-8")
    print(f"Offline reader: {dest / 'index.html'} ({len(markup.encode('utf-8')):,} bytes)")

if __name__ == "__main__":
    main()

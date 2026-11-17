"""Export this local, buildless reading page with only the standard library."""

from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "dist"


def main():
    DEST.mkdir(exist_ok=True)
    (DEST / "assets").mkdir(exist_ok=True)
    page = (ROOT / "web/index.html").read_text(encoding="utf-8")
    (DEST / "index.html").write_text(
        page.replace("../assets/", "./assets/"), encoding="utf-8", newline="\n"
    )
    for name in ("styles.css", "app.js"):
        shutil.copy2(ROOT / "web" / name, DEST / name)
    for name in (
        "overview-live.jpg", "shipwreck-live.jpg", "purple-grotto-live.jpg",
        "prompt-original.txt", "prompt-zh.txt", "SOURCES.md", "UPSTREAM-LICENSE.txt",
        "understanding-summary.png", "understanding-summary.svg", "our-sea-brief.txt",
    ):
        shutil.copy2(ROOT / "assets" / name, DEST / "assets" / name)
    print(f"Exported {DEST / 'index.html'}")


if __name__ == "__main__":
    main()

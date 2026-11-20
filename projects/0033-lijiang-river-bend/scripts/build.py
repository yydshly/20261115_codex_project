"""Export the study, generated guide and playable river scene for GitHub Pages."""

from pathlib import Path
from shutil import copy2

PROJECT = Path(__file__).resolve().parents[1]
THREE = PROJECT.parent / "0008-pelican-layout-study" / "web/vendor/three"
GUIDE_AND_SCREENSHOTS = (
    "rendering-guide.png",
    "fast-flight-horizon.png",
    "daylight-shallows.png",
    "rockbank-ledges.png",
    "boat-follow.png",
)
THREE_FILES = (
    "three.module.min.js",
    "three.core.min.js",
    "Reflector.js",
    "LICENSE",
    "provenance.json",
)


def build(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "style.css"):
        copy2(PROJECT / "publication" / name, output / name)

    assets = output / "assets"
    assets.mkdir(exist_ok=True)
    for name in GUIDE_AND_SCREENSHOTS:
        copy2(PROJECT / "assets" / name, assets / name)

    play = output / "play"
    vendor = play / "vendor"
    vendor.mkdir(parents=True, exist_ok=True)
    web = PROJECT / "web"
    for source in sorted(web.glob("*.js")):
        copy2(source, play / source.name)
    for name in ("index.html", "style.css"):
        copy2(web / name, play / name)
    for name in THREE_FILES:
        copy2(THREE / name, vendor / name)


if __name__ == "__main__":
    build(PROJECT / "dist")

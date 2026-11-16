"""Export this buildless website; Python standard library only."""

from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parents[1]
FILES = ("index.html", "styles.css", "data.js", "app.js", "map.html", "map.js")
ASSET_FILES = ("source-map.svg", "source-map.png", "relation-map.svg", "relation-map.png")


def main():
    destination = ROOT / "dist"
    if not destination.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError("Export destination must remain inside this project")
    source = ROOT / "web"
    for parent,names in ((source,FILES),(ROOT/"assets",ASSET_FILES)):
        for name in names:
            if not (parent/name).is_file():
                raise FileNotFoundError(parent/name)
    destination.mkdir(exist_ok=True)
    for name in FILES:
        target = destination / name
        if not target.resolve().is_relative_to(destination.resolve()):
            raise ValueError("Export file must remain inside the destination")
        if name.endswith(".html"):
            content=(source/name).read_text(encoding="utf-8").replace('"../assets/','"assets/')
            target.write_text(content,encoding="utf-8",newline="\n")
        else:
            shutil.copyfile(source/name,target)
    assets=destination/"assets"
    if not assets.resolve().is_relative_to(destination.resolve()):
        raise ValueError("Asset destination must remain inside this project")
    assets.mkdir(exist_ok=True)
    for name in ASSET_FILES:
        target=assets/name
        if not target.resolve().is_relative_to(assets.resolve()):
            raise ValueError("Export asset must remain inside the asset directory")
        shutil.copyfile(ROOT/"assets"/name,target)
    print(f"Exported {len(FILES)+len(ASSET_FILES)} files to {destination}")


if __name__ == "__main__":
    main()

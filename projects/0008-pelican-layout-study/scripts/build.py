"""Export this buildless study as a self-contained static directory."""

from pathlib import Path
import json
import re
import shutil
import html as html_module
from build_research import build_research, export_research

PROJECT = Path(__file__).resolve().parents[1]


def main():
    scenes = json.loads((PROJECT / "scenes.json").read_text(encoding="utf-8"))
    required = {"id", "name", "time", "phase", "image", "theme", "observed", "art", "atmosphere", "character", "before", "after", "design"}
    if [scene["id"] for scene in scenes] != list(range(1, 22)):
        raise ValueError("Expected the original 20 scenes and one ending entry")
    for scene in scenes:
        if not required.issubset(scene) or any(not str(scene[key]).strip() for key in required):
            raise ValueError(f"Incomplete scene: {scene.get('id')}")
        image = PROJECT / "assets" / "reference" / scene["image"]
        if not image.is_file() or image.parent != PROJECT / "assets" / "reference":
            raise ValueError(f"Missing or invalid source image: {scene['image']}")
    (PROJECT / "web" / "scenes.js").write_text(
        "window.ORIGINAL_SCENES = " + json.dumps(scenes, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8", newline="\n")
    notes = ["# 原视频逐场景分析", "", "来源：https://x.com/nft_chen/status/2121616583110115341", "",
             "名称以原片铭牌与总览为依据；时间为抽帧点，不是精确分幕边界。主题、意境、氛围、承接与规划是本次基于画面证据的解读。", ""]
    labels = [("theme", "主题解读"), ("observed", "画面事实"), ("art", "艺术意境解读"),
              ("atmosphere", "氛围解读"), ("character", "角色融入"), ("before", "承接前幕"),
              ("after", "带向后幕"), ("design", "设计与规划思路")]
    for scene in scenes:
        stamp = f"{scene['time'] // 60:02d}:{scene['time'] % 60:02d}"
        notes += [f"## {scene['id']:02d} · {scene['name']}", "", f"抽帧：{stamp}；阅读分组：{scene['phase']}。", "",
                  f"![{scene['name']}原片画面](assets/reference/{scene['image']})", ""]
        for key, label in labels:
            notes += [f"**{label}**：{scene[key]}", ""]
    (PROJECT / "scene-notes.md").write_text("\n".join(notes), encoding="utf-8", newline="\n")
    studies = json.loads((PROJECT / "art-studies.json").read_text(encoding="utf-8"))
    template = (PROJECT / "web" / "art-template.html").read_text(encoding="utf-8")
    for key, work in studies["works"].items():
        if key not in {"light", "rain"} or [c["id"] for c in work["chapters"]] != [1, 2, 3]:
            raise ValueError("Expected three chapters in each art study")
        for field in ["glyph", "invitation", "enterLabel", "runtime"]:
            if not str(work.get(field, "")).strip():
                raise ValueError(f"Missing journey field: {key}/{field}")
        for chapter in work["chapters"]:
            if any(not str(chapter.get(field, "")).strip() for field in ["title", "subtitle", "image", "feeling", "art", "connection", "transition", "artLabel", "poem", "poemPrefix", "discovery", "navLabel"]):
                raise ValueError(f"Incomplete art chapter: {key}/{chapter['id']}")
            image = (PROJECT / "web" / chapter["image"]).resolve()
            if image.parent != (PROJECT / "assets" / "art-studies").resolve() or not image.is_file():
                raise ValueError(f"Invalid generated scene asset: {image}")
            if not isinstance(chapter["duration"], (int, float)) or chapter["duration"] <= 0:
                raise ValueError("Art chapter duration must be positive")
            if len(chapter["focus"]) != 2 or any(not 0 <= coordinate <= 1 for coordinate in chapter["focus"]):
                raise ValueError("Art chapter focus must stay within the painting")
            for camera_field in ["camera", "mobileCamera"]:
                camera = chapter[camera_field]
                if len(camera) != 2 or any(len(frame) != 3 or frame[0] < 1 or any(not 0 <= v <= 1 for v in frame[1:]) for frame in camera):
                    raise ValueError(f"Invalid art camera: {key}/{chapter['id']}/{camera_field}")
        other = "rain" if key == "light" else "light"
        values = {**work, "work": key, "themeColor": "#171815" if key == "light" else "#eee9dd",
                  "lightCurrent": 'aria-current="page"' if key == "light" else "",
                  "rainCurrent": 'aria-current="page"' if key == "rain" else "",
                  "otherHref": f"{other}.html", "otherTitle": studies["works"][other]["title"]}
        rendered = template
        for field, value in values.items():
            replacement = str(value) if field in {"lightCurrent", "rainCurrent"} else html_module.escape(str(value), quote=True)
            rendered = rendered.replace("{{" + field + "}}", replacement)
        if "{{" in rendered:
            raise ValueError("Unresolved art study template field")
        page_name = "rain-still.html" if key == "rain" else f"{key}.html"
        (PROJECT / "web" / page_name).write_text(rendered, encoding="utf-8", newline="\n")
    (PROJECT / "web" / "rain.html").write_text((PROJECT / "web" / "rain-journey.html").read_text(encoding="utf-8"), encoding="utf-8", newline="\n")
    (PROJECT / "web" / "art-data.js").write_text("window.ART_STUDIES = " + json.dumps(studies, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8", newline="\n")
    research_manifest = build_research(scenes)
    output = PROJECT / "dist"
    output.mkdir(exist_ok=True)
    for retired in ["story.js", "story.css", "journey.css"]:
        retired_path = output / retired
        if retired_path.is_file():
            retired_path.unlink()
    for name in ["index.html", "styles.css", "reader.css", "scenes.js", "reader.js", "app.js",
                 "experiments.html", "experiments.css", "experiments.js",
                 "light.html", "rain.html", "rain-still.html", "art-data.js", "art-studies.css", "art-studies.js",
                 "rain-journey.js", "rain-journey.css", "rain-route.mjs", "rain-world.mjs", "rain-traveler.mjs", "rain-art.mjs", "rain-ink.mjs",
                 "connections.html", "connections.css", "connections.js", "connections-score.mjs", "connections-world.mjs",
                 "portal.html", "portal-score.mjs", "portal-world.mjs",
                 "research.css", "research.js", "research-data.js"]:
        source = PROJECT / "web" / name
        text = source.read_text(encoding="utf-8").replace("../assets/", "./assets/")
        (output / name).write_text(text, encoding="utf-8", newline="\n")
    shutil.copytree(PROJECT / "web" / "vendor" / "three", output / "vendor" / "three", dirs_exist_ok=True)
    shutil.copytree(PROJECT / "assets" / "reference", output / "assets" / "reference", dirs_exist_ok=True)
    (output / "assets" / "art-studies").mkdir(parents=True, exist_ok=True)
    for generated in (PROJECT / "assets" / "art-studies").glob("*.webp"):
        shutil.copy2(generated, output / "assets" / "art-studies" / generated.name)
    export_research(output, research_manifest)
    print(f"Exported: {output}")


if __name__ == "__main__":
    main()

"""Validate the creative archive and export a dependency-free static website."""
import argparse
import hashlib
import json
import re
import shutil
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def read_json(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def check_content(research, archive):
    stories = archive["stories"]
    ids = {story["id"] for story in stories}
    assert len(stories) == 7 and len(ids) == 7, "需要七份唯一故事档案"
    assert sum(story["stage"] == "seed" for story in stories) == 5
    assert sum(story["stage"] == "treatment" for story in stories) == 2
    directions = {item["id"] for item in research["directions"]}
    assert len(research["observations"]) == 5 and len(directions) == 4
    fields = ["title", "stage", "direction", "tone", "logline", "wish", "rule", "story", "ending", "value", "gap", "risk", "test", "history"]
    for story in stories:
        assert re.fullmatch(r"EW-\d{3}", story["id"])
        assert all(isinstance(story.get(field), str) and story[field].strip() for field in fields), story["id"]
        assert story["direction"] in directions
        assert set(story["relations"]) <= ids
        assert story["assets"] and story["next"] and story["scenes"]
        assert all(all(scene.get(field) for field in ["time", "place", "action", "connection"]) for scene in story["scenes"])
        if story["stage"] == "treatment":
            assert story["duration"] and len(story["scenes"]) >= 5
        else:
            assert story["duration"] is None
    for direction in research["directions"]:
        assert set(direction["stories"]) <= ids
    for observation in research["observations"]:
        assert (ROOT / "assets" / observation["image"]).is_file(), observation["image"]
        assert all(observation[field] for field in ["fact", "reading", "transfer"])


def story_markdown(story):
    stage = "完整短片方向，待细化" if story["stage"] == "treatment" else "故事种子，待展开"
    duration = f"目标约{story['duration']}秒，节奏草案" if story["duration"] else "未定；不以故事种子承诺整片时长"
    lines = [f"# {story['id']} · {story['title']}", "", f"- 阶段：{stage}；未生成、未选定实施", f"- 时长：{duration}", f"- 情绪：{story['tone']}", "- 来源：2026-11-15—11-16 本次讨论与整理", "", "## 一句话", "", story["logline"], "", "## 故事", "", story["story"], "", "## 愿望与奇妙规则", "", f"人物愿望：{story['wish']}", "", f"世界规则：{story['rule']}", "", "## 场景与承接", ""]
    for i, scene in enumerate(story["scenes"], 1):
        lines.extend([f"### {i}. {scene['time']} · {scene['place']}", "", scene["action"], "", f"承接：{scene['connection']}", ""])
    lines.extend(["## 结尾与价值", "", f"结尾：{story['ending']}", "", f"价值：{story['value']}", "", "## 制作前需要补齐", "", story["gap"], "", *[f"- [ ] {step}" for step in story["next"]], "", "## 连续性资产", "", *[f"- {asset}" for asset in story["assets"]], "", "## 先试与风险", "", f"先试：{story['test']}", "", f"风险：{story['risk']}", "", "## 档案关系", "", story["history"], ""])
    if story["relations"]:
        lines.extend(["关联：" + "、".join(story["relations"]), ""])
    lines.extend(["场景承接、风险与先试建议为本轮整理建议。尚未验证生成工具、成本、角色一致性及动效可行性。", ""])
    return "\n".join(lines)


class LinkChecker(HTMLParser):
    def __init__(self, page):
        super().__init__()
        self.page = page
        self.ids = set()
        self.anchors = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            assert attrs["id"] not in self.ids, f"重复ID：{attrs['id']}"
            self.ids.add(attrs["id"])
        for key in ["src", "href"]:
            target = attrs.get(key)
            if not target:
                continue
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc or target.startswith("?"):
                continue
            if target.startswith("#"):
                self.anchors.append(target[1:])
                continue
            if parsed.path:
                local = (self.page.parent / unquote(parsed.path)).resolve()
                assert local.is_relative_to(ROOT), f"链接越界：{target}"
                assert local.exists(), f"本地资源不存在：{self.page.name} → {target}"


def check_html(page):
    parser = LinkChecker(page)
    parser.feed(page.read_text(encoding="utf-8"))
    assert all(anchor in parser.ids for anchor in parser.anchors), "页内锚点缺失"


def build(export):
    research, archive = read_json("research.json"), read_json("stories.json")
    check_content(research, archive)
    payload = json.dumps({"research": research, "archive": archive}, ensure_ascii=False, indent=2)
    write(ROOT / "web/data.js", "// Generated from research.json and stories.json. Run scripts/build.py after editing.\nwindow.EVERYDAY_WONDERS = " + payload + ";\n")
    index = ["# 日常奇想 · 全部故事档案", "", archive["scope"], "", "- 原片参考：https://x.com/VidusheWrites/status/2121596512878870615", "- 五个故事种子不代表已具备完整短片体量。", "- 两份完整方向仍需分镜、连续性设计与最难一镜验证。", ""]
    for story in archive["stories"]:
        text = story_markdown(story)
        write(ROOT / "stories" / f"{story['id']}.md", text)
        index.extend([text, "---", ""])
    write(ROOT / "stories.md", "\n".join(index))
    manifest = {
        "source_url": research["source"]["url"], "captured": "2026-11-16",
        "method": "Codex 内置浏览器定位截图，可见画面裁取，非原始视频抽帧；无视频原件复制。",
        "images": [{"path": path.name, "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in sorted((ROOT / "assets").glob("reference-*.jpg"))],
    }
    assert len(manifest["images"]) == 6
    write(ROOT / "assets/source-manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    for page in (ROOT / "web").glob("*.html"):
        check_html(page)
    if export:
        output = ROOT / "dist"
        output.mkdir(exist_ok=True)
        for path in (ROOT / "web").iterdir():
            if path.is_file():
                content = path.read_text(encoding="utf-8")
                if path.suffix in [".html", ".js"]:
                    for relative in ["assets/", "stories/", "stories.md", "style-guide.md", "reference-study.md", "verification.md", "publication.md", "THIRD_PARTY_NOTICES.md"]:
                        content = content.replace("../" + relative, relative)
                write(output / path.name, content)
        for name in ["stories.md", "stories.json", "research.json", "style-guide.md", "reference-study.md", "verification.md", "publication.md", "THIRD_PARTY_NOTICES.md"]:
            shutil.copy2(ROOT / name, output / name)
        shutil.copytree(ROOT / "stories", output / "stories", dirs_exist_ok=True)
        shutil.copytree(ROOT / "assets", output / "assets", dirs_exist_ok=True)
        for page in output.glob("*.html"):
            check_html(page)
    print(f"OK: 5 reference scenes, 4 directions, 7 story files (5 seeds + 2 treatments); {'dist exported' if export else 'web and Markdown synchronized'}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", action="store_true", help="导出可置于任意子路径的完整静态目录")
    args = parser.parse_args()
    build(args.dist)

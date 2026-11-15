"""Maintain the ordered research registry and its README index (stdlib only)."""

import argparse
import html
import json
import re
import sys
from pathlib import Path, PurePosixPath
from urllib.parse import quote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
START = "<!-- PROJECTS:START -->"
END = "<!-- PROJECTS:END -->"
STATES = {
    "queued": "待研究",
    "researching": "研究中",
    "validated": "已验证",
    "paused": "暂缓",
    "archived": "已归档",
}
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
REPOSITORY = re.compile(r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def line(value):
    return isinstance(value, str) and bool(value.strip()) and not any(
        ord(char) < 32 for char in value
    )


def project_path(project):
    return f"projects/{project['id']}-{project['slug']}"


def local_path(root, relative):
    require(isinstance(relative, str), "本地路径必须是字符串")
    parts = PurePosixPath(relative)
    require(not parts.is_absolute() and ".." not in parts.parts and "\\" not in relative,
            f"必须使用仓库内的相对路径：{relative}")
    candidate = root / relative
    require(candidate.resolve().is_relative_to(root.resolve()),
            f"路径超出仓库范围：{relative}")
    return candidate


def https_url(value):
    if not line(value) or any(char.isspace() for char in value):
        return False
    try:
        parsed = urlsplit(value)
        return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username
    except ValueError:
        return False


def validate(data, root):
    require(isinstance(data, dict), "projects.json 必须是对象")
    require(type(data.get("schema_version")) is int and data["schema_version"] == 1,
            "不支持的 schema_version")
    require(type(data.get("next_id")) is int and 1 <= data["next_id"] <= 10000,
            "next_id 必须是 1 到 10000 的整数")
    projects = data.get("projects")
    require(isinstance(projects, list), "projects 必须是数组")
    ids, orders, slugs = set(), set(), set()
    for project in projects:
        require(isinstance(project, dict), "项目条目必须是对象")
        pid = project.get("id")
        require(isinstance(pid, str) and re.fullmatch(r"[0-9]{4}", pid) and int(pid) > 0,
                "id 必须是 0001 到 9999 的四位字符串")
        require(pid not in ids, f"重复编号：{pid}")
        ids.add(pid)
        require(int(pid) < data["next_id"], f"next_id 必须大于已有编号：{pid}")
        order = project.get("order")
        require(type(order) is int and order > 0 and order not in orders,
                f"{pid} 的 order 必须是唯一正整数")
        orders.add(order)
        slug = project.get("slug")
        require(isinstance(slug, str) and SLUG.fullmatch(slug) and slug not in slugs,
                f"{pid} 的 slug 必须唯一，且只使用小写英文、数字及连字符")
        slugs.add(slug)
        for field in ("name", "summary"):
            require(line(project.get(field)), f"{pid} 缺少单行非空字段 {field}")
        require(isinstance(project.get("repository"), str)
                and REPOSITORY.fullmatch(project["repository"]),
                f"{pid} 的 repository 必须是 https://github.com/owner/repo")
        highlights = project.get("highlights", [])
        require(isinstance(highlights, list) and all(line(item) for item in highlights),
                f"{pid} 的 highlights 必须是单行非空字符串数组")
        require(isinstance(project.get("status"), str) and project["status"] in STATES,
                f"{pid} 的 status 不受支持")
        tags = project.get("tags")
        require(isinstance(tags, list) and all(line(tag) for tag in tags),
                f"{pid} 的 tags 必须是单行非空字符串数组")
        require(len(tags) == len(set(tags)), f"{pid} 存在重复标签")
        folder = project_path(project)
        require(local_path(root, f"{folder}/README.md").is_file(),
                f"{pid} 缺少研究 README：{folder}/README.md")
        require("preview" in project and "demo_url" in project,
                f"{pid} 必须包含 preview 和 demo_url，无内容时使用 null")
        preview = project["preview"]
        if preview is not None:
            require(isinstance(preview, dict), f"{pid} 的 preview 必须是对象或 null")
            require(line(preview.get("alt")) and line(preview.get("caption")),
                    f"{pid} 的截图需要 alt 和 caption 说明")
            src = preview.get("path")
            require(isinstance(src, str) and src.startswith(f"{folder}/assets/"),
                    f"{pid} 的截图必须放在本项目 assets/ 内")
            picture = local_path(root, src)
            require(picture.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
                    and picture.is_file(), f"{pid} 的截图文件不存在或类型不支持：{src}")
        require(project["demo_url"] is None or https_url(project["demo_url"]),
                f"{pid} 的 demo_url 必须是 HTTPS 地址或 null")
    registered = {project_path(project) for project in projects}
    projects_dir = root / "projects"
    if projects_dir.is_dir():
        for folder in projects_dir.iterdir():
            if folder.is_dir() and not folder.name.startswith("."):
                require(folder.relative_to(root).as_posix() in registered,
                        f"项目目录尚未登记：{folder.name}")


def load_registry(root):
    data = json.loads((root / "projects.json").read_text(encoding="utf-8"))
    validate(data, root)
    return data


def md(value):
    value = html.escape(value, quote=False).replace("|", "&#124;")
    return re.sub(r"([\\`*_{\[\]}~])", r"\\\1", value)


def url(value):
    return quote(value, safe="/:#?&=%+-._~")


def render_index(data):
    projects = sorted(data["projects"], key=lambda project: project["order"])
    lines = ["## 子项目索引", "", f"已收录 **{len(projects)}** 个项目。", ""]
    if not projects:
        lines += ["尚未收录子项目。添加首个真实项目后，这里将自动显示有序索引与图片摘要。"]
        return "\n".join(lines)
    lines += ["| 顺序 | 编号 | 子项目 | 简介 | 状态 | 链接 |",
              "| --- | --- | --- | --- | --- | --- |"]
    for rank, project in enumerate(projects, 1):
        links = f"[原仓库]({project['repository']})"
        if project["demo_url"]:
            links += f" · [演示]({url(project['demo_url'])})"
        lines.append(
            f"| {rank} | `{project['id']}` | "
            f"[{md(project['name'])}]({project_path(project)}/README.md) | "
            f"{md(project['summary'])} | {STATES[project['status']]} | {links} |"
        )
    previews = [project for project in projects if project["preview"]]
    if previews:
        lines += ["", "## 项目图览"]
        for project in previews:
            preview = project["preview"]
            lines += ["", f"### {project['id']} · {md(project['name'])}", "",
                      md(project["summary"]), "",
                      *[part for item in project.get("highlights", []) for part in (md(item), "")],
                      f"![{md(preview['alt'])}]({url(preview['path'])})", "",
                      md(preview["caption"]), "",
                      f"[进入研究]({project_path(project)}/README.md) · "
                      f"[原仓库]({project['repository']})"
                      + (f" · [在线网页]({url(project['demo_url'])})" if project["demo_url"] else "")]
    return "\n".join(lines)


def rendered_readme(data, root):
    readme = (root / "README.md").read_text(encoding="utf-8")
    require(readme.count(START) == 1 and readme.count(END) == 1,
            "README 必须恰好包含一组 PROJECTS 自动生成标记")
    before, rest = readme.split(START)
    require(END in rest, "README 自动生成标记顺序有误")
    _, after = rest.split(END)
    return f"{before}{START}\n\n{render_index(data)}\n\n{END}{after}"


def write_text(path, content):
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(content)


def add_project(root, slug, name, repository, summary):
    data = load_registry(root)
    require(SLUG.fullmatch(slug), "slug 只允许小写英文、数字与连字符")
    require(all(project["slug"] != slug for project in data["projects"]),
            f"slug 已存在：{slug}")
    require(data["next_id"] <= 9999, "四位编号已用尽，需要升级编号规范")
    project = {
        "id": f"{data['next_id']:04d}",
        "order": max((item["order"] for item in data["projects"]), default=0) + 1,
        "slug": slug, "name": name, "summary": summary, "repository": repository,
        "status": "queued", "tags": [], "preview": None, "demo_url": None,
    }
    require(line(name) and line(summary), "名称和摘要必须为单行非空文本")
    require(REPOSITORY.fullmatch(repository), "原仓库地址必须为 https://github.com/owner/repo")
    folder = local_path(root, project_path(project))
    require(not folder.exists(), f"目录已存在：{folder.name}")
    template = (root / "templates/project/README.md").read_text(encoding="utf-8")
    replacements = {key: md(project[key]) for key in ("id", "name", "summary")}
    replacements["repository"] = repository
    template = re.sub(r"\{\{(id|name|summary|repository)\}\}",
                      lambda match: replacements[match.group(1)], template)
    data["projects"].append(project)
    data["next_id"] += 1
    readme = rendered_readme(data, root)
    (folder / "assets").mkdir(parents=True)
    write_text(folder / "README.md", template)
    write_text(folder / "assets/.gitkeep", "")
    write_text(root / "projects.json", json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    write_text(root / "README.md", readme)
    return project


def main():
    parser = argparse.ArgumentParser(description="维护项目登记表和 README 有序索引")
    commands = parser.add_subparsers(dest="command", required=True)
    add = commands.add_parser("add", help="创建下一个编号的研究项目")
    add.add_argument("slug")
    add.add_argument("--name", required=True)
    add.add_argument("--repository", required=True)
    add.add_argument("--summary", required=True)
    commands.add_parser("render", help="根据 projects.json 更新首页")
    commands.add_parser("check", help="检查元数据、目录、图片及首页同步")
    args = parser.parse_args()
    try:
        if args.command == "add":
            project = add_project(ROOT, args.slug, args.name, args.repository, args.summary)
            print(f"Created {project_path(project)}")
        else:
            data = load_registry(ROOT)
            expected = rendered_readme(data, ROOT)
            if args.command == "render":
                write_text(ROOT / "README.md", expected)
                print("Updated README.md")
            else:
                require((ROOT / "README.md").read_text(encoding="utf-8") == expected,
                        "README 索引未同步，请执行 python scripts/projects.py render")
                print(f"OK: {len(data['projects'])} project(s); registry and README are in sync")
    except (ValueError, OSError, KeyError, TypeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

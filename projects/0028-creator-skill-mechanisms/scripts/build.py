"""Export this research reader with the Python standard library only."""
from __future__ import annotations
import argparse
import hashlib
import html
import json
from pathlib import Path
import shutil
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SLUG = ROOT.name
GUIDE = "skill-constraints-overview.png"


def e(value):
    return html.escape(str(value), quote=True)


def listing(items, ordered=False):
    tag = "ol" if ordered else "ul"
    return f"<{tag}>" + "".join(f"<li>{e(item)}</li>" for item in items) + f"</{tag}>"


def source_url(source, upstreams):
    if source.get("url"):
        return source["url"]
    commit = upstreams[source["repository"]]["commit"]
    return f'https://github.com/{source["repository"]}/blob/{commit}/' + quote(source["path"], safe="/")


def render(data):
    upstreams = {u["repository"]: u for u in data["upstreams"]}
    sources = {s["id"]: {**s, "resolved_url": source_url(s, upstreams)} for s in data["sources"]}
    understanding = "".join(
        f'<article class="understanding"><span>{i:02}</span><h3>{e(x["title"])}</h3><p>{e(x["text"])}</p></article>'
        for i, x in enumerate(data["understanding"], 1)
    )
    flows = []
    for i, f in enumerate(data["flows"], 1):
        io = "".join(f'<div class="io-cell"><h4>{label}</h4>{listing(f[key], key == "process")}</div>'
                     for label, key in (("输入是什么", "input"), ("做什么处理", "process"), ("输出是什么", "output")))
        mechanisms = "".join(f'<div class="mechanism"><h4>{e(m["name"])}</h4><p>{e(m["rule"])}</p><p class="purpose">控制什么：{e(m["purpose"])}</p><small>执行方式：{e(m["enforcement"])}</small></div>' for m in f["mechanisms"])
        links = "".join(f'<a href="{e(sources[s]["resolved_url"])}">{e(sources[s]["title"])} ↗</a>' for s in f["sources"])
        flows.append(f'<article class="flow" id="flow-{e(f["id"])}"><div class="flow-head"><div><p class="eyebrow">{i:02} / {e(f["label"])}</p><h3>{e(f["repository"].split("/")[1])}</h3><code>{e(f["skill"])}</code></div><span>{e(f["type"])}</span></div><p class="flow-goal">目标：{e(f["goal"])}</p><div class="io-grid">{io}</div><h4 class="mechanism-heading">内部怎样约束，为什么有用？</h4><div class="mechanisms">{mechanisms}</div><div class="reuse"><strong>我们可以借用什么</strong>{e(f["reuse"])}</div><div class="boundary"><strong>仍需自己验证</strong>{e(f["boundary"])}</div><div class="flow-sources">{links}</div></article>')
    replacements = {
        "UNDERSTANDING": understanding,
        "FLOW_NAV": "".join(f'<a href="#flow-{e(f["id"])}">{i:02} {e(f["label"])}</a>' for i, f in enumerate(data["flows"], 1)),
        "FLOWS": "\n".join(flows),
        "LEVELS": "".join(f'<article class="level"><h3>{e(x["name"])}</h3><p>{e(x["checks"])}</p><p class="limit">{e(x["limit"])}</p></article>' for x in data["constraint_levels"]),
        "COMPARISON": "".join("<tr>" + "".join(f"<td>{e(x[k])}</td>" for k in ("mode", "condition", "value", "cost")) + "</tr>" for x in data["comparison"]),
        "PRACTICE": "".join(f'<li><h3>{e(x["step"])}</h3><p>{e(x["action"])}</p></li>' for x in data["practice"]),
        "SOURCES": "".join(f'<div class="source" id="source-{e(s["id"])}"><a href="{e(s["resolved_url"])}">{e(s["title"])} ↗</a><small>{e(s["role"])}</small></div>' for s in sources.values()),
        "UPSTREAMS": listing([u["repository"] + " @ " + u["commit"] for u in data["upstreams"]]),
        "REVIEW_DATE": e(data["reviewed_on"]),
    }
    markup = (ROOT / "web/index.html").read_text(encoding="utf-8")
    for name, value in replacements.items():
        markup = markup.replace("@@" + name + "@@", value)
    if "@@" in markup:
        raise ValueError("Unresolved template marker")
    return markup


def build():
    data = json.loads((ROOT / "research.json").read_text(encoding="utf-8"))
    dest = ROOT / "dist"
    (dest / "assets").mkdir(parents=True, exist_ok=True)
    (dest / "index.html").write_text(render(data), encoding="utf-8", newline="\n")
    for name in ("styles.css", "app.js"):
        shutil.copy2(ROOT / "web" / name, dest / name)
    for name in ("README.md", "DISCUSSION.md", "SOURCE-NOTES.md", "publication.md", "research.json"):
        shutil.copy2(ROOT / name, dest / name)
    for name in (GUIDE, "guide-manifest.json", "SOURCES.md"):
        shutil.copy2(ROOT / "assets" / name, dest / "assets" / name)
    manifest = {
        "project": SLUG,
        "files": [{"path": p.relative_to(dest).as_posix(), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                  for p in sorted(dest.rglob("*")) if p.is_file() and p.name != "build-manifest.json"],
    }
    (dest / "build-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return dest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--publication", action="store_true", help="Export the authorized Pages reader")
    parser.add_argument("--site-preview", action="store_true", help="Copy this export into the local repository site")
    args = parser.parse_args()
    dest = build()
    if args.site_preview:
        target = ROOT.parents[1] / "_site/demos" / SLUG
        shutil.copytree(dest, target, dirs_exist_ok=True)
    print(json.dumps({"output": str(dest), "bytes": sum(p.stat().st_size for p in dest.rglob("*") if p.is_file())}))


if __name__ == "__main__":
    main()

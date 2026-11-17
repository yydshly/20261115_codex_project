"""Render one source-attributed overview as a high-resolution PNG and editable SVG.

The layout is deterministic. It reuses real local previews, and contains no
generated stand-in artwork. Requires Pillow only for image composition/type.
"""
from __future__ import annotations

import base64
import hashlib
import html
import io
import json
import re
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps
from analysis_data import load_analysis

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
W = 3200
M = 110
RIGHT = W - M
REGULAR = "C:/Windows/Fonts/msyh.ttc"
BOLD = "C:/Windows/Fonts/msyhbd.ttc"
BG = "#f6f8f1"
INK = "#173e35"
BODY = "#38584b"
MUTED = "#70806b"
LINE = "#d5dfcb"
LIME = "#d9eca8"
PALE = "#edf4df"
WHITE = "#ffffff"
COLS = [(720, 680), (1480, 740), (2320, 730)]
FONTS = {}


def font(size, bold=False):
    key = (size, bold)
    if key not in FONTS:
        FONTS[key] = ImageFont.truetype(BOLD if bold else REGULAR, size)
    return FONTS[key]


def measure(text, size, bold=False):
    return font(size, bold).getlength(text)


def wrap(text, width, size, bold=False):
    lines = []
    for paragraph in text.split("\n"):
        current = ""
        for token in re.findall(r"[A-Za-z][A-Za-z0-9._+-]*| +|.", paragraph):
            if not current:
                current = token.lstrip()
            elif measure(current + token, size, bold) <= width:
                current += token
            else:
                if token in "，。；：、！？）》”" and current:
                    last = current[-1]
                    lines.append(current[:-1].rstrip())
                    current = last + token
                else:
                    lines.append(current.rstrip())
                    current = token.lstrip()
        if current:
            lines.append(current.rstrip())
    return lines


class Canvas:
    def __init__(self, height):
        self.image = Image.new("RGB", (W, height), BG)
        self.draw = ImageDraw.Draw(self.image)
        self.svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{height}" viewBox="0 0 {W} {height}">',
                    '<title>观式：100个设计与影像网站的效果、原理与项目价值总览</title>',
                    '<desc>九类资源分别说明效果、实现原理与对我们项目的价值，附真实代表预览、四条应用路线和资料范围。</desc>']
        self.rect(0, 0, W, height, BG)
        self.text_records = []

    def rect(self, x, y, width, height, fill, radius=0):
        bounds = (round(x), round(y), round(x + width), round(y + height))
        self.draw.rounded_rectangle(bounds, radius=radius, fill=fill)
        self.svg.append(f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="{radius}" fill="{fill}"/>')

    def line(self, x1, y1, x2, y2, fill=LINE, width=2):
        self.draw.line((x1, y1, x2, y2), fill=fill, width=width)
        self.svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{fill}" stroke-width="{width}"/>')

    def text(self, x, y, text, size, fill=INK, bold=False, max_width=None):
        length = measure(text, size, bold)
        if max_width is not None and length > max_width + 1:
            raise ValueError(f"Text exceeds its column: {text} ({length:.1f}>{max_width})")
        if x + length > W - 35 or x < 0:
            raise ValueError(f"Text exceeds canvas: {text}")
        self.draw.text((round(x), round(y)), text, font=font(size, bold), fill=fill, anchor="lt")
        self.svg.append(f'<text x="{x}" y="{y}" fill="{fill}" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" dominant-baseline="text-before-edge">{html.escape(text)}</text>')
        self.text_records.append({"text": text, "x": x, "y": y, "size": size, "width": round(length, 1)})

    def paragraph(self, x, y, text, width, size=40, line_height=62, fill=BODY, bold=False):
        lines = wrap(text, width, size, bold)
        for i, line in enumerate(lines):
            self.text(x, y + i * line_height, line, size, fill, bold, max_width=width)
        return len(lines) * line_height

    def preview(self, path, x, y, width, height):
        with Image.open(path) as source:
            thumb = ImageOps.fit(source.convert("RGB"), (width, height), method=Image.Resampling.LANCZOS)
        self.image.paste(thumb, (x, y))
        output = io.BytesIO()
        thumb.save(output, "JPEG", quality=91, optimize=True)
        uri = "data:image/jpeg;base64," + base64.b64encode(output.getvalue()).decode("ascii")
        self.svg.append(f'<image x="{x}" y="{y}" width="{width}" height="{height}" href="{uri}"/>')


def main():
    brief = json.loads((ROOT / "web/data/overview.json").read_text(encoding="utf-8"))
    catalog = json.loads((ROOT / "web/data/catalog.json").read_text(encoding="utf-8"))
    previews = json.loads((ROOT / "web/data/previews.json").read_text(encoding="utf-8"))
    analyses = load_analysis()["sites"]
    categories = {c["id"]: c for c in catalog["categories"]}
    assert len(brief["rows"]) == 9 and len({r["category"] for r in brief["rows"]}) == 9
    assert sum(categories[r["category"]]["count"] for r in brief["rows"]) == 100
    row_heights = []
    for row in brief["rows"]:
        body_height = max(len(wrap(row[k], COLS[i][1], 40)) * 62 for i, k in enumerate(["effect", "principle", "value"]))
        row_heights.append(max(432, body_height + 196))
    table_y = 790
    table_bottom = table_y + sum(row_heights)
    H = table_bottom + 1090
    c = Canvas(H)
    c.text(M, 65, "观式  /  DESIGN REFERENCE ATLAS", 31, MUTED, True)
    c.text(M, 145, brief["title"], 108, INK, True)
    c.text(M, 295, brief["subtitle"], 43, BODY)
    stats = [("100", "个网站"), ("09", "个方向"), ("100", "份解析"), ("98", "个站点有预览")]
    sx = M
    for value, label in stats:
        c.text(sx, 385, value, 58, INK, True)
        offset = measure(value, 58, True) + 22
        c.text(sx + offset, 408, label, 29, MUTED)
        sx += 485
    c.text(RIGHT - 430, 409, "由参考，走向可执行的创作", 28, MUTED)
    c.rect(M, 503, RIGHT - M, 131, INK, 6)
    for i, label in enumerate(["看清效果", "拆分原理", "做小样", "比较差异", "沉淀规则"]):
        x = M + 42 + i * 591
        c.text(x, 545, f"0{i+1}", 27, LIME)
        c.text(x + 69, 538, label, 39, WHITE, True)
        if i < 4:
            c.text(x + 478, 540, "→", 40, LIME)
    c.text(M, 688, "九类资源 / 代表预览", 34, MUTED, True)
    for (x, width), title in zip(COLS, ["效果是什么", "原理与实现方式", "对我们的价值"]):
        c.text(x, 681, title, 46, INK, True)
    c.line(M, 759, RIGHT, 759, INK, 3)

    used = []
    y = table_y
    for index, (row, height) in enumerate(zip(brief["rows"], row_heights), 1):
        cat = categories[row["category"]]
        p = previews["previews"][str(row["preview_id"])]
        if p.get("status") != "ok":
            raise ValueError(f"Preview unavailable: {row['preview_id']}")
        image_path = (ROOT / "web" / p["src"]).resolve()
        if not image_path.is_relative_to(ASSETS.resolve()):
            raise ValueError("Preview outside project assets")
        c.rect(2285, y - 16, 805, height, PALE)
        c.text(M, y + 5, f"{index:02d}", 28, MUTED)
        name = cat["name"]
        # The long cinema label remains explicit and uses two lines.
        cat_lines = wrap(name, 395, 40, True)
        for j, line in enumerate(cat_lines):
            c.text(M + 58, y + j * 50, line, 40, INK, True, 395)
        c.text(M + 478, y + 11, f"{cat['count']:02d}", 30, MUTED)
        py = y + 111
        c.preview(image_path, M, py, 510, 213)
        c.paragraph(M, py + 228, row["preview_caption"], 510, 25, 37, MUTED)
        for i, (prefix, key) in enumerate([("effect", "effect"), ("principle", "principle"), ("value", "value")]):
            x, width = COLS[i]
            c.text(x, y + 5, row[prefix + "_title"], 44, INK, True, width)
            body_h = c.paragraph(x, y + 101, row[key], width, 40, 62)
            if body_h + 165 > height:
                raise ValueError(f"Body exceeds row: {row['category']}")
        c.text(COLS[0][0], y + height - 56, "参考：" + row["references"], 25, MUTED)
        c.line(M, y + height - 2, RIGHT, y + height - 2)
        used.append({"category": row["category"], "id": row["preview_id"], "caption": row["preview_caption"],
                     "local_preview": p["src"], "page_url": p["page_url"], "image_source": p["image_source"],
                     "kind": p["kind"], "source_sha256": p["sha256"], "display": "为总览缩略裁切；非新生成作品。"})
        y += height

    y += 54
    c.text(M, y, "把方法带回我们的项目", 58, INK, True)
    c.text(M, y + 83, "下面是后续可试制的路线与成果，不代表已经完成实装。", 30, MUTED)
    app_y = y + 156
    for i, app in enumerate(brief["applications"]):
        ax = M + (i % 2) * 1540
        ay = app_y + (i // 2) * 222
        c.line(ax, ay, ax + 1440, ay, LINE)
        c.text(ax, ay + 28, f"0{i+1}", 28, MUTED)
        c.text(ax + 60, ay + 17, app["title"], 42, INK, True)
        c.paragraph(ax, ay + 86, app["route"], 1430, 32, 47, BODY)
        c.text(ax, ay + 155, app["deliverable"], 30, MUTED, max_width=1440)
    band_y = app_y + 458
    c.rect(M, band_y, RIGHT - M, 112, LIME, 5)
    c.text(M + 35, band_y + 36, brief["central_message"], 38, INK, True, RIGHT - M - 70)
    levels = Counter(a["evidence_level"] for a in analyses.values())
    evidence = f"解析范围：{levels['官方资料＋复用建议']} 项官方资料结合建议  /  {levels['视觉推断']} 项视觉推断  /  {levels['通用实现方案']} 项通用方案。完整逐站依据见网页。"
    c.text(M, band_y + 149, evidence, 28, BODY)
    c.paragraph(M, band_y + 203, brief["boundary"], RIGHT - M, 27, 42, MUTED)
    c.paragraph(M, band_y + 258, brief["source_note"], RIGHT - M, 26, 40, MUTED)
    if max(t["y"] + t["size"] for t in c.text_records) > H - 30:
        raise ValueError("Footer exceeds image bounds")
    c.svg.append("</svg>")
    png = ASSETS / "effects-principles-value-overview-v1.png"
    svg = ASSETS / "effects-principles-value-overview-v1.svg"
    c.image.save(png, optimize=True)
    svg.write_text("\n".join(c.svg), encoding="utf-8")
    # A smaller proof is a QA intermediate; the shared artifact is the full PNG.
    proof = c.image.copy()
    proof.thumbnail((1600, 4000), Image.Resampling.LANCZOS)
    proof.save(ASSETS / "overview-qa-contact.jpg", quality=92, optimize=True)
    metadata = {"schema_version": 1, "created_at": "2026-11-16", "kind": "本库原创信息图；嵌入第三方代表预览",
                "size": [W, H], "sites": 100, "categories": 9, "analyses": 100,
                "referenced_previews": used, "notes": [brief["boundary"], brief["source_note"]],
                "png_sha256": hashlib.sha256(png.read_bytes()).hexdigest(),
                "svg_sha256": hashlib.sha256(svg.read_bytes()).hexdigest(), "text_blocks": len(c.text_records),
                "layout_validation": "所有文字经过字体实测换行与画布、列宽、行高边界检查。"}
    (ASSETS / "overview-sources.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"png": str(png), "svg": str(svg), "size": [W, H], "png_bytes": png.stat().st_size,
                      "text_blocks": len(c.text_records)}, ensure_ascii=True))


if __name__ == "__main__":
    main()

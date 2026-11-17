"""Typeset one evidence-based infographic as PNG and editable, self-contained SVG.

Existing scene screenshots are placed as unmodified evidence inserts. This is
document/diagram layout, not AI redrawing or editing of the source scene.
Pillow and locally installed Microsoft YaHei are used for exact Chinese type.
"""

import base64
import hashlib
import html
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
WIDTH, MARGIN = 2400, 128
CONTENT = WIDTH - MARGIN * 2
BG, INK, MUTED = "#f2f2e8", "#173c43", "#5a7475"
DARK, WHITE, SEA = "#082731", "#f0f4e8", "#afd6cd"
FONT = Path("C:/Windows/Fonts/msyh.ttc")
BOLD = Path("C:/Windows/Fonts/msyhbd.ttc")

BRIEF = [
    ("创作目标", "请为我们独立设计并实现一个可在浏览器中自由探索的海底世界。"),
    ("体验与气质", "宁静、通透，有空间层次与发现感。先说清人在海里经历什么，再选择实现方法；不预设必须复用某个开源项目。"),
    ("空间设计", "先提出完整探索路线，例如珊瑚浅滩 → 海藻峡谷 → 岩拱 → 海底遗迹；明确每一区的地标、尺度、配色、光线、通行方式与观景位置。"),
    ("画面实现", "先用简单几何验证路线和构图，再建立光线吸收、深度雾、动态焦散与光束。随后加入岩石、植物、鱼群、气泡、颗粒和声场。适合重复的内容可以程序化生成，精细主体可使用有许可的模型。"),
    ("技术取舍", "先保证画面与氛围，再追求帧时间稳定，最后优化体积。可以沿用现有工程或另选渲染方式，说明理由；不为单文件目标牺牲必要质量。"),
    ("迭代验收", "在浏览器实际运行，以固定机位和同一路线检查构图、颜色、密度、尺度与动态，按具体缺陷修改。记录设备、分辨率、画质和平均／99 分位／最大帧耗时；先提出并确认性能预算，再验收，不虚构结果。"),
    ("最终交付", "可运行工程、启动说明、关键可调参数、固定视点截图、测量结果与已知限制。标明实际验证范围，不把任务要求写成已经完成的成果。"),
]


class Layout:
    def __init__(self):
        self.items = []
        self.fonts = {}

    def font(self, size, bold=False):
        key = (size, bold)
        if key not in self.fonts:
            self.fonts[key] = ImageFont.truetype(str(BOLD if bold else FONT), size)
        return self.fonts[key]

    def rect(self, x, y, w, h, fill, stroke=None, radius=0):
        self.items.append(("rect", (x, y, w, h, fill, stroke, radius)))

    def line(self, x1, y1, x2, y2, fill, width=2):
        self.items.append(("line", (x1, y1, x2, y2, fill, width)))

    def text(self, x, y, text, size, fill=INK, bold=False):
        font = self.font(size, bold)
        width = font.getlength(text)
        assert x >= 0 and x + width <= WIDTH - 36, (text, x, width)
        self.items.append(("text", (x, y, text, size, fill, bold)))
        return y + size * 1.5

    def wrap(self, text, size, max_width, bold=False):
        lines, line = [], ""
        for char in text:
            if char == "\n":
                lines.append(line)
                line = ""
            elif self.font(size, bold).getlength(line + char) > max_width and line:
                # Keep closing punctuation with its preceding line.
                if char in "，。；：！？、）】》”：":
                    lines.append(line + char)
                    line = ""
                else:
                    lines.append(line)
                    line = char
            else:
                line += char
        if line:
            lines.append(line)
        return lines

    def paragraph(self, x, y, text, size=43, fill=MUTED, width=CONTENT, leading=1.65, bold=False):
        for line in self.wrap(text, size, width, bold):
            self.text(x, y, line, size, fill, bold)
            y += size * leading
        return y

    def image(self, path, x, y, width, height):
        self.items.append(("image", (path, x, y, width, height)))

    def section(self, y, number, title, description=None):
        self.text(MARGIN, y, number, 32, "#4d8b81", True)
        self.text(MARGIN + 100, y - 12, title, 65, INK, True)
        y += 92
        if description:
            y = self.paragraph(MARGIN + 100, y, description, 38, MUTED, CONTENT - 100, 1.6)
            y += 30
        return y

    def export(self, height):
        canvas = Image.new("RGB", (WIDTH, height), BG)
        draw = ImageDraw.Draw(canvas)
        svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{height}" viewBox="0 0 {WIDTH} {height}" role="img" aria-label="海的生成：海底效果、研究价值与我们的沉淀提示词">',
               '<title>海的生成：海底效果、价值与原创创作任务书</title>',
               '<desc>三张真实海底截图、五层实现、三项价值，以及尚未执行的原创海底世界任务书。场景作者 Noniv，MIT。</desc>',
               f'<rect width="{WIDTH}" height="{height}" fill="{BG}"/>']
        source_hashes = {}
        for kind, args in self.items:
            if kind == "rect":
                x, y, w, h, fill, stroke, radius = args
                assert y + h <= height
                draw.rounded_rectangle((x, y, x + w, y + h), radius, fill=fill, outline=stroke, width=2)
                svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke or "none"}"/>')
            elif kind == "line":
                x1, y1, x2, y2, fill, width = args
                draw.line((x1, y1, x2, y2), fill=fill, width=width)
                svg.append(f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{fill}" stroke-width="{width}"/>')
            elif kind == "text":
                x, y, text, size, fill, bold = args
                assert y + size * 1.5 <= height
                draw.text((x, y), text, font=self.font(size, bold), fill=fill, anchor="lt")
                svg.append(f'<text x="{x}" y="{y}" dominant-baseline="text-before-edge" font-family="Microsoft YaHei, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{fill}">{html.escape(text)}</text>')
            elif kind == "image":
                path, x, y, w, h = args
                source = Image.open(path).convert("RGB")
                source.thumbnail((w, h), Image.Resampling.LANCZOS)
                canvas.paste(source, (int(x + (w - source.width) / 2), int(y + (h - source.height) / 2)))
                data = path.read_bytes()
                source_hashes[path.name] = hashlib.sha256(data).hexdigest()
                encoded = base64.b64encode(data).decode("ascii")
                svg.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet" href="data:image/jpeg;base64,{encoded}"/>')
        svg.append('</svg>')
        canvas.save(ASSETS / "understanding-summary.png", optimize=True)
        (ASSETS / "understanding-summary.svg").write_text("\n".join(svg), encoding="utf-8")
        preview = canvas.copy()
        preview.thumbnail((1000, 10000), Image.Resampling.LANCZOS)
        preview.save(ASSETS / "understanding-summary-preview.jpg", quality=91)
        (ASSETS / "summary-layout.json").write_text(json.dumps({
            "width": WIDTH, "height": height, "date": "2026-11-17",
            "method": "deterministic document layout; source screenshots placed without semantic redrawing",
            "source_images_sha256": source_hashes, "brief_status": "original, not executed",
            "text_runs": sum(kind == "text" for kind, _ in self.items),
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Created understanding-summary.png and .svg ({WIDTH} x {height})")


def main():
    layout = Layout()
    # A large strip of evidence images remains the visual center of the poster.
    layout.rect(0, 0, WIDTH, 1610, DARK)
    layout.text(MARGIN, 76, "016 / ABYSSAL GARDEN · 我们的理解", 34, SEA)
    layout.text(MARGIN - 5, 156, "海的生成", 132, WHITE, True)
    layout.text(MARGIN, 333, "看懂海的效果，理解价值，留下自己的创作任务书。", 49, "#c6d8d2")
    layout.text(MARGIN, 448, "01 / 三个视点，看见空间、光色与生命感", 38, SEA)
    gap = 32
    image_w = (CONTENT - gap * 2) // 3
    photos = [
        ("overview-live.jpg", "鲸尾森林", "尺度与生命感", "前景叶片、中景雕塑、远处岩壁；鱼群与颗粒让水体有了生命。"),
        ("shipwreck-live.jpg", "沉船峡谷", "地标与框景", "岩壁围住斜向船体，透下的光勾出轮廓；蝠鲼帮助判断尺度。"),
        ("purple-grotto-live.jpg", "紫色洞窟", "区域与情绪", "紫粉地被、海绵与悬挑岩壁，让同一片海拥有另一种气质。"),
    ]
    image_y, image_h = 528, 716
    for i, (name, title, theme, description) in enumerate(photos):
        x = MARGIN + i * (image_w + gap)
        layout.image(ASSETS / name, x, image_y, image_w, image_h)
        layout.text(x, 1284, title, 48, WHITE, True)
        layout.text(x, 1356, theme, 32, SEA)
        layout.paragraph(x, 1420, description, 34, "#c4d5cf", image_w - 8, 1.6)
    layout.text(MARGIN, 1551, "实测截图：2026-11-15 · 作者场景 Noniv · MIT · 静态图记录运行中的一刻", 29, "#91b7ae")

    y = layout.section(1690, "02", "这片海，怎样成立？", "程序负责运行世界；模型参与创作程序。程序化生成也包含明确的布局和构图。")
    layers = [
        ("空间", "峡谷、岩拱与地标", "安排尺度、路线和视点"),
        ("水光", "吸收、深度雾与焦散", "形成青蓝纵深与光束"),
        ("生命", "植被、珊瑚与鱼群", "形态与分布共同设计"),
        ("运动", "摆动、漂浮与声场", "变化回应环境与游动"),
        ("运行", "裁剪、分层与画质", "控制细节与实际耗时"),
    ]
    cell_w = CONTENT / 5
    for i, (title, a, b) in enumerate(layers):
        x = MARGIN + i * cell_w
        layout.line(x, y, x + cell_w - 30, y, "#a6c1b5", 3)
        layout.text(x, y + 28, title, 48, INK, True)
        layout.text(x, y + 106, a, 33, MUTED)
        layout.text(x, y + 164, b, 33, MUTED)
    y += 280
    layout.rect(MARGIN, y, CONTENT, 153, "#dce8db")
    layout.text(MARGIN + 43, y + 30, "人定目标   →   AI 写代码   →   浏览器运行   →   看图、测时、改稿", 46, "#2d625c", True)
    layout.text(MARGIN + 43, y + 99, "创作阶段依赖模型与工具；成品运行依赖代码与 GPU，无需持续调用模型。", 32, "#567d6f")
    y += 250

    y = layout.section(y, "03", "对我们的价值", "把对作品的喜欢，转化为可以继续使用的设计能力、技术理解与制作方法。")
    values = [
        ("设计上", "学会组织一个世界", "用地标、光色和探索路线建立空间；先决定人的体验，再安排细节。"),
        ("技术上", "理解效果怎样实现", "把空间、水光、生物与性能分开看；按创作需要选择程序生成或模型资产。"),
        ("方法上", "把要求变成可验收任务", "明确优先级、范围与交付；固定机位和路线，让画面与测量推动修改。"),
    ]
    for i, (label, title, description) in enumerate(values):
        x = MARGIN + i * (image_w + gap)
        layout.text(x, y, label, 32, "#5c8d79")
        layout.text(x, y + 65, title, 43, INK, True)
        layout.paragraph(x, y + 146, description, 37, MUTED, image_w - 28, 1.7)
    y += 365
    layout.line(MARGIN, y, WIDTH - MARGIN, y, "#bfcfbf")
    y += 48
    layout.text(MARGIN, y, "先设计我们自己的世界，再决定采用哪种实现。", 54, "#356f64", True)
    y += 128

    y = layout.section(y, "04", "我们的沉淀提示词", "下面是本次讨论的原创任务书，不是作者原始提示词的翻译；尚未执行。")
    panel_y = y
    panel_items = []
    before = len(layout.items)
    y += 54
    for i, (label, text) in enumerate(BRIEF):
        layout.text(MARGIN + 52, y, f"{i+1:02d}", 32, "#5b8e7c", True)
        layout.text(MARGIN + 140, y - 2, label, 44, INK, True)
        y += 78
        y = layout.paragraph(MARGIN + 140, y, text, 40, "#4e6966", CONTENT - 204, 1.72)
        y += 39
    # Place the paper rectangle behind the newly created prompt text.
    panel_items = layout.items[before:]
    del layout.items[before:]
    layout.rect(MARGIN, panel_y, CONTENT, y - panel_y + 4, "#e4eadd", "#c4d2bf")
    layout.items.extend(panel_items)
    y += 80
    layout.text(MARGIN, y, "我们留下的是方法与任务书，新的海底仍要实际制作与验收。", 43, "#2c615b", True)
    y += 103
    y = layout.paragraph(MARGIN, y, "公开材料包括目标、源码与部分修正。具体模型、完整对话、人工修改比例及完整验收记录未披露，不能据此保证一条提示词稳定复现。", 30, "#7d8f83", CONTENT, 1.7)
    y += 40
    layout.line(MARGIN, y, WIDTH - MARGIN, y, "#c4d0bf")
    y += 35
    layout.text(MARGIN, y, "场景：Maksymilian Dendura / Noniv · Abyssal Garden · MIT", 29, MUTED)
    y += 50
    layout.text(MARGIN, y, "github.com/Noniv/abyssal-garden  |  完整原文、翻译与出处见项目阅读网页", 29, MUTED)
    y += 50
    layout.text(MARGIN, y, "本库原创图文整理 / 0016 海的生成 / 2026-11-17", 29, MUTED)
    height = int(y + 110)
    layout.export(height)
    text = "请为我们独立设计并实现一个可在浏览器中自由探索的海底世界。\n\n" + "\n\n".join(f"{label}：{content}" for label, content in BRIEF[1:]) + "\n"
    (ASSETS / "our-sea-brief.txt").write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()

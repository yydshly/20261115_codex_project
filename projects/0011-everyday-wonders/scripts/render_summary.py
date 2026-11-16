"""Render the research summary as an exact-text PNG and editable SVG.

Pillow is used only for raster output. Reference pictures are quoted unchanged
apart from proportional sizing, with source and evidence limits retained.
"""
import base64
import hashlib
import html
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
W, H, M = 2400, 4480, 128
CONTENT = W - 2 * M
PAPER, INK, GREEN = "#f5f1e7", "#293d34", "#344e40"
MUTED, ROSE, LINE, PALE = "#747a6d", "#ab6c58", "#d7d8c9", "#e7ebdf"
FONT_FILES = {
    "body": Path("C:/Windows/Fonts/msyh.ttc"),
    "bold": Path("C:/Windows/Fonts/msyhbd.ttc"),
    "serif": Path("C:/Windows/Fonts/simsun.ttc"),
    "number": Path("C:/Windows/Fonts/georgia.ttf"),
}


class Poster:
    def __init__(self):
        self.image = Image.new("RGB", (W, H), PAPER)
        self.draw = ImageDraw.Draw(self.image)
        self.svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">', '<title>日常奇想：理解、故事方向与可沉淀能力</title>', f'<rect width="{W}" height="{H}" fill="{PAPER}"/>']
        self.text_log = []
        self.fonts = {}

    def font(self, size, family="body"):
        key = (size, family)
        if key not in self.fonts:
            self.fonts[key] = ImageFont.truetype(str(FONT_FILES[family]), size)
        return self.fonts[key]

    def rect(self, x, y, width, height, fill, radius=0, stroke=None, sw=2):
        box = (round(x), round(y), round(x + width), round(y + height))
        if radius:
            self.draw.rounded_rectangle(box, radius, fill, stroke, sw)
        else:
            self.draw.rectangle(box, fill, stroke, sw)
        self.svg.append(f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="{radius}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{sw}"/>')

    def line(self, x1, y1, x2, y2, color=LINE, width=2):
        self.draw.line((x1, y1, x2, y2), fill=color, width=width)
        self.svg.append(f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{color}" stroke-width="{width}"/>')

    def star(self, cx, cy, radius=45, color=ROSE, width=4):
        for n in range(4):
            angle = math.pi * n / 4
            dx, dy = radius * math.cos(angle), radius * math.sin(angle)
            self.line(cx - dx, cy - dy, cx + dx, cy + dy, color, width)

    def text(self, text, x, y, size=34, color=INK, family="body", max_width=None, align="left"):
        font = self.font(size, family)
        actual_width = self.draw.textlength(text, font=font)
        if max_width is not None:
            assert actual_width <= max_width + 2, f"Text too wide: {text} ({actual_width} > {max_width})"
        if align == "center":
            x -= actual_width / 2
        if align == "right":
            x -= actual_width
        assert x >= 0 and x + actual_width <= W + 1 and y >= 0 and y + size < H, f"Outside canvas: {text}"
        self.draw.text((round(x), round(y)), text, font=font, fill=color, anchor="lt")
        svg_family = {"body":"Microsoft YaHei, sans-serif", "bold":"Microsoft YaHei, sans-serif", "serif":"SimSun, serif", "number":"Georgia, serif"}[family]
        self.svg.append(f'<text x="{x:.2f}" y="{y + size * .88:.2f}" fill="{color}" font-family="{svg_family}" font-size="{size}" font-weight="{700 if family == "bold" else 400}">{html.escape(text)}</text>')
        self.text_log.append({"text":text,"x":round(x,2),"y":y,"size":size,"width":round(actual_width,2)})

    def paragraph(self, text, x, y, width, size=32, color=MUTED, family="body", leading=None, max_lines=None):
        leading = leading or round(size * 1.65)
        font = self.font(size, family)
        lines, current = [], ""
        for character in text:
            if character == "\n":
                lines.append(current)
                current = ""
            elif current and self.draw.textlength(current + character, font=font) > width:
                lines.append(current)
                current = character
            else:
                current += character
        if current:
            lines.append(current)
        if max_lines is not None:
            assert len(lines) <= max_lines, (text, lines)
        for i, value in enumerate(lines):
            self.text(value, x, y + i * leading, size, color, family, max_width=width)
        return y + len(lines) * leading

    def picture(self, path, x, y, width, height):
        source = Image.open(path).convert("RGB")
        ratio = min(width / source.width, height / source.height)
        size = (round(source.width * ratio), round(source.height * ratio))
        source = source.resize(size, Image.Resampling.LANCZOS)
        px, py = round(x + (width - size[0]) / 2), round(y + (height - size[1]) / 2)
        self.image.paste(source, (px, py))
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        self.svg.append(f'<image x="{px}" y="{py}" width="{size[0]}" height="{size[1]}" href="data:image/jpeg;base64,{encoded}"/>')

    def pill(self, text, x, y, fill=PALE, color=GREEN, size=25):
        width = math.ceil(self.draw.textlength(text, font=self.font(size))) + 38
        self.rect(x, y, width, size + 28, fill, radius=(size + 28) / 2)
        self.text(text, x + 19, y + 10, size, color)
        return width

    def save(self):
        output = ROOT / "assets"
        output.mkdir(exist_ok=True)
        png, svg = output / "creative-summary-v1.png", output / "creative-summary-v1.svg"
        self.image.save(png, optimize=True, dpi=(144,144))
        svg.write_text("\n".join(self.svg + ["</svg>"]), encoding="utf-8", newline="\n")
        metadata = {"date":"2026-11-16","size":[W,H],"method":"Pillow精确中文排版；同时输出原生SVG。未调用图片生成服务。","content_source":"summary-map.json；故事名称、编号和阶段读取stories.json；参考图映射读取research.json。","quoted_source":"https://x.com/VidusheWrites/status/2121596512878870615","text_blocks":len(self.text_log),"text_layout":self.text_log,"png_sha256":hashlib.sha256(png.read_bytes()).hexdigest(),"svg_sha256":hashlib.sha256(svg.read_bytes()).hexdigest()}
        (output / "creative-summary-v1.meta.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print(f"Rendered {png.name} ({W}×{H}); editable SVG; {len(self.text_log)} checked text blocks.")


def render():
    data = json.loads((ROOT / "summary-map.json").read_text(encoding="utf-8"))
    research = json.loads((ROOT / "research.json").read_text(encoding="utf-8"))
    archive = json.loads((ROOT / "stories.json").read_text(encoding="utf-8"))
    stories = {story["id"]: story for story in archive["stories"]}
    observations = {item["id"]: item for item in research["observations"]}
    used_ids = [story["id"] for direction in data["directions"] for story in direction["stories"]]
    assert len(used_ids) == 7 and set(used_ids) == set(stories), "图中必须恰好涵盖七份故事"
    assert len(data["abilities"]) == 6
    p = Poster()

    p.text("PROJECT 0011  /  CREATIVE FIELD NOTES", M, 88, 27, MUTED)
    p.text("2026.11.16", W-M, 88, 28, MUTED, "number", align="right")
    p.text(data["title"], M, 171, 126, INK, "serif")
    p.star(739, 234, 42)
    p.paragraph("让熟悉的生活动作，\n打开一个可以相信的奇妙世界。", 1350, 194, 920, 39, ROSE, leading=65, max_lines=2)
    p.text(data["subtitle"], M, 344, 46, INK)
    p.line(M, 441, W-M, 441)

    p.text("01", M, 500, 38, ROSE, "number")
    p.text("从原片读出的表达方式", M+95, 492, 52, INK, "serif")
    p.text("5处情境 · 约26秒 · 人物自然地对待奇妙", M, 576, 32, MUTED)
    gap, card_w = 26, (CONTENT-4*26)/5
    for i, item in enumerate(data["reference_labels"]):
        x, y = M + i*(card_w+gap), 646
        p.rect(x, y, card_w, 516, "#eae5d9", radius=10)
        p.picture(ROOT / "assets" / observations[item["id"]]["image"], x+43, y+25, card_w-86, 346)
        p.text(item["label"], x+card_w/2, y+394, 32, INK, align="center", max_width=card_w-25)
        p.text(item["mechanism"], x+card_w/2, y+452, 26, MUTED, align="center", max_width=card_w-25)
    p.text("上排为原片定位截图；完整运动与细节以原视频为准。", M, 1190, 25, MUTED)

    p.rect(M, 1260, CONTENT, 320, GREEN, radius=10)
    p.text("我们的创作提炼  /  从一个点子，到一整支片子", M+50, 1303, 29, "#cbd2bd")
    p.text(data["core"], M+50, 1370, 45, PAPER, max_width=CONTENT-100)
    p.text(data["correction"], M+50, 1453, 32, "#d4dac9", max_width=CONTENT-100)
    p.text(data["fixed"], M+50, 1517, 29, "#cbd2bd", max_width=CONTENT-100)

    p.text("02", M, 1667, 38, ROSE, "number")
    p.text("四个方向，七份故事", M+95, 1659, 52, INK, "serif")
    p.text("5个故事种子 + 2份完整方向", W-M, 1678, 30, MUTED, align="right")
    gap, card_w = 40, (CONTENT-40)/2
    for i, direction in enumerate(data["directions"]):
        x = M + (i % 2)*(card_w+gap)
        y, height = (1770, 465) if i < 2 else (2270, 525)
        p.rect(x, y, card_w, height, "#faf7ef", radius=10, stroke=LINE)
        p.text(direction["title"], x+37, y+35, 42, INK, "serif", max_width=card_w-74)
        if i < 2:
            p.pill("故事种子 · 时长未定", x+37, y+96, "#ebe9df", MUTED, 23)
            for j, item in enumerate(direction["stories"]):
                sy = y+178+j*86
                story = stories[item["id"]]
                assert story["stage"] == "seed"
                p.text(item["id"], x+37, sy+6, 25, ROSE, "number")
                p.text(story["title"], x+168, sy, 34, INK, max_width=card_w-210)
                p.text(item["beat"], x+168, sy+47, 27, MUTED, max_width=card_w-210)
            if i == 1:
                p.text(direction["note"], x+37, y+400, 28, ROSE, max_width=card_w-74)
        else:
            item = direction["stories"][0]
            story = stories[item["id"]]
            assert story["stage"] == "treatment"
            p.text(f"{item['id']}  {story['title']}", x+37, y+110, 36, INK, "bold", max_width=card_w-74)
            p.pill(f"完整方向 · 目标约{story['duration']}秒 · 待细化", x+37, y+170, "#e7ebdf", GREEN, 23)
            for j, scene in enumerate(item["scenes"]):
                sx, sy = x+37+(j%2)*((card_w-74)/2), y+255+(j//2)*65
                p.text(f"0{j+1}", sx, sy+2, 25, ROSE, "number")
                p.text(scene, sx+54, sy, 29, MUTED, max_width=(card_w-74)/2-68)
            p.text(direction["note"], x+37, y+460, 28, ROSE, max_width=card_w-74)

    p.text("03", M, 2890, 38, ROSE, "number")
    p.text("六项值得沉淀的创作能力", M+95, 2882, 52, INK, "serif")
    p.text("把方法写成可交接的产物，下一次从已有成果继续。", M, 2968, 32, MUTED)
    gap, cw = 30, (CONTENT-60)/3
    for i, ability in enumerate(data["abilities"]):
        x, y = M+(i%3)*(cw+gap), 3050+(i//3)*278
        p.rect(x, y, cw, 247, "#e8ecdf", radius=10)
        p.text(f"0{i+1}", x+28, y+34, 34, ROSE, "number")
        p.text(ability["title"], x+99, y+32, 35, INK, "bold", max_width=cw-127)
        p.paragraph(ability["body"], x+29, y+103, cw-58, 30, MUTED, leading=49, max_lines=2)
        p.text(ability["artifact"], x+29, y+193, 25, GREEN, max_width=cw-58)

    p.text("04", M, 3692, 38, ROSE, "number")
    p.text("沉淀到哪一步，也要说清楚", M+95, 3684, 52, INK, "serif")
    p.rect(M, 3792, CONTENT, 350, "#e9e3d6", radius=10)
    p.line(W/2, 3832, W/2, 4104, "#c9ccb9")
    p.text("已沉淀｜方法与文字资产", M+42, 3835, 37, GREEN, "bold")
    p.text("待验证｜实际制作能力", W/2+42, 3835, 37, ROSE, "bold")
    for i, line in enumerate(data["saved"]):
        p.text("· "+line, M+42, 3907+i*49, 29, INK, max_width=CONTENT/2-84)
    for i, line in enumerate(data["unverified"]):
        p.text("· "+line, W/2+42, 3907+i*49, 29, MUTED, max_width=CONTENT/2-84)
    p.text("下一步", M, 4212, 28, ROSE, "bold")
    p.text(data["next"], M+135, 4210, 31, INK, max_width=CONTENT-135)
    p.line(M, 4294, W-M, 4294)
    p.text("原片参考：@VidusheWrites · Loves sleeping（约25.73秒）", M, 4331, 25, MUTED)
    p.text("本库整理 · 0011 · 日常奇想", W-M, 4331, 25, MUTED, align="right")
    p.text("https://x.com/VidusheWrites/status/2121596512878870615", M, 4377, 22, MUTED)
    p.text("研究与文字方案已归档；视频未生成，参考效果未复现。原片画面权利归相关权利人。", M, 4420, 23, MUTED, max_width=CONTENT)
    p.save()


if __name__ == "__main__":
    render()

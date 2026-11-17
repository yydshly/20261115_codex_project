"""Render the complete study as matching, text-measured PNG and linked SVG.

Uses Pillow already installed on this Windows host. No remote fonts or assets.
The full figure expands all interactive details; the conversion crop is derived
from the same drawing, rather than taking a screenshot of one selected state.
"""
from __future__ import annotations

from html import escape
import hashlib
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
W, MAX_H, M = 3200, 7400, 120
INNER = W - M * 2
PAPER, WHITE, INK = "#F5F3ED", "#FFFEFA", "#18363B"
MUTED, LINE = "#52666A", "#D6DFDA"
TEAL, TEAL_SOFT = "#286C60", "#E6F0EB"
AMBER, AMBER_SOFT = "#98622B", "#F3EBDD"
FONT = Path("C:/Windows/Fonts/msyh.ttc")
BOLD = Path("C:/Windows/Fonts/msyhbd.ttc")


class Drawing:
    def __init__(self):
        self.image = Image.new("RGB", (W, MAX_H), PAPER)
        self.draw = ImageDraw.Draw(self.image)
        self.svg = []
        self.fonts = {}
        self.bounds = []
        self.edges = []
        self.crop_bounds = {}

    def font(self, size, bold=False):
        key = size, bold
        if key not in self.fonts:
            self.fonts[key] = ImageFont.truetype(str(BOLD if bold else FONT), size)
        return self.fonts[key]

    def width(self, value, size, bold=False):
        return self.draw.textlength(value, font=self.font(size, bold))

    def rect(self, x, y, w, h, fill=WHITE, radius=16, stroke=LINE, sw=2):
        self.draw.rounded_rectangle((x, y, x + w, y + h), radius, fill, stroke, sw)
        self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke or "none"}" stroke-width="{sw}"/>')

    def text(self, value, x, y, size=32, color=INK, bold=False, width=None):
        measured = self.width(value, size, bold)
        if width is not None and measured > width + 1:
            raise ValueError(f"Text exceeds its column: {value} ({measured:.1f}/{width})")
        if not 0 <= x <= x + measured <= W or y < 0 or y + size > MAX_H:
            raise ValueError("Text exceeds canvas: " + value)
        self.draw.text((x, y), value, font=self.font(size, bold), fill=color, anchor="lt")
        self.svg.append(f'<text x="{x:.1f}" y="{y + size * .88:.1f}" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{escape(value)}</text>')
        self.bounds.append({"text": value, "x": x, "y": y, "width": measured, "height": size})

    def wrap(self, value, x, y, width, size=32, color=INK, bold=False, leading=None, max_lines=5):
        lines = []
        for para in value.split("\n"):
            line = ""
            for char in para:
                if line and self.width(line + char, size, bold) > width:
                    if char in "，。；：！？、）》”’" and len(line) > 1:
                        lines.append(line[:-1])
                        line = line[-1] + char
                    else:
                        lines.append(line)
                        line = char
                else:
                    line += char
            lines.append(line)
        if len(lines) > max_lines:
            raise ValueError(f"Too many lines ({len(lines)}/{max_lines}): {value}")
        leading = leading or round(size * 1.45)
        for row, line in enumerate(lines):
            self.text(line, x, y + row * leading, size, color, bold, width)
        return len(lines) * leading

    def path(self, points, color=TEAL, dashed=False, relation=""):
        coords = " ".join(f"{x},{y}" for x, y in points)
        dash = ' stroke-dasharray="12 10"' if dashed else ""
        self.svg.append(f'<polyline points="{coords}" fill="none" stroke="{color}" stroke-width="4" stroke-linejoin="round"{dash}/>')
        for start, end in zip(points, points[1:]):
            length = math.dist(start, end)
            if dashed:
                for offset in range(0, int(length), 22):
                    a, b = offset / length, min(offset + 12, length) / length
                    self.draw.line((start[0] + (end[0] - start[0]) * a, start[1] + (end[1] - start[1]) * a, start[0] + (end[0] - start[0]) * b, start[1] + (end[1] - start[1]) * b), fill=color, width=4)
            else:
                self.draw.line((*start, *end), fill=color, width=4)
        previous, end = points[-2:]
        angle = math.atan2(end[1] - previous[1], end[0] - previous[0])
        for delta in (-.55, .55):
            head = (end[0] - 17 * math.cos(angle + delta), end[1] - 17 * math.sin(angle + delta))
            self.draw.line((*head, *end), fill=color, width=4)
            self.svg.append(f'<line x1="{head[0]}" y1="{head[1]}" x2="{end[0]}" y2="{end[1]}" stroke="{color}" stroke-width="4"/>')
        self.edges.append({"points": points, "relation": relation, "kind": "control" if dashed else "delivery"})

    def section(self, number, title, y, note):
        self.text(number, M, y + 9, 33, TEAL, True)
        self.text(title, M + 90, y, 55, INK, True, INNER - 90)
        self.wrap(note, M, y + 77, INNER, 31, MUTED, max_lines=2)

    def block(self, x, y, title, lines, fill=WHITE, h=310, size=32):
        self.rect(x, y, 900, h, fill)
        self.text(title, x + 28, y + 25, 39, INK, True, 844)
        current = y + 93
        for line in lines:
            current += self.wrap(line, x + 28, current, 844, size, MUTED, leading=47, max_lines=2)
        if current > y + h - 12:
            raise ValueError("Block too short: " + title)

    def role(self, role, x, y, color, original=False):
        self.rect(x, y, 900, 300, WHITE)
        label = (role.get("code", "") + " · " if original else "") + role["name"]
        self.text(label, x + 28, y + 24, 40, INK, True, 844)
        self.rect(x + 28, y + 76, 72, 5, color, 0, None, 0)
        for index, (prefix, key) in enumerate((("输入", "input"), ("需要", "tools"), ("交付", "output"), ("价值", "value"))):
            self.text(prefix + "：" + role[key], x + 28, y + 94 + index * 39, 31, MUTED, width=844)
        self.text("边界：" + role["limit"], x + 28, y + 260, 25, color, width=844)

    def linked_text(self, value, url, x, y, width, size=28):
        self.svg.append(f'<a href="{escape(url, quote=True)}" target="_blank" rel="noopener noreferrer"><title>{escape(url)}</title>')
        self.wrap(value, x, y, width, size, TEAL, max_lines=2)
        self.svg.append('</a>')

    def save(self, height, crops):
        if any(b["y"] + b["height"] > height for b in self.bounds):
            raise ValueError("Figure clips text at its lower edge")
        body = "\n".join(self.svg)
        def svg_document(y, h):
            title = "定制 Bot：从交易岗位到研究协作" if y == 0 else "重点转换：八个交易岗位到五个研究岗位"
            description = ("完整展开8个交易岗位、5个研究岗位、输入工具交付价值、五组功能迁移、讨论脉络及未验证边界。原帖收益与官方归属未核实，研究自动化未部署。" if y == 0 else "原帖岗位按功能合并、保留、替换和抽象新增，形成五个研究岗位。EXIT到适配评估包含新的研究判断，不是等价改名。这是研究设计，未部署。")
            return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{h}" viewBox="0 {y} {W} {h}" role="img" aria-labelledby="figure-title figure-desc">
<title id="figure-title">{title}</title>
<desc id="figure-desc">{description}</desc>
<style>text{{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif}}a:hover text{{text-decoration:underline}}</style>
<rect x="0" y="{y}" width="{W}" height="{h}" fill="{PAPER}"/>
{body}
</svg>'''
        self.image.crop((0, 0, W, height)).save(ASSETS / "bot-role-overview.png", optimize=True)
        full = svg_document(0, height)
        (ASSETS / "bot-role-overview.svg").write_text(full, encoding="utf-8", newline="\n")
        for name, (y, h) in crops.items():
            self.image.crop((0, y, W, y + h)).save(ASSETS / (name + ".png"), optimize=True)
            (ASSETS / (name + ".svg")).write_text(svg_document(y, h), encoding="utf-8", newline="\n")
        y, h = crops["role-conversion"]
        thumb = self.image.crop((0, y, W, y + h))
        thumb.thumbnail((1600, 1000), Image.Resampling.LANCZOS)
        thumb.save(ASSETS / "overview-preview.jpg", quality=90, optimize=True)
        hrefs = {el.attrib["href"] for el in ET.fromstring(full).iter() if "href" in el.attrib}
        return hrefs


def main():
    data = json.loads((ROOT / "research.json").read_text(encoding="utf-8"))
    d = Drawing()
    original = {r["id"]: r for r in data["trading_roles"]}
    research = {r["id"]: r for r in data["research_roles"]}
    cols = [120, 1150, 2180]
    d.text("0018  /  BOT ROLE RESEARCH", M, 85, 31, TEAL, True)
    d.text("从交易岗位，到研究协作", M, 169, 99, INK, True)
    d.text("把一张可点击关系图，展开成可独立阅读的完整研究图。", M, 306, 41, MUTED)
    d.text("2026.11.16  ·  原帖描述 / 我们的判断 / 研究迁移设计分别标明", M, 371, 29, MUTED)

    d.section("01", "原帖讲什么：链上代币交易的分工方案", 460, "以下数字和产品能力来自作者叙述；具体币种未公开，偏向小币是语境推断。[S1–S2]")
    d.block(cols[0], 595, "作者宣称的成效", ["8 个 Agent · 每月 200 美元", "164 代币 → 21 候选 → 8 次交易", "上周净赚 8,700 美元", "马斯克转发等说法均未核实"], AMBER_SOFT, h=360)
    d.block(cols[1], 595, "实际讨论的交易对象", ["合约 / 钱包 / 资金池 / 链上交易", "对象：链上代币，不是公司股权", "区块链记录持有与转移，不保证价值", "偏小币、可能含迷因币属于推断", "具体币种、本金与完整交易记录未知"], h=360)
    d.block(cols[2], 595, "本库当前做了什么", ["读取原帖与教程文字，整理讨论", "原视频未完成实播核验", "官方归属、费用与能力未独立核验", "未运行交易或研究机器人"], TEAL_SOFT, h=360)

    d.section("02", "身份如何变成能力：四层关系缺一不可", 990, data["thesis"])
    for index, layer in enumerate(data["capability_layers"]):
        x = M + index * 760
        d.rect(x, 1125, 680, 200, WHITE)
        d.text(layer["name"], x + 26, 1150, 42, INK, True, 628)
        d.wrap(layer["detail"], x + 26, 1214, 628, 31, MUTED, max_lines=2)
        if index < 3:
            d.path([(x + 691, 1220), (x + 748, 1220)], relation="能力层衔接")
    d.text("身份名称本身不会新增执行能力；多个 Bot 也不能自动成为彼此隔离的安全环境。", M, 1362, 34, AMBER, width=INNER)

    d.section("03", "交互图展开：8 个交易岗位如何关联", 1450, "按原帖描述整理的功能示意，非实测系统架构；每岗同时展开输入、工具、交付、价值与边界。[S1–S2]")
    d.rect(1150, 1585, 900, 120, AMBER_SOFT)
    d.text("人工审批：关键选择与敏感步骤", 1180, 1607, 36, INK, True, 840)
    d.text("目标 · 边界 · 接管；由总协调员衔接", 1180, 1660, 28, MUTED, width=840)
    d.path([(1600, 1717), (1600, 1758)], AMBER, True, "人工审批 → 总协调")
    for start, end in [([(1032, 1920), (1138, 1920)], "SEARCH → HEAD"), ([(1032, 2285), (1080, 2285), (1080, 1944), (1138, 1944)], "WHALE → HEAD"), ([(1032, 2650), (1050, 2650), (1050, 1968), (1138, 1968)], "SHILL → HEAD"), ([(1600, 2082), (1600, 2198)], "HEAD → RISK"), ([(2062, 2360), (2115, 2360), (2115, 1920), (2168, 1920)], "RISK → SNIPER"), ([(2630, 2082), (2630, 2123)], "SNIPER → RUG"), ([(3092, 1920), (3150, 1920), (3150, 2650), (3092, 2650)], "SNIPER → EXIT"), ([(2168, 2285), (2145, 2285), (2145, 2820), (2062, 2820)], "RUG → 退出记录"), ([(2168, 2650), (2100, 2650), (2100, 2845), (2062, 2845)], "EXIT → 退出记录")]:
        d.path(start, AMBER, relation=end)
    for rid, col, y in [("search",0,1770),("whale",0,2135),("shill",0,2500),("head",1,1770),("risk",1,2210),("sniper",2,1770),("rug",2,2135),("exit",2,2500)]:
        d.role(original[rid], cols[col], y, AMBER, True)
    d.rect(1150, 2740, 900, 170, AMBER_SOFT)
    d.wrap("预期：减少盯盘，保留交易与退出记录", 1178, 2768, 844, 36, INK, True, max_lines=2)
    d.text("收益与执行效果未验证", 1178, 2864, 29, AMBER)

    conversion_y = 3000
    d.section("04", "重点转换：从 8 个交易岗，到 5 个研究岗", conversion_y, "按功能重新合并、保留、替换与新增；不是把 8 个名字机械改成 5 个名字。以下映射是我们的设计。")
    d.text("原帖岗位与可抽象功能", 148, 3138, 30, MUTED)
    d.text("研究岗位", 1158, 3138, 30, MUTED)
    d.text("转换后的能力与交付", 1825, 3138, 30, MUTED)
    for row, mapping in enumerate(data["conversions"]):
        y = 3205 + row * 195
        d.rect(120, y, 890, 175, AMBER_SOFT)
        codes = " / ".join(original[r]["code"] for r in mapping["from"])
        d.text(codes, 148, y + 24, 35, INK, True, 834)
        d.wrap(mapping["keep"], 148, y + 88, 834, 30, MUTED, max_lines=2)
        d.path([(1024, y + 102), (1116, y + 102)], TEAL, relation=mapping["type"] + " → " + research[mapping["to"]]["name"])
        d.text(mapping["type"], 1014, y + 42, 22, TEAL, width=112)
        d.rect(1130, y, 600, 175, TEAL_SOFT)
        d.text(research[mapping["to"]]["name"], 1158, y + 29, 42, INK, True, 544)
        d.wrap(mapping["deliverable"], 1158, y + 96, 544, 29, MUTED, max_lines=2)
        d.wrap(mapping["change"], 1825, y + 22, 1255, 31, INK, max_lines=3)
    d.text("特别注意：EXIT → 适配评估包含新增的研究判断；它与止盈止损不构成等价替换。", 120, 4205, 31, AMBER, width=INNER)

    d.section("05", "研究图：把散乱线索变成有依据的研究卡片", 4300, "这是尚未部署的迁移示意；岗位交接强调证据、适用性和下一步试验，不把自动收集等同于完成研究。")
    d.rect(120, 4435, 900, 120, TEAL_SOFT)
    d.text("输入：GitHub / X 的公开线索", 148, 4461, 37, INK, True, 844)
    d.text("保留原始链接、发现时间与覆盖限制", 148, 4513, 28, MUTED, width=844)
    d.rect(1150, 4435, 900, 120, TEAL_SOFT)
    d.text("人定方向：兴趣、当前问题与研究取舍", 1178, 4461, 35, INK, True, 844)
    d.text("反馈到筛选标准；重要取舍保留人工决策", 1178, 4513, 28, MUTED, width=844)
    for points, name, control in [([(570,4567),(570,4618)],"线索 → 发现",False), ([(1032,4780),(1138,4780)],"发现 → 核验",False), ([(2062,4780),(2168,4780)],"核验 → 适配",False), ([(2630,4942),(2630,4998),(570,4998),(570,5038)],"适配 → 协调",False), ([(1032,5200),(1138,5200)],"协调 → 整理",False), ([(2062,5200),(2168,5200)],"整理 → 交付",False), ([(1138,4495),(1080,4495),(1080,5150),(1032,5150)],"人工目标 → 协调",True)]:
        d.path(points, TEAL, control, name)
    for rid, col, y in [("discover",0,4630),("verify",1,4630),("fit",2,4630),("coordinate",0,5050),("document",1,5050)]:
        d.role(research[rid], cols[col], y, TEAL)
    d.block(2180, 5050, "预期价值结果", ["候选为什么值得看，有证据可查", "说明与已有项目的关系及增量", "给出一个可执行的最小试验", "保留暂缓、未知与失败的理由"], TEAL_SOFT, h=300, size=31)

    d.section("06", "讨论的认识变化：交易对象、价值与可借鉴部分", 5440, "以下为讨论结论与判断边界；不作投资建议，也不把所有加密资产或小币一概定性。[S3–S7]")
    d.block(120, 5575, "小币：接盘与赌博性质", ["无实用或收入支撑、只靠热度转售时，", "盈利依赖后续买家，赌博性质很强。", "卖出需要买家本身，不足以证明骗局。", "股票代表公司所有权，可由经营支撑。", "小币名称本身不能作法律定性。"], h=350)
    d.block(1150, 5575, "比特币：功能与价格要分开", ["价值主张：点对点转账、有限发行、", "自行保管与网络接受；不产企业利润。", "这些功能不能推出固定合理价格，", "只靠涨价获利仍依赖后续买家。"], h=350)
    d.block(2180, 5575, "我们的选择：借鉴协作机制", ["围绕明确问题组织搜集、核验和判断。", "角色数量、名称和 AI 都不保证正确。", "图表与网页是研究成果；", "自动采集、定时与机器人尚未部署。"], TEAL_SOFT, h=350)

    d.section("07", "证据与边界：把宣称、设计与已完成内容分开", 5980, "本图为本库原创研究整理，不是机器人运行截图；产品归属、收益和真实执行能力保留未核实说明。")
    d.block(120, 6115, "原作者宣称", ["8 个交易岗位与云端执行方式", "费用、收益、扫描及成交数量", "马斯克转发与 Grok Bot 官方归属"], AMBER_SOFT, h=260, size=30)
    d.block(1150, 6115, "我们的推断与设计", ["交易偏向小币的语境判断", "8 岗位 → 5 岗位的功能迁移", "研究图的交接、筛选和价值目标"], h=260, size=30)
    d.block(2180, 6115, "本轮实际交付", ["讨论记录、来源与能力边界", "完整 PNG / SVG 与转换图", "交互阅读页；验证范围另见记录"], TEAL_SOFT, h=260, size=30)
    d.wrap("环境表述需要区分：原帖称各 Agent 有浏览器、终端与记忆；教程称同账号共享一台云电脑、文件和登录会话。后者也未经官方文档独立核验。[S1–S2]", M, 6425, INNER, 32, AMBER, max_lines=2)
    d.text("原始来源与基础资料（SVG 中标题可点击；完整链接与访问说明见网页及 assets/SOURCES.md）", M, 6560, 31, INK, True, INNER)
    labels = [
        ("S1  原帖 / 8 岗位与收益宣称", "x.com/Bober_smart/status/2121686230467285097"),
        ("S2  关联教程 / 身份、工具、共享环境与审批", "x.com/Bober_smart/status/2091901718061531571"),
        ("S3  SEC 工作人员 / 典型迷因币的用途与风险", "sec.gov · Staff Statement on Meme Coins"),
        ("S4  Bitcoin 白皮书 / 点对点支付的技术设计", "bitcoin.org/bitcoin.pdf"),
        ("S5  Bitcoin.org FAQ / 发行、使用与失败风险", "bitcoin.org/en/faq · 项目社区来源"),
        ("S6  Investor.gov / Bitcoin、Ether ETP 风险", "Investor Bulletin · 2024-09-09"),
        ("S7  Investor.gov / 股票所有权与分红", "Stocks – FAQs"),
        ("S8  Ethereum.org / 加密货币与以太币基本用途", "ethereum.org · 以太币技术简介")
    ]
    for index, (label, short_url) in enumerate(labels):
        x = M + (index % 2) * 1530
        y = 6630 + (index // 2) * 112
        d.linked_text(label, data["sources"][index]["url"], x, y, 1430, 28)
        d.text(short_url, x, y + 46, 25, MUTED, width=1430)
    d.text("0018 · 定制 Bot 研究  /  原帖方案未实测 · 研究自动化未部署 · 本地整理，尚未公开发布", M, 7148, 28, MUTED, width=INNER)
    height = 7230
    crop = {"role-conversion": (2960, 1320)}
    hrefs = d.save(height, crop)
    expected = {s["url"] for s in data["sources"]}
    if hrefs != expected:
        raise ValueError("Source link coverage differs from research.json")
    covered = {rid for c in data["conversions"] for rid in c["from"]}
    if covered != set(original) or {c["to"] for c in data["conversions"]} != set(research):
        raise ValueError("Conversion does not cover every role")
    record = {
        "generated_on": data["date"], "kind": "original-research-illustration", "width": W, "height": height,
        "trading_roles": list(original), "research_roles": list(research), "conversion_groups": len(data["conversions"]),
        "conversion_crop": {"y": crop["role-conversion"][0], "height": crop["role-conversion"][1]},
        "conversion_rows": [{"from": item["from"], "to": item["to"], "rect": [120, 3205 + row * 195, 2960, 175]} for row, item in enumerate(data["conversions"])],
        "source_links": sorted(hrefs), "text_items": len(d.bounds), "text_bounds_checked": True,
        "edges": d.edges, "font": "Installed Microsoft YaHei; font files are not redistributed",
        "scope": data["scope"],
        "files": [{"path": name, "sha256": hashlib.sha256((ASSETS / name).read_bytes()).hexdigest()} for name in ("bot-role-overview.png", "bot-role-overview.svg", "role-conversion.png", "role-conversion.svg", "overview-preview.jpg")],
    }
    (ASSETS / "figure-manifest.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"width": W, "height": height, "roles": [len(original), len(research)], "conversions": 5, "sources": len(hrefs), "text_items": len(d.bounds)}))


if __name__ == "__main__":
    main()

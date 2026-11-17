"""Typeset one Chinese research map as PNG and editable, linked SVG.

Creates an original text-and-vector diagram, without image generation or editing
any source photograph. All copy comes from understanding-map.json.
"""
from pathlib import Path
from html import escape
import hashlib
import json
import math
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
WIDTH, MARGIN, GAP = 2400, 100, 30
INNER = WIDTH - 2 * MARGIN
PAPER, WHITE = '#F4F3ED', '#FCFCF7'
INK, GREEN, MUTED = '#243C31', '#42654A', '#657764'
LINE, PALE, GOLD = '#CED8C8', '#E7ECDF', '#C0A578'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class Drawing:
    def __init__(self):
        self.ops = []
        self.fonts = {}
        self.measure = ImageDraw.Draw(Image.new('RGB', (1, 1)))
        self.text_records, self.regions = [], []

    def font(self, size, bold=False):
        key = (size, bold)
        if key not in self.fonts:
            name = 'msyhbd.ttc' if bold else 'msyh.ttc'
            self.fonts[key] = ImageFont.truetype('C:/Windows/Fonts/' + name, size)
        return self.fonts[key]

    def text_width(self, text, size, bold=False):
        return self.measure.textlength(text, font=self.font(size, bold))

    def lines(self, text, width, size, bold=False):
        result = []
        for paragraph in text.split('\n'):
            line = ''
            for char in paragraph:
                if line and self.text_width(line + char, size, bold) > width:
                    if char in '，。；：！？、）》】”’' and len(line) > 1:
                        result.append(line[:-1])
                        line = line[-1] + char
                    else:
                        result.append(line)
                        line = char
                else:
                    line += char
            result.append(line)
        return result

    def text(self, text, x, y, size=34, color=INK, bold=False, link=None):
        width = self.text_width(text, size, bold)
        assert 0 <= x <= x + width <= WIDTH, ('Text outside image', text)
        self.ops.append(('text', text, x, y, size, color, bold, link))
        self.text_records.append({'text': text, 'x': x, 'y': y, 'width': width, 'size': size})

    def wrap(self, text, x, y, width, size=34, color=MUTED, bold=False, leading=None):
        leading = leading or round(size * 1.55)
        for index, line in enumerate(self.lines(text, width, size, bold)):
            self.text(line, x, y + index * leading, size, color, bold)
        return len(self.lines(text, width, size, bold)) * leading

    def rect(self, x, y, width, height, fill=WHITE, stroke=LINE, radius=20):
        self.ops.append(('rect', x, y, width, height, fill, stroke, radius))

    def line(self, x1, y1, x2, y2, color=LINE, width=3):
        self.ops.append(('line', x1, y1, x2, y2, color, width))

    def arrow(self, x1, y, x2, color=GREEN):
        self.line(x1, y, x2 - 9, y, color, 4)
        self.line(x2 - 25, y - 13, x2 - 9, y, color, 4)
        self.line(x2 - 25, y + 13, x2 - 9, y, color, 4)

    def heading(self, number, title, subtitle, y):
        y += 55
        top = y
        self.line(MARGIN, y, WIDTH - MARGIN, y)
        self.text(number, MARGIN, y + 31, 30, GREEN, True)
        used = self.wrap(title, MARGIN + 88, y + 25, INNER - 88, 53, INK, True, 76)
        y += 25 + used + 17
        if subtitle:
            y += self.wrap(subtitle, MARGIN, y, INNER, 33, MUTED, leading=50) + 22
        else:
            y += 12
        self.regions.append({'number': number, 'title': title, 'top': top})
        return y

    def cards(self, items, y, columns=2, value_cards=False):
        width = (INNER - GAP * (columns - 1)) / columns
        pad, body_size = 34, 34
        for start in range(0, len(items), columns):
            row = items[start:start + columns]
            heights = []
            for item in row:
                title_lines = len(self.lines(item['title'], width - pad * 2, 42, True))
                body_lines = len(self.lines(item['text'], width - pad * 2, body_size))
                height = pad * 2 + title_lines * 61 + 20 + body_lines * 53
                if value_cards:
                    height += 18 + len(self.lines(item['result'], width - pad * 2, 31, True)) * 47
                heights.append(height)
            height = max(heights)
            for index, item in enumerate(row):
                x = MARGIN + index * (width + GAP)
                self.rect(x, y, width, height)
                cursor = y + pad
                cursor += self.wrap(item['title'], x + pad, cursor, width - pad * 2, 42, INK, True, 61) + 20
                cursor += self.wrap(item['text'], x + pad, cursor, width - pad * 2, body_size, MUTED, leading=53)
                if value_cards:
                    cursor += 18
                    cursor += self.wrap(item['result'], x + pad, cursor, width - pad * 2, 31, GREEN, True, 47)
                assert cursor <= y + height - pad + 1, item['title']
            y += height + GAP
        return y - GAP

    def save(self, height, data):
        height = math.ceil(height)
        assert height < 7200, height
        assert all(t['y'] + t['size'] <= height for t in self.text_records)
        output = ASSETS / 'understanding-map-v1.png'
        vector = ASSETS / 'understanding-map-v1.svg'
        image = Image.new('RGB', (WIDTH, height), PAPER)
        draw = ImageDraw.Draw(image)
        svg = []
        for op in self.ops:
            if op[0] == 'rect':
                _, x, y, w, h, fill, stroke, radius = op
                draw.rounded_rectangle((x, y, x + w, y + h), radius, fill, stroke, 2)
                svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke or "none"}" stroke-width="2"/>')
            elif op[0] == 'line':
                _, x1, y1, x2, y2, color, width = op
                draw.line((x1, y1, x2, y2), color, width)
                svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"/>')
            else:
                _, text, x, y, size, color, bold, link = op
                draw.text((x, y), text, font=self.font(size, bold), fill=color, anchor='lt')
                element = f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{700 if bold else 400}" dominant-baseline="text-before-edge">{escape(text)}</text>'
                svg.append(f'<a href="{escape(link,quote=True)}" target="_blank">{element}</a>' if link else element)
        image.save(output, compress_level=7)
        doc = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{height}" viewBox="0 0 {WIDTH} {height}" role="img" aria-labelledby="title desc"><title id="title">{escape(data['title'])}</title><desc id="desc">本次对话的理解汇总，重点展开价值、创作路径与写春的迁移；试片只作验证。</desc><style>text{{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif}}</style><rect width="{WIDTH}" height="{height}" fill="{PAPER}"/>{''.join(svg)}</svg>'''
        vector.write_text(doc, encoding='utf-8')
        ET.fromstring(doc)
        qa = ROOT / '.local' / 'understanding-map-qa'
        qa.mkdir(parents=True, exist_ok=True)
        overview = image.copy()
        overview.thumbnail((1000, 4000), Image.Resampling.LANCZOS)
        overview.save(qa / 'whole-preview.jpg', quality=95)
        for item in self.regions:
            top = max(0, round(item['top'] - 15))
            part = image.crop((0, top, WIDTH, min(top + 1350, height)))
            part.thumbnail((1600, 1000), Image.Resampling.LANCZOS)
            part.save(qa / (item['number'] + '.jpg'), quality=95)
        preview = image.crop((0, 0, WIDTH, min(height, 1220)))
        preview.thumbnail((1200, 900), Image.Resampling.LANCZOS)
        preview_path = ASSETS / 'understanding-map-preview.jpg'
        preview.save(preview_path, quality=94)
        record = {
            'schema_version': 1, 'date': data['date'], 'width': WIDTH, 'height': height,
            'method': 'Original Chinese text and vector typesetting in Python/Pillow and SVG; no new AI generation or source-image editing',
            'focus': '理解、价值、创作路径；试片作为后续验证',
            'source_files': [{'file': name, 'sha256': sha(ROOT / name)} for name in ('analysis.json', 'understanding-map.json', 'scripts/make_understanding_map.py')],
            'files': [{'file': path.name, 'bytes': path.stat().st_size, 'sha256': sha(path)} for path in (output, vector, preview_path)],
            'sections': self.regions, 'text_bounds_checked': True,
            'rendered_text_characters': sum(len(t['text']) for t in self.text_records),
            'new_generation_credits': 0, 'visual_review': 'pending'
        }
        (ASSETS / 'understanding-map-manifest.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (qa / 'text-bounds.json').write_text(json.dumps(self.text_records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'png': str(output), 'svg': str(vector), 'width': WIDTH, 'height': height, 'text_characters': record['rendered_text_characters']}, ensure_ascii=False))


def main():
    data = json.loads((ROOT / 'understanding-map.json').read_text(encoding='utf-8'))
    b = Drawing()
    b.text('风与春  /  理解 · 价值 · 创作思路', MARGIN, 62, 28, GREEN, True)
    b.text('0020    /    2026.11.17', 1920, 64, 25, MUTED)
    y = 134
    y += b.wrap(data['title'], MARGIN, y, INNER, 86, INK, True, 116) + 18
    y += b.wrap(data['subtitle'], MARGIN, y, INNER, 38, MUTED, leading=58) + 45

    # Two concurrent roles; attention expands while the emotional relation remains.
    top = y
    quote_h = len(b.lines('“' + data['core_quote'] + '”', INNER - 88, 49, True)) * 74
    body_h = len(b.lines(data['core'], INNER - 88, 35)) * 55
    panel_h = 40 + 55 + quote_h + 18 + body_h + 35 + 215 + 70 + 36
    b.rect(MARGIN, top, INNER, panel_h, INK, None, 26)
    y += 40
    b.text('共同明确的核心关系  /  用户原话节录', MARGIN + 44, y, 27, '#C3B084', True)
    y += 55
    y += b.wrap('“' + data['core_quote'] + '”', MARGIN + 44, y, INNER - 88, 49, '#F4F3E8', True, 74) + 18
    y += b.wrap(data['core'], MARGIN + 44, y, INNER - 88, 35, '#C9D9C1', leading=55) + 35
    role_w = (INNER - 176) / 3
    for index, item in enumerate(data['roles']):
        x = MARGIN + 44 + index * (role_w + 44)
        b.text(item['name'], x, y, 48, '#F3F4E8', True)
        b.text(item['role'], x, y + 73, 32, '#C3B084', True)
        b.wrap(item['text'], x, y + 126, role_w, 32, '#C9D9C1', leading=49)
        if index < 2:
            b.arrow(x + role_w - 3, y + 90, x + role_w + 33, '#C4B68D')
    y += 237
    b.line(MARGIN + 44, y, WIDTH - MARGIN - 44, y, '#687B65', 2)
    y += 24
    b.wrap(data['continuity'], MARGIN + 44, y, INNER - 88, 33, '#D8DFC4', True, 51)
    y = top + panel_h + 28

    # A compact trace keeps the reference and the correction visible.
    origin_w = (INNER - 2 * GAP) / 3
    origin_h = 166
    for index, item in enumerate(data['origin']):
        x = MARGIN + index * (origin_w + GAP)
        b.text(item['label'], x, y, 27, GREEN, True)
        b.wrap(item['text'], x, y + 44, origin_w - 15, 33, INK, leading=51)
    y += origin_h
    y += b.wrap(data['reference_note'], MARGIN, y, INNER, 30, MUTED, leading=47)

    y = b.heading('01', '这个理解，给我们的四项价值', '从“喜欢一个效果”，走到能解释、能创作、能迁移、能校准。', y)
    y = b.cards(data['values'], y, value_cards=True)

    y = b.heading('02', '把理解变成创作：一条可以使用的路径', '', y)
    b.rect(MARGIN, y, INNER, 169, PALE, None, 18)
    b.text(data['principle'], MARGIN + 35, y + 27, 57, INK, True)
    b.text(data['principle_text'], MARGIN + 35, y + 108, 35, GREEN)
    y += 199
    for index, item in enumerate(data['steps'], 1):
        title_x, body_x = MARGIN + 88, MARGIN + 625
        body_w = WIDTH - MARGIN - body_x
        body_h = len(b.lines(item['text'], body_w, 34)) * 53
        title_h = len(b.lines(item['title'], 490, 39, True)) * 59
        row_h = max(body_h, title_h) + 42
        b.text(f'{index:02}', MARGIN, y + 3, 34, GREEN, True)
        b.wrap(item['title'], title_x, y, 490, 39, INK, True, 59)
        b.wrap(item['text'], body_x, y, body_w, 34, MUTED, leading=53)
        b.line(MARGIN, y + row_h - 20, WIDTH - MARGIN, y + row_h - 20)
        y += row_h

    y = b.heading('03', data['spring_title'], data['spring_intro'], y)
    y = b.cards(data['spring_layers'], y)
    y += 30
    example = data['spring_example']
    ex_top = y
    ex_h = 302
    b.rect(MARGIN, y, INNER, ex_h, PALE, None)
    b.text(example['label'], MARGIN + 35, y + 25, 29, GREEN, True)
    b.text('“' + example['intent'] + '”', MARGIN + 35, y + 77, 43, INK, True)
    path_y = y + 160
    positions = [MARGIN + 35, MARGIN + 690, MARGIN + 1480]
    for index, (label, x) in enumerate(zip(example['path'], positions)):
        b.text(label, x, path_y, 34, GREEN, True)
        if index < 2:
            b.arrow(x + b.text_width(label, 34, True) + 30, path_y + 19, positions[index + 1] - 28)
    b.text(example['note'], MARGIN + 35, y + 240, 29, MUTED)
    y = ex_top + ex_h + 26
    extension_width = (INNER - 2 * GAP) / 3
    for index, item in enumerate(data['extensions']):
        x = MARGIN + index * (extension_width + GAP)
        b.text(item['name'], x, y, 39, GREEN, True)
        b.wrap(item['text'], x + 66, y + 3, extension_width - 70, 30, MUTED, leading=46)
    y += 115

    y = b.heading('04', data['trial']['title'], '', y)
    y += b.wrap(data['trial']['text'], MARGIN, y, INNER, 34, MUTED, leading=53) + 13
    y += b.wrap(data['trial']['status'], MARGIN, y, INNER, 32, MUTED, leading=49) + 16
    y += b.wrap(data['trial']['lesson'], MARGIN, y, INNER, 37, GREEN, True, 57) + 35
    box_h = len(b.lines(data['takeaway'], INNER - 72, 43, True)) * 67 + 64
    b.rect(MARGIN, y, INNER, box_h, INK, None, 20)
    b.wrap(data['takeaway'], MARGIN + 36, y + 32, INNER - 72, 43, '#F4F3E8', True, 67)
    y += box_h + 40
    b.text('原始参考  /  @purelivn · my favorite weather', MARGIN, y, 27, GREEN, True, data['source_url'])
    y += 43
    b.text(data['source_url'], MARGIN, y, 25, MUTED, link=data['source_url'])
    y += 47
    y += b.wrap(data['boundaries'], MARGIN, y, INNER, 25, MUTED, leading=39) + 45
    b.save(y, data)


if __name__ == '__main__':
    main()

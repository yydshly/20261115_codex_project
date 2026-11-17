"""Build the curated research home, complete document archive and local search index.

Only Python's standard library is used. Markdown is escaped before rendering;
the small renderer covers this project's headings, lists, links, images, tables
and code blocks. Original Markdown/JSON remains available alongside each page.
"""
from pathlib import Path
from urllib.parse import urlsplit, quote
import hashlib
import html
import json
import posixpath
import re

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
UPDATED = '2026-11-17'
CATALOG = [
    ('analysis.md', 'analysis', '原作综合分析', '原作证据', '原片结构、设计规划与证据边界。', '基于原片的研究解读'),
    ('scene-notes.md', 'scene-notes', '逐幕分析全文', '原作证据', '20个艺术场景与真实结尾，每条保留八项分析。', '21条原片证据'),
    ('creative-framework.md', 'creative-framework', '创作思路与规划卡', '方法与方向', '艺术、历史、氛围优先，记录讨论中的持续修正。', '方法提炼 / 含阶段性记录'),
    ('experiments.md', 'experiments', '白鸟动效试验', '实验与反馈', '媒介、尺度与停留的早期固定题材试验。', '早期试验'),
    ('art-studies.md', 'art-studies', '光与雨：静帧阶段', '实验与反馈', '两部命题、生成素材、三幕承接与情绪修订。', '历史制作阶段'),
    ('rain-journey.md', 'rain-journey', '雨：连续三维行旅', '实验与反馈', '主角、路线、场景与连续摄影的实现记录。', '空间实现记录'),
    ('rain-art-direction.md', 'rain-art-direction', '雨：艺术方向与验证', '实验与反馈', '檐下、竹间、空江的艺术打磨与实际检查。', '目标与验证分别阅读'),
    ('connections.md', 'connections', '七种连接的设计', '方法与方向', '连接关系、感受目标、扩展可能与实现边界。', '第一轮对照记录'),
    ('portal-art-direction.md', 'portal-art-direction', '传送：完整复盘', '实验与反馈', '两套艺术世界、动作编排，以及2026-11-17质量诊断。', '艺术质量未通过'),
    ('verification.md', 'verification', '全部验证与限制', '验证与来源', '区分工程检查、真实画面、历史结果与未验证项。', '按版本阅读'),
    ('assets/SOURCES.md', 'sources', '原作与素材来源', '验证与来源', '原片引用、原创实验、生成静帧、截图与许可范围。', '来源与权利边界'),
    ('README.md', 'project-readme', '项目总记录与运行', '验证与来源', '项目结构、本地运行、内容来源和各阶段入口。', '研究项目与发布入口'),
]
DATA = [
    ('scenes.json', 'scenes', '逐场景结构化数据', '原片21条内容的唯一数据来源'),
    ('art-studies.json', 'art-studies', '光雨三幕设计数据', '静帧阶段的艺术方向、时长与镜头参数'),
    ('assets/art-studies/prompts.json', 'prompts', '六幅画面的实际提示词', '准确提交文字；不作为原作者提示词'),
    ('assets/art-studies/generation-record.json', 'generation-record', '生成与原件校验记录', '生成静帧、原始PNG与WebP分别记录'),
    ('assets/source-manifest.json', 'source-manifest', '原片引用图来源哈希', '原片抽帧、来源与完整性核对'),
]
for _p in sorted((ROOT / 'assets').glob('*verification.json')):
    DATA.append((_p.relative_to(ROOT).as_posix(), _p.stem, _p.stem.replace('-', ' ') + ' · 验证数据', '原始验证数据，须结合所属阶段与记录范围阅读'))

SEARCH_DIALOG = '''<dialog class="search-dialog" id="research-search" aria-labelledby="search-title"><div class="search-head"><span id="search-title">检索这份研究</span><button type="button" id="close-search" aria-label="关闭搜索">关闭 ×</button></div><div class="search-input-wrap"><label for="research-query">关键词 / 场景 / 方法 / 制作记录</label><input type="search" id="research-query" autocomplete="off" placeholder="例如：主角、历史、传送、艺术质量"><p id="search-status" role="status" aria-live="polite"></p></div><div class="search-results" id="research-results"></div></dialog>'''


def esc(value):
    return html.escape(str(value), quote=True)


def header(base='../'):
    return f'''<a class="skip-link" href="#main">跳到正文</a><header class="research-header"><a class="research-brand" href="{base}index.html"><span class="brand-glyph">P<span>↗</span></span><span>艺术巡游研究<small>FIELD NOTES / 008</small></span></a><nav aria-label="主要导航"><a href="{base}index.html#deconstruction">原作拆解</a><a href="{base}index.html#lab">逐幕证据</a><a href="index.html">完整档案</a></nav><button type="button" class="search-open" data-open-search><span>搜索研究</span><kbd>⌘ / Ctrl K</kbd></button><div class="reading-progress" aria-hidden="true"></div></header>'''


def shell(title, content, base='../'):
    return f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#172c28"><title>{esc(title)} · 艺术巡游研究档案</title><link rel="stylesheet" href="{base}research.css"><script defer src="{base}research-data.js"></script><script defer src="{base}research.js"></script></head><body data-base="{base}">{header(base)}{content}<footer class="research-footer"><a href="{base}index.html">回到研究总览 ↑</a><p>完整记录，保留判断的依据。<br><span>本地研究档案 · {UPDATED}</span></p><a href="index.html">浏览全部档案 ↗</a></footer>{SEARCH_DIALOG}</body></html>'''


class Markdown:
    def __init__(self, source, doc_map, data_map, extra):
        self.source = source
        self.doc_map = doc_map
        self.data_map = data_map
        self.extra = extra
        self.headings = []

    def href(self, value):
        parts = urlsplit(value.strip().strip('<>'))
        suffix = ('#' + parts.fragment) if parts.fragment else ''
        if parts.scheme in {'http', 'https'}:
            if parts.hostname in {'127.0.0.1', 'localhost'}:
                return '../' + parts.path.lstrip('/') + suffix
            return value
        if parts.scheme or parts.netloc:
            return '#'  # No executable/data URL is emitted from research Markdown.
        if not parts.path:
            return suffix or '#'
        parent = self.source.parent.relative_to(ROOT).as_posix()
        rel = posixpath.normpath(posixpath.join(parent, parts.path))
        if not (ROOT / rel).exists() and (ROOT / parts.path).exists():
            rel = parts.path
        if rel in self.doc_map:
            return self.doc_map[rel] + suffix
        if rel in self.data_map:
            return self.data_map[rel] + suffix
        if rel.startswith('assets/') and Path(rel).suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp', '.svg'}:
            assert 'originals/' not in rel, 'Original generated PNG is not a web asset'
            return '../' + rel + suffix
        if rel.startswith('web/'):
            name = rel[4:]
            if name in {'rain-journey.html'}:
                name = 'rain.html'
            if (WEB / name).is_file():
                # Known buildless entry points and source modules are exported by build.py.
                exported = {'index.html', 'light.html', 'rain.html', 'rain-still.html', 'portal.html', 'connections.html', 'experiments.html'}
                if name in exported or name.startswith('archive/') or Path(name).suffix in {'.js', '.mjs', '.css'}:
                    return '../' + name + suffix
        target = (ROOT / rel).resolve()
        if target.is_file() and target.is_relative_to(ROOT) and target.suffix.lower() in {'.md', '.py', '.js', '.mjs', '.css', '.html', '.cmd', '.json', '.txt'} and 'vendor/' not in rel:
            name = rel.replace('/', '--') + '.txt'
            self.extra[name] = target
            return '../records/files/' + quote(name) + suffix
        return '../archive/index.html#versions'

    def inline(self, text):
        tokens = []

        def hold(value):
            tokens.append(value)
            return f'\x01{len(tokens)-1}\x02'

        text = re.sub(r'`([^`]+)`', lambda m: hold('<code>' + esc(m[1]) + '</code>'), text)
        text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', lambda m: hold(f'<img src="{esc(self.href(m[2]))}" alt="{esc(m[1])}" loading="lazy">'), text)
        text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: hold(f'<a href="{esc(self.href(m[2]))}"'+(' target="_blank" rel="noopener noreferrer"' if m[2].startswith('https://') else '')+'>'+esc(m[1])+'</a>'), text)
        text = esc(text)
        text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
        text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', text)
        for index, value in reversed(list(enumerate(tokens))):
            text = text.replace(f'\x01{index}\x02', value)
        return text

    def render(self, markdown):
        lines = markdown.splitlines()
        out = []
        i = 0
        while i < len(lines):
            text = lines[i].strip()
            if not text:
                i += 1
                continue
            if text.startswith('```'):
                code = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith('```'):
                    code.append(lines[i]); i += 1
                out.append('<pre><code>' + esc('\n'.join(code)) + '</code></pre>'); i += 1
                continue
            heading = re.match(r'^(#{1,6})\s+(.+)$', text)
            if heading:
                level = min(6, len(heading[1]) + 1)
                anchor = f'h-{len(self.headings)+1}'
                self.headings.append((level, heading[2], anchor))
                out.append(f'<h{level} id="{anchor}">{self.inline(heading[2])}</h{level}>'); i += 1
                continue
            if i+1 < len(lines) and '|' in text and re.fullmatch(r'[\s|:\-]+', lines[i+1]) and '---' in lines[i+1]:
                rows = [text]; i += 2
                while i < len(lines) and '|' in lines[i] and lines[i].strip():
                    rows.append(lines[i].strip()); i += 1
                cells = lambda row: [self.inline(c.strip()) for c in row.strip('|').split('|')]
                out.append('<div class="table-wrap"><table><thead><tr>' + ''.join('<th>'+c+'</th>' for c in cells(rows[0])) + '</tr></thead><tbody>' + ''.join('<tr>'+''.join('<td>'+c+'</td>' for c in cells(row))+'</tr>' for row in rows[1:]) + '</tbody></table></div>')
                continue
            item = re.match(r'^(?:([-*])|\d+\.)\s+(.+)$', text)
            if item:
                tag = 'ul' if item[1] else 'ol'; items = []
                while i < len(lines):
                    m = re.match(r'^(?:([-*])|\d+\.)\s+(.+)$', lines[i].strip())
                    if not m or ('ul' if m[1] else 'ol') != tag:
                        break
                    items.append('<li>' + self.inline(m[2]) + '</li>'); i += 1
                out.append('<'+tag+'>'+''.join(items)+'</'+tag+'>')
                continue
            if text.startswith('>'):
                quote_lines = []
                while i < len(lines) and lines[i].strip().startswith('>'):
                    quote_lines.append(lines[i].strip().lstrip('>').strip()); i += 1
                out.append('<blockquote><p>' + self.inline(' '.join(quote_lines)) + '</p></blockquote>')
                continue
            if re.fullmatch(r'[-*_]{3,}', text):
                out.append('<hr>'); i += 1
                continue
            paragraph = [text]; i += 1
            while i < len(lines) and lines[i].strip() and not re.match(r'^(#{1,6}\s|```|[-*]\s|\d+\.\s|>)', lines[i].strip()):
                if i+1 < len(lines) and '|' in lines[i] and re.fullmatch(r'[\s|:\-]+', lines[i+1]):
                    break
                paragraph.append(lines[i].strip()); i += 1
            rendered = self.inline(' '.join(paragraph))
            if rendered.startswith('<img ') and rendered.endswith('>'):
                out.append('<figure>' + rendered + '</figure>')
            else:
                out.append('<p>' + rendered + '</p>')
        return '\n'.join(out)


def card(record):
    path, slug, title, group, summary, status = record
    return f'<a class="archive-card" href="archive/{slug}.html"><small>{esc(group)}</small><h3>{esc(title)}</h3><p>{esc(summary)}</p><span>{esc(status)}<b aria-hidden="true">↗</b></span></a>'


def build_research(scenes):
    archive = WEB / 'archive'
    archive.mkdir(exist_ok=True)
    doc_map = {path: slug+'.html' for path, slug, *_ in CATALOG}
    data_map = {path: 'data-'+slug+'.html' for path, slug, *_ in DATA}
    extra = {}
    search = []
    manifest = {'updated': UPDATED, 'documents': [], 'data': [], 'source_sha256': {}}
    for record in CATALOG:
        path, slug, title, group, summary, status = record
        source = ROOT / path
        text = source.read_text(encoding='utf-8-sig')
        renderer = Markdown(source, doc_map, data_map, extra)
        rendered = renderer.render(text)
        toc = ''.join(f'<a href="#{anchor}">{esc(name)}</a>' for level, name, anchor in renderer.headings if level <= 3)
        notice = '本页保留专题原文与阶段记录。较早文档中的“当前”“已验证”仅对应当时版本与检查范围。最新综合判断见研究总览；传送实验的艺术质量于2026-11-17复核未通过。'
        content = f'''<main id="main"><section class="archive-hero"><p class="breadcrumbs"><a href="../index.html">研究总览</a> / <a href="index.html">完整档案</a> / {esc(group)}</p><p class="eyebrow">RESEARCH ARCHIVE / {esc(status)}</p><h1>{esc(title)}</h1><p>{esc(summary)}</p><div class="archive-meta"><span>原文：{esc(path)}</span><a href="../records/{slug}.md">查看Markdown原文 ↗</a></div></section><div class="archive-layout"><aside class="archive-nav" aria-label="本文目录"><h2>本文目录</h2>{toc}</aside><article class="archive-article"><div class="archive-notice">{notice}</div>{rendered}</article></div></main>'''
        (archive / (slug+'.html')).write_text(shell(title, content), encoding='utf-8', newline='\n')
        plain = re.sub(r'[#*`|>\[\]()]', ' ', text)
        search.append({'title': title, 'kind': group+' · 专题全文', 'href': 'archive/'+slug+'.html', 'text': plain})
        for index, (level, name, anchor) in enumerate(renderer.headings):
            # Include each original section as a searchable entry with its own anchor.
            start = text.find(name)
            end = text.find('\n#', start+len(name))
            section = text[start:end if end >= 0 else len(text)]
            search.append({'title': name, 'kind': title+' · 原文段落', 'href': 'archive/'+slug+'.html#'+anchor, 'text': re.sub(r'[#*`|>]', ' ', section)})
        manifest['documents'].append({'source': path, 'page': 'archive/'+slug+'.html', 'headings': len(renderer.headings)})
        manifest['source_sha256'][path] = hashlib.sha256(source.read_bytes()).hexdigest()
    for path, slug, title, summary in DATA:
        source = ROOT / path
        data = json.loads(source.read_text(encoding='utf-8-sig'))
        pretty = json.dumps(data, ensure_ascii=False, indent=2)
        content = f'''<main id="main"><section class="archive-hero"><p class="breadcrumbs"><a href="../index.html">研究总览</a> / <a href="index.html#data">结构化数据</a></p><p class="eyebrow">DATA & EVIDENCE / 原始记录</p><h1>{esc(title)}</h1><p>{esc(summary)}</p><div class="archive-meta"><span>原文件：{esc(path)}</span><a href="../records/data-{slug}.json">查看JSON原文 ↗</a></div></section><div class="archive-layout"><aside class="archive-nav"><h2>数据说明</h2><a href="../index.html#sources">查看证据边界</a><a href="verification.html">查看版本与验证语境</a></aside><article class="archive-article"><div class="archive-notice">这是原始数据，字段含义与通过范围须结合记录所属版本阅读。工程检查通过不能代替艺术质量验收，历史截图不代表最新实现。</div><pre><code>{esc(pretty)}</code></pre></article></div></main>'''
        (archive / ('data-'+slug+'.html')).write_text(shell(title, content), encoding='utf-8', newline='\n')
        search.append({'title': title, 'kind': '结构化数据 / 原始记录', 'href': 'archive/data-'+slug+'.html', 'text': summary+' '+pretty})
        manifest['data'].append({'source': path, 'page': 'archive/data-'+slug+'.html'})
        manifest['source_sha256'][path] = hashlib.sha256(source.read_bytes()).hexdigest()

    reader = (WEB / 'research-reader.html').read_text(encoding='utf-8')
    reader = reader.replace('id="lab"', 'id="lab" data-chapter="05 / 逐幕证据"')
    anchors = ''.join(f'<span id="scene-{s["id"]}" class="scene-anchor"></span>' for s in scenes)
    reader = re.sub(r'(<div id="scene-anchors" aria-hidden="true">).*?(</div>)', lambda m: m[1]+anchors+m[2], reader, flags=re.S)
    reader = reader.replace('</noscript>', '</noscript><p class="body-note"><a href="archive/scene-notes.html">阅读21条完整分析全文 ↗</a> · <a href="archive/data-scenes.html">查看结构化原始数据 ↗</a></p>')
    template = (WEB / 'research-template.html').read_text(encoding='utf-8')
    home_cards = '<div class="archive-cards">'+''.join(card(r) for r in CATALOG)+'</div>'
    home = template.replace('{{SCENE_READER}}', reader).replace('{{ARCHIVE_CARDS}}', home_cards).replace('{{SEARCH_DIALOG}}', SEARCH_DIALOG)
    home = home.replace('<link rel="stylesheet" href="research.css"><link rel="stylesheet" href="reader.css">', '<link rel="stylesheet" href="reader.css"><link rel="stylesheet" href="research.css">')
    assert '{{' not in home, 'Unresolved research template token'
    (WEB / 'index.html').write_text(home, encoding='utf-8', newline='\n')

    for scene in scenes:
        search.append({'title': f'{scene["id"]:02d} · {scene["name"]}', 'kind': '原片场景 · '+scene['phase'], 'href': f'index.html#scene-{scene["id"]}', 'text': ' '.join(str(scene[k]) for k in ['theme', 'observed', 'art', 'atmosphere', 'character', 'before', 'after', 'design'])})
    # Homepage sections are searchable independently of the full archive.
    for section in re.finditer(r'<section[^>]+id="([^"]+)"[^>]*>(.*?)</section>', home, flags=re.S):
        title = re.search(r'<h2[^>]*>(.*?)</h2>', section[2], flags=re.S)
        if title:
            clean = lambda s: html.unescape(re.sub(r'<[^>]+>', ' ', s))
            search.append({'title': ' '.join(clean(title[1]).split()), 'kind': '研究总览 / 综合判断', 'href': 'index.html#'+section[1], 'text': ' '.join(clean(section[2]).split())})
    groups = []
    for group in dict.fromkeys(r[3] for r in CATALOG):
        cards = ''.join(card(r).replace('href="archive/', 'href="') for r in CATALOG if r[3] == group)
        groups.append(f'<section class="archive-group"><h2>{esc(group)}</h2><div class="archive-cards">{cards}</div></section>')
    data_links = ''.join(f'<a href="data-{slug}.html">{esc(title)}<small>{esc(summary)}</small></a>' for path, slug, title, summary in DATA)
    content = f'''<main id="main"><section class="archive-hero"><p class="eyebrow">THE COMPLETE RECORD / {len(CATALOG)}份专题 · {len(DATA)}份数据</p><h1>完整研究档案</h1><p>原作依据、方法、实验、反馈、素材与验证集中回查。首页给出当前判断；这里保留各阶段原文。可用顶部搜索检索全文和段落。</p><div class="archive-meta"><a href="../index.html">回到研究总览 ↗</a><span>汇总更新 {UPDATED}</span></div></section><div class="archive-list-page">{''.join(groups)}<section class="archive-group" id="data"><h2>结构化数据与原始验证</h2><div class="data-index">{data_links}</div></section><section class="archive-group" id="versions"><h2>版本与阅读顺序</h2><div class="archive-notice">原作观察始终以逐幕证据为基础；后续实验按阶段保留。传送的最新艺术质量结论为未达标。较早的“通过”只覆盖其记录中的交互、工程或画面检查，不表示复现了原作艺术效果。旧源码快照在项目 revisions/ 中保留，不作为独立部署的演示地址。</div><a href="../index.html#lessons">阅读当前复盘与教训 ↗</a></section></div></main>'''
    (archive / 'index.html').write_text(shell('完整研究档案', content), encoding='utf-8', newline='\n')
    (WEB / 'research-data.js').write_text('window.RESEARCH_INDEX = '+json.dumps(search, ensure_ascii=False, separators=(',', ':'))+';\n', encoding='utf-8', newline='\n')
    manifest['search_entries'] = len(search)
    manifest['extra_files'] = {name: path.relative_to(ROOT).as_posix() for name, path in extra.items()}
    (WEB / 'research-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    return manifest


def export_research(output, manifest):
    import shutil
    shutil.copytree(WEB / 'archive', output / 'archive', dirs_exist_ok=True)
    records = output / 'records'
    records.mkdir(exist_ok=True)
    for path, slug, *_ in CATALOG:
        shutil.copy2(ROOT / path, records / (slug+'.md'))
    for path, slug, *_ in DATA:
        shutil.copy2(ROOT / path, records / ('data-'+slug+'.json'))
    (records / 'files').mkdir(exist_ok=True)
    for name, source in manifest['extra_files'].items():
        shutil.copy2(ROOT / source, records / 'files' / name)
    for pattern in ['*.jpg', '*.jpeg', '*.webp', '*.svg']:
        for path in (ROOT / 'assets').glob(pattern):
            shutil.copy2(path, output / 'assets' / path.name)
    shutil.copy2(ROOT / 'assets/research-understanding-map-20261117.png', output / 'assets/research-understanding-map-20261117.png')
    print(f'Research archive: {len(CATALOG)} documents, {len(DATA)} data records, {manifest["search_entries"]} search entries')

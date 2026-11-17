"""Validate the research site's exported links, anchors and original-text copies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import hashlib
from build_research import ROOT, CATALOG, DATA


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.ids = set()
        self.refs = []
        self.h1 = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'h1':
            self.h1 += 1
        if attrs.get('id'):
            assert attrs['id'] not in self.ids, f'Duplicate ID: {self.path}: {attrs["id"]}'
            self.ids.add(attrs['id'])
        for attr in ['src', 'href']:
            if attrs.get(attr):
                self.refs.append(attrs[attr])


def verify():
    output = ROOT / 'dist'
    pages = {}
    for path in sorted(output.rglob('*.html')):
        parser = Page(path)
        text = path.read_text(encoding='utf-8')
        assert '\x01' not in text and '\x02' not in text, f'Unresolved inline token: {path}'
        parser.feed(text)
        assert parser.h1 == 1, f'Expected one page heading: {path}: {parser.h1}'
        pages[path.resolve()] = parser
    checked = 0
    for path, page in pages.items():
        for ref in page.refs:
            parsed = urlsplit(ref)
            if parsed.scheme or parsed.netloc:
                continue
            target = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path
            if target.is_dir():
                target = target / 'index.html'
            assert target.is_relative_to(output), f'Outside export: {path}: {ref}'
            assert target.is_file(), f'Missing local resource: {path.relative_to(output)}: {ref}'
            if parsed.fragment and target.suffix == '.html' and target in pages:
                assert unquote(parsed.fragment) in pages[target].ids, f'Missing anchor: {path.relative_to(output)}: {ref}'
            checked += 1
    for source, slug, *_ in CATALOG:
        assert (ROOT / source).read_bytes() == (output / 'records' / (slug+'.md')).read_bytes(), source
    for source, slug, *_ in DATA:
        assert (ROOT / source).read_bytes() == (output / 'records' / ('data-'+slug+'.json')).read_bytes(), source
    text = (output / 'research-data.js').read_text(encoding='utf-8')
    search = json.loads(text.removeprefix('window.RESEARCH_INDEX = ').rstrip(';\n'))
    assert len(search) >= 100
    for entry in search:
        link = urlsplit(entry['href'])
        target = (output / link.path).resolve()
        assert target in pages, entry['href']
        if link.fragment:
            assert link.fragment in pages[target].ids, entry['href']
    homepage = pages[(output / 'index.html').resolve()]
    assert all(f'scene-{n}' in homepage.ids for n in range(1, 22))
    assert all(x in homepage.ids for x in ['deconstruction', 'value', 'journey', 'emotion', 'lab', 'methods', 'connections', 'extensions', 'practice', 'lessons', 'workflow', 'archive'])
    assert not list((output / 'assets/art-studies').glob('*.png')), 'Original generated PNG is not exported'
    return {'html_pages': len(pages), 'local_links_and_resources': checked,
            'documents': len(CATALOG), 'data_records': len(DATA), 'search_entries': len(search),
            'raw_source_copies': 'byte-identical', 'scene_entries': 21,
            'homepage_sha256': hashlib.sha256((output / 'index.html').read_bytes()).hexdigest()}


if __name__ == '__main__':
    print(json.dumps(verify(), ensure_ascii=False, indent=2))

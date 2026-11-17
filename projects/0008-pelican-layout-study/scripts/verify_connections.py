"""Static integrity checks for the passage studies; browser results are recorded separately."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
SOURCES = ['connections.html', 'connections.css', 'connections.js', 'connections-score.mjs',
           'connections-world.mjs', 'portal.html', 'portal-score.mjs', 'portal-world.mjs',
           'rain-traveler.mjs', 'rain-art.mjs', 'rain-route.mjs']


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            assert a['id'] not in self.ids, f"Duplicate ID: {a['id']}"
            self.ids.add(a['id'])
        for key in ('src', 'href'):
            if a.get(key):
                self.refs.append(a[key])


def verify():
    parser = Page()
    parser.feed((WEB / 'connections.html').read_text(encoding='utf-8'))
    portal_parser = Page()
    portal_parser.feed((WEB / 'portal.html').read_text(encoding='utf-8'))
    assert parser.ids == portal_parser.ids, 'Player hooks must be present in both entry pages'
    parser.refs.extend(portal_parser.refs)
    for ref in parser.refs:
        path = urlsplit(ref)
        if path.scheme or path.netloc or not path.path:
            continue
        assert (WEB / unquote(path.path)).is_file(), f'Missing page resource: {ref}'
    for name in SOURCES:
        p = WEB / name
        assert p.is_file(), name
        if p.suffix in {'.js', '.mjs'}:
            source = re.sub(r'/\*.*?\*/|//[^\n]*', '', p.read_text(encoding='utf-8'), flags=re.S)
            for ref in re.findall(r"from\s*['\"](\.[^'\"]+)['\"]", source):
                assert (p.parent / ref).is_file(), f'Missing module: {name}: {ref}'
        if name.startswith(('connections', 'portal')):
            assert (ROOT / 'dist' / name).read_bytes() == p.read_bytes(), f'Stale export: {name}'
    assert (WEB / 'vendor/three/LICENSE').is_file()
    return {'html_ids': len(parser.ids), 'local_references': len(parser.refs),
            'sha256': {name: hashlib.sha256((WEB / name).read_bytes()).hexdigest() for name in SOURCES}}


if __name__ == '__main__':
    print(json.dumps(verify(), ensure_ascii=False, indent=2))

"""Check the publication's subpath links, real-source hashes and disclosure scope."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse
import hashlib
import json
import re
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.ids, self.links = [], []
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        self.links += [attrs[key] for key in ('href', 'src') if attrs.get(key)]


def check(site):
    errors, count = [], 0
    pages = {p.resolve(): Page(p) for p in site.glob('*.html')}
    expected = {'index.html', 'overview.html', 'lab.html', 'assets.html', 'understanding.html',
                'life.html', 'shelter.html', 'arranging.html', 'design.html'}
    if {p.name for p in pages} != expected:
        errors.append('The nine published pages are incomplete')
    home = (site/'index.html').read_text(encoding='utf-8')
    for entry in ['index.html?visit=preview&amp;space=outside', 'index.html?visit=preview&amp;space=inside',
                  'index.html?visit=home', 'demo-home.css']:
        if entry not in home:
            errors.append('Missing game/demo entry: '+entry)
    if '<main>\\n' in home:
        errors.append('Literal escaped newline in the homepage')
    data = (site/'js/understanding-data.mjs').read_text(encoding='utf-8')
    elements = data.split('export const ELEMENTS = [', 1)[1].split('\n];', 1)[0]
    pages[(site/'understanding.html').resolve()].ids += ['element-'+s for s in re.findall(r"\bid:'([^']+)'", elements)]
    for path, page in pages.items():
        if any(n > 1 for n in Counter(page.ids).values()):
            errors.append('Duplicate IDs: '+path.name)
        for link in page.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            count += 1
            if url.path.startswith('/'):
                errors.append('Domain-root URL breaks the project subpath: '+link)
            target = (path.parent/unquote(url.path)).resolve() if url.path else path
            if not target.is_relative_to(site.resolve()) or not target.is_file():
                errors.append(path.name+' missing/unsafe '+link)
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                errors.append(path.name+' missing anchor '+link)
    imports = 0
    for path in (site/'js').glob('*.mjs'):
        source = path.read_text(encoding='utf-8')
        if '127.0.0.1' in source or 'http://localhost' in source:
            errors.append('Local address in published script: '+path.name)
        for link in re.findall(r"(?:from\s*|import\s*)['\"](\.[^'\"]+)['\"]", source):
            imports += 1
            if not (path.parent/link).is_file():
                errors.append('Missing JS import: '+path.name+' '+link)
    for base in [site/'assets/trees', site/'assets/free-samples']:
        manifest = json.loads((base/'manifest.json').read_text(encoding='utf-8'))
        for item in manifest['files']:
            if hashlib.sha256((base/item['file']).read_bytes()).hexdigest() != item['sha256']:
                errors.append('Source asset hash mismatch: '+item['file'])
    record = json.loads((site/'assets/understanding-research-map-v2-public.json').read_text(encoding='utf-8'))
    for source in record['sources']:
        original = (ROOT/source['path']).resolve()
        if not original.is_relative_to(ROOT.resolve()) or not original.is_file() or hashlib.sha256(original.read_bytes()).hexdigest() != source['sha256']:
            errors.append('Documentary source hash mismatch: '+source['path'])
    for item in record['files']:
        name = Path(item['path']).name
        for path in [site/'assets'/name, site/'assets/journal'/name]:
            if hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
                errors.append('Guide copy/hash mismatch: '+str(path))
    png = (site/'assets/understanding-research-map-v2-public.png').read_bytes()
    if png[:8] != b'\x89PNG\r\n\x1a\n' or struct.unpack('>II', png[16:24]) != (3200, 4400):
        errors.append('Guide PNG dimensions mismatch')
    svg = ET.parse(site/'assets/understanding-research-map-v2-public.svg').getroot()
    images = svg.findall('{http://www.w3.org/2000/svg}image')
    if len(images) != 18 or any(not image.attrib['href'].startswith('data:image/') for image in images):
        errors.append('SVG documentary inserts are incomplete or external')
    if 'AI 居民、自然对话与完整模式尚未接入' not in (site/'overview.html').read_text(encoding='utf-8'):
        errors.append('Current/target disclosure missing')
    for path in site.rglob('*'):
        if path.name in {'.git', '.env', '.local', '.runtime', 'node_modules', 'server.mjs'}:
            errors.append('Local/dependency file in publication: '+str(path))
    if not (site/'THIRD_PARTY_NOTICES.md').is_file():
        errors.append('Third-party notice missing')
    size = sum(p.stat().st_size for p in site.rglob('*') if p.is_file())
    if size > 25_000_000:
        errors.append('Publication exceeded its 25 MB budget')
    if errors:
        raise ValueError('\n'.join(errors))
    return {'pages':len(pages), 'local_links':count, 'relative_imports':imports,
            'guide_inserts':len(images), 'guide_size':[3200,4400], 'bytes':size}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=ROOT/'dist')
    args = parser.parse_args()
    print(json.dumps(check(args.site), ensure_ascii=False))

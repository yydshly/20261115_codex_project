"""Check preservation, local publication links, glTF dependencies and lossless media."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import argparse
import gzip
import hashlib
import json
import re

PROJECT = Path(__file__).resolve().parents[1]


def check(site):
    mappings = {}
    for root in (site, site / 'model-version'):
        for name, item in json.loads((root / 'compressed-assets.json').read_text()).items():
            data = gzip.decompress((root / item['path']).read_bytes())
            assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256'], name
            mappings[(root / name).resolve()] = root / item['path']

    def exists(path):
        return path.is_file() or path.resolve() in mappings or (path.is_dir() and (path / 'index.html').exists())

    class Links(HTMLParser):
        def __init__(self):
            super().__init__()
            self.paths = []
        def handle_starttag(self, tag, attrs):
            for key, value in attrs:
                if key in {'src', 'href'} and value:
                    self.paths.append(value)

    for page in (site / 'index.html', site / 'model-version/index.html', site / 'model-version/credits.html', site / 'overview/index.html'):
        parser = Links()
        parser.feed(page.read_text(encoding='utf-8'))
        for link in parser.paths:
            url = urlsplit(link)
            if url.scheme or url.netloc or not url.path:
                continue
            assert not url.path.startswith('/'), (page, link, 'domain-root path')
            assert exists(page.parent / unquote(url.path)), (page, link)
    for path in (site / 'model-version/assets').rglob('*.gltf'):
        model = json.loads(path.read_text(encoding='utf-8'))
        for item in model.get('buffers', []) + model.get('images', []):
            uri = item.get('uri')
            if uri and not uri.startswith('data:'):
                assert exists(path.parent / unquote(uri)), (path, uri)
    catalog = json.loads((site / 'overview/assets/source-catalog.json').read_text(encoding='utf-8'))
    for item in catalog['items']:
        for record in item['records']:
            relative = record['path'].removeprefix('web/')
            assert exists(site / relative), record['path']
    v1 = json.loads((PROJECT / 'versions/procedural-v1/manifest.json').read_text(encoding='utf-8'))
    for record in v1['files']:
        path = PROJECT / 'web' / record['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == record['sha256'], path
    # Publication changes only transport paths and the module bootstrap.
    for path in (PROJECT / 'web/model-version').glob('*.js'):
        if not (site / 'model-version' / path.name).is_file():
            continue
        source = path.read_text(encoding='utf-8')
        if path.name == 'nature.js':
            source = source.replace('../assets/materials/', './assets/materials/')
        assert (site / 'model-version' / path.name).read_text(encoding='utf-8') == source, path
    source_guide = PROJECT / 'assets/research-overview-20261117/valley-garden-research-overview.png'
    guide = site / 'overview/assets/research-overview.png'
    assert guide.read_bytes() == source_guide.read_bytes()
    total = sum(p.stat().st_size for p in site.rglob('*') if p.is_file())
    assert total < 235_000_000, ('Valley publication budget exceeded', total)
    print(json.dumps({'checked': True, 'preserved_v1_files': len(v1['files']), 'catalog_entries': len(catalog['items']), 'compressed_files': len(mappings), 'site_bytes': total}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', type=Path, default=PROJECT / 'dist')
    check(parser.parse_args().site)

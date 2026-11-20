"""Check the static Pages bundle against the world report and its source guide."""

import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
from urllib.parse import parse_qsl, unquote, urlsplit


PROJECT = Path(__file__).resolve().parents[1]
PAGES = ('world-report.html', 'index.html', 'journey.html', 'expedition.html', 'environment.html')
REPORT_ANCHORS = {'goal', 'built', 'effects', 'value', 'gaps'}
GUIDE_IMAGE = 'world-foundation-summary.png'
RUNTIME = {
    'three.module.js': 100_000,
    'three.core.js': 100_000,
    'OrbitControls.js': 10_000,
    'LICENSE': 100,
}
ROUTES = (
    'expedition.html?walk=snow-to-deep&station=ridge#ice-1',
    'expedition.html?walk=snow-to-deep&station=trench#ice-1',
    'expedition.html?plan=ridge-bay&station=ridge&month=7#ice-1',
    'expedition.html?plan=ridge-bay&station=wetland&month=1#ice-1',
    'expedition.html?plan=ridge-bay&station=wetland&month=7#ice-1',
    'expedition.html?walk=snow-to-bay&epoch=interglacial&at=2306#ice-1',
    'expedition.html?walk=snow-to-bay&epoch=glacial&at=2306#ice-1',
    'expedition.html?plan=formation&study=event#build-1',
    'expedition.html?plan=lines&focus=water#build-1',
    'expedition.html?walk=valley-life&stop=0#build-36',
)
MAX_BYTES = 18 * 1024 * 1024
ASSET_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp3'}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.import_map = []
        self.reading_import_map = False

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        self.links.extend(attrs[key] for key in ('href', 'src') if attrs.get(key))
        if tag == 'script' and attrs.get('type') == 'importmap':
            self.reading_import_map = True

    def handle_data(self, data):
        if self.reading_import_map:
            self.import_map.append(data)

    def handle_endtag(self, tag):
        if tag == 'script':
            self.reading_import_map = False


def require(condition, message):
    if not condition:
        raise ValueError(message)


def route_key(url):
    parsed = urlsplit(url)
    return (parsed.path, tuple(sorted(parse_qsl(parsed.query))), parsed.fragment)


def is_public_file(path):
    if any(part.startswith('.') or part == 'node_modules' for part in path.parts):
        return False
    if len(path.parts) == 1:
        return path.suffix in {'.html', '.js', '.css'}
    if path.parts[0] == 'runtime':
        return len(path.parts) == 2 and path.name in RUNTIME
    if path.parts[0] == 'assets':
        return path.suffix in ASSET_EXTENSIONS or path.as_posix() == 'assets/mainline/minimax.json'
    return False


def read_page(site, name):
    page = Page()
    page.feed((site / name).read_text(encoding='utf-8'))
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            require(url.scheme in {'http', 'https', 'mailto'} and url.hostname not in {'localhost', '127.0.0.1', '::1'},
                    f'{name}: unusable external URL {link}')
            continue
        path = PurePosixPath(unquote(url.path))
        require(not path.is_absolute() and '..' not in path.parts and '\\' not in url.path,
                f'{name}: expected a relative public URL, found {link}')
        if not url.path:
            if name == 'world-report.html':
                require(not url.fragment or unquote(url.fragment) in page.ids, f'{name}: missing anchor {link}')
            continue
        target = site / path
        if target.is_dir():
            target /= 'index.html'
        require(target.is_file(), f'{name}: missing linked file {link}')
    return page


def check(site):
    require(site.is_dir(), f'Public directory does not exist: {site}')
    files = [file for file in site.rglob('*') if file.is_file()]
    for file in files:
        relative = file.relative_to(site)
        require(not file.is_symlink() and is_public_file(relative), f'Unexpected file in public bundle: {relative}')
    size = sum(file.stat().st_size for file in files)
    require(size <= MAX_BYTES, f'Public bundle exceeds {MAX_BYTES:,} bytes: {size:,}')

    pages = {name: read_page(site, name) for name in PAGES}
    for file in site.glob('*.html'):
        if file.name not in pages:
            read_page(site, file.name)
    report = pages['world-report.html']
    for anchor in sorted(REPORT_ANCHORS):
        require(anchor in report.ids and f'#{anchor}' in report.links, f'Missing report section or navigation: {anchor}')
    report_routes = {route_key(link) for link in report.links}
    for route in ROUTES:
        require(route_key(route) in report_routes, f'Missing report route: {route}')
    for name in ('index.html', 'journey.html'):
        require('world-report.html' in pages[name].links, f'{name}: missing report link')

    expedition = pages['expedition.html']
    imports = json.loads(''.join(expedition.import_map))['imports']
    require(imports.get('three') == './runtime/three.module.js', '3D map does not use the local Three.js module')
    require(any(urlsplit(link).path == 'expedition.js' for link in expedition.links), '3D map script is missing')
    for name, minimum in RUNTIME.items():
        file = site / 'runtime' / name
        require(file.is_file() and file.stat().st_size >= minimum, f'Incomplete Three.js runtime file: {name}')
    require('MIT License' in (site / 'runtime/LICENSE').read_text(encoding='utf-8'), 'Three.js MIT license is missing')

    source_image = PROJECT / 'assets' / GUIDE_IMAGE
    published_path = f'assets/progress/{GUIDE_IMAGE}'
    published_image = site / published_path
    require(published_path in report.links, 'The report does not link to the original guide image')
    digest = hashlib.sha256(source_image.read_bytes()).hexdigest()
    require(digest == hashlib.sha256(published_image.read_bytes()).hexdigest(),
            'Published guide image differs from the source PNG')
    print(f'World report publication: {len(pages)} entry pages, {len(ROUTES)} 3D routes, '
          f'{len(files)} public files, {size / (1024 ** 2):.1f} MiB. Guide image SHA-256 {digest}.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=PROJECT / 'dist', help='Path to the built project directory')
    args = parser.parse_args()
    try:
        check(args.site.resolve())
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f'Publication check failed: {error}\n')


if __name__ == '__main__':
    main()

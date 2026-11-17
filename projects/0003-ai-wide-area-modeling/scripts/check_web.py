"""Check evidence integrity, relative links and an optional loopback HTTP export."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from urllib.request import urlopen
import argparse
import hashlib
import json
import re

PROJECT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', help='Optional loopback URL for the integrated project')
    args = parser.parse_args()
    root = PROJECT / 'dist'
    manifest = json.loads((root / 'export-manifest.json').read_text(encoding='utf-8'))
    for row in manifest['files']:
        data = (root / row['path']).read_bytes()
        assert len(data) == row['bytes'], row['path']
        assert hashlib.sha256(data).hexdigest() == row['sha256'], row['path']

    class Links(HTMLParser):
        def handle_starttag(self, tag, attrs):
            values = dict(attrs)
            for key in ('src', 'href'):
                if key not in values:
                    continue
                ref = values[key]
                parts = urlsplit(ref)
                if parts.scheme or not parts.path or parts.path == '../../':
                    continue
                assert not parts.path.startswith('/'), ref
                target = (root / unquote(parts.path)).resolve()
                assert target.is_relative_to(root.resolve()) and target.is_file(), ref

    for name in ('index.html','effects.html','explore.html','mesh.html','records.html'):
        Links().feed((root / name).read_text(encoding='utf-8'))
    source = (root / 'data.js').read_text(encoding='utf-8')
    files = set(json.loads((root / 'records/manifest.json').read_text(encoding='utf-8'))['files'])
    for path in re.findall(r"(?:doc|record|link):'([^']+)'", source):
        assert path in files, path
    for path in re.findall(r'assets/[a-zA-Z0-9_./-]+\.(?:png|jpg|gif|svg|webp)', source):
        assert (root / path).is_file(), path
    http_count = 0
    if args.url:
        parsed = urlsplit(args.url)
        if parsed.scheme != 'http' or parsed.hostname != '127.0.0.1':
            raise ValueError('HTTP verification is restricted to the local read-only preview')
        paths = ['index.html', 'styles.css', 'app.js', 'data.js', 'records.html', 'records.js',
                 'effects.html','effects.css','effects.js','mesh.html','mesh.js','image-library.json',
                 'explore.html','explore.css','explore-data.js','explore-context.js','integrated-map.js','explore.js',
                 'records/manifest.json'] + [row['path'] for row in manifest['files']]
        for path in paths:
            with urlopen(args.url.rstrip('/') + '/' + path, timeout=10) as response:
                assert response.status == 200, path
            http_count += 1
        origin = parsed.scheme + '://' + parsed.netloc + '/'
        navigation = urlopen(origin, timeout=10).read().decode('utf-8')
        for path in re.findall(r'href="(\./demos/[^"]+)"', navigation):
            with urlopen(origin + path[2:], timeout=10) as response:
                assert response.status == 200, path
    output = {'asset_and_record_hashes': len(manifest['files']), 'http_resources': http_count,
              'relative_paths': 'passed', 'record_allowlist': 'passed'}
    print(json.dumps(output, ensure_ascii=False))


if __name__ == '__main__':
    main()

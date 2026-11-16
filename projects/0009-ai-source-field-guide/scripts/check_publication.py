"""Check the public Pages entry, guide resources and existing published project."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import struct
import time
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'demos/0009-ai-source-field-guide/'


def check(base, relative, kind, local=None, required=()):
    url = base + relative
    result = {'url': url}
    try:
        for attempt in range(3):
            try:
                request = Request(url, headers={'User-Agent': 'AI-Source-Guide-Publication-Check', 'Cache-Control': 'no-cache'})
                with urlopen(request, timeout=20) as response:
                    body = response.read()
                    result.update(status=response.status, content_type=response.headers.get('Content-Type', ''), bytes=len(body))
                break
            except URLError:
                if attempt == 2:
                    raise
                time.sleep(2)
        allowed = {'html': ('text/html',), 'css': ('text/css',),
                   'js': ('application/javascript', 'text/javascript', 'application/x-javascript'),
                   'png': ('image/png',), 'svg': ('image/svg+xml',)}
        assert result['status'] == 200, 'HTTP status'
        assert any(item in result['content_type'] for item in allowed[kind]), 'Unexpected Content-Type'
        for token in required:
            assert token.encode('utf-8') in body, 'Expected content missing: ' + token
        if local:
            expected = (ROOT / 'dist' / local).read_bytes()
            if kind != 'png':
                expected = expected.replace(b'\r\n', b'\n')
                actual = body.replace(b'\r\n', b'\n')
            else:
                actual = body
            result['content_matches_export'] = hashlib.sha256(actual).digest() == hashlib.sha256(expected).digest()
            assert result['content_matches_export'], 'Published content differs from export'
        if kind == 'png' and relative.endswith('relation-map.png'):
            result['image_size'] = list(struct.unpack('>II', body[16:24]))
            assert result['image_size'] == [2400, 1500], 'Guide image dimensions'
        result['sha256'] = hashlib.sha256(body).hexdigest()
        result['ok'] = True
    except Exception as error:
        result.update(ok=False, error=str(error))
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='https://yydshly.github.io/20261115_codex_project/')
    parser.add_argument('--output', type=Path, default=ROOT / 'publication-http-checks.json')
    args = parser.parse_args()
    targets = [('', 'html', None, (PREFIX + 'index.html', PREFIX + 'assets/relation-map.png')),
               ('demos/0001-animation-skills-atlas/summary.html', 'html', None, ()),
               (PREFIX + 'index.html', 'html', 'index.html', ('平台帮你发现', 'assets/relation-map.png')),
               (PREFIX + 'map.html', 'html', 'map.html', ('关系总览', 'assets/relation-map.svg'))]
    targets += [(PREFIX + name, 'js' if name.endswith('.js') else 'css', name, ())
                for name in ('styles.css', 'app.js', 'map.js', 'data.js')]
    targets += [(PREFIX + 'assets/' + name, name.rsplit('.', 1)[1], 'assets/' + name, ())
                for name in ('relation-map.png', 'relation-map.svg', 'source-map.png', 'source-map.svg')]
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda target: check(args.base_url.rstrip('/') + '/', *target), targets))
    report = {'checked_at_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
              'base_url': args.base_url, 'all_passed': all(row['ok'] for row in results), 'checks': results,
              'note': 'Text hashes normalize CRLF to LF; binary PNG matches are exact. Browser interactions are recorded separately.'}
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'all_passed': report['all_passed'], 'checks': len(results),
                      'failures': [row for row in results if not row['ok']]}, ensure_ascii=False))
    return 0 if report['all_passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())

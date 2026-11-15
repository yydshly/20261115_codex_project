"""Fetch publicly published preview assets for LOCAL research, never third-party source/code.

Attribution and the role of each tool live in effect-media.json. These ignored
preview files are not a redistribution license; check rights before publishing.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json
import urllib.request
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'web/public/summary/effects'
OUT.mkdir(parents=True, exist_ok=True)

def fetch(item):
    key, media = item
    url = media.get('download')
    if not url:
        return key, 'local'
    path = OUT / media['file']
    if '--force' not in sys.argv and path.exists() and path.stat().st_size > 1000:
        return key, 'cached'
    try:
        with urllib.request.urlopen(url, timeout=40) as response:
            content = response.read(25_000_001)
        if len(content) > 25_000_000:
            raise ValueError('Preview exceeds 25 MB budget')
        path.write_bytes(content)
        return key, len(content)
    except Exception as error:
        return key, str(error)

if __name__ == '__main__':
    entries = json.loads((ROOT / 'effect-media.json').read_text(encoding='utf-8'))
    selected = [x for x in sys.argv[1:] if not x.startswith('--')]
    if selected:
        entries = {key: value for key, value in entries.items() if key in selected}
    expanded = {}
    for key, media in entries.items():
        expanded[key] = media
        for extra in media.get('assets', []):
            expanded[key + '/' + extra['file']] = extra
    with ThreadPoolExecutor(max_workers=4) as pool:
        for result in pool.map(fetch, expanded.items()):
            print(json.dumps(result, ensure_ascii=False))

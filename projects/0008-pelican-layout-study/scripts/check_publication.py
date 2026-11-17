"""Verify the actual publication package, source attribution and chosen guide."""
from pathlib import Path
import hashlib
import json
from verify_research import verify

ROOT = Path(__file__).resolve().parents[1]


def check():
    result = verify()
    output = ROOT / 'dist'
    record = json.loads((ROOT / 'assets/research-understanding-map-record.json').read_text(encoding='utf-8'))
    for name, expected in record['outputs'].items():
        source = ROOT / 'assets' / name
        published = output / 'assets' / name
        assert hashlib.sha256(source.read_bytes()).hexdigest() == expected['sha256'], name
        assert published.read_bytes() == source.read_bytes(), name
    page = (output / 'index.html').read_text(encoding='utf-8')
    assert 'hero-guide' in page and 'research-understanding-map-20261117.png' in page
    assert 'https://x.com/nft_chen/status/2121616583110115341' in page
    for entry in ['light.html', 'rain.html', 'rain-still.html', 'connections.html', 'portal.html', 'experiments.html']:
        assert (output / entry).is_file() and f'href="{entry}"' in page, entry
    assert (output / 'vendor/three/LICENSE').read_bytes() == (ROOT / 'web/vendor/three/LICENSE').read_bytes()
    files = [p for p in output.rglob('*') if p.is_file()]
    assert not any('originals' in p.parts or 'node_modules' in p.parts or '.git' in p.parts for p in files)
    assert not any(p.suffix.lower() in {'.mp4', '.mov', '.env', '.key', '.pem'} for p in files)
    total = sum(p.stat().st_size for p in files)
    assert total < 40_000_000, total
    result.update({'publication_files': len(files), 'publication_bytes': total,
                   'guide': 'exact chosen PNG/JPG/SVG; SHA-256 verified',
                   'original_video_and_generated_originals': 'not included',
                   'art_quality': 'not reproduced; experiment limits remain visible'})
    return result


if __name__ == '__main__':
    print(json.dumps(check(), ensure_ascii=False, indent=2))

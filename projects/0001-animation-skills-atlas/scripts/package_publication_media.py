"""Package only the media required by the static site, outside Git history."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

ROOT = Path(__file__).resolve().parents[3]
PROJECT = Path(__file__).resolve().parents[1]
PUBLIC = PROJECT / 'web/public'
OUTPUT = ROOT / '.local/publication-media'

def package():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    media = json.loads((PROJECT / 'effect-media.json').read_text(encoding='utf-8'))
    paths = [PUBLIC / name for name in ['atlas-sample.mp4', 'manim-frame.png', 'vector-similarity.mp4']]
    paths += sorted((PUBLIC / 'comparison').glob('*.mp4'))
    paths += sorted((PUBLIC / 'comparison').glob('*-poster.jpg'))
    paths.append(PUBLIC / 'comparison/report.json')
    paths += [PUBLIC / 'showcase-assets/stay-curious-256.gif', PUBLIC / 'showcase-assets/cloudpost-original.json']
    paths += sorted((PUBLIC / 'motion-canvas').rglob('*.js'))
    for key, item in media.items():
        paths.append(PUBLIC / 'summary/effects' / item['poster'])
        if item['type'] == 'gif':
            paths.append(PUBLIC / 'summary/effects' / f'{key}-loop.mp4')
        elif item['type'] == 'video' and not item.get('play'):
            paths.append(PUBLIC / 'summary/effects' / item['file'])
    paths = sorted(set(paths))
    for path in paths:
        if not path.is_file():
            raise FileNotFoundError(path)
        if not path.resolve().is_relative_to(PUBLIC.resolve()):
            raise ValueError('Media path outside project public directory')
    archive = OUTPUT / 'animation-atlas-media-20261115.zip'
    with ZipFile(archive, 'w', ZIP_DEFLATED, compresslevel=6) as bundle:
        for path in paths:
            bundle.write(path, path.relative_to(PUBLIC).as_posix())
    record = {
        'version': '2026-11-15',
        'url': 'https://github.com/yydshly/20261115_codex_project/releases/download/animation-atlas-media-20261115/' + archive.name,
        'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
        'bytes': archive.stat().st_size,
        'files': [{'path': p.relative_to(PUBLIC).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths],
        'purpose': 'Published site display resources; per-item credits and rights remain in THIRD_PARTY_NOTICES.md. Not a commercial stock asset pack.'
    }
    (PROJECT / 'publication-media.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'archive': str(archive), 'files': len(paths), 'bytes': record['bytes'], 'sha256': record['sha256']}))

if __name__ == '__main__':
    package()

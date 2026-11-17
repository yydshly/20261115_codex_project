"""Archive only the concept assets from this conversation; never move sources."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import struct

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ('fantasy-town-concept-v1.png', 'highland-ram-character-v1.png', 'highland-ram-village-v1.png', 'highland-ram-village-v2.png', 'highland-ram-region-v1.png')
RECORDS = ('fantasy-town-concept-v1.generation.json', 'highland-ram-v1.generation.json', 'highland-ram-village-v2.generation.json', 'highland-ram-region-v1.generation.json')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def copy(source, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and digest(source) != digest(dest):
        raise ValueError('Refusing to overwrite a different asset: ' + dest.name)
    if not dest.exists():
        shutil.copy2(source, dest)
    assert digest(source) == digest(dest), 'Asset copy differs'

def portable(value, key=''):
    if isinstance(value, dict):
        return {k: portable(v, k) for k, v in value.items() if k != 'tool_output_hint' and k != 'output_hint'}
    if isinstance(value, list):
        return [portable(v, key) for v in value]
    if isinstance(value, str) and re.match(r'^[A-Z]:[/\\]', value):
        return Path(value.replace('\\', '/')).name
    return value

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    args = parser.parse_args()
    assets = ROOT / 'assets'
    for name in IMAGES:
        copy(args.source_root / name, assets / name)
    copy(args.reference, assets / 'reference-wow.png')
    for name in RECORDS:
        record = portable(json.loads((args.source_root / name).read_text(encoding='utf-8')))
        record['archive_note'] = 'Exact submitted prompts retained; machine-specific absolute paths normalized to basenames and tool path hints omitted.'
        path = assets / 'provenance' / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    files = []
    for name in (*IMAGES, 'reference-wow.png'):
        path = assets / name
        content = path.read_bytes()
        width, height = struct.unpack('>II', content[16:24])
        files.append({'file': name, 'sha256': digest(path), 'bytes': len(content), 'width': width, 'height': height, 'kind': 'third-party reference screenshot' if name == 'reference-wow.png' else 'AI-generated concept, not gameplay'})
    manifest_path = assets / 'manifest.json'
    supplements = json.loads(manifest_path.read_text(encoding='utf-8')).get('supplements', []) if manifest_path.exists() else []
    manifest_path.write_text(json.dumps({'schema_version': 1, 'source_date': '2026-11-15—11-16', 'files': files, 'supplements': supplements}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'images': len(files), 'provenance_records': len(RECORDS), 'copies_verified': True}))

if __name__ == '__main__':
    main()

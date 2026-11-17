"""Retain the unmodified runtime assets in a hash-verified public Release."""
from pathlib import Path, PurePosixPath
from zipfile import ZipFile, ZIP_DEFLATED
import argparse
import hashlib
import json
import urllib.request

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
RECORD = PROJECT / 'publication-media.json'
CACHE = ROOT / '.local/publication-media/valley-garden-media-20261117.zip'
FOLDERS = ('web/assets', 'web/model-version/assets')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def restore(archive=None):
    record = json.loads(RECORD.read_text(encoding='utf-8'))
    bundle = Path(archive) if archive else CACHE
    if not bundle.exists():
        bundle.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(record['url'], timeout=120) as response, bundle.open('wb') as output:
            total = 0
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > 350_000_000:
                    raise ValueError('Release exceeds the 350 MB archive budget')
                output.write(chunk)
    if sha(bundle.read_bytes()) != record['sha256']:
        raise ValueError('Release SHA-256 mismatch')
    expected = {item['path']: item for item in record['files']}
    with ZipFile(bundle) as source:
        if set(source.namelist()) != set(expected) or len(source.namelist()) != len(expected):
            raise ValueError('Release file list mismatch')
        if sum(item['bytes'] for item in expected.values()) > 400_000_000:
            raise ValueError('Uncompressed asset budget exceeded')
        for name, item in expected.items():
            relative = PurePosixPath(name)
            target = PROJECT / name
            if relative.is_absolute() or '..' in relative.parts or '\\' in name or not any(name.startswith(folder + '/') for folder in FOLDERS) or not target.resolve().is_relative_to(PROJECT.resolve()):
                raise ValueError('Unsafe Release path: ' + name)
            data = source.read(name)
            if len(data) != item['bytes'] or sha(data) != item['sha256']:
                raise ValueError('Asset mismatch: ' + name)
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists() or sha(target.read_bytes()) != item['sha256']:
                target.write_bytes(data)
    return len(expected)


def package():
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    files = sorted(p for folder in FOLDERS for p in (PROJECT / folder).rglob('*') if p.is_file())
    records = []
    with ZipFile(CACHE, 'w', ZIP_DEFLATED, compresslevel=9) as bundle:
        for path in files:
            data = path.read_bytes()
            name = path.relative_to(PROJECT).as_posix()
            bundle.writestr(name, data)
            records.append({'path': name, 'bytes': len(data), 'sha256': sha(data)})
    record = {'schema_version': 1, 'url': 'https://github.com/yydshly/20261115_codex_project/releases/download/valley-garden-media-20261117/valley-garden-media-20261117.zip', 'sha256': sha(CACHE.read_bytes()), 'bytes': CACHE.stat().st_size, 'scope': 'Unmodified V1 and V2 runtime assets, provenance and licenses; no upstream reference video.', 'files': records}
    RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'archive': str(CACHE), 'bytes': record['bytes'], 'files': len(files)}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--package', action='store_true')
    parser.add_argument('--archive')
    args = parser.parse_args()
    if args.package:
        package()
    else:
        print(json.dumps({'restored_files': restore(args.archive)}))

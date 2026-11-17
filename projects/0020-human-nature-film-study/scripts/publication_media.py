"""Package or restore only the eight existing AI-film web copies for Pages."""
from pathlib import Path, PurePosixPath
from zipfile import ZipFile, ZipInfo, ZIP_STORED
import argparse
import hashlib
import json
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
VERSION = 'human-nature-film-media-20261117'
FILENAME = VERSION + '.zip'
MAX_BYTES = 50_000_000


def digest(data):
    return hashlib.sha256(data).hexdigest()


def package(output):
    manifest = json.loads((ROOT/'assets/media-manifest.json').read_text(encoding='utf-8'))
    output = Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    files = []
    with ZipFile(output, 'w', ZIP_STORED) as archive:
        for item in manifest['videos']:
            data = (ROOT/'assets'/item['file']).read_bytes()
            if digest(data) != item['sha256'] or len(data) != item['bytes']:
                raise ValueError('Web video changed: '+item['id'])
            info = ZipInfo(item['file'], date_time=(2026, 11, 17, 0, 0, 0))
            info.compress_type = ZIP_STORED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
            files.append({'path': item['file'], 'bytes': len(data), 'sha256': digest(data)})
    data = output.read_bytes()
    if len(data) > MAX_BYTES:
        raise ValueError('Publication media exceeds 50 MB')
    record = {'schema_version': 1, 'version': VERSION,
              'url': f'https://github.com/yydshly/20261115_codex_project/releases/download/{VERSION}/{FILENAME}',
              'bytes': len(data), 'sha256': digest(data), 'files': files,
              'scope': 'Only two AI-film edits and six generated-shot web copies, already created for this study; no third-party reference video, credentials or source logs',
              'credit': '本次讨论、虚构人物与院落参考、ChatArt/Seedance 2.0生成及本地剪辑。975积分为此前已产生的六次任务成本，本次发布未新增生成。'}
    (ROOT/'publication-media.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'archive': str(output), 'bytes': len(data), 'videos': len(files), 'sha256': record['sha256']}))


def hydrate(destination, archive_path=None):
    record = json.loads((ROOT/'publication-media.json').read_text(encoding='utf-8'))
    destination = Path(destination).resolve()
    archive = Path(archive_path).resolve() if archive_path else ROOT/'.local/publication-media'/FILENAME
    if not archive.is_file():
        if archive_path:
            raise FileNotFoundError(archive)
        archive.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(record['url'], timeout=90) as response:
            data = response.read(MAX_BYTES+1)
        if len(data) != record['bytes'] or len(data) > MAX_BYTES or digest(data) != record['sha256']:
            raise ValueError('Downloaded publication archive failed verification')
        archive.write_bytes(data)
    data = archive.read_bytes()
    if len(data) != record['bytes'] or len(data) > MAX_BYTES or digest(data) != record['sha256']:
        raise ValueError('Publication archive failed verification')
    expected = {entry['path']: entry for entry in record['files']}
    manifest = json.loads((ROOT/'assets/media-manifest.json').read_text(encoding='utf-8'))
    if expected != {entry['file']: {'path':entry['file'],'bytes':entry['bytes'],'sha256':entry['sha256']} for entry in manifest['videos']}:
        raise ValueError('Publication archive differs from the original media record')
    payload = []
    with ZipFile(archive) as bundle:
        names = bundle.namelist()
        if len(names) != len(expected) or set(names) != set(expected):
            raise ValueError('Unexpected archive entries')
        for name in names:
            relative = PurePosixPath(name)
            target = (destination/name).resolve()
            if relative.is_absolute() or '..' in relative.parts or '\\' in name or relative.parts[0] != 'videos' or not target.is_relative_to(destination):
                raise ValueError('Unsafe publication archive path')
            item = expected[name]
            if bundle.getinfo(name).file_size != item['bytes']:
                raise ValueError('Wrong publication media length')
            content = bundle.read(name)
            if digest(content) != item['sha256']:
                raise ValueError('Wrong publication media hash')
            payload.append((target, content))
    for target, content in payload:
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.is_file() and digest(target.read_bytes()) == digest(content):
            continue
        if target.exists():
            raise ValueError('Preserve unexpected existing video: '+str(target))
        target.write_bytes(content)
    return len(payload)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package', type=Path)
    parser.add_argument('--hydrate', type=Path)
    parser.add_argument('--archive', type=Path)
    args = parser.parse_args()
    if args.package:
        package(args.package)
    elif args.hydrate:
        print(json.dumps({'restored':hydrate(args.hydrate,args.archive)}))
    else:
        parser.error('Choose --package or --hydrate')

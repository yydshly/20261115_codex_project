"""Verify and restore the explicitly published canal media archive."""
from pathlib import Path, PurePosixPath
from zipfile import ZipFile
import hashlib
import json
import shutil
import urllib.request

PROJECT=Path(__file__).resolve().parents[1]


def safe_target(root,name):
    relative=PurePosixPath(name)
    target=root/name
    if relative.is_absolute() or '..' in relative.parts or '\\' in name or not target.resolve().is_relative_to(root.resolve()):
        raise ValueError('Unsafe publication archive path')
    return target


def digest_file(path):
    digest=hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):digest.update(chunk)
    return digest.hexdigest()


def hydrate(target,archive_path=None,record_path=None):
    record_path=Path(record_path) if record_path else PROJECT/'publication-media.json'
    record=json.loads(record_path.read_text(encoding='utf-8'))
    for item in record.get('viewer_sources',[]):
        if digest_file(PROJECT/item['path'])!=item['sha256']:raise ValueError('Viewer source changed; regenerate publication media: '+item['path'])
    if archive_path:archive=Path(archive_path)
    else:archive=PROJECT.parents[1]/'.local/publication-media'/('canal-'+record['sha256'][:16]+'.zip')
    if not archive.is_file():
        archive.parent.mkdir(parents=True,exist_ok=True)
        temporary=archive.with_suffix('.part')
        request=urllib.request.Request(record['url'],headers={'User-Agent':'canal-research-publication/1'})
        with urllib.request.urlopen(request,timeout=90) as response,temporary.open('wb') as stream:
            total=0
            while chunk:=response.read(1024*1024):
                total+=len(chunk)
                if total>record['bytes']:raise ValueError('Media archive exceeds registered size')
                stream.write(chunk)
        if total!=record['bytes'] or digest_file(temporary)!=record['sha256']:raise ValueError('Downloaded publication media failed integrity check')
        temporary.replace(archive)
    if archive.stat().st_size!=record['bytes'] or digest_file(archive)!=record['sha256']:raise ValueError('Publication media archive checksum mismatch')
    expected={item['path']:item for item in record['files']}
    with ZipFile(archive) as bundle:
        names=bundle.namelist()
        if len(names)!=len(set(names)) or set(names)!=set(expected):raise ValueError('Media archive members differ from allowlist')
        for name in names:
            item=expected[name];output=safe_target(target,name)
            if bundle.getinfo(name).file_size!=item['bytes']:raise ValueError('Media member size mismatch: '+name)
            digest=hashlib.sha256();output.parent.mkdir(parents=True,exist_ok=True)
            if item.get('publish',True):
                with bundle.open(name) as source,output.open('wb') as destination:
                    for chunk in iter(lambda:source.read(1024*1024),b''):digest.update(chunk);destination.write(chunk)
            else:
                with bundle.open(name) as source:
                    for chunk in iter(lambda:source.read(1024*1024),b''):digest.update(chunk)
            if digest.hexdigest()!=item['sha256']:raise ValueError('Media member checksum mismatch: '+name)
    (target/'publication-catalog.json').write_text(json.dumps(record['catalog'],ensure_ascii=False),encoding='utf-8')
    (target/'publication-assets.json').write_text(json.dumps(record['assets'],ensure_ascii=False),encoding='utf-8')
    (target/'media-config.json').write_text(json.dumps({'mode':'published','catalog':'publication-catalog.json','assets':'publication-assets.json'},ensure_ascii=False),encoding='utf-8')
    size=sum(p.stat().st_size for p in target.rglob('*') if p.is_file())
    if size>950_000_000:raise ValueError(f'Canal public site exceeds its 950 MB budget: {size}')
    return {'media_files':len(expected),'site_bytes':size,'mode':'published'}

"""Package and restore only the four transformed research samples for Pages."""
from pathlib import Path,PurePosixPath
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
import argparse,hashlib,json,urllib.request

ROOT=Path(__file__).resolve().parents[1]
ALIASES=('matting.mp4','scene.mp4','complete.mp4','template.mp4')
VERSION='avatar-workflow-media-20261117'
FILENAME=VERSION+'.zip'
MAX_BYTES=25_000_000
def sha(data):return hashlib.sha256(data).hexdigest()
def read(path):return json.loads(Path(path).read_text(encoding='utf-8'))

def package(output):
    output=Path(output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
    mapping=read(ROOT/'.local/media-map.json');original={x['alias']:x for x in read(ROOT/'media.json')['videos']};files=[]
    with ZipFile(output,'w',ZIP_DEFLATED,compresslevel=6) as bundle:
        for alias in ALIASES:
            data=Path(mapping[alias]).read_bytes();expected=original[alias]
            if sha(data)!=expected['sha256'] or len(data)!=expected['bytes']:raise ValueError('Sample changed: '+alias)
            name='media/'+alias;info=ZipInfo(name,date_time=(2026,11,17,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o100644<<16
            bundle.writestr(info,data);files.append({'path':name,'sha256':sha(data),'bytes':len(data)})
    data=output.read_bytes()
    record={'schema_version':1,'version':VERSION,'url':f'https://github.com/yydshly/20261115_codex_project/releases/download/{VERSION}/{FILENAME}',
        'sha256':sha(data),'bytes':len(data),'files':files,
        'scope':'Four transformed postproduction samples for attributed research presentation; full reference and raw comparison videos excluded',
        'credit':'Original presenter, voice and music: @tm_uchal; local compositing, scene code and explanatory Chinese text: this project'}
    (ROOT/'publication-media.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'archive':str(output),'bytes':len(data),'files':len(files),'sha256':record['sha256']}))
    return record

def hydrate(destination,archive_path=None):
    destination=Path(destination).resolve();record=read(ROOT/'publication-media.json')
    cache=Path(archive_path).resolve() if archive_path else ROOT/'.local/publication-media'/FILENAME
    if not cache.is_file():
        if archive_path:raise FileNotFoundError(cache)
        cache.parent.mkdir(parents=True,exist_ok=True)
        with urllib.request.urlopen(record['url'],timeout=60) as response:data=response.read(MAX_BYTES+1)
        if len(data)>MAX_BYTES or len(data)!=record['bytes'] or sha(data)!=record['sha256']:raise ValueError('Downloaded media archive failed checksum')
        cache.write_bytes(data)
    data=cache.read_bytes()
    if len(data)>MAX_BYTES or len(data)!=record['bytes'] or sha(data)!=record['sha256']:raise ValueError('Media archive checksum mismatch')
    expected={x['path']:x for x in record['files']};payload=[]
    with ZipFile(cache) as bundle:
        names=bundle.namelist()
        if len(names)!=len(expected) or set(names)!=set(expected):raise ValueError('Unexpected files in publication archive')
        for name in names:
            relative=PurePosixPath(name);target=(destination/name).resolve()
            if relative.is_absolute() or '..' in relative.parts or '\\' in name or relative.parts[0]!='media' or not target.is_relative_to(destination):raise ValueError('Unsafe archive path')
            item=expected[name]
            if bundle.getinfo(name).file_size!=item['bytes']:raise ValueError('Media file size mismatch')
            content=bundle.read(name)
            if sha(content)!=item['sha256']:raise ValueError('Media file checksum mismatch')
            payload.append((target,content))
    for target,content in payload:
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(content)
    return len(payload)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--package',type=Path);parser.add_argument('--hydrate',type=Path);parser.add_argument('--archive',type=Path);args=parser.parse_args()
    if args.package:package(args.package)
    elif args.hydrate:print(json.dumps({'restored':hydrate(args.hydrate,args.archive)}))
    else:parser.error('Choose --package or --hydrate')
if __name__=='__main__':main()

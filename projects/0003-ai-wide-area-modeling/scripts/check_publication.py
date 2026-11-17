"""Check the exported public media graph and losslessly restored originals."""
from pathlib import Path
import argparse
import gzip
import hashlib
import json
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote

PROJECT=Path(__file__).resolve().parents[1]


class References(HTMLParser):
    def __init__(self):super().__init__();self.urls=[]
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ('href','src') and value:self.urls.append(value)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--site',type=Path,default=PROJECT/'dist');args=parser.parse_args()
    root=args.site.resolve();record=json.loads((PROJECT/'publication-media.json').read_text(encoding='utf-8'))
    assert json.loads((root/'media-config.json').read_text())['mode']=='published'
    files=record['catalog']['files'];restored=0
    refs=[f['url'] for f in files if not f.get('archiveOnly')]+[a['url'] for a in record['assets'].values() if not a.get('archiveOnly')]
    for item in record['catalog']['videos']+record['catalog']['scenes']:refs.extend((item['url'],item['poster']))
    for ref in refs:assert (root/ref).is_file(),ref
    for page in root.rglob('*.html'):
        if 'media' in page.relative_to(root).parts:continue # Original scripts are downloadable evidence.
        parsed=References();parsed.feed(page.read_text(encoding='utf-8'))
        for ref in parsed.urls:
            url=urlsplit(ref)
            if url.scheme or not url.path:continue
            path=(page.parent/unquote(url.path)).resolve()
            assert not url.path.startswith('/'),(page.name,ref)
            # The shared navigation intentionally lives above this project.
            if path==root.parents[1]:continue
            assert path.is_relative_to(root) and path.is_file(),(page.name,ref)
    for file in files:
        if file['extension'] not in ('ply','blend'):continue
        digest=hashlib.sha256()
        with gzip.open(root/file['url'],'rb') as stream:
            while chunk:=stream.read(1024*1024):digest.update(chunk)
        assert digest.hexdigest()==file['sha256'],file['name'];restored+=1
    size=sum(p.stat().st_size for p in root.rglob('*') if p.is_file())
    assert size<950_000_000,size
    print(json.dumps({'public_media_references':len(refs),'losslessly_restored_ply_blend':restored,'site_bytes':size,'status':'passed'}))


if __name__=='__main__':main()

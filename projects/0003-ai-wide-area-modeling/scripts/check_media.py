"""Read-only HTTP media/preview checks plus original-artifact hash audit."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from collections import Counter
import argparse
import hashlib
import json

from artifacts import ROOT


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:52933/demos/0003-ai-wide-area-modeling/');args=parser.parse_args()
    if not args.url.startswith('http://127.0.0.1:'):raise ValueError('Local read-only verification only')
    base=args.url.rstrip('/')+'/'
    catalog=json.load(urlopen(base+'local-api/catalog',timeout=15))
    missing=[]
    for file in catalog['files']:
        with urlopen(Request(base+file['url'],method='HEAD'),timeout=15) as response:
            if int(response.headers['Content-Length'])!=file['bytes']:missing.append(file['name'])
        if file['extension']=='glb':
            with urlopen(Request(base+file['url'],headers={'Range':'bytes=0-11'}),timeout=15) as response:
                assert response.status==206 and response.read(4)==b'glTF',file['name']
    assert not missing,missing
    for video in catalog['videos']:
        assert video['available'],video['title']
        with urlopen(Request(base+video['url'],headers={'Range':'bytes=100-199'}),timeout=15) as response:
            assert response.status==206 and len(response.read())==100
            assert response.headers['Content-Type']=='video/mp4'
    for scene in catalog['scenes']:
        with urlopen(base+scene['url'],timeout=15) as response:
            assert '只读查看' in response.read().decode('utf-8')
    try:urlopen(base+'local-api/files/not-an-allowed-file',timeout=15)
    except HTTPError as error:assert error.code==404
    else:raise AssertionError('Unregistered path unexpectedly exposed')
    baseline=ROOT/'.local/canal-research-web/protected-before.json'
    protected=json.loads(baseline.read_text(encoding='utf-8'))
    for file in protected:
        path=Path(file['path']);digest=hashlib.sha256()
        with path.open('rb') as stream:
            for block in iter(lambda:stream.read(1048576),b''):digest.update(block)
        assert path.stat().st_size==file['bytes'] and digest.hexdigest()==file['sha256'],path.name
    result={'http_files':len(catalog['files']),'images':len(catalog['images']),'videos':len(catalog['videos']),
            'viewers':len(catalog['scenes']),'file_types':dict(Counter(file['extension'] for file in catalog['files'])),
            'protected_originals_unchanged':len(protected),'range_requests':'passed','glb_headers':'passed','unregistered_file':'404'}
    (ROOT/'.local/canal-research-web/media-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))


if __name__=='__main__':main()

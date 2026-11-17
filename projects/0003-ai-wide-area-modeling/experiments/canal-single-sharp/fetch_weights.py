"""Resumable HTTP ranges with a completion journal; official weights stay local."""
import argparse, concurrent.futures, hashlib, json, os, time, urllib.request
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--url',required=True);p.add_argument('--out',required=True);a=p.parse_args()
out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
with urllib.request.urlopen(urllib.request.Request(a.url,method='HEAD'),timeout=30) as r:
    size=int(r.headers['Content-Length']);etag=r.headers.get('ETag','')
span=16*1024*1024;journal=out.with_suffix(out.suffix+'.download.json')
state=json.loads(journal.read_text()) if journal.exists() else dict(url=a.url,size=size,etag=etag,complete=[])
assert (state['url'],state['size'],state['etag'])==(a.url,size,etag)
with open(out,'ab') as f:f.truncate(size)
done=set(state['complete']);jobs=[s for s in range(0,size,span) if s not in done]
t=time.perf_counter()
def fetch(s):
    end=min(size,s+span)-1
    for attempt in range(6):
        try:
            request=urllib.request.Request(a.url,headers={'Range':f'bytes={s}-{end}'})
            with urllib.request.urlopen(request,timeout=40) as r:
                assert r.status==206 and r.headers.get('Content-Range','').startswith(f'bytes {s}-{end}/')
                data=r.read(end-s+2)
                assert len(data)==end-s+1
            with open(out,'r+b') as f:f.seek(s);f.write(data)
            return s
        except Exception as e:
            print('retry',s,attempt+1,str(e),flush=True)
            if attempt==5:raise
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for s in pool.map(fetch,jobs):
        done.add(s);state['complete']=sorted(done)
        journal.write_text(json.dumps(state))
        completed=sum(min(span,size-v) for v in done)
        print(f'{completed/size:.1%} {completed/1e9:.2f}GB {time.perf_counter()-t:.0f}s',flush=True)
h=hashlib.sha256()
with open(out,'rb') as f:
    for b in iter(lambda:f.read(8*1024*1024),b''):h.update(b)
print('COMPLETE',size,h.hexdigest(),flush=True)

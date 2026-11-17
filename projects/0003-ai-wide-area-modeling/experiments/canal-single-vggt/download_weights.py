"""Resume this experiment's public checkpoint with verified HTTP byte ranges."""
import concurrent.futures, hashlib, os, time, urllib.request
from pathlib import Path
import argparse
p=argparse.ArgumentParser();p.add_argument('path');a=p.parse_args()
path=Path(a.path);url='https://huggingface.co/facebook/VGGT-1B/resolve/main/model.safetensors'
with urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=90) as r:
    total=int(r.headers['Content-Length']); target=r.url
prefix=path.stat().st_size if path.exists() else 0
expected='f164acf60724910d8fe1578bb499d800850c7bb0948db7555c413f9fbe60467e'
def digest():
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(8*1024*1024),b''):h.update(chunk)
    return h.hexdigest()
if prefix==total:
    h=digest()
    if h==expected:print('existing complete checkpoint verified');raise SystemExit(0)
    raise RuntimeError('Full-sized checkpoint not verified. Do not treat an interrupted range download as a complete prefix.')
print('checkpoint_bytes',total,'existing_prefix',prefix,flush=True)
# Existing file is the interrupted sequential download, a valid contiguous prefix.
with open(path,'ab') as f:f.truncate(total)
span=32*1024*1024
jobs=[(s,min(s+span,total)-1) for s in range(prefix,total,span)]
done=prefix;start=time.monotonic()
def fetch(bounds):
    s,e=bounds
    for attempt in range(5):
        try:
            req=urllib.request.Request(target,headers={'Range':f'bytes={s}-{e}'})
            with urllib.request.urlopen(req,timeout=120) as r:
                if r.status!=206 or not r.headers.get('Content-Range','').startswith(f'bytes {s}-'):
                    raise RuntimeError('server did not honor exact byte range')
                n=0
                with open(path,'r+b',buffering=0) as f:
                    f.seek(s)
                    while True:
                        b=r.read(1024*1024)
                        if not b:break
                        f.write(b);n+=len(b)
                if n!=e-s+1:raise RuntimeError('short range')
                return n
        except Exception as exc:
            if attempt==4:raise RuntimeError(f'range {s}:{e} failed: {type(exc).__name__}') from None
            time.sleep(1+attempt)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for f in concurrent.futures.as_completed([pool.submit(fetch,j) for j in jobs]):
        done+=f.result()
        print(f'{done/total:.1%} {done/1e9:.2f}GB elapsed={time.monotonic()-start:.0f}s',flush=True)
if digest()!=expected:raise RuntimeError('Checkpoint SHA256 mismatch')
print('download complete; SHA256 verified',flush=True)

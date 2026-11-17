"""Fetch the public CC0 data files selected in the built-in browser, without executing them."""
from pathlib import Path
import hashlib,json,urllib.request

root=Path(__file__).resolve().parent.parent
target=root/'assets/models/life'
target.mkdir(parents=True,exist_ok=True)
urls={
    'gardener.glb':'https://grab3d.com/dl/elderly-woman-rigged/elderly-woman-rigged.glb',
    'gardener-LICENSE.txt':'https://grab3d.com/dl/elderly-woman/LICENSE.txt',
    'gardener-source-manifest.json':'https://grab3d.com/dl/elderly-woman/manifest.json',
    'cow.glb':'https://grab3d.com/dl/cow/cow-light.glb',
    'cow-LICENSE.txt':'https://grab3d.com/dl/cow/LICENSE.txt',
    'cow-source-manifest.json':'https://grab3d.com/dl/cow/manifest.json',
}
entries=[]
for name,url in urls.items():
    path=target/name
    if not path.exists():
        request=urllib.request.Request(url,headers={'User-Agent':'ValleyGarden-local-asset-preparation/1.0'})
        data=urllib.request.urlopen(request,timeout=90).read()
        if name.endswith('.glb') and data[:4]!=b'glTF':raise ValueError('Not a binary glTF asset')
        path.write_bytes(data)
    data=path.read_bytes()
    entries.append({'path':name,'url':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    print(name,len(data),'bytes')
(target/'manifest.json').write_text(json.dumps({'license':'CC0-1.0','source':'Grab3D','retrieved':'2026-11-16','files':entries},indent=2),encoding='utf-8')

"""Restore leaf area lost in the retained mesh LODs; keep every source file unchanged.

Requires numpy and Pillow only for offline preparation, never in the browser.
Each disconnected leaf card expands around its own centre, not around the tree.
The source alpha mask also receives coverage-preserving, explicit mip levels.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'assets/models/trees/jacaranda'
report = {'source': 'https://polyhaven.com/a/jacaranda_tree', 'license': 'CC0-1.0', 'lods': [], 'files': []}

def record(name):
    data = (root/name).read_bytes()
    report['files'].append({'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})

for lod, scale in [('near', 1.20), ('far', 1.55), ('distant', 2.55)]:
    doc = json.loads((root/f'tree-{lod}.gltf').read_text())
    raw = bytearray((root/doc['buffers'][0]['uri']).read_bytes())
    primitive = next(p for p in doc['meshes'][0]['primitives'] if 'leaves' in doc['materials'][p['material']]['name'])
    def array(identifier):
        acc = doc['accessors'][identifier]
        view = doc['bufferViews'][acc['bufferView']]
        return np.frombuffer(raw, dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[acc['componentType']],
                             count=acc['count']*{'VEC3':3,'SCALAR':1}[acc['type']],
                             offset=view.get('byteOffset',0)+acc.get('byteOffset',0))
    positions = array(primitive['attributes']['POSITION']).reshape(-1,3)
    indices = array(primitive['indices']).reshape(-1,3)
    parents = np.arange(len(positions))
    def find(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i
    for a,b,c in indices:
        r = find(a)
        parents[find(b)] = r
        parents[find(c)] = r
    groups = {}
    for i in range(len(positions)):
        groups.setdefault(find(i), []).append(i)
    def area():
        triangles = positions[indices]
        return float(np.linalg.norm(np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0]),axis=1).sum()*.5)
    before = area()
    for vertices in groups.values():
        p = positions[vertices]
        positions[vertices] = p.mean(axis=0)+(p-p.mean(axis=0))*scale
    acc = doc['accessors'][primitive['attributes']['POSITION']]
    acc['min'],acc['max'] = positions.min(axis=0).tolist(),positions.max(axis=0).tolist()
    doc['buffers'][0]['uri'] = f'leafy-tree-{lod}.bin'
    (root/f'leafy-tree-{lod}.bin').write_bytes(raw)
    (root/f'leafy-tree-{lod}.gltf').write_text(json.dumps(doc,separators=(',',':')))
    report['lods'].append({'name':lod,'leafCardScale':scale,'components':len(groups),'leafAreaBefore':before,'leafAreaAfter':area()})
    for suffix in ['bin','gltf']:
        record(f'leafy-tree-{lod}.{suffix}')

mask = np.asarray(Image.open(root/'textures/leaves_alpha_1k.png').convert('RGB'))[:,:,1]
threshold = .30
coverage = float((mask/255 >= threshold).mean())
levels, chunks, offset = [], [], 0
for level in range(11):
    size = 1024 >> level
    reduced = np.asarray(Image.fromarray(mask).resize((size,size),Image.Resampling.BOX)).astype(float)
    if level:
        boundary = float(np.quantile(reduced,1-coverage))
        reduced = np.clip(reduced*((threshold*255+1)/max(boundary,1)),0,255)
    rgba = np.empty((size,size,4),dtype=np.uint8)
    rgba[:,:,:3] = np.rint(reduced).astype(np.uint8)[:,:,None]
    rgba[:,:,3] = 255
    data = rgba.tobytes()
    levels.append({'width':size,'height':size,'offset':offset,'bytes':len(data),'coverage':float((rgba[:,:,1]/255>=threshold).mean())})
    chunks.append(data)
    offset += len(data)
(root/'textures/leaves-coverage.bin').write_bytes(b''.join(chunks))
(root/'textures/leaves-coverage.json').write_text(json.dumps({'alphaTest':threshold,'baseCoverage':coverage,'levels':levels},indent=2)+'\n')
for name in ['textures/leaves-coverage.bin','textures/leaves-coverage.json']:
    record(name)
(root/'leafy-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print('Leaf card area restored:',[(x['name'],round(x['leafAreaBefore']),round(x['leafAreaAfter'])) for x in report['lods']])
print('Coverage mip levels:',[(x['width'],round(x['coverage'],3)) for x in levels])

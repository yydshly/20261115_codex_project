"""Keep needle coverage and pigment at distance; preserve all upstream files."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[1]/'assets/models/trees/fir'
mask=np.asarray(Image.open(root/'textures/fir_sapling_medium_twigs_alpha_1k.png'),dtype=float)
if mask.ndim==3:mask=mask[:,:,0]
mask/=65535 if mask.max()>255 else 255
rgb=np.asarray(Image.open(root/'textures/fir_sapling_medium_twigs_diff_1k.jpg').convert('RGB'),dtype=float)/255
linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
mean=(linear*mask[:,:,None]).sum(axis=(0,1))/mask.sum()
base=float((mask>=.30).mean());alpha_chunks=[];colour_chunks=[];levels=[];offset=0
for level in range(11):
    size=1024>>level
    weights=np.asarray(Image.fromarray(mask.astype(np.float32)).resize((size,size),Image.Resampling.BOX))
    threshold=float(np.quantile(weights,1-base))
    scale=max(1.,.303/max(threshold,1e-6)) if level else 1.
    a=np.clip(np.rint(weights*scale*255),0,255).astype(np.uint8)
    alpha=np.full((size,size,4),255,dtype=np.uint8);alpha[:,:,:3]=a[:,:,None]
    channels=[]
    for c in range(3):
        premul=np.asarray(Image.fromarray((linear[:,:,c]*mask).astype(np.float32)).resize((size,size),Image.Resampling.BOX))
        channels.append(np.where(weights>1e-6,premul/np.maximum(weights,1e-6),mean[c]))
    colour=np.clip(np.stack(channels,axis=-1),0,1)
    srgb=np.where(colour<=.0031308,colour*12.92,1.055*colour**(1/2.4)-.055)
    rgba=np.full((size,size,4),255,dtype=np.uint8);rgba[:,:,:3]=np.rint(srgb*255).astype(np.uint8)
    data=alpha.tobytes();alpha_chunks.append(data);colour_chunks.append(rgba.tobytes())
    levels.append({'width':size,'height':size,'offset':offset,'bytes':len(data),'coverage':float((a/255>=.30).mean())});offset+=len(data)
metadata={'alphaTest':.30,'baseCoverage':base,'levels':levels}
for name,data in [('textures/twigs-alpha-mips.bin',b''.join(alpha_chunks)),('textures/twigs-colour-mips.bin',b''.join(colour_chunks)),('textures/twigs-mips.json',json.dumps(metadata,indent=2).encode())]:
    (root/name).write_bytes(data)
report=json.loads((root/'manifest.json').read_text())
for name in ['textures/twigs-alpha-mips.bin','textures/twigs-colour-mips.bin','textures/twigs-mips.json']:
    data=(root/name).read_bytes();report['files'].append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
report['foliageMips']=metadata
(root/'manifest.json').write_text(json.dumps(report,indent=2))
print('Needle mask coverage:',round(base,3),'->',[round(l['coverage'],3) for l in levels])
print('Retained leaf area:',[(l['name'],[(round(p['retainedArea']/p['sourceArea'],2),round(p['leafScale'],2)) for p in l['parts'] if 'sourceArea' in p]) for l in report['lods']])

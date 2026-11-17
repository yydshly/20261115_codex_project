"""Alpha-weighted, linear-light diffuse mipmaps for the retained CC0 leaf atlas.

Ordinary mipmaps average the atlas's black background into distant leaves.
The independent alpha map needs the colour chain to preserve leaf colour too.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[1]/'assets/models/trees/jacaranda'
rgb=np.asarray(Image.open(root/'textures/jacaranda_tree_leaves_diff_1k.jpg').convert('RGB'),dtype=float)/255
alpha=np.asarray(Image.open(root/'textures/leaves_alpha_1k.png').convert('RGB'),dtype=float)[:,:,1]/255
linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
mean=(linear*alpha[:,:,None]).sum(axis=(0,1))/alpha.sum()
chunks=[];levels=[];offset=0
for level in range(11):
    size=1024>>level
    weights=np.asarray(Image.fromarray(alpha.astype(np.float32)).resize((size,size),Image.Resampling.BOX))
    channels=[]
    for c in range(3):
        premul=np.asarray(Image.fromarray((linear[:,:,c]*alpha).astype(np.float32)).resize((size,size),Image.Resampling.BOX))
        channels.append(np.where(weights>1e-5,premul/np.maximum(weights,1e-5),mean[c]))
    colour=np.clip(np.stack(channels,axis=-1),0,1)
    srgb=np.where(colour<=.0031308,colour*12.92,1.055*colour**(1/2.4)-.055)
    rgba=np.full((size,size,4),255,dtype=np.uint8);rgba[:,:,:3]=np.rint(srgb*255).astype(np.uint8)
    data=rgba.tobytes();chunks.append(data)
    levels.append({'width':size,'height':size,'offset':offset,'bytes':len(data),'meanRGB':rgba[:,:,:3].mean(axis=(0,1)).round(2).tolist()});offset+=len(data)
path='textures/leaves-colour-mips.bin';data=b''.join(chunks);(root/path).write_bytes(data)
report={'source':'https://polyhaven.com/a/jacaranda_tree','license':'CC0-1.0','method':'Alpha-weighted BOX mipmaps in linear RGB; source files unchanged','levels':levels,'files':[{'path':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}]}
(root/'leaf-colour-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print('Preserved distant leaf colour:',levels[-1]['meanRGB'])

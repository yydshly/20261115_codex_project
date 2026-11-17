"""Keep subpixel scan grass visible without changing the downloaded originals."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[1]/'assets/models/plants'
source=root/'grass_medium_02/textures';out=root/'grass_mips';out.mkdir(exist_ok=True)
alpha=np.asarray(Image.open(source/'grass_medium_02_alpha_1k.png').convert('RGB'),dtype=float)[:,:,1]/255
rgb=np.asarray(Image.open(source/'grass_medium_02_diff_1k.jpg').convert('RGB'),dtype=float)/255
linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
average=(linear*alpha[:,:,None]).sum(axis=(0,1))/alpha.sum()
threshold=.28;coverage=float((alpha>=threshold).mean());masks=[];colours=[];levels=[];offset=0
for level in range(10):
    size=512>>level
    weight=np.asarray(Image.fromarray(alpha.astype(np.float32)).resize((size,size),Image.Resampling.BOX))
    boundary=float(np.quantile(weight,1-coverage))
    mask=np.clip(weight*((threshold+1/255)/max(boundary,1/255)),0,1)
    mask_rgba=np.full((size,size,4),255,dtype=np.uint8);mask_rgba[:,:,:3]=np.rint(mask*255).astype(np.uint8)[:,:,None]
    channels=[]
    for c in range(3):
        weighted=np.asarray(Image.fromarray((linear[:,:,c]*alpha).astype(np.float32)).resize((size,size),Image.Resampling.BOX))
        channels.append(np.where(weight>1e-5,weighted/np.maximum(weight,1e-5),average[c]))
    colour=np.clip(np.stack(channels,axis=-1),0,1)
    srgb=np.where(colour<=.0031308,colour*12.92,1.055*colour**(1/2.4)-.055)
    colour_rgba=np.full((size,size,4),255,dtype=np.uint8);colour_rgba[:,:,:3]=np.rint(srgb*255).astype(np.uint8)
    mask_bytes=mask_rgba.tobytes();colour_bytes=colour_rgba.tobytes();masks.append(mask_bytes);colours.append(colour_bytes)
    levels.append({'width':size,'height':size,'offset':offset,'bytes':len(mask_bytes),'coverage':float((mask_rgba[:,:,1]/255>=threshold).mean())});offset+=len(mask_bytes)
(out/'alpha.bin').write_bytes(b''.join(masks));(out/'colour.bin').write_bytes(b''.join(colours))
(out/'levels.json').write_text(json.dumps({'alphaTest':threshold,'baseCoverage':coverage,'levels':levels},indent=2)+'\n')
files=[]
for name in ['alpha.bin','colour.bin','levels.json']:
    data=(out/name).read_bytes();files.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(out/'manifest.json').write_text(json.dumps({'source':'https://polyhaven.com/a/grass_medium_02','license':'CC0-1.0','method':'Alpha coverage and linear-light colour mipmaps, original images unchanged','files':files},indent=2)+'\n')
print('Grass coverage levels:',[(l['width'],round(l['coverage'],3)) for l in levels])

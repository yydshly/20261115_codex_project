"""Original canal image -> official SHARP -> new 3D Gaussian PLY.

No historical Blender models or VGGT outputs are read.
"""
import argparse, contextlib, hashlib, json, logging, sys, time, types
from pathlib import Path
import numpy as np
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--weights',required=True)
p.add_argument('--image',required=True);p.add_argument('--out',required=True)
p.add_argument('--device',choices=['cpu','cuda'],default='cuda');p.add_argument('--support');a=p.parse_args()
if a.support:sys.path.insert(0,a.support)
sys.path.insert(0,str(Path(a.source)/'src'))
import torch
import torch.nn.functional as F
from sharp.models import PredictorParams,create_predictor
from sharp.utils.gaussians import Gaussians3D,save_ply,unproject_gaussians
logging.basicConfig(level=logging.INFO,format='%(asctime)s %(message)s')
out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
torch.set_num_threads(6);device=torch.device(a.device);start=time.perf_counter()
if a.device=='cuda':
    assert torch.cuda.is_available()
    print('CUDA',torch.cuda.get_device_name(),torch.cuda.mem_get_info(),flush=True)
print('Constructing official default predictor',flush=True)
model=create_predictor(PredictorParams())
state=torch.load(a.weights,map_location='cpu',weights_only=True,mmap=True)
model.load_state_dict(state,assign=True);del state
model.eval();model=model.to(device=device,dtype=torch.float16 if a.device=='cuda' else torch.float32)

# ViT patches are independent samples. Chunk only the batch dimension to lower
# peak memory, retaining the official 1536x1536 input and all original patches.
def chunk_forward(original,x):
    if len(x)<=4:return original(x)
    values=[original(chunk) for chunk in x.split(4)]
    return torch.cat([v[0] for v in values]),{k:torch.cat([v[1][k] for v in values]) for k in values[0][1]}
for name,module in model.named_modules():
    if module.__class__.__name__=='TimmViT':
        original=module.forward
        module.forward=lambda x,_f=original:chunk_forward(_f,x)
        print('Chunking ViT patches:',name,flush=True)
for name in ['monodepth_model','init_model','feature_model','prediction_head','gaussian_composer']:
    getattr(model,name).register_forward_hook(lambda m,i,o,_n=name:print('Finished',_n,f'{time.perf_counter()-start:.1f}s',flush=True))

with Image.open(a.image) as im:
    assert not im.getexif(), 'This runner expects the original uncalibrated concept PNG without EXIF'
    image=np.asarray(im.convert('RGB')).copy()
height,width=image.shape[:2]
# Exact official io.load_rgb fallback for this PNG, without unrelated HEIF,
# plotting and video imports. No calibration or focal optimization is added.
fpx=30.0*np.sqrt(width**2+height**2)/np.sqrt(36**2+24**2)
size=1536
image_pt=torch.from_numpy(image.copy()).float().to(device).permute(2,0,1)/255.
resized=F.interpolate(image_pt[None],size=(size,size),mode='bilinear',align_corners=True)
factor=torch.tensor([fpx/width],device=device,dtype=torch.float32)
t=time.perf_counter()
with torch.inference_mode(),(torch.autocast('cuda',dtype=torch.float16) if a.device=='cuda' else contextlib.nullcontext()):
    ndc=model(resized,factor)
if a.device=='cuda':torch.cuda.synchronize()
predict_seconds=time.perf_counter()-t
ndc=Gaussians3D(*(v.float() for v in ndc))
del model,resized,image_pt
import gc;gc.collect()
if a.device=='cuda':torch.cuda.empty_cache()
K=torch.tensor([[fpx,0,width/2,0],[0,fpx,height/2,0],[0,0,1,0],[0,0,0,1]],device=device,dtype=torch.float32)
Kr=K.clone();Kr[0]*=size/width;Kr[1]*=size/height
with torch.inference_mode():
    gaussians=unproject_gaussians(ndc,torch.eye(4,device=device),Kr,(size,size))
    for name,v in zip(Gaussians3D._fields,gaussians):assert torch.isfinite(v).all(),name
    ply=out/'canal-sharp.ply'
    save_ply(gaussians,fpx,(height,width),ply)
z=gaussians.mean_vectors[0,:,2].detach().cpu().numpy()
report=dict(model='Apple SHARP',source_commit='aed6527499ef91cba3b54c18d49a870f25947190',
    image=str(Path(a.image).resolve()),input_sha256=hashlib.sha256(Path(a.image).read_bytes()).hexdigest(),
    input_resolution=[width,height],internal_resolution=[size,size],
    focal_px=float(fpx),focal_source='Official load_rgb EXIF or fallback 30mm; concept PNG has no calibrated camera',
    device=torch.cuda.get_device_name() if a.device=='cuda' else 'CPU',torch=torch.__version__,dtype='FP16 model and CUDA autocast, Float32 unprojection' if a.device=='cuda' else 'Float32',
    adaptation='Independent ViT image patches processed in batches of at most 4; no input-resolution reduction',
    gaussian_count=int(gaussians.mean_vectors.numel()//3),inference_seconds=predict_seconds,
    total_seconds=time.perf_counter()-start,depth_percentiles=np.percentile(z,[1,10,50,90,99]).tolist(),
    gpu_peak_allocated_bytes=torch.cuda.max_memory_allocated() if a.device=='cuda' else None,ply_bytes=ply.stat().st_size,
    ply_sha256=hashlib.sha256(ply.read_bytes()).hexdigest(),old_models_used=False,
    scope='Single-image Gaussian prediction; unseen geometry and metric scale are not independently verified; research-only model use')
(out/'inference.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('COMPLETE',json.dumps(report),flush=True)

"""Run official VGGT on the original canal reference. No network/model download here."""
import argparse, functools, hashlib, json, struct, sys, time
from pathlib import Path
import numpy as np
from PIL import Image

p=argparse.ArgumentParser()
p.add_argument('--source',required=True); p.add_argument('--weights',required=True)
p.add_argument('--image',required=True); p.add_argument('--out',required=True)
a=p.parse_args(); out=Path(a.out); out.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,a.source)
import torch
from vggt.models.vggt import VGGT
from vggt.utils.load_fn import load_and_preprocess_images
from vggt.utils.pose_enc import pose_encoding_to_extri_intri

torch.set_num_threads(6)
t=time.perf_counter(); print('Constructing model on meta device',flush=True)
linspace=torch.linspace
# DINO's init reads scalar drop-path rates; keep that tiny schedule on CPU.
torch.linspace=functools.partial(linspace,device='cpu')
try:
    with torch.device('meta'):
        model=VGGT(enable_point=False,enable_track=False)
finally:
    torch.linspace=linspace
names=set(model.state_dict())
# Streaming avoids a 5 GB Windows file mapping / commit reservation.
# Keep checkpoint values, converting float parameters to BF16 for this CPU run.
state={}
with open(a.weights,'rb') as f:
    header_length=struct.unpack('<Q',f.read(8))[0]
    header=json.loads(f.read(header_length)); data_start=8+header_length
    for name in sorted(names):
        item=header[name]; begin,end=item['data_offsets']
        assert item['dtype']=='F32', (name,item['dtype'])
        f.seek(data_start+begin)
        array=np.fromfile(f,dtype='<f4',count=(end-begin)//4).reshape(item['shape'])
        state[name]=torch.from_numpy(array).to(torch.bfloat16)
    del array
model.load_state_dict(state,assign=True)
del state
model.eval()
print('Loaded official camera/depth heads; CPU BF16 autocast',flush=True)
images=load_and_preprocess_images([a.image],mode='crop')
print('Input',list(images.shape),flush=True)
start=time.perf_counter()
with torch.inference_mode(), torch.autocast('cpu',dtype=torch.bfloat16):
    pred=model(images)
with torch.inference_mode():
    ext,K=pose_encoding_to_extri_intri(pred['pose_enc'].float(),images.shape[-2:])
depth=pred['depth'][0,0,:,:,0].float().numpy(); conf=pred['depth_conf'][0,0].float().numpy()
rgb=(images[0].permute(1,2,0).numpy()*255).round().astype('uint8')
intr=K[0,0].numpy(); extr=ext[0,0].numpy()
H,W=depth.shape; yy,xx=np.mgrid[:H,:W]
xyz=np.stack(((xx-intr[0,2])/intr[0,0]*depth,(yy-intr[1,2])/intr[1,1]*depth,depth),-1)
np.savez_compressed(out/'prediction.npz',depth=depth,confidence=conf,rgb=rgb,K=intr,extrinsic=extr,points_camera=xyz)
Image.fromarray(rgb).save(out/'model-input.png')
lo,hi=np.percentile(np.log(np.maximum(depth,1e-8)),[2,98])
v=np.clip((np.log(np.maximum(depth,1e-8))-lo)/(hi-lo),0,1)
color=np.stack((np.clip(1.5-abs(4*v-3),0,1),np.clip(1.5-abs(4*v-2),0,1),np.clip(1.5-abs(4*v-1),0,1)),-1)
Image.fromarray((color*255).astype('uint8')).save(out/'depth-color.png')
Image.fromarray((np.clip(conf/np.percentile(conf,98),0,1)*255).astype('uint8')).save(out/'confidence.png')
report=dict(model='facebook/VGGT-1B',source_commit='a288dd0f14786c93483e45524328726ab7b1b4ce',device='cpu',dtype='bfloat16 weights and CPU autocast; pose decoding float32',heads=['camera','depth'],input_sha256=hashlib.sha256(Path(a.image).read_bytes()).hexdigest(),input_shape=list(images.shape),inference_seconds=time.perf_counter()-start,total_seconds=time.perf_counter()-t,depth_percentiles=np.percentile(depth,[0,5,50,95,100]).tolist(),K=intr.tolist(),extrinsic=extr.tolist(),scale='arbitrary, not measured metres',torch=torch.__version__,numpy=np.__version__)
(out/'inference.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)

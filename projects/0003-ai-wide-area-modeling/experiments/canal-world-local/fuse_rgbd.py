"""Deterministic local RGB-D -> oriented surface Gaussians.

No learned prior, external model, SfM, or invented camera pose is involved.
Colors are display-referred Cycles appearance, baked for a named light preset.
"""
import os
os.environ['OPENCV_IO_ENABLE_OPENEXR']='1'
import argparse,json,hashlib,sys,time
from pathlib import Path
import numpy as np
import cv2
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--support',required=True);p.add_argument('--preset',default='warm');p.add_argument('--stride',type=int,default=3);p.add_argument('--voxel',type=float,default=.024);p.add_argument('--surface',action='store_true');a=p.parse_args();sys.path.insert(0,a.support);suffix='-surface' if a.surface else ''
from plyfile import PlyData,PlyElement
out=Path(a.out);manifest=json.loads((out/('dataset-'+a.preset+'.json')).read_text());views=manifest['views'];started=time.perf_counter();arrays=[];observations=[];data={}
def read(path):
 # Blender writes vector EXRs with X/Y/Z channels. OpenCV expects B/G/R.
 # Rename the header in memory; retain the ordered float channel payload.
 blob=bytearray(Path(path).read_bytes());tag=b'channels\x00chlist\x00';start=blob.index(tag)+len(tag)+4;cursor=start;names=[]
 while blob[cursor]:
  end=blob.index(0,cursor);names.append((cursor,bytes(blob[cursor:end])));cursor=end+17
 vector=[n for _,n in names]==[b'X',b'Y',b'Z']
 if vector:
  for (offset,_),name in zip(names,b'BGR'):blob[offset]=name
 v=cv2.imdecode(np.frombuffer(blob,dtype=np.uint8),cv2.IMREAD_UNCHANGED)
 if v is None:raise RuntimeError('EXR failed: '+str(path))
 return v if vector or v.ndim==2 else v[:,:,::-1]
for vi,v in enumerate(views):
 pos=read(v['position'])[:,:,:3];normal=read(v['normal'])[:,:,:3];idx=read(v['index']);idx=idx[:,:,0] if idx.ndim==3 else idx;rgb=np.asarray(Image.open(v['rgb']).convert('RGB'))/255.
 data[v['name']]=(v,pos,idx)
 h,w=idx.shape;ys,xs=np.mgrid[0:h:a.stride,0:w:a.stride];P=pos[ys,xs].reshape(-1,3);N=normal[ys,xs].reshape(-1,3);I=np.rint(idx[ys,xs].ravel()).astype(int);C=rgb[ys,xs].reshape(-1,3);UV=np.c_[xs.ravel()+.5,ys.ravel()+.5]
 M=np.array(v['matrix_world']);cam=(P-M[:3,3])@M[:3,:3];depth=-cam[:,2];nl=np.linalg.norm(N,axis=1)
 valid=np.isfinite(P).all(1)&(depth>.15)&(depth<110)&(nl>.5)&np.isin(I,[1,2])
 # Reject depth discontinuities so a large surface splat cannot bridge a doorway.
 px=pos[ys,np.minimum(xs+1,w-1)].reshape(-1,3);py=pos[np.minimum(ys+1,h-1),xs].reshape(-1,3);edge=np.maximum(np.linalg.norm(P-px,axis=1),np.linalg.norm(P-py,axis=1));valid&=edge<np.maximum(.035,depth/v['fx']*5)
 # Shading normals contain procedural bump. Surface orientation must instead
 # follow the position derivatives, otherwise a flat wall becomes corrugated.
 N=np.cross(px-P,py-P);nl=np.linalg.norm(N,axis=1);valid&=nl>1e-10
 projected=np.c_[cam[:,0]/depth*v['fx']+w/2,-cam[:,1]/depth*v['fx']+h/2];err=np.linalg.norm(projected[valid]-UV[valid],axis=1)
 direction=P-M[:3,3];direction/=np.maximum(np.linalg.norm(direction,axis=1,keepdims=True),1e-6)
 facing=np.abs(np.sum(N/np.maximum(nl[:,None],1e-6)*direction,axis=1))
 radius=np.clip(depth/v['fx']*a.stride*.95/np.sqrt(np.maximum(facing,.12)),.003,.24)
 weights=np.maximum(facing,.1)/np.maximum(depth,.2)**2
 rows=np.c_[P[valid],N[valid]/nl[valid,None],C[valid],radius[valid],I[valid],np.full(valid.sum(),vi),weights[valid]]
 arrays.append(rows.astype(np.float32));observations.append({'view':v['name'],'samples':int(valid.sum()),'position_reprojection_px_mean':float(np.mean(err)),'position_reprojection_px_p99':float(np.percentile(err,99))})
 print('OBSERVATION',v['name'],int(valid.sum()),float(np.mean(err)),flush=True)

# Cross-view validation uses another rendered depth buffer, including occlusion.
checks=[]
for an,bn in [('hero','cafe-front'),('street-left','street-right'),('interior-right','interior-left'),('interior-back','cafe-front'),('opposite','hero')]:
 va,pa,ia=data[an];vb,pb,ib=data[bn];P=pa[::12,::12].reshape(-1,3);I=ia[::12,::12].ravel();M=np.array(vb['matrix_world']);cp=(P-M[:3,3])@M[:3,:3];z=-cp[:,2];uv=np.c_[cp[:,0]/np.maximum(z,.001)*vb['fx']+vb['width']/2,-cp[:,1]/np.maximum(z,.001)*vb['fx']+vb['height']/2];uv=np.floor(uv).astype(int);valid=(z>.1)&(uv[:,0]>=0)&(uv[:,0]<vb['width'])&(uv[:,1]>=0)&(uv[:,1]<vb['height'])&np.isin(np.rint(I),[1,2]);P=P[valid];z=z[valid];uv=uv[valid];Q=pb[uv[:,1],uv[:,0]];J=ib[uv[:,1],uv[:,0]];qz=-((Q-M[:3,3])@M[:3,:3])[:,2];tol=np.maximum(.045,z/vb['fx']*3);comparable=np.isin(np.rint(J),[1,2]);visible=comparable&(z<=qz+tol);distance=np.linalg.norm(P-Q,axis=1);consistent=visible&(distance<=tol*1.5);violations=visible&(z<qz-tol*1.5)
 checks.append({'pair':[an,bn],'projected':len(P),'occluded':int((comparable&~visible).sum()),'visible_comparable':int(visible.sum()),'consistent':int(consistent.sum()),'possible_depth_conflicts':int(violations.sum()),'visible_consistency_ratio':float(consistent.sum()/max(1,visible.sum())),'median_surface_distance':float(np.median(distance[consistent])) if consistent.any() else None})
raw=np.concatenate(arrays);P=raw[:,:3];N=raw[:,3:6]
key=np.c_[np.floor(P/a.voxel).astype(np.int32),np.floor((N+1)*3).astype(np.int32),raw[:,10].astype(np.int32)]
_,inverse,counts=np.unique(key,axis=0,return_inverse=True,return_counts=True);count=len(counts);acc=np.empty((count,11),np.float32);weight_sum=np.bincount(inverse,weights=raw[:,12],minlength=count)
for i in range(11):acc[:,i]=np.bincount(inverse,weights=raw[:,i]*raw[:,12],minlength=count)/weight_sum
# Keep the best spatial sampling instead of inflating close-up details with
# the radius of a distant observation of the same surface.
minimum_radius=np.full(count,np.inf,np.float32);np.minimum.at(minimum_radius,inverse,raw[:,9]);acc[:,9]=minimum_radius
acc[:,3:6]/=np.maximum(np.linalg.norm(acc[:,3:6],axis=1,keepdims=True),1e-6)
dtype=[(k,'f4') for k in ['x','y','z','f_dc_0','f_dc_1','f_dc_2','opacity','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3']]
def save(name,sel):
 r=acc[sel];v=np.zeros(len(r),dtype=dtype)
 for i,k in enumerate(['x','y','z']):v[k]=r[:,i]
 for i,k in enumerate(['f_dc_0','f_dc_1','f_dc_2']):v[k]=(r[:,6+i]-.5)/.28209479177387814
 v['opacity']=np.log(.92/.08);rad=r[:,9]
 v['scale_0']=np.log(rad);v['scale_1']=np.log(rad);v['scale_2']=-40 if a.surface else np.log(np.minimum(rad*.1,.006))
 n=r[:,3:6];q=np.c_[1+n[:,2],-n[:,1],n[:,0],np.zeros(len(n))];degenerate=np.linalg.norm(q,axis=1)<1e-5;q[degenerate]=[0,1,0,0];q/=np.linalg.norm(q,axis=1,keepdims=True)
 for i in range(4):v['rot_'+str(i)]=q[:,i]
 PlyData([PlyElement.describe(v,'vertex')],text=False).write(out/name);return len(v)
static=acc[:,10]<1.5;ns=save('world-'+a.preset+suffix+'.ply',static);nd=save('door-'+a.preset+suffix+'.ply',~static)
if not a.surface:np.savez_compressed(out/('fusion-'+a.preset+'.npz'),position=acc[:,:3],normal=acc[:,3:6],color=acc[:,6:9],radius=acc[:,9],semantic=acc[:,10],support=counts)
report={'preset':a.preset,'input_views':len(views),'raw_samples':len(raw),'static_gaussians':ns,'door_gaussians':nd,'voxel':a.voxel,'stride':a.stride,'samples_supported_by_multiple_views':int((counts>1).sum()),'camera_checks':observations,'cross_view_depth_checks':checks,'seconds':time.perf_counter()-started,'coordinates':'Blender world Z up; viewer applies the fixed Blender-to-Three rotation','appearance':'Baked display-referred RGB, degree-zero SH; glass skipped; specular reflections are approximate','scope':'Surface Gaussian cache of a designed editable master. Not learned novel-view completion and not trained 3DGS optimization. A held-out view remains a separate visual quality test.'}
report['surface_2d']=a.surface
(out/('fusion-'+a.preset+suffix+'.json')).write_text(json.dumps(report,indent=2));print('FUSION',json.dumps({k:report[k] for k in ['raw_samples','static_gaussians','door_gaussians','seconds']}),flush=True)

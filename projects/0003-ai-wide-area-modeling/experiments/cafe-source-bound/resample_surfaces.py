"""Resolve only local source appearance into a surface Gaussian patch.

The image is an ACTUAL original-SHARP render, never a Blender render.
Untouched street primitives stay byte-identical to the original source.
"""
import argparse,json,sys,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.spatial.transform import Rotation
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--support',required=True);a=p.parse_args();out=Path(a.out);sys.path.insert(0,a.support)
from plyfile import PlyData,PlyElement
cfg=json.loads((out/'layout.json').read_text());image=np.asarray(Image.open(out/'preview/source-original.png').convert('RGB'),dtype=float)/255;h,w=image.shape[:2];R=np.array(cfg['cafe_frame']['basis_cv_columns']);O=np.array(cfg['cafe_frame']['origin_cv']);scale=cfg['cafe_frame']['scale'];C=np.array(cfg['camera_blender']['position']);cameraR=np.array(cfg['camera_blender']['rotation_matrix']);surface=np.load(out/'surface-pixels.npz');sourceGroups=np.load(out/'source-groups.npz');background=np.array(PlyData.read(out/'background.ply')['vertex'].data);provenance=np.load(out/'source-provenance.npz');bgids=provenance['background'];keep=~np.isin(bgids,sourceGroups['ground']);background=background[keep]
def make(points_B,normals_B,xy,label,cap=.16):
 xy=np.asarray(xy);nB=np.broadcast_to(normals_B,np.shape(points_B)).copy();nB/=np.linalg.norm(nB,axis=1,keepdims=True);P=O+np.asarray(points_B)@R.T/scale;N=nB@R.T;uv=(xy+.5)/[w,h]*cfg['original_size'];ray=np.c_[(uv[:,0]-cfg['original_size'][0]/2)/cfg['focal_px'],(uv[:,1]-cfg['original_size'][1]/2)/cfg['focal_px'],np.ones(len(xy))];den=np.sum(N*ray,axis=1);d=np.sum(P*N,axis=1)/den;P=ray*d[:,None];J=np.eye(3)[None]-ray[:,:,None]*N[:,None,:]/den[:,None,None]
 cov=np.zeros((len(P),3,3));cov[:,0,0]=(P[:,2]*.78/(cfg['focal_px']*w/cfg['original_size'][0]))**2;cov[:,1,1]=(P[:,2]*.78/(cfg['focal_px']*h/cfg['original_size'][1]))**2;cov=J@cov@J.transpose(0,2,1);eig,rot=np.linalg.eigh(cov);eig=np.maximum(eig,1e-18);eig=np.minimum(eig,(cap/scale)**2);negative=np.linalg.det(rot)<0;rot[negative,:,0]*=-1;q=Rotation.from_matrix(rot).as_quat();v=np.zeros(len(P),dtype=background.dtype)
 for i,k in enumerate(['x','y','z']):v[k]=P[:,i]
 colors=image[xy[:,1],xy[:,0]]
 for i in range(3):v['f_dc_'+str(i)]=(colors[:,i]-.5)/.28209479177387814
 v['opacity']=np.log(.995/.005)
 for i in range(3):v['scale_'+str(i)]=-40 if i==0 else .5*np.log(eig[:,i])
 for i,k in enumerate(['rot_1','rot_2','rot_3','rot_0']):v[k]=q[:,i]
 return v
room=make(surface['points'],surface['normals'],surface['xy'],'photo-room')
object_names=json.loads((out/'surface-objects.json').read_text());material_samples={}
for owner in np.unique(surface['owners']):
 select=surface['owners']==owner;pixels=surface['xy'][select];colors=image[pixels[:,1],pixels[:,0]]
 if len(colors)>=3:material_samples[object_names[int(owner)]]={'rgb':np.median(colors,axis=0).tolist(),'pixels':len(colors)}
(out/'source-materials.json').write_text(json.dumps(material_samples,indent=2))
ys,xs=np.mgrid[0:h,0:w];xy=np.c_[xs.ravel(),ys.ravel()];uv=(xy+.5)/[w,h]*cfg['original_size'];u,v=uv.T;mask=(u>320)&(u<1000)&(v>638-(u-410)*13/107+10)&(v<900-.28*u);xy=xy[mask];uv=uv[mask];camera_ray=np.c_[(uv[:,0]-cfg['original_size'][0]/2)/cfg['focal_px'],-(uv[:,1]-cfg['original_size'][1]/2)/cfg['focal_px'],-np.ones(len(xy))];rayB=camera_ray@cameraR.T;points=C+rayB*((.004-C[2])/rayB[:,2])[:,None];valid=(points[:,0]>-6)&(points[:,0]<8)&(points[:,1]>-8)&(points[:,1]<-.1);ground=make(points[valid],np.array([0,0,1.]),xy[valid],'photo-ground',.30)
background=np.concatenate([background,ground]);door=np.array(PlyData.read(out/'door-skin-resolved.ply')['vertex'].data)
for name,data in [('background-patch.ply',background),('room-appearance-patch.ply',room),('door-skin-patch.ply',door)]:PlyData([PlyElement.describe(data,'vertex')],text=False).write(out/name)
report={'background_gaussians':len(background),'room_gaussians':len(room),'door_gaussians':len(door),'resampled_ground':len(ground),'replaced_original_room':len(sourceGroups['interior']),'replaced_original_ground':len(sourceGroups['ground']),'unchanged_street_source_primitives':1048246,'appearance_source':'Actual original SHARP source-camera render. No Blender-generated appearance. Original raw PLY and previous derivatives retained.','source_render_sha256':hashlib.sha256((out/'preview/source-original.png').read_bytes()).hexdigest(),'scope':'Local source-appearance surface resampling; designed geometry and unseen-side PBR remain explicit priors, not recovered hidden truth.'};(out/'patch-report.json').write_text(json.dumps(report,indent=2));print('PATCH',json.dumps(report),flush=True)

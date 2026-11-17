"""Attach original Gaussian appearance to explicit surfaces without recoloring.

Ray-plane Jacobians transport covariance to preserve the source-camera ellipse.
The surface geometry is a designed prior, not recovered hidden ground truth.
"""
import argparse,json,sys,time,hashlib
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--out',required=True);p.add_argument('--support',required=True);p.add_argument('--resolve-color',action='store_true');a=p.parse_args();sys.path.insert(0,a.support);suffix='-resolved' if a.resolve_color else ''
from plyfile import PlyData,PlyElement
out=Path(a.out);cfg=json.loads((out/'layout.json').read_text());meta=json.loads((out/'preparation.json').read_text());source=Path(a.source);v=np.array(PlyData.read(source)['vertex'].data);initial=v.copy();P=np.c_[v['x'],v['y'],v['z']].astype(float);R=np.array(cfg['cafe_frame']['basis_cv_columns']);O=np.array(cfg['cafe_frame']['origin_cv']);scale=cfg['cafe_frame']['scale'];B=(P-O)@R*scale;C=np.array(cfg['camera_blender']['position']);groups=np.load(out/'source-groups.npz');hits=np.load(out/'query-hits.npz');records=[]
def covariance(data):
 q=np.c_[data['rot_1'],data['rot_2'],data['rot_3'],data['rot_0']];q/=np.linalg.norm(q,axis=1,keepdims=True);rot=Rotation.from_quat(q).as_matrix();var=np.exp(2*np.c_[data['scale_0'],data['scale_1'],data['scale_2']]);return (rot*var[:,None,:])@rot.transpose(0,2,1)
def uv_cov(P,cov):
 z=P[:,2];J=np.zeros((len(P),2,3));f=cfg['focal_px'];J[:,0,0]=f/z;J[:,1,1]=f/z;J[:,0,2]=-f*P[:,0]/z**2;J[:,1,2]=-f*P[:,1]/z**2;return J@cov@J.transpose(0,2,1)
def bind(ids,target_B,n_B,label,thickness=.002,cap=None):
 ids=np.asarray(ids);target_B=np.asarray(target_B);n_B=np.broadcast_to(n_B,target_B.shape).copy();n_B/=np.linalg.norm(n_B,axis=1,keepdims=True);target_CV=O+target_B@R.T/scale;n_CV=n_B@R.T
 ray=P[ids];den=np.sum(n_CV*ray,axis=1);factors=np.sum(n_CV*target_CV,axis=1)/den;target_CV=ray*factors[:,None]
 J=factors[:,None,None]*(np.eye(3)[None]-ray[:,:,None]*n_CV[:,None,:]/den[:,None,None]);cov0=covariance(initial[ids]);cov=J@cov0@J.transpose(0,2,1)+(thickness/scale)**2*n_CV[:,:,None]*n_CV[:,None,:]
 eig,rot=np.linalg.eigh(cov);eig=np.maximum(eig,1e-18);clipped=0
 if cap is not None:
  caps=np.broadcast_to(cap,(len(ids),));clipped=int((np.sqrt(eig[:,-1])*scale>caps).sum());eig=np.minimum(eig,(caps[:,None]/scale)**2)
 neg=np.linalg.det(rot)<0;rot[neg,:,0]*=-1;q=Rotation.from_matrix(rot).as_quat()
 for i,k in enumerate(['x','y','z']):v[k][ids]=target_CV[:,i]
 for i in range(3):v['scale_'+str(i)][ids]=-40 if i==0 else .5*np.log(eig[:,i])
 for i,k in enumerate(['rot_1','rot_2','rot_3','rot_0']):v[k][ids]=q[:,i]
 actual=np.c_[v['x'][ids],v['y'][ids],v['z'][ids]].astype(float);uv0=ray[:,:2]/ray[:,2,None]*cfg['focal_px'];uv1=actual[:,:2]/actual[:,2,None]*cfg['focal_px'];err=np.linalg.norm(uv0-uv1,axis=1);diff=uv_cov(actual,covariance(v[ids]))-uv_cov(ray,cov0)
 records.append({'group':label,'count':len(ids),'source_center_projection_px_p99':float(np.percentile(err,99)),'source_center_projection_px_max':float(err.max()),'ellipse_covariance_variance_difference_px2_p99':float(np.percentile(abs(diff),99)),'max_covariance_std_world':float(np.sqrt(eig.max())*scale),'support_radius_capped':clipped})
 print('BOUND',label,len(ids),flush=True)
def plane(ids,axis,level,label,cap=None):
 ray=B[ids]-C;f=(level-C[axis])/ray[:,axis];target=C+f[:,None]*ray;n=np.eye(3)[axis];bind(ids,target,n,label,cap=cap)
plane(groups['door'],1,-.04,'original door wood')
plane(groups['facade'],1,-.055,'original facade / outside foliage')
plane(groups['ground'],2,.004,'original cobblestone sidewalk',.30)
ids=hits['ids'];ok=hits['valid'];bind(ids[ok],hits['points'][ok],hits['normals'][ok],'original photographed room bound to actual surfaces',cap=hits['sigma_caps'][ok])
if (~ok).any():plane(ids[~ok],1,-.055,'photo-edge fallback')
door=groups['door'];room=groups['interior'];background=np.setdiff1d(np.arange(len(v)),np.r_[door,room]);
changed=np.unique(np.r_[door,room,groups['facade'],groups['ground']]);
if a.resolve_color:
 from PIL import Image
 from scipy.ndimage import map_coordinates
 image=np.asarray(Image.open(out/'preview/source-original.png').convert('RGB'),dtype=float)/255.;height,width=image.shape[:2];uv=P[changed,:2]/P[changed,2,None]*cfg['focal_px']+np.asarray(cfg['original_size'])/2;xy=uv/np.asarray(cfg['original_size'])*[width,height]-.5
 colors=np.stack([map_coordinates(image[:,:,i],[xy[:,1],xy[:,0]],order=1,mode='nearest') for i in range(3)],axis=1)
 for i in range(3):v['f_dc_'+str(i)][changed]=(colors[:,i]-.5)/.28209479177387814
for name,selection in [('background',background),('room-appearance',room),('door-skin',door)]:PlyData([PlyElement.describe(v[selection],'vertex')],text=False).write(out/(name+suffix+'.ply'))
np.savez_compressed(out/'source-provenance.npz',background=background,room=room,door=door,room_object_ids=hits['owners'])
alpha_fields=[n for n in v.dtype.names if n.startswith('f_') or n=='opacity'];same=all(np.array_equal(v[n],initial[n]) for n in alpha_fields);assert same or a.resolve_color
unchanged=np.setdiff1d(np.arange(len(v)),changed);assert np.array_equal(v[unchanged],initial[unchanged]);
finalP=np.c_[v['x'],v['y'],v['z']];finalB=(finalP-O)@R*scale;b=finalB[background];inside=(b[:,0]>-4)&(b[:,0]<cfg['door_width']+.5)&(b[:,1]>.2)&(b[:,1]<5.1)&(b[:,2]>.1)&(b[:,2]<3.1)
preserved={n:hashlib.sha256(Path(n).read_bytes()).hexdigest()==value for n,value in meta['source_sha256'].items()};assert all(preserved.values())
report={'source_gaussians':len(v),'original_gaussians_retained':len(background)+len(room)+len(door),'source_colors_and_opacity_bitwise_identical':same,'source_primitives_geometrically_unchanged':len(unchanged),'local_surface_rebound':len(changed),'background_gaussians':len(background),'original_photo_room_gaussians':len(room),'original_door_gaussians':len(door),'unassigned_background_centers_inside_room_after':int(inside.sum()),'unassigned_background_centers_inside_room_before':len(groups['intruders']),'surface_groups':records,'sources_unchanged':preserved,'scope':'All Gaussian appearance is from the original SHARP file. No Blender-rendered Gaussian substitute. Room object assignment is projective surface attachment, not semantic reconstruction or new-view generation.'}
report['resolved_source_appearance']=a.resolve_color;report['appearance_source']='Local colors resolved from the original SHARP actual source-camera rendering; no Blender-generated color' if a.resolve_color else 'Original SHARP per-primitive colors unchanged'
(out/('source-binding'+suffix+'.json')).write_text(json.dumps(report,indent=2));print('SOURCE_BINDING_COMPLETE',json.dumps({k:report[k] for k in ['original_gaussians_retained','source_colors_and_opacity_bitwise_identical','source_primitives_geometrically_unchanged','unassigned_background_centers_inside_room_after']}),flush=True)

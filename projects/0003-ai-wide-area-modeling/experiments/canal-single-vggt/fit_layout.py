"""Fit a small set of architectural parameters to VGGT depth samples.
The image anchors are inherited from the historical experiment, not ground truth.
"""
import argparse,json
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
p=argparse.ArgumentParser();p.add_argument('--prediction',required=True);p.add_argument('--old-alignment',required=True);p.add_argument('--out',required=True);a=p.parse_args()
pred=np.load(a.prediction); old=json.loads(Path(a.old_alignment).read_text(encoding='utf-8'))
anchors=old['baseline_v3']['anchors'];X=np.array([v['world_before'] for v in anchors]);uv=np.array([v['target_normalized_top_left'] for v in anchors])
depth=pred['depth']; conf=pred['confidence']; K=pred['K']; H,W=depth.shape
samples=[];cs=[]
for u,v in uv:
    x=int(round(u*(W-1))); y=int(round(v*(H-1)))
    samples.append(float(np.median(depth[max(0,y-1):y+2,max(0,x-1):x+2])))
    cs.append(float(np.median(conf[max(0,y-1):y+2,max(0,x-1):x+2])))
z=np.array(samples); G=np.c_[(uv[:,0]*W-K[0,2])/K[0,0]*z,(uv[:,1]*H-K[1,2])/K[1,1]*z,z]
fxn=float(K[0,0]/W); fyn=float(K[1,1]/H)
def warp(P,q):
    Q=np.asarray(P).copy(); Q[8:,0]+=q[5]
    Q[:,0]=-4+(Q[:,0]+4)*q[8]
    y=Q[:,1].copy();Q[:,1]=np.where(y>=1.05,y,np.where(y>=-3,1.05+(y-1.05)*(4.05-q[7])/4.05,-3+q[7]+(y+3)*q[6]))
    Q[:,2]=.85+(Q[:,2]-.85)*q[9];return Q
def camera(P,q):
    yaw,pitch=q[3:5];f=np.array([np.cos(pitch)*np.cos(yaw),np.cos(pitch)*np.sin(yaw),np.sin(pitch)])
    r=np.array([np.sin(yaw),-np.cos(yaw),0]);up=np.cross(r,f)
    return (P-q[:3])@np.stack([r,-up,f]).T
baseline=old['aligned_v4']['parameters'];q0=np.array([baseline[k] for k in ['camera_x','camera_y','camera_z','yaw_radians','pitch_radians','bridge_offset_x','channel_width_scale','near_quay_shift_y']]+[1.,1.,1.])
q0[10]=np.median(camera(warp(X,q0),q0)[:,2]/z)
weight=np.sqrt(np.clip(np.array(cs)/np.median(cs),.2,2))
def residual(q):
    E=(camera(warp(X,q),q)-q[10]*G)/q0[10]
    return np.r_[(E*weight[:,None]).ravel(),.06*(q[6]-1),.06*(q[8]-1),.06*(q[9]-1)]
lower=[-65,-55,.3,.05,-.45,-12,.45,-1.5,.55,.55,.01]
upper=[-6,-2,15,1.25,.35,12,2.2,3.1,1.65,1.65,300]
q0=np.clip(q0,np.array(lower)+1e-5,np.array(upper)-1e-5)
fit=least_squares(residual,q0,bounds=(lower,upper),loss='soft_l1',f_scale=.15,max_nfev=2500)
q=fit.x; C=camera(warp(X,q),q);projected=np.c_[.5+fxn*C[:,0]/C[:,2],.5+fyn*C[:,1]/C[:,2]]
errors=np.linalg.norm((projected-uv)*[1672,942],axis=1)
result=dict(method='VGGT camera intrinsics and depth sampled at 12 historical approximate image anchors; robust 3D fit with bounded continuous scene deformation',scope='single-view hypothesis, no metric or hidden-surface ground truth; fitted anchors are not held-out validation',parameters=q.tolist(),parameter_names=['camera_x','camera_y','camera_z','yaw','pitch','bridge_offset','channel_scale','quay_shift','x_scale','height_scale','depth_to_old_world_scale'],K_normalized=[fxn,fyn],old_v4_anchor_rms=old['aligned_v4']['rms_anchor_error_pixels_at_1672x942'],new_anchor_rms=float(np.sqrt(np.mean(errors**2))),depth_fit_rms_in_model_units=float(np.sqrt(np.mean((C-q[10]*G)**2))),success=bool(fit.success),anchors=[dict(name=s['name'],uv=uv[i].tolist(),predicted_depth=z[i],confidence=cs[i],world=warp(X,q)[i].tolist(),pixel_error=errors[i]) for i,s in enumerate(anchors)])
Path(a.out).write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result),flush=True)

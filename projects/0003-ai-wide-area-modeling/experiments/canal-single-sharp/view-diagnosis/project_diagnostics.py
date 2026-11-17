"""Frozen-view diagnostics from the existing Gaussian PLY, never new geometry.

Depth is a CPU Gaussian-center compositing proxy. Reprojection masks are
heuristics for source-image support, not ground-truth visibility/confidence.
"""
import argparse,hashlib,json,math,sys,time
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.spatial.transform import Rotation
from scipy import ndimage
from numba import njit
p=argparse.ArgumentParser();p.add_argument('--source-results',required=True);p.add_argument('--reference',required=True)
p.add_argument('--out',required=True);p.add_argument('--support',required=True);a=p.parse_args()
sys.path.insert(0,a.support)
from plyfile import PlyData
out=Path(a.out);out.mkdir(parents=True,exist_ok=True);root=Path(a.source_results)
meta=json.loads((root/'inference.json').read_text());W,H=1000,563;iw,ih=meta['input_resolution']
fx=meta['focal_px']*W/iw;fy=meta['focal_px']*H/ih;K=np.array([[fx,0,W/2],[0,fy,H/2],[0,0,1]])
angle=math.radians(5);focus=meta['depth_percentiles'][2];dx=focus*math.tan(angle)
c,s=math.cos(angle),math.sin(angle)
R0=np.eye(3);C0=np.zeros(3);R1=np.array([[c,0,s],[0,1,0],[-s,0,c]]);C1=np.array([dx,0,0])
def camera_record(R,C):
    return dict(K=K.tolist(),R_world_to_camera=R.tolist(),camera_center=C.tolist(),t_world_to_camera=(-R@C).tolist())
cameras=dict(width=W,height=H,input_resolution=[iw,ih],coordinate_system='OpenCV: x right, y down, z forward; world is original SHARP camera',
    units='SHARP predicted coordinate units, no independent metric calibration',focus_depth=focus,
    target_description='Camera translated right by focus*tan(5deg), then aimed at original axis at focus depth; not a pure in-place yaw',
    target_yaw_degrees=-5,target_translation_fraction_of_focus=dx/focus,
    source=camera_record(R0,C0),target=camera_record(R1,C1),
    projection_check_points=[[0,0,8],[2,1,15],[-3,-2,12],[4,-1,30],[-5,3,20]])
(out/'cameras.json').write_text(json.dumps(cameras,indent=2),encoding='utf-8')
data=PlyData.read(root/'canal-sharp.ply')['vertex'].data
P=np.stack([data[k] for k in ['x','y','z']],1).astype(np.float32)
scales=np.exp(np.stack([data['scale_'+str(i)] for i in range(3)],1)).astype(np.float32)
q=np.stack([data['rot_'+str(i)] for i in [1,2,3,0]],1)
Q=Rotation.from_quat(q).as_matrix().astype(np.float32)
cov=(Q*scales[:,None,:]**2)@Q.transpose(0,2,1)
alpha=(1/(1+np.exp(-np.clip(data['opacity'],-40,40)))).astype(np.float32)
del Q,q,scales

@njit(cache=True)
def raster_gaussians(uv,z,inverse,extent,opacity,order,h,w):
    A=np.zeros((h,w),np.float32);D=np.full((h,w),np.nan,np.float32)
    for j in order:
        if z[j]<=.01 or opacity[j]<.5/255:continue
        u,v=uv[j];rx,ry=extent[j]
        x0=max(0,int(math.floor(u-rx)));x1=min(w-1,int(math.ceil(u+rx)))
        y0=max(0,int(math.floor(v-ry)));y1=min(h-1,int(math.ceil(v+ry)))
        if x0>x1 or y0>y1:continue
        ia,ib,ic=inverse[j]
        for y in range(y0,y1+1):
            dv=y+.5-v
            for x in range(x0,x1+1):
                if A[y,x]>.995:continue
                du=x+.5-u;mahal=ia*du*du+2*ib*du*dv+ic*dv*dv
                if mahal>8:continue
                a0=min(.99,opacity[j]*math.exp(-.5*mahal))
                if a0<.5/255:continue
                before=A[y,x];after=before+(1-before)*a0;A[y,x]=after
                if before<.5 and after>=.5:D[y,x]=z[j]
    return A,D

def project_gaussians(R,C,label):
    t=time.perf_counter();pc=(P-C)@R.T;z=pc[:,2];uv=pc[:,:2]/z[:,None]*[fx,fy]+[W/2,H/2]
    cv=R[None]@cov@R.T[None]
    J=np.zeros((len(P),2,3),np.float32);J[:,0,0]=fx/z;J[:,0,2]=-fx*pc[:,0]/z**2;J[:,1,1]=fy/z;J[:,1,2]=-fy*pc[:,1]/z**2
    screen=J@cv@J.transpose(0,2,1);screen[:,0,0]+=.3;screen[:,1,1]+=.3
    aa=screen[:,0,0];bb=screen[:,0,1];cc=screen[:,1,1];det=np.maximum(aa*cc-bb*bb,1e-10)
    inverse=np.stack([cc/det,-bb/det,aa/det],1).astype(np.float32)
    extent=np.minimum(np.sqrt(np.maximum(np.stack([aa,cc],1),0))*math.sqrt(8),512).astype(np.float32)
    A,D=raster_gaussians(uv.astype(np.float32),z.astype(np.float32),inverse,extent,alpha,np.argsort(z),H,W)
    print(label,'depth proxy',round(time.perf_counter()-t,2),'s',flush=True)
    return A,D

A0,D0=project_gaussians(R0,C0,'source');A1,D1=project_gaussians(R1,C1,'target')
im=np.asarray(Image.open(a.reference).convert('RGB').resize((W,H),Image.Resampling.LANCZOS))
yy,xx=np.mgrid[:H,:W];good=np.isfinite(D0)&(A0>=.9)
Z=np.where(good,D0,1);V=np.stack([(xx+.5-W/2)/fx*Z,(yy+.5-H/2)/fy*Z,Z],-1)
T=(V-C1)@R1.T;tz=T[...,2];xy=T[...,:2]/tz[...,None]*[fx,fy]+[W/2,H/2]

@njit(cache=True)
def warp_triangles(xy,tz,source_z,valid,rgb,h,w):
    full=np.full((h,w),np.inf,np.float32);safe=full.copy();risk=np.zeros((h,w),np.uint8);color=np.zeros((h,w,3),np.float32)
    count=0;rejected=0
    for sy in range(h-1):
        for sx in range(w-1):
            for tri in range(2):
                if tri==0:ids=((sy,sx),(sy,sx+1),(sy+1,sx+1))
                else:ids=((sy,sx),(sy+1,sx+1),(sy+1,sx))
                ay,ax=ids[0];by,bx=ids[1];cy,cx=ids[2]
                if not (valid[ay,ax] and valid[by,bx] and valid[cy,cx]):continue
                za,zb,zc=tz[ay,ax],tz[by,bx],tz[cy,cx]
                if min(za,zb,zc)<=.01:continue
                au,av=xy[ay,ax];bu,bv=xy[by,bx];cu,cv=xy[cy,cx]
                den=(bv-cv)*(au-cu)+(cu-bu)*(av-cv)
                if abs(den)<1e-9:continue
                depths=(source_z[ay,ax],source_z[by,bx],source_z[cy,cx])
                dz=max(depths)/max(min(depths),1e-6)
                # Source grid triangles have twice-area 1 pixel^2.
                unreliable=dz>1.08 or abs(den)>1.8 or den<0
                count+=1
                if unreliable:rejected+=1
                x0=max(0,int(math.floor(min(au,bu,cu)-.5)));x1=min(w-1,int(math.ceil(max(au,bu,cu)-.5)))
                y0=max(0,int(math.floor(min(av,bv,cv)-.5)));y1=min(h-1,int(math.ceil(max(av,bv,cv)-.5)))
                for y in range(y0,y1+1):
                    for x in range(x0,x1+1):
                        u=x+.5;v=y+.5
                        la=((bv-cv)*(u-cu)+(cu-bu)*(v-cv))/den
                        lb=((cv-av)*(u-cu)+(au-cu)*(v-cv))/den;lc=1-la-lb
                        if min(la,lb,lc)<-1e-4:continue
                        inv=la/za+lb/zb+lc/zc;z=1/inv
                        if z<full[y,x]:full[y,x]=z;risk[y,x]=1 if unreliable else 0
                        if not unreliable and z<safe[y,x]:
                            safe[y,x]=z
                            for ch in range(3):color[y,x,ch]=(la*rgb[ay,ax,ch]/za+lb*rgb[by,bx,ch]/zb+lc*rgb[cy,cx,ch]/zc)/inv
    return full,safe,risk,color,count,rejected

print('Reprojecting visible-source depth proxy',flush=True)
full,safe,risks,colors,ntri,nreject=warp_triangles(xy.astype(np.float32),tz.astype(np.float32),Z.astype(np.float32),good,im,H,W)
missing=~np.isfinite(full)
uncertain=(risks>0)&~missing
# Keep raw masks distinct. No dilation or segmentation is called ground truth.
Image.fromarray((missing*255).astype(np.uint8)).save(out/'source-unsupported-mask.png')
Image.fromarray((uncertain*255).astype(np.uint8)).save(out/'depth-boundary-risk-mask.png')
Image.fromarray((np.isfinite(safe)*255).astype(np.uint8)).save(out/'source-supported-mask.png')
checker=np.where(((xx//12+yy//12)%2)[...,None],np.array([45,49,57]),np.array([68,72,81])).astype(np.uint8)
draft=np.where(np.isfinite(safe)[...,None],np.clip(colors,0,255).astype(np.uint8),checker)
Image.fromarray(draft).save(out/'source-reprojected-draft.png')
lo,hi=np.nanpercentile(D0,[1,99])
def depth_color(D):
    t=np.clip((np.log(np.maximum(D,lo))-math.log(lo))/(math.log(hi)-math.log(lo)),0,1)
    rgb=np.stack([np.clip(1.5-abs(4*t-3),0,1),np.clip(1.5-abs(4*t-2),0,1),np.clip(1.5-abs(4*t-1),0,1)],-1)
    rgb[~np.isfinite(D)]=0
    return np.nan_to_num(rgb*255).astype(np.uint8)
Image.fromarray(depth_color(D0)).save(out/'source-depth-proxy.png');Image.fromarray(depth_color(D1)).save(out/'target-depth-proxy.png')
np.savez_compressed(out/'diagnostic-arrays.npz',source_alpha=A0,source_depth_proxy=D0,target_alpha=A1,target_depth_proxy=D1,missing_source_support=missing,depth_boundary_risk=uncertain,safe_reprojection_depth=safe)
# Identity-pose triangle projection checks raster/grid convention independently
# of whether the predicted depth is physically accurate.
base_xy=np.stack([xx+.5,yy+.5],-1).astype(np.float32)
bf,bs,br,bc,_,_=warp_triangles(base_xy,Z.astype(np.float32),Z.astype(np.float32),good,im,H,W)
identity=np.isfinite(bs);err=np.abs(bc[identity]-im[identity]).mean()
assert err<.05,err
report=dict(scope='Single fixed right-hand view; source-image reprojection support and depth-discontinuity heuristics, no geometric ground truth, no AI inpainting or scene repair',
    ply_sha256=hashlib.sha256((root/'canal-sharp.ply').read_bytes()).hexdigest(),
    depth_proxy='Front-to-back projected Gaussian compositing: center depth at cumulative opacity crossing 0.5; NOT true ray-surface depth',
    cpu_raster_parameters=dict(screen_covariance_regularizer=.3,max_stddev=math.sqrt(8),max_axis_radius_pixels=512,min_alpha=.5/255,source_coverage_threshold=.9),
    reprojection_parameters=dict(max_triangle_depth_ratio=1.08,max_triangle_projected_area_ratio=1.8,reject_flipped_triangles=True),
    source_high_coverage_fraction=float(good.mean()),target_gaussian_coverage_fraction=float((A1>=.9).mean()),
    source_unsupported_fraction=float(missing.mean()),depth_boundary_risk_fraction=float(uncertain.mean()),safe_reprojection_fraction=float(np.isfinite(safe).mean()),
    triangles_considered=ntri,triangles_flagged=nreject,identity_reprojection_mean_absolute_error= float(err),identity_safe_coverage_fraction=float(identity.mean()),
    depth_color_scale=dict(low=float(lo),high=float(hi),mapping='Log depth, blue near/red far; same scale for both views'),
    caveat='Red does not mean confirmed missing physical geometry; yellow does not mean confirmed error. Both depend on approximate predicted geometry, compositing, sampling and chosen thresholds. Gaussian coverage can stay high even when structure is wrong.')
(out/'diagnostic-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2),flush=True)

"""Counterfactual parameter fits on frozen predictions; no model or Blender rerun.

These are training-anchor diagnostics, not independent reconstruction accuracy.
"""
import argparse, contextlib, hashlib, io, json, runpy, sys
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares

p=argparse.ArgumentParser()
p.add_argument('--prediction',required=True)
p.add_argument('--old-alignment',required=True)
p.add_argument('--out',required=True)
a=p.parse_args(); destination=Path(a.out)
source=Path(__file__).with_name('fit_layout.py')
saved_argv=sys.argv[:]
sys.argv=[str(source),'--prediction',a.prediction,'--old-alignment',a.old_alignment,
          '--out',str(destination.with_name('audit-replayed-fit.json'))]
try:
    with contextlib.redirect_stdout(io.StringIO()):
        n=runpy.run_path(str(source))
finally:
    sys.argv=saved_argv

X,uv=n['X'],n['uv']; camera,warp=n['camera'],n['warp']
q0=n['q0'].copy(); b=n['baseline']
pixel_scale=np.array([1672,942])
def projected(q,fx,fy):
    C=camera(warp(X,q),q)
    return .5+C[:,:2]/C[:,2:3]*[fx,fy]
def rms(q,fx,fy):
    return float(np.sqrt(np.mean(np.sum(((projected(q,fx,fy)-uv)*pixel_scale)**2,axis=1))))
fx,fy=n['fxn'],n['fyn']
oldfx=b['lens_mm']/36
lower=np.array(n['lower']);upper=np.array(n['upper'])
# Keep the same predicted intrinsics, scene parameterization and bounds as B.
# Replace its 3D objective with image reprojection only; scale q[10] is inactive.
def image_residual(t):
    q=q0.copy();q[:10]=t
    C=camera(warp(X,q),q)
    if (C[:,2]<=0).any():
        return np.ones(24)*1e6
    return ((projected(q,fx,fy)-uv)*pixel_scale).ravel()
fits=[]
for start in (q0,n['q']):
    f=least_squares(image_residual,start[:10],bounds=(lower[:10],upper[:10]),
                    loss='linear',max_nfev=2500)
    q=q0.copy();q[:10]=f.x
    fits.append((rms(q,fx,fy),q,bool(f.success)))
best=min(fits,key=lambda v:v[0])
result=dict(scope='Frozen VGGT output, same 12 approximate fitted anchors; counterfactual analytic projection only, not newly rendered or independent geometry validation',
    fit_source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
    old_v4_rms_recomputed=rms(q0,oldfx,oldfx*1672/942),
    old_scene_camera_with_only_vggt_intrinsics_rms=rms(q0,fx,fy),
    original_depth_objective_rms=rms(n['q'],fx,fy),
    image_only_objective_same_predicted_intrinsics_rms=best[0],
    image_only_parameters=best[1].tolist(),image_only_optimizer_success=best[2],
    old_effective_horizontal_focal_mm=b['lens_mm'],
    predicted_effective_horizontal_focal_mm=fx*36,
    caveat='Image-only fit has different objective from old V4 (no shoreline terms and extra shape variables). Lower fitted RMS proves flexibility, not more accurate depth or better whole-image appearance.')
destination.write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))

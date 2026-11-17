"""Derive a new café frame, partition Gaussian appearance, keep source immutable."""
import argparse,hashlib,json,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--diagnosis',required=True);p.add_argument('--reference',required=True);p.add_argument('--support',required=True);p.add_argument('--out',required=True);a=p.parse_args();sys.path.insert(0,a.support)
from plyfile import PlyData,PlyElement
r=Path(a.source);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
meta=json.loads((r/'inference.json').read_text());ply=PlyData.read(r/'canal-sharp.ply');v=ply['vertex'].data
P=np.stack([v[k] for k in ['x','y','z']],1).astype(float);iw,ih=meta['input_resolution'];f=meta['focal_px']
uv=P[:,:2]/P[:,2:3]*f+[iw/2,ih/2]
# Original concept image: right-hand door of the first café, below red awning.
# Fit the solid wooden lower panel, not the glass/interior reflections.
fit=(uv[:,0]>420)&(uv[:,0]<500)&(uv[:,1]>578)&(uv[:,1]<620)&(v['opacity']>0)
points=P[fit];med=np.median(points[:,2]);points=points[np.abs(points[:,2]-med)<.5]
center=np.median(points,axis=0)
for _ in range(3):
    _,_,V=np.linalg.svd(points-center,full_matrices=False);N=V[-1]
    dist=np.abs((points-center)@N);points=points[dist<max(.025,np.percentile(dist,80))];center=points.mean(0)
if N[2]<0:N=-N
# Façade normal is regularized with the two hand-picked door sill points.
# With vertical/image-Y gravity, their image line constrains a vertical plane.
slope=(625-638)/(517-410);intercept=638-slope*410
N=np.array([slope*f,0.,slope*(iw/2)+intercept-ih/2]);N/=np.linalg.norm(N)
U=np.array([0.,-1.,0.]);U-=N*np.dot(U,N);U/=np.linalg.norm(U);X=np.cross(N,U);X/=np.linalg.norm(X)
basis=np.stack([X,N,U],axis=1)
def intersect(u,v):
    ray=np.array([(u-iw/2)/f,(v-ih/2)/f,1.]);return ray*np.dot(N,center)/np.dot(N,ray)
O=intersect(410,638);top=intersect(410,377);br=intersect(517,625)
rawheight=np.dot(top-O,U);scale=2.5/rawheight;dw=float(np.dot(br-O,X)*scale)
local=(P-O)@basis*scale
# Appearance grouping: select front-facing wood frame/panel; remove photographed
# glass/interior from the moving door. New mesh glass shows the newly built room.
xx,yy=uv.T
poly=(xx>405)&(xx<523)&(yy>377)&(yy<640)
wood=(xx<423)|(xx>499)|(yy<401)|(yy>566)
near=np.abs(local[:,1])<.38
door=poly&wood&near&(local[:,2]>-.12)&(local[:,2]<2.67)
opening=poly & ~door
window_mask=Image.new('1',(iw,ih));ImageDraw.Draw(window_mask).polygon([(175,363),(388,381),(390,642),(176,664)],fill=1)
indices=np.rint(uv).astype(int);inside=(indices[:,0]>=0)&(indices[:,0]<iw)&(indices[:,1]>=0)&(indices[:,1]<ih)
window_cut=np.zeros(len(v),bool);window_cut[inside]=np.asarray(window_mask)[indices[inside,1],indices[inside,0]]
window_cut &= local[:,1]>-.8 # Keep clearly foreground outdoor tables/plants.
static=~(door|opening|window_cut)
def save(name,selection):PlyData([PlyElement.describe(np.array(v[selection]),'vertex')],text=False).write(out/name)
save('background.ply',static)
# Attach the selected wood appearance to the physical leaf front, preserving
# original-camera projection. This is an explicit derivative alignment, not a
# claim that the glass/interior depth was recovered as rigid door geometry.
dv=np.array(v[door]);rayP=P[door];factor=(np.dot(N,O)-.04/scale)/(rayP@N)
aligned=rayP*factor[:,None]
for i,k in enumerate(['x','y','z']):dv[k]=aligned[:,i]
for i in range(3):dv['scale_'+str(i)]+=np.log(factor)
PlyData([PlyElement.describe(dv,'vertex')],text=False).write(out/'door-skin.ply')
# Camera basis: image-right, image-up, camera-back -> café Blender coordinates.
cameraR=basis.T@np.diag([1,-1,-1]);cameraC=(-O)@basis*scale
S=np.array([[1,0,0],[0,0,1],[0,-1,0.]]) # Blender Z-up -> glTF/Three Y-up.
M=np.eye(4);M[:3,:3]=S@basis.T*scale;M[:3,3]=-S@basis.T@O*scale
hashes={}
for path in [r/'canal-sharp.ply',Path(a.reference)]:hashes[str(path)]=hashlib.sha256(path.read_bytes()).hexdigest()
config=dict(source_sha256=hashes,original_size=[iw,ih],focal_px=f,door_width=dw,door_height=2.5,
    cafe_frame=dict(origin_cv=O.tolist(),basis_cv_columns=basis.tolist(),scale=scale,unit='Design scale: door height assumed 2.5 metres; not a real measurement'),
    camera_blender=dict(position=cameraC.tolist(),rotation_matrix=cameraR.tolist()),cv_to_three_matrix=M.tolist(),
    counts=dict(source=len(v),door=int(door.sum()),background=int(static.sum()),removed_photo_interior=int((~static&~door).sum())),
    assumptions=['Vertical façade/image-Y gravity and manual door-sill line prior; depth initialized from Gaussians; door height designed as 2.5m','Door thickness, back surface, complete room and furnishings are newly designed, not recovered truth','Original doorway/window photographic interior removed in derivative; original PLY unchanged','Door Gaussian color retains original lighting; new room uses PBR materials and independent lights'],
    window_local_bounds=[float(np.dot(intersect(175,666)-O,X)*scale),float(np.dot(intersect(390,642)-O,X)*scale)],
    door_selection=dict(source_image_region=[405,377,523,640],wood_only=True,max_plane_distance_design_units=.38),
    skin_alignment='Selected wood centers ray-projected to physical leaf front y=-0.04, Gaussian scales adjusted to retain original-camera footprint; colors and opacity unchanged',
    binding_check_points_cv=aligned[::max(1,len(aligned)//5)][:5].tolist())
(out/'layout.json').write_text(json.dumps(config,indent=2),encoding='utf-8')
im=Image.open(a.reference).convert('RGB');draw=ImageDraw.Draw(im);draw.rectangle((405,377,523,640),outline='#00ffb0',width=4);im.save(out/'door-selection-reference.png')
Image.open(a.reference).save(out/'reference.png')
print(json.dumps(config,indent=2),flush=True)

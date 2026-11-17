"""Read original SHARP primitives; propose explicitly local surface bindings.

No image inference, generated substitute appearance, or original-file mutation.
"""
import argparse,json,sys,hashlib,shutil
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--prototype',required=True);p.add_argument('--support',required=True);p.add_argument('--out',required=True);a=p.parse_args();sys.path.insert(0,a.support)
from plyfile import PlyData
out=Path(a.out);out.mkdir(parents=True,exist_ok=True);proto=Path(a.prototype);source=Path(a.source);cfg=json.loads((proto/'layout.json').read_text());binding=json.loads((proto/'binding.json').read_text());v=PlyData.read(source)['vertex'].data
P=np.c_[v['x'],v['y'],v['z']].astype(float);R=np.array(cfg['cafe_frame']['basis_cv_columns']);O=np.array(cfg['cafe_frame']['origin_cv']);scale=cfg['cafe_frame']['scale'];B=(P-O)@R*scale;C=np.array(cfg['camera_blender']['position']);w,h=cfg['original_size'];f=cfg['focal_px'];uv=P[:,:2]/P[:,2,None]*f+[w/2,h/2];u,y=uv.T
door_region=(u>405)&(u<523)&(y>377)&(y<640);wood=(u<423)|(u>499)|(y<401)|(y>566);door=door_region&wood&(abs(B[:,1])<.38)&(B[:,2]>-.12)&(B[:,2]<2.67)
mask=Image.new('1',(w,h));ImageDraw.Draw(mask).polygon([(175,363),(388,381),(390,642),(176,664)],fill=1);idx=np.rint(uv).astype(int);inside=(idx[:,0]>=0)&(idx[:,0]<w)&(idx[:,1]>=0)&(idx[:,1]<h);window=np.zeros(len(v),bool);window[inside]=np.asarray(mask)[idx[inside,1],idx[inside,0]];window&=B[:,1]>-.8
interior=(window|(door_region&~door))&~door
room=binding['room'];intrude=(B[:,0]>room['x'][0]+.1)&(B[:,0]<room['x'][1]-.1)&(B[:,1]>.2)&(B[:,1]<room['y'][1]-.1)&(B[:,2]>.1)&(B[:,2]<room['height']-.1)&~interior&~door
ray=B-C;t=(-.055-C[1])/ray[:,1];front=C+ray*t[:,None]
facade=(front[:,0]>room['x'][0])&(front[:,0]<room['x'][1])&(front[:,2]>.05)&(front[:,2]<room['height'])&(B[:,1]>-.50)&(B[:,1]<1.5)&~interior&~door
facade|=intrude
# Conservative sidewalk selection: almost-horizontal, thin source primitives.
from scipy.spatial.transform import Rotation
q=np.c_[v['rot_1'],v['rot_2'],v['rot_3'],v['rot_0']];q/=np.maximum(np.linalg.norm(q,axis=1,keepdims=True),1e-20);rot=Rotation.from_quat(q).as_matrix();sc=np.c_[v['scale_0'],v['scale_1'],v['scale_2']];mi=np.argmin(sc,axis=1);normal_cv=rot[np.arange(len(v)),:,mi];normal_B=normal_cv@R;thin=np.exp(sc.min(1)-sc.max(1))
tg=-C[2]/ray[:,2];floor=C+ray*tg[:,None]
ground=(abs(normal_B[:,2])>.78)&(thin<.32)&(abs(B[:,2])<.45)&(floor[:,0]>room['x'][0]-.7)&(floor[:,0]<room['x'][1]+.7)&(floor[:,1]>-3.05)&(floor[:,1]<-.15)&(tg>0)&~door&~interior&~facade
ground=(u>320)&(u<1000)&(y>638-(u-410)*13/107+10)&(y<900-.28*u)&(abs(B[:,2])<.5)&(floor[:,0]>-6)&(floor[:,0]<8)&(floor[:,1]>-8)&(floor[:,1]<-.1)&(tg>0)&~door&~interior&~facade
queries=np.flatnonzero(interior);np.savez_compressed(out/'binding-queries.npz',ids=queries,points=B[queries].astype('f4'),origin=C.astype('f4'))
np.savez_compressed(out/'source-groups.npz',door=np.flatnonzero(door),interior=queries,facade=np.flatnonzero(facade),ground=np.flatnonzero(ground),intruders=np.flatnonzero(intrude))
for name in ['layout.json','binding.json','reference.png','tour-path.json']:shutil.copyfile(proto/name,out/name)
hashes={str(source):hashlib.sha256(source.read_bytes()).hexdigest()}
for name in ['cafe-hybrid-prototype.blend','cafe-structure.glb','background.ply','door-skin.ply','layout.json','binding.json']:hashes[str(proto/name)]=hashlib.sha256((proto/name).read_bytes()).hexdigest()
report={'source_sha256':hashes,'source_gaussians':len(v),'groups':{'door':int(door.sum()),'photo_interior':len(queries),'facade':int(facade.sum()),'sidewalk':int(ground.sum()),'background_centers_in_room_to_rebind':int(intrude.sum())},'assumptions':['Existing designed cafe frame, door height 2.5 design units, not a measured scene','Local room/facade assignments are structural priors; source image appearance is retained, not a recovered semantic interior','No new learned model, external API, image generation, or full mesh-to-Gaussian replacement']}
(out/'preparation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)

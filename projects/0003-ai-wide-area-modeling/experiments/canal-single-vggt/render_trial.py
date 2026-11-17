"""Render historical A and VGGT-guided B without modifying the old project."""
import argparse,hashlib,json,math,sys,time
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
p=argparse.ArgumentParser();p.add_argument('--old-root',required=True);p.add_argument('--fit');p.add_argument('--out',required=True);p.add_argument('--stage',choices=['all','baseline','guided'],default='all')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.old_root);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
fit=json.loads(Path(a.fit).read_text()) if a.fit else None;q=fit['parameters'] if fit else None;records={}
sources=[root/'artifacts/rainy-canal-v3.blend',root/'artifacts/rainy-canal-v4.blend']
hashes={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in sources}
def setup():
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=32;s.cycles.use_denoising=True
    s.render.resolution_x=1000;s.render.resolution_y=563;s.render.resolution_percentage=100;s.render.threads_mode='FIXED';s.render.threads=6
    s.render.image_settings.file_format='PNG';return s
def render(name):
    s=bpy.context.scene;s.render.filepath=str(out/(name+'.png'));t=time.perf_counter();bpy.ops.render.render(write_still=True)
    records[name]=dict(seconds=time.perf_counter()-t,objects=len(s.objects),meshes=sum(o.type=='MESH' for o in s.objects))
if a.stage!='guided':
    bpy.ops.wm.open_mainfile(filepath=str(sources[1]));s=setup();render('A-old-v4')
    cam=s.camera;cam.location+=Vector((2,-2,.7));cam.rotation_euler=(Vector((0,0,3))-cam.location).to_track_quat('-Z','Y').to_euler();render('A-side')
if a.stage=='baseline':
    (out/'baseline-report.json').write_text(json.dumps(dict(renders=records,source_hashes=hashes),indent=2),encoding='utf-8')
    print('BASELINE COMPLETE',flush=True);sys.exit(0)
if fit is None:raise RuntimeError('--fit required for guided render')
bpy.ops.wm.open_mainfile(filepath=str(sources[0]));s=setup()
bridge=set(bpy.data.collections['Bridge'].objects)|set(bpy.data.collections['Bridge railings'].objects)
def warp(v,isbridge=False):
    x,y,z=v
    if isbridge:x+=q[5]
    x=-4+(x+4)*q[8]
    if y<1.05:y=1.05+(y-1.05)*(4.05-q[7])/4.05 if y>=-3 else -3+q[7]+(y+3)*q[6]
    return Vector((x,y,.85+(z-.85)*q[9]))
for o in list(s.objects):
    if o.type=='MESH':
        if o.data.users>1:o.data=o.data.copy()
        M=o.matrix_world.copy();inv=M.inverted()
        for v in o.data.vertices:v.co=inv@warp(M@v.co,o in bridge)
        o.data.update()
    elif o.type=='CURVE':
        if o.data.users>1:o.data=o.data.copy()
        M=o.matrix_world.copy();inv=M.inverted()
        for spline in o.data.splines:
            for v in spline.points:v.co=(*(inv@warp(M@Vector(v.co[:3]),o in bridge)),1)
    elif o.type=='LIGHT':o.location=warp(o.location)
cam=s.camera;cam.location=q[:3];yaw,pitch=q[3:5];f=Vector((math.cos(pitch)*math.cos(yaw),math.cos(pitch)*math.sin(yaw),math.sin(pitch)))
cam.rotation_euler=f.to_track_quat('-Z','Y').to_euler();cam.data.lens=fit['K_normalized'][0]*36;cam.data.sensor_width=36;cam.data.sensor_fit='HORIZONTAL';cam.data.shift_x=0;cam.data.shift_y=0;cam.data.dof.use_dof=False
fx=fit['K_normalized'][0]*1000;fy=fit['K_normalized'][1]*563;s.render.pixel_aspect_x=1;s.render.pixel_aspect_y=fx/fy
bpy.context.view_layer.update();s['experiment']='Single reference image, VGGT-guided bounded architectural fit; inferred depth is not surveyed geometry'
uv_errors=[]
for anchor in fit['anchors']:
    uv=world_to_camera_view(s,cam,Vector(anchor['world']))
    u,v=anchor['uv'];uv_errors.append(math.hypot((uv.x-u)*1672,(1-uv.y-v)*942))
blender_rms=(sum(x*x for x in uv_errors)/len(uv_errors))**.5
records['projection_check']=dict(blender_anchor_rms=blender_rms,analytic_anchor_rms=fit['new_anchor_rms'])
if abs(blender_rms-fit['new_anchor_rms'])>1:raise RuntimeError('Blender and fitted camera projections disagree')
target=out/'canal-vggt-guided.blend';bpy.ops.wm.save_as_mainfile(filepath=str(target));render('B-vggt-guided')
cam.location+=Vector((2,-2,.7));cam.rotation_euler=(warp(Vector((0,0,3)))-cam.location).to_track_quat('-Z','Y').to_euler();render('B-side')
after={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in sources}
if hashes!=after:raise RuntimeError('Historical source changed')
(out/'render-report.json').write_text(json.dumps(dict(renders=records,source_hashes_before=hashes,source_hashes_after=after,old_sources_unchanged=True,renderer='Cycles CPU, 32 samples, 1000x563',fit=fit),indent=2),encoding='utf-8')
print('EXPERIMENT COMPLETE',json.dumps(records),flush=True)

"""Author and render a real continuous camera in a separate Blender tour file."""
import bpy,sys,argparse,json,math,time,hashlib
from pathlib import Path
from mathutils import Matrix,Vector
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--stage',choices=['preview','full'],default='preview');p.add_argument('--resume',action='store_true');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out);cfg=json.loads((out/'world.json').read_text());bpy.ops.wm.open_mainfile(filepath=str(out/'canal-world-master.blend'));s=bpy.context.scene
try:
 pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
 for d in pref.devices:d.use=d.type=='OPTIX'
 s.cycles.device='GPU' if any(d.use for d in pref.devices) else 'CPU'
except Exception:s.cycles.device='CPU'
M=Matrix(cfg['views'][0]['matrix_world']);P=M.translation;target=P+M.to_3x3()@Vector((0,0,-12))
path=[dict(t=0,p=list(P),look=list(target),lens=27),dict(t=3,p=list(P+Vector((-.8,.2,0))),look=list(target),lens=27),dict(t=6,p=list(P+Vector((.8,-.2,0))),look=list(target),lens=27),dict(t=10,p=[-11,-2.1,2.6],look=[-7,1.6,2.5],lens=24),dict(t=13,p=[-7.04,-1,2.5],look=[-7,2.4,2.3],lens=20),dict(t=16,p=[-7.04,-1,2.5],look=[-7,2.4,2.3],lens=20),dict(t=21,p=[-7.04,2.75,2.5],look=[-8.2,3.6,2.3],lens=18),dict(t=24,p=[-6.9,3.3,2.5],look=[-8.8,3.6,2.2],lens=18),dict(t=29,p=[-6.9,3.3,2.5],look=[-7,-3,2.5],lens=18),dict(t=32,p=[-7,1.8,2.5],look=[-5,-5,2.6],lens=20),dict(t=36,p=[-6.9,-1.3,2.55],look=[11,-7,2.3],lens=24)]
# Walk around the right outdoor chair, then cross the actual door opening.
path[6:6]=[dict(t=17,p=[-6.48,-.8,2.5],look=[-7,2.4,2.3],lens=20),dict(t=18,p=[-6.48,.25,2.5],look=[-7,2.4,2.3],lens=20),dict(t=19,p=[-6.95,.75,2.5],look=[-7.3,3.5,2.3],lens=19)]
(out/'tour.json').write_text(json.dumps(path,indent=2));keys=[{**k,'P':Vector(k['p']),'Q':(Vector(k['look'])-Vector(k['p'])).to_track_quat('-Z','Y')} for k in path]
d=bpy.data.cameras.new('Continuous camera');d.sensor_width=36;d.sensor_fit='HORIZONTAL';cam=bpy.data.objects.new('Continuous camera',d);s.collection.objects.link(cam);cam.rotation_mode='QUATERNION';s.camera=cam;hinge=bpy.data.objects['Cafe_Door_Hinge'];hinge.animation_data_clear()
def pose(t):
 i=next((i for i,k in enumerate(keys) if k['t']>=t),len(keys)-1);b=keys[i];a=keys[max(0,i-1)];u=0 if a==b else (t-a['t'])/(b['t']-a['t']);u=u*u*(3-2*u);cam.location=a['P'].lerp(b['P'],u);cam.rotation_quaternion=a['Q'].slerp(b['Q'],u);d.lens=a['lens']+(b['lens']-a['lens'])*u;angle=82*max(0,min(1,(t-13)/3));hinge.rotation_euler.z=math.radians(angle);bpy.context.view_layer.update();return angle
s.render.use_persistent_data=True;s.cycles.use_denoising=True;s.view_layers[0].cycles.use_denoising=True;s.render.resolution_x=960;s.render.resolution_y=540;s.render.resolution_percentage=100;s.cycles.samples=20;s.cycles.adaptive_threshold=.065
s.render.fps=12;trace=[];dest=out/('tour-preview' if a.stage=='preview' else 'tour-frames');dest.mkdir(exist_ok=True)
times=[0,6,10,13,16,20,24,29,32,35.9] if a.stage=='preview' else [i/12 for i in range(432)]
for i,t in enumerate(times):
 s.frame_set(i+1);angle=pose(t);trace.append({'time':t,'camera':[list(r) for r in cam.matrix_world],'position':list(cam.location),'quaternion':list(cam.rotation_quaternion),'door_angle_degrees':angle})
 if a.stage=='full':
  cam.keyframe_insert('location',frame=i+1);cam.keyframe_insert('rotation_quaternion',frame=i+1);d.keyframe_insert('lens',frame=i+1);hinge.keyframe_insert('rotation_euler',frame=i+1)
 s.render.image_settings.file_format='PNG' if a.stage=='preview' else 'JPEG';s.render.image_settings.quality=94;s.render.filepath=str(dest/(f't{t:04.1f}.png' if a.stage=='preview' else f'{i:04d}.jpg'))
 if not (a.resume and Path(s.render.filepath).is_file() and Path(s.render.filepath).stat().st_size>1000):
  started=time.perf_counter();bpy.ops.render.render(write_still=True);print('TOUR_FRAME',i,t,round(time.perf_counter()-started,2),flush=True)
if a.stage=='full':
 s.frame_start=1;s.frame_end=432;s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(out/'canal-world-tour.blend'))
else:
 # Same camera and geometry, actual open / closed leaf proof at the entrance.
 s.frame_set(1);pose(13);s.render.filepath=str(out/'door-closed.png');bpy.ops.render.render(write_still=True);pose(16);s.render.filepath=str(out/'door-open.png');bpy.ops.render.render(write_still=True)
report={'stage':a.stage,'frames':len(times),'fps':12,'duration':36,'master_sha256':hashlib.sha256((out/'canal-world-master.blend').read_bytes()).hexdigest(),'scene_objects':len(s.objects),'scope':'Actual Cycles consecutive camera renders of one mesh world. No Gaussian/mode swap, no image interpolation, no generated video. Gaussian version is separately inspected in the browser.','trace':trace};(out/('tour-'+a.stage+'.json')).write_text(json.dumps(report,indent=2));print('TOUR_COMPLETE',a.stage,flush=True)

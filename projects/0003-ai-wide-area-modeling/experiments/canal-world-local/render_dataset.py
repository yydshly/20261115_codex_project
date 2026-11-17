"""Actual multi-camera Cycles RGB-D observations from one editable master."""
import bpy,json,sys,argparse,time,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--preset',choices=['warm','day'],default='warm');p.add_argument('--views',default='all');p.add_argument('--preset-only',action='store_true');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out);cfg=json.loads((out/'world.json').read_text());bpy.ops.wm.open_mainfile(filepath=str(out/'canal-world-master.blend'));s=bpy.context.scene
s.cycles.samples=48;s.render.use_persistent_data=True
try:
 pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
 for d in pref.devices:d.use=d.type=='OPTIX'
 s.cycles.device='GPU' if any(d.use for d in pref.devices) else 'CPU'
except Exception:s.cycles.device='CPU'
if a.preset=='day':
 for o in s.objects:
  if o.type=='LIGHT':o.data.energy=o.get('warm_energy',o.data.energy)*.08
  if o.type=='MESH':
   for m in o.data.materials:
    if m and m.use_nodes:
     n=m.node_tree.nodes.get('Principled BSDF')
     if n:n.inputs['Emission Strength'].default_value=0
 world=s.world;world.node_tree.nodes.get('Background').inputs['Strength'].default_value=1.1
 d=bpy.data.lights.new('Daylight sun','SUN');d.energy=2.0;d.angle=.08;o=bpy.data.objects.new('Daylight sun',d);s.collection.objects.link(o);o.rotation_euler=(.52,-.35,-.7)
 d=bpy.data.lights.new('Daylight room bounce','AREA');d.energy=550;d.color=(.66,.81,1);d.size=3;o=bpy.data.objects.new('Daylight room bounce',d);s.collection.objects.link(o);o.location=(-7,1.9,3.6)
if a.preset_only:
 for o in s.objects:
  if o.type=='LIGHT' and o.data.type=='AREA':o.visible_glossy=False;o.visible_transmission=False
 s.frame_set(49);s.camera=bpy.data.objects['Cafe interior right'];bpy.ops.wm.save_as_mainfile(filepath=str(out/('canal-world-'+a.preset+'.blend')));print('PRESET_SAVED',a.preset,flush=True);sys.exit(0)
for o in s.objects:
 if o.type=='MESH' and any(m and m.name=='glass' for m in o.data.materials):o.pass_index=3;o.hide_render=True
 if o.type=='LIGHT' and o.data.type=='AREA':o.visible_glossy=False;o.visible_transmission=False
v=s.view_layers[0];v.use_pass_z=True;v.use_pass_normal=True;v.use_pass_position=True;v.use_pass_object_index=True
s.use_nodes=True;tree=s.node_tree;tree.nodes.clear();rl=tree.nodes.new('CompositorNodeRLayers');comp=tree.nodes.new('CompositorNodeComposite');tree.links.new(rl.outputs['Image'],comp.inputs[0])
outputs=[]
for key,socket in [('position','Position'),('normal','Normal'),('index','IndexOB')]:
 n=tree.nodes.new('CompositorNodeOutputFile');n.format.file_format='OPEN_EXR';n.format.color_depth='32';n.format.color_mode='RGB';n.format.exr_codec='ZIP';tree.links.new(rl.outputs[socket],n.inputs[0]);outputs.append((key,n))
records=[];chosen=cfg['views'] if a.views=='all' else [v for v in cfg['views'] if v['name'] in a.views.split(',')]
for info in chosen:
 dest=out/'dataset'/a.preset/info['name'];dest.mkdir(parents=True,exist_ok=True)
 s.camera=bpy.data.objects[info['camera']];s.frame_set(1);s.render.filepath=str(dest/'rgb.png')
 for key,n in outputs:n.base_path=str(dest);n.file_slots[0].path=key+'-'
 t=time.perf_counter();bpy.ops.render.render(write_still=True)
 record={**info,'frame':1,'lighting':a.preset,'seconds':time.perf_counter()-t,'rgb':str(dest/'rgb.png'),'position':str(dest/'position-0001.exr'),'normal':str(dest/'normal-0001.exr'),'index':str(dest/'index-0001.exr'),'master_sha256':hashlib.sha256((out/'canal-world-master.blend').read_bytes()).hexdigest()};records.append(record);(dest/'camera.json').write_text(json.dumps(record,indent=2));print('RGBD',info['name'],record['seconds'],flush=True)
(out/('dataset-'+a.preset+'.json')).write_text(json.dumps({'views':records,'source':'Actual renders from a single designed master, not generated observations of hidden reality','glass':'Glass hidden during surface-cache capture so rays observe the space behind it; runtime glass remains a separate transparent mesh','semantic_ids':{'1':'static opaque','2':'moving cafe door opaque','3':'glass omitted from Gaussian surface fusion'}},indent=2))

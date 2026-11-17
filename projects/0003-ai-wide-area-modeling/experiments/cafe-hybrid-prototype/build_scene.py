"""Create a NEW editable café, Blender-authored door motion and relighting proof."""
import argparse,json,math,random,sys,time
from pathlib import Path
import bpy
from mathutils import Vector,Matrix
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--stage',choices=['all','interior'],default='all');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out);cfg=json.loads((out/'layout.json').read_text());dw=cfg['door_width'];random.seed(17)
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene
s.unit_settings.system='METRIC';s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=48;s.cycles.use_denoising=True;s.render.threads_mode='FIXED';s.render.threads=6
s.render.resolution_x=1000;s.render.resolution_y=650;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.fps=24;s.frame_start=1;s.frame_end=97
s.world=bpy.data.worlds.new('Designed dusk environment');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.11,.16,.23,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.3
s.view_settings.view_transform='AgX'
def mat(name,color,rough=.5,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;return m
wall=mat('PBR warm lime plaster',(.52,.43,.31),.85);teal=mat('PBR deep teal wood',(.035,.12,.12),.5);oak=mat('PBR aged oak',(.18,.075,.026),.48);dark=mat('PBR dark espresso wood',(.055,.021,.009),.38);brass=mat('PBR aged brass',(.42,.25,.08),.3,.8);black=mat('PBR charcoal iron',(.025,.031,.035),.4,.7);cream=mat('PBR porcelain',(.75,.71,.60),.24);green=mat('PBR foliage',(.035,.15,.06),.75);stone=mat('PBR exterior paving',(.16,.18,.18),.8)
glass=mat('PBR transparent glass',(.8,.91,.92),.06);g=glass.node_tree.nodes.get('Principled BSDF');g.inputs['Transmission Weight'].default_value=.98;g.inputs['IOR'].default_value=1.45;g.inputs['Alpha'].default_value=.18;glass.surface_render_method='DITHERED'
glow=mat('Warm pendant emitter',(.95,.65,.25),.45);gn=glow.node_tree.nodes.get('Principled BSDF');gn.inputs['Emission Color'].default_value=(1,.43,.13,1);gn.inputs['Emission Strength'].default_value=3
def box(name,loc,size,m,parent=None,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if m:o.data.materials.append(m)
 if bevel:mod=o.modifiers.new('Small physical edge bevel','BEVEL');mod.width=bevel;mod.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 if parent:o.parent=parent
 return o
def cyl(name,loc,r,depth,m,vertices=24):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(m);return o
def sphere(name,loc,size,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,location=loc);o=bpy.context.object;o.name=name;o.scale=size;o.data.materials.append(m);return o
left=-4.1;right=dw+.6;depth=5.2;h=3.2
# Closed room shell, with actual front door and window openings.
for i in range(27):
 width=(right-left)/27;m=mat('Floor oak plank %02d'%i,(.18+random.random()*.075,.08+random.random()*.035,.03+random.random()*.015),.55)
 box('Floor plank %02d'%i,(left+(i+.5)*width,depth/2,-.065),(width-.012,depth,.13),m,bevel=.008)
box('Ceiling',((left+right)/2,depth/2,h+.07),(right-left,.15+depth,.14),wall)
box('Back wall',((left+right)/2,depth+.09,h/2),(right-left+.2,.18,h),wall)
box('Left wall',(left-.09,depth/2,h/2),(.18,depth,h),wall)
box('Right wall',(right+.09,depth/2,h/2),(.18,depth,h),wall)
for x in [left,right]:box('Teal side wainscot',(x,depth/2,.42),(.035,depth,.84),teal)
box('Teal back wainscot',((left+right)/2,depth-.015,.42),(right-left,.04,.84),teal)
box('Front lintel',((left+right)/2,.09,2.86),(right-left,.18,.68),wall)
wl,wr=cfg['window_local_bounds'];wm=(wl+wr)/2;ww=wr-wl
box('Left front pier',((left+wl)/2,.09,1.3),(wl-left,.18,2.6),wall)
box('Middle front pier',(-.18,.09,1.3),(.30,.18,2.6),wall)
box('Right front pier',(dw+.31,.09,1.3),(.58,.18,2.6),wall)
box('Window solid base',(wm,.09,.30),(ww,.18,.60),teal)
# Window glass is genuinely transparent; original photographic interior is cut.
box('Window glass',(wm,.06,1.55),(ww-.08,.015,1.86),glass,bevel=0)
for x in [wl,wm,wr]:box('Window vertical mullion',(x,-.01,1.55),(.075,.12,1.98),dark)
for z in [.59,1.65,2.51]:box('Window horizontal rail',(wm,-.01,z),(ww+.08,.12,.07),dark)
box('Threshold',(dw/2,-.05,-.02),(dw+.18,.38,.13),stone)
box('Exterior paving',((left+right)/2,-1.5,-.12),(right-left+1,3,.12),stone)
for x in [-.035,dw+.035]:box('Door fixed jamb',(x,.12,1.27),(.07,.22,2.54),dark)
box('Door fixed header',(dw/2,.12,2.54),(dw+.14,.22,.08),dark)
hinge=bpy.data.objects.new('Door_Hinge',None);s.collection.objects.link(hinge);hinge['role']='Authoritative Blender controller; Gaussian skin follows its world matrix';hinge.empty_display_type='ARROWS';hinge.empty_display_size=.35
for x in [.055,dw-.055]:box('LeafWood upright',(x,.10,1.25),(.11,.12,2.5),dark,hinge)
for z,height in [(.10,.20),(.66,.12),(2.44,.12)]:box('LeafWood rail',(dw/2,.10,z),(dw-.1,.12,height),dark,hinge)
box('LeafWood lower panel',(dw/2,.115,.38),(dw-.18,.085,.43),oak,hinge)
box('DoorGlass',(dw/2,.105,1.55),(dw-.20,.012,1.65),glass,hinge,bevel=0)
handle=box('Door brass handle',(dw-.18,-.015,1.0),(.04,.07,.24),brass,hinge)
for z in [.36,2.1]:
 o=cyl('Door hinge brass barrel',(0,.08,z),.035,.19,brass);o.parent=hinge
for frame,deg in [(1,0),(17,0),(41,75),(65,75),(97,0)]:
 hinge.rotation_euler.z=math.radians(deg);hinge.keyframe_insert(data_path='rotation_euler',frame=frame)
if hinge.animation_data and hinge.animation_data.action:
 try:
  for fc in hinge.animation_data.action.fcurves:
   for k in fc.keyframe_points:k.interpolation='BEZIER'
 except AttributeError:pass
# Designed interior, deliberately simple but complete from all sides.
box('Service counter',(-2.35,3.75,.55),(2.7,.62,1.1),teal)
box('Counter oak worktop',(-2.35,3.75,1.13),(2.85,.76,.10),oak)
box('Back shelving frame',(-2.35,5.06,1.8),(2.9,.26,1.65),dark)
for z in [1.12,1.66,2.2,2.64]:box('Shelf oak board',(-2.35,4.87,z),(2.85,.56,.055),oak)
for k in range(21):
 row=k//7;col=k%7
 cyl('Ceramic coffee jar %02d'%k,(-3.5+col*.37,4.75,1.24+row*.54),.09,.18,cream,16)
box('Espresso machine',(-2.65,3.7,1.39),(.70,.38,.42),black)
box('Espresso brass fascia',(-2.65,3.49,1.39),(.60,.025,.24),brass)
for x in [-2.85,-2.57]:cyl('Porcelain coffee cup',(x,3.65,1.66),.055,.085,cream,16)
def table(x,y):
 cyl('Round oak table top',(x,y,.78),.55,.075,oak,40);cyl('Iron table pedestal',(x,y,.39),.045,.75,black);cyl('Table foot',(x,y,.03),.30,.05,black)
 for dx,dy in [(-.72,0),(.72,0)]:
  cx,cy=x+dx,y+dy;box('Chair seat',(cx,cy,.46),(.40,.40,.06),oak)
  for lx in [-.15,.15]:
   for ly in [-.15,.15]:box('Chair leg',(cx+lx,cy+ly,.22),(.035,.035,.44),black)
  bx=cx+(.18 if dx>0 else -.18);box('Chair back',(bx,cy,.78),(.045,.40,.56),oak)
 cyl('Table cup',(x+.16,y,.86),.055,.09,cream,16)
 cyl('Small vase',(x-.13,y,.87),.06,.14,teal,16)
 for k in range(5):sphere('Vase foliage',(x-.13+random.uniform(-.1,.1),y+random.uniform(-.09,.09),1.02+random.random()*.1),(.045,.025,.09),green)
table(-2.6,1.5);table(.35,3.25)
for x,y in [(-3.7,.45),(right-.45,4.65)]:
 cyl('Plant pot',(x,y,.22),.20,.42,teal)
 for k in range(11):sphere('Interior plant leaf',(x+random.uniform(-.23,.23),y+random.uniform(-.2,.2),.5+random.random()*.55),(.10,.055,.21),green)
box('Wall picture backing',(right-.015,2,1.9),(.06,.82,.68),dark)
box('Wall picture art',(right-.055,2,1.9),(.015,.68,.54),teal)
box('Window-side cabinet',(right-.28,1.35,.5),(.5,1.6,1.0),teal)
box('Window-side worktop',(right-.30,1.35,1.03),(.64,1.7,.07),oak)
for z in [1.55,2.12]:
 box('Right display shelf',(right-.16,1.35,z),(.32,1.7,.06),oak)
 for k in range(5):cyl('Right display cup',(right-.18,.72+k*.31,z+.11),.07,.16,cream,16)
for x,y in [(-2.6,1.5),(-2.3,3.7),(.35,3.25)]:
 cyl('Pendant brass shade',(x,y,2.65),.19,.11,brass);cyl('Pendant diffuser',(x,y,2.585),.15,.015,glow);cyl('Pendant cable',(x,y,2.94),.008,.5,black,8)
def light(name,pos,color,power,size,target):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
warm=[light('Warm overhead key',(-2.6,1.5,2.56),(1,.63,.32),380,1.0,(-2.6,1.5,0)),light('Warm counter light',(-2.3,3.7,2.56),(1,.67,.4),320,.8,(-2.3,3.7,.8)),light('Warm right fill',(.35,3.25,2.56),(1,.68,.42),200,.8,(.35,3.25,.2))]
day=[light('Daylight window key',(-2.0,.35,2.35),(.64,.80,1),1500,1.7,(-1.2,3,.5)),light('Daylight side fill',(1.5,4.3,2.8),(.72,.85,1),250,1.4,(-2,2,.8))]
def lighting(mode):
 for o in warm:o.data.energy=o['base_energy'] if mode=='warm' else 0
 for o in day:o.data.energy=o['base_energy'] if mode=='day' else 0
 gn.inputs['Emission Strength'].default_value=3 if mode=='warm' else 0
for o in warm+day:o['base_energy']=o.data.energy
def camera(name,pos,target,lens=25):
 d=bpy.data.cameras.new(name);d.lens=lens;o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
entry=camera('Interior toward counter',(1.35,2.1,1.65),(-1.9,3.8,1.25),23)
reverse=camera('Interior toward entrance',(-2.0,4.55,1.65),(-.25,.1,1.3),24)
outside=camera('Exterior mesh demonstration',(-2.6,-4.3,1.7),(-.65,1.0,1.35),27)
photo=bpy.data.objects.new('Original image camera',bpy.data.cameras.new('Original image camera'));s.collection.objects.link(photo);photo.location=cfg['camera_blender']['position'];photo.rotation_euler=Matrix(cfg['camera_blender']['rotation_matrix']).to_quaternion().to_euler();photo.data.lens=cfg['focal_px']/cfg['original_size'][0]*36;photo.data.sensor_width=36;photo.data.sensor_fit='HORIZONTAL'
img=bpy.data.images.load(str(out/'reference.png'));img.pack();photo.data.show_background_images=True;photo.data.background_images.new().image=img
s['scope']='New cafe prototype. Hidden room is designed, not reconstructed truth. Gaussian appearance rendered externally by Spark; this Blender file contains PBR structure and authoritative motion.'
# Export authoritative controller matrices and camera poses from actual Blender.
motions=[]
for frame in range(1,98):
 s.frame_set(frame);bpy.context.view_layer.update();motions.append(dict(frame=frame,angle=float(hinge.rotation_euler.z),matrix=[list(row) for row in hinge.matrix_world]))
camera_data={o.name:dict(position=list(o.location),rotation_quaternion=list(o.rotation_euler.to_quaternion()),lens=o.data.lens) for o in [entry,reverse,outside,photo]}
lightdata={mode:[dict(name=o.name,position=list(o.location),color=list(o.data.color),energy=o['base_energy']) for o in ls] for mode,ls in [('warm',warm),('day',day)]}
binding=dict(frames=motions,rest_matrix=motions[0]['matrix'],cameras=camera_data,light_presets=lightdata,door_width=dw,door_height=2.5,room=dict(x=[left,right],y=[0,depth],height=h),blender_to_three=[[1,0,0,0],[0,0,1,0],[0,-1,0,0],[0,0,0,1]],scope='Matrices authored and evaluated in Blender; viewer does not invent the door animation')
(out/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf-8')
s.frame_set(1);lighting('warm');s.camera=entry
# Standard mesh export for the hybrid viewer. Procedural nodes are not claimed
# to survive glTF; these materials use constant PBR factors and mesh detail.
bpy.ops.export_scene.gltf(filepath=str(out/'cafe-structure.glb'),export_format='GLB',export_animations=False,export_lights=False,export_cameras=False)
prototype=out/'cafe-hybrid-prototype.blend';bpy.ops.wm.save_as_mainfile(filepath=str(prototype))
records=json.loads((out/'blender-report.json').read_text())['renders'] if a.stage=='interior' else {}
def render(name,cam,mode,frame):
 lighting(mode);s.frame_set(frame);s.camera=cam;s.render.filepath=str(out/(name+'.png'));t=time.perf_counter();bpy.ops.render.render(write_still=True);records[name]=dict(seconds=time.perf_counter()-t,frame=frame,lighting=mode,camera=cam.name)
if a.stage=='all':render('blender-exterior-closed',outside,'warm',1);render('blender-exterior-open',outside,'warm',49)
render('blender-interior-warm',entry,'warm',49);render('blender-interior-day',entry,'day',49)
if a.stage=='all':render('blender-interior-reverse',reverse,'warm',49)
lighting('warm');s.frame_set(1);s.camera=entry
(out/'blender-report.json').write_text(json.dumps(dict(renders=records,objects=len(s.objects),mesh_objects=sum(o.type=='MESH' for o in s.objects),blend=str(prototype),source_models_opened=False),indent=2),encoding='utf-8')
print('CAFE_COMPLETE',json.dumps(records),flush=True)

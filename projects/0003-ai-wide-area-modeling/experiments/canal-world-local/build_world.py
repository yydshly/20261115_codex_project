"""Create an isolated, editable master from our own V4 geometry; never save source.

New geometry is design completion, not a learned reconstruction of hidden space.
All RGB-D views are actual renders of this one scene.
"""
import argparse,hashlib,json,math,random,sys,time
from pathlib import Path
import bpy
from mathutils import Vector

p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--out',required=True);p.add_argument('--preview',action='store_true');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
out=Path(a.out);out.mkdir(parents=True,exist_ok=True);source=Path(a.source);before=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(source));s=bpy.context.scene;random.seed(59)
s.render.engine='CYCLES';s.cycles.samples=64;s.cycles.use_denoising=True;s.cycles.max_bounces=8;s.cycles.transmission_bounces=6
s.render.resolution_x=1280;s.render.resolution_y=720;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.fps=24;s.frame_start=1;s.frame_end=97
s.render.threads_mode='FIXED';s.render.threads=6;s.render.film_transparent=False;s.render.use_persistent_data=True
devices=[]
try:
 pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
 for d in pref.devices:d.use=d.type=='OPTIX';devices.extend([d.name] if d.use else [])
 s.cycles.device='GPU' if devices else 'CPU'
except Exception:s.cycles.device='CPU'
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=.7

def group(name):
 c=bpy.data.collections.get(name)
 if not c:c=bpy.data.collections.new(name);s.collection.children.link(c)
 return c
detail=group('04 Cafe completion');controllers=group('Controllers');cams=group('Validation cameras')
def move(o,c=detail):
 for co in list(o.users_collection):co.objects.unlink(o)
 c.objects.link(o);return o
def mat(name,color,rough=.5,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;return m
wood=bpy.data.materials['wood'];oak=bpy.data.materials['wood_light'];iron=bpy.data.materials['iron'];brass=bpy.data.materials['brass'];teal=bpy.data.materials['teal'];cream=mat('Ivory ceramic',(.72,.65,.5),.22);coffee=mat('Espresso coffee',(.014,.006,.002),.14);paper=mat('Menu paper',(.64,.57,.42),.8)
def box(name,loc,size,m,bevel=.016):
 h=[x/2 for x in size];v=[(x*h[0],y*h[1],z*h[2]) for x,y,z in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]];d=bpy.data.meshes.new(name);d.from_pydata(v,[],[(0,2,6,4),(1,5,7,3),(0,4,5,1),(2,3,7,6),(0,1,3,2),(4,6,7,5)]);d.materials.append(m);o=bpy.data.objects.new(name,d);detail.objects.link(o);o.location=loc
 if bevel:mod=o.modifiers.new('Rounded craftsmanship','BEVEL');mod.width=bevel;mod.segments=3;o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
 return o
def cyl(name,loc,r,depth,m,vertices=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return move(o)
def text(name,body,loc,size,m,rotation):
 d=bpy.data.curves.new(name,'FONT');d.body=body;d.size=size;d.extrude=.0004;o=bpy.data.objects.new(name,d);detail.objects.link(o);o.location=loc;o.rotation_euler=rotation;d.materials.append(m);return o
def light(name,pos,power,color,target,size=1):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);detail.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
def sphere(name,pos,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=pos);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return move(o)

# The old static front becomes a complete, physically thick movable leaf.
hinge=bpy.data.objects.new('Cafe_Door_Hinge',None);controllers.objects.link(hinge);hinge.location=(-7.68,.99,.9);hinge.empty_display_type='ARROWS';hinge['role']='Single authoritative leaf controller for mesh and derived Gaussian cache'
bpy.context.view_layer.update()
prefix=('Door lower panel','Door upper glass','Entry door frame','Brass door pull','Door pull mounting')
leaf=[o for o in bpy.data.collections['01 Cafe'].objects if o.name.startswith(prefix)]
for o in leaf:
 M=o.matrix_world.copy();o.parent=hinge;o.matrix_parent_inverse=hinge.matrix_world.inverted();o.matrix_basis=M;o.pass_index=2;o['binding_group']='cafe_door'
for z in [1.18,3.48]:
 o=cyl('Cafe bronze hinge barrel',(-7.68,.99,z),.043,.22,brass);bpy.context.view_layer.update();M=o.matrix_world.copy();o.parent=hinge;o.matrix_parent_inverse=hinge.matrix_world.inverted();o.matrix_basis=M;o.pass_index=2
for frame,angle in [(1,0),(17,0),(41,82),(65,82),(97,0)]:hinge.rotation_euler.z=math.radians(angle);hinge.keyframe_insert('rotation_euler',frame=frame)
s.frame_set(1);bpy.context.view_layer.update()
# A counter with space to pass, framed cabinetry, machine and functional seating.
box('Cafe paneled service counter',(-8.45,3.65,1.47),(2.15,.68,1.05),teal)
box('Cafe polished counter top',(-8.45,3.65,2.03),(2.3,.83,.09),oak)
for x in [-9.13,-8.45,-7.77]:
 box('Counter raised panel',(x,3.294,1.48),(.59,.045,.75),wood)
 for z in [1.16,1.79]:box('Counter panel molding',(x,3.257,z),(.55,.026,.035),oak,.005)
box('Coffee machine body',(-8.72,3.65,2.32),(.75,.43,.48),iron,.04)
box('Coffee machine brass fascia',(-8.72,3.415,2.32),(.66,.035,.29),brass)
for x in [-8.94,-8.5]:
 knob=cyl('Machine control dial',(x,3.38,2.36),.048,.025,iron);knob.rotation_euler.x=math.pi/2
 cyl('Coffee cup',(x,3.57,2.61),.06,.095,cream)
box('Machine drip tray',(-8.72,3.3,2.13),(.68,.23,.045),brass)
cyl('Coffee grinder',(-7.8,3.66,2.25),.115,.37,iron);sphere('Coffee bean hopper',(-7.8,3.66,2.51),(.115,.115,.17),coffee)
# Right seating stays outside the entry aisle. Deliberately designed unseen room.
for x,y in [(-5.18,2.75),(-8.95,2.0)]:
 cyl('Cafe round oak tabletop',(x,y,1.66),.44,.075,oak,48);cyl('Cafe cast iron table stem',(x,y,1.3),.045,.68,iron);cyl('Cafe table pedestal foot',(x,y,.99),.25,.055,iron)
 for dy in [-.64,.64]:
  cy=y+dy;cyl('Cafe chair seat',(x,cy,1.36),.23,.065,wood)
  for dx2 in [-.16,.16]:
   for dy2 in [-.15,.15]:box('Cafe chair leg',(x+dx2,cy+dy2,1.16),(.028,.028,.4),iron,.006)
  by=cy+(.16 if dy>0 else -.16);box('Cafe chair curved back',(x,by,1.69),(.43,.055,.40),wood,.045)
 cyl('Coffee saucer',(x+.10,y,1.706),.105,.012,cream);cyl('Fresh coffee cup',(x+.10,y,1.75),.06,.08,cream);cyl('Coffee surface',(x+.10,y,1.791),.049,.002,coffee)
 box('Folded cafe menu',(x-.19,y,1.706),(.18,.27,.009),paper,.002)
 cyl('Cafe small vase',(x,y+.21,1.78),.055,.16,teal)
 for k in range(6):sphere('Cafe vase foliage',(x+random.uniform(-.09,.09),y+.21+random.uniform(-.07,.07),1.93+random.random()*.08),(.045,.025,.085),bpy.data.materials['leaf'])
box('Chalk menu frame',(-4.39,3.78,2.95),(.07,.82,1.0),wood)
box('Chalk menu slate',(-4.44,3.78,2.95),(.025,.7,.88),iron)
text('Chalk menu lettering','CAFE\n\nESPRESSO   3\nLATTE      4\nCROISSANT  3',(-4.461,4.08,3.25),.07,cream,(math.pi/2,0,-math.pi/2))
text('Cafe fascia lettering','CAFE DU CANAL',(-9.1,.754,4.36),.22,brass,(math.pi/2,0,0))
# Real floor boards rather than a flat brown slab.
for i in range(23):
 x=-9.66+(i+.5)*5.32/23
 for j in range(5):
  y=1.17+(j+.5)*5.1/5
  box('Cafe individual oak floor board',(x,y,.998),(5.32/23-.008,5.1/5-.007,.022),oak if (i+j)%4 else wood,.004)
light('Cafe counter task light',(-8.5,3.6,3.8),95,(1,.65,.36),(-8.5,3.65,1.8),1.1)
light('Cafe room soft fill',(-7.0,3.45,3.85),95,(1,.70,.45),(-7,2.4,1),1.7)
# Far opposite houses close the reverse-view horizon with real editable solids.
for i,x in enumerate([-18,-11,-4,3,18,25,32]):
 y=-17.2;h=5.3+(i%3)*.65;w=5.6
 box('Opposite bank plaster house',(x,y,.85+h/2),(w,5,h),bpy.data.materials['plaster_alt'])
 verts=[(x-w/2-.2,y-2.7,.85+h),(x+w/2+.2,y-2.7,.85+h),(x+w/2+.2,y+2.7,.85+h),(x-w/2-.2,y+2.7,.85+h),(x-w/2-.2,y,.85+h+1.6),(x+w/2+.2,y,.85+h+1.6)]
 d=bpy.data.meshes.new('Opposite pitched roof');d.from_pydata(verts,[],[(0,1,5,4),(4,5,2,3),(0,4,3),(1,2,5)]);d.materials.append(bpy.data.materials['roof']);o=bpy.data.objects.new('Opposite bank roof',d);detail.objects.link(o)
 for z in [2.2,4.4]:
  for dx in [-1.5,0,1.5]:
   box('Opposite window frame',(x+dx,y+2.51,z),(.82,.10,1.18),wood)
   box('Opposite warm window',(x+dx,y+2.571,z),(.67,.025,1.01),bpy.data.materials['Distant dim amber window'])
   box('Opposite window mullion',(x+dx,y+2.59,z),(.042,.035,1.01),wood,.004)

# Stable semantic IDs travel with every RGB-D observation and Gaussian group.
for o in s.objects:
 if o.type in ('MESH','CURVE','FONT') and o.pass_index!=2:o.pass_index=1
 o['local_world_origin']='Own reference-guided mesh reused and completed in isolated project'
for o in s.objects:
 if o.type=='LIGHT':o['warm_energy']=o.data.energy;o['warm_color']=list(o.data.color)
world=s.world;bg=world.node_tree.nodes.get('Background');world['warm_strength']=bg.inputs['Strength'].default_value
def cam(name,pos,target,lens):
 d=bpy.data.cameras.new(name);d.lens=lens;d.sensor_width=36;d.sensor_fit='HORIZONTAL';d.clip_end=300;o=bpy.data.objects.new(name,d);cams.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
hero=s.camera
views=[('hero',hero),('street-left',cam('Street left',(-12.3,-2.15,2.55),(-4.0,1.5,3.1),25)),('street-right',cam('Street right',(5.5,-2.2,2.55),(-7,1.3,2.5),23)),('bridge',cam('From bridge',(10.9,-5.7,3.62),(-4.2,1.2,3.1),25)),('cafe-front',cam('Cafe front',(-8.5,-3.0,2.55),(-7,2.0,2.4),24)),('entry',cam('Cafe entry',(-7.05,.25,2.5),(-7.1,3.8,2.25),20)),('interior-left',cam('Cafe interior left',(-9.25,2.55,2.5),(-5.0,3.0,2.3),18)),('interior-right',cam('Cafe interior right',(-4.8,2.9,2.5),(-8.6,3.5,2.3),19)),('interior-back',cam('Cafe turn toward street',(-6.9,3.8,2.5),(-7.15,-2.0,2.5),18)),('opposite',cam('Opposite bank',(-4,-12.5,2.55),(-3.3,1.2,3.8),26)),('aerial',cam('Full editable world',(18,-22,17),(-1,-2,2.4),40)),('door-side',cam('Door side',(-5.55,.3,2.5),(-7.2,1.3,2.2),22))]
motions=[]
for f in range(1,98):
 s.frame_set(f);bpy.context.view_layer.update();motions.append({'frame':f,'angle':hinge.rotation_euler.z,'matrix':[list(r) for r in hinge.matrix_world]})
viewdata=[]
for name,o in views:viewdata.append({'name':name,'camera':o.name,'matrix_world':[list(r) for r in o.matrix_world],'lens':o.data.lens,'width':1280,'height':720,'fx':o.data.lens/36*1280,'frame':49})
s['scope']='Isolated editable completion of our own canal model. Not an automatic recovery of hidden space from one image. Source SHARP splats are not silently stretched into this world.'
s['gaussian_pipeline']='Render posed RGB / world position / normals / semantic IDs -> validate reprojection -> fuse oriented surface Gaussians; lighting caches rebuilt from master.'
s.frame_set(1);s.camera=hero
s.view_layers[0].cycles.use_denoising=True
bpy.ops.wm.save_as_mainfile(filepath=str(out/'canal-world-master.blend'))
# GLB is an editable/runtime mesh derivative, not a mesh extracted from Gaussian fog.
bpy.ops.export_scene.gltf(filepath=str(out/'canal-world.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
report={'source':str(source),'source_sha256':before,'source_unchanged':hashlib.sha256(source.read_bytes()).hexdigest()==before,'objects':len(s.objects),'mesh_objects':sum(o.type=='MESH' for o in s.objects),'door_objects':[o.name for o in leaf],'devices':devices,'views':viewdata,'door':{'name':hinge.name,'rest_matrix':motions[0]['matrix'],'frames':motions},'light_scope':'Editable PBR master; splat appearance caches are baked per lighting preset','completion':'Explicit procedural design, reusing our own V4 geometry in a new file; no external image/world model invoked'}
(out/'world.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
if a.preview:
 for name,o in views:
  if name not in ['hero','interior-right','interior-back','aerial']:continue
  s.camera=o;s.frame_set(49);s.render.filepath=str(out/(name+'.png'));t=time.perf_counter();bpy.ops.render.render(write_still=True);print('PREVIEW',name,time.perf_counter()-t,flush=True)
print('WORLD_BUILT',len(s.objects),devices,flush=True)

"""Keep the source-driven cafe; supply surfaces, back faces, and unseen context.

Blender never replaces the original Gaussian street with a rendered cache.
"""
import bpy,json,sys,argparse,math
from pathlib import Path
import numpy as np
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
p=argparse.ArgumentParser();p.add_argument('--prototype',required=True);p.add_argument('--world',required=True);p.add_argument('--out',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out);cfg=json.loads((out/'layout.json').read_text());bpy.ops.wm.open_mainfile(filepath=str(Path(a.prototype)/'cafe-hybrid-prototype.blend'));s=bpy.context.scene;s.frame_set(1);bpy.context.view_layer.update()
for o in s.objects:o['source_bound_role']='room'
# Place the visible cabinetry on the wall actually seen by the source rays.
# From the original oblique camera, rays through the front window meet the
# right wall, so generic shelving on the back-left wall cannot support it.
table_prefix=('Round oak table top','Iron table pedestal','Table foot','Chair seat','Chair leg','Chair back','Table cup','Small vase','Vase foliage')
for o in s.objects:
 if o.name.startswith(table_prefix) and -.8<o.location.x<1.5 and 2.5<o.location.y<4:o.location.x-=2.55
for o in list(s.objects):
 if o.name.startswith(('Window-side cabinet','Window-side worktop','Right display shelf','Right display cup','Wall picture backing','Wall picture art')):bpy.data.objects.remove(o,do_unlink=True)
bpy.context.view_layer.update()
rotate=Matrix.Rotation(-math.pi/2,4,'Z');shelf_transform=Matrix.Translation((cfg['door_width']+.42,3.0,0))@rotate@Matrix.Translation((2.35,-5.06,0));counter_transform=Matrix.Translation((1.35,3.0,0))@rotate@Matrix.Translation((2.35,-3.75,0))
for o in s.objects:
 if o.name.startswith(('Back shelving frame','Shelf oak board','Ceramic coffee jar')):o.matrix_world=shelf_transform@o.matrix_world
 elif o.name.startswith(('Service counter','Counter oak worktop','Espresso machine','Espresso brass fascia','Porcelain coffee cup')):o.matrix_world=counter_transform@o.matrix_world
bpy.context.view_layer.update()
# Actual evaluated mesh surfaces for the photographed window/door interior.
verts=[];faces=[];face_ids=[];objects=[];support=[];dg=bpy.context.evaluated_depsgraph_get()
for o in s.objects:
 if o.type!='MESH' or o.parent and o.parent.name=='Door_Hinge':continue
 if any(m and ('glass' in m.name.lower()) for m in o.data.materials):continue
 e=o.evaluated_get(dg);mesh=e.to_mesh();mesh.calc_loop_triangles();base=len(verts);object_id=len(objects);objects.append(o.name)
 world_vertices=[tuple(e.matrix_world@v.co) for v in mesh.vertices];verts.extend(world_vertices);span=np.ptp(np.asarray(world_vertices),axis=0);support.append(float(max(.004,min(.18,sorted(span)[-2]/3))))
 for t in mesh.loop_triangles:faces.append(tuple(base+i for i in t.vertices));face_ids.append(object_id)
 e.to_mesh_clear()
bvh=BVHTree.FromPolygons(verts,faces,all_triangles=True);query=np.load(out/'binding-queries.npz');origin=Vector(query['origin'].tolist());hits=[];normals=[];owners=[];ok=[]
for pnt in query['points']:
 direction=Vector(pnt.tolist())-origin;direction.normalize();location,normal,fi,distance=bvh.ray_cast(origin,direction,200)
 if location is None:hits.append((0,0,0));normals.append((0,0,0));owners.append(-1);ok.append(False)
 else:
  if normal.dot(origin-location)<0:normal=-normal
  hits.append(tuple(location+normal*.004));normals.append(tuple(normal));owners.append(face_ids[fi]);ok.append(True)
np.savez_compressed(out/'query-hits.npz',ids=query['ids'],points=np.asarray(hits,dtype='f4'),normals=np.asarray(normals,dtype='f4'),owners=np.asarray(owners,dtype='i4'),valid=np.asarray(ok),sigma_caps=np.asarray([support[i] if i>=0 else .18 for i in owners],dtype='f4'));(out/'surface-objects.json').write_text(json.dumps(objects,indent=2));print('SOURCE_SURFACE_HITS',sum(ok),len(ok),flush=True)
# Fixed source visibility identifies exactly which room faces have an original
# photographic Gaussian skin. Other sides keep their opaque mesh support.
dw,dh=1000,563;dep=np.zeros((dh,dw),dtype='<f4');pixel_xy=[];pixel_p=[];pixel_n=[];pixel_owner=[];width,height=cfg['original_size'];focal=cfg['focal_px'];camR=np.asarray(cfg['camera_blender']['rotation_matrix']);camC=np.asarray(cfg['camera_blender']['position'])
for iy in range(dh):
 v=(iy+.5)/dh*height
 for ix in range(dw):
  u=(ix+.5)/dw*width
  win=175<u<390 and 363+(u-175)*18/213<v<664-(u-176)*22/214;doorphoto=423<u<499 and 401<v<566
  if not(win or doorphoto):continue
  ray=camR@np.array([(u-width/2)/focal,-(v-height/2)/focal,-1]);ray/=np.linalg.norm(ray);hit,normal,fi,dist=bvh.ray_cast(origin,Vector(ray.tolist()),200)
  if hit is not None:
   if normal.dot(origin-hit)<0:normal=-normal
   dep[iy,ix]=-((np.asarray(hit)-camC)@camR)[2];pixel_xy.append((ix,iy));pixel_p.append(tuple(hit+normal*.004));pixel_n.append(tuple(normal));pixel_owner.append(face_ids[fi])
dep.tofile(out/'source-depth.bin');(out/'source-visibility.json').write_text(json.dumps({'width':dw,'height':dh,'valid_pixels':int((dep>0).sum()),'coordinates':'Source camera forward depth in cafe design units, rows top to bottom','scope':'Fixed original-window visibility, never derived from active viewing camera'},indent=2))
np.savez_compressed(out/'surface-pixels.npz',xy=np.asarray(pixel_xy,dtype='i4'),points=np.asarray(pixel_p,dtype='f4'),normals=np.asarray(pixel_n,dtype='f4'),owners=np.asarray(pixel_owner,dtype='i4'))
# New geometry is explicitly limited to context unseen by the source camera.
completion=bpy.data.collections.new('Designed unseen context');s.collection.children.link(completion)
def material(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1);bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal;return m
stone=material('Completion wet stone',(.19,.17,.135),.26);water=material('Completion water',(.027,.075,.10),.19,.35)
def box(name,loc,size,m):
 x,y,z=[v/2 for v in size];d=bpy.data.meshes.new(name);d.from_pydata([(i*x,j*y,k*z) for i,j,k in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]],[],[(0,2,6,4),(1,5,7,3),(0,4,5,1),(2,3,7,6),(0,1,3,2),(4,6,7,5)]);d.materials.append(m);o=bpy.data.objects.new(name,d);completion.objects.link(o);o.location=loc;o['source_bound_role']='unseen_completion';return o
box('Unseen opposite quay',(1,-15,-.10),(29,4,.20),stone);box('Unseen canal surface',(1,-8,-.68),(29,10,.035),water)
box('Unseen opposite retaining wall',(1,-13,-.40),(29,.30,.70),stone)
# Reuse only opposite-bank detail as missing-view support. Original front street
# remains the unmodified / locally bound source Gaussian scene.
with bpy.data.libraries.load(a.world,link=False) as (src,dst):dst.collections=[n for n in src.collections if n in ['Opposite building 01','Opposite building 02','Opposite building 03','Opposite building 04']]
sx=cfg['door_width']/1.37;sz=2.5/2.99;H=Matrix.Diagonal((sx,sx,sz,1))@Matrix.Translation((7.68,-.99,-.9))
newnames=[]
for co in dst.collections:s.collection.children.link(co)
bpy.context.view_layer.update()
for co in dst.collections:
 for o in co.objects:
  o.matrix_world=H@o.matrix_world;o['source_bound_role']='unseen_completion';newnames.append(o.name)
  if o.type=='LIGHT':o.hide_render=True
# A physical ground support for the locally projected original cobblestones.
C=np.array(cfg['camera_blender']['position']);R=np.array(cfg['camera_blender']['rotation_matrix']);f=cfg['focal_px'];w,h=cfg['original_size'];ground=[]
for u,v in [(320,660),(1000,577),(1000,620),(320,810)]:
 ray=R@np.array([(u-w/2)/f,-(v-h/2)/f,-1]);ground.append(tuple(C+ray*((-.015-C[2])/ray[2])))
d=bpy.data.meshes.new('Source sidewalk support');d.from_pydata(ground,[],[(0,1,2,3)]);d.materials.append(stone);o=bpy.data.objects.new('Source sidewalk support',d);s.collection.objects.link(o);o['source_bound_role']='ground_support'
for o in s.objects:
 if o.type=='LIGHT' and o.data.type=='AREA':o.visible_glossy=False;o.visible_transmission=False
s['scope']='Original SHARP appearance remains primary. Gaussian attachment sidecars contain the source colors and source IDs. Only unseen context is newly designed; not a recovered hidden scene.'
s['source_gaussian_path']='Original immutable SHARP PLY (see preparation.json)';s['binding_sidecars']='layout.json, binding.json, source-groups.npz, surface-objects.json, query-hits.npz'
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(out/'cafe-source-bound.blend'))
# The editable native scene retains procedural nodes. glTF gets explicit PBR
# factors for these unobserved building components instead of a white fallback.
flat={}
for o in s.objects:
 if o.type!='MESH' or o.get('source_bound_role')!='unseen_completion':continue
 for i,m in enumerate(o.data.materials):
  if not m or not m.use_nodes:continue
  key=m.name
  if key not in flat:
   n=m.copy();n.name='Web completion '+key;bs=n.node_tree.nodes.get('Principled BSDF')
   if bs:
    for socket in ['Base Color','Roughness','Normal']:
     for link in list(bs.inputs[socket].links):n.node_tree.links.remove(link)
    palette={'plaster':(.50,.43,.33),'plaster_alt':(.38,.40,.34),'wood':(.055,.023,.01),'wood_light':(.23,.12,.05),'teal':(.025,.09,.09),'olive':(.08,.11,.04),'stone':(.27,.24,.18),'stone_light':(.42,.36,.25),'roof':(.035,.06,.07),'roof_alt':(.055,.08,.08),'iron':(.018,.022,.025),'book_red':(.30,.05,.02),'book_blue':(.025,.08,.12),'book_tan':(.48,.32,.13),'terracotta':(.3,.09,.035)};base=palette.get(key.split('.')[0],tuple(m.diffuse_color[:3]));bs.inputs['Base Color'].default_value=(*base,1);bs.inputs['Roughness'].default_value=.48
    if key not in ['warm_glow','Distant dim amber window']:bs.inputs['Emission Color'].default_value=(*(c*.07 for c in base),1);bs.inputs['Emission Strength'].default_value=1
   flat[key]=n
  if o.data.users>1:o.data=o.data.copy()
  o.data.materials[i]=flat[key]
bpy.ops.export_scene.gltf(filepath=str(out/'structure.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
info={'objects':len(s.objects),'photo_ray_hits':sum(ok),'photo_ray_queries':len(ok),'triangles_in_binding_surface':len(faces),'room_surface_objects':len(objects),'new_completion_objects':len(newnames)+3,'completion_shader_policy':'Only render new context outside original camera frustum. This fixed spatial mask is independent of the active camera; unobserved completion is labeled, source Gaussians stay enabled.'};(out/'structure.json').write_text(json.dumps(info,indent=2));print('STRUCTURE_READY',json.dumps(info),flush=True)

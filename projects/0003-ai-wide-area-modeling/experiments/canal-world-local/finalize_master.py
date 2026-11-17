"""Remove visible softbox artifacts, group complete tables, export a real sky."""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector,Matrix
out=Path(sys.argv[-1]);bpy.ops.wm.open_mainfile(filepath=str(out/'canal-world-master.blend'));s=bpy.context.scene
for o in s.objects:
 if o.type=='LIGHT' and o.data.type=='AREA':o.visible_glossy=False;o.visible_transmission=False
# Replace our provisional opposite-bank boxes with complete, editable buildings
# assembled from our already-authored windows, interiors, shutters and tile roofs.
provisional=('Opposite bank plaster house','Opposite bank roof','Opposite window frame','Opposite warm window','Opposite window mullion')
for o in list(s.objects):
 if o.name.startswith(provisional):bpy.data.objects.remove(o,do_unlink=True)
for i,x in enumerate([-19,-13,-7,-1,5,18,24,30]):
 name='Opposite building %02d'%i
 if bpy.data.collections.get(name):continue
 co=bpy.data.collections.new(name);s.collection.children.link(co);source=bpy.data.collections['02 Bookshop' if i%2==0 else '03 Pottery shop'];center=-1 if i%2==0 else 5;scale=.85
 transform=Matrix.Translation(Vector((x+center*scale,-14.8,.01)))@Matrix.Rotation(math.pi,4,'Z')@Matrix.Scale(scale,4)
 for original in list(source.objects):
  o=original.copy();o.name=name+' '+original.name;co.objects.link(o);o.matrix_world=transform@original.matrix_world;o.pass_index=1
  if o.type=='LIGHT':o.data=original.data.copy();o.data.energy*=scale**2;o['warm_energy']=o.data.energy
  o['completion']='Designed opposite facade using our reusable building components'
# Authoritative parent groups allow editing a whole table, not just its top.
for i,(x,y) in enumerate([(-5.18,2.75),(-8.95,2.0)]):
 parent=bpy.data.objects.get('Cafe_Table_'+str(i+1))
 if parent is None:parent=bpy.data.objects.new('Cafe_Table_'+str(i+1),None);s.collection.objects.link(parent);parent.location=(x,y,.99)
 bpy.context.view_layer.update()
 prefixes=('Cafe round oak tabletop','Cafe cast iron table stem','Cafe table pedestal foot','Coffee saucer','Fresh coffee cup','Coffee surface','Folded cafe menu','Cafe small vase','Cafe vase foliage')
 for o in list(s.objects):
  if o.type=='MESH' and o.name.startswith(prefixes) and abs(o.location.x-x)<.5 and abs(o.location.y-y)<.5:
   M=o.matrix_world.copy();o.parent=parent;o.matrix_parent_inverse=parent.matrix_world.inverted();o.matrix_basis=M
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(out/'canal-world-master.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'canal-world.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
cfg=json.loads((out/'world.json').read_text());cfg['objects']=len(s.objects);cfg['mesh_objects']=sum(o.type=='MESH' for o in s.objects);cfg['revision']='Complete opposite-bank buildings, softbox visibility fixed, full table edit controllers, separate transparent glass and sky';(out/'world.json').write_text(json.dumps(cfg,indent=2))
for o in s.objects:
 if o.type not in ('CAMERA','LIGHT'):o.hide_render=True
d=bpy.data.cameras.new('Environment capture');d.type='PANO';d.panorama_type='EQUIRECTANGULAR';o=bpy.data.objects.new('Environment capture',d);s.collection.objects.link(o);s.camera=o;o.rotation_euler=(1.5707963268,0,0)
s.render.resolution_x=2048;s.render.resolution_y=1024;s.cycles.samples=1;s.render.filepath=str(out/'sky.png');bpy.ops.render.render(write_still=True)
print('FINALIZED_MASTER',flush=True)

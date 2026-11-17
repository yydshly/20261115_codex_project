"""Read-only native Blender verification; update only JSON reports."""
import bpy,json,sys,hashlib,math
from pathlib import Path
from mathutils import Matrix
out=Path(sys.argv[-1]);master=out/'canal-world-master.blend';before=hashlib.sha256(master.read_bytes()).hexdigest();bpy.ops.wm.open_mainfile(filepath=str(master));s=bpy.context.scene;cfg=json.loads((out/'world.json').read_text());cfg['objects']=len(s.objects);cfg['mesh_objects']=sum(o.type=='MESH' for o in s.objects);cfg['revision']='Complete opposite-bank buildings, softbox visibility fixed, full table edit controllers, separate transparent glass and sky';(out/'world.json').write_text(json.dumps(cfg,indent=2))
hinge=bpy.data.objects['Cafe_Door_Hinge'];motions=[]
for frame in [1,25,49,97]:
 s.frame_set(frame);bpy.context.view_layer.update();expect=Matrix(cfg['door']['frames'][frame-1]['matrix']);diff=max(abs(hinge.matrix_world[i][j]-expect[i][j]) for i in range(4) for j in range(4));motions.append({'frame':frame,'matrix_max_error':diff,'degrees':math.degrees(hinge.rotation_euler.z)})
tables={name:len(bpy.data.objects[name].children) for name in ['Cafe_Table_1','Cafe_Table_2']};source=Path(cfg['source']);source_same=hashlib.sha256(source.read_bytes()).hexdigest()==cfg['source_sha256'];opposite={c.name:len(c.objects) for c in bpy.data.collections if c.name.startswith('Opposite building ')}
report={'blender':bpy.app.version_string,'objects':len(s.objects),'mesh_objects':cfg['mesh_objects'],'door_matrices':motions,'editable_table_children':tables,'opposite_buildings':opposite,'master_unchanged':hashlib.sha256(master.read_bytes()).hexdigest()==before,'old_v4_unchanged':source_same,'reference_world_scope':s.get('scope'),'external_images':[i.filepath for i in bpy.data.images if i.source=='FILE' and not i.packed_file]}
assert source_same and report['master_unchanged'] and max(x['matrix_max_error'] for x in motions)<1e-6
assert len(opposite)==8 and all(n>300 for n in opposite.values()) and all(v>=10 for v in tables.values())
(out/'master-verification.json').write_text(json.dumps(report,indent=2));print('MASTER_VERIFIED',json.dumps(report),flush=True)

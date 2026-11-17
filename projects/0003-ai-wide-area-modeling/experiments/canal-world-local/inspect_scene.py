import bpy,json,sys
from pathlib import Path
s=bpy.context.scene
r={'camera':s.camera.name,'camera_matrix':[list(r) for r in s.camera.matrix_world],'lens':s.camera.data.lens,'collections':{c.name:len(c.objects) for c in bpy.data.collections},'cafe':[{'name':o.name,'type':o.type,'loc':list(o.location),'dim':list(o.dimensions),'materials':[m.name for m in o.data.materials] if o.type=='MESH' else []} for o in bpy.data.collections['01 Cafe'].objects]}
Path(sys.argv[-1]).write_text(json.dumps(r,indent=2))

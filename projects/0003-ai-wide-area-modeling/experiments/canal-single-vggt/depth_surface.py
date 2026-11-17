"""Create a diagnostic 2.5D visible surface in Blender, not a complete scene."""
import argparse,json,math,sys
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--prediction',required=True);p.add_argument('--out',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
d=np.load(a.prediction);P=d['points_camera'];rgb=d['rgb'];H,W=rgb.shape[:2];K=d['K']
bpy.ops.wm.read_factory_settings(use_empty=True)
stride=2;ys=np.arange(0,H,stride);xs=np.arange(0,W,stride);Q=P[::stride,::stride].copy();Q[...,1:]*=-1
verts=Q.reshape(-1,3).tolist();hh,ww=Q.shape[:2];faces=[]
for y in range(hh-1):
    for x in range(ww-1):
        ids=[y*ww+x,y*ww+x+1,(y+1)*ww+x+1,(y+1)*ww+x]
        depths=P[ys[y:y+2]][:,xs[x:x+2],2]
        # Do not bridge large jumps across occluding boundaries.
        if depths.max()/max(depths.min(),1e-6)<1.12:faces.extend([(ids[0],ids[1],ids[2]),(ids[0],ids[2],ids[3])])
mesh=bpy.data.meshes.new('VGGT visible surface');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Diagnostic depth sheet - no hidden geometry',mesh);bpy.context.collection.objects.link(obj)
uv=mesh.uv_layers.new(name='Reference UV')
for polygon in mesh.polygons:
    for loop in polygon.loop_indices:
        idx=mesh.loops[loop].vertex_index;y,x=divmod(idx,ww);uv.data[loop].uv=(xs[x]/W,1-ys[y]/H)
im=bpy.data.images.load(str(Path(a.prediction).parent/'model-input.png'),check_existing=False)
im.name='Model input';im.colorspace_settings.name='sRGB';im.pack()
mat=bpy.data.materials.new('Reference colors, emission for diagnostic only');mat.use_nodes=True
n=mat.node_tree.nodes;n.clear();tex=n.new('ShaderNodeTexImage');tex.image=im;em=n.new('ShaderNodeEmission');o=n.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(tex.outputs['Color'],em.inputs['Color']);mat.node_tree.links.new(em.outputs[0],o.inputs['Surface']);obj.data.materials.append(mat)
bpy.ops.object.camera_add(location=(0,0,0));cam=bpy.context.object;cam.name='Inferred input camera';cam.rotation_euler=(0,0,0);cam.data.lens=float(K[0,0]/W*36);cam.data.sensor_width=36
s=bpy.context.scene;s.camera=cam;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=8;s.render.threads_mode='FIXED';s.render.threads=6;s.render.resolution_x=1000;s.render.resolution_y=round(1000*H/W);s.render.resolution_percentage=100
s.render.pixel_aspect_y=(K[0,0]*1000/W)/(K[1,1]*s.render.resolution_y/H)
med=float(np.median(P[:,:,2]));cam.location=(med*.12,0,med*.06)
# This diagnostic uses camera coordinates with world Y up, not Blender's Z up.
cam.rotation_euler=(0,math.atan2(cam.location.x,med+cam.location.z),0)
s.view_settings.view_transform='Standard';s.view_settings.look='None';s.view_settings.exposure=0
s.world=bpy.data.worlds.new('Diagnostic background');s.world.color=(.08,.08,.08)
s['scope']='Visible surfaces from one inferred depth map, with reference colors. Not complete semantic geometry or a real-world measurement.'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'depth-surface-diagnostic.blend'))
s.render.filepath=str(out/'depth-surface-side.png');bpy.ops.render.render(write_still=True)
print('DEPTH DIAGNOSTIC',len(verts),len(faces),flush=True)

"""Render a real 3D screen/city/waveform-floor scene with a moving camera.

Run using Blender --background --factory-startup --python build_scene.py -- --preview.
The moving person is a 2D video texture on a 3D screen, not a reconstructed 3D human.
"""
from pathlib import Path
import argparse
import json
import math
import random
import sys
import time

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument("--context", required=True)
parser.add_argument("--start-frame", type=int, default=1)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
context = json.loads(Path(args.context).read_text(encoding="utf-8"))
ROOT = Path(context["city"])
config = context["config"]["scene"]
timing = context["timing"]
FRAME_COUNT = timing["keywords_done"] - timing["city"]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rng = random.Random(config["seed"])


def linear_channel(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def rgb(hex_value):
    h = hex_value.lstrip("#")
    return tuple(linear_channel(int(h[i:i+2], 16) / 255) for i in (0, 2, 4))


def surface(name, hex_value, metallic=0, rough=.4, emit=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb(hex_value), 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*rgb(hex_value), 1)
    node.inputs["Metallic"].default_value = metallic
    node.inputs["Roughness"].default_value = rough
    if emit:
        node.inputs["Emission Color"].default_value = (*rgb(hex_value), 1)
        node.inputs["Emission Strength"].default_value = emit
    return mat


def box(name, center, size, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new("Soft manufactured edges", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def mesh(name, verts, faces, materials, indices=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    for mat in materials:
        obj.data.materials.append(mat)
    if indices:
        for p, index in zip(data.polygons, indices):
            p.material_index = index
    return obj


def add_cuboid(v, f, center, size):
    x, y, z = center
    a, b, c = [n/2 for n in size]
    offset = len(v)
    v += [(x+sx*a, y+sy*b, z+sz*c) for sx, sy, sz in
          [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    f += [tuple(offset+i for i in face) for face in [(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]]


def point_at(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z", "Y").to_euler()


black = surface("Bezel / graphite", "#111823", .72, .22)
floor_mat = surface("Polished midnight floor", "#18202d", .74, .19)
building_mats = [surface("Building " + str(i), c, .22, .55) for i, c in enumerate(["#1a2030", "#242338", "#202a3b", "#302738"])]
warm_window = surface("Warm windows", "#ffdaa3", emit=3.8)
cool_window = surface("Cool windows", "#b5dbe4", emit=2.6)
pink = surface("Pink waveform", config["pink"], .1, .3, 2.3)
cyan = surface("Cyan waveform", config["cyan"], .1, .3, 2.3)
gold = surface("Gold waveform", config["gold"], .1, .3, 2.0)
pearl = surface("Ivory waveform", "#d9dae1", .25, .28, .9)
rail = surface("Track border", "#bad3da", .5, .26, .8)
track_bed = surface("Track bed", "#28333f", .5, .24)
trim = surface("Screen rim", "#c5e4df", .3, .22, 1.2)

# A true reflective ground plane and physical track geometry.
box("Reflective floor", (0, -7, -.13), (46, 76, .22), floor_mat)
for xc, mat in [(-5.65, pink), (-3.1, pink), (3.1, cyan), (5.65, gold)]:
    box("Waveform lane bed", (xc, -10.1, .016), (2.2, 32.4, .035), track_bed)
    for side in (-1, 1):
        box("Lane light rail", (xc+side*1.14, -10.1, .041), (.025, 32.4, .022), rail)
    verts, faces = [], []
    phase = rng.random() * 6.28
    for j in range(162):
        y = -26.2 + j*.2
        envelope = .22 + .62 * abs(math.sin(y*.41+phase))**2
        amplitude = envelope * (.3 + .7*abs(math.sin(y*2.7+phase)))
        add_cuboid(verts, faces, (xc, y, .065), (.12+1.85*amplitude, .118, .055))
    mesh("Decorative waveform bars", verts, faces, [mat])

for j in range(49):
    y = -26.3 + j*.66
    box("Center runway tile", (0, y, .018), (2.7, .62, .04), surface("Tile " + str(j), "#3a424a" if j%3 else "#525864", .6, .22))
for xc in (-1.4, 1.4):
    box("Center lane edge", (xc, -10.1, .055), (.032, 32.4, .025), pearl)

# Dark city silhouettes with individually placed windows, merged into one mesh.
window_v, window_f, window_i = [], [], []
for side in (-1, 1):
    for row in range(3):
        for col in range(7):
            w, depth = rng.uniform(2.0, 3.7), rng.uniform(2.1, 4.4)
            height = rng.uniform(4.8, 12.8)
            x = side * (9.5 + row*4.1 + rng.uniform(-.5,.5))
            y = -16 + col*6.1 + row*1.9 + rng.uniform(-1,1)
            material = building_mats[rng.randrange(len(building_mats))]
            box("City block", (x, y, height/2), (w, depth, height), material, bevel=.035)
            for z in [j*.48+.45 for j in range(int((height-.6)/.48))]:
                for k in range(max(2, int(w/.43))):
                    if rng.random() < .28:
                        continue
                    wx = x-w/2+.24+k*.43
                    wy = y-depth/2-.012
                    start = len(window_v)
                    ww, wh = rng.uniform(.085,.13), rng.uniform(.11,.18)
                    window_v += [(wx-ww,wy,z-wh),(wx+ww,wy,z-wh),(wx+ww,wy,z+wh),(wx-ww,wy,z+wh)]
                    window_f.append((start,start+1,start+2,start+3))
                    window_i.append(0 if rng.random()>.14 else 1)
            # Interior-facing side windows show parallax near the camera.
            inner_x = x-side*(w/2+.012)
            for z in [j*.6+.5 for j in range(int((height-.6)/.6))]:
                for k in range(max(2, int(depth/.5))):
                    if rng.random() < .35:
                        continue
                    wy = y-depth/2+.25+k*.5
                    start = len(window_v)
                    window_v += [(inner_x,wy-.085,z-.10),(inner_x,wy+.085,z-.10),(inner_x,wy+.085,z+.10),(inner_x,wy-.085,z+.10)]
                    window_f.append((start,start+1,start+2,start+3))
                    window_i.append(0 if rng.random()>.17 else 1)
mesh("City illuminated windows", window_v, window_f, [warm_window,cool_window], window_i)

# Screen pedestal and manufactured bezel have real depth.
box("Screen platform", (0, 5, .22), (9.15, 2.0, .44), black, .07)
box("Platform glow", (0, 4.99, .45), (8.9, 1.85, .035), trim, .012)
for x in (-2.4,2.4):
    box("Screen support", (x, 5.03, .96), (.17, .25, 1.13), black, .025)
screen_z = 3.65
sw, sh = 8.0, 4.5
box("Display body", (0, 5.07, screen_z), (sw+.34, .31, sh+.34), black, .065)
for x in (-sw/2-.045,sw/2+.045):
    box("Display vertical rim", (x, 4.893, screen_z), (.025, .018, sh+.095), trim, .006)
for z in (screen_z-sh/2-.045,screen_z+sh/2+.045):
    box("Display horizontal rim", (0, 4.893, z), (sw+.12, .018, .025), trim, .006)

video_mat = bpy.data.materials.new("Moving presenter / image sequence")
video_mat.use_nodes = True
nodes = video_mat.node_tree.nodes
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
emission = nodes.new("ShaderNodeEmission")
emission.inputs["Strength"].default_value = .92
tex = nodes.new("ShaderNodeTexImage")
tex.image = bpy.data.images.load(str(ROOT / "screen-frames" / "screen_0001.png"))
tex.image.source = "SEQUENCE"
tex.image.filepath = "//screen-frames/screen_0001.png"
tex.image_user.frame_start = 1
tex.image_user.frame_duration = FRAME_COUNT
tex.image_user.use_auto_refresh = True
tex.image_user.use_cyclic = False
video_mat.node_tree.links.new(tex.outputs["Color"], emission.inputs["Color"])
video_mat.node_tree.links.new(emission.outputs[0], output.inputs["Surface"])
display = mesh("Video display surface", [(-sw/2,4.887,screen_z-sh/2),(sw/2,4.887,screen_z-sh/2),(sw/2,4.887,screen_z+sh/2),(-sw/2,4.887,screen_z+sh/2)], [(0,1,2,3)], [video_mat])
uv = display.data.uv_layers.new(name="Screen UV")
for loop_index, coord in enumerate([(0,0),(1,0),(1,1),(0,1)]):
    uv.data[loop_index].uv = coord

# Procedural dusk background, intentionally simpler than a photoreal city.
sky = bpy.data.materials.new("Dusk gradient")
sky.use_nodes = True
sn = sky.node_tree.nodes
sn.clear()
so = sn.new("ShaderNodeOutputMaterial")
se = sn.new("ShaderNodeEmission")
se.inputs["Strength"].default_value = .8
tc = sn.new("ShaderNodeTexCoord")
sep = sn.new("ShaderNodeSeparateXYZ")
ramp = sn.new("ShaderNodeValToRGB")
ramp.color_ramp.elements.remove(ramp.color_ramp.elements[1])
for idx, (pos, color) in enumerate([(0,"#c18b78"),(.28,"#785a80"),(.65,"#323953"),(1,"#151c32")]):
    el = ramp.color_ramp.elements[0] if idx==0 else ramp.color_ramp.elements.new(pos)
    el.position = pos
    el.color = (*rgb(color),1)
sky.node_tree.links.new(tc.outputs["Generated"], sep.inputs[0])
sky.node_tree.links.new(sep.outputs["Z"], ramp.inputs[0])
sky.node_tree.links.new(ramp.outputs["Color"], se.inputs["Color"])
sky.node_tree.links.new(se.outputs[0], so.inputs["Surface"])
box("Dusk backdrop", (0, 31, 16), (170,.1,40), sky)

world = bpy.data.worlds.new("Evening atmosphere")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (*rgb("#5e6485"),1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = .35
scene.world = world
for name, location, energy, color, size in [
    ("Warm frontal fill", (0,-6,13), 2200, "#ffd1a1", 14),
    ("Screen soft key", (1,1,10), 1400, "#b8dedf", 9),
]:
    data = bpy.data.lights.new(name,"AREA")
    data.energy = energy
    data.color = rgb(color)
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name,data)
    scene.collection.objects.link(light)
    light.location = location
    point_at(light,(0,4,0))

# Continuous dolly backward plus a small lateral arc; no camera cuts.
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.name = "Dolly camera / configured duration"
camera.data.lens = 37
camera.data.sensor_width = 36
camera.data.clip_end = 220
scene.camera = camera
for frame, location, target in [
    (1,config["camera_near"],(0,5,3.35)),
    (max(2,FRAME_COUNT//2),tuple((a+b)/2 for a,b in zip(config["camera_near"],config["camera_far"])),(0,5,2.9)),
    (FRAME_COUNT,config["camera_far"],(0,5,2.55)),
]:
    camera.location = location
    point_at(camera,target)
    camera.keyframe_insert("location",frame=frame)
    camera.keyframe_insert("rotation_euler",frame=frame)

scene.render.engine = "CYCLES"
scene.cycles.samples = int(config["samples"])
scene.cycles.use_denoising = True
try:
    scene.cycles.denoiser = "OPTIX"
except (TypeError, AttributeError):
    pass
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = .055
scene.cycles.max_bounces = 5
scene.cycles.diffuse_bounces = 2
scene.cycles.glossy_bounces = 3
scene.render.use_persistent_data = True
devices = []
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    modes = ["OPTIX", "CUDA"] if config["device"] == "auto" else [config["device"].upper()]
    for mode in modes:
        if mode == "CPU":
            break
        try:
            prefs.compute_device_type = mode
            prefs.get_devices()
            for device in prefs.devices:
                device.use = device.type == mode
            devices = [device.name for device in prefs.devices if device.use]
            if devices:
                break
        except Exception:
            continue
    scene.cycles.device = "GPU" if devices else "CPU"
except Exception as error:
    print("GPU setup fallback:", error, flush=True)
    scene.cycles.device = "CPU"
if not devices or prefs.compute_device_type != "OPTIX":
    scene.cycles.denoiser = "OPENIMAGEDENOISE"

scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.color_depth = "8"
scene.render.fps = timing["fps"]
scene.frame_start = 1
scene.frame_end = FRAME_COUNT
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = .1
scene.render.film_transparent = False
scene["reference_style"] = "https://x.com/tm_uchal/status/2120573380768518390"
scene["method"] = "Original code-built 3D set; existing 2D presenter texture on a 3D screen"
scene["waveforms"] = "decorative, not factual data"
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "scene.blend"))
report_path = ROOT / "render-report.json"
report = {"blender_version":bpy.app.version_string,"engine":scene.render.engine,"device":scene.cycles.device,
          "gpu":devices,"objects":len(scene.objects),"samples":scene.cycles.samples,"frames":FRAME_COUNT,"fps":timing["fps"],
          "camera_keyframes":[1,max(2,FRAME_COUNT//2),FRAME_COUNT]}
started = time.perf_counter()
frames_dir = ROOT / "render-frames"
frames_dir.mkdir(exist_ok=True)
scene.render.filepath = str(frames_dir / "frame_")
scene.frame_start = args.start_frame
report["rendered_frame_range"] = [args.start_frame, FRAME_COUNT]
report["elapsed_scope"] = "this invocation; earlier completed frames retained when resuming"
bpy.ops.render.render(animation=True)
report["elapsed_seconds"] = round(time.perf_counter()-started,2)
report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print("RENDER REPORT",json.dumps(report,ensure_ascii=False),flush=True)

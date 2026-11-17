"""Blender batch: read original projects, export NEW GLBs, never save .blend."""
import json
import sys
from pathlib import Path
import bpy

arguments=sys.argv[sys.argv.index('--')+1:]
manifest=json.loads(Path(arguments[0]).read_text(encoding='utf-8'))
for item in manifest:
    source=Path(item['source']).resolve()
    output=Path(item['output']).resolve()
    allowed=Path('F:/codex_project2/1115_codex_project/.local/canal-research-web/previews').resolve()
    if not output.is_relative_to(allowed) or source.suffix!='.blend' or output.suffix!='.glb':
        raise ValueError('Invalid read-only preview export path')
    if output.exists():
        print('PREVIEW_EXISTS '+output.name,flush=True)
        continue
    print('PREVIEW_START '+source.name,flush=True)
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False)
    bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',export_cameras=True,export_lights=True,
                             export_animations=True,export_extras=True)
    print('PREVIEW_DONE '+output.name,flush=True)

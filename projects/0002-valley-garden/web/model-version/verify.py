"""Check the preserved edition and the actual downloaded model dependency trees."""
import hashlib
import json
from pathlib import Path
from urllib.parse import unquote, urlparse

root = Path(__file__).resolve().parent
web = root.parent
baseline = json.loads((web.parent / 'versions/procedural-v1/manifest.json').read_text(encoding='utf-8-sig'))
for item in baseline['files']:
    data = (web / item['path']).read_bytes()
    assert len(data) == item['bytes'], f"Original size changed: {item['path']}"
    assert hashlib.sha256(data).hexdigest() == item['sha256'], f"Original changed: {item['path']}"
print(f"OK: all {len(baseline['files'])} preserved original source/material files are byte-for-byte unchanged")

models = root / 'assets/models'
count = 0
def check_file(folder, item, key='path'):
    global count
    path = folder / item[key]
    data = path.read_bytes()
    assert len(data) == item['bytes'], f'Wrong byte count: {path}'
    assert hashlib.sha256(data).hexdigest() == item['sha256'], f'Wrong SHA256: {path}'
    md5 = item.get('md5', item.get('upstream_md5'))
    if md5:
        assert hashlib.md5(data).hexdigest() == md5, f'Wrong upstream MD5: {path}'
    count += 1

for item in json.loads((models/'plants/sorrel/manifest.json').read_text(encoding='utf8'))['files']:
    check_file(models/'plants/sorrel',item)

life=models/'life'
for item in json.loads((life/'manifest.json').read_text(encoding='utf8'))['files']:
    check_file(life,item)
for name in ['gardener','cow']:
    assert 'CC0 1.0' in (life/f'{name}-LICENSE.txt').read_text(encoding='utf8')
    assert (life/f'{name}.glb').read_bytes()[:4]==b'glTF'

for asset in json.loads((models/'plants/manifest.json').read_text(encoding='utf-8-sig')):
    for item in asset['files']:
        check_file(models/'plants'/asset['id'], item)
for asset in json.loads((models/'nature/manifest.json').read_text(encoding='utf-8-sig'))['assets']:
    for item in asset['files']:
        check_file(models/'nature', item)
for asset in json.loads((models/'architecture/manifest.json').read_text(encoding='utf-8-sig'))['assets']:
    check_file(models/'architecture', asset, 'file')
for asset in json.loads((models/'interior/manifest.json').read_text(encoding='utf8'))['assets']:
    for item in asset['files']:
        check_file(models/'interior'/asset['id'], item)
fir = models / 'trees/fir'
fir_manifest=json.loads((fir/'manifest.json').read_text(encoding='utf8'))
for item in fir_manifest['files']:
    check_file(fir,item)
assert all(p.get('retainedArea',1)>=p.get('sourceArea',1)*.90 for lod in fir_manifest['lods'] for p in lod['parts'])
assert all(l['coverage']>=fir_manifest['foliageMips']['baseCoverage']*.90 for l in fir_manifest['foliageMips']['levels'])

trees = models / 'trees/jacaranda'
for item in json.loads((trees/'manifest.json').read_text(encoding='utf8'))['files']:
    check_file(trees, item)
leafy = json.loads((trees/'leafy-manifest.json').read_text(encoding='utf8'))
for item in leafy['files']:
    check_file(trees, item)
for lod in leafy['lods']:
    assert lod['leafAreaAfter'] > 1900, f"Canopy area collapsed in {lod['name']} LOD"
coverage = json.loads((trees/'textures/leaves-coverage.json').read_text())
assert len(coverage['levels']) == 11
for level in coverage['levels']:
    assert level['coverage'] >= coverage['baseCoverage']*.9, 'Mipmapping erased leaf coverage'
print('OK: leaf area restored at all three LODs; all 11 alpha mip levels retain coverage')
colour_mips=json.loads((trees/'leaf-colour-manifest.json').read_text(encoding='utf8'))
for item in colour_mips['files']:
    check_file(trees,item)
assert len(colour_mips['levels'])==11
r,g,b=colour_mips['levels'][-1]['meanRGB']
assert g>r+5 and r>b+25, 'Distant leaf colour lost its green pigment'
horizon=json.loads((trees/'horizon-manifest.json').read_text(encoding='utf8'))
for item in horizon['files']:
    check_file(trees,item)
assert horizon['triangles']<1800
assert horizon['parts'][-1]['leafAreaAfter']>=1800
short_grass = models / 'plants/grass_short'
for item in json.loads((short_grass/'manifest.json').read_text(encoding='utf8'))['files']:
    check_file(short_grass, item)
meadow_grass = models / 'plants/grass_meadow'
for item in json.loads((meadow_grass/'manifest.json').read_text(encoding='utf8'))['files']:
    check_file(meadow_grass, item)
grass_mips=models/'plants/grass_mips'
for item in json.loads((grass_mips/'manifest.json').read_text(encoding='utf8'))['files']:
    check_file(grass_mips,item)
grass_levels=json.loads((grass_mips/'levels.json').read_text())
assert len(grass_levels['levels'])==10
assert all(l['coverage']>=grass_levels['baseCoverage']*.9 for l in grass_levels['levels']), 'Thin grass vanished in a smaller mip level'

dependency_count = 0
for path in models.rglob('*.gltf'):
    gltf = json.loads(path.read_text(encoding='utf-8-sig'))
    for item in gltf.get('buffers', []) + gltf.get('images', []):
        uri = item.get('uri', '')
        if not uri or uri.startswith('data:'):
            continue
        assert not urlparse(uri).scheme, f'Unexpected remote model dependency: {path}: {uri}'
        target = (path.parent / unquote(uri)).resolve()
        assert target.is_relative_to(models.resolve()), f'Model dependency escaped asset folder: {target}'
        assert target.is_file(), f'Missing dependency: {target}'
        dependency_count += 1
print(f'OK: {count} source/derived runtime model files match hashes; {dependency_count} local glTF dependencies exist')

terrain = root / 'assets/terrain'
dem = json.loads((terrain/'manifest.json').read_text(encoding='utf8'))
for item in dem['files']:
    check_file(terrain, item)
assert (terrain/'kaiser-height.f32').stat().st_size == dem['width']*dem['height']*4
print(f"OK: terrain source and {dem['width']*dem['height']} decoded elevation samples match hashes")

materials = root / 'assets/materials'
material_files = json.loads((materials/'manifest.json').read_text(encoding='utf8'))
for item in material_files:
    check_file(materials, item)
print(f'OK: all {len(material_files)} new 2K building PBR maps match local SHA256 and upstream MD5')
bridge_materials=materials/'bridge'
for item in json.loads((bridge_materials/'manifest.json').read_text(encoding='utf8'))['files']:
    check_file(bridge_materials,item)
print('OK: weathered bridge wood colour, OpenGL normal and roughness match upstream hashes')
flagstone_materials=materials/'flagstone'
for item in json.loads((flagstone_materials/'manifest.json').read_text(encoding='utf8'))['files']:
    check_file(flagstone_materials,item)
print('OK: courtyard solid-stone colour, OpenGL normal and roughness match upstream hashes')
ground_files = json.loads((root/'assets/ground/manifest.json').read_text(encoding='utf8'))
for item in ground_files:
    check_file(root/'assets/ground', item)
print(f'OK: all {len(ground_files)} retained/new ground PBR maps match hashes')

"""Build the local world lab with a verified, already installed Three.js runtime."""
from pathlib import Path
import hashlib
import json
import shutil
import re
import os
import tempfile

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
WEB = PROJECT / 'web'

def atomic_bytes(path, data):
    path = Path(path)
    if path.exists() and path.read_bytes() == data:
        return
    fd, pending = tempfile.mkstemp(prefix=path.name + '.tmp-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(pending, path)
    finally:
        if Path(pending).exists():
            Path(pending).unlink()

def copy_verified(source, target):
    source, target = Path(source), Path(target)
    if target.exists() and (source.samefile(target) or source.read_bytes() == target.read_bytes()):
        return str(target)
    atomic_bytes(target, source.read_bytes())
    return str(target)

def build(output_dir=None):
    destination = Path(output_dir) if output_dir else PROJECT/'dist'
    destination.parent.mkdir(parents=True, exist_ok=True)
    if shutil.disk_usage(destination.parent).free < 16 * 1024 * 1024:
        raise SystemExit('Build needs at least 16 MiB free; existing files preserved.')
    choices = [WEB / 'node_modules/three', ROOT / 'projects/0002-valley-garden/web/node_modules/three']
    package = next((p for p in choices if (p / 'package.json').is_file()), None)
    if package is None:
        raise SystemExit('Three.js is missing. In web/, run npm install --ignore-scripts first.')
    version = json.loads((package / 'package.json').read_text(encoding='utf-8'))['version']
    if version != '0.180.0':
        raise SystemExit(f'Expected Three.js 0.180.0, found {version}')
    runtime = WEB / 'runtime'
    runtime.mkdir(exist_ok=True)
    files = {'build/three.module.js':'three.module.js', 'build/three.core.js':'three.core.js',
             'examples/jsm/controls/OrbitControls.js':'OrbitControls.js', 'LICENSE':'LICENSE'}
    manifest=[]
    for source, name in files.items():
        copy_verified(package / source, runtime / name)
        manifest.append({'file':name,'sha256':hashlib.sha256((runtime/name).read_bytes()).hexdigest()})
    copy_verified(package/'LICENSE', PROJECT/'assets/THREE-LICENSE.txt')
    atomic_bytes(PROJECT/'assets/runtime-manifest.json', (json.dumps({'version':version,'files':manifest},indent=2)+'\n').encode('utf-8'))
    dist = destination
    dist.mkdir(exist_ok=True)
    for pattern in ['*.html','*.js','*.css']:
        for source in WEB.glob(pattern):
            copy_verified(source,dist/source.name)
    # A new HTML page can otherwise retain old ES modules in the embedded browser.
    inputs=sorted([*WEB.glob('*.js'),*WEB.glob('*.css'),*WEB.glob('*.html')])
    revision=hashlib.sha256(b''.join(p.name.encode()+p.read_bytes() for p in inputs)).hexdigest()[:12]
    for target in dist.glob('*.js'):
        body=target.read_text(encoding='utf-8')
        body=re.sub(r'''(\bfrom\s*|\bimport\s*)(['"])(\./[^'"?]+\.js)\2''',lambda m:f'{m[1]}{m[2]}{m[3]}?v={revision}{m[2]}',body)
        atomic_bytes(target,body.encode('utf-8'))
    for target in dist.glob('*.html'):
        body=target.read_text(encoding='utf-8')
        body=re.sub(r'''(\b(?:src|href)=["'])([^"'?#]+\.(?:js|css))(["'])''',lambda m:f'{m[1]}{m[2]}?v={revision}{m[3]}',body)
        atomic_bytes(target,body.encode('utf-8'))
    for name in ['runtime','assets']:
        shutil.copytree(WEB/name,dist/name,dirs_exist_ok=True,copy_function=copy_verified)
    progress_assets=dist/'assets/progress'
    progress_assets.mkdir(exist_ok=True)
    for name in ['world-foundation-summary.png','environment-v1-overview.jpg',
                 'world-report-wetland-january.jpg','world-report-wetland-july.jpg','world-report-trench.jpg',
                 'benchmark-warm-estuary.jpg','benchmark-glacial-estuary.jpg',
                 'life-route-bridge.jpg','modern-foundation-snow-start.jpg','settlement-street.jpg','settlement-cutaway.jpg','annual-rain-july.jpg',
                 'regional-geography-south.jpg','regional-geography-overview.jpg',
                 'sediment-fan-high.jpg','sediment-mouth-high.jpg','warm-dune-front.jpg',
                 'soil-fan-profile.jpg','soil-mouth-salinity-close.jpg','soil-mouth-plants-close.jpg',
                 'boreal-deadwood.jpg','boreal-conifer.jpg','warm-bamboo-inner.jpg',
                 'watershed-valley.jpg','watershed-lake-high.jpg','watershed-wetland-high.jpg',
                 'watershed-salt-high.jpg','world-audit-north.jpg','world-audit-south.jpg',
                 'world-audit-west.jpg','world-audit-east.jpg']:
        copy_verified(PROJECT/'assets'/name,progress_assets/name)
    print(f'Built dist/ ({revision}): 116-stop world with northern fan/strata tributaries + actual highland-to-tropical river / dry-bank ecotone + same-scene nine-zone inventory / sourced formation logic + bamboo/monsoon/coastal-dunes + conifer/mixed/birch/deadwood + upland/peat/pools/stream + yardang/open-slot/stony-desert/gravel-terrace + volcanic/lava/basalt-columns + alluvial-fan/braided-river/floodplain + strata/veins/plateau/terraces + saline-basin/marsh/crust/dry-pan + karst/stacked-caves/shaft-lift + geology/cave-network/geothermal + clouds/storm/dust/night + grassland/gobi/oasis + rainforest/mangrove + offshore/deep-ocean + polar/aurora + transport/public services + production/households + alpine transport + village/town/interiors + 14-stop watershed + time/weather/seasons')

if __name__ == '__main__':
    build()

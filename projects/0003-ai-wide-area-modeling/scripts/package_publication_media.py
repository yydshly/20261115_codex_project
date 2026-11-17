"""Package our recorded outputs and a minimal licensed web runtime, never weights.

PLY and .blend web copies use lossless gzip. Original files are read, hashed,
and left untouched. NPZ originals remain downloadable in the release archive.
"""
from pathlib import Path
from zipfile import ZipFile,ZIP_STORED
import argparse
import copy
import gzip
import hashlib
import json
import re
import shutil
from artifacts import PROJECT,ROOT,MODULES,RUNTIME,inventory,SCENES
from serve import viewer_html,DIAGNOSTIC_IMAGES
from publication_media import digest_file

RELEASE='canal-research-media-20261117'
ASSET='canal-research-media-20261117.zip'
URL=f'https://github.com/yydshly/20261115_codex_project/releases/download/{RELEASE}/{ASSET}'
WORK=RUNTIME/'canal-publication-media'


def engine_files():
    initial=['three/build/three.module.js','three/examples/jsm/controls/OrbitControls.js',
             'three/examples/jsm/loaders/GLTFLoader.js','three/examples/jsm/libs/fflate.module.js',
             '@sparkjsdev/spark/dist/spark.module.js']
    result={};pending=[MODULES/name for name in initial]
    while pending:
        source=pending.pop().resolve()
        if source in result:continue
        if not source.is_relative_to(MODULES.resolve()) or not source.is_file():raise ValueError('Missing scoped JS runtime: '+str(source))
        result[source]='engine/'+source.relative_to(MODULES.resolve()).as_posix()
        text=source.read_text(encoding='utf-8')
        for spec in re.findall(r'''(?:from\s*|import\s*\()\s*["'](\.[^"']+)["']''',text):
            pending.append(source.parent/spec)
    return result


def export_viewer(scene,assets):
    marker='__PUBLIC_CANAL__/'
    html=viewer_html(scene['id'],marker).decode('utf-8')
    html=html.replace(marker+'modules/','../../engine/').replace(marker+'three/','../../engine/three/')
    group=scene['group']
    for mount,logical in [('result',group),('out',group),('source','canal-single-sharp'),('assets','assets/'+group),('images','images')]:
        html=html.replace(marker+mount+'/','../../virtual/'+logical+'/')
    html=html.replace('href="../../virtual/canal-world-local/review.html"','href="../../effects.html?scene=world&amp;video=5#videos"')
    def attribute(match):
        key=match[3].removeprefix('../../')
        if key not in assets:raise ValueError('Unmapped static viewer asset: '+key)
        target=assets[key]['url'];target=target if target.startswith('https:') else '../../'+target
        return match[1]+match[2]+target+match[2]
    html=re.sub(r'''(\s(?:src|href)=)(["'])(\.\./\.\./virtual/[^"']+)\2''',attribute,html)
    html=html.replace('<script type="module">','<script src="../../publication.js"></script><script type="module">',1)
    before,separator,rest=html.partition('<script type="module">');module,close,tail=rest.partition('</script>')
    if not separator or not close:raise ValueError('Viewer module was not found')
    module=re.sub(r'\bfetch\(', 'publicFetch(',module)
    module=module.replace('new SplatMesh(', 'await publicSplat(')
    module=re.sub(r'(\.src\s*=\s*)([^;\n]+)',lambda m:m[1]+'publicAsset('+m[2]+')',module)
    imports=list(re.finditer(r'\bimport\s+[^;]+;',module));point=max(m.end() for m in imports)
    alias=re.search(r'''import\s+\*\s+as\s+(\w+)\s+from\s*["']three["']''',module).group(1)
    support="\nawait window.researchPublication.ready();\nconst publicFetch=(url,options)=>window.researchPublication.fetch(url,options);\nconst publicAsset=url=>window.researchPublication.asset(url);\n"
    if 'publicSplat(' in module:support+="const publicSplat=options=>window.researchPublication.splat(SplatMesh,options);\n"
    support+=alias+'.DefaultLoadingManager.setURLModifier(publicAsset);\n'
    module=module[:point]+support+module[point:]
    return (before+separator+module+close+tail).encode('utf-8'),module


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--release',default=RELEASE);args=parser.parse_args()
    if args.release!=RELEASE:raise ValueError('Use a new explicit media version in the script when changing the release')
    WORK.mkdir(parents=True,exist_ok=True);stage=WORK/'staged';stage.mkdir(exist_ok=True)
    paths,catalog=inventory();catalog=copy.deepcopy(catalog);files={};assets={};known={};hash_cache={}
    catalog['files']=[f for f in catalog['files'] if f['name'] not in {'service.json','viewer-service.json'}]
    def digest(path):
        key=path.resolve()
        if key not in hash_cache:hash_cache[key]=digest_file(path)
        return hash_cache[key]
    # Prefer Git-backed public evidence for duplicate images and text records.
    for path in sorted((PROJECT/'assets').rglob('*')):
        if path.is_file() and path.suffix.lower() in {'.png','.jpg','.jpeg','.gif','.svg','.webp'}:known[digest(path)]={'url':path.relative_to(PROJECT).as_posix(),'compressed':False,'sha256':digest(path)}
    for path in sorted((PROJECT/'experiments').rglob('*')):
        if path.is_file() and path.suffix in {'.md','.json'}:known[digest(path)]={'url':'records/'+path.relative_to(PROJECT).as_posix(),'compressed':False,'sha256':digest(path)}
    exported_records=set(json.loads((PROJECT/'dist/records/manifest.json').read_text(encoding='utf-8'))['files'])
    for path in sorted((PROJECT/'assets').rglob('*.json')):
        if path.relative_to(PROJECT).as_posix() in exported_records:known[digest(path)]={'url':'records/'+path.relative_to(PROJECT).as_posix(),'compressed':False,'sha256':digest(path)}
    def material(path):
        sha=digest(path)
        if sha in known:return dict(known[sha])
        compressed=path.suffix.lower() in {'.ply','.blend'}
        name='media/files/'+sha+path.suffix.lower()+('.gz' if compressed else '')
        target=stage/name;target.parent.mkdir(parents=True,exist_ok=True)
        if not target.is_file():
            if compressed:
                with path.open('rb') as source,target.open('wb') as output,gzip.GzipFile(fileobj=output,mode='wb',filename='',mtime=0,compresslevel=6) as stream:shutil.copyfileobj(source,stream,1024*1024)
                with gzip.open(target,'rb') as stream:
                    actual=hashlib.file_digest(stream,'sha256').hexdigest() if hasattr(hashlib,'file_digest') else hashlib.sha256(stream.read()).hexdigest()
                if actual!=sha:raise ValueError('Lossless compression integrity mismatch')
            else:shutil.copyfile(path,target)
        archive_only=path.suffix.lower()=='.npz'
        files[name]={'path':name,'bytes':target.stat().st_size,'sha256':digest_file(target),'publish':not archive_only}
        result={'url':URL if archive_only else name,'compressed':compressed,'sha256':sha,'archiveOnly':archive_only}
        known[sha]=result
        print(json.dumps({'packed':path.name,'source_bytes':path.stat().st_size,'web_bytes':target.stat().st_size,'archive_only':archive_only}),flush=True)
        return dict(result)
    for f in catalog['files']:
        source=paths[f['id']];entry=material(source);f.update(entry)
        if f['origin']=='runtime':assets['virtual/'+f['group']+'/'+f['name']]=dict(entry)
        if f['origin']=='source':f['relative']=Path(f['relative']).as_posix()
    for path in sorted((PROJECT/'assets').rglob('*')):
        if path.is_file() and path.suffix.lower() in {'.png','.jpg','.jpeg','.gif','.webp','.json'}:
            if path.parent.name!='research-map':assets['virtual/assets/'+path.parent.name+'/'+path.name]=material(path)
    for image_id,path in DIAGNOSTIC_IMAGES.items():assets['virtual/images/'+image_id]=material(path)
    for image in catalog['images']:
        source=paths.get(image['id'])
        if source:image['url']=material(source)['url']
    by_id={f['id']:f for f in catalog['files']}
    for video in catalog['videos']:
        if video['id']:video['url']=by_id[video['id']]['url']
    for scene in catalog['scenes']:scene['available']=True;scene['url']='live/'+scene['id']+'/index.html'
    def add_bytes(name,data):
        path=stage/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
        files[name]={'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'publish':True}
    for source,name in engine_files().items():add_bytes(name,source.read_bytes())
    license_paths={
        'THREE-MIT.txt':MODULES/'three/LICENSE','SPARK-MIT.txt':MODULES/'@sparkjsdev/spark/LICENSE',
        'SHARP-MODEL-LICENSE.txt':RUNTIME/'sharp-canal-runtime/source/ml-sharp-aed6527499ef91cba3b54c18d49a870f25947190/LICENSE_MODEL',
        'VGGT-LICENSE.txt':RUNTIME/'vggt-canal-runtime/source/vggt-a288dd0f14786c93483e45524328726ab7b1b4ce/LICENSE.txt'}
    for name,path in license_paths.items():add_bytes('licenses/'+name,path.read_bytes())
    viewer_sources=[]
    for scene in SCENES:
        output,module=export_viewer(scene,assets);add_bytes('live/'+scene['id']+'/index.html',output)
        check=WORK/(scene['id']+'-public.mjs');check.write_text(module,encoding='utf-8')
        source=PROJECT/'experiments'/scene['viewer'];viewer_sources.append({'path':source.relative_to(PROJECT).as_posix(),'sha256':digest(source)})
    catalog['mode']='published';catalog['scope']='公开研究档案：6 段视频、6 个三维／诊断入口及原文件。PLY／Blender 使用可逐字节还原的 gzip 副本；下载时校验原文件 SHA-256。NPZ 原始推理数组在媒体归档内。模型权重、完整依赖、日志和其他项目不在发布包中。'
    archive=WORK/ASSET
    with ZipFile(archive,'w',compression=ZIP_STORED,allowZip64=True) as bundle:
        for name in sorted(files):bundle.write(stage/name,name)
    record={'schema_version':1,'date':'2026-11-17','release':RELEASE,'url':URL,'bytes':archive.stat().st_size,'sha256':digest_file(archive),
            'files':list(files.values()),'catalog':catalog,'assets':assets,'viewer_sources':viewer_sources,
            'compression':'gzip is lossless; each decoded PLY/BLEND is byte-identical to the original; no model training or geometry conversion'}
    (PROJECT/'publication-media.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'archive':str(archive),'archive_bytes':record['bytes'],'public_media_bytes':sum(f['bytes'] for f in files.values() if f['publish']),'members':len(files),'originals_modified':False}),flush=True)


if __name__=='__main__':main()

"""Export the canal research reader with an explicit evidence/asset allowlist."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import argparse

PROJECT = Path(__file__).resolve().parents[1]
WEB_FILES = ('index.html', 'styles.css', 'app.js', 'data.js', 'mark.svg', 'records.html', 'records.js',
             'effects.html', 'effects.css', 'effects.js', 'mesh.html', 'mesh.js',
             'explore.html', 'explore.css', 'explore-data.js', 'explore-context.js', 'integrated-map.js', 'explore.js','publication.js')
EXPERIMENTS = ('canal-single-vggt', 'canal-single-sharp', 'cafe-hybrid-prototype', 'canal-world-local',
               'cafe-source-bound', 'canal-imagegen-multiview', 'canal-imagegen-interior',
               'canal-vggt-consistency', 'canal-entry-bridge-test')


def inside(base, relative):
    target = base / relative
    if not target.resolve().is_relative_to(base.resolve()):
        raise ValueError('Export path escapes its root: ' + str(relative))
    return target


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--publication',action='store_true');parser.add_argument('--media-archive');args=parser.parse_args()
    target = PROJECT / 'dist'
    target.mkdir(exist_ok=True)
    text = '\n'.join((PROJECT / 'web' / name).read_text(encoding='utf-8') for name in WEB_FILES)
    assets = sorted(str(path.relative_to(PROJECT)).replace('\\','/') for path in (PROJECT/'assets').rglob('*')
                    if path.is_file() and path.suffix.lower() in {'.png','.jpg','.jpeg','.gif','.svg','.webp'})
    records = ['README.md', 'vggt-colmap-3dgs.md', 'WEB-RESEARCH.md', 'MEDIA-INTEGRATION.md', 'ATLAS-WEB.md']
    for name in ('CONCLUSIONS.md','THIRD_PARTY_NOTICES.md','publication.md'):
        if (PROJECT/name).is_file():records.append(name)
    for experiment in EXPERIMENTS:
        directory = PROJECT / 'experiments' / experiment
        records.append(f'experiments/{experiment}/README.md')
        for name in ('prompts.json', 'manifest.json', 'manifest-aux.json'):
            if (directory / name).is_file():
                records.append(f'experiments/{experiment}/{name}')
    records.append('experiments/canal-single-sharp/view-diagnosis/README.md')
    records.extend(str(path.relative_to(PROJECT)).replace('\\','/') for path in (PROJECT/'experiments').rglob('*')
                   if path.is_file() and path.suffix in {'.md','.json'})
    for folder, names in {
        'canal-vggt-consistency': ('analysis.json', 'inference.json', 'illustrated-points.json'),
        'canal-entry-bridge-test': ('analysis.json', 'inference.json', 'manual-review.json', 'verification.json'),
        'canal-imagegen-multiview': ('correspondence-report.json',),
        'canal-imagegen-interior': ('image-check.json',),
        'cafe-source-bound': ('verification.json',),
    }.items():
        records.extend(f'assets/{folder}/{name}' for name in names)
    records=sorted(set(records))
    # Verify every source before writing any file. Never touch original assets.
    for name in assets + records:
        if not inside(PROJECT, name).is_file():
            raise FileNotFoundError(name)
    for name in WEB_FILES:
        shutil.copyfile(PROJECT / 'web' / name, inside(target, name))
    manifest = []
    for name in assets + records:
        source = inside(PROJECT, name)
        output = inside(target, name if name in assets else 'records/' + name)
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, output)
        manifest.append({'path': str(output.relative_to(target)).replace('\\', '/'),
                         'bytes': source.stat().st_size,
                         'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
    (target / 'records/manifest.json').write_text(json.dumps({'files': records}, ensure_ascii=False, indent=2), encoding='utf-8')
    (target / 'export-manifest.json').write_text(json.dumps({'date': '2026-11-17', 'files': manifest}, ensure_ascii=False, indent=2), encoding='utf-8')
    from artifacts import GROUPS, image_title, NOTES
    gallery={'groups':GROUPS,'images':[{'id':name,'title':image_title(name),'group':Path(name).parent.name if Path(name).parent.name in GROUPS else 'web',
               'group_title':GROUPS.get(Path(name).parent.name,'网页验收截图'),'url':name,
               'note':NOTES.get(Path(name).parent.name,'网页实际验收截图'),'origin':'project-image'} for name in assets],
             'videos':[],'scenes':[],'files':[],'scope':'静态导出只包含项目图册；本机视频和工程由只读服务读取。'}
    (target/'image-library.json').write_text(json.dumps(gallery,ensure_ascii=False),encoding='utf-8')
    (target/'media-config.json').write_text(json.dumps({'mode':'local'}),encoding='utf-8')
    if args.publication:
        from publication_media import hydrate
        details=hydrate(target,args.media_archive)
        page=target/'index.html';html=page.read_text(encoding='utf-8').replace('本机研究网页 · 未公开部署','公开研究网页 · 可查看与复核').replace('没有运行新模型、训练高斯、修改旧工程或发布到外网','没有运行新模型、训练高斯或修改旧工程').replace('本机实验查看器链接需单独启动对应服务。','公开版已提供静态媒体与查看器；本机原始服务继续保留。').replace('视频、三维与原工程统一通过 start.cmd 的只读本机服务查看。','公开版通过静态资源查看，原文件无损压缩并在还原后校验。')
        page.write_text(html,encoding='utf-8');print(json.dumps(details,ensure_ascii=False))
    print(json.dumps({'project': PROJECT.name, 'assets': len(assets), 'records': len(records),
                      'bytes': sum(item['bytes'] for item in manifest)}, ensure_ascii=False))


if __name__ == '__main__':
    main()

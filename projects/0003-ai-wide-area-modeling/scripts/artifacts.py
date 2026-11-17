"""Read-only inventory of the canal experiments; no inference or model writes."""
from pathlib import Path
import hashlib
import json

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
RUNTIME = Path('D:/codex/home/visualizations/2026/11/15/01a1de25-a21a-7db2-bd3c-5108c15683e8')
MODULES = RUNTIME / 'sharp-canal-runtime/viewer-tools/node_modules'
GROUPS = {
    'canal-single-vggt': '01 · VGGT 与旧 Blender 对照',
    'canal-single-sharp': '02 · 单图 SHARP 高斯',
    'canal-sharp-view-diagnosis': '03 · 新视角覆盖诊断',
    'cafe-hybrid-prototype': '04 · 咖啡店混合样板',
    'canal-world-local': '05 · 完整实体场景对照',
    'cafe-source-bound': '06 · 原高斯表面绑定',
    'canal-imagegen-multiview': '07 · 左右补图',
    'canal-imagegen-interior': '08 · 室内与关灯补图',
    'canal-vggt-consistency': '09 · VGGT 空间一致性',
    'canal-entry-bridge-test': '10 · 入口 A/B 复检',
    'history': '历史 V3 / V4 工程', 'previews': '新增只读工程预览', 'web': '网页验收截图',
    'research-map':'资料汇总 · 一张研究总图',
}
RUNTIME_ROOTS = {
    'canal-single-vggt': RUNTIME / 'canal-vggt-results',
    'canal-single-sharp': RUNTIME / 'canal-sharp-results',
    'canal-sharp-view-diagnosis': RUNTIME / 'canal-sharp-view-diagnosis',
    'cafe-hybrid-prototype': RUNTIME / 'cafe-hybrid-prototype',
    'canal-world-local': ROOT / '.local/canal-world-local',
    'cafe-source-bound': ROOT / '.local/cafe-source-bound',
    'canal-vggt-consistency': ROOT / '.local/canal-vggt-consistency',
    'canal-entry-bridge-test': ROOT / '.local/canal-entry-bridge-test',
    'previews': ROOT / '.local/canal-research-web/previews',
}
HISTORY = Path('F:/codex_project/1020_codex_project/projects/007-canal-blender-test/artifacts')
IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
FILE_SUFFIXES = IMAGE_SUFFIXES | {'.mp4', '.blend', '.glb', '.ply', '.json', '.npz', '.bin', '.srt'}

TITLES = {
    'reference':'唯一 AI 运河参考图', 'comparison':'实际对照总图', 'motion':'高斯小范围运动 GIF',
    'canal-research-map':'从一张图到可操作三维世界 · 研究全景',
    'canal-integrated-architecture':'完整研究架构 · 技术、产品、实验与原因直接归属流程步骤',
    'original':'原机位高斯渲染', 'left':'高斯左移', 'right':'高斯右移', 'wide':'高斯较大右移', 'forward':'高斯前移',
    'A-old-v4':'旧 V4 原机位', 'A-side':'旧 V4 侧视', 'B-vggt-guided':'VGGT 辅助版原机位', 'B-side':'VGGT 辅助版侧视',
    'confidence':'预测相对置信图', 'depth-color':'预测深度伪彩图', 'depth-surface-side':'单图深度表面侧视',
    'annotated-target':'新机位风险标注', 'annotated-with-legend':'带图例的新机位诊断',
    'source-view':'原视角高斯实渲染', 'target-view':'新视角高斯实渲染', 'source-depth-proxy':'原视角深度代理',
    'target-depth-proxy':'新视角深度代理', 'source-reprojected-draft':'原像素重投影草图',
    'source-supported-mask':'重投影有支持区域', 'source-unsupported-mask':'重投影未覆盖区域', 'depth-boundary-risk-mask':'深度边界风险区域',
    'prototype-overview':'咖啡店功能样板总览', 'interior-exterior':'室内外视角实际对照', 'lighting-comparison':'灯光／缓存状态对照',
    'continuous-tour-overview':'连续镜头实际关键帧', 'continuous-tour':'28 秒连续镜头 GIF', 'door-binding':'门轴联动动画',
    'hybrid-door-closed':'高斯混合近景 · 关门', 'hybrid-door-open':'高斯混合近景 · 开门',
    'hybrid-door-wire':'高斯门与实体线框', 'hybrid-overview-closed':'高斯混合全景 · 关门', 'hybrid-overview-open':'高斯混合全景 · 开门',
    'blender-exterior-closed':'Blender 实体外景 · 关门', 'blender-exterior-open':'Blender 实体外景 · 开门',
    'blender-interior-day':'Blender 室内 · 日光', 'blender-interior-warm':'Blender 室内 · 暖光', 'blender-interior-reverse':'Blender 室内回望',
    'web-exterior-mesh':'网页实体外景', 'web-interior-day':'网页实体室内 · 日光', 'web-interior-warm':'网页实体室内 · 暖光',
    'web-interior-reverse':'网页实体室内回望', 'world-overview':'Blender 全场景功能对照', 'hero-gaussian-warm':'实体生成高斯 · 全景暖灯缓存',
    'interior-back-gaussian-warm':'实体生成高斯 · 室内回望', 'interior-right-gaussian-warm':'实体生成高斯 · 室内侧视',
    'before-after':'原高斯绑定前后实渲染对照', 'source-preservation':'原高斯外观保留核对',
    'left-v1':'图像模型左移候选', 'right-v1':'图像模型右移候选', 'approach':'门口近看候选',
    'interior-on':'室内开灯候选', 'interior-off':'同构图关灯候选', 'interior-on-v1-threshold':'保留的门槛初稿', 'reverse':'原位回望目标候选',
    'camera-map':'预测相机与连接示意', 'depth-overview':'多图深度与相对置信', 'object-correspondence':'同名物体区域对应',
    'subset-controls':'联合与子集预测对照', 'before-after-verdict':'入口补图前后验收', 'input-sequence':'原图到室内的实际候选序列',
    'bridge-a':'新增 A · 走近途中', 'bridge-b':'新增 B · 实际仍偏门外', 'research-web-desktop':'研究网页实际截图',
    'hero':'完整实体场景原机位渲染', 'door-closed':'实体咖啡店关门', 'door-open':'实体咖啡店开门', 'model-input':'模型预处理输入',
}
NOTES = {
    'canal-single-vggt':'实际 Blender／深度诊断；此次拟合没有改善原图对齐。',
    'research-map':'研究资料图，区分实测、调研与待验证；不是新生成的三维场景。旧图统计保留各自日期口径。',
    'canal-single-sharp':'实际 SHARP 高斯渲染；仅原机位附近有依据，不能代表完整世界。',
    'canal-sharp-view-diagnosis':'覆盖与深度风险诊断；掩码比例不是模型准确率。',
    'cafe-hybrid-prototype':'高斯与设计实体功能样板；门轴已验证，近景与背面仍有缺陷。',
    'canal-world-local':'从设计 Blender 场景生成的功能对照；不是原图隐藏空间成功复原。',
    'cafe-source-bound':'保留原高斯的局部绑定实验；多角度外观未通过验收。',
    'canal-imagegen-multiview':'通用图像模型候选；不是已标定新机位或三维渲染真值。',
    'canal-imagegen-interior':'生成设计的室内／照明图片；不是三维物理换光。',
    'canal-vggt-consistency':'模型预测与独立匹配诊断；完整共同空间未证实。',
    'canal-entry-bridge-test':'新增 A/B 与同口径复检；入口连接没有通过。',
}


def image_title(path):
    stem = Path(path).stem
    if stem.startswith('pair-'):
        return '对应与投影冲突候选 · ' + stem[5:].replace('bridge_a','A').replace('bridge_b','B')
    if 'screenshot' in stem or stem.endswith('-page') or 'viewer' in stem:
        return '实际查看器截图 · ' + stem
    return TITLES.get(stem, stem)


def file_id(group, relative):
    return group + '--' + hashlib.sha256(str(relative).encode()).hexdigest()[:16]


SCENES = [
    dict(id='sharp', title='原图 SHARP 高斯', group='canal-single-sharp', viewer='canal-single-sharp/viewer.html',
         poster='assets/canal-single-sharp/original.png', note=NOTES['canal-single-sharp'], size='约 66MB 高斯', variants=[['','原始输出']]),
    dict(id='hybrid', title='咖啡店门轴与实体灯光', group='cafe-hybrid-prototype', viewer='cafe-hybrid-prototype/viewer.html',
         poster='assets/cafe-hybrid-prototype/hybrid-overview-closed.png', note=NOTES['cafe-hybrid-prototype'], size='约 64MB 高斯＋网格', variants=[['','功能样板']]),
    dict(id='bound', title='原高斯外观与结构绑定', group='cafe-source-bound', viewer='cafe-source-bound/viewer.html',
         poster='assets/cafe-source-bound/before-after.png', note=NOTES['cafe-source-bound'], size='约 65MB 高斯＋网格',
         variants=[['','表面重采样版'],['?raw','直接绑定原始版'],['?resolved','颜色解析对照版']]),
    dict(id='world', title='完整实体／CG 高斯对照', group='canal-world-local', viewer='canal-world-local/viewer.html',
         poster='assets/canal-world-local/world-overview.png', note=NOTES['canal-world-local'], size='约 105MB 高斯＋11MB 网格',
         variants=[['','原融合高斯'],['?surface','表面对齐对照']]),
    dict(id='diagnosis', title='固定新机位覆盖检查', group='canal-sharp-view-diagnosis', viewer='canal-single-sharp/view-diagnosis/viewer.html',
         poster='assets/canal-sharp-view-diagnosis/comparison.png', note=NOTES['canal-sharp-view-diagnosis'], size='原始 66MB 高斯', variants=[['','覆盖诊断']]),
    dict(id='consistency', title='VGGT 相机与三维诊断点', group='canal-vggt-consistency', viewer='canal-vggt-consistency/review.html',
         poster='assets/canal-vggt-consistency/camera-map.png', note=NOTES['canal-vggt-consistency'], size='3,960 个稀疏诊断点', variants=[['','预测诊断']]),
]
VIDEOS = [
    ('canal-single-sharp','canal-sharp-motion.mp4','单图高斯小范围移动',3,'assets/canal-single-sharp/original.png','60 个真实渲染帧；不是 AI 生成视频。'),
    ('cafe-hybrid-prototype','continuous-tour.mp4','全景移动 → 开门进入 → 转身',28,'assets/cafe-hybrid-prototype/continuous-tour-overview.png','全程同一相机与混合场景，高斯一直开启；近景穿帮保留。'),
    ('cafe-hybrid-prototype','door-binding.mp4','门高斯随 Blender 门轴动作',4,'assets/cafe-hybrid-prototype/hybrid-door-open.png','局部动作演示，不代表完整世界与重打光通过。'),
    ('cafe-hybrid-prototype','cafe-acceptance-review.mp4','门动作、内外视角与实体灯光验收',12,'assets/cafe-hybrid-prototype/prototype-overview.png','前 4 秒动作帧，后段为实际 Cycles 验收静帧；不是整段连续漫游。'),
    ('cafe-source-bound','source-hybrid-tour.mp4','保留原图高斯的 28 秒连续镜头',28,'assets/cafe-source-bound/source-preservation.png','多角度外观仍有拉伸与接缝，验收未通过。'),
    ('canal-world-local','canal-world-continuous.mp4','完整实体场景的 36 秒连续镜头',36,'assets/canal-world-local/world-overview.png','Cycles 实体场景影片；不是原图高斯复原影片。'),
]


def inventory():
    paths = {}
    files = []
    images = []
    seen_images = set()

    def add(path, group, relative, origin='runtime'):
        if not path.is_file():
            return None
        identity = file_id(group, relative)
        paths[identity] = path.resolve()
        suffix = path.suffix.lower()
        kind = 'image' if suffix in IMAGE_SUFFIXES else 'video' if suffix=='.mp4' else 'project' if suffix in {'.blend','.glb','.ply'} else 'data'
        entry = dict(id=identity,name=path.name,group=group,group_title=GROUPS.get(group,group),kind=kind,
                     extension=suffix[1:],bytes=path.stat().st_size,relative=str(relative).replace('\\','/'),origin=origin,
                     url='local-api/files/'+identity,preview=None)
        files.append(entry)
        if suffix in IMAGE_SUFFIXES:
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest not in seen_images:
                seen_images.add(digest)
                url = str(relative).replace('\\','/') if origin=='project-image' else entry['url']
                images.append(dict(id=identity,title=image_title(path),group=group,group_title=GROUPS.get(group,group),url=url,
                                   note=NOTES.get(group,'查看器／网页验收截图，单独标注，不当作新生成三维成果。'),origin=origin,bytes=entry['bytes']))
        return entry

    for path in sorted((PROJECT/'assets').rglob('*')):
        if path.suffix.lower() in IMAGE_SUFFIXES:
            group=path.parent.name if path.parent.name in GROUPS else 'web'
            add(path,group,path.relative_to(PROJECT),'project-image')
    for group, root in RUNTIME_ROOTS.items():
        if root.is_dir():
            for path in sorted(root.iterdir()):
                if path.suffix.lower() in FILE_SUFFIXES:
                    add(path,group,path.name)
    for name in ('rainy-canal-v3.blend','rainy-canal-v4.blend'):
        add(HISTORY/name,'history',name)
    for path in sorted((PROJECT/'experiments').rglob('*')):
        if path.is_file() and path.suffix.lower() in {'.md','.json','.py','.cjs','.html'}:
            group=path.relative_to(PROJECT/'experiments').parts[0]
            add(path,group,path.relative_to(PROJECT),'source')
    videos=[]
    for group,name,title,duration,poster,note in VIDEOS:
        entry=next((item for item in files if item['group']==group and item['name']==name),None)
        videos.append(dict(title=title,duration=duration,poster=poster,note=note,group=group,available=entry is not None,
                           url=entry['url'] if entry else None,id=entry['id'] if entry else None))
    mesh_map={'cafe-hybrid-prototype':'cafe-structure.glb','cafe-source-bound':'structure.glb','canal-world-local':'canal-world.glb'}
    derived={'canal-vggt-guided.blend':'vggt-guided.glb','depth-surface-diagnostic.blend':'depth-surface.glb',
             'rainy-canal-v3.blend':'historical-v3.glb','rainy-canal-v4.blend':'historical-v4.glb'}
    for entry in files:
        mesh=None
        if entry['extension']=='glb': mesh=entry
        elif entry['extension']=='blend':
            mesh=next((item for item in files if item['group']==entry['group'] and item['name']==mesh_map.get(entry['group'])),None)
            if entry['name'] in derived:
                mesh=next((item for item in files if item['group']=='previews' and item['name']==derived[entry['name']]),None)
        if mesh: entry['preview']='mesh.html?asset='+mesh['id']
    scenes=[]
    for scene in SCENES:
        item=dict(scene)
        item['available']=(RUNTIME_ROOTS[scene['group']].is_dir() and (MODULES/'three/build/three.module.js').is_file())
        item['url']='live/'+scene['id']+'/'
        scenes.append(item)
    return paths,dict(groups=GROUPS,files=files,images=images,videos=videos,scenes=scenes,
                     scope='完整 MP4、已保存的图册和主要工程／数据；不逐帧列出视频帧，不包括模型权重、依赖、日志或自动备份。')


if __name__=='__main__':
    paths,catalog=inventory()
    print(json.dumps({'files':len(paths),'images':len(catalog['images']),'videos':len(catalog['videos']),
                      'scenes':len(catalog['scenes']),'projects':sum(x['kind']=='project' for x in catalog['files'])},ensure_ascii=False))

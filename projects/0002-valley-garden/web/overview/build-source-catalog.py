"""Build the introduction page's provenance index from retained local records.

No network, asset mutation, scene build or license changes.
"""
from pathlib import Path
import csv
import json

HERE = Path(__file__).resolve().parent
WEB = HERE.parent
PROJECT = WEB.parent
MODEL = 'web/model-version/assets/'
CC0 = {'label': 'CC0 1.0', 'url': 'https://creativecommons.org/publicdomain/zero/1.0/'}
LOCAL = {'label': '项目实现 · 未单独声明素材许可', 'url': None}
items = []


def read(path):
    data = json.loads((PROJECT / path).read_text(encoding='utf-8-sig'))
    def check_license(value):
        if isinstance(value, dict):
            if 'license' in value:
                assert value['license'] in ('CC0-1.0', 'CC0', 'CC0 1.0'), (path, 'Update the catalogue license mapping', value['license'])
            for child in value.values():
                check_license(child)
        elif isinstance(value, list):
            for child in value:
                check_license(child)
    check_license(data)
    return data


def records(folder, manifest='manifest.json', source='SOURCES.md'):
    return [dict(label=label, path=folder + '/' + filename)
            for label, filename in [('来源说明', source), ('文件与校验清单', manifest)]
            if filename and (PROJECT / folder / filename).is_file()]


def author(asset):
    if isinstance(asset.get('authors'), dict):
        return '；'.join(f'{name}（{role}）' if role.lower() != 'all' else name
                        for name, role in asset['authors'].items())
    return asset.get('author', '')


def add(id, element, name, category, provider, source_url, folder, *,
        editions=('models',), usage='在用', notes='', authors='', license=None,
        paths=(), evidence=None, date=None, origin='external'):
    items.append(dict(id=id, origin=origin, element=element, name=name,
                      category=category, provider=provider, source_url=source_url,
                      authors=authors, license=dict(license or CC0),
                      editions=list(editions), usage=usage, notes=notes,
                      local_paths=list(paths or [folder]),
                      records=evidence if evidence is not None else records(folder),
                      recorded_on=date))


# Original GLBs. Runtime material and interior additions are indexed separately.
folder = MODEL + 'models/architecture'
architecture = read(folder + '/manifest.json')
roles = {
    'garden-cottage.glb': ('cottage', '默认砖墙小屋', '在用'),
    'two-storey-home.glb': ('townhouse', '备选双层住宅', '可切换'),
    'bungalow-house.glb': ('bungalow', '备选乡间平房', '可切换'),
}
for asset in architecture['assets']:
    id, element, usage = roles[asset['file']]
    add(id, element, asset['name'], '建筑与室内', 'Innerscene', asset['source_page'], folder,
        usage=usage, authors=author(asset), date=architecture.get('retrieved_at'),
        paths=[folder + '/' + asset['file']],
        notes='原始 GLB 保持不变；运行时调整比例、朝向、材质和布局。建筑 PBR 与补充室内结构另列。')

folder = MODEL + 'models/plants'
plant_roles = {
    'periwinkle_plant': ('粉色花境植株', '按源网格选择单株变体；不是一张花朵照片。'),
    'fern_02': ('蕨类与林缘植被', '源模型包含多个真实网格变体。'),
    'grass_medium_02': ('草簇、草坪与草坡派生模型', '原草簇用于植被；grass_short、grass_meadow 与草叶 mip 层为本地派生，沿用原资产来源与许可。'),
    'flower_gazania': ('勋章菊花境', '花境中的扫描植物网格；栽植分布和风动由程序控制。'),
    'shrub_02': ('花境成熟灌木', '灌木网格与材质来自上游，组合、大小和位置由场景决定。'),
}
for asset in read(folder + '/manifest.json'):
    element, notes = plant_roles[asset['id']]
    ev = records(folder)
    if asset['id'] == 'grass_medium_02':
        ev += records(folder + '/grass_short') + records(folder + '/grass_meadow')
    add(asset['id'], element, asset['name'], '植物与树木', 'Poly Haven', asset['officialPage'], folder,
        authors=author(asset), date='2026-11-15', notes=notes,
        paths=[folder + '/' + asset['id'] + '/model.gltf'], evidence=ev)

folder = MODEL + 'models/nature'
for asset in read(folder + '/manifest.json')['assets']:
    element, category, usage, note = {
        'rock_07': ('溪岸与草坡岩石', '岩石与地表', '在用', '扫描岩石按埋入深度、大小与地形摆放。'),
        'rock_moss_set_01': ('苔石、浅滩与溪流障碍物', '岩石与地表', '在用', '扫描苔石组；绕石水流是本地水面实现。'),
        'shrub_03': ('灌丛与林缘地被', '植物与树木', '在用', '源植物变体由程序实例化，不把一整套陈列场景当作单株。'),
        'pine_sapling_small': ('保留的幼松资产', '植物与树木', '保留', '原件仍在库中；当前主树林以成熟阔叶树与冷杉为主，不把幼松记录为成熟大树。'),
    }[asset['id']]
    add(asset['id'], element, asset['name'], category, 'Poly Haven', asset['source_url'], folder,
        authors=author(asset), usage=usage, notes=note, date='2026-11-15',
        paths=[folder + '/' + asset['entrypoint']])

for id, element, name, subfolder, note, date in [
    ('jacaranda_tree', '庭院大树与山谷阔叶树林', 'Jacaranda Tree', 'jacaranda', '运行包使用本地减面、叶冠覆盖修复和四级距离网格；上游大网格保存在忽略的本地缓存。', '2026-11-15'),
    ('fir_sapling_medium', '冷杉林与中远景树形', 'Fir Sapling Medium', 'fir', '保留三种完整树形，使用本地四级网格和针叶 mip 派生；没有将整座森林下载为完整场景。', '2026-11-16'),
]:
    folder = MODEL + 'models/trees/' + subfolder
    asset = read(folder + '/manifest.json')
    add(id, element, name, '植物与树木', 'Poly Haven', asset['source'], folder,
        authors=author(asset) or 'Rico Cilliers（制作）；Rob Tuytel（指导）',
        notes=note, date=date,
        evidence=records(folder) + ([dict(label='原始下载清单', path=folder + '/source-manifest.json')] if subfolder == 'jacaranda' else []))

folder = MODEL + 'models/plants/sorrel'
asset = read(folder + '/manifest.json')
add('shrub_sorrel_01', '花境边缘低矮酢浆草叶丛', 'Shrub Sorrel 01', '植物与树木', 'Poly Haven', asset['source'], folder,
    authors=author(asset), date=asset.get('retrieved'), notes='外部叶丛模型；地被组合、比例、风动和受光由本项目整合。')

folder = MODEL + 'models/interior'
for asset in read(folder + '/manifest.json')['assets']:
    element = {'sofa_02': '窗内客厅沙发', 'coffee_table_round_01': '室内茶几与小桌',
               'modern_arm_chair_01': '窗边与阅读区扶手椅', 'industrial_pipe_lamp': '室内阅读灯'}[asset['id']]
    add(asset['id'], element, asset['name'], '建筑与室内', 'Poly Haven', asset['source'], folder,
        authors=author(asset), date=asset.get('retrieved'), paths=[folder + '/' + asset['id']],
        notes='作为从窗外可见的室内布景；地板、隔墙、窗帘、书籍等本地几何另列。')

# Texture sets are one catalogue item each; per-file URLs/hashes remain in manifests.
folder = MODEL + 'materials'
materials = read(folder + '/manifest.json')
for id, element, name in [('roof_slates_02', '小屋石板瓦屋顶表面', 'Roof Slates 02'),
                          ('white_plaster_02', '建筑抹灰墙面', 'White Plaster 02'),
                          ('red_brick_03', '默认小屋砖墙表面', 'Red Brick 03')]:
    add(id, element, name, '建筑与室内', 'Poly Haven', 'https://polyhaven.com/a/' + id, folder,
        authors='Rob Tuytel', date='2026-11-15',
        paths=[folder + '/' + f['path'] for f in materials if f['asset'] == id],
        notes='2K 颜色、OpenGL 法线和粗糙度原图；UV、色调及法线强度在运行时调整。')

folder = MODEL + 'ground'
ground = read(folder + '/manifest.json')
for id, element, name, note in [
    ('Grass004', '庭院修剪草坪表面', 'Grass004', 'ambientCG 的程序化 PBR 资产，不能称为摄影扫描；几何细草另由本地代码生成。'),
    ('grass_ground', '院外枯草与草坡色彩', 'Grass Ground', '当前院外地表使用其色彩图；法线和粗糙度原件也保留。'),
    ('brown_mud_dry', '花境、树根、路径与岸边裸土', 'Brown Mud Dry', '2K 地表贴图；裸土、湿润和草土过渡分布由本地地表场控制。'),
]:
    asset = next(a for a in ground if a['asset'] == id)
    add(id, element, name, '岩石与地表', 'ambientCG' if id == 'Grass004' else 'Poly Haven',
        'https://ambientcg.com/view?id=Grass004' if id == 'Grass004' else 'https://polyhaven.com/a/' + id,
        folder, authors=author(asset), date='2026-11-15', notes=note,
        paths=[folder + '/' + f['path'] for f in ground if f['asset'] == id])

for id, element, name, subfolder, note in [
    ('weathered_planks', '木桥、栏杆与长椅的木材表面', 'Weathered Planks', 'bridge', '只提供木材表面；桥、栏杆和长椅的几何由本地程序构造。'),
    ('rock_01', '庭院石板路的连续石面', 'Rock 01', 'flagstone', '只提供石面 PBR；各块石板的轮廓、厚度和铺设由本地生成。'),
]:
    folder = MODEL + 'materials/' + subfolder
    asset = read(folder + '/manifest.json')
    add(id, element, name, '岩石与地表', 'Poly Haven', asset['source'], folder,
        authors=author(asset), date=asset.get('retrieved'), notes=note)

folder = 'web/assets/materials'
shared = read(folder + '/download-manifest.json')
for id, element, name, authors, editions, note in [
    ('leafy_grass', '代码版草地底面', 'Leafy Grass', 'Charlotte Baglioni', ('code',), 'V1 地表使用；V2 已改用独立草坪与裸土材质，不把它继续标成 V2 庭院草坪。'),
    ('rock_face_03', '山壁与地表露岩纹理', 'Rock Face 03', 'Dario Barresi（摄影）；Rico Cilliers（处理）', ('code', 'models'), '原版目录只读共享；山体几何和露岩分布由程序生成。'),
    ('gray_rocks', '河床、碎石与岸边表面', 'Gray Rocks', 'Dimitrios Savva', ('code', 'models'), '碎石表面材质，不等同于独立三维扫描岩石模型。'),
    ('aerial_grass_rock', '远景草岩色彩分布', 'Aerial Grass Rock', 'Rob Tuytel', ('code', 'models'), '只保留色彩图，用于坡面和远景色彩混合。'),
    ('kloofendal_48d_partly_cloudy_puresky', '天空背景与环境照明', 'Kloofendal 48d Partly Cloudy (Pure Sky)', 'Greg Zaal（HDRI）；Jarod Guest（天空编辑）', ('code', 'models'), '1K HDR 天空用于背景和环境照明；主光与晨暮控制由场景实现。'),
]:
    add(id, element, name, '天空与高程' if 'puresky' in id else '岩石与地表', 'Poly Haven',
        'https://polyhaven.com/a/' + id, folder, authors=authors, editions=editions,
        date='2026-11-15', notes=note, evidence=records(folder, 'download-manifest.json'),
        paths=[folder + '/' + f['file'] for f in shared if f['asset'] == id])

folder = MODEL + 'models/life'
for id, element, name, page, note in [
    ('gardener', '花径上的庭院人物', 'Elderly Woman · Rigged GLB', 'characters/elderly-woman/', '来源披露 AI 辅助生成：Meshy 基础网格与纹理，经 Blender 处理；保留原生 walk 动画，路线、停步、接地与声音为本地整合。'),
    ('cow', '牧场中的两头牛', 'Holstein Cow · Light GLB', 'animals/cow/', '来源披露 AI 辅助生成；下载的是静态模型，不含当前走路、吃草动作。运行时骨骼、步态和行为由本项目补充。'),
]:
    ev = records(folder) + [dict(label='上游许可证原文', path=folder + '/' + id + '-LICENSE.txt')]
    add(id, element, name, '人物与动物', 'Grab3D', 'https://grab3d.com/models/' + page, folder,
        authors='Grab3D', notes=note, date='2026-11-16', paths=[folder + '/' + id + '.glb'], evidence=ev)

folder = MODEL + 'terrain'
terrain = read(folder + '/manifest.json')
add('kaiser_elevation', '精致素材版远山高程', terrain['name'], '天空与高程', 'Mapzen / AWS', terrain['source'], folder,
    authors=terrain['attribution'], date=terrain['retrieved'],
    license={'label': '按数据源分别署名 · 含 CC BY 3.0 AT', 'url': 'https://creativecommons.org/licenses/by/3.0/at/'},
    notes='奥地利 Wilder Kaiser 高程片段；非参考视频地点。保留奥地利 DGM、Copernicus / EU-DEM、USGS 候选来源署名，不将整份高程统称 CC0。',
    evidence=records(folder) + [dict(label='完整上游署名', path=folder + '/attribution-upstream.md')])

add('three', '两版实时渲染引擎与 Water 等组件', 'Three.js 0.180.0', '引擎与工具', 'Three.js / GitHub',
    'https://github.com/mrdoob/three.js/tree/r180', 'web/node_modules/three', editions=('code', 'models'),
    authors='Three.js contributors', license={'label': 'MIT', 'url': 'https://github.com/mrdoob/three.js/blob/r180/LICENSE'},
    notes='运行引擎与组件依赖，独立于模型/贴图许可；随运行资源保留 MIT 正文。',
    evidence=[dict(label='MIT 许可证原文', path='web/node_modules/three/LICENSE'), dict(label='依赖锁定记录', path='web/package-lock.json')])
add('meshoptimizer', '树木离线减面与分级工具', 'meshoptimizer 1.3.0', '引擎与工具', 'GitHub',
    'https://github.com/zeux/meshoptimizer', 'web/model-version/tools', authors='meshoptimizer contributors',
    license={'label': 'MIT（本地处理记录）', 'url': 'https://github.com/zeux/meshoptimizer'},
    notes='用于离线生成树木层级；工具 MIT 与输入模型 CC0 分别记录，不把工具许可当成模型许可。',
    evidence=[dict(label='处理工具说明', path='web/model-version/tools/README.md')] + records(MODEL + 'models/trees/fir'))


def program(id, element, name, category, code, notes, editions=('models',), dependencies=()):
    ev = [dict(label='实现源码 · ' + Path(path).name, path=path) for path in code]
    add(id, element, name, category, '本项目', None, '', origin='procedural', editions=editions,
        authors='本项目', license=LOCAL, notes=notes, paths=code, evidence=ev)
    items[-1]['dependencies'] = list(dependencies)


program('v1_geometry', '代码版主体与保留的经典白屋', '程序化主体几何', '建筑与室内',
        ['web/cottage.js', 'web/vegetation.js', 'web/landscape.js', 'web/model-version/cottage.js'],
        'V1 的房屋、花木与山谷主体由代码构造；V2 可切换的经典白屋也为本地程序几何。地表 PBR/HDR 来自外部条目，V2 默认砖墙小屋仍为外部模型。', ('code', 'models'), ['leafy_grass', 'rock_face_03', 'gray_rocks'])
program('valley_ground', '近地形起伏、草土分布与细草', '地形与地表生成', '岩石与地表',
        ['web/model-version/terrain.js', 'web/model-version/ground.js', 'web/model-version/fine-grass.js'],
        '近地形、裸土遮罩和细草叶由代码生成；远山高程和地表贴图按外部记录使用。', dependencies=['kaiser_elevation', 'Grass004', 'brown_mud_dry'])
program('paths_timber', '石板形体、木桥、栅栏与长椅', '程序化庭院构筑物', '建筑与室内',
        ['web/model-version/courtyard-path.js', 'web/model-version/landscape.js', 'web/model-version/garden-moments.js'],
        '轮廓、厚度、铺装与组合为本地几何；石面和木纹来自外部 PBR。', dependencies=['rock_01', 'weathered_planks'])
program('interior_details', '窗格、窗帘、楼板、隔墙与书籍', '室内补充结构与布置', '建筑与室内',
        ['web/model-version/interior.js'], '补充结构由本地几何生成；沙发、桌椅、阅读灯及原屋玻璃为外部资产。',
        dependencies=['cottage', 'sofa_02', 'coffee_table_round_01', 'modern_arm_chair_01', 'industrial_pipe_lamp'])
program('foliage_derivatives', '树木层级、短草派生与叶片缩放纹理', '外部资产的派生处理', '植物与树木',
        ['web/model-version/model-assets.js', 'web/model-version/valley-woodland.js'],
        '这是对外部网格/贴图的减面、归一化和覆盖修复，不是无来源的原创模型；派生资产仍明确记录原素材 CC0。',
        dependencies=['jacaranda_tree', 'fir_sapling_medium', 'grass_medium_02', 'meshoptimizer'])
program('stream_flow', '水面、溪流、浅滩与绕石流动', '实时水面与流动近似', '水流与声音',
        ['web/model-version/stream.js', 'web/model-version/stream-flow.js', 'web/model-version/stream-motion.js'],
        '水面与流动由着色器和轨迹生成，基于 Three.js Water 等组件整合；不是下载的流体模拟视频。', dependencies=['three', 'gray_rocks'])
program('cow_behaviour', '牛的骨骼、慢走、接地、吃草与尾摆', '静态资产上的程序动作', '人物与动物',
        ['web/model-version/cattle-behavior.js', 'web/model-version/cattle-gait.js', 'web/model-version/cattle-roaming.js'],
        '源牛模型为 CC0 静态网格；当前动作是本项目运行时绑定与行为近似，不是上游原生动作包。', dependencies=['cow'])
program('human_route', '人物路线、停步、接地和动态投影', '原生动画的场景整合', '人物与动物',
        ['web/model-version/valley-life.js', 'web/model-version/foot-grounding.js', 'web/model-version/character-shadows.js'],
        '人物 walk 来自源资产；路径、邻近停步、鞋底修正与投影由本地代码整合。', dependencies=['gardener'])
program('wildlife', '飞鸟、蝴蝶与翅膀动作', '本地生物网格与表面纹理', '人物与动物',
        ['web/model-version/garden-wildlife.js', 'web/model-version/wildlife-shapes.js', 'web/model-version/wildlife-surfaces.js'],
        '鸟蝶网格、羽片、蝶翼及表面细节由程序生成；停栖位置取自现有花枝网格。', dependencies=['periwinkle_plant', 'flower_gazania'])
program('wind', '植物摆动与风声联动', '共享程序风场', '水流与声音',
        ['web/model-version/wind-field.js', 'web/model-version/ambience.js'],
        '风向、轻风、行进阵风与植物弯曲共用参数；不是额外下载的风动画资产。')
program('audio', '溪水、鸟鸣、风声、脚步与牛蹄声', 'Web Audio 合成与位置混音', '水流与声音',
        ['web/model-version/ambience.js', 'web/model-version/footsteps.js', 'web/model-version/actor-footsteps.js'],
        '声音由本地合成，无第三方录音包；落脚观察、地面音色、距离衰减和声向为本地实现。')
program('screenshots', '介绍页中两版实景截图', '本项目实际运行记录', '记录与截图',
        ['web/overview/assets/SOURCES.json'],
        '同尺寸真实运行截图，未使用原视频画面。未另行声明截图素材许可；画面内的外部资产和高程署名见对应记录。',
        ('code', 'models'), ['kaiser_elevation'])

# Check all local evidence paths and references before writing the public catalogue.
ids = {item['id'] for item in items}
assert len(ids) == len(items)
for item in items:
    for path in item['local_paths'] + [record['path'] for record in item['records']]:
        assert path.startswith('web/') and (PROJECT / path).exists(), (item['id'], path)
    assert all(id in ids for id in item.get('dependencies', []))

data = dict(schema_version=1, updated_on='2026-11-17',
            scope='两个保留场景的来源与实现索引；包含当前使用、可切换和保留条目',
            license_basis='按获取时保留的 SOURCES、manifest 与许可证原文整理，未实时重新核验上游网页',
            project_code_license='本地程序内容未单独声明素材许可；本索引没有为项目代码新增 CC0 或其他授权',
            items=items)
out = HERE / 'assets'
(out / 'source-catalog.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
with (out / 'source-catalog.csv').open('w', encoding='utf-8-sig', newline='') as file:
    writer = csv.writer(file)
    writer.writerow(['ID', '内容类型', '场景元素', '素材/实现名称', '分类', '适用版本', '使用状态', '来源网站', '作者', '原始链接', '已记录许可', '许可链接', '记录日期', '本地路径', '原始记录', '使用与派生说明'])
    for item in items:
        writer.writerow([item['id'], '外部素材/依赖' if item['origin'] == 'external' else '程序内容', item['element'], item['name'],
                         item['category'], ' / '.join(item['editions']), item['usage'], item['provider'], item['authors'],
                         item['source_url'] or '本地实现，见源码记录', item['license']['label'], item['license']['url'] or '',
                         item['recorded_on'] or '详见原记录', ' | '.join(item['local_paths']),
                         ' | '.join(r['path'] for r in item['records']), item['notes']])
print(f'Catalogue built: {sum(i["origin"] == "external" for i in items)} external records, '
      f'{sum(i["origin"] == "procedural" for i in items)} procedural records')

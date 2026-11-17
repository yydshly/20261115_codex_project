"""Verify and register the finished one-image research summary."""
from pathlib import Path
import hashlib,json,struct,xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[1]
def read(p):return json.loads(Path(p).read_text(encoding='utf-8'))
def save(p,obj):Path(p).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
record=read(ROOT/'assets/overview-manifest.json')
png=ROOT/'assets/avatar-research-overview-v1.png'
width,height=struct.unpack('>II',png.read_bytes()[16:24])
assert [width,height]==[record['width'],record['height']]
assert len(record['sections'])==14 and record['question_count']==28
for item in record['source_files']:assert sha(ROOT/item['file'])==item['sha256']
for item in record['source_images']+record['files']:assert sha(ROOT/'assets'/item['file'])==item['sha256']
svg=ET.fromstring((ROOT/'assets/avatar-research-overview-v1.svg').read_text(encoding='utf-8'))
links={node.attrib['href'] for node in svg.iter() if node.tag.endswith('}a')}
expected={s['url'] for s in read(ROOT/'research.json')['sources']}
assert links==expected
assert all(node.attrib['href'].startswith('data:image/') for node in svg.iter() if node.tag.endswith('}image'))
image_manifest=read(ROOT/'assets/image-manifest.json')
names={item['file'] for item in record['files']}
image_manifest=[x for x in image_manifest if x['file'] not in names]
image_manifest.extend({'file':item['file'],'sha256':item['sha256'],
    'source':'2026-11-17 original code-typeset research summary; existing local sample stills credited to original presenter @tm_uchal; details in overview-manifest.json'} for item in record['files'])
save(ROOT/'assets/image-manifest.json',image_manifest)
registry=read(REPO/'projects.json')
entry=next(x for x in registry['projects'] if x['id']=='0021' and x['slug']=='avatar-video-workflow')
entry['preview']={'path':'projects/0021-avatar-video-workflow/assets/overview-preview.jpg',
    'alt':'数字人口播研究全景图顶部预览，展示四层能力与核心理解；完整图展开真实效果、制作流程、模板价值、后续路线和28个问题',
    'caption':f'2026-11-17 原创中文排版研究图；完整 PNG 为 {width}×{height}，含真实样片，非新生成人物。图中28问含原26问与2次最新澄清，已做与待验证分别标注。'}
highlight='一图总览：14个模块、28问，完整展开理解、真实效果、制作思路、人物与图表、模板机制、六项价值与后续验证；PNG/SVG和可修订文字均保留。'
entry['highlights']=[highlight]+[s for s in entry.get('highlights',[]) if not s.startswith('一图总览：')]
assert entry['demo_url'] is None
save(REPO/'projects.json',registry)
save(ROOT/'assets/overview-verification.json',{'date':'2026-11-17','width':width,'height':height,
    'modules':14,'questions':28,'rendered_text_characters':record['rendered_text_characters'],
    'source_file_hashes':'passed','source_image_hashes':'passed','output_hashes':'passed','svg_xml':'passed',
    'embedded_images':'all self-contained data URLs','clickable_primary_sources':len(links),
    'measured_text_bounds':'passed','measured_card_bounds':record['cards_checked'],
    'visually_reviewed':['header','effects','presenter/chart layouts','template/cache','value','questions','sources'],
    'method':'Original code typesetting from saved research and actual sample stills; no new image generation call',
    'publication':'local research only'})
print(json.dumps({'figure':str(png),'width':width,'height':height,'sections':14,'questions':28,'source_links':len(links)}))

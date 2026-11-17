"""Copy only the selected official free samples; preserve originals and both character notices."""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.local/spritecook-free-20261116'
OUT = ROOT / 'web/assets/free-samples'
PACKS = {
    'characters': ('pixel-art-characters', '89b15024db28ab6dfa5b5828c5b09c3cf84330780d7b035025871166a045cb7c'),
    'buildings': ('isometric-buildings', '43988bbc6e49c6bdc7bdcd096aa58547ea7db9667c399afca26b5ca14e15a6b1'),
    'props': ('game-asset-pack', '37dbe841afa0e0c4e727ead7c413124ae88dd7d63ebd1b66d53a81094a61233e'),
}
for name, sha in PACKS.values():
    assert hashlib.sha256((SOURCE / (name + '.zip')).read_bytes()).hexdigest() == sha
OUT.mkdir(parents=True, exist_ok=True)
files = []

def copy(pack, source, target):
    name = PACKS[pack][0]
    path = SOURCE / name / ('spritecook-' + name) / source
    dest = OUT / target
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(path, dest)
    data = dest.read_bytes()
    entry = dict(file=target, source=f'spritecook-{name}/{source}', bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    if target.endswith('.png'):
        im = Image.open(dest).convert('RGBA')
        entry['width'], entry['height'] = im.size
    files.append(entry)
    return path

for pack in PACKS:
    copy(pack, 'LICENSE.txt', f'licenses/{pack}-LICENSE.txt')
# The character ZIP contains two different notices. Retain both and follow the
# more restrictive sample-license conditions; both permit inclusion in a game.
target = OUT / 'licenses/characters-sample-LICENSE.txt'
shutil.copyfile(SOURCE / 'pixel-art-characters/LICENSE.txt', target)
data = target.read_bytes()
files.append(dict(file='licenses/characters-sample-LICENSE.txt', source='LICENSE.txt (ZIP root)', bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))

assets = []
def asset(id, title, pack, animations, purpose, emotion, placement, height):
    states = {}
    for state, source in animations.items():
        target = f'{id}/{Path(source).name}'
        path = copy(pack, source, target)
        im = Image.open(path).convert('RGBA'); w, h = im.size
        animated = source.endswith('_sheet.png')
        fw = h if animated else w
        bounds = [im.crop((i*fw, 0, (i+1)*fw, h)).getbbox() for i in range(w//fw)]
        left=min(b[0] for b in bounds); top=min(b[1] for b in bounds)
        right=max(b[2] for b in bounds); bottom=max(b[3] for b in bounds)
        states[state] = dict(file=target, frameWidth=fw, frameHeight=h, frames=w//fw,
                             fps=6 if id=='traveler' else 8, anchor=[(left+right)/2,bottom],
                             bounds=[left,top,right,bottom], scale=round(height/(bottom-top),5))
    if id == 'cat':
        states['walk']['scale'] = states['idle']['scale']
    assets.append(dict(id=id,title=title,pack=pack,states=states,purpose=purpose,emotion=emotion,placement=placement,
                       license='SpriteCook sample license（保守遵循）' if pack=='characters' else 'CC0 1.0',
                       sourceUrl='https://www.spritecook.ai/examples/'+PACKS[pack][0],
                       adaptation='保留原始 PNG；最近邻采样、落脚点与遮挡排序；绘制时轻降饱和。'))

asset('traveler','橘衣旅人','characters',{'idle':'happy-monk/idle_sheet.png'},
      '替换原代码绘制人物；可行走、停步、送风，在长椅前结束散步。',
      '温暖的橘衣成为安静庭院里人的位置；选择没有武器的样例。',
      '南径出生，玩家操作；样例只有 8 帧待机，移动为游戏位移，长椅为停留姿态，无独立走路或坐姿帧。',39)
asset('cat','后来跟来的橘猫','characters',{'idle':'ginger-cat/idle_sheet.png','walk':'ginger-cat/walk_sheet.png'},
      '第一次浇水或第二声风铃后出现；自主散步、看花、晒太阳、在调整后的长椅边打盹，优先沿新小径行走，也会亲近和陪行。',
      '把完成进度变成有生命的陪伴，不添加战斗、饥饿或养成压力。','第一次浇水或第二处风铃后加入；过桥与避障共用庭院通行规则，位置和熟悉程度随庭院保存。',24)
asset('cottage','蓝瓦归家小屋','buildings',{'idle':'building5.png'},
      '第三处风铃地标，可按 R 进入本站绘制的小屋；桌灯与庭院窗光共同回应。',
      '体量克制的住宅与橘衣形成冷暖呼应，给归来一个明确落点。','庭院东北侧；外观来自原素材，内部与实时窗景由本站绘制。',188)
for id,title,source,purpose,emotion,placement,height in [
 ('well','石井','stone_well.png','井边可走近按 E 读一段生活小记。','留住日常生活的痕迹，不变成必须完成的劳作。','橡树东侧的井边，避开第一处风铃与主路。',42),
 ('barrel','木桶','barrel.png','门边储物，与小屋构成生活角。','让房屋像有人照料的住所。','小屋西南侧，靠近可阅读的门前生活角。',29),
 ('crate','完整木箱','crate_intact.png','门旁收纳；作为可避让的实物。','使用完整木箱，避免破损和战利品暗示。','小屋东侧，主路之外。',24),
 ('pot','陶盆','pot.png','庭院两只可分别移动的陶盆，参与布置、碰撞和邻居来信；室内复用为书桌旁的小花器。','朴素陶色与小径、木件相连。','初始一只在门前、一只在井旁；可预览落点并保存。',21),
 ('bread','圆面包','bread.png','放在长椅旁的小木台上，也复用在屋内书桌，组成留给归人的点心。','用具体的小照料承接结尾，不计分也不强制收集。','随长椅与茶桌一起移动；可靠近按 E 看点心小记。',10),
 ('apple','红苹果','apple.png','与面包共同标出歇息位置；屋内书桌也有一枚苹果。','少量暖红作为生活细节，控制大小以免抢走自然的注意。','随长椅一起移动的小茶桌；屋内也复用。',9),
]: asset(id,title,'props',{'idle':source},purpose,emotion,placement,height)

manifest = dict(version=1, checkedAt='2026-11-16', provider='SpriteCook',
                sourceUrl='https://www.spritecook.ai/free-pixel-art-sprites',
                packs={key:dict(name=name,url=f'https://www.spritecook.ai/assets/downloadables/spritecook-{name}.zip',sha256=sha) for key,(name,sha) in PACKS.items()},
                licenseNote='角色总包内层标 CC0、ZIP 根目录及官网标 sample license，存在口径差异；两份通知均保留，保守遵循 sample license，不作为独立素材包再分发。建筑和道具各自附带 CC0 通知。本页清单不改变旧文章树图的本地研究限制。',
                assets=assets,files=files)
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Prepared {len(assets)} selected assets, {len(files)} original files and notices.')

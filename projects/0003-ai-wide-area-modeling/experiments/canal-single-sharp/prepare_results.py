"""Verify real PLY/renders and assemble a labelled research comparison figure."""
import argparse,hashlib,json,shutil,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageStat
p=argparse.ArgumentParser();p.add_argument('--results',required=True);p.add_argument('--assets',required=True);p.add_argument('--reference',required=True);p.add_argument('--support',required=True);a=p.parse_args()
sys.path.insert(0,a.support)
from plyfile import PlyData
r=Path(a.results);assets=Path(a.assets);assets.mkdir(parents=True,exist_ok=True)
report=json.loads((r/'inference.json').read_text());render=json.loads((r/'render-report.json').read_text())
assert not report['old_models_used'] and report['input_sha256']==hashlib.sha256(Path(a.reference).read_bytes()).hexdigest()
ply=PlyData.read(r/'canal-sharp.ply');v=ply['vertex'].data
assert len(v)==report['gaussian_count']==render['splats']==1179648
for k in ['x','y','z','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3','f_dc_0','f_dc_1','f_dc_2']:assert np.isfinite(v[k]).all(),k
assert not np.isnan(v['opacity']).any()
assert not render['errors']
images=['original.png','left.png','right.png','forward.png','wide.png']
stats={}
for name in images:
    im=Image.open(r/name).convert('RGB');sd=ImageStat.Stat(im).stddev
    assert im.size==(1000,563) and min(sd)>20,(name,sd)
    stats[name]=dict(stddev=sd,sha256=hashlib.sha256((r/name).read_bytes()).hexdigest())
    shutil.copy2(r/name,assets/name)
frames=sorted((r/'frames').glob('*.png'));assert len(frames)==60
for f in frames:assert min(ImageStat.Stat(Image.open(f).convert('RGB')).stddev)>20,f.name
assert len({x['sha256'] for x in stats.values()})==len(images)
old_hashes={
 r'F:\codex_project\1020_codex_project\projects\007-canal-blender-test\artifacts\rainy-canal-v3.blend':'7dc217ed94c381216747e9d5454c6e5408b0a9e3f89c4850ecf97217a811b7b4',
 r'F:\codex_project\1020_codex_project\projects\007-canal-blender-test\artifacts\rainy-canal-v4.blend':'017a6dd169e8fe5d8b958cc90d24687fe8f8aaeaa66194c455dd176afdd1b765'}
for f,h in old_hashes.items():assert hashlib.sha256(Path(f).read_bytes()).hexdigest()==h
verification=dict(ply_vertices=len(v),finite_geometry=True,opacity_infinite_logits=int(np.isinf(v['opacity']).sum()),
    rendered_images=stats,nonblank_motion_frames=len(frames),historical_models_unchanged=True,old_model_hashes=old_hashes,
    scope='Artifact integrity, actual rendering and source preservation; no geometric ground-truth validation')
(r/'verification.json').write_text(json.dumps(verification,indent=2),encoding='utf-8')
board=Image.new('RGB',(1600,520),'#151b24');draw=ImageDraw.Draw(board);font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',24)
for x,f,label in [(0,Path(a.reference),'原图输入'),(800,r/'original.png','SHARP 生成高斯：原视角实渲染')]:
    im=Image.open(f).convert('RGB').resize((800,450),Image.Resampling.LANCZOS)
    board.paste(im,(x,60));draw.text((x+16,16),label,font=font,fill='white')
board.save(assets/'comparison.png')
print('PASS',json.dumps({k:v for k,v in verification.items() if k not in ['rendered_images','old_model_hashes']}))

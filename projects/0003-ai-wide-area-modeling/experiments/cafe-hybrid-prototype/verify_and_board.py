"""Validate actual binding/lighting evidence and assemble labelled render boards."""
import argparse,hashlib,json,shutil
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageStat
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--assets',required=True);p.add_argument('--reports',required=True);a=p.parse_args();out=Path(a.out);assets=Path(a.assets);reports=Path(a.reports);assets.mkdir(parents=True,exist_ok=True);reports.mkdir(parents=True,exist_ok=True)
layout=json.loads((out/'layout.json').read_text());binding=json.loads((out/'binding.json').read_text());web=json.loads((out/'web-report.json').read_text());ui=json.loads((out/'ui-check.json').read_text());assert not web['errors'] and not ui['errors'] and all(ui['checks'].values())
S=np.array(binding['blender_to_three']);base=np.array(layout['cv_to_three_matrix']);rest=np.array(binding['rest_matrix']);maximum=0;bg=[]
all_checks={**web['checks'],**{f'ui-frame-{i}':v for i,v in enumerate(ui['samples'])}}
for name,c in all_checks.items():
    M=np.array(binding['frames'][c['frame']-1]['matrix']);delta=S@M@np.linalg.inv(rest)@np.linalg.inv(S)
    actual=np.array(c['skinWorld']).reshape(4,4,order='F');hinge=np.array(c['hingeWorld']).reshape(4,4,order='F')
    maximum=max(maximum,float(np.abs(actual-delta@base).max()),float(np.abs(hinge-delta).max()));bg.append(c['background'])
assert maximum<1e-6,maximum
assert all(np.max(np.abs(np.array(x)-bg[0]))<1e-10 for x in bg)
assert layout['counts']['source']==sum(layout['counts'][k] for k in ['door','background','removed_photo_interior'])
for path,h in layout['source_sha256'].items():assert hashlib.sha256(Path(path).read_bytes()).hexdigest()==h,path
old={r'F:\codex_project\1020_codex_project\projects\007-canal-blender-test\artifacts\rainy-canal-v3.blend':'7dc217ed94c381216747e9d5454c6e5408b0a9e3f89c4850ecf97217a811b7b4',r'F:\codex_project\1020_codex_project\projects\007-canal-blender-test\artifacts\rainy-canal-v4.blend':'017a6dd169e8fe5d8b958cc90d24687fe8f8aaeaa66194c455dd176afdd1b765'}
for path,h in old.items():assert hashlib.sha256(Path(path).read_bytes()).hexdigest()==h,path
names=['hybrid-door-closed','hybrid-door-open','hybrid-door-wire','web-interior-warm','web-interior-day','web-interior-reverse','web-exterior-mesh','blender-exterior-closed','blender-exterior-open','blender-interior-warm','blender-interior-day','blender-interior-reverse']
for name in names:
    im=Image.open(out/(name+'.png')).convert('RGB');assert im.size==(1000,650) and max(ImageStat.Stat(im).stddev)>15,name;shutil.copy2(out/(name+'.png'),assets/(name+'.png'))
warm=np.asarray(Image.open(out/'blender-interior-warm.png').convert('RGB')).astype(float);day=np.asarray(Image.open(out/'blender-interior-day.png').convert('RGB')).astype(float)
delta_rgb=np.abs(day-warm);assert delta_rgb.mean()>5
door_difference=np.abs(np.asarray(Image.open(out/'hybrid-door-open.png')).astype(float)-np.asarray(Image.open(out/'hybrid-door-closed.png')).astype(float));assert door_difference.mean()>1
frames=sorted((out/'door-frames').glob('*.png'));assert len(frames)==48
for f in frames:assert max(ImageStat.Stat(Image.open(f).convert('RGB')).stddev)>15,f.name
verification=dict(binding_maximum_matrix_error=maximum,background_transform_unchanged=True,old_models_unchanged=True,source_gaussians_and_reference_unchanged=True,
    gaussian_partition=layout['counts'],native_interior_lighting_mean_absolute_rgb_change=float(delta_rgb.mean()),native_interior_lighting_pixel_fraction_over_15=float((delta_rgb.mean(2)>15).mean()),
    hybrid_door_mean_absolute_image_change=float(door_difference.mean()),valid_motion_frames=len(frames),ui_checks=ui['checks'],binding_sample_frames=sorted({v['frame'] for v in all_checks.values()}),
    scope='Rigid mesh/Gaussian binding and new mesh PBR lighting verified; not full-scene Gaussian relighting or unseen-room reconstruction truth')
(out/'verification.json').write_text(json.dumps(verification,indent=2),encoding='utf-8')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',24)
def board(file,panels,foot):
    b=Image.new('RGB',(1600,1175),'#14202d');d=ImageDraw.Draw(b)
    for i,(name,label) in enumerate(panels):
        x=(i%2)*800;y=(i//2)*565;im=Image.open(out/(name+'.png')).convert('RGB').resize((800,520),Image.Resampling.LANCZOS);b.paste(im,(x,y+40));d.text((x+12,y+5),label,font=font,fill='white')
    d.text((12,1140),foot,font=font,fill='#c4d0de');b.save(assets/file)
board('prototype-overview.png',[('hybrid-door-closed','高斯＋实体：关门'),('hybrid-door-open','高斯跟随 Blender 门轴：开门'),('blender-interior-warm','Blender 实渲染：新建室内暖光'),('blender-interior-day','同一机位：换为窗侧日光')],'室内为设计补建；高斯光照仍固定。本图展示真实绑定与实体换灯。')
board('interior-exterior.png',[('blender-exterior-open','实体外侧看进房间'),('blender-interior-reverse','实体室内看向门外'),('blender-interior-warm','室内看柜台：暖光'),('blender-interior-day','室内看柜台：日光')],'四张均为本轮新工程 Cycles 渲染，没有用原图生成视频替代三维。')
lb=Image.new('RGB',(1600,570),'#14202d');ld=ImageDraw.Draw(lb)
for x,name,label in [(0,'blender-interior-warm','同一房间、同一机位：暖色室内灯'),(800,'blender-interior-day','同一房间、同一机位：窗侧日光')]:
    lb.paste(Image.open(out/(name+'.png')).convert('RGB').resize((800,520),Image.Resampling.LANCZOS),(x,45));ld.text((x+12,7),label,font=font,fill='white')
lb.save(assets/'lighting-comparison.png')
for name in ['layout.json','binding.json','blender-report.json','web-report.json','verification.json','ui-check.json']:shutil.copy2(out/name,reports/name)
print(json.dumps(verification,indent=2))

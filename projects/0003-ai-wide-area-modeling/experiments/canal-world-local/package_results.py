"""Package actual outputs and quantitative checks, never synthesize proof."""
import argparse,json,math,hashlib,subprocess,shutil
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageStat
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--assets',required=True);a=p.parse_args();out=Path(a.out);assets=Path(a.assets);assets.mkdir(parents=True,exist_ok=True)
report=json.loads((out/'tour-full.json').read_text());frames=sorted((out/'tour-frames').glob('*.jpg'));assert len(frames)==report['frames']==432
for f in frames:
 with Image.open(f) as im:assert im.size==(960,540) and max(ImageStat.Stat(im.resize((96,54))).stddev)>2
captions=[(0,6,'运河全景：同一场景左右移动'),(6,13,'沿街靠近咖啡店'),(13,16,'停在门前，打开实体门'),(16,21,'绕过门外椅子，穿过门洞'),(21,26,'进入室内，观察柜台与家具'),(26,32,'连续转身，从室内回望街道'),(32,36,'走回门外，看运河与石桥')]
def stamp(t):return f'00:00:{t:02d},000'
(out/'captions.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(x)} --> {stamp(y)}\n{z}' for i,(x,y,z) in enumerate(captions))+'\n',encoding='utf-8')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','warning','-y','-framerate','12','-i','tour-frames/%04d.jpg','-vf',"pad=960:596:0:0:color=0x111821,subtitles=captions.srt:force_style='FontName=Microsoft YaHei,FontSize=14,Alignment=2,MarginV=8'",'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-an','canal-world-continuous.mp4'],cwd=out,check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=width,height,nb_frames,r_frame_rate:format=duration','-of','json',str(out/'canal-world-continuous.mp4')],text=True));assert int(probe['streams'][0]['nb_frames'])==432 and abs(float(probe['format']['duration'])-36)<.1
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',22);small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
board=Image.new('RGB',(1440,716),'#111821');d=ImageDraw.Draw(board);d.text((16,10),'运河新工程 · 同一场景连续镜头的实际帧',font=font,fill='white')
for i,(t,label) in enumerate([(0,'运河全景'),(10,'靠近咖啡店'),(16,'开门'),(21,'进入室内'),(29,'转身看街道'),(35,'走回门外')]):
 x=(i%3)*480;y=50+(i//3)*310;im=Image.open(frames[t*12]).convert('RGB').resize((480,270));board.paste(im,(x,y+27));d.text((x+12,y),f'{t:02d}s · {label}',font=small,fill='white')
d.text((16,683),'实体场景实渲染；高斯效果另见交互页。未知空间为三维设计补建。',font=small,fill='#b5c2ca');board.save(assets/'world-overview.png')
light=Image.new('RGB',(1280,408),'#111821');ld=ImageDraw.Draw(light)
for i,(preset,label) in enumerate([('warm','暖色室内灯'),('day','日光与窗侧补光')]):
 im=Image.open(out/'dataset'/preset/'interior-right'/'rgb.png').convert('RGB').resize((640,360));light.paste(im,(i*640,36));ld.text((i*640+12,5),label,font=small,fill='white')
light.save(assets/'lighting-comparison.png')
for n in ['hero-gaussian-warm','interior-right-gaussian-warm','interior-back-gaussian-warm']:
 if (out/'web'/(n+'.png')).is_file():shutil.copyfile(out/'web'/(n+'.png'),assets/(n+'.png'))
trace=report['trace'];steps=[np.linalg.norm(np.array(b['position'])-a['position']) for a,b in zip(trace,trace[1:])];angles=[]
for x,y in zip(trace,trace[1:]):
 dot=abs(float(np.dot(x['quaternion'],y['quaternion'])));angles.append(math.degrees(2*math.acos(min(1,dot))))
master=json.loads((out/'master-verification.json').read_text());ui=json.loads((out/'ui-check.json').read_text());fusion=json.loads((out/'fusion-warm.json').read_text());assert all(ui['passed'].values()) and master['old_v4_unchanged']
cfg=json.loads((out/'world.json').read_text());S=np.array([[1,0,0,0],[0,0,1,0],[0,-1,0,0],[0,0,0,1.]]);M0=np.array(cfg['door']['rest_matrix']);rig=[]
for check in ui['trace']:
 frame=check['state']['frame'];Mt=np.array(cfg['door']['frames'][frame-1]['matrix']);mesh=np.array(check['doorMatrix']).reshape(4,4).T;skin=np.array(check['splatDoorMatrix']).reshape(4,4).T;bg=np.array(check['staticMatrix']).reshape(4,4).T;rig.append({'frame':frame,'mesh_max_error':float(np.max(abs(mesh-S@Mt@np.linalg.inv(S)))),'splat_max_error':float(np.max(abs(skin-S@Mt@np.linalg.inv(M0)))),'static_max_error':float(np.max(abs(bg-S)))})
assert max(max(v for k,v in r.items() if k!='frame') for r in rig)<1e-10
W=np.load(out/'fusion-warm.npz');D=np.load(out/'fusion-day.npz');geometry_same=W['position'].shape==D['position'].shape and np.array_equal(W['position'],D['position']);assert geometry_same
wi=np.asarray(Image.open(out/'dataset/warm/interior-right/rgb.png').convert('RGB'),dtype=float);di=np.asarray(Image.open(out/'dataset/day/interior-right/rgb.png').convert('RGB'),dtype=float);lighting={'gaussian_geometry_identical':geometry_same,'same_camera_rgb_mae_255':float(np.mean(abs(wi-di))),'meaning':'Re-rendered and fused two light presets; not instantaneous physical Gaussian relighting'}
comparison=[]
for t in [10,20,29,35]:
 f=out/'web'/f'heldout-{t:02d}.png'
 if f.is_file():
  A=np.asarray(Image.open(f).convert('RGB').resize((960,540)),dtype=float);B=np.asarray(Image.open(frames[t*12]).convert('RGB'),dtype=float);mae=np.mean(abs(A-B));mse=np.mean((A-B)**2);comparison.append({'time':t,'mae_rgb_255':float(mae),'psnr_db':float(10*math.log10(255**2/max(mse,1e-9))),'scope':'Unmasked whole-image visual comparison; different glass and baked reflections are included. No quality pass is inferred from geometric agreement.'})
runtime=Path('D:/codex/home/visualizations/2026/11/15/01a1de25-a21a-7db2-bd3c-5108c15683e8');oldcafe=runtime/'cafe-hybrid-prototype';baseline=json.loads((oldcafe/'local-state-audit.json').read_text())['assetSha256'];cafe_same=all(hashlib.sha256((oldcafe/n).read_bytes()).hexdigest()==v for n,v in baseline.items());assert cafe_same
source_expected={str(runtime/'canal-sharp-results/canal-sharp.ply'):'f016afa60f439dd76c7aac808b0a27e7e7fec224a3e56638029169d81069c1a0','F:/codex_project/1020_codex_project/projects/007-canal-blender-test/assets/reference.png':'6ebfd8652e498e31ad522045a22e7abdb32b92f5b5e825f62ae7df13ec844f1e','F:/codex_project/1020_codex_project/projects/007-canal-blender-test/artifacts/rainy-canal-v3.blend':'7dc217ed94c381216747e9d5454c6e5408b0a9e3f89c4850ecf97217a811b7b4'};source_checks={n:hashlib.sha256(Path(n).read_bytes()).hexdigest()==h for n,h in source_expected.items()};assert all(source_checks.values())
result={'video':probe,'master':master,'ui':ui['passed'],'blender_gaussian_binding':rig,'lighting':lighting,'fusion':{k:fusion[k] for k in ['static_gaussians','door_gaussians','input_views','raw_samples','voxel']},'continuity':{'max_camera_step':float(max(steps)),'max_camera_rotation_degrees':max(angles)},'heldout_visual_comparison':comparison,'source':{'old_v4_unchanged':master['old_v4_unchanged'],'old_cafe_assets_unchanged':cafe_same,'original_sources_unchanged':source_checks,'master_sha256':hashlib.sha256((out/'canal-world-master.blend').read_bytes()).hexdigest()},'assessment':'Spatial/control pipeline and render->Gaussian update are demonstrated. Gaussian appearance remains a lower-quality approximation; this is not a verified excellent single-image reconstruction.'}
(out/'acceptance.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));(assets/'acceptance.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PACKAGED',json.dumps({'frames':len(frames),'max_step':float(max(steps)),'heldout':comparison}),flush=True)

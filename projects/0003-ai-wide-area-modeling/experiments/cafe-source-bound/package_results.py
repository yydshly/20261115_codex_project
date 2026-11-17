"""Evidence packaging for a SOURCE Gaussian hybrid, including failed checks."""
import argparse,hashlib,json,math,subprocess,shutil,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageStat
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--assets',required=True);p.add_argument('--support',required=True);a=p.parse_args();out=Path(a.out);assets=Path(a.assets);assets.mkdir(parents=True,exist_ok=True);sys.path.insert(0,a.support)
from plyfile import PlyData
trace=json.loads((out/'capture-tour.json').read_text());preview=json.loads((out/'capture-preview.json').read_text());cfg=json.loads((out/'layout.json').read_text());binding=json.loads((out/'binding.json').read_text());patch=json.loads((out/'patch-report.json').read_text());raw=json.loads((out/'source-binding.json').read_text());prep=json.loads((out/'preparation.json').read_text());frames=sorted((out/'frames').glob('*.png'));assert len(frames)==len(trace['trace'])==336 and not trace['errors'] and not preview['errors']
states=[]
for row in trace['trace']:
 assert row['state']['mode']=='bound' and row['state']['appearance'] and all(row['gaussian_visibility'].values())
 states.append(json.dumps({'gaussians':row['gaussian_visibility'],'background':row['background_matrix'],'completion_count':row['completed_meshes_visible'],'proxy_materials':row['proxy_materials_visible'],'context':row['state']['context']},sort_keys=True))
assert len(set(states))==1
for f in frames:
 with Image.open(f) as im:assert im.size==(1000,563) and max(ImageStat.Stat(im.resize((100,56))).stddev)>2
captions=[(0,7,'原图高斯全景：同一场景左右移动'),(7,13,'保留原高斯外观，连续靠近咖啡店'),(13,16,'原图门高斯跟随实体门轴'),(16,20,'进入设计室内：原照片外观局部绑定'),(20,24,'柜台仍有贴面拉伸：外观验收未通过'),(24,28,'回望街道：原高斯 + 未见区域补建')]
def stamp(t):return f'00:00:{t:02d},000'
(out/'captions.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(x)} --> {stamp(y)}\n{text}' for i,(x,y,text) in enumerate(captions))+'\n',encoding='utf-8')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','warning','-y','-framerate','12','-i','frames/%04d.png','-vf',"pad=1000:620:0:0:color=0x111a23,subtitles=captions.srt:force_style='FontName=Microsoft YaHei,FontSize=14,Alignment=2,MarginV=8'",'-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart','-an','source-hybrid-tour.mp4'],cwd=out,check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=width,height,nb_frames,r_frame_rate:format=duration','-of','json',str(out/'source-hybrid-tour.mp4')],text=True));assert int(probe['streams'][0]['nb_frames'])==336 and abs(float(probe['format']['duration'])-28)<.1
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',22);small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
def picture(path,size=(600,338)):return Image.open(path).convert('RGB').resize(size,Image.Resampling.LANCZOS)
board=Image.new('RGB',(1200,1260),'#111a23');d=ImageDraw.Draw(board);d.text((15,10),'原图高斯 + 实体结构 · 同机位实测，外观仍未通过验收',font=font,fill='white');d.text((15,47),'左：旧样板原文件 / 右：原外观表面绑定与补建',font=small,fill='#bfd0d8')
for i,(view,label) in enumerate([('approach','门外近看'),('inside','室内柜台：保留拉伸问题'),('reverse','回望街道：补建仅填未见空间')]):
 y=85+i*378;d.text((15,y),label,font=small,fill='white')
 for col,mode in enumerate(['baseline','bound']):board.paste(picture(out/'preview'/f'{view}-{mode}.png'),(col*600,y+30))
d.text((15,1224),'全程高斯开启；原机位保留不等于新视角外观已正确。未知空间为设计补建。',font=small,fill='#bfd0d8');board.save(assets/'before-after.png')
preserve=Image.new('RGB',(1500,660),'#111a23');pd=ImageDraw.Draw(preserve);pd.text((15,10),'外观来源核对：原高斯 / 混合场景 / 关闭高斯后的实体',font=font,fill='white')
for i,(n,label) in enumerate([('source-original','原始 SHARP'),('source-bound','原外观混合'),('source-bound-noappearance','关闭高斯')]):pd.text((i*500+10,48),label,font=small,fill='white');preserve.paste(picture(out/'preview'/(n+'.png'),(500,282)),(i*500,78))
preserve.paste(picture(out/'preview'/'left-bound.png',(500,282)),(0,369));preserve.paste(picture(out/'preview'/'right-bound.png',(500,282)),(500,369));preserve.paste(picture(out/'preview'/'source-bound-wire.png',(500,282)),(1000,369));preserve.save(assets/'source-preservation.png')
reference=np.asarray(Image.open(out/'preview/source-original.png').convert('RGB'),dtype=float);metrics={}
for name in ['source-bound','source-baseline','source-bound-noappearance']:
 value=np.asarray(Image.open(out/'preview'/(name+'.png')).convert('RGB'),dtype=float);difference=value-reference;roi=difference[round(330/941*563):round(680/941*563),round(160/1672*1000):round(600/1672*1000)];metrics[name]={'mae_rgb_255':float(np.mean(abs(difference))),'psnr_db':float(10*math.log10(255**2/max(np.mean(difference**2),1e-9))),'cafe_roi_mae_255':float(np.mean(abs(roi)))}
S=np.array(binding['blender_to_three']);base=np.array(cfg['cv_to_three_matrix']);M0=np.array(binding['rest_matrix']);rig=[]
for row in trace['trace'][::24]:
 Mt=np.array(binding['frames'][row['state']['frame']-1]['matrix']);expected=S@Mt@np.linalg.inv(M0)@np.linalg.inv(S);hinge=np.array(row['hinge_matrix']).reshape(4,4).T;door=np.array(row['door_matrix']).reshape(4,4).T;rig.append(max(float(np.max(abs(hinge-expected))),float(np.max(abs(door-expected@base)))))
assert max(rig)<1e-10
background=PlyData.read(out/'background-patch.ply')['vertex'].data;P=np.c_[background['x'],background['y'],background['z']];R=np.array(cfg['cafe_frame']['basis_cv_columns']);O=np.array(cfg['cafe_frame']['origin_cv']);B=(P-O)@R*cfg['cafe_frame']['scale'];inside=(B[:,0]>-4)&(B[:,0]<cfg['door_width']+.5)&(B[:,1]>.2)&(B[:,1]<5.1)&(B[:,2]>.1)&(B[:,2]<3.1);assert int(inside.sum())==0
protected={**prep['source_sha256'],**cfg['source_sha256']};source_hashes={n:hashlib.sha256(Path(n).read_bytes()).hexdigest()==h for n,h in protected.items()};assert all(source_hashes.values())
assert patch['source_render_sha256']==hashlib.sha256((out/'preview/source-original.png').read_bytes()).hexdigest()
source_path=Path(next(n for n in prep['source_sha256'] if n.endswith('canal-sharp.ply')));original=PlyData.read(source_path)['vertex'].data;groups=np.load(out/'source-groups.npz');changed=np.unique(np.concatenate([groups[k] for k in ['door','interior','facade','ground']]));unchanged=np.setdiff1d(np.arange(len(original)),changed);provenance=np.load(out/'source-provenance.npz');bgids=provenance['background'];headids=bgids[~np.isin(bgids,groups['ground'])];assert background[np.searchsorted(headids,unchanged)].tobytes()==original[unchanged].tobytes()
steps=[np.linalg.norm(np.asarray(b['position'])-a['position']) for a,b in zip(trace['trace'],trace['trace'][1:])];turns=[math.degrees(2*math.acos(min(1,abs(float(np.dot(a['quaternion'],b['quaternion'])))))) for a,b in zip(trace['trace'],trace['trace'][1:])]
report={'video':probe,'appearance_variant':'local source-render surface patch','source_appearance_metrics':metrics,'original_primitives_byte_identical':len(unchanged),'patch':patch,'background_centers_inside_designed_room':{'before':4558,'after':int(inside.sum()),'meaning':'Centers only, not a guarantee that every ellipsoid or edge artifact is eliminated'},'max_door_binding_matrix_error':max(rig),'constant_render_layer_states':len(set(states)),'all_original_appearance_layers_enabled':True,'continuity':{'max_position_step':float(max(steps)),'max_rotation_degrees':max(turns)},'source_files_unchanged':source_hashes,'visual_quality_gate':{'passed':False,'remaining':['Photo detail is still stretched or misregistered on some interior surfaces','Unseen PBR faces and photo-Gaussian faces still show seams','Context is a designed completion, not recovered novel views','Baked light is not physically relightable by these operations']},'scope':'Actual Spark source-Gaussian+mesh hybrid captures. No Cycles footage substitutes for Gaussian footage; no new learned model, API or image generation.'}
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));(assets/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('VERIFIED',json.dumps({'source_metrics':metrics,'unchanged':len(unchanged),'binding_error':max(rig),'quality_gate_passed':False}),flush=True)

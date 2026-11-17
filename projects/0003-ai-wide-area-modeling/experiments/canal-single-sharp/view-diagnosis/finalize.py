"""Check the actual browser camera, annotate heuristic masks, preserve evidence."""
import argparse,hashlib,json,shutil
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageStat
p=argparse.ArgumentParser();p.add_argument('--results',required=True);p.add_argument('--assets',required=True);p.add_argument('--reports',required=True);p.add_argument('--source-ply',required=True);a=p.parse_args()
r=Path(a.results);assets=Path(a.assets);reports=Path(a.reports);assets.mkdir(parents=True,exist_ok=True);reports.mkdir(parents=True,exist_ok=True)
c=json.loads((r/'cameras.json').read_text());actual=json.loads((r/'actual-camera-render.json').read_text());diag=json.loads((r/'diagnostic-report.json').read_text());assert not actual['errors']
checks={}
for name in ['source','target']:
    pose=c[name];R=np.array(pose['R_world_to_camera']);C=np.array(pose['camera_center']);K=np.array(pose['K']);P=np.array(c['projection_check_points']);Q=(P-C)@R.T
    uv=Q[:,:2]/Q[:,2:3]*[K[0,0],K[1,1]]+[K[0,2],K[1,2]]
    difference=np.array(actual['views'][name]['projected'])-uv
    maximum=float(np.max(np.linalg.norm(difference,axis=1)));assert maximum<.001,(name,maximum)
    M=np.array(actual['views'][name]['matrixWorldInverse']).reshape(4,4,order='F');D=np.diag([1,-1,-1])
    assert np.max(np.abs(D@M[:3,:3]@D-R))<1e-8
    assert np.max(np.abs(D@M[:3,3]+R@C))<1e-8
    im=Image.open(r/(name+'-view.png'));assert im.size==(1000,563) and min(ImageStat.Stat(im.convert('RGB')).stddev)>20
    checks[name]=dict(maximum_projection_difference_pixels=maximum,actual_view_matrix_matches_saved_extrinsics=True)
hash_after=hashlib.sha256(Path(a.source_ply).read_bytes()).hexdigest();assert hash_after==diag['ply_sha256']
missing=np.asarray(Image.open(r/'source-unsupported-mask.png'))>0;risk=np.asarray(Image.open(r/'depth-boundary-risk-mask.png'))>0
assert not (missing&risk).any()
base=np.asarray(Image.open(r/'target-view.png').convert('RGB')).astype(np.float32)
overlay=base.copy();overlay[missing]=.42*base[missing]+.58*np.array([245,65,90]);overlay[risk]=.52*base[risk]+.48*np.array([255,198,40])
annotated=Image.fromarray(np.uint8(np.clip(overlay,0,255)));d=ImageDraw.Draw(annotated);font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)
regions=[dict(id=1,box=[80,208,235,390],description='咖啡店门窗/遮挡轮廓：重点核对，不是已确认错误'),dict(id=2,box=[650,260,955,400],description='桥洞与栏杆：检查新露出区域和遮挡连续性'),dict(id=3,box=[340,425,680,548],description='水面倒影：预测深度不能直接当河床或真实水面形状')]
for region in regions:
    x0,y0,x1,y1=region['box'];d.rectangle(region['box'],outline='white',width=2);d.rounded_rectangle((x0,y0,x0+30,y0+29),radius=4,fill='#182536');d.text((x0+8,y0),str(region['id']),font=font,fill='white')
annotated.save(r/'annotated-target.png')
# A standalone legend makes the exported image understandable without the page.
panel=Image.new('RGB',(1000,703),'#131c28');panel.paste(annotated,(0,0));pd=ImageDraw.Draw(panel)
pd.text((18,575),'右侧固定机位：平移后朝原焦点转向 5°',font=font,fill='white')
pd.text((18,606),'红：源图重投影未覆盖   黄：深度断层/展开候选区',font=font,fill='#f4d287')
pd.text((18,637),'1 门窗轮廓   2 桥洞与栏杆   3 水面倒影：重点核对',font=font,fill='#e6edf8')
pd.text((18,668),'候选标注不代表真实错误；尚未补图或修改高斯。',font=font,fill='#aebed1')
panel.save(r/'annotated-with-legend.png')
board=Image.new('RGB',(1600,1055),'#131c28');bd=ImageDraw.Draw(board);title=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',24)
for x,y,name,label in [(0,0,'reference.png','原图输入'),(800,0,'target-view.png','固定右侧 5°：高斯实渲染'),(0,510,'source-reprojected-draft.png','源图重投影：棋盘格为未保留区域'),(800,510,'annotated-target.png','红：源图无覆盖；黄：断层/展开候选')]:
    board.paste(Image.open(r/name).convert('RGB').resize((800,450),Image.Resampling.LANCZOS),(x,y+45));bd.text((x+14,y+8),label,font=title,fill='white')
bd.text((14,1010),'仅诊断，不是修复结果；红黄区域是启发式候选，不能作为几何真值。',font=title,fill='#becddd')
board.save(r/'comparison.png')
for name in ['source-view.png','target-view.png','source-depth-proxy.png','target-depth-proxy.png','source-reprojected-draft.png','source-unsupported-mask.png','depth-boundary-risk-mask.png','source-supported-mask.png','annotated-target.png','annotated-with-legend.png','comparison.png']:
    shutil.copy2(r/name,assets/name)
verification=dict(camera_projection_checks=checks,source_ply_unchanged=True,source_ply_sha256=hash_after,
    annotations=regions,annotations_scope='Manual review priorities, not manually verified geometric errors',
    source_unsupported_fraction=float(missing.mean()),depth_boundary_risk_fraction=float(risk.mean()),
    ai_inpainting_performed=False,gaussian_geometry_modified=False)
(r/'verification.json').write_text(json.dumps(verification,indent=2,ensure_ascii=False),encoding='utf-8')
for name in ['cameras.json','diagnostic-report.json','actual-camera-render.json','verification.json']:shutil.copy2(r/name,reports/name)
print(json.dumps(verification,indent=2,ensure_ascii=False))

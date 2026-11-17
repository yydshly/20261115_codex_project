"""One step-linked research architecture, rendered as exact-text PNG and SVG.

Only reads research records and existing result images. No reconstruction or
model invocation. The old posters, Gaussian data and Blender projects stay intact.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
import argparse
import base64
import hashlib
import html
import io
import json
import math
import re
import subprocess
import render_research_map as drawing

PROJECT=Path(__file__).resolve().parents[1]
ROOT=PROJECT.parents[1]
OUT=PROJECT/'assets/research-map'
QA=ROOT/'.local/canal-research-web/integrated-map-qa'
W=6400
X=(180,2260,4340)
CARD=1880
PAPER='#f6f3ec';WHITE='#fffef9';INK='#203d35';MUTED='#586d62'
GREEN='#245b49';COPPER='#a2643e';RED='#a4483c';LINE='#cbd6c7'
READ='#6a766c';MINT='#e5eee4';WARN='#f2e6dc'


def read_snapshot():
    # Reuse the webpage's one source of product/experiment facts.
    js="""const fs=require('fs'),vm=require('vm');const c={window:{}};
vm.createContext(c);for(const name of ['data.js','explore-data.js','explore-context.js'])
vm.runInContext(fs.readFileSync('web/'+name,'utf8'),c);
process.stdout.write(JSON.stringify({research:c.window.RESEARCH,atlas:c.window.RESEARCH_ATLAS,context:c.window.RESEARCH_CONTEXT}));"""
    return json.loads(subprocess.check_output(['node','-e',js],cwd=PROJECT,text=True,encoding='utf-8'))


STAGES=[
 dict(id='geometry',title='02 / 相机与可见几何',status='本图实测：预测与拟合跑通，整体效果未改善',tone='warn',
      capability='图像 → 相机内外参、深度／点。给出几何线索；不是完整房间，也不是物体分件模型。',
      tech='VGGT-1B / PyTorch（BF16 聚合＋FP32 头）、NumPy / SciPy；单图与多图联合、子集对照、参数拟合。',
      products=[('VGGT-1B','已用：预测相机、深度与点'),('COLMAP','仅调研：匹配＋SfM；可选 MVS'),('VGGT-Omega','仅调研：几何模型后续路线'),('DUSt3R','仅调研：图像对点图与配准依据')],
      trials=['E01 原图 → VGGT → 既有语义 Blender 拟合：锚点 RMS 36.92 → 54.46px。17.80px 仅为后续拟合诊断，无新改善渲染。','E09 / E10 已预测 7／9 图相机和深度；相机图、置信度与诊断点不等于空间真值。'],
      failure='未过：构图／比例没有改善。原因候选包括拟合目标、参数边界与相机不确定性，不能单独归罪于 VGGT 或坐标转换。单图尺度也无实测真值。',
      value='保留：几何推理、投影和数值拟合能力。后续要冻结评价条件，独立检验相机与深度。',experiments=['vggt','consistency','bridge']),
 dict(id='completion',title='03 / 未知空间生成与补全',status='首要缺口：候选图片完成，入口与回望未连通',tone='fail',
      capability='原图＋目标机位＋已有空间 → 新视图／新增表面。必须保持物体身份、布局和遮挡，原图外内容属于生成或设计。',
      tech='已用内置 image_gen、多参考图与文字机位提示；Pillow / OpenCV 做图像检查。现有接口没有硬相机、深度或持续共享三维状态。',
      products=[('内置 image_gen','已用：补图；精确后端型号未披露'),('ViewCrafter','仅调研：点云投影＋轨迹引导扩散'),('GEN3C','仅调研：显式相机＋共享 3D 缓存'),('WonderWorld','仅调研：共享 Gaussian surfel 扩展'),('Atlas · World Labs','仅调研：共享空间上下文；工具含 Viewfinder / Chisel / Splats to Mesh / Relight'),('JST-2 · Viggle','仅调研：持续三维表示，再解码图像／高斯'),('PINOC','仅调研：创作产品入口'),('Viggle / JST-2 API','仅调研：服务接口，非独立算法'),('Marble · World Labs','仅调研：世界生成产品'),('ChatArt / GPT Image / NanoBanana / Seedream','仅提及：本图未通过 ChatArt 调用')],
      trials=['E07 补左右；E08 补门口、室内、开／关灯与回望；E10 只补 A／B 过渡图再复检。失败初稿和提示词保留。'],
      failure='未过：相似图片不等于同一三维。门窗、植物、石材会重画；文字“侧移／跨门槛”没有固定相机。隐藏布局与几何一致性仍未解决。',
      value='保留：外观设计与困难区域候选。下一步比较有共享空间／相机约束的补全，或先锁定设计布局；这些候选尚未用本图验证获胜。',experiments=['left-right','interior','bridge']),
 dict(id='validate',title='04 / 共同空间与独立检验',status='诊断已实测；完整入口／原位回望未通过',tone='fail',
      capability='候选图＋固定相机／深度＋独立对应 → 支持区域、冲突候选与复核报告。不通过就回到补全，不能直接训练。',
      tech='OpenCV SIFT / RANSAC、F 矩阵与 Sampson 残差、固定重投影、覆盖统计；VGGT 联合／子集控制；Pillow 标注、人工误配核对。',
      products=[],
      trials=['E03 固定新机位：重投影未覆盖 4.75%、风险 12.61%；不是模型错误率。','E09 外景与室内各有局部支持，3,960 个稀疏诊断点不能当完整重建。','E10 A—门口 53 对／中位 60.6px；B—门槛 87 对／29.5px，连接未过；未训练这批补图的高斯。'],
      failure='原因候选：重叠不足、生成几何变化、误配、反射与预测不稳定混在一起。不能把全部自动冲突都归为图片错误，也不能用模型相机证明自身正确。',
      value='自定局部门槛：≥20 对匹配、两图各覆盖 6×4 网格≥4 格、≥15 个有效投影；画宽1000px 时中位≤5px、P90≤15px。还需留出视角、回环与连续遮挡验收。',experiments=['diagnosis','consistency','bridge']),
 dict(id='sharp',title='A / 单图直接预测高斯',status='独立实测支线：不经 VGGT／COLMAP／旧模型',tone='ok',
      capability='唯一原图 → Apple SHARP → 新高斯 PLY。学习先验直接预测局部三维，不是从文件读出隐藏的完整世界。',
      tech='Apple SHARP / PyTorch；Pillow、plyfile。无 EXIF，使用官方焦距回退；CPU FP32 推理。',
      products=[('Apple SHARP','已用：单图前馈高斯预测模型')],
      trials=['E02 独立得到 1,179,648 个高斯，约 66MB；CPU 推理 113.60 秒。原机位照片感和小范围视差成立。'],
      failure='边界：大幅侧移、靠近和背面失真。单图可见表面与深度不足，不能据此进入店铺或绕建筑；不是高斯表示天生只能看一个角度。',
      value='保留：从原图得到真实三维外观的最快已跑通起点。后续把它当局部外观依据，不能当完整布局真值。',experiments=['sharp','diagnosis']),
 dict(id='gaussian',title='05A / 高斯外观表示',status='单图预测与渲染已用；本批多图训练未执行',tone='warn',
      capability='有观测／生成支持的相机与图像 → 高斯位置、尺度、旋转、不透明度和颜色。也可接左侧 SHARP 的直接预测结果。',
      tech='3DGS / PLY / plyfile、原高斯分组与局部表面重采样；Spark 真实渲染。普通颜色常含原图照明与反射。',
      products=[('3D Gaussian Splatting','已用：三维表示／实际渲染，不代表补图训练通过'),('LichtFeld Studio','仅调研：可选训练／检查工具')],
      trials=['E02 保留原图色彩与纹理。E06 原机位相对原高斯 PSNR 30.10dB；多角度仍失败。','E05 从自己设计的 Blender RGB-D 融合高斯缓存，外观变成 CG；不能当原图隐藏空间复原。'],
      failure='未过：完整视角支撑和独立换光不足。30.10dB 不是真实世界准确度；缓存切换不是重照明。补图未通过 04，所以没有进入完整多图高斯训练。',
      value='保留：照片细节、原机位观感与真实视差。高斯负责外观；普通分件网格、背面与材质控制还要另做。',experiments=['sharp','cg','bound']),
 dict(id='mesh',title='05B / 实体结构与设计内部',status='结构／实体换灯已用；完整照片外观未过',tone='warn',
      capability='几何线索＋明确设计布局 → 墙、门、柜台、房间、物体层级、材质、灯与 .blend / GLB。也可研究提取网格。',
      tech='Blender 4.5.9、Python bpy、参数化网格、Cycles、门轴与材质灯光。Agent 组织脚本和参数；实际用了 bpy，不等于通用 MCP 已验证。',
      products=[('Blender','已用：可编辑结构与渲染工具'),('ai-wide-area-modeling','仅调研：Kotohibi 的测量、参数／脚本和验收流程'),('Agent＋MCP for Blender','仅调研 MCP 桥接；不是重建模型')],
      trials=['E01 复用历史 V3／V4 语义场景，再用 VGGT 拟合，未改善。','E04 新咖啡店 196 个对象；E05 完整场景 5,290 个对象，36 秒实体镜头；结构功能可用，CG 外观不满足目标。'],
      failure='原因：设计内部不是从原图恢复的隐藏真值；实体规模不证明照片外观。点云／高斯转网格也不会自动补出背面、干净拓扑、物体分件和材质。',
      value='保留：可选、可改、有厚度和遮挡的实体资产。设计支线可直接做结构；若做重建，必须先有可靠空间依据。',experiments=['vggt','hybrid','cg']),
 dict(id='viewer',title='C / 真实渲染与观看验证',status='已实测：相机、帧、场景都能直接查看',tone='ok',
      capability='高斯／网格＋相机与动作 → 同一场景的真实三维、实际帧与连续视频。渲染不会自动补世界。',
      tech='Spark 2.4.0、Three.js 0.187.0、GLTFLoader / OrbitControls、FFmpeg；GLB 结构预览、线框、对象检索与原帧编码。',
      products=[('Spark','已用：高斯渲染、分组与门变换'),('Three.js','已用：网格、相机、灯光与交互承载')],
      trials=['E02 实渲染 5 个机位／60 帧、3 秒运动。E04 / E06 28 秒连续移动、开门、进入和回望；高斯持续开启，缺陷保留。','E09 可查看预测相机与诊断点；它不是完成的高斯世界。'],
      failure='边界：可拖动不等于各角度都可靠；视频顺畅不等于几何正确。原高斯、设计实体、诊断点和生成图片必须分别标明来源。',
      value='保留：直接审查缺陷、比较候选和重复摆机位。网页的现有效果、三维、视频和工程入口继续使用。',experiments=['sharp','diagnosis','hybrid','bound','consistency']),
 dict(id='binding',title='06 / 外观—结构对齐与绑定',status='局部门轴通过，整体多角度外观失败',tone='fail',
      capability='高斯外观＋网格结构 → 同一坐标、表面对应与物体所属。物体动作时，让所属高斯同步变换。',
      tech='Blender 求值矩阵、对象分组、NumPy / plyfile；局部表面约束、原外观采样；Spark / Three.js 混合显示。',
      products=[('SuGaR','仅调研：表面对齐高斯与网格提取'),('Gaussian Frosting','仅调研：网格＋厚度高斯层，含 sugar_frosting_blender_addon')],
      trials=['E04 门矩阵联动误差约 1.78×10⁻¹⁵。E06 保留 1,048,246 个原高斯条目逐字节相同；默认合计 1,128,344 个高斯。','E06 背景高斯中心进入房间从 4,558 降为 0；不保证尾部完全不穿帮。'],
      failure='未过：近景仍有拉伸、错位、接缝与缺面。矩阵正确不能代替物体身份／表面对应正确；绑定不会自动创造隐藏空间和背面。',
      value='保留：已验证动作传递。先稳定空间与部件外观，再验证刚性动作、露出面和形变；SuGaR／Frosting 尚未在本图运行。',experiments=['hybrid','bound']),
 dict(id='lighting',title='07 / 材质、动作与物理换光',status='实体灯光可控；原高斯独立换光尚未验证',tone='fail',
      capability='稳定结构＋材质／照明分解或可重照明表示 → 同一世界中改变灯光，阴影、反射和物体外观随之变化。',
      tech='已用 Blender 材质／灯光／Cycles；还未实现原高斯的材质照明分离。专门重照明模型尚未在本图验证。',
      products=[],
      trials=['E04 实体室内能设置暖／日光；这不是原高斯物理重照明。','E05 两套 PLY 缓存切换；E08 生成开／关灯图有 920 对筛选特征、位移中位 1.339px；这些仅是状态／图片对照。'],
      failure='原因／缺口：普通高斯颜色已经混入原图照明、阴影与反射。改 Blender 灯不会自动改原高斯。两张亮暗图、两份缓存不能替代真实换光。',
      value='下一道验收：冻结同一几何／材质，只改光源，复核阴影与反射。开门、移动、形变、换光必须分别验收。',experiments=['hybrid','cg','interior']),
]


class Architecture(drawing.Poster):
    def __init__(self):super().__init__();self.panels=[];self.product_mentions=[]
    def poly(self,points,color=GREEN,width=10,dashed=False):
        self.commands.append(('poly',(points,color,width,dashed)))
        x,y=points[-2];x2,y2=points[-1];angle=math.atan2(y2-y,x2-x)
        for side in (-1,1):self.line(x2,y2,x2-28*math.cos(angle+side*.48),y2-28*math.sin(angle+side*.48),color,width)
    def label(self,x,y,text,width=1000,color=GREEN):
        start=len(self.commands);end=self.wrapped(x+17,y+11,text,width-34,28 if width<250 else 31,color,True,1.35)
        self.commands.insert(start,('rect',(x,y,width,end-y+13,PAPER,None,8)))
    def card(self,stage,x,y,w=CARD,min_height=1400):
        start=len(self.commands);top=y+36;pad=43;tone=stage['tone'];color=RED if tone=='fail' else COPPER if tone=='warn' else GREEN
        self.text(x+pad,top,stage['status'],26,color,True);top+=52
        top=self.wrapped(x+pad,top,stage['title'],w-2*pad,56,INK,True,1.25)+28
        top=self.wrapped(x+pad,top,stage['capability'],w-2*pad,34,INK,False,1.43)+24
        def section(title,texts,section_color=GREEN):
            nonlocal top
            self.line(x+pad,top,x+w-pad,top,LINE,2);top+=21
            self.text(x+pad,top,title,28,section_color,True);top+=47
            for text in texts:
                top=self.wrapped(x+pad,top,text,w-2*pad,31,MUTED,False,1.43)+13
            top+=8
        section('实际用过的技术 / 方法',[stage['tech']])
        if stage['products']:
            section('本环节的库 / 模型 / 产品',[name+' — '+purpose for name,purpose in stage['products']],READ)
            self.product_mentions.extend(name for name,_ in stage['products'])
        section('我们的尝试 / 已有证据',stage['trials'])
        section('哪里未过 / 原因与判断边界',[stage['failure']],RED)
        section('保留价值 / 下一步验收',[stage['value']],COPPER)
        footer='证据：'+ ' / '.join('E'+str(EXP_INDEX[e]).zfill(2) for e in stage['experiments'])+'　· 网页可查看效果 / 三维 / 工程'
        top=self.wrapped(x+pad,top+8,footer,w-2*pad,25,GREEN,True,1.35)+25
        height=max(min_height,top-y+12)
        self.commands.insert(start,('rect',(x,y,w,height,WHITE,LINE,24)))
        self.panels.append({'id':stage['id'],'title':stage['title'],'x':x,'y':y,'width':w,'height':height,'experiments':stage['experiments']})
        return height
    def export(self,height,snapshot):
        Image.MAX_IMAGE_PIXELS=None
        canvas=Image.new('RGB',(W,height),PAPER);draw=ImageDraw.Draw(canvas)
        svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{height}" viewBox="0 0 {W} {height}">',
             '<title>按流程步骤整合的单图到三维研究架构</title>',
             '<desc>每个步骤内直接列出能力、已用技术、开源库和产品、实验结果、未通过与原因。包含 SHARP 与参数化 Blender 已试支线。2026-11-17 整理。</desc>',f'<rect width="{W}" height="{height}" fill="{PAPER}"/>']
        for kind,args in self.commands:
            if kind=='rect':
                x,y,w,h,fill,stroke,r=args;draw.rounded_rectangle((x,y,x+w,y+h),radius=r,fill=fill,outline=stroke,width=3)
                svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke or "none"}" stroke-width="3"/>')
            elif kind=='line':
                x,y,x2,y2,color,width=args;draw.line((x,y,x2,y2),fill=color,width=width)
                svg.append(f'<path d="M{x},{y} L{x2},{y2}" fill="none" stroke="{color}" stroke-width="{width}"/>')
            elif kind=='poly':
                points,color,width,dashed=args
                for a,b in zip(points,points[1:]):
                    if not dashed:draw.line((*a,*b),fill=color,width=width)
                    else:
                        length=math.dist(a,b)
                        for distance in range(0,math.ceil(length),45):
                            start=distance/max(length,1);end=min(distance+25,length)/max(length,1)
                            draw.line((a[0]+(b[0]-a[0])*start,a[1]+(b[1]-a[1])*start,a[0]+(b[0]-a[0])*end,a[1]+(b[1]-a[1])*end),fill=color,width=width)
                d='M'+' L'.join(f'{x},{y}' for x,y in points)
                svg.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}"'+(' stroke-dasharray="25 20"' if dashed else '')+'/>')
            elif kind=='text':
                x,y,text,size,color,bold=args
                assert x>=0 and x+drawing.font(size,bold).getlength(text)<W-15,(text,x)
                assert y+size<height,text
                draw.text((x,y),text,font=drawing.font(size,bold),fill=color,anchor='lt')
                svg.append(f'<text x="{x}" y="{y}" fill="{color}" font-family="Microsoft YaHei,Noto Sans CJK SC,sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" dominant-baseline="text-before-edge">{html.escape(text)}</text>')
            elif kind=='image':
                x,y,w,h,data=args
                with Image.open(io.BytesIO(data)) as im:canvas.paste(im,(round(x),round(y)))
                svg.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="data:image/jpeg;base64,{base64.b64encode(data).decode()}"/>')
            else:raise ValueError(kind)
        svg.append('</svg>');OUT.mkdir(exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
        stem='canal-integrated-architecture'
        canvas.save(OUT/(stem+'.png'),optimize=True)
        (OUT/(stem+'.svg')).write_text('\n'.join(svg),encoding='utf-8')
        preview=ImageOps.contain(canvas,(1600,16000),Image.Resampling.LANCZOS);preview.save(QA/'reading-preview.jpg',quality=90)
        for panel in self.panels:
            crop=canvas.crop((panel['x'],panel['y'],panel['x']+panel['width'],panel['y']+panel['height']))
            ImageOps.contain(crop,(1050,2500),Image.Resampling.LANCZOS).save(QA/(panel['id']+'.jpg'),quality=92)
        metadata={'date':'2026-11-17','width':W,'height':height,'image':f'assets/research-map/{stem}.png','svg':f'assets/research-map/{stem}.svg',
                  'stages':self.panels,'experimentStages':{'vggt':'geometry','sharp':'sharp','diagnosis':'validate','hybrid':'binding','cg':'mesh','bound':'binding','left-right':'completion','interior':'completion','consistency':'validate','bridge':'validate'},'product_mentions':sorted(set(self.product_mentions)),'experiments':list(EXP_INDEX),'sources':self.sources,
                  'method':'Deterministic Pillow / SVG research architecture; exact Chinese text; no AI image or 3D generation',
                  'input_facts_sha256':hashlib.sha256(json.dumps(snapshot,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),
                  'text':self.texts,'connections':'Solid: recorded data/action. Dashed: proposed or unverified dependency. Neither is an overall quality pass.'}
        (OUT/(stem+'.json')).write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
        (PROJECT/'web/integrated-map.js').write_text("'use strict';\nwindow.INTEGRATED_RESEARCH_MAP="+json.dumps({k:metadata[k] for k in ['width','height','image','svg','stages','experimentStages']},ensure_ascii=False)+";\n",encoding='utf-8')
        print(json.dumps({'png':str(OUT/(stem+'.png')),'svg':str(OUT/(stem+'.svg')),'size':[W,height],'stages':len(self.panels),'products':len(set(self.product_mentions)),'bytes':(OUT/(stem+'.png')).stat().st_size},ensure_ascii=False))


def main():
    global EXP_INDEX
    snapshot=read_snapshot();D=snapshot['research'];EXP_INDEX={e['id']:i+1 for i,e in enumerate(D['experiments'])}
    p=Architecture()
    p.text(180,65,'CANAL / RESEARCH ARCHITECTURE / 2026.11.17',33,COPPER,True)
    p.text(180,140,'从一张图，到可操作三维：完整研究架构',102,INK,True)
    p.wrapped(180,285,'每个流程节点都贴回：能力与输入输出 → 已用技术 → 库 / 产品 → 实验 → 未通过与原因 → 复用价值。E01–E10 对应原始实验档案。',6040,38,MUTED,False,1.4)
    p.text(180,400,'实线＝已经发生的数据 / 动作；虚线＝待验证依赖。状态在节点内标明，绿色连接不代表整体验收通过。',33,GREEN,True)
    # Root evidence node and the common goal are part of the architecture, not detached catalogues.
    root_y=520;root_h=860
    p.rect(X[0],root_y,CARD,root_h,WHITE,LINE,24)
    p.text(X[0]+43,root_y+36,'01 / 唯一原图与输入证据',54,INK,True)
    p.image('assets/canal-single-vggt/reference.png',X[0]+43,root_y+120,700,394)
    p.wrapped(X[0]+790,root_y+133,'AI 运河概念图\n1672 × 941\n没有实拍侧面、室内、深度或尺度真值。\n未知区域需要生成 / 设计，不能声称恢复唯一真实世界。',CARD-840,32,INK,False,1.5)
    top=root_y+560
    p.text(X[0]+43,top,'输入与作者采集流程 · 均仅调研',28,READ,True);top+=48
    for name,note in [('Metashape','摄影测量；真实地点可增加重叠观测'),('Extract_sharpest_frame','从视频抽清晰帧'),('360 MCConverter / 旧版转换器','商业增强；旧公开库 Metashape_360_to_COLMAP_plane'),('3DGS_pipeline_guide','Kotohibi 采集到训练指南')]:
        top=p.wrapped(X[0]+43,top,name+' — '+note,CARD-86,30,MUTED,False,1.38)+10;p.product_mentions.append(name)
    assert top<root_y+root_h-15
    p.panels.append({'id':'input','title':'01 / 原图与输入证据','x':X[0],'y':root_y,'width':CARD,'height':root_h,'experiments':['vggt','sharp']})
    p.rect(X[1],root_y,W-X[1]-180,root_h,MINT,LINE,24)
    gx=X[1]+55;gw=W-X[1]-180-110
    p.text(gx,root_y+48,'共同目标',32,GREEN,True)
    end=p.wrapped(gx,root_y+112,'同一空间，照片外观，实体可编辑，动作与灯光可控制。',gw,74,INK,True,1.33)
    end=p.wrapped(gx,end+35,'运河左右移动 → 靠近咖啡店 → 开门进入 → 转身看街道 → 检查侧面、背面与室内 → 在 Blender 修改并重开复核。',gw,42,INK,False,1.48)
    p.rect(gx,end+35,gw,180,WARN,None,16)
    p.text(gx+30,end+57,'当前：局部功能已验证，完整三维世界仍未通过验收。',46,RED,True)
    p.wrapped(gx+30,end+124,'首要缺口是可靠的空间生成与补全；另一道门槛是物体 / 外观绑定、材质与物理换光。',gw-60,34,MUTED,False,1.4)
    p.wrapped(gx,end+260,'图中“已用”＝本张运河图实际跑过；“仅调研”＝资料 / 官方能力，未用本图跑过；“仅提及”＝接口或具体型号未确认。模型、几何算法、三维表示与软件工具不能混为一类。',gw,32,MUTED,False,1.5)
    p.text(gx,root_y+root_h-87,'十次实验、29 项库 / 模型 / 产品、实际技术与复盘均已放在对应步骤内。',32,GREEN,True)
    body=Architecture()
    def row(stages,y):
        measure=Architecture()
        common=max(measure.card(stage,X[i],0,min_height=0) for i,stage in enumerate(stages))
        for i,stage in enumerate(stages):body.card(stage,X[i],y,min_height=common)
    row1=1700
    row(STAGES[:3],row1)
    nodes={n['id']:n for n in body.panels}
    row2=math.ceil(max(n['y']+n['height'] for n in nodes.values())+420)
    row(STAGES[3:6],row2)
    nodes={n['id']:n for n in body.panels}
    row3=math.ceil(max(n['y']+n['height'] for n in nodes.values())+430)
    row(STAGES[6:],row3)
    nodes={n['id']:n for n in body.panels}
    # All connectors are routed outside the node interiors.
    center=lambda name:(nodes[name]['x']+CARD/2,nodes[name]['y']+nodes[name]['height']/2)
    bottom=lambda name:(nodes[name]['x']+CARD/2,nodes[name]['y']+nodes[name]['height'])
    top=lambda name:(nodes[name]['x']+CARD/2,nodes[name]['y'])
    p.poly([(X[0]+CARD/2,root_y+root_h),top('geometry')]);p.label(X[0]+CARD/2+35,1580,'原图推理 / 拟合',650)
    p.poly([(X[0],root_y+300),(75,root_y+300),(75,row2+270),(X[0],row2+270)])
    p.label(X[0],row2-143,'独立捷径：原图 → SHARP；不经 VGGT / 旧 Blender',CARD)
    # Direct semantic modelling is an actually tried branch, rather than a successful reconstruction.
    design_y=1470
    p.poly([(X[0]+CARD/2,root_y+root_h),(X[0]+CARD/2,design_y),(W-75,design_y),(W-75,row2+300),(X[2]+CARD,row2+300)],GREEN,9)
    p.label(X[1],1390,'已试设计支线：原图语义 → Agent / bpy 参数化 Blender；不是隐藏空间真值',W-X[1]-180)
    for a,b,label,dash in [('geometry','completion','几何约束\n待验证',True),('completion','validate','候选图\n实际检查',False)]:
        yy=row1+520;p.poly([(nodes[a]['x']+CARD,yy),(nodes[b]['x'],yy)],COPPER if dash else GREEN,10,dash)
        p.label(nodes[a]['x']+CARD+10,yy-137,label,180,COPPER if dash else GREEN)
    loop_y=row1-110
    p.poly([(X[2]+CARD*.70,row1),(X[2]+CARD*.70,loop_y),(X[1]+CARD*.70,loop_y),(X[1]+CARD*.70,row1)],RED,9,True)
    p.label(X[1]+170,loop_y-90,'未通过 → 返回补全；这批补图没有训练高斯',CARD+880,RED)
    by=row2-220
    p.poly([bottom('validate'),(top('validate')[0],by),(top('gaussian')[0],by),top('gaussian')],COPPER,10,True)
    p.poly([bottom('validate'),(top('validate')[0],by),top('mesh')],COPPER,10,True)
    p.label(X[1]+130,by-90,'空间检查通过后，再进入多视图外观 / 实体重建',CARD+600,COPPER)
    p.poly([(X[0]+CARD,row2+380),(X[1],row2+380)]);p.label(X[0]+CARD+12,row2+245,'预测 PLY\n已实测',176)
    join_y=row3-210
    p.poly([bottom('gaussian'),(top('binding')[0],join_y),top('binding')])
    p.poly([bottom('mesh'),(bottom('mesh')[0],join_y),(top('binding')[0],join_y),top('binding')])
    p.label(X[1]+170,join_y-90,'已有高斯 + 已设计结构 → 局部动作绑定已实测',CARD+750)
    p.poly([bottom('sharp'),top('viewer')]);p.label(X[0]+CARD/2+30,row3-160,'原高斯实渲染',730)
    p.poly([(X[1],row3+430),(X[0]+CARD,row3+430)]);p.label(X[0]+CARD+10,row3+300,'同场显示\n保留缺陷',180)
    p.poly([(X[1]+CARD,row3+530),(X[2],row3+530)],COPPER,10,True);p.label(X[1]+CARD+10,row3+350,'材质照明\n独立验收',180,COPPER)
    p.commands.extend(body.commands);p.panels.extend(body.panels);p.product_mentions.extend(body.product_mentions);p.texts.extend(body.texts)
    final_y=math.ceil(max(n['y']+n['height'] for n in nodes.values())+430)
    p.poly([bottom('viewer'),(bottom('viewer')[0],final_y)],GREEN)
    p.poly([bottom('lighting'),(bottom('lighting')[0],final_y)],COPPER,10,True)
    p.label(X[0]+CARD/2+35,final_y-165,'已有产物只读交付',820)
    p.label(X[2]-180,final_y-165,'空间 / 编辑 / 换光仍须整体验收',CARD,COPPER)
    fw=W-360;fh=1340
    final_rect_index=len(p.commands);p.rect(180,final_y,fw,fh,MINT,LINE,24)
    p.text(230,final_y+38,'08 / 可复用成品与最终验收',62,INK,True)
    p.text(230,final_y+135,'资料与局部资产已可复用；不能把“文件齐全 / 可以看”当作完整三维世界已经完成。',38,RED,True)
    sections=[('成品是什么 / 如何验收',[
        '同一冻结场景自由移动，连续跨入口、进入室内、原位回望；不能随机位偷换图片或背景。',
        '墙、门、柜台和房间可选可改，所属高斯随动作正确变化，背面与露出面有支撑。',
        '同一几何 / 材质只改灯光，检查阴影与反射；空间与可操作性两道门槛分别通过。',
        '交付可重开的 .blend、几何、材质、绑定、尺度假设和来源。原图之外的内容明确标注为设计。']),
      ('本步骤技术 / 相关产品',[
        '已用：GLB / .blend / PLY、GLTFLoader / OrbitControls、FFmpeg、Python 同源只读服务与 SHA-256 校验。',
        'Unreal Engine / Arrival 展示 — 仅调研：引擎与作者漫游；不是我们的运河成品，也不能因引用开源项目就把它们归为开源库。',
        '网页继续保留实际效果、完整视频、三维 / 诊断、工程下载、结构预览与原始报告。',
        '本图是研究整理，不运行新模型、训练新高斯或改旧工程。']),
      ('现在有什么 / 对我们的价值',[
        '现有 6 段完整视频、6 个三维 / 诊断入口、39 份工程 / 几何文件；41 项原工程 / 高斯 / 视频哈希核对保持不变。',
        '可复用：原图高斯、参数化结构、门轴绑定、GLB 导出、连续镜头、独立对应 / 投影诊断和失败档案。',
        '应用价值：重复摆机位、影片预演、资产积累、用同一输入和门槛比较候选能力。',
        '仍未通过：完整共同空间、近景 / 背面外观、原高斯物理换光。世界模型或专门方法还要实测，尚无已获胜方案。'])]
    colw=(fw-160)/3
    final_ends=[]
    for i,(title,paragraphs) in enumerate(sections):
        x=230+i*(colw+30);yy=final_y+246
        p.text(x,yy,title,38,GREEN,True);yy+=76
        for text in paragraphs:yy=p.wrapped(x,yy,text,colw-42,32,MUTED,False,1.5)+27
        assert yy<final_y+fh-28,(title,yy)
        final_ends.append(yy)
    fh=math.ceil(max(final_ends)-final_y+36)
    p.commands[final_rect_index]=('rect',(180,final_y,fw,fh,MINT,LINE,24))
    p.product_mentions.append('Unreal Engine / Arrival 展示')
    p.panels.append({'id':'delivery','title':'08 / 交付与最终验收','x':180,'y':final_y,'width':fw,'height':fh,'experiments':['hybrid','cg','bound','bridge']})
    registered={p['name'] for p in D['products']};assert registered==set(p.product_mentions),(registered-set(p.product_mentions),set(p.product_mentions)-registered)
    covered={e for panel in p.panels for e in panel['experiments']};assert covered==set(EXP_INDEX)
    fy=final_y+fh+60
    p.wrapped(180,fy,'来源：本聊天、0003 研究文档、十次实验及既有工具 / 产品来源。外部能力与成本沿用此前研究快照，未新增账户 / API 调用。指标各有口径，不是算法通用排名；未通过不等于目标不可能。完整证据与现有效果见研究网页。',6040,29,MUTED,False,1.5)
    height=math.ceil(fy+220);p.export(height,snapshot)


if __name__=='__main__':main()

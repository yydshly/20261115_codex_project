"""One deterministic research poster: editable SVG + high-resolution PNG.

Uses only our experiment records, original result images and installed fonts.
No model inference; never changes the reference, Gaussian files or .blend files.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import base64
import hashlib
import html
import io
import json
import math
import re

PROJECT=Path(__file__).resolve().parents[1]
OUT=PROJECT/'assets/research-map'
W=3600
M=110
GAP=34
CW=W-2*M
INK='#203d35'; MUTED='#596e63'; GREEN='#163e38'; PAPER='#f6f3ec'
WHITE='#fffef9'; LINE='#cfdbcc'; ORANGE='#a35d36'; RED='#a8463c'; GOLD='#d9b985'
FONTS={}
def font(size,bold=False):
    key=(size,bold)
    if key not in FONTS:FONTS[key]=ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',size)
    return FONTS[key]


class Poster:
    def __init__(self):self.commands=[];self.sources=[];self.texts=[]
    def rect(self,x,y,w,h,fill=WHITE,stroke=None,r=20):self.commands.append(('rect',(x,y,w,h,fill,stroke,r)))
    def line(self,x,y,x2,y2,color=LINE,width=3):self.commands.append(('line',(x,y,x2,y2,color,width)))
    def ellipse(self,x,y,w,h,fill,stroke=None):self.commands.append(('ellipse',(x,y,w,h,fill,stroke)))
    def text(self,x,y,text,size=34,color=INK,bold=False):
        self.commands.append(('text',(x,y,text,size,color,bold)));self.texts.append(text)
    def wrapped(self,x,y,text,width,size=34,color=MUTED,bold=False,leading=1.5):
        f=font(size,bold); lines=[];current=''
        tokens=re.findall(r'[A-Za-z0-9][A-Za-z0-9_./+%−–-]*|\s+|.',text)
        closing=set('，。！？；：、）】》”’…,:;.!?)]')
        limit=width-size*1.1
        for token in tokens:
            if token=='\n':lines.append(current);current='';continue
            if f.getlength(token)>width:
                parts=list(token)
            else:parts=[token]
            for part in parts:
                if current and f.getlength(current+part)>limit:
                    if part in closing:current+=part
                    else:lines.append(current.rstrip());current=part.lstrip()
                else:current+=part
        if current:lines.append(current.rstrip())
        for i,value in enumerate(lines):self.text(x,y+i*size*leading,value,size,color,bold)
        return y+len(lines)*size*leading
    def image(self,path,x,y,w,h):
        path=PROJECT/path
        with Image.open(path) as source:
            thumb=ImageOps.contain(source.convert('RGB'),(int(w),int(h)),Image.Resampling.LANCZOS)
            memory=io.BytesIO();thumb.save(memory,format='JPEG',quality=90)
        px=x+(w-thumb.width)/2;py=y+(h-thumb.height)/2
        self.commands.append(('image',(px,py,thumb.width,thumb.height,memory.getvalue())))
        self.sources.append({'path':str(path.relative_to(PROJECT)).replace('\\','/'),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    def arrow(self,x,y,x2,y2,color=GREEN,width=5):
        self.line(x,y,x2,y2,color,width)
        angle=math.atan2(y2-y,x2-x)
        for side in [-1,1]:self.line(x2,y2,x2-20*math.cos(angle+side*.48),y2-20*math.sin(angle+side*.48),color,width)
    def section(self,y,n,title,subtitle=''):
        self.line(M,y,W-M,y,LINE,3);y+=35
        self.text(M,y,n,30,ORANGE,True);self.text(M+85,y-4,title,55,INK,True)
        y+=78
        if subtitle:y=self.wrapped(M,y,subtitle,CW,32,MUTED,leading=1.5)+24
        return y
    def panel(self,x,y,w,title,paragraphs,status=None,status_color=GREEN,fill=WHITE,min_height=0):
        start=len(self.commands);pad=38;top=y+32
        if status:
            self.text(x+pad,top,status,25,status_color,True);top+=47
        top=self.wrapped(x+pad,top,title,w-2*pad,42,INK,True,1.3)+23
        for text in paragraphs:
            top=self.wrapped(x+pad,top,text,w-2*pad,32,MUTED,leading=1.53)+17
        height=max(top-y+17,min_height)
        self.commands.insert(start,('rect',(x,y,w,height,fill,LINE,18)))
        return height
    def grid(self,y,cards,columns=2):
        width=(CW-GAP*(columns-1))/columns
        for offset in range(0,len(cards),columns):
            heights=[]
            for i,card in enumerate(cards[offset:offset+columns]):heights.append(self.panel(M+i*(width+GAP),y,width,**card))
            y+=max(heights)+GAP
        return y
    def export(self,height):
        image=Image.new('RGB',(W,height),PAPER);draw=ImageDraw.Draw(image)
        svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{height}" viewBox="0 0 {W} {height}">',
             '<title>从一张图，到一个可操作的三维世界：运河研究全景</title>',
             '<desc>目标、技术分工、十次真实实验、已用与仅调研工具、局限、价值和验收。2026-11-16 研究快照。</desc>',
             f'<rect width="{W}" height="{height}" fill="{PAPER}"/>']
        for kind,args in self.commands:
            if kind=='rect':
                x,y,w,h,fill,stroke,r=args;draw.rounded_rectangle((x,y,x+w,y+h),radius=r,fill=fill,outline=stroke,width=2)
                svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke or "none"}" stroke-width="2"/>')
            elif kind=='line':
                x,y,x2,y2,color,width=args;draw.line((x,y,x2,y2),fill=color,width=width)
                svg.append(f'<path d="M{x},{y} L{x2},{y2}" fill="none" stroke="{color}" stroke-width="{width}"/>')
            elif kind=='ellipse':
                x,y,w,h,fill,stroke=args;draw.ellipse((x,y,x+w,y+h),fill=fill,outline=stroke,width=2)
                svg.append(f'<ellipse cx="{x+w/2}" cy="{y+h/2}" rx="{w/2}" ry="{h/2}" fill="{fill}" stroke="{stroke or "none"}"/>')
            elif kind=='text':
                x,y,text,size,color,bold=args;draw.text((x,y),text,font=font(size,bold),fill=color,anchor='lt')
                svg.append(f'<text x="{x}" y="{y}" font-family="Microsoft YaHei,Noto Sans CJK SC,sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}" dominant-baseline="text-before-edge">{html.escape(text)}</text>')
            elif kind=='image':
                x,y,w,h,data=args
                with Image.open(io.BytesIO(data)) as thumb:image.paste(thumb,(round(x),round(y)))
                svg.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="data:image/jpeg;base64,{base64.b64encode(data).decode()}"/>')
        svg.append('</svg>');OUT.mkdir(parents=True,exist_ok=True)
        image.save(OUT/'canal-research-map.png',optimize=True)
        (OUT/'canal-research-map.svg').write_text('\n'.join(svg),encoding='utf-8')
        preview=ImageOps.contain(image,(1200,12000),Image.Resampling.LANCZOS)
        preview_path=PROJECT.parents[1]/'.local/canal-research-web/map-reading-preview.jpg'
        preview_path.parent.mkdir(parents=True,exist_ok=True);preview.save(preview_path,quality=88)
        metadata={'date':'2026-11-16','size':[W,height],'method':'Deterministic SVG / Pillow research figure, no AI image generation or 3D reconstruction',
                  'images':self.sources,'text':self.texts,'evidence':['README.md','vggt-colmap-3dgs.md','MEDIA-INTEGRATION.md','web/data.js','experiments/*/README.md'],
                  'boundaries':'Local results, upstream claims and untested candidates are separately labelled. Metrics are not common-condition model rankings. Original assets unchanged.'}
        (OUT/'provenance.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({'png':str(OUT/'canal-research-map.png'),'svg':str(OUT/'canal-research-map.svg'),'width':W,'height':height,'text_lines':len(self.texts)},ensure_ascii=False))


def main():
    p=Poster()
    p.text(M,70,'CANAL / FIELD NOTES 003 / 研究快照 2026.11.16',30,ORANGE,True)
    p.text(M,145,'从一张图，到一个可操作的三维世界',94,GREEN,True)
    p.wrapped(M,275,'我们的目标、分工、十次实验、走过的弯路、工具与产品、已经留下的能力，以及仍未解决的问题。',CW,38)
    y=395
    p.rect(M,y,CW,185,GREEN,r=20)
    p.text(M+40,y+28,'目标：同一空间，外观真实，结构可编辑，动作与灯光可控制。',48,WHITE,True)
    p.wrapped(M+40,y+103,'运河全景左右移动 → 靠近咖啡店 → 开门进入 → 转身看街道；还要看侧面、背面和室内，能在 Blender 中继续修改。',CW-80,33,'#d1dfd1')
    y+=220
    imagew=(CW-GAP*2)/3
    samples=[('assets/canal-single-vggt/reference.png','唯一输入：AI 运河概念图','没有其他实拍机位、尺度或隐藏室内真值。'),
             ('assets/canal-single-sharp/original.png','实际输出：单图 SHARP 高斯','保留原图观感；原视角相似不证明完整空间。'),
             ('assets/cafe-hybrid-prototype/blender-interior-warm.png','实际输出：Blender 设计室内','有结构和灯光，但不是从原图恢复的真实内部。')]
    for i,(path,title,note) in enumerate(samples):
        x=M+i*(imagew+GAP);p.rect(x,y,imagew,470,WHITE,LINE,15);p.image(path,x+10,y+10,imagew-20,330)
        p.text(x+24,y+355,title,33,INK,True);p.wrapped(x+24,y+412,note,imagew-48,25)
    y+=505
    p.rect(M,y,CW,170,'#eee6d8',r=16)
    p.text(M+35,y+25,'当前结论：局部能力已验证，完整三维世界尚未通过验收。',46,RED,True)
    p.wrapped(M+35,y+99,'首要缺口是跨视角持续共享的空间生成与补全；第二道门槛是实体、物体身份、材质与照明的可操作性。',CW-70,33)
    y+=215

    y=p.section(y,'01','我们现在怎样理解这条链路','算法、训练模型、三维表示与软件工具分工不同；AI 也可以学习几何，不能简化成“算法算位置、AI 认物体，拼起来就完成”。')
    blocks=[('图片与观测','可见外观与跨图对应'),('相机与几何','COLMAP / VGGT'),('空间生成与补全','未见面、内部与新视角'),('高斯外观＋实体结构','共享坐标、所属物体与绑定'),('独立验收','新视角、动作、编辑与换光')]
    bw=(CW-4*22)/5
    for i,(title,note) in enumerate(blocks):
        x=M+i*(bw+22);p.rect(x,y,bw,155,GREEN if i!=2 else '#8b583a',r=12)
        p.text(x+22,y+23,title,31,WHITE,True);p.wrapped(x+22,y+82,note,bw-44,25,'#d8e3d7')
        if i<4:p.arrow(x+bw+2,y+77,x+bw+20,y+77,ORANGE,4)
    y+=190
    roles=[
      dict(title='COLMAP：多图几何约束',status='仅调研 · 本图未运行',status_color=MUTED,paragraphs=['重叠照片 → 特征对应与 SfM → 相机与稀疏点；MVS 可继续得到深度和密集几何。尺度要定标，畸变与坐标要一致。','它不生成不存在的室内，也不会自动把点云变成规整、分件、有完整材质的 Blender 工程。']),
      dict(title='VGGT：训练过的几何预测模型',status='已实测 · 相机／深度头',paragraphs=['一张或多张图 → 相机、深度及点／轨迹等预测；可接 COLMAP 格式。它不是补图模型，也不是高斯表示。','模型能对冲突输入给出看似合理的空间。预测相机、点与置信度都要复核，不能当作真值或米制测量。']),
      dict(title='3DGS：三维外观表示与渲染',status='已实测 · 预测与融合输出',paragraphs=['空间里有许多带位置、尺度、旋转、颜色和不透明度的高斯；可由照片优化，也可由 SHARP 等模型直接预测。','有充分多视图支持时可以多角度观看。我们这次的局限来自单图信息与补全条件，不是高斯天生只能看一个角度。']),
      dict(title='网格＋Blender：结构与控制载体',status='已实测 · 参数化实体、门轴与渲染',paragraphs=['用顶点／面、物体层级、材质与灯光表达墙、门、柜台、房间。Agent／bpy 帮助组织部件、生成脚本、对照图像修正。','门能动不代表内外外观都正确。高斯转网格或绑定后仍要分件、补面、检查遮挡，并处理材质与照明。']),
    ]
    y=p.grid(y,roles)
    y=p.grid(y,[dict(title='高斯与实体怎样配合？',fill='#e5eee2',paragraphs=['高斯保留照片外观；网格承载可选部件、背面与控制。两者需要同一坐标、表面对应和所属关系。','我们已用 Blender 的实际门矩阵驱动门高斯。SuGaR／Frosting 是进一步的表面／网格编辑路线，但尚未在本图运行。']),dict(title='光照为什么是单独的问题？',fill='#f0e7d8',paragraphs=['照片与普通高斯颜色常含原照明、反光与阴影。给实体换灯，不会自动物理重照明原高斯。','要把材质与光照分离，或采用专门的可重照明方法。两张亮／暗图片、两套 PLY 缓存只能说明状态变化。'])])
    y=p.grid(y,[dict(title='真实地点：先增加观测',paragraphs=['重叠实拍 → 相机／几何 → 定标与重投影 → 可选高斯外观／参数化网格 → 留出视角验收。','Kotohibi 的价值在测量、参数／脚本分离和原机位核查；作者最新路线可跳过高斯，原仓库不包含完整采集数据。']),dict(title='我们的 AI 图：未知部分需要创作',paragraphs=['原图 → 受相机／共享空间约束的补全 → 多视角验证 → 稳定外观＋实体／材质 → 编辑与换光。','这条完整生成路线尚未验证通过。原图之外没有唯一隐藏真相，应明确哪些是原图依据、哪些是设计推测。'])])

    y=p.section(y,'02','我们实际做了什么，又学到了什么','历史起点是按概念图锚点制作的 V3／V4 参数化 Blender 场景；以下是随后十份实际实验。数字只对应各自检查口径，不是算法通用排名。')
    trials=[
      dict(title='01 / 单图 VGGT → Blender',status='实测 · 跑通，但效果未改善',status_color=RED,paragraphs=['原图预测深度／相机，再拟合既有语义场景。12 锚点 RMS：旧版 36.92px → 本轮 54.46px。','冻结输出后发现相机与拟合目标影响很大；换目标可到 17.80px，但只是拟合诊断，未产生新的改善渲染。']),
      dict(title='02 / 原图 → SHARP 高斯',status='实测 · 原机位和邻近视差成立',paragraphs=['独立从原图预测 1,179,648 个高斯，约 66MB；CPU FP32 推理 113.60 秒。未使用旧模型或 VGGT 输出。','真实渲染 5 机位、60 运动帧。原图外观保留较好，靠近、较大侧移和背面仍缺可靠内容。']),
      dict(title='03 / 固定新机位覆盖诊断',status='实测 · 只定位风险，未修复',status_color=ORANGE,paragraphs=['右侧约 5°离轴观察，源像素重投影未覆盖约 4.75%，风险区域约 12.61%。','这些是覆盖／深度边界诊断，包含反射、天空和真实物体边缘；不能当成错误率或场景完整度。']),
      dict(title='04 / 高斯＋Blender 咖啡店',status='实测 · 门联动通过，整体外观未过关',status_color=ORANGE,paragraphs=['新工程验证门轴、室内外与实体换灯；28 秒连续镜头从全景走近、开门进入、转身。门开到 75°。','门使用 Blender 实际求值矩阵，高斯一直开启。近景拉丝、侵入房间与背面缺失仍存在；室内为设计补建。']),
      dict(title='05 / 完整实体场景 → 高斯缓存',status='实测 · 保留为功能对照',status_color=RED,paragraphs=['设计完整 Blender 街区，再从 12 个 RGB-D 机位融合高斯；完成 36 秒实体镜头与暖／日光两套缓存。','能证明同场景多机位和结构功能，但外观变成 CG。你的纠正成立：它不能充当原图高斯复原已经完成。']),
      dict(title='06 / 原高斯的局部表面绑定',status='实测 · 原机位改善，多角度失败',status_color=RED,paragraphs=['保留 1,048,246 个原高斯条目逐字节相同；默认混合约 112.8 万高斯，原机位相对原高斯 PSNR 30.10dB。','门矩阵与遮挡约束有进展，近景仍有拉伸、错位和接缝。绑定不能凭空补出完整物体与未见面。']),
      dict(title='07 / 通用模型补左右视角',status='实测 · 生成完成，三维未证实',status_color=ORANGE,paragraphs=['内置 image_gen 生成左／右候选，保留红棚、店铺与石桥的大体身份；门窗、植物和石材等有重绘。','二维匹配／极线筛查有局部支持，但不是已验证三维点。“向左约 5°”是文字意图，不是数值相机约束。']),
      dict(title='08 / 室内、关灯与回望补图',status='实测 · 图片控制，非三维控制',status_color=ORANGE,paragraphs=['生成门口、门槛、室内开灯／关灯和回望；保留未达到目标机位的初稿。开关灯有 920 对筛选特征。','这些对应的位移中位 1.339px，只说明部分二维结构保留；房间整体布局、原位转身与物理换光仍未确认。']),
      dict(title='09 / VGGT 多图空间一致性',status='实测 · 局部分组成立，整体未连通',status_color=ORANGE,paragraphs=['7 图联合、外景／室内子集与照明控制，独立匹配后固定预测相机和深度做重投影检查。','外景与室内分别有局部支持；跨门口和回望缺可靠连接。3,960 个诊断点是预测样本，不能反过来证明空间已成立。']),
      dict(title='10 / A、B 入口补图与复检',status='实测 · 未通过，暂停自由补图主线',status_color=RED,paragraphs=['只再补两张 A／B，用同一口径运行 9 图、子集和图对。A—门口 53 对、中位 60.6px；B—门槛 87 对、29.5px。','新增对应没有打通入口，联合定位还有退化；B 实际仍偏门外，亦发现误配。未训练这批图的高斯，也未改旧模型。']),
    ]
    y=p.grid(y,trials)
    p.rect(M,y,CW,230,'#eee7dc',r=16)
    p.text(M+34,y+26,'诊断门槛与证据边界',38,ORANGE,True)
    p.wrapped(M+34,y+84,'至少 20 对筛选对应、两图各覆盖 6×4 网格的至少 4 格、至少 15 个有效投影；局部目标为中位 ≤5px、P90 ≤15px（画宽 1000px）。这是本研究自定门槛。',CW-68,31)
    p.wrapped(M+34,y+172,'稀疏重叠、误配、反射、状态变化、预测不稳定都可能影响结果；未通过不等于证明目标不可能。',CW-68,30,RED)
    y+=275

    y=p.section(y,'03','研究过哪些库、模型、产品？哪些真正用过？','标记以本张运河图为准。读过文档、存在本地接口、产品演示或开源仓库，都不等于已经在本图跑通。')
    tools=[
      dict(title='● 本图已实测：几何与数值',status='已有本地能力',paragraphs=['VGGT-1B / PyTorch：单图和多图相机／深度；后续使用 GPU 混合精度。','OpenCV SIFT / RANSAC：独立匹配与检查；NumPy / SciPy：拟合与数值处理。','Pillow / plyfile：真实图片、诊断图与高斯数据处理。单图深度有不确定性，仍要检验。']),
      dict(title='● 本图已实测：外观、结构与交付',status='已有本地能力',paragraphs=['Apple SHARP：单图直接预测高斯；3DGS：作为实际输出和渲染表示，非本批补图训练通过。','Blender 4.5.9 / Python bpy：实体、材质、门轴、Cycles、GLB。','Spark 2.4.0 / Three.js 0.187.0 / GLTFLoader / OrbitControls：浏览器真实三维；FFmpeg：实际帧编码视频。']),
      dict(title='● 已补图；△ 其他图像入口仅提及',status='后端型号与能力边界要明确',status_color=ORANGE,paragraphs=['已用内置 image_gen：左右、入口、室内和照明候选；工具未暴露精确后端型号。','ChatArt / GPT Image / NanoBanana / Seedream：只是此前接口／模型目录候选，本次未通过 ChatArt 调用。','多参考图与文字约束有帮助，但现有接口没有硬相机、深度或持续共享三维状态。']),
      dict(title='○ 几何与照片采集路线',status='仅资料研究 · 未在本图运行',status_color=MUTED,paragraphs=['COLMAP / VGGT-Omega / DUSt3R：相机与几何的不同路线。','Agisoft Metashape：摄影测量产品；真实多位置采集仍重要。','球面相机／360° 是采集方式；同光心旋转不能替代三角测量的移动基线。']),
      dict(title='○ 专门的新视角与空间扩展',status='仅资料研究 · 未安装或运行本图',status_color=MUTED,paragraphs=['ViewCrafter：点云投影与相机轨迹引导视频扩散，再迭代几何，可接 3DGS。','GEN3C：显式相机与共享 3D 缓存引导生成；WonderWorld：共享 Gaussian surfel 场景扩展。','它们增加空间依据，但不保证完整内部、干净网格、语义分件或物理换光。']),
      dict(title='○ 高斯训练、转网格与软件桥接',status='仅资料研究 · 不能算已试成功',status_color=MUTED,paragraphs=['LichtFeld Studio：作者可选高斯训练／检查；未在本图训练。','SuGaR / Gaussian Frosting / Blender addon：表面／网格与可编辑高斯层；完整链路需要有位姿的多视图数据。','MCP for Blender 是 Agent 操作桥。我们用了 bpy，但通用 MCP 连接未验证。Unreal / Arrival 属交付／作者展示参考。']),
      dict(title='○ Kotohibi 的公开流程与周边',status='已读／静态审阅 · 未复跑完整实景',status_color=MUTED,paragraphs=['ai-wide-area-modeling：Skill、测量、参数化生成和验收；3DGS_pipeline_guide：采集到训练指南。','Extract_sharpest_frame：抽清晰帧；Metashape_360_to_COLMAP_plane：旧版开源坐标转换。','360 MCConverter 为商业增强路线，不等于旧版功能；原作者场景与教程不属于我们的实验成品。']),
      dict(title='○ 世界模型、产品和 API 要分清',status='官方能力研究 · 本图尚未调用',status_color=MUTED,paragraphs=['World Labs Atlas：模型与工具体系，强调带相机的共享空间上下文；Viewfinder / Chisel / Splats to Mesh / Relight。Marble 是同公司的产品。','Viggle JST-2：持续三维 token 表示再解码；PINOC 是创作产品入口，Viggle API 是服务接口。','不能全部简化成独立补几张图再 COLMAP。场景、网格、编辑和灯光的实际质量仍需用本图测试。']),
    ]
    y=p.grid(y,tools)
    y=p.grid(y,[dict(title='算力、费用与许可',status='条件快照，不是本机普遍承诺',status_color=ORANGE,paragraphs=['本机 RTX 4070 Laptop 8GB 级、RAM 约 15.6GiB。VGGT 后续小批实测约 3.2GiB 自有峰值已分配，不代表整个链路最低配置。','官方示例：ViewCrafter 约 18.3／23.5GB；GEN3C 完整 offload 约 43GB；WonderWorld 48GB 级。均非本机实测。','开源代码、权重许可、可商用和免费额度分别核对；从零训练世界模型需要数据、算力与评估，不是把脚本拼好就具备。']),dict(title='产品额度：只保留已查到的事实',status='2026-11-16 官方页面快照',status_color=ORANGE,paragraphs=['PINOC：一次性 60 试用积分，免费档限个人评估／原型，动作与角色各一次导出；不等于场景无限免费。','Viggle API：新账户 100 积分＝1 美元；Scene Model 每次模型运行每视图 0.01 美元，全景按 6 视图。','Atlas 入口需登录，本次未确认账户额度／套餐。没有用本图调用这些服务，也没有消耗它们的付费额度。'])])

    y=p.section(y,'04','反复澄清后，最需要记住的六件事')
    clarifications=[
      dict(title='高斯不是“一角度专用”',paragraphs=['有观测支持的高斯可以多视角。单图 SHARP 的未见面和深度不充分，才使这次的大幅移动失真。']),
      dict(title='相似图片不是共同世界',paragraphs=['物体名称、颜色和店铺顺序相似只是外观线索。固定几何在不同相机下的投影、遮挡与身份要一致。']),
      dict(title='相机预测和点云不是证明',paragraphs=['F 拟合、重建程序跑通、VGGT 相机图都不能单独证明空间正确。要有独立对应、子集稳定性与留出检查。']),
      dict(title='换机位、动作、形变、换光分开验收',paragraphs=['相机移动、刚性开门、骨骼／形变和物理照明是不同能力。一个控制成功，不能替其他项目过关。']),
      dict(title='绑定或转网格不会自动补世界',paragraphs=['高斯与实体共享矩阵，可以传递动作；隐藏物体、部件对应、网格拓扑、背面和材质仍需补足。']),
      dict(title='做得出来与已经做到要分清',paragraphs=['可以设计／生成原图之外的完整场景，但不是恢复唯一真实地点。当前没有验证出自动达到最终质量的链路。']),
    ]
    y=p.grid(y,clarifications)

    y=p.section(y,'05','对我们留下了什么价值？')
    y=p.grid(y,[dict(title='可复用能力：把经验变成资产',status='已经留下',paragraphs=['单图高斯推理、真实浏览器渲染、参数化 Blender 结构、门轴绑定、GLB 导出、连续镜头、独立对应与投影诊断。','能保存输入、版本、参数、提示词、误差和失败；下一次用统一条件比较候选，减少只凭漂亮画面决策。']),dict(title='应用价值：场景、影片与后续产品',status='已具备局部基础，最终质量另验',paragraphs=['同一空间重复摆机位、走位、做影片预演；结构／材质／绑定可继续用于 Blender 和网页三维。','将来服务空间档案、数字孪生或历史复原时，还须真实观测、实测尺寸与独立史料；不能把 AI 想象当历史事实。'])])
    p.rect(M,y,CW,250,GREEN,r=18)
    p.text(M+38,y+27,'已交付的可查看档案，不等于已完成最终三维世界',43,WHITE,True)
    p.text(M+38,y+104,'6 段完整视频  /  6 个三维与诊断入口  /  96 项去重效果  /  39 份工程与几何文件',35,GOLD,True)
    p.wrapped(M+38,y+172,'上一轮接入快照，不含本总图；另有 375 个文件统一入口、8 个 GLB 预览。41 项原工程／高斯／视频哈希一致，旧模型保持原样。',CW-76,30,'#cfdfd0')
    y+=295

    y=p.section(y,'06','下一步以两道验收推进，先过第一道')
    y=p.grid(y,[dict(title='门槛一：真正共用一个三维空间',status='当前：完整入口／回望未通过',status_color=RED,fill='#f2e6dd',paragraphs=['冻结同一场景，连续从室外移动、开门进入、原位回望；不能按机位偷偷换图或换背景。','门框、柜台、桥和墙角保留身份；有重叠支持、正确遮挡、相机／深度一致，并用未参与拟合的视角复核。']),dict(title='门槛二：实体、外观与灯光可操作',status='当前：局部门动作通过，整体仍未过关',status_color=RED,fill='#f2e6dd',paragraphs=['墙、门、柜台和房间可选、可改、有背面支撑；所属高斯随动作正确变化。','同一几何／材质下换灯，核对阴影和反射；交付可重开的 .blend、绑定、材质、尺度假设和来源。'])])
    y=p.grid(y,[dict(title='候选路线：有共享空间约束的补全',paragraphs=['固定原图、检查机位和验收口径，比较 ViewCrafter／GEN3C 或成熟世界生成服务能否跨过入口；本机资源不足先评估外部算力。','这些是待测试候选，没有已获胜的方案。外部模型接入仍待决定，不继续堆通用自由补图冒充进展。']),dict(title='自有路线：显式设计，再约束外观',paragraphs=['自己可以实现几何、渲染、绑定与校验；也可以锁定未知布局，用投影／遮挡约束生成外观，代价是更多资产制作和人工检查。','共同空间通过后，再做高斯—网格编辑与材质／照明处理。多视角图、视频、高斯和干净可编辑资产分别验收。'])])
    p.line(M,y,W-M,y,LINE,3);y+=30
    p.wrapped(M,y,'来源：本聊天的问题演进、0003 项目的原始研究与十份实验记录；工具版本、提示词、输入哈希、实际图片和完整来源见研究网页。',CW,28,MUTED)
    y+=92
    p.wrapped(M,y,'制作：代码矢量排版与真实实验图缩略展示，非 AI 新生成场景。本图是截至 2026-11-16 的研究快照；已实测、官方声明、推断与待验证项分开标注。',CW,27,MUTED)
    p.export(math.ceil(y+125))


if __name__=='__main__':main()

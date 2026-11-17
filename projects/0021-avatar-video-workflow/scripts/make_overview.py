"""Typeset the complete research into one measured PNG and standalone linked SVG.

Existing sample stills are placed without altering their contents. Chinese copy
is rendered from editable JSON and the actual research record, not generated.
"""
from __future__ import annotations
from pathlib import Path
from html import escape
import base64,hashlib,json,math,xml.etree.ElementTree as ET
from PIL import Image,ImageDraw,ImageFont,ImageOps

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'assets'
R=json.loads((ROOT/'research.json').read_text(encoding='utf-8'))
D=json.loads((ROOT/'overview-summary.json').read_text(encoding='utf-8'))
W,M,GAP=3200,120,28
INNER=W-2*M
PAPER,WHITE,INK='#F4F1EA','#FDFCF9','#25352F'
MUTED,LINE='#607067','#D4DCD1'
RED,RED_SOFT='#BD3F4C','#F1E3DE'
GREEN,GREEN_SOFT='#375F4B','#E4ECE0'
AMBER,AMBER_SOFT='#926126','#F2E9D8'

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def h(value):return escape(str(value),quote=True)

class Board:
    def __init__(self):
        self.ops=[];self.fonts={};self.measure=ImageDraw.Draw(Image.new('RGB',(1,1)))
        self.texts=[];self.section_records=[];self.sources={};self.card_bounds=[]
    def font(self,size,bold=False):
        key=(round(size),bold)
        if key not in self.fonts:self.fonts[key]=ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',round(size))
        return self.fonts[key]
    def width(self,text,size,bold=False):return self.measure.textlength(str(text),font=self.font(size,bold))
    def lines(self,text,width,size=32,bold=False):
        result=[]
        for paragraph in str(text).split('\n'):
            line=''
            for c in paragraph:
                if line and self.width(line+c,size,bold)>width:
                    if c in '，。；：！？、）》】”’' and len(line)>1:
                        result.append(line[:-1]);line=line[-1]+c
                    else:result.append(line);line=c
                else:line+=c
            result.append(line)
        return result
    def text(self,text,x,y,size=32,fill=INK,bold=False,width=None,link=None):
        text=str(text);tw=self.width(text,size,bold)
        if width is not None and tw>width+1:raise ValueError(f'Text wider than its column: {text}')
        if x<0 or x+tw>W+1 or y<0:raise ValueError(f'Text outside canvas: {text}')
        self.ops.append(('text',text,x,y,size,fill,bold,link));self.texts.append({'text':text,'x':x,'y':y,'width':tw,'size':size})
    def wrap(self,text,x,y,width,size=32,fill=INK,bold=False,leading=None,link=None):
        leading=leading or round(size*1.48)
        lines=self.lines(text,width,size,bold)
        for i,line in enumerate(lines):self.text(line,x,y+i*leading,size,fill,bold,width,link)
        return len(lines)*leading
    def rect(self,x,y,w,h,fill=WHITE,stroke=LINE,radius=18,sw=2):
        self.ops.append(('rect',x,y,w,h,fill,stroke,radius,sw))
    def line(self,x1,y1,x2,y2,fill=LINE,sw=3):self.ops.append(('line',x1,y1,x2,y2,fill,sw))
    def polygon(self,points,fill=GREEN,stroke=None,sw=2):self.ops.append(('polygon',points,fill,stroke,sw))
    def arrow(self,points,fill=GREEN,sw=4):
        for a,b in zip(points,points[1:]):self.line(*a,*b,fill,sw)
        a,b=points[-2:];angle=math.atan2(b[1]-a[1],b[0]-a[0]);length=14
        head=[b,(b[0]-length*math.cos(angle-.55),b[1]-length*math.sin(angle-.55)),(b[0]-length*math.cos(angle+.55),b[1]-length*math.sin(angle+.55))]
        self.polygon(head,fill)
    def image(self,name,x,y,w,hgt,background=None):
        path=ASSETS/name
        if not path.is_file():raise FileNotFoundError(path)
        self.sources[name]={'file':name,'sha256':sha(path)}
        self.ops.append(('image',name,x,y,w,hgt,background))
    def tag(self,label,x,y,kind='verified',size=24):
        fill,fg=(GREEN_SOFT,GREEN) if kind=='verified' else (AMBER_SOFT,AMBER) if kind=='pending' else (RED_SOFT,RED)
        width=self.width(label,size,True)+30
        self.rect(x,y,width,size+18,fill,None,8,0);self.text(label,x+15,y+7,size,fg,True)
        return width
    def section(self,n,title,description,y):
        y+=72
        self.line(M,y,W-M,y,INK,3)
        self.text(n,M,y+31,32,RED,True)
        title_height=self.wrap(title,M+92,y+20,INNER-92,58,INK,True,leading=78)
        current=y+20+max(title_height,74)+16
        current+=self.wrap(description,M,current,INNER,31,MUTED,leading=45)
        self.section_records.append({'number':n,'title':title,'top':y,'content_top':current+29})
        return current+29
    def card_height(self,spec,width):
        pad=32;inner=width-2*pad;y=pad
        if spec.get('image'):y+=(width-32)*9/16+24
        if spec.get('tag'):y+=46+16
        if spec.get('kicker'):y+=36+9
        y+=len(self.lines(spec['title'],inner,spec.get('title_size',40),True))*round(spec.get('title_size',40)*1.35)+18
        size=spec.get('size',31);leading=round(size*1.42)
        for block in spec.get('blocks',[]):
            label,value=block[:2]
            text=(label+'｜' if label else '')+value
            y+=len(self.lines(text,inner,size))*leading+14
        return y+pad-12
    def card(self,spec,x,y,width,height=None):
        pad=32;inner=width-2*pad;hh=height or self.card_height(spec,width)
        self.rect(x,y,width,hh,spec.get('fill',WHITE),spec.get('stroke',LINE),18)
        cursor=y+pad
        if spec.get('image'):
            ih=(width-32)*9/16;self.image(spec['image'],x+16,cursor,width-32,ih,PAPER);cursor+=ih+24
        if spec.get('tag'):
            self.tag(spec['tag'],x+pad,cursor,spec.get('kind','verified'),23);cursor+=62
        if spec.get('kicker'):
            self.text(spec['kicker'],x+pad,cursor,25,MUTED,False,inner);cursor+=45
        title_size=spec.get('title_size',40)
        cursor+=self.wrap(spec['title'],x+pad,cursor,inner,title_size,INK,True,round(title_size*1.35))+18
        size=spec.get('size',31)
        for block in spec.get('blocks',[]):
            label,value=block[:2];fg=block[2] if len(block)>2 else MUTED
            text=(label+'｜' if label else '')+value
            link=block[3] if len(block)>3 else None
            cursor+=self.wrap(text,x+pad,cursor,inner,size,fg,False,round(size*1.42),link)+14
        if cursor>y+hh-pad+16:raise ValueError('Card clipped: '+spec['title'])
        self.card_bounds.append({'title':spec['title'],'x':x,'y':y,'width':width,'height':hh,'content_end':cursor})
        return hh
    def grid(self,specs,y,cols=2,width=INNER,x=M,gap=GAP):
        cw=(width-(cols-1)*gap)/cols
        for offset in range(0,len(specs),cols):
            row=specs[offset:offset+cols];rh=max(self.card_height(s,cw) for s in row)
            for n,spec in enumerate(row):self.card(spec,x+n*(cw+gap),y,cw,rh)
            y+=rh+gap
        return y-gap

    def save(self,height):
        height=math.ceil(height)
        if height>27500:
            print(json.dumps({'height':height,'sections':self.section_records},ensure_ascii=False))
            raise ValueError(f'Poster too tall to review as one image: {height}')
        if any(t['y']+t['size']>height for t in self.texts):raise ValueError('Bottom edge clips text')
        image=Image.new('RGB',(W,height),PAPER);draw=ImageDraw.Draw(image)
        svg=[];encoded={}
        for op in self.ops:
            kind=op[0]
            if kind=='rect':
                _,x,y,w,hh,fill,stroke,radius,sw=op
                draw.rounded_rectangle((round(x),round(y),round(x+w),round(y+hh)),radius=radius,fill=fill,outline=stroke,width=sw)
                svg.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{hh:.1f}" rx="{radius}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{sw}"/>')
            elif kind=='line':
                _,x1,y1,x2,y2,fill,sw=op;draw.line((x1,y1,x2,y2),fill=fill,width=sw)
                svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{fill}" stroke-width="{sw}"/>')
            elif kind=='polygon':
                _,points,fill,stroke,sw=op;draw.polygon(points,fill=fill,outline=stroke,width=sw)
                svg.append(f'<polygon points="{" ".join(f"{a},{b}" for a,b in points)}" fill="{fill}" stroke="{stroke or "none"}" stroke-width="{sw}"/>')
            elif kind=='text':
                _,text,x,y,size,fill,bold,link=op
                draw.text((round(x),round(y)),text,font=self.font(size,bold),fill=fill,anchor='lt')
                element=f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="{700 if bold else 400}" fill="{fill}" dominant-baseline="text-before-edge">{h(text)}</text>'
                svg.append(f'<a href="{h(link)}" target="_blank" rel="noreferrer">{element}</a>' if link else element)
            elif kind=='image':
                _,name,x,y,w,hh,background=op
                if background:draw.rectangle((round(x),round(y),round(x+w),round(y+hh)),fill=background)
                with Image.open(ASSETS/name) as src:
                    src=src.convert('RGBA');scaled=ImageOps.contain(src,(round(w),round(hh)),Image.Resampling.LANCZOS)
                    image.paste(scaled,(round(x+(w-scaled.width)/2),round(y+(hh-scaled.height)/2)),scaled)
                if name not in encoded:
                    mime='image/png' if name.endswith('.png') else 'image/jpeg'
                    encoded[name]='data:'+mime+';base64,'+base64.b64encode((ASSETS/name).read_bytes()).decode('ascii')
                if background:svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{hh}" fill="{background}"/>')
                svg.append(f'<image href="{encoded[name]}" x="{x}" y="{y}" width="{w}" height="{hh}" preserveAspectRatio="xMidYMid meet"/>')
        png=ASSETS/'avatar-research-overview-v1.png';image.save(png,compress_level=6)
        doc=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{height}" viewBox="0 0 {W} {height}" role="img" aria-labelledby="title desc"><title id="title">数字人口播制作：理解、研究、效果、思路与价值全景图</title><desc id="desc">完整展开四次样片、四层能力、八项效果、八步流程、人物图表分配、平台选型、模板来历、六项价值、后续路线、28个问题和实测来源；已做与待验证分开标注。</desc><style>text{{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif}}a:hover text{{text-decoration:underline}}</style><rect width="{W}" height="{height}" fill="{PAPER}"/>{''.join(svg)}</svg>'''
        svgpath=ASSETS/'avatar-research-overview-v1.svg';svgpath.write_text(doc,encoding='utf-8')
        ET.fromstring(doc)
        qa=ROOT/'.local'/'overview-qa';qa.mkdir(parents=True,exist_ok=True)
        # Views are taken from this same finished drawing for visual QA.
        thumbnail=image.copy();thumbnail.thumbnail((1280,10000),Image.Resampling.LANCZOS);thumbnail.save(qa/'whole-preview.jpg',quality=90)
        crop_names={'02':'effects','06':'layouts','08':'template','09':'value','12':'questions','14':'sources'}
        for section in self.section_records:
            if section['number'] in crop_names:
                top=max(0,round(section['top']-20));bottom=min(height,top+1600)
                part=image.crop((0,top,W,bottom));part.thumbnail((1600,1100),Image.Resampling.LANCZOS)
                part.save(qa/(crop_names[section['number']]+'.jpg'),quality=94)
        # The cover is a clear entry to the full image, not a replacement for it.
        cover=image.crop((0,0,W,min(1700,height)));cover.thumbnail((1600,1000),Image.Resampling.LANCZOS);cover.save(ASSETS/'overview-preview.jpg',quality=92)
        text='\n'.join(t['text'] for t in self.texts)
        for required in ('avatar-motion-template','全屏图表','0.999889','同一人物','12.5%','候选','后期'):
            if required not in text:raise ValueError('Required concept missing: '+required)
        record={'schema_version':1,'date':D['date'],'method':'Original deterministic Pillow + SVG typesetting with unchanged existing sample stills; no new AI image or video generation',
            'width':W,'height':height,'pixels':W*height,'rendered_text_characters':sum(len(t['text']) for t in self.texts),
            'sections':self.section_records,'question_count':len(R['questions'])+len(D['latest_clarifications']),
            'source_files':[{'file':'research.json','sha256':sha(ROOT/'research.json')},{'file':'overview-summary.json','sha256':sha(ROOT/'overview-summary.json')}],
            'source_images':list(self.sources.values()),'text_bounds_checked':True,'cards_checked':len(self.card_bounds),
            'files':[{'file':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in (png,svgpath,ASSETS/'overview-preview.jpg')],
            'scope':D['scope'],'credits':D['credits']}
        (ASSETS/'overview-manifest.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (qa/'text-bounds.json').write_text(json.dumps(self.texts,ensure_ascii=False),encoding='utf-8')
        print(json.dumps({k:record[k] for k in ('width','height','pixels','rendered_text_characters','question_count','cards_checked')}))
        return record

def layouts(b,y):
    cw=(INNER-3*GAP)/4;picture_h=360
    heights=[]
    for title,status,use,limit in D['layouts']:
        spec={'title':title,'tag':status,'kind':'verified' if status=='已实测' else 'pending',
            'blocks':[('表达作用',use),('要注意',limit,AMBER)],'size':29}
        heights.append(b.card_height(spec,cw)+picture_h+32)
    hh=max(heights)
    for n,(title,status,use,limit) in enumerate(D['layouts']):
        x=M+n*(cw+GAP);b.rect(x,y,cw,hh)
        px,py,pw,ph=x+20,y+20,cw-40,picture_h
        b.rect(px,py,pw,ph,'#EEE8DA',None,8,0)
        if n in (0,1):
            if n==0:
                b.text('核心观点',px+23,py+65,31,INK,True,pw*.52)
                b.line(px+23,py+127,px+pw*.5,py+127,RED,6)
                for j in range(3):b.line(px+23,py+167+j*34,px+pw*.44,py+167+j*34,'#A5B1A1',5)
            else:
                b.text('示意数据',px+20,py+25,24,MUTED)
                for j,v in enumerate((42,65,84)):
                    bx=px+30+j*82;bh=v*2.2;b.rect(bx,py+290-bh,52,bh,'#A1BBA7',None,3,0)
                    b.text(str(v),bx,py+257-bh,23,GREEN)
                b.text('A      B      C',px+33,py+305,22,MUTED)
            b.image('presenter.png',px+pw*.52,py+12,pw*.46,ph-12)
        elif n==2:
            b.text('图表独立呈现',px+24,py+23,27,INK,True)
            for j,v in enumerate((42,65,84)):
                bx=px+62+j*160;bh=v*2.1;b.rect(bx,py+290-bh,92,bh,'#A1BBA7',None,4,0)
                b.text(str(v),bx+20,py+252-bh,27,GREEN,True)
            b.text('A                 B                 C',px+91,py+305,23,MUTED)
        else:b.image('scene-poster.jpg',px,py,pw,ph)
        content_y=y+picture_h+46
        b.tag(status,x+32,content_y,'verified' if status=='已实测' else 'pending',22);content_y+=58
        content_y+=b.wrap(title,x+32,content_y,cw-64,39,INK,True,54)+16
        content_y+=b.wrap(use,x+32,content_y,cw-64,29,MUTED,leading=44)+20
        b.wrap(limit,x+32,content_y,cw-64,28,AMBER,leading=42)
    y+=hh+28
    b.rect(M,y,INNER,94,AMBER_SOFT,None,10,0)
    b.wrap('布局中的 A/B/C 数值只作示意，不对应原声事实；真实图表尚未接入当前视频模板。',M+25,y+25,INNER-50,31,AMBER,True)
    return y+94

def main():
    b=Board();y=82
    b.text('021 / AVATAR VIDEO WORKFLOW / RESEARCH ATLAS',M,y,29,MUTED)
    b.tag('已有口播后期已跑通',W-M-425,y-1,'verified',25)
    y+=83;b.text(D['title'],M,y,138,INK,True,INNER);y+=175
    b.text(D['subtitle'],M,y,53,RED,False,INNER);y+=98
    b.rect(M,y,INNER,115,GREEN,None,14,0)
    b.wrap(D['thesis'],M+30,y+30,INNER-60,43,'#FBF8ED',True,62);y+=150
    y+=b.wrap(D['scope'],M,y,INNER,31,MUTED,leading=45)+28
    counts=[('4 类','实际制作验证'),('8 项','效果与内容层'),('28 问','26 问归档 + 2 次澄清'),('1 套','本次创建的个人模板')]
    cw=(INNER-3*GAP)/4
    for n,(number,label) in enumerate(counts):
        x=M+n*(cw+GAP);b.rect(x,y,cw,146,WHITE);b.text(number,x+28,y+18,54,INK,True);b.text(label,x+28,y+98,26,MUTED,width=cw-56)
    y+=146

    y=b.section('01','理解的核心：四层能力，组织成一条制作链',
        '先确定内容与人物是否准确可用，再安排时间轴、画面层与声音。模型、平台、编排与后期承担不同工作。',y)
    specs=[{'title':x['title'],'kicker':x['n']+' / '+x['role'],'tag':x['status'],'kind':'pending' if x['n']=='01' else 'verified','size':30,
        'blocks':[('解决什么',x['detail']),('输入 → 交付',x['input']+' → '+x['output'])]} for x in R['layers']]
    y=b.grid(specs,y,4)
    y+=28
    evolution=[{'title':title,'title_size':34,'size':28,'blocks':[('',text)]} for title,text in D['evolution']]
    y=b.grid(evolution,y,3)

    y=b.section('02','实际效果：从单项验证，到完整片与换配置',
        '以下是真实保存的输出静帧。人物与原声来自 @tm_uchal；中文是效果示意文案，未改写原声台词。',y)
    media={x['id']:x for x in R['media']};specs=[]
    for id in ('matting','scene','complete','template'):
        x=media[id]
        specs.append({'title':x['title'],'image':'complete-storyboard.jpg' if id=='complete' else x['poster'],
            'kicker':f'{x["duration"]:g} 秒 / {x["fps"]} fps / 已实际导出','size':30,
            'blocks':[('画面效果',x['description']),('实际依据',x['proof'],GREEN),('可推出的范围',x['limit'],AMBER)]})
    y=b.grid(specs,y,2)

    y=b.section('03','八项效果：实现方法、表达作用与检查边界',
        '软件和效果分开看：可控后期处理人物与文字，真实三维构成空间。事实图表是下一层内容能力。',y)
    specs=[]
    for i,x in enumerate(R['effects'],1):
        specs.append({'title':f'{i:02} · {x["title"]}','title_size':36,'tag':x['state'],'kind':'verified' if x['state']=='已实测' else 'pending','size':28,
            'blocks':[('怎么实现',x['method']),('为什么用',x['value'],GREEN),('检查与限制',x['inspect']+' '+x['limit'],AMBER)]})
    y=b.grid(specs,y,2)

    y=b.section('04','制作思路：用同一时间轴串起八个步骤',
        '本轮可直接执行的是“已有同步口播 → 本地后期”。脚本、音轨或分镜也可以先行，但所有层最终要对齐。',y)
    specs=[{'title':f'{i:02} · {x["title"]}','title_size':34,'size':28,
        'blocks':[('输入',x['input']),('输出',x['output'],GREEN),('工具',x['tools']),('当前状态',x['verified'],AMBER)]} for i,x in enumerate(R['workflow'],1)]
    y=b.grid(specs,y,4)

    y=b.section('05','10 秒样片：转场跟随画面，声音保持连续',
        '条带宽度按真实片长比例；每个编号对应下方时间段。人物口型在输出帧与三维屏幕中都读取对应源时间。',y)
    colors=[GREEN,'#748F7B',RED,'#C27E75','#445D6B','#AA9571','#A46F3A',GREEN]
    bar_y=y+8
    for i,x in enumerate(R['timeline']):
        xx=M+INNER*x['start']/10;ww=INNER*(x['end']-x['start'])/10
        b.rect(xx,bar_y,ww-2,88,colors[i],None,2,0)
        label=str(i+1);tw=b.width(label,32,True);b.text(label,xx+(ww-tw)/2,bar_y+23,32,'#FFF9EF',True)
    b.line(M,bar_y+117,W-M,bar_y+117,GREEN,7)
    b.text('0 秒',M,bar_y+137,27,GREEN);b.text('连续原声 0–10 秒；没有重复拼接两段旧声音',M+650,bar_y+134,32,GREEN,True);b.text('10 秒',W-M-100,bar_y+137,27,GREEN)
    y=bar_y+203
    specs=[{'title':f'{i:02} · {x["start"]:g}–{x["end"]:g}s  {x["title"]}','title_size':33,'size':28,'blocks':[('',x['detail'])]} for i,x in enumerate(R['timeline'],1)]
    y=b.grid(specs,y,2)
    y+=28;y=b.grid([{'title':title,'tag':'本轮发现并处理','size':30,'blocks':[('',text)]} for title,text in D['pitfalls']],y,2)

    y=b.section('06','人物与内容：按表达任务分配画面',
        '人物负责识别、讲述和连接，图表负责精确比较与证据。下面区分已做的布局和待接入的内容方案。',y)
    y=layouts(b,y)
    y+=28
    specs=[{'title':f'{i:02} · {title}','title_size':32,'size':29,'fill':GREEN_SOFT,'blocks':[('',text)]} for i,(title,text) in enumerate(D['accuracy'],1)]
    y=b.grid(specs,y,5)
    y+=24;y+=b.wrap('准确性要分别检查：事实是否正确、文字与图形是否保真、画面是否与真实台词出现在同一时刻。',M,y,INNER,32,RED,True)

    y=b.section('07','模型与平台：先分清角色，再决定怎样组合',
        '供应商比较是能力与接入思路整理，不是实际效果横评。资料核对截至 2026-11-17；本轮只实际运行了本地后期路线。',y)
    specs=[]
    for x in R['providers']:
        specs.append({'title':x['name'],'tag':x['state'],'kind':'verified' if x['id']=='local' else 'pending','kicker':x['type'],'size':29,
            'blocks':[('承担什么',x['role']),('何时考虑',x['use']),('约束与边界',x['boundary'],AMBER),('接入说明',x['access'])]})
    y=b.grid(specs,y,2)
    y+=27
    note='接口资料更新：Gemini Developer API 中的 Veo 3.1 Preview 被列为 2026-10-22 下线；Google Cloud 的 GA 型号是独立入口。不要直接沿用旧 Preview 示例或单价。'
    nh=len(b.lines(note,INNER-54,31))*47+48;b.rect(M,y,INNER,nh,AMBER_SOFT,None,12,0);b.wrap(note,M+27,y+24,INNER-54,31,AMBER,True,47);y+=nh

    y=b.section('08','模板是什么：本次创建的可复用后期入口',
        '$avatar-motion-template 是这套个人技能的调用名。也可以直接说“沿用上次那套口播后期效果”。',y)
    bh=len(b.lines(D['template_origin'],INNER-64,34))*51+54;b.rect(M,y,INNER,bh,GREEN_SOFT,None,12,0);b.wrap(D['template_origin'],M+32,y+26,INNER-64,34,INK,leading=51);y+=bh+28
    specs=[{'title':title,'title_size':35,'size':30,'blocks':[('',text)]} for title,text in D['template_io']]
    y=b.grid(specs,y,4)
    y+=30
    b.text('同一套素材，改哪些内容会重新计算？',M,y,40,INK,True);y+=76
    col=[M,M+1080,M+1460,M+1840,W-M]
    headers=['改变的内容','抠像缓存','三维缓存','重新执行的部分']
    b.rect(M,y,INNER,75,GREEN,None,8,0)
    for i,label in enumerate(headers):b.text(label,col[i]+25,y+22,28,'#FBF8EC',True,width=col[i+1]-col[i]-50)
    y+=75
    for n,row in enumerate(D['cache']):
        rh=max(len(b.lines(cell,col[i+1]-col[i]-50,29)) for i,cell in enumerate(row))*44+43
        b.rect(M,y,INNER,rh,WHITE if n%2==0 else '#EDEFE6',None,0,0)
        for i,cell in enumerate(row):b.wrap(cell,col[i]+25,y+20,col[i+1]-col[i]-50,29,GREEN if cell=='复用' else AMBER if cell=='更新' else INK,False,44)
        y+=rh
    y+=27
    specs=[{'title':'已经沉淀的资产','title_size':36,'size':30,'blocks':[('', '个人技能 + 独立脚本 + JSON 预设 + SRT 导入 + 排版预检 + 分层缓存 + 实测记录 + 可编辑三维场景。')], 'fill':GREEN_SOFT},
        {'title':'使用前仍需满足的条件','title_size':36,'size':30,'blocks':[('', '输入要有同步声音与嘴型。换真实台词，需要对应口播。网页负责研究和配置导出，本机 Python / Blender 执行制作。')],'fill':AMBER_SOFT}]
    y=b.grid(specs,y,2)
    y+=25
    y+=b.wrap('默认 10 秒 / 1280×720 / 24 fps；代码支持 5–180 秒，已实际验证的是 5、6、10 秒，未证明所有时长与人物都能稳定通过。',M,y,INNER,30,MUTED)

    y=b.section('09','价值的三层理解：复用 → 修改 → 制作规则',
        '对这次成果而言，最直接的价值是反复使用已经跑通的方法。收益需要在下一次、下一条真实内容里继续兑现。',y)
    specs=[{'title':title,'title_size':39,'tag':status,'kind':'pending' if i==2 else 'verified','size':32,'blocks':[('',text)]} for i,(title,text,status) in enumerate(D['value_levels'])]
    y=b.grid(specs,y,3)
    y+=29
    specs=[{'title':f'{i:02} · {x["title"]}','title_size':37,'size':29,'blocks':[
        ('原来的工作',x['before']),('沉淀后的变化',x['after'],GREEN),('已经有的依据',x['evidence'],GREEN),('不能直接推出',x['limit'],AMBER)]} for i,x in enumerate(R['values'],1)]
    y=b.grid(specs,y,2)

    y=b.section('10','使用与成本：从已有输入出发，按交付评估',
        '固定栏目越需要重复制作和精确修改，越值得检验流程收益；单次使用的回报可能有限，尚无规模化 ROI 统计。',y)
    specs=[{'title':x['title'],'tag':x['status'],'kind':'verified' if x['id']=='ready' else 'pending','title_size':36,'size':29,
        'blocks':[('需要的输入',x['need']),('还缺什么',x['missing'],AMBER),('可保留的价值',x['value'],GREEN)]} for x in R['routes']]
    y=b.grid(specs,y,2)
    y+=29
    specs=[{'title':'按候选总量计算接口部分','title_size':37,'size':30,'blocks':[('计算关系',D['cost']['formula']),('自填假设示例，不是平台报价',D['cost']['example'],AMBER)]},
        {'title':'把制作与审校成本一起算进去','title_size':37,'size':30,'blocks':[('另计的部分',D['cost']['other']),('已有口播的本轮情况',D['cost']['local'],GREEN)]}]
    y=b.grid(specs,y,2)

    y=b.section('11','后续意义：从一个格式，逐步验证生产能力',
        '这些是分阶段的后续方向，不是本轮已经实现的全部产品能力。每一步都需要明确的可观察验收条件。',y)
    specs=[{'title':title,'title_size':33,'tag':'已可用' if i==0 else '待验证','kind':'verified' if i==0 else 'pending','size':28,
        'blocks':[('下一步交付',deliverable),('判断依据',test)]} for i,(title,deliverable,test) in enumerate(D['future'])]
    y=b.grid(specs,y,5)
    y+=28
    specs=[{'title':title,'title_size':34,'tag':'潜在应用 / 非已验证产品','kind':'pending','size':30,'blocks':[('',text)]} for title,text in D['potential']]
    y=b.grid(specs,y,4)

    y=b.section('12','28 问完整回顾：26 个归档问题 + 2 次最新澄清',
        '以下按议题归纳，不是逐字聊天转录。保留完整回答与证据状态，避免只剩工具名单或“模板能用”的结论。',y)
    qs=R['questions']+D['latest_clarifications']
    specs=[{'title':f'{i:02} · {x["q"]}','title_size':32,'kicker':x['topic']+' / '+x['state'],'size':27,
        'blocks':[('',x['a']),('留下的判断',x['take'],GREEN)]} for i,x in enumerate(qs,1)]
    y=b.grid(specs,y,2)

    y=b.section('13','实测证据与边界：知道做了什么，也知道还没测什么',
        '帧数、解码和音轨相关性证明有限的技术问题，不能替代内容核对、主观听感与作品判断。',y)
    specs=[{'title':x['title'],'title_size':36,'tag':x['kind'],'size':29,'blocks':[('实际记录',x['result'],GREEN),('限制',x['limit'],AMBER)]} for x in R['evidence']]
    y=b.grid(specs,y,2)
    y+=28
    specs=[]
    for title,key,fill,fg in [('已经跑通','verified',GREEN_SOFT,GREEN),('仍待验证','pending',AMBER_SOFT,AMBER)]:
        specs.append({'title':title,'fill':fill,'title_size':40,'size':30,'blocks':[('',f'{i:02}  {s}',fg) for i,s in enumerate(D['evidence_boundaries'][key],1)]})
    y=b.grid(specs,y,2)

    y=b.section('14','来源、制作方式与回查入口',
        '本图保留外部来源与本地证据。SVG 中的来源文字可点击；PNG 便于放大阅读和保存。',y)
    y+=b.wrap(D['source_note'],M,y,INNER,30,MUTED,leading=45)+27
    source_specs=[]
    for i,x in enumerate(R['sources'],1):
        source_specs.append({'title':f'{i:02} · {x["title"]}','title_size':31,'size':25,'blocks':[('',x['url'],GREEN,x['url']),('',x['note'],MUTED)]})
    y=b.grid(source_specs,y,2)
    y+=34
    b.rect(M,y,INNER,2,INK,None,0,0);y+=30
    y+=b.wrap(D['credits'],M,y,INNER,28,MUTED,leading=42)+18
    y+=b.wrap('本图制作：可校对中文排版、真实样片嵌入与程序关系图；没有新生成的人物、视频或模型绘字。接口与价格在实际调用时仍需复核。',M,y,INNER,27,MUTED,leading=40)+25
    b.text('0021 / 数字人口播制作研究',M,y,27,RED,True)
    b.text(D['date']+' / '+D['version'],W-M-590,y,27,MUTED,width=590)
    y+=90
    record=b.save(y)
    return record

if __name__=='__main__':main()

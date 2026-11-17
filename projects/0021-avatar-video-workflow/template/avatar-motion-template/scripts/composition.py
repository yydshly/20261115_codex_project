"""Reusable layout and motion composition on a 1280×720 canvas."""
from pathlib import Path
import subprocess,time
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
from avatar_video import W,H,log,timing

def clamp(x):return max(0.,min(1.,x))
def ease(x):
    x=clamp(x);return x*x*(3-2*x)
def out(x):return 1-(1-clamp(x))**3
def color(hex_value):return tuple(bytes.fromhex(hex_value.lstrip('#')))
def mix(a,b,p):return a+(b-a)*p

class Canvas:
    def __init__(self,cfg):
        self.cfg=cfg;self.t=timing(cfg);self.copy=cfg['copy'];self.fonts={}
        self.paper_color=color(cfg['style']['paper']);self.ink=color(cfg['style']['ink']);self.accent=color(cfg['style']['accent'])
        yy,xx=np.mgrid[:H,:W];base=np.empty((H,W,3),np.float32);base[:]=self.paper_color
        base+=np.exp(-(((xx-1000)/400)**2+((yy-260)/350)**2))[...,None]*np.array([1.,-.5,-2.])
        base+=np.random.default_rng(1606).normal(0,.25,(H,W,1))
        self.paper=Image.fromarray(np.uint8(np.clip(base,0,255))).convert('RGBA')
        self.measure=ImageDraw.Draw(self.paper)

    def font(self,size,bold=False):
        key=(size,bold)
        if key not in self.fonts:self.fonts[key]=ImageFont.truetype(self.cfg['runtime']['font_bold' if bold else 'font_regular'],size)
        return self.fonts[key]

    def fit(self,label,width,size=64,bold=True,minimum=20):
        if '\n' in label:raise ValueError('This title/label field needs a single line')
        for s in range(size,minimum-1,-1):
            font=self.font(s,bold)
            if self.measure.textlength(label,font=font)<=width:return font
        raise ValueError(f'Text exceeds layout width; shorten or split it: {label[:30]}')

    def paragraph(self,label,width=1080,size=34,max_lines=2):
        for s in range(size,19,-1):
            font=self.font(s,True);lines=[]
            for paragraph in label.split('\n'):
                line=''
                for char in paragraph:
                    if line and self.measure.textlength(line+char,font=font)>width:
                        lines.append(line);line=char
                    else:line+=char
                lines.append(line)
            if len(lines)<=max_lines:return font,lines
        raise ValueError(f'Caption too long for two readable lines: {label[:36]}')

    def text(self,im,xy,label,font,fill=None,alpha=1):
        if alpha<=0:return
        layer=Image.new('RGBA',(W,H));d=ImageDraw.Draw(layer)
        d.text(xy,label,font=font,fill=(*(fill or self.ink),round(255*clamp(alpha))))
        im.alpha_composite(layer)

    def heading(self,im,label,dark=False):
        layer=Image.new('RGBA',(W,H));d=ImageDraw.Draw(layer)
        if dark:
            d.rounded_rectangle((30,25,315,65),radius=8,fill=(12,16,24,165))
            d.ellipse((45,41,51,47),fill=self.accent)
            d.text((64,31),label,font=self.font(17),fill=(244,239,229))
        else:
            d.ellipse((76,61,83,68),fill=self.accent)
            d.text((98,51),label,font=self.font(17),fill=(88,84,75))
            d.line((76,99,1204,99),fill=(*self.ink,45),width=1)
        im.alpha_composite(layer)

    def actor(self,im,i,x,y,scale=1,opacity=1):
        source=Image.open(self.prep/'mattes'/f'{i:06d}.png').convert('RGBA').crop(tuple(self.box))
        if scale!=1:source=source.resize((round(source.width*scale),round(source.height*scale)),Image.Resampling.LANCZOS)
        rgba=np.asarray(source);pad=40
        rgba=cv2.copyMakeBorder(rgba,pad,pad,pad,pad,cv2.BORDER_CONSTANT,value=(0,0,0,0))
        alpha=rgba[:,:,3].astype(np.float32)/255;radius=round(self.cfg['style']['outline_pixels'])
        silhouette=(alpha>.18).astype(np.uint8)
        if radius:silhouette=cv2.dilate(silhouette,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(radius*2+1,radius*2+1)))
        edge=cv2.GaussianBlur(silhouette.astype(np.float32),(0,0),.75)
        shadow=np.roll(np.roll(cv2.GaussianBlur(edge,(0,0),10),7,axis=0),5,axis=1)
        a=np.zeros((*alpha.shape,4),np.uint8);a[:,:,:3]=(40,32,24);a[:,:,3]=np.uint8(shadow*35)
        layer=Image.fromarray(a)
        if radius:
            a[:,:,:3]=255;a[:,:,3]=np.uint8(np.clip(edge*255,0,255));layer.alpha_composite(Image.fromarray(a))
        layer.alpha_composite(Image.fromarray(rgba))
        if opacity<1:layer.putalpha(layer.getchannel('A').point(lambda v:round(v*opacity)))
        im.alpha_composite(layer,(round(x-pad),round(y-pad)))

    def stage(self,i,outro=False):
        p=i/self.t['frames'];im=self.paper.copy();cp=self.copy
        self.heading(im,'05 / 回到人物' if outro else '01 / 留下人物')
        bx,by,bw,bh=self.box[0],self.box[1],self.box[2]-self.box[0],self.box[3]-self.box[1]
        scale=min(H*.88/bh,W*.43/bw);endx=W*.73-bw*scale/2;endy=H-45-bh*scale
        if outro:
            v=out((p-self.cfg['timeline']['outro'])/.025)
            self.actor(im,i,endx+45*(1-v),endy+12*(1-v),scale,v)
            lines=cp['outro_lines'];starts=[self.cfg['timeline']['outro']]*2;ys=[218,301]
        else:
            d=ImageDraw.Draw(im);d.ellipse((716,144,1188,616),outline=tuple(round(mix(a,b,.12)) for a,b in zip(self.paper_color,self.ink)),width=1)
            start=self.cfg['timeline']['reveal_done'];move=ease((p-start)/.045)
            self.actor(im,i,mix(bx,endx,move),mix(by,endy,move),mix(1,scale,move))
            lines=cp['title_lines'];starts=[start+.007,start+.028];ys=[202,289]
        for n,(label,start,y) in enumerate(zip(lines,starts,ys)):
            v=out((p-start)/.034)
            self.text(im,(76,round(y+22*(1-v))),label,self.fit(label,520),self.ink if n==0 else self.accent,v)
        if outro:
            v=out((p-self.cfg['timeline']['outro'])/.025)
            self.text(im,(80,419),cp['outro_description'],self.fit(cp['outro_description'],520,23,False),alpha=v)
            ImageDraw.Draw(im).line((80,485,80+round(384*v),485),fill=self.accent,width=3)
            self.text(im,(80,518),cp['outro_tagline'],self.fit(cp['outro_tagline'],520,26,False),alpha=v)
        else:
            start=self.cfg['timeline']['reveal_done'];v=out((p-start-.06)/.03)
            self.text(im,(80,395),cp['description'],self.fit(cp['description'],520,23,False),alpha=v)
            for n,label in enumerate(cp['chips']):
                x=80+164*n;v=out((p-start-.07-n*.01)/.022)
                if v:
                    ImageDraw.Draw(im).rounded_rectangle((x,451,x+152,485),radius=17,outline=tuple(round(mix(a,b,.3)) for a,b in zip(self.paper_color,self.ink)),width=1)
                    font=self.fit(label,126,17,False,minimum=13)
                    tw=self.measure.textlength(label,font=font)
                    self.text(im,(x+(152-tw)/2,457),label,font,alpha=v)
        return im

    def city_frame(self,i):
        local=i-self.t['city']+1
        im=Image.open(self.city/'render-frames'/f'frame_{local:04d}.png').convert('RGBA')
        self.heading(im,'03 / 让画面进入空间',True);return im

    def word_card(self,i):
        p=i/self.t['frames'];im=self.paper.copy();self.heading(im,'04 / 重新组织呈现')
        start=self.cfg['timeline']['keywords_done']-.01
        for n,(label,x) in enumerate(zip(self.copy['keywords'],[80,468,856])):
            v=out((p-start-n*.017)/.02)
            font=self.fit(label,278,108,True,minimum=34)
            self.text(im,(x,round(229+64*(1-v))),label,font,self.accent if n==2 else self.ink,v)
        for x,offset in ((367,.014),(755,.031)):
            self.text(im,(x,265),'×',self.font(58,True),self.ink,out((p-start-offset)/.013))
        d=ImageDraw.Draw(im)
        for n in range(95):
            at=int((i/self.t['fps']-.47+n*.01)*100)
            value=self.energy[max(0,min(len(self.energy)-1,at))]
            length=5+round(76*float(value)**.7);x=80+n*12
            d.rounded_rectangle((x,461-length//2,x+4,461+length//2),radius=2,fill=self.accent)
        desc=self.copy['keyword_description']
        self.text(im,(80,550),desc,self.fit(desc,1120,28,False),alpha=out((p-start-.04)/.02))
        return im

    def wipe(self,a,b,p,left=False):
        p=ease(p)
        if p<=0:return a
        if p>=1:return b
        boundary=mix(-40,W+40,p);xx=np.arange(W)[None,:]
        mask=np.clip((xx-(W-boundary)+12)/24,0,1) if left else np.clip((boundary-xx+12)/24,0,1)
        mask=Image.fromarray(np.uint8(np.repeat(mask,H,axis=0)*255))
        im=Image.composite(b,a,mask).convert('RGBA');x=round(W-boundary if left else boundary)
        ImageDraw.Draw(im).rectangle((x-3,0,x+4,H),fill=self.accent);return im

    def caption(self,im,i,side):
        seconds=i/self.t['fps']
        active=next((c for c in self.copy['captions'] if c['start']<=seconds<c['end']),None)
        if not active:return
        font,lines=self.paragraph(active['text'],width=470 if side else 1080,size=28 if side else 34)
        age=seconds-active['start'];remaining=active['end']-seconds
        enter=out(age/.13);alpha=min(enter,clamp(remaining/.1))
        lineheight=font.size+8;panelheight=18+lineheight*len(lines)
        x=76 if side else 64;panelwidth=520 if side else 1152;y=round(653-panelheight+9*(1-enter))
        layer=Image.new('RGBA',(W,H));d=ImageDraw.Draw(layer)
        d.rounded_rectangle((x,y,x+panelwidth,y+panelheight),radius=14,fill=(22,28,28,round(225*alpha)))
        im.alpha_composite(layer)
        # Reveal is bounded to finish inside this caption's actual time window.
        interval=min(.045,(active['end']-active['start'])*.5/max(1,len(active['text'])))
        shown=min(len(active['text']),max(0,int(age/interval)+1));count=0
        for row,line in enumerate(lines):
            tx=x+20 if side else (W-self.measure.textlength(line,font=font))/2
            for char in line:
                if count>=shown:break
                fill=self.accent if count==shown-1 and shown<len(active['text']) else (251,246,234)
                self.text(im,(round(tx),y+7+row*lineheight),char,font,fill,alpha)
                tx+=self.measure.textlength(char,font=font);count+=1

    def footer(self,im,i,dark):
        layer=Image.new('RGBA',(W,H));d=ImageDraw.Draw(layer)
        fg=(228,225,219) if dark else self.ink
        d.rectangle((0,674,W,H),fill=(11,16,24,185) if dark else (*self.paper_color,248))
        for label,x in [(self.cfg['source']['credit'],32),(self.copy['footer'],None)]:
            font=self.fit(label,590,12,False,minimum=9)
            if x is None:x=1248-self.measure.textlength(label,font=font)
            d.text((x,689),label,font=font,fill=fg)
        d.line((32,675,1248,675),fill=(*fg,55),width=2)
        d.line((32,675,32+round(1216*i/(self.t['frames']-1)),675),fill=self.accent,width=2)
        im.alpha_composite(layer)

    def compose(self,i,raw):
        t=self.t;dark=False;side=False
        if i<t['reveal']:im=raw.convert('RGBA');dark=True
        elif i<t['reveal_done']:
            im=self.wipe(raw.convert('RGBA'),self.stage(i),(i-t['reveal'])/max(1,t['reveal_done']-t['reveal']-1));dark=True
        elif i<t['city']:im=self.stage(i);side=True
        elif i<t['city_done']:
            im=self.wipe(self.stage(i),self.city_frame(i),(i-t['city'])/max(1,t['city_done']-t['city']-1),True);dark=True
        elif i<t['keywords']:im=self.city_frame(i);dark=True
        elif i<t['keywords_done']:
            im=self.wipe(self.city_frame(i),self.word_card(i),(i-t['keywords'])/max(1,t['keywords_done']-t['keywords']-1));dark=True
        elif i<t['outro']:im=self.word_card(i)
        else:im=self.stage(i,True)
        self.caption(im,i,side);self.footer(im,i,dark)
        return im.convert('RGB')

def validate_layout(cfg):
    c=Canvas(cfg);cp=cfg['copy']
    for label in cp['title_lines']+cp['outro_lines']:c.fit(label,520)
    for label in cp['keywords']:c.fit(label,278,108,True,34)
    for label in cp['chips']:c.fit(label,126,17,False,13)
    for field in ('description','outro_description','outro_tagline'):c.fit(cp[field],520,23,False)
    c.fit(cp['keyword_description'],1120,28,False)
    for caption in cp['captions']:
        a,b=caption['start'],caption['end'];t=c.t
        overlaps_stage=a<t['city']/t['fps'] and b>t['reveal_done']/t['fps']
        c.paragraph(caption['text'],470 if overlaps_stage else 1080,28 if overlaps_stage else 34)

def render(context):
    cfg=context['config'];t=context['timing'];root=Path(context['output']);prep=Path(context['prep'])
    c=Canvas(cfg);c.prep=prep;c.city=Path(context['city']);c.box=context['subject_box']
    data=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(prep/'normalized.mkv'),'-f','f32le','-ac','1','-ar','8000','pipe:1'],check=True,capture_output=True).stdout
    pcm=np.frombuffer(data,np.float32);hop=80
    c.energy=np.array([np.sqrt(np.mean(pcm[j:j+hop]**2)+1e-9) for j in range(0,len(pcm),hop)])
    c.energy=np.clip(c.energy/(np.percentile(c.energy,95)+1e-6),0,1)
    cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s:v','1280x720',
        '-r',str(t['fps']),'-i','pipe:0','-i',str(prep/'normalized.mkv'),'-map','0:v:0','-map','1:a:0','-t',str(t['duration']),
        '-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k',
        '-af',f'afade=t=in:st=0:d=0.025,afade=t=out:st={t["duration"]-.15}:d=0.15','-movflags','+faststart',str(root/'video.mp4')]
    encoder=subprocess.Popen(cmd,stdin=subprocess.PIPE);capture=cv2.VideoCapture(str(prep/'normalized.mkv'))
    started=time.perf_counter()
    try:
        for i in range(t['frames']):
            ok,bgr=capture.read()
            if not ok:raise RuntimeError(f'Compositor missing source frame {i}')
            raw=Image.fromarray(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB));im=c.compose(i,raw)
            encoder.stdin.write(np.asarray(im).tobytes())
            if i%t['fps']==0:log(f'Compositing {i+1}/{t["frames"]} ({time.perf_counter()-started:.1f}s)')
    finally:
        capture.release();encoder.stdin.close()
    if encoder.wait()!=0:raise RuntimeError('FFmpeg encoding failed')
    if cfg['output']['preview_gif']:
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(root/'video.mp4'),'-filter_complex',
            'fps=12,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a',
            '-loop','0',str(root/'preview.gif')],check=True)
    # Review media is decoded from the actual final video.
    indices=[round(r*(t['frames']-1)) for r in (.05,.21,.32,.45,.6,.75,.85,.96)]
    board=Image.new('RGB',(1920,676),c.paper_color);draw=ImageDraw.Draw(board)
    capture=cv2.VideoCapture(str(root/'video.mp4'));column=0
    for i in range(t['frames']):
        ok,bgr=capture.read()
        if not ok:raise RuntimeError('Final video failed to decode while making storyboard')
        if i in indices:
            im=Image.fromarray(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB));x=(column%4)*480;y=(column//4)*338
            board.paste(im.resize((480,270),Image.Resampling.LANCZOS),(x,y+44))
            draw.text((x+16,y+10),f'{i/t["fps"]:.2f}s',font=c.font(20),fill=c.ink)
            if column==2:im.save(root/'poster.jpg',quality=94)
            column+=1
    capture.release();board.save(root/'storyboard.jpg',quality=94)

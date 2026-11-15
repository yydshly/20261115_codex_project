from manim import *
import numpy as np
Text.set_default(font='Microsoft YaHei')

REVISION = 2
DURATION = 24
BG, INK, MUTED, PANEL = '#f3f2eb', '#203a35', '#7a8880', '#e9ede3'
QA, CA, CB, GRID = '#335e4b', '#d48b62', '#8390ba', '#d7dfd0'
def pos(x,y): return np.array([(x-640)/90,(360-y)/90,0])
def smooth(x):
    x=np.clip(x,0,1)
    return x*x*(3-2*x)
def label(s,x,y,size=20,color=INK,weight=NORMAL):
    return Text(s,font='Microsoft YaHei',font_size=size*.75,color=color,weight=weight).move_to(pos(x,y),aligned_edge=UL)
def box(x,y,w,h,color,r=16,stroke=None):
    return RoundedRectangle(width=w/90,height=h/90,corner_radius=r/90,fill_color=color,fill_opacity=1,stroke_color=stroke or color,stroke_width=1).move_to(pos(x+w/2,y+h/2))
def endpoint(angle,length=250): return pos(260+length*np.cos(np.deg2rad(angle)),520-length*np.sin(np.deg2rad(angle)))

class SameCase(Scene):
    def construct(self):
        self.camera.background_color=BG
        clock=ValueTracker(0)
        query_angle=ValueTracker(0)
        self.add(label('MOTION ATLAS / EXPLAINER STUDY',76,39,11,MUTED),label('相似，来自方向。',73,65,48,INK,BOLD),label('语义检索 · 二维方向示意',983,88,13,MUTED))
        self.add(box(76,164,760,423,PANEL,25),label('当前问题 / QUERY',108,194,11,MUTED))
        question=label('怎么让接口响应更快？',108,220,25,INK,BOLD)
        self.add(question)
        graph=VGroup()
        for x in range(208,750,40): graph.add(Line(pos(x,280),pos(x,550),color=GRID,stroke_width=1))
        for y in range(290,550,40): graph.add(Line(pos(208,y),pos(740,y),color=GRID,stroke_width=1))
        axes=Axes(x_range=[0,4,1],y_range=[0,4,1],x_length=250/90,y_length=250/90,tips=False,axis_config={'color':'#aab9a4','include_ticks':False})
        axes.shift(pos(260,520)-axes.c2p(0,0))
        graph.add(axes)
        for a,c in [(20,CA),(80,CB)]: graph.add(Arrow(pos(260,520),endpoint(a),buff=0,color=c,stroke_width=6,tip_length=17/90))
        arrow=Arrow(pos(260,520),endpoint(0),buff=0,color=QA,stroke_width=6,tip_length=17/90)
        arc=Arc(radius=62/90,start_angle=query_angle.get_value(),angle=20*DEGREES,arc_center=pos(260,520),color=CA,stroke_width=2)
        query_label=label('问题向量',522,544,15,QA)
        graph.add(arrow,arc,Dot(pos(260,520),radius=5/90,color=INK),label('资料 A',507,409,16,CA),label('资料 B',309,254,16,CB),query_label,label('夹角越小，方向越接近',540,314,13,MUTED))
        self.add(graph)
        hook=VGroup(label('一句话，',125,330,47,INK,BOLD),label('怎样找到对的资料？',125,396,47,INK,BOLD),label('从文字到方向，再从方向到排序。',125,481,15,MUTED))
        self.add(hook)
        cards=[];numbers=[];bars=[]
        for i,(title,c) in enumerate([('缓存与索引优化',CA),('退休年龄新规',CB)]):
            y=187+i*166
            number=DecimalNumber(np.cos(np.deg2rad([20,80][i])),num_decimal_places=2,mob_class=Text,font_size=34*.75,color=c,group_with_commas=False)
            number.move_to(pos(896,y+78),aligned_edge=UL)
            bar=Rectangle(width=286/90,height=3/90,stroke_width=0,fill_color=c,fill_opacity=1).move_to(pos(896,y+128),aligned_edge=LEFT)
            card=VGroup(box(874,y,330,143,'#ffffff',18,'#d9dfd2'),label('资料 '+('B / 公共政策' if i else 'A / 技术文档'),896,y+18,12,MUTED),label(title,896,y+43,23,INK,BOLD),number,label('方向接近度',1000,y+91,12,MUTED),bar)
            cards.append(card);numbers.append(number);bars.append(bar);self.add(card)
        self.add(label('分数 = cos（示意夹角）',883,533,11,MUTED),label('示意数据，不是模型实测结果',883,553,11,MUTED))
        final=VGroup(label('TAKEAWAY / 带走一个理解',130,326,13,MUTED),label('问题变了，排序也会改变。',130,367,39,INK,BOLD),label('cos θ → 方向接近度 → 相关资料',130,436,18,QA))
        self.add(final)
        self.add(box(76,609,1128,60,INK,13),label('解说',101,631,13,'#bcd28e'))
        subtitle=label('',153,629,20,'#edf2df');self.add(subtitle)
        self.add(Rectangle(width=1128/90,height=3/90,stroke_width=0,fill_color='#dce2d4',fill_opacity=1).move_to(pos(76,686),aligned_edge=LEFT))
        progress=Rectangle(width=.001,height=3/90,stroke_width=0,fill_color=QA,fill_opacity=1);self.add(progress)
        state={'caption':None,'question':None}
        def update(_):
            t=clock.get_value()
            angle=query_angle.get_value()
            finish=19
            text='怎么让接口响应更快？' if t<13 else '退休年龄政策有什么变化？'
            show=smooth((t-3.5)/1.2);out=smooth((t-finish)/.8);entry=smooth(t/1.1);swap=smooth((angle-44)/12)
            graph.set_opacity(show*(1-out*.86));hook.set_opacity(1-show);final.set_opacity(out);question.set_opacity(entry)
            if text!=state['question']:
                question.become(label(text,108,220,25,INK,BOLD));state['question']=text
            arrow.become(Arrow(pos(260,520),endpoint(angle),buff=0,color=QA,stroke_width=6,tip_length=17/90)).set_opacity(show*(1-out*.86))
            arc.become(Arc(radius=62/90,start_angle=angle*DEGREES,angle=(20-angle)*DEGREES,arc_center=pos(260,520),color=CA,stroke_width=2)).set_opacity(show*(1-out*.86))
            query_label.move_to(endpoint(angle)+np.array([12/90,-24/90,0]),aligned_edge=UL)
            for i,card in enumerate(cards):
                y=187+swap*166 if i==0 else 353-swap*166
                card.move_to(pos(1039,y+71.5));card.set_opacity(entry)
                score=np.cos(np.deg2rad([20,80][i]-angle));numbers[i].set_value(score)
                bars[i].stretch_to_fit_width(max(.001,286/90*score));bars[i].move_to(pos(896,y+128),aligned_edge=LEFT)
            caption=('把一句话变成向量，才能比较它与资料的接近程度。' if t<4 else '这里用二维方向作示意；真实模型使用更高维的向量。' if t<8 else '问题与资料 A 的夹角更小，所以它排在前面。' if t<13 else '问题改变后，方向转动；两份资料的接近度随之变化。' if t<finish else '核心区别：比较语义方向，而不是简单数关键词。')
            if caption!=state['caption']:
                subtitle.become(label(caption,153,629,20,'#edf2df'));state['caption']=caption
            progress.stretch_to_fit_width(max(.001,1128/90*t/DURATION));progress.move_to(pos(76,686),aligned_edge=LEFT)
        content=VGroup(*self.mobjects);self.clear();content.add_updater(update);self.add(content);update(content)
        self.play(clock.animate.set_value(13),run_time=13,rate_func=linear)
        self.play(clock.animate(rate_func=linear).set_value(19),query_angle.animate(rate_func=smooth).set_value(70),run_time=6)
        self.play(clock.animate.set_value(24),run_time=5,rate_func=linear)

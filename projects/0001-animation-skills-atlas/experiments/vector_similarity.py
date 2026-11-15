from manim import *
import numpy as np

class VectorSimilarity(Scene):
    def construct(self):
        self.camera.background_color = '#142b24'
        title = Text('相似度：为什么比较方向？', font='Microsoft YaHei', font_size=32).to_edge(UP)
        axes = Axes(x_range=[-1, 4, 1], y_range=[-1, 3, 1], x_length=7, y_length=4, tips=False, axis_config={'color':'#526c58'}).shift(LEFT * 1.7 + DOWN * .25)
        origin=axes.c2p(0,0)
        theta=ValueTracker(.2)
        doc=Arrow(origin,axes.c2p(3,0),buff=0,color='#8096ef',stroke_width=7)
        query=always_redraw(lambda:Arrow(origin,axes.c2p(2.7*np.cos(theta.get_value()),2.7*np.sin(theta.get_value())),buff=0,color='#d1ed8e',stroke_width=7))
        projection=always_redraw(lambda:DashedLine(axes.c2p(2.7*np.cos(theta.get_value()),2.7*np.sin(theta.get_value())),axes.c2p(2.7*np.cos(theta.get_value()),0),color='#e6a177'))
        score=always_redraw(lambda:Text(f'cos(angle) = {np.cos(theta.get_value()):.2f}',font_size=26,color='#d1ed8e').move_to(RIGHT*3.8+UP*.4))
        caption=Text('蓝色是资料，绿色是问题；先看它们的方向。',font='Microsoft YaHei',font_size=24).to_edge(DOWN)
        self.play(Write(title),Create(axes),run_time=1.2)
        self.play(GrowArrow(doc),Create(query),FadeIn(score),Write(caption),run_time=1.5)
        self.wait(1.5)
        new=Text('夹角变大，余弦相似度下降。',font='Microsoft YaHei',font_size=24).to_edge(DOWN)
        self.play(Transform(caption,new),Create(projection),run_time=.8)
        self.play(theta.animate.set_value(1.3),run_time=3)
        self.wait(1.5)
        new=Text('方向越接近，相似度越接近 1。',font='Microsoft YaHei',font_size=24).to_edge(DOWN)
        self.play(Transform(caption,new),theta.animate.set_value(.08),run_time=3)
        self.wait(1.5)
        new=Text('适合表达：连续关系、变量变化与数学直觉。',font='Microsoft YaHei',font_size=24).to_edge(DOWN)
        self.play(Transform(caption,new),run_time=.8)
        self.wait(2)

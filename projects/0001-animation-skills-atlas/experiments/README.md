# 重点任务与讲解作品

2026-11-15 第三轮：将三个补间库改为实际任务，并加入 Motion Canvas 与 Manim 的同主题讲解，替代只看几何图形运动的选型方式。

## 三种补间的区别

实现位于 `../web/scenarios.js`，由真实依赖运行。分类用于解释各自的 API 取向，不表示某个库无法实现其他类型的任务。

| 工具 | 任务 | 观察点 |
| --- | --- | --- |
| Ola | 模拟带宽监控，原始数据与平滑输出并排 | 点击 920 再点击 180，可以在过渡途中更换目标；曲线显示直接更新与插值的差异 |
| Shifty | 示例地图的相机缩放与位移 | 开始、暂停、恢复、seek、切换缓动；地图本身由本站绘制 |
| TweenJS | 接单、打包、出库、完成 | to / wait / call 串联动作，事件日志在阶段到达时写入 |

实测 Ola 原始值跳到 920 时平滑读数仍为 277，随后改为 180 时平滑读数为 439，说明目标更新发生在前段尚未结束时。具体中间数值随读取时机变化。Shifty 拖动到末尾显示 100% / 1.70×；TweenJS 完成四条阶段日志。

## 同一个语义检索主题，两种讲法

### Motion Canvas 3.17.2

源码：`motion-canvas/src/scenes/retrieval.tsx`。四个节点与流动标记展示“问题 → 编码 → 相似度检索 → 资料”；用真实 generator、all、waitFor 和节点信号编排图解与字幕。不是实际模型检索系统。

```shell
cd projects/0001-animation-skills-atlas/experiments/motion-canvas
npm ci
npm run build
```

编译到 `../../web/public/motion-canvas/project.js`，由主网页的官方 Motion Canvas Player 播放。该环境的 Vite 5 仅用于编译，未启动开发服务器；主网页仍使用独立的 Vite 8。编译环境的 npm 报告 3 项依赖问题，未执行会破坏版本兼容的自动升级。

官方参考：<https://motioncanvas.io/docs/quickstart>、<https://motioncanvas.io/docs/rendering>、<https://motioncanvas.io/docs/configuration>。通过内置浏览器阅读，验证播放器 ready / playing 状态以及实际节点与字幕画面。处理了旧版 chroma-js 的预打包兼容和播放器相对地址问题。

### Manim Community 0.22.1

源码：`vector_similarity.py`。蓝色资料向量固定，绿色问题向量改变方向，投影与余弦读数同步变化。用真实 Axes、Arrow、ValueTracker、always_redraw 和动画渲染。这里的二维示意只解释方向相似度，不等于完整高维语义模型。无配音，用字幕讲解。

本轮使用被忽略的仓库内独立环境 `.local/manim-env`（Python 3.12.13）。复现：

```shell
uv venv .local/manim-env
uv pip install --python .local/manim-env/Scripts/python.exe manim==0.22.1
.local/manim-env/Scripts/python.exe -m manim -qm --fps 24 --media_dir .local/manim-output projects/0001-animation-skills-atlas/experiments/vector_similarity.py VectorSimilarity
```

将输出 `.local/manim-output/videos/vector_similarity/720p24/VectorSimilarity.mp4` 复制为 `web/public/vector-similarity.mp4`。视频为 1280×720、24 FPS，已检查第 8 秒画面，中文、向量、投影和余弦值显示正常；网页播放由浏览器媒体控件完成，不会在浏览器运行 Python。

## 本轮验证范围

主网页与 Motion Canvas 编译均通过。其余九项仍为基础机制示意，不宣称已完成真实任务作品。数据、地图、订单和内容均为自编示例，没有接入私人资料或真实业务系统。依赖、生成视频、缓存和编译产物被忽略；未部署。

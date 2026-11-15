# 同一个案例，三种工具：成片与改稿研究

网页入口：[同案成片对比](../web/compare.html)。本轮完成三种原生实现、六份实际导出和一次可复现的改稿练习。

## 统一交付要求

参见 [brief.json](brief.json)。案例为中文教学短片《相似，来自方向。》，解释问题向量方向改变后，示意资料如何重新排序。初版 18 秒，改稿后 24 秒；均为 1280×720、24 fps、无音轨、统一中文字幕、相同配色和镜头节奏。

这是二维方向教学案例。向量与文档对应由作者设定，得分按夹角余弦计算，不是语义模型或真实检索系统的性能测评。

## 三份独立的原生实现

| 工具 | 当前源文件 | 实际机制 |
| --- | --- | --- |
| Remotion 4.0.543 | [CaseStudy.jsx](../web/remotion/CaseStudy.jsx) | React 组件、SVG、当前帧与数学插值 |
| Manim Community 0.22.1 | [case_manim.py](../experiments/case_manim.py) | Axes / Arrow / Arc、ValueTracker、原生图形更新器 |
| Motion Canvas 3.17.2 | [study.tsx](../experiments/motion-canvas/src/scenes/study.tsx) | Rect / Txt / Line、信号依赖、generator 与 all |

没有把一个工具生成的完整画面交给另两个工具重新播放。三版分别建立文本、卡片、网格、向量和动画，再由各自的渲染管线输出。

## 实际改稿

需求：“加入第二个问题，演示查询方向改变与排序反转；新增 6 秒讲解；将结果卡的‘相似度’改为‘方向接近度’。”

初版源码保存在 [baseline/](baseline/)，实际补丁为 [remotion-revision.patch](remotion-revision.patch)、[manim-revision.patch](manim-revision.patch)、[canvas-revision.patch](canvas-revision.patch)。每种实现均改动一个主案例文件；网页展示自动统计的增删行数及完整代码。

这是一项提前定义修改要求的制作练习，不是盲测；代码行数不代表人力工时。三个实现都对布局和图形做了适当封装。修改成本与源码组织、作者经验和项目规模有关，不能从这一个案例推导通用优劣。

## 制作与验证发现

- Remotion 的卡片封装、文本与 SVG 复用比较直接；向量坐标和角度关系由本案例代码计算。
- Manim 提供数学图形对象；本轮初次关键帧检查发现静态缓存导致整幅画面未更新，改为将内容放入带更新器的 VGroup。中文文本和数值的字体布局也需要单独检查。这是本次实现的返修记录，不是声称 Manim 固有缺陷。
- Motion Canvas 用信号让角度、数字、箭头和卡片位置一起变化；本轮使用官方图片序列 Renderer 后，再用 FFmpeg 编码 MP4，多一道实际导出工序。
- 三版最终在 10 秒与 18 秒关键帧中呈现相同数据与叙事结果；字体度量、箭头尖端和栅格化细节仍有原生渲染差异，未声称逐像素一致。
- 发现并修正一处字幕过早宣告排序结果的问题：新增变化段改为描述变化过程；网页将重点对照点设为排序已经反转的第 18 秒。

## 数据与耗时口径

`*-v1.json`、`*-v2.json` 保存实际成功导出的耗时、文件大小、媒体参数和 SHA-256。原始成功执行日志为同名 `.log`（被忽略，不提交）。

CLI 的 wallSeconds 包含进程启动、编译、渲染与编码；Motion Canvas 的 wallSeconds 从网页导出按钮开始计时，编码另外记录。工具预装状态、缓存、并行度与编码默认值不同，页面不进行性能排名。例如 Remotion 改稿成片更长，但命中缓存后的导出反而更快。

`collect.py` 实际编码两组 Motion Canvas 图片序列，使用 ffprobe 核对全部六份成片的尺寸、帧率和时长，并从文件差异生成报告。网页的统计来自这份报告，没有虚构人工工时或评分。

## 本机复现说明

依赖环境沿用 [experiments/README.md](../experiments/README.md)。当前源码为 V2。主网页启动：

```shell
cd projects/0001-animation-skills-atlas/web
npm ci
npm run dev
```

Remotion 与 Manim 当前 V2 的记录与导出命令，在仓库根目录执行：

```shell
python projects/0001-animation-skills-atlas/comparison/render_cli.py remotion 2
python projects/0001-animation-skills-atlas/comparison/render_cli.py manim 2
```

`render_cli.py` 的 revision 参数标记输出名称，不会自动切换源码；如复现 V1，需要先在独立工作副本中使用 baseline 快照，避免覆盖已有修改。

Motion Canvas 在其独立目录运行：

```shell
node node_modules/vite/bin/vite.js --config study.config.js
```

打开 `http://127.0.0.1:52843/render.html`，点击“渲染当前案例”。此页面调用官方 Renderer，图片写入仓库内被忽略的 `.local/case-canvas-frames/canvas-v2/`。复现 V1 同样需在独立工作副本使用 baseline 快照。

两版素材就绪后，在仓库根目录运行：

```shell
python projects/0001-animation-skills-atlas/comparison/collect.py
```

生成 `web/public/comparison/` 中的六份 MP4、封面与报告；这些是可重新生成的本地输出，已忽略。`npm run build` 构建主站三页，路径均为相对路径。未发布。

## 网页验收

- 六份视频均通过 ffprobe：初版 18 秒、改后 24 秒，全部 1280×720、24 fps。
- 内置浏览器定位第 18 秒，三视频 currentTime 均为 18，最新画面排序与数值一致。
- 同步播放时三个 paused 均为 false；暂停时再次统一时间，消除帧边界差异。
- 切换 V1 后三版 duration 均为 18；第 10 秒定位均为 10。
- 单独观看、并排观看、改稿差异展开、完整源码和实际耗时表均加载正常。
- 手机视口设置 390×844，实际内容宽 375px、滚动宽同为 375px，没有页面横向溢出。
- 加入媒体缓存版本参数，避免本机重复导出后浏览器仍展示旧片。
- 原生成片关键帧已逐一视觉检查，主站生产构建与仓库索引校验通过。

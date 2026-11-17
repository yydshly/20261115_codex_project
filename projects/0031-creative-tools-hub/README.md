# 0031 · 创作工具总览 · 15库效果、价值与选用

把15项创作库的真实效果、职责和已有实测放到同一入口，帮助我们按短片、数字人口播、三维世界和网页任务选工具，沉淀可复用的方法与验证依据。

[统一网页入口](https://yydshly.github.io/20261115_codex_project/demos/0031-creative-tools-hub/) · [汇总图放大阅读](https://yydshly.github.io/20261115_codex_project/demos/0031-creative-tools-hub/map.html) · [发布与验收记录](publication.md)

## 我们形成的理解与价值

这些库覆盖参考分析、素材、模型生成、动作、视频编排、三维空间和工作方法。PixelFX提供像素动态，GSAP控制已有对象怎样动，ComfyUI组织模型步骤，Blender MCP连接操作，Three.js渲染实时空间，Skills保存工作说明与资料。

对我们，价值在于把“喜欢一个效果”继续变成具体任务：需要什么输入、由谁负责、修改哪里、怎样验收。五条任务路线说明哪些工具可选、哪些步骤可配合；保留作者声明、我们的判断和实际验证的区别，方便后续选型、改稿和继续复用。

- 15项逐一展示效果、作用、价值、参考场景、输入输出和理解边界。
- 自然短片、数字人口播、三维世界、网页返修、参考片研究五条路线，支持场景查找、职责筛选及最多三项对照。
- 四项已有修改／导出测量保留原始口径；制作时间、脚本调用和渲染时间分别说明，不作跨工具速度排名。
- 展开可读我们的目标、取舍和原创任务；15份阶段资料及官方来源可回查。提示词草案与已经完成的作品分开标注。

## 本轮生成的引导图

总导航和项目首页使用下列**3200×10440原图**，发布不重绘、不改变像素，点击可放大。

![15库效果、价值与使用场景完整汇总](assets/creative-tools-overview.png)

SHA-256：`e41c8fdbdf549304220d70487aa102d532c85ca87bc9f52538c721a221ae7c7f`。

[原始PNG](assets/creative-tools-overview.png) · [可缩放SVG](assets/creative-tools-overview.svg) · [完整文字数据](research.json)

图内14幅不同视觉包含12幅效果／实测图，以及GSAP静态构成、Blender连接原理两幅示意。Remotion Skills共用Remotion样片，不计作第二次独立渲染验证。所有图片逐项说明身份、作者和处理方式。

## 15项的范围

| 分工 | 库 |
| --- | --- |
| 看参考，定任务 | Rea-Video、Awesome Opus Videos |
| 做素材与风格片段 | Lemo-Opuscar、PixelFX、ComfyUI |
| 编排动作与成片 | EffectCraft、HyperFrames、Remotion、Remotion Skills、GSAP |
| 构建三维空间 | Blender MCP、Three.js |
| 改设计，沉淀方法 | Unslop、Impeccable、Anthropic Skills |

公开页自包含15项阅读内容、15份阶段资料及本库三段试制视频，不依赖未发布项目目录或其他本机服务。完整Remotion图谱沿用原有公开入口；作者原视频保留原站播放和来源，不复制完整原片。

## 实测与边界

Lemo、PixelFX、EffectCraft、Remotion、GSAP和Three.js有不同范围的本地制作或应用记录；其他条目主要是官方案例观察、文档与用途研究。Remotion Skills与运行库共用证据。没有为全部15库测量整体提效、完整重跑模型或验收一条全自动生产线。

HyperFrames缩图取自官方讲解片42.6秒；GSAP和Blender图继续明确标注为本站示意。长图不等于完整动态演示、编辑工程、真实业务功能或新游戏实机。

[素材与署名台账](assets/SOURCES.md) · [第三方声明与许可](THIRD_PARTY_NOTICES.md) · [来源与文档指纹](source-manifest.json) · [本地阅读检查](verification.json)

## 构建与复核

`scripts/build.py --publication`使用Python标准库导出静态站点，从带包级和逐文件SHA-256的Release归档恢复三段**本库试制视频**。不会安装Pillow、调用模型、运行上游技能或重绘引导图。

```powershell
python projects/0031-creative-tools-hub/scripts/build.py --publication
python projects/0031-creative-tools-hub/scripts/check_publication.py
```

可用`--media-archive <本机归档>`指定已有媒体包，仍执行全部哈希校验。站点只复制明确白名单，排除缓存、日志、本机会话与完整第三方工程。`dist/`与媒体ZIP不提交Git；视频通过Release归档恢复。

更新研究文字时编辑research.json。可选的`scripts/render_local.py`用于本机继续整理图文，需要Pillow和微软雅黑；本轮发布不执行它，原图哈希由发布检查锁定。

提交、Actions、公开地址与上线交互验收见[publication.md](publication.md)。登记表demo_url只在公开页面验证通过后回填。

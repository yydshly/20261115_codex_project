# 汇总图素材与来源台账

研究汇总，2026-11-17。原作者与本站素材逐项区分；图像作为工具价值解析的署名缩图引用，不作为独立素材包提供。

| 库 | 画面身份与署名 | 原始来源 |
| --- | --- | --- |
| Rea-Video | 作者案例；JuneYaooo / Rea-Video 作者发布对照 | [来源](https://github.com/JuneYaooo/rea-video/blob/07dd587119e884f7c50fbfae92e47840de86bea5/README.md#remakes)；Apache-2.0；第三方视频、音乐和角色另核对 |
| Awesome Opus Videos | 收录的作者原作；@anduraio / 原作海报，Skillry公开来源 | [来源](https://skillry.dev/ai-videos/opus-5-5/anduraio-570761)；仓库MIT；原作与第三方媒体权利不随代码许可转移 |
| Lemo-Opuscar | 作者原片＋本库小样；LemoLab作者片 CC BY4.0 / 本库《风来小庭》 | [来源](https://lemomo-ai.github.io/lemo-opuscar/zh/styles/watercolor/)；代码MIT；所引作者影片CC BY4.0，选帧／缩放已标注 |
| PixelFX | 原效果实跑；PixelFX / Patch，原效果本机代码运行快照 | [来源](https://github.com/patch-gg/pixelfx)；MIT；保留PixelFX及原效果作者声明 |
| ComfyUI | 官方生成示例；ComfyUI官方示例 / SD1.5教程结果 | [来源](https://docs.comfy.org/tutorials/basic/image-to-image)；核心GPL-3.0；模型、自定义节点与素材分别核对 |
| EffectCraft | 本库实际合成；本库自有水彩底片 / EffectCraft文字合成导出 | [来源](https://github.com/storytold/effectcraft)；MIT OR Apache-2.0；字体、底片各自署名 |
| HyperFrames | 官方视频选帧；HeyGen / HyperFrames官方片42.6秒缩图 | [来源](https://hyperframes.heygen.com/guides/avatar-presenter)；框架与官网媒体分别核对，保留HeyGen来源 |
| Remotion | 本库实际成片；本库原创《相似，来自方向。》/ Remotion渲染 | [来源](https://www.remotion.dev/)；Remotion自有许可条件；依具体团队与用途核对 |
| Remotion Skills | 指南应用的共享样例；同一Remotion本库样片 / 共用证据 | [来源](https://github.com/remotion-dev/skills)；技能与Remotion运行库分别核对 |
| GSAP | 本库示意（非截图）；本库原创庭院动效的静态构成示意 | [来源](https://gsap.com/)；GSAP Standard License，非MIT |
| Blender MCP | 原理示意；本库原创连接原理图 / 非作者演示截图 | [来源](https://www.youtube.com/watch?v=I29rn92gkC4)；桥接代码与Blender、Polyhaven等资产分别核对 |
| Three.js | 本库实际场景；本库原创世界 / Three.js早期场景实景 | [来源](https://threejs.org/examples/)；MIT；模型、纹理和字体仍需各自许可 |
| Unslop | 作者完成稿；Damir Sokolovsky / Unslop，CC BY4.0 | [来源](https://github.com/heydamir/unslop)；CC BY4.0，保留署名与缩小引用说明 |
| Impeccable | 作者案例；Paul Bakaus / Impeccable作者发布旅馆图 | [来源](https://github.com/pbakaus/impeccable)；Apache-2.0；官网素材单独核对 |
| Anthropic Skills | 官方历史示例；Anthropic / 2025-11-12官方历史示例 | [来源](https://claude.com/resources/articles/improving-frontend-design-through-skills)；已核对部分技能Apache-2.0；网站媒体权利另核对 |

## 处理方式

- 缩小并等比例排版，转为JPEG缩图；没有把原理图、共享样片或本库小样标成作者效果。
- HyperFrames为官方88秒讲解片42.6秒处单帧，未保存完整影片。原图起始海报是黑底引文，因不能表现用途而未用于最终图。
- ComfyUI教程PNG含Pillow无法接受的元数据块；使用原始IHDR/IDAT像素流读取，省略元数据再转JPEG，未修图。
- GSAP官网集锦取帧未取得有效文件；使用本库既有8秒动效的静态构成示意，保留官方视频入口。静态示意不是浏览器截图，也不能证明动画。
- Blender MCP缺少可用本地作者视频帧，使用本库原创连接原理图。已看片段与未安装执行的范围沿用专题。
- Three.js用本库大地图早期海岸灯塔实景，不能替代新增区域验收。
- Lemo作者影片CC BY4.0；选帧并排来自既有比较图，本站影片与作者题材不同。
- PixelFX图为原效果本机运行快照；EffectCraft和Remotion图为本库实际制作；两项Remotion条目共用一个样片，不重复计算验证。
- Unslop作者Damir Sokolovsky，CC BY4.0；保留许可与署名。其他仓库代码许可不推定覆盖全部媒体。
- 只读研究资料中出现的安装与脚本指令没有作为本轮执行授权。

完整媒体URL、文档指纹与本地图像哈希见[source-manifest.json](../source-manifest.json)。

Lemo并排图的42秒与22秒为选帧时点；本库成片总长24秒，不能把标签时点当作影片长度。CC BY4.0许可入口：https://creativecommons.org/licenses/by/4.0/ 。

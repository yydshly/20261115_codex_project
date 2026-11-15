# 来源与研究范围

研究日期：2026-11-15，Asia/Shanghai。通过 Codex 内置浏览器读取公开页面。

## 原始清单

[X 原帖](https://x.com/okapi_fukugyo/status/2121725407867351215)提供 18 个仓库链接，并宣称可把清单交给 Muse 虚拟机内的 Claude Code 或 Codex 使用。本研究保留清单及原始顺序，未验证 Muse 环境和整套自动制作效果。

## 官方资料

以下是本轮实际阅读范围；分支名来自 GitHub 页面上的 README 链接，不等同于固定版本。除明确记录的提交外，不推断或虚构 HEAD SHA。后续进行安装和渲染实验时，应再固定版本或提交。

| 项目 | 阅读入口与分支 | 核对内容 |
| --- | --- | --- |
| Remotion Skills | [main README](https://github.com/remotion-dev/skills/blob/main/README.md) | 官方 Agent Skills 定位、13 个入口、安装命令与 Codex 支持 |
| Motion Canvas | [main README](https://github.com/motion-canvas/motion-canvas/blob/main/README.md) | TypeScript 动画库、预览编辑器与旁白同步 |
| Motion | [main README](https://github.com/motiondivision/motion/blob/main/README.md) | 平台、动画能力、官方 AI Kit 与 Motion+ 边界 |
| Ola | [仓库默认分支 README](https://github.com/franciscop/ola) | 多维数值插值、设值与即时读取机制 |
| Anime.js | [master README](https://github.com/juliangarnier/anime/blob/master/README.md) | 适用对象、v4 用法及迁移文档入口 |
| Manim | [main README](https://github.com/ManimCommunity/manim/blob/main/README.md) | 社区版定位、Scene 示例、依赖及预览流程 |
| Shifty | [main README](https://github.com/jeremyckahn/shifty/blob/main/README.md) | 补间、缓动、Promise 与迁移说明 |
| Two.js | [dev README](https://github.com/jonobr1/two.js/blob/dev/README.md) | 二维绘图 API 与 SVG / Canvas / WebGL 渲染 |
| Lottie Web | [master README](https://github.com/airbnb/lottie-web/blob/master/README.md) | 播放器用途与 Bodymovin 导出流程 |
| TweenJS | [master README](https://github.com/CreateJS/TweenJS/blob/master/README.md) | 链式补间、数值 / CSS 属性及 Timeline |
| LUME | [main README](https://github.com/lume/lume/blob/main/README.md) | HTML 元素、CSS3D 与 WebGL 场景 |
| gifenc | [main README](https://github.com/mattdesl/gifenc/blob/main/README.md) | 量化、调色板、逐帧编码及无抖色限制 |
| Konva | [master README](https://github.com/konvajs/konva/blob/master/README.md) | 场景图、对象交互、变换与编辑器定位 |
| Blender | [main README](https://github.com/blender/blender/blob/main/README.md) | 三维制作管线、GitHub 镜像身份与许可说明 |
| Three.js | [dev README](https://github.com/mrdoob/three.js/blob/dev/README.md) | 场景、相机、几何体、渲染器与动画循环 |
| Godot | [master README](https://github.com/godotengine/godot/blob/master/README.md) | 二维 / 三维引擎定位和应用导出 |
| Babylon.js | [master readme](https://github.com/BabylonJS/Babylon.js/blob/master/readme.md) | Engine / Scene 示例、安装与实验 CDN 边界 |
| Proton | [master README](https://github.com/drawcall/Proton/blob/master/README.md) | 粒子、行为、渲染器及包名 proton-engine |
| Motion AI Kit（补充） | [官方仓库 README](https://github.com/motiondivision/ai-kit) | /motion Skill、文档 MCP、CSS 弹簧、Codex 安装位置与 Motion+ 能力 |

Remotion 仓库页面本轮可见的最新提交为 [`7e541aa4d7361dfaca0780a565a47307eb7bdfbb`](https://github.com/remotion-dev/skills/commit/7e541aa4d7361dfaca0780a565a47307eb7bdfbb)；README 行显示的最近变更提交为 [`c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271`](https://github.com/remotion-dev/skills/commit/c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271)。这两个值来自页面，不将它们套用于其他仓库。

## 信息分层

- 官方能力：以各仓库文档说明为依据，采用独立中文摘要。
- 本站归纳：六类能力方向、四条制作路线、推荐使用场景与提示词。
- 已验证结果：仅限本地展示页及其交互，见 [verification.md](verification.md)。
- 尚未验证：上游安装、具体作品渲染、不同工具间集成、Muse 的运行方式及完整自动制片效果。

“有官方 Skill 入口”目前明确对应 Remotion Skills 与 Motion AI Kit。其他项目未在本轮 README 阅读范围内确认独立官方 Skill，未据此否定第三方或未查阅渠道的相关能力。

## 许可与素材处理

没有复制上游代码、长篇文档、样例视频、Logo 或第三方截图。网页的几何图形、图标和字母标记为本站原生绘制。分类封面为本站信息图，应标注为自绘概览，不得当作上游运行结果。

本轮未完成逐项目商业使用许可审查。正式引入工具、源码、模板、模型或音视频素材时，需记录各自许可及所用版本。Motion 基础库与 Motion+、Remotion Skills 与 Remotion 产品许可也需分别核对。

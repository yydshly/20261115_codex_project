# 技术效果全景图：来源与复现

2026-11-15。研究仍暂缓，本轮只改进总结的视觉呈现。文字源为 `../understanding.json`，18 项媒体的来源、角色和归因统一保存在 `../effect-media.json`。

## 本轮改动

- 总图由 3600×5900 改为 3600×8300；18 张技术卡片都接入大幅效果图，保留输入输出、作用、场景、效果、成本与建议。使用真实媒体，没有用生成式图片伪造运行截图。
- 网页默认动态效果图谱；其中 8 项可直接播放，可暂停全局动效、点击放大、查看来源，六项可切到本站实际运行的交互实验。网页遵循减少动态效果的系统偏好，只播放进入视区的预览，离开视区或打开大图时停止背景播放。
- 高清总图与动态图谱使用同一组文字和画面；静态图保留实际关键帧，不能替代播放效果。SVG 内图片可点击打开对应来源，技术名称可打开仓库。

## 图片角色与出处

| 技术 | 当前画面 | 归因边界 |
| --- | --- | --- |
| Remotion / Motion Canvas | 本站同案改稿实际成片 | 本站脚本和设计；不是工具能力上限 |
| Manim | Community 的 OpeningManim.mp4 | 官方公式与非线性网格变换预览，不是本站新制作 |
| Lottie | lottie-web 官方 Example3.gif | 产品动效资产的发布预览；设计和关键帧不是播放器自动创作 |
| Anime.js | 作者发布的 v4 深色标志动画 | 动画预览，原作按钮进入完整官网；没有复制受限代码 |
| Motion | 本站景深画廊短片 | Motion 实际弹簧轨迹；Remotion 逐帧采样输出。照片取自 Motion 官方仓库公开示例，非本站原创照片 |
| Ola | Olivier3lanc 的 DARK 页面预览 | Ola 仅平滑部分数值；整体还用滚动工具和影视素材，非 Netflix 官方站 |
| Shifty | ProgressBar.js 发布的 animation.gif | 上层组件，依赖 Shifty 2.x；不等于验证 3.x 直接替换 |
| TweenJS | ZIM 官方发布的 Scrambled Pics 拼图图 | ZIM 动画使用 TweenJS，属于框架层归因 |
| Two.js | 官方 examples 页面发布的示例效果集 | 二维描边、裁切、渐变等总览，不是完整视频模板 |
| Konva | 官方收录的 Polotno Canvas Editor 图 | Polotno 是商业上层 SDK；完整模板、面板等不由 Konva 自动提供 |
| Proton | 作者官网公开粒子效果图 | 官方效果预览，不是本项目新运行验证 |
| Three.js | 官方 physical transmission 示例截图 | 展示材质、场景和照明；不是该库自动生成资产 |
| Blender | Blender Studio《Sprite Fright》官方影片封面 | 电影作品预览，不是本项目运行完整工程 |
| LUME | 官方 glTF 示例所用 Damaged Helmet 模型资产预览 | **不是本站 LUME 截图**。ctxwing 重建转换：CC BY 4.0；theblueturtle_ 原版本：CC BY-NC 4.0。出处和许可见模型原 README，网页保留 LUME 实际示例入口 |
| Babylon.js | 官方 Clustered Lighting 场景图 | 官方效果预览，本项目未复现场景 |
| Godot | 官方 Showcase 的 DOGWALK 游戏截图 | Blender Studio 制作，Godot 运行游戏；本项目未复现工程 |
| gifenc | 本站 LOOP PRESS 实际编码 GIF | Canvas 创作画面，gifenc 只量化和编码 |

LUME 模型来源与许可：[Khronos glTF-Sample-Assets / DamagedHelmet](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/DamagedHelmet/README.md)。其余完整图片 URL 和逐项原作地址见媒体清单。Spotify 的实际案例分析仍在 cases.html 中保留；当前总图的 Lottie 画面采用官方仓库可访问的公开动图，没有用其他图片冒充 Spotify。

第三方媒体权利属于原作者。公开预览不意味着允许任意再分发：本轮仅本地研究，没有部署。下载的预览、视频、栅格导出位于 Git 忽略的 `web/public/summary/`；含嵌入媒体的生成 SVG `assets/technology-understanding.svg` 也已忽略。保留结构化来源和生成脚本。字体为本机微软雅黑，未嵌入字体文件。

## 复现

Windows，Python 3.10+、Pillow、OpenCV，已安装的 ffmpeg、Motion、Remotion；没有新增框架或依赖。下载只获取公开预览，访问受限时不尝试绕过；需更换合法可用的来源，不能假称下载成功。

```powershell
python projects/0001-animation-skills-atlas/scripts/fetch_effect_media.py
# 先按 comparison/README.md 和原 showcase 流程重建本站成片与 gifenc 文件。
cd projects/0001-animation-skills-atlas/web
npx remotion render remotion/EffectGallery.jsx MotionGallery public/summary/effects/motion.mp4 --codec=h264 --concurrency=2
cd ../../..
python projects/0001-animation-skills-atlas/scripts/prepare_effect_media.py
python projects/0001-animation-skills-atlas/scripts/render_understanding.py
```

`fetch_effect_media.py --force three` 可刷新指定公开预览；缓存存在时默认复用。`prepare_effect_media.py` 提取实际帧、将 GIF 转为可暂停的视频预览并生成 18 项联系图，保存帧位置记录到 `prepared.json`。`render_understanding.py` 生成 SVG / PNG，正文行数超出预算就报错，缺少真实预览也会报错，不自动拿另一项图片替代。

## 检查范围

已查看 18 项预览联系图、整图和原尺寸卡片，正文预算检查无超出。构建、登记表、媒体文件和本地 HTTP 检查记录随项目保存。当前会话没有可控制的内置浏览器工具，因此没有声称完成点击、播放、移动端布局的真实浏览器验收。

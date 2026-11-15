# 真实案例研究 · 2026-11-15

用户需要官方或成熟项目的实际作品，并理解为何选这些库、何时继续用 Remotion。此前的六件本站原创作品只作为机制辅助；本轮以一手证据和原作画面为主。

## 来源方法

普通网页与链接先用内置浏览器访问；针对使用关系查项目 README、官方文档、依赖清单与公开源码。搜索结果只用于找线索，不用搜索摘要或 AI Overview 代替项目证据。当前网页的结构化来源与案例内容在 `web/cases-data.js`。

### Lottie：Spotify Wrapped

[Spotify Engineering / Exploring the Animation Landscape of 2023 Wrapped](https://engineering.atspotify.com/2024/01/exploring-the-animation-landscape-of-2023-wrapped)，2024-01-24，Zela Taino。

团队说明跨端共用品牌动画采用 Lottie，数据可视化和交互继续原生实现；并讨论设计师与工程师的职责、素材体积与下载风险。案例页只远程引用其中明确标注为 Lottie 与原生的两幅对照动图，不把其他年度动画、个性化卡片或完整 Wrapped 都说成 Lottie 实现。

### Anime.js：官方完整网站与作者作品

- [官方完整网站](https://animejs.com/)：实际打开看到完整运动视觉；官网展示滚动、SVG、错时、拖动等能力。
- [官方 v4 作品集](https://codepen.io/collection/Poerqa)：从官网链接进入，包含 Three.js adapter、文字磁吸、Scramble Text 等作者作品。
- [文字磁吸原作](https://codepen.io/juliangarnier/pen/pvjEzgz)：公开代码明确导入 Anime.js，并将指针距离与字符动画连接。
- [官方仓库](https://github.com/juliangarnier/anime)：README 发布 `assets/images/animejs-v4-logo-animation.gif`。

官网及 CodePen 嵌入在本次浏览器中均显示拒绝连接，最终改为官方公开动图＋独立原作链接，没有绕过 frame 限制，也没有复制官网实现或制作仿作冒充原作。官方作品不等于商业客户采用证明；Three.js 等上层/渲染库的贡献单独注明。

### gifenc：p5.js 和 looom-tools

- [p5.js v2.4.0 的 loading_displaying.js](https://github.com/processing/p5.js/blob/v2.4.0/src/image/loading_displaying.js)：通过 GitHub 可读的 file content 核实 `GIFEncoder`、`quantize`、`nearestColorIndex` 来自 gifenc，`saveGif()` 内实际创建编码器；p5.js 自行实现了部分像素映射流程。
- [p5.js saveGif 官方说明](https://p5js.org/reference/p5/saveGif/)：从运行中的 sketch 生成 GIF，说明时长和延迟参数。
- [gifenc 官方 README](https://github.com/mattdesl/gifenc) 直接指向 [looom-tools](https://github.com/mattdesl/looom-tools)；[固定提交的 record.js](https://github.com/mattdesl/looom-tools/blob/dd04eb2985a8defec3dc9874600ca033bda5d96f/site/components/record.js#L250) 明确导入 GIFEncoder。
- [原作工具](https://looom-tools.netlify.app/) 实际打开可见默认手绘角色循环与导出工具栏；项目自述 experimental/WIP，不能包装成成熟商业软件。

画作、线条和动画由 Looom/渲染系统产生；gifenc 参与文件编码。没有把默认画作说成 gifenc 创作，也没有宣称该画作一定是源码固定提交导出的同一 GIF。成熟项目证据来自 p5.js 的实际调用。

### TweenJS：ZIM / Scrambled Pics

- [ZIM 项目介绍](https://zimjs.com/scrambled.html) 明确产品使用 ZIM 与 Scrambler，链接实际产品与公开编辑器示例。
- [ZIM 官方动画说明](https://zimjs.com/tips.html) 明确 `animate()` 由 CreateJS TweenJS 驱动，并区分上层封装。
- [实际产品](https://scrambled.pics/) 打开后可见启动说明；点击 Start 后需要选择图片继续。未上传用户图片、未购买、未创建分享记录。

这是“产品使用框架、框架动画方法使用底层库”的证据链，等级 B。没有审计整站所有动画调用，不能将全套拼图、渲染和业务功能归给 TweenJS。CreateJS 官网的通用作品墙也不作为每个作品使用 TweenJS 的直接证据。与 `@tweenjs/tween.js` 区分。

### Shifty：ProgressBar.js

[官方仓库](https://github.com/kimmobrunfeldt/progressbar.js)、[package.json](https://github.com/kimmobrunfeldt/progressbar.js/blob/master/package.json)、[官方可运行实例](https://kimmobrunfeldt.github.io/progressbar.js/)。检查时 package 为 1.1.1，依赖 Shifty `^2.8.3`。

它证明底层补间引擎被实际组件封装，不证明电影级上限。案例使用旧主版本，不将其表述为本站验证过当前 Shifty 3.x 与该组件的兼容性。普通开发者应先评估上层组件是否已经满足需要。

### Ola：DARK HTML5 cinematics

- 初始官方 README 只有机制示意；进一步搜索得到 [Scroll-Btween](https://github.com/olivier3lanc/Scroll-Btween)，其说明把 Ola 定位为可选平滑增强，并提供 With/Without Ola 对照。
- 其作品墙链接 [DARK HTML5 cinematics](https://github.com/olivier3lanc/folio-dark)。README 明确列出 Ola、ScrollBtween、ScrollFrames，说明通过 Photoshop 处理素材并压缩帧序列。
- [完整原作](https://olivier3lanc.me/folio-dark/) 实际打开看到镜像片头、章节导航和滚动提示；页面实际 script src 包含 `js/ola.min.js`、`scroll-frames.js`、`scroll-btween.js`。

新证据足以把案例从“只有基础示意”更新为“完整个人作者作品＋直接使用声明”。它不是 Netflix 官方案例，不等于已经核实成熟商业客户；Ola 也不负责影视素材、构图、帧序列渲染等整套效果。

## 与 Remotion 比较的边界

[官方 Player 文档](https://www.remotion.dev/docs/player) 明确可嵌入 React 应用并在运行时改变内容，包含交互与 Drag & Drop 相关入口。[官方 GIF 文档](https://www.remotion.dev/docs/render-as-gif) 明确支持 `--codec=gif`。

因此不采用“Remotion 不能交互/不能导 GIF”这样的比较。本站判断：成片、音画、字幕与批量渲染优先继续用 Remotion；需要运行时网页输入、跨端动画资产或对现成 Canvas 像素编码时，再按任务增加相应工具。此判断不是案例团队对 Remotion 的使用评价；也没有证据说这些团队都比较过 Remotion。

原作通过远程图片或 iframe 展示；需要网络与原站可用。没有下载或提交第三方媒体，没有配置发布。

## 本地网页验收

- `npm run build` 通过，新增 `cases.html` 多页面入口；没有依赖变更。
- 六个案例 ID 唯一，所有使用证据键均能指向来源，每项都有职责、使用条件及 Remotion 对比。
- 内置浏览器打开本地案例页，确认 Spotify 两幅原作 GIF 实际加载，naturalWidth 均为 410；截图检查原作对照与文字说明。
- 实际打开过 Looom 原作默认手绘循环；本地 iframe 加载出工具栏。ProgressBar.js 的本地 iframe 可读取到原站组件内容；最终改为从其 Circle 锚点进入。
- 官网与 CodePen iframe 都显示拒绝连接，移除了这两个失败 iframe。Anime.js 最终使用官方仓库公开的 logo 动图，保留完整网站与作者原作入口；没有代理、复制源码或绕过限制。
- 《DARK》独立原站已通过内置浏览器实看，最终加入本地 iframe；Scrambled Pics 独立原站已实看启动说明及 Start 后的待选图状态。
- 最后额外只请求公开 HTTP 响应头：Anime.js 动图、DARK、Scrambled Pics、ProgressBar Circle 均返回 200。动图为 image/gif；后三个 HTML 未返回 X-Frame-Options/CSP 限制。响应头检查不代替完整的最终浏览器播放验收；最终替换的 Anime.js 图片和 DARK 本地嵌入未再做完整交互复验。
- 本地默认内容宽约 725px 时没有水平溢出；未重新声称完成全部手机端/各浏览器测试。对照表在窄屏使用容器内横向滚动。
- 根 `projects.json` 的摘要同步更新，并通过登记表检查；其他项目内容保持原状。

## AI 视频为主时的搭配判断

追加入口 `cases.html#ai-video`，内容源文件 `web/ai-video-section.html` 由 `cases.js` 通过 Vite raw import 插入，无重复手工拷贝、无新增依赖。

本轮内置浏览器工具未提供，资料改用网页检索直接打开官方页面；未假称通过内置浏览器核查这些新增来源：

- [@remotion/lottie](https://www.remotion.dev/docs/lottie/)：官方显示组件、速度/方向控制及部分表达式的确定性限制。它降低已有素材接入成本，不能代替素材设计或兼容验片。
- [Third party integrations](https://www.remotion.dev/docs/third-party)：动画须与当前帧同步，明确列出 Lottie 包和 Anime.js 集成示例。
- [remotion-dev/anime-example](https://github.com/remotion-dev/anime-example)：关闭自动播放，再用 frame/fps 对应的时间 seek；不是商业提效案例。
- [示例 package.json](https://github.com/remotion-dev/anime-example/blob/main/package.json)：Anime.js 4.0.2、Remotion 4.0.298；不等于本项目 4.5.0 / 4.0.543 组合已验证。
- 官方集成页引用的第三方文章 `revidcraft.com/posts/remotion-part-02` 返回 404，未据此引用省时或效率收益。
- [Rendering GIFs](https://www.remotion.dev/docs/render-as-gif)：作品已在 Remotion 中可直接导 GIF，gifenc 对纯视频输出通常不增加必要能力。
- [Animating properties](https://www.remotion.dev/docs/animating-properties)：核对按帧插值、缓动与渲染要求。

收益分析与原案例分开：Spotify 的实际收益是多端共用；对单一视频流程，可迁移的收益是复用已设计的资产。DARK 的完整视觉由素材和多种工具产生，Ola 的滚动输入平滑并不自动帮助固定视频。p5.js 的编码收益属于已有 Canvas 工具，不能据此说 Remotion 视频必须再接 gifenc。

没有新增动画集成实测、计时基准或提效百分比；没有把 API 更短等同于成片质量更高。新增网页段落完成构建检查，本轮未做浏览器视觉复验。

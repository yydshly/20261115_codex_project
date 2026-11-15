# 六种能力作品验收 · 2026-11-15

新增入口：`web/showcase.html`。保留旧目录、基础实验与三工具同案成片，不用新作品覆盖历史结果。

## 环境与来源

- Windows，本机 Node.js 22.15.0、Vite 8.3.8；版本以 `web/package-lock.json` 为准。
- Ola 1.2.2、Shifty 3.0.6、TweenJS 2.0.0-beta.4、Anime.js 4.5.0、lottie-web 5.13.0、gifenc 1.0.3。
- 通过内置浏览器查阅官方 README、Anime.js v4 的 `createDrawable` 和 Timeline API；TweenJS Timeline 构造器及生命周期另核对已安装包源码。
- 官方来源：[Ola](https://github.com/franciscop/ola)、[Shifty](https://github.com/jeremyckahn/shifty)、[TweenJS](https://github.com/CreateJS/TweenJS)、[Anime.js createDrawable](https://animejs.com/documentation/svg/createdrawable)、[Anime.js Timeline](https://animejs.com/documentation/timeline/add-animations)、[Lottie Web](https://github.com/airbnb/lottie-web)、[gifenc](https://github.com/mattdesl/gifenc)。
- 图形、配色、排版、地图、耳机、海报和 Lottie 数据均为本站编写，无第三方图片、视频或字体素材。Lottie JSON 由代码生成，没有使用 AE；没有验证 AE 导出流程。

## 真实运行与交互

在内置浏览器分别验证开发服务与 `npm run build` 的生产输出：

| 作品 | 已验证结果 |
| --- | --- |
| FORM / Ola | 600 个独立插值对象实际运行；星环/双螺旋/波阵切换；平滑开关与时长控件；指针输入参与坐标目标计算 |
| NOCTURNE / Shifty | 镜头目标切换、暂停、源时间定位；河岸镜头 1.80 秒为 1.185×；植物园镜头 1.80 秒为 1.26×，实际 SVG camera transform 与输出一致 |
| PARCEL / TweenJS | Timeline 同步包裹、扫描光、机械臂、出口门、传送带；阶段日志由 `.call()` 触发；暂停后多次读取均为 0.11 秒，恢复按钮可用；完整流程有五条真实回调记录 |
| AURA / Anime.js | 原创耳机矢量插画可见；真实 createDrawable 路径描边与 stagger 分字；定位 4.30 秒后产品填充、字母不透明度均为 1；重播和暂停/继续可用 |
| CLOUDPOST / Lottie | 同一原始 JSON 三个实例复用；成功/重试文案与片段联动；SVG 切换 Canvas 后实际生成三个 canvas；源帧定位；浏览器实际下载 JSON |
| LOOP PRESS / gifenc | 初始自动生成真实 GIF；修改标题 STAY CURIOUS 后重新编码；256 色与 32 色结果可见；图片 naturalWidth 为 480；实际下载并用 Pillow 解码核对尺寸、帧数与时长 |

生产构建中的六个示例均已切换或操作，浏览器错误日志为空。这里的逐项验收是人工交互检查，不代表全 API、所有设备或长时间稳定性测试。

## 文件检查

下载结果而非预览模型：

- `cloudpost-original.json`：400×400、30 fps、240 源帧、20 个矢量图层，三个标记 `uploading` / `delivered` / `retry`；无位图资产。约 30.5 KiB。
- `motion-atlas-poster.gif`：STAY CURIOUS / Lime / 256 色，557443 字节；Pillow 解码为 480×320、36 帧、累计 2880 毫秒、可循环播放。
- 同一文案的 32 色结果，浏览器显示约 481.3 KiB；256 色约 544.4 KiB。这是该画面的实测，不是文件大小的一般性保证。
- 编码用时显示单次本机耗时，不作为通用性能排名。
- 保存的本地交付副本位于被忽略的 `web/public/showcase-assets/`；源设计在 `web/studio/`，可重新生成。

## 视觉与布局

- 桌面默认视口约 1265×712，逐项截图检查：生成粒子、带镜头信息的原创城市、工厂流水线、完整耳机发布稿、三处 Lottie 复用、GIF 原稿/结果并排。
- 手机视口 390×844（可用内容宽约 375），检查品牌、粒子、Lottie 与 GIF 布局；文档宽等于可用宽，无水平溢出。
- 手机验收发现绝对定位场景在只有 min-height 的父级中高度归零，已改为明确的 370px 场景高度，再截图确认内容可见。品牌参数改为底部一排；长海报标题按实际字宽收缩。
- 临时视口覆盖已恢复。

## 构建与边界

`npm run build` 通过，新增 showcase 多页面构建入口。既有依赖仍有 chunk 大小、Lottie eval 和 Remotion use-client 等非致命构建提示，未改动依赖实现。

快速切换时，在依赖加载完成后检查当前作品是否仍被选中，旧作品不再挂载。切离时停止 RAF、Tweenable、Timeline、Anime 时间线、Lottie 实例及 Blob URL。

这些作品展示真实运行时控制和交付，不声称其他库无法达到相同画面，也不声称是工具的最佳上限。没有验证原生移动端 Lottie、跨浏览器兼容性、网络上传、真实出库或真实地理地图。没有配置发布或外部托管。

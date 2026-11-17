# 下半区预览质量复查

2026-11-16，先查看原联系表 3、4，再从公开官网 HTML 定位作品、组件与工具界面。结果保存在 `example-overrides.json`，主预览清单未由本任务直接修改。

仅合并 `status: "ok"` 的记录。当前有 19 项：55、59、66、71、72、74、79、81、82、83、84、85、86、90、92、93、95、96、98。其中 74 为原有着色器封面的 HTTPS 来源修正；其余为比 logo、头像、品牌社交卡更具体的内容。

- 55：Art Gallery 社区交互片段的真实封面，原作者 Enzo Manuel Mangano，带对应片段入口。
- 59：Kinetic Token API Concept 的实际作品预览，带 Recent 具体条目。
- 66：Dark Mode Design 收录的 Vitrine 网页图，带对应网站入口。
- 71：GSAP 官方 MacOS Dock Effect 示例封面，带对应演示。
- 72：Three.js 官方 `webgl_animation_keyframes` 渲染截图。文件名来自官方 `files.json`，缩略图路径规则来自官方 examples 页源码。
- 74：官网元数据中已有 `https://thebookofshaders.com/thumb.png`，实际取图成功；不是静默把未经验证的 HTTP 地址改写为 HTTPS。
- 79：Motion 官方 iOS App Folder 示例，带具体示例入口。
- 81：coss ui 的 Card 文档与实际组件区截图，不是站点 logo。
- 82：Josh W. Comeau 的 Squash and Stretch 文章中，公开动画 `jwc-popular-content-light.mp4` 的 0.8 秒抽帧。只保留小图，原视频不进入项目。
- 83：Rauno 的 Craft 页面中 Posters 作品，非作者头像。
- 84：Emil Kowalski 的 toast 组件制作文章中的 docs 界面图。
- 85：Typewolf 的 Daylight 排版案例，带具体案例页。
- 86：Fonts In Use 的 Mythologies 展览字体案例，带具体案例页；采用案例页较大图，不用首页 220px 小图。
- 90：Utopia 字号计算器界面。
- 92：Realtime Colors 实际页面中的颜色预览界面。
- 93：Radix Colors 自定义色阶工具界面。
- 95：Pinterest 官方 Holiday starter pack 示例图与画板入口。
- 96：Are.na Explore 的公开收藏浏览界面。
- 98：Savee 官网公开展示的精选图像，完整单图署名未核实，仅保留官网展示来源。

## 未强行替换

- 63：仓库 HTML 中可取得的主要是徽章、推广图和 GitHub 品牌图，未发现可以确认为其设计规则输出结果的作品截图，保留原预览与仓库入口。
- 80：React Bits 组件画廊截图为空白；保留原有预览和组件站入口。
- 88：Fontshare 首屏截图的字体内容尚未加载，仅有空表格；未将其当作有效字体案例。
- 91：Coolors 两个入口的截图均被首次访问引导弹窗覆盖；保留原官方预览，不把被遮挡页面当作工具成果。
- 94：tweakcn 实际首页截到营销标题，原有社交图反而清楚展示主题组件，保留原图。
- 57、89、97：保留已有内容。未为完成数量指标而虚构具体项目或推测深层地址。

## 取图与权利

作品图从官方页面引用的公开资源取得；工具/组件页面截图由 thum.io 服务生成，清单逐项明确区分。图片经缩放为本地研究缩略图，完整来源、时间、尺寸和 SHA-256 见清单。截图只是取得时的页面外观，不代表登录、付费功能或动态交互已由本库完整验证。

各站及原作者保留作品、界面与品牌权利。此处来源说明不是商业使用或公开再分发许可；仍须遵守本项目的第三方素材与发布边界。

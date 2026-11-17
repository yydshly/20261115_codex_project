# 海底图片与文本来源

本目录服务于“海的生成”阅读网页。场景作者为 Maksymilian Dendura（Noniv），中文翻译、研究解释与网页编排为本库整理。

## 海底截图

- 原始场景：[Abyssal Garden 在线演示](https://noniv.github.io/abyssal-garden/)。
- 图片来自本库 `0004-abyssal-garden/assets/SOURCES.md` 所记录的 **2026-11-15** 内置浏览器实际运行截图。
- `overview-live.jpg`：视点 1，鲸尾石雕、海藻森林与鱼群，隐藏性能 HUD。
- `shipwreck-live.jpg`：视点 2，沉船、岩石峡谷与蝠鲼，保留性能 HUD。
- `purple-grotto-live.jpg`：视点 6，紫粉色植物、海绵、洞窟与光束，保留性能 HUD。
- 本轮原样复制这三张图片，未重绘或修改像素；网页使用 CSS 裁切预览，大图保留完整画面。已目视检查未见私人信息。
- 图像展示上游作品，不能归为本库原创三维场景。页面没有把截图当作新海底作品的制作成果。

## 原始提示词与翻译

- 英文：`prompt-original.txt`，来自 [固定版本 prompt.txt](https://github.com/Noniv/abyssal-garden/blob/a596354eff400d458bc2aeb9bdf5e0a9734b2bcf/prompt.txt)。
- 原始 Git blob：`c23587a9f624bd4c98c830dbe69b2f6bb7f2122c`；检查脚本忽略文本文件末尾换行后核对该 blob。
- 中文：`prompt-zh.txt`，本次完整翻译；保留全部结构、场景条目、设备、数值及验收要求，不追加我们自己的要求。
- 上游操作行 `Q/E up/down` 在翻译中保留为上下移动；实际 README/代码为 Q 下降、E 上升。页面另作说明。
- 提示词里的性能和视觉要求是目标，不等于我们已经验证全部达到。

## 源码与许可

固定参考提交：`a596354eff400d458bc2aeb9bdf5e0a9734b2bcf`。在线运行版本未与该提交逐字节比对。

- [README](https://github.com/Noniv/abyssal-garden/blob/a596354eff400d458bc2aeb9bdf5e0a9734b2bcf/README.md)
- [世界布局](https://github.com/Noniv/abyssal-garden/blob/a596354eff400d458bc2aeb9bdf5e0a9734b2bcf/source/src/world.js)
- [光照与着色器](https://github.com/Noniv/abyssal-garden/blob/a596354eff400d458bc2aeb9bdf5e0a9734b2bcf/source/src/shaders.js)
- [相机、渲染与性能](https://github.com/Noniv/abyssal-garden/blob/a596354eff400d458bc2aeb9bdf5e0a9734b2bcf/source/src/main.js)
- [声音](https://github.com/Noniv/abyssal-garden/blob/a596354eff400d458bc2aeb9bdf5e0a9734b2bcf/source/src/audio.js)
- [开发基准工具](https://github.com/Noniv/abyssal-garden/blob/a596354eff400d458bc2aeb9bdf5e0a9734b2bcf/source/src/dev.js)

上游采用 MIT 许可，Copyright (c) 2026 Maksymilian Dendura。许可原文保留在 [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt)。本项目没有纳入上游渲染程序、完整源码仓库、依赖或 Git 历史。

## 2026-11-17 一图总结与原创提示词

- `understanding-summary.png`：本库原创图文排版，2400×5595；三个图片插图为上文实际运行截图，保留完整画面、仅按比例缩放，不重绘海底内容。
- `understanding-summary.svg`：相同内容的可编辑排版源文件，内嵌三张原始 JPEG；字体引用本机微软雅黑，不打包或分发字体文件。
- `understanding-summary-preview.jpg`：便于目视校对的缩小预览；高清交付以 PNG 为准。
- `summary-layout.json`：尺寸、日期、文本段数与三张原始截图 SHA-256。
- `our-sea-brief.txt` 与项目根目录 `OUR_SEA_BRIEF.md`：本次讨论原创提炼的海底世界任务书，**不是作者原文或翻译，尚未执行**。路线仅为设计示例，具体技术和性能预算在实际任务中确定。
- 图中的效果观察、价值判断与建议均来自本次讨论和既有源码调研；没有新增未验证的模型来源、性能或制作成果声明。

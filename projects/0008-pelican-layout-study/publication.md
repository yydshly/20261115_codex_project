# GitHub Pages 发布记录

2026-11-17，用户要求整理原作理解和实验效果、使用本轮生成总览图作引导、部署 GitHub Pages 并提交。仅发布本项目和必要的总库索引、统一构建配置；其他本地研究不随本次提交。

## 阅读入口与范围

固定公开路径：`https://yydshly.github.io/20261115_codex_project/demos/0008-pelican-layout-study/`。已实际访问并核验。

首页先展示引导图，再分析原作怎样成立、原作的艺术与规划价值，以及对我们的意义。保留20幕与真实结尾的逐幕证据、12份专题全文、12份数据和全文搜索。《光》《雨》、白鸟动效、七种连接和传送均可从实验区进入，状态和失败边界单独标注。

引导图使用用户选定的 `assets/research-understanding-map-20261117.png` 原文件（5400×4050），预览 JPG 为同图导出，点击打开完整 PNG；可编辑 SVG 也保留。总导航摘要覆盖原作价值、可迁移能力、扩展方向、实际效果及艺术质量局限。

## 素材与构建

原片仅引用支持研究评论的抽帧，保留原帖入口与逐图来源；不发布完整视频，不声明取得开放素材许可。我们的生成静帧、代码场景与实际截图分别标注。Three.js 及 Reflector 随附原始 MIT 许可证和来源记录。

标准库构建：`python scripts/build.py`；链接和资料检查：`python scripts/verify_research.py`；发布检查：`python scripts/check_publication.py`。图表重制脚本使用 Pillow 和本机字体，但 CI 直接使用已校验的图，不依赖 Pillow 或 Windows 字体。

原始生成 PNG、依赖目录、完整第三方历史、可再生 dist 与网页中间产物不进入 Git；原始 PNG 在本机保留。本项目接入统一 Pages artifact，不覆盖既有公开项目。

## 实际上线核验

2026-11-17 17:17（Asia/Shanghai）完成公开HTTP核验，并在内置浏览器实际访问。

- 内容提交：[4cc8b46](https://github.com/yydshly/20261115_codex_project/commit/4cc8b462d0827769b9c678fe85002e26bfdbb05b)。后续保留并行项目提交，修正SVG跨平台换行与校验记录。
- 完整构建与部署：[运行44053507316](https://github.com/yydshly/20261115_codex_project/actions/runs/44053507316)，提交 `bf65cd6b6effd25d0ee892932d652b5015fb8770`，build / deploy均成功。
- 232个公开文件全部返回HTTP 200，覆盖32个HTML页面、源码模块、样式、原片引用、实验画面及第三方运行时。三种引导图逐字节哈希与选定原件一致，PNG为 `a16cbc6f36af770f22d047cab175a1cdfc5e54784437b37cd4271905ce05fd2e`。
- 总导航含本项目、完整摘要、同图预览与完整PNG链接。内置浏览器核对12章与21场景；《雨》开始行旅并切到54秒空江，传送进入播放，《光》进入观看状态，抽查控制台无error/warn。
- 1280×900与390×844排版无横向溢出；真实公开首页截图为 `assets/publication-live-home-20261117.jpg`。详细HTTP清单：[publication-http-check.json](assets/publication-http-check.json)。
- 本次部署只证明研究页与实验入口可公开访问；未提升或重新通过实验艺术质量。最新文档提交补入正式 `demo_url` 与以上实测记录。

推送范围已比较：所有其他项目的Git树对象与登记项不变，无删除或重命名；必要总库变更仅为索引、白名单、路径触发和部署说明。没有强制覆盖远端更新。

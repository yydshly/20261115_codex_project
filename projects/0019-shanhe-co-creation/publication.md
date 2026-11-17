# 山河共造 · 网页发布记录

用户于 2026-11-17 明确授权整理理解、部署网页并提交远端，指定本轮生成的高清总览图作为引导图。

已发布，首次线上资源核验通过：2026-11-17 15:56（Asia/Shanghai）。projects.json 的正式地址在实际公开验证后填写。

## 公开入口

- [研究首页](https://yydshly.github.io/20261115_codex_project/demos/0019-shanhe-co-creation/index.html)：角色与环境、总览图、参考与价值、探索路线。
- [高清引导图](https://yydshly.github.io/20261115_codex_project/demos/0019-shanhe-co-creation/assets/shanhe-understanding-overview-v1.png)：3200×12684 原始 PNG。
- [完整故事](https://yydshly.github.io/20261115_codex_project/demos/0019-shanhe-co-creation/story.html)、[学习与多人机制](https://yydshly.github.io/20261115_codex_project/demos/0019-shanhe-co-creation/systems.html)、[后期产品](https://yydshly.github.io/20261115_codex_project/demos/0019-shanhe-co-creation/future.html)。
- [总导航](https://yydshly.github.io/20261115_codex_project/)与[GitHub项目](https://github.com/yydshly/20261115_codex_project/tree/main/projects/0019-shanhe-co-creation)。

## 提交、部署与验证

- [发布 PR #11](https://github.com/yydshly/20261115_codex_project/pull/11)，三项构建／登记检查通过后合并。
- 首次发布提交：[19123b30b5f4107daa82e64023532e26f9a1608a](https://github.com/yydshly/20261115_codex_project/commit/19123b30b5f4107daa82e64023532e26f9a1608a)。
- [Pages 运行 44042106202](https://github.com/yydshly/20261115_codex_project/actions/runs/44042106202)，build 和 deploy 均成功。
- 本地七页内容检查通过，完整正文 13 节／73 段，七张图片哈希一致。共享回归共 34 项：33 项通过、1 项仅适用本地预览的检查跳过。
- 隔离本机浏览器通过桌面与手机 14 项布局、81 项表决与 32 项进度组合，以及搜索、阅读、图片查看和本机手记检查。公开版总览图与新增价值内容在桌面和手机均通过检查。
- 首次线上核验 40 个公开资源 HTTP 200，七张图片 SHA-256 与归档一致，七页与全部 73 段故事完整；总导航摘要、价值说明与引导图匹配登记表，既有六个公开入口保留。详细结果见 [online-verification.json](online-verification.json)，网页检查与游戏能力分别记录。
- 正式站点的隔离浏览器验收通过：桌面与手机 14 项布局、81 项表决、32 项进度组合，以及图片切换、中文搜索、六区域、字号与阅读位置、本机手记和手机导航均通过，无页面错误或失败请求。测试等待高清图加载完成后再离开页面；此前测试提前切页造成的下载中止不作为网页故障。

## 发布范围

发布七页研究档案、六份原始视觉记录、3200×12684 高清总览图、完整故事、理解与价值资料及出处。Pages 只提供静态资料和浏览器内规则示意，不承载游戏、服务器或真实多人。

摘要从原帖的湖岸社交参考展开，说明原创族群与环境、完整故事草案、学习创造和多人叙事的理解，以及它们对玩家、学习、我们的创作与后期产品的意义。引导图使用 assets/shanhe-understanding-overview-v1.png 原文件，SHA-256 为 ec8be3195d61b6287a55201f3af5e96053eedc14584e03dbd73025a17741ba35。

## 构建和路径

主入口为 https://yydshly.github.io/20261115_codex_project/demos/0019-shanhe-co-creation/index.html 。项目 build.py --publication 与 check.py 接入统一 Pages 构建，保留既有六个公开项目；不发布其他聊天的本地研究内容。

本次在最新远端的独立工作树准备，仅提交 0019 项目和必要索引、发布配置与说明。未提交依赖、dist、_site、临时截图或本机浏览器缓存。既有图片的来源、许可边界和实际生成记录均保留。

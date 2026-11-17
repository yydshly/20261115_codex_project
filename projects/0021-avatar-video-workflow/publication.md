# 数字人口播研究网页发布记录

日期：2026-11-17。用户明确要求整理理解、部署网页并提交远端，引导图使用本轮生成的研究全景图。

## 本轮发布内容

- 六页研究档案：总览、效果实录、制作方法、选型与价值、复用模板、讨论与证据。
- 本轮生成的 3200×26588 完整 PNG、SVG、文字总纲与制图记录。索引用同一图的顶部预览，点击打开完整 PNG。
- 四段经过本项目后期处理的制作样片：5 秒平面、5 秒三维、10 秒整合、6 秒换配置验证。
- 可下载模板源码、配置示例和 SRT 格式示例；分开保存本地验证记录与公开发布检查。
- 完整原参考片和原始并排检查视频不进入发布包，原作保留原帖入口与署名截图。详细范围见 `THIRD_PARTY_NOTICES.md`。

## 发布方式

沿用研究库现有 GitHub Pages 工作流，统一生成 `/20261115_codex_project/demos/0021-avatar-video-workflow/`，保留已上线的动画图谱、知源与日常奇想页面。

媒体包由 `scripts/publication_media.py` 的四文件白名单生成，保存于 GitHub Release；`publication-media.json` 同时记录 ZIP 和逐文件 SHA-256。构建时先核对文件列表、路径、大小和哈希，再恢复静态媒体，不需要本机素材路径。

文字快照统一为 UTF-8 / LF 后重新核对哈希。研究图的生成时输入哈希在发生换行转换时另存为 `creation_bytes_sha256`，发布文件哈希对应 Git 中的实际文件；完整 PNG、SVG 与顶部预览字节均保持原样。

隔离发布分支为 `codex/publish-avatar-workflow`，从远端当时最新的 `main` 创建。登记表只合并 `0021`，没有提交原工作区其他尚未完成的研究。

## 当前验证

- 21 项仓库与发布测试通过，覆盖完整引导图跳转、媒体白名单、坏包拒绝与已有站点导航保留。
- 公开静态产物与完整原图校验结果见 `publication-verification.json`。
- 公网验收通过后已登记正式 `demo_url`，详细请求与哈希结果见 [live-verification.json](live-verification.json)。

## 已上线与公网验收

- [打开数字人口播研究网页](https://yydshly.github.io/20261115_codex_project/demos/0021-avatar-video-workflow/index.html)
- [发布 PR #7](https://github.com/yydshly/20261115_codex_project/pull/7)，合并提交 `f48690c338bb34750f8609584a6d493da529afbe`。
- [首次正式部署流水线](https://github.com/yydshly/20261115_codex_project/actions/runs/44014653316)：成功。
- 六个页面、46 个引用资源通过公网 HTTPS 检查；完整 PNG、SVG、预览及四段样片 SHA-256 与源文件一致。
- 四段视频的 Range 请求均返回 206，Content-Range 与文件大小吻合。
- 总索引包含本轮摘要与完整图跳转；原有动画图谱、知源、日常奇想三个页面均返回 200。
- 本轮线上验收检查 HTTP、实际文件和哈希；浏览器交互验证沿用单独保存的本地检查记录，没有将其写成新的线上交互验收。

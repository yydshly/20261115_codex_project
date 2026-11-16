# GitHub Pages 发布记录

本次发布将我们的理解、关注清单和研究方法整理到公开网页，以简化关系图作为首页和总导航的引导图。

## 内容与价值

- **发现**：平台提供代码、模型和产品候选，帮助缩小研究范围。
- **理解**：作者与长文解释原理、机制和取舍，补充标题及演示之外的信息。
- **验证**：仓库讨论、模型卡和实测记录支撑判断，保留失败、环境与限制。
- **实践**：按任务选择工具做最小试跑，把结果和报错带回验证，积累可复查、可复用的经验。
- **阅读引导**：先看 2400×1500 简化关系图，再按节点进入平台、作者和项目；完整长图、来源与检查表作为补充。

连线表示研究用途和使用顺序，不代表作者隶属平台、参与所列项目或工具必须组合使用。

## 发布配置

- 仓库：`yydshly/20261115_codex_project`，通过分支与 PR 接入 `main`。
- 公开前缀：`https://yydshly.github.io/20261115_codex_project/`。
- 项目入口：`demos/0009-ai-source-field-guide/index.html`。
- 关系图阅读页：`demos/0009-ai-source-field-guide/map.html`。
- 主引导图：`demos/0009-ai-source-field-guide/assets/relation-map.png`；同目录 SVG 保留可点击节点。
- 使用现有 GitHub Actions Pages 工作流，保留已上线的动画图谱，并明确加入此项目；不自动发布其他未完成项目。
- 页面由 Python 标准库导出，资源使用相对路径，无服务端依赖、远程字体或分析脚本。

## 发布状态

- 内容发布 PR：[#3](https://github.com/yydshly/20261115_codex_project/pull/3)，已合并。
- 内容提交：`ca3d772b141279eb2919b37e1a48489cf5e93224`；合并提交：`8be5650457694117d60cec3031b6a706b234e326`。
- 首次正式部署：[GitHub Actions 43808890762](https://github.com/yydshly/20261115_codex_project/actions/runs/43808890762)，构建与部署均成功。
- 在线指南：[index.html](https://yydshly.github.io/20261115_codex_project/demos/0009-ai-source-field-guide/index.html)。
- 关系图：[map.html](https://yydshly.github.io/20261115_codex_project/demos/0009-ai-source-field-guide/map.html)；总导航：[研究索引](https://yydshly.github.io/20261115_codex_project/)。
- 公开 HTTP 验收：2026-11-16 13:15:58（Asia/Shanghai），12 项全部通过，见 [publication-http-checks.json](publication-http-checks.json)。本次验收后回填 `demo_url`。
- 本地完整站点构建通过，11 项单元测试通过；原动画图谱的 44 份媒体恢复及完整性检查通过。PR 检查也已通过。
- 发布使用独立工作副本，只收录项目 0009 及必要的索引、测试和部署配置；未发布其他尚未纳入本轮的本地项目。

本记录描述上述内容版本的实际验收。在线链接、截图、HTTP 检查脚本与本记录随后作为发布归档更新提交，不将尚未完成的未来部署写成已验证。

## 检查范围

公开入口、脚本、样式、PNG / SVG 均返回 HTTP 200；本项目 10 个导出文件与线上内容一致（文本统一换行后比较，PNG 逐字节比较）。原动画图谱入口仍可访问。关系图为 2400×1500，根导航与指南首页均使用这一简化版本。

内置浏览器实际打开正式 HTTPS 页面，确认首页的价值说明、引导图、11 个入口、筛选与搜索；关系图缩放可放大并恢复适应宽度。390×844 视口下文档宽度和滚动宽度均为 375 CSS px，无页面横向溢出。实际截图见 [首页](assets/published-home.jpg)、[关系图](assets/published-map.jpg)、[窄屏](assets/published-mobile.jpg)。

复查命令：先运行 `python scripts/build.py`，再运行 `python scripts/check_publication.py`。它只核对本站公开资源，外部作者文章与第三方工具能力仍以各自来源及后续实测为准。

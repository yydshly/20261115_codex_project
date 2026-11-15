# 发布记录

本轮目标：保存完整研究内容，部署可公开浏览的动画制作技术图谱；根索引第一项提供摘要、内容与价值简述和新版引导图。

## 发布结构

- GitHub：`yydshly/20261115_codex_project`，主分支 `main`。
- 固定站点前缀：`https://yydshly.github.io/20261115_codex_project/`。
- 项目入口：`demos/0001-animation-skills-atlas/summary.html`。
- 总结、原始技能目录、真实案例、同案对比、自制交互、运行实验和来源页共 7 个页面。
- 18 张预览、8 段动态效果；同案初稿和改稿共 6 段实际成片。
- 源码、正式 PNG / SVG 引导图和文档进入 Git；44 项网站媒体单独发布，包 SHA-256 和逐文件哈希记录在 `publication-media.json`。

## 检查口径

本地以隔离工作树从 lockfile 安装依赖并构建，避免其他聊天的未提交项目进入本次发布。索引由 `projects.json` 生成，项目保持第 1 项和暂缓研究状态。

实际检查包括正文排版、18 张画面、媒体解码、包校验、网页构建、站内文件与子路径、公开 HTTP 响应，以及 GitHub Actions Pages 部署结果。当前会话没有可控制的内置浏览器，因此不把静态检查写成浏览器点击验收。

## 首次上线结果

- [公开总导航](https://yydshly.github.io/20261115_codex_project/)，HTTP 200。
- [完整在线总结与效果图谱](https://yydshly.github.io/20261115_codex_project/demos/0001-animation-skills-atlas/summary.html)，HTTP 200。
- 首次发布通过 [PR #1](https://github.com/yydshly/20261115_codex_project/pull/1) 正常合并，提交 `00462ebc3479994e9c982a6fb667db4a86e2cb3b`；未直接推送默认分支。
- [GitHub Pages 正式发布运行](https://github.com/yydshly/20261115_codex_project/actions/runs/43731196566) 成功。
- [44 项展示媒体 Release](https://github.com/yydshly/20261115_codex_project/releases/tag/animation-atlas-media-20261115)，归档 9,711,355 字节，SHA-256 `91184bb9cefcf1cd1dba4f86083752b3957de2adeb9fb8d84f0d72b7c9f6e4f5`。
- GitHub 干净环境执行 9 项测试和完整构建通过；本地工作区的额外参考项目测试共 11 项通过。
- 公开路径、响应类型与视频范围请求的实际结果见 `publication-http-checks.json`。资源按 GitHub 实际 HTML / 模块引用核对；Windows 与 Linux 的原始文本换行可能使构建文件哈希不同，不能仅以本地哈希推断线上缺失。

已在公开入口验证后回填 `projects.json` 的 `demo_url`。

## 边界

研究不是所有工具的完整生产验收；官方案例、本站实际渲染与模型资产预览分别标明。引导图及网页逐项引用来源，第三方素材不纳入本站原创许可；详见 `THIRD_PARTY_NOTICES.md`。

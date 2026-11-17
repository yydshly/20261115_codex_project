# 网页发布与验收记录

本轮授权日期：2026-11-17。用户明确要求整理我们的理解、完善网页、提交远端并公开部署，使用此前生成的完整信息图作为引导图。

## 内容与引导图

- 补充六项理解：场景判断、身份与能力、已有能力的组织与交接、单任务完成五岗步骤、研究价值判断、展示与真实运行的区别。
- 引导图使用 `assets/bot-role-overview.png` 原件，3200 × 7230；不重绘或替换内容。网页及总导航使用同一文件，点击可按原尺寸查看。图中“尚未发布”是 2026-11-16 制作时的历史记录。
- 原帖、教程、八个来源、未验证说明、原双场景交互图和重点转换图一起保留。
- 网页发布不代表部署研究机器人；原帖收益、官方归属、自动交易，以及研究采集和定时仍未验证或未部署。

## 发布配置

- 仓库：`yydshly/20261115_codex_project`；独立发布副本基于远端最新 `main`，只加入 0018 及必要的索引、白名单、工作流和检查。
- 既有 GitHub Pages 工作流汇总发布，路径为 `/20261115_codex_project/demos/0018-bot-role-research/`。
- 标准库 `scripts/build.py --publication` 复制明确列出的静态文件，不在 CI 重新绘图或安装 Pillow、字体、前端框架。
- 公开链接、内容字节、引导图哈希和浏览器交互在部署成功后验收，通过后回填 `demo_url`。

## 实际状态

已公开部署，并完成公开 HTTP 与内置浏览器验收。

- [在线研究网页](https://yydshly.github.io/20261115_codex_project/demos/0018-bot-role-research/) · [总库首页](https://yydshly.github.io/20261115_codex_project/)。首页已有项目入口，使用同一张完整引导图。
- 内容提交：[`23c8a4c`](https://github.com/yydshly/20261115_codex_project/commit/23c8a4c38f18bbf338c342a543eff79dfd03201c)；[PR #16](https://github.com/yydshly/20261115_codex_project/pull/16) 已合并，合并提交 `4293e0f8831b602df3fd2fe35790f9b641d8c3a4`。
- [Pages 构建与部署 #44074706467](https://github.com/yydshly/20261115_codex_project/actions/runs/44074706467) 成功；PR 的索引与完整站点构建检查也通过。
- 隔离发布副本回归：39 项通过、1 项跳过。跳过项依赖该副本没有的本地预览接口。
- 公开 HTTP 验收：2026-11-17 19:33:48（Asia/Shanghai），12 项页面 / 资源及总库首页共 13 项全部通过，资源内容与本次导出一致。原始结果见 [publication-http-checks.json](publication-http-checks.json)。
- 完整引导图：3200 × 7230，SHA-256 `cfb333f34c996af11dac6473ef8b3283380f3b74c2f0da6da7e284c69f8b9f4c`；公开 PNG 与所选原件字节相同。
- 内置浏览器：六项理解正常显示；完整图从适合宽度切至 100%；EXIT 转换显示“抽象＋新增”及最小试验；交互图两种场景和适配评估员 / SNIPER 详情正常；比特币讨论展开后显示 S4 / S5 / S6；总库首页可进入项目并保留完整图入口。检查时页面控制台无 error。

实际桌面画面：[阅读首页](https://github.com/yydshly/20261115_codex_project/blob/main/projects/0018-bot-role-research/assets/publication-desktop-20261117.jpg) · [岗位转换](https://github.com/yydshly/20261115_codex_project/blob/main/projects/0018-bot-role-research/assets/publication-conversion-20261117.jpg)。未单独验收手机实机和浏览器下载事件。

这些结果证明网页、图片和关键阅读交互已上线，不验证原作者收益、产品归属或机器人执行能力；研究采集与定时仍未部署。

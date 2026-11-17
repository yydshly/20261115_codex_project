# 网页发布与验收

授权日期：2026-11-17。用户要求整理本轮理解、网页部署、提交远端，采用本轮最终生成的引导图。

## 发布内容

六项理解、五条具体流程、内部约束与执行强度、与直接生成的比较、个人 Skill 的积累步骤、讨论演进与固定版本来源。网页是研究档案，不部署上游五套 Skill。

使用 `assets/skill-constraints-overview.png` 原文件作为首页和总导航引导图，点击可打开原尺寸；不重绘、不裁剪。发布构建仅用 Python 标准库，按明确白名单复制资源，`dist/` 和 `_site/` 不提交。

## 目标

- 仓库：`yydshly/20261115_codex_project`。
- 统一 GitHub Pages 路径：`/20261115_codex_project/demos/0028-creator-skill-mechanisms/`。
- 独立副本以远端最新 main 为基础，仅加入本项目与必要的登记表、生成索引、发布白名单和工作流调整。
- 公开验收后再填写 `demo_url`。真实提交、Actions、资源检查和浏览器结果在完成后补充。

## 当前状态

已公开部署；以下为实际验收记录。


## 实际发布与检查

- [在线研究网页](https://yydshly.github.io/20261115_codex_project/demos/0028-creator-skill-mechanisms/) · [研究总库](https://yydshly.github.io/20261115_codex_project/)。
- 内容提交 `b9c6fb0ae89166840c7008e878336484bfe415b2`；[PR #18](https://github.com/yydshly/20261115_codex_project/pull/18) 已合并；合并提交 `14ff3eff83330eac33f0272a96bc2ed2208c9f0c`。
- PR 完整站点构建与索引校验通过；[主分支 Pages 构建与发布 #44081838439](https://github.com/yydshly/20261115_codex_project/actions/runs/44081838439) 成功。
- 本地回归 40 项：39 通过、1 跳过。跳过项是隔离公开构建未提供的本地预览接口；未将跳过计为通过。
- 公开 HTTP 验收时间：2026-11-17T20:23:03+08:00（Asia/Shanghai）。9 项页面与资源、总库首页共 10 项全部通过，页面文本与导出一致。见 [publication-http-checks.json](publication-http-checks.json)。
- 引导图原件 1536 × 1024，SHA-256 `5cfadd8332afff77216359100d1cbecc01c6f41bd7616843d41940111e2cb411`；线上 PNG 与选定原件字节相同。
- 内置浏览器检查：五条流程、原图加载与尺寸、桌面无横向溢出、固定版本说明展开并列出五个提交；控制台无 error。未单独验收手机实机。
- 结构化检查范围与结果见 [verification.json](verification.json)。

这些检查验证本研究网页和资源已上线，不验证上游写作质量、流量预测或个人风格效果。索引入口回填与本记录作为后续提交保存。

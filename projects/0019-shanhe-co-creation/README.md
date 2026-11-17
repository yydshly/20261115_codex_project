# 0019 · 山河共造：多人文明世界创作档案

从魔兽世界湖岸社交参考出发，整理原创岚角族与环境迭代、完整多人主线、学习与创造机制，以及可构思的后期产品。原始参考只是起点，本项目不是游戏代码或资产复刻。

- 原始参考：[Thorgram 原帖](https://x.com/thorgram/status/2121601256557051920)
- 讨论时期：2026-11-15—11-16；网页归档：2026-11-16—11-17
- 当前状态：researching；以根目录 projects.json 为准
- 网页入口：[公开研究档案](https://yydshly.github.io/20261115_codex_project/demos/0019-shanhe-co-creation/index.html) / [本地导出](dist/index.html)；已于 2026-11-17 部署并核验，实际提交与检查见 [publication.md](publication.md)
- 完整正文：[STORY.md](STORY.md) / [story.json](story.json)
- 讨论纪要：[DISCUSSION.md](DISCUSSION.md) / [research.json](research.json)

## 它解决什么问题

将持续的创作讨论整理成可核对、可继续设计的档案，保留否定效果、局部认可的边界，以及多人叙事的实际困难。

## 为什么关注

核心愿景是多人生活与社交：在同一世界走动、钓鱼、聊天，通过观察、试验、制造与协作形成文明，并逐渐设计活动和规则。《山河共造》是当前助手提出的完整故事草案，尚待用户确认。

## 参考、理解与对我们的意义

参考起点是 Thorgram 的 X 帖子和用户提供的截图：画面中的聚落、池塘、多人钓鱼与闲聊，让我们关注玩家为何愿意在同一空间停留。没有核实完整视频、服务器或具体版本；画面权利属于相关权利人。我们借此探索生活氛围、种族辨识与公共活动，不使用魔兽客户端、模型或地图。

我们的理解是把生活、文化、故事和创造连接起来：原创岚角族的身体、服饰、工具与建筑共享一种文化；住宅区扩展为生产、交易、探索与交通网络；七章完整故事让玩家的制造与协作具有原因、代价和结果。早期田园人类、圆屋环境被否定，湖岸长屋只被认可为居住一角，这些反馈仍保留在档案中。

多人主线采用共享生活区、小队章节、个人立场与有限公共决策的候选结构，处理不同步、弃权、平票、离线、新人和低人数；网页投票与进度仅解释规则。学习通过观察、假设、试验、制作、协作与记录发生，从材料和工具扩展到设施、交换、制度与历史，现实知识和教育效果仍需审校与验证。

对玩家，潜在价值是身份、归属、共同记忆与有实际后果的建设；对学习，是理解因果、证据、代价和合作；对我们，是沉淀可追溯的美术规则、人物弧、完整故事、机制边界和制作顺序，形成以后可以继续交给美术、策划与程序使用的共同依据。这些资料能够支撑原型设计，尚不足以直接量产完整游戏。

后期可按真实体验逐步形成多人生活原型、文明生活世界、规则与活动创作器，以及学习与历史创造平台。先验证一处湖岸、一位可动角色、两人互见与最小保存，再验证第一章闭环；内容成本、持续参与、教育和商业价值均未证实。完整结构化文字见 [understanding.json](understanding.json)，网站首页的“我们的参考、判断与项目意义”提供对应阅读入口。

## 网页内容

新增[理解、能力与后期价值一图总览](assets/shanhe-understanding-overview-v1.png)：3200×12684，10 个模块、约 3600 字符，涵盖世界、人物、完整主线、游戏构造、学习创造、多人规则、能力现状、验证路线、潜在价值与探索反馈。现有成果、设计草案与未来价值分别标注。

文字源为 [overview-summary.json](overview-summary.json)，可编辑排版源为 [board-v1.html](assets/overview/board-v1.html)，实际渲染记录见 [render-record-v1.json](assets/overview/render-record-v1.json)。安装本机已有的 Python Playwright 与 Chromium 后，可运行 `python projects/0019-shanhe-co-creation/scripts/make_overview.py --render` 重新生成长图。

1. 项目总览：愿景、阶段、用户选择、阅读路线。
2. 探索与效果：13 次方向转变、6 份视觉记录、滑动对照与早期故事。
3. 环境与人物：区域意向、岚角族、三位人物与三维制作路线。
4. 完整故事：7 章、13 节、73 段、5,326 字符正文，含全部真相与结局。
5. 学习与多人机制：第一章、四人表决、章节出口示意。
6. 后期产品：生活原型、文明世界、规则创作器与学习平台。
7. 资料与边界：来源、提示词、校验和离线数据。

## 研究结论

用户选择 A 方向、要求非人种族特征，并反复强调完整主线。湖岸 v2 仅被认可为居住角落，地区图被定位为部落住宅区；早期田园人类与圆屋环境被否定。完整故事、人物姓名、规则、引擎与产品规划仍是提案。

图像均为参考或 AI 概念，没有完成模型、动画、游戏实机、联网、物理模拟与教学效果。

## 运行与验证

需要 Python 3.10+。构建和服务器只使用标准库，网页为原生 HTML/CSS/JS。

    python projects/0019-shanhe-co-creation/scripts/build.py --site-preview
    python projects/0019-shanhe-co-creation/scripts/check.py
    python projects/0019-shanhe-co-creation/scripts/serve.py

默认入口：http://127.0.0.1:52941/20261115_codex_project/demos/0019-shanhe-co-creation/index.html

也可运行 [start.cmd](start.cmd)。公开构建使用 `python projects/0019-shanhe-co-creation/scripts/build.py --publication`，已接入统一 Pages 白名单。验证详情见 [verification.json](verification.json) 与 [publication.md](publication.md)。浏览器规则示意不代表真实多人系统。

## 文件与素材

research.json 保存决策与产品资料；story.json 保存正文，构建生成 STORY.md。web/ 保存静态页面及脚本，assets/ 保存 1 张参考截图、5 张概念、1 张信息总览、4 份原始生成记录与校验清单。dist/ 与 _site/ 为可重新生成的输出，不提交。

未预装未来游戏框架，没有执行无关清理。Git 提交和公开发布仅限本轮明确授权的研究网页与相关资料。

## 后续计划

确认故事与文化 → 实机空间与可动角色 → 两人共享生活 → 第一章闭环 → 依据真实参与决定是否扩展。

## 来源与许可

详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 [assets/SOURCES.md](assets/SOURCES.md)。没有复制第三方源码、角色模型或完整历史。现实知识与历史模型需审校后用于教学。

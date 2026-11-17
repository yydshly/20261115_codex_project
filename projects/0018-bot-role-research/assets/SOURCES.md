# 图片、交互图与来源说明

整理日期：2026-11-16。结构化来源以项目 `research.json` 中的 `sources` 为准。

## 本库原创图形

- `bot-role-overview.png` / `.svg`：3200 × 7230 的完整研究信息图。原帖数字与边界、身份与工具的四层关系、8 个交易岗位的输入/工具/交付/价值/限制、5 组功能迁移、5 个研究岗位、讨论结论和八个来源全部展开。
- `role-conversion.png` / `.svg`：从同一幅图截取的 3200 × 1320 重点转换图；不是另行改写的数据。说明合并、保留、替换和抽象新增。
- `overview-preview.jpg`：重点转换图的 1600 × 660 缩略，保留作转换部分预览。2026-11-17 起，网页、项目说明及总库引导图改用完整 `bot-role-overview.png` 原件。
- 图像由 `scripts/make_overview.py` 从本库研究数据绘制；是原创关系示意，不是交易系统、研究机器人或真实收益的运行截图。图中没有第三方界面截图或生成式仿造界面。
- 本轮发布保留 2026-11-16 完整图的原始字节；图中“尚未公开发布”是制作时的历史状态，当前网页状态以 `publication.md` 的实际验收记录为准。研究机器人和定时仍未部署。
- PNG 与 SVG 共用绘图调用，文字按本机字体实际测量；SVG 保留可搜索文本与来源链接。使用本机已安装的 Microsoft YaHei 字体渲染，未复制或再分发字体文件。图片文件的尺寸和 SHA-256 见 `figure-manifest.json`。

## 交互图来源与转换

- `conversation-map.fragment.html`：本聊天已展示的原创交互图源文件，完整保留；不是从第三方网站提取的代码。
- `graph-export.fragment.html`：独立导出的编辑源，仅将默认场景改为“研究”，保留两个场景和节点选择。
- `../web/graph.html`：使用 Visualize 技能的 `scripts/render.py` 导出的独立阅读版，包含样式和浏览器状态回退。原图只用 `widgetState` / `setWidgetState` 两个状态接口，不调用外部业务工具。
- `interaction-origin.json` 保存原始交互图的文件哈希与转换说明。交互图描述的交易能力为原作者宣称；研究模式为本库设计，不能作为机器人已运行的证明。

## 原帖与概念核对来源

| 编号 | 来源 | 用途与限制 |
| --- | --- | --- |
| S1 | [Bober_smart 原帖](https://x.com/Bober_smart/status/2121686230467285097) | 8 岗位、费用和收益等宣称；通过内置浏览器读取正文，视频未完成播放核验。 |
| S2 | [Full Tutorial Guide: Grok AGENTS](https://x.com/Bober_smart/status/2091901718061531571) | 作者对身份、工具、共享电脑、接管与审批的教程描述；官方归属及架构未独立核实。 |
| S3 | [SEC 工作人员迷因币说明](https://www.sec.gov/newsroom/speeches-statements/staff-statement-meme-coins) | 典型迷因币用途、投机需求与风险的说明；工作人员意见不用于直接认定特定项目法律性质。 |
| S4 | [Bitcoin 白皮书](https://bitcoin.org/bitcoin.pdf) | 点对点支付、防止重复花费等设计目标；不证明市场价格合理。 |
| S5 | [Bitcoin.org FAQ](https://bitcoin.org/en/faq) | 发行、自行保管、网络使用与可能失败；属于支持比特币的项目社区来源。 |
| S6 | [Investor.gov 2024 年 Bitcoin / Ether ETP 风险说明](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/ETPBulletinSeptember2024) | 高度投机与价格波动风险；不提供实时价格或投资建议。 |
| S7 | [Investor.gov 股票说明](https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks) | 公司所有权及分红等基本原理的对照。 |
| S8 | [Ethereum.org 以太币技术简介](https://ethereum.org/zh/developers/docs/intro-to-ether/) | 加密货币与账本概念、ETH 的网络交易费用用途；为项目社区资料。 |

公开资料仅作少量摘要和链接引用，没有复制第三方全文、视频、软件或完整 Git 历史。相关资料权利归各自作者。来源不代表对本研究设计或原帖收益叙述的认可。

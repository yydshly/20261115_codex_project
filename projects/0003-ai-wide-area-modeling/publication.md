# 运河研究网页发布记录

## 内容

以完整研究架构图作为项目索引引导：11 个步骤直接关联技术、29 项库/模型/产品、10 次实验、失败原因与价值。网页保留可放大的完整图片与交互效果，不用几组独立列表替代流程关系。

已汇总的理解见 [CONCLUSIONS.md](CONCLUSIONS.md)。核心是高斯外观与 Blender 实体协作，空间一致性、可编辑性和换光分别验收；完整场景尚未通过，失败实验继续公开。

## 发布方式

- 固定入口：`https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/`。
- 架构图：`explore.html#poster`；交互架构：`explore.html#architecture`；全部效果与工程：`effects.html`。
- 沿用仓库 GitHub Actions / Pages，保留原有已发布项目；本次不包含其他聊天的工作区修改。
- Git 保存研究源码、图册、记录与媒体清单；Release 保存静态媒体及最小查看引擎，构建时逐项校验文件名、大小与 SHA-256。
- 6 段视频、6 个查看入口、98 项去重图片、39 份工程/几何文件。PLY/.blend 使用无损压缩，客户端还原后校验 SHA-256；NPZ 在完整媒体归档内下载。
- 不重新生成或覆盖旧模型。第三方许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 状态

2026-11-17 已上线并验证：

- 内容发布 [PR #8](https://github.com/yydshly/20261115_codex_project/pull/8) 已合并，提交 `324d4fdc613418a96d8615a638c59d8e6d71e13a`。
- 首次正式部署 [GitHub Actions 44015425062](https://github.com/yydshly/20261115_codex_project/actions/runs/44015425062) 构建与部署成功。
- [研究网页](https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/) · [放大完整架构图](https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/explore.html#poster) · [全部效果与工程](https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/effects.html)。
- 327 个公开页面/资源 HTTP 检查通过；6 段 MP4 均返回 `206` 并支持字节范围请求；引导图 SHA-256 与原 PNG 一致。
- 构建时 668 项媒体引用可解析，31 份 PLY/BLEND 无损解压后哈希匹配；41 个保护清单中的旧工程/媒体哈希未变。Python 检查 33 项通过、1 项仅本机预览检查跳过。
- 媒体 Release 大小 731,906,196 字节，GitHub 服务端 SHA-256 为 `a750cfffa4d566ad8affe5a8e3976ef27f20b07117ecbcd2fc199a786e447988`，与本地一致。
- 本轮公开部署未重复 WebGL 视觉验收：浏览器自动化工具不可用。沿用此前实际运行的查看器与原始数据，已验证模块语法、资源图、客户端解压、原文件校验和错误哈希拒绝；不能用 HTTP 检查代替全部浏览器操作验收。

机器摘要见 [publication-verification.json](publication-verification.json)。公开页面是研究档案，完整三维场景仍未通过最终验收。

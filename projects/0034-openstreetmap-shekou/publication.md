# 公开发布与验收

2026-11-20 发布到本仓库统一的 GitHub Pages。主入口为 [OpenStreetMap 与蛇口城市原型](https://yydshly.github.io/20261115_codex_project/demos/0034-openstreetmap-shekou/)。部署范围包括 OpenStreetMap 研究入口、实现和证据、总结图、城区骨架和 20 个原型版本。

- [发布 PR #22](https://github.com/yydshly/20261115_codex_project/pull/22) · [主分支发布提交 `b0c06ec`](https://github.com/yydshly/20261115_codex_project/commit/b0c06ec56852abaca2694afbc53d9adb13457c24)。
- [正式部署运行 44765636318](https://github.com/yydshly/20261115_codex_project/actions/runs/44765636318) 的构建及部署成功。既有整站 artifact 触发 1 GB 容量提示，本次部署成功。
- 总导航、复盘首页和仓库 README 使用项目生成的 2160 × 1430 PNG 原图。线上文件与原图逐字节一致，SHA-256 为 `84263e53da3feaf7cef8f00c1f83045784041ef28d6495eccb437459ff6e3f68`。[线上引导图](https://yydshly.github.io/20261115_codex_project/demos/0034-openstreetmap-shekou/assets/openstreetmap-summary.png)
- 复盘首页和总导航返回 HTTP 200。20 个版本入口均可访问，四个公开下载全部重新获取并核对大小和 SHA-256。[下载与清单](publication-data.json) · [GitHub Release](https://github.com/yydshly/20261115_codex_project/releases/tag/shekou-research-data-20261120)
- Chrome 桌面和 390 像素手机视口均检查了首页与引导图放大。在线 WebGL 主线可从蛇口市场起步和切换降雨，城区可切换到街面漫游。程序验证的范围另见[项目复跑记录](assets/validation.txt)。

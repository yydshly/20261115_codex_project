> 最终交付更新：经19项示例优化与2项最终补图，网页及主清单为98/100；以下记录保留收集过程。最终状态以web/data/previews.json及verification.md为准。

# 预览图来源与核对

截至 2026-11-16，主清单记录全部 100 个站点；本轮通用收集与定向优化完成时，96 项有可用图片，4 项因公开页面访问限制未取得可核实预览。后续合并的专项优化以 `preview-sources.json` 为准。

- 逐项图源、原页面、示例地址、图像类型、获取时间与 SHA-256 见 `preview-sources.json`；网页对应文件为 `web/data/previews.json`。
- 官方内容图、官方社交预览、第三方页面截图、关联博客配图、原作移植效果明确区分。未把通用站点封面都称作具体作品。
- 对全部 100 项生成四张联系表并目视检查。Sakugabooru、ArtStation、ShotDeck、Figma Community、Web Design Museum、Codrops、CodePen、Shadertoy 的首轮截图中存在验证页、拦截页、空白或加载状态；均先剔除，再用可核实公开内容补充。最终未取得预览的条目保留 `status: unavailable`、`src: null` 和真实错误原因。
- Pwnisher 改为官方频道中的 3D 挑战视频封面；FWA、Motion Awards、D&AD、Tokyo TDC、BUCK、Ordinary Folk、80 Level、Siteinspire 等改用与具体公开作品页面匹配的缩略图。
- Annecy 本轮仅保留官方活动照片并如实标注，未将观众合影视为入选影片。Apple HIG 本轮保持官方文档封面。
- Shadertoy 的 Seascape 示例使用 CoalPy 项目官网展示的移植效果图，非 Shadertoy 页面截图。原作 Alexander Alekseev / TDM，2014，CC BY-NC-SA 3.0；原作链接与实际图源分别记录。
- 图像均为带来源的小尺寸本地研究引用。作品和品牌权利归相应创作者与权利人；未逐项核实商业使用或公开再分发授权。公开发布前应重新审查许可，不能将此目录直接当作可商用素材包。

`collect_previews.py` 为可选重采工具，优先读取公开页面与合适图片，再尝试第三方公开页面截图。新取得的图片仍需人工检查；自动下载成功不等于作品匹配或视觉验收通过。`refine_previews.py` 保留本轮经过来源核对的定向选择。代理仅可在命令参数或标准代理环境变量中显式提供，正常阅读本地网页无需代理或图像外网请求。

## 联系表

- `preview-contact-1.jpg`：001–025
- `preview-contact-2.jpg`：026–050
- `preview-contact-3.jpg`：051–075
- `preview-contact-4.jpg`：076–100
- `preview-contact-sheet.jpg`：同一批核对图的完整拼图

联系表是研究核对材料，不是各站点完整功能测试或影片播放验证。

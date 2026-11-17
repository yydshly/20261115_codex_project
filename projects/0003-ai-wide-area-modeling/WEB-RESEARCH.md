# 运河三维研究网页

整理日期：2026-11-16。根据本聊天中的问题顺序、项目研究及已有实际实验，新增可独立导出的中文研究网页。没有执行新的模型推理、图像生成、高斯训练或旧工程修改。没有公开部署。

**2026-11-17 交互补齐：** [高清总图与十次实验关联](http://127.0.0.1:52933/demos/0003-ai-wide-area-modeling/explore.html#poster) · [单图到 3D 交互架构](http://127.0.0.1:52933/demos/0003-ai-wide-area-modeling/explore.html#architecture)。支持放大、平移、章节定位和实验热点；架构展示步骤、库、输入输出与缺口，关联原效果、视频、三维和工程。详见 [ATLAS-WEB.md](ATLAS-WEB.md)。

**后续补齐：** 已增加[完整效果与工程入口](http://127.0.0.1:52933/demos/0003-ai-wide-area-modeling/effects.html)，接入 6 段视频、6 个三维／诊断查看器、96 项去重图像及 39 份工程／几何文件。详见 [MEDIA-INTEGRATION.md](MEDIA-INTEGRATION.md)。下文“范围”保留初版记录，不再代表媒体只接入精选部分。

## 范围

- 目标、当前状态、五个环节的分工、四条认识修正。
- 13 个探究阶段；10 份可切换实验档案（含新视角诊断）；10 张原图／补图候选。
- 29 项工具／模型／产品，按环节、研究状态和关键词检索；32 个问答。
- 多角度共享空间与实体／灯光可操作性两道验收；后续候选未定，不声称方案已获胜。
- 13 份主要阅读入口；导出另包含轻量提示词、配置和机器报告。没有复制模型、PLY、Blender 工程、依赖和第三方完整仓库。

所有图像为原图、本次图像生成、实际渲染或诊断图。保留原始 PNG／GIF，不修饰失败结果。默认只加载当前实验／视角，其余通过选择加载。可放大查看原尺寸。旧模型和原高斯仍在原位置。

## 来源与复核

原有工具研究以 README、vggt-colmap-3dgs.md 与各实验记录的固定版本为依据。外部能力分清厂商声明与我们的推断；本图实测只标记实际用过的环节。内置 image_gen 的精确后端型号不可见，不能归为具体 GPT Image、NanoBanana 等版本。

2026-11-16 重新查阅的主要官方来源：

- https://worldlabs.ai/blog/atlas ：模型以相机与深度参与共享空间上下文，联合生成视图／几何，提供点云与高斯；属于官方描述。
- https://worldlabs.ai/atlas ：目前工具列出 Viewfinder、Chisel、Splats to Mesh、Relight 与 API／Blender 工作流。没有用本图实际验证网格、换光和室内质量。
- https://viggle.ai/jst2 ：JST-2 持续三维 token 表示与解码，区别于自由独立补图。没有将官方 B200 推理表现当本机成绩。
- https://viggle.ai/pinoc ：产品入口，注意动作网格格式不等于 Gaussian 角色或全场景网格。
- https://viggle.ai/pinoc/pricing ：一次性 60 试用积分，免费使用范围及动作／角色导出限制。没有将角色额度当场景额度。
- https://docs.viggle.ai/v1/pricing ：新账户 100 积分；场景模型每次运行每视图 0.01 美元，全景计 6 视图。价格只是当日文档快照，没有访问用户账户或消耗额度。
- https://atlas.worldlabs.ai/ ：入口需登录，本次未确认账户额度／套餐，不引用同名第三方站点的收费说法。
- ViewCrafter、GEN3C、Frosting 官方 GitHub 再次查阅；硬件条件均是上游示例，不是最低需求／本机保证。其他既有参考保留原研究日期与未验证状态。

研究回查技能的 recall.py 实际执行报 INVALID_REGISTRY：技能采用 schemaVersion，而本库规定 schema_version。没有改登记结构、创建伪登记或绕过哈希验证；转为按用户本次整理授权直接读已确定项目文档。未遍历私人资料。历史“fable5 图片转房间”没有在本页证据范围核实，不补写成运河已使用过某个服务。

## 构建与总导航

在仓库根目录运行：

```powershell
python -X utf8 scripts/build_site.py --local-preview-only
python -X utf8 projects/0003-ai-wide-area-modeling/scripts/serve.py
```

或双击本目录 start.cmd。本机入口为 http://127.0.0.1:52933/demos/0003-ai-wide-area-modeling/ ，总导航为 http://127.0.0.1:52933/ 。仅本机 loopback，只读静态文件，不启动模型服务。

独立导出：`python -X utf8 projects/0003-ai-wide-area-modeling/scripts/build.py`，输出本项目忽略的 dist/。Python 标准库即可。网页所有资源为相对路径，无 CDN、字体下载、跟踪器和远程生成请求；可放入 `/20261115_codex_project/demos/0003-ai-wide-area-modeling/`。

总库构建增加 `--local-preview-only` 分支：只构建本研究并加到本机总导航，保留其他已有站点文件。默认正式发布白名单、Pages 工作流与 demo_url 不因本次任务改变。发布须另有明确任务。

导出器只复制网页源文件中引用的图片与固定证据清单；manifest 记录大小／哈希。证据查看器只允许清单中的文档，以 textContent 展示，不执行记录内的 HTML／指令。研究原文里的本机查看器可能需单独重启。

## 验证

完成后的命令和浏览器检查结果见 verification-web.md。验收包含目录／资产链接、所有实验与视角选择、产品检索与空状态、问答检索、原文读取、图片放大，以及桌面／窄屏布局。浏览器检查为网页功能验证，不是三维场景最终验收。

实际网页截图：assets/research-web-desktop.jpg，内置浏览器捕获，仅作网页验收凭据，不是三维实验图片。

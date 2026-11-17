# 研究网页验证记录

2026-11-16，Windows，本机静态服务 127.0.0.1:52933，Codex 内置浏览器实际检查。此次只验证研究网页，不重跑三维模型，也不改变最终场景未通过的结论。

## 内容与资源

- 内容实际计数：5 环节、4 条认识修正、13 阶段、10 份实验、10 个候选视角、29 项工具／模型／产品、32 问答、13 个主要记录入口、38 个外部来源。
- 导出：33 张图片／GIF、29 份原文／配置／报告；其中 16 份 JSON 在资料页展开后可进入阅读器。媒体为既有实际产物，未生成替代图。
- `scripts/check_web.py` 核对 62 项图片／证据的大小和 SHA-256，全部匹配。原始运河参考文件未改。
- HTTP 只读检查：带 `/20261115_codex_project/` 前缀的 69 个页面资源全部 200，总导航相对入口可访问。
- 图片、脚本、样式与文档使用相对路径；不依赖源目录、不从域名根加载 assets。
- 本地总导航保留已有动画图谱、信息源指南等可用入口，并加入本研究。正式发布白名单与 demo_url 没有因本任务开启。

## 内置浏览器实际操作

| 检查 | 观察结果 |
| --- | --- |
| 全部实验切换 | 逐项点击 10 个标签，标题、图片、所属标签和证据边界一致 |
| 全部视角切换 | 逐项点击 10 张；原图 1672 宽、右移与关灯 1671 宽，保留原始尺寸 |
| 原图放大 | 回望候选可打开原图对话框，原始图片链接一致；关闭正常 |
| 产品关键词 | Atlas 返回 Atlas 与同样提到 Atlas 的 Marble；详情可展开官方来源 |
| 无结果状态 | 输入无匹配字符串，显示空结果提示 |
| 产品状态 | 本图已实测筛选为 7 项；全部状态恢复正常 |
| 产品分类 | 世界模型与产品筛选为 5 项 |
| 问答检索 | 检索“换灯”得到相关问题，展开显示正确解释，清空恢复 |
| 流程环节 | 点击高斯外观，显示表示、预测／拟合和灯光边界说明 |
| 原始记录 | 实际打开入口 A/B 复检原文，标题、全文和下载链接正确 |
| 文档清单 | 请求未在清单中的 ../not-exported.md，客户端显示拒绝，不读取该文件 |
| 键盘标签 | 实验标签 Home 跳第 1 项，End 跳第 10 项，面板同步 |
| 导航 | 实际由研究页进入总导航，再由项目标题返回；侧边当前章节随滚动更新 |
| 浏览器日志 | 检查研究页 warning/error，无记录 |

## 显示检查

桌面按浏览器原有 1280px 视口检查。390px 检查使用同源 iframe 的实际 CSS 视口（本机临时检查页，不加入产品入口）；iframe 内 `innerWidth=390`，滚动条以外正文宽约 375px，文档没有横向溢出。手机断点下实验标签横向滚动、面板宽约 336.7px，产品改为单列，分类筛选仍得到 5 项。

浏览器 viewport 覆盖最初未在目标标签上及时反映，未把该次 1280px 截图冒充手机；以实际读到的 iframe 尺寸和对应截图作为窄屏依据。结束时清除临时 viewport 设置。未测试移动真机。

实际网页截图保存在 assets/research-web-desktop.jpg，来自内置浏览器，不是生成概念图。

## 命令检查

```powershell
node --check projects/0003-ai-wide-area-modeling/web/data.js
node --check projects/0003-ai-wide-area-modeling/web/app.js
node --check projects/0003-ai-wide-area-modeling/web/records.js
python -X utf8 scripts/projects.py render
python -X utf8 scripts/projects.py check
python -X utf8 scripts/build_site.py --local-preview-only
python -X utf8 projects/0003-ai-wide-area-modeling/scripts/check_web.py
python -X utf8 projects/0003-ai-wide-area-modeling/scripts/check_web.py --url http://127.0.0.1:52933/20261115_codex_project/demos/0003-ai-wide-area-modeling/
python -X utf8 -m unittest discover -s tests -v
git diff --check
```

JavaScript 语法、登记表、构建、相对路径与证据校验通过。17 项单元检查通过，包括默认不发布本研究、本机预览保留已有导航、不链接缺失的本地导出与证据路径防越界。原有其余项目的测试也通过。`git diff --check` 无补丁空白错误；只出现已有工作区文件的 CRLF 提示。

普通受限终端首次 HTTP 检查遇到 WinError 10013，改用获自动审核允许的本机只读检查后通过；不是网页资源缺失。没有关闭防火墙或扩大监听范围。服务启动／重启仅操作本任务创建的 Python 辅助进程。

## 边界

没有触碰旧 .blend、原始高斯、模型权重或原始实验记录；仅给两份总研究文档补上后续状态与网页入口。新增研究网页不代表完整三维场景完成。公开部署、真实 API 账户额度、Atlas／JST-2 运河结果和物理重照明都没有新增验证。

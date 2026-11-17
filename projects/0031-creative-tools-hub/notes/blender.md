# Blender MCP · 阶段研究记录

以下是2026-11-17整理的阶段资料。“本轮”“未发布”等描述沿用当时记录，当前公开状态以发布记录为准。相对工程入口由公开页映射或改为说明，不表示全部源工程随站点发布。

# 0023 · Blender MCP · 让AI操作三维场景

先看作者演示，再理解原理和价值：[本地阅读页](web/index.html)。项目现名MCP for Blender，是ahujasid维护的社区集成。

**一句话：让AI操作Blender，并看回结果的连接桥。** AI理解要求、拆步骤和写脚本，插件把操作送进Blender并返回信息；Blender和素材来源一起决定最终画面。

## 先看原作者演示

[Blender MCP: Use Polyhaven assets](https://www.youtube.com/watch?v=I29rn92gkC4)，作者ahujasid，约39秒。已实播观察约24—35秒片段：左侧聊天与右侧Blender海滩并列，场景里可见沙地、岩石和水面，后续提出使用更简单地面纹理的要求。检查结束时暂停在34.99秒。

这是较早的演示，画面出现Claude3.7Sonnet与旧工具名称；当前原理按下面的固定源码另外核对。本轮没有逐帧全片审查、音频听审或作者工程检查，不把视频里出现画面当作当前接口和制作成功率的完整证明。

作者页已实播观察。网页曾尝试YouTube嵌入，但平台要求登录验证；现已移除受限内嵌，保留作者原始入口，以原理与价值说明为主。没有下载远端视频或截图副本。

## 它对我们的价值

- 对同一三维场景做局部修改：明确对象，改材质、灯光或机位，再看结果。
- 保留可编辑Blender工程，方便继续调整与多机位观察；实际可编辑性需要本机小样核验。
- 将场景查询、执行脚本、图像反馈和素材接口接到对话里。已有Blender脚本流程仍可复用；MCP提供的是交互入口与整合。

写实或绘画感的质量取决于模型、素材、灯光、材质、构图与渲染。该插件不会替我们完成所有艺术判断。本轮没有本机画质、速度、复杂建模、返修可靠性或引擎导出测试。

## 关键机制

固定提交`b6a2ce30c14636a562b5549684d9db6fc01f29ab`，2026-11-17通过GitHub连接器读取README、server.py、addon.py及MIT许可。

1. MCP服务与Blender内插件通过本地socket交换命令和结果。
2. `get_scene_info`读取对象信息；`execute_blender_code`发送Python，由插件在Blender中执行。
3. `look`提供相机、视口、多角度与动画选帧等图像，返回给AI继续判断。
4. AI可据结果再修改，保存和渲染由Blender流程承载。具体对象、参数和验收条件需要明确。

源码定位和实播记录见[source-notes.json](source-notes.json)。网页的六个流程按钮只切换说明，没有连接本机Blender。

## 参考与我们的目标

作者在README用一句海滩布景要求描述环境光、纹理、岩石和植物。网页展示短原文节选、中文概括和固定来源；它不是完整演示聊天记录。

我们的目标是小型雨后庭院：一屋、一径、一池、两树，先确认比例与布局，再以固定机位比较石径的干/湿材质与光照。保留可重开工程和修改记录，之后再决定扩展成完整自然体验短片或世界。

[原创验证提示词](OUR_BRIEF.md)尚未执行。本轮没有安装插件、修改MCP配置、执行Blender脚本、调用素材服务或生成新场景。

## 页面与验证

本页使用静态HTML、CSS和少量JavaScript。`page-data.json`是原理说明与任务输入来源，嵌入HTML后可直接打开。无需安装框架。

```powershell
python -m http.server 53023 --bind 127.0.0.1 --directory <本项目绝对目录>
```

打开`/web/index.html`。仅本机预览，未发布。数据更新后运行`scripts/render_reading.py`重新嵌入，相关浏览器与静态检查见[verification.json](verification.json)。

## 来源与许可

- [当前仓库](https://github.com/ahujasid/mcp-for-blender) · [固定源码](https://github.com/ahujasid/mcp-for-blender/tree/b6a2ce30c14636a562b5549684d9db6fc01f29ab)。MIT版权声明见[UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt)。
- 原作者视频与仓库界面图通过远程链接提供，清楚署名，未保存本地副本。仓库MIT不代替具体第三方模型、纹理、声音和生成服务的使用条件。
- 原理图、中文解释和任务改写为本库原创；原理图不是作者效果截图或本机运行结果。
- 本轮轻量文件先写入授权D盘展示目录，再逐文件校验同步到研究总库的0023目录；未执行磁盘清理。

# Anthropic Skills · 阶段研究记录

以下是2026-11-17整理的阶段资料。“本轮”“未发布”等描述沿用当时记录，当前公开状态以发布记录为准。相对工程入口由公开页映射或改为说明，不表示全部源工程随站点发布。

# 0030 · Anthropic Skills · 把工作方法变成可复用技能

先看作者效果，再说明对我们的价值：[研究页](web/index.html)。本机预览：[打开研究页](〈本机预览地址〉)，需本机服务运行，未公开发布。

## 先看官方效果

[官方文章](https://claude.com/resources/articles/improving-frontend-design-through-skills)发表于2025-11-12，提供有／无前端技能的项目管理首页和博客页面对照。页面完整等比例展示远程原图，保留署名和入口。

作者称各组使用同一任务提示，后一版额外加入技能。本轮实际查看图片，但没有独立重跑。首页两版的品牌名也不同，应作为两次生成的设计差异理解，不能据此推断同一网页的返修过程、功能完整性或改稿省时。静态图片不能验证动画。

**这些是2025年的历史示例，不代表本轮固定2026年仓库提交的重新测试。** 当前frontend-design说明也已发生变化，分别记录文章示例提示词和当前源码。

## 它解决什么问题

[anthropics/skills](https://github.com/anthropics/skills)是Anthropic官方技能范例集合。每项技能把工作说明与需要的资料、脚本组织起来，供助手按任务查阅。实际产物由助手配合相应工具完成。

对我们最直接的价值，是保存已经反复确认的研究流程：先看效果，再讲具体用途，区分参考文字、我们的目标与改写，最后记录实际验证。这能减少重新解释流程，但尚未通过对照实验测量收益。

还可以参考它组织风格要求、分镜验收、文档模板与重复检查的方式。技能不会自行提供视频模型、软件权限或运行依赖；兼容环境和实际产物仍需检查。Unslop和Impeccable偏重界面设计任务，这里展示更广泛的组织模式，存在重叠，不作质量排名。

## 机制与源码参考

[官方工程文章](https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills)解释分层读取：名称与描述用于判断任务，相关时再读工作说明，需要时取更多资料与脚本。

本轮读取三个范例入口：

- frontend-design：围绕实际内容确定设计方向，核对任务要求。未按当前技能重新生成网页。
- pdf：一般操作与表单等专门参考分开组织。未处理或生成PDF。
- webapp-testing：检查流程配合服务器辅助脚本。未运行上游脚本。

脚本可复用机械步骤，内容准确和设计适合度仍需实际检查。本库网页的层次切换和原理图为原创说明，非安装或执行记录。

## 参考与原创改写

官方2025年文章公开前端指导片段，完整原文见原站；本页没有把它当作全部原始会话。本轮固定的frontend-design原文短引：

> the brief's own words always win

意为任务中明确的要求优先。出处为固定提交技能源文件，6词。中文解释为概括。

[OUR_BRIEF.md](OUR_BRIEF.md)保存我们的目标、取舍与原创研究任务，尚未执行。没有将本轮研究升级为安装技能或改写其他项目的授权。

## 运行与验证

2026-11-17核对提交`e4bb5d960d87126ff3b3a8af1a104b7db67560ba`（2026-11-16）。阅读README、模板和上述范例入口；许可和媒体来源见[source-notes.json](source-notes.json)及[assets/SOURCES.md](assets/SOURCES.md)。

静态HTML/CSS/JavaScript，无框架或外部脚本。自有脚本经node --check；图片、切换与手机检查见[verification.json](verification.json)。状态validated仅表示本研究页和记录已有检查，不代表上游所有技能已验证。

未安装上游技能、执行其脚本、重跑作者生成、创建真实技能或测量收益。上游文件只作研究资料，未作为全局指令执行。

本机预览命令：

```powershell
python -m http.server 53030 --bind 127.0.0.1 --directory <本项目绝对目录>
```

打开/web/index.html。未公开部署，索引demo_url为null。

## 来源与许可

图片 © Anthropic，远程引用，未保存副本。原创原理图、中文解释、任务草案与页面代码为本轮整理。

已分别核对frontend-design、pdf、skill-creator在固定提交的LICENSE.txt，均为Apache-2.0，保留[许可副本](UPSTREAM-LICENSE.txt)。这不替代对其他文件及网站素材的逐项核对。未复制完整上游仓库、脚本、历史或依赖。

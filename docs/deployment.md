# GitHub Pages 发布约定

首个已接入发布的项目为 `0001-animation-skills-atlas`。研究源码、正式引导图与验证记录保存在 Git；视频和预览文件通过带 SHA-256 清单的媒体 Release 恢复。站点构建产物 `_site/` 不提交。

## 公开路径

- 总导航：`https://yydshly.github.io/20261115_codex_project/`
- 动画研究总结：`https://yydshly.github.io/20261115_codex_project/demos/0001-animation-skills-atlas/summary.html`
- 项目目录下还包含 `index.html`（原始目录）、`cases.html`、`compare.html`、`showcase.html`、`lab.html`、`sources.html`。

上述为固定发布路径；实际首次上线结果与检查时间见项目 `publication.md`。登记表的 `demo_url` 只在公开页面验证通过后填写。

## 构建与发布

`.github/workflows/pages.yml` 在 main 上相关文件变更或手动触发时运行：锁文件安装前端依赖 → 校验登记表 → 校验并恢复媒体 → 构建 Vite 多页面站点 → 生成 `_site/index.html` 导航 → 上传统一 Pages artifact → 发布。

```powershell
cd projects/0001-animation-skills-atlas/web
npm ci
cd ../../..
python scripts/projects.py check
python scripts/build_site.py
```

`build_site.py` 仅构建明确接入的项目，不因其他项目存在 `web/` 就自动发布。每个项目未来按需加入统一构建，保持 `_site/demos/<id>-<slug>/`。一份 Pages artifact 汇总所有明确发布的项目，避免不同项目覆盖整个站点。

本次明确接入 `0009-ai-source-field-guide`：先运行该项目的标准库静态导出，再复制到 `_site/demos/0009-ai-source-field-guide/`。`index.html` 为完整指南，`map.html` 为简化关系图阅读页；`assets/relation-map.png` 同时用于项目首页和总导航引导。总导航由登记表中的摘要、价值说明、图片描述和发布白名单生成，保留动画图谱。实际发布结果见项目 `publication.md`。

本轮另接入 `0011-everyday-wonders`：运行 `python scripts/build.py --dist`，导出到 `_site/demos/0011-everyday-wonders/`。入口 `map.html` 以 `assets/creative-summary-v1.png` 为引导，链接完整研究 `index.html` 和七份故事。总导航读取登记表的摘要、价值说明与引导图，保留 `0001` 动画图谱和 `0009` 知源指南。静态构建不重新渲染总结图、不安装Pillow；本项目无前端依赖。实际公开结果见该项目 `publication.md`。

## 视频与预览

`projects/0001-animation-skills-atlas/publication-media.json` 记录公开媒体包 URL、包哈希与逐文件哈希。下载、文件列表和哈希不一致时构建失败。解包只允许项目 `web/public/` 内的相对路径，拒绝目录穿越。

媒体包由 `projects/0001-animation-skills-atlas/scripts/package_publication_media.py` 从当前有效媒体白名单生成；不收集依赖、临时帧、私人资料、校验截图或完整第三方工程。发布包为网页展示资源，不是第三方商业素材包。归因与许可说明见项目 `THIRD_PARTY_NOTICES.md`。

本地已有媒体包时可用 `python scripts/build_site.py --media-archive <本地 zip 路径>`，仍执行全部哈希验证。Pages 不提供后端；纯前端交互和浏览器内导出可运行，私密凭据不得进入 artifact。

## 子路径与验收

`0021-avatar-video-workflow` 已按本轮授权接入发布白名单。项目构建使用 `scripts/build.py --public`，恢复四段后期研究样片；完整原片与原始并排检查视频不进入媒体发布包，保留原帖入口和署名截图。`publication-media.json` 保存 Release URL、ZIP 与逐文件 SHA-256，下载和路径校验不一致则构建失败。研究图使用本轮生成的完整 PNG 与 SVG，索引显示其顶部预览并链接完整图。上线结果单独记录在该项目 `publication.md`；`demo_url` 仍只在公网验收后填写。

Vite 使用经验证的相对路径，全部页面与媒体保留在 `/20261115_codex_project/demos/0001-animation-skills-atlas/`。不使用跳到域名根目录的 `/assets/...`。每次发布检查主入口、深层页面、脚本、样式、引导图、18 张预览、8 段动态效果和同案成片；视频须可解码并支持请求。

发布成功后更新 `demo_url`，运行 `python scripts/projects.py render` 与 `check`，提交登记表、生成 README 和本项目相关文件。其他聊天未完成的项目保留原工作区，单独研究，不随本次发布提交。


## 运河三维研究公开发布

本次明确将 `0003-ai-wide-area-modeling` 加入公开白名单，入口 `demos/0003-ai-wide-area-modeling/`。项目摘要与完整研究架构引导图均从登记表生成；保留原有三个公开项目，不发布其他本地研究。

其 `scripts/build.py --publication` 按 `publication-media.json` 恢复 6 段视频、6 个查看器与工程下载。Release 媒体包有包级和逐文件 SHA-256、严格路径白名单及 950 MB 项目体积上限；PLY/.blend 无损 gzip，客户端还原后核对原文件 SHA-256。NPZ 只留在完整 Release 归档，不放入 Pages。可用 `CANAL_RESEARCH_MEDIA_ARCHIVE` 指定本地归档，仍进行同样校验。最小 Three.js/Spark 引擎及许可全文随归档，不发布权重、完整依赖或运行服务。

公开网页是研究档案，保留未通过结果，不代表完整三维世界已验收。原文件只读，实验配置和来源可追溯；部署与核验见项目 `publication.md`。


## 素材到庭院研究公开发布

本次明确加入 0005-wind-return-garden，主入口为 demos/0005-wind-return-garden/overview.html，index.html 为可玩庭院，其余七个研究与玩法页面一并保留。scripts/build.py 使用现有 Node 静态构建，scripts/check_publication.py 核对九页相对路径、源图与许可哈希、图谱副本及发布体积；无需新增前端依赖。Pages 在统一 artifact 中保留远端既有项目。

首页和总导航使用本轮生成的 v2 素材到体验研究图谱；公开副本只修改发布状态脚注，原素材、18 处实景、结构和结论保留。摘要分别说明素材价值、已验证的制作链路、玩家价值假设、AI/视频/三维扩展与当前边界。第三方图像和免费样例分别保留出处与通知，不构成独立素材包或另授素材权利。

39 项原型检查随 CI 执行；公开部署成功后再核对主入口、图谱、实时效果、素材与庭院，之后填写 demo_url。真实提交、Actions 结果和上线验证见项目 publication.md。只提交本项目及所需总库文件，其他聊天的未提交工作保持原状。

## 山河共造研究网页公开发布

用户于 2026-11-17 明确授权加入 `0019-shanhe-co-creation`，主入口为 `demos/0019-shanhe-co-creation/index.html`。`scripts/build.py --publication` 导出七页研究、完整故事、概念与来源资料，`scripts/check.py` 核对相对路径、完整正文和七张图片的哈希；不新增运行依赖。统一 Pages artifact 保留远端既有六个公开项目。

总导航与项目入口使用本轮生成的 `assets/shanhe-understanding-overview-v1.png` 原文件，3200×12684，SHA-256 不变。摘要、项目说明与首页明确原帖的湖岸社交参考、原创族群和完整故事草案、学习创造和多人叙事理解，以及对玩家、学习、我们后续制作与产品规划的价值。研究资料、系统草案与待实现游戏分别说明。

真实部署后才填写 demo_url，并记录提交、Actions、公开资源与原图哈希验证。公开的是静态研究档案，页面投票和进度为规则示意；三维角色、实机、联网、持续世界与教学效果尚未实现。实际记录见本项目 `publication.md`。


## 溪谷花园双版本公开发布

本次明确接入 `0002-valley-garden`，介绍与实时演示台为 `demos/0002-valley-garden/overview/`；原代码版在项目根目录，素材版在 `model-version/`。根摘要、价值说明与总导航使用生成的研究总览图，原帖观察、两版效果和 49 条素材／程序来源集中列示。

CI 额外按锁文件安装该项目的 Three.js。`scripts/build.py` 先按 `publication-media.json` 恢复带包级与逐文件 SHA-256 的原件，再调用两个既有构建；发布副本对大二进制使用无损 gzip 与浏览器解压，不改变两个原场景。只保留实际使用的叶冠树派生版本在站点中，历史几何原件仍在 Release。发布检查核对路径、glTF 依赖、还原哈希、来源记录、原图和 235 MB 项目预算。原帖通过可选官方嵌入展示，不复制原视频。

在独立工作区基于远端最新主分支提交本项目及必要总库变更，保留现有公开项目；其他聊天的本地项目不随本轮提交。实际上线与验证见该项目 `publication.md`。


## 艺术巡游研究公开发布

本次明确接入 `0008-pelican-layout-study`，主入口为 `demos/0008-pelican-layout-study/`。首页及总导航使用用户选定的研究总览图，预览点击打开同一图的5400×4050 PNG原文件。摘要完整说明原作持续主题、整幕艺术、空间与承接的价值，对我们的创作意义，以及光雨和七种连接实验的效果与未达标边界。

`scripts/build.py` 为标准库静态导出；`scripts/check_publication.py` 核对32页链接与锚点、12份专题/12份数据、引导图哈希、六个实验入口、Three.js许可和40MB体积上限。构建不调用图像生成或本机字体，也不发布原视频、生成PNG原件或依赖目录。接入统一Pages artifact并保留既有公开项目；实际提交和上线核验见本项目 `publication.md`。

## 风与春影像研究公开发布

2026-11-17用户明确授权将`0020-human-nature-film-study`加入Pages白名单。摘要与首页分别说明原参考的天气体验效果、可见的开窗/门边/框景/室内外关系，以及对我们写风、写春的创作价值；完整理解图使用此前交付的`assets/understanding-map-v1.png`原文件，2400×5166，不改其内容。

项目使用`--publication`构建三页研究。两版成片与六段原片从Release素材包恢复，校验包级与逐文件SHA-256、长度与路径白名单。完整第三方参考视频保留原帖入口，只引用必要的开场画面并注明权利。`check_publication.py`校验正文、链接、引导图、八段视频与60MB项目预算。只合入0020及其必要总库改动，保留已有公开项目；上线验收后填写`demo_url`，详见本项目`publication.md`。


## 海的生成研究网页公开发布

用户于 2026-11-17 明确授权加入 `0016-abyssal-world-notes`，入口为 `demos/0016-abyssal-world-notes/index.html`。摘要和阅读页说明原库的程序化海底、可读源码与验收任务书价值，以及本库七项原创创作提示词。完整中英文原文、原创任务书、三张实测图与 MIT 来源一并保留，原创任务书尚未执行。

总导航与网页的引导图使用本轮生成的 `assets/understanding-summary.png` 原件，2400×5595，哈希不变。标准库构建与发布检查核对原图、截图、完整文本、相对路径及 8 MiB 预算，不在 CI 重绘图片或安装额外依赖。仅加入本项目的白名单和触发路径，保留既有公开项目；真实提交、Actions 和公开资源核验见本项目 `publication.md`，实际验证后才填写 `demo_url`。

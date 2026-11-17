# 来源、素材与实现边界

核对日期：2026-11-15，Asia/Shanghai。原文通过 Codex 内置浏览器读取。

## 一手来源

- [Viking 原帖](https://x.com/vikingmute/status/2121584360247988409)：发现入口。
- SpriteCook，[How to make pixel art trees move in the wind](https://www.spritecook.ai/blog/pixel-art-trees-wind-animation)，页面日期 2026-11-10。
- [橡树分区示意图](https://www.spritecook.ai/blog/pixel-art-trees-wind-animation/oak-tree-split-into-leaf-clumps.png)。原始文件 1680×432，4 倍最近邻显示网格。第一幅恢复为 105×108 的树图；第二幅用来划分 14 个叶团。
- [松树分区示意图](https://www.spritecook.ai/blog/pixel-art-trees-wind-animation/pine-tree-split-into-branch-layers.png)。原始文件 1064×852，恢复第一幅为 66×213 的树图；依可见枝层分成 8 块。
- [官方 Agents 说明](https://www.spritecook.ai/agents)，切换 Codex 选项后实际看到官方仓库链接 [SpriteCook/codex-plugin](https://github.com/SpriteCook/codex-plugin)。官方插件作为补充接入参考，未安装。登记来源直接指向风动文章，不把插件仓库当作本游戏的上游源码。
- [网站条款](https://www.spritecook.ai/terms)，有效日期 2026-11-12。第 6 条谈及用户自己生成的输出；未确认适用于作者文章配图的独立再分发授权。

## 实际素材链

浏览器从当前页面取得橡树示意 PNG；松树通过该图像元素的下载能力取得。原件拷贝至 `web/assets/local-source/`。`scripts/prepare_assets.py` 在原生网格采样，移除单色示意背景，校准两幅橡树之间的水平偏移，恢复着色分区并生成独立的透明图层。

`web/assets/trees/manifest.json` 记录两个原件 SHA-256、每个输出文件 SHA-256、字节数、图层中心和像素数。树干与所有叶团相加，程序逐像素检查等于提取后的 RGBA 树图；这不等于声称取得作者未发布的原始工作文件。

共 28 个输出 PNG：两棵完整树、两个固定树干、两个内层衬底和 22 个可动图层。原件与派生 PNG 已在子项目 `.gitignore` 排除，保留在本机研究使用。共享代码需要另行准备可再分发素材；本轮没有发布和上传。

## 实现与区别

- 作者声明：示例植物及地面由 SpriteCook 生成，动作由代码驱动，提供 Python/Godot 示例。
- 本项目验证对象：从上述公开示意图提取的两类树，实际加载到独立 Canvas 庭院与能力对照页。
- 参考原理、独立编写：JS 风场、行波、弹簧、姿态取整、10 Hz 更新；没有复制整段原文代码或安装 Godot。
- 橡树：主干固定，按世界位置延迟的叶团运动，外缘比中心更活跃。
- 松树：8 层枝叶，按高度和风场位移。此版主干固定，未实现原文松树的逐行弯曲着色器。
- 内层采用原图较暗副本填补叶团移动后的缝隙；静态掩膜与固定树干保持原貌。
- 落叶与草地亮斑使用同一个实时风场。阴影是整树投影近似，并非逐图层准确动态阴影。
- 2026-11-15 初版人物、猫、小屋、桥、地形、花草、交互、叙事、界面、合成音由本站实现。2026-11-16 人物、猫和小屋替换为官方免费样例，新增生活道具；来源如下。
- 官方在线 MCP/API 未连接、未调用、未付费；这次接入的是原文机制与真实素材。以后调用在线生成仍需要账号连接和独立任务。

截图为本地真实运行证据，树木版权属于相应权利人；不以截图替代素材再分发许可。

## 官方免费样例实装 · 2026-11-16

从[官方免费页](https://www.spritecook.ai/free-pixel-art-sprites)提取真实 ZIP 链接，经 HTTPS 下载后核对内容，只复制选中 PNG 和原始许可通知。原 ZIP 与未选素材留在 Git 忽略的 `.local/spritecook-free-20261116/`。选中原图未重画或改写；运行时采样和调色独立处理。

| 官方包 | ZIP SHA-256 | 选中素材 |
| --- | --- | --- |
| [Pixel Art Characters](https://www.spritecook.ai/assets/downloadables/spritecook-pixel-art-characters.zip) | `89b15024db28ab6dfa5b5828c5b09c3cf84330780d7b035025871166a045cb7c` | happy-monk/idle_sheet.png；ginger-cat/idle_sheet.png、walk_sheet.png |
| [Isometric Buildings](https://www.spritecook.ai/assets/downloadables/spritecook-isometric-buildings.zip) | `43988bbc6e49c6bdc7bdcd096aa58547ea7db9667c399afca26b5ca14e15a6b1` | building5.png |
| [Game Asset Pack](https://www.spritecook.ai/assets/downloadables/spritecook-game-asset-pack.zip) | `37dbe841afa0e0c4e727ead7c413124ae88dd7d63ebd1b66d53a81094a61233e` | stone_well.png、barrel.png、crate_intact.png、pot.png、bread.png、apple.png |

建筑和道具包各自附 CC0 1.0 通知。角色包有两份不同通知：内层 CC0，ZIP 根目录为 SpriteCook sample license；[官网免费页](https://www.spritecook.ai/free-pixel-art-sprites)也指定角色使用 sample license。两者均允许修改并随个人或商业游戏使用；本站保守遵循后者，不把角色作为独立素材包出售或分发，并保留两份原文。这是许可口径差异的记录，不作法律结论或额外权利保证。

清单 `web/assets/free-samples/manifest.json` 记录原始路径、尺寸、帧数、锚点、播放速度、放置、用途、情绪理由、逐文件字节数及 SHA-256；4 份通知在同目录 `licenses/`。`scripts/prepare_free_assets.py` 可从已核对的本地包重建选择结果。

Happy Monk 只提供待机，未声称原包有行走、送风和坐下动作。Ginger Cat 选待机和走动，均为单行 8 帧；本站跟随寻路负责空间运动。蓝瓦住宅为静态，暖光是本站按原图窗口坐标叠加。井边、门前、椅边小记为本站原创。

免费样例允许本轮接入，不代表整个平台免费。没有登录账号、连接 MCP/API 或消耗生成额度。旧文章树图仍按本地研究处理，未因其他包的 CC0 声明推定其可再分发。

## 庭院生活更新的素材与实现

花圃、土色、石沿、嫩芽、叶片、三类花、水滴、亲近小标记与睡意标记均为本站 Canvas 绘制，不是本次另从 SpriteCook 获取或生成的图像。它们使用本项目已有色系、整像素绘制和共享风场，`life-drawing.mjs` 同时服务真实游戏、花圃卡片与明确标注的玩法示意。

小猫继续使用已核对的 Ginger Cat `idle_sheet.png` 和 `walk_sheet.png`，不新增第三方图像或改变原件。新增 `companion.mjs` 以地点、距离、熟悉程度与通行规则选择自主行动；停步、晒太阳和打盹以待机帧及标记表达。第一壶水或第二声风铃均可让猫留下。

生长和存档在 `garden-life.mjs` 实现；无在线 API、账号、云数据库或额外依赖。生长速度是作品节奏参数，不作植物学模拟。`life.html` 的试种与真实庭院分别持有状态，示意不修改玩家存档。

## 小屋与晴雨更新的素材与实现

室内墙、木地板、炉火、窗框、织物、书架、桌灯、书信与家具由本站 Canvas 程序绘制，不声称来自 SpriteCook 免费包或新的 AI 生成。室内的陶盆、苹果与面包复用已经核对的原始 PNG，清单中的用途已同步；没有修改第三方图像原件。

`interior-scene.mjs` 复用真实 `GardenScene.draw`，在离屏画布绘制同一庭院，并将溪桥与花圃区域作为窗景。室内主人与已入屋的猫不会在窗外出现第二个副本。预览页与真实游戏共用这些模块，预览持有独立状态，不访问玩家存档。

`atmosphere.mjs` 定义庭院时间、光线、晴雨周期与雨水区间；`garden-life.mjs` 合并原浇水与降雨的有效湿润时段，避免重叠重复计算，并保留雨后短暂湿润。模型不依赖实时天气服务。合成雨声通过 Web Audio 实现，不是外部录音或第三方音频素材。

`home-model.mjs` 约束家具碰撞与室内地点，`companion.mjs` 通过同一个门口完成猫的室内外转换。猫仍复用原 idle / walk 帧，停留与小标记表达睡意；没有新增真实睡姿、坐姿或表演生成。


## 庭院布置与来信更新

没有新增外部素材下载或在线服务。`pot.png` 原件在庭院复用为两只可移动陶盆；`bread.png`、`apple.png` 与本站绘制茶桌随长椅移动，室内的复用仍保留。角色与 PNG 未改像素、未生成新帧，14 份原件/许可哈希继续核对。用途同步到 `prepare_free_assets.py` 和生成的素材清单。

长椅、茶桌、土路/石路和信箱来自本站 Canvas 绘制；五封邻居来信由本站编写，为虚构的本地分支故事。`arrangement.mjs` 负责受约束的放置与撤回，`navigation.mjs` 将铺路偏好接入 A*，`letters.mjs` 负责顺序、选择与行动条件。窗景继续复用同一个庭院，因此也能看见玩家布置。

网页的独立体验使用相同生产模块与控制器，但使用该标签页的会话存储和明确标注的初始庭院；浏览器验收不消耗主庭院故事选择。实际截图来自内置浏览器，不把设计稿或预设图像称为运行证据。


## 2026-11-17 游戏设计档案

本次世界名「溪湾」、角色关系说明、主线《归来的第一天》及四幕组织由当前任务创作，来源是用户的游戏方向和既有原型，不借用外部作品背景。当前事实分别核对 `state.mjs`、`garden-life.mjs`、`companion.mjs`、`arrangement.mjs`、`home-model.mjs`、`atmosphere.mjs` 和 `letters.mjs`，新设定与后续构想单独标注。

`design.html` 的地点关系图和阿岚信件符号为本站内联 SVG，不是游戏扩展场景的截图或新角色立绘。旅人与橘猫的静态预览通过共用 `drawSample` 放大绘制原有免费样例；没有改动 PNG 或增加动画帧。首屏使用已保存的独立庭院实景副本，并明确标为现有原型。

`design.mjs` 仅负责阅读面板、状态筛选与素材预览，不导入游戏状态模块，不访问 Local Storage / Session Storage。没有新增素材下载、在线生成、收费服务或部署。新增网页截图记录的是实际浏览器页面，详见验收记录。


## 共同生活设计 v0.2

修订依据是用户于当前对话明确的融合方向：角色需要自己的特点，与玩家以平等关系相处。阿岚的读书、惜纸页、观察手记、修补与过度安排倾向，以及雨天阅读角的协商过程，均为本次新增的待制作设定，不追溯为现有五封信已经具备的行为。

三种协商结果是本地 HTML 中的预写阅读示例，沿用 `design.mjs` 的独立面板切换；没有模型、角色代理、生成式对话或长期记忆服务接入。原有 PNG / 许可未修改，游戏逻辑和存档模型未修改。


## AI 居民与游戏模式 v0.3

来源是用户对有自主日常、平等交流的 AI 驱动角色及游戏独立模式的进一步要求。目标设计中，AI 居民负责观察、计划、行动选择与表达，世界引擎负责可执行规则和事实，事件组织负责可玩的目标与结果。

本轮参考本机 Build Agents 技能梳理持续角色、动作和记忆边界；现有 Canvas / Node 项目保持原栈。本轮为设计修订，未安装代理框架、调用模型、创建后台运行或宣称已经有 AI 角色。实现时应再依据实际选择的运行时及其官方文档接入。

`design.mjs` 新增独立模式阅读面板，仍只加载素材和切换本页内容，不读写游戏状态。原 PNG、许可、游戏逻辑和存档模型未变。新截图只证明设计页面及模式说明实际运行。


## 理解总览与竞品参考汇总（2026-11-17）

新增 `overview.html` 汇总已做内容、价值假设、扩展路线与参考方法；原有完整设计与素材能力档案保留。竞品内容来自本对话中已核对的官方产品介绍、发行商介绍与开发日志，完整链接与资料边界见 [understanding-overview.md](understanding-overview.md)。机制动力与借鉴取舍为本站分析，不声称经过各作品的实玩或留存研究。

总览信息图由 `render_understanding_overview.py` 原创绘制文字、形状与关系符号，同时输出可编辑 SVG 与 2400×1800 PNG。没有使用图像生成服务，没有嵌入第三方游戏原画或虚构截图；系统字体不打包。来源记录、方法与文件哈希见 `assets/understanding-overview-v1.json`。图中的现有原型、AI 目标和待验证价值明确区分。

## 素材入口与实际效果图谱 v2（2026-11-17）

用户指出 v1 缺少素材入口和前期研究效果。新版 `render_research_map.py` 重新编排代码原生图谱，内嵌原始橡树/松树图、9 项免费样例的原图或首帧、提取结构、历史风动实验与庭院/室内/夜雨实景，共 18 处。没有下载新素材、调用图像生成服务或重绘实验画面。全部源文件 SHA-256、原始尺寸、裁切坐标与图中位置保存在 `assets/understanding-research-map-v2.json`。

网页新增原图入口、实时风动对照与证据点读，实时部分直接使用已有 `lab.mjs` 及其风场/树木模块，不导入玩家状态。素材平台的说明仍沿用 11.15–11.16 已归档资料，不断言当前在线价格或生成质量。视频/3D 创作迁移继续标为待验证，AI 居民与完整玩法模式仍属于目标。

v2 由于实际包含文章素材，SVG、PNG 及网页副本按本地研究排除 Git 跟踪。纯文字 v1 保留为根索引预览。构建仅生成本地研究版，并包含本页所需两份原图；没有发布上传或扩大素材授权。

## 本轮公开研究发布（2026-11-17）

用户随后明确要求将网页和本轮图谱提交 GitHub、部署并作为总导航引导。公开副本命名 `understanding-research-map-v2-public`，保留 v2 的 18 处素材/实景、结构与结论，仅修订发布状态脚注；原本地版本继续保留。正式入口、源提交、工作流与实测结果见 [发布记录](../publication.md)。

本轮再次核对官方文章、免费页与条款。免费样例的 CC0 / sample license 通知继续保留；文章图在研究上下文署名用于解释结构、效果与差异，不标为 CC0、本站原创资产或独立素材包，不向读者另授第三方素材使用权。完整范围见 [第三方说明](../THIRD_PARTY_NOTICES.md)，公开状态不改变这些来源事实。

文件通过已连接的 GitHub 工具组成原子提交，不包含当前工作区其他项目或运行缓存。AI、视频和三维方向仍为后续范围；本次公开验收没有调用在线生成服务或模型。

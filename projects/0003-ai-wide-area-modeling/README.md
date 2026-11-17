# 0003 · 从单图到可编辑三维 · 运河世界研究

从一张 AI 运河图探索高斯外观与 Blender 实体协作，以十次实验检验空间一致性、编辑与换光，记录失败原因和可复用路线。完整场景尚未通过验收。

**阅读入口：** [我们的理解与结论](CONCLUSIONS.md) · [发布记录](publication.md) · [来源与许可](THIRD_PARTY_NOTICES.md)。

**完整研究架构图片：** [高清 PNG](assets/research-map/canal-integrated-architecture.png) · [矢量 SVG](assets/research-map/canal-integrated-architecture.svg) · [网页放大并按步骤查看](https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/explore.html#poster)。技术、29 项库／模型／产品、十次实验、未通过原因和价值已直接归属对应流程节点；旧图与网页效果继续保留。

**一张图汇总：** [高清 PNG](assets/research-map/canal-research-map.png) · [可放大 SVG](assets/research-map/canal-research-map.svg)。涵盖目标、分工、十次实验、实际使用与仅调研的工具／产品、能力价值、限制和两道验收；资料快照为 2026-11-16，图中实际场景缩略图来自原始实验。

**交互总图与架构（2026-11-17）：** [缩放总图并查看十次实验产物](https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/explore.html#poster) · [单图到 3D 的交互架构](https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/explore.html#architecture) · [静态架构 SVG](assets/research-map/canal-image-to-3d-architecture.svg)。节点说明输入、输出、库、能力与边界；实验关联实际效果、MP4、三维、GLB 和原生工程；[实现与核验说明](ATLAS-WEB.md)。

**研究全景补齐：** [7 项未通过与未验证复盘](https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/explore.html?layer=failures#architecture) · [6 组实际技术栈](https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/explore.html?layer=used#architecture) · [29 项开源代码、模型与产品目录](https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/explore.html?layer=catalog#architecture) · [完整单张研究全景 SVG](assets/research-map/canal-image-to-3d-panorama.svg)。卡片可打开完整能力、原因边界、来源和实验证据；查阅不等于已实测。

**完整研究网页：** [打开「一张图，走进一座城」](https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/) · [启动脚本](start.cmd) · [整理范围与运行方式](WEB-RESEARCH.md)。汇总本次探究、10 份真实实验、补图检验、模型／产品和问答；最终完整场景尚未通过验收，网页公开部署状态见发布记录。

**全部效果与工程：** [直接播放视频、拖动三维和查看工程](https://yydshly.github.io/20261115_codex_project/demos/0003-ai-wide-area-modeling/effects.html) · [接入范围与原文件保护](MEDIA-INTEGRATION.md)。6 段完整视频、6 个三维／诊断入口、98 项去重图片（含研究图）、39 份工程／几何文件；原模型、高斯和视频均只读，历史工程另导出新 GLB 供预览。

- 原项目：[Kotohibi/ai-wide-area-modeling](https://github.com/Kotohibi/ai-wide-area-modeling)
- 调研日期：2026-11-15（北京时间）；研究中
- 核心提交：`8a298ad0fd40e6e6d636b89db61326bb0533a04b`；仓库于 2026-11-14 首次公开
- 验证范围：内置浏览器阅读、部分源码静态审阅、本机环境检测；另已完成单图 VGGT→Blender 最小实验，尚未运行作者完整多照片重建链路
- 补充比较：[VGGT、COLMAP 与高斯泼溅的关系及选择](vggt-colmap-3dgs.md)
- 实测：[同一张运河图的 VGGT→Blender 对照](experiments/canal-single-vggt/README.md)——跑通了，但本轮深度辅助未改善旧版图像对齐；附实际渲染、误差和脚本
- 最新实测：[运河原图→SHARP 单图高斯场景](experiments/canal-single-sharp/README.md)——独立生成约 118 万高斯，保留照片外观并完成邻近视角运动预览；生成未使用旧模型
- 组合样板：[高斯外观＋Blender 小咖啡店](experiments/cafe-hybrid-prototype/README.md)——新工程完成门轴联动、设计室内与实体换灯；另有 28 秒连续移动、开门进入及转身镜头，直接展示近景和反向观察的现有缺陷
- 展示：已有研究网页和独立实验查看器，尚无通过完整验收的三维成品；[作者废校漫游](https://arrival.space/87518943_5157)是作者输入场景的 3DGS 展示，不是本研究产出或历史复原成果

## 它解决什么问题

少量参考图容易导致 AI 做出的三维场景跨视角不一致、尺寸失真。作者引入照片、相机内外参数和点群，让 Agent 测量空间、用脚本构建几何，再按原照片位姿渲染检查。

产物是可编辑模型和生成规则。最新文章演示了不使用 3DGS 的建模路线；核心仓库也把 LichtFeld Studio（LFS）和 Unreal Engine 列为可选。[作者教程](https://x.com/kotohibi_3d/status/2119311262370988444)、[项目 README](https://github.com/Kotohibi/ai-wide-area-modeling#requirements)

## 为什么关注

本库已有[溪谷花园漫游](../0002-valley-garden/README.md)和[动画制作 Skills 图谱](../0001-animation-skills-atlas/README.md)。该项目可以补上从真实空间得到可持续修改资产的环节，服务程序化场景、影片预演和后续互动空间。

## 研究结论

| 问题 | 结论及证据边界 |
| --- | --- |
| 核心方法能否复用？ | 可以研究并改造：Skill、测量/验证脚本、三类配方已公开，MIT 许可 |
| 能否按原数据重跑废校？ | 目前材料不足。仓库明确不含采集数据、模型或资产；所查漫游界面未见原始照片＋位姿下载入口，不能据此断言其他渠道没有 |
| 必须买 360° 相机吗？ | 不必须；项目接受普通照片的 COLMAP 数据。360° 是大范围采集方式之一 |
| 必须训练 3DGS 吗？ | 不必须；源码支持 `--no-lfs` 从 COLMAP 初始化 |
| 最新 360° 流程全开源免费吗？ | 不能这样承诺；商业转换器比公开旧版多出功能，工具链另有付费项 |
| 废校历史版本是否已验证？ | 未验证。原始帖子公布的是目标，本轮未取得完成历史复原的证据 |
| 能否作高精度测绘交付？ | 未验证；尺度、遮挡和补全须独立检查，不能用画面真实代替精度证明 |

作者称其教程示例约两小时得到初步模型，这是案例陈述，不是我们的采集、预处理、建模和渲染总耗时承诺。

## 关键机制

采集照片/视频 → 相机求解（SfM）→ 必要时生成密集点群 → 统一尺度与坐标 → Agent 测量 → JSON 参数＋生成脚本 → Blender → 原视角对比 → 修改参数/规则。

- `setup_project.py`：米制、Z 向上坐标系，支持不用 LFS。
- `colmap_io.py`、`pick3d.py`：读取数据、照片投影、三角测量；`plot_points.py` 生成带网格的点群断面。
- 参数与脚本分离，按部位重复生成，保留修改依据。
- `blender/bl_point_diff.py`：点→模型与模型→点两向检查，定位遗漏或缺少数据依据的几何。
- `references/verification.md`：按同位姿、同镜头比较照片与最终渲染，修正后回查多个视角。

## 相关 GitHub 项目和工具

| 项目 | 作用 | 许可与门槛 |
| --- | --- | --- |
| [ai-wide-area-modeling](https://github.com/Kotohibi/ai-wide-area-modeling) | 核心 Skill、测量/验收脚本、街道/寺社/大坝配方 | MIT；不含实拍数据和成品模型 |
| [3DGS_pipeline_guide](https://github.com/Kotohibi/3DGS_pipeline_guide) | 采集、抽帧、遮罩、SfM、Cubemap、训练教程 | 文档 CC BY 4.0 |
| [Extract_sharpest_frame](https://github.com/Kotohibi/Extract_sharpest_frame) | 分段挑清晰视频帧 | 有公开 Python 版和商业增强版；使用/分发前核对其 LICENSE |
| [Metashape_360_to_COLMAP_plane](https://github.com/Kotohibi/Metashape_360_to_COLMAP_plane) | XML＋全景帧＋可选 PLY 转六面透视图和 COLMAP | MIT；所审提交 `9730d85a29ef47739462ce5327a9a9d147c0375e` |
| [360 MCConverter](https://kotohibi.f5.si/360/mcconverter.html) | 最新 Metashape 路线商业 GUI；V1.7.0 支持 dense 输出 | 永久许可；AprilTag 为附加许可；不等同旧版开源功能 |
| [COLMAP](https://colmap.github.io/tutorial.html) | 普通照片 SfM/MVS | 开源；注意版本、相机模型和去畸变 |
| [MCP for Blender](https://github.com/ahujasid/mcp-for-blender) | 通用 Agent→Blender 桥接候选，非作者唯一指定实现 | MIT；原名 blender-mcp，需核对接口 |
| [LichtFeld Studio](https://github.com/MrNeRF/LichtFeld-Studio) | 可选 3DGS 训练、检查、MCP 自动化 | 源码 GPLv3+；当前官方 Windows 预编译包经付费 Portal 分发 |

## 对我们的价值

以下是结合本库项目的判断，不是上游或本机实测性能结论。

1. **真实场景漫游：高价值。** 为溪谷花园下一版提供真实门廊、院落、台阶和室内的尺寸及布局；保留当前森林、水面、光照氛围与交互。先接一个建筑模块再扩大范围。
2. **影片预演：高价值。** 同一空间可以反复摆机位，检查走位、遮挡和镜头衔接；输出参考帧或预演视频给后续视频生成。最终生成视频是否保持几何一致仍需验收。
3. **可再生成资产：高价值。** 参数、脚本、照片来源和误差记录方便复用、修改与版本比较，适合与动画制作研究组合。
4. **空间记忆、旧建筑版本：中长期价值。** 现状、修复设想和历史推测保留为不同版本；历史版本另需老照片、图纸和档案。
5. **大范围高精度数字孪生：暂缓。** 数据采集、质量控制和计算成本更高，首轮先检验小场景收益。

Three.js 分支是我们提出的集成路线。上游现成迁移脚本面向 Unreal；GLB 导出、网页材质、碰撞和性能优化尚未替我们完成。

## 运行与验证

本轮实际完成：内置浏览器读取教程、核心 README、转换器说明和废校漫游；GitHub 连接器审阅部分核心文件。没有安装 Skill，没有执行第三方建模脚本。

后续同日已实际运行官方 VGGT camera/depth head，以及自写的 Blender 拟合和渲染脚本；沿用历史单张运河概念图和已有语义模型，生成普通可编辑网格。该实验不是作者多照片工作流复现，详见[独立实验记录](experiments/canal-single-vggt/README.md)。

同日按用户纠正的图片入口，另完成[SHARP 单图高斯实验](experiments/canal-single-sharp/README.md)：不使用旧模型与 VGGT 输出，原图直接生成高斯文件，用 Spark 实际渲染五个视角和 60 个运动帧。该结果支持本图的外观保留与邻近视角展示，尚未验证完整漫游、真实尺度和普通网格编辑。

本机已检测：**RTX 4070 Laptop GPU，8188 MiB 显存，驱动 576.28**；默认 Python 可导入 numpy/Pillow，存在 uv。后续在获准的主机查询中确认可见物理内存约 15.63 GiB，并实际使用 Blender 4.5.9；COLMAP、Metashape、Blender MCP、LFS 的安装与连接仍未验证。

静态审阅发现以下复现注意点，不等同于已经复现的运行故障：

- 默认相机高 1.6m 是尺度假设，必须用实测长度校准。
- `setup_project.py` 的说明要求 LFS/COLMAP 相机不一致时停止检查，但所审代码仅打印 WARNING 后继续；复现流程应阻断这种状态。
- `colmap_io.py` 的投影读取但忽略畸变参数；手机照片路线应先得到去畸变照片及匹配的 PINHOLE 参数。
- `export_points.py` 的通用 sfm 分支读取 points3D，没有自动发现任意 dense.ply 的参数；密集点云需显式载入并应用同一坐标变换。
- 配方含原现场常量；只借鉴测量方法和失败经验，尺寸与比例重新测量。
- 作者文档使用 `render_viewport_to_path`，所查通用 MCP for Blender server.py 未出现该名称，有 `execute_blender_code`。共享目录、截图和执行接口需要能力发现与适配。
- 当前 LFS 与教程版本不同，加入分支前检查实际 MCP 工具清单。

## 怎么复现：先做最小实验

**推荐从普通手机照片开始，暂时跳过 3DGS 与 Unreal。**

1. 选一处约 5–10m、有纹理的门廊、小院或建筑立面。建议先拍 40–80 张重叠照片，同一镜头/焦距，绕主体移动，保持清晰与相近光照。首轮避开大片白墙、玻璃、强反光与移动人车。
2. 独立测量至少三段长度，例如门宽、台阶高、立面跨度；一段定标，其余独立复核。
3. 在 COLMAP 求相机参数和稀疏点，检查路径与覆盖；按需 MVS 得密集点云。供后续脚本使用的照片、PINHOLE 内参和位姿必须来自同一去畸变处理版本。[官方教程](https://colmap.github.io/tutorial.html)
4. 用 `setup_project.py --no-lfs --sfm ...` 初始化，检查地面方向、坐标与尺度；不能直接把默认相机高当实测值。
5. 配置 Agent 与 Blender MCP，先列工具并验证执行、截图、共享目录。采用支持 Agent Skills 的其他 Agent 是合理实验方向，但模型质量、开销与接口适配需要验证。
6. 根据照片和点云，JSON 保存尺寸，Python/bpy 保存生成规则。先做地面、墙体、屋顶、门窗、台阶；人工修正回写参数，避免重建丢失。
7. 固定 4–6 个照片视角，包含主体两侧及一个未用于最初判断的检查视角。用相同位姿、镜头、尺寸渲染，先查几何再查材质与光照。
8. 保存 .blend、参数、生成脚本、定标依据、对比图和误差；重新生成一次确认可复现。

源码已确认的初始化形式如下；路径只是示例，不代表已有数据、共享目录或已下载脚本：

```powershell
python setup_project.py F:\capture_lab\trial01 --sfm F:\capture_lab\dataset --no-lfs --shared F:\capture_lab\shared
```

`--scale` 的单位是米/数据单位；测量后也可用 `--rescale` 修正。原始数据、处理中数据、模型/参数、验收图和导出文件分目录保存，在独立实验目录开展，不放入重要日常库或应用缓存。

## 接近作者的 360° 路线

1. 沿路径慢速拍摄，让不同位置产生视差。同一个全景帧的不同方向共享光心，不能作为跨位置三角测量的基线。
2. 开发视频、选清晰帧。作者指南建议先按约 1 秒间隔试；Seam Mask 依赖固定拼接线，应按教程关闭会改变拼接线的稳定/水平校正。
3. 区分 SfM 和 3DGS 遮罩；SAM3 双遮罩是完整增强流程，不代表旧版公开工具包含全部功能。
4. 在 Metashape 设球面相机、完成对齐。按文章从密集点云 Low、Aggressive、计算置信度开始，再清理低置信度点；关键结构缺失时调整采集或质量。
5. 商业 MCConverter V1.7.0+ 可从 .psx 或指定 PLY 生成同坐标系 dense.ply、六面 Cubemap 和 COLMAP 位姿。
6. 旧版开源转换器支持手工 XML/PLY 输入，但需要自行核对功能和变换；不能把未经变换的原始 PLY 重命名后混入已变换相机的数据集。
7. 回到小实验的定标、建模和验收；有需要时再增加 LFS 或 UE。

作者另有 COLMAP 球面 SfM 教程并使用 CCConverter，但其 dense 与转换输出仍须逐项验收，不能直接宣称已经完整替代本文作者路线。

## 本机与成本判断

作者 3DGS 指南建议至少 12GB 显存。我们的 8GB 可先验证小数据集，通过缩图、减少帧/高斯、裁剪抽样或分区探索上限；不能承诺能训练整所废校。

首轮建议约 1280px 级分析/对比图，密集点群先裁剪抽样，避免同时训练大型 3DGS 和复杂渲染。本机可见物理内存约 15.63 GiB，实际空闲内存随其他应用变化；本轮单图 VGGT 采用 CPU BF16 才完成推理，不能据此承诺大数据集容量。

小成本路线可避开 Metashape、商业转换器及 LFS Windows 包，但仍有 Agent 调用、采集、处理和人工检查时间。完整路线还有相机、Metashape、Extractor/Converter、可能的 AprilTag 附加许可。完整现价未核实，本研究不虚构总价。

## 首轮验收标准

以下为本研究自定实验目标，不是作者精度声明或本机已经达到的成绩。

| 项目 | 目标 |
| --- | --- |
| 数据一致 | 照片、内参、位姿和点云对应同一版本与坐标变换 |
| 尺度 | 三段实测长度列误差；可先以约 5% 相对误差为目标，小尺寸同时检查绝对误差 |
| 多视角 | 4–6 个视角无明显墙体缺失、镜像门窗、悬空和错误遮挡 |
| 几何支持 | 点→面、面→点两向检查，异常回查照片；玻璃/白墙低支持度不直接等于形体错误 |
| 通行 | 实际拍摄者经过的路线不被生成墙柱封死 |
| 再生成 | 参数/脚本重建后固定视角结果一致 |
| 可追溯 | 标出实测、照片推导、遮挡补全与历史推测，列出未拍到区域 |

## Three.js 与影片集成

先只替换溪谷花园的一个门廊/小屋模块。保留参数化 Blender 原工程，制作网页交付副本，导出 GLB；程序化材质按需烘焙或改成网页可表达的 PBR。用 GLTFLoader 加载后核对轴向、单位、贴图与外观；碰撞、植被实例化和地形拼接仍由网页代码承担。[官方加载器](https://threejs.org/docs/pages/GLTFLoader.html)

第二轮可暂以 GLB 约 20MB 以内、桌面目标画质约 45fps 为自定预算，需要实测，不是当前性能结论；移动端另外制定目标。

影片分支先用于走位、镜头和光照预演，再输出参考帧/视频。它提供空间控制，不能保证后续生成视频没有几何漂移。

## 历史复原的边界

现状扫描不包含已经消失年代的真实信息。开校时的建筑、颜色和家具需老照片、图纸及档案等独立依据。分别保留现状、有史料依据的修复、创作性推测版本，并注明来源和不确定区域。形体完整、视觉真实、历史正确分别验收。

## 图片与演示

已有[单图运河实验的模型与本机截图](experiments/canal-single-vggt/README.md)，以及[完整研究网页](WEB-RESEARCH.md)。登记预览使用唯一 AI 运河参考图，明确标注为输入而非成果；尚无作者场景复现或公开完整三维成品，demo_url 继续为空。作者案例仅作来源参考。

后续本机实验：[单图 SHARP 高斯](experiments/canal-single-sharp/README.md)、[咖啡店绑定样板](experiments/cafe-hybrid-prototype/README.md)、[完整空间与本地多视角高斯闭环](experiments/canal-world-local/README.md)。最后一项在新工程里复用自有街区、设计补齐空间，并从同一实体工程采集多机位后融合高斯；没有调用新的世界模型，实体画质与高斯画质分别验收，不冒充作者场景或隐藏空间的真实重建。

当前主线已回到[原图高斯与实体结构的局部表面绑定](experiments/cafe-source-bound/README.md)：保留原始街景外观，实际验证遮挡与多角度。原机位与局部结构约束有所改进，但多角度外观验收未通过。上一项实体渲染后转高斯的实验仅作为结构素材与流程对照，不能替代原图高斯复现结果。

后续按用户要求完成[原图通过通用图像模型补左右视角](experiments/canal-imagegen-multiview/README.md)：保留两张实际生成候选及完整提示词，做了二维对应筛查；尚未证明能共用同一三维场景。本轮未重建三维，也未修改旧模型和原高斯。

随后继续[室内补图与关灯对照](experiments/canal-imagegen-interior/README.md)：实际生成门口、室内开灯、同构图关灯及回望候选，二维开关灯结构大体保留；同站位反向观察与共同三维空间尚未证实。该结果是图片生成，不是可控三维光照。

最新完成[已有 VGGT 对补图的多图空间一致性实测](experiments/canal-vggt-consistency/README.md)：实际联合估计 7 张图片并检查开关灯控制、外景及室内子集；提供预测相机、对应物体区域与投影冲突候选。外景和室内分别有局部支持，但门口过渡与回望未形成可靠匹配链，尚不能确认完整共同空间；未训练高斯、未修改旧模型。

随后按确认方案完成[两张入口过渡图及 VGGT 复检](experiments/canal-entry-bridge-test/README.md)：新增 A 走近、B 门口候选，用同一配置检查 9 图、入口／门口子集及单独图对。匹配数量增加但入口连接仍未通过，联合定位还有退化；按约定暂停继续堆通用补图，不训练高斯、不修改旧模型。

## 后续计划

- [x] 确认公开教程、核心仓库和商业工具边界
- [x] 审阅输入、尺度、测量和验证机制
- [x] 形成适合本机的小场景复现方案
- [ ] 用自有照片或获许可的带位姿数据做最小实验
- [ ] 验证 Blender 生成、再生成与跨视角对比
- [ ] 试验 GLB→Three.js，再评估 360° 大场景投资

## 来源与许可

- [废校目标帖](https://x.com/kotohibi_3d/status/2121548830034534694)、[英文制作教程](https://x.com/kotohibi_3d/status/2119311262370988444)
- [固定版本 README](https://github.com/Kotohibi/ai-wide-area-modeling/blob/8a298ad0fd40e6e6d636b89db61326bb0533a04b/README.md)、[SKILL](https://github.com/Kotohibi/ai-wide-area-modeling/blob/8a298ad0fd40e6e6d636b89db61326bb0533a04b/SKILL.md)、[MIT 许可](https://github.com/Kotohibi/ai-wide-area-modeling/blob/8a298ad0fd40e6e6d636b89db61326bb0533a04b/LICENSE)
- [测量知识](https://github.com/Kotohibi/ai-wide-area-modeling/blob/8a298ad0fd40e6e6d636b89db61326bb0533a04b/references/knowledge.md)、[验证方法](https://github.com/Kotohibi/ai-wide-area-modeling/blob/8a298ad0fd40e6e6d636b89db61326bb0533a04b/references/verification.md)
- [坐标初始化](https://github.com/Kotohibi/ai-wide-area-modeling/blob/8a298ad0fd40e6e6d636b89db61326bb0533a04b/scripts/setup_project.py)、[照片投影](https://github.com/Kotohibi/ai-wide-area-modeling/blob/8a298ad0fd40e6e6d636b89db61326bb0533a04b/scripts/colmap_io.py)、[点云导出](https://github.com/Kotohibi/ai-wide-area-modeling/blob/8a298ad0fd40e6e6d636b89db61326bb0533a04b/scripts/export_points.py)
- [旧版转换器固定版本](https://github.com/Kotohibi/Metashape_360_to_COLMAP_plane/tree/9730d85a29ef47739462ce5327a9a9d147c0375e)、[商业转换器](https://kotohibi.f5.si/360/mcconverter.html)
- [LFS 当前说明](https://github.com/MrNeRF/LichtFeld-Studio)、[Blender MCP 桥接候选](https://github.com/ahujasid/mcp-for-blender)、[COLMAP 官方教程](https://colmap.github.io/tutorial.html)

本目录为自行撰写的研究笔记，没有复制上游源码、图片、数据或模型。工具开源许可不自动授予采集照片、场景资产和商业插件的再分发权。


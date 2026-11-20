# 统一进度总览与入口 · 2026-11-17

- `progress-overview.jpg`：统一总览实际首页，显示当前世界入口、展示范围和4/9/7项状态；数字为20项项目清单分类，不是游戏完成百分比。
- `progress-map-panel.jpg`：大地图右上角“世界进度”的实际弹窗，与总览共用同一清单。
- `progress-roadmap.jpg`：从未制作条目进入六步补全顺序后的实际页面，包含依赖与验收目标。
- 均为内置浏览器原生视口截图，没有生成图或重绘。尺寸和哈希见`progress-captures.json`，实际点击与记录保留结果见`progress-browser-check.json`。
- 总览中的聚落实景复用本库`settlement-street.jpg`，构建时复制到`dist/assets/progress/`；它是局部样本图，不代表整个世界或游戏已经完成。
- 没有新增外部图片、服务或模型。早期十境页面保存为`legacy-journey.html`，继续使用原Three.js运行时及许可。

---

# 村落、城镇与室内 · 2026-11-17

- `settlement-road.jpg`：最终构建的河畔村路入口截图，保留主线讲解卡、四站小地图和16/108的实际浏览记录。
- `settlement-street.jpg`：本地同一大地图的榆湾街区实际截图，显示主街、公共节点、建筑、静态人物与自然山地。
- `settlement-cutaway.jpg`：实际点击“室内剖视”后，同一工坊移开屋顶与前墙的截图；工作区、隔墙、通道、储物和住处保留真实几何。
- `settlement-interior-night.jpg`：实际选择夜景预设后的工坊住处截图，室内暖光与床铺可见，未使用生成图替代。
- 截图来自内置浏览器的原生视口；街区、剖视及夜景收起讲解卡，村路保留讲解卡；没有调整相机到虚构场景，没有提取游戏素材。截图不代表全部自然区域、所有天气分支或真机性能已经验收。
- 新桥、路面、基础、墙体、开口、屋顶、室内、灯具由本库代码制作；树、井、人物、车与道具复用本库程序化形态。未新增第三方模型与贴图，继续保留Three.js0.180.0及MIT声明。

截图尺寸与哈希见`settlement-captures.json`。数据检查见`settlement-check.json`；浏览器验收单独记录于`settlement-browser-check.json`，避免把CPU结果与实际画面混为一谈。

---

# 天气、昼夜与季节扩展 · 2026-11-17

本轮没有新增渲染截图。`weather-check.json`来自实际CPU参数、Three.js对象、着色器源码挂接、UI事件适配器与主线控制函数检查，不代表GPU编译、浏览器画面或气象数据验证。旧图继续保留原来源，不能作为新增天气画面证据。

昼夜、云量、雨雪粒子、星点、季节色调、材质薄雪与湖面薄冰均由本库程序化制作，参数为美术设定。没有新增外部贴图、模型、照片、游戏提取资产或真实天气服务。Three.js0.180.0及MIT声明保留。

---

# 海岸与水下扩展 · 2026-11-17

本轮没有新增浏览器截图；下方旧图不能作为海岸与水下画面验收证据。`marine-check.json`来自本库实际CPU几何、等高参考线、实例贴合、视线、移动、导览与相机函数检查，不是浏览器渲染或真实海洋数据。

海岸高度场、潮池、底质颜色、海草/藻/贝壳形态与岩块由本库代码生成，海面、水位和分布区间均为创作参数。没有提取《红色沙漠》或其他游戏素材。渲染继续使用Three.js0.180.0及已保留的MIT许可。没有新增外部素材或遥感/测深数据。

---

# 第三轮：地面大地图截图

- `large-world-entry.jpg`：主场景的地面视角入口，约1.72米眼高；不是俯瞰模型的放大截图。
- `large-scenes/01-coast.jpg`至`10-island.jpg`：在同一连续三维大地图中通过公共导航实际进入各站后的截图。场景名称、位置与状态见同目录manifest.json。
- `large-world-atlas.jpg`：以上10张实际截图的等比缩放排版；没有生成替代场景。可用scripts/prepare_large_captures.py重建，需要Pillow与Windows微软雅黑字体。
- `large-world-mobile.jpg`：390×844视口下的实际地面视角、三维导航与方向控制，非真机截图。
- `large-notes-export-check.json`：网页实际下载文件的UTF-8内容比对结果，只记录文件名与检查指标，不包含私人路径。
- `large-world-complete.jpg`：大地图首轮自动导览抵达灯塔，界面显示观察记录30/30的实际截图。
- 本轮地形分块、道路整坡、林地与近景草丛、材质、天空、码头及三维导航均由本库代码制作。第三方运行时仍只有Three.js 0.180.0，保留MIT声明。

拍摄于2026-11-16，来源为本地127.0.0.1:52932。景观是程序化大地图原型，不是《红色沙漠》画面、真实地理数据或照片级素材。

以下保留前轮素材记录。

---

# 第二轮补全的实际画面

- `world-v2-overview.jpg`、`world-v2-intro.jpg`：补全后的同一个连续世界全景与序章界面。
- `world-v2-crops-surface.jpg`、`world-v2-crops-elements.jpg`：农田移到西侧独立坡面后，相同相机下的地表土垄与立体作物对照。两张均是实际页面截图。
- `world-v2-fields.jpg`：风车原野的实际近景，观察地标、树群、花草、木栏、通路与人物尺度。
- `world-v2-port-day.jpg`、`world-v2-port-dusk.jpg`：本轮较早阶段在同一港口视角下切换两种光照；镜头位置一致，循环运动物件可能随时间变化，界面此后又做了紧凑排版。
- `world-v2-notebook.jpg`、`world-v2-mobile-notebook.jpg`：实际观察手记，分别为桌面和390×844视口。
- `world-v2-complete.jpg`：本轮观察记录30/30后的终章页面。
- `world-v2-tour-check.json`：本轮第6—10站快览2×定向验收的实际控制台事件和界面计数，明确标记验证范围。
- 新增模型、细颗粒纹理、土垄、桥面、路线让位规则、光照设定和教学内容为本库代码制作，无外部游戏素材。

以上图片均为2026-11-16内置浏览器真实页面截图，非概念图。旧图和前轮记录继续保留在下面。

---

# 连续世界新增截图

- `world-overview.jpg`：连续世界全景，收起讲解面板后的实际页面。
- `world-intro.jpg`：连续世界序章实际页面。
- `world-island.jpg`：归航灯塔目的地，背景仍可见大陆与雪岭。
- `world-mesa.jpg`：从主线进入风蚀高台后，使用靠近地标功能观察石拱的实际画面。
- `world-mobile.jpg`：390×844视口，收起地图与讲解后的世界全景。
- `world-complete.jpg`：#complete入口重载的终点页截图；浏览历史不会持久化，因此它不是自动全程10/10计数的证据。
- 以上均为2026-11-16内置浏览器在同一本地站点的真实截图，直接保存JPEG，没有生成替代画面；新的地形、覆盖、路线、模型与讲解为本库原创。

以下条目对应保留的独立样本图谱，不能代表新版连续世界。

---

# 素材与截图来源

- `terrain-atlas.jpg`、`surface-atlas.jpg`、`layer-atlas.jpg`、`element-atlas.jpg`：2026-11-16从本项目实际运行页面截图裁切、等比缩放、排版。不是概念生成图或《红色沙漠》截图。
- `overview.jpg`、`mobile.jpg`：内置浏览器真实页面截图，默认桌面与390×844视口；不含私人信息。
- `../web/assets/previews/*.jpg`：28张真实画布裁切，含10环境、9地表、3层、6近景。
- 来源：`http://127.0.0.1:52932/`，Three.js 0.180.0，本库原创场景。视口、矩形和相应UI状态见`capture-manifest.json`。近景用“近看元素”，溪谷相机最后换向以免树冠遮住房屋。
- 标记SVG、模型、颜色、地形与纹理由本库代码制作，没有第三方照片、游戏资源或外部模型。
- `THREE-LICENSE.txt`来自固定0.180.0安装包，MIT；`runtime-manifest.json`记录复制文件SHA-256。

重建拼图：先用内置浏览器保存截图和视口矩形清单，再执行`python scripts/prepare_captures.py <采集目录>`，需Pillow。只做截图裁切与排版，不改变场景内容；原始视口截图留在本机可视化临时目录。


## 2026-11-16 连续水系

`water-scenes/`、`water-world-overview.jpg`、`water-world-atlas.jpg`、`water-world-mobile.jpg`、`water-bed-layer.jpg`、`water-surface-layer.jpg`和`water-world-complete.jpg`来自本机内置浏览器对本库原创3D场景的实际运行截图。图谱仅缩放排版，生成脚本为`scripts/prepare_water_captures.py`。

河床、水位剖面、河流及支汊几何、源头池、跌水、流纹纹理、芦苇、平台和栈道均由本项目代码制作；沿用本项目原创岩石、柳树和船只几何，没有提取或再分发《红色沙漠》游戏资产。Six-station coordinates and water levels are authored scene parameters, not measured geography or hydrological simulation.


## 2026-11-16 植被上层元素

`vegetation-scenes/`、`vegetation-entry.jpg`、`vegetation-world-atlas.jpg`、`vegetation-step-*.jpg`、`vegetation-aquatic-off.jpg`及植被全貌、手机截图均为本机内置浏览器对本项目原创场景的实际运行捕获。图谱使用`scripts/prepare_vegetation_captures.py`缩放排版，不生成场景影像。

新增植物形态由`vegetation-scene.js`的几何代码制作，沿用本库原创阔叶树、柳形树、棕榈与枯木几何。生成规则、学习内容与场景数据由本项目编写，没有使用游戏提取资产或外部图片。名称用于形态示意，不构成真实物种与生态范围的研究结论。渲染继续使用Three.js 0.180.0与保留的MIT许可。


## 2026-11-16 地形文字导航

`map-text-*.jpg`为本机内置浏览器的实际大地图与小地图截图，局部图从完整浏览器截图按已记录的小地图DOM边界裁切。文字、颜色和位置来自项目本身，未生成或替换场景图像。标签布局与定位检查结果保留在`map-text-check.json`。

## 2026-11-16 平原、盆地与内陆湖

新增高度场、湖岸扰动、溪河几何、四层构建讲解与规则均由本库代码创作，没有提取游戏资产，也未使用外部地理或水文数据。`inland-check.json`来自实际代码的几何、水位、地形网格、路线和植物分布检查。

本轮没有新增浏览器截图：浏览器检查工具不可用。前轮植物、水系和地形截图保持原有来源，不能作为新增平原、盆地、内陆湖的实际画面证据。

## 2026-11-16 森林内部

`forest-layout.js`、`forest-learning.js`、`forest-scene.js`与高冠树形、落叶色覆盖、倒木和苔块均由本库代码创作。没有提取游戏资产、引入外部模型或物种数据。新增形态继续使用Three.js 0.180.0与保留的MIT许可。

`forest-check.json`为实际固定分布、CPU侧Three.js实例几何、倒木附着、路线阻挡与控制器分层逻辑的检查结果。冠幅覆盖为几何投影估算。浏览器检查工具不可用，本轮没有新增运行截图，旧实景不能用作新增森林的画面验证证据。

## 2026-11-16 洞穴与地下空间

新增洞体截面、洞口地表裁剪、岩层程序纹理、地下水盆/水面、岩体与灯具、导航和教学内容均由本库代码创作。没有提取游戏模型、图片或地质测量数据；沿用Three.js 0.180.0及MIT许可。

`cave-check.json`来自实际Three.js几何、射线、往返移动、主线更新函数、分层与剖视恢复检查。浏览器检查工具不可用，未新增洞穴运行截图，也未用旧图或生成图替代画面验证。

## 2026-11-16 冰川与冰雪环境

雪山高度规则、独立积雪网格、实体冰川和沟槽、冰湖/融水水盆与水面、薄冰与冰缘岩块、路线和讲解均由本库代码创作。没有使用游戏提取资产、实测地理、气候数据或第三方图片；依赖继续为Three.js 0.180.0及其MIT许可。

`glacial-check.json`来自实际CPU侧Three.js几何、冰底贴合、雪面支撑、流向水位、默认视线和分层控制检查。本轮浏览器检查工具不可用，未新增冰雪实景截图；前轮湿地、森林和水系图片不能作为新增冰雪区域的画面验证。

## 2026-11-17 高山与索道

`mountain-layout.js`、`mountain-learning.js`、`mountain-scene.js`为本库原创程序化地形、教学内容与几何，没有新增第三方贴图或模型。`mountain-check.json`为本机CPU检查记录，非浏览器画面证明；未生成高山实景截图。已有聚落与进度截图保留前轮来源和验证范围。

## 2026-11-17 生产生活链

新增production系列五个模块为本库原创程序化场景、批次状态、UI与讲解；树木、车等复用项目原有原创models.js资产，没有新增第三方素材。production-check.json为本机CPU和控制器验证，不代表浏览器画面。沿用用户只提供内置浏览器入口的选择，本轮未生成新实景截图。

## 2026-11-17 交通与公共设施

transport系列五个模块为本库原创参数、程序化几何、规则、界面及讲解；桥梁和公共水井复用原村镇，河道复用原水系，没有新增第三方模型或贴图。transport-check.json为CPU、数量与控制器检查，不是渲染截图。按用户偏好暂缓实景验收。

## 2026-11-17 极地与极光

polar-layout.js、polar-learning.js和polar-scene.js为本库原创创作参数、程序化冰体/苔原、极光着色器与讲解，没有新增外部模型或贴图。polar-check.json为CPU几何和状态检查，不是GPU截图。原聚落实景截图保留历史来源，不代表新增极地区域。

## 2026-11-17 远洋与深海

ocean-layout.js、ocean-learning.js和ocean-scene.js为本库原创创作参数、程序化地形、实例几何、教学补光与讲解；复用正式世界地形和Three.js运行库，无新增第三方模型、照片、贴图或外部地形数据。ocean-check.json为CPU几何、路线与控制器检查，不是渲染截图，深度是压缩创作尺度。

## 2026-11-17 雨林与红树林

tropical-layout.js、tropical-learning.js和tropical-scene.js为本库原创的地形、水网、群落分布、实例几何与讲解。没有新增第三方模型、图片或地形数据；湿润、盐湿与形态为创作参数。tropical-check.json为CPU检查，不能替代GPU实景验收。

## 2026-11-17 草原、戈壁与绿洲

dryland三个模块为本库原创地形、分布规则、实例几何和讲解；绿洲冠叶复用本项目原创tropicalFernGeometry，无新增外部素材或数据。干湿与静态泉池为创作参数，CPU检查不替代GPU实景验收。

## 2026-11-17 天空与特殊天气

sky-learning.js、special-weather.js以及既有天气和天空着色器的扩展为本库原创。没有新增第三方照片、纹理、音频或星图数据，云与星带为美术表现；sky-check.json为CPU状态与几何验证，不能替代GPU实景验收。

## 2026-11-17 地质与地下环境

geology-layout.js、geology-navigation.js、geology-learning.js与geology-scene.js为本库原创空腔网络、岩桥、热泉、程序化蒸汽、运动规则和讲解。无新增外部素材、地形数据、音频或截图。形体与水热参数为创作设定，geology-check.json为CPU检查，不能替代GPU实景验收。

## 2026-11-20 项目总览

`world-report-wetland-january.jpg` 和 `world-report-wetland-july.jpg` 来自内置浏览器的苇泽湿地同址季节对照，`world-report-trench.jpg` 来自环境主线海沟站的内置浏览器画面。`world-foundation-summary.png` 以项目数据和已有原创 3D 场景截图排版，尺寸、深度和水量沿用项目场景尺度。

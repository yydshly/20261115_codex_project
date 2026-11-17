# 原生动画新增版本 · 当前准备状态

用户要求保留现有版本，新增使用更合适动物资产的版本；随后限定只使用免费资产。用户先排除需要登录的网站，之后说明已经登录，并明确授权点击 Sketchfab 的 Epic Games 按钮接续登录。没有购买、注册付费服务或变更现有版。

## 已完成

- 新增独立目录 `../../web/animation-version/`，单独保留 39 个场景运行时模块、页面和样式；庭院、地形与旧模型素材通过相对 URL 只读共享，避免复制整套大资产。
- 现有模型版 55 个根目录文件哈希保存于新目录，另存源码 ZIP 于 `../../versions/model-v2-before-native-animation/`；`verify-preserved.mjs` 检查通过。最初原版的既有保护清单继续有效。
- 新增实际 GLB 文件检查入口，检查来源文件是否有蒙皮、真实动画关节通道，以及行走、吃草片段。现有静态牛文件实测为 0 skin、0 joint、0 animation，按预期被原生动画资格检查拒绝。
- 40 个独立运行时 JS 文件语法检查通过。新版本的入口和启动检查都明确处于等待资产状态，不把复制的旧场景描述成新牛模型已完成升级。

## 免费候选核对

| 候选 | 一手来源核对 | 当前取舍 |
| --- | --- | --- |
| Animated Cow / GameCraftPro | Sketchfab，24.5k 三角形，CC BY；内置浏览器实际看到明显卡通外形 | 外形不符合本次方向，未导入 |
| Cow frame test / Nyilonelycompany | Sketchfab，29.3k 三角形，CC BY；预览仅列 metarigAction | 尚未核实完整行走与吃草动作，未导入 |
| Milkcow / kenchoo | Sketchfab，29.9k 三角形，CC BY-NC-ND | 有禁止发布改编版本的限制，未选用 |
| Cow / kenchoo，4fe2c9d… | Sketchfab，说明为 simple idle，CC BY | 动作不齐，未选用 |
| Cow+motions / Kapi777 | Sketchfab，3.9k 三角形，CC BY-NC；内置浏览器实际显示 Eat、Idle_01、Idle_02_Chew、Walk 四个选项，并播放了吃草姿态 | 免费原生动画候选；尚未取得本地文件，未通过实际网格、骨骼、动画与近景质量验收 |
| Holstein Cow / the Virtual Menagerie | 作者商品页声明 23,800 三角形、2 PBR 材质、13 段动画；Fab 显示付费许可 | 用户仅接受免费资产，未采购、未下载 |

候选 [Cow+motions 原始页面](https://sketchfab.com/3d-models/cowmotions-cfacf56db7934b6cb7382fd1c3e428f1)；许可 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)。原作者署名和非商业条件须随导入文件保留。网页动作选项不能替代本地二进制文件验证，也不能据此声称摄影写实质量已经达标。

## 当前缺少的内容

Sketchfab 官方下载需要登录。经用户明确授权点击 Epic Games 后，受控内置页仍返回登录表单。2026-11-17 用户说明“登录暂时无法完成”，因此停止继续认证，没有取得候选模型文件。没有使用查看器缓存、私有接口或受限资源提取绕过登录。

随后核查了其他公开来源，结果如下。这是本轮已检查范围的结论，并不代表所有免费模型均不可用。

- [Quaternius Cow](https://poly.pizza/m/26zM1outCr)：CC0，有原生动作，但低多边形平涂风格不符合本次写实方向，未导入。
- [RigModels 的 COW Animated](https://rigmodels.com/model.php?view=COW_Animated-3d-model__efc6163d1d5d40b68774996f66dcdced)：镜像声称可下载并有 Walk/Eat；内置浏览器核对[作者原页](https://sketchfab.com/3d-models/cow-animated-efc6163d1d5d40b68774996f66dcdced)后，未见免费许可或官方下载，不能仅凭镜像的“Free”采用，未下载。
- [BYOK2/Game-asset](https://github.com/BYOK2/Game-asset)：公开仓库包含牛模型和动作说明，本轮未找到明确的素材再使用许可，未导入。
- [Traveling Houston](https://travelinghouston.com/about)：署名引用 Cow+motions，但没有独立公开下载入口，站点说明禁止提取素材再使用，未提取。
- [Cow Attack Basic Action Set](https://opengameart.org/content/cow-attack-basic-action-set)：实际为二维像素素材，不适合三维场景，未采用。

新版本状态为 `asset-unavailable`，入口明确说明尚未导入模型。新的牛模型下载、实际资产验收、原生动画接入、独立构建及最终场景浏览器验收尚未完成；当前不存在可称为“高质量新牛已替换完成”的成果。

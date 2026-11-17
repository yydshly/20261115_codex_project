# 独立模型版：真实植物三维资产

获取、完整性检查与几何统计日期：2026-11-15。本目录只服务于独立的 `model-version`，没有替换原版程序化植物，也没有修改已有材质。

所有模型来自 [Poly Haven 官方模型清单](https://api.polyhaven.com/assets?t=models)，通过对应 `/files/<asset-id>` 返回的原始文件地址取得。采用官方 1k 纹理档；glTF、BIN、JPG 保持原始内容，只将入口 glTF 统一改名为 `model.gltf`，保留其相对依赖目录。

## 许可

[Poly Haven 官方许可](https://polyhaven.com/license) 明确其三维模型及纹理采用 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，允许使用和再分发，不需要登录、付费或额外授权。本项目保留作者与来源以便追溯。此说明仅适用于实际下载的资产，不包括网站标志或示例渲染图。

## 模型

| 入口 | 资产与作者 | 植物类型 | 文件体积 | 实际 glTF 三角形数 |
| --- | --- | --- | ---: | ---: |
| [periwinkle_plant/model.gltf](periwinkle_plant/model.gltf) | [Periwinkle Plant](https://polyhaven.com/a/periwinkle_plant)，Amal Kumar | 粉色五瓣花、细茎与带叶脉的绿色叶片，6 个独立植株变体 | 3,011,015 B | 全部变体合计 34,350 |
| [fern_02/model.gltf](fern_02/model.gltf) | [Fern 02](https://polyhaven.com/a/fern_02)，Rob Tuytel（扫描）、Rico Cilliers（建模） | 4 个形态不同的蕨类植株，细分羽状叶片 | 1,260,950 B | 全部变体合计 6,232 |
| [grass_medium_02/model.gltf](grass_medium_02/model.gltf) | [Grass Medium 02](https://polyhaven.com/a/grass_medium_02)，Rico Cilliers | 5 个弯曲、疏密不同的草簇变体 | 912,091 B | 全部变体合计 7,842 |

总下载体积 **5,184,056 B（约 5.18 MB）**，包含 3 个 glTF、3 个 BIN、9 张 JPG 和 3 张官方 PNG 透明遮罩。以上不是照片平面替身或本项目生成的几何原型；资产包含可由 glTFLoader 读取的实际网格、法线、UV 和 PBR 材质。叶片等薄片部件仍采用适合实时植物的网格与纹理制作方法。

## 加载与摆放

- 这三个 glTF 的 `extensionsUsed` 和 `extensionsRequired` 均为空，**不需要 Draco、Meshopt 或 KTX2 解码器**。可使用项目已有 Three.js 0.180.0 的 `GLTFLoader`。
- 每份源场景将多个变体排列在一起用于展示。布景时应选单个命名 Mesh / 节点，清除其源布局平移，并按该变体包围盒调整中心和落地点；不要把整份变体陈列场景作为一株植物复制。
- 依据 [glTF 坐标及单位规范](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units)，采用右手坐标、Y 向上、距离单位米。模型已导出为小型植物尺度，无须根据官方 API `dimensions` 字段猜测单位。
- 每份目录的 `model-info.json` 记录从 POSITION accessor 边界和节点变换推导的包围盒、单个变体名称、顶点和三角形数。这里的统计针对实际下载 glTF，不使用官方资产页可能涵盖其他文件或版本的总面数。
- `*_nor_gl_1k.jpg` 为 OpenGL 正 Y 法线；`*_arm_1k.jpg` 为打包的遮蔽／粗糙度／金属度。以源 glTF 指定的纹理通道与材质关联为准，不将法线或 ARM 当作 sRGB 色彩图。

## 官方透明遮罩补充

源 glTF 的材料使用 `alphaMode: BLEND`，图像名称标示 diffuse 与 opacity 的组合，但其实际 `images[].uri` 指向不含透明通道的 JPG。为正确显示薄叶、细枝和花瓣边缘，另行从同一官方资产文件清单下载了原始遮罩，未改写 `model.gltf`：

| 本地遮罩 | 官方文件 URL | 字节数 |
| --- | --- | ---: |
| periwinkle_plant/textures/periwinkle_plant_opacity_1k.png | https://dl.polyhaven.org/file/ph-assets/Models/png/1k/periwinkle_plant/periwinkle_plant_opacity_1k.png | 86,094 |
| fern_02/textures/fern_02_alpha_1k.png | https://dl.polyhaven.org/file/ph-assets/Models/png/1k/fern_02/fern_02_alpha_1k.png | 114,589 |
| grass_medium_02/textures/grass_medium_02_alpha_1k.png | https://dl.polyhaven.org/file/ph-assets/Models/png/1k/grass_medium_02/grass_medium_02_alpha_1k.png | 110,617 |

三个 PNG 均为 **1024×1024、16-bit grayscale、PNG color type 0**，是黑白单色遮罩，不是 RGBA 图。白色保留植物、黑色剔除背景。可在集成阶段将其赋给 `alphaMap`，设 `NoColorSpace`、`flipY=false` 与适当的 `alphaTest`；Three.js 的 alphaMap 读取绿色通道，浏览器解码单色 PNG 时该通道承载同样的灰度值。无需从彩色 albedo 推断透明度。更换开花变体时应独立检查花瓣材质与模型几何。

## 实际变体规模

| 模型节点 | 三角形数 | 高度（米，约） |
| --- | ---: | ---: |
| periwinkle_plant_04_LOD0 | 4,108 | 0.265 |
| periwinkle_plant_06_LOD0 | 1,478 | 0.160 |
| periwinkle_plant_03_LOD0 | 5,338 | 0.300 |
| periwinkle_plant_02_LOD0 | 9,096 | 0.411 |
| periwinkle_plant_05_LOD0 | 3,078 | 0.206 |
| periwinkle_plant_01_LOD0 | 11,252 | 0.397 |
| fern_02_b | 2,384 | 0.428 |
| fern_02_c | 2,248 | 0.349 |
| fern_02_a | 784 | 0.287 |
| fern_02_d | 816 | 0.213 |
| grass_medium_02_a | 714 | 0.157 |
| grass_medium_02_b | 1,760 | 0.180 |
| grass_medium_02_c | 1,215 | 0.232 |
| grass_medium_02_d | 2,489 | 0.260 |
| grass_medium_02_e | 1,664 | 0.403 |

## 来源与校验清单

[manifest.json](manifest.json) 逐文件保留：官方原始下载 URL、字节数、官方 MD5、本地 SHA-256、资产标识、作者、许可、几何统计和包围盒。全部 18 个下载文件的 MD5 与官方返回值一致，所有 glTF `buffers[].uri` 与 `images[].uri` 均已核对有本地依赖。每项资产的 `opacityMask` 字段指明额外的官方透明遮罩相对路径。

- [Periwinkle Plant 官方文件清单](https://api.polyhaven.com/files/periwinkle_plant)
- [Fern 02 官方文件清单](https://api.polyhaven.com/files/fern_02)
- [Grass Medium 02 官方文件清单](https://api.polyhaven.com/files/grass_medium_02)

保留原始数据，不改写 glTF 材质、源网格、纹理或压缩格式；场景中进一步缩放、实例化、灯光和风动画由集成代码承担。

## 本轮新增：成熟灌木与勋章菊

- [Shrub 02](https://polyhaven.com/a/shrub_02)：Rico Cilliers，CC0；四个独立变体，共 27,254 个三角形。按约 0.76–1.23 米高度组成 58 株成熟花境骨架。
- [Flower Gazania](https://polyhaven.com/a/flower_gazania)：James Ray Cock（建模）、Jenelle van Heerden（摄影），CC0；八个独立变体，共 14,340 个三角形。前缘与花径布置 180 株，混合黄橙花色。

两组均保留官方 1K 颜色、OpenGL 法线、ARM 贴图及独立 PNG Alpha 遮罩。原始 GLTF、BIN 与图片不改写，逐文件原始地址、官方 MD5、本地 SHA256 见 manifest.json。每个变体独立归一化底部中心；从集合横向布局中分离后实例化，而不是把四株或八株整体重复铺设。实际解析与有限坐标检查已通过，浏览器最终视觉复验尚未完成。

## 短草与草甸派生网格

原 Grass Medium 02 网格和贴图不变。`tools/prepare-short-grass.mjs` 使用 meshoptimizer 1.3.0（MIT）生成 `grass_short/` 的约 180 面变体；带 `--meadow` 时独立生成 `grass_meadow/` 的 419–420 面变体，对 UV 给予更高权重以保留草叶蒙版。两组都引用原官方纹理，各自 `manifest.json` 记录面数、算法误差和输出文件哈希。当前场景使用 3000 矮草簇与 10500 草甸簇，按真实高度和区域斑块分布；并未改写原下载资产。

## 草叶缩放修复（2026-11-16）

实际近景发现细草叶逐渐消失。原始透明图平均值约 0.117，普通 4×4 和 1×1 缩小层级在 0.28 阈值下覆盖率降至零。`tools/prepare-grass-mips.py` 从保留的 Grass Medium 02 官方图集生成 `grass_mips/`：10 级显式透明蒙版保持约 11.7% 覆盖率，颜色在线性空间按 Alpha 加权，避免黑背景压暗草色；原件不改写。所有文件的 SHA256 在独立 manifest.json 中。

当前 3000 个庭院草簇也使用约 420 面的扫描派生网格，混合约 6.5–19.5 cm 高度；原约 180 面草资产保留。10500 个外围草簇继续按自然斑块、高度分布和距离预算显示。细草、庭院草与外围草共享同一组派生缩放材质，不另造草种或声称扫描精度高于原件。

近景实体草叶层由本地 `fine-grass.js` 补充，约 228788 片弯曲草叶，仅在近处显示。高度、倾斜与疏密打散，场景阴影和背光参与着色；与扫描草簇共同构成庭院地表。该层是本地生成的几何，未把它标为 Poly Haven 原件或扫描资产。

## 2026-11-16 庭院短草实例调整

源草簇与全部派生网格、mip 文件保持字节不变。院内草簇实例高度改为 2.8–6.3 cm，配合 584788 片本地近景细草，外围草簇不变。细草主要 2.5–5 cm，围栏边略长；高/低画质分别在 18/12 米内显示。此为本地几何补充，不是新扫描资产；内置浏览器画面见项目 assets/qa-20261116-courtyard/。

## 2026-11-16 混合花境更新

新增 [Shrub Sorrel 01](https://polyhaven.com/a/shrub_sorrel_01) 的完整模型和 1K 原始纹理，Rico Cilliers，CC0；6 个原始文件的来源、MD5 和 SHA256 位于 sorrel/manifest.json。源长春花、蕨类、Gazania 与灌木继续保留。当前布局按成片重复的植物组合重排，优先使用宽叶低矮 Gazania 与较完整的酢浆草叶丛；蕨类恢复较小比例，叶片粗糙度、环境反射和间接光在加载层统一。

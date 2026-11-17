# 地表材质与选用依据

2026-11-15 获取，原始文件均保留字节不变。本目录 manifest.json 记录文件 URL、作者、字节数和 SHA256；Poly Haven 文件另有官方 MD5。

## 实际用于当前草坪

[ambientCG Grass004](https://ambientcg.com/view?id=Grass004)，ambientCG / Lennart Demes，[CC0](https://docs.ambientcg.com/license/)。使用官方 2K JPG 包的 Color、NormalGL、Roughness，原始 ZIP 保留在 `.local/research/Grass004_2K-JPG.zip`，运行包只使用三张图片。材质原生尺寸约 1.4×1.4 米，官方分类为密实、绿色、短草坪；制作方式为程序化 PBR，不称为摄影扫描。

实际文件为 `lawn-fresh-color.jpg`、`lawn-fresh-normal.jpg`、`lawn-fresh-roughness.jpg`。颜色使用 sRGB，法线和粗糙度为 NoColorSpace，OpenGL 法线不翻绿色通道。草坪材质按世界米制坐标采样，与近远地形保持同一尺度。

## 实际用于裸土

[Brown Mud Dry](https://polyhaven.com/a/brown_mud_dry)，Rob Tuytel，[CC0](https://polyhaven.com/license/)。使用官方 2K Diffuse、nor_gl、Rough，按约 1.3 米的物理尺寸采样，主要分布在花坛、树根、路径及岸边过渡区域。湿润区域在加载层降低颜色亮度和粗糙度，原件不改写。

## 保留的比较材质

`lawn-color.jpg`、`lawn-normal.jpg`、`lawn-roughness.jpg` 为 Poly Haven Grass Ground 的原始 2K 图片。它们偏向干草地，保留作素材比较，当前不用于庭院草坪。之前的 Leafy Grass 在原版目录保持不变，模型版不再将它铺满草坪。

碎石仍复用原版只读的 Gray Rocks CC0 材质，其出处和哈希见上一级 `web/assets/materials/` 的来源说明。

## 地表表现的界限

表面混合草坪、裸土和碎石的颜色、法线、粗糙度；岸边根据到水线的距离增加湿润变化。1024×1024 RG 接触图按实际树根、花丛和岩石的位置生成，墙脚根据当前建筑外墙边界计算。接触遮蔽只适度降低间接漫反射，并非完整全局光照或屏幕空间环境光遮蔽。浏览器最终观感尚未自动复验。

## 2026-11-16 庭院返修

原始地表图保持字节不变。院内草色增加连续生长斑块，叠加约 2.5–5 cm 的密实细草，配合略长的边缘；路径裸土改用和石板相同的曲线遮罩，缩小旧宽土带。石板不再使用碎石纹理，来源见 `../materials/flagstone/SOURCES.md`。源码与独立包已在内置浏览器实看，记录见项目 `assets/qa-20261116-courtyard/REPORT.md`，替代前文尚未复验的状态。

## 2026-11-16 花境与几何接触遮蔽

原始地表图片不改写。当前 2048² RGBA 接触场将植株根部、土层和花坛范围分开记录，花坛范围来自与植物布局相同的种植方案。花坛土色在着色器中转为较深的有机土色。另以实际植株和建筑网格生成庭院低处接触遮蔽，保留叶片 Alpha 和高度衰减，适度柔化后只衰减间接光。它是静态的、面向近乎平坦庭院的近似遮蔽，未称为完整 GI 或通用地形烘焙。实测记录见项目 assets/qa-20261116-flower-lighting/REPORT.md。

## 2026-11-16 山谷植被分布

原地表图不改写。地形顶点增加林地、林缘和粗草分布值，和树群、灌丛使用同一空间场。林下适当混入土色，草坡有局部干湿与粗草变化；小屋庭院的管理范围保持独立。山脚按其与谷底地形的高度差，在约 12 米高度范围内逐渐接上相同草地/土层材质，减轻两块地形的硬边。并未将整座山替换为扫描场景。

## 2026-11-16 地形与地表返修

原件继续字节保留。院内仍以 ambientCG Grass004 为修剪草坪；院外草坡提高已有 Poly Haven Grass Ground 色彩图（`lawn-color.jpg`）的比例，表达枯草和土隙，避免把相同修剪草坪延伸到整座山谷。连续侵蚀区叠加 Brown Mud Dry、Rock Face 03，与新增埋入式扫描岩石共享位置关系。石面颜色和法线使用原件，高粗糙度采用运行时常数，控制完整地表材质的片元纹理数量不超过 WebGL 2 最低限制。

近、中、远网格分别为 0.5 / 1.25 / 5 m 采样，地形新增草皮起伏、浅沟与坡坎；两道衔接带和植株/行走高度采样一并更新。花径留出平顺基础。实际结果见项目 `assets/qa-20261116-terrain-water-life/REPORT.md`。

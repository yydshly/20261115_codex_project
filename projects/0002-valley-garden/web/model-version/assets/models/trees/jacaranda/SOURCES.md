# 成熟树模型与 LOD

原件：[Jacaranda Tree / Poly Haven](https://polyhaven.com/a/jacaranda_tree)，Rico Cilliers（制作）、Rob Tuytel（指导），[CC0](https://polyhaven.com/license)。原件获取于 2026-11-15，官方 URL、MD5、实际 SHA256 保存在 source-manifest.json。

原始网格共有 3,863,832 个三角形，分别为枝条、树干和树叶，约 215 MB 原始数据保存在被忽略的 `.local/upstream/jacaranda/`，不会复制进浏览器构建。保留完整成熟树的结构，不把幼松放大当成成熟树，也不把枝条、树干和树叶当作三棵独立树。

离线使用 [meshoptimizer 1.3.0](https://github.com/zeux/meshoptimizer)（MIT）生成派生网格，保留位置、法线、UV 和实际使用的 COLOR_0。三个层级共用原始 1K 贴图以及官方独立 PNG 叶片遮罩：

| 层级 | 三角形 | 几何二进制大小 | 用途 |
| --- | ---: | ---: | --- |
| near | 266,394 | 约 19.08 MB | 近距离树干、分枝与叶片 |
| far | 67,621 | 约 5.61 MB | 中距离树冠和森林 |
| distant | 9,919 | 约 0.90 MB | 远景轮廓与林带 |

优化器报告的近景最大相对误差约 0.00234。这是算法误差指标，不能当作视觉相似度或摄影真实度的验证。派生文件逐文件哈希、实际面数和误差记录在 manifest.json。多个 LOD 使用同一原始包围盒、树根底部中心与高度尺度，防止切换时因重新居中而横跳或改变高度。

运行时共享三个层级的材质、贴图，共布置 2973 棵成熟树，其中 2700 棵位于山脚坡面。高画质可见预算为 near 最多 6 棵、far 最多 22 棵、distant 按近/中/远距离带分别最多 140/180/200 棵；流畅模式对应 2/10 与 70/80/90。视野外树木裁切，原地旋转和窗口比例变化也更新实例列表。叶片使用 Alpha Test、NoColorSpace 透明遮罩，树干与枝条保持不透明。轻微风动按冠层高度增加，树根不摆动。

## 叶冠修复派生物

`tree-*.gltf/bin` 和原始贴图保持不变，新版加载 `leafy-tree-*.gltf/bin`。原低层级叶片总面积从近景约 1787 平方单位下降至远景约 306，且普通 Alpha mipmap 会继续侵蚀亚像素叶片。`tools/prepare-leafy-trees.py` 按每个独立叶片卡片的中心扩展近/中/远网格的 1.20/1.55/2.55 倍，面数、UV、法线与树根坐标不变；修复后面积约 2574/2214/1992。它是为远景覆盖率准备的图形近似，不代表真实树叶尺寸测量。

从官方 PNG 的绿色通道离线生成 11 级 RGBA 遮罩数据，保持约 25.5% 的 Alpha Test 覆盖率，运行时显式上传 mipmaps，阈值 0.30；不再同时启用 Alpha To Coverage。来源和逐文件哈希见 `leafy-manifest.json`，各层覆盖率见 `textures/leaves-coverage.json`。

语法、原件/派生文件哈希、GLTF 实际解析、遮罩范围、LOD 数量和层级切换已检查；当前无法完成浏览器最终视觉与帧率验收。

## 浏览器验收后的远景修正（2026-11-16）

保留以上全部网格与蒙版，新增 `horizon-tree.gltf/bin`，仅用于距相机 240 米以上的树林，合计 1503 三角形，叶片卡片面积保持约 1900 平方单位。处理脚本 `tools/prepare-horizon-tree.mjs` 和 `horizon-manifest.json` 记录原件、meshoptimizer 参数、叶片扩展及哈希。前三级仍保留原网格，四级共用树根和高度基准，不把近景细节一起降至地平线级。

原颜色图集整体平均 RGB 约为 27/30/16，叶片自身加权平均约为 108/118/64；普通 mipmaps 把黑背景平均进远景叶色。`tools/prepare-leaf-colour.py` 在线性 RGB 中按官方 Alpha 加权生成 11 级颜色 mipmaps，保持远景叶色约 111/121/67，原始 JPG/PNG 未变。派生文件与校验值在 `leaf-colour-manifest.json`；运行时使用 SRGBColorSpace。

浏览器实看发现 Alpha To Coverage 的导数平滑仍会侵蚀细小叶片，当前关闭该项，保留显式覆盖率蒙版；降低叶片法线幅度并钳制粗糙度，结合色调修正压低灰白闪点。当前实际运行截图记录在项目 assets/qa-20261116/，不以前一轮截图替代本轮结果。

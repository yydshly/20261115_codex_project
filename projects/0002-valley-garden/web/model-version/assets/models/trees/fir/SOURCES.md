# 冷杉树形与浏览器层级

来源：[Poly Haven Fir Sapling Medium](https://polyhaven.com/a/fir_sapling_medium)。Rob Tuytel（摄影）、Rico Cilliers（建模）；许可 [CC0 1.0](https://polyhaven.com/license)。2026-11-16 从官方 /info 与 /files API 获取，原始 glTF、BIN 和 1K 材质保存在模型版 `.local/research/fir-sapling/`，共 78,427,962 字节，逐文件匹配官方 MD5，另有 SHA256。该原始大网格不进入运行包，旧树木资产不覆盖。

本目录是可再分发的运行衍生资产。保留原始枝干/针叶色彩、OpenGL 法线、ARM 与 Alpha。用已有 meshoptimizer 1.3.0（MIT）生成四级完整网格，每级包含 a/b/c 三个不同的完整树形；去除原素材用于并排展示的节点平移，根部原点和原始尺寸写入 glTF extras，跨级固定。

| 层级 | a 面数 | b 面数 | c 面数 |
| --- | ---: | ---: | ---: |
| near | 108832 | 104265 | 104332 |
| far | 46994 | 47377 | 47385 |
| distant | 9968 | 9718 | 9739 |
| horizon | 4238 | 4143 | 4049 |

针叶连通片围绕自身中心扩展，衍生层级保留约 95% 原始几何表面积；这不是精确投影覆盖率承诺。独立 11 级 Alpha 层保持阈值 .30 下的覆盖率，线性光 Alpha 加权颜色层减少黑背景混入针叶颜色。树皮和枯枝不使用针叶遮罩。原图均不改写，派生文件与原图的哈希在 manifest.json。

离线工具为 tools/prepare-fir-lods.mjs 与 tools/prepare-fir-mips.py。场景参考真实山谷的林地结构，但本项目未对真实山谷的树种与位置进行测绘复原。

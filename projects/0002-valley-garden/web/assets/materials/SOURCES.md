# 写实自然材质来源

获取与校验日期：2026-11-15。全部素材来自 Poly Haven 官方公开 API 返回的文件地址，选择官方 **1k** 档，原文件仅改名，没有调色或重编码。

许可：[Poly Haven Asset License](https://polyhaven.com/license) 明确其 HDRI、纹理与模型采用 **CC0**，可在项目中使用和再分发。这里保留作者和资产来源以便追溯。许可说明：[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。网站界面、示例渲染图和标志不在本次下载范围。

## 资产与用途

| 本地文件前缀 | 官方资产 | 作者 | 用途及注意事项 |
| --- | --- | --- | --- |
| `grass-*` | [Leafy Grass](https://polyhaven.com/a/leafy_grass)，`leafy_grass` | Charlotte Baglioni | 带细小草叶、自然落叶和泥土变化的地面；本身不是均匀的纯绿色草坪，可与场景草色和真实草叶叠加。 |
| `rock-*` | [Rock Face 03](https://polyhaven.com/a/rock_face_03)，`rock_face_03` | Dario Barresi（摄影）、Rico Cilliers（处理） | 开裂、侵蚀的连续岩壁，适合山体暴露岩面。原色偏中性褐灰，场景可根据参考调整为冷色岩壁。 |
| `gravel-*` | [Gray Rocks](https://polyhaven.com/a/gray_rocks)，`gray_rocks` | Dimitrios Savva | 灰色碎石地表，适合河床、河岸及局部石块；不应误当作连续山崖结构。 |
| `aerial-color.jpg` | [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock)，`aerial_grass_rock` | Rob Tuytel | 大范围苔草、碎石与岩面色彩分布，可用于远景坡面或地表混合；只下载色彩图。 |
| `sky.hdr` | [Kloofendal 48d Partly Cloudy (Pure Sky)](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky)，`kloofendal_48d_partly_cloudy_puresky` | Greg Zaal（原始 HDRI）、Jarod Guest（天空编辑） | 部分多云的纯天空 HDRI，可用于环境照明与天空背景。 |

`*-color.jpg` 为 Diffuse 色彩图，使用 sRGB；`*-normal.jpg` 来自明确标为 **`nor_gl` 的 OpenGL 正 Y 法线**，不需要按 DirectX 约定翻转绿色通道；法线和 `*-roughness.jpg` 为非色彩数据。HDRI 使用线性 HDR 数据。

## 原始下载地址与校验

完整逐文件字节数、官方 MD5 和本地 SHA-256 见 [download-manifest.json](download-manifest.json)。下载后逐文件 MD5 均已与官方 API 返回值核对一致。

官方文件清单端点：

- [Leafy Grass 文件清单](https://api.polyhaven.com/files/leafy_grass)
- [Rock Face 03 文件清单](https://api.polyhaven.com/files/rock_face_03)
- [Gray Rocks 文件清单](https://api.polyhaven.com/files/gray_rocks)
- [Aerial Grass Rock 文件清单](https://api.polyhaven.com/files/aerial_grass_rock)
- [Kloofendal 天空文件清单](https://api.polyhaven.com/files/kloofendal_48d_partly_cloudy_puresky)

| 本地文件 | 原始官方文件 URL | 字节数 |
| --- | --- | ---: |
| grass-color.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/leafy_grass/leafy_grass_diff_1k.jpg | 1195394 |
| grass-normal.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/leafy_grass/leafy_grass_nor_gl_1k.jpg | 1466049 |
| grass-roughness.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/leafy_grass/leafy_grass_rough_1k.jpg | 511385 |
| rock-color.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_face_03/rock_face_03_diff_1k.jpg | 927082 |
| rock-normal.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_face_03/rock_face_03_nor_gl_1k.jpg | 1146788 |
| rock-roughness.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_face_03/rock_face_03_rough_1k.jpg | 638904 |
| gravel-color.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/gray_rocks/gray_rocks_diff_1k.jpg | 1014209 |
| gravel-normal.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/gray_rocks/gray_rocks_nor_gl_1k.jpg | 1266242 |
| gravel-roughness.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/gray_rocks/gray_rocks_rough_1k.jpg | 552373 |
| aerial-color.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_grass_rock/aerial_grass_rock_diff_1k.jpg | 666655 |
| sky.hdr | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr | 1435119 |

下载素材总大小约 10.82 MB（10.32 MiB，不含这份来源文件）。

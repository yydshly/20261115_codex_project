# 建筑 PBR 材质

2026-11-15 获取，原件未调色或重编码。两套材质均由 Rob Tuytel 制作，来自 Poly Haven 官方公开 API，采用 [CC0](https://polyhaven.com/license)。每套使用 2K JPG 的 Diffuse、OpenGL Normal (`nor_gl`) 和 Roughness，逐文件 URL、官方 MD5、实际 SHA256 与字节数见 manifest.json。

- [Roof Slates 02](https://polyhaven.com/a/roof_slates_02)：石板瓦的真实色差、瓦片接缝、法线与粗糙度变化。运行时按建筑坐标重新映射 UV，并乘以蓝灰色调。
- [White Plaster 02](https://polyhaven.com/a/white_plaster_02)：白色抹灰墙的表面色差、法线与粗糙度。运行时使用轻微法线强度，避免把颜色纹理直接当成夸张凹凸。

颜色贴图使用 sRGB，法线和粗糙度使用 NoColorSpace，OpenGL 法线不翻绿色通道。这些是模型版独有资产，没有覆盖上一级原版的材质。

## 本轮新增砖墙

[Red Brick 03](https://polyhaven.com/a/red_brick_03)，Rob Tuytel，CC0。新增三张官方 2K JPG：颜色、OpenGL 法线、粗糙度。按墙面坐标映射，匹配实际砖墙建筑，不将白色抹灰材质套在砖墙上。原件未修改，官方 MD5 和本地 SHA256 均已校验，见 manifest.json；本目录目前共有 9 张建筑 PBR 贴图。

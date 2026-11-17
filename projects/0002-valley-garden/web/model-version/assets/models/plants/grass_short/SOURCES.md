# 低矮草簇派生模型

源模型为已保留的 [Poly Haven Grass Medium 02](https://polyhaven.com/a/grass_medium_02)，CC0。使用 meshoptimizer 1.3.0（MIT）离线生成五个精简变体，每个约 180–194 三角形，保留原模型轮廓、法线、UV 和原始材质图集。当前布置 6500 个约 4.5–9.5 厘米高的草簇，用于近景草坪体积；不是仅更换地面图片。

原模型、原 BIN 和原始贴图未修改。派生文件哈希与减面误差见 manifest.json；运行时复用 `../grass_medium_02/` 的原始图片及透明遮罩。准备工具为 `tools/prepare-short-grass.mjs`，不在浏览器中减面。布置时按地表蒙版避开花坛裸土、石径和河道，流畅模式降低显示数量。视觉与帧率尚待浏览器复验。

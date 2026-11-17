# 山地高程来源

2026-11-15 从公开的 [Mapzen Terrain Tiles / AWS](https://registry.opendata.aws/terrain-tiles/) 下载 `terrarium/12/2188/1431.png`，实际 URL 与文件 SHA256 在 manifest.json 中。它覆盖奥地利 Wilder Kaiser 山地的一部分，并非原视频地点。

原始 PNG 为 Terrarium RGB 编码，海拔米数为 `R*256+G+B/256-32768`。解码成 256×256 个 little-endian float32 米数，范围约 677–2314 米，没有将普通颜色图误当成高度图。运行时生成 130,050 个三角形，水平缩放到 2300×2200 场景米，高度相对 676.7 米基准缩放 0.245，南侧近缘平滑衔接草甸。裁取、解码、缩放及边缘过渡属于本项目的衍生处理。

许可须按上游各数据源分别理解，不能把地形数据统称为 CC0。完整原文保留在 [attribution-upstream.md](attribution-upstream.md)，可见署名放在本版设置的“素材与鸣谢”页面。

- Mapzen.
- Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM) Österreich；[CC BY 3.0 AT](https://creativecommons.org/licenses/by/3.0/at/)。
- Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers.
- Global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.

Mapzen 是汇总数据源；此摘录未带逐像素上游来源标签，因此保留奥地利、欧洲和全球候选来源的相关署名，不宣称所有像素均为 NASA SRTM。

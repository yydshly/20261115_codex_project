# 独立模型版本 · 建筑素材来源

## Bungalow house

- 作者与发布者：Innerscene Corp；模型页面及 GLB 内嵌版权均声明为 Innerscene 原创模型。
- 原始详情页：https://www.innerscene.com/tools/library/3d-parts/bungalow-house-85d40048
- 原始预览页：https://www.innerscene.com/v/42axkERpWco2ZDcxYHeI8t
- 下载入口：https://www.innerscene.com/api/library/bungalow-house-85d40048/download
- 本次实际下载地址：https://files.innerscene.com/library/bungalow-house-85d40048/f10f4a431ea91a445691/bungalow-house.glb
- 获取日期：2026-11-15。
- 原文件：`bungalow-house.glb`，10,268,712 字节。
- SHA-256：`bf194d518767450bdc2bfa4d90948ec274bf07f23f5e3ae767c63e20bfd9e1cb`。
- 许可：CC0 1.0 Universal，允许使用、修改和再分发，包括商业用途。页面声明与文件内嵌声明一致。
- 许可正文：https://creativecommons.org/publicdomain/zero/1.0/legalcode.en
- 素材库条款：https://www.innerscene.com/tools/library/terms

## 保留与实测

原始 GLB 保持下载字节不变。全部几何和 8 张 2048×2048 PNG 颜色纹理均内嵌，不依赖外部图片、二进制缓冲或 Draco/KTX 解码器。需要标准 glTF 2.0 支持和 `KHR_texture_transform`；材质还使用 transmission、specular、ior 扩展。

直接解析下载文件所得：106 个节点，其中 105 个网格节点；105 个网格、105 个三角形图元，共 14,796 个三角形、8 种 PBR 材质。包围盒为：

```text
min = (-6.449999809, 0, -6.406000137)
max = ( 6.449999809, 5.957846165, 6.406000137)
size = (12.899999619, 5.957846165, 12.812000275) metres
```

原生坐标：Y 向上，地基底为 Y=0，正门朝 +Z。正门中心约 `(0, 1.425, 4.345)`；主体地基 X 为 `[-6,6]`，Z 为 `[-5.56,4.44]`。前门门廊与台阶向 +Z 延伸。模型节点无额外旋转、缩放或位移，顶点直接使用上述坐标。

已核对文件中的分件与数据：独立门扇及把手、实际墙体洞口、窗框/窗玻璃/凸出窗台、屋面与屋脊、圆形山墙通风口及格栅、空心排水管与檐沟、门廊支柱和台阶。它是有建筑细节的真实外部 GLB，不是本仓库的程序化小屋替身。

## 适用范围与限制

此文件作为独立第二版本的建筑候选保留，供主流程实际 GLTF 加载和浏览器视觉验收。单层奶油抹灰墙、红黏土瓦顶、小型入口门廊，与第一版的两层白色木屋、深蓝屋顶和宽门廊有明确差异。它不等于视频中房屋的精确重建，也不能仅凭文件大小、网格数判断为影视级资产。

纹理为 8 张颜色纹理；下载 GLB 未包含法线、凹凸、AO 或粗糙度纹理，粗糙度使用材质常数。因此可作为具有明确建筑细节的实时浏览器素材，但近距离表面微细节仍有限。文件没有动画和开门逻辑；不对完整可用室内作保证。任何运行时色调调整（如屋顶改为炭蓝色）应留在加载层，保留本目录原始文件及哈希。

原型第一版的代码和素材未因本次获取而更改。该目录未保存私人内容，也未进行发布。

## 本轮新增：Small two-storey starter home

- 作者与发布者：Innerscene Corp；详情页及 GLB 内嵌版权均声明原创、CC0 1.0。
- 详情页：https://www.innerscene.com/tools/library/3d-parts/small-two-storey-starter-home-8-x-8-m-with-hip-roof-9c7f4356
- 实际下载：https://files.innerscene.com/library/small-two-storey-starter-home-8-x-8-m-with-hip-roof-9c7f4356/93f93889ed08aedcd0c0/small-two-storey-starter-home-8-x-8-m-with-hip-roof.glb
- 文件：`two-storey-home.glb`，2,120,324 字节；SHA256 `193801f210572bcb1a5cbd4d6ab7caf835aaf6cfac75a0f5156b0cf1c55823ca`。
- 获取日期：2026-11-15。原始文件不改写，所有几何、8 张图片均内嵌。
- 文件解析：14 个网格、2,268 三角形、9 种材质；米制尺寸约 9×9.8×8.427 米。

本轮将此双层住宅设为模型版默认建筑，与旧平房、复制的经典白屋并存。加载层给屋面和外墙换用 [2K PBR 材质](../../materials/SOURCES.md)，改为蓝灰石板瓦与白色抹灰，不修改 GLB 原件。双层结构更接近参考的层数，但四坡顶、门廊和窗户布局依然不同；它不是视频房屋重建，也不因下载为 GLB 就自动具备摄影级细节。

CPU 使用实际 GLTFLoader 解析了新旧两套建筑并检查外墙碰撞边界。新增双层住宅与 2K PBR 的最终浏览器视觉复验尚未完成，详情见模型版 README。

## 本轮默认：砖墙花园小屋

- 原作者：Innerscene Corp；[原始详情页](https://www.innerscene.com/tools/library/3d-parts/cottage-with-pitched-roof-bc88ab4f) 和 GLB 内嵌版权均声明 CC0 1.0。
- 原件：`garden-cottage.glb`，10,375,276 字节；SHA256 `13226d4a2b61aa5e3729501074d84c1112f06aa871901d6eae3db41aaf1de70f`。
- 原始文件地址：https://files.innerscene.com/library/cottage-with-pitched-roof-bc88ab4f/dbfc87e1e275a68f0254/cottage-with-pitched-roof.glb
- 获取日期：2026-11-15。105 个网格、14,716 三角形、8 种材质与 8 张内嵌纹理，原生尺寸约 8.9×12.812×6.712 米。
- 分件包含窗框、窗台、独立门扇、门廊柱与台阶、屋脊、通风格栅、檐沟与排水管。外墙为砖墙，屋面为石板。

该模型替换此前默认的简化双层住宅；原双层住宅、平房与经典白屋保留为设置选项。运行时为砖墙和石板加载各自 2K 颜色、法线与粗糙度贴图，使用建筑坐标映射，不覆盖原始 GLB。此次目标是提高此版本本身的材质与建筑细节，不要求复刻参考视频房屋。几何和碰撞通过 CPU 实际 GLTFLoader 验证；不能以此声称已完成最终浏览器观感验收。

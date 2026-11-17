# 默认小屋的室内家具

2026-11-16 从 Poly Haven 官方 API 文件清单下载，均按 [CC0-1.0](https://polyhaven.com/license) 使用。保持 glTF、BIN、1K 颜色、法线及 ARM 贴图原件不变；下载地址、官方 MD5、本地 SHA256、字节数、作者和日期完整记录于 [manifest.json](manifest.json)。本轮 24 个文件合计 7,096,555 字节。

| 模型 | 作者 | 原件面数 | 用途 |
| --- | --- | ---: | --- |
| [Sofa 02](https://polyhaven.com/a/sofa_02) | Kirill Sannikov | 2,728 | 保留底座与坐垫的完整双人沙发 |
| [Coffee Table Round 01](https://polyhaven.com/a/coffee_table_round_01) | Ulan Cabanilla | 4,044 | 石面茶几与窗边小桌 |
| [Modern Arm Chair 01](https://polyhaven.com/a/modern_arm_chair_01) | Vibrant Nordic | 8,916 | 客厅、窗边和后部阅读区 |
| [Industrial Pipe Lamp](https://polyhaven.com/a/industrial_pipe_lamp) | Mateusz Sadek | 8,626 | 两处阅读灯；保留灯体、灯泡与开关 |

每个完整模型先归一化底部中心，再按实测包围盒、所需高度和房间尺寸缩放、旋转、布置。当前为 1 套沙发、2 张桌、4 把扶手椅、2 盏灯。楼板、吊顶、隔墙、橱柜、书架、书籍、窗格和褶皱窗帘由本地几何补充，不把这些声称为扫描资产；地板复用原屋下载资产的橡木纹理。

窗玻璃继续使用原 GLB 的七套有限厚度网格；移除旧玻璃颜色贴图中的烘焙亮斑，使用透射率 0.90、IOR 1.52、厚度 8 mm 的物理材质与现有 HDR 环境反射。未用不透明贴片遮住窗洞。暖光与晨暮同步；静态窗件和书籍按材质合批。

本轮新增的是默认砖墙小屋从窗外可见的室内布景；没有开门、进入室内或家具交互。CPU 检查覆盖真实模型加载、家具落地与不越外墙、七扇窗的玻璃射线命中与室内层次、晨暮灯光。最终浏览器画面与帧率仍需视觉复验。

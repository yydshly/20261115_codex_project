# 原生动画比较版（准备中）

这是独立的新版本目录。当前状态为 `asset-unavailable`，尚未导入或验收新的牛模型，不将其描述为已完成的高质量升级。

现有模型版 55 个根目录文件的 SHA256 保存在 `preserved-model-version.json`；修改前源码另存于 `../../versions/model-v2-before-native-animation/source.zip`。运行时源码单独复制，庭院与山谷素材通过相对 URL 只读引用现有模型版的资产，不覆盖原文件。最初原版也保持不变。

本轮约束：只使用免费资产。用户曾要求无需登录网站，之后明确已登录 Sketchfab，可以继续核实官方下载；不购买付费资产。

免费候选 [Cow+motions](https://sketchfab.com/3d-models/cowmotions-cfacf56db7934b6cb7382fd1c3e428f1)，Kapi777，CC BY-NC 4.0。已在内置浏览器看到 Eat、Idle_01、Idle_02_Chew、Walk 四个原生动作选项；本地模型文件尚未下载，因此还没有把网页信息当作实际骨骼/网格检查结果。该许可限非商业使用，导入时须保留作者及来源署名。

`inspect-glb.py --require-native <模型.glb>` 检查实际文件中的蒙皮、关节、动画通道及行走/吃草动作。它只检查资产是否具备必要数据，不能替代形体、步态和接地的视觉验收。新模型未通过检查时，`bootstrap.js` 不会把旧静态牛冒充为新资产启动。

`node verify-preserved.mjs` 检查现有模型版未变。

2026-11-17 用户说明登录暂时无法完成，已停止继续尝试认证。另行核查了无需账号的公开来源；目前核查过的候选仍存在卡通外形、缺少所需动作、缺少明确再使用许可或无直接下载入口的问题，没有导入替代品。新版本准备工作完成，实际替换与场景验收仍未完成。候选取舍、已经完成的保护和检查、未完成项见 [状态记录](../../assets/qa-20261117-native-animation/REPORT.md)。

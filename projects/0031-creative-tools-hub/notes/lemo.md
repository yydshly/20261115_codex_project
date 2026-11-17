# Lemo-Opuscar · 阶段研究记录

以下是2026-11-17整理的阶段资料。“本轮”“未发布”等描述沿用当时记录，当前公开状态以发布记录为准。相对工程入口由公开页映射或改为说明，不表示全部源工程随站点发布。

# 0010 · 风来小庭 · Lemo-Opuscar 成片与改稿验证

用 Lemo-Opuscar 的 **Watercolor Brush（水彩笔刷）** 制作一支 24 秒自然体验短片，再根据实际初稿做一轮定向修改。主题沿用“人物建立入口，再把注意力交给风、草木与水面”的创作方向。

**本轮判断：值得保留为绘画动画的制作基础。风格规则与笔刷代码可以复用，相机、文字、风力和局部材质也便于修改；具体庭院、人物和叙事仍需自己设计和编写。** 这个样本支持“可控改稿”，尚不能证明普遍节省多少制作时间。

## 先看结果

本轮新增：[与原作者水彩样片的实际对照](REFERENCE_COMPARISON.md)。基础笔触与局部画入已经复用；多层视差、整页绘入、事件与注释编排仍有明显差距，附原片/本片实速选段和带时间点的静帧。

- [改稿 V2 · 24 秒 MP4](episodes/wind-in-the-garden/renders/v2/wind-in-the-garden-v2.mp4)
- [初稿 V1 · 24 秒 MP4](episodes/wind-in-the-garden/renders/v1/wind-in-the-garden-v1.mp4)
- [同步左右对照视频](episodes/wind-in-the-garden/renders/comparison.mp4)
- [可同步播放、定位的本地对照页](episodes/wind-in-the-garden/review.html)
- [三组相同时刻的高清对照](assets/revision-comparison.jpg)

成片保留在本机，属于可重建输出，受项目 `.gitignore` 排除；未公开部署，`demo_url` 留空。克隆本库后需按下方步骤重建视频。

![改稿实际成片 22 秒：水彩人物、花草、溪流、石桥、小屋与树冠构成连续庭院](assets/overview.jpg)

2026-11-16，从本次实际编码的 V2 成片提取；景物、人物和音乐为本轮代码创作，笔刷与植物工具复用 Lemo-Opuscar 的 MIT 代码，中文字体为 OFL 的 Noto Serif SC。

## 改了什么，是否方便

| 实际初稿问题 | 一轮修改 | 修改位置与结果 |
| --- | --- | --- |
| 地面横纹太整齐，远山重复尖角 | 疏密不均的局部笔触、三遍错位透明色块与纸色雾带 | `scene.js` 的水彩材质分支；保持同一庭院布局 |
| 12 秒水边镜头左缘残留半个人 | 完整移出人物，延长溪流停留，再展开全景 | V2 相机关键帧；人物源造型未换 |
| 旁注压在草丛上 | 移到上方留白 | 只改版本配置中的坐标与出现时间 |
| 草木摆动联系较弱 | 风由左向右传播，草与树分时响应 | 风参数与摆动分支；未修改上游笔刷引擎 |

初稿源码保留在 [snapshots/v1](episodes/wind-in-the-garden/snapshots/v1/)，配置分别为 [v1.json](episodes/wind-in-the-garden/versions/v1.json) 和 [v2.json](episodes/wind-in-the-garden/versions/v2.json)，实际源码差异见 [scene-revision.diff](episodes/wind-in-the-garden/scene-revision.diff)。场景文件本轮增加 27 行、替换/删除 7 行，另有配置变化；行数不是制作难度评分。

**相机、文字、色彩、时序改动很直接；地形、人物表演和绘画材质改进仍要写代码并看结果。** 本轮动了相机路径，所以两版画面差异不能解释为逐像素锁定编辑。新题材也不是把故事文字换进样片就自动完成。

## 实际成本与检查

Windows 11；Node 22.15.0、Python 3.10.11、FFmpeg 6.1.3、Playwright Core 1.65.1、本机 Chrome。输出均为 H.264 / AAC、1280×720、60 fps、1440 帧、24.000 秒，48 kHz 立体声。无旁白与对白，有三条中文旁注及 SRT 旁车文件。

| 本次测量 | 初稿 V1 | 改稿 V2 |
| --- | --- | --- |
| 画面渲染，3 个工作进程 | 45.017 秒 | 41.647 秒 |
| 纸张准备、声音合成、渲染、封装与技术检查合计 | 60.162 秒 | 50.088 秒 |
| 文件大小 | 约 12.0 MB | 约 10.0 MB |
| 综合响度 / 真峰值 | −14.0 LUFS / −2.5 dBFS | −14.0 LUFS / −2.5 dBFS |
| 检出黑帧区间 | 无 | 无 |

这些是本机单次运行时间，**不包含前面的选型、写故事、编写场景及看图返修时间**；缓存、画面压缩率等会影响速度，不能据此断言 V2 或本工具普遍更快。改稿从版本配置开始记录到 V2 输出约 130 秒，包含编写和抽帧往返及 50 秒构建，仍不包括前期建立工程的成本。

检查记录见 [verification.json](verification.json)。已从实际编码成片每两秒抽帧，并额外检查 3.8、7.5、12、17、23.8 秒；已验证乱序访问同一时间得到同一像素，页面无脚本/资源错误。姿态表见成片工程 `renders/v2/stills/model-5.8.jpg`。完整播放检查与声音的人工听审状态在记录中单独列明；程序响度检查不能代替人工听审。

## 复现

在 `episodes/wind-in-the-garden/` 执行：

```powershell
# 本机已有 Playwright Core 时会使用 .local/lemo-render-runtime 中的独立副本。
# 其他机器先在此目录 npm install；Python 需要 numpy scipy pillow soundfile。
python build.py v1
python build.py v2
python review.py
```

`build.sh v2` 也是同一条构建入口。渲染器默认查找本机 Chrome 或 Edge，可通过 `PLAYWRIGHT_CHROME` 指定浏览器。中文子集字体已保存在工程中，渲染不访问在线字体；`review.py` 制作标签时需要原始字体，下载来源及许可证见 `CREDITS`。

本次使用上游允许的自有工具链：本机 Python 3.10 与 FFmpeg 6 足以完成该 Canvas 2D 样片，因此没有运行会要求 Python 3.11 / FFmpeg 7 的上游一键安装器和 `mux.sh`。最终混音采用本地两遍响度分析和明确 24 秒封装。验证的是 **Codex 阅读风格指南、复用上游代码并制作/改稿**，不等于实测了 Claude 插件的一键自动流程。

## 创作、归因与边界

先写 [TREATMENT.md](episodes/wind-in-the-garden/TREATMENT.md)，再读上游样片技术说明。样片是约 114 秒的澳大利亚降雨梯度与地图纪录；本片为 24 秒的原创小庭与人物自然体验。在结构、开场、标志镜头、配乐形状和结尾上均不同，只学习笔刷、植物缓存和确定性帧函数。

本轮实际复用 `engine.js` 与 `plants.js`，未改这两个文件；庭院几何、人物造型、动作、相机、纸张生成和音乐为本轮编写。角色是简化的水彩代码造型，精细表情与自然肢体表演仍有明显提升空间。未测其他 98 种风格、长片、多角色连续表演或一般意义上的“一键复刻”。

上游：[Lemo-Opuscar](http〈本机研究路径〉 2.0.0，固定提交 [`3a7132b996be0241c1ea0ab180d519f06e6f10b6`](http〈本机研究路径〉

完整素材清单见 [CREDITS](episodes/wind-in-the-garden/CREDITS)：代码 MIT；上游文档 CC BY-NC 4.0，并附其为自有影片制作提供的额外许可；Noto Serif SC 字体 OFL。未使用原样片音乐、人物、素材或片尾署名，使用者仍需对以后加入的素材确认权利。

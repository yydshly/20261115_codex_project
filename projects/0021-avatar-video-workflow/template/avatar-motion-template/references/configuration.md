# 配置和运行

模板是本地 Python + RVM + Blender + FFmpeg 后期管线。以 `assets/preset.json` 为完整配置起点；`init` 会探测输入视频，生成可编辑的 `project.json`，默认取不超过 10 秒的片段。可使用 `--start 2 --duration 8` 选择其他片段。

## 最短用法

```powershell
python "D:/codex/home/skills/avatar-motion-template/scripts/avatar_video.py" init --job-dir "F:/my-video/job-001" --video "F:/my-video/presenter.mp4" --copy "F:/my-video/copy.json"
python "D:/codex/home/skills/avatar-motion-template/scripts/avatar_video.py" run --config "F:/my-video/job-001/project.json"
```

`init` 不覆盖已有 `project.json`。修改文案后再运行第二条命令即可；最新结果见工作目录的 `latest.json`。所有相对路径按配置文件所在目录解析。

只替换画面文案的 `copy.json` 可以是：

```json
{
  "title_lines": ["今天看懂，", "三个关键点。"],
  "description": "用一句话说明本期主题。",
  "chips": ["第一个点", "第二个点", "第三个点"],
  "keywords": ["内容", "节奏", "表达"],
  "outro_lines": ["把内容，", "讲得更清楚。"],
  "outro_description": "填写自己的收尾说明。",
  "outro_tagline": "下一期继续。"
}
```

这些文字是画面层，音频仍来自输入视频。仅有新稿子而没有对应口播视频时，需要先单独制作音画同步的人物素材。

## 参数

| 字段 | 作用 |
| --- | --- |
| `source.video` | 自带同步音轨的人物视频，横幅、竖幅都会等比缩放并补边到 1280×720 |
| `source.start_seconds` / `duration_seconds` | 选取连续片段；时长 5–180 秒，默认不超过 10 秒 |
| `source.crop` | 可选人物提取范围，`[左,上,右,下]`，0–1；坐标基于补边后的 1280×720 画面，不改变原始开场构图 |
| `source.credit` | 片尾细栏的素材署名 |
| `output.fps` | 12–60 的整数；内部时间转为帧，默认 24 |
| `output.directory` | 成片父目录，每次创建新时间戳子目录 |
| `output.preview_gif` | 是否导出无声 GIF |
| `style.paper` / `ink` / `accent` / `screen` | `#RRGGBB` 配色；屏幕底色变化需要更新三维贴图与渲染 |
| `style.outline_pixels` | 白描边半径 0–30；0 表示无白描边 |
| `style.font_regular` / `font_bold` | 可选字体路径；未填时使用本机运行配置或常见中文字体 |
| `timeline.*` | 0–1 的时间比例，按顺序严格递增；见预设中的 7 个节点 |
| `matting.reset_on_cut` | 用帧差检测明显切镜并重置 RVM 循环状态；是启发式检测，不能保证识别每个剪辑点 |
| `matting.reset_at_seconds` | 指定需要重新初始化抠像的片段内秒数，例如 `[6,9]` |
| `matting.downsample_ratio` | RVM 内部缩放，默认 0.5；影响细发丝精度和耗时 |
| `scene.samples` | Cycles 采样数，默认 24；增大通常更慢 |
| `scene.device` | `auto` 优先 OptiX，再尝试 CUDA，再回退 CPU；可显式设 `cpu`、`optix`、`cuda` |
| `scene.camera_near` / `camera_far` | 三维镜头起点和终点 XYZ，自动创建中间关键帧 |
| `scene.pink` / `cyan` / `gold` | 三维装饰灯带三种颜色，字段名沿用初版 |
| `copy.title_lines` / `outro_lines` | 各两行标题；过长会缩字，仍无法放入时预检报错 |
| `copy.chips` / `keywords` | 各三项；程序按列排版 |
| `copy.captions` | `[{"start":2.2,"end":3.5,"text":"字幕文字"}]`，相对当前片段；有序、不重叠 |
| `copy.caption_kind` | `effect_demo` 为视觉示意；`transcript` 为用户提供的正式字幕 |
| `copy.footer` | 效果示意必须保留明确说明；正式字幕可写来源或署名 |

## 字幕

正式口播字幕可以在初始化时使用 `--srt 字幕.srt`。SRT 时间从本次选取片段的第 0 秒开始；支持毫秒逗号或点，保留数字、百分号、单位和多行文字。不会识别、翻译或自动校正原声。文本过长、时间交叠或超出片段会在三维渲染之前报错。

`init --copy` 只合并 `copy` 字段。它按选定片长缩放预设示意字幕的时间；如果提供自己的 `captions`，需使用该片段内的真实秒数。后续手工修改 `duration_seconds` 时也需更新字幕时间轴。

## 环境

- Python 3.10+，依赖见根目录 `requirements.txt`。当前只验证其中列出的版本组合。
- `ffmpeg` 和 `ffprobe` 在 PATH 中。
- Blender，当前实际验证 5.2.2 LTS / Cycles / RTX 4070 Laptop / OptiX；CPU 和 CUDA 有回退代码，未单独做性能验收。
- RVM MobileNetV3 FP32 ONNX v1.0.0。官方来源：[RobustVideoMatting 发布页](https://github.com/PeterL1n/RobustVideoMatting/releases/tag/v1.0.0)。本机已缓存模型，不重复下载。
- 模型 SHA-256：`88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828`。
- RVM 原项目 GPL-3.0 许可证见 `assets/RVM-LICENSE.txt`，模型不包含在技能分发包内；跨机器使用时获取正确模型，并遵循其许可。

本机运行路径在 `local-runtime.json`，其中不保存 API Key。没有该文件时在 `project.json` 的 `runtime` 里填 `model`、`blender`、`font_regular`、`font_bold`，或者用 `AVATAR_RVM_MODEL` / `AVATAR_BLENDER`。无需 Google API Key。

## 缓存与输出

抠像缓存以源片内容、选取片段、裁切、帧率、模型、抠像设置和脚本版本区分。三维缓存另加屏幕颜色、镜头、场景设置等参数。修改 `copy` 或二维强调色不会重新抠像或渲染三维；改镜头只更新三维。修改视频、裁切或帧率需要重新提取。

产物：`video.mp4`、可选 `preview.gif`、`poster.jpg`、`storyboard.jpg`、`manifest.json`、`verification.json`、实际使用的 `project.resolved.json`、独立的 `scene/` 场景包。缓存和最终输出放在任务工作目录内，不写入原素材目录。每次运行创建新成片目录，不覆盖旧结果。

## 输入限制

优先使用单人、清晰、已有同步口播的连续视频，避免输入已经被大量标题、遮挡、拼贴加工的成片。RVM 不是身份识别器；多人、严重运动模糊、切镜、画面里没有人时可能抠错。质量检查只做轮廓面积等启发式检测，仍应看实际分镜和边缘。需要其他画幅、复杂内容图表、多人物或新转场样式时，应扩展模板后再验证；当前布局固定 16:9。

本模板不负责生成声音、修改嘴型、自动翻译或调用生成式视频服务；这些需在输入阶段另行准备。

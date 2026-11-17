---
name: avatar-motion-template
description: 将已有且音画同步的人物口播自动制作成抠像描边、动态字幕、擦拭转场和三维屏幕镜头视频。用于复用这套人物后期模板、替换素材与文案或调整配色节奏；不负责生成新口播、配音或改变嘴型。
---

# 数字人口播动效模板

用本技能目录内的脚本执行完整后期，不依赖旧聊天目录或手工保存的 `.blend`。人物视频、视觉文案、字幕时间轴、配色和镜头由 JSON 驱动。默认 10 秒、1280×720、24 fps，时间轴按比例缩放，支持 5–180 秒片段。

固定视觉关系是：口播开场 → 背景擦除与白描边 → 左文右人物 → 擦入真实三维屏幕 → 镜头后移 → 关键词卡 → 人物收尾。`assets/style-reference.jpg` 是本次原始 10 秒小样的实际分镜参考；其中人物仅为参考，不是后续任务默认素材。详细参数见 [configuration.md](references/configuration.md)。

## 输入与执行

1. 定位用户指定的口播视频。视频需已有声音和对应嘴型；未指定素材且上下文也找不到时，才请求素材路径。文字只改变画面文案；用户要改说话内容时，应先准备相应口播视频。
2. 在用户任务目录创建一个新工作目录，不改动源片。执行下列命令，`<skill>` 为本技能绝对路径。可在 `init` 时传 `--copy 文案.json` 或 `--srt 字幕.srt`。

   ```powershell
   python "<skill>/scripts/avatar_video.py" init --job-dir "<job>" --video "<input.mp4>"
   ```

3. 编辑 `<job>/project.json`。按用户文案替换 `copy`，保留数字、单位、专有名词。字幕时间以选取片段的起点为 0；有 SRT 时原样导入它的时间和文字。没有准确时间轴时，只把自动分配时长的文案称为视觉示意，不宣称已语音识别或完成逐字对齐。
4. 检查运行环境与排版，然后完整生成：

   ```powershell
   python "<skill>/scripts/avatar_video.py" check --config "<job>/project.json"
   python "<skill>/scripts/avatar_video.py" run --config "<job>/project.json"
   ```

本机 `references/local-runtime.json` 提供 Blender、RVM 模型和字体位置；换机器时在配置的 `runtime` 或环境变量 `AVATAR_BLENDER`、`AVATAR_RVM_MODEL` 中设置。Python 依赖见 `requirements.txt`。需要安装时用用户选定的虚拟环境，不擅自覆盖系统环境。详细前提、许可与本机验证见 [configuration.md](references/configuration.md) 和 [validation.md](references/validation.md)。

## 结果与检查

- 成片位置由 `<job>/latest.json` 指向。每次导出放进新时间戳目录，不覆盖旧成片。
- 交付 `video.mp4`、`preview.gif`（启用时）、`storyboard.jpg`、`verification.json`。`scene/scene.blend` 与相邻 `screen-frames/` 可以一起移动和继续编辑。
- 先检查分镜图，再检查擦拭交界、字幕过长处、头发边缘与结尾。脚本会验证完整解码、帧数、音画时长和原声相关性；数值检查不能替代画面评审。
- 新的文案、字体、配色应先通过 `check`。过长文字需要合理拆分或缩小，不能悄悄删改内容。
- 抠像异常时看 `cache/matte-*/matting-check.jpg` 和 `prepared.json`，优先修正 `source.crop` 或 `matting.reset_at_seconds`。只有看过异常帧且确认可接受时才使用 `allow_suspect_frames`。

## 复用边界

抠像与三维分别缓存。保持素材、时间和相关视觉参数不变时，改文案会复用它们。渲染中断后重跑相同配置会继续缺失的三维帧；不要删除未知缓存或其他项目目录。

三维屏幕里的角色是二维视频贴图；地面的波形形几何是装饰，不是数据图表。关键词卡中的波形来自实际音轨振幅。精确数字、表格和图表需要另外的程序绘制层，不能把装饰波形说成事实数据。

模板沿用输入音轨，只有首尾短淡化，不自动翻译、不做新配音或 AI 人物生成。需要这些能力时另行执行对应任务；不暗中调用收费生成服务。

源人物、声音和音乐的使用权归其权利人。研究参考与本机验证不意味着可公开再分发参考素材；本模板不包含原片或模型权重。

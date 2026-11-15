# 效果实验室验证

日期：2026-11-15。环境：Windows、Node.js 22.15.0、Codex 内置浏览器。

## 实际使用的 Skill

通过内置浏览器读取 Remotion 官方 [remotion-markup/SKILL.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md)（声明版本 4.0.543），及其引用的 [timeline-structure.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-interactivity/timeline-structure.md)、[compositions.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/compositions.md)。使用 useCurrentFrame、useVideoConfig、interpolate 和 Easing 编写样片；注册明确的 Composition。未全局安装 Skill，未修改 Agent 或 MCP 配置。

其他示例直接调用对应 npm 库，不声称它们已安装独立 Agent Skill。

## 运行验证

12 个示例均在内置浏览器逐一切换，并确认名称与运行状态正确：

| 工具 | 实际调用与结果 |
| --- | --- |
| Remotion 4.0.543 | Player 播放真实 Composition；CLI 渲染 90 帧 H.264 成功 |
| Motion 14.14.0 | animate / stagger 驱动柱形运动 |
| Anime.js 4.5.0 | v4 animate 驱动形状位移旋转 |
| Ola 1.2.2 | 插值坐标用于光标跟随 |
| Shifty 3.0.6 | tween 数值驱动 DOM 运动 |
| Two.js 0.8.24 | SVG 渲染器输出几何图形 |
| Lottie Web 5.13.0 | light 播放器渲染本站编写的 JSON 动画 |
| TweenJS 2.0.0-beta.4 | 链式补间驱动画布；修正暂停接口为 paused 属性后切换正常 |
| Konva 10.9.1 | Stage / Layer / Transformer 创建交互画布 |
| Three.js 0.187.0 | WebGL 实际输出光照环结，截图确认可见 |
| Proton 7.1.5 | 使用包的嵌套 default 构造器，CanvasRenderer 输出可见粒子 |
| gifenc 1.0.3 | 实际编码 36 帧、320×180 的 GIF；浏览器确认图片已加载并显示约 31 KB 的下载链接 |

Remotion 输出 `web/public/atlas-sample.mp4`：CLI 成功，大小 132237 字节；浏览器媒体元数据为 3 秒、640×360、readyState 4。无音轨。使用官方 Remotion Headless Shell 完成渲染。

`npm run build` 通过。Vite 对经典目录脚本给出非模块提示，配置已将 app.js 和 resources.js 原样复制到构建目录，保留原资料目录的直接打开能力。构建仍有依赖包体积和 Remotion use-client 指令提示；本项目是浏览器应用，未将其视为服务端组件。

## 边界

每项仅验证最小示例，未验证全量 API 或复杂生产作品。Motion Canvas、Manim、LUME、Blender、Godot、Babylon.js 未加入本轮运行演示。原第一轮 verification.md 保留为当时资料展示页的验证历史。

依赖与完整第三方代码保留在被忽略的 node_modules；锁文件记录版本。dist、Remotion 缓存与生成的视频不应提交。未配置发布或外部托管。

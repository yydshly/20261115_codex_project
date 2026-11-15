window.ANIMATION_ATLAS = {
  checkedAt: '2026-11-15',
  origin: 'https://x.com/okapi_fukugyo/status/2121725407867351215',
  groups: [
    { id: 'video', name: '视频编排', icon: 'film' },
    { id: 'explain', name: '图解与数学', icon: 'nodes' },
    { id: 'motion', name: '转场与补间', icon: 'wave' },
    { id: 'canvas', name: '二维与画布', icon: 'layers' },
    { id: 'three', name: '三维与游戏', icon: 'cube' },
    { id: 'finish', name: '特效与导出', icon: 'spark' }
  ],
  skills: [
    ['remotion-best-practices', '通用最佳实践', '汇总 Remotion 制作规范，不确定入口时从这里开始。'],
    ['remotion-create', '创建项目', '建立新的 Remotion 项目或视频 composition。'],
    ['remotion-markup', '画面与时间编排', '处理布局、字体、动画、媒体、音频和时间。'],
    ['remotion-studio', '预览作品', '启动 Studio，检查实际视频预览。'],
    ['remotion-render', '渲染输出', '调用渲染，输出视频或静态帧。'],
    ['remotion-maps', '地图动画', '制作地图、路线、标记及地理讲解。'],
    ['remotion-captions', '字幕', '提供字幕与说明文字的制作指导。'],
    ['remotion-saas', '产品集成', '将 Remotion 集成到应用或服务。'],
    ['remotion-interactivity', 'Studio 编辑交互', '让元素在 Studio 中按预期选择与编辑。'],
    ['remotion-docs', '查阅文档', '检索当前 API、组件参数和包文档。'],
    ['remotion-license', '许可查询', '查询 Remotion 许可、条款和购买信息。'],
    ['remotion-upgrade', '版本升级', '指导相关包和 Agent Skills 的升级。'],
    ['remotion-multimedia', '媒体处理', '提供基于 Mediabunny 的浏览器媒体处理指导。']
  ],
  tools: [
    {
      id: 'remotion', number: '01', name: 'Remotion Skills', repo: 'remotion-dev/skills', ref: 'main', group: 'video', kind: 'skill', shape: 'AI 技能集', stack: 'React · Remotion', officialSkill: true,
      tagline: '把视频制作流程交给编码 Agent',
      description: 'Remotion 官方维护的 Agent Skills，为创建项目、画面编排、字幕、预览和渲染提供操作知识与最佳实践。',
      capabilities: ['创建与编排', '字幕与音频', '预览与渲染'],
      usecase: '产品介绍、技术讲解、数据驱动的视频模板。',
      aiUsage: '让 Codex 或 Claude Code 读取官方 Skill，在 Remotion 项目中编写和修改作品，再启动预览与渲染。',
      boundary: 'Skill 提供工作方法；仍需要 Remotion 项目、运行环境、素材和渲染。',
      output: '通过 Remotion 渲染视频或静态帧',
      prompt: '使用 Remotion 官方 Skills，制作一条 15 秒的项目介绍动画。先给出分镜和时间安排，再创建 composition；保留可替换的标题、截图与配色。先渲染 3 秒小样供我检查。',
      command: 'npx skills add remotion-dev/skills',
      sourceNote: '官方 README 列出 13 个技能入口，明确支持 Codex 等编码 Agent。'
    },
    {
      id: 'motion-canvas', number: '02', name: 'Motion Canvas', repo: 'motion-canvas/motion-canvas', ref: 'main', group: 'explain', kind: 'library', shape: '动画框架 + 编辑器', stack: 'TypeScript', officialSkill: false,
      tagline: '让流程与旁白同步展开',
      description: '通过 TypeScript 编排信息型矢量动画，配有实时预览编辑器，适合让复杂过程逐步呈现。',
      capabilities: ['矢量图解', '时序编排', '旁白同步'], usecase: '架构讲解、请求链路、教学流程与概念说明。',
      aiUsage: '让 AI 按分镜编写场景与动画时序，在编辑器里检查节奏，并按导出文档完成交付。',
      boundary: '它是制作框架；本轮未从 README 确认独立官方 Agent Skill。', output: '动画场景；按所选导出方案输出',
      prompt: '用 Motion Canvas 设计一段请求链路讲解：客户端 → API → 数据库 → 返回结果。每次只突出一个环节，为旁白预留时间；先制作可预览的最小场景。',
      sourceNote: '官方 README 将其定义为 TypeScript 库与实时预览编辑器。'
    },
    {
      id: 'motion', number: '03', name: 'Motion', repo: 'motiondivision/motion', ref: 'main', group: 'motion', kind: 'library', shape: '动画库 · 附官方 Skill', stack: 'JavaScript · React · Vue', officialSkill: true,
      tagline: '为网页交互建立运动语言',
      description: '提供弹簧、手势、布局过渡、滚动联动与时间轴动画。官方另有 Motion AI Kit，为 Agent 提供技能与文档工具。',
      capabilities: ['布局与转场', '手势与滚动', '弹簧动画'], usecase: '网站界面、产品演示、带交互的动画组件。',
      aiUsage: '通过官方 Motion AI Kit 获取 /motion Skill 和文档 MCP，让 Agent 按现有组件实现动画。',
      boundary: '主要面向网页运行。AI Kit 的部分增强功能属于 Motion+；视频输出需要额外流程。', output: '网页与组件动画',
      prompt: '使用 Motion 为现有页面添加动画：卡片依次进入，切换时保持布局连续，交互使用克制的弹簧反馈；尊重用户的减少动态效果偏好。',
      command: 'npx motion-ai', skillRepo: 'https://github.com/motiondivision/ai-kit',
      sourceNote: 'Motion README 与官方 AI Kit 均已核对；AI Kit 明确列出 Codex 支持。'
    },
    {
      id: 'ola', number: '04', name: 'Ola', repo: 'franciscop/ola', ref: null, group: 'motion', kind: 'library', shape: '数值插值库', stack: 'JavaScript', officialSkill: false,
      tagline: '让变化的数值平滑过渡', description: '在实时更新的数值之间进行插值，可同时处理坐标、数组或对象中的多个数值。',
      capabilities: ['实时插值', '多维数值', '平滑追踪'], usecase: '仪表盘数字、位置跟随与实时数据可视化。',
      aiUsage: '让 AI 将数据变化接入 Ola，再把插值后的值用于 DOM、画布或其他绘制代码。', boundary: '负责数值变化；画面绘制、音频与视频导出由其他工具承担。', output: '随时间变化的数值',
      prompt: '使用 Ola 为数据面板增加平滑数值过渡，连续更新目标值时保持运动自然，并把插值与绘制逻辑分开。', sourceNote: '已核对官方 README 的实例、设值与读取机制。'
    },
    {
      id: 'anime', number: '05', name: 'Anime.js', repo: 'juliangarnier/anime', ref: 'master', group: 'motion', kind: 'library', shape: '通用动画库', stack: 'JavaScript', officialSkill: false,
      tagline: '编排有节奏的二维运动', description: '为 CSS、SVG、DOM 属性与 JavaScript 对象制作动画；当前 README 使用 v4 模块接口演示错峰运动。',
      capabilities: ['错峰动画', 'SVG 与 DOM', '多属性编排'], usecase: '文字入场、品牌动效、几何图形与网页演示。',
      aiUsage: '让 AI 依据当前版本文档编写动画，明确对象、开始状态、结束状态、时长与错峰间隔。', boundary: '注意 v3 与 v4 的接口差异；视频编码需要另行处理。', output: '浏览器动画',
      prompt: '使用 Anime.js 当前版本，让一组几何图形从中心向两侧依次展开，控制错峰时间并提供播放与重播按钮。', sourceNote: '官方 README 已切换到 v4 用法，并链接 v3 迁移指南。'
    },
    {
      id: 'manim', number: '06', name: 'Manim', repo: 'ManimCommunity/manim', ref: 'main', group: 'explain', kind: 'library', shape: '数学动画引擎', stack: 'Python', officialSkill: false,
      tagline: '把公式与原理变成可见过程', description: '以程序精确控制数学讲解动画，适合几何变换、公式演进与概念解释。清单指向社区版 ManimCE。',
      capabilities: ['公式与几何', '精确变换', '程序化讲解'], usecase: '数学、算法原理与科学概念视频。',
      aiUsage: '让 AI 编写 Python Scene，先用低质量预览检查步骤和表达，再提高渲染质量。', boundary: '社区版与 3b1b 原版的安装和 API 不应混用；需要本地渲染依赖。', output: '渲染视频或静态帧',
      prompt: '用 Manim Community 制作一个正方形变成圆形的短场景，逐步显示变换过程和中文说明，先生成低质量预览。', sourceNote: '已核对社区版定位、Scene 示例与预览命令。'
    },
    {
      id: 'shifty', number: '07', name: 'Shifty', repo: 'jeremyckahn/shifty', ref: 'main', group: 'motion', kind: 'library', shape: '补间动画引擎', stack: 'TypeScript · JavaScript', officialSkill: false,
      tagline: '细致控制从 A 到 B 的变化', description: '提供轻量补间、缓动、播放控制与生命周期扩展，适合作为更高层动画工具的基础。',
      capabilities: ['缓动控制', '补间生命周期', '异步编排'], usecase: '自定义动画控制器、参数面板与连续动作。',
      aiUsage: '让 AI 编写起止数值和 render 回调，使用 Promise 串联动作。', boundary: '它主要计算补间；需要自行接入绘图或 DOM 更新。', output: '补间数值与回调',
      prompt: '使用 Shifty 将元素依次完成位移、回到原点和缩放，使用 async/await 编排，并提供中断与重新开始的控制。', sourceNote: '已核对官方 tween 示例与版本迁移说明。'
    },
    {
      id: 'two', number: '08', name: 'Two.js', repo: 'jonobr1/two.js', ref: 'dev', group: 'canvas', kind: 'library', shape: '二维绘图库', stack: 'JavaScript', officialSkill: false,
      tagline: '用统一接口绘制二维图形', description: '提供面向现代浏览器的二维绘图 API，同一套接口可使用 SVG、Canvas 2D 与 WebGL 渲染。',
      capabilities: ['二维图形', '多种渲染器', '形状动画'], usecase: '图形实验、动态插画与二维视觉演示。',
      aiUsage: '让 AI 创建形状、分组和更新逻辑，再选择适合输出需求的渲染器。', boundary: '它是绘图基础设施；时间编排、编辑交互和视频输出需额外实现。', output: 'SVG / Canvas / WebGL 画面',
      prompt: '使用 Two.js 绘制一组可缩放的几何图形，制作旋转与位置变化动画，并说明选择 SVG 或 Canvas 渲染器的理由。', sourceNote: '官方 README 确认渲染器无关的二维 API。'
    },
    {
      id: 'lottie', number: '09', name: 'Lottie Web', repo: 'airbnb/lottie-web', ref: 'master', group: 'canvas', kind: 'library', shape: '动画播放器', stack: 'JavaScript · Lottie JSON', officialSkill: false,
      tagline: '把设计好的矢量动画带入网页', description: '在网页播放由 Bodymovin 等流程导出的 Lottie JSON 动画，连接动画设计素材与产品界面。',
      capabilities: ['JSON 动画播放', '网页集成', '播放控制'], usecase: '加载状态、插画动效与产品内的反馈动画。',
      aiUsage: '让 AI 集成已有 Lottie 文件，处理加载、循环、播放控制及降级表现。', boundary: '播放器依赖合适的动画素材；并非完整动画创作软件，素材特性支持需核对。', output: '网页内动画播放',
      prompt: '将现有 Lottie JSON 集成到页面，加入开始、暂停和重播按钮，处理加载失败与减少动态效果的情况。', sourceNote: '已核对官方播放器与 Bodymovin 导出流程说明。'
    },
    {
      id: 'tweenjs', number: '10', name: 'TweenJS', repo: 'CreateJS/TweenJS', ref: 'master', group: 'motion', kind: 'library', shape: '补间与时间轴库', stack: 'JavaScript · CreateJS', officialSkill: false,
      tagline: '把多个动作按顺序串起来', description: '使用链式调用编排数值与 CSS 属性变化，提供 Timeline 来协调多个补间动画。',
      capabilities: ['链式动作', '时间轴', '属性补间'], usecase: 'CreateJS 项目、步骤式动作与二维交互演示。',
      aiUsage: '让 AI 用 to、wait 等步骤组织动作，并将多个对象的动画放入统一时间轴。', boundary: '视频输出和完整视觉编辑需要其他工具。', output: '属性动画与时间轴',
      prompt: '使用 TweenJS 制作三步动画：物体移动、等待、渐隐。统一控制多对象时间轴，并允许从头重播。', sourceNote: '已核对官方链式补间示例与 Timeline 说明。'
    },
    {
      id: 'lume', number: '11', name: 'LUME', repo: 'lume/lume', ref: 'main', group: 'three', kind: 'library', shape: '网页三维工具集', stack: 'HTML · Web Components', officialSkill: false,
      tagline: '像组织 HTML 一样组织三维场景', description: '利用 HTML 元素定义交互式二维或三维体验，支持 CSS3D 与 WebGL。',
      capabilities: ['声明式场景', 'HTML 元素', '二维与三维'], usecase: '网页三维展示、互动场景与产品视觉实验。',
      aiUsage: '让 AI 用 LUME 元素组织场景，在浏览器中调整相机、对象和交互。', boundary: '面向网页场景；复杂资产、视频交付和性能仍需单独验证。', output: '浏览器三维体验',
      prompt: '用 LUME 创建一个简单的三维产品展示场景，用 HTML 元素组织对象，并提供旋转和复位交互。', sourceNote: '已核对官方 HTML 元素、CSS3D 与 WebGL 定位。'
    },
    {
      id: 'gifenc', number: '12', name: 'gifenc', repo: 'mattdesl/gifenc', ref: 'main', group: 'finish', kind: 'library', shape: 'GIF 编码器', stack: 'JavaScript · Node.js', officialSkill: false,
      tagline: '把画面帧编码成 GIF', description: '轻量纯 JavaScript GIF 编码器，可量化颜色、映射调色板并按帧写入动图。',
      capabilities: ['逐帧编码', '颜色量化', 'GIF 输出'], usecase: '文档动图、简单矢量动画与短循环演示。',
      aiUsage: '让 AI 从既有渲染流程获取画面帧，再进行调色板处理与 GIF 编码。', boundary: '不负责创作画面。README 提示目前没有抖色支持，更适合简单平面图形。', output: 'GIF 动图',
      prompt: '将已有 Canvas 动画的一小段画面编码成循环 GIF，明确尺寸、帧率与调色板方案，检查清晰度和文件体积。', sourceNote: '已核对官方编码流程及无抖色支持的限制。'
    },
    {
      id: 'konva', number: '13', name: 'Konva', repo: 'konvajs/konva', ref: 'master', group: 'canvas', kind: 'library', shape: '交互画布框架', stack: 'JavaScript · Canvas 2D', officialSkill: false,
      tagline: '让画布上的对象可选、可拖、可编辑', description: '以场景图组织二维图形，为对象提供事件、拖拽、变换、动画、缓存和导出控制。',
      capabilities: ['对象级交互', '拖拽与变换', '编辑器基础'], usecase: '白板、标注、图解编辑器与设计工具。',
      aiUsage: '让 AI 构建 Stage、Layer 与图形对象，连接选择、拖拽和属性编辑行为。', boundary: '提供编辑器基础能力；完整产品的状态管理、撤销和导出需求仍需开发。', output: '交互式二维画布',
      prompt: '使用 Konva 做一个最小图形编辑器，支持添加矩形、选择、拖拽与缩放，并提供清晰的选中反馈。', sourceNote: '已核对官方场景图、交互能力与使用示例。'
    },
    {
      id: 'blender', number: '14', name: 'Blender', repo: 'blender/blender', ref: 'main', group: 'three', kind: 'software', shape: '三维制作软件', stack: '桌面应用', officialSkill: false,
      tagline: '覆盖从建模到渲染的三维制作', description: '完整的三维创作套件，覆盖建模、绑定、动画、模拟、渲染、合成、跟踪和视频编辑。',
      capabilities: ['建模与绑定', '角色动画', '渲染与合成'], usecase: '角色表演、三维产品片、场景与视觉特效。',
      aiUsage: '先把需求拆成模型、材质、灯光、相机和动作，再选择脚本或已验证的控制接口辅助操作。', boundary: '完整桌面软件；官方仓库链接本身不赋予 Agent 控制应用的能力。', output: '三维资产、渲染图像与动画',
      prompt: '先为一个 5 秒三维产品转台动画列出场景、灯光、相机和动作方案，再说明当前环境中可用的 Blender 执行方式。', sourceNote: '已核对官方 GitHub 镜像 README 的三维管线与许可说明。'
    },
    {
      id: 'three', number: '15', name: 'Three.js', repo: 'mrdoob/three.js', ref: 'dev', group: 'three', kind: 'library', shape: '网页三维库', stack: 'JavaScript · WebGL / WebGPU', officialSkill: false,
      tagline: '用代码搭建三维世界', description: '通用浏览器三维库，提供场景、相机、几何体与渲染器等构建能力。',
      capabilities: ['场景与相机', '三维渲染', '物体动画'], usecase: '产品三维展示、空间叙事与互动可视化。',
      aiUsage: '让 AI 建立最小场景与动画循环，再逐步加入资产、灯光和交互。', boundary: '模型资产、性能优化与视频编码需要额外工作。', output: 'WebGL / WebGPU 三维画面',
      prompt: '用 Three.js 创建一个可旋转的三维几何展示，提供相机控制、响应式尺寸和资源释放逻辑，先使用基础几何体。', sourceNote: '已核对官方场景、相机、几何体与动画循环示例。'
    },
    {
      id: 'godot', number: '16', name: 'Godot', repo: 'godotengine/godot', ref: 'master', group: 'three', kind: 'software', shape: '游戏引擎', stack: '桌面编辑器 · 2D / 3D', officialSkill: false,
      tagline: '让场景具备完整交互逻辑', description: '统一的二维与三维游戏制作引擎，包含场景编辑与跨平台导出工具。',
      capabilities: ['二维与三维', '交互场景', '跨平台导出'], usecase: '游戏、交互叙事与可操作的场景演示。',
      aiUsage: '让 AI 辅助组织场景和逻辑代码，再在编辑器中运行并验证交互。', boundary: '游戏导出与影片导出是不同交付目标；需要明确最终作品形式。', output: '可运行的交互应用或游戏',
      prompt: '先设计一个最小 Godot 交互场景，明确节点结构、玩家操作和反馈，再制作一个可以运行与复位的原型。', sourceNote: '已核对官方二维 / 三维游戏引擎定位和导出说明。'
    },
    {
      id: 'babylon', number: '17', name: 'Babylon.js', repo: 'BabylonJS/Babylon.js', ref: 'master', group: 'three', kind: 'library', shape: '网页三维引擎', stack: 'JavaScript · TypeScript', officialSkill: false,
      tagline: '构建可运行的网页三维场景', description: '提供 Engine、Scene、相机、灯光与网格等 API，配有在线 Playground 和示例。',
      capabilities: ['三维场景', '相机与灯光', '实时渲染'], usecase: '三维交互体验、网页展示与场景原型。',
      aiUsage: '让 AI 先实现基础场景，再利用 Playground 和官方示例核对 API。', boundary: '生产环境的依赖交付与性能需要规划；官方实验 CDN 不适合作为生产依赖源。', output: '浏览器三维应用',
      prompt: '用 Babylon.js 搭建相机、灯光、球体与地面的最小场景，加入鼠标相机控制，并说明正式发布时如何交付依赖。', sourceNote: '已核对官方引擎场景示例与 CDN 使用范围说明。'
    },
    {
      id: 'proton', number: '18', name: 'Proton', repo: 'drawcall/Proton', ref: 'master', group: 'finish', kind: 'library', shape: '粒子动画库', stack: 'JavaScript', officialSkill: false,
      tagline: '为画面增加粒子与运动特效', description: '通过发射器、初始化器和行为组合粒子效果，可表现火焰、烟花、爆炸与物理运动。',
      capabilities: ['粒子发射', '物理行为', '多种渲染器'], usecase: '氛围特效、庆祝反馈与背景粒子。',
      aiUsage: '让 AI 定义发射频率、生命周期、速度、颜色与透明度，再接入合适的渲染器。', boundary: '为画面提供特效；它不负责完整影片编排。npm 包名已改为 proton-engine。', output: '实时粒子画面',
      prompt: '使用 proton-engine 制作一个克制的庆祝粒子效果，控制粒子数量与生命周期，支持停止并释放资源。', sourceNote: '已核对官方发射器、行为与包名变更说明。'
    }
  ],
  routes: [
    { id: 'intro', label: '项目介绍短片', icon: 'film', title: '先做出一条能交付的短片', tools: ['Remotion Skills'], text: '先定义 15 秒分镜、素材和目标尺寸，再预览与渲染。图解复杂时加入 Motion Canvas。', prompt: '请先为这个项目写一份 15 秒视频分镜，明确每段画面、文字、音频和时长。使用 Remotion 官方 Skills，先渲染一个 3 秒小样，确认后再完成全片。' },
    { id: 'explain', label: '技术原理讲解', icon: 'nodes', title: '让观众看见过程', tools: ['Motion Canvas', 'Manim'], text: '流程与节点用 Motion Canvas，公式与几何用 Manim；需要完整片头字幕时再汇入视频编排。', prompt: '先把这个原理拆成 4 个可视化步骤。流程图使用 Motion Canvas，公式演进使用 Manim；先选择其中一个最合适的工具，制作最小场景并核对表达。' },
    { id: 'web', label: '网页与交互动画', icon: 'wave', title: '让操作与反馈连起来', tools: ['Motion', 'Anime.js', 'Konva'], text: '界面过渡选 Motion，二维时序可选 Anime.js，拖拽编辑画布选 Konva。按需求选择即可。', prompt: '先检查现有页面结构。界面过渡优先评估 Motion，图形编辑需求评估 Konva；明确动画触发、时长、结束状态与减少动态效果的处理，再实施一种方案。' },
    { id: 'three', label: '三维与角色作品', icon: 'cube', title: '先确定场景，再选择引擎', tools: ['Blender', 'Three.js', 'Godot'], text: '渲染角色与产品片可选 Blender；网页三维可选 Three.js、Babylon.js 或 LUME；游戏场景可选 Godot。', prompt: '先确认交付物是视频、网页还是游戏，再选择三维工具。列出模型、材质、相机、动作和渲染需求；先做基础几何体的小样，验证当前环境可执行。' }
  ]
};

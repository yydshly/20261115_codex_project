/* Local evidence relationships, not new reconstruction results. */
'use strict';
window.RESEARCH_ATLAS = {
  experiments: {
    vggt:{group:'canal-single-vggt',scene:null,videos:[],previews:['vggt-guided.glb','depth-surface.glb'],none:'未训练高斯；可查看 Blender / 深度表面的关联 GLB。'},
    sharp:{group:'canal-single-sharp',scene:'sharp',videos:[0],none:''},
    diagnosis:{group:'canal-sharp-view-diagnosis',scene:'diagnosis',videos:[],none:'诊断复用第 02 次的 SHARP 场景，没有独立的新模型或 MP4。',source:'sharp'},
    hybrid:{group:'cafe-hybrid-prototype',scene:'hybrid',videos:[1,2,3],none:''},
    cg:{group:'canal-world-local',scene:'world',videos:[5],none:''},
    bound:{group:'cafe-source-bound',scene:'bound',videos:[4],none:''},
    'left-right':{group:'canal-imagegen-multiview',scene:null,videos:[],none:'只生成与筛查图片，没有重建三维、训练高斯或生成 Blender 工程。'},
    interior:{group:'canal-imagegen-interior',scene:null,videos:[],none:'这是室内／光照图片候选，没有可进入的三维或物理换光工程。'},
    consistency:{group:'canal-vggt-consistency',scene:'consistency',videos:[],none:'三维入口显示预测相机与诊断点，不是训练完成的高斯。'},
    bridge:{group:'canal-entry-bridge-test',scene:null,videos:[],none:'本次保留补图、冲突图与报告；未训练高斯，没有独立的漫游场景。'}
  },
  posterRects:[
    [110,3354.92,1673,305.52],[1817,3354.92,1673,305.52],
    [110,3694.44,1673,305.52],[1817,3694.44,1673,305.52],
    [110,4033.96,1673,305.52],[1817,4033.96,1673,305.52],
    [110,4373.48,1673,305.52],[1817,4373.48,1673,305.52],
    [110,4713,1673,354.48],[1817,4713,1673,403.44]
  ],
  routes:{
    target:{label:'目标融合路线',note:'目标设计，整条链路未通过。先约束与检验共同空间，再让高斯外观和实体结构协作；最难的是未知空间补全，其次是完整外观绑定与物理换光。',nodes:['input','geometry','completion','validate','gaussian','mesh','binding','lighting','delivery'],select:'completion'},
    quick:{label:'已实测：单图高斯',note:'实际跑过的独立支线：原运河图 → Apple SHARP → PLY 高斯 → Spark / Three.js。未使用 VGGT、COLMAP 或旧 Blender；只在原机位附近较可靠。',nodes:['input','sharp','quickgs','viewer'],select:'sharp'},
    photo:{label:'重叠实拍对照',note:'这张 AI 原图没有可补拍的真实地点。若有重叠实拍，可用 COLMAP 或 VGGT 估计几何，核验后拟合高斯／制作网格；未见处仍需补采或设计。COLMAP 未在本运河实验运行。',nodes:['input','geometry','validate','gaussian','mesh','binding','lighting','delivery'],select:'geometry'},
    all:{label:'全部关系',note:'局部已跑通，不代表各模块已经端到端连通。实线为曾实际传递的数据或动作；虚线为目标设计／未验证连接。失败后的补图没有进入高斯训练。',nodes:[],select:'validate'}
  },
  nodes:[
    {id:'input',x:25,y:90,title:'01 / 图像入口',sub:'唯一 AI 运河概念图',state:'tested',tag:'已有输入',kind:'输入 / 证据',input:'1672 × 941 的 AI 概念图；不是现场摄影，也没有隐藏室内、背面、尺寸和深度真值。',output:'外观参考、可见轮廓、语义布局意图与原始文件哈希。',libs:['原始参考 PNG','Pillow / NumPy'],capability:'固定来源，区分原图信息与后续设计。实拍路线则需要不同位置、足够重叠的多张照片。',limit:'一张图片无法唯一确定完整三维、隐藏物体和材质照明。未知区域是设计或生成，不是恢复唯一事实。',experiments:['vggt','sharp'],record:'README.md'},
    {id:'geometry',x:300,y:90,title:'02 / 相机与可见几何',sub:'VGGT · COLMAP（调研）',state:'tested',tag:'VGGT 已实测',kind:'学习模型 / 几何算法',input:'原图或有重叠的多图。相机、尺度与坐标约定需要记录。',output:'预测相机内外参、深度／点；COLMAP 路线可提供 SfM 稀疏结构和可选 MVS。',libs:['VGGT-1B / PyTorch · 已实测','COLMAP / DUSt3R / VGGT-Omega · 仅调研'],capability:'估计可见空间关系，为对齐、投影、诊断和后续重建提供几何线索。VGGT 本身是训练过的 AI 模型。',limit:'相机和深度是估计，不会自动生成完整房间或可编辑物体。单图尺度不定；几何输出也要独立核查。',experiments:['vggt','consistency'],record:'vggt-colmap-3dgs.md'},
    {id:'completion',x:575,y:90,title:'03 / 未知空间补全',sub:'共享空间与相机约束',state:'gap',tag:'主要瓶颈 · 未通过',kind:'生成模型 + 约束流程',input:'原图、已有相机／深度线索、锁定的布局与目标机位；保持物体身份和遮挡。',output:'应是可被同一几何解释的新视图／新增表面，而非若干外观相似的图片。',libs:['内置 image_gen · 已补图但未连通','ViewCrafter / GEN3C / WonderWorld · 仅调研','Atlas / JST-2 / PINOC · 仅调研'],capability:'补充背面、侧面、门口、室内等未见区域。也可先明确设计布局，再约束外观生成，代价是人工制作。',limit:'现有通用图像入口没有硬相机或持续共享三维状态。左右、门口、室内、回望尚未连成完整空间；其他模型尚未实测本图。',experiments:['left-right','interior','bridge'],record:'experiments/canal-entry-bridge-test/README.md'},
    {id:'validate',x:850,y:90,title:'04 / 共同空间检查',sub:'独立对应 · 固定投影',state:'tested',tag:'诊断已跑 · 场景未过',kind:'诊断 / 验收流程',input:'多图、固定的预测相机与深度、独立匹配点、联合／子集对照及人工误配核对。',output:'对应标注、相机图、冲突候选、覆盖统计与可复核报告；不通过则回补全阶段。',libs:['OpenCV SIFT / RANSAC','VGGT / NumPy / SciPy','Pillow · 图上诊断'],capability:'识别“相似图片”与“能被同一空间解释”之间的差距。冻结场景后，还要留出视角、检查回环和连续遮挡。',limit:'稀疏匹配、反射、误配和预测不稳定会影响统计。当前 A/B 补图入口未过，未开始这批图的高斯训练。',experiments:['diagnosis','consistency','bridge'],record:'experiments/canal-entry-bridge-test/README.md'},
    {id:'gaussian',x:575,y:350,title:'05A / 高斯外观',sub:'空间位置 + 颜色 / 透明度',state:'read',tag:'多图训练待验证',kind:'三维表示 / 拟合',input:'充分一致的多视图和相机；或独立由单图模型直接预测的局部结果。',output:'可渲染的三维高斯：位置、尺度、旋转、不透明度和颜色等。通常保存为高斯 PLY。',libs:['3DGS · 表示','LichtFeld Studio · 仅调研','SHARP 单图输出见下方支线'],capability:'在有观测支持的角度保留细节与照片观感。高斯不是天然只能看一个方向。',limit:'普通高斯不等于分件网格；照片色彩常含烘焙光照。我们没有用未通过的补图训练完整多视图高斯。',experiments:['sharp','cg','bound'],record:'experiments/canal-single-sharp/README.md'},
    {id:'mesh',x:850,y:350,title:'05B / 实体结构',sub:'网格 · 分件 · 门轴 / 内部',state:'tested',tag:'设计结构已实测',kind:'三维资产 / 创作工具',input:'已检查的几何线索、设计布局与物体分件规则。也可研究表面提取，但仍要修复拓扑与缺面。',output:'有厚度的墙、门、柜台、房间；物体层级、材质、相机、灯和 .blend / GLB。',libs:['Blender 4.5.9 / bpy / Cycles','SuGaR / Frosting · 仅调研'],capability:'提供选择、修改、碰撞／遮挡和动作的结构基础。已设计小咖啡店和完整场景对照。',limit:'设计内部并不是从原图恢复的隐藏真值。高斯转网格不会自动完成物体分件、背面、材质与高质量拓扑。',experiments:['vggt','hybrid','cg'],record:'experiments/cafe-hybrid-prototype/README.md'},
    {id:'binding',x:575,y:590,title:'06 / 对齐与物体绑定',sub:'同坐标 · 表面对应 · 身份',state:'tested',tag:'局部门轴已验证',kind:'数据关联 / 变换与编辑',input:'高斯外观、网格结构、统一坐标、部件所属关系与表面对应。',output:'物体变换时，所属高斯同步变换；保留可复核的绑定关系与动作。',libs:['bpy 求值矩阵 / NumPy / plyfile','Spark / Three.js','SuGaR / Frosting · 后续候选'],capability:'已验证 Blender 门矩阵驱动门高斯。局部表面绑定更接近原机位外观，可复用动作传递。',limit:'矩阵正确不代表各个物体对应正确。近景拉伸、接缝、背面缺失和室内侵入仍需解决。',experiments:['hybrid','bound'],record:'experiments/cafe-source-bound/README.md'},
    {id:'lighting',x:850,y:590,title:'07 / 材质、动作与换光',sub:'同一几何下独立验收',state:'gap',tag:'物理换光未通过',kind:'渲染 / 资产控制',input:'稳定结构、可编辑对象、材质／照明分解或可重照明表示。',output:'门和物体可操作；换灯后阴影、反射与外观随之合理变化。',libs:['Blender 材质 / 灯光 / Cycles · 实测','专门可重照明方法 · 待验证'],capability:'实体结构的开门和暖／日光演示已运行；普通高斯的原有灯光不会因此自动改变。',limit:'亮暗图片切换、两份 PLY 缓存切换，不是物理换光。完整高斯外观的材质照明分离仍未完成。',experiments:['hybrid','cg','interior'],record:'experiments/cafe-hybrid-prototype/README.md'},
    {id:'delivery',x:850,y:850,title:'08 / 可复用三维成品',sub:'自由查看 · 编辑 · 重开复核',state:'read',tag:'最终目标 · 尚未达到',kind:'交付 / 最终验收',input:'通过空间、外观、绑定、动作和换光检查的同一份资产；来源与尺度假设齐全。',output:'完整 .blend、几何／材质／绑定、可拖动网页、连续影片和独立检查记录。',libs:['GLB / GLTFLoader / OrbitControls','Spark / Three.js / FFmpeg'],capability:'可在同一空间反复摆机位、制作影片、检查对象和复用资产。现有网页可查看实验产物。',limit:'6 段视频和多份工程的存在，不代表目标场景已达到最终质量。完整入口、回望、近景外观与换光仍未过关。',experiments:['hybrid','cg','bound','bridge'],record:'MEDIA-INTEGRATION.md'},
    {id:'sharp',x:25,y:590,title:'A / 单图直接预测',sub:'Apple SHARP',state:'tested',tag:'独立路线已跑通',kind:'训练过的前馈模型',input:'唯一运河原图；采用官方焦距回退值。无需先输入 VGGT 或旧 Blender 结果。',output:'1,179,648 个高斯，约 66 MB 的新 PLY；CPU FP32 推理 113.60 秒。',libs:['Apple SHARP / PyTorch','Pillow / plyfile'],capability:'直接从图像预测局部三维高斯，保留原机位的纹理、颜色与光影，存在小范围视差。',limit:'这是学习先验，不是测得的完整世界。大幅侧移、靠近和看背面后露出缺陷。',experiments:['sharp'],record:'experiments/canal-single-sharp/README.md'},
    {id:'quickgs',x:25,y:850,title:'B / 单图高斯结果',sub:'独立的 PLY 三维数据',state:'tested',tag:'原机位附近较可靠',kind:'三维表示 / 实际产物',input:'SHARP 的单图预测输出。',output:'原视角、左右／前移和较大侧移对照；覆盖和深度风险图。',libs:['3DGS / plyfile','Spark 渲染 / CPU 深度代理'],capability:'实际保留照片感，并能改变观察位置；可以作为局部外观和诊断的起点。',limit:'不能把一个漂亮原机位当成完整可漫游场景。风险掩码比例也不是模型错误率。',experiments:['sharp','diagnosis'],record:'experiments/canal-single-sharp/view-diagnosis/README.md'},
    {id:'viewer',x:300,y:850,title:'C / 渲染与小范围查看',sub:'Spark + Three.js',state:'tested',tag:'5 机位 / 60 帧',kind:'渲染引擎 / 展示',input:'原高斯 PLY 与相机；不重新生成图片来冒充相机移动。',output:'真实浏览器三维、3 秒运动视频和原始渲染图。',libs:['Spark 2.4.0 / Three.js 0.187.0','FFmpeg'],capability:'让使用者直接拖动并观察视差与缺陷，保留同一份场景数据。',limit:'渲染器不会补出正确房间、背面或物理材质；可拖动也不等于场景质量已达标。',experiments:['sharp','diagnosis'],record:'experiments/canal-single-sharp/README.md'}
  ],
  edges:[
    ['input','geometry','target','原图 / 多图'],['geometry','completion','target','几何线索'],['completion','validate','target','受约束候选'],
    ['geometry','validate','photo','重叠实拍'],['validate','gaussian','target','通过后'],['validate','mesh','target','通过后'],
    ['gaussian','binding','target','外观'],['mesh','binding','target','结构'],['binding','lighting','target','物体关系'],['lighting','delivery','target','分别验收'],
    ['input','sharp','quick','原图'],['sharp','quickgs','quick','预测 PLY'],['quickgs','viewer','quick','真实渲染']
  ]
};

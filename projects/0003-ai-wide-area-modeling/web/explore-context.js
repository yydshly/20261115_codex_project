/* Research snapshot: reuse the original experiments/products, never imply new trials. */
'use strict';
window.RESEARCH_CONTEXT={
  failures:[
    {id:'fit',title:'01 / 深度辅助拟合未改善',status:'实测未改善',nodes:['geometry','mesh'],experiments:['vggt'],evidence:'旧版锚点 RMS 36.92px，本轮 54.46px；17.80px 是后续拟合诊断，没有对应的新改善渲染。',retained:'相机解析、Blender 投影和深度表面导出已跑通。',cause:'证据指向拟合目标、参数边界和相机不确定性等混杂因素；不能单独归因于 VGGT 或单图。',next:'固定相机与评价口径，隔离参数和目标函数；以新的实际渲染验收。'},
    {id:'coverage',title:'02 / 单图高斯的空间不足',status:'局部可用，完整场景未过',nodes:['sharp','quickgs','viewer','gaussian'],experiments:['sharp','diagnosis'],evidence:'原机位附近照片感和视差成立；大幅侧移、靠近、背面出现缺陷。固定新视角未覆盖 4.75%、风险 12.61%，均不是错误率。',retained:'1,179,648 个高斯、5 个实际机位和 60 个渲染帧；原始结果可复查。',cause:'单图未见面与深度不充分是关键限制；风险图还包含真实边缘、反光和天空，不能全当错误。',next:'验证额外空间依据；在同一冻结场景下检查连续移动和留出视角。'},
    {id:'binding',title:'03 / 门能动，整体外观仍失败',status:'动作通过，外观未过',nodes:['mesh','binding','delivery'],experiments:['hybrid','bound'],evidence:'门高斯正确跟随 Blender 求值矩阵；近景仍拉伸、错位、接缝和缺面，原高斯曾侵入室内。',retained:'门轴联动、28 秒连续镜头、原高斯局部保留、结构与 GLB 导出。',cause:'变换正确不能代替准确的物体所属、表面对应与未见面。30.10dB 只比较原高斯原机位，不是隐藏真值。',next:'先稳定空间和表面，再验证部件绑定、露出面支撑及多角度外观。'},
    {id:'cg',title:'04 / 完整实体对照偏离外观目标',status:'功能对照，目标未达',nodes:['mesh','gaussian','delivery'],experiments:['cg'],evidence:'设计完整 Blender 街区并融合 RGB-D 高斯，可连续移动；外观明显成为 CG，不能当原图隐藏世界复原。',retained:'完整布局、室内结构、36 秒镜头，以及暖／日光缓存对照。',cause:'确定性融合的输入来自自己设计的实体渲染，照片外观并不会自动回来；高斯留出画质也不理想。',next:'保留为控制与结构素材；把原图外观忠实度作为独立验收条件。'},
    {id:'views',title:'05 / 补图相似，未证实共用三维',status:'图片完成，空间未验证',nodes:['completion','validate'],experiments:['left-right','interior'],evidence:'左右、门口、室内、回望候选已生成；文字机位不等于标定相机，门窗、植物和石材被重画。',retained:'实际候选、提示词、门槛失败初稿、二维对应与照明控制图。',cause:'现有通用图像接口没有硬相机、深度或持续共享三维状态。极线拟合和局部匹配不能证明完整刚体空间。',next:'锁定布局与显式相机，检验物体身份、遮挡、深度和回环，不继续靠漂亮图片判断。'},
    {id:'entry',title:'06 / 多图与 A/B 入口复检未过',status:'检查未通过，未训练高斯',nodes:['completion','validate','delivery'],experiments:['consistency','bridge'],evidence:'A—门口 53 对、联合中位 60.6px；B—门槛 87 对、29.5px。局部子集有支持，但完整入口／回望未连通。',retained:'7／9 图联合、子集和照明控制；预测相机、3,960 个诊断点、投影冲突与人工误配复核。',cause:'重叠不足、生成几何变化、自动误配和预测不稳定共同影响结果；不能把所有偏差都归罪于补图。',next:'先过共同空间门槛，再训练高斯。本研究局部门槛中位 ≤5px、P90 ≤15px，不是行业标准。'},
    {id:'light',title:'07 / 原高斯独立换光仍未验证',status:'能力缺口，非新算法失败',nodes:['lighting','binding','gaussian'],experiments:['hybrid','cg','interior'],evidence:'实体可以换灯；亮暗候选图与两份 PLY 切换都不是普通高斯的物理重照明。',retained:'Blender 实体暖／日光演示、照明缓存、同构图开关灯候选。',cause:'普通高斯颜色包含原图光照、反射和阴影。当前没有完成材质与照明分解，也未实测专门可重照明方法。',next:'同一几何／材质下独立改变灯光，复核阴影、反射与物体外观。'}
  ],
  technologies:[
    {id:'geometry',title:'几何预测与数值拟合',nodes:['geometry','validate'],experiments:['vggt','consistency','bridge'],tools:['VGGT-1B','PyTorch / BF16 与 FP32','NumPy / SciPy'],ability:'预测相机、深度与点；联合／子集对照、参数拟合、坐标和投影处理。',boundary:'预测不是实测真值；单图尺度和相机不确定性需要独立检查。'},
    {id:'matching',title:'独立对应与空间诊断',nodes:['validate','completion','quickgs'],experiments:['diagnosis','left-right','consistency','bridge'],tools:['OpenCV SIFT / RANSAC','F 矩阵 / Sampson 残差','固定投影 / 覆盖统计','Pillow 标注与掩码'],ability:'寻找跨图对应、标记冲突、检查覆盖、联合稳定性与人工误配。',boundary:'二维匹配、极线误差和模型置信度都不能独立证明三维正确。'},
    {id:'appearance',title:'高斯预测、分组与渲染',nodes:['sharp','quickgs','gaussian','viewer'],experiments:['sharp','diagnosis','hybrid','bound','cg'],tools:['Apple SHARP / PyTorch','3DGS / PLY / plyfile','Spark 2.4.0','Three.js 0.187.0'],ability:'从原图直接预测高斯，保存颜色和外观；分组、真实渲染、多机位与连续帧。',boundary:'本批补图没有进入 3DGS 训练；原高斯不是可选的分件网格，也没有独立换光。'},
    {id:'structure',title:'实体、绑定与灯光控制',nodes:['mesh','binding','lighting'],experiments:['vggt','hybrid','bound','cg'],tools:['Blender 4.5.9 / Python bpy','Cycles / 网格与材质','门轴 / 求值矩阵 / 对象分组','NumPy / plyfile'],ability:'参数化结构、设计室内、门动作、实体换灯和高斯随物体矩阵变换。',boundary:'用了 bpy，不等于验证了通用 MCP 连接；门联动成功也不代表原高斯整体可编辑。'},
    {id:'generation',title:'补图与图像检查',nodes:['input','completion','lighting'],experiments:['left-right','interior','bridge'],tools:['内置 image_gen','多参考图 / 文字机位约束','Pillow / OpenCV 图像检查'],ability:'生成左右、入口、室内、开关灯与回望候选，保存失败初稿和提示词。',boundary:'工具没有暴露精确后端型号；本图没有通过 ChatArt 调用 GPT Image、NanoBanana 或 Seedream。'},
    {id:'delivery',title:'网页、视频与工程交付',nodes:['viewer','delivery'],experiments:['sharp','hybrid','bound','cg','consistency'],tools:['Three.js / GLTFLoader / OrbitControls','GLB / .blend / PLY','FFmpeg / MP4 / GIF','Python 只读服务 / 哈希校验'],ability:'可拖动浏览器三维、对象结构预览、实际帧编码、原文件与诊断统一入口。',boundary:'GLB 是结构预览；可查看、可下载和文件完整，不代表最终三维质量通过。'}
  ],
  productNodes:{
    'COLMAP':['geometry','validate'],'VGGT-1B':['geometry','validate'],'VGGT-Omega':['geometry'],'DUSt3R':['geometry','completion'],
    'Metashape':['input','geometry'],'ai-wide-area-modeling':['input','mesh'],'3DGS_pipeline_guide':['input','gaussian'],
    'Extract_sharpest_frame':['input'],'360 MCConverter / 旧版转换器':['input','geometry'],
    '3D Gaussian Splatting':['gaussian','quickgs'],'Apple SHARP':['sharp'],'LichtFeld Studio':['gaussian'],
    '内置 image_gen':['completion'],'ChatArt / GPT Image / NanoBanana / Seedream':['completion'],
    'ViewCrafter':['completion'],'GEN3C':['completion'],'WonderWorld':['completion'],
    'Atlas · World Labs':['completion','delivery'],'JST-2 · Viggle':['completion','delivery'],'PINOC':['completion','delivery'],
    'Viggle / JST-2 API':['completion','delivery'],'Marble · World Labs':['completion','delivery'],
    'SuGaR':['mesh','binding'],'Gaussian Frosting':['mesh','binding'],'Blender':['mesh','binding','lighting'],
    'Agent＋MCP for Blender':['mesh'],'Spark':['viewer'],'Three.js':['viewer','delivery'],'Unreal Engine / Arrival 展示':['delivery']
  }
};

/* Pure SVG board builder shared by the page and the local export script. */
window.RESEARCH_CONTEXT.hasCode=function(p,D){if(p.name==='Unreal Engine / Arrival 展示')return false;return ['COLMAP','Blender','Spark','Three.js','3D Gaussian Splatting'].includes(p.name)||p.sources.some(id=>D.sources.find(s=>s[0]===id)?.[2].includes('github.com/'));};
window.RESEARCH_CONTEXT.isProduct=function(p){return ['世界模型与产品'].includes(p.category)||['Metashape','内置 image_gen','ChatArt / GPT Image / NanoBanana / Seedream','360 MCConverter / 旧版转换器','Unreal Engine / Arrival 展示'].includes(p.name);};
window.RESEARCH_CONTEXT.build=function(D,mode='overview',filter='all'){
  const C=window.RESEARCH_CONTEXT,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const out=[],sections={};let y=mode==='overview'?1100:30;
  const text=(x,y,s,size=18,color='#203a35',weight=400)=>`<text x="${x}" y="${y}" fill="${color}" font-family="system-ui,Microsoft YaHei,sans-serif" font-size="${size}" font-weight="${weight}">${esc(s)}</text>`;
  function lines(s,width,size=18,max=3){const rows=[];let line='',used=0;const tokens=s.match(/[A-Za-z0-9_.+-]+|\s+|[^\s]/gu)||[];for(const token of tokens){const w=[...token].reduce((n,ch)=>n+(/[\x00-\xff]/.test(ch)?size*.56:size),0),closing=/^[，。；：、！？）》】」』,.!?;:%·]$/.test(token);if(used+w>width-size*.4&&line&&!closing){rows.push(line.trimEnd());line='';used=0;}if(!line&&!token.trim())continue;line+=token;used+=w;}if(line)rows.push(line.trimEnd());if(rows.length>max){rows.length=max;rows[max-1]=rows[max-1].slice(0,-1)+'…';}return rows;}
  const block=(x,y,s,width,size=18,max=3,color='#52695b')=>lines(s,width,size,max).map((line,i)=>text(x,y+i*(size+7),line,size,color)).join('');
  function heading(key,title,note){sections[key]=y;out.push(text(25,y+27,title,28,'#203a35',600),block(25,y+62,note,1060,18,2));y+=115;}
  function cards(items,cols,height,render){const gap=22,w=(1070-gap*(cols-1))/cols;items.forEach((item,i)=>{const x=25+(i%cols)*(w+gap),top=y+Math.floor(i/cols)*(height+gap);out.push(render(item,x,top,w,height));});y+=Math.ceil(items.length/cols)*(height+gap)+35;}
  const card=(x,y,w,h,key,id,body,tone='neutral')=>{const label=key==='failure'?C.failures.find(f=>f.id===id).title:key==='technology'?C.technologies.find(t=>t.id===id).title:id;return `<g class="graph-context-card ${tone}" data-${key}="${esc(id)}" role="button" tabindex="0" aria-label="查看${esc(label)}的完整说明"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${tone==='failure'?'#f3e8df':'#fffef9'}" stroke="#c6d1c2" stroke-width="1.5"/>${body}</g>`;};
  if(['overview','failures'].includes(mode)){
    heading('failures','研究复盘 / 未通过、未改善与尚未验证','按证据区分功能通过、效果未过和能力未测试；失败不等于整个目标不可能。点击卡片看原因候选、保留能力和验收条件。');
    cards(C.failures,2,244,(f,x,t,w,h)=>card(x,t,w,h,'failure',f.id,text(x+18,t+30,f.status,16,'#9a5338')+block(x+18,t+65,f.title,w-36,23,2,'#203a35')+block(x+18,t+108,f.evidence,w-36,18,4)+text(x+18,t+225,'证据：实验 '+f.experiments.map(id=>D.experiments.find(e=>e.id===id).title.slice(0,2)).join(' / ')+' · 点击详情',16),'failure'));
  }
  if(['overview','used'].includes(mode)){
    heading('used','实际用过 / 技术栈与方法','以下在本运河研究中实际使用。方法、软件、数据格式分别理解；部署网页和参数绑定不等于已经解决完整世界。');
    cards(C.technologies,2,224,(t,x,top,w,h)=>card(x,top,w,h,'technology',t.id,text(x+18,top+33,t.title,23,'#203a35',600)+block(x+18,top+70,t.tools.join(' · '),w-36,18,3)+block(x+18,top+151,t.ability,w-36,18,2)+text(x+18,top+207,'已实测局部能力 · 点击查看具体实验与边界',15)));
  }
  if(['overview','catalog'].includes(mode)){
    const products=D.products.filter(p=>filter==='all'||(filter==='tested'&&p.status==='tested')||(filter==='read'&&p.status==='read')||(filter==='code'&&C.hasCode(p,D))||(filter==='product'&&C.isProduct(p)));
    heading('catalog',`探索目录 / 显示 ${products.length} / ${D.products.length} 项`,'沿用 2026-11-16 的来源记录；已实测、仅调研、仅提及分别标记。公开代码入口不自动代表权重许可、可商用或免费。');
    cards(products,3,244,(p,x,t,w,h)=>{const status={tested:'本图已实测',read:'仅调研 · 本图未运行',mentioned:'仅提及 / 接口待核对'}[p.status];const code=C.hasCode(p,D);const type=p.name==='360 MCConverter / 旧版转换器'?'商业工具 + 旧版公开代码':p.name==='3D Gaussian Splatting'?'三维表示 / 方法与参考实现':code?'公开代码 / 库入口':p.status==='mentioned'?'入口与模型候选':p.category==='世界模型与产品'?'模型 / 产品 / 服务':'软件 / 工具 / 模型';return card(x,t,w,h,'product',p.name,text(x+15,t+27,status,15,p.status==='tested'?'#306849':'#776a53')+block(x+15,t+60,p.name,w-30,22,2,'#203a35')+text(x+15,t+111,type,15)+block(x+15,t+144,p.io,w-30,17,3)+text(x+15,t+225,'点击查看能力、边界与原始来源',15));});
  }
  if(mode!=='flow'){out.push(block(25,y,'2026-11-17 研究整理；技术与产品沿用既有来源快照。输入、版本、效果和原始报告见交互页及十次实验档案。未运行新模型，旧工程保持只读。',1060,16,3));y+=90;}
  return {markup:out.join(''),height:Math.ceil(y+15),sections};
};

export const scenarioInfo = {
 ola:{title:'实时监控：新数据来了，画面怎样追上？',description:'模拟带宽监控。左侧原始读数直接跳到新值；右侧由 Ola 追随最新目标。连续点击不同负载，即使前一次变化还没结束，它也会转向新的目标。',interaction:'先点“突发 920”，立即点“回落 180”。看右侧如何在途中改目标，再开启连续数据。',owns:'Ola 只负责数字插值，数值面板与折线图由本站绘制。',choose:'实时数据、鼠标跟随、传感器指标：目标会不断变化，关注此刻应该接近哪里。',alternative:'与 Shifty 相比，它更像一个随时可读取的平滑数值；与 TweenJS 相比，不需要预排完整动作序列。',limit:'不提供场景、图形编辑器或视频导出；数据仍是模拟数据。'},
 shifty:{title:'地图镜头：一段过渡，要能暂停、拖动和换缓动',description:'这是一个地图镜头控制实验。缩放和焦点位置是同一段补间的多个数值；地图只是背景。试着暂停在中途、拖动进度，或者切换缓动后重播。',interaction:'点击“开始飞行”→“暂停”→拖动时间位置→“继续”。切换线性 / 平滑后比较启动与停止阶段。',owns:'Shifty 负责可控制的补间数值和生命周期；示意地图与相机变换由本站实现。',choose:'需要自己掌握起止状态、缓动、暂停、恢复与 seek 的底层过渡控制。',alternative:'Ola 适合持续更新目标；这里先定义一段有明确起点和终点的过渡，再精确控制它。',limit:'它不自带地图和完整视频时间轴，也不会替你组织复杂场景。'},
 tween:{title:'订单状态：多个动作按流程发生',description:'模拟一个订单从接单、打包到出库。每一步由真实 TweenJS 的 to / wait / call 串联；事件日志只在相应动作完成后写入。',interaction:'点击“执行订单”，观察高亮阶段、包裹位置和事件日志。暂停后，整串动作停在当前步骤。',owns:'TweenJS 编排状态变化和回调；订单面板、轨道与包裹图形为本站实现。',choose:'当你想描述“先做 A、等待、触发事件、再做 B”，并需要动作与应用状态衔接。',alternative:'与 Ola 的持续追随、Shifty 的单段控制相比，这里突出动作顺序与阶段事件；能力存在重叠，并非互相不能替代。',limit:'仍需开发业务逻辑、画面和最终输出，不是现成剪辑软件。'},
 'motion-canvas':{title:'Motion Canvas：把一次语义检索讲清楚',description:'同一个“语义检索”主题，先看流程。四个节点依次点亮，数据标记沿链路前进，字幕解释每一步。实际由 Motion Canvas 的 TypeScript generator 场景运行。',interaction:'点击播放器播放。关注“编码”与“相似度检索”两步；随后切到 Manim，看检索背后的数学关系。',owns:'Motion Canvas 负责矢量场景、信号动画与时间编排；脚本和字幕由本站编写。',choose:'技术架构、数据流、算法步骤和带旁白的信息型动画。重点是带观众按顺序理解。',alternative:'与 Manim 相比，这个例子强调模块、数据流与讲解节奏；两者都能画图，但表达重心不同。',limit:'这是可播放的动画作品，不是交互式检索系统；没有接入真实模型或数据库。'},
 manim:{title:'Manim：相似度为什么要看向量方向？',description:'沿用同一个主题，深入“相似度检索”这一步。资料向量保持不动，问题向量连续改变方向，投影和余弦值跟着几何关系一起变化。',interaction:'播放视频，观察绿色向量远离蓝色方向时数值下降；靠近时接近 1。可拖动视频进度反复对照。',owns:'由真实 Manim Python Scene 渲染，使用 ValueTracker、always_redraw、向量与投影。本站用 Text 排版公式，未使用 LaTeX。',choose:'连续变量关系、几何推导、公式解释和科学教学。重点是把数学关系变成直觉。',alternative:'Motion Canvas 展示整条检索流程；Manim 在这里解释其中一个步骤的数学意义。',limit:'成片是本地渲染视频；页面播放器不等于实时运行 Python。它是二维方向相似度示意，不是完整高维语义模型。'}
};
const loop=fn=>{let id;function tick(t){fn(t);id=requestAnimationFrame(tick)}id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id)};
const toolbar=html=>'<div class="task-toolbar">'+html+'</div>';
const button=(label,attr='')=>'<button type="button" '+attr+'>'+label+'</button>';

export async function runScenario(id,stage,isCurrent){
 if(id==='ola'){
  const {default:Ola}=await import('ola');if(!isCurrent())return()=>{};
  stage.innerHTML='<div class="task-kicker">实验数据 · 服务器带宽 / Mbps</div><div class="metric-pair"><div><small>原始值 · 直接更新</small><strong id="raw-value">120</strong><div class="meter"><i id="raw-meter"></i></div></div><div><small>Ola · 追随当前目标</small><strong id="smooth-value">120</strong><div class="meter"><i id="smooth-meter"></i></div></div></div><canvas id="signal-chart" width="800" height="170" aria-label="原始值与 Ola 平滑值的历史曲线"></canvas><div class="chart-legend"><span>橙线：原始值</span><span>绿线：Ola 输出</span></div>'+toolbar(button('平稳 120','data-target="120"')+button('突发 920','data-target="920"')+button('回落 180','data-target="180"')+button('开启连续数据','id="stream"'));
  const value=Ola({load:120},900);let target=120,stream=null;const points=[];
  const set=n=>{target=n;value.set({load:n});stage.querySelector('#raw-value').textContent=n;stage.querySelector('#raw-meter').style.width=n/10+'%'};
  stage.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>set(Number(b.dataset.target)));
  stage.querySelector('#stream').onclick=e=>{if(stream){clearInterval(stream);stream=null;e.target.textContent='开启连续数据'}else{let i=0;const values=[150,770,330,910,260,650,130];stream=setInterval(()=>set(values[i++%values.length]),650);e.target.textContent='停止连续数据'}};
  const ctx=stage.querySelector('canvas').getContext('2d');let last=0;
  const stop=loop(t=>{const current=value.load;stage.querySelector('#smooth-value').textContent=Math.round(current);stage.querySelector('#smooth-meter').style.width=current/10+'%';if(t-last<40)return;last=t;points.push([target,current]);if(points.length>200)points.shift();ctx.clearRect(0,0,800,170);for(let j=0;j<2;j++){ctx.strokeStyle=j?'#d1ed8e':'#e5a178';ctx.lineWidth=2;ctx.beginPath();points.forEach((p,i)=>{const x=i*4,y=160-p[j]*.15;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}});set(120);return()=>{stop();clearInterval(stream)};
 }
 if(id==='shifty'){
  const {Tweenable}=await import('shifty');if(!isCurrent())return()=>{};
  stage.innerHTML='<div class="task-kicker">单段相机过渡 · 可控起止状态</div><div class="map-window"><div class="map-world"><i class="river"></i><div class="road road-one"></div><div class="road road-two"></div><span class="map-place p1">旧城区</span><span class="map-place p2">湖畔园区</span><span class="map-place p3">图书馆</span><b class="map-pin">◎</b></div><div class="map-reticle">＋</div><span class="map-badge">示意地图 · 非真实地理数据</span></div>'+toolbar(button('开始飞行','id="fly"')+button('暂停','id="pause-flight"')+button('继续','id="resume-flight"')+'<label>缓动 <select id="ease"><option value="easeInOutCubic">平滑起止</option><option value="linear">匀速线性</option></select></label>')+'<label class="task-scrub">拖动时间位置 <input type="range" id="flight-time" min="0" max="4000" value="0" aria-label="地图过渡时间"><output id="flight-state">0% · 1.00×</output></label>';
  const world=stage.querySelector('.map-world'),slider=stage.querySelector('#flight-time');
  const tween=new Tweenable();
  function configure(){tween.setConfig({from:{x:0,y:0,z:1,p:0},to:{x:-120,y:30,z:1.7,p:100},duration:4000,easing:stage.querySelector('#ease').value,render:({x,y,z,p})=>{world.style.transform='translate('+x+'px,'+y+'px) scale('+z+')';slider.value=String(p*40);stage.querySelector('#flight-state').textContent=Math.round(p)+'% · '+z.toFixed(2)+'×'}})}
  configure();tween.seek(0);
  stage.querySelector('#fly').onclick=()=>{tween.stop();configure();tween.tween()};
  stage.querySelector('#pause-flight').onclick=()=>tween.pause();stage.querySelector('#resume-flight').onclick=()=>tween.resume();
  slider.oninput=()=>{tween.pause();tween.seek(Number(slider.value))};stage.querySelector('#ease').onchange=()=>{tween.stop();configure();tween.seek(0)};
  return()=>tween.stop();
 }
 if(id==='tween'){
  const {Tween,Ease}=await import('@createjs/tweenjs');if(!isCurrent())return()=>{};
  stage.innerHTML='<div class="task-kicker">订单 #DEMO-2048 · 阶段与回调</div><div class="order-steps"><span>1 接单</span><span>2 打包</span><span>3 出库</span><span>4 完成</span></div><div class="order-track"><div id="parcel">▣<small>DEMO</small></div></div><div id="order-log" class="order-log" aria-live="polite">等待执行订单。每一步完成后才会新增事件。</div>'+toolbar(button('执行订单','id="run-order"')+button('暂停 / 继续','id="pause-order"'));
  let tween=null,previous;const state={x:0,rotation:0,scale:1};
  const log=(i,text)=>{stage.querySelectorAll('.order-steps span').forEach((s,n)=>s.classList.toggle('current',i===n));const row=document.createElement('div');row.textContent='✓ '+text;stage.querySelector('#order-log').append(row)};
  stage.querySelector('#run-order').onclick=()=>{Tween.removeTweens(state);Object.assign(state,{x:0,rotation:0,scale:1});stage.querySelector('#order-log').textContent='';log(0,'订单已接收');tween=Tween.get(state).to({x:26},1100,Ease.quadInOut).call(()=>log(1,'已进入打包台')).to({rotation:12,scale:1.15},250).to({rotation:0,scale:1},250).wait(750).to({x:63},1200,Ease.quadInOut).call(()=>log(2,'包裹已出库')).wait(700).to({x:90},1100,Ease.quadInOut).call(()=>log(3,'订单流程完成'))};
  stage.querySelector('#pause-order').onclick=()=>{if(tween)tween.paused=!tween.paused};
  const stop=loop(time=>{if(previous!==undefined)Tween.tick(time-previous,false);previous=time;const parcel=stage.querySelector('#parcel');parcel.style.left=state.x+'%';parcel.style.transform='rotate('+state.rotation+'deg) scale('+state.scale+')'});
  return()=>{stop();Tween.removeTweens(state)};
 }
 if(id==='motion-canvas'){
  await import('@motion-canvas/player');if(!isCurrent())return()=>{};
  stage.innerHTML='<motion-canvas-player src="'+new URL('./motion-canvas/project.js',document.baseURI).href+'"></motion-canvas-player>';
  const player=stage.firstElementChild;
  await new Promise((resolve,reject)=>{let n=0;const check=()=>{if(!isCurrent()){resolve();return;}const overlay=player.shadowRoot?.querySelector('.overlay');if(overlay?.classList.contains('state-ready')){player.shadowRoot.querySelector('button')?.setAttribute('aria-label','播放或暂停流程讲解');resolve();}else if(overlay?.classList.contains('state-error')||n++>150){reject(new Error('流程动画加载失败，请检查编译产物'));}else setTimeout(check,100)};check()});
  return()=>player.remove();
 }
 if(id==='manim'){
  stage.innerHTML='<video controls playsinline preload="metadata" src="./vector-similarity.mp4" aria-label="Manim 向量相似度讲解视频"></video>';
  return()=>{const video=stage.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load()}};
 }
 return()=>{};
}

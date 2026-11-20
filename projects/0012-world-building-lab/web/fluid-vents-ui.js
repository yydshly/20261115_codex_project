import {Vector3} from 'three';
import {geyserPhases,geyserState,ventBed,ventRoutes,ventSources,ventView} from './fluid-vents.js';
import {createFluidVentScene} from './fluid-vents-scene.js';
import {mountDiveReadout} from './dive-readout.js';

const colors={bed:'#c4a77b',hot:'#ffb373',cold:'#92dcea',seep:'#bcdb9f',acid:'#ddc77f'};
const flowColors={vent:colors.hot,seep:colors.seep,geyser:colors.hot,recharge:colors.cold,pool:colors.hot,
  terrace:colors.hot,acid:colors.acid};

function drawSection(canvas,p,route,progress){
  const ctx=canvas.getContext('2d'),{width,height}=canvas;
  const zero=43,base=height-10,step=64;
  const x=n=>width*.55+n*width*.44;
  const y=n=>zero+n*(base-zero);
  const surface=px=>zero+5*Math.sin(px/82)+3*Math.sin(px/35);
  ctx.fillStyle=route==='ocean'?'#294b5a':'#859c8f';ctx.fillRect(0,0,width,height);
  const layers=route==='ocean'?['#687378','#535b65','#424d55']:['#74634d','#605243','#4a423b'];
  layers.forEach((color,i)=>{
    ctx.fillStyle=color;ctx.beginPath();
    for(let px=0;px<=width;px+=4)ctx.lineTo(px,surface(px)+i*step);
    ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.closePath();ctx.fill();
  });
  ctx.lineJoin='round';ctx.lineCap='round';
  if(p.id==='geyser'){
    const {fill,lift}=geyserState(progress),cx=x(-.18),cy=y(.74);
    ctx.beginPath();ctx.ellipse(cx,cy,47,27,0,0,Math.PI*2);
    ctx.fillStyle='#233535';ctx.fill();
    ctx.save();ctx.clip();ctx.fillStyle=colors.hot;ctx.fillRect(cx-50,cy+27-54*fill,100,55*fill);ctx.restore();
    if(lift>.02){
      ctx.strokeStyle='#e0f2f2';ctx.lineWidth=8;
      ctx.beginPath();ctx.moveTo(x(0),surface(x(0))+3);ctx.lineTo(x(.02),surface(x(0))-36*lift);ctx.stroke();
    }
  }
  const points=p.pipe.map(([sx,sy])=>[x(sx),y(sy)]);
  function trace(from,to,color,width){
    ctx.beginPath();ctx.moveTo(...points[from]);
    for(let i=from+1;i<=to;i++)ctx.lineTo(...points[i]);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
    const [dx,dy]=points[to],prior=points[to-1],angle=Math.atan2(dy-prior[1],dx-prior[0]);
    const length=Math.hypot(dx-prior[0],dy-prior[1]);
    const mx=dx-Math.cos(angle)*Math.min(13,length*.3),my=dy-Math.sin(angle)*Math.min(13,length*.3);
    ctx.beginPath();
    ctx.moveTo(mx-Math.cos(angle-.55)*11,my-Math.sin(angle-.55)*11);
    ctx.lineTo(mx,my);ctx.lineTo(mx-Math.cos(angle+.55)*11,my-Math.sin(angle+.55)*11);ctx.stroke();
  }
  if(p.id==='vent'||p.id==='geyser'){
    trace(0,1,colors.cold,4);
    trace(1,points.length-1,colors.hot,4);
  }else trace(0,points.length-1,flowColors[p.id],4);
  ctx.fillStyle='#f0e9d7';ctx.font='17px system-ui';
  ctx.fillText(route==='ocean'?'海床':'地表',13,24);
  ctx.fillText(p.id==='seep'?'含甲烷沉积层':'地下通道示意',17,height-14);
}

const metre=n=>n.toLocaleString('zh-CN',{maximumFractionDigits:1})+' m';

export function mountFluidVents(panel,scene,resources,{onBack,reduced}){
  const study=createFluidVentScene(scene,resources);
  panel.innerHTML=`
    <div class="formation-actions" aria-label="海陆流体出露路线">
      ${Object.entries(ventRoutes).map(([id,route])=>`<button type="button" data-vent-route="${id}">${route.name}</button>`).join('')}
    </div>
    <p id="vent-status" class="plan-present" role="status"></p>
    <div class="cold-nav">
      <select id="vent-stop" aria-label="沿流体出露路线定位"></select>
      <button type="button" id="vent-prev" aria-label="上一站">←</button>
      <button type="button" id="vent-next">下一站 →</button>
    </div>
    <dl id="vent-readings" class="cold-readings"></dl>
    <div class="formation-actions">
      <button type="button" id="vent-all">路线全图</button>
      <button type="button" id="vent-section">地下通道剖面</button>
    </div>
    <div id="vent-cycle" hidden>
      <div class="formation-actions" aria-label="间歇泉喷发周期">
        ${geyserPhases.map(p=>`<button type="button" data-vent-phase="${p.id}">${p.name}</button>`).join('')}
        <button type="button" id="vent-play">播放一轮喷发</button>
      </div>
      <p id="vent-phase-note" class="plan-note" role="status"></p>
    </div>
    <p id="vent-detail" class="plan-note"></p>
    <figure id="vent-figure" class="line-section-profile" hidden>
      <figcaption>沿地下通道看补给与出露 · 示意剖面</figcaption>
      <canvas id="vent-profile" width="612" height="200" role="img" aria-label="地下流体通道的示意剖面"></canvas>
      <ol class="plan-chain" id="vent-steps"></ol>
    </figure>
    <p class="plan-note">地表和海床高程读取现有大地图。地下通道、沉积群落和喷发节奏为教学设定。下潜时由观察灯照亮海床。</p>
    <div class="plan-sources" id="vent-sources"></div>
    <button type="button" id="vent-back"></button>`;

  const find=id=>panel.querySelector('#vent-'+id),doc=panel.ownerDocument;
  const diveReadout=mountDiveReadout(doc);
  const labels=doc.createElement('div'),vector=new Vector3();
  labels.className='basin-event-map-labels';labels.hidden=true;labels.setAttribute('aria-hidden','true');
  doc.body.append(labels);
  let route='ocean',index=-1,section=false,active=false,playing=false,progress=geyserPhases[0].progress;
  let marks=[],back=null,frame=null,lastPhase=null;
  const list=()=>ventRoutes[route].stops;
  const site=()=>list()[index];
  function draw(){
    if(section&&site()?.pipe)drawSection(find('profile'),site(),route,progress);
  }
  function cycleControls(){
    if(site()?.id!=='geyser')return;
    const {phase}=geyserState(progress);
    if(phase!==lastPhase){
      lastPhase=phase;
      find('phase-note').textContent=phase.name+' · '+phase.detail;
      panel.querySelectorAll('[data-vent-phase]').forEach(b=>
        b.setAttribute('aria-pressed',String(b.dataset.ventPhase===phase.id)));
    }
    find('play').textContent=playing?'暂停喷发演示':'播放一轮喷发';
    find('play').setAttribute('aria-pressed',String(playing));
  }
  function paint(){
    const p=site(),config=ventRoutes[route];
    frame=p?ventView(p,route):config.center;
    study.show(route,p,frame);study.update(0,progress);
    if(route==='ocean'&&p){
      diveReadout.show({name:p.name,waterDepth:metre(-ventBed(p)),habitat:[p.deposit,p.life].filter(Boolean).join(' · ')});
    }else diveReadout.hide();
    find('status').textContent=p?.name??config.name+' · '+list().length+' 站';
    find('stop').value=p?.id??'';
    find('prev').disabled=index<0;
    find('next').textContent=index===list().length-1?'回路线全图 ↗':'下一站 →';
    find('all').setAttribute('aria-pressed',String(!p));
    find('section').hidden=!p?.pipe;
    find('section').setAttribute('aria-pressed',String(section&&!!p?.pipe));
    find('figure').hidden=!p?.pipe||!section;
    find('cycle').hidden=p?.id!=='geyser';
    find('detail').textContent=p?.detail??config.detail;
    find('back').textContent='回到'+(back??config.home).name+' ↗';
    cycleControls();
    const entries=p?[[route==='ocean'?'场景水深':'地表高程',metre((route==='ocean'?-1:1)*ventBed(p))],
      [p.pipe?'流体来源':'主要输入',p.source],['沉积',p.deposit],['代表群落',p.life]].filter(([,value])=>!!value):[];
    find('readings').replaceChildren(...entries.map(([label,value])=>{
      const pair=doc.createElement('div'),dt=doc.createElement('dt'),dd=doc.createElement('dd');
      dt.textContent=label;dd.textContent=value;pair.append(dt,dd);return pair;
    }));
    find('steps').replaceChildren(...(p?.key??[]).map(text=>{
      const li=doc.createElement('li');li.textContent=text;return li;
    }));
    draw();
    const labelSites=p?[]:list();
    marks=labelSites.map(marker=>{
      const el=doc.createElement('span');el.textContent=marker.name;el.style.setProperty('--basin-color','#efc792');
      return {p:marker,el,y:ventBed(marker)+(route==='ocean'?12:5)};
    });
    labels.replaceChildren(...marks.map(({el})=>el));
  }
  function choose(i){
    index=i;playing=false;paint();
  }
  function switchRoute(id,context={}){
    route=id;section=context.section===true;progress=geyserPhases[0].progress;
    panel.querySelectorAll('[data-vent-route]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ventRoute===id)));
    find('stop').innerHTML='<option value="">全线</option>'+list().map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    find('sources').innerHTML=ventSources[route].map(([label,href])=>`<a href="${href}" target="_blank" rel="noopener">${label} ↗</a>`).join('');
    choose(list().findIndex(p=>p.id===context.station));
  }
  panel.querySelectorAll('[data-vent-route]').forEach(b=>b.addEventListener('click',()=>{
    switchRoute(b.dataset.ventRoute,{station:b.dataset.ventRoute==='land'?'geyser':'vent'});
  }));
  panel.querySelectorAll('[data-vent-phase]').forEach(b=>b.addEventListener('click',()=>{
    playing=false;progress=geyserPhases.find(p=>p.id===b.dataset.ventPhase).progress;
    study.update(0,progress);cycleControls();draw();
  }));
  find('play').addEventListener('click',()=>{
    if(!playing)progress=0;
    playing=!playing;cycleControls();
  });
  find('section').addEventListener('click',()=>{section=!section;paint();});
  find('stop').addEventListener('change',e=>choose(list().findIndex(p=>p.id===e.target.value)));
  find('all').addEventListener('click',()=>choose(-1));
  find('prev').addEventListener('click',()=>choose(index-1));
  find('next').addEventListener('click',()=>choose(index===list().length-1?-1:index+1));
  find('back').addEventListener('click',()=>onBack(back??ventRoutes[route].home));
  return {
    show(context={}){
      active=true;labels.hidden=false;back=context.back??null;
      switchRoute(context.route==='land'?'land':'ocean',context);
    },
    hide(){active=false;playing=false;labels.hidden=true;diveReadout.hide();study.hide();},
    get view(){return frame;},
    update(dt){
      if(!active)return;
      if(playing){
        progress=Math.min(1,progress+dt/10);
        if(progress>=1)playing=false;
        cycleControls();draw();
      }
      if(!reduced||playing)study.update(dt,progress);
    },
    project(camera,diveTarget){
      study.followDive(camera.position,diveTarget);
      if(route==='ocean'&&site())diveReadout.setCameraDepth(-camera.position.y);
      const box=panel.closest('#world-plan-panel').getBoundingClientRect();
      for(const {p,el,y} of marks){
        vector.set(p.x,y,p.z).project(camera);
        const sx=innerWidth*(.5+.5*vector.x),sy=innerHeight*(.5-.5*vector.y);
        el.hidden=vector.z< -1||vector.z>1||sx<45||sx>innerWidth-45||sy<65||sy>innerHeight-25||
          sx>box.left-55&&sx<box.right+55&&sy>box.top&&sy<box.bottom;
        el.style.transform=`translate(${sx}px,${sy}px) translate(-50%,-50%)`;
      }
    }
  };
}

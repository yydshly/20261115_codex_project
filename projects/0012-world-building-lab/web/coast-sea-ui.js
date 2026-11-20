import {Vector3} from 'three';
import {coastRead,coastStops,coastTides} from './coast-sea.js';
import {createCoastSeaScene} from './coast-sea-scene.js';
import {mountDiveReadout} from './dive-readout.js';

const modes=[['surface','看潮面'],['bed','揭海看床底'],['dive','下潜观察']];
const units=n=>n.toLocaleString('zh-CN',{maximumFractionDigits:1});
const light=n=>n===null?'露出水面':n<.001?'接近零':units(n*100)+'%';
const source=[
  ['NOAA · 海草床','https://floridakeys.noaa.gov/plants/seagrass.html'],
  ['NOAA · 海水透明度与造礁珊瑚','https://www.fisheries.noaa.gov/s3/2023-08/Final-Coral-CH-Information-Report-508.pdf']
];

function drawProfile(canvas,profile,reading,station){
  const ctx=canvas.getContext('2d'),{width:w,height:h}=canvas,{points,length}=profile;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#153747';ctx.fillRect(0,0,w,h);
  const x=d=>43+d/length*(w-60),d=p=>24-p*(h-49)/400;
  ctx.strokeStyle='#5f899b';ctx.lineWidth=1;ctx.font='18px system-ui';ctx.fillStyle='#e3eae0';
  for(const datum of [0,-100,-200,-300,-400]){
    const y=d(datum);
    ctx.beginPath();ctx.moveTo(40,y);ctx.lineTo(w-13,y);ctx.stroke();ctx.fillText(datum,1,y+5);
  }
  ctx.fillStyle='#a4977a';ctx.beginPath();
  for(const p of points)ctx.lineTo(x(p.distance),d(p.y));
  ctx.lineTo(x(length),d(-400));ctx.lineTo(x(0),d(-400));ctx.closePath();ctx.fill();
  if(station){
    const best=points.reduce((a,b)=>Math.hypot(a.x-station.x,a.z-station.z)<Math.hypot(b.x-station.x,b.z-station.z)?a:b);
    ctx.strokeStyle='#ffe29e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x(best.distance),d(reading.surface));
    ctx.lineTo(x(best.distance),d(reading.bed));ctx.stroke();
    ctx.fillStyle='#ffe29e';ctx.beginPath();ctx.arc(x(best.distance),d(reading.bed),4,0,Math.PI*2);ctx.fill();
  }
}

export function mountCoastSea(panel,scene,resources,onBack,onVents,onCambrian){
  const study=createCoastSeaScene(scene,resources);
  panel.innerHTML=`
    <div class="formation-actions">
      <button id="coast-all" type="button">从河口到深海</button>
      ${modes.map(([id,text])=>`<button type="button" data-coast-mode="${id}">${text}</button>`).join('')}
    </div>
    <p id="coast-status" class="plan-present" role="status"></p>
    <div class="cold-nav">
      <select id="coast-stop" aria-label="沿海洋主线定位"><option value="">全线</option>${coastStops.map(p=>
        `<option value="${p.id}">${p.name}</option>`).join('')}</select>
      <button type="button" id="coast-prev" aria-label="上一站">←</button>
      <button type="button" id="coast-next">下一站 →</button>
    </div>
    <dl id="coast-readings" class="cold-readings" hidden></dl>
    <p class="plan-note" id="coast-dive-note"></p>
    <div class="formation-actions" aria-label="潮汐相位">
      ${Object.entries(coastTides).map(([id,t])=>`<button type="button" data-coast-tide="${id}">${t.name}</button>`).join('')}
    </div>
    <p class="plan-note" id="coast-detail"></p>
    <section class="coast-comparison" aria-label="同水深底光对照">
      <table class="formation-values" id="coast-light"></table>
      <div class="formation-actions"><button type="button" id="coast-mouth">看浑浊河口 ↗</button>
        <button type="button" id="coast-grass">看清浅海草 ↗</button></div>
    </section>
    <figure id="coast-figure"><canvas id="coast-profile" width="660" height="215" role="img" aria-label="航线海床高程剖面"></canvas>
      <figcaption id="coast-caption"></figcaption></figure>
    <p class="plan-note">底光为入水后相对比例。透明度、暖水环境和群落采用教学设定，沿线读取现有海床深度。</p>
    <button type="button" id="coast-vents">下潜对照热液与冷泉 ↗</button>
    <button type="button" id="coast-cambrian">切到寒武纪近岸与崖脚 ↗</button>
    <div class="plan-sources">${source.map(([title,url])=>`<a href="${url}" target="_blank" rel="noopener">${title} ↗</a>`).join('')}</div>
    <button type="button" id="coast-back">返回三条环境线 ↗</button>`;
  const find=id=>panel.querySelector('#coast-'+id),doc=panel.ownerDocument,labels=doc.createElement('div'),vector=new Vector3();
  const diveReadout=mountDiveReadout(doc);
  labels.className='basin-event-map-labels';labels.hidden=true;labels.setAttribute('aria-hidden','true');doc.body.append(labels);
  const buttons=key=>panel.querySelectorAll('[data-coast-'+key+']');
  let index=-1,tide='high',mode='surface',response=null,back=null,shown=false,markers=[];
  const site=()=>coastStops[index];

  function paint(){
    const p=site(),status=find('status');
    response=study.show(p,tide,mode);
    const {profile,reading,dive}=response;
    status.textContent=p?.name??'从西南河口沿海到东南海沟';
    find('stop').value=p?.id??'';
    find('prev').disabled=index<0;
    find('next').textContent=index<0?'开始沿线看 →':index===coastStops.length-1?'回全线 ↗':'下一站 →';
    find('all').setAttribute('aria-pressed',String(!p));
    find('detail').textContent=p?.detail??`约 ${(profile.length/1000).toFixed(2)} 公里、${coastStops.length} 站。沿南部外海绕到东部岩岸，再一路下降到陆架、陆坡和海沟。`;
    find('dive-note').textContent=dive?'观察灯照亮海床和群落。自然底光读数按水深和透明度计算。':
      mode==='dive'?(reading?.exposed?'此处当前露出水面。可切到高潮或前往较深的观察站。':'此站从海面或揭海视角观察。'):'';
    if(dive){
      diveReadout.show({name:p.name,waterDepth:units(reading.depth)+' m',naturalLight:light(reading.light),
        habitat:reading.habitat.name+' · '+reading.habitat.community});
    }else diveReadout.hide();
    find('back').textContent=back?`回到${back.name} ↗`:'返回三条环境线 ↗';
    for(const b of buttons('tide'))b.setAttribute('aria-pressed',String(b.dataset.coastTide===tide));
    for(const b of buttons('mode'))b.setAttribute('aria-pressed',String(b.dataset.coastMode===mode));
    const readings=find('readings');readings.hidden=!reading;
    if(reading){
      const row=(name,v)=>`<div><dt>${name}</dt><dd>${v}</dd></div>`;
      readings.innerHTML=row('水深',reading.exposed?'露出水面':units(reading.depth)+' m')+
        row('底质',reading.habitat.name)+row('代表群落',reading.habitat.community)+
        row('自然底光',light(reading.light))+row('海床高程',units(reading.bed)+' m');
    }
    const a=coastRead(coastStops[0],tide),b=coastRead(coastStops[3],tide);
    find('light').innerHTML=`<caption>固定水深 3 m · ${coastTides[tide].name}</caption>
      <thead><tr><th>水体</th><th>浑浊河口</th><th>清浅海岸</th></tr></thead>
      <tbody><tr><th scope="row">相对底光</th><td>${light(a.atThree)}</td><td>${light(b.atThree)}</td></tr></tbody>`;
    find('caption').textContent='海床剖面 · 共用零米基准 · 深度为场景米';
    drawProfile(find('profile'),profile,reading,p);
  }

  function mark(){
    const current=site();
    const shown=current?[current]:[coastStops[0],coastStops[1],coastStops[4],coastStops[7]];
    markers=shown.map(p=>{
      const el=doc.createElement('span');el.textContent=p.name;el.style.setProperty('--basin-color','#b7e6e4');
      return {p,el};
    });
    labels.replaceChildren(...markers.map(a=>a.el));
  }
  function select(i){index=i;paint();mark();}
  function compare(i){
    select(i);
    panel.closest('#world-plan-panel').scrollTop=0;
  }
  for(const b of buttons('tide'))b.addEventListener('click',()=>{tide=b.dataset.coastTide;paint();});
  for(const b of buttons('mode'))b.addEventListener('click',()=>{
    const m=b.dataset.coastMode;
    mode=m;
    if(m==='dive'&&!site())select(0);else paint();
  });
  find('stop').addEventListener('change',e=>select(coastStops.findIndex(p=>p.id===e.target.value)));
  find('all').addEventListener('click',()=>select(-1));
  find('prev').addEventListener('click',()=>select(index-1));
  find('next').addEventListener('click',()=>select(index===coastStops.length-1?-1:index+1));
  find('mouth').addEventListener('click',()=>compare(0));
  find('grass').addEventListener('click',()=>compare(3));
  find('vents').addEventListener('click',()=>onVents({
    route:'ocean',station:['slope','trench'].includes(site()?.id)?'seep':'vent',
    back:{mode:'coast-sea',name:site()?.name??'河口到深海',station:site()?.id,tide,view:mode}
  }));
  find('cambrian').addEventListener('click',()=>{
    const station={mouth:'front',rock:'mouth',grass:'platform',coral:'platform',shelf:'rim',slope:'foot',trench:'basin'};
    onCambrian({case:'cambrian',station:station[site()?.id]??'front',
      back:{mode:'coast-sea',name:site()?.name??'河口到深海',station:site()?.id,tide,view:mode}});
  });
  find('back').addEventListener('click',()=>onBack(back??{focus:'inland',seam:'east'}));
  return {
    show(context={}){
      shown=true;labels.hidden=false;back=context.back??null;
      mode=modes.some(([id])=>id===context.view)?context.view:'surface';
      tide=Object.hasOwn(coastTides,context.tide)?context.tide:'high';
      const i=coastStops.findIndex(p=>p.id===context.station);
      select(mode==='dive'&&i===-1?0:i);
    },
    hide(){study.hide();diveReadout.hide();labels.hidden=true;shown=false;},
    get view(){
      const p=site();
      if(!p)return [-25,1000,0,innerWidth<700?4840:4150,Math.PI/2];
      const {reading,dive}=response,y=mode==='bed'?reading.bed:Math.max(reading.surface,reading.bed);
      return [p.x,p.z,dive?.targetY??y,p.range,p.id==='mouth'?2.21:1.74,dive];
    },
    project(camera,diveTarget){
      if(!shown)return;
      study.followDive(camera.position,diveTarget);
      if(response?.dive)diveReadout.setCameraDepth(response.dive.surface-camera.position.y);
      const box=panel.closest('#world-plan-panel').getBoundingClientRect();
      for(const {p,el} of markers){
        const r=coastRead(p,tide),y=(mode==='bed'?r.bed:Math.max(r.bed,r.surface))+(site()?17:33);
        vector.set(p.x,y,p.z).project(camera);
        const x=innerWidth*(.5+.5*vector.x),z=innerHeight*(.5-.5*vector.y);
        el.hidden=!!response?.dive||x<75||x>innerWidth-75||z<64||z>innerHeight-35||vector.z< -1||vector.z>1||
          x>box.left-65&&x<box.right+65&&z>box.top&&z<box.bottom;
        el.style.transform=`translate(${x}px,${z}px) translate(-50%,-50%)`;
      }
    }
  };
}

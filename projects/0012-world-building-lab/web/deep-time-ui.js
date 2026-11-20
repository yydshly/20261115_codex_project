import {Vector3} from 'three';
import {deepTimeCases,deepTimePoint,deepTimeProfile,deepTimeSources} from './deep-time.js';
import {createDeepTimeScene} from './deep-time-scene.js';
import {isPaleoWetland,peatSource} from './paleo-wetlands.js';
import {cambrianClarity,cambrianDive,cambrianDiveClear,cambrianSources} from './cambrian-margin.js';
import {isMesozoicRiver,jurassicClimateSource,mesoLakeLevel} from './mesozoic-rivers.js';

const number=value=>value.toLocaleString('zh-CN',{maximumFractionDigits:1});
function drawProfile(canvas,id,phase,station){
  const ctx=canvas.getContext('2d'),{width,height}=canvas;
  const points=deepTimeProfile(id,phase);
  const levels=points.flatMap(p=>p.level===null?[p.bed]:[p.bed,p.level]);
  const floor=Math.floor(Math.min(...levels)/10)*10-1,ceiling=Math.ceil(Math.max(...levels)/10)*10+1;
  const left=62,right=width-21,top=23,bottom=height-26;
  const sx=i=>left+(right-left)*i/(points.length-1);
  const sy=value=>top+(bottom-top)*(ceiling-value)/(ceiling-floor);
  ctx.fillStyle='#183438';ctx.fillRect(0,0,width,height);
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    if(!a.depth&&!b.depth)continue;
    ctx.fillStyle='#43878d';ctx.beginPath();
    ctx.moveTo(sx(i-1),sy(a.bed));ctx.lineTo(sx(i-1),sy(Math.max(a.bed,a.level??a.bed)));
    ctx.lineTo(sx(i),sy(Math.max(b.bed,b.level??b.bed)));ctx.lineTo(sx(i),sy(b.bed));ctx.fill();
  }
  ctx.beginPath();ctx.moveTo(left,sy(points[0].bed));
  points.forEach((p,i)=>ctx.lineTo(sx(i),sy(p.bed)));
  ctx.strokeStyle='#e9c592';ctx.lineWidth=3;ctx.stroke();
  ctx.lineTo(right,bottom);ctx.lineTo(left,bottom);ctx.closePath();
  ctx.fillStyle='#a6835a66';ctx.fill();
  ctx.font='18px system-ui';ctx.fillStyle='#dddcd0';
  ctx.fillText(Math.round(ceiling)+' m',4,top+5);ctx.fillText(Math.round(floor)+' m',6,bottom);
  if(station){
    const i=deepTimeCases[id].stops.indexOf(station)*48,p=points[i];
    ctx.beginPath();ctx.arc(sx(i),sy(Math.max(p.bed,p.level??p.bed)),5,0,Math.PI*2);
    ctx.fillStyle='#fff0ac';ctx.fill();
  }
}

export function mountDeepTime(panel,scene,modernRoots,onBack,{reduced=false}={}){
  const study=createDeepTimeScene(scene,modernRoots,{reduced});
  panel.innerHTML=`
    <div class="formation-actions" aria-label="史前案例">
      ${Object.entries(deepTimeCases).map(([id,c])=>`<button type="button" data-deep-case="${id}">${c.name}</button>`).join('')}
    </div>
    <p id="deep-period" class="plan-note"></p>
    <div id="deep-phases" class="formation-actions" aria-label="对照环境状态"></div>
    <p id="deep-status" class="plan-present" role="status"></p>
    <div class="cold-nav">
      <select id="deep-stop" aria-label="沿史前路线定位"></select>
      <button type="button" id="deep-prev" aria-label="上一站">←</button>
      <button type="button" id="deep-next">下一站 →</button>
    </div>
    <div class="formation-actions">
      <button type="button" id="deep-all">路线全图</button>
      <button type="button" id="deep-bed">揭开海道水面</button>
      <button type="button" id="deep-section" hidden>显示根迹与地层</button>
      <button type="button" id="deep-dive" hidden>下潜到本站</button>
      <button type="button" id="deep-replay" hidden>重看倒木搬运</button>
    </div>
    <p class="plan-note" id="deep-dive-note" hidden>水下已补光。WASD 短程移动，Q 下潜，E 上浮，拖动转向，R 回到本站视角。</p>
    <p class="plan-present" id="deep-section-detail" hidden></p>
    <p id="deep-explanation" class="plan-note"></p>
    <dl id="deep-readings" class="cold-readings"></dl>
    <figure class="line-section-profile">
      <figcaption id="deep-caption"></figcaption>
      <canvas id="deep-profile" width="640" height="140" role="img" aria-label="沿路线的地形与水位剖面"></canvas>
    </figure>
    <p class="plan-note">各例依地层和化石记录构建。古海陆、河槽和群落采用独立地形和教学尺度，在同一坐标与现代对照。用航拍和定点近看观察古景。</p>
    <div class="plan-sources">
      <a id="deep-source" target="_blank" rel="noopener"></a>
      <a id="deep-peat-source" href="${peatSource.url}" target="_blank" rel="noopener" hidden>${peatSource.name} ↗</a>
      <a id="deep-other-source" target="_blank" rel="noopener" hidden></a>
    </div>
    <button type="button" id="deep-back">返回三条环境线 ↗</button>`;
  const find=name=>panel.querySelector('#deep-'+name),vector=new Vector3();
  const doc=panel.ownerDocument,labels=doc.createElement('div');
  labels.className='basin-event-map-labels';labels.hidden=true;labels.setAttribute('aria-hidden','true');
  doc.body.append(labels);
  let id='seaway',phase='flooded',index=-1,bedView=false,sectionView=false,diveView=false,back=null,active=false,markers=[];
  const period=()=>deepTimeCases[id];
  const current=()=>period().stops[index];
  const diving=()=>id==='cambrian'&&phase!=='now'&&current()?.dive&&diveView;
  function mark(){
    markers=(current()?[current()]:period().stops).map(p=>{
      const node=doc.createElement('span');
      node.style.setProperty('--basin-color','#e2c286');node.textContent=p.name;
      return {p,node};
    });
    labels.replaceChildren(...markers.map(({node})=>node));
  }
  function render(){
    const p=current(),c=period(),state=c.phases[phase],past=phase!=='now';
    const cambrian=id==='cambrian',paleo=isPaleoWetland(id),meso=isMesozoicRiver(id),showSection=past&&sectionView;
    study.show(id,phase,p,bedView,showSection,diving());
    panel.querySelectorAll('[data-deep-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.deepCase===id)));
    find('phases').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.deepPhase===phase)));
    find('period').textContent=c.age;
    find('status').textContent=(p?.name??c.name)+' · '+state.name;
    find('stop').value=p?.id??'';
    find('prev').disabled=index<0;
    find('next').textContent=index<0?'从第一站开始 →':index===c.stops.length-1?'回路线全图 ↗':'下一站 →';
    find('all').setAttribute('aria-pressed',String(!p));
    find('bed').hidden=!(paleo||cambrian||meso||id==='seaway')||!past;
    find('bed').setAttribute('aria-pressed',String(bedView));
    const waterName=id==='seaway'?'海道水面':cambrian?'寒武纪海面':'浅水覆盖';
    find('bed').textContent=(bedView?'恢复':'揭开')+waterName;
    find('dive').hidden=!(cambrian&&past&&p?.dive);
    find('dive').textContent=diving()?'返回水面视角':'下潜到本站';
    find('dive').setAttribute('aria-pressed',String(!!diving()));
    find('dive-note').hidden=!diving();
    find('replay').hidden=reduced||id!=='triassic'||phase!=='peak';
    find('section').hidden=!paleo||!past;
    find('section').setAttribute('aria-pressed',String(showSection));
    find('section').textContent=(showSection?'收起':'观察')+(c.sectionName??'地层剖面');
    const sectionText=id==='devonian'?'金褐分枝线示意古羊齿型长根，棕色短根示意树干基部根丛。样块由下至上显示细砂、细泥与受扰动的根土。':
      phase==='burial'?'最上层灰米色是洪水留下的矿物细泥，下面的暗褐层是更早积下的泥炭。泥炭可经长期深埋和压实后演变成煤。':
      '从地表植物碎屑向下看，暗褐厚层是有机残体积累形成的泥炭，再往下是较早形成的矿物质底层。';
    find('section-detail').hidden=!showSection;
    find('section-detail').textContent=sectionText;
    find('explanation').textContent=(past?(p?.detail??c.intro)+' ':'')+state.detail;
    const readings=[];
    if(p){
      const q=deepTimePoint(id,phase,p.x,p.z);
      readings.push(['地图坐标',`X ${p.x} m · Z ${p.z} m`],['此处地表',q.habitat]);
      readings.push(['当地床面',number(q.bed)+' m'],['水深',q.depth>0?number(q.depth)+' m':'出露']);
      if(cambrian&&past&&q.depth>0){
        const visual=cambrianClarity(phase,p.x,p.z);
        readings.push(['参考能见距',number(visual.visibility)+' m'],['自然底光示意',number(visual.bottomLight*100)+'%']);
      }
    }
    if(past&&id==='seaway')readings.push(['场景相对水位',number(state.level)+' m']);
    if(past&&id==='forest')readings.push(['高纬至日光照示意',phase==='day'?'约 24 小时有日照':'约 0 小时有日照']);
    if(past&&id==='jurassic')readings.push(['湖心水位',number(mesoLakeLevel(phase))+' m']);
    find('readings').replaceChildren(...readings.map(([label,value])=>{
      const pair=doc.createElement('div'),term=doc.createElement('dt'),detail=doc.createElement('dd');
      term.textContent=label;detail.textContent=value;pair.append(term,detail);return pair;
    }));
    find('caption').textContent=past?(c.profileName??(id==='seaway'?'西缘山前到东岸':'曲流到河阶'))+' · 地形与水面':'同坐标的现代地形与水面';
    drawProfile(find('profile'),id,phase,p);
    const outside=cambrian&&index>=4;
    const source=outside?cambrianSources.slope:deepTimeSources[id];
    find('source').href=source.url;find('source').textContent=source.name+' ↗';
    const other=id==='jurassic'?jurassicClimateSource:outside?cambrianSources.delta:cambrianSources.slope;
    find('other-source').hidden=!(cambrian||id==='jurassic');
    find('other-source').href=other.url;find('other-source').textContent=other.name+' ↗';
    find('peat-source').hidden=id!=='coal';
    find('back').textContent=back?'回到'+back.name+' ↗':cambrian?'返回现代河口到深海 ↗':'返回三条环境线 ↗';
  }
  function select(i){index=i;sectionView=false;diveView=diveView&&!!current()?.dive;render();mark();}
  function changeCase(value,context={}){
    id=value;
    phase=Object.hasOwn(period().phases,context.phase)?context.phase:period().start;
    bedView=false;
    diveView=context.view==='dive';
    find('phases').innerHTML=Object.entries(period().phases).map(([key,state])=>
      `<button type="button" data-deep-phase="${key}">${state.name}</button>`).join('');
    find('stop').innerHTML='<option value="">全线</option>'+period().stops.map(p=>
      `<option value="${p.id}">${p.name}</option>`).join('');
    select(period().stops.findIndex(p=>p.id===context.station));
  }
  panel.querySelectorAll('[data-deep-case]').forEach(b=>b.addEventListener('click',()=>{
    const next=b.dataset.deepCase;
    const linked=isPaleoWetland(id)&&isPaleoWetland(next)||isMesozoicRiver(id)&&isMesozoicRiver(next);
    changeCase(next,linked?{station:current()?.id,phase:phase==='now'?'now':undefined}:{});
  }));
  find('phases').addEventListener('click',event=>{
    const button=event.target.closest('[data-deep-phase]');
    if(!button)return;
    phase=button.dataset.deepPhase;
    if(phase==='now'){bedView=false;diveView=false;}
    render();
  });
  find('stop').addEventListener('change',event=>select(period().stops.findIndex(p=>p.id===event.target.value)));
  find('prev').addEventListener('click',()=>select(index-1));
  find('next').addEventListener('click',()=>select(index===period().stops.length-1?-1:index+1));
  find('all').addEventListener('click',()=>select(-1));
  find('bed').addEventListener('click',()=>{bedView=!bedView;diveView=false;render();});
  find('dive').addEventListener('click',()=>{diveView=!diveView;bedView=false;render();});
  find('replay').addEventListener('click',()=>study.replay());
  find('section').addEventListener('click',()=>{
    if(sectionView)sectionView=false;
    else{
      index=period().stops.findIndex(p=>p.id===period().sectionStation);
      sectionView=true;bedView=false;
      mark();
    }
    render();
  });
  find('back').addEventListener('click',()=>onBack(back??(id==='cambrian'?{mode:'coast-sea',station:index>=4?'shelf':'rock'}:
    isPaleoWetland(id)?{focus:'water',station:'wetland'}:isMesozoicRiver(id)?{focus:'water',station:'valley'}:
      {focus:id==='forest'?'warmth':'inland'})));
  return {
    show(context={}){
      active=true;labels.hidden=false;back=context.back??null;
      const selected=Object.hasOwn(deepTimeCases,context.case)?context.case:
        context.focus==='water'?'devonian':context.focus==='warmth'?'forest':'seaway';
      changeCase(selected,context);
    },
    hide(){active=false;study.hide();labels.hidden=true;},
    update(dt){study.update(dt);},
    diveCheck(eye,target){return diving()?cambrianDiveClear(eye,target):undefined;},
    get hour(){return phase==='night'?23.4:phase==='day'?8.1:11.4;},
    get view(){
      const p=current(),c=period();
      if(!p)return [...c.center,...(c.overview??(id==='forest'?[20,1040]:[15,2470])),Math.PI*.55];
      // Keep a fixed framing baseline within each ancient landscape so comparing water levels keeps the user's camera.
      const reference=deepTimePoint(id,phase==='now'?'now':c.start,p.x,p.z);
      const y=bedView?reference.bed:Math.max(reference.bed,reference.level??reference.bed);
      if(diving()){
        const {eye,target,style}=cambrianDive(phase,p);
        return [p.x,p.z,target.y,p.range,undefined,{...eye,...style}];
      }
      if(id==='cambrian'&&phase!=='now'){
        if(bedView)return [p.x,p.z,y,p.range,Math.PI*.65];
        return [p.x,p.z,y,p.range,undefined,{x:p.x+116,y:111,z:p.z+120,targetY:y}];
      }
      if(isMesozoicRiver(id)&&phase!=='now'){
        if(p.id==='bar')return [p.x,p.z,y,p.range,undefined,{x:p.x+45,y:y+20,z:p.z+58,targetY:y+1.4}];
        if(p.id==='shore')return [p.x,p.z,y,p.range,undefined,{x:p.x+68,y:y+31,z:p.z-76,targetY:y+.8}];
      }
      if(isPaleoWetland(id)&&phase!=='now'){
        const section=sectionView&&p.id===c.sectionStation;
        const near=section||p.id==='roots'||p.id==='pool';
        if(near)return [p.x,p.z,y,p.range,undefined,{
          x:p.x+(section?5:-14),y:y+(section?12:25),z:p.z+(section?41:69),targetY:y+(section?2:4)
        }];
      }
      if(id==='forest'&&['canopy','peat','floodplain'].includes(p.id)){
        return [p.x,p.z,y,p.range,Math.PI*.55,{x:p.x-16,y:y+16,z:p.z+54,targetY:y+7}];
      }
      return [p.x,p.z,y,p.range,Math.PI*.55];
    },
    project(camera){
      if(!active)return;
      study.conceal();
      const side=panel.closest('#world-plan-panel').getBoundingClientRect();
      for(const {p,node} of markers){
        const q=deepTimePoint(id,phase,p.x,p.z);
        vector.set(p.x,(bedView?q.bed:Math.max(q.bed,q.level??q.bed))+(current()?11:25),p.z).project(camera);
        const x=innerWidth*(.5+.5*vector.x),y=innerHeight*(.5-.5*vector.y);
        node.hidden=diving()||(sectionView&&phase!=='now')||x<60||x>innerWidth-60||y<56||y>innerHeight-30||vector.z< -1||vector.z>1||
          x>side.left-60&&x<side.right+60&&y>side.top&&y<side.bottom;
        node.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
      }
    }
  };
}

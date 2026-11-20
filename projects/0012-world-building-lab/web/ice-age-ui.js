import {Vector3} from 'three';
import {comparisonBed,epochs,heightOnGrid,iceAdvanceIds,iceAgeSources,iceAgeStation,paleoCover} from './ice-age.js';

const routeLabels=[
  ['all','全图'],['water','顺水'],['warmth','南北冷暖'],['inland','海岸到内陆']
];
const routeReading={
  water:'沿冰碛湖追到中央海湾。橙圈随每期的入海口移动。',
  warmth:'对照北部冻原、混交林坡和南部湿谷，观察林带在冷暖变化中如何收缩与恢复。',
  inland:'看西南浅岸和东南陆架何时出露、何时被海水覆盖。橙圈标出西南河口。'
};
const iceAdvance=['interglacial',...iceAdvanceIds,'glacial'];
const timeGroups=[
  ['入冰与扩张',iceAdvance],
  ['退冰至今',Object.keys(epochs).slice(iceAdvance.length)]
];
const labels=[
  ['water','snow'],['water','bay'],['water','outer'],['warmth','polar'],['warmth','mixed'],
  ['warmth','forest'],['inland','coast'],['inland','east-shelf']
];

export function mountIceAge(panel,scene,onBack,onLegacy){
  panel.innerHTML=`
    <div class="epoch-heading"><h3>从末次间冰期到现在</h3><span>同坐标对照</span></div>
    <div class="epoch-timeline" role="group" aria-label="按时间节点切换">
      ${timeGroups.map(([name,ids])=>`<div class="epoch-phase" role="group" aria-label="${name}">
        <span>${name}</span>
        <div class="epoch-nodes">
          ${ids.map(id=>{
            const period=epochs[id],label=id==='interglacial'?period.name:period.age??period.name;
            return `<button type="button" data-epoch="${id}" aria-label="${label}" title="${period.name}">${period.label}</button>`;
          }).join('')}
        </div>
      </div>`).join('')}
    </div>
    <p id="epoch-sea-level" class="epoch-datum" aria-live="polite"></p>
    <div class="epoch-controls" role="group" aria-label="沿三条环境线观察">
      ${routeLabels.map(([id,name])=>`<button data-epoch-route="${id}" type="button">${name}</button>`).join('')}
    </div>
    <div id="epoch-navigation" class="epoch-navigation" hidden>
      <label for="epoch-stop">观察点</label>
      <select id="epoch-stop"></select>
      <button id="epoch-prev" type="button" aria-label="上一站">←</button>
      <button id="epoch-next" type="button" aria-label="下一站">→</button>
    </div>
    <p id="epoch-explanation" class="plan-present" aria-live="polite"></p>
    <p id="epoch-route-reading" class="plan-note" hidden></p>
    <label id="epoch-reference-label"><input id="epoch-reference" type="checkbox" checked> 叠加现在的岸线</label>
    <ul class="epoch-legend" aria-label="场景图例">
      <li data-ice-key><i style="--key:#94f2ef"></i>当期岸线</li>
      <li id="epoch-present-key"><i style="--key:#f2d093"></i>现在岸线</li>
      <li><i style="--key:#ffb76f"></i>当期入海口</li>
      <li id="epoch-highstand-key" hidden><i style="--key:#80b5b0"></i>暖期淹没的现今低地</li>
      <li data-ice-key><i style="--key:#66bcc5"></i>河槽与融水</li>
      ${Object.entries(paleoCover).map(([id,{name,color}])=>`<li data-ice-key data-cover-key="${id}"><i style="--key:${color}"></i>${name}</li>`).join('')}
    </ul>
    <button id="epoch-legacy" type="button">沿冰期地貌遗存走一遍 ↗</button>
    <button id="epoch-back" type="button">回地理底图 ↗</button>
    <details class="epoch-sources">
      <summary>比例与资料</summary>
      <p>间冰期场景海面取 +8 米，盛冰期约 −134 米的全球参考值压缩为 −48 米。五个入冰节点的水位取全球海平面重建值，并按盛冰期比例压缩、取整。十二帧共用地图坐标，局地冰缘和植被为教学场景参数。</p>
      <ul>${iceAgeSources.map(({name,url})=>`<li><a href="${url}">${name} ↗</a></li>`).join('')}</ul>
    </details>`;
  const find=id=>panel.querySelector('#epoch-'+id);
  const eraButtons=panel.querySelectorAll('[data-epoch]');
  const routeButtons=panel.querySelectorAll('[data-epoch-route]');
  const select=find('stop'),previous=find('prev'),next=find('next'),reference=find('reference');
  const document=panel.ownerDocument,overlay=document.createElement('div'),vector=new Vector3();
  overlay.id='epoch-map-labels';overlay.hidden=true;overlay.setAttribute('aria-hidden','true');
  document.body.append(overlay);
  let active=false,epoch='glacial',route=null,index=0,routes=[],back,annotations=[],view=null;

  function station(){return route?.stops[index];}
  function placeMarkers(frame){
    const points=route?[station(),...route.stops.filter(p=>p!==station())]:
      labels.map(([routeId,stopId])=>routes.find(r=>r.id===routeId).stops.find(p=>p.id===stopId));
    const mouths=[['water','central','中央河口'],['inland','south','西南河口']];
    const markers=mouths.filter(([line])=>!route||route.id===line)
      .map(([,id,name])=>({p:frame.mouths[id],name,mouth:true}));
    annotations=[...points,...markers].map((point,i)=>{
      const node=document.createElement('span');
      node.textContent=point.name;
      if(route&&i===0)node.dataset.selected='true';
      if(point.mouth)node.dataset.mouth='true';
      const {x,z}=point.p;
      return {node,x,z,y:Math.max(frame.epoch.sea,heightOnGrid(frame.grid,frame.surface,x,z))+18};
    });
    overlay.replaceChildren(...annotations.map(({node})=>node));
  }
  function paint(){
    eraButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.epoch===epoch)));
    routeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.epochRoute===(route?.id??'all'))));
    const past=epoch!=='now',point=station(),period=epochs[epoch];
    const frame=scene.show(epoch,reference.checked,route?.id);
    const sea=period.sea===0?'0':`${period.sea>0?'+':'−'}${Math.abs(period.sea)}`;
    const when=period.age?`${period.age} · ${period.name}`:period.name;
    find('sea-level').textContent=`${when} · 场景海面 ${sea} m`;
    const endpoint=point&&(epoch==='glacial'?point.cold:epoch==='now'?point.now:null);
    const observed=point?iceAgeStation(frame,point):'';
    const description=epoch==='interglacial'?(point?.interglacial??period.summary):period.summary;
    find('explanation').textContent=endpoint??[description,observed].filter(Boolean).join(' ');
    find('route-reading').hidden=!route;
    find('route-reading').textContent=routeReading[route?.id]??'';
    find('navigation').hidden=!route;
    select.value=String(index);
    previous.disabled=!route||index===0;
    next.disabled=!route||index===route.stops.length-1;
    find('reference-label').hidden=!past;
    find('present-key').hidden=past&&!reference.checked;
    find('highstand-key').hidden=epoch!=='interglacial';
    for(const key of panel.querySelectorAll('[data-ice-key]')){
      key.hidden=!past||Boolean(key.dataset.coverKey&&!frame.coverTypes.has(key.dataset.coverKey));
    }
    placeMarkers(frame);
  }
  function move(to){
    index=to;
    const point=station();
    view=point?[point.p.x,point.p.z,Math.max(0,comparisonBed(point.p.x,point.p.z)),point.distance]:
      [0,0,35,4150,Math.PI/2];
    paint();
  }
  function choose(id,stopId){
    route=routes.find(line=>line.id===id)??null;
    select.replaceChildren(...(route?.stops.map((point,i)=>{
      const option=document.createElement('option');option.value=String(i);option.textContent=point.name;return option;
    })??[]));
    move(Math.max(0,route?.stops.findIndex(p=>p.id===stopId)??0));
  }
  eraButtons.forEach(b=>b.addEventListener('click',()=>{epoch=b.dataset.epoch;paint();}));
  routeButtons.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.epochRoute)));
  select.addEventListener('change',()=>move(Number(select.value)));
  previous.addEventListener('click',()=>move(index-1));
  next.addEventListener('click',()=>move(index+1));
  reference.addEventListener('change',paint);
  find('legacy').hidden=!onLegacy;
  find('legacy').addEventListener('click',()=>{
    const related={snow:'ice-edge','ice-lake':'lake',source:'moraine','tidal-bank':'wetland',bay:'inner',outer:'outer'};
    const point=station()?.id;
    onLegacy?.({epoch,station:route?.id==='water'?related[point]:null,
      back:{mode:'timeline',name:'史前气候',focus:route?.id,station:point,epoch,back}});
  });
  find('back').addEventListener('click',()=>onBack(back??{focus:route?.id,station:station()?.id}));
  return {
    show(context={}){
      routes=scene.prepare().routes;
      back=context.back;active=true;overlay.hidden=false;
      epoch=Object.hasOwn(epochs,context.epoch)?context.epoch:'glacial';
      choose(context.focus,context.station??back?.station);
    },
    hide(){active=false;overlay.hidden=true;scene.hide();},
    project(camera){
      if(!active)return;
      scene.update();
      const {innerWidth:width,innerHeight:height}=document.defaultView;
      const bound=panel.closest('#world-plan-panel').getBoundingClientRect(),occupied=[];
      for(const {node,x,y,z} of annotations){
        const p=vector.set(x,y,z).project(camera);
        const u=(p.x*.5+.5)*width,v=(.5-p.y*.5)*height;
        const coversPanel=u>bound.left-58&&u<bound.right+58&&v>bound.top-14&&v<bound.bottom+14;
        node.hidden=p.z< -1||p.z>1||u<60||u>width-60||v<72||v>height-42||coversPanel||
          occupied.some(([a,b])=>Math.abs(a-u)<108&&Math.abs(b-v)<27);
        if(!node.hidden){
          node.style.transform=`translate(${u}px,${v}px) translate(-50%,-50%)`;
          occupied.push([u,v]);
        }
      }
    },
    get view(){return active?view:null;}
  };
}

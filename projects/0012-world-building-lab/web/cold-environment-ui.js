import {Vector3} from 'three';
import {terrainHeight} from './large-world.js';
import {iceSample} from './glacial-geography.js';
import {activeLayer,coldBandNames,coldColors,coldReading,coldRoutes,coldSeasons,coldSurface,glacierCrossSection} from './cold-environment.js';
import {createColdEnvironmentScene} from './cold-environment-scene.js';

const metres=n=>Math.round(n).toLocaleString('zh-CN')+' m';
const fmt=(n,d=3)=>n.toFixed(d);
const layers=[['climate','林线与雪储'],['section','地层与谷床'],['land','原地对照']];
const sourceLinks=[
  ['USGS · 冻土、活动层和冰楔','https://pubs.usgs.gov/ha/ha730/ch_n/N-AKtext1.html'],
  ['NPS · 冰斗和冰川谷','https://www.nps.gov/glba/learn/nature/anatomy-of-a-glacier.htm']
];

function drawSection(canvas,profile,cross){
  const g=canvas.getContext('2d'),{width,height}=canvas;
  g.clearRect(0,0,width,height);
  const values=profile.map(p=>p.y),lo=Math.floor(Math.min(...values)/20)*20-5;
  const hi=Math.ceil(Math.max(...profile.map(p=>cross?p.ice:p.y))/20)*20;
  const distance=profile.at(-1).metres;
  const x=p=>43+(width-62)*p.metres/distance;
  const y=value=>height-34-(height-60)*(value-lo)/(hi-lo);
  g.font='20px system-ui';g.fillStyle='#dce6d9';g.strokeStyle='#829b9366';g.lineWidth=1;
  for(const datum of [lo,hi]){
    const at=y(datum);
    g.beginPath();g.moveTo(43,at);g.lineTo(width-15,at);g.stroke();
    g.fillText(Math.round(datum),2,at-4);
  }
  g.fillText('0',43,height-7);g.textAlign='right';g.fillText(metres(distance),width-14,height-7);g.textAlign='left';
  g.fillStyle='#b69874';g.beginPath();
  profile.forEach(p=>g.lineTo(x(p),y(p.y)));
  g.lineTo(x(profile.at(-1)),y(lo));g.lineTo(x(profile[0]),y(lo));g.closePath();g.fill();
  if(cross){
    g.fillStyle='#97d6f2';g.beginPath();
    profile.forEach(p=>g.lineTo(x(p),y(p.ice)));
    for(let i=profile.length-1;i>=0;i--)g.lineTo(x(profile[i]),y(profile[i].y));
    g.closePath();g.fill();
  }
  g.strokeStyle='#ffe2b8';g.lineWidth=2;g.beginPath();
  profile.forEach(p=>g.lineTo(x(p),y(p.y)));g.stroke();
}

export function mountColdEnvironment(panel,scene,onBack){
  const draw=createColdEnvironmentScene(scene);
  panel.innerHTML=`
    <div class="formation-actions" aria-label="冷环境观察路线">
      <button type="button" data-cold-route="">两线全图</button>
      ${coldRoutes.map(r=>`<button type="button" data-cold-route="${r.id}">${r.name}</button>`).join('')}
    </div>
    <p id="cold-status" class="plan-present" role="status"></p>
    <div class="cold-compare" id="cold-compare"></div>
    <div id="cold-observation" hidden>
      <div class="cold-nav">
        <select id="cold-stop" aria-label="沿线定位"></select>
        <button id="cold-prev" type="button" aria-label="上一站">←</button>
        <button id="cold-next" type="button" aria-label="下一站">下一站 →</button>
      </div>
    </div>
    <div class="formation-actions" aria-label="季节对照">
      ${Object.entries(coldSeasons).map(([id,s])=>`<button type="button" data-cold-season="${id}">${s.label}</button>`).join('')}
    </div>
    <div class="formation-actions" aria-label="场景显示">
      ${layers.map(([id,label])=>`<button type="button" data-cold-layer="${id}">${label}</button>`).join('')}
    </div>
    <p id="cold-detail" class="plan-note" hidden></p>
    <ul id="cold-legend" class="gw-rock-legend" aria-label="地图图例"></ul>
    <dl id="cold-readings" class="cold-readings" hidden></dl>
    <figure id="cold-figure" hidden>
      <canvas id="cold-profile" width="640" height="192" role="img"></canvas>
      <figcaption id="cold-caption"></figcaption>
    </figure>
    <p class="plan-note" id="cold-scope"></p>
    <div class="plan-sources">${sourceLinks.map(([label,url])=>`<a href="${url}" target="_blank" rel="noopener">${label} ↗</a>`).join('')}</div>
    <button id="cold-back" type="button">返回三条环境线 ↗</button>`;
  const find=id=>panel.querySelector('#cold-'+id),doc=panel.ownerDocument;
  const pick=name=>[...panel.querySelectorAll('[data-cold-'+name+']')];
  const routeButtons=pick('route'),seasonButtons=pick('season'),layerButtons=pick('layer');
  const labels=doc.createElement('div'),vector=new Vector3();
  labels.className='basin-event-map-labels';labels.hidden=true;labels.setAttribute('aria-hidden','true');doc.body.append(labels);
  let route=null,index=0,season='summer',layer='climate',back=null,shown=false,markers=[];
  const stop=()=>route?.stops[index];
  const setPressed=(buttons,key,id)=>buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===id)));
  function markLocations(){
    const targets=route?[{p:stop(),name:stop().name,color:route.color}]:coldRoutes.map(r=>({
      p:r.stops[r.id==='north'?1:4],name:r.name,color:r.color
    }));
    markers=targets.map(({p,name,color})=>{
      const el=doc.createElement('span');el.textContent=name;el.style.setProperty('--basin-color',color);
      return {el,p};
    });
    labels.replaceChildren(...markers.map(m=>m.el));
  }

  function render(){
    const p=stop(),scope=find('scope'),legend=find('legend'),readings=find('readings');
    const response=draw.show({route:route?.id,stop:p?.id,season,layer});
    find('status').textContent=p?.name??'北部冷岸到高山';
    if(!route){
      const coast=coldReading(coldRoutes[0].stops[1],season),ridge=coldReading(coldRoutes[1].stops[3],season);
      find('compare').textContent=`北岸苔原在 ${metres(coast.y)} 处就偏冷，主要受北向位置影响。雪岭雪斑在 ${metres(ridge.y)} 处，海拔使原本较暖的地带进入更冷环境。`;
    }
    find('compare').hidden=!!route;find('observation').hidden=!route;
    setPressed(routeButtons,'coldRoute',route?.id??'');
    setPressed(seasonButtons,'coldSeason',season);
    setPressed(layerButtons,'coldLayer',layer);
    find('back').textContent=back?`回到${back.name} ↗`:'返回三条环境线 ↗';
    const keys=layer==='land'?coldRoutes.map(r=>[r.color,r.name]):
      layer==='section'&&p?.id==='tundra'?[['#9c805e','活动层'],['#597f91','常年冻土'],['#a6deeb','冰楔']]:
      layer==='section'&&p?.id==='trough'?[['#ffd9a6','冰下谷床'],['#97d6f2','现有冰体']]:
      Object.entries(coldColors).filter(([k])=>k!=='snow'||!!p&&layer==='climate').map(([k,c])=>[c,coldBandNames[k]]);
    legend.innerHTML=keys.map(([color,label])=>`<li><i style="--swatch:${color}"></i>${label}</li>`).join('');
    scope.textContent='冷暖与雪储是场景相对量。林线色带表示适生条件，实际林冠还受土壤、水分和坡向影响。';
    readings.hidden=!p;find('detail').hidden=!p;find('figure').hidden=!p||layer==='land';
    if(!p)return;
    const r=coldReading(p,season),geometry=coldSurface(p.x,p.z,r.y);
    const row=(name,v)=>`<div><dt>${name}</dt><dd>${v}</dd></div>`;
    readings.innerHTML=row(r.y<0?'海面下床底':'地表高程',metres(r.y))+
      row('北向冷暖背景',fmt(r.latitude))+row('高程冷却扣减','−'+fmt(r.cooling))+
      row('合成相对冷暖',fmt(r.warmth))+row('当月雪储指数',fmt(r.snow))+
      (p.surface===undefined?'':row('水面／冰面高程',metres(p.surface)))+
      (p.id==='snowline'?row('原场景该点雪覆盖',geometry.snowDepth>0?'有雪斑':'裸岩'):'')+
      (p.id==='tundra'?row(season==='winter'?'表层冻结':'活动层厚度',
        season==='winter'?'近全冻':fmt(activeLayer(season,r.warmth),2)+' m'):'');
    find('detail').textContent=p.detail;
    find('stop').value=p.id;find('prev').disabled=index===0;
    find('next').textContent=index<route.stops.length-1?'下一站 →':route.id==='north'?'去高山带 ↗':'回两线全图 ↗';
    if(layer==='section'&&p.id==='tundra'){
      scope.textContent='棕层为可季节冻融的表层，蓝灰层为常年冻土。剖面厚度放大显示，冰楔和活动层尺度为示意。';
    }
    if(!find('figure').hidden){
      const cross=layer==='section'&&p.id==='trough',canvas=find('profile');
      canvas.setAttribute('aria-label',cross?'冰川实际横向谷床与冰体厚度':'线路地表高程剖面');
      find('caption').textContent=cross?'冰下横切 · 床底和冰面共用地图高程':'沿线高程，单位为米';
      drawSection(canvas,cross?glacierCrossSection():response.plot.points,cross);
    }
  }
  function select(id,station=null){
    const value=coldRoutes.find(r=>r.id===id)??null;
    if(value!==route&&value)find('stop').innerHTML=value.stops.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    route=value;index=Math.max(0,route?.stops.findIndex(p=>p.id===station)??0);
    const feature=stop()?.id;
    if(['tundra','trough'].includes(feature))layer='section';
    else if(feature==='snowline')layer='climate';
    render();markLocations();
  }
  routeButtons.forEach(b=>b.addEventListener('click',()=>select(b.dataset.coldRoute)));
  seasonButtons.forEach(b=>b.addEventListener('click',()=>{season=b.dataset.coldSeason;render();}));
  layerButtons.forEach(b=>b.addEventListener('click',()=>{layer=b.dataset.coldLayer;render();}));
  find('stop').addEventListener('change',e=>select(route.id,e.target.value));
  find('prev').addEventListener('click',()=>{if(index>0)select(route.id,route.stops[index-1].id);});
  find('next').addEventListener('click',()=>{
    const next=route.stops[index+1];
    if(next)select(route.id,next.id);
    else select(route.id==='north'?'alpine':'');
  });
  find('back').addEventListener('click',()=>onBack(back??{focus:'warmth'}));
  return {
    show(context={}){
      shown=true;labels.hidden=false;back=context.back??null;
      const month=Number(context.month);
      season=month>0&&(month<=3||month>=11)?'winter':'summer';layer='climate';
      const id=context.focus??'',station=context.station;
      select(id,station);
    },
    hide(){shown=false;labels.hidden=true;draw.hide();},
    get view(){
      const p=stop();
      if(!p)return [-85,-1005,110,innerWidth<700?2940:2480,Math.PI/2];
      const cross=p.id==='trough'?iceSample(.35):null;
      const azimuth=cross?Math.atan2(cross.dz,cross.dx):p.id==='tundra'?Math.PI*.53:undefined;
      return [p.x,p.z,p.surface??Math.max(0,terrainHeight(p.x,p.z)),p.range,azimuth];
    },
    project(camera){
      if(!shown)return;
      const panelBox=panel.closest('#world-plan-panel').getBoundingClientRect();
      for(const {p,el} of markers){
        vector.set(p.x,(p.surface??Math.max(0,terrainHeight(p.x,p.z)))+(p.range<100?4:24),p.z).project(camera);
        const x=innerWidth*(.5+vector.x*.5),y=innerHeight*(.5-vector.y*.5);
        el.hidden=x<72||x>innerWidth-72||y<62||y>innerHeight-30||vector.z< -1||vector.z>1||
          x>panelBox.left-60&&x<panelBox.right+60&&y>panelBox.top-8&&y<panelBox.bottom;
        el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
      }
    }
  };
}

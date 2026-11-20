import {Vector3} from 'three';
import {environmentLines,pointAt,stopClimate} from './environment-lines.js';
import {lineThemes} from './environment-lines-scene.js';
import {environmentGeology} from './tectonic-layout.js';
import {groundwaterLinks,lithologyLegend} from './groundwater-layout.js';
import {exchangeLayers,exchangeLinks} from './water-exchange.js';
import {wetlandBands,wetlandLinks} from './wetland-layout.js';
import {estuaryLinks} from './estuary-layout.js';
import {stormLinks} from './basin-storm.js';
import {foundationScale,foundationSeams} from './geographic-foundation.js';
import {lineFormation} from './world-formation.js';

const metres=value=>Math.round(value).toLocaleString('zh-CN')+' m';
const index=value=>Math.round(value*100);
const lineHelp='青白线标海陆，金线标主山脊，紫实线标流域分界，浅紫虚线标估算的局地分水界，橙色箭头标水汽来向。';

function profileChart(canvas,route,active,passage){
  const context=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const left=40,right=w-14,top=13,bottom=h-24;
  const heights=route.points.map(p=>route.id==='water'?p.level:p.y);
  const floor=Math.min(0,...heights),ceiling=Math.max(10,...heights);
  const px=d=>left+d/route.length*(right-left);
  const py=y=>bottom-(y-floor)/(ceiling-floor)*(bottom-top);
  context.clearRect(0,0,w,h);
  context.font='11px system-ui';
  context.fillStyle='#c0cab5';context.textAlign='left';
  context.fillText(metres(ceiling),1,top+3);context.fillText(metres(floor),1,bottom+3);
  context.strokeStyle='#acbfa254';context.beginPath();
  context.moveTo(left,py(0));context.lineTo(right,py(0));context.stroke();
  if(floor<0)context.fillText('0 m',1,py(0)+3);
  const drawProfile=(color,dashes=[])=>{
    context.beginPath();context.moveTo(px(0),py(heights[0]));
    route.points.forEach(({distance},i)=>context.lineTo(px(distance),py(heights[i])));
    context.strokeStyle=color;context.lineWidth=2;context.setLineDash(dashes);context.stroke();
  };
  if(passage){
    for(const run of passage.runs){
      const start=px(run.points[0].at),end=px(run.points.at(-1).at);
      context.save();context.beginPath();context.rect(start,0,end-start,h);context.clip();
      if(run.method==='walk')drawProfile('#adf4b2');
      else drawProfile('#ffd898',[4,3]);
      context.restore();
    }
  }else drawProfile(route.color);
  context.fillStyle='#e8e6bf';
  for(const station of route.stations){
    context.beginPath();
    context.arc(px(station.at),py(route.id==='water'?station.level:station.y),station===active?5:3,0,Math.PI*2);
    context.fill();
  }
  context.fillStyle='#c0cab5';context.fillText('起点',left,h-6);
  context.textAlign='right';context.fillText(metres(route.length),right,h-6);
}

export function mountEnvironmentLines(panel,scene,{reduced,onTopic,onGeology,onLithology,onExchange,updateExchange,onWetland,onEstuary,stormStatus,onBenchmark,onSeamWalk}){
  panel.innerHTML=`
    <div class="environment-route-buttons" aria-label="三条环境观察线">
      ${environmentLines.map(({id,name,color})=>`<button type="button" data-environment-route="${id}" style="--route-color:${color}" aria-pressed="false">${name}</button>`).join('')}
    </div>
    <div class="line-actions">
      <button id="line-map" type="button">三线全图</button>
      <button id="line-prev" type="button">上一站</button>
      <button id="line-play" type="button" aria-pressed="false">沿线航拍</button>
      <button id="line-next" type="button">下一站 →</button>
    </div>
    <p id="line-summary" class="plan-present" role="status"></p>
    <button id="line-benchmark" type="button">实走雪岭到海湾 ↗</button>
    <button id="line-world-formation" type="button">用同一规则对照三流域 ↗</button>
    <button id="line-ridge-bay" type="button">沿顺水线读雪岭到海湾剖面 ↗</button>
    <button id="line-basin-event" type="button">看同一场雨在三流域的去向 ↗</button>
    <button id="line-basin-divide" type="button">沿分水坡看入渗与泉口 ↗</button>
    <button id="line-cold" type="button">对照北岸林缘与高山林线 ↗</button>
    <button id="line-rain-shadow" type="button">对照迎背风坡的雨季与旱季 ↗</button>
    <button id="line-coast-sea" type="button">沿河口与岩岸下潜到深海 ↗</button>
    <button id="line-fluid-vents" type="button">对照海底与陆上流体出露 ↗</button>
    <button id="line-deep-time" type="button">对照古海道与高纬暖湿林 ↗</button>
    <button id="line-paleo-wetlands" type="button">从早期森林看到煤系沼泽 ↗</button>
    <button id="line-mesozoic-river" type="button">看古河洪泛与季节湖泊 ↗</button>
    <button id="line-legacy" type="button">追踪冰退后留下的地貌 ↗</button>
    <button id="line-ice-age" type="button">沿这条线切换气候时期 ↗</button>
    <p class="plan-note line-scale">东西 ${(foundationScale.width/1000).toFixed(2)} km · 南北 ${(foundationScale.depth/1000).toFixed(2)} km · 1 地图单位 = 1 m</p>
    <div class="line-seam-controls">
      <label for="line-seam">接缝定位</label>
      <select id="line-seam"><option value="">全图</option>${foundationSeams.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select>
      <a href="journey.html#geographic-foundation">看平面底图 ↗</a>
    </div>
    <div id="line-related-seams" class="line-related-seams" hidden></div>
    <div id="line-seam-reading" hidden>
      <p id="line-seam-reason" class="plan-note"></p>
      <p id="line-seam-connection" class="plan-note"></p>
      <p id="line-seam-check" class="plan-note"></p>
      <p id="line-seam-passage" class="plan-note" aria-live="polite"></p>
      <div class="line-related-seams">
        <button id="line-seam-walk" type="button" hidden>到可步行段试走 ↗</button>
        <button id="line-back-route" type="button"></button>
        <button id="line-sea-bed" type="button" aria-pressed="false" hidden>显示海床</button>
      </div>
      <figure class="line-section-profile">
        <figcaption>同一剖面 · 绿色实线可步行 · 金色虚线用航拍</figcaption>
        <canvas id="line-seam-profile" width="360" height="145" role="img" aria-label="当前接缝的真实 3D 地面高程剖面"></canvas>
      </figure>
    </div>
    <div class="line-storm-entry">
      <button id="line-storm" type="button">同一场雨的潮汐对照 ↗</button>
      <button id="line-shore" type="button">泥沙与岸线 ↗</button>
      <button id="line-plants" type="button">滩地植被 ↗</button>
      <button id="line-sea" type="button">海面与风暴潮 ↗</button>
      <span id="line-storm-status" hidden></span>
    </div>
    <p id="line-lesson" class="plan-note"></p>
    <div class="line-themes" aria-label="地图标记">
      ${lineThemes.map(({id,name,color})=>`<button type="button" data-line-theme="${id}" style="--route-color:${color}" aria-pressed="true"><i></i>${name}</button>`).join('')}
    </div>
    <div class="line-month">
      <span id="line-wind"></span>
      <button data-line-month="1" type="button" aria-pressed="false">1 月</button>
      <button data-line-month="7" type="button" aria-pressed="true">7 月</button>
    </div>
    <div id="line-route-detail" hidden>
      <label for="line-stop">沿线站点</label>
      <select id="line-stop"></select>
      <canvas id="line-profile" width="334" height="106" aria-label="沿线地势剖面"></canvas>
      <dl id="line-measures" class="balance-values"></dl>
    </div>
    <p class="plan-note">航拍沿线定位。分水界由 40 米格网估算，冷暖、湿润和降雨使用场景指数。</p>
    <button id="line-topic" type="button">看同月流域收支 ↗</button>
    <div class="line-geology">
      <p id="line-geology-note" class="plan-note"></p>
      <div class="tectonic-actions">
        <button id="line-geology-overlay" type="button" aria-pressed="false">叠加地质标记</button>
        <button id="line-geology" type="button">看地质骨架 ↗</button>
      </div>
    </div>
    <div class="line-geology line-lithology">
      <p id="line-groundwater-note" class="plan-note"></p>
      <div class="tectonic-actions">
        <button id="line-lithology" type="button" aria-pressed="false">叠加岩性</button>
        <button id="line-groundwater" type="button">看岩性与地下水 ↗</button>
      </div>
      <ul id="line-rock-key" class="gw-rock-legend" aria-label="岩性着色图例" hidden>
        ${lithologyLegend.map(({id,color,name})=>`<li><i style="--swatch:${color}" data-cover="${id==='alluvium'}"></i>${name}</li>`).join('')}
      </ul>
      <div class="tectonic-actions">
        <button id="line-exchange-overlay" type="button" aria-pressed="false">叠加两条水路</button>
        <button id="line-exchange" type="button">看水路汇合 ↗</button>
      </div>
      <ul id="line-exchange-key" class="gw-rock-legend" aria-label="两条水路图例" hidden>
        ${exchangeLayers.map(({color,name})=>`<li><i style="--swatch:${color}"></i>${name}</li>`).join('')}
      </ul>
      <div class="tectonic-actions">
        <button id="line-wetland-overlay" type="button" aria-pressed="false">叠加湿地分带</button>
        <button id="line-wetland" type="button">看湿地洪泛与退水 ↗</button>
      </div>
      <ul id="line-wetland-key" class="gw-rock-legend" aria-label="湿地分带图例" hidden>
        ${Object.values(wetlandBands).map(({color,name})=>`<li><i style="--swatch:${color}"></i>${name}</li>`).join('')}
      </ul>
      <div class="tectonic-actions">
        <button id="line-estuary-overlay" type="button" aria-pressed="false">标出河口潮界</button>
        <button id="line-estuary" type="button">看潮汐与咸淡水 ↗</button>
      </div>
      <p id="line-estuary-note" class="plan-note" hidden>标记为当前月份的高潮参考。可进河口视角切换潮段。</p>
    </div>
  `;
  const find=id=>panel.querySelector('#line-'+id);
  const routeButtons=panel.querySelectorAll('[data-environment-route]');
  const themes=panel.querySelectorAll('[data-line-theme]');
  const months=panel.querySelectorAll('[data-line-month]');
  const select=find('stop'),play=find('play'),previous=find('prev'),next=find('next');
  const overlay=panel.ownerDocument.createElement('div');
  overlay.id='environment-route-labels';overlay.hidden=true;overlay.setAttribute('aria-hidden','true');
  panel.ownerDocument.body.append(overlay);
  const enabled=new Set(lineThemes.map(t=>t.id));
  const projected=new Vector3();
  let route=null,seam=null,seaBed=false,active=false,month=7,stationIndex=-1,playing=false,flight=null,hold=0,annotations=[],walkSpan=null;
  let labelNodes=[];
  let showGeology=false,showLithology=false,showExchange=false,showWetland=false,showEstuary=false;

  function setLabels(labels){
    annotations=labels;
    overlay.replaceChildren(...labels.map(({text,kind})=>{
      const node=panel.ownerDocument.createElement('span');node.textContent=text;node.dataset.kind=kind;return node;
    }));
    labelNodes=Array.from(overlay.children);
  }
  function current(){return route?.stations[stationIndex]??null;}
  function geology(){
    const links=environmentGeology[route?.id];
    return links?.[current()?.id]??links?.overview??
      [undefined,'从东南海沟走到内陆山脉，对照这张地图的水系坡降、南北冷暖和迎背风地形。'];
  }
  function groundwater(){
    const links=groundwaterLinks[route?.id];
    return links?.[current()?.id]??links?.overview??
      [undefined,'比较同一场雨：岩坡走地表，砂砾渗入孔隙，泉水和洞道各有自己的补给路径。'];
  }
  function pause(){playing=false;hold=0;play.textContent='沿线航拍';play.setAttribute('aria-pressed','false');}
  function paint(){
    if(!active)return;
    const station=current(),{annotations:labels,climate,frame,wind,section,passage}=scene.show(route,station,month,enabled,seam,seaBed);
    walkSpan=passage?.longest??null;
    const geoLabels=showGeology?onGeology(true).map(p=>({...p,kind:'geology'})):[];
    const waterLabels=showExchange?onExchange(month).map(p=>({...p,kind:'exchange'})):[];
    const marshLabels=showWetland?onWetland(month).map(p=>({...p,kind:'wetland'})):[];
    const tidalLabels=showEstuary?onEstuary(month).map(p=>({...p,kind:'estuary'})):[];
    setLabels([...labels,...geoLabels,...waterLabels,...marshLabels,...tidalLabels]);
    find('geology-note').textContent=geology()[1];
    find('geology-overlay').setAttribute('aria-pressed',String(showGeology));
    onLithology(showLithology);
    find('groundwater-note').textContent=groundwater()[1];
    find('lithology').setAttribute('aria-pressed',String(showLithology));
    find('rock-key').hidden=!showLithology;
    find('exchange-key').hidden=!showExchange;
    find('exchange-overlay').setAttribute('aria-pressed',String(showExchange));
    find('wetland-overlay').setAttribute('aria-pressed',String(showWetland));
    find('wetland-key').hidden=!showWetland;
    find('estuary-overlay').setAttribute('aria-pressed',String(showEstuary));
    find('estuary-note').hidden=!showEstuary;
    const trial=stormStatus();
    find('storm-status').hidden=!trial;
    find('storm-status').textContent=trial??'';
    routeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.environmentRoute===route?.id)));
    themes.forEach(button=>button.setAttribute('aria-pressed',String(enabled.has(button.dataset.lineTheme))));
    months.forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.lineMonth)===month)));
    previous.disabled=!!seam||!route||stationIndex<0;
    next.disabled=!!seam||!route||stationIndex>=route.stations.length-1;
    play.disabled=!!seam||!route;
    find('summary').textContent=seam?.name??(station?station.name:route?route.name+' · 全线':'地理底图 · 三条线共用');
    find('seam').value=seam?.id??'';
    find('seam-reading').hidden=!seam;
    const related=find('related-seams');
    related.hidden=!!seam||!route;
    if(!related.hidden)related.innerHTML=foundationSeams.filter(s=>s.lines.includes(route.id)).map(s=>
      `<button type="button" data-route-seam="${s.id}">${s.name} ↗</button>`).join('');
    if(seam){
      find('seam-reason').textContent=seam.reason;
      find('seam-connection').textContent=seam.connection;
      find('seam-check').textContent=seam.check;
      find('seam-passage').textContent=passage
        ?`剖面实查约 ${Math.round(passage.total)} m。可连续步行的片段共 ${Math.round(passage.walked)} m，约 ${Math.round(passage.total-passage.walked)} m 跨水、遇陡坡或有阻挡，采用航拍。`
        :'';
      find('seam-walk').hidden=!walkSpan||!onSeamWalk;
      find('back-route').textContent=`返回${route.name}线`;
      find('sea-bed').hidden=seam.id!=='east';
      find('sea-bed').setAttribute('aria-pressed',String(seaBed));
      find('sea-bed').textContent=seaBed?'恢复海面':'显示海床';
      profileChart(find('seam-profile'),section,null,passage);
    }
    find('lesson').hidden=!!seam;
    find('lesson').textContent=station?.detail??route?.lead??lineHelp+' 选择一条线逐段观察。';
    find('wind').textContent=`${month} 月 · ${wind}${month===7?'与东南沿海来水汽':''}`;
    const topic=find('topic');
    topic.textContent=route?.id==='water'?'看同月流域收支 ↗':'看对应区域全年风雨 ↗';
    find('ridge-bay').hidden=!!route&&route.id!=='water';
    find('route-detail').hidden=!route||!!seam;
    if(!route||seam)return;
    select.value=String(stationIndex);
    profileChart(find('profile'),route,station);
    const readings=station?stopClimate(climate,frame,station):null;
    const values=readings?[
      [route.id==='water'?'冰面／水面参考高度':'实景地面高度',metres(station.level)],
      ['冷暖指数',index(readings.warmth)],['地表湿润指数',index(readings.wetness)],
      ['本月降雨指数',(readings.rain*100).toFixed(1)]
    ]:[['水平线长',metres(route.length)],['观察站',route.stations.length]];
    find('measures').innerHTML=values.map(([key,value])=>`<div><dt>${key}</dt><dd>${value}</dd></div>`).join('');
  }

  function choose(id,stationId,seamId){
    seam=foundationSeams.find(s=>s.id===seamId)??null;
    seaBed=false;
    const focus=seam&&!seam.lines.includes(id)?seam.lines[0]:id;
    route=scene.routes.find(r=>r.id===focus)??null;
    stationIndex=-1;flight=null;pause();
    if(route)select.innerHTML='<option value="-1">本线总览</option>'+
      route.stations.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('');
    if(stationId&&route&&!seam)stationIndex=route.stations.findIndex(s=>s.id===stationId);
    paint();
  }
  function go(index,animate=false){
    const from=current(),to=route.stations[index];
    stationIndex=index;hold=0;
    flight=animate&&!reduced&&from&&to?{from,to,t:0,duration:Math.max(1.5,Math.min(3.4,Math.abs(to.at-from.at)/125))}:null;
    paint();
  }
  routeButtons.forEach(button=>button.addEventListener('click',()=>choose(button.dataset.environmentRoute)));
  find('benchmark').addEventListener('click',()=>onBenchmark?.());
  find('seam-walk').addEventListener('click',()=>{
    if(walkSpan)onSeamWalk?.(walkSpan.points[3],walkSpan.points[24],seam.name);
  });
  themes.forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.lineTheme;
    if(enabled.has(id))enabled.delete(id);else enabled.add(id);
    paint();
  }));
  months.forEach(button=>button.addEventListener('click',()=>{month=Number(button.dataset.lineMonth);paint();}));
  find('map').addEventListener('click',()=>choose(null));
  find('seam').addEventListener('change',e=>choose(e.target.value?route?.id:null,null,e.target.value));
  find('related-seams').addEventListener('click',e=>{
    const id=e.target.closest('[data-route-seam]')?.dataset.routeSeam;
    if(id)choose(route?.id,null,id);
  });
  find('back-route').addEventListener('click',()=>choose(route?.id));
  find('sea-bed').addEventListener('click',()=>{seaBed=!seaBed;paint();});
  select.addEventListener('change',()=>{pause();go(Number(select.value));});
  previous.addEventListener('click',()=>{pause();go(stationIndex-1);});
  next.addEventListener('click',()=>{pause();go(stationIndex+1);});
  play.addEventListener('click',()=>{
    if(playing){pause();return;}
    if(!flight&&(stationIndex<0||stationIndex===route.stations.length-1))go(0);
    playing=true;hold=0;play.textContent='暂停播放';play.setAttribute('aria-pressed','true');
  });
  find('topic').addEventListener('click',()=>{
    const id=current()?.id;
    const waterFocus={snow:'ice','ice-lake':'ice',source:'ice',valley:'main',join:'north',wetland:'wetland',estuary:'wetland',bay:'wetland'};
    const geography=['polar','slope','mixed'].includes(id)||route?.id==='warmth'&&!id?'north':
      id==='plain'?undefined:id==='gobi'||id==='oasis'?'dry':'south';
    onTopic(route?.id==='water'?'balance':'annual',route?.id==='water'?{month,focus:waterFocus[id]??'all'}:geography);
  });
  find('geology-overlay').addEventListener('click',()=>{
    showGeology=!showGeology;
    if(!showGeology)onGeology(false);
    paint();
  });
  function openFormation(mode,focus,study){
    const station=current();
    onTopic(mode,{focus,month,study,back:{focus:route?.id,station:station?.id,seam:seam?.id,month,
      name:station?.name??route?.name??seam?.name??'三线全图'}});
  }
  find('ice-age').addEventListener('click',()=>openFormation('timeline',route?.id));
  find('ridge-bay').addEventListener('click',()=>{
    const stops={snow:'ridge','ice-lake':'source-pool',source:'source-pool',valley:'river-valley',
      join:'wetland',wetland:'wetland',estuary:'bay',bay:'bay'};
    onTopic('ridge-bay',{station:stops[current()?.id]??'ridge',month});
  });
  find('world-formation').addEventListener('click',()=>{
    const id=current()?.id;
    const fromSeam={north:'central',south:'south',west:'closed'};
    const focus=fromSeam[seam?.id]??(['ocean','coast','windward'].includes(id)?'south':lineFormation[route?.id]);
    openFormation('formation',focus);
  });
  find('basin-event').addEventListener('click',()=>openFormation('formation',lineFormation[route?.id],'event'));
  find('basin-divide').addEventListener('click',()=>{
    const fromSeam={north:'central',west:'closed',south:'south'};
    openFormation('formation',fromSeam[seam?.id]??lineFormation[route?.id],'divide');
  });
  find('cold').addEventListener('click',()=>{
    const focus=route?.id==='water'?'alpine':route?.id==='warmth'||seam?.id==='north'?'north':undefined;
    openFormation('cold',focus);
  });
  find('rain-shadow').addEventListener('click',()=>{
    const station=current();
    const start={coast:'forest',windward:'windward',ridge:'ridge',lee:'woodland',gobi:'gravel',oasis:'gully'};
    onTopic('rain-shadow',{station:route?.id==='inland'?start[station?.id]:null,month,
      back:{focus:route?.id,station:station?.id,seam:seam?.id,month,
        name:station?.name??route?.name??seam?.name??'三线全图'}});
  });
  find('coast-sea').addEventListener('click',()=>{
    const station=current();
    const coast=seam?.id==='east'?'rock':route?.id==='inland'&&station?.id==='coast'?'mouth':undefined;
    onTopic('coast-sea',{station:coast,back:{focus:route?.id,station:station?.id,seam:seam?.id,month,
      name:station?.name??route?.name??seam?.name??'三线全图'}});
  });
  find('fluid-vents').addEventListener('click',()=>{
    const station=current(),land=route?.id==='warmth';
    onTopic('fluid-vents',{route:land?'land':'ocean',station:land?'geyser':'vent',
      back:{mode:'lines',focus:route?.id,station:station?.id,seam:seam?.id,month,
        name:station?.name??route?.name??seam?.name??'三线全图'}});
  });
  find('paleo-wetlands').addEventListener('click',()=>{
    const station=current();
    const paleoStation=route?.id==='water'&&station?.id==='valley'?'channel':'roots';
    onTopic('deep-time',{case:'devonian',station:paleoStation,
      back:{focus:route?.id,station:station?.id,seam:seam?.id,month,
        name:station?.name??route?.name??seam?.name??'三线全图'}});
  });
  find('mesozoic-river').addEventListener('click',()=>{
    const station=current(),lake=route?.id==='water'&&station?.id==='wetland';
    onTopic('deep-time',{case:lake?'jurassic':'triassic',station:lake?'shore':'bar',
      back:{focus:route?.id,station:station?.id,seam:seam?.id,month,
        name:station?.name??route?.name??seam?.name??'三线全图'}});
  });
  find('deep-time').addEventListener('click',()=>{
    const station=current(),forest=route?.id==='warmth';
    onTopic('deep-time',{case:forest?'forest':'seaway',station:forest?'canopy':route?'sand':undefined,
      back:{focus:route?.id,station:station?.id,seam:seam?.id,month,
        name:station?.name??route?.name??seam?.name??'三线全图'}});
  });
  find('legacy').addEventListener('click',()=>{
    const station=current(),related={snow:'ice-edge','ice-lake':'lake',source:'moraine',valley:'valley',
      join:'valley',wetland:'wetland',estuary:'mouth',bay:'inner'};
    onTopic('legacy',{station:route?.id==='water'?related[station?.id]:undefined,
      back:{focus:route?.id,station:station?.id,seam:seam?.id,month,
        name:station?.name??route?.name??seam?.name??'三线全图'}});
  });
  find('geology').addEventListener('click',()=>openFormation('tectonics',geology()[0]));
  find('groundwater').addEventListener('click',()=>openFormation('groundwater',groundwater()[0]));
  find('exchange').addEventListener('click',()=>{
    const links=exchangeLinks[route?.id];
    openFormation('exchange',links?.[current()?.id]??links?.overview);
  });
  find('exchange-overlay').addEventListener('click',()=>{
    showExchange=!showExchange;
    if(!showExchange)onExchange(null);
    paint();
  });
  find('wetland').addEventListener('click',()=>{
    const links=wetlandLinks[route?.id];
    openFormation('wetland',links?.[current()?.id]??links?.overview);
  });
  find('wetland-overlay').addEventListener('click',()=>{
    showWetland=!showWetland;
    if(!showWetland)onWetland(null);
    paint();
  });
  find('estuary').addEventListener('click',()=>{
    const links=estuaryLinks[route?.id];
    openFormation('estuary',links?.[current()?.id]??links?.overview);
  });
  find('storm').addEventListener('click',()=>{
    const links=stormLinks[route?.id];
    openFormation('storm',links?.[current()?.id]??links?.overview,'water');
  });
  find('shore').addEventListener('click',()=>{
    const links=stormLinks[route?.id];
    openFormation('storm',links?.[current()?.id]??'estuary','sediment');
  });
  find('plants').addEventListener('click',()=>openFormation('storm','estuary','plants'));
  find('sea').addEventListener('click',()=>openFormation('storm','estuary','sea'));
  find('estuary-overlay').addEventListener('click',()=>{
    showEstuary=!showEstuary;
    if(!showEstuary)onEstuary(null);
    paint();
  });
  find('lithology').addEventListener('click',()=>{
    showLithology=!showLithology;
    paint();
  });

  return {
    show(context={}){
      active=true;overlay.hidden=false;
      if([1,7].includes(Number(context.month)))month=Number(context.month);
      choose(context.focus??route?.id,context.station,context.seam);
    },
    hide(){
      if(active&&showGeology)onGeology(false);
      if(active&&showLithology)onLithology(false);
      if(active&&showExchange)onExchange(null);
      if(active&&showWetland)onWetland(null);
      if(active&&showEstuary)onEstuary(null);
      active=false;overlay.hidden=true;flight=null;pause();scene.hide();
    },
    update(dt){
      if(active&&showExchange)updateExchange(dt);
      if(!active||!playing)return;
      if(flight){
        flight.t+=dt;
        if(flight.t>=flight.duration)flight=null;
        return;
      }
      hold+=dt;
      if(hold>=2.25){
        if(stationIndex>=route.stations.length-1)pause();
        else go(stationIndex+1,true);
      }
    },
    project(camera){
      if(!active)return;
      const width=innerWidth,height=innerHeight,bound=panel.getBoundingClientRect();
      const occupied=[];
      annotations.forEach(({x,y,z,kind},i)=>{
        const point=projected.set(x,y,z).project(camera);
        const u=(point.x*.5+.5)*width,v=(-point.y*.5+.5)*height;
        const covers=u>bound.left-56&&u<bound.right+56&&v>bound.top-11&&v<bound.bottom+11;
        const overlap=occupied.some(p=>Math.abs(u-p[0])<112&&Math.abs(v-p[1])<27);
        const node=labelNodes[i];
        const minY=kind==='scale'?68:82;
        node.hidden=point.z< -1||point.z>1||u<63||u>width-63||v<minY||v>height-30||covers||overlap;
        if(!node.hidden){node.style.transform=`translate(${u}px,${v}px) translate(-50%,-50%)`;occupied.push([u,v]);}
      });
    },
    get view(){
      if(!active)return null;
      if(seam)return seam.view;
      if(!route)return null;
      const station=current();
      if(flight){
        const {from,to,t,duration}=flight,u=Math.min(1,t/duration),blend=u*u*(3-2*u);
        const p=pointAt(route.points,from.at+(to.at-from.at)*blend);
        return [p.x,p.z,Math.max(0,p.y,p.level),from.distance+(to.distance-from.distance)*blend];
      }
      if(station)return [station.p.x,station.p.z,Math.max(0,station.y,station.level),station.distance];
      const xs=route.points.map(p=>p.x),zs=route.points.map(p=>p.z),xmin=Math.min(...xs),xmax=Math.max(...xs),
        zmin=Math.min(...zs),zmax=Math.max(...zs);
      return [(xmin+xmax)/2,(zmin+zmax)/2,53,Math.max(xmax-xmin,zmax-zmin)*.95+285];
    }
  };
}

import {Vector3} from 'three';
import {basinCellWater,basinEventDefaults,basinEventHours,basinEventSite} from './basin-event-model.js';
import {divideColors} from './basin-divide.js';
import {formationCell} from './world-formation.js';
import {formationMaterials} from './world-hydraulics.js';
import {terrainHeight} from './large-world.js';

const fmt=(n,digits=0)=>n.toLocaleString('zh-CN',{maximumFractionDigits:digits});
const layers=[
  ['water','水路与浅层补给'],['sediment','泥沙沉积'],['bank','淹水与退湿岸']
];
const layerLegends={
  water:[['#8bd9ff','沿地表下行的水'],['#79e1b1','浅层储水'],['#e5cdf9','地表分水岭']],
  sediment:[['#ffd391','本场泥沙停留'],['#5bbde6','同刻水面']],
  bank:[['#5bbde6','新增淹水'],['#79e1b1','退水后湿岸'],['#f2b2ff','盐盆湿岸']]
};
const habitat={
  central:'苇泽低滩适合耐湿草本，涨水覆盖低滩，退水后细泥仍可保湿。',
  south:'谷坡湿暖可保有雨林，近海低岸受咸淡交替影响，形成耐盐红树林带。',
  closed:'盐沼边缘更适合耐盐低植被。淡水能暂时稀释，蒸发使留在洼底的盐分重新集中。'
};
const option=(n,label)=>`<option value="${n}">${label}</option>`;
const divideStops=['分水坡','入渗剖面','泉口与缓释','最终去向'];

export function mountBasinEvent(panel,scene,onFocus){
  panel.innerHTML=`
    <p id="basin-event-summary" class="plan-present" role="status"></p>
    <p id="basin-event-quick" class="plan-note"></p>
    <section id="basin-event-divide" aria-label="三流域分水坡航拍路线" hidden>
      <ul class="basin-divide-key gw-rock-legend" aria-label="分水坡图例">
        ${[[divideColors.divide,'集水边界'],[divideColors.surface,'流域水路'],[divideColors.local,'局地坡流'],[divideColors.shallow,'浅层水和泉溪']].map(([color,label])=>
          `<li><i style="--swatch:${color}"></i>${label}</li>`).join('')}
      </ul>
      <div class="formation-actions" id="basin-event-divide-stops" aria-label="本流域观察点">
        ${divideStops.map((name,i)=>`<button type="button" data-divide-stop="${i}" aria-pressed="false">${name}</button>`).join('')}
      </div>
      <div class="formation-actions basin-divide-navigation">
        <button type="button" id="basin-event-divide-prev">← 上一站</button>
        <button type="button" id="basin-event-divide-next">开始航拍 →</button>
      </div>
      <p class="plan-note" id="basin-event-divide-detail"></p>
      <p class="plan-note" id="basin-event-divide-rocks" hidden></p>
    </section>
    <div class="basin-event-settings">
      <label>总雨量<select id="basin-event-rain">${[0,24,48,96].map(n=>option(n,n+' mm')).join('')}</select></label>
      <label>降雨历时<select id="basin-event-duration">${[4,8,16].map(n=>option(n,n+' 小时')).join('')}</select></label>
      <label>起始月份<select id="basin-event-month">${Array.from({length:12},(_,i)=>option(i+1,(i+1)+' 月')).join('')}</select></label>
    </div>
    <div class="basin-event-time">
      <label for="basin-event-hour">从降雨开始 <output id="basin-event-clock" for="basin-event-hour"></output></label>
      <input type="range" id="basin-event-hour" min="0" max="${basinEventHours}" step="1">
      <div class="formation-actions">
        <button type="button" id="basin-event-play">播放时序</button>
        <button type="button" data-event-time="rain">雨结束</button>
        <button type="button" data-event-time="peak">看峰值</button>
        <button type="button" data-event-time="end">第 120 小时</button>
      </div>
    </div>
    <div class="formation-actions" id="basin-event-layers" aria-label="事件显示图层">
      ${layers.map(([id,name])=>`<button type="button" data-event-layer="${id}" aria-pressed="false">${name}</button>`).join('')}
    </div>
    <ul id="basin-event-legend" class="gw-rock-legend" aria-label="事件图例"></ul>
    <div id="basin-event-sites" class="basin-event-sites" hidden>
      <label for="basin-event-station">沿水路定位</label><select id="basin-event-station"></select>
    </div>
    <p id="basin-event-detail" class="plan-note"></p>
    <table id="basin-event-values" class="formation-values"></table>
    <p class="plan-note" id="basin-event-units"></p>`;
  const doc=panel.ownerDocument,find=id=>panel.querySelector('#basin-event-'+id);
  const slider=find('hour'),play=find('play'),station=find('station');
  const labels=doc.createElement('div'),vector=new Vector3();
  labels.className='basin-event-map-labels';labels.setAttribute('aria-hidden','true');labels.hidden=true;doc.body.append(labels);
  const settings={...basinEventDefaults};
  let active=false,focus='all',hour=24,layer='water',site=0,divide=false,response=null,anchors=[],playing=false,advance=0;
  const result=()=>response?.event.results.find(r=>r.basin.id===focus);
  const pick=()=>divide?response?.survey?.stop:result()?.basin.stations[site];

  function togglePlayback(next){
    playing=next;advance=0;play.textContent=playing?'暂停时序':'播放时序';
  }
  function markLocations(){
    const selected=result(),shown=selected?[selected]:response.event.results;
    anchors=shown.map((r,i)=>{
      const p=selected?pick():divide?response.survey.cases[i].stops[0]:r.basin.stations.at(-1);
      const span=doc.createElement('span');span.textContent=selected?p.name:r.basin.name;
      span.style.setProperty('--basin-color',r.basin.color);
      return {p,y:(p.y??terrainHeight(p.x,p.z))+(selected?24:40),span};
    });
    labels.replaceChildren(...anchors.map(a=>a.span));
  }

  function values(){
    const rows=response.event.results.map(r=>({result:r,f:r.frames[hour]}));
    const get=(fn)=>rows.map(({result,f})=>'<td>'+fn(f,result)+'</td>').join('');
    const depth=key=>get((f,r)=>fmt(1000*f[key]/r.area,1));
    const raw=(key,digits=1)=>get(f=>fmt(f[key],digits));
    const heads=rows.map(({result:r})=>`<th scope="col">${r.basin.name}</th>`).join('');
    if(divide){
      const {model,survey}=response;
      const sampleRows=rows.map(({f},i)=>{
        const entry=survey.cases[i],p=entry.stops[1].read;
        const k=formationCell(model.study.grid,p.x,p.z);
        return basinCellWater(f,entry.byCell.get(k));
      });
      const sample=key=>sampleRows.map(w=>`<td>${fmt(1000*w[key]/model.study.area,2)}</td>`).join('');
      find('values').innerHTML=`
        <caption>三处入渗样格 · 同一场雨第 ${hour} 小时</caption>
        <thead><tr><th scope="col">场景量</th>${heads}</tr></thead><tbody>
        <tr><th scope="row">当小时坡流 mm</th>${sample('runoff')}</tr>
        <tr><th scope="row">当小时入渗 mm</th>${sample('infiltration')}</tr>
        <tr><th scope="row">浅层蓄水 mm</th>${sample('shallow')}</tr>
        <tr><th scope="row">当小时缓释 mm</th>${sample('baseflow')}</tr>
        <tr><th scope="row">流域累计入海 m³</th>${raw('exported',0)}</tr>
        <tr><th scope="row">水域存水增量 m³</th>${raw('retained',0)}</tr>
        </tbody>`;
      return;
    }
    find('values').innerHTML=`
      <caption>共同计时 · 第 ${hour} 小时</caption>
      <thead><tr><th scope="col">场景量</th>${heads}</tr></thead><tbody>
        <tr><th scope="row">已降雨 mm</th>${depth('rainTotal')}</tr>
        <tr><th scope="row">当小时坡流 mm</th>${depth('runoff')}</tr>
        <tr><th scope="row">浅层蓄水 mm</th>${depth('shallow')}</tr>
        <tr><th scope="row">当小时地下缓释 mm</th>${depth('baseflow')}</tr>
        <tr><th scope="row">水域存水增量 mm</th>${depth('retained')}</tr>
        <tr><th scope="row">累计入海 mm</th>${depth('exported')}</tr>
        <tr><th scope="row">本场沉积 m³</th>${raw('deposited')}</tr>
        <tr><th scope="row">水域留盐 kg</th>${raw('saltRetained')}</tr>
      </tbody>`;
  }

  function renderDivide(){
    const {entry,stop,water,stage}=response.survey;
    const rockKey=find('divide-rocks');
    find('summary').textContent=stop?.name??'同一场雨落在三个分水坡';
    find('divide-detail').textContent=stop?.detail??
      '沿四站看一个流域，再带着同一雨量和计时比较下一处。选流域可直接跳到分水坡。';
    rockKey.hidden=!entry||site!==1;
    if(!rockKey.hidden){
      const units=new Set(entry.section.flatMap(p=>[p.rock,p.cover]));
      rockKey.innerHTML='地表与基岩 · '+[...units].map(key=>{
        const m=formationMaterials[key];return `<span style="--swatch:${m.color}"><i></i>${m.name}</span>`;
      }).join('')+'<br>剖面厚度为示意。';
    }
    let quick='西南与中央分别出海，西部地表来水止于盆内。三地共用下方时钟。';
    if(water)quick=site===2&&entry.springCreek.length?`扇面样格当小时浅层缓释 ${fmt(water.baseflow,2)} m³`:
      `该样格当小时 · 坡流 ${fmt(water.runoff,2)} m³ · 入渗 ${fmt(water.infiltration,2)} m³ · 浅层缓释 ${fmt(water.baseflow,2)} m³`;
    if(stage)quick=`本场雨增加的水域存水 ${fmt(stage.water)} m³ · 流域累计入海 ${fmt(result().frames[hour].exported)} m³`;
    find('quick').textContent=quick;
    find('detail').textContent='';
  }

  function paint(){
    response=scene.show({settings,focus,hour,layer:divide?'water':layer,divide:divide?site:null});
    const {event,model}=response,activeBasin=result();
    const current=activeBasin?.frames[hour],point=pick();
    const raining=hour<=settings.duration&&hour>0&&settings.rain>0;
    const phase=hour===0?'起雨前':raining?(hour===settings.duration?'降雨结束':'降雨中'):settings.rain===0?'无雨对照':'雨后';
    slider.value=String(hour);find('clock').value=` · 第 ${hour} 小时 · ${phase}`;
    if(divide){renderDivide();values();return;}
    find('summary').textContent=point?point.name:'两条水路入海，西部盐盆在盆内蓄水';
    const [central,south,closed]=event.results.map(r=>r.frames[hour]);
    let quick=`累计入海 中央 ${fmt(central.exported)} m³ · 西南 ${fmt(south.exported)} m³ · 盐盆 ${fmt(closed.exported)} m³`;
    let detail='沿各流域三站检查坡面、浅层补给和岸带。';
    if(point){
      const observed=basinEventSite(model,event,activeBasin,point,hour),{reading,profile,field,bank}=observed;
      if(reading){
        quick=`水位上升 ${fmt(reading.rise,2)} m · 新增淹水 ${fmt(bank.flooded)} m² · 退水湿岸 ${fmt(bank.damp)} m²`;
        detail=`参考盐度 ${fmt(reading.salinity,2)}‰ · 本河段沉积 ${fmt(reading.deposit,1)} m³。 `;
        if(focus==='closed')detail+=`此处水域留下约 ${fmt(reading.salt,1)} kg 本场溶出的盐。 `;
        detail+=habitat[focus];
      }else if(profile&&field){
        quick=`全流域当小时 坡流 ${fmt(current.runoff)} m³ · 入渗 ${fmt(current.infiltration)} m³`;
        detail=`${formationMaterials[profile.material].name} · 此格当小时向下送水 ${fmt(field[0],1)} m³，浅层蓄水 ${fmt(field[1],1)} m³。`;
      }
    }
    find('quick').textContent=quick;
    find('detail').textContent=detail;
    values();
  }

  function selectFocus(id,index=0){
    focus=id;site=index;
    paint();
    const basin=result()?.basin;
    find('sites').hidden=divide||!basin;
    if(basin&&!divide){
      station.innerHTML=basin.stations.map((p,i)=>option(i,p.name)).join('');
      station.value=String(site);
    }
    if(divide){
      find('divide-stops').hidden=!basin;
      for(const b of panel.querySelectorAll('[data-divide-stop]'))
        b.setAttribute('aria-pressed',String(Number(b.dataset.divideStop)===site));
      find('divide-prev').hidden=!basin;
      find('divide-next').textContent=!basin?'开始航拍 →':site<3?'下一站 →':focus==='closed'?'回三流域全图 ↗':'下一流域 →';
    }
    markLocations();
    onFocus?.(focus);
  }
  function advanceRoute(step){
    const ids=response.survey.cases.map(({basin})=>basin.id);
    const index=(ids.indexOf(focus)*divideStops.length+site+step);
    if(focus==='all'){selectFocus(ids[0],0);return;}
    if(index<0||index>=ids.length*divideStops.length){selectFocus('all',0);return;}
    selectFocus(ids[Math.floor(index/divideStops.length)],index%divideStops.length);
  }
  function setLayer(name){
    layer=name;
    for(const b of panel.querySelectorAll('[data-event-layer]'))
      b.setAttribute('aria-pressed',String(b.dataset.eventLayer===layer));
    find('legend').innerHTML=layerLegends[layer].map(([color,label])=>
      `<li><i style="--swatch:${color}"></i>${label}</li>`).join('');
  }
  for(const id of ['rain','duration','month']){
    find(id).addEventListener('change',e=>{
      settings[id]=Number(e.target.value);togglePlayback(false);paint();
    });
  }
  for(const b of panel.querySelectorAll('[data-event-layer]'))b.addEventListener('click',()=>{
    setLayer(b.dataset.eventLayer);paint();
  });
  for(const b of panel.querySelectorAll('[data-divide-stop]'))b.addEventListener('click',()=>selectFocus(focus,Number(b.dataset.divideStop)));
  find('divide-prev').addEventListener('click',()=>advanceRoute(-1));
  find('divide-next').addEventListener('click',()=>advanceRoute(1));
  slider.addEventListener('input',()=>{togglePlayback(false);hour=Number(slider.value);paint();});
  station.addEventListener('change',()=>{site=Number(station.value);markLocations();paint();});
  for(const b of panel.querySelectorAll('[data-event-time]'))b.addEventListener('click',()=>{
    togglePlayback(false);
    hour=b.dataset.eventTime==='rain'?settings.duration:b.dataset.eventTime==='end'?basinEventHours:
      (result()??response.event.results[0]).peak;
    paint();
  });
  play.addEventListener('click',()=>{
    if(!playing&&hour===basinEventHours){hour=0;paint();}
    togglePlayback(!playing);
  });
  setLayer(layer);

  return {
    get month(){return settings.month;},
    show({focus:id,month,survey=false}){
      active=true;panel.hidden=false;labels.hidden=false;
      divide=survey;
      find('divide').hidden=!divide;find('layers').hidden=divide;find('legend').hidden=divide;
      find('units').textContent=divide?
        '蓝虚线表示格网向河道或水域交接。缓释读数来自 40 米样格，深层水路与跨界连通待校定。':
        '三地使用同一雨强和时钟。水量折算为各流域平均毫米；泥沙和可迁移盐使用场景量。岸色可对照现有群落。';
      if(month)settings.month=month;
      if(divide&&!response)hour=settings.duration;
      for(const field of ['rain','duration','month'])find(field).value=String(settings[field]);
      selectFocus(id,id==='all'||divide?0:1);
    },
    hide(){
      if(!active)return;
      active=false;panel.hidden=true;labels.hidden=true;togglePlayback(false);scene.hide();
    },
    selectFocus,
    update(dt){
      if(!active)return;
      scene.update(dt);
      if(!playing)return;
      advance+=dt;
      if(advance<.28)return;
      advance=0;hour=Math.min(basinEventHours,hour+1);
      if(hour===basinEventHours)togglePlayback(false);
      paint();
    },
    project(camera){
      if(!active)return;
      const box=panel.closest('#world-plan-panel').getBoundingClientRect();
      for(const {p,y,span} of anchors){
        vector.set(p.x,y,p.z).project(camera);
        const x=innerWidth*(.5+vector.x*.5),y2=innerHeight*(.5-vector.y*.5);
        const covered=x>box.left-65&&x<box.right+65&&y2>box.top-12&&y2<box.bottom;
        span.hidden=covered||vector.z< -1||vector.z>1||x<85||x>innerWidth-85||y2<70||y2>innerHeight-45;
        span.style.transform=`translate(${x}px,${y2}px) translate(-50%,-50%)`;
      }
    },
    get view(){
      const p=pick();
      if(divide&&p){
        const ends=response.survey.entry.section,first=ends[0],last=ends.at(-1);
        const azimuth=site===1?Math.atan2(last.z-first.z,last.x-first.x)+Math.PI/2:undefined;
        return [p.x,p.z,Math.max(0,p.y),p.distance,azimuth];
      }
      return p?[p.x,p.z,Math.max(0,terrainHeight(p.x,p.z)),p.distance]:[-850,225,0,3250,Math.PI/2];
    }
  };
}

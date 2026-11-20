import {Vector3} from 'three';
import {drySpellDays,formationBasins,formationHabitat,formationLayers} from './world-formation.js';
import {formationMaterials} from './world-hydraulics.js';
import {mountBasinEvent} from './basin-event-ui.js';

const number=value=>value.toLocaleString('zh-CN',{maximumFractionDigits:1});
const volume=value=>value===null?'—':Math.round(value).toLocaleString('zh-CN');
const depth=(value,area)=>number(value/area*1000);
const legend={
  rain:[['#bfa579','少雨'],['#509be2','雨量较高'],['#e5f6ff','降雪比重较高']],
  rock:Object.values(formationMaterials).map(m=>[m.color,m.name]),
  water:[['#87caff','地表径流'],['#55d1a6','绿底为蓄水，圆环为补给'],['#e4caff','地表分水岭']],
  plants:Object.values(formationHabitat).map(m=>[m.color,m.name]),
  natural:[]
};
const guides={
  rain:'同一套逐月风雨与地形抬升规则。地图色阶表示场景降水量，雪融后才进入液态汇流。',
  rock:'地表颜色优先显示冲积或盐湿盖层，其余显示基岩。母质、坡度和孔隙共同控制入渗。',
  water:'蓝箭头沿格网最陡下降方向。绿底显示浅层储水，绿环显示补给。河线接到既有河网，盐盆终点在盆内。',
  plants:'用根区湿润度、盐度、坡度和冷暖标出适宜生境。原地植被可通过「原地实景」对照。',
  natural:'查看同一片地形的河道、岸带、树冠和盐壳。'
};

export function mountFormationStudy(panel,scene,onBack){
  panel.innerHTML=`
    <div class="formation-actions" aria-label="对照流域">
      <button data-formation-basin="all" type="button" aria-pressed="true">全图</button>
      ${formationBasins.map(b=>`<button type="button" data-formation-basin="${b.id}" aria-pressed="false">${b.name}</button>`).join('')}
    </div>
    <div class="formation-actions formation-modes" aria-label="形成对照方式">
      <button type="button" id="formation-divide-mode" aria-pressed="false">分水坡与泉口</button>
      <button type="button" id="formation-event-mode" aria-pressed="false">同一场雨</button>
      <button type="button" id="formation-season-mode" aria-pressed="true">逐月形成</button>
    </div>
    <section id="formation-event" aria-label="同一场雨的三流域对照" hidden></section>
    <div id="formation-seasonal">
    <p id="formation-title" class="plan-present" role="status"></p>
    <div class="formation-controls">
      <label for="formation-month">季节降水</label>
      <select id="formation-month">${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1} 月</option>`).join('')}</select>
      <button id="formation-dry" type="button" aria-pressed="false">停雨后 ${drySpellDays} 天</button>
    </div>
    <div class="formation-actions" aria-label="形成规则图层">
      ${formationLayers.map(({id,name})=>`<button type="button" data-formation-layer="${id}" aria-pressed="false">${name}</button>`).join('')}
    </div>
    <ul id="formation-key" class="gw-rock-legend" aria-label="图例"></ul>
    <div id="formation-probes" class="formation-actions" aria-label="实景样点" hidden></div>
    <p id="formation-probe-detail" class="plan-note" hidden></p>
    <table id="formation-values" class="formation-values"></table>
    <p id="formation-units" class="plan-note"></p>
    <p id="formation-guide" class="plan-note"></p>
    <p id="formation-site-note" class="plan-note"></p>
    <details class="formation-equal">
      <summary>同下 48 mm 雨，各处会怎样</summary>
      <p class="plan-note">每个流域取第一个样点，雨量与时长同为 48 mm、8 小时。蓝为坡面径流，绿为入渗，单位为场景毫米。</p>
      <div id="formation-storm"></div>
    </details>
    </div>
    <button id="formation-back" type="button">返回三条环境线 ↗</button>`;
  const find=id=>panel.querySelector('#formation-'+id);
  const doc=panel.ownerDocument,overlay=doc.createElement('div'),vector=new Vector3();
  overlay.id='formation-map-labels';overlay.setAttribute('aria-hidden','true');overlay.hidden=true;doc.body.append(overlay);
  const basinButtons=panel.querySelectorAll('[data-formation-basin]'),layerButtons=panel.querySelectorAll('[data-formation-layer]');
  let focus='all',month=7,layer='water',days=0,probe=null,back=null,model,labels=[],nodes=[],mode='season';
  const event=mountBasinEvent(find('event'),{show:scene.showEvent,hide:scene.hideEvent,update:scene.updateEvent},id=>{
    focus=id;paintBasinButtons();
  });
  function paintBasinButtons(){
    for(const b of basinButtons)b.setAttribute('aria-pressed',String(b.dataset.formationBasin===focus));
  }
  function setMode(value){
    if(mode!=='season')month=event.month;
    mode=value;
    const eventMode=mode!=='season';
    find('seasonal').hidden=eventMode;
    overlay.hidden=eventMode;
    for(const key of ['season','event','divide'])
      find(key+'-mode').setAttribute('aria-pressed',String(key===mode));
    find('back').textContent=back?`回到${back.name} ↗`:'返回三条环境线 ↗';
    paintBasinButtons();
    if(eventMode)event.show({focus,month,survey:mode==='divide'});
    else {event.hide();paint();}
  }
  for(const key of ['season','event','divide'])
    find(key+'-mode').addEventListener('click',()=>{if(key!==mode)setMode(key);});

  function renderValues(sample,rows){
    const field=(key,fn=depth)=>rows.map(row=>`<td>${fn(row[key],row.area)}</td>`).join('');
    const labels=model.basins.map(b=>`<th scope="col">${b.name}</th>`).join('');
    find('values').innerHTML=`
      <caption>${days?'停雨第 14 天对照':'三个流域同月对照'}</caption>
      <thead><tr><th scope="col">水量</th>${labels}</tr></thead><tbody>
      <tr><th scope="row">雨量</th>${field('liquidRain')}</tr>
      <tr><th scope="row">融雪</th>${field('melt')}</tr>
      <tr><th scope="row">坡面快流</th>${field('surface')}</tr>
      <tr><th scope="row">入地下</th>${field('recharge')}</tr>
      <tr><th scope="row">地下慢流</th>${field('baseflow')}</tr>
      <tr><th scope="row">出海 m³</th>${field('outflow',volume)}</tr></tbody>`;
    const index=sample?model.basins.indexOf(sample):-1;
    if(index>=0){
      const row=rows[index];
      const level=row.stage!==null?` 当前月${focus==='closed'?'盐湖':'湿地'}参考水位 ${number(row.stage)} m。`:'';
      find('site-note').textContent=sample.lesson+level;
    }else find('site-note').textContent='点一个流域，沿地表汇水与地下缓释追到出口。用同一张表对照两个出海流域和一个内流盐盆。';
  }

  function paint(){
    const response=scene.show({month,days,layer,focus,probe}),basin=response.model.basins.find(b=>b.id===focus);
    if(model!==response.model){
      model=response.model;
      find('storm').innerHTML=model.basins.map(b=>{
        const {runoff,rain}=model.sameStorm(b),p=b.probes[0];
        const rock=formationMaterials[model.world.hydraulics[p.k].material].name;
        const divide=runoff/rain*100;
        return `<div><b>${b.name}</b> <span>${p.name} · ${rock}</span>
          <div class="formation-storm-bar" style="--runoff:${divide}%"></div>
          <small>坡面 ${number(runoff)} mm · 入渗 ${number(rain-runoff)} mm</small></div>`;
      }).join('');
    }
    labels=response.labels;
    nodes=labels.map(p=>{
      const el=doc.createElement('span');el.textContent=p.text;el.style.setProperty('--route-color',p.color);return el;
    });
    overlay.replaceChildren(...nodes);
    find('title').textContent=basin?.name??'全图环境形成对照';
    find('guide').textContent=days&&layer==='water'?'停雨后蓝色坡流停止。绿环表示第 14 天仍在缓释的地下水。':guides[layer];
    const entries=days&&layer==='water'?[
      ['#55d1a6','绿底为剩余蓄水，圆环为缓释'],['#e4caff','地表分水岭']
    ]:legend[layer];
    find('key').innerHTML=entries.map(([color,text])=>`<li><i style="--swatch:${color}"></i>${text}</li>`).join('');
    find('month').value=String(month);
    find('dry').setAttribute('aria-pressed',String(!!days));
    find('back').textContent=back?`回到${back.name} ↗`:'返回三条环境线 ↗';
    paintBasinButtons();
    for(const b of layerButtons)b.setAttribute('aria-pressed',String(b.dataset.formationLayer===layer));
    find('probes').hidden=!basin;
    if(basin)find('probes').innerHTML=basin.probes.map((p,i)=>
      `<button type="button" data-formation-probe="${i}" aria-pressed="${i===probe}">${p.name}</button>`).join('');
    const detail=find('probe-detail');detail.hidden=!basin;
    if(basin){
      const p=basin.probes[probe??0],site=model.read(p.k,month,days),{material,bedrock}=site.profile;
      detail.textContent=`${p.name} · 基岩为${formationMaterials[bedrock].name} · 表层为${formationMaterials[material].soil} · 适宜生境为${formationHabitat[site.habitat].name}`;
    }
    renderValues(basin,response.totals);
    find('units').textContent=days?'雨、融雪与新入渗为零。慢流按第 14 天折算为各流域平均 mm/日。岸线以所选月为定位参考。':'以各自集水面积折算为平均 mm/月。出海为流域出口的当月体积。';
  }

  for(const b of basinButtons)b.addEventListener('click',()=>{
    focus=b.dataset.formationBasin;probe=null;
    if(mode==='season')paint();
    else event.selectFocus(focus,focus==='all'||mode==='divide'?0:1);
  });
  for(const b of layerButtons)b.addEventListener('click',()=>{layer=b.dataset.formationLayer;paint();});
  find('month').addEventListener('change',e=>{month=Number(e.target.value);days=0;paint();});
  find('dry').addEventListener('click',()=>{days=days?0:drySpellDays;if(days)layer='water';paint();});
  find('probes').addEventListener('click',e=>{
    const b=e.target.closest('[data-formation-probe]');
    if(b){const selected=Number(b.dataset.formationProbe);probe=probe===selected?null:selected;paint();}
  });
  find('back').addEventListener('click',()=>onBack(back?{...back,month:mode==='season'?month:event.month}:undefined));

  return {
    show(context={}){
      focus=formationBasins.some(b=>b.id===context.focus)?context.focus:'all';
      const m=Number(context.month);
      if(Number.isInteger(m)&&m>=1&&m<=12)month=m;
      back=context.back??null;days=0;layer='water';probe=null;
      setMode(['event','divide'].includes(context.study)?context.study:'season');
    },
    hide(){
      if(mode!=='season')month=event.month;
      mode='season';overlay.hidden=true;event.hide();scene.hide();
    },
    update(dt){if(mode!=='season')event.update(dt);},
    project(camera){
      if(mode!=='season'){event.project(camera);return;}
      if(overlay.hidden)return;
      const box=(panel.closest('#world-plan-panel')??panel).getBoundingClientRect();
      labels.forEach((p,i)=>{
        vector.set(p.x,p.y,p.z).project(camera);
        const x=(vector.x*.5+.5)*innerWidth,y=(-vector.y*.5+.5)*innerHeight;
        const covered=x>box.left-65&&x<box.right+65&&y>box.top&&y<box.bottom;
        nodes[i].hidden=covered||vector.z< -1||vector.z>1||x<75||x>innerWidth-75||y<73||y>innerHeight-40;
        nodes[i].style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
      });
    },
    get view(){
      if(mode!=='season')return event.view;
      const basin=model?.basins.find(b=>b.id===focus);
      const point=basin?.probes[probe];
      return point?[point.x,point.z,model.height[point.k],425]:basin?.view??null;
    }
  };
}

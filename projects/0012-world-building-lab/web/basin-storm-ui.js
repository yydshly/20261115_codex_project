import {Vector3} from 'three';
import {stormHours,stormSettings,stormStops,stormTides} from './basin-storm.js';
import {sedimentReaches,shoreBenchmarks,shoreEventLimit} from './storm-sediment.js';
import {bankTestFloods,successionYears} from './shore-succession.js';
import {seaSettings,seaStages} from './shore-sea-change.js';

const colours={rain:'#94dfff',ground:'#a8efc0',wetland:'#83d5de',salt:'#f0ba84'};
const amount=(n,digits=0)=>n.toLocaleString('zh-CN',{maximumFractionDigits:digits});
const cubic=n=>amount(n)+' m³';
const square=n=>amount(n)+' m²';
const sedimentVolume=n=>amount(n,2)+' m³';
const waterHeight=n=>Math.abs(n)<.005?'0.00 m':(n>0?'+':'')+n.toFixed(2)+' m';
const scenarioIds=Object.keys(stormTides);
const studies={water:'雨潮水位',sediment:'本场泥沙',shore:'多场岸线',plants:'植被演替',sea:'海面与风暴潮'};
const shoreView=[-1448,-233,4,385,1.59];
const plantModes={grow:'观察演替',bare:'复冲后 · 裸地',grown:'复冲后 · 有植被'};
const plantSites={all:'新滩地总览',rush:'耐盐草样点',reed:'芦苇带样点',bare:'裸滩样点'};
const reachName=t=>!t?'—':sedimentReaches.reduce((a,b)=>Math.abs(a.t-t)<Math.abs(b.t-t)?a:b).name;

function drawFlows(canvas,event,frame){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const left=33,right=w-15,top=7,bottom=h-21;
  const max=Math.max(30,...event.frames.map(f=>Math.max(f.runoff,f.arrival,f.mouth,f.baseflow)));
  const ceiling=Math.ceil(max/50)*50;
  const px=hour=>left+(right-left)*hour/stormHours;
  const py=value=>bottom-(bottom-top)*value/ceiling;
  c.fillStyle='#1d3639';c.fillRect(0,0,w,h);
  c.fillStyle='#527c9453';
  c.fillRect(left,top,px(event.settings.duration)-left,bottom-top);
  c.font='10px system-ui';
  c.fillStyle='#c3daca';c.fillText('m³/h',1,17);
  for(const hour of [0,24,72,120]){
    c.beginPath();c.moveTo(px(hour),top);c.lineTo(px(hour),bottom);
    c.strokeStyle='#c6d9cf3b';c.lineWidth=1;c.stroke();
    c.fillText(hour+' h',px(hour)-6,h-6);
  }
  const series=[['runoff',colours.rain],['baseflow',colours.ground],['mouth',colours.salt]];
  for(const [key,color] of series){
    c.beginPath();c.moveTo(left,py(event.frames[0][key]));
    for(const f of event.frames)c.lineTo(px(f.hour),py(f[key]));
    c.strokeStyle=color;c.lineWidth=2;c.stroke();
  }
  c.beginPath();c.moveTo(px(frame.hour),top);c.lineTo(px(frame.hour),bottom);
  c.strokeStyle='#fff1c5';c.lineWidth=1.5;c.stroke();
}

export function mountBasinStorm(panel,scene,onBack){
  panel.innerHTML=`
    <div class="storm-location">
      <div class="tectonic-actions">
        <button id="storm-back" type="button">返回环境线 ↗</button>
      </div>
      <div class="tectonic-actions storm-study-actions" role="group" aria-label="雨潮与岸线研究">
        ${Object.entries(studies).map(([id,name])=>`<button id="storm-study-${id}" type="button" aria-pressed="false">${name}</button>`).join('')}
      </div>
      <p id="storm-status" class="plan-present" role="status"></p>
      <div id="storm-stop-nav" class="tectonic-stations">
        <select id="storm-stop" aria-label="降雨联动观察站">
          ${stormStops.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <button id="storm-prev" type="button">上一站</button>
        <button id="storm-next" type="button">下一站 →</button>
      </div>
      <div id="storm-plant-location" hidden>
        <label for="storm-plant-site">滩地样点</label>
        <select id="storm-plant-site">${Object.entries(plantSites).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select>
      </div>
      <div class="storm-settings">
        <div>
          <label for="storm-rain">上游总雨量 <output id="storm-rain-output"></output></label>
          <input id="storm-rain" type="range" min="0" max="140" value="${stormSettings.rain}" step="1">
        </div>
        <div>
          <label for="storm-duration">连续降雨</label>
          <select id="storm-duration"><option value="2">2 小时</option><option value="6" selected>6 小时</option><option value="12">12 小时</option></select>
        </div>
        <button id="storm-run" type="button">用新雨量重算</button>
      </div>
      <p id="storm-location-reading" class="plan-note"></p>
      <p id="storm-lesson" class="plan-note"></p>
      <p id="storm-boundary" class="plan-note"></p>
    </div>
    <div class="storm-timeline">
      <div id="storm-event-pane">
      <div class="tectonic-actions storm-clock-actions">
        <button id="storm-before" type="button">雨前</button>
        <button id="storm-peak" type="button">湿地洪峰</button>
        <button id="storm-mouth" type="button">洪峰对照</button>
        <button id="storm-after" type="button">退水对照</button>
      </div>
      <label class="gw-clock" for="storm-hour"><span>同一场雨的时间</span><output id="storm-time"></output></label>
      <input id="storm-hour" type="range" min="0" max="${stormHours}" value="0" step="1">
      <div class="tectonic-actions storm-tides" role="group" aria-label="地图上的降雨潮汐情景">
        ${scenarioIds.map(id=>`<button id="storm-tide-${id}" type="button" aria-pressed="false">${stormTides[id].name}</button>`).join('')}
        <button id="storm-tide-fixed" type="button" aria-pressed="false">固定潮位</button>
      </div>
      <table id="storm-compare" aria-label="同一时刻的涨潮与退潮对照">
        <thead><tr><th scope="col">同一时刻</th><th scope="col" data-tide="flood">洪峰遇涨潮</th><th scope="col" data-tide="ebb">洪峰遇退潮</th></tr></thead>
        <tbody></tbody>
      </table>
      <dl id="storm-values" class="exchange-values" hidden></dl>
      <details id="storm-flows">
        <summary>选中情景的径流、基流与入海过程</summary>
        <figure>
          <canvas width="414" height="82" aria-label="坡面径流、地下基流与入海流量的过程线"></canvas>
          <ul class="gw-rock-legend" aria-label="过程线图例">
            <li><i style="--swatch:${colours.rain}"></i>坡面径流</li>
            <li><i style="--swatch:${colours.ground}"></i>基流</li>
            <li><i style="--swatch:${colours.salt}"></i>入海增量</li>
          </ul>
        </figure>
      </details>
      </div>
      <div id="storm-shore-pane" hidden>
        <div class="tectonic-actions" role="group" aria-label="查看岸线演变阶段">
          ${shoreBenchmarks.map(n=>`<button type="button" data-shore-count="${n}">${n===0?'原岸线':n+' 场后'}</button>`).join('')}
        </div>
        <label class="gw-clock" for="storm-shore-count"><span>重复洪水场次</span><output id="storm-shore-time"></output></label>
        <input id="storm-shore-count" type="range" min="0" max="${shoreEventLimit}" step="1" value="${shoreEventLimit}">
        <dl id="storm-shore-values" class="exchange-values"></dl>
        <ul class="gw-rock-legend" aria-label="岸线和底质图例">
          <li><i style="--swatch:#8fe4ec"></i>原岸线</li>
          <li><i style="--swatch:#ffe3a1"></i>当前岸线</li>
          <li><i style="--swatch:#ffda84"></i>沙脊</li>
          <li><i style="--swatch:#c99173"></i>泥质滩面</li>
        </ul>
        <p class="plan-note">两种潮相交替重复。统一在 +0.16 m 潮位判读岸线，以便看出底床逐渐淤高的位置。</p>
      </div>
      <div id="storm-plant-pane" hidden>
        <div class="tectonic-actions storm-plant-years" role="group" aria-label="植被演替年限">
          ${successionYears.map(n=>`<button type="button" data-plant-year="${n}">${n===0?'初露裸滩':n+' 年'}</button>`).join('')}
        </div>
        <p id="storm-plant-cover" class="plan-note"></p>
        <div class="tectonic-actions storm-plant-actions" role="group" aria-label="植被与岸线对照">
          ${Object.entries(plantModes).map(([id,label])=>`<button type="button" data-plant-mode="${id}">${label}</button>`).join('')}
        </div>
        <table id="storm-plant-compare" aria-label="同一片滩地的裸地与植被对照">
          <thead><tr><th scope="col">同样复冲 ${bankTestFloods} 场</th><th scope="col">裸地</th><th scope="col">有植被</th></tr></thead>
          <tbody></tbody>
        </table>
        <ul class="gw-rock-legend" aria-label="植被与岸线图例">
          <li><i style="--swatch:#cee48a"></i>耐盐草</li>
          <li><i style="--swatch:#7fe0b6"></i>芦苇带</li>
          <li><i style="--swatch:#ed895f"></i>冲刷后重淹</li>
        </ul>
      </div>
      <div id="storm-sea-pane" hidden>
        <div class="storm-sea-settings">
          <div><label for="storm-sea-rise">长期海面抬升 <output id="storm-sea-rise-value">+0.30 m</output></label>
            <input id="storm-sea-rise" type="range" min="0" max="0.90" step="0.05" value="${seaSettings.rise}"></div>
          <div><label for="storm-sea-surge">风暴增水 <output id="storm-sea-surge-value">+0.90 m</output></label>
            <input id="storm-sea-surge" type="range" min="0" max="1.40" step="0.05" value="${seaSettings.surge}"></div>
        </div>
        <div class="tectonic-actions storm-sea-stages" role="group" aria-label="海平面与风暴潮对照阶段">
          ${seaStages.map(({id,name})=>`<button type="button" data-sea-stage="${id}">${name}</button>`).join('')}
        </div>
        <p id="storm-sea-level" class="plan-note" role="status"></p>
        <dl id="storm-sea-values" class="exchange-values"></dl>
        <ul class="gw-rock-legend" aria-label="淹水、冲刷与植被迁移图例">
          <li><i style="--swatch:#6ccce1"></i>抬升后重淹</li>
          <li><i style="--swatch:#cfb7ff"></i>风暴潮暂淹</li>
          <li><i style="--swatch:#ef9b71"></i>沉积层冲低</li>
          <li><i style="--swatch:#e1ed82"></i>耐盐草迁移</li>
          <li><i style="--swatch:#83efb9"></i>芦苇迁移</li>
        </ul>
      </div>
    </div>`;
  const find=id=>panel.querySelector('#storm-'+id);
  const doc=panel.ownerDocument,pins=doc.createElement('div');
  pins.id='storm-map-labels';pins.hidden=true;pins.setAttribute('aria-hidden','true');doc.body.append(pins);
  const projected=new Vector3();
  let trial,scenario='flood',station=stormStops[0],hour=0,back,labels=[],labelNodes=[];
  let study='water',shoreCount=shoreEventLimit;
  let plantYears=8,plantMode='grow',plantSite='all',plantView=shoreView;
  let seaPhase='peak';
  const sea={...seaSettings};

  function paintPins(stamps){
    labels=stamps;
    labelNodes=labels.map(p=>{
      const stamp=doc.createElement('span');stamp.textContent=p.text;stamp.style.setProperty('--route-color',p.color??'#ddf3c6');
      return stamp;
    });
    pins.replaceChildren(...labelNodes);
  }

  function numbers(node,metrics){
    node.innerHTML=metrics.map(([name,value,color])=>`<div style="--route-color:${color}"><dt>${name}</dt><dd>${value}</dd></div>`).join('');
  }

  function shore(){
    const evolved=scene.evolve(trial,shoreCount);
    const {rain,duration}=trial.scenarios.fixed.settings;
    paintPins(evolved.labels);
    find('status').textContent='中央河口 · 潮滩与沙洲';
    find('location-reading').textContent=shoreCount===0?'第 0 场，记录现有地形与岸线。':
      `同一潮位下，新增露出 ${square(evolved.area)}，其中沙质 ${square(evolved.barArea)}。`;
    find('lesson').textContent='深槽继续过水。浅脊上的砂和缓流岸边的细泥经过多轮堆积，分别抬高沙洲和潮滩。';
    find('boundary').textContent=`每场沿用 ${rain} mm／${duration} h，演示重复事件的累积效果。`;
    find('shore-count').value=String(shoreCount);find('shore-time').textContent=shoreCount+' 场';
    for(const b of panel.querySelectorAll('[data-shore-count]'))b.setAttribute('aria-pressed',String(Number(b.dataset.shoreCount)===shoreCount));
    numbers(find('shore-values'),[
      ['河口床面净累积',cubic(evolved.shape.stored),colours.salt],
      ['新增露出面积',square(evolved.area),colours.wetland],
      ['其中沙质滩面',square(evolved.barArea),colours.salt]
    ]);
  }
  function plants(){
    const {growth,result,habitat,supports,labels}=scene.succeed(trial,shoreCount,plantYears,scenario,plantMode);
    if(plantSite!=='all'&&!supports[plantSite])plantSite='all';
    const point=supports[plantSite];
    plantView=point?[point.x,point.z,point.height,51,1.62]:shoreView;
    find('plant-site').value=plantSite;
    for(const option of find('plant-site').options)option.disabled=option.value!=='all'&&!supports[option.value];
    paintPins(point?[]:labels);
    find('status').textContent=point?plantSites[plantSite]:'中央河口 · 新滩地植被';
    find('location-reading').textContent=point?
      `受淹约 ${amount(point.frequency*100)}% · 受淹时平均盐度 ${point.salt===null?'—':amount(point.salt,1)+'‰'}`:
      habitat.area?`同一片新露滩地，共 ${square(habitat.area)}。`:'当前底床没有新露滩地。可增加重复洪水场次或调整雨量。';
    const descriptions={
      all:'较咸、反复受潮的滩缘先由耐盐草占据。偏淡且有露出时段的滩面，随后逐渐形成芦苇带。',
      rush:'反复受潮、盐分较高的低位滩缘，耐盐草可先扎根。逐年扩展的草丛增加水流阻力，使部分细泥留下。',
      reed:'这一点处在更淡的水路附近，有露出时段可供芦苇定植。芦苇扩大以后，根茎使表层泥沙更难被冲走。',
      bare:'这个样点的盐度或受淹时长超出两类潮生植被适宜范围，或潮水接触很少，当前保留裸地。'
    };
    find('lesson').textContent=habitat.area?descriptions[plantSite]:'植被演替从“多场岸线”计算的新露滩地开始。';
    const {rain,duration}=trial.scenarios[scenario].settings;
    find('boundary').textContent=`沿用 ${shoreCount} 场形成的底床。两组复冲使用同一场 ${rain} mm／${duration} h 的雨和${stormTides[scenario]?.name??'固定潮位'}情景。`;
    find('plant-cover').textContent=`第 ${plantYears} 年 · 耐盐草 ${square(growth.saltGrassArea)} · 芦苇 ${square(growth.reedArea)} · 裸地 ${square(growth.bareArea)}`;
    for(const button of panel.querySelectorAll('[data-plant-year]'))button.setAttribute('aria-pressed',String(Number(button.dataset.plantYear)===plantYears));
    for(const button of panel.querySelectorAll('[data-plant-mode]'))button.setAttribute('aria-pressed',String(button.dataset.plantMode===plantMode));
    const table=find('plant-compare');
    table.dataset.variant=plantMode;
    const rows=[
      ['细泥截留',v=>sedimentVolume(v.retained)],
      ['床面冲失',v=>sedimentVolume(v.eroded)],
      ['原露滩重新淹没',v=>square(v.retreat)]
    ];
    table.tBodies[0].innerHTML=rows.map(([name,value])=>`<tr><th scope="row">${name}</th><td>${value(result.bare)}</td><td>${value(result.grown)}</td></tr>`).join('');
  }

  function seaChange(){
    const {coastal,habitat,migration,labels}=scene.shiftSea(trial,shoreCount,plantYears,sea,seaPhase);
    const {stats,stages}=coastal,stage=stages[seaPhase==='migration'?'after':seaPhase];
    paintPins(labels);
    find('status').textContent='中央河口 · '+seaStages.find(s=>s.id===seaPhase).name;
    const readings={
      before:`同一片潮滩和沙洲，原有 ${square(habitat.area)} 新露滩地。`,
      rise:`在同一潮段，新露滩地已有 ${square(stats.newLandRise)} 重淹。`,
      peak:`新露滩地有 ${square(stats.newLandPeak)} 被水覆盖。`,
      after:`原新露滩仍淹 ${square(stats.newLandRewet)}；研究区比仅抬升时多淹 ${square(stats.scourWet)}。`,
      migration:migration?.routes.length?'箭头从原植被样区指向有连续滩面通达的较高地。':
        '当前条件下没有算出可达的新定植带。'
    };
    find('location-reading').textContent=readings[seaPhase];
    const explanations={
      before:'以原来的 +0.16 m 潮位观察滩地和植被，后面的淹水、冲刷都以这片底床为基准。',
      rise:'水沿河口和潮沟进入原先露出的低滩。蓝色显示同一潮段下重新被水覆盖的范围。',
      peak:'风暴增水叠加在潮位和长期抬升上。紫色是只有到峰值才连通受淹的位置。',
      after:`橙色标出冲低至少 2.5 cm 的地段，约 ${square(stats.scouredArea)}。这部分滩面更难在原潮段重新露出。`,
      migration:'持续受淹或盐度升高会压缩原植被。迁入点需同时满足水盐条件，并能在低潮沿相连滩面到达。'
    };
    find('lesson').textContent=explanations[seaPhase];
    find('boundary').textContent=`沿用 ${shoreCount} 场后的底床和第 ${plantYears} 年的植被。两项水位变化使用同一 +0.16 m 潮段。`;
    const base=waterHeight(stage.frame.tide.height);
    find('sea-level').textContent=`当前外湾水位 ${base}`;
    for(const b of panel.querySelectorAll('[data-sea-stage]'))b.setAttribute('aria-pressed',String(b.dataset.seaStage===seaPhase));
    const rows={
      before:[['原新露滩地',square(habitat.area),colours.wetland]],
      rise:[['同潮位重淹',square(stats.permanentArea),colours.rain],['其中原新露滩',square(stats.newLandRise),colours.wetland]],
      peak:[['抬升已重淹',square(stats.permanentArea),colours.rain],['峰值额外暂淹',square(stats.temporaryArea),'#cfb7ff']],
      after:[['沉积层冲失',cubic(stats.volume),colours.salt],['仍重淹岸地',square(stats.remainingWet),colours.rain],
        ['其中冲刷新增',square(stats.scourWet),colours.salt]],
      migration:[['耐盐草迁入覆盖',square(migration?.grassMoved??0),'#e1ed82'],
        ['芦苇迁入覆盖',square(migration?.reedMoved??0),'#83efb9'],['原植被覆盖减少',square(migration?.lostCover??0),colours.salt]]
    };
    numbers(find('sea-values'),rows[seaPhase]);
  }

  function drawComparison(visible){
    const table=find('compare'),fixed=scenario==='fixed';
    table.hidden=fixed;find('values').hidden=!fixed;
    for(const id of [...scenarioIds,'fixed'])find('tide-'+id).setAttribute('aria-pressed',String(scenario===id));
    if(fixed)return;
    const isSediment=study==='sediment';
    const readings=scenarioIds.map(id=>isSediment?trial.sediments[id].frames[hour]:
      id===scenario?visible:scene.read(trial.scenarios[id],hour));
    const rows=isSediment?[
      ['外湾潮位',(_,id)=>{const t=trial.scenarios[id].frames[hour].tide;return `${t.name} ${waterHeight(t.height)}`;}],
      ['悬沙主要位置',r=>reachName(r.centre)],
      ['湿地累计落淤',r=>sedimentVolume(r.marsh[0]+r.marsh[1])],
      ['河口床面净沉积',r=>sedimentVolume(r.deposited)],
      ['已输往外海',r=>sedimentVolume(r.exported)]
    ]:[
      ['外湾潮位',({estuary})=>`${estuary.tide.name} ${waterHeight(estuary.tide.height)}`],
      ['苇泽水位',({wetland})=>wetland.waterStage.toFixed(2)+' m'],
      ['苇泽出水增量',(_reading,id)=>amount(trial.scenarios[id].frames[hour].leave)+' m³/h'],
      ['湿地仍淹低滩',({wetland})=>square(wetland.floodedBank)],
      ['湿地露出仍湿',({wetland})=>square(wetland.retreated)],
      ['5‰ 前缘距外湾',({estuary})=>amount(estuary.saltLine.upstream)+' m'],
      ['河口露出仍湿',({shore})=>square(shore.area)]
    ];
    table.dataset.scenario=scenario;
    table.tBodies[0].innerHTML=rows.map(([name,value])=>`<tr><th scope="row">${name}</th>${
      readings.map((r,i)=>`<td data-tide="${scenarioIds[i]}">${value(r,scenarioIds[i])}</td>`).join('')}</tr>`).join('');
  }

  function paint(){
    panel.dataset.study=study;
    for(const id of Object.keys(studies))find('study-'+id).setAttribute('aria-pressed',String(study===id));
    const isShore=study==='shore',isPlants=study==='plants',isSea=study==='sea',coastal=isShore||isPlants||isSea;
    find('event-pane').hidden=coastal;find('shore-pane').hidden=!isShore;find('plant-pane').hidden=!isPlants;
    find('sea-pane').hidden=!isSea;
    find('stop-nav').hidden=coastal;find('plant-location').hidden=!isPlants;
    find('back').textContent=back?'回到'+back.name+' ↗':'返回环境线 ↗';
    if(isShore){shore();return;}
    if(isPlants){plants();return;}
    if(isSea){seaChange();return;}
    const event=trial.scenarios[scenario],frame=event.frames[hour];
    const deposit=study==='sediment'?trial.sediments[scenario].frames[hour]:null;
    const view=scene.show(event,frame,station.id,deposit),{wetland,estuary,shore:wetShore,labels:annotations}=view;
    paintPins(annotations);
    const index=stormStops.indexOf(station);
    find('status').textContent=station.name;
    const steps={
      rain:'坡面径流带起松散颗粒。部分砂留在冲积扇，细泥随同一股快流向下游走。',
      ground:'泉水持续补给河道。泥沙主要由有冲刷能力的地表快流带来。',
      wetland:'漫出河道的水流变慢，细泥落到苇泽低滩。赭色标出本场雨淹过的落淤范围。',
      estuary:'褐色水面标出浑水带，金色短线是砂，米色短线是悬浮细泥。切换潮相观察淤积、回推和外输。'
    };
    find('lesson').textContent=deposit?steps[station.id]:station.detail;
    find('stop').value=station.id;find('prev').disabled=index===0;find('next').disabled=index===stormStops.length-1;
    find('hour').value=String(hour);
    const phase=event.settings.rain===0?'无雨':frame.rainRate>0?'降雨中':'雨已停';
    find('time').textContent=hour===0?'雨前':`第 ${hour} 小时 · ${phase}`;
    const gauges={
      rain:`坡面径流 ${amount(frame.runoff)} m³/h · 此刻入渗 ${amount(frame.infiltration)} m³/h`,
      ground:`地下蓄水 ${cubic(frame.groundwater)} · 泉口补给 ${amount(frame.baseflow,1)} m³/h`,
      wetland:`苇泽出水增量 ${amount(frame.leave,1)} m³/h · 低滩仍淹 ${square(wetland.floodedBank)}`,
      estuary:deposit?`河口净沉积 ${sedimentVolume(deposit.deposited)} · 输往外海 ${sedimentVolume(deposit.exported)}`:
        `入海增量 ${amount(frame.mouth,1)} m³/h · 露出仍湿 ${square(wetShore.area)}`
    };
    find('location-reading').textContent=deposit&&station.id==='wetland'?
      `进入苇泽 ${sedimentVolume(deposit.supplied)} · 累计落淤 ${sedimentVolume(deposit.marsh[0]+deposit.marsh[1])}`:
      gauges[station.id];
    const pulse=event.settings.rain
      ?`按固定潮位的洪峰对齐于第 ${trial.referencePeak} 小时。两组此刻潮位相同，潮流相反；当前情景的入海峰值在第 ${event.coastPeak} 小时。`
      :'雨量为 0，仍可观察潮汐带来的干湿变化。';
    find('boundary').textContent=`${event.settings.rain} mm／${event.settings.duration} h · 1 月起始水位。${
      scenario==='fixed'?'外湾潮位固定 +0.16 m。':pulse}`;
    const metrics=deposit?[
      ['进入苇泽',sedimentVolume(deposit.supplied),colours.wetland],
      ['悬沙主要位置',reachName(deposit.centre),colours.salt],
      ['河口床面净沉积',sedimentVolume(deposit.deposited),colours.salt],
      ['外海输出',sedimentVolume(deposit.exported),colours.rain]
    ]:[
      ['坡面径流',amount(frame.runoff)+' m³/h',colours.rain],['地下蓄水',cubic(frame.groundwater),colours.ground],
      ['苇泽水位',wetland.waterStage.toFixed(2)+' m',colours.wetland],
      ['湿地退水湿泥',square(wetland.retreated),colours.salt],
      ['5‰ 前缘距外湾',amount(estuary.saltLine.upstream)+' m',colours.salt],
      ['河口退水湿岸',square(wetShore.area),colours.wetland]
    ];
    numbers(find('values'),metrics);
    drawComparison(view);
    drawFlows(panel.querySelector('canvas'),event,frame);
  }
  function go(id){station=stormStops.find(s=>s.id===id)??station;paint();}
  function seek(next){hour=next;paint();}
  function run(){
    trial=scene.run({...stormSettings,rain:Number(find('rain').value),duration:Number(find('duration').value)});
    const event=trial.scenarios[scenario];
    hour=event.settings.rain===0?0:Math.max(1,Math.ceil(event.settings.duration/2));
    paint();
  }
  find('rain-output').textContent=stormSettings.rain+' mm';
  find('rain').addEventListener('input',e=>{find('rain-output').textContent=e.target.value+' mm';});
  find('run').addEventListener('click',run);
  find('back').addEventListener('click',()=>onBack(back));
  find('stop').addEventListener('change',e=>go(e.target.value));
  find('prev').addEventListener('click',()=>go(stormStops[stormStops.indexOf(station)-1]?.id));
  find('next').addEventListener('click',()=>go(stormStops[stormStops.indexOf(station)+1]?.id));
  find('hour').addEventListener('input',e=>{find('time').textContent='第 '+e.target.value+' 小时';});
  find('hour').addEventListener('change',e=>seek(Number(e.target.value)));
  find('before').addEventListener('click',()=>seek(0));
  find('peak').addEventListener('click',()=>seek(trial.scenarios[scenario].wetlandPeak));
  find('mouth').addEventListener('click',()=>seek(trial.referencePeak));
  find('after').addEventListener('click',()=>{
    const step=scenario==='fixed'?24:2;
    seek(Math.min(stormHours,trial.referencePeak+step));
  });
  for(const id of [...scenarioIds,'fixed'])find('tide-'+id).addEventListener('click',()=>{scenario=id;paint();});
  for(const id of Object.keys(studies))find('study-'+id).addEventListener('click',()=>{study=id;paint();});
  for(const b of panel.querySelectorAll('[data-shore-count]'))b.addEventListener('click',()=>{shoreCount=Number(b.dataset.shoreCount);paint();});
  find('shore-count').addEventListener('input',e=>{find('shore-time').textContent=e.target.value+' 场';});
  find('shore-count').addEventListener('change',e=>{shoreCount=Number(e.target.value);paint();});
  find('plant-site').addEventListener('change',e=>{plantSite=e.target.value;paint();});
  for(const b of panel.querySelectorAll('[data-plant-year]'))b.addEventListener('click',()=>{plantYears=Number(b.dataset.plantYear);paint();});
  for(const b of panel.querySelectorAll('[data-plant-mode]'))b.addEventListener('click',()=>{plantMode=b.dataset.plantMode;paint();});
  for(const setting of Object.keys(seaSettings)){
    const control=find('sea-'+setting);
    control.addEventListener('input',()=>{find('sea-'+setting+'-value').textContent=waterHeight(Number(control.value));});
    control.addEventListener('change',()=>{sea[setting]=Number(control.value);paint();});
  }
  for(const b of panel.querySelectorAll('[data-sea-stage]'))b.addEventListener('click',()=>{seaPhase=b.dataset.seaStage;paint();});
  return {
    get status(){
      if(!trial)return null;
      const rain=trial.scenarios[scenario].settings.rain;
      if(study==='plants')return `新滩地 · 第 ${plantYears} 年`;
      if(study==='sea')return `中央河口 · ${seaStages.find(s=>s.id===seaPhase).name}`;
      return study==='shore'?`${rain} mm · 已重复 ${shoreCount} 场`:
        `${rain} mm · 第 ${hour} 小时 · ${stormTides[scenario]?.name??'固定潮位'}`;
    },
    show(context={}){
      back=context.back;pins.hidden=false;
      if(Object.hasOwn(studies,context.study))study=context.study;
      if(!trial){
        trial=scene.run(stormSettings);
        hour=context.focus==='wetland'||context.focus==='estuary'?trial.referencePeak:3;
      }
      go(context.focus);
    },
    hide(){pins.hidden=true;scene.hide();},
    update(dt){scene.update(dt);},
    project(camera){
      const bound=panel.closest('#world-plan-panel').getBoundingClientRect(),placed=[];
      labels.forEach(({x,y,z},i)=>{
        const p=projected.set(x,y,z).project(camera);
        const u=(p.x*.5+.5)*innerWidth,v=(-p.y*.5+.5)*innerHeight;
        const covered=u>bound.left-57&&u<bound.right+57&&v>bound.top-12&&v<bound.bottom+12;
        const overlap=placed.some(([x,y])=>Math.abs(u-x)<112&&Math.abs(v-y)<25),label=labelNodes[i];
        label.hidden=covered||overlap||p.z< -1||p.z>1||u<57||u>innerWidth-57||v<86||v>innerHeight-31;
        if(!label.hidden){
          label.style.transform=`translate(${u}px,${v}px) translate(-50%,-50%)`;
          placed.push([u,v]);
        }
      });
    },
    get view(){return study==='plants'?plantView:study==='shore'||study==='sea'?shoreView:station.view;}
  };
}

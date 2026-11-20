import {basinStops} from './watershed-world.js';

const round=new Intl.NumberFormat('zh-CN',{maximumFractionDigits:0});
const cubic=value=>round.format(value)+' m³';
const stage=value=>value.toFixed(2)+' m';
const change=value=>(value>=.5?'+':value<=-.5?'−':'')+cubic(Math.abs(value));
const layerHints={
  runoff:'青蓝箭头沿 40 米网格下坡汇流。雪岭的浅色箭头表示融雪参与补给。',
  ground:'金色下箭头表示入渗。紫色箭头表示浅层地下水延后回补河道的示意。',
  water:'水面按当月蓄水量与床底裁切。细金线标示该水体的全年最高岸线。'
};

export function mountWatershedBalance(panel,scene,reduced,onSediment) {
  panel.innerHTML=`
    <div class="balance-location">
      <label for="balance-stop">流域主线</label>
      <select id="balance-stop"><option value="all">整张流域图</option>${basinStops
        .map(({id,name})=>`<option value="${id}">${name}</option>`).join('')}</select>
      <button id="balance-next" type="button">下一段 →</button>
    </div>
    <div class="annual-timeline">
      <label for="balance-month">月份 <output id="balance-month-value">7 月</output></label>
      <input id="balance-month" type="range" min="1" max="12" step="1" value="7">
      <button id="balance-play" type="button" aria-pressed="false">播放全年</button>
    </div>
    <div class="annual-controls" aria-label="流域显示">
      <button type="button" data-balance-layer="runoff" aria-pressed="false">坡面汇流</button>
      <button type="button" data-balance-layer="ground" aria-pressed="false">入渗与基流</button>
      <button type="button" data-balance-layer="water" aria-pressed="false">季节水位</button>
    </div>
    <p id="balance-summary" class="plan-present" role="status"></p>
    <p id="balance-lesson" class="plan-note"></p>
    <p id="balance-hint" class="plan-note"></p>
    <div id="balance-range">
      <div class="balance-extrema">
        <button id="balance-low" type="button"></button><button id="balance-high" type="button"></button>
      </div>
      <div id="balance-series" aria-label="各月水位或出流"></div>
    </div>
    <details id="balance-ledger" open>
      <summary>月度水量账本</summary>
      <dl id="balance-values" class="balance-values"></dl>
    </details>
    <details id="balance-all">
      <summary>全图收支与存量变化</summary>
      <dl id="balance-total-values" class="balance-values"></dl>
    </details>
    <button id="balance-to-sediment" type="button">沿水流看冲刷和沉积 →</button>
    <p class="plan-note">水量使用场景立方米。月降水由全年风雨的相对强度换算。地下水采用浅层蓄水库示意。</p>
  `;
  const find=selector=>panel.querySelector(selector), stop=find('#balance-stop'), slider=find('#balance-month');
  const play=find('#balance-play'),next=find('#balance-next'),range=find('#balance-range');
  const low=find('#balance-low'),high=find('#balance-high'),chart=find('#balance-series');
  const choices=panel.querySelectorAll('[data-balance-layer]');
  find('#balance-to-sediment').addEventListener('click',()=>{
    const destination={north:'head',main:'flood',wetland:'flood',all:'head'};
    onSediment({month,focus:destination[focus]??'all'});
  });
  let month=7,focus='all',layer='runoff',active=false,playing=false,clock=0;
  let minimum=1,maximum=7;

  function values(target,rows){
    find(target).innerHTML=rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  }
  function setChart(year,id){
    range.hidden=false;
    const levels=year.map(f=>f.records[id].stage??f.records[id].outflow), min=Math.min(...levels),max=Math.max(...levels);
    minimum=levels.indexOf(min)+1;maximum=levels.indexOf(max)+1;
    const isStage=year[0].records[id].stage!==null;
    const label=isStage?stage:cubic;
    low.textContent=`低水 ${minimum}月 · ${label(min)}`;
    high.textContent=`高水 ${maximum}月 · ${label(max)}`;
    chart.innerHTML=levels.map((y,i)=>{
      const h=Math.round(22+78*(y-min)/Math.max(max-min,.0001)), selected=month===i+1;
      return `<button type="button" data-month="${i+1}" aria-pressed="${selected}"
        aria-label="${i+1}月 ${label(y)}" title="${i+1}月 ${label(y)}">
        <i style="height:${h}%"></i><span>${i+1}</span>
      </button>`;
    }).join('');
  }
  function paint(){
    const {frame,year}=scene.show(month,focus,layer),{totals}=frame;
    const selected=basinStops.find(s=>s.id===focus), record=frame.records[focus];
    slider.value=month;
    slider.setAttribute('aria-valuetext',month+' 月');
    find('#balance-month-value').value=month+' 月';
    choices.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.balanceLayer===layer)));
    find('#balance-lesson').textContent=selected?.detail??'从雪岭出发，沿北部支谷看入渗，再到内陆湖、中央河、湿地和海湾，最后对比内流盐盆。';
    find('#balance-hint').textContent=layerHints[layer];
    if(focus==='all'){
      range.hidden=true;
      find('#balance-summary').textContent=`${month} 月 · 陆面雨雪 ${cubic(totals.rain+totals.snowfall)} · 入海 ${cubic(totals.sea)}`;
      values('#balance-values',[['中央主河水位',stage(frame.records.main.stage)],['澄镜湖水位',stage(frame.records.lake.stage)],
        ['苇泽湿地水位',stage(frame.records.wetland.stage)],['盐湖水位',stage(frame.records.salt.stage)]]);
    }else{
      const result=record.stage===null?`本月送出 ${cubic(record.outflow)}`:
        `水位 ${stage(record.stage)} · 水面 ${round.format(record.area)} m²`;
      const salt=focus==='salt'?` · 盐沼 ${stage(frame.records.saltMarsh.stage)}`:'';
      find('#balance-summary').textContent=`${month} 月 · ${result}${salt}`;
      setChart(year,focus);
      const rows=[
        ['降雨',cubic(record.rain)],['降雪水当量',cubic(record.snowfall)],
        ['融雪',cubic(record.melt)],['入渗土壤',cubic(record.infiltration)],
        ['下渗至地下水',cubic(record.percolation)],['坡面径流',cubic(record.surface)],
        ['基流',cubic(record.baseflow)],['水面直接降水',cubic(record.direct)],
        ['上游来水',cubic(record.incoming)],['陆面蒸散与升华',cubic(record.landET+record.sublimation)],
        ['水面蒸发',cubic(record.waterEvaporation)],['送往下游',cubic(record.outflow)],
        ['地表蓄水变化',change(record.deltaWater)],['土壤蓄水变化',change(record.deltaSoil)],
        ['浅层地下水变化',change(record.deltaGround)],['积雪水量变化',change(record.deltaSnow)],
        ['期末地表蓄水',cubic(record.storage)],['水面账本差额',cubic(Math.abs(record.residual))]
      ];
      if(focus==='salt')rows.push(['盐沼蓄水变化',change(frame.records.saltMarsh.deltaWater)],
        ['盐沼送往下游',cubic(frame.records.saltMarsh.outflow)]);
      values('#balance-values',rows);
    }
    values('#balance-total-values',[
      ['陆面降雨',cubic(totals.rain)],['陆面降雪',cubic(totals.snowfall)],['送入海湾及外海',cubic(totals.sea)],
      ['陆面蒸散与升华',cubic(totals.landET+totals.sublimation)],['水面蒸发',cubic(totals.waterEvaporation)],
      ['地表存量变化',change(totals.deltaWater)],['土壤存量变化',change(totals.deltaSoil)],
      ['地下水存量变化',change(totals.deltaGround)],['积雪存量变化',change(totals.deltaSnow)],
      ['全图闭合差额',cubic(Math.abs(totals.residual))]
    ]);
  }
  function pause(){playing=false;play.textContent='播放全年';play.setAttribute('aria-pressed','false');}
  function setMonth(value){pause();month=Number(value);paint();}
  function setFocus(id){focus=id;stop.value=id;paint();}
  slider.addEventListener('input',()=>setMonth(slider.value));
  stop.addEventListener('change',()=>setFocus(stop.value));
  next.addEventListener('click',()=>{
    const i=basinStops.findIndex(s=>s.id===focus);
    setFocus(basinStops[i+1]?.id??'all');
  });
  choices.forEach(b=>b.addEventListener('click',()=>{layer=b.dataset.balanceLayer;paint();}));
  low.addEventListener('click',()=>{layer='water';setMonth(minimum);});
  high.addEventListener('click',()=>{layer='water';setMonth(maximum);});
  chart.addEventListener('click',event=>{
    const button=event.target.closest('button[data-month]');
    if(button){setMonth(button.dataset.month);chart.querySelector(`button[data-month="${month}"]`)?.focus({preventScroll:true});}
  });
  play.addEventListener('click',()=>{
    if(playing){pause();return;}
    playing=true;clock=0;month=1;play.textContent='暂停播放';play.setAttribute('aria-pressed','true');paint();
  });

  return {
    show(context={}){
      active=true;
      if(context.month)month=context.month;
      if(context.focus==='all'||basinStops.some(s=>s.id===context.focus)){focus=context.focus;stop.value=focus;}
      paint();
    },
    hide(){active=false;pause();scene.hide();},
    update(dt){
      if(!active)return;
      scene.update(dt);
      if(!playing)return;
      clock+=dt;
      if(clock<(reduced?2.2:1.7))return;
      clock=0;
      if(month===12){pause();return;}
      month++;paint();
    },
    get view(){return active?basinStops.find(s=>s.id===focus)?.view:null;}
  };
}

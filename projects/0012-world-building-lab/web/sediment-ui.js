import {sedimentStops,sedimentVolume} from './sediment-model.js';

const decimal=new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2});
const cubic=value=>decimal.format(value)+' m³';
const area=value=>Math.round(value).toLocaleString('zh-CN')+' m²';
const captions={
  month:'橙线为坡面冲刷，浅金和浅棕点划线分别代表砂砾与细泥。',
  year:'从 1 月累计到所选月份。坡面留下冲刷痕迹，沉积色层的厚度经过放大。',
  base:'显示已有地貌和所选月份的水面，可与泥沙图层直接对照。'
};
const toWater={head:'north',fan:'north',north:'north',flood:'wetland',mouth:'wetland'};

function waterVolume(frame,stop){
  return (frame.reaches[stop]??frame.reaches.flood).water;
}

function stopValues(frame,stop){
  const reach=frame.reaches[stop];
  if(!reach)return [
    ['坡面冲刷',cubic(sedimentVolume(frame.eroded))],
    ['坡面及河湖沉积',cubic(sedimentVolume(frame.deposited))],
    ['继续输向海湾外',cubic(sedimentVolume(frame.exported))]
  ];
  const rows=[['本月过水量',cubic(reach.water)]];
  if(stop==='head')rows.push(['产沙坡面冲刷',cubic(reach.erosion)]);
  rows.push(['送到下游',cubic(sedimentVolume(reach.out))]);
  if(stop==='fan')rows.push(['扇面砂砾',cubic(reach.deposited.coarse)],['扇面细泥',cubic(reach.deposited.fine)]);
  if(stop==='flood')rows.push(['漫过低岸面积',area(reach.overbankArea)],['滩面细泥',cubic(reach.overbank.fine)]);
  if(stop==='mouth')rows.push(['河口沙洲砂砾',cubic(reach.deposited.coarse)],['河口细泥落淤',cubic(reach.deposited.fine)]);
  if(stop==='fan'||stop==='flood'||stop==='mouth'){
    const accumulated=frame.yearDeposits[stop];
    rows.push(['本年累计沉积',cubic(stop==='mouth'?accumulated.coarse:sedimentVolume(accumulated))]);
  }
  return rows;
}

function processVolume(frame,focus){
  const reach=frame.reaches[focus];
  switch(focus){
    case 'head':return reach.erosion;
    case 'fan':return reach.deposited.coarse;
    case 'north':return sedimentVolume(reach.out);
    case 'flood':return reach.overbank.fine;
    case 'mouth':return reach.deposited.coarse;
    default:return sedimentVolume(frame.eroded);
  }
}

export function mountSediment(panel,scene,reduced,onWater,onSoil){
  panel.innerHTML=`
    <div class="balance-location">
      <label for="sediment-stop">水流与泥沙主线</label>
      <select id="sediment-stop"><option value="all">从山口到海湾 · 全貌</option>${sedimentStops.map(
        ({id,name})=>`<option value="${id}">${name}</option>`).join('')}</select>
      <button id="sediment-next" type="button">下一段 →</button>
    </div>
    <div class="annual-timeline">
      <label for="sediment-month">月份 <output id="sediment-month-value">7 月</output></label>
      <input id="sediment-month" type="range" min="1" max="12" step="1" value="7">
      <button id="sediment-play" type="button" aria-pressed="false">播放全年</button>
    </div>
    <div class="annual-controls" aria-label="地貌对照图层">
      <button data-sediment-layer="month" type="button" aria-pressed="true">本月冲淤</button>
      <button data-sediment-layer="year" type="button" aria-pressed="false">年内累积</button>
      <button data-sediment-layer="base" type="button" aria-pressed="false">既有地貌</button>
    </div>
    <p id="sediment-summary" class="plan-present" role="status"></p>
    <div class="balance-extrema">
      <button id="sediment-low" type="button"></button>
      <button id="sediment-high" type="button"></button>
    </div>
    <p id="sediment-lesson" class="plan-note"></p>
    <p id="sediment-caption" class="plan-note"></p>
    <details open>
      <summary>本站水量与泥沙</summary>
      <dl id="sediment-values" class="balance-values"></dl>
    </details>
    <details>
      <summary>中央海湾流域泥沙账本</summary>
      <dl id="sediment-ledger" class="balance-values"></dl>
      <p class="plan-note">账本含坡脚、湖底和河道内沉积。范围为中央海湾流域。</p>
    </details>
    <div class="annual-controls">
      <button id="sediment-back" type="button">← 看同月的流域收支</button>
      <button id="sediment-to-soil" type="button">看土壤与植被 →</button>
    </div>
    <p class="plan-note">泥沙量为场景估算值。扇面水路为地形参照，主河和湿地使用当月水位。</p>
  `;
  const find=id=>panel.querySelector('#sediment-'+id),slider=find('month'),select=find('stop');
  const play=find('play'),next=find('next'),low=find('low'),high=find('high');
  const layers=panel.querySelectorAll('[data-sediment-layer]');
  let active=false,playing=false,clock=0,month=7,focus='head',layer='month',minMonth=1,maxMonth=7;
  function writeRows(id,rows){
    find(id).innerHTML=rows.map(([name,value])=>`<div><dt>${name}</dt><dd>${value}</dd></div>`).join('');
  }
  function paint(){
    if(!active)return;
    const {frame,year}=scene.show(month,focus,layer);
    const current=sedimentStops.find(stop=>stop.id===focus);
    const names={head:'坡面冲刷',fan:'扇面砂砾',north:'向下游搬运',flood:'滩面细泥',mouth:'河口沙洲砂砾'};
    const cumulative=layer==='year';
    const volume=cumulative?year.slice(0,month).reduce((sum,f)=>sum+processVolume(f,focus),0):
      processVolume(frame,focus);
    const water=year.map(sample=>waterVolume(sample,focus));
    minMonth=water.indexOf(Math.min(...water))+1;
    maxMonth=water.indexOf(Math.max(...water))+1;
    low.textContent=`${minMonth} 月低水量`;high.textContent=`${maxMonth} 月高水量`;
    low.setAttribute('aria-pressed',String(month===minMonth));
    high.setAttribute('aria-pressed',String(month===maxMonth));
    slider.value=String(month);select.value=focus;
    find('month-value').value=`${month} 月`;
    find('summary').textContent=`${cumulative?'截至 ':''}${month} 月 · ${cumulative?'累计':''}${names[focus]??'全流域坡面冲刷'} ${cubic(volume)}`;
    find('lesson').textContent=current?.detail??'从山口沿北部冲积扇、东支谷和中央主河下行，到苇泽湿地和中央海湾。';
    find('caption').textContent=cumulative&&focus==='north'?
      '支谷的数值为年内累计搬运量。切到「本月冲淤」可看泥沙沿谷移动。':captions[layer];
    next.textContent=focus==='mouth'?'返回全貌 ↗':'下一段 →';
    layers.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sedimentLayer===layer)));
    writeRows('values',stopValues(frame,focus));
    writeRows('ledger',[
      ['坡面冲刷',cubic(sedimentVolume(frame.eroded))],
      ['留在流域与河口',cubic(sedimentVolume(frame.deposited))],
      ['输向海湾外',cubic(sedimentVolume(frame.exported))],
      ['闭合差额',cubic(Math.abs(sedimentVolume(frame.residual)))]
    ]);
  }
  function pause(){playing=false;play.textContent='播放全年';play.setAttribute('aria-pressed','false');}
  function setMonth(value){month=Number(value);pause();paint();}
  slider.addEventListener('input',()=>setMonth(slider.value));
  select.addEventListener('change',()=>{focus=select.value;paint();});
  next.addEventListener('click',()=>{
    const index=sedimentStops.findIndex(stop=>stop.id===focus);
    focus=sedimentStops[index+1]?.id??'all';paint();
  });
  layers.forEach(button=>button.addEventListener('click',()=>{layer=button.dataset.sedimentLayer;paint();}));
  low.addEventListener('click',()=>setMonth(minMonth));high.addEventListener('click',()=>setMonth(maxMonth));
  play.addEventListener('click',()=>{
    if(playing){pause();return;}
    playing=true;clock=0;month=1;play.textContent='暂停播放';play.setAttribute('aria-pressed','true');paint();
  });
  find('back').addEventListener('click',()=>onWater({month,focus:toWater[focus]??'all'}));
  find('to-soil').addEventListener('click',()=>onSoil({month,focus:focus==='north'?'all':focus}));
  return {
    show(context={}){
      active=true;month=context.month??month;
      if(context.focus==='all'||sedimentStops.some(stop=>stop.id===context.focus))focus=context.focus;
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
    get view(){return active?sedimentStops.find(stop=>stop.id===focus)?.view:null;}
  };
}

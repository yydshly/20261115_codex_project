import {soilPlants,soilStops,soilView} from './soil-model.js';

const sampleNames={
  head:['上坡','坡中','坡脚'],fan:['扇顶','扇中','扇尾'],
  flood:['高滩','漫水边','低滩'],mouth:['近海低滩','分汊浅滩','上游侧']
};
const sampleLetters=['A','B','C'];
const sedimentFocus={head:'head',fan:'fan',flood:'flood',mouth:'mouth'};
const decimal=new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2});
const layerHelp={
  profile:'亮点标出样点。抬起的三维剖面统一放大厚度，面板刻度以厘米计。',
  water:'地表暖黄较干、蓝绿色较湿、紫色表示盐分影响较强。可切换 1 月和 7 月。',
  plants:'绿色斑块示意适生范围，株丛适度放大。切月时在同一位置对照水面与植株状态。'
};

const cm=value=>Math.round(value)+' cm';
const index=value=>Math.round(value*100)+' / 100';
const palette=(a,b,t)=>'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')+')';

function coreGraphic(probes){
  return probes.map((s,i)=>{
    const subsoil=palette([179,124,85],[101,140,145],s.reduced*.9);
    const height=value=>Math.max(.8,value/110*100).toFixed(2);
    return `<span class="soil-core" aria-label="${sampleLetters[i]} 样点土层厚 ${cm(s.rootDepth)}">
      <b>${sampleLetters[i]}</b><i style="height:${height(s.topsoil)}%;background:#604135"></i>
      <i style="height:${height(s.subsoil)}%;background:${subsoil}"></i>
      <i style="height:${height(s.material)}%;background:#bd996a"></i>
      <i style="height:${height(110-s.rootDepth)}%;background:#697070"></i>
    </span>`;
  }).join('');
}

export function mountSoil(panel,scene,onSediment){
  panel.innerHTML=`
    <div class="balance-location">
      <label for="soil-stop">从山坡到河口</label>
      <select id="soil-stop"><option value="all">四段土壤过渡 · 全貌</option>${soilStops.map(
        ({id,name})=>`<option value="${id}">${name}</option>`).join('')}</select>
      <button id="soil-next" type="button">下一段 →</button>
    </div>
    <div class="annual-timeline">
      <label for="soil-month">月份 <output id="soil-month-value">7 月</output></label>
      <input id="soil-month" type="range" min="1" max="12" step="1" value="7">
      <button data-soil-month="1" type="button">1 月</button><button data-soil-month="7" type="button">7 月</button>
    </div>
    <div class="annual-controls" aria-label="土壤地图图层">
      <button data-soil-layer="profile" type="button" aria-pressed="false">土层剖面</button>
      <button data-soil-layer="water" type="button" aria-pressed="false">水分与盐度</button>
      <button data-soil-layer="plants" type="button" aria-pressed="false">植被分布</button>
    </div>
    <p id="soil-summary" class="plan-present" role="status"></p>
    <div id="soil-probes" aria-label="剖面取样点" class="annual-controls">
      ${sampleLetters.map((name,i)=>`<button data-soil-probe="${i}" type="button" aria-pressed="false">${name}</button>`).join('')}
    </div>
    <p id="soil-detail" class="plan-note"></p>
    <p id="soil-key" class="plan-note"></p>
    <details id="soil-specimen" open>
      <summary>土层和当月环境</summary>
      <div id="soil-cores"><div class="soil-ruler"><span>0 cm</span><span>55</span><span>110</span></div><div id="soil-columns"></div></div>
      <p class="plan-note">从上到下为表土、心土、母质层与下伏基底。灰蓝心土示意反复饱水缺氧。</p>
      <dl id="soil-values" class="balance-values"></dl>
    </details>
    <p id="soil-plant-counts" class="plan-note"></p>
    <button id="soil-back" type="button">← 查看同月泥沙</button>
    <p class="plan-note">厘米、湿润与盐度指数用于场景对照。土层厚度采用长期背景，本月新增泥沙单独显示。</p>
  `;
  const find=id=>panel.querySelector('#soil-'+id),select=find('stop'),slider=find('month');
  const layerButtons=panel.querySelectorAll('[data-soil-layer]');
  const monthButtons=panel.querySelectorAll('[data-soil-month]');
  const probeButtons=panel.querySelectorAll('[data-soil-probe]');
  let active=false,month=7,focus='head',layer='profile',probe=1;

  function paint(){
    if(!active)return;
    const result=scene.show(month,focus,layer,probe);
    const stop=soilStops.find(item=>item.id===focus);
    select.value=focus;slider.value=String(month);find('month-value').value=`${month} 月`;
    layerButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.soilLayer===layer)));
    monthButtons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.soilMonth)===month)));
    find('next').textContent=focus==='mouth'?'看全线 ↗':'下一段 →';
    find('probes').hidden=!result;find('specimen').hidden=!result;find('plant-counts').hidden=!result||layer!=='plants';
    find('detail').textContent=stop?.detail??'顺着金线从山口、扇面与北部支谷进入苇泽湿地，再到中央海湾。选一段放大取样。';
    find('key').textContent=focus==='all'&&layer==='profile'?'全貌用水盐色层定位。选择一段可看三维剖面。':layerHelp[layer];
    if(!result){
      find('summary').textContent=`${month} 月 · 四段土壤与植被过渡`;
      return;
    }
    const {probes,counts,deposit}=result,s=probes[probe],weather=s.months[month-1];
    probeButtons.forEach((b,i)=>{
      b.textContent=`${sampleLetters[i]} · ${sampleNames[focus][i]}`;
      b.setAttribute('aria-pressed',String(i===probe));
    });
    find('summary').textContent=`${sampleLetters[probe]} 点 · 土层 ${cm(s.rootDepth)} · 湿度 ${index(weather.moisture)} · 盐度 ${index(weather.salt)}`;
    find('columns').innerHTML=coreGraphic(probes);
    const rows=[
      ['母质',stop.rock],['表土 / 心土 / 母质层',[s.topsoil,s.subsoil,s.material].map(cm).join(' / ')],
      ['场景细料 / 砾石比例',`${Math.round(s.fine*100)}% / ${Math.round(s.gravel*100)}%`],
      ['当月地表',weather.flooded?'样点被水覆盖':'样点露出'],['一年内受淹月份',`${Math.round(s.inundated*12)} / 12`],
      [deposit.label,decimal.format(deposit.volume)+' m³']
    ];
    if(focus==='head')rows.splice(1,0,['母岩设定',s.rockBand>.55?'较易风化的岩层':'较耐蚀的岩层']);
    find('values').innerHTML=rows.map(([term,value])=>`<div><dt>${term}</dt><dd>${value}</dd></div>`).join('');
    find('plant-counts').textContent=counts.slice(0,5).map(([kind,n])=>soilPlants[kind]+' '+n+' 丛').join(' · ');
  }
  slider.addEventListener('input',()=>{month=Number(slider.value);paint();});
  select.addEventListener('change',()=>{focus=select.value;probe=1;paint();});
  find('next').addEventListener('click',()=>{
    const i=soilStops.findIndex(s=>s.id===focus);
    focus=soilStops[i+1]?.id??'all';probe=1;paint();
  });
  monthButtons.forEach(button=>button.addEventListener('click',()=>{month=Number(button.dataset.soilMonth);paint();}));
  probeButtons.forEach(button=>button.addEventListener('click',()=>{probe=Number(button.dataset.soilProbe);paint();}));
  layerButtons.forEach(button=>button.addEventListener('click',()=>{layer=button.dataset.soilLayer;paint();}));
  find('back').addEventListener('click',()=>onSediment({month,focus:sedimentFocus[focus]??'all'}));
  return {
    show(context={}){
      active=true;month=context.month??month;
      if(context.focus==='all'||soilStops.some(stop=>stop.id===context.focus)){focus=context.focus;probe=1;}
      paint();
    },
    hide(){active=false;scene.hide();},
    get view(){
      const stop=soilStops.find(s=>s.id===focus);
      return active?(stop?soilView(stop):[-1165,-687,35,1180]):null;
    }
  };
}

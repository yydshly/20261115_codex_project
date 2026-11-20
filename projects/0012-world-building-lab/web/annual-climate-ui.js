import {seasonMonths,windName} from './annual-climate.js';
import {geographyLegs} from './regional-geography.js';

const points={
  alpine:[['雪岭',552,-562],['山前坡',1010,-800]],
  north:[['北侧山口',-820,-1080],['扇面下缘',-940,-870]],
  west:[['高原坡脚',-1400,465],['盐湖盆缘',-1570,80]],
  south:[['丘陵西南坡',-665,1100],['草原侧',-425,980]],
  dry:[['干谷外侧',170,1190],['绿洲岸',335,1382]],
  east:[['东部山前',1130,-408],['近岸低坡',1640,245]]
};
const titles={alpine:'高山与雪岭',north:'北部山口与冲积扇',west:'高原与内流盐盆',
  south:'雨林丘陵与草原',dry:'干谷绿洲与风蚀地',east:'东部山前与岩岸'};
const flowNames={ice:'冰雪融水支线',north:'北部双支流',lake:'内陆湖来水',main:'中央主河',south:'高原至雨林河口',salt:'盐盆内部汇水'};
const layers={wind:'风向与水汽',rain:'降雨与降雪',response:'水系和地表响应'};
const layerHints={
  wind:'箭头指向风吹去的方向。青色表示水汽较多，浅黄表示较干。',
  rain:'蓝色表示较强降雨，白色表示降雪，棕色表示少雨。斜线显示降水飘落的方向。',
  response:'青色带越宽、流纹越快，河道补给越强。湿地表变暗，干草转黄，冷坡保留积雪。'
};

export function mountAnnualClimate(panel, scene, reduced, onBalance) {
  panel.innerHTML=`
    <div class="annual-controls" aria-label="季节快选">${['春季','夏季','秋季','冬季']
      .map((s,i)=>`<button type="button" data-annual-month="${seasonMonths[i]}" aria-pressed="false">${s}</button>`).join('')}
    </div>
    <button id="annual-to-balance" type="button">沿来水看流域收支 →</button>
    <div class="annual-timeline">
      <label for="annual-month">月份 <output id="annual-month-value">7 月</output></label>
      <input id="annual-month" type="range" min="1" max="12" value="7" step="1">
      <button id="annual-play" type="button" aria-pressed="false">播放全年</button>
    </div>
    <label class="annual-location">对照位置
      <select id="annual-location"><option value="all">整张地图</option>${geographyLegs.map(({id})=>`<option value="${id}">${titles[id]}</option>`).join('')}</select>
    </label>
    <div class="annual-controls" aria-label="场景显示">${Object.entries(layers)
      .map(([id,name])=>`<button type="button" data-annual-layer="${id}" aria-pressed="false">${name}</button>`).join('')}
    </div>
    <p id="annual-summary" role="status" class="plan-present"></p>
    <p id="annual-hint" class="plan-note"></p>
    <table class="annual-points">
      <caption id="annual-points-caption"></caption>
      <thead><tr><th scope="col">位置</th><th scope="col">水汽</th><th scope="col">雨</th><th scope="col">雪</th><th scope="col">土壤湿度</th></tr></thead>
      <tbody id="annual-samples"></tbody>
    </table>
    <details id="annual-flows">
      <summary>查看各水系补给</summary>
      <p class="plan-note">100 是该水系全年最高的补给指数。中央主河已合计上游支流，盐盆汇水留在盆内。</p>
      <div id="annual-flow-values"></div>
    </details>
    <p class="plan-note">数值为相对指数。风场在 40 米网格上计算，河道补给只统计能沿坡面连到已登记水路的地块。</p>`;

  const find=s=>panel.querySelector(s);
  const monthInput=find('#annual-month'), output=find('#annual-month-value'), play=find('#annual-play');
  const location=find('#annual-location'), summary=find('#annual-summary'),hint=find('#annual-hint');
  const monthButtons=panel.querySelectorAll('[data-annual-month]'), layerButtons=panel.querySelectorAll('[data-annual-layer]');
  let active=false, month=7, layer='wind', focus='all', clock=0, playing=false;
  const scale=(n,span)=>Math.max(0,Math.min(100,Math.round(n/span*100)));
  const pointsRows=find('#annual-samples'), flowRows=find('#annual-flow-values');

  function paint(){
    const {frame,at,flooded}=scene.show(month,layer), {wind}=frame;
    monthInput.value=month;output.value=month+' 月';
    monthInput.setAttribute('aria-valuetext',month+' 月');
    monthButtons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.annualMonth)===month)));
    layerButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.annualLayer===layer)));
    const extra=month>=6&&month<=8?' · 东南沿海另有海风带':'';
    summary.textContent=`${month} 月 · ${windName(wind.bearing)}${extra}`;
    hint.textContent=layerHints[layer]+(layer==='response'?` 冲积扇现为${flooded?'涨水':'常水'}参考。`:'');
    const selected=focus==='all'?'south':focus;
    find('#annual-points-caption').textContent=titles[selected]+' · 两点对照（0–100）';
    pointsRows.innerHTML=points[selected].map(([name,x,z])=>{
      const f=at(x,z),cells=[scale(f.vapor,1),scale(f.rain,.13),scale(f.snowfall,.13),scale(f.soil,.2)];
      return `<tr><th scope="row">${name}</th>${cells.map(n=>`<td>${n}</td>`).join('')}</tr>`;
    }).join('');
    flowRows.innerHTML=Object.entries(flowNames).map(([id,name])=>{
      const n=scale(frame.flow[id].index,1);
      return `<div class="annual-flow"><span>${name}</span><meter min="0" max="100" value="${n}" aria-label="${name}补给"></meter><b>${n}</b></div>`;
    }).join('');
  }
  function stop(){
    playing=false;play.setAttribute('aria-pressed','false');play.textContent='播放全年';
  }
  function selectMonth(value){stop();month=Number(value);paint();}
  find('#annual-to-balance').addEventListener('click',()=>{
    const catchment={alpine:'ice',north:'north',west:'salt',south:'south'};
    onBalance({month,focus:catchment[focus]??'all'});
  });
  monthInput.addEventListener('input',()=>selectMonth(monthInput.value));
  monthButtons.forEach(button=>button.addEventListener('click',()=>selectMonth(button.dataset.annualMonth)));
  layerButtons.forEach(button=>button.addEventListener('click',()=>{layer=button.dataset.annualLayer;paint();}));
  location.addEventListener('change',()=>{focus=location.value;paint();});
  play.addEventListener('click',()=>{
    if(playing){stop();return;}
    clock=0;playing=true;month=1;play.setAttribute('aria-pressed','true');play.textContent='暂停播放';paint();
  });

  return {
    show(id){
      active=true;
      if(id&&points[id]){focus=id;location.value=id;}
      paint();
    },
    hide(){active=false;stop();scene.hide();},
    update(dt){
      if(!active)return;
      scene.update(dt);
      if(!playing)return;
      clock+=dt;
      if(clock<(reduced?2.1:1.6))return;
      clock=0;
      if(month===12){stop();return;}
      month++;paint();
    },
    get view(){return active&&geographyLegs.find(leg=>leg.id===focus)?.view || null;}
  };
}

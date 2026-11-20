import {terrainHeight} from './large-world.js';
import {scrubHabitat,scrubResponse,scrubSeasons,scrubStages,scrubStops} from './scrub-recovery.js';
import {makeScrubRecoveryScene} from './scrub-recovery-scene.js';

export function mountScrubRecovery(panel,scene,resources,onBack){
  const study=makeScrubRecoveryScene(scene,resources);
  const stopOptions=scrubStops.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  panel.innerHTML=`
    <h3>南部干谷 · 硬叶灌丛与火后恢复</h3>
    <div class="formation-actions" aria-label="恢复阶段">
      ${Object.entries(scrubStages).map(([id,{name}])=>`<button type="button" data-scrub-stage="${id}">${name}</button>`).join('')}
    </div>
    <div class="formation-actions" aria-label="季节条件">
      ${Object.entries(scrubSeasons).map(([id,name])=>`<button type="button" data-scrub-season="${id}">${name}</button>`).join('')}
    </div>
    <div class="cold-nav">
      <select id="scrub-stop" aria-label="坡地观察点">${stopOptions}</select>
      <button type="button" id="scrub-next">下一站 →</button>
    </div>
    <p class="plan-present" id="scrub-status" role="status"></p>
    <p id="scrub-change"></p>
    <table class="formation-values">
      <caption>同一季节的根区湿度（相对量）</caption>
      <thead><tr>${scrubStops.slice(1).map(p=>`<th scope="col">${p.name}</th>`).join('')}</tr></thead>
      <tbody><tr id="scrub-moisture"></tr></tbody>
    </table>
    <p class="plan-note">沿用大地图的坡地和干谷高程。这个样区采用冬雨夏干条件，恢复时间与湿度为场景示意。</p>
    <div class="plan-sources">
      <a href="https://www.nps.gov/subjects/nnlandmarks/chaparral.htm" target="_blank" rel="noopener">NPS · 硬叶灌丛气候与植被 ↗</a>
      <a href="https://www.usgs.gov/data/field-studies-ceanothus-leucodermis-chaparral-burned-sites-california" target="_blank" rel="noopener">USGS · 火后萌蘖与实生更新 ↗</a>
    </div>
    <div class="formation-actions"><button type="button" id="scrub-back">返回南部干湿过渡 ↗</button></div>`;
  const find=id=>panel.querySelector('#scrub-'+id);
  let stage='before',season='dry',index=0,back=null,active=false;

  function paintView(){
    const stop=scrubStops[index];
    find('stop').value=stop.id;
    find('next').textContent=index===scrubStops.length-1?'回全坡 ↗':'下一站 →';
    find('status').textContent=stop.description;
  }

  function paintStage(){
    study.show(stage,season);
    for(const button of panel.querySelectorAll('[data-scrub-stage]'))
      button.setAttribute('aria-pressed',String(button.dataset.scrubStage===stage));
    for(const button of panel.querySelectorAll('[data-scrub-season]'))
      button.setAttribute('aria-pressed',String(button.dataset.scrubSeason===season));
    find('change').textContent=scrubStages[stage].description;
    find('moisture').innerHTML=scrubStops.slice(1).map(({x,z})=>{
      const reading=scrubResponse(scrubHabitat(x,z),stage,season);
      return `<td>${Math.round(reading.moisture*100)} / 100</td>`;
    }).join('');
  }

  for(const button of panel.querySelectorAll('[data-scrub-stage]')){
    button.addEventListener('click',()=>{
      stage=button.dataset.scrubStage;
      if(stage==='first')season='wet';
      if(stage==='burned')season='dry';
      paintStage();
    });
  }
  for(const button of panel.querySelectorAll('[data-scrub-season]')){
    button.addEventListener('click',()=>{season=button.dataset.scrubSeason;paintStage();});
  }
  find('stop').addEventListener('change',e=>{
    index=scrubStops.findIndex(p=>p.id===e.target.value);
    paintView();
  });
  find('next').addEventListener('click',()=>{index=(index+1)%scrubStops.length;paintView();});
  find('back').addEventListener('click',()=>onBack(back??{station:'gully'}));
  return {
    show(context={}){
      active=true;
      back=context.back??null;
      stage=Object.hasOwn(scrubStages,context.stage)?context.stage:'before';
      season=Object.hasOwn(scrubSeasons,context.season)?context.season:stage==='first'?'wet':'dry';
      index=Math.max(0,scrubStops.findIndex(p=>p.id===context.station));
      paintView();
      paintStage();
    },
    hide(){study.hide();active=false;},
    get view(){
      if(!active)return null;
      const {x,z,dx,dy,dz}=scrubStops[index],y=terrainHeight(x,z);
      const targetY=y+(index===0?2.5:1.1);
      const cameraY=Math.max(y+dy,terrainHeight(x+dx,z+dz)+5);
      return [x,z,y,Math.hypot(dx,dy,dz),undefined,{x:x+dx,y:cameraY,z:z+dz,targetY}];
    }
  };
}

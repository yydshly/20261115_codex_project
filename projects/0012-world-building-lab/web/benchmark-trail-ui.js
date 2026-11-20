import {benchmarkLength,benchmarkStops} from './benchmark-trail.js';
import {epochs,iceAdvanceIds} from './ice-age.js';
import {benchmarkRunAt,modernPassage,passageReasons} from './benchmark-time.js';
import {seaLength} from './mainline-sea.js';

const periods=[
  ['暖期',['interglacial']],['入冰',iceAdvanceIds],['盛冰期',['glacial']],
  ['退冰期',['early','pulse','warming','holocene']],['现代',['now']]
];
const names={interglacial:'暖期',inception:'入冰初期',glacial:'盛冰期',early:'退冰开始',now:'现在'};
const metres=n=>Math.round(n).toLocaleString('zh-CN')+' m';

export function mountBenchmarkTrail(document,{onReset,onGuide,onClose,onEpoch,onPoint,onMode}){
  const panel=document.createElement('section');
  panel.id='benchmark-panel';
  panel.hidden=true;
  panel.setAttribute('aria-label','雪岭到海湾步行线');
  panel.innerHTML=`
    <header><h2 id="benchmark-heading">雪岭到海湾</h2><button id="benchmark-close" type="button" aria-label="收起路线面板">×</button></header>
    <div class="benchmark-modes" role="group" aria-label="路线浏览方式">
      <button type="button" id="benchmark-mainline-mode" aria-pressed="false">主线讲解</button>
      <button type="button" id="benchmark-explore-mode" aria-pressed="true">自由探索与时间对照</button>
    </div>
    <section id="benchmark-lesson" aria-label="沿路线学习" hidden></section>
    <div id="benchmark-explore">
    <div class="benchmark-selects">
      <label for="benchmark-epoch">时期</label>
      <select id="benchmark-epoch">${periods.map(([phase,ids])=>
        `<optgroup label="${phase}">${ids.map(id=>
          `<option value="${id}">${names[id]??epochs[id].name}${epochs[id].age?' · '+epochs[id].age:''}</option>`).join('')}</optgroup>`).join('')}</select>
      <label for="benchmark-station">观察点</label>
      <select id="benchmark-station">${benchmarkStops.map(({at,name},i)=>
        `<option value="${i}">${name} · ${metres(at)}</option>`).join('')}</select>
    </div>
    <p id="benchmark-datum"></p>
    <div class="benchmark-actions">
      <button type="button" id="benchmark-guide">从起点步行导览</button>
      <button type="button" id="benchmark-reset">回雪岭起点</button>
    </div>
    <div id="benchmark-strip" aria-hidden="true"></div>
    <p id="benchmark-passage"></p>
    <details id="benchmark-sections">
      <summary>查看步行与航拍分段</summary>
      <ul id="benchmark-runs"></ul>
    </details>
    <p id="benchmark-help" class="benchmark-help"></p>
    </div>
    <p id="benchmark-site"></p>
    <progress id="benchmark-progress" max="${benchmarkLength}" value="0" aria-label="路线进度"></progress>
    <p id="benchmark-progress-text" role="status"></p>`;
  document.body.append(panel);
  const get=id=>document.getElementById('benchmark-'+id);
  const guide=get('guide'),place=get('station'),period=get('epoch'),progress=get('progress'),progressText=get('progress-text');
  const sites=get('site'),mapLabel=document.getElementById('navigation-place');
  let epoch='now',passage=modernPassage,mainline=false;
  const update=(node,text)=>{if(node.textContent!==text)node.textContent=text;};
  guide.addEventListener('click',onGuide);
  get('reset').addEventListener('click',onReset);
  get('mainline-mode').addEventListener('click',()=>onMode('mainline'));
  get('explore-mode').addEventListener('click',()=>onMode('explore'));
  function setMode(mode){
    mainline=mode==='mainline';
    get('heading').textContent=mainline?'雪岭到深海':'雪岭到海湾';
    panel.setAttribute('aria-label',mainline?'雪岭到深海环境主线':'雪岭到海湾步行线');
    progress.max=mainline?benchmarkLength+seaLength:benchmarkLength;
    get('explore').hidden=mainline;
    get('mainline-mode').setAttribute('aria-pressed',String(mainline));
    get('explore-mode').setAttribute('aria-pressed',String(!mainline));
  }
  get('close').addEventListener('click',onClose);
  period.addEventListener('change',()=>onEpoch(period.value));
  place.addEventListener('change',()=>onPoint(benchmarkStops[Number(place.value)].at));
  get('runs').addEventListener('click',event=>{
    const button=event.target.closest('[data-run]');
    if(!button)return;
    const {start,end}=passage.runs[Number(button.dataset.run)];
    onPoint((start+end)/2);
  });
  function display(show){
    panel.hidden=!show;
    document.documentElement.dataset.benchmark=show?'open':'closed';
    get('controls').setAttribute('aria-expanded',String(show));
  }
  function setPeriod(id,route){
    epoch=id;passage=route;period.value=id;
    document.documentElement.dataset.benchmarkTime=id;
    const {sea,summary}=epochs[id];
    const seaText=sea>0?'+'+sea:String(sea);
    update(get('datum'),id==='now'?'现代 · 沿干岸与栈道走 2.48 km，至海湾岸端。':`场景海面 ${seaText} m。 ${summary}`);
    update(get('passage'),`绿色步行 ${metres(route.walked)} · 金色航拍 ${metres(route.total-route.walked)}`);
    update(get('help'),id==='now'?'WASD 或方向键步行。切换时期保留当前位置。':'青线标当期岸线，橙圈标入海口。WASD 可在干地试走。小地图以现代底图定位。');
    const items=route.runs.map(({start,end,method,reasons},i)=>{
      const label=`${metres(start)} 至 ${metres(end)} · ${method==='walk'?'步行':'航拍'}`;
      const detail=[...reasons].map(reason=>passageReasons[reason]).join('、');
      return {i,label,detail,method,share:(end-start)/route.total};
    });
    get('strip').innerHTML=items.map(({share,method})=>
      `<i class="passage-${method}" style="flex-grow:${share}"></i>`).join('');
    get('runs').innerHTML=items.map(({i,label,detail,method})=>
      `<li><button type="button" data-run="${i}" class="passage-${method}">${label}</button>${detail?`<span>${detail}</span>`:''}</li>`).join('');
  }
  function render(walk,{at=walk.distance,x,z,air=false,site=null}={}){
    if(panel.hidden)return;
    const index=benchmarkStops.findLastIndex(stop=>at+.1>=stop.at),station=benchmarkStops[Math.max(0,index)];
    update(mapLabel,station.name);
    if(document.activeElement!==place)place.value=String(Math.max(0,index));
    progress.value=at;
    const run=benchmarkRunAt(passage,at),isAir=air||run.method==='air';
    const mode=isAir?'航拍':walk.playing?'步行导览':'自由步行';
    const text=walk.obstacle?`通行测试停在 ${metres(walk.distance)}，前方有阻挡。`:
      walk.done?epoch==='now'?`已步行抵达中央海湾 · ${Math.round(benchmarkLength)} m`:`已到现代海湾所在位置 · ${mode} · ${metres(benchmarkLength)}`:
      `${mode} · ${station.name} · ${metres(at)} / ${metres(progress.max)}`;
    update(progressText,text);
    const why=site?.reason?passageReasons[site.reason]:[...run.reasons].map(reason=>passageReasons[reason]).join('、');
    const ice=site?.thickness>.45?` · 冰厚约 ${metres(site.thickness)}`:'';
    update(sites,Number.isFinite(x)?`X ${x.toFixed(1)} · Z ${z.toFixed(1)}${site?` · ${site.cover}${ice}`:''}${isAir&&why?' · '+why:''}`:'');
    const label=walk.playing?'暂停导览':epoch==='now'?(at>0&&!walk.done&&!walk.obstacle?'继续步行导览':'从起点步行导览'):
      walk.done?'从雪岭重新导览':'沿路线导览';
    update(guide,label);
  }
  function renderSea(frame){
    const {p,mode,depth,bottom,light}=frame;
    const at=benchmarkLength+p.at;
    progress.value=at;
    update(mapLabel,mode);
    update(progressText,p.at>=seaLength-.001?`已抵达深海海沟 · ${metres(at)}`:
      `${mode} · ${metres(at)} / ${metres(progress.max)}`);
    const bottomLight=light<.005?'接近零':(100*light).toFixed(1)+'%';
    update(sites,mode==='沿岸航行'?`X ${p.x.toFixed(0)} · Z ${p.z.toFixed(0)} · 海床水深 ${depth.toFixed(1)} m`:
      `${bottom} · 海床水深 ${depth.toFixed(1)} m · 自然底光 ${bottomLight}`);
  }
  return {display,render,renderSea,setPeriod,setMode,get active(){return !panel.hidden;}};
}

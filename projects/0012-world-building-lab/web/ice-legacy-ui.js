import {Vector3} from 'three';
import {epochs,heightOnGrid} from './ice-age.js';
import {legacyColors,legacyCrossSection,legacyEpochLabel,legacyPeriods} from './ice-legacy.js';
import {createLegacyScene} from './ice-legacy-scene.js';

const textNumber=(x,d=1)=>x.toLocaleString('zh-CN',{maximumFractionDigits:d});
const epochNames={glacial:'盛冰期',early:'退冰开始',pulse:'快速海侵后',warming:'全新世初',holocene:'海岸渐近现今',now:'现在'};
const crossIds=['valley','wetland','mouth','inner','outer'];
const oldSeaLabels=[['#7fe6d9','仍出露的古槽'],['#c9a5ee','已被海水覆盖的古槽'],['#ffb76f','当期入海口']];
const keyHTML=rows=>rows.map(([color,name])=>`<li><i style="--swatch:${color}"></i>${name}</li>`).join('');

function crossPlot(canvas,points,sea,showSea){
  const ctx=canvas.getContext('2d'),{width:w,height:h}=canvas;
  const scales=points.flatMap(p=>[p.former,p.now]);
  const bottom=Math.floor(Math.min(...scales)/5)*5-1;
  const top=Math.ceil(Math.max(...scales,showSea?sea:-Infinity)/5)*5+1;
  const x=p=>55+p.d/points.at(-1).d*(w-71);
  const y=n=>24+(h-61)*(top-n)/(top-bottom);
  const trace=(fn,color)=>{
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();
    for(const p of points)ctx.lineTo(x(p),y(fn(p)));
    ctx.stroke();
  };
  ctx.fillStyle='#172e32';ctx.fillRect(0,0,w,h);
  ctx.font='20px system-ui';ctx.fillStyle='#e5e0d4';
  ctx.fillText(Math.round(top)+' m',3,y(top)+6);ctx.fillText(Math.round(bottom)+' m',3,y(bottom)+6);
  ctx.fillText(textNumber(points.at(-1).d,0)+' m',w-75,h-10);
  ctx.beginPath();ctx.fillStyle='#b19378';
  for(const p of points)ctx.lineTo(x(p),y(Math.max(p.former,p.now)));
  for(let i=points.length-1;i>=0;i--)ctx.lineTo(x(points[i]),y(points[i].former));
  ctx.closePath();ctx.fill();
  trace(p=>p.former,'#cbb9f4');
  trace(p=>p.now,'#f8dfac');
  if(showSea&&sea>bottom&&sea<top){
    ctx.setLineDash([9,6]);trace(()=>sea,'#8ddce9');ctx.setLineDash([]);
  }
}

export function mountIceLegacy(panel,scene,timeline,wetlandSource,onBack){
  const study=createLegacyScene(scene,timeline,wetlandSource);
  panel.innerHTML=`
    <div class="formation-actions" aria-label="遗存查看方式">
      <button id="legacy-overview" type="button">遗存路线全图</button>
      <button id="legacy-evidence" type="button">遗存剖面</button>
      <button id="legacy-reference" type="button">岸线与旧冰缘参照</button>
    </div>
    <p id="legacy-status" class="plan-present" role="status"></p>
    <div class="cold-nav">
      <select id="legacy-stop" aria-label="沿地貌遗存路线定位"><option value="">全线</option></select>
      <button type="button" id="legacy-prev" aria-label="上一站">←</button>
      <button type="button" id="legacy-next">下一站 →</button>
    </div>
    <div class="formation-actions legacy-epochs" aria-label="切换冰期与退冰时间">
      ${legacyPeriods.map(id=>`<button type="button" data-legacy-epoch="${id}">${epochNames[id]}</button>`).join('')}
    </div>
    <p id="legacy-period" class="plan-note"></p>
    <p id="legacy-explanation" class="plan-note"></p>
    <dl id="legacy-readings" class="cold-readings"></dl>
    <ul id="legacy-key" class="gw-rock-legend" aria-label="地貌遗存图例"></ul>
    <figure id="legacy-figure" hidden><canvas id="legacy-cross" width="660" height="201" role="img"
      aria-label="旧槽和现代床面的横剖面"></canvas><figcaption>紫线为低海面槽床，浅黄线为现代床面，棕色为两者的高度差。</figcaption></figure>
    <p class="plan-note" id="legacy-scope"></p>
    <div class="plan-sources"><a href="https://pubs.usgs.gov/fs/incised-valleys/" target="_blank" rel="noopener">USGS · 海侵与古河谷沉积 ↗</a>
      <a href="https://home.nps.gov/kefj/learn/nature/glacier-terminology.htm" target="_blank" rel="noopener">NPS · 冰碛与冰缘 ↗</a></div>
    <button type="button" id="legacy-back">返回三条环境线 ↗</button>`;

  const find=id=>panel.querySelector('#legacy-'+id),doc=panel.ownerDocument,vector=new Vector3();
  const labels=doc.createElement('div');labels.className='basin-event-map-labels';labels.hidden=true;
  labels.setAttribute('aria-hidden','true');doc.body.append(labels);
  let epoch='glacial',index=-1,evidence=false,reference=true,back=null,shown=false,survey,response,markers=[];
  const site=()=>survey?.stops[index];
  function mark(){
    const p=site();
    const list=p?[p]:[survey.stops[0],survey.stops[3],survey.stops[4],survey.stops[7]];
    markers=list.map(s=>{
      const el=doc.createElement('span');
      el.style.setProperty('--basin-color',legacyColors.moraine);
      el.textContent=s.name;return {s,el};
    });
    labels.replaceChildren(...markers.map(p=>p.el));
  }

  function render(){
    const p=site();
    response=study.show(epoch,p,evidence,reference);
    const {observed,frame,cutaway,drowned}=response;
    find('status').textContent=p?.name??'从雪岭旧冰缘追到出露陆架';
    find('stop').value=p?.id??'';
    find('prev').disabled=index<0;
    find('next').textContent=index<0?'开始沿线看 →':index===survey.stops.length-1?'回全线 ↗':'下一站 →';
    find('overview').setAttribute('aria-pressed',String(!p));
    find('evidence').setAttribute('aria-pressed',String(evidence));
    find('reference').setAttribute('aria-pressed',String(reference));
    find('back').textContent=back?`回到${back.name} ↗`:'返回三条环境线 ↗';
    panel.querySelectorAll('[data-legacy-epoch]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.legacyEpoch===epoch)));
    const period=epochs[epoch];
    const when=period.age?`${period.age} · ${period.name}`:period.name;
    find('period').textContent=`${when} · 场景海面 ${legacyEpochLabel(epoch)} m`;
    find('explanation').textContent=p?.detail??'把八处观察点串起来。换时期时保持地图坐标，比较旧冰缘的退缩、河槽出露和海水向陆侧回涨。';
    const value=(label,v)=>`<div><dt>${label}</dt><dd>${v}</dd></div>`;
    let readings=value('陆架样段累计被淹',textNumber(drowned,0)+' m');
    if(p){
      readings=value('此坐标的地貌状态',observed.status)+value('当地床面高程',textNumber(observed.ground)+' m')+readings;
      if(['ice-edge','moraine','lake'].includes(p.id))readings+=value('冰厚',textNumber(observed.ice)+' m');
      if(observed.fill!==null&&evidence)readings+=value('现代床面高出旧槽',textNumber(observed.fill)+' m');
      if(observed.cover&&!observed.ocean&&observed.ice<1.7)readings+=value('当期地表覆盖',observed.cover);
    }
    find('readings').innerHTML=readings;
    let keys=oldSeaLabels;
    if(p&&['ice-edge','moraine','lake'].includes(p.id)){
      keys=[[legacyColors.ice,'当期冰缘'],[legacyColors.moraine,'旧冰碛砾脊']];
      if(reference||evidence)keys.push(['#c1a5e9','盛冰期冰缘参照']);
    }else if(p?.id==='wetland'&&epoch==='now'&&evidence){
      keys=[['#e6c482','河漫滩'],['#b5d686','季节性湿地'],['#81d8c0','常年湿地']];
    }else if(p?.id==='valley')keys=[[legacyColors.retained,'谷床与两侧高岸']];
    find('key').innerHTML=keyHTML(keys);
    find('figure').hidden=!evidence||!crossIds.includes(p?.id);
    if(!find('figure').hidden)crossPlot(find('cross'),legacyCrossSection(survey,p),frame.epoch.sea,
      ['mouth','inner','outer'].includes(p.id));
    find('scope').textContent=cutaway?'揭开海面后按复原床面追踪被淹槽。床面高度差用于示意回填空间。':
      reference?'浅金虚线标现代岸线，紫色湿段表示水下古槽的位置。海面、回填和冰碛采用场景教学尺度。':
      '海面、回填和冰碛采用场景教学尺度。使用同一地图坐标切换时期。';
  }

  function select(i){index=i;render();mark();}
  for(const b of panel.querySelectorAll('[data-legacy-epoch]'))
    b.addEventListener('click',()=>{epoch=b.dataset.legacyEpoch;render();});
  find('overview').addEventListener('click',()=>select(-1));
  find('evidence').addEventListener('click',()=>{evidence=!evidence;render();});
  find('reference').addEventListener('click',()=>{reference=!reference;render();});
  find('stop').addEventListener('change',e=>select(survey.stops.findIndex(s=>s.id===e.target.value)));
  find('prev').addEventListener('click',()=>select(index-1));
  find('next').addEventListener('click',()=>select(index===survey.stops.length-1?-1:index+1));
  find('back').addEventListener('click',()=>onBack(back??{focus:'water'}));

  return {
    show(context={}){
      survey=study.prepare();shown=true;labels.hidden=false;back=context.back??null;
      epoch=legacyPeriods.includes(context.epoch)?context.epoch:'glacial';
      evidence=!!context.section;reference=true;
      find('stop').innerHTML='<option value="">全线</option>'+survey.stops.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
      select(survey.stops.findIndex(p=>p.id===context.station));
    },
    hide(){shown=false;labels.hidden=true;study.hide();},
    update(){if(shown)study.update();},
    get view(){
      const p=site(),r=response?.observed;
      if(!p||!r)return [-710,-286,75,innerWidth<700?3150:2250,Math.PI/2];
      const y=response.cutaway?r.former:r.ocean?r.level:r.lake?(epoch==='now'?244:242.3):r.ground+r.ice;
      return [p.p.x,p.p.z,y,p.range,response.cutaway ? .34 : crossIds.includes(p.id)?1.14:undefined];
    },
    project(camera){
      if(!shown)return;
      const box=panel.closest('#world-plan-panel').getBoundingClientRect(),{frame,cutaway}=response;
      for(const {s,el} of markers){
        const {x,z}=s.p,ground=heightOnGrid(frame.grid,frame.surface,x,z);
        const y=cutaway?response.observed.former:Math.max(frame.epoch.sea,ground);
        vector.set(x,y+(site()?16:31),z).project(camera);
        const left=innerWidth*(.5+vector.x*.5),top=innerHeight*(.5-vector.y*.5);
        el.hidden=left<75||left>innerWidth-75||top<64||top>innerHeight-30||vector.z< -1||vector.z>1||
          left>box.left-62&&left<box.right+62&&top>box.top-10&&top<box.bottom;
        el.style.transform=`translate(${left}px,${top}px) translate(-50%,-50%)`;
      }
    }
  };
}

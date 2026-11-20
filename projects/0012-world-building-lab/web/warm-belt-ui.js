import {Vector3} from 'three';
import {terrainHeight} from './large-world.js';
import {warmColors,warmSeasons,warmStops} from './warm-belt.js';
import {makeWarmBeltScene} from './warm-belt-scene.js';

const indexNumber=x=>x.toFixed(3);
const quantity=x=>Math.round(x).toLocaleString('zh-CN');
const layers=[['land','原地实景'],['climate','风向与坡面湿度'],['water','漫水与湿岸']];
const legend={
  land:[],
  climate:[['#a6e5fa','主风向'],['#76bc66','较湿根区'],['#ad8556','较干根区']],
  water:[[warmColors.water,'雨林河岸新增漫水'],['#70b8bc','背风浅沟积水'],[warmColors.damp,'退水或仍湿地面']]
};

export function mountWarmBelt(panel,scene,worldSource,onBack,onScrub){
  const study=makeWarmBeltScene(scene,worldSource);
  panel.innerHTML=`
    <div class="formation-actions rain-shadow-actions">
      <button id="warm-overview-map" type="button" aria-pressed="true">过渡带全线</button>
      ${Object.entries(warmSeasons).map(([id,{name}])=>`<button type="button" data-warm-season="${id}">${name}</button>`).join('')}
    </div>
    <p id="warm-status" class="plan-present" role="status"></p>
    <div class="cold-nav">
      <select id="warm-stop" aria-label="沿线观察点"><option value="">过渡带全线</option>
        ${warmStops.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
      <button type="button" id="warm-prev" aria-label="上一站">←</button>
      <button type="button" id="warm-next">下一站 →</button>
    </div>
    <div class="formation-actions" aria-label="显示图层">
      ${layers.map(([id,name])=>`<button type="button" data-warm-layer="${id}">${name}</button>`).join('')}
    </div>
    <ul id="warm-legend" class="gw-rock-legend" aria-label="场景图例"></ul>
    <p class="plan-note" id="warm-detail"></p>
    <table class="formation-values" id="warm-values"></table>
    <p class="plan-note">降雨与根区湿度为场景相对量。水面用现有河床、浅沟高程与季节来水推算，雨林河岸和背风浅沟分别汇水。</p>
    <div class="formation-actions">
      <button type="button" id="warm-scrub">去干谷坡地看灌丛与火后恢复 ↗</button>
      <button type="button" id="warm-back">返回三条环境线 ↗</button>
    </div>`;
  const find=id=>panel.querySelector('#warm-'+id);
  const doc=panel.ownerDocument,labels=doc.createElement('div'),vector=new Vector3();
  labels.className='basin-event-map-labels';labels.hidden=true;labels.setAttribute('aria-hidden','true');doc.body.append(labels);
  let index=-1,season='wet',layer='climate',back=null,shown=false,pins=[];
  const stop=()=>warmStops[index];
  function setPins(){
    const points=stop()?[stop()]:[warmStops[0],warmStops[2],warmStops[4],warmStops[6]];
    pins=points.map((p,i)=>{
      const el=doc.createElement('span');
      el.textContent=stop()?p.name:['雨林河岸','迎背风主脊','疏林草地','背风干谷'][i];
      el.style.setProperty('--basin-color',warmColors.ridge);
      return {el,p};
    });
    labels.replaceChildren(...pins.map(p=>p.el));
  }

  function paint(){
    const p=stop(),model=study.show({season,layer,stop:p});
    find('status').textContent=p?.name??'雨林越过主脊到背风干谷';
    find('detail').textContent=p?.detail??`共 ${(model.profile.length/1000).toFixed(2)} 公里、${warmStops.length} 站。先在迎风坡和脊后对照雨量，再去低滩和草地查看水与植被怎样响应。`;
    find('stop').value=p?.id??'';
    find('prev').disabled=index<0;
    find('next').textContent=index<0?'开始航拍 →':index<warmStops.length-1?'下一站 →':'回全线 ↗';
    find('overview-map').setAttribute('aria-pressed',String(!p));
    find('back').textContent=back?`回到${back.name} ↗`:'返回三条环境线 ↗';
    for(const b of panel.querySelectorAll('[data-warm-season]'))b.setAttribute('aria-pressed',String(b.dataset.warmSeason===season));
    for(const b of panel.querySelectorAll('[data-warm-layer]'))b.setAttribute('aria-pressed',String(b.dataset.warmLayer===layer));
    find('legend').innerHTML=legend[layer].map(([color,name])=>`<li><i style="--swatch:${color}"></i>${name}</li>`).join('');
    const cells=Object.keys(warmSeasons).map(key=>({key,reading:model.read(p??warmStops[1],key),view:model.views[key]}));
    const row=(label,make)=>`<tr><th scope="row">${label}</th>${cells.map(entry=>
      `<td data-warm-current="${entry.key===season}">${make(entry)}</td>`).join('')}</tr>`;
    find('values').innerHTML=`
      <caption>${p?'同一位置的季节读数':'迎风坡与低地的季节读数'}</caption>
      <thead><tr><th scope="col">观察项</th>${cells.map(({key})=>
        `<th scope="col" data-warm-current="${key===season}">${key==='wet'?'雨季':'旱季'}</th>`).join('')}</tr></thead>
      <tbody>
      ${row('主风',({reading:r})=>r.wind)}
      ${row('本站降雨',({reading:r})=>indexNumber(r.rain))}
      ${!p||['windward','ridge'].includes(p.id)?row('近背风坡降雨',({key})=>indexNumber(model.read({x:-550,z:1109},key).rain)):''}
      ${row('根区湿度',({reading:r})=>indexNumber(r.moisture))}
      ${row('雨林低滩新增漫水',({view})=>quantity(view.river.area)+' m²')}
      ${row('背风浅沟积水',({view})=>quantity(view.swale.area)+' m²')}
      </tbody>`;
  }

  function select(next,chooseLayer=true){
    index=next;
    const id=stop()?.id;
    if(chooseLayer){
      if(['forest','flood-grass'].includes(id))layer='water';
      else if(['windward','ridge'].includes(id)||!id)layer='climate';
      else layer='land';
    }
    paint();setPins();
  }
  for(const b of panel.querySelectorAll('[data-warm-season]'))
    b.addEventListener('click',()=>{season=b.dataset.warmSeason;paint();});
  for(const b of panel.querySelectorAll('[data-warm-layer]'))
    b.addEventListener('click',()=>{layer=b.dataset.warmLayer;paint();});
  find('stop').addEventListener('change',e=>select(warmStops.findIndex(p=>p.id===e.target.value)));
  find('overview-map').addEventListener('click',()=>select(-1));
  find('prev').addEventListener('click',()=>select(index-1));
  find('next').addEventListener('click',()=>select(index===warmStops.length-1?-1:index+1));
  find('scrub').addEventListener('click',()=>onScrub({back:{station:stop()?.id,month:warmSeasons[season].month,back}}));
  find('back').addEventListener('click',()=>onBack(back??{focus:'inland',seam:'south'}));
  return {
    show(context={}){
      shown=true;labels.hidden=false;back=context.back??null;
      const m=Number(context.month);
      season=m>0&&(m<4||m>10)?'dry':'wet';
      select(warmStops.findIndex(p=>p.id===context.station));
    },
    hide(){study.hide();labels.hidden=true;shown=false;},
    get view(){
      const p=stop();
      if(!p)return [-534,1115,45,innerWidth<700?1690:1320,Math.PI/2];
      return [p.x,p.z,terrainHeight(p.x,p.z),p.distance,p.id==='forest'?1.2:undefined];
    },
    project(camera){
      if(!shown)return;
      const box=panel.closest('#world-plan-panel').getBoundingClientRect();
      for(const {p,el} of pins){
        vector.set(p.x,terrainHeight(p.x,p.z)+(stop()?18:36),p.z).project(camera);
        const x=innerWidth*(.5+vector.x*.5),y=innerHeight*(.5-vector.y*.5);
        el.hidden=x<70||x>innerWidth-70||y<63||y>innerHeight-25||vector.z< -1||vector.z>1||
          x>box.left-60&&x<box.right+60&&y>box.top-8&&y<box.bottom;
        el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
      }
    }
  };
}

import {Vector3} from 'three';
import {tectonicLayers,tectonicStops} from './tectonic-layout.js';
import {sectionCover,sectionLayers,sectionRock} from './tectonic-section-data.js';
import {drawTectonicSection} from './tectonic-section-plot.js';

export function tectonicView(station,hideSea,width){
  if(!station){
    if(width<500)return [435,155,100,4000,1.57];
    if(width<900)return [435,55,100,width<650?3450:3750,1.57];
    if(width<1100)return [435,335,100,2800,1.57];
    return [435,-95,100,2800,2.10];
  }
  const exposure=station.id==='fault'||station.id==='fold';
  const y=hideSea?station.y:Math.max(0,station.y);
  const viewRiver=['incision','confluence','valley'].includes(station.id);
  const azimuth=viewRiver?Math.atan2(station.dz,station.dx):exposure?1.68:1.92;
  return [station.x,station.z,y+(exposure?34:0),exposure?204:station.distance,azimuth];
}

export function mountTectonics(panel,scene,onBack,onGroundwater,onVents){
  panel.innerHTML=`
    <div class="tectonic-actions">
      <button id="tectonic-overview" type="button" aria-pressed="true">山海全线</button>
      <button id="tectonic-sea" type="button" aria-pressed="true">海床可见</button>
      <button id="tectonic-back" type="button">返回环境线 ↗</button>
    </div>
    <p id="tectonic-status" class="plan-present" role="status"></p>
    <div class="tectonic-stations">
      <select id="tectonic-stop" aria-label="沿线观察"><option value="">选择沿线站点</option>
        ${tectonicStops.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
      <button id="tectonic-prev" type="button">上一站</button>
      <button id="tectonic-next" type="button">下一站 →</button>
    </div>
    <p id="tectonic-detail" class="plan-note"></p>
    <p id="tectonic-reading" class="plan-present"></p>
    <div class="line-themes" aria-label="剖面图层">
      ${sectionLayers.map(layer=>`<button type="button" data-tectonic-section="${layer.id}" style="--route-color:${layer.color}" aria-pressed="true"><i></i>${layer.name}</button>`).join('')}
    </div>
    <div class="line-themes" aria-label="地质地图标记">
      ${tectonicLayers.map(l=>`<button type="button" data-tectonic-layer="${l.id}" style="--route-color:${l.color}" aria-pressed="true"><i></i>${l.name}</button>`).join('')}
    </div>
    <figure>
      <figcaption id="tectonic-caption">从东南海沟到中央河谷</figcaption>
      <div class="tectonic-actions">
        <button id="tectonic-local" type="button" aria-pressed="false" disabled>放大本站剖面</button>
      </div>
      <canvas width="480" height="226" role="img" aria-label="沿线实际地表、基岩、风化带和河谷水位"></canvas>
      <div id="tectonic-legend" class="tectonic-legend" aria-label="岩性与风化图例"></div>
      <p class="plan-note">浅线取自地图地表和海床。基岩按地图岩性分区着色，风化和冲积层加厚以便观察。地下构造是世界设定的示意；蓝箭头沿现有河道。</p>
    </figure>
    <button id="tectonic-vents" type="button">看东部间歇泉和钙华 ↗</button>
    <button id="tectonic-groundwater" type="button">从岩层追踪地下水 ↗</button>
    <p class="plan-note"><a class="plan-catalog-link" href="https://www.nps.gov/subjects/geology/plate-tectonics-subduction-zones.htm" target="_blank" rel="noopener">俯冲带参考 ↗</a> · <a class="plan-catalog-link" href="https://www.nps.gov/subjects/erosion/about.htm" target="_blank" rel="noopener">风化、侵蚀与沉积参考 ↗</a></p>`;
  const find=id=>panel.querySelector('#tectonic-'+id);
  const root=panel.ownerDocument.createElement('div');
  root.id='tectonic-map-labels';root.hidden=true;root.setAttribute('aria-hidden','true');
  panel.ownerDocument.body.append(root);
  const enabled=new Set(tectonicLayers.map(l=>l.id)),position=new Vector3();
  const visibleSection=new Set(sectionLayers.map(l=>l.id)),canvas=panel.querySelector('canvas');
  const layerButtons=panel.querySelectorAll('[data-tectonic-layer]');
  const sectionButtons=panel.querySelectorAll('[data-tectonic-section]');
  let back,station,annotations=[],nodes=[],hideSea=true,local=false,plot;

  function paint(){
    const profile=scene.profile;
    annotations=scene.show({layers:enabled,station,hideSea,sectionLayers:visibleSection});
    if(station)annotations.sort((a,b)=>Number(b.id===station.id)-Number(a.id===station.id));
    nodes=annotations.map(({text,color,id})=>{
      const node=panel.ownerDocument.createElement('span');node.textContent=text;
      node.style.setProperty('--route-color',color);node.dataset.active=String(station?.id===id);
      return node;
    });
    root.replaceChildren(...nodes);
    const i=profile.stations.indexOf(station);
    find('status').textContent=station?`${i+1} / ${profile.stations.length} · ${station.name}`:
      `东南海沟至中央河谷 · ${(profile.length/1000).toFixed(2)} km`;
    find('detail').textContent=station?.detail??'看海沟、陆缘和火山弧怎样接到青岚高山，再跨过鞍部到雪岭一侧，沿现有水路看窄槽、汇口和河谷低滩。';
    find('reading').hidden=!station;
    find('reading').textContent=station?`高程 ${station.y.toFixed(1)} m · ${sectionRock[station.rock].name} · ${sectionCover[station.cover].name}`+
      (station.waterLevel!==null?` · 水面 ${station.waterLevel.toFixed(1)} m`:''):'';
    find('stop').value=station?.id??'';
    find('sea').textContent=hideSea?'海床可见':'海面可见';
    find('sea').setAttribute('aria-pressed',String(hideSea));
    find('overview').setAttribute('aria-pressed',String(!station));
    find('prev').disabled=i<0;
    find('next').disabled=i===profile.stations.length-1;
    find('next').textContent=i<0?'从海沟出发 →':'下一站 →';
    find('back').textContent=back?'回到'+back.name+' ↗':'返回环境线 ↗';
    find('local').disabled=!station;
    find('local').textContent=local?'查看完整剖面':'放大本站剖面';
    find('local').setAttribute('aria-pressed',String(local));
    find('caption').textContent=local?(station.id==='valley'?'中央河谷横切 · 两岸与河床':station.name+' · 局部剖面'):
      '连续剖面 · 东南海沟到中央河谷';
    layerButtons.forEach(b=>b.setAttribute('aria-pressed',String(enabled.has(b.dataset.tectonicLayer))));
    sectionButtons.forEach(b=>b.setAttribute('aria-pressed',String(visibleSection.has(b.dataset.tectonicSection))));
    const swatches=[
      ...(visibleSection.has('rock')?[...new Set(profile.points.map(p=>p.rock))].map(id=>sectionRock[id]):[]),
      ...(visibleSection.has('cover')?Object.values(sectionCover):[]),
      ...(visibleSection.has('water')?[{name:'水面',color:'#8ce4f0'}]:[])
    ];
    find('legend').innerHTML=swatches.map(({name,color})=>`<span><i style="--swatch:${color}"></i>${name}</span>`).join('');
    plot=drawTectonicSection(canvas,profile,station,visibleSection,enabled.has('boundary'),local);
  }
  function choose(id){
    station=scene.profile.stations.find(p=>p.id===id);
    hideSea=station?!!station.seabed:true;
    local=!!station;
    paint();
  }
  find('vents').addEventListener('click',()=>onVents({route:'land',station:'geyser',
    back:{mode:'tectonics',focus:station?.id,name:station?.name??'地质骨架'}}));
  find('overview').addEventListener('click',()=>choose());
  find('stop').addEventListener('change',e=>choose(e.currentTarget.value));
  find('sea').addEventListener('click',()=>{hideSea=!hideSea;paint();});
  find('local').addEventListener('click',()=>{local=!local;paint();});
  canvas.addEventListener('click',event=>{
    if(local)return;
    const bounds=canvas.getBoundingClientRect(),x=(event.clientX-bounds.left)*canvas.width/bounds.width;
    if(x<plot.left||x>plot.right)return;
    const at=plot.first+(x-plot.left)*(plot.last-plot.first)/(plot.right-plot.left);
    const closest=scene.profile.stations.reduce((a,b)=>Math.abs(a.at-at)<Math.abs(b.at-at)?a:b);
    choose(closest.id);
  });
  find('back').addEventListener('click',()=>onBack(back));
  find('groundwater').addEventListener('click',()=>onGroundwater({
    focus:station?.id==='volcano'?'volcanic':station?.layer==='fold'?'rock':undefined,
    back:{mode:'tectonics',name:'地质骨架',focus:station?.id,...(back?{back}:null)}
  }));
  find('prev').addEventListener('click',()=>choose(scene.profile.stations[scene.profile.stations.indexOf(station)-1]?.id));
  find('next').addEventListener('click',()=>choose(scene.profile.stations[scene.profile.stations.indexOf(station)+1]?.id));
  layerButtons.forEach(b=>b.addEventListener('click',()=>{
    const layer=b.dataset.tectonicLayer;
    if(enabled.has(layer))enabled.delete(layer);else enabled.add(layer);
    paint();
  }));
  sectionButtons.forEach(b=>b.addEventListener('click',()=>{
    const layer=b.dataset.tectonicSection;
    if(visibleSection.has(layer))visibleSection.delete(layer);else visibleSection.add(layer);
    paint();
  }));
  return {
    show(context={}){back=context.back;root.hidden=false;choose(context.focus);},
    hide(){root.hidden=true;scene.hide();},
    project(camera){
      const edge=panel.getBoundingClientRect(),placed=[];
      annotations.forEach(({x,y,z},i)=>{
        const p=position.set(x,y,z).project(camera);
        const u=(1+p.x)*innerWidth*.5,v=(1-p.y)*innerHeight*.5;
        const covered=u>edge.left-58&&u<edge.right+58&&v>edge.top-12&&v<edge.bottom+12;
        const overlap=placed.some(([px,py])=>Math.abs(u-px)<109&&Math.abs(v-py)<28);
        const node=nodes[i];
        node.hidden=covered||overlap||p.z< -1||p.z>1||u<63||u>innerWidth-63||v<86||v>innerHeight-31;
        if(!node.hidden){
          node.style.transform=`translate(${u}px,${v}px) translate(-50%,-50%)`;
          placed.push([u,v]);
        }
      });
    },
    get view(){return tectonicView(station,hideSea,innerWidth);}
  };
}

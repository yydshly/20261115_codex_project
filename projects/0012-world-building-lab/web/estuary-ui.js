import {Vector3} from 'three';
import {tides,estuarySeasons,estuaryStops,saltColors,seaSalinity} from './estuary-layout.js';

const round=value=>Math.round(value).toLocaleString('zh-CN');
const salt=value=>value.toFixed(1)+'‰';
const signed=value=>(value>=0?'+':'')+value.toFixed(2)+' m';

function drawSaltProfile(canvas,model,frame,station){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const left=27,right=w-20,top=12,bottom=h-22;
  const px=length=>left+(right-left)*length/model.length;
  const py=salinity=>bottom-(bottom-top)*salinity/seaSalinity;
  const {profile}=frame;
  c.fillStyle='#1a3539';c.fillRect(0,0,w,h);
  c.font='11px system-ui';
  for(const value of [0,5,15,32]){
    const y=py(value);
    c.beginPath();c.moveTo(left,y);c.lineTo(right,y);
    c.strokeStyle=value===5?'#f4c59596':'#d7e2c836';c.setLineDash(value===5?[5,4]:[]);
    c.lineWidth=1;c.stroke();
    c.fillStyle='#e2e4c5';c.fillText(value+'‰',3,y+3);
  }
  c.setLineDash([]);
  const gradient=c.createLinearGradient(left,0,right,0);
  saltColors.forEach((color,i)=>gradient.addColorStop(i/(saltColors.length-1),color));
  c.beginPath();c.moveTo(px(profile[0].fromFresh),py(profile[0].salt));
  profile.forEach(p=>c.lineTo(px(p.fromFresh),py(p.salt)));
  c.strokeStyle=gradient;c.lineWidth=2.4;c.stroke();
  c.beginPath();c.arc(px(frame.saltLine.chainage),py(5),3.4,0,Math.PI*2);c.fillStyle='#ffc388';c.fill();
  if(station){
    const here=profile.reduce((a,b)=>Math.abs(a.t-station.t)<Math.abs(b.t-station.t)?a:b);
    c.beginPath();c.arc(px(here.fromFresh),py(here.salt),3.7,0,Math.PI*2);c.fillStyle='#edf3be';c.fill();
  }
  c.fillStyle='#d7e8d6';c.fillText('淡水湿地',left,h-5);c.fillText('外湾',right-20,h-5);
}

export function mountEstuary(panel,scene,onBack){
  panel.innerHTML=`
    <div class="estuary-location">
      <div class="tectonic-actions">
        <button id="estuary-all" type="button" aria-pressed="true">河口与海湾全景</button>
        <button id="estuary-back" type="button">返回环境线 ↗</button>
      </div>
      <p id="estuary-status" class="plan-present" role="status"></p>
      <div class="tectonic-stations">
        <select id="estuary-stop" aria-label="河口潮汐观察站"><option value="">选择沿线站点</option>
          ${estuaryStops.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <button id="estuary-prev" type="button">上一站</button>
        <button id="estuary-next" type="button">下一站 →</button>
      </div>
      <p id="estuary-lesson" class="plan-note"></p>
      <div class="line-themes" aria-label="河口图层">
        <button data-estuary-layer="salt" type="button" aria-pressed="true">盐度与露滩</button>
        <button data-estuary-layer="natural" type="button" aria-pressed="false">实景植被</button>
      </div>
      <ul class="gw-rock-legend" aria-label="水体盐度与泥滩图例">
        ${['淡水','低盐混合','咸水混合','海水','露出泥滩'].map((name,i)=>`<li><i style="--swatch:${[...saltColors,'#b08358'][i]}"></i>${name}</li>`).join('')}
      </ul>
      <p id="estuary-site" class="plan-note"></p>
    </div>
    <div class="estuary-compare">
      <div class="tectonic-actions" aria-label="丰枯水">
        ${Object.entries(estuarySeasons).map(([id,s])=>`<button type="button" data-estuary-season="${id}" aria-pressed="false">${s.name} · ${s.month} 月</button>`).join('')}
      </div>
      <div class="tectonic-actions" aria-label="四个潮段">
        ${Object.entries(tides).map(([id,s])=>`<button type="button" data-estuary-tide="${id}" aria-pressed="false">${s.name}</button>`).join('')}
      </div>
      <dl id="estuary-values" class="exchange-values"></dl>
      <p id="estuary-reach" class="plan-note"></p>
      <figure>
        <figcaption>从淡水端到外湾的盐度</figcaption>
        <canvas width="414" height="119" aria-label="沿主河距离的盐度剖面，标出五千分浓度的混合前缘"></canvas>
      </figure>
      <details class="exchange-note">
        <summary>潮位、盐度和植物依据</summary>
        <p class="plan-note">岸线沿实际河床裁切。潮位与盐度采用局地教学参数，丰枯来量取原流域收支。箭头表示表面来水与支汊的潮流方向。</p>
        <a href="https://oceanservice.noaa.gov/education/tutorial_estuaries/est10_monitor.html" target="_blank" rel="noopener">NOAA · 河口盐度变化 ↗</a>
      </details>
    </div>`;
  const find=id=>panel.querySelector('#estuary-'+id);
  const doc=panel.ownerDocument,overlay=doc.createElement('div');
  overlay.id='estuary-map-labels';overlay.hidden=true;overlay.setAttribute('aria-hidden','true');doc.body.append(overlay);
  const tideButtons=[...panel.querySelectorAll('[data-estuary-tide]')],seasonButtons=[...panel.querySelectorAll('[data-estuary-season]')];
  const layerButtons=[...panel.querySelectorAll('[data-estuary-layer]')],projected=new Vector3();
  let station,back,season='dry',tide='high',layer='salt',labels=[],nodes=[];

  function paint(){
    const model=scene.model,{frame,labels:newLabels}=scene.show({season,tide,station,layer});
    labels=newLabels;
    nodes=labels.map(p=>{
      const node=doc.createElement('span');node.textContent=p.text;node.style.setProperty('--route-color',p.color);return node;
    });
    overlay.replaceChildren(...nodes);
    const i=model.stations.indexOf(station),sample=station;
    const text=station?.text??'从苇泽淡水端走到外湾。切换潮段和河流来量，比较水位顶托、咸淡交界和露滩。';
    find('status').textContent=station?.name??'中央河口与潮汐海湾';
    find('lesson').textContent=text;
    if(sample){
      const dry=sample.id==='flat'&&!frame.wet[sample.row*model.cols+sample.col];
      find('site').textContent=sample.id==='flat'?
        `泥滩此刻${dry?'露出':'被淹'} · 邻近水道约 ${salt(frame.salinityAt(sample))}`:
        `当前水道约 ${salt(frame.salinityAt(sample))} · ${estuarySeasons[season].name} · ${tides[tide].name}`;
    }else{
      find('site').textContent='低盐浅岸多芦苇、莎草。反复受潮的盐湿岸带多耐盐草。';
    }
    find('stop').value=station?.id??'';
    find('prev').disabled=i<0;find('next').disabled=i===model.stations.length-1;
    find('next').textContent=i<0?'从淡水湿地出发 →':'下一站 →';
    find('all').setAttribute('aria-pressed',String(!station));
    find('back').textContent=back?'回到'+back.name+' ↗':'返回环境线 ↗';
    tideButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.estuaryTide===tide)));
    seasonButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.estuarySeason===season)));
    layerButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.estuaryLayer===layer)));
    const {exposed}=model.measured(frame);
    find('values').innerHTML=[
      ['外湾潮位',signed(frame.tide.height),'#98d5ec'],
      ['5‰ 前缘上溯',round(frame.saltLine.upstream)+' m','#ffc18b'],
      ['露出潮滩',round(exposed)+' m²','#dec293']
    ].map(([name,value,color])=>`<div style="--route-color:${color}"><dt>${name}</dt><dd>${value}</dd></div>`).join('');
    const direction=frame.tide.direction<0?'支汊潮水向上游':frame.tide.direction>0?'支汊潮水向外湾':'潮流处于转向时段';
    const reach=frame.tideLine?round(frame.tideLine.upstream)+' m':'未达标记阈值';
    find('reach').textContent=`${direction} · 水位响应边界 ${reach}。两处距离均从外湾基准点起算。`;
    drawSaltProfile(panel.querySelector('canvas'),model,frame,station);
  }
  function go(id){station=scene.model.stations.find(s=>s.id===id);paint();}
  find('all').addEventListener('click',()=>go());
  find('back').addEventListener('click',()=>onBack(back));
  find('stop').addEventListener('change',e=>go(e.currentTarget.value));
  find('prev').addEventListener('click',()=>go(scene.model.stations[scene.model.stations.indexOf(station)-1]?.id));
  find('next').addEventListener('click',()=>go(scene.model.stations[scene.model.stations.indexOf(station)+1]?.id));
  tideButtons.forEach(b=>b.addEventListener('click',()=>{tide=b.dataset.estuaryTide;paint();}));
  seasonButtons.forEach(b=>b.addEventListener('click',()=>{season=b.dataset.estuarySeason;paint();}));
  layerButtons.forEach(b=>b.addEventListener('click',()=>{layer=b.dataset.estuaryLayer;paint();}));
  return {
    show(context={}){
      overlay.hidden=false;back=context.back;
      if(context.month===1||context.month===7)season=context.month===1?'dry':'wet';
      go(context.focus);
    },
    hide(){overlay.hidden=true;scene.hide();},
    update(dt){scene.update(dt);},
    project(camera){
      const bound=panel.closest('#world-plan-panel').getBoundingClientRect(),placed=[];
      labels.forEach(({x,y,z,id},i)=>{
        const p=projected.set(x,y,z).project(camera);
        const offset=id==='salt'?20:id==='tide'?-17:!station&&id==='fork'?51:!station&&id==='flat'?-37:0;
        const u=(p.x*.5+.5)*innerWidth,v=(-p.y*.5+.5)*innerHeight+offset;
        const covers=u>bound.left-53&&u<bound.right+53&&v>bound.top-12&&v<bound.bottom+12;
        const overlap=placed.some(([x,y])=>Math.abs(x-u)<108&&Math.abs(y-v)<25);
        const node=nodes[i];
        node.hidden=covers||overlap||p.z< -1||p.z>1||u<56||u>innerWidth-56||v<85||v>innerHeight-32;
        if(!node.hidden){
          node.style.transform=`translate(${u}px,${v}px) translate(-50%,-50%)`;placed.push([u,v]);
        }
      });
    },
    get view(){
      if(!station)return [-1430,-260,12,innerWidth<660?645:550,1.58];
      return [station.x,station.z,7,station.distance,station.id==='flat'?1.15:1.59];
    }
  };
}

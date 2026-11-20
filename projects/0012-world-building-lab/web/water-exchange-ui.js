import {Vector3} from 'three';
import {terrainHeight} from './large-world.js';
import {exchangeLayers,exchangeStops,exchangeWaterTable,recessionDays,seasons} from './water-exchange.js';

const pretty=(n,digits=0)=>n.toLocaleString('zh-CN',{maximumFractionDigits:digits});
const fmt=(n,unit,digits=1)=>pretty(n,digits)+' '+unit;
const months={1:'1 月',7:'7 月'};

function drawBank(canvas,model,state){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const {profile,spring}=model,left=15,right=w-15,bottom=h-16;
  const ceiling=profile[0].bed+1,floor=Math.min(...profile.map(p=>p.bed))-3;
  const px=d=>left+(right-left)*(profile[0].d-d)/(profile[0].d-profile.at(-1).d);
  const py=y=>bottom-(bottom-37)*(y-floor)/(ceiling-floor);
  function path(points,color,fill=false,width=2){
    c.beginPath();
    points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    if(fill){c.closePath();c.fillStyle=color;c.fill();}
    else{c.lineWidth=width;c.strokeStyle=color;c.stroke();}
  }
  function name(text,x,y,color='#f3ebd1'){
    c.font='12px system-ui';c.fillStyle=color;c.fillText(text,x,y);
  }
  function arrow(x,y,nx,ny,color){
    const a=Math.atan2(ny-y,nx-x);
    path([[x,y],[nx,ny]],color);
    path([[nx,ny],[nx-8*Math.cos(a-.46),ny-8*Math.sin(a-.46)],[nx-8*Math.cos(a+.46),ny-8*Math.sin(a+.46)]],color,true);
  }
  c.clearRect(0,0,w,h);
  c.fillStyle='#233c3a';c.fillRect(0,0,w,h);
  const ground=profile.map(p=>[px(p.d),py(p.bed)]);
  const water=profile.map(p=>[px(p.d),py(exchangeWaterTable(model,state,p))]);
  const closed=[[right,bottom],[left,bottom]];
  path([...ground,...closed],'#ad9676',true);
  path([...water,...closed],'#3d9383',true);
  path(water,'#bafbd4');
  path(ground,'#e8cc9c',false,1.6);
  // Fill the actual section of the river lying below the representative water stage.
  const channel=profile.filter(p=>Math.abs(p.d)<8&&p.bed<=state.river).map(p=>[px(p.d),py(p.bed)]);
  if(channel.length){
    path([...channel,[channel.at(-1)[0],py(state.river)],[channel[0][0],py(state.river)]],'#79cdea',true);
    path([[channel[0][0],py(state.river)],[channel.at(-1)[0],py(state.river)]],'#b4eefe');
  }
  const springX=px(spring.d),springY=py(spring.y);
  c.beginPath();c.arc(springX,springY,4,0,Math.PI*2);c.fillStyle='#dcffc5';c.fill();
  arrow(springX+3,springY+1,px(4),py(state.river)+1,'#bff8d3');
  name('岸坡出露',springX-21,springY-12,'#d6ffd7');
  name('砂砾含水带',29,h-26);
  name('河面',px(-1)-5,py(state.river)-13,'#c5ecfb');
  name('水位线',60,py(exchangeWaterTable(model,state,profile[10]))+22,'#d6f8d1');
  if(state.recharge>0&&state.month===7){
    name('雨水入渗',17,23,'#ffdb91');
    for(const d of [42,36]){
      const x=px(d),p=profile.find(p=>p.d<=d);
      arrow(x,33,x,py(p.bed)+9,'#ffdb91');
    }
  }
}

export function mountWaterExchange(panel,scene,onBack,onWetland){
  panel.innerHTML=`
    <div class="exchange-location">
      <div class="tectonic-actions">
        <button id="exchange-all" type="button" aria-pressed="true">双路全图</button>
        <button id="exchange-back" type="button">返回环境线 ↗</button>
      </div>
      <p id="exchange-status" class="plan-present" role="status"></p>
      <div class="tectonic-stations">
        <select id="exchange-stop" aria-label="双路观察站"><option value="">选择沿线站点</option>
          ${exchangeStops.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
        <button id="exchange-prev" type="button">上一站</button>
        <button id="exchange-next" type="button">下一站 →</button>
      </div>
      <p id="exchange-lesson" class="plan-note"></p>
      <button id="exchange-wetland-link" type="button">沿河看湿地洪泛与植被 ↗</button>
      <div class="line-themes exchange-layers" aria-label="双路地图图层">
        ${exchangeLayers.map(l=>`<button type="button" data-exchange-layer="${l.id}" style="--route-color:${l.color}" aria-pressed="true"><i></i>${l.name}</button>`).join('')}
      </div>
      <details class="exchange-note">
        <summary>地图与水量的依据</summary>
        <p class="plan-note">地表分水岭取自 40 米汇水格网。金色样区给出计算用的地下补给范围，绿色虚线投影和泉口剖面是局地示意。湿地显示所选月份水位。</p>
        <a href="https://www.usgs.gov/water-science-school/science/rivers-contain-groundwater" target="_blank" rel="noopener">USGS · 河流为什么有地下水 ↗</a>
      </details>
    </div>
    <div class="exchange-compare">
      <div class="tectonic-actions" aria-label="丰枯与停雨">
        ${Object.entries(seasons).map(([id,s])=>`<button type="button" data-exchange-season="${id}" aria-pressed="false">${s.name} · ${months[s.month]}</button>`).join('')}
        <button id="exchange-rainless" type="button" aria-pressed="false">停雨 ${recessionDays} 天</button>
      </div>
      <p id="exchange-reading" class="plan-note"></p>
      <dl id="exchange-values" class="exchange-values"></dl>
      <figure>
        <figcaption><span>扇尾泉口剖面</span><span id="exchange-wetland"></span></figcaption>
        <canvas width="414" height="158" aria-label="扇尾透水砂砾层接近沟谷，地下水位高于河面，泉水从岸坡补给河流。"></canvas>
      </figure>
    </div>`;
  const find=id=>panel.querySelector('#exchange-'+id);
  const root=panel.ownerDocument.createElement('div');
  root.id='water-exchange-labels';root.hidden=true;root.setAttribute('aria-hidden','true');
  panel.ownerDocument.body.append(root);
  const projected=new Vector3(),layerButtons=[...panel.querySelectorAll('[data-exchange-layer]')];
  const seasonButtons=[...panel.querySelectorAll('[data-exchange-season]')],layers=new Set(exchangeLayers.map(k=>k.id));
  let season='wet',noRain=false,station,back,labels=[],nodes=[];

  function render(){
    const current=scene.model;
    const {state,labels:mapLabels}=scene.show({season,noRain,station,layers});
    labels=mapLabels;
    nodes=labels.map(p=>{
      const node=panel.ownerDocument.createElement('span');
      node.textContent=p.text;node.style.setProperty('--route-color',p.color);return node;
    });
    root.replaceChildren(...nodes);
    const index=current.stations.indexOf(station);
    find('status').textContent=station?.name??'从同一场雨到同一条河';
    find('lesson').textContent=station?.detail??'雨水一部分沿坡面进河，另一部分下渗储存、从扇尾泉口再进河。两路经北支汇入中央河，再进入苇泽湿地。';
    find('stop').value=station?.id??'';
    find('prev').disabled=index<0;
    find('next').disabled=index===current.stations.length-1;
    find('next').textContent=index<0?'从分水岭出发 →':'下一站 →';
    find('all').setAttribute('aria-pressed',String(!station));
    find('back').textContent=back?'回到'+back.name+' ↗':'返回环境线 ↗';
    find('rainless').setAttribute('aria-pressed',String(noRain));
    seasonButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.exchangeSeason===season)));
    layerButtons.forEach(b=>b.setAttribute('aria-pressed',String(layers.has(b.dataset.exchangeLayer))));
    find('reading').textContent=noRain?
      '停雨 14 天后，坡面快流停止，先前蓄下的地下水仍在出露。':
      season==='wet'?'同一补给样区的雨水分成坡面径流和地下补给。':
        '这个样区当月几乎没有坡面径流，缓释基流仍进入北支。';
    const amountDigits=noRain?2:0;
    const values=[
      {name:'坡面径流',value:fmt(state.surface,state.unit,amountDigits),color:'#8dcfff'},
      {name:'地下出露基流',value:fmt(state.baseflow,state.unit,amountDigits),color:'#a5f0bf'},
      {name:noRain?'现存地下水':'地下补给',value:fmt(noRain?state.ground:state.recharge,noRain?'m³':state.unit,amountDigits),color:'#ffdb91'}
    ];
    find('values').innerHTML=values.map(row=>`<div style="--route-color:${row.color}"><dt>${row.name}</dt><dd>${row.value}</dd></div>`).join('');
    drawBank(panel.querySelector('canvas'),current,state);
    find('wetland').textContent=`苇泽湿地 ${state.wetland.stage.toFixed(2)} m · ${pretty(state.wetland.area)} m²`;
  }
  function go(id){
    station=scene.model.stations.find(p=>p.id===id);render();
  }
  find('all').addEventListener('click',()=>go());
  find('back').addEventListener('click',()=>onBack(back));
  find('wetland-link').addEventListener('click',()=>onWetland({
    focus:station?.id==='wetland'?'seasonal':'channel',month:seasons[season].month,
    back:{mode:'exchange',name:'水路汇合',focus:station?.id,month:seasons[season].month,noRain,back}
  }));
  find('stop').addEventListener('change',e=>go(e.currentTarget.value));
  find('prev').addEventListener('click',()=>go(scene.model.stations[scene.model.stations.indexOf(station)-1]?.id));
  find('next').addEventListener('click',()=>go(scene.model.stations[scene.model.stations.indexOf(station)+1]?.id));
  find('rainless').addEventListener('click',()=>{noRain=!noRain;render();});
  seasonButtons.forEach(b=>b.addEventListener('click',()=>{season=b.dataset.exchangeSeason;noRain=false;render();}));
  layerButtons.forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.exchangeLayer;
    if(layers.has(id))layers.delete(id);else layers.add(id);
    render();
  }));
  return {
    show(context={}){
      root.hidden=false;back=context.back;noRain=context.noRain??false;
      if(context.month===1||context.month===7)season=context.month===1?'dry':'wet';
      go(context.focus);
    },
    hide(){root.hidden=true;scene.hide();},
    project(camera){
      const bound=panel.closest('#world-plan-panel').getBoundingClientRect(),placed=[];
      labels.forEach(({x,y,z,id},i)=>{
        const p=projected.set(x,y,z).project(camera);
        const u=(p.x*.5+.5)*innerWidth,v=(-p.y*.5+.5)*innerHeight-(!station&&id==='recharge'?40:0);
        const covers=u>bound.left-63&&u<bound.right+63&&v>bound.top-13&&v<bound.bottom+13;
        const overlap=placed.some(([x,y])=>Math.abs(u-x)<120&&Math.abs(v-y)<24);
        const controls=u<232&&v>121&&v<194;
        const node=nodes[i];
        node.hidden=p.z< -1||p.z>1||u<68||u>innerWidth-68||v<83||v>innerHeight-36||controls||covers||overlap;
        if(!node.hidden){
          node.style.transform=`translate(${u}px,${v}px) translate(-50%,-50%)`;
          placed.push([u,v]);
        }
      });
    },
    update(dt){scene.update(dt);},
    get view(){
      if(!station)return [-1030,-665,27,innerWidth<680?1110:865,2.58];
      const {x,z,distance,id}=station;
      return [x,z,Math.max(0,terrainHeight(x,z)),distance,id==='spring'?.78:id==='wetland'?1.18:1.77];
    }
  };
}

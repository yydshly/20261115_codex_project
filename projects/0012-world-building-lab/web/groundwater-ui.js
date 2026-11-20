import {Vector3} from 'three';
import {terrainHeight} from './large-world.js';
import {groundStops,hydroMaterials,lithologyLegend,simulateStorm,stormPresets,stormHours} from './groundwater-layout.js';

const stores=[
  {id:'runoff',name:'地表径流',color:'#78b9ed'},
  {id:'soil',name:'土层留水',color:'#d8b27a'},
  {id:'groundwater',name:'地下蓄水',color:'#4bc8b4'},
  {id:'discharge',name:'地下累计出流',color:'#c0a6eb'}
];
const recipe=Object.fromEntries(Object.entries(stormPresets).map(([id,storm])=>[id,
  Object.fromEntries(Object.entries(hydroMaterials).map(([key,material])=>[key,simulateStorm(storm,material)]))
]));
const mm=value=>Number(value.toFixed(1));

function drawSection(canvas,site,frame){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const material=site.material;
  const layered=site.id==='storage'||site.id==='spring';
  const carbonate=site.id==='cave';
  function shape(points,color){
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.closePath();c.fillStyle=color;c.fill();
  }
  function stroke(points,color,width=1){
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();
  }
  function text(label,x,y,color='#f5ebcd'){
    c.fillStyle=color;c.font='12px system-ui';c.fillText(label,x,y);
  }
  function arrow(x,y,endX,endY,color){
    stroke([[x,y],[endX,endY]],color,1.8);
    const a=Math.atan2(endY-y,endX-x);
    shape([[endX,endY],[endX-7*Math.cos(a-.45),endY-7*Math.sin(a-.45)],
      [endX-7*Math.cos(a+.45),endY-7*Math.sin(a+.45)]],color);
  }
  c.fillStyle='#1d3939';c.fillRect(0,0,w,h);
  if(site.id==='weathering'){
    const columns=[
      {left:13,right:201,base:'#c5a273',soil:'#a28055',title:'砂岩风化 · 砂质残积土',depth:24},
      {left:213,right:w-13,base:'#867874',soil:'#716151',title:'泥岩风化 · 细粒残积土',depth:31}
    ];
    for(const [index,part] of columns.entries()){
      const {left,right,base,soil,title,depth}=part;
      c.fillStyle=base;c.fillRect(left,48,right-left,h-60);
      shape([[left,48],[right,48],[right,48+depth],[left,43+depth]],soil);
      text(title,left+14,32);
      for(let i=0;i<23;i++){
        const x=left+7+i*29%(right-left-14),y=53+(i*11)%(depth-8),r=index===0?1.5+i%2*.6:.75;
        c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=base;c.fill();
      }
      for(let y=88;y<160;y+=13)stroke([[left,y],[right,y+3]],'#40332e56',1);
      if(frame.infiltrated>.1)arrow(left+99,44,left+95,64+depth,'#b7eef1');
    }
    return;
  }
  const ground=carbonate?[[13,46],[130,55],[165,62],[191,79],[215,52],[w-13,65]]:
    [[13,48],[112,54],[222,62],[305,76],[343,98],[w-13,95]];
  const soilDepth=material==='crystalline'||carbonate?9:material==='alluvium'?20:14;
  shape([...ground,[w-13,h-12],[13,h-12]],hydroMaterials[material].color);
  shape([...ground,...[...ground].reverse().map(([x,y])=>[x,y+soilDepth])],site.ground);
  stroke(ground,'#e0c99d',1.8);
  const blue='#9de8ee',level=Math.min(39,frame.groundwater*1.45);
  if(carbonate){
    const shaft=[[188,73],[194,100],[232,115],[252,118],[283,131],[382,135]];
    stroke(shaft,'#293f42',17);
    stroke([[197,102],[227,82],[258,87],[298,83]],'#425359',8);
    if(frame.discharge>.01){
      stroke(shaft,blue,2.6);
      arrow(283,131,368,134,blue);
    }
    text('落水洞',209,73);text('地下河',299,160);
  }else if(layered){
    shape([[13,121],[210,128],[345,111],[w-13,126],[w-13,h-12],[13,h-12]],'#786663');
    if(level>.25){
      shape([[13,121-level],[210,128-level*.7],[345,111],[210,128],[13,121]],'#62b8b4');
      arrow(92,120-level*.55,180,121-level*.37,'#cdffff');
    }
    if(frame.outflow>.025){
      arrow(273,124,344,111,blue);
      stroke([[347,112],[365,114],[w-13,113]],blue,3);
    }
    text('砂岩含水层',25,95);text('低透水泥岩',22,h-23);text('接触带泉',311,146);
  }else{
    const fissures=[[106,61,126,124],[190,65,177,145],[275,75,305,138]];
    if(material!=='alluvium')for(const [x,y,x2,y2] of fissures)stroke([[x,y],[x2,y2]],'#77675f',3);
    if(level>.25){
      shape([[13,h-12],[13,143-level*.6],[210,145-level],[w-13,147-level*.57],[w-13,h-12]],'#5caaa8');
    }
    if(material==='alluvium')for(let i=0;i<38;i++){
      c.beginPath();c.ellipse(26+i*47%(w-52),91+i*17%55,2.5+i%4*.8,1.8+i%3*.65,i*.13,0,Math.PI*2);
      c.fillStyle=i%2?'#a18a61':'#b49a65';c.fill();
    }
    text(hydroMaterials[material].host,22,h-23);
  }
  if(frame.amount>0){
    for(const x of [57,130,215,278])arrow(x,15,x-4,34,'#b0dcea');
    text('降雨',18,27);
    if(frame.infiltrated>.1){
      for(const [x,y] of carbonate?[[184,67],[215,58]]:[[113,52],[187,61],[263,69]]){
        arrow(x,y+4,x+4,y+18+Math.min(15,frame.infiltrated*.6),blue);
      }
    }
  }
}

export function mountGroundwater(panel,scene,onBack,onExchange){
  panel.innerHTML=`
    <div class="gw-location">
      <div class="tectonic-actions">
        <button id="gw-overview" type="button" aria-pressed="true">岩性全图</button>
        <button id="gw-map" type="button" aria-pressed="true">岩性着色</button>
        <button id="gw-back" type="button">返回环境线 ↗</button>
      </div>
      <p id="gw-status" class="plan-present" role="status"></p>
      <div class="tectonic-stations">
        <select id="gw-stop" aria-label="地下水观察站"><option value="">选择沿线站点</option>
          ${groundStops.map(s=>`<option value="${s.id}">${s.phase} · ${s.name}</option>`).join('')}
        </select>
        <button id="gw-prev" type="button">上一站</button>
        <button id="gw-next" type="button">下一站 →</button>
      </div>
      <p id="gw-detail" class="plan-note"></p>
      <button id="gw-cut" type="button" aria-pressed="true" hidden>地下洞网已露出</button>
      <button id="gw-exchange" type="button">看地下水怎样补给河流 ↗</button>
      <ul class="gw-rock-legend" aria-label="地图岩性图例">
        ${lithologyLegend.map(({id,color,name})=>`<li><i style="--swatch:${color}" data-cover="${id==='alluvium'}"></i>${name}</li>`).join('')}
      </ul>
    </div>
    <div class="gw-storm">
      <div class="tectonic-actions gw-storm-actions" aria-label="设定同一场雨">
        ${Object.entries(stormPresets).map(([id,s])=>`<button type="button" data-gw-storm="${id}" aria-pressed="false">${s.name} · ${s.hours} 小时</button>`).join('')}
        <button id="gw-play" type="button" aria-pressed="false">播放降雨 ▷</button>
      </div>
      <label class="gw-clock" for="gw-hour"><span>统一雨量 48 mm</span><output id="gw-time"></output></label>
      <input id="gw-hour" type="range" min="0" max="${stormHours}" value="8" aria-label="降雨后的经过时间">
      <div class="gw-visual-controls">
        <button id="gw-compare" type="button" aria-pressed="true">同雨水量对照</button>
        <button id="gw-section" type="button" aria-pressed="false" disabled>站点地下剖面</button>
      </div>
      <div id="gw-chart">
        <ul class="gw-bars">
          ${Object.entries(hydroMaterials).map(([id,r])=>`<li data-gw-row="${id}"><span>${r.name}</span>
            <span class="gw-track" role="img">
              ${stores.map(s=>`<i data-store="${s.id}" style="--swatch:${s.color}"></i>`).join('')}
            </span></li>`).join('')}
        </ul>
        <ul class="gw-rain-legend" aria-label="水量收支图例">
          ${stores.map(s=>`<li><i style="--swatch:${s.color}"></i>${s.name}</li>`).join('')}
        </ul>
      </div>
      <figure id="gw-profile" hidden>
        <canvas width="414" height="175" aria-label="所选站点的教学地下剖面，随雨量和时间更新土层、地下蓄水与出流。"></canvas>
      </figure>
      <p id="gw-readout" class="plan-note"></p>
      <p class="plan-note gw-limits">相同投雨面积与初始条件。图示为各样点的教学收支，横条满格为 48 mm。</p>
    </div>`;
  const find=id=>panel.querySelector('#gw-'+id);
  const output=panel.ownerDocument.createElement('div');
  output.id='groundwater-map-labels';output.hidden=true;output.setAttribute('aria-hidden','true');
  panel.ownerDocument.body.append(output);
  const rows=[...panel.querySelectorAll('[data-gw-row]')].map(row=>({
    row,track:row.querySelector('.gw-track'),id:row.dataset.gwRow,
    parts:stores.map(s=>row.querySelector(`[data-store="${s.id}"]`))
  }));
  const options=panel.querySelectorAll('[data-gw-storm]'),projected=new Vector3();
  let station,back,annotations=[],nodes=[],profile=false,colors=true,cut=true,visible=false;
  let storm='steady',hour=stormPresets.steady.hours,playing=false,clock=hour;

  function labels(values){
    if(values.length===annotations.length&&values.every((p,i)=>p===annotations[i]))return;
    annotations=values;
    nodes=annotations.map(p=>{
      const label=panel.ownerDocument.createElement('span');
      label.textContent=p.text;label.style.setProperty('--route-color',p.color);
      return label;
    });
    output.replaceChildren(...nodes);
  }
  function render(){
    const material=station?.material??'layered',frame=recipe[storm][material][hour];
    labels(scene.show({station,frame,map:colors,openCave:cut}));
    const index=groundStops.indexOf(station),isCave=station?.id==='cave';
    find('status').textContent=station?station.name:'四种基岩，一层冲积盖层';
    find('detail').textContent=station?.detail??'观察同一场雨在五种样点里的去向。从基岩、风化土和砂砾开始，再追踪干谷泉水与另一处岩溶地下河。';
    find('stop').value=station?.id??'';
    find('prev').disabled=index<0;find('next').disabled=index===groundStops.length-1;
    find('next').textContent=index<0?'从基岩出发 →':'下一站 →';
    find('overview').setAttribute('aria-pressed',String(!station));
    find('map').setAttribute('aria-pressed',String(colors));
    find('map').textContent=colors?'岩性着色':'原场景地表';
    find('cut').hidden=!isCave;find('cut').setAttribute('aria-pressed',String(cut));
    find('cut').textContent=cut?'地下洞网已露出':'打开地下洞网';
    find('back').textContent='回到'+(back?.name??'环境线')+' ↗';
    find('hour').value=String(hour);
    const until=stormPresets[storm].hours;
    find('time').textContent=hour===0?'雨前':hour<=until?`第 ${hour} 小时 · 降雨`:`雨停后 ${hour-until} 小时`;
    find('compare').setAttribute('aria-pressed',String(!profile));
    find('section').setAttribute('aria-pressed',String(profile));
    find('section').disabled=!station;
    find('profile').hidden=!profile;find('chart').hidden=profile;
    options.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.gwStorm===storm)));
    if(profile)drawSection(panel.querySelector('canvas'),station,frame);
    for(const {row,track,id,parts} of rows){
      const sample=recipe[storm][id][hour];
      row.dataset.active=String(station?.material===id);
      parts.forEach((bar,i)=>{bar.style.width=sample[stores[i].id]/stormPresets[storm].total*100+'%';});
      const note=hydroMaterials[id].name+' · '+stores.map(s=>s.name+' '+mm(sample[s.id])+' mm').join('，');
      track.setAttribute('aria-label',note);track.title=note;
    }
    find('readout').textContent=station?
      `地下蓄水 ${mm(frame.groundwater)} mm · 当小时入渗 ${mm(frame.infiltrated)} mm · 当小时出流 ${mm(frame.outflow)} mm`:
      '分段可查看各项水量。砂砾可蓄水，连通的溶洞也可以把水很快送出。';
  }
  function choose(id){
    station=groundStops.find(s=>s.id===id);cut=true;
    colors=!station;
    profile=['weathering','infiltration','storage','spring','cave'].includes(id);
    render();
  }
  function play(value){
    playing=value;
    find('play').textContent=value?'暂停降雨演示':'播放降雨 ▷';
    find('play').setAttribute('aria-pressed',String(value));
  }
  find('overview').addEventListener('click',()=>choose());
  find('stop').addEventListener('change',e=>choose(e.currentTarget.value));
  find('prev').addEventListener('click',()=>choose(groundStops[groundStops.indexOf(station)-1]?.id));
  find('next').addEventListener('click',()=>choose(groundStops[groundStops.indexOf(station)+1]?.id));
  find('back').addEventListener('click',()=>onBack(back));
  find('exchange').addEventListener('click',()=>onExchange({
    focus:station?.id==='infiltration'?'recharge':'spring',
    back:{mode:'groundwater',name:'岩性与地下水',focus:station?.id,back}
  }));
  find('map').addEventListener('click',()=>{colors=!colors;render();});
  find('cut').addEventListener('click',()=>{cut=!cut;render();});
  find('compare').addEventListener('click',()=>{profile=false;render();});
  find('section').addEventListener('click',()=>{profile=true;render();});
  options.forEach(button=>button.addEventListener('click',()=>{
    play(false);storm=button.dataset.gwStorm;hour=stormPresets[storm].hours;render();
  }));
  find('hour').addEventListener('input',e=>{play(false);hour=Number(e.target.value);render();});
  find('play').addEventListener('click',()=>{
    if(playing){play(false);return;}
    hour=clock=0;play(true);render();
  });
  return {
    show(context={}){visible=true;back=context.back;output.hidden=false;choose(context.focus);},
    hide(){visible=false;output.hidden=true;play(false);scene.hide();},
    update(dt){
      if(!visible)return;
      scene.update(dt);
      if(!playing)return;
      clock+=dt*4;const next=Math.min(stormHours,Math.floor(clock));
      if(next!==hour){hour=next;render();}
      if(hour===stormHours)play(false);
    },
    project(camera){
      const panelBounds=panel.closest('#world-plan-panel').getBoundingClientRect();
      const placed=[];
      annotations.forEach(({x,y,z,id},i)=>{
        const p=projected.set(x,y,z).project(camera);
        const offset=!station?(id==='storage'?-59:id==='spring'?55:0):0;
        const u=(1+p.x)*innerWidth*.5+offset,v=(1-p.y)*innerHeight*.5+(offset?-9:0);
        const covered=u>panelBounds.left-76&&u<panelBounds.right+76&&v>panelBounds.top-14&&v<panelBounds.bottom+14;
        const overlap=placed.some(([x,y])=>Math.abs(u-x)<130&&Math.abs(v-y)<25);
        nodes[i].hidden=covered||overlap||p.z< -1||p.z>1||u<77||u>innerWidth-77||v<82||v>innerHeight-34;
        if(!nodes[i].hidden){
          nodes[i].style.transform=`translate(${u}px,${v}px) translate(-50%,-50%)`;placed.push([u,v]);
        }
      });
    },
    get view(){
      if(!station){
        if(innerWidth<660)return [-120,-140,65,3620,1.89];
        if(innerWidth<900)return [-50,-140,65,3190,1.98];
        return [-120,-140,65,innerWidth<1100?3740:3050,1.98];
      }
      if(station.id==='cave')return [station.x,station.z,-1,station.distance,1.16];
      const y=terrainHeight(station.x,station.z);
      return [station.x,station.z,station.id==='storage'?Math.max(y,38):Math.max(13,y),
        station.distance,station.id==='storage'?1.59:1.73];
    }
  };
}

import {Vector3} from 'three';
import {wetlandBands,wetlandPhases} from './wetland-layout.js';

const square=value=>Math.round(value).toLocaleString('zh-CN')+' m²';
const overlayKeys=[
  {name:'此刻漫过低滩',color:'#53bef8'},{name:'退水后仍湿的泥面',color:'#ab6c41'},
  {name:'饱湿岸带',color:'#76bfa5'},{name:'丰水岸线',color:'#e6b769'}
];
const bandKeys=Object.values(wetlandBands);

function drawTransect(canvas,model,frame,station,layer){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const target=station??model.stations.find(s=>s.id==='seasonal');
  const count=model.cols+1,first=target.point.row*count;
  const row=model.points.slice(first,first+count),readings=frame.readings.slice(first,first+count);
  const left=14,right=w-14,top=19,bottom=h-21;
  const ceiling=Math.max(...row.map(p=>p.bed))+.45,floor=Math.min(...row.map(p=>p.bed))-.25;
  const y=e=>bottom-(e-floor)/(ceiling-floor)*(bottom-top);
  const x=i=>left+(right-left)*i/(row.length-1);
  const level=row[0].bed+readings[0].depth;
  const line=(pts,color,width=1.2,fill=false)=>{
    c.beginPath();
    pts.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));
    if(fill){c.closePath();c.fillStyle=color;c.fill();}
    else{c.lineWidth=width;c.strokeStyle=color;c.stroke();}
  };
  c.fillStyle='#223b3a';c.fillRect(0,0,w,h);
  const bed=row.map((p,i)=>[x(i),y(p.bed)]);
  line([...bed,[right,bottom],[left,bottom]],'#9f8b6b',1,true);
  for(let first=0;first<row.length;first++){
    if(!readings[first].flooded)continue;
    let last=first;
    while(last<row.length-1&&readings[last+1].flooded)last++;
    if(last>first)line([[x(first),y(level)],[x(last),y(level)],
      ...bed.slice(first,last+1).reverse()],'#4b9bbe',1,true);
    first=last;
  }
  for(let i=1;i<row.length;i++){
    const b=readings[i],p=row[i];
    if(layer==='bands'||layer==='water'&&!b.flooded&&b.damp){
      const color=layer==='bands'?wetlandBands[p.band].color:b.exposed?'#d59362':'#8dcaac';
      line([bed[i-1],bed[i]],color,layer==='bands'?4:3);
    }
  }
  c.setLineDash([5,4]);
  line([[left,y(row[0].high)],[right,y(row[0].high)]],'#f3ca85');
  c.setLineDash([]);
  const selected=target.point.col;
  c.beginPath();c.arc(x(selected),bed[selected][1],3.2,0,Math.PI*2);c.fillStyle='#fff5d0';c.fill();
  c.font='10px system-ui';
  c.fillStyle='#ffe5b7';c.fillText('丰水参考线',left+3,Math.max(12,y(row[0].high)-5));
  c.fillStyle='#c4eff5';c.fillText('当前水面',w*.47,Math.min(bottom-7,y(level)+13));
  c.fillStyle='#e6dcc0';c.fillText('一侧岸坡',left,h-5);c.fillText('另一侧岸坡',w-64,h-5);
}

export function mountWetland(panel,scene,onBack,onEstuary){
  panel.innerHTML=`
    <div class="wetland-location">
      <div class="tectonic-actions">
        <button id="wetland-all" type="button" aria-pressed="true">河流与湿地全景</button>
        <button id="wetland-back" type="button">返回环境线 ↗</button>
      </div>
      <p id="wetland-status" class="plan-present" role="status"></p>
      <div class="tectonic-stations">
        <select id="wetland-stop" aria-label="洪泛退水观察站"><option value="">选择沿线站点</option>
          ${Object.entries(wetlandBands).map(([id,s])=>`<option value="${id}">${s.name}</option>`).join('')}
        </select>
        <button id="wetland-prev" type="button">上一站</button>
        <button id="wetland-next" type="button">下一站 →</button>
      </div>
      <p id="wetland-lesson" class="plan-note"></p>
      <p id="wetland-site" class="plan-note"></p>
      <button id="wetland-estuary" type="button">沿水看河口潮汐 ↗</button>
    </div>
    <div class="wetland-compare">
      <div class="tectonic-actions" aria-label="丰枯与退水">
        <button type="button" data-wetland-phase="high" aria-pressed="true">丰水期 · 7 月</button>
        <button type="button" data-wetland-phase="retreat" aria-pressed="false">退水过程</button>
        <button type="button" data-wetland-phase="low" aria-pressed="false">枯水期 · 1 月</button>
      </div>
      <div id="wetland-days" hidden>
        <label for="wetland-day">丰水后经过的时间</label>
        <select id="wetland-day">${wetlandPhases.filter(p=>p.day!==undefined).map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select>
      </div>
      <dl id="wetland-values" class="exchange-values"></dl>
      <div class="line-themes" aria-label="湿地地图图层">
        <button type="button" data-wetland-layer="water" aria-pressed="true">积水与湿泥</button>
        <button type="button" data-wetland-layer="bands" aria-pressed="false">植被分带</button>
        <button type="button" data-wetland-layer="natural" aria-pressed="false">实景</button>
      </div>
      <ul id="wetland-key" class="gw-rock-legend" aria-label="湿地地图图例"></ul>
      <figure>
        <figcaption>同一断面的岸坡、水面与湿带</figcaption>
        <canvas width="414" height="133" aria-label="横跨河床与两侧河岸的剖面，显示当前水面及丰水参考线"></canvas>
      </figure>
      <details class="exchange-note">
        <summary>水位与植物分带的依据</summary>
        <p class="plan-note">面积仅统计这段样带。丰枯取逐月流域水位，退水天数和土壤湿度是示意计算。植被按一年中的积水频率和浅水深度布置。</p>
        <a href="https://www.epa.gov/sites/default/files/documents/wetlands_20hydrology.pdf" target="_blank" rel="noopener">EPA · 湿地水文与植被 ↗</a>
      </details>
    </div>`;
  const find=id=>panel.querySelector('#wetland-'+id);
  const doc=panel.ownerDocument,labelsRoot=doc.createElement('div');
  labelsRoot.id='wetland-map-labels';labelsRoot.hidden=true;labelsRoot.setAttribute('aria-hidden','true');doc.body.append(labelsRoot);
  const phaseButtons=[...panel.querySelectorAll('[data-wetland-phase]')];
  const layerButtons=[...panel.querySelectorAll('[data-wetland-layer]')],projected=new Vector3();
  let phase=wetlandPhases[0],lastRetreat=wetlandPhases[2],station,layer='water',back,labels=[],labelNodes=[];

  function paint(){
    const model=scene.model,{frame,labels:newLabels}=scene.show({phase,station,layer});
    labels=newLabels;
    labelNodes=labels.map(p=>{
      const node=doc.createElement('span');
      node.textContent=p.text;node.style.setProperty('--route-color',p.color);return node;
    });
    labelsRoot.replaceChildren(...labelNodes);
    const pos=model.stations.indexOf(station);
    find('all').setAttribute('aria-pressed',String(!station));
    find('back').textContent=back?'回到'+back.name+' ↗':'返回环境线 ↗';
    find('status').textContent=station?.name??'中央河与苇泽湿地';
    find('lesson').textContent=station?.detail??
      '沿同一段河看深槽、河漫滩、季节性湿地和常年湿地。切换水位，再开植被分带对照。';
    const reading=station?frame.readings[station.point.row*(model.cols+1)+station.point.col]:null;
    find('site').textContent=station?
      `${station.plants} · 年内淹水 ${station.point.months}/12 个月 · 此刻${reading.flooded?'淹水':reading.damp?'露出但湿润':'露出、较干'}`:
      '短时受淹的高滩到常年湿岸，依次过渡为岸草、莎草和芦苇。';
    find('stop').value=station?.id??'';
    find('prev').disabled=pos<0;
    find('next').disabled=pos===model.stations.length-1;
    find('next').textContent=pos<0?'从河道出发 →':'下一站 →';
    find('days').hidden=phase.day===undefined;
    find('day').value=lastRetreat.id;
    phaseButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wetlandPhase===(phase.day===undefined?phase.id:'retreat'))));
    layerButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wetlandLayer===layer)));
    find('values').innerHTML=[
      ['苇泽参考水位',frame.waterStage.toFixed(2)+' m','#aecfe9'],
      ['低滩仍在水下',square(frame.floodedBank),'#90dafa'],
      ['露出且仍湿',square(frame.exposed),'#e4b584']
    ].map(([key,value,color])=>`<div style="--route-color:${color}"><dt>${key}</dt><dd>${value}</dd></div>`).join('');
    const key=layer==='bands'?bandKeys:layer==='water'?overlayKeys:[overlayKeys.at(-1)];
    find('key').innerHTML=key.map(p=>`<li><i style="--swatch:${p.color}"></i>${p.name}</li>`).join('');
    drawTransect(panel.querySelector('canvas'),model,frame,station,layer);
  }
  function go(id){station=scene.model.stations.find(s=>s.id===id);paint();}
  find('all').addEventListener('click',()=>go());
  find('back').addEventListener('click',()=>onBack(back));
  find('estuary').addEventListener('click',()=>onEstuary({
    focus:'fresh',month:phase.month,back:{mode:'wetland',name:'洪泛与湿地',focus:station?.id,phase:phase.id,back}
  }));
  find('stop').addEventListener('change',e=>go(e.target.value));
  find('prev').addEventListener('click',()=>go(scene.model.stations[scene.model.stations.indexOf(station)-1]?.id));
  find('next').addEventListener('click',()=>go(scene.model.stations[scene.model.stations.indexOf(station)+1]?.id));
  find('day').addEventListener('change',e=>{phase=lastRetreat=wetlandPhases.find(p=>p.id===e.currentTarget.value);paint();});
  phaseButtons.forEach(b=>b.addEventListener('click',()=>{
    phase=b.dataset.wetlandPhase==='retreat'?lastRetreat:wetlandPhases.find(p=>p.id===b.dataset.wetlandPhase);
    paint();
  }));
  layerButtons.forEach(b=>b.addEventListener('click',()=>{layer=b.dataset.wetlandLayer;paint();}));

  return {
    show(context={}){
      back=context.back;labelsRoot.hidden=false;
      if(context.month===1||context.month===7)phase=context.month===1?wetlandPhases.at(-1):wetlandPhases[0];
      if(context.phase)phase=wetlandPhases.find(p=>p.id===context.phase)??phase;
      go(context.focus);
    },
    hide(){labelsRoot.hidden=true;scene.hide();},
    project(camera){
      const bound=panel.closest('#world-plan-panel').getBoundingClientRect(),placed=[];
      labels.forEach(({x,y,z,id},i)=>{
        const p=projected.set(x,y,z).project(camera);
        const u=(p.x*.5+.5)*innerWidth,v=(-p.y*.5+.5)*innerHeight+(!station&&id==='seasonal'?29:0);
        const covers=u>bound.left-46&&u<bound.right+46&&v>bound.top-12&&v<bound.bottom+12;
        const overlap=placed.some(([x,y])=>Math.abs(x-u)<88&&Math.abs(y-v)<25);
        const node=labelNodes[i];
        node.hidden=covers||overlap||p.z< -1||p.z>1||u<47||u>innerWidth-47||v<83||v>innerHeight-32;
        if(!node.hidden){
          node.style.transform=`translate(${u}px,${v}px) translate(-50%,-50%)`;placed.push([u,v]);
        }
      });
    },
    get view(){
      if(!station)return [-1181,-325,4,innerWidth<670?246:203,1.63];
      const {x,z,bed}=station.point;
      return [x,z,Math.max(3,bed),station.distance,1.41];
    }
  };
}

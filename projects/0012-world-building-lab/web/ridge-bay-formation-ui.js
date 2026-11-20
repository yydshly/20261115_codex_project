import {formationMaterials} from './world-hydraulics.js';
import {formationHabitat} from './world-formation.js';
import {wetlandBands} from './wetland-layout.js';

const habitatStyles={...formationHabitat,...wetlandBands};
const colors={surface:'#fff1d0',water:'#73d8f3',compare:'#edc8ff',route:'#f8d28a',flow:'#79d9ff',runoff:'#a0f4e5'};
const fmt=new Intl.NumberFormat('zh-CN',{maximumFractionDigits:1});
const metres=value=>`${fmt.format(value)} 米`;

function chartScale(points){
  const values=points.flatMap(p=>[p.y,p.water,p.compareY].filter(Number.isFinite));
  const min=Math.min(...values),max=Math.max(...values);
  const interval=(max-min)/3;
  const power=10**Math.floor(Math.log10(Math.max(interval,.1)));
  const step=power*([1,2,5,10].find(n=>n*power>=interval)??10);
  const low=Math.floor(min/step)*step;
  return {low,high:Math.max(low+step,Math.ceil(max/step)*step),step};
}

function drawProfile(canvas,reading,compare){
  const width=Math.max(210,canvas.clientWidth||320),height=170;
  const scale=Math.min(3,canvas.ownerDocument.defaultView?.devicePixelRatio||1);
  canvas.width=Math.round(width*scale);
  canvas.height=Math.round(height*scale);
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  ctx.scale(scale,scale);
  const {points,station}=reading;
  if(points.length<2)return;

  const {low,high,step}=chartScale(points);
  const start=points[0].distance,end=points.at(-1).distance;
  const left=39,right=width-11,top=18,bottom=height-35;
  const x=p=>left+(right-left)*(p.distance-start)/(end-start||1);
  const y=value=>bottom-(bottom-top)*(value-low)/(high-low);
  ctx.font='11px system-ui, sans-serif';
  ctx.fillStyle='#b9cec8';
  ctx.fillText('高程（米）',2,11);
  ctx.textAlign='right';
  for(let datum=low;datum<=high+step*.001;datum+=step){
    ctx.beginPath();
    ctx.strokeStyle='#adc8bc44';
    ctx.moveTo(left,y(datum));
    ctx.lineTo(right,y(datum));
    ctx.stroke();
    ctx.fillText(fmt.format(datum),left-5,y(datum)+4);
  }

  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],x0=x(a),x1=x(b);
    const material=formationMaterials[a.material];
    ctx.fillStyle=material?.color??'#a58b6d';
    ctx.globalAlpha=.62;
    ctx.beginPath();
    ctx.moveTo(x0,bottom);
    ctx.lineTo(x0,y(a.y));
    ctx.lineTo(x1,y(b.y));
    ctx.lineTo(x1,bottom);
    ctx.fill();
    ctx.globalAlpha=1;

    const habitat=habitatStyles[a.habitat];
    if(habitat){
      ctx.fillStyle=habitat.color;
      ctx.fillRect(x0,bottom+2,x1-x0+.6,4);
    }
    const aWet=Number.isFinite(a.water)&&a.water>a.y,bWet=Number.isFinite(b.water)&&b.water>b.y;
    if(!aWet&&!bWet)continue;
    ctx.fillStyle='#73d8f360';
    ctx.beginPath();
    ctx.moveTo(x0,y(a.y));
    ctx.lineTo(x0,y(aWet?a.water:a.y));
    ctx.lineTo(x1,y(bWet?b.water:b.y));
    ctx.lineTo(x1,y(b.y));
    ctx.fill();
  }

  function line(key,color,dashes=[]){
    ctx.beginPath();
    ctx.strokeStyle=color;
    ctx.lineWidth=1.8;
    ctx.setLineDash(dashes);
    let connected=false;
    for(const p of points){
      if(!Number.isFinite(p[key])){connected=false;continue;}
      if(connected)ctx.lineTo(x(p),y(p[key]));
      else ctx.moveTo(x(p),y(p[key]));
      connected=true;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  line('y',colors.surface);
  line('water',colors.water);
  if(compare)line('compareY',colors.compare,[5,4]);

  const distanceToStation=p=>Math.hypot(p.x-station.x,p.z-station.z);
  const nearest=points.reduce((a,b)=>distanceToStation(a)<distanceToStation(b)?a:b);
  ctx.fillStyle=colors.route;
  ctx.beginPath();
  ctx.arc(x(nearest),y(nearest.y),4,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle='#d1e1da';
  ctx.textAlign='left';
  ctx.fillText(metres(start),left,height-12);
  ctx.textAlign='right';
  ctx.fillText(metres(end),right,height-12);
}

function comparisonValue(input,fallback){
  if(input===true||input==='1'||input==='true')return true;
  if(input===false||input==='0'||input==='false')return false;
  return fallback;
}

export function mountRidgeBayFormation(panel,getModel,render,onBack){
  panel.classList.add('ridge-bay-study');
  panel.innerHTML=`
    <div class="ridge-bay-heading">
      <p class="ridge-bay-position" data-ridge-bay="position"></p>
      <h3 data-ridge-bay="title"></h3>
      <p data-ridge-bay="question"></p>
    </div>
    <nav class="ridge-bay-stations" aria-label="剖面站点">
      <label>站点<select data-ridge-bay="station"></select></label>
      <div class="ridge-bay-step">
        <button type="button" data-ridge-bay="prev"></button>
        <button type="button" data-ridge-bay="next"></button>
      </div>
    </nav>
    <div class="ridge-bay-controls">
      <label>观测月份<select data-ridge-bay="month">
        ${Array.from({length:12},(_,index)=>`<option value="${index+1}">${index+1} 月</option>`).join('')}
      </select></label>
      <label class="ridge-bay-compare"><input type="checkbox" data-ridge-bay="compare" aria-describedby="ridge-bay-comparison">显示对照线</label>
    </div>
    <p class="ridge-bay-explanation" data-ridge-bay="explanation"></p>
    <p class="ridge-bay-comparison" id="ridge-bay-comparison" data-ridge-bay="comparison"></p>
    <figure class="ridge-bay-profile">
      <figcaption id="ridge-bay-profile-title">本站横剖面</figcaption>
      <canvas width="320" height="170" data-ridge-bay="canvas" role="img" aria-labelledby="ridge-bay-profile-title" aria-describedby="ridge-bay-profile-summary"></canvas>
      <p id="ridge-bay-profile-summary" data-ridge-bay="summary"></p>
    </figure>
    <ul class="ridge-bay-legend" data-ridge-bay="legend" aria-label="图例"></ul>
    <section class="ridge-bay-measurements" aria-labelledby="ridge-bay-readings-title">
      <h4 id="ridge-bay-readings-title">本站读数</h4>
      <dl data-ridge-bay="readings"></dl>
    </section>
    <button class="ridge-bay-return" type="button" data-ridge-bay="back">到本站实地</button>
    <p class="ridge-bay-a11y" role="status" data-ridge-bay="status"></p>`;

  const doc=panel.ownerDocument;
  const find=name=>panel.querySelector(`[data-ridge-bay="${name}"]`);
  const stationSelect=find('station'),monthSelect=find('month'),compareInput=find('compare');
  const prev=find('prev'),next=find('next'),canvas=find('canvas');
  let model=null,reading=null,index=0,month=7,compare=true,shown=false;

  function writeLegend(reading,hasComparisonSurface){
    const keys=[['本站位置',colors.route,'point'],['3D 主线',colors.route,'line'],['地表／床面',colors.surface,'line']];
    if(reading.points.some(p=>Number.isFinite(p.water)))keys.push(['水面',colors.water,'line']);
    if(compare&&hasComparisonSurface)keys.push(['形成对照',colors.compare,'dashed']);
    if(reading.flows?.some(flow=>flow.kind==='surface'))keys.push(['河道来水',colors.flow,'arrow']);
    if(reading.flows?.some(flow=>flow.kind==='runoff'))keys.push(['坡面汇流',colors.runoff,'arrow']);
    const materials=new Set(reading.points.map(p=>p.material));
    const habitats=new Set(reading.points.map(p=>p.habitat));
    for(const id of materials){
      const item=formationMaterials[id];
      if(item)keys.push([item.name,item.color,'fill']);
    }
    for(const id of habitats){
      const item=habitatStyles[id];
      if(item)keys.push([item.name,item.color,'band']);
    }
    find('legend').replaceChildren(...keys.map(([label,color,shape])=>{
      const li=doc.createElement('li'),mark=doc.createElement('i');
      mark.dataset.shape=shape;
      mark.style.setProperty('--ridge-bay-mark',color);
      mark.setAttribute('aria-hidden','true');
      li.append(mark,label);
      return li;
    }));
  }

  function update(){
    if(!shown)return;
    const station=model.stations[index];
    if(!station)return;
    reading=model.read(station.id,month);
    const hasComparisonSurface=reading.points.some(p=>Number.isFinite(p.compareY));
    stationSelect.value=station.id;
    monthSelect.value=String(month);
    compareInput.checked=compare&&hasComparisonSurface;
    compareInput.disabled=!hasComparisonSurface;
    prev.disabled=index===0;
    next.disabled=index===model.stations.length-1;
    prev.textContent=prev.disabled?'← 上一站':`← ${model.stations[index-1].name}`;
    next.textContent=next.disabled?'下一站 →':`${model.stations[index+1].name} →`;
    find('position').textContent=`第 ${index+1} / ${model.stations.length} 站 · 距雪岭 ${metres(station.at)}`;
    find('title').textContent=station.name;
    find('question').textContent=station.question;
    find('explanation').textContent=reading.explanation;
    find('comparison').textContent=station.comparison??'';
    find('comparison').hidden=!station.comparison;
    const elevations=reading.points.map(p=>p.y).filter(Number.isFinite);
    const water=reading.points.map(p=>p.water).filter(Number.isFinite);
    const waterDescription=water.length?`水面高程 ${metres(Math.min(...water))}${Math.max(...water)-Math.min(...water)>.1?` 至 ${metres(Math.max(...water))}`:''}。`:'';
    find('summary').textContent=elevations.length?
      `地表高程 ${fmt.format(Math.min(...elevations))} 至 ${metres(Math.max(...elevations))}。${waterDescription}横轴为剖面距离，纵轴按本站高差缩放。`:
      '本站暂缺剖面取样。';
    find('readings').replaceChildren(...reading.readings.map(({label,value})=>{
      const row=doc.createElement('div'),term=doc.createElement('dt'),data=doc.createElement('dd');
      term.textContent=label;
      data.textContent=value;
      row.append(term,data);
      return row;
    }));
    writeLegend(reading,hasComparisonSurface);
    drawProfile(canvas,reading,compare);
    find('status').textContent=`${station.name}，${month} 月${hasComparisonSurface?`，对照线${compare?'已显示':'已隐藏'}`:''}。`;
    render(model,reading,{compare});
  }

  function select(id){
    const target=model.stations.findIndex(s=>s.id===id);
    if(target<0||target===index)return;
    const active=doc.activeElement;
    index=target;
    update();
    if((active===prev&&prev.disabled)||(active===next&&next.disabled))stationSelect.focus();
  }

  stationSelect.addEventListener('change',()=>select(stationSelect.value));
  monthSelect.addEventListener('change',()=>{month=Number(monthSelect.value);update();});
  compareInput.addEventListener('change',()=>{compare=compareInput.checked;update();});
  prev.addEventListener('click',()=>select(model.stations[index-1]?.id));
  next.addEventListener('click',()=>select(model.stations[index+1]?.id));
  find('back').addEventListener('click',()=>onBack(model?.stations[index]?.id));
  if(typeof ResizeObserver==='function'){
    new ResizeObserver(()=>{if(shown&&reading)drawProfile(canvas,reading,compare);}).observe(canvas);
  }

  return {
    show(options={}){
      const selectedId=options.station??model?.stations[index]?.id;
      const nextModel=getModel();
      if(nextModel!==model){
        model=nextModel;
        stationSelect.replaceChildren(...model.stations.map(s=>{
          const option=doc.createElement('option');
          option.value=s.id;
          option.textContent=s.name;
          return option;
        }));
      }
      index=Math.max(0,model.stations.findIndex(s=>s.id===selectedId));
      const selectedMonth=Number(options.month);
      if(Number.isInteger(selectedMonth)&&selectedMonth>=1&&selectedMonth<=12)month=selectedMonth;
      compare=comparisonValue(options.compare,compare);
      shown=true;
      update();
    },
    hide(){shown=false;},
    get view(){return model?.stations[index]?.view??null;},
    get state(){return {station:model?.stations[index]?.id??null,month,compare};}
  };
}

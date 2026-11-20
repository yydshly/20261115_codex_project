import {riverSample,riverField,nearestWaterTrail,waterPlatforms} from './water-system.js';
import {seasonalRiverLevel} from './watershed-world.js';
import {hash} from './vegetation-rules.js';

export const wetlandPhases=[
  {id:'high',name:'丰水期',month:7},
  {id:'day3',name:'退水 3 天',month:7,day:3},
  {id:'day7',name:'退水 7 天',month:7,day:7},
  {id:'day14',name:'退水 14 天',month:7,day:14},
  {id:'day30',name:'退水 30 天',month:7,day:30},
  {id:'low',name:'枯水期',month:1}
];

export const wetlandBands={
  channel:{name:'河道',color:'#669ec4',plants:'深槽保留开水面',
    detail:'河床深槽在枯水期仍有水。深水和流动让大面积挺水草不易扎根，植被主要沿浅岸出现。'},
  floodplain:{name:'河漫滩',color:'#c6ad75',plants:'岸草与较高处的柳形树',
    detail:'洪水先漫过贴近河道的低滩，较高处只在少数月份被淹。水退后地表较快变干，岸草和耐短时受淹的柳形树占据更高位置。'},
  seasonal:{name:'季节性湿地',color:'#b3ce7d',plants:'成片莎草与散生芦苇',
    detail:'这条低滩每年有几个月淹水，枯水时露出细泥。水面退去后，细粒土和浅层水仍能暂时保湿，莎草适合这种干湿交替。'},
  permanent:{name:'常年湿地',color:'#73c9ae',plants:'浅水芦苇与湿岸莎草',
    detail:'最低的浅水边缘全年保持淹水或持续饱湿。芦苇可以根扎在湿泥里、茎叶伸出水面；再向深槽移动，挺水植物逐渐变疏。'}
};

export const wetlandLinks={
  water:{overview:'channel',join:'channel',valley:'floodplain',wetland:'seasonal',estuary:'permanent'},
  warmth:{overview:'floodplain',plain:'floodplain',foothill:'seasonal',forest:'permanent'},
  inland:{overview:'seasonal',windward:'floodplain',lee:'seasonal',oasis:'permanent'}
};

export const wetlandArea={start:.630,end:.701,breadth:1.45,cols:92,rows:104};
export const moistureThreshold=.62;
const clamp=t=>Math.min(1,Math.max(0,t));
const mix=(a,b,t)=>a+(b-a)*t;
const waterTolerance=.02;
const retreatTime=4.6;

export function wetlandPlotAt(x,z){
  if(x< -1275||x> -1080||z< -415||z> -245)return false;
  const r=riverField(x,z);
  return r?.branch===0&&r.t>=wetlandArea.start&&r.t<=wetlandArea.end&&r.normalized<wetlandArea.breadth;
}

// Rank topological neighbours by overbank connection to the river. A triangle
// can pass water along its diagonal, matching the diagonal used by the mesh.
export function connectedWetCells(points,cols,depthAt,inside=()=>true){
  const canFlood=new Uint8Array(points.length),wet=new Uint8Array(points.length),queue=[];
  points.forEach((p,i)=>{
    if(!inside(p)||depthAt(p)<=0)return;
    canFlood[i]=1;
    if(Math.abs(p.breadth)<.28){wet[i]=1;queue.push(i);}
  });
  for(let i=0;i<queue.length;i++){
    const k=queue[i],x=k%cols;
    const neighbours=[k-cols,k+cols];
    if(x>0)neighbours.push(k-1,k+cols-1);
    if(x<cols-1)neighbours.push(k+1,k-cols+1);
    for(const next of neighbours){
      if(canFlood[next]&&!wet[next]){wet[next]=1;queue.push(next);}
    }
  }
  return wet;
}

export function wetlandReading(point,phase,stage,connected){
  const depth=stage-point.bed;
  const flooded=!!connected&&depth>waterTolerance;
  const capillary=.22+.19*point.fine+.56*Math.exp(-Math.max(0,point.bed-stage)/(.085+.19*point.fine));
  let retained=0;
  if(phase.day!==undefined&&point.highFlooded&&point.bed>point.low){
    const fraction=(point.bed+waterTolerance-point.low)/Math.max(.001,point.high-point.low);
    const exposedAfter=-retreatTime*Math.log(Math.max(.001,Math.min(1,fraction)));
    const exposedDays=Math.max(0,phase.day-exposedAfter),drying=4.8+point.fine*12;
    retained=.97*Math.exp(-exposedDays/drying);
  }
  const moisture=flooded?1:clamp(Math.max(capillary,retained));
  const damp=!flooded&&moisture>=moistureThreshold;
  return {depth,flooded,moisture,damp,exposed:damp&&point.highFlooded&&!point.lowFlooded};
}

function selectPlant(point,row,col){
  if(point.slope>.65||Math.abs(point.breadth)>1.40||nearestWaterTrail(point.x,point.z)||
    waterPlatforms.some(r=>Math.abs(point.x-r.x)<6&&Math.abs(point.z-r.z)<5))return null;
  const roll=hash(row,col,16),patch=hash(Math.floor(row/8),Math.floor(col/4),12);
  switch(point.band){
    case 'permanent':
      return roll<.49+patch*.28?'reed':roll<.85?'sedge':null;
    case 'seasonal':
      return roll<.60+patch*.18?'sedge':roll<.89&&point.months>=5?'reed':null;
    case 'floodplain':
      if(point.months===0&&Math.abs(point.breadth)>1.18&&row%7===0&&col%9===0&&roll<.51)return 'willow';
      return roll<.28+patch*.34?'tuft':roll>.92&&point.months===0?'shrub':null;
    default:
      return null;
  }
}

export function buildWetlandModel(world,elevation){
  const {start,end,breadth,cols,rows}=wetlandArea;
  const points=[],triangles=[],areas=[],frames=world.frames;
  const channels=Array.from({length:rows+1},(_,i)=>riverSample(mix(start,end,i/rows)));
  const levelAt=(p,i)=>seasonalRiverLevel(p.t,frames[i].records.main.stage,frames[i].records.wetland.stage);
  for(let j=0;j<=rows;j++){
    const center=channels[j],a=channels[Math.max(0,j-1)],b=channels[Math.min(rows,j+1)];
    const length=Math.hypot(a.x-b.x,a.z-b.z)*.5;
    for(let i=0;i<=cols;i++){
      const offset=mix(-breadth,breadth,i/cols),x=center.x+offset*center.half*center.nx,z=center.z+offset*center.half*center.nz;
      const bed=elevation(x,z),slope=Math.hypot(elevation(x+1,z)-elevation(x-1,z),elevation(x,z+1)-elevation(x,z-1))/2;
      const fine=clamp(.77-.48*slope-.15*Math.max(0,Math.abs(offset)-1)+.11*Math.sin(x*.046+z*.051));
      const p={x,z,t:center.t,breadth:offset,bed,slope,fine,row:j,col:i};
      points.push({...p,low:levelAt(p,0),high:levelAt(p,6)});
      areas.push(length*center.half*2*breadth/cols*((i===0||i===cols)?.5:1));
      if(j<rows&&i<cols){
        const k=j*(cols+1)+i;triangles.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);
      }
    }
  }
  const masks=frames.map((_,i)=>connectedWetCells(points,cols+1,p=>levelAt(p,i)-p.bed-waterTolerance));
  const plants=[];
  points.forEach((p,index)=>{
    const months=masks.reduce((total,mask)=>total+mask[index],0);
    const lowFlooded=!!masks[0][index],highFlooded=!!masks[6][index],depth=p.low-p.bed;
    const shore=wetlandReading({...p,lowFlooded,highFlooded},wetlandPhases.at(-1),p.low,lowFlooded);
    const band=lowFlooded&&depth>.61?'channel':
      lowFlooded&&depth>.02||shore.damp&&months>=6?'permanent':
        months>=3?'seasonal':'floodplain';
    Object.assign(p,{months,band,lowFlooded,highFlooded});
    if(p.row%2||p.col%2)return;
    const kind=selectPlant(p,p.row,p.col);
    if(!kind)return;
    const scale=(kind==='willow'?1.2:kind==='reed'?1.43:1.72)*(.76+.5*hash(p.row,p.col,31));
    plants.push({kind,index,x:p.x,y:p.bed,z:p.z,scale,rotation:hash(p.row,p.col,42)*2*Math.PI});
  });
  const route=[
    ['channel',.638,.06,172],['floodplain',.653,-1.12,90],
    ['seasonal',.673,-1.055,79],['permanent',.695,-.91,86]
  ];
  const stations=route.map(([id,t,offset,distance])=>{
    const candidates=points.filter(p=>p.band===id&&(id!=='floodplain'||p.months>=1));
    const cost=p=>Math.abs(p.t-t)*3600+Math.abs(p.breadth-offset)*55;
    const point=candidates.reduce((a,b)=>cost(a)<cost(b)?a:b);
    return {id,distance,point,...wetlandBands[id]};
  });
  const {river}=world.patches,width=river.cells[0].indices[2];
  const cache=new Map();
  const eventMemos=new WeakMap(),eventMasks=new WeakMap();
  function measure(readings,baseline){
    let flooded=0,floodedBank=0,damp=0,exposed=0,retreated=0;
    readings.forEach((r,i)=>{
      if(r.flooded){flooded+=areas[i];if(!baseline(i))floodedBank+=areas[i];}
      if(r.damp)damp+=areas[i];
      if(r.exposed)exposed+=areas[i];
      if(r.retreated)retreated+=areas[i];
    });
    return {flooded,floodedBank,damp,exposed,retreated};
  }
  function frameFor(phase){
    if(cache.has(phase.id))return cache.get(phase.id);
    const origin=frames[phase.month-1].records;
    const waterStage=phase.day===undefined?origin.wetland.stage:
      mix(frames[0].records.wetland.stage,frames[6].records.wetland.stage,Math.exp(-phase.day/retreatTime));
    const localLevel=p=>seasonalRiverLevel(p.t,origin.main.stage,waterStage);
    const wet=phase.day===undefined?masks[phase.month-1]:
      connectedWetCells(points,cols+1,p=>localLevel(p)-p.bed-waterTolerance);
    const mapMask=connectedWetCells(river.bed,width,p=>localLevel(p)-p.bed);
    const waterMask=mapMask.map((m,i)=>river.bed[i].t<start||river.bed[i].t>end?1:m);
    const readings=points.map((p,i)=>wetlandReading(p,phase,localLevel(p),wet[i]));
    const state={phase,waterStage,survey:{stage:waterStage,waterMask},readings,
      ...measure(readings,i=>points[i].lowFlooded)};
    cache.set(phase.id,state);return state;
  }
  function frameForEvent(source,event){
    const cached=eventMemos.get(event);
    if(cached?.source===source)return cached.state;
    const phase={id:'storm',month:event.settings.month},waterStage=source.wetlandStage;
    const {main}=event.baseline.records;
    const levelAt=(p,stage)=>seasonalRiverLevel(p.t,main.stage,stage);
    if(!eventMasks.has(event))eventMasks.set(event,new Map());
    const saved=eventMasks.get(event);
    function maskAt(hour){
      if(!saved.has(hour)){
        const stage=event.frames[hour].wetlandStage;
        saved.set(hour,connectedWetCells(points,cols+1,p=>levelAt(p,stage)-p.bed-waterTolerance));
      }
      return saved.get(hour);
    }
    const wet=maskAt(source.hour),touched=maskAt(source.wetlandPeakHour),base=masks[phase.month-1];
    const readings=points.map((p,i)=>{
      const current=levelAt(p,waterStage);
      const reading=wetlandReading(p,phase,current,wet[i]);
      const eventTouched=!!touched[i]&&!base[i];
      if(reading.flooded||!eventTouched)return {...reading,eventTouched,newFlood:reading.flooded&&!base[i]};
      let last=source.hour;
      while(last>0&&!maskAt(last)[i])last--;
      const retained=.96*Math.exp(-(source.hour-last)/(19+36*p.fine));
      const moisture=Math.max(reading.moisture,retained),damp=moisture>=moistureThreshold;
      return {...reading,eventTouched,moisture,damp,exposed:damp,retreated:retained>=moistureThreshold};
    });
    const state={phase,waterStage,readings,...measure(readings,i=>base[i])};
    eventMemos.set(event,{source,state});return state;
  }
  return {points,triangles,plants,stations,frameFor,frameForEvent,cols,rows};
}

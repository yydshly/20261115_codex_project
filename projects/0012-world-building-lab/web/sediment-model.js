import {fanProfile} from './fan-layout.js';
import {northField,northSample} from './northern-watershed.js';
import {riverSample} from './water-system.js';
import {cellPosition,seasonalRiverLevel} from './watershed-world.js';

const clamp=value=>Math.min(1,Math.max(0,value));
const load=(coarse=0,fine=0)=>({coarse,fine});
const add=(a,b)=>load(a.coarse+b.coarse,a.fine+b.fine);
const subtract=(a,b)=>load(a.coarse-b.coarse,a.fine-b.fine);
export const sedimentVolume=a=>a.coarse+a.fine;

export const sedimentStops=[
  {id:'head',name:'山口上游 · 坡面冲刷',view:[-873,-1080,60,390],
    detail:'陡坡上的雨水和融雪顺地形集中，带走松散地表。橙线追踪流向山口的坡面水路。'},
  {id:'fan',name:'北部冲积扇 · 砂砾堆积',view:[-940,-953,31,390],
    detail:'溪流出山口后水路变宽、坡度减小，砂砾先落在扇顶和分汊之间，较细的颗粒继续往下游走。'},
  {id:'north',name:'北部支谷 · 河道搬运',view:[-958,-626,11,600],
    detail:'扇尾与另一条支谷汇合，载沙沿已建溪谷继续下行。点划线的密度对应本月搬运量，颜色区分粗细颗粒。'},
  {id:'flood',name:'苇泽湿地 · 河漫滩',view:[-1187,-324,2,460],
    detail:'北部支流汇入中央主河后，高水漫上低岸。流速下降后，细泥留在浅水和草滩，退水后露出。'},
  {id:'mouth',name:'中央海湾 · 河口沙洲',view:[-1478,-269,0,540],
    detail:'分汊进入海湾，水流扩散，部分砂粒在两条水路之间沉积。更细的颗粒有一部分继续输往湾外。'}
];

function routeSlopes(){
  function slope(sample,start,end){
    const a=sample(start),b=sample(end);
    return (a.level-b.level)/Math.hypot(a.x-b.x,a.z-b.z);
  }
  return {
    head:slope(t=>northSample('fan-head',t),0,1),
    fan:(fanProfile(-1030).level-fanProfile(-850).level)/180,
    north:slope(t=>northSample('fan-out',t),0,1),
    main:slope(riverSample,.4,.62),
    flood:slope(riverSample,.62,.735),
    mouth:slope(riverSample,.735,.96)
  };
}

function terrainRouting({climate,graph,bodies}){
  const {height,grid}=climate,keys=new Set(['ice','upper','lake','main','wetland','north']);
  const order=Array.from(height.keys()).filter(k=>keys.has(bodies[graph.owner[k]]?.id))
    .sort((a,b)=>height[b]-height[a]);
  const outlets=new Map(),slope=new Float64Array(height.length);
  for(const k of order){
    const to=graph.next[k];
    if(to>=0){
      const a=cellPosition(grid,k),b=cellPosition(grid,to);
      slope[k]=(height[k]-height[to])/Math.hypot(a.x-b.x,a.z-b.z);
      continue;
    }
    let id=bodies[graph.owner[k]].id;
    if(id==='north'){
      const {x,z}=cellPosition(grid,k),reach=northField(x,z);
      const onFan=z>=-1040&&z<-850&&Math.abs(x+940)<fanProfile(z).width+12;
      if(onFan||reach?.reach==='fan-head')id='head';
    }
    outlets.set(k,id);
  }
  const toFanHead=new Uint8Array(height.length);
  for(let i=order.length-1;i>=0;i--){
    const k=order[i],to=graph.next[k];
    toFanHead[k]=to>=0?toFanHead[to]:Number(outlets.get(k)==='head');
  }
  return {order,outlets,slope,toFanHead,next:graph.next};
}

function routeHillslopes(frame,{order,outlets,slope,next,toFanHead},size){
  const runoff=new Float64Array(size),coarse=new Float64Array(size),fine=new Float64Array(size);
  const incision=new Float32Array(size);
  const targets=Object.fromEntries(['head','north','ice','upper','lake','main','wetland'].map(id=>
    [id,{water:0,sediment:load()}]));
  let eroded=load(),stored=load(),headErosion=0;
  for(const k of order){
    const water=frame.cells.surface[k], drop=slope[k], gradient=clamp(drop/.38);
    const material=water*gradient*(.001+.011*gradient)*clamp(water/19);
    const loose=load(material*(.23+.32*gradient),material*(.77-.32*gradient));
    eroded=add(eroded,loose);incision[k]=material;
    if(toFanHead[k])headErosion+=material;
    runoff[k]+=water;coarse[k]+=loose.coarse;fine[k]+=loose.fine;
    const id=outlets.get(k);
    if(id){
      targets[id].water+=runoff[k];
      targets[id].sediment=add(targets[id].sediment,load(coarse[k],fine[k]));
      continue;
    }
    const to=next[k],mobility=clamp(Math.sqrt(runoff[k]/40)*(.26+gradient*1.18));
    const outgoing=load(coarse[k]*(.5+.5*mobility),fine[k]*(.82+.18*mobility));
    stored=add(stored,subtract(load(coarse[k],fine[k]),outgoing));
    runoff[to]+=runoff[k];coarse[to]+=outgoing.coarse;fine[to]+=outgoing.fine;
  }
  return {targets,eroded,stored,incision,headErosion};
}

function overbankArea(world,frame){
  const {main,wetland}=frame.records;
  const {bed,cells}=world.patches.river;
  let area=0;
  for(const cell of cells){
    for(const index of cell.indices){
      const p=bed[index];
      if(p.t>.641&&p.t<.708&&Math.abs(p.breadth)>1
        &&p.bed<seasonalRiverLevel(p.t,main.stage,wetland.stage))area+=cell.area/4;
    }
  }
  return area;
}

// Illustrative routing in scene cubic metres. Coarser grains require greater carrying capacity.
function settle(input,water,slope,{width,trapCoarse,trapFine}){
  const streamPower=water*Math.max(slope,.003)/width;
  const coarse=Math.min(input.coarse*(1-trapCoarse),.49*streamPower);
  const fine=Math.min(input.fine*(1-trapFine),1.65*streamPower);
  const out=load(coarse,fine);
  return {water,slope,input,deposited:subtract(input,out),out};
}

export function buildSedimentYear(world){
  const routing=terrainRouting(world),slopes=routeSlopes(),size=world.climate.height.length;
  const floodAreas=world.frames.map(frame=>overbankArea(world,frame));
  const driest=Math.min(...floodAreas),wettest=Math.max(...floodAreas);
  const eachMonth=world.frames.map((frame,i)=>{
    const {records,month}=frame;
    const {targets:t,eroded,stored,incision,headErosion}=routeHillslopes(frame,routing,size);
    const head=settle(t.head.sediment,t.head.water,slopes.head,{width:8,trapCoarse:.04,trapFine:.02});
    head.erosion=headErosion;
    const fan=settle(head.out,head.water,slopes.fan,{width:58,trapCoarse:.48,trapFine:.13});
    const north=settle(add(fan.out,t.north.sediment),records.north.outflow,slopes.north,
      {width:12,trapCoarse:.08,trapFine:.035});
    const lake=settle(t.lake.sediment,records.lake.outflow,.008,{width:38,trapCoarse:.91,trapFine:.62});
    const mainInput=[lake.out,t.ice.sediment,t.upper.sediment,t.main.sediment].reduce(add);
    const main=settle(mainInput,records.main.outflow,slopes.main,{width:30,trapCoarse:.09,trapFine:.05});
    const flooded=clamp((floodAreas[i]-driest)/Math.max(1,wettest-driest));
    const floodInput=[north.out,main.out,t.wetland.sediment].reduce(add);
    const flood=settle(floodInput,records.wetland.outflow,slopes.flood,
      {width:33,trapCoarse:.14+.3*flooded,trapFine:.08+.43*flooded});
    const excessFine=flood.deposited.fine;
    flood.overbank=load(flood.deposited.coarse*flooded*.23,excessFine*flooded*.86);
    flood.overbankArea=floodAreas[i];
    const mouth=settle(flood.out,records.wetland.outflow,slopes.mouth,
      {width:43,trapCoarse:.68,trapFine:.12});
    const reaches={head,fan,north,lake,main,flood,mouth};
    const deposited=Object.values(reaches).map(reach=>reach.deposited).reduce(add,stored);
    return {month,reaches,incision,eroded,deposited,exported:mouth.out,
      residual:subtract(eroded,add(deposited,mouth.out)),water:frame};
  });
  let yearDeposits={fan:load(),flood:load(),mouth:load()};
  return {toFanHead:routing.toFanHead,frames:eachMonth.map(frame=>{
    yearDeposits={
      fan:add(yearDeposits.fan,frame.reaches.fan.deposited),
      flood:add(yearDeposits.flood,frame.reaches.flood.overbank),
      mouth:add(yearDeposits.mouth,frame.reaches.mouth.deposited)
    };
    return {...frame,yearDeposits};
  })};
}

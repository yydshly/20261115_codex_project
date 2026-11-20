import {parentAt} from './groundwater-layout.js';
import {fanProfile} from './fan-layout.js';
import {northSample} from './northern-watershed.js';
import {riverSample} from './water-system.js';
import {groundwaterAfterDays} from './watershed-balance.js';
import {cellPosition,seasonalRiverLevel} from './watershed-world.js';

export const seasons={dry:{name:'枯水期',month:1},wet:{name:'丰水期',month:7}};
export const recessionDays=14;
export const exchangeLayers=[
  {id:'divide',name:'地表分水岭',color:'#ddadff'},
  {id:'recharge',name:'地下补给区',color:'#ffd078'},
  {id:'surface',name:'坡面径流',color:'#7acaff'},
  {id:'ground',name:'地下路径投影',color:'#8ff1bf'},
  {id:'merged',name:'汇合后的河水',color:'#8fe8ec'}
];

export const exchangeStops=[
  {id:'divide',name:'北支地表分水岭',distance:510,
    detail:'紫线沿北支集水网格的边缘。山坡两侧地表水流向不同的出口。含水层的补给范围由岩层和水头控制，图中的金色补给区只圈出选定的冲积扇样区。'},
  {id:'recharge',name:'北部冲积扇补给区',distance:440,
    detail:'同一片地面接到雨水。超过入渗能力的水沿坡面进扇面水道；渗过土层的水进入浅层砂砾带。地下储水的变化比坡面径流慢。'},
  {id:'spring',name:'扇尾泉口 · 两路汇合',distance:165,
    detail:'地下水头高于沟谷水面时，水在岸坡出露，从短泉溪流入东支谷。来自扇面的地表水也流到这个河段，两条路径在此汇合。'},
  {id:'join',name:'北支汇入中央主河',distance:360,
    detail:'泉水和坡面来水沿东支谷下泄，接入北支干谷，再汇进中央主河。上游主河还有融雪、湖泊出流等来水。'},
  {id:'wetland',name:'苇泽湿地 · 低处蓄水',distance:420,
    detail:'河流减速，水铺到低滩。丰水期淹过更多滩地，枯水期露出高一些的滩面。雨停时，仍有缓慢出露的地下水沿河供给湿地。'}
];

export const exchangeLinks={
  water:{overview:'recharge',source:'recharge',valley:'spring',join:'join',wetland:'wetland',estuary:'wetland'},
  warmth:{overview:'recharge',slope:'divide',plain:'wetland',foothill:'spring'},
  inland:{overview:'divide',windward:'recharge',ridge:'divide',lee:'spring',oasis:'spring'}
};

const byRoute=[['fan-out',0,.41,38],['fan-out',.41,1,56],['trunk',0,1,58]];
const nf=(i,t)=>northSample(byRoute[i][0],byRoute[i][1]+(byRoute[i][2]-byRoute[i][1])*t);
const samples=(count,fn)=>Array.from({length:count+1},(_,i)=>fn(i/count));
const mix=(a,b,t)=>a+(b-a)*t;
const volume=(cells,field)=>cells.reduce((sum,k)=>sum+field[k],0);
const surfacePoint=p=>({x:p.x,z:p.z,level:p.groundLevel??p.level});

function reachesOutlet(index,next){
  while(next[index]>=0)index=next[index];
  return index;
}

export function buildWaterExchange(world,elevation){
  const {climate:{grid,height},graph,bodies,frames}=world;
  const north=bodies.findIndex(b=>b.id==='north'),cells=[],divides=[],rills=[];
  const {cols,rows,step}=grid,half=step/2;
  for(let k=0;k<height.length;k++){
    const {x,z}=cellPosition(grid,k);
    if(x< -1510||x> -680||z< -1480||z> -335||graph.ocean[k])continue;
    if(graph.owner[k]===north&&parentAt(x,z)==='alluvium'&&!graph.waterCells[k])cells.push(k);
    const edge=(other,a,b)=>{
      if(graph.ocean[other]||(graph.owner[k]===north)===(graph.owner[other]===north))return;
      divides.push([a,b]);
    };
    if(k%cols<cols-1)edge(k+1,{x:x+half,z:z-half},{x:x+half,z:z+half});
    if(k<cols*(rows-1))edge(k+cols,{x:x-half,z:z+half},{x:x+half,z:z+half});
    if(graph.owner[k]!==north||graph.next[k]<0||z< -1140||z> -840)continue;
    const outlet=cellPosition(grid,reachesOutlet(k,graph.next));
    if(outlet.x< -1000||outlet.x> -875||outlet.z< -1040||outlet.z> -835)continue;
    const points=[];
    let i=k;
    while(i>=0){points.push(i);i=graph.next[i];}
    rills.push({points,rank:frames[6].cells.surface[k]*Math.min(5,points.length)});
  }
  const totalArea=cells.length*step*step;
  const center=cells.reduce((p,k)=>{
    const point=cellPosition(grid,k);
    return {x:p.x+point.x/cells.length,z:p.z+point.z/cells.length};
  },{x:0,z:0});
  const ridge=divides.map(([a,b])=>({x:(a.x+b.x)/2,z:(a.z+b.z)/2}))
    .reduce((a,b)=>Math.hypot(a.x+1055,a.z+1060)<Math.hypot(b.x+1055,b.z+1060)?a:b);
  const head=nf(0,1),at=d=>{
    const x=head.x+head.nx*d,z=head.z+head.nz*d;
    return {x,z,bed:elevation(x,z),d};
  };
  const outlet=at(13),spring={...outlet,y:outlet.bed+.18};
  const creek=samples(18,t=>{
    const p=at(mix(13,0,t));return {...p,y:Math.max(p.bed,head.level)+.18};
  });
  const profile=samples(80,t=>at(mix(49,-13,t)));
  const fan=samples(55,t=>{const p=fanProfile(mix(-1026,-849,t));return {x:p.channels[0],z:p.z,level:p.level};});
  const runoff=[...fan,...samples(byRoute[0][3],t=>surfacePoint(nf(0,t)))];
  const mixed=[...samples(byRoute[1][3],t=>surfacePoint(nf(1,t))),...samples(byRoute[2][3],t=>surfacePoint(nf(2,t)))];
  const low=[],high=[];
  for(const t of samples(54,t=>mix(.62,.724,t))){
    const p=riverSample(t);
    for(const [state,month] of [[low,0],[high,6]]){
      const {main,wetland}=frames[month].records;
      state.push({...p,level:seasonalRiverLevel(t,main.stage,wetland.stage)});
    }
  }
  const sites=[ridge,center,spring,riverSample(.62),riverSample(.675)];
  return {
    grid,cells,divides,totalArea,center,spring,creek,profile,head,
    rills:rills.sort((a,b)=>b.rank-a.rank).slice(0,9).map(r=>r.points),
    runway:runoff,routes:{low:[...mixed,...low],high:[...mixed,...high]},
    stations:exchangeStops.map((s,i)=>({...s,...sites[i]})),
    frames:frames.map((frame,i)=>{
      const ground=volume(cells,frame.cells.ground),start=volume(cells,frames[(i+11)%12].cells.ground);
      const baseflow=volume(cells,frame.cells.baseflow);
      return {month:frame.month,surface:volume(cells,frame.cells.surface),baseflow,ground,start,
        recharge:Math.max(0,ground+baseflow-start),wetland:frame.records.wetland,
        pastDrySpell:day=>cells.reduce((total,k)=>total+groundwaterAfterDays(frame.cells.ground[k],world.hydraulics[k].release,day),0)};
    })
  };
}

export function exchangeState(model,season,noRain=false){
  const {month}=seasons[season],frame=model.frames[month-1];
  if(!noRain)return {...frame,unit:'m³/月',river:model.head.level};
  const before=frame.pastDrySpell(recessionDays-1);
  const ground=frame.pastDrySpell(recessionDays);
  return {...frame,ground,recharge:0,surface:0,baseflow:before-ground,unit:'m³/日',river:model.head.level,
    groundReleased:frame.ground-ground};
}

export function exchangeWaterTable(model,state,section){
  const {spring,profile}=model;
  const ratio=Math.min(1,state.ground/Math.max(...model.frames.map(f=>f.ground)));
  if(section.d<=0)return state.river;
  if(section.d<=spring.d)return mix(state.river,spring.y,section.d/spring.d);
  const u=(section.d-spring.d)/(profile[0].d-spring.d);
  return Math.min(section.bed-.10,mix(spring.y,profile[0].bed-6+2.6*ratio,u));
}

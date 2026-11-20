import {channelSample} from './inland-geography.js';
import {PRODUCTION_SITES,FARM} from './production-layout.js';
import {SETTLEMENT_SITES,TOWN_BRIDGE} from './settlement-layout.js';
import {FREIGHT_DOCK,BRIDGE_NORTH,BRIDGE_SOUTH,TRANSPORT_SITES} from './transport-layout.js';
import {riverBridge,riverBridgePoint,riverSample} from './water-system.js';
import {benchmarkLength,benchmarkPoint,benchmarkStops,benchmarkNear} from './benchmark-trail.js';

const pt=(x,z)=>({x,z});
const outletBank=t=>{
  const p=channelSample(1,t);
  return pt(p.x+p.nx*23,p.z+p.nz*23);
};
const farm=PRODUCTION_SITES.find(site=>site.id==='life-farm');
const market=PRODUCTION_SITES.find(site=>site.id==='life-market');
const road=TRANSPORT_SITES.find(site=>site.id==='trans-road');
const valley=benchmarkStops[6],wetland=benchmarkStops[7],mouth=benchmarkStops[8];
const reedWater=riverSample(.65);
export const lifeRoadCrossing=pt(-485.5,101.6);
const dockCorner=pt(-55,377);

// The last stretch shares the surveyed path along the main river.
const stops=[
  {id:'farm',name:'河谷农田',target:pt(FARM.x,FARM.z),targetHeight:.4,points:[farm],
    reason:'田地在村口坡脚分成几条窄地块。田边高、低处的落差决定排水方向，沿上方的小路可把收成运进村。'},
  {id:'village',name:'榆湾村口',target:pt(-462,438),targetHeight:2.8,
    points:[pt(-544,417),pt(-510,410),SETTLEMENT_SITES[0]],
    reason:'村街沿较平缓的地面展开，把坡上田地、粮仓与住屋接在一起。看向民居和田边，可以看到同一条路怎样衔接坡脚与村街。'},
  {id:'market',name:'村镇集市',target:pt(-355,420),targetHeight:1.5,
    points:[pt(-460,414),pt(-410,405),pt(-346,405),market],
    reason:'摊位和水井放在街道交会处。村里有公共取水点，田地与码头的货物则在这里通过干路集散。'},
  {id:'road',name:'村口运输道',target:pt(-150,415),targetHeight:.25,
    points:[pt(-346,405),road],
    reason:'顺较平的地面出村，运输道到桥头才抬升。截面上可以同时看到村街、挡水的岸坡和低处河槽。'},
  {id:'bridge',name:'河湾木桥',target:BRIDGE_NORTH,targetHeight:1.2,
    points:[pt(-150,415),BRIDGE_SOUTH,TOWN_BRIDGE],
    reason:'道路在较窄的河段集中跨越。两端有岸坡和引道，中间保留完整的出湖河床和通水空间。'},
  {id:'dock',name:'货运码头',target:FREIGHT_DOCK.tip,targetHeight:.8,
    points:[BRIDGE_NORTH,dockCorner,FREIGHT_DOCK.land,FREIGHT_DOCK.deck],
    reason:'码头伸到靠水的装卸位置，卸下的货物沿接岸引道和木桥进村。岸下可以受淹，甲板抬高以便转运。'},
  {id:'join',name:'两河汇口',target:riverBridge,targetHeight:-2.25,
    points:[FREIGHT_DOCK.land,dockCorner,BRIDGE_NORTH,
      ...[.365,.4,.435,.47,.5,.535,.57,.6,.635,.67].map(outletBank),
      pt(-484,102),pt(-499,98),
      ...[.70,.735,.765,.80,.835,.87,.90,.93].map(outletBank),
      riverBridgePoint(-riverBridge.length/2-riverBridge.rampLength),riverBridge,benchmarkPoint(valley.at)],
    reason:'顺出湖河干岸下行，在汇口跨过中央主河，接上原有下游岸路。河槽汇合，岸路通过桥梁接续。'},
  {id:'wetland',name:'苇泽洪泛滩',benchmark:wetland.at+111,
    target:pt(reedWater.x+reedWater.nx*reedWater.half,reedWater.z+reedWater.nz*reedWater.half),targetHeight:.15,
    reason:'进入下游，河坡变缓，水能铺到低滩。岸路走较高的一侧，低滩保留芦苇和洪泛空间。切换洪泛对照可看到湿地新增受淹的部分。'},
  {id:'mouth',name:'分汊河口',benchmark:mouth.at,target:riverSample(.832),targetHeight:.2,
    reason:'低岸开始受潮汐约束，水路向海湾分开。原来的岸路绕开潮沟。河湾货运码头位于上游出湖河，这里可以观察更低的河海岸线。'},
  {id:'bay',name:'中央海湾',benchmark:benchmarkLength,target:riverSample(.91),targetHeight:.7,
    reason:'沿稳定高岸和短栈道抵达海湾。回看整条线，生产地和村街留在陆上，桥集中跨河，码头靠近水道，湿地向河口保留空间。'}
];

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const segments=[],points=[],stations=[];
let length=0;
for(const {points:section,benchmark,...stop} of stops){
  for(const point of section??[]){
    const previous=points.at(-1);
    if(previous){
      const dx=point.x-previous.x,dz=point.z-previous.z,d=Math.hypot(dx,dz);
      segments.push({a:previous,dx,dz,d,at:length});
      length+=d;
    }
    points.push(point);
  }
  const at=benchmark===undefined?length:length+benchmark-valley.at;
  stations.push({...stop,at});
}
export const lifeStops=stations;
export const lifeJoinAt=length;
export const lifeLength=stations.at(-1).at;
const dockApproach=[FREIGHT_DOCK.deck,FREIGHT_DOCK.land,dockCorner,BRIDGE_NORTH];
const returnLength=dockApproach.slice(1).reduce((total,p,i)=>total+Math.hypot(p.x-dockApproach[i].x,p.z-dockApproach[i].z),0);
export const lifeNewWalks=[
  [lifeStops[0].at,lifeStops[1].at],
  [lifeStops[5].at+returnLength,lifeJoinAt]
];
const vergeCells=new Map(),cellSize=24;
for(const s of segments){
  const x=s.a.x,z=s.a.z;
  for(let i=Math.floor((Math.min(x,x+s.dx)-8)/cellSize);i<=Math.floor((Math.max(x,x+s.dx)+8)/cellSize);i++){
    for(let j=Math.floor((Math.min(z,z+s.dz)-8)/cellSize);j<=Math.floor((Math.max(z,z+s.dz)+8)/cellSize);j++){
      const key=i+','+j;
      if(!vergeCells.has(key))vergeCells.set(key,[]);
      vergeCells.get(key).push(s);
    }
  }
}

export function lifePathVerge(x,z,radius){
  const cell=vergeCells.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize));
  return cell?.some(({a,dx,dz,d})=>{
    const u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(d*d),0,1);
    return (x-a.x-dx*u)**2+(z-a.z-dz*u)**2<radius*radius;
  })??false;
}

export function lifePoint(metres){
  const at=clamp(metres,0,lifeLength);
  if(at>=lifeJoinAt)return {...benchmarkPoint(valley.at+at-lifeJoinAt),at};
  const s=segments.find(segment=>at<=segment.at+segment.d);
  const u=(at-s.at)/s.d;
  return {x:s.a.x+s.dx*u,z:s.a.z+s.dz*u,at};
}

export function lifeNear(x,z,radius,current){
  let at=null,best=radius*radius;
  for(const s of segments){
    if(s.at>current+28||s.at+s.d<current-28)continue;
    const u=clamp(((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/(s.d*s.d),0,1);
    const d=(x-s.a.x-s.dx*u)**2+(z-s.a.z-s.dz*u)**2;
    if(d<best){best=d;at=s.at+s.d*u;}
  }
  if(current>=lifeJoinAt-28){
    const b=benchmarkNear(x,z,Math.sqrt(best));
    if(b!==null&&b>=valley.at&&Math.abs(lifeJoinAt+b-valley.at-current)<=28)at=lifeJoinAt+b-valley.at;
  }
  return at;
}

export function lifeStation(at){
  return lifeStops.findLastIndex(stop=>stop.at<=at+.05);
}

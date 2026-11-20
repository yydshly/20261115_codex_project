import {riverSample,branchSample,riverField,nearestWaterTrail,waterPlatforms} from './water-system.js';
import {seasonalRiverLevel} from './watershed-world.js';
import {hash} from './vegetation-rules.js';
import {connectedWetCells,wetlandArea} from './wetland-layout.js';
import {stormTideAt,tidePeriod} from './basin-storm.js';

export const tides={
  flood:{name:'涨潮',height:.16,saltReach:1.08,direction:-1},
  high:{name:'高潮',height:.66,saltReach:1.28,direction:0},
  ebb:{name:'退潮',height:.16,saltReach:1.16,direction:1},
  low:{name:'低潮',height:-.55,saltReach:.77,direction:0}
};
export const estuarySeasons={wet:{name:'丰水期',month:7},dry:{name:'枯水期',month:1}};
export const estuaryBounds={minX:-1878,maxX:-1268,minZ:-490,maxZ:70,step:5};
export const seaSalinity=32,frontSalinity=5;
export const saltColors=['#6ecefa','#70d3ad','#dfb778','#d39bea'];
export const estuaryStops=[
  {id:'fresh',name:'淡水湿地',t:.675,distance:280,
    text:'苇泽是淡水端。上游来量越大，越能把咸淡交界推向海湾。这里浅水中的芦苇与莎草适应的是较低盐度和较长积水。'},
  {id:'fork',name:'分汊河口',t:.792,distance:310,
    text:'淡水沿主槽下泄，潮水经支汊回推。涨、退潮可有相同的海湾水位，流向和盐度前缘仍可能不同。'},
  {id:'flat',name:'潮间带',t:.844,distance:180,
    text:'潮水淹过低泥滩，退潮又露出。最低处留有裸滩，稍高的盐湿带长出成片耐盐草，向低盐侧接上芦苇与莎草。'},
  {id:'bay',name:'中央海湾',t:.966,distance:350,
    text:'外湾是海水边界。海湾水位升降改变入海口水深和露滩面积；枯水时较少淡水使盐度前缘更容易向上游移动。'}
];

export const estuaryLinks={
  water:{overview:'fork',wetland:'fresh',estuary:'fork',bay:'bay'},
  warmth:{overview:'fresh',plain:'fresh','warm-shore':'flat'},
  inland:{overview:'bay',ocean:'bay',coast:'flat',windward:'fork'}
};

const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const u=clamp(value);return u*u*(3-2*u);};
const lerp=(a,b,t)=>a+(b-a)*t;
const sweep=(n,f)=>Array.from({length:n+1},(_,i)=>f(i/n));
const startT=.67,endT=.975;
const thalweg=sweep(250,(u)=>riverSample(lerp(startT,endT,u)));
let length=0;
for(const [i,p] of thalweg.entries()){
  if(i)length+=Math.hypot(p.x-thalweg[i-1].x,p.z-thalweg[i-1].z);
  p.chainage=length;
}
const distanceFromBay=t=>{
  const i=clamp((t-startT)/(endT-startT))*(thalweg.length-1);
  const k=Math.min(thalweg.length-2,Math.floor(i));
  return length-lerp(thalweg[k].chainage,thalweg[k+1].chainage,i-k);
};

function adjacent(k,cols){
  const x=k%cols;
  const ids=[k-cols,k+cols];
  if(x>0)ids.push(k-1,k+cols-1);
  if(x<cols-1)ids.push(k+1,k-cols+1);
  return ids;
}

export function connectedEstuary(points,cols,levels,seed){
  const wet=Uint8Array.from(points,(p,i)=>Number(p.bed<levels[i])),mask=new Uint8Array(points.length),queue=[];
  points.forEach((p,i)=>{if(wet[i]&&seed(p)){mask[i]=1;queue.push(i);}});
  for(let n=0;n<queue.length;n++){
    for(const k of adjacent(queue[n],cols)){
      if(wet[k]&&!mask[k]){mask[k]=1;queue.push(k);}
    }
  }
  return mask;
}

function tideWeight(t,flow){
  const edge=.687+.037*flow;
  return smooth((t-edge)/(.938-edge));
}

function nearbyField(x,z){
  const r=riverField(x,z);
  if(r)return {...r,riverMix:1-smooth((r.normalized-1.04)/.92)};
  let a=thalweg[0],b=thalweg.at(-1);
  let lo=0,hi=thalweg.length-1;
  while(hi-lo>1){
    const mid=(hi+lo)>>1;
    if(thalweg[mid].x>x)lo=mid;else hi=mid;
  }
  a=thalweg[lo];b=thalweg[hi];
  const t=lerp(a.t,b.t,clamp((x-a.x)/(b.x-a.x)));
  return {t,branch:0,riverMix:0,normalized:3};
}

function surfaceAt(p,records,tide,flow,patch=false,freshRise=0){
  const channelRise=freshRise*smooth((p.t-.703)/.069)*smooth((.945-p.t)/.114);
  const mean=seasonalRiverLevel(p.t,records.main.stage,records.wetland.stage)+channelRise;
  const amp=tide.height*tideWeight(p.t,flow);
  if(!patch)return mean+amp;
  const b=estuaryBounds;
  const margin=Math.min(p.x-b.minX,p.z-b.minZ,b.maxZ-p.z);
  const blend=smooth(margin/72);
  const inlandEdge=1-smooth((b.maxX-p.x)/55);
  const coastalTide=lerp(blend,1,p.riverMix*.96);
  const gradual=lerp(coastalTide,p.riverMix,inlandEdge);
  return mean*p.riverMix+amp*gradual;
}

function saltAt(p,tide,relativeFlow){
  const penetration=108*tide.saltReach/relativeFlow**.54*(p.branch?1.13:1);
  const flushing=smooth((p.t-.676)/.072);
  return seaSalinity*Math.exp(-distanceFromBay(p.t)/penetration)*flushing;
}

const placementKind=(p,meanSalt,exposure,i)=>{
  if(!exposure||p.bed>2.6||p.normalized>1.95&&p.t<.75||
    nearestWaterTrail(p.x,p.z)||waterPlatforms.some(r=>Math.abs(p.x-r.x)<6&&Math.abs(p.z-r.z)<5))return null;
  const roll=hash(p.row,p.col,i),patch=hash(Math.floor(p.row/3),Math.floor(p.col/4),55);
  if(meanSalt<4.2)return roll<.43+patch*.30?'reed':roll<.76?'sedge':null;
  if(meanSalt<10.5)return roll<.42?'rush':roll<.63?'reed':roll<.74?'sedge':null;
  return roll<.52+patch*.14?'rush':null;
};

export function buildEstuaryModel(world,elevation){
  const b=estuaryBounds,cols=Math.ceil((b.maxX-b.minX)/b.step)+1,rows=Math.ceil((b.maxZ-b.minZ)/b.step)+1;
  const dx=(b.maxX-b.minX)/(cols-1),dz=(b.maxZ-b.minZ)/(rows-1);
  const bed=[],cells=[];
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const x=b.minX+i*dx,z=b.minZ+j*dz;
    const field=nearbyField(x,z);
    bed.push({...field,x,z,bed:elevation(x,z),breadth:field.normalized,row:j,col:i,
      seaEdge:i===0||j===0||j===rows-1,riverEdge:i===cols-1&&field.riverMix>.84&&field.normalized<.62});
    if(i<cols-1&&j<rows-1){
      const k=j*cols+i;cells.push({indices:[k,k+1,k+cols,k+cols+1],area:dx*dz});
    }
  }
  const records={wet:world.frames[6].records,dry:world.frames[0].records};
  const inflow=Object.fromEntries(Object.entries(records).map(([id,r])=>[id,r.wetland.outflow]));
  const cache=new Map(),eventCache=new Map(),histories=new WeakMap();
  const seeds=p=>p.seaEdge||p.riverEdge;
  const areas=new Float32Array(bed.length);
  for(const cell of cells)for(const k of cell.indices)areas[k]+=cell.area/4;
  function hydraulics(season,tideId,source){
    const tide=source?.tide??tides[tideId],base=records[season];
    const record=source?{...base,wetland:{...base.wetland,stage:source.wetlandStage}}:base;
    const adjusted=inflow[season]+(source?.salinityFlow??0)*720;
    const flow=clamp((adjusted-inflow.dry)/Math.max(1,inflow.wet-inflow.dry));
    const ratio=adjusted/Math.max(1,inflow.dry);
    const mouth=source?.mouth??0,freshRise=.56*mouth/(mouth+65);
    const waterAt=p=>surfaceAt(p,record,tide,flow,true,freshRise);
    return {tide,record,flow,ratio,freshRise,waterAt};
  }
  function frame(season,tideId,source=null,bedChange=null){
    const key=season+'-'+tideId;
    const cached=bedChange?null:source?eventCache.get(source)?.get(key):cache.get(key);
    if(cached)return cached;
    const {tide,record,flow,ratio,freshRise,waterAt}=hydraulics(season,tideId,source);
    const stageAt=p=>surfaceAt(p,record,tide,flow,false,freshRise);
    const salinityAt=p=>saltAt(p,tide,ratio);
    const levels=bed.map(waterAt);
    const surface=bedChange?bed.map((p,i)=>({...p,bed:p.bed+bedChange[i]})):bed;
    const wet=connectedEstuary(surface,cols,levels,seeds);
    const saltLine=thalweg.find(p=>salinityAt(p)>=frontSalinity)??thalweg.at(-1);
    const tideLine=thalweg.find(p=>Math.abs(tide.height)*tideWeight(p.t,flow)>=.10);
    const survey={stage:record.wetland.stage,downstreamX:b.maxX,levelAt:stageAt};
    if(source){
      const river=world.patches.river;
      const mask=connectedWetCells(river.bed,river.cells[0].indices[2],p=>stageAt(p)-p.bed);
      survey.waterMask=mask.map((m,i)=>river.bed[i].t<wetlandArea.start||river.bed[i].t>wetlandArea.end?1:m);
    }
    const current={
      season,tideId,tide,records:record,levels,wet,salinityAt,bed:surface,bedChange,
      saltLine:{...saltLine,upstream:distanceFromBay(saltLine.t)},
      tideLine:tideLine?{...tideLine,upstream:distanceFromBay(tideLine.t)}:null,
      survey,profile:thalweg.map(p=>({...p,salt:salinityAt(p),fromFresh:p.chainage})),
      inflow:inflow[season],freshRate:inflow[season]/720+(source?.mouth??0)
    };
    if(bedChange)return current;
    if(source){
      if(!eventCache.has(source))eventCache.set(source,new Map());
      eventCache.get(source).set(key,current);
      if(eventCache.size>8)eventCache.delete(eventCache.keys().next().value);
    }else cache.set(key,current);
    return current;
  }
  function deltaAt(changes,x,z){
    const u=(x-b.minX)/dx,v=(z-b.minZ)/dz;
    if(u<0||v<0||u>cols-1||v>rows-1)return 0;
    const i=Math.min(cols-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v));
    const a=u-i,c=v-j,k=j*cols+i;
    return a+c<=1?
      (1-a-c)*changes[k]+a*changes[k+1]+c*changes[k+cols]:
      (a+c-1)*changes[k+cols+1]+(1-c)*changes[k+1]+(1-a)*changes[k+cols];
  }
  const referenceHigh=frame('dry','high'),referenceLow=frame('dry','low');
  let stationFlat;
  for(const [i,p] of bed.entries()){
    if(!referenceHigh.wet[i]||referenceLow.wet[i]||p.bed<-.15||p.t<.815||p.t>.89)continue;
    let adjacentMud=0;
    for(let j=-3;j<=3;j++)for(let k=-3;k<=3;k++){
      const nearby=i+j*cols+k;
      if(referenceHigh.wet[nearby]&&!referenceLow.wet[nearby])adjacentMud++;
    }
    if(adjacentMud<28)continue;
    const cost=Math.hypot(p.x+1478,p.z+190);
    if(!stationFlat||cost<stationFlat.cost)stationFlat={...p,cost};
  }
  const stationData=estuaryStops.map(s=>{
    const p=s.id==='flat'?stationFlat:riverSample(s.t);
    const field=nearbyField(p.x,p.z);
    return {...s,...p,...field,x:p.x,z:p.z,bed:elevation(p.x,p.z)};
  });
  const plants=[];
  const vegetationFrames=[frame('wet','low'),frame('wet','high'),referenceLow,referenceHigh];
  for(const [i,p] of bed.entries()){
    if(p.t<.716||p.t>.89)continue;
    const flooded=vegetationFrames.reduce((n,f)=>n+f.wet[i],0);
    const rootZone=flooded<4&&(flooded>0||p.bed<=referenceHigh.levels[i]+.54);
    const salinity=vegetationFrames.reduce((n,f)=>n+f.salinityAt(p),0)/4;
    const kind=placementKind(p,salinity,rootZone,46);
    if(kind)plants.push({kind,salinity,x:p.x,z:p.z,y:p.bed,rotation:hash(p.row,p.col,7)*Math.PI*2,
      scale:2.2*(.82+.48*hash(p.row,p.col,8)),index:i});
  }
  // Continue the existing fresh-bank belt before the mouth.
  for(let j=0;j<33;j++){
    const p=riverSample(lerp(.660,.718,j/32));
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const offset=side*p.half*lerp(.88,1.09,(i+hash(j,i,21))/4);
      const x=p.x+p.nx*offset,z=p.z+p.nz*offset,ground=elevation(x,z);
      const field=nearbyField(x,z),salinity=referenceHigh.salinityAt(field);
      if(x<=b.maxX||ground<p.level-.78||ground>p.level+.38||salinity>=5||
        nearestWaterTrail(x,z)||waterPlatforms.some(r=>Math.abs(x-r.x)<6&&Math.abs(z-r.z)<5))continue;
      const kind=hash(j,i,side)<.55?'reed':'sedge';
      plants.push({kind,salinity,x,z,y:ground,rotation:hash(j,i,3)*Math.PI*2,scale:1.4+hash(j,i,5)*.68,index:-1});
    }
  }
  function measured(frame){
    let exposed=0,covered=0;
    for(const cell of cells){
      const count=cell.indices.filter(k=>referenceHigh.wet[k]&&!referenceLow.wet[k]).length;
      if(!count)continue;
      const dry=cell.indices.filter(k=>referenceHigh.wet[k]&&!referenceLow.wet[k]&&!frame.wet[k]).length;
      exposed+=cell.area*dry*.25;covered+=cell.area*(count-dry)*.25;
    }
    return {exposed,covered};
  }
  function tidalShore(event,source,current){
    const {season,tideId}=current;
    let history=histories.get(event);
    if(!history){
      history={start:-Math.ceil(tidePeriod),masks:[],states:new Map()};
      histories.set(event,history);
    }
    if(history.states.has(source.hour))return history.states.get(source.hour);
    const {start,masks}=history;
    for(let hour=start+masks.length;hour<=source.hour;hour++){
      if(hour===source.hour){masks.push(current.wet);continue;}
      const snapshot=event.frames[hour]??{
        wetlandStage:event.frames[0].wetlandStage,tide:stormTideAt(event.comparison,hour)
      };
      const {waterAt}=hydraulics(season,tideId,snapshot);
      masks.push(connectedEstuary(bed,cols,bed.map(waterAt),seeds));
    }
    const damp=new Uint8Array(bed.length);
    let area=0,covered=0,marker;
    const site=stationData.find(p=>p.id==='flat');
    for(const [i,p] of bed.entries()){
      if(p.seaEdge)continue;
      if(current.wet[i]){
        if(!masks[-start][i])covered+=areas[i];
        continue;
      }
      const retain=24+Math.round(10*Math.sin(p.z*.034)**2);
      for(let h=source.hour-1;h>=Math.max(start,source.hour-retain);h--){
        if(!masks[h-start][i])continue;
        damp[i]=1;area+=areas[i];
        const distance=Math.hypot(p.x-site.x,p.z-site.z);
        if(!marker||distance<marker.distance)marker={x:p.x,z:p.z,bed:p.bed,distance};
        break;
      }
    }
    const result={damp,area,covered,marker};
    history.states.set(source.hour,result);
    return result;
  }
  function eventShore(event,source,current){
    if(event.comparison)return tidalShore(event,source,current);
    const {season,tideId}=current;
    const initial=frame(season,tideId),peak=frame(season,tideId,event.frames[source.coastPeakHour]);
    const damp=Uint8Array.from(bed,(p,i)=>{
      const retention=30+Math.round(10*Math.sin(p.z*.034)**2);
      return Number(!initial.wet[i]&&!current.wet[i]&&peak.wet[i]&&source.hour-source.coastPeakHour<=retention);
    });
    const points=bed.filter((p,i)=>damp[i]);
    const middle=points.reduce(({x,z},p)=>({x:x+p.x/points.length,z:z+p.z/points.length}),{x:0,z:0});
    const distance=p=>(p.x-middle.x)**2+(p.z-middle.z)**2;
    const marker=points.length?points.reduce((a,b)=>distance(a)<distance(b)?a:b):null;
    let area=0,covered=0;
    for(const cell of cells){
      area+=cell.area*cell.indices.reduce((n,k)=>n+damp[k],0)/4;
      covered+=cell.area*cell.indices.filter(k=>!initial.wet[k]&&current.wet[k]).length/4;
    }
    return {damp,area,covered,marker};
  }
  return {bed,cols,rows,cells,frame,measured,eventShore,referenceHigh,referenceLow,stations:stationData,plants,length,deltaAt};
}

export function estuaryPlantPlot(x,z){
  if(x< -1585||x> -1165||z< -405||z> -120)return false;
  const field=riverField(x,z);
  return !!field&&field.t>=.660&&field.t<=.89&&field.normalized<1.8;
}

export const tidalCourse=(branch)=>sweep(47,u=>branchSample(branch,lerp(.784,.947,u)));

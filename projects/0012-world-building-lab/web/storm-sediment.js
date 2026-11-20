import {riverSample} from './water-system.js';

export const shoreEventLimit=800;
export const shoreBenchmarks=[0,40,200,800];
const clamp=(value,low=0,high=1)=>Math.min(high,Math.max(low,value));
const smooth=value=>{const u=clamp(value);return u*u*(3-2*u);};
const pair=()=>[0,0];
const sum=a=>a[0]+a[1];
const total=list=>list.reduce((n,load)=>n+sum(load),0);

export const sedimentReaches=[
  {id:'fork',name:'分汊口',t:.747,trap:.34},
  {id:'flat',name:'内湾潮滩',t:.809,trap:.58},
  {id:'bar',name:'河口浅脊',t:.862,trap:.91},
  {id:'bay',name:'外湾浅水',t:.922,trap:.36},
  {id:'outer',name:'外海边缘',t:.975,trap:.12}
];

export function sedimentPlume(frame,t,breadth){
  const last=sedimentReaches.length-1;
  if(t<.718||t>.999||Math.abs(breadth)>1.13)return 0;
  const right=sedimentReaches.findIndex(reach=>reach.t>=t);
  const left=right<0?last:Math.max(0,right-1);
  const a=sedimentReaches[left],b=sedimentReaches[Math.min(last,left+1)];
  const blend=clamp((t-a.t)/Math.max(.001,b.t-a.t));
  const from=sum(frame.moving[left]),to=sum(frame.moving[Math.min(last,left+1)]);
  const density=from+(to-from)*blend;
  return (1-Math.exp(-density*.79))*.71
    *smooth((t-.718)/.03)*smooth((1-t)/.026)*smooth((1.13-Math.abs(breadth))/.54);
}

export function stormSediment(event){
  const reachCount=sedimentReaches.length;
  let moving=Array.from({length:reachCount},pair);
  const bed=Array.from({length:reachCount},pair);
  const travel=Array.from({length:event.frames.length+3},pair);
  const inWetland=pair(),marsh=pair(),exported=pair();
  const baseStage=event.frames[0].wetlandStage;
  let supplied=0,inTransit=0;
  const frames=event.frames.map(frame=>{
    const {hour,sedimentIn,leave,mouth}=frame;
    supplied+=sum(sedimentIn);
    const tide=frame.tide?.current??-.1;
    const overbank=clamp((frame.wetlandStage-baseStage)/.30);
    const flow=mouth/(mouth+142);
    const velocity=sedimentReaches.map((_,i)=>
      .11+(.96-.135*i)*flow-(.23+.15*i)*tide);
    for(let grain=0;grain<2;grain++){
      inWetland[grain]+=sedimentIn[grain];
      const fraction=grain===0?.15+.12*overbank:.045+.12*overbank;
      const settle=inWetland[grain]*fraction;
      inWetland[grain]-=settle;marsh[grain]+=settle;
      const onward=inWetland[grain]*(.075+.62*leave/(leave+135));
      inWetland[grain]-=onward;travel[hour+3][grain]+=onward;
      moving[0][grain]+=travel[hour][grain];
      inTransit+=onward-travel[hour][grain];
    }
    for(let step=0;step<4;step++){
      const next=Array.from({length:reachCount},pair);
      for(const [i,site] of sedimentReaches.entries())for(let grain=0;grain<2;grain++){
        const speed=velocity[i],energy=Math.abs(speed);
        const bedEnergy=energy*(1-site.trap*.34);
        const lift=clamp((bedEnergy-(grain===0?.63:.34))*.16,0,.12)*bed[i][grain];
        bed[i][grain]-=lift;
        const load=moving[i][grain]+lift;
        const retain=(grain===0?.072:.019)+site.trap*(grain===0?.19:.085)*(1-clamp(energy)*.73);
        const deposited=load*retain;
        bed[i][grain]+=deposited;
        const shift=clamp(energy*.68,0,.66);
        const moved=(load-deposited)*shift;
        next[i][grain]+=load-deposited-moved;
        const to=i+(speed>=0?1:-1);
        if(to===reachCount)exported[grain]+=moved;
        else next[Math.max(0,to)][grain]+=moved;
      }
      moving=next;
    }
    let centre=0;
    const suspended=total(moving);
    if(suspended>1e-9)centre=moving.reduce((value,load,i)=>value+sum(load)*sedimentReaches[i].t,0)/suspended;
    const residual=supplied-(sum(inWetland)+sum(marsh)+inTransit+suspended+total(bed)+sum(exported));
    return {hour,supplied,marsh:[...marsh],bed:bed.map(load=>[...load]),moving,velocity,
      suspended,centre,exported:sum(exported),exportedFine:exported[1],residual,deposited:total(bed)};
  });
  return {frames,final:frames.at(-1)};
}

export function makeShoreSurvey(model){
  const {bed,cells,referenceHigh,referenceLow}=model;
  const area=new Float64Array(bed.length);
  for(const cell of cells)for(const k of cell.indices)area[k]+=cell.area/4;
  const sites=sedimentReaches.map(()=>[[],[]]);
  const low=referenceLow.levels,high=referenceHigh.levels;
  for(const [i,p] of bed.entries()){
    if(p.seaEdge||!referenceHigh.wet[i]||p.t<.718||p.t>.986)continue;
    const site=sedimentReaches.reduce((best,s,j)=>
      Math.abs(s.t-p.t)<Math.abs(sedimentReaches[best].t-p.t)?j:best,0);
    const height=p.bed;
    const point=riverSample(p.t);
    const side=((p.x-point.x)*point.nx+(p.z-point.z)*point.nz);
    const shoulder=smooth((p.normalized-.56)/.44);
    const sandWeight=shoulder*Math.exp(-((height+.28)**2)/.30)
      *Math.exp(-((Math.abs(side)-61)**2)/1550)*smooth((p.t-.762)/.05)*smooth((.965-p.t)/.063);
    const mudWeight=shoulder*Math.exp(-((height-(low[i]+.42))**2)/.23)
      *smooth((.97-p.t)/.13)*(.55+.45*Number(p.branch!==0));
    if(sandWeight>.11)sites[site][0].push({i,weight:sandWeight});
    if(mudWeight>.14)sites[site][1].push({i,weight:mudWeight});
  }
  return {sites,area,high};
}

function spread(model,survey,changes,deposits,sandChange){
  let excess=0;
  for(const [j,load] of deposits.entries())for(let grain=0;grain<2;grain++){
    const volume=load[grain];
    if(volume<=0)continue;
    const sites=survey.sites[j][grain],available=[];
    let weights=0;
    for(const site of sites){
      const {i}=site;
      const room=survey.high[i]+.07-model.bed[i].bed-changes[i];
      if(room<=0)continue;
      const weight=site.weight*smooth(room/.39);
      available.push({i,weight,capacity:room*survey.area[i]});weights+=weight;
    }
    if(!weights){excess+=volume;continue;}
    for(const {i,weight,capacity} of available){
      const share=volume*weight/weights,fill=Math.min(share,capacity);
      const lift=fill/survey.area[i];
      changes[i]+=lift;
      if(grain===0)sandChange[i]+=lift;
      excess+=share-fill;
    }
  }
  return excess;
}

export function eventBed(model,survey,deposits){
  const bedChange=new Float64Array(model.bed.length),sandChange=new Float64Array(model.bed.length);
  const excess=spread(model,survey,bedChange,deposits,sandChange);
  return {bedChange,sandChange,excess};
}

export function buildShoreEvolution(model,survey,events){
  const bedChange=new Float64Array(model.bed.length),sandChange=new Float64Array(model.bed.length);
  let stored=0,excess=0,exported=0,count=0;
  const snapshots=new Map();
  return {
    at(target){
      if(snapshots.has(target))return snapshots.get(target);
      if(target<count){bedChange.fill(0);sandChange.fill(0);stored=0;excess=0;exported=0;count=0;}
      for(;count<target;count++){
        const event=events[count%events.length].final;
        const bypass=spread(model,survey,bedChange,event.bed,sandChange);
        stored+=event.deposited-bypass;excess+=bypass;exported+=event.exported;
      }
      const result={count,bedChange:bedChange.slice(),sandChange:sandChange.slice(),stored,excess,exported};
      if(snapshots.size>=6)snapshots.delete(snapshots.keys().next().value);
      snapshots.set(target,result);
      return result;
    }
  };
}

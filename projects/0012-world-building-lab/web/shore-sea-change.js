import {stormTideAt,tidePeriod} from './basin-storm.js';
import {tides} from './estuary-layout.js';
import {sampleShoreHabitat} from './shore-succession.js';

export const seaSettings={rise:.30,surge:.90};
export const seaStages=[
  {id:'before',name:'原水位'},
  {id:'rise',name:'海面抬升'},
  {id:'peak',name:'风暴潮峰值'},
  {id:'after',name:'风暴退后'},
  {id:'migration',name:'植被迁移'}
];
export const seaMask={permanent:1,temporary:2,erosion:4};
const clamp=(n,low=0,high=1)=>Math.max(low,Math.min(high,n));
const region=p=>!p.seaEdge&&p.t>=.718&&p.t<=.952&&p.breadth<2.05;

function withSea(model,shape,rise,surge=0,tide=tides.ebb){
  const {records}=model.frame('dry','ebb');
  const source={wetlandStage:records.wetland.stage,tide:{
    ...tide,height:tide.height+rise+surge,saltReach:tide.saltReach+.42*rise+.2*surge
  }};
  return {source,frame:model.frame('dry','ebb',source,shape.bedChange)};
}

export function compareSeaChange(model,survey,shape,habitat,growth,settings){
  const {rise,surge}=settings;
  const before={source:null,frame:habitat.start};
  const raised=withSea(model,shape,rise);
  const peak=withSea(model,shape,rise,surge);
  const eroded=shape.bedChange.slice(),sandChange=shape.sandChange.slice(),depths=new Float64Array(eroded.length);
  const roots=new Map(growth.patches.map(p=>[p.i,.38*p.grassCover+.58*p.reedCover]));
  let volume=0;
  for(const [i,p] of peak.frame.bed.entries()){
    if(!region(p)||!peak.frame.wet[i]||!eroded[i]||surge<=0)continue;
    const waterDepth=Math.max(0,raised.frame.levels[i]-p.bed);
    const added=peak.frame.levels[i]-raised.frame.levels[i];
    const nearEdge=clamp(1-waterDepth/1.65);
    const exposure=clamp((p.t-.72)/.18)*.58+.42;
    const wear=added*.27*nearEdge*exposure*(1-(roots.get(i)??0));
    const loss=Math.min(eroded[i],wear);
    depths[i]=loss;volume+=loss*survey.area[i];
    sandChange[i]*=1-loss/eroded[i];eroded[i]-=loss;
  }
  const afterShape={count:shape.count,bedChange:eroded,sandChange};
  const after=withSea(model,afterShape,rise);
  const masks=new Uint8Array(eroded.length);
  let permanentArea=0,temporaryArea=0,scouredArea=0,remainingWet=0,scourWet=0;
  const targets=new Set(habitat.cells.map(p=>p.i));
  let newLandRise=0,newLandPeak=0,newLandRewet=0;
  for(const [i,p] of model.bed.entries()){
    if(!region(p))continue;
    const base=before.frame.wet[i],usual=raised.frame.wet[i],flood=peak.frame.wet[i],left=after.frame.wet[i];
    const area=survey.area[i];
    if(!base&&usual){masks[i]|=seaMask.permanent;permanentArea+=area;}
    if(!base&&!usual&&flood){masks[i]|=seaMask.temporary;temporaryArea+=area;}
    if(depths[i]>=.025){masks[i]|=seaMask.erosion;scouredArea+=area;}
    if(!base&&left)remainingWet+=area;
    if(!usual&&left)scourWet+=area;
    if(targets.has(i)){
      if(usual)newLandRise+=area;
      if(flood)newLandPeak+=area;
      if(left)newLandRewet+=area;
    }
  }
  return {
    stages:{before:{...before,shape},rise:{...raised,shape},peak:{...peak,shape},
      after:{...after,shape:afterShape}},
    depths,masks,stats:{permanentArea,temporaryArea,scouredArea,volume,remainingWet,scourWet,newLandRise,newLandPeak,newLandRewet}
  };
}

function stepsFrom(model,domain,lowWet,seeds){
  const {cols}=model,rows=new Map(),queue=[];
  for(const p of seeds){
    rows.set(p.i,{origin:p,previous:-1,distance:0});queue.push(p.i);
  }
  for(let k=0;k<queue.length;k++){
    const i=queue[k],row=rows.get(i),col=i%cols;
    if(row.distance>=12)continue;
    const neighbours=[i-cols,i+cols,...(col>0?[i-1]:[]),...(col<cols-1?[i+1]:[])];
    for(const next of neighbours){
      if(rows.has(next)||!domain.has(next)||lowWet[next])continue;
      rows.set(next,{origin:row.origin,previous:i,distance:row.distance+1});queue.push(next);
    }
  }
  return rows;
}

export function moveShorePlants(model,survey,growth,coastal,settings){
  const post=coastal.stages.after,pre=coastal.stages.before,old=new Map(growth.patches.map(p=>[p.i,p]));
  if(!old.size||(!settings.rise&&!settings.surge)){
    return {growth,routes:[],grassMoved:0,reedMoved:0,lostCover:0};
  }
  const seeds=growth.patches.filter(p=>p.cover>.12);
  if(!seeds.length)return {growth,routes:[],grassMoved:0,reedMoved:0,lostCover:0};
  const indices=[];
  for(const [i,p] of post.frame.bed.entries()){
    if(old.has(i)||(region(p)&&p.bed<3&&p.bed>-.5&&seeds.some(s=>Math.hypot(s.x-p.x,s.z-p.z)<=64))){
      indices.push(i);
    }
  }
  const past=sampleShoreHabitat(model,survey,pre.shape,indices);
  const future=sampleShoreHabitat(model,survey,post.shape,indices,settings.rise);
  const lowTide=stormTideAt({id:'flood',referencePeak:0},-tidePeriod/4);
  const {frame:low}=withSea(model,post.shape,settings.rise,0,lowTide);
  const domain=new Set(indices);
  const grassPaths=stepsFrom(model,domain,low.wet,seeds.filter(p=>p.grassCover>.12));
  const reedPaths=stepsFrom(model,domain,low.wet,seeds.filter(p=>p.reedCover>.12));
  let grassMoved=0,reedMoved=0,lostCover=0;
  const preferred={};
  function settlement(site,prior,fit,paths){
    const path=paths.get(site.i);
    if(!path||!path.distance||site.height<=path.origin.height+.035||site[fit]<=prior[fit]+.065)return 0;
    return site[fit]*clamp(1-path.distance/17)*.72;
  }
  const patches=future.flatMap((site,k)=>{
    const p=old.get(site.i);
    if(p){
      const grassCover=Math.min(p.grassCover,site.saltGrass*.84);
      const reedCover=Math.min(p.reedCover,site.reed*.96);
      lostCover+=(p.cover-grassCover-reedCover)*p.area;
      return [{...site,grassCover,reedCover,cover:grassCover+reedCover}];
    }
    const prior=past[k];
    const reedCover=settlement(site,prior,'reed',reedPaths);
    const grassCover=settlement(site,prior,'saltGrass',grassPaths)*(1-reedCover);
    if(grassCover+reedCover<.035)return [];
    grassMoved+=grassCover*site.area;reedMoved+=reedCover*site.area;
    for(const [kind,value,paths] of [['grass',grassCover,grassPaths],['reed',reedCover,reedPaths]]){
      if(value<=.08)continue;
      const path=paths.get(site.i),score=value*Math.min(8,path.distance);
      if(!preferred[kind]||score>preferred[kind].score)preferred[kind]={i:site.i,score,paths};
    }
    return [{...site,grassCover,reedCover,cover:grassCover+reedCover}];
  });
  const routes=Object.entries(preferred).map(([kind,{i,paths}])=>{
    const corridor=[];
    for(let k=i;k>=0;k=paths.get(k).previous)corridor.unshift(k);
    return {kind,corridor};
  });
  return {growth:{patches},routes,grassMoved,reedMoved,lostCover};
}

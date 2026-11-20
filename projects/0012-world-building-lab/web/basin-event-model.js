import {formationCell} from './world-formation.js';
import {formationMaterials,stormSlopeFactor} from './world-hydraulics.js';
import {riverSample} from './water-system.js';
import {tropicalChannel} from './tropical-layout.js';
import {SALT_CRUST,SALT_DRY,SALT_LAKE,SALT_MARSH} from './salt-layout.js';
import {makeStorageCurve} from './watershed-balance.js';
import {gauges,seasonalRiverLevel} from './watershed-world.js';
import {terrainHeight} from './large-world.js';

export const basinEventHours=120;
export const basinEventDefaults={rain:48,duration:8,month:7};
export const basinEventStride=8;
export function basinCellWater(frame,i){
  const start=i*basinEventStride;
  const [through,shallow,,soil,,runoff,infiltration,baseflow]=frame.observations.subarray(start,start+basinEventStride);
  return {through,shallow,soil,runoff,infiltration,baseflow};
}
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const empty=()=>({water:0,sand:0,mud:0,salt:0});
const add=(a,b)=>{
  a.water+=b.water;a.sand+=b.sand;a.mud+=b.mud;a.salt+=b.salt;
};
const sediment=p=>p.sand+p.mud;

export const basinEventStations={
  central:[
    {name:'北部山口 · 降雨与入渗',x:-960,z:-920,distance:520},
    {name:'苇泽湿地 · 存水与沉积',...riverSample(gauges.wetland),node:'wetland',distance:420},
    {name:'中央河口 · 入海',...riverSample(.87),node:'centralMouth',distance:480}
  ],
  south:[
    {name:'高原塘溪 · 降雨与入渗',x:-1280,z:480,distance:560},
    {name:'雨林谷地 · 河流下泄',...tropicalChannel(.46),node:'southValley',distance:400},
    {name:'红树林河口 · 入海',...tropicalChannel(.85),node:'south',distance:480}
  ],
  closed:[
    {name:'西部盆缘 · 降雨与入渗',x:-1520,z:320,distance:490},
    {name:'盐湖 · 盆内蓄水',...SALT_LAKE,node:'salt',distance:390},
    {name:'盐沼和盐湿岸 · 滞留与退水',...SALT_MARSH,node:'saltMarsh',distance:430}
  ]
};

const reaches={
  ice:{next:'upper',release:.40,settle:.14},upper:{next:'main',release:.49,settle:.10},
  north:{next:'wetland',release:.29,settle:.16},lake:{next:'main',release:.07,settle:.37},
  main:{next:'wetland',release:.37,settle:.13},
  wetland:{next:'centralMouth',release:.10,settle:.31,evap:.0007,baselineSalt:.15},
  centralMouth:{release:.46,settle:.22,baselineSalt:9,mixing:17500},
  southUpland:{next:'southValley',release:.25,settle:.16},
  southValley:{next:'south',release:.43,settle:.11,baselineSalt:.09},
  south:{release:.44,settle:.24,baselineSalt:13,mixing:11800},
  salt:{release:0,settle:.40,evap:.0038,baselineSalt:16},
  saltMarsh:{release:0,settle:.49,evap:.0065,baselineSalt:13},
  crust:{release:0,settle:.51,evap:.0075},dry:{release:0,settle:.51,evap:.009}
};
const reachIds={
  central:['ice','upper','north','lake','main','wetland','centralMouth'],
  south:['southUpland','southValley','south'],
  closed:['salt','saltMarsh','crust','dry']
};

// The same surveyed bed drives the water surface and its storage curve.
function makePatch(rows,columns,sample){
  const bed=[],cells=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
    const p=sample(row/rows,col/columns);
    bed.push({...p,bed:terrainHeight(p.x,p.z)});
    if(row===rows||col===columns)continue;
    const k=row*(columns+1)+col;
    cells.push({indices:[k,k+1,k+columns+1,k+columns+2]});
  }
  for(const cell of cells){
    const [a,b,c]=cell.indices.map(k=>bed[k]);
    cell.area=Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x));
  }
  return {bed,cells};
}

function coastPatch(sample,start,end,extra){
  return makePatch(40,18,(u,v)=>{
    const p=sample(start+(end-start)*u),offset=(2*v-1)*(p.half+extra);
    return {x:p.x+p.nx*offset,z:p.z+p.nz*offset,t:p.t,breadth:offset/p.half,base:p.level,
      weight:Math.sin(u*Math.PI)**.6};
  });
}

function hollowPatch(p){
  return makePatch(26,26,(u,v)=>({x:p.x+(2*v-1)*p.rx,z:p.z+(2*u-1)*p.rz,base:0,weight:1}));
}

function patchPlan(world){
  return {
    wetland:{patch:world.patches.river,body:'wetland',baseLevel:(p,background)=>
      seasonalRiverLevel(p.t,background.records.main.stage,background.records.wetland.stage),
      weight:p=>{
        const d=p.t-gauges.wetland,r=d<0?gauges.wetland-.62:.735-gauges.wetland;
        return Math.max(0,1-Math.abs(d)/r);
      }},
    salt:{patch:world.patches.salt,body:'salt'},
    saltMarsh:{patch:world.patches.saltMarsh,body:'saltMarsh'},
    centralMouth:{patch:coastPatch(riverSample,.735,.917,29),baseLevel:p=>riverSample(p.t).level},
    southValley:{patch:coastPatch(tropicalChannel,.29,.64,19),baseLevel:p=>tropicalChannel(p.t).level},
    south:{patch:coastPatch(tropicalChannel,.63,.93,30),baseLevel:p=>tropicalChannel(p.t).level},
    crust:{patch:hollowPatch(SALT_CRUST),dryHollow:true},
    dry:{patch:hollowPatch(SALT_DRY),dryHollow:true}
  };
}

export function createBasinEventModel(study){
  const {world,positions,area}=study;
  const patches=patchPlan(world);
  function reservoirs(month){
    const background=world.frames[month-1];
    return Object.fromEntries(Object.entries(patches).map(([id,plan])=>{
      const {patch,body,dryHollow}=plan,record=background.records[body];
      const minBed=dryHollow?Math.min(...patch.bed.map(p=>p.bed))-.01:null;
      const baseLevel=p=>plan.baseLevel?plan.baseLevel(p,background):record?.stage??minBed??p.base;
      const weight=plan.weight??(p=>p.weight??1);
      const samples=patch.cells.map(({indices,area})=>{
        const average=fn=>indices.reduce((sum,k)=>sum+fn(patch.bed[k]),0)/indices.length;
        return {area,anchor:average(baseLevel),bed:average(p=>p.bed),weight:average(weight)};
      });
      const curve=makeStorageCurve(samples,0,8);
      const baseVolume=record?.storage??curve.volumeAt(0);
      return [id,{patch,baseLevel,weight,curve,baseVolume,samples}];
    }));
  }

  function landCells(basin){
    const local=new Map(basin.cells.map((k,i)=>[k,i]));
    return basin.cells.map(k=>{
      const adjacent=world.graph.next[k],next=local.get(adjacent)??-1;
      const {x,z}=positions[k],profile=world.hydraulics[k];
      const id=world.bodies[world.graph.owner[k]]?.id;
      const sink=id==='south'?(z<1010?'southUpland':x> -1530?'southValley':'south'):
        id??(z<550?'crust':'dry');
      // A receiver is always a named node in this catchment.
      if(next<0&&!reachIds[basin.id].includes(sink))throw new Error('Missing storm receiver for '+basin.id);
      return {k,x,z,next,sink,profile,material:formationMaterials[profile.material],water:!!world.graph.waterCells[k]};
    });
  }
  const basins=study.basins.map(basin=>({...basin,eventCells:landCells(basin),stations:basinEventStations[basin.id]}));
  function run(settings=basinEventDefaults){
    const month=clamp(Math.round(settings.month),1,12),duration=clamp(Math.round(settings.duration),1,24),
      rain=clamp(Number(settings.rain),0,144);
    const surfaces=reservoirs(month),background=world.frames[month-1];
    return {settings:{month,duration,rain},surfaces,results:basins.map(basin=>solve(basin,area,background,surfaces,{rain,duration}))};
  }
  return {study,basins,run};
}

function solve(basin,area,background,surfaces,{rain,duration}){
  const cells=basin.eventCells,n=cells.length,ids=reachIds[basin.id];
  const ground=cells.map(c=>({
    soil:0,shallow:0,room:Math.max(5,24+.86*c.material.rootCapacity-background.cells.soil[c.k]/area*600)*area/1000,
    saltAvailable:c.profile.salinity*area*.11,deposit:0
  }));
  const nodes=Object.fromEntries(ids.map(id=>[id,{...empty(),deposit:0}]));
  let incoming=cells.map(empty),pending=Object.fromEntries(ids.map(id=>[id,empty()]));
  let rainTotal=0,evaporation=0,eroded=0,washed=0;
  const exported=empty(),frames=[];
  for(let hour=0;hour<=basinEventHours;hour++){
    const rainRate=hour>0&&hour<=duration?rain/duration:0,localRain=rainRate*area/1000;
    rainTotal+=localRain*n;
    const outgoing=cells.map(empty),downstream=Object.fromEntries(ids.map(id=>[id,empty()]));
    const observations=new Float32Array(n*basinEventStride);
    let infiltration=0,runoff=0,baseflow=0,soil=0,shallow=0,landDeposit=0;
    cells.forEach((c,i)=>{
      const s=ground[i],p=incoming[i],{material,profile}=c;
      const intake=c.water?0:material.intake*stormSlopeFactor(profile.slope)*area/1000;
      const absorbed=Math.min(localRain,intake,Math.max(0,s.room-s.soil)),fast=localRain-absorbed;
      s.soil+=absorbed;
      const drain=s.soil*(.072+material.drain*.18),et=s.soil*.0035;
      s.soil-=drain+et;s.shallow+=drain;evaporation+=et;
      const slow=s.shallow*(.0065+profile.release*.019);
      s.shallow-=slow;
      const grade=clamp(profile.slope/.38),pick=c.water?0:fast*(.001+.011*grade)*clamp(fast/12);
      const sand=pick*(.23+.32*grade),salt=Math.min(s.saltAvailable,fast*profile.salinity*.18);
      s.saltAvailable-=salt;washed+=salt;eroded+=pick;
      p.water+=fast+slow;p.sand+=sand;p.mud+=pick-sand;p.salt+=salt;
      if(c.next>=0){
        const sandTrap=p.sand*(.05+.31*(1-grade)),mudTrap=p.mud*(.01+.07*(1-grade));
        s.deposit+=sandTrap+mudTrap;p.sand-=sandTrap;p.mud-=mudTrap;
        add(outgoing[c.next],p);
      }else add(pending[c.sink],p);
      runoff+=fast;infiltration+=absorbed;soil+=s.soil;shallow+=s.shallow;baseflow+=slow;landDeposit+=s.deposit;
      observations.set([p.water,s.shallow,s.deposit,s.soil,salt,fast,absorbed,slow],i*basinEventStride);
    });
    const discharge=empty(),readings={};
    let retained=0,bedDeposit=0;
    for(const id of ids){
      const node=nodes[id],spec=reaches[id],arrivals=pending[id];
      add(node,arrivals);
      const sandTrap=node.sand*spec.settle,mudTrap=node.mud*spec.settle*.37;
      node.deposit+=sandTrap+mudTrap;node.sand-=sandTrap;node.mud-=mudTrap;
      const leave=node.water*spec.release;
      const load={water:leave,sand:node.sand*spec.release,mud:node.mud*spec.release,salt:node.salt*spec.release};
      const vapor=(node.water-leave)*(spec.evap??.00015);
      node.water-=leave+vapor;node.sand-=load.sand;node.mud-=load.mud;node.salt-=load.salt;evaporation+=vapor;
      if(spec.next)add(downstream[spec.next],load);else add(discharge,load);
      retained+=node.water;bedDeposit+=node.deposit;
      const surface=surfaces[id],mixing=spec.mixing??surface?.baseVolume??0;
      let rise=0;
      if(surface&&node.water>0){
        const target=surface.curve.volumeAt(0)+node.water,capArea=Math.max(1,surface.curve.areaAt(surface.curve.maximum));
        rise=target<=surface.curve.capacity?surface.curve.stageAt(target):
          surface.curve.maximum+(target-surface.curve.capacity)/capArea;
      }
      const salinity=mixing+node.water>0?((spec.baselineSalt??0)*mixing+node.salt)/(mixing+node.water):0;
      readings[id]={water:node.water,arrival:arrivals.water,release:leave,deposit:node.deposit,
        rise,salinity,salt:node.salt};
    }
    add(exported,discharge);
    incoming=outgoing;pending=downstream;
    const moving=empty(),inWater=empty();
    for(const p of incoming)add(moving,p);
    for(const id of ids){add(moving,pending[id]);add(inWater,nodes[id]);}
    const deposited=landDeposit+bedDeposit;
    frames.push({hour,rainRate,rainTotal,runoff,infiltration,baseflow,soil,shallow,retained,
      evaporation,discharge:discharge.water,exported:exported.water,sedimentExport:sediment(exported),
      deposited,eroded,washed,saltRetained:inWater.salt,saltExport:exported.salt,transit:moving.water,observations,readings,
      waterResidual:rainTotal-soil-shallow-retained-moving.water-exported.water-evaporation,
      sedimentResidual:eroded-deposited-sediment(moving)-sediment(inWater)-sediment(exported),
      saltResidual:washed-moving.salt-inWater.salt-exported.salt});
  }
  const gauge=basin.id==='closed'?'saltMarsh':basin.id==='central'?'wetland':'south';
  const peak=frames.reduce((best,f)=>(basin.id==='closed'?f.readings[gauge].arrival>best.readings[gauge].arrival:
    f.discharge>best.discharge)?f:best).hour;
  return {basin,frames,peak,area:n*area};
}

export function basinEventSite(model,event,result,station,hour){
  const k=formationCell(model.study.grid,station.x,station.z);
  const i=result.basin.eventCells.findIndex(c=>c.k===k);
  const profile=model.study.world.hydraulics[k],frame=result.frames[hour];
  const reading=frame.readings[station.node];
  const surface=event.surfaces[station.node];
  const bank=surface?surveyEventBank(surface,result.frames,station.node,hour):null;
  return {profile,reading,field:i>=0?frame.observations.slice(i*basinEventStride,i*basinEventStride+5):null,bank};
}

export function surveyEventBank(surface,frames,id,hour){
  const rise=frames[hour].readings[id].rise;
  const recent=frames.slice(Math.max(0,hour-32),hour+1).reduce((max,f)=>Math.max(max,f.readings[id].rise),0);
  let flooded=0,damp=0;
  for(const {anchor,bed,weight,area} of surface.samples){
    if(bed<anchor||weight===0)continue;
    if(bed<anchor+weight*rise)flooded+=area;
    else if(bed<anchor+weight*recent)damp+=area;
  }
  return {flooded,damp};
}

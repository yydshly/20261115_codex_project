import {formationMaterials,stormSlopeFactor} from './world-hydraulics.js';
import {cellPosition} from './watershed-world.js';

export const stormHours=120;
export const stormSettings={rain:96,duration:6,month:1};
export const tidePeriod=12.42;
export const stormTides={
  flood:{name:'洪峰遇涨潮',sign:1},
  ebb:{name:'洪峰遇退潮',sign:-1}
};
const clamp=(value,low,high)=>Math.min(high,Math.max(low,value));

export function stormTideAt(comparison,hour){
  const angle=(hour-comparison.referencePeak)*2*Math.PI/tidePeriod;
  const wave=stormTides[comparison.id].sign;
  const height=.16+.56*wave*Math.sin(angle);
  const current=wave*Math.cos(angle);
  const direction=Math.abs(current)<.14?0:current>0?-1:1;
  const name=direction===-1?'涨潮':direction===1?'退潮':height>.16?'近高潮':'近低潮';
  return {name,height,current,direction,saltReach:1.12+.34*(height-.16)+.21*current};
}
export const stormStops=[
  {id:'rain',name:'北部山口 · 降雨入场',view:[-916,-1007,46,480,1.65],
    detail:'金色范围是这场雨落下的格网。雨落在坡面和砂砾扇上，越过入渗能力的水顺坡流向东支，另一部分进入土层。'},
  {id:'ground',name:'扇尾泉口 · 地下储水',view:[-895,-696,18,235,1.04],
    detail:'入渗水先留在土里，再下渗到浅层地下。坡面快流早到，蓄下的水稍后持续从岸边释出。'},
  {id:'wetland',name:'苇泽湿地 · 洪泛和退水',view:[-1174,-330,5,210,1.56],
    detail:'潮水抬高下游水位时，苇泽出水受阻，低滩可能更晚露出。亮蓝是雨后新淹，赭色是退水后仍湿的泥面。'},
  {id:'estuary',name:'中央河口 · 盐度与湿岸',view:[-1430,-254,12,517,1.57],
    detail:'蓝箭头沿主槽下泄，黄箭头随潮转向。橙标是 5‰ 盐度前缘，赭色是已经露出水面却仍湿的岸带。'}
];

export const stormLinks={
  water:{overview:'rain',snow:'rain',source:'rain',valley:'rain',join:'ground',wetland:'wetland',estuary:'estuary',bay:'estuary'},
  warmth:{overview:'wetland',slope:'rain',plain:'wetland',forest:'wetland','warm-shore':'estuary'},
  inland:{overview:'rain',ocean:'estuary',coast:'estuary',windward:'rain',ridge:'rain',lee:'ground',oasis:'ground'}
};

export function stormCatchment(world){
  const {graph,climate:{grid,height},bodies}=world,branch=bodies.findIndex(b=>b.id==='north');
  const area=grid.step**2,cells=[];
  for(let k=0;k<height.length;k++){
    if(graph.owner[k]!==branch||graph.waterCells[k]||graph.ocean[k])continue;
    const {x,z}=cellPosition(grid,k);
    if(x< -1120||x> -790||z< -1135||z> -830)continue;
    // Retain the fan outlet, rather than capturing the strata tributary to its west.
    let outlet=k,travel=0;
    while(graph.next[outlet]>=0){
      const next=graph.next[outlet],a=cellPosition(grid,outlet),b=cellPosition(grid,next);
      travel+=Math.hypot(a.x-b.x,a.z-b.z);outlet=next;
    }
    const exit=cellPosition(grid,outlet);
    if(exit.x< -1030||exit.x> -785||exit.z< -1110||exit.z> -810)continue;
    const {material,slope}=world.hydraulics[k],substrate=formationMaterials[material];
    const detention=Math.min(7,2+Math.round(travel/57)+Math.round(Math.max(0,-z-850)/132));
    cells.push({k,x,z,substrate,slope,detention});
  }
  return {cells,area,areaTotal:cells.length*area,grid};
}

export function runBasinStorm(world,catchment,settings=stormSettings,comparison=null){
  const {rain,duration,month}=settings,background=world.frames[month-1];
  const {cells,area,areaTotal}=catchment;
  const curve=world.bodies.find(b=>b.id==='wetland').curve;
  const baseStage=background.records.wetland.stage,baseVolume=curve.volumeAt(baseStage);
  const capStage=curve.stageAt(curve.capacity),capArea=curve.areaAt(capStage);
  const states=cells.map(p=>{
    const storage=background.cells.soil[p.k]/area*1000;
    return {soil:0,ground:0,room:Math.max(5,24+.86*p.substrate.rootCapacity-storage*.60)*area/1000};
  });
  const surfaceQueue=new Float64Array(stormHours+20),groundQueue=new Float64Array(stormHours+20);
  const sandQueue=new Float64Array(stormHours+20),mudQueue=new Float64Array(stormHours+20);
  const mouthQueue=new Float64Array(stormHours+20),frames=[];
  let cumulativeRain=0,evaporated=0,wetlandStorage=0,sea=0,transit=0,mouthTransit=0,salinityFlow=0;
  let mouthStorage=0;
  let wetlandPeak=null,coastPeak=null;
  for(let hour=0;hour<=stormHours;hour++){
    const rainRate=hour>0&&hour<=duration?rain/duration:0;
    const incoming=area*rainRate/1000;
    cumulativeRain+=incoming*cells.length;
    let runoff=0,infiltration=0,groundwater=0,soil=0,baseflow=0;
    cells.forEach(({substrate,slope,detention},i)=>{
      const s=states[i];
      const intake=substrate.intake*stormSlopeFactor(slope)*area/1000;
      const infiltrationHere=Math.min(incoming,intake,Math.max(0,s.room-s.soil));
      const fast=incoming-infiltrationHere;
      runoff+=fast;infiltration+=infiltrationHere;
      const grade=clamp(slope/.38,0,1);
      const eroded=fast*(.001+.011*grade)*clamp(fast/12,0,1);
      const sand=eroded*(.23+.32*grade);
      // Part of the coarse load stays on the alluvial fan.
      sandQueue[hour+detention]+=sand*.61;
      mudQueue[hour+detention]+=(eroded-sand)*.94;
      s.soil+=infiltrationHere;
      const evaporation=s.soil*.0035,drain=s.soil*(.072+substrate.drain*.18);
      s.soil-=evaporation+drain;
      evaporated+=evaporation;
      s.ground+=drain;
      const slow=s.ground*.0095;
      s.ground-=slow;
      baseflow+=slow;groundwater+=s.ground;soil+=s.soil;
      surfaceQueue[hour+detention]+=fast;
      groundQueue[hour+3]+=slow;
    });
    const arrival=surfaceQueue[hour]+groundQueue[hour];
    transit+=runoff+baseflow-arrival;
    wetlandStorage+=arrival;
    const tide=comparison?stormTideAt(comparison,hour):null;
    const tail=tide?stormTideAt(comparison,hour-1):null;
    // The tailwater signal arrives later and is weaker upstream of the mouth.
    const wetlandDrain=tail?clamp(1-.22*(tail.height+.12)-.48*tail.current,.40,1.26):1;
    const leave=wetlandStorage*.105*wetlandDrain;
    wetlandStorage-=leave;
    // The downstream reach carries the pulse to the mouth with a further lag.
    mouthQueue[hour+3]+=leave;
    const incomingMouth=mouthQueue[hour];
    mouthStorage+=incomingMouth;
    const pass=tide?clamp(1-.12*(tide.height+.11)-.10*tide.current,.40,1):1;
    const mouth=mouthStorage*pass;
    mouthStorage-=mouth;
    mouthTransit+=leave-mouth;
    sea+=mouth;
    salinityFlow+=(mouth-salinityFlow)*.29;
    const total=baseVolume+wetlandStorage;
    const wetlandStage=total<=curve.capacity?curve.stageAt(total):capStage+(total-curve.capacity)/capArea;
    const residual=cumulativeRain-(soil+groundwater+transit+wetlandStorage+mouthTransit+sea+evaporated);
    const sedimentIn=[sandQueue[hour],mudQueue[hour]];
    const frame={hour,rainRate,cumulativeRain,runoff,infiltration,groundwater,soil,baseflow,arrival,sedimentIn,wetlandStorage,
      wetlandStage,leave,tide,mouth,mouthStorage,salinityFlow,transit,mouthTransit,sea,evaporated,residual};
    if(!wetlandPeak||wetlandStage>wetlandPeak.wetlandStage)wetlandPeak=frame;
    if(!coastPeak||mouth>coastPeak.mouth)coastPeak=frame;
    frame.wetlandPeakHour=wetlandPeak.hour;
    frame.coastPeakHour=coastPeak.hour;
    frames.push(frame);
  }
  return {frames,settings:{...settings},areaTotal,wetlandPeak:wetlandPeak.hour,coastPeak:coastPeak.hour,baseline:background,comparison};
}

export function runStormComparison(world,catchment,settings=stormSettings){
  const fixed=runBasinStorm(world,catchment,settings);
  const referencePeak=fixed.coastPeak||runBasinStorm(world,catchment,{...settings,rain:stormSettings.rain}).coastPeak;
  const scenarios={flood:runBasinStorm(world,catchment,settings,{id:'flood',referencePeak}),
    ebb:runBasinStorm(world,catchment,settings,{id:'ebb',referencePeak}),fixed};
  return {scenarios,referencePeak};
}

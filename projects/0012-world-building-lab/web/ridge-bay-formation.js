import {benchmarkPoint,benchmarkStops} from './benchmark-trail.js';
import {iceField,iceSurface,meltSample} from './glacial-geography.js';
import {terrainHeight} from './large-world.js';
import {regionalClimate} from './regional-geography.js';
import {buildSedimentYear} from './sediment-model.js';
import {bedrockAt} from './groundwater-layout.js';
import {formationMaterials} from './world-hydraulics.js';
import {formationCell,formationLand} from './world-formation.js';
import {cellPosition,seasonalRiverLevel} from './watershed-world.js';
import {branchSample,riverField,riverSample,waterAt} from './water-system.js';
import {buildWetlandModel} from './wetland-layout.js';

const limit=value=>Math.max(0,Math.min(1,value));
const mix=(a,b,t)=>a+(b-a)*t;
const ridgeSection=[[442,-680],[442,-415]];
const sourceSection=acrossRiver(0,39);
const valleyT=.47;
const valleySection=acrossRiver(valleyT,37);
const bayT=.87;
const baySection=acrossRiver(bayT,117);

export const ridgeBayStations=[
  {id:'ridge',stop:0,view:[442,-549,340,420,Math.PI*.61],
    question:'为什么同一条雪岭两侧的水会往不同方向走？',
    comparison:'参考线显示现有冰面。冰下谷床仍用同一份地形高程。'},
  {id:'source-pool',stop:4,view:[95,-78,213,135,.4],
    question:'为什么水会先聚在源池，再流入中央河？',
    comparison:'切换月份比较来水。源池与冰碛湖水边轮廓采用原有场景水位。'},
  {id:'river-valley',stop:6,view:[-731,-166,19,185,-.5],
    question:'流水怎样切入河谷的冲积层，再把砂泥带往下游？',
    comparison:'两岸标高不变，用两岸连线作浅槽参考。差值示意河槽下切空间。'},
  {id:'wetland',stop:7,view:[-1194,-330,2,177,-.48],
    question:'水退下去以后，为什么低处还留着水，高处变成草滩？',
    comparison:'切换月份比较连通水面。常年湿地和季节性湿地取全年淹水频次，保留原生境位置。'},
  {id:'bay',stop:9,view:[-1545,-232,2,330,-.28],
    question:'主河走到海湾后，泥沙为什么有些留在浅脊，有些被带出去？',
    comparison:'参考线按当月的砂粒沉积量示意浅脊加积，厚度放大供观察。'}
].map(({stop,...station})=>{
  const {name,at}=benchmarkStops[stop],{x,z}=benchmarkPoint(at);
  return {...station,name,x,z,at};
});

function acrossRiver(t,half){
  const {x,z,nx,nz}=riverSample(t);
  return [[x-half*nx,z-half*nz],[x+half*nx,z+half*nz]];
}

function survey([[ax,az],[bx,bz]]){
  const length=Math.hypot(bx-ax,bz-az),steps=Math.ceil(length/2);
  return Array.from({length:steps+1},(_,index)=>{
    const t=index/steps,x=mix(ax,bx,t),z=mix(az,bz,t);
    return {x,z,y:terrainHeight(x,z),distance:t*length};
  });
}

function routeSurvey(){
  const route=[];
  for(let index=1;index<ridgeBayStations.length;index++){
    const start=ridgeBayStations[index-1].at,end=ridgeBayStations[index].at;
    const steps=Math.ceil((end-start)/5);
    for(let i=index===1?0:1;i<=steps;i++){
      const {x,z}=benchmarkPoint(mix(start,end,i/steps));
      route.push({x,z,y:terrainHeight(x,z)});
    }
  }
  return route;
}

function runoffPath(world,x,z){
  const {grid}=world.climate,points=[];
  for(let k=formationCell(grid,x,z);k>=0;k=world.graph.next[k]){
    const p=cellPosition(grid,k);
    points.push({...p,y:terrainHeight(p.x,p.z)});
  }
  return {kind:'runoff',points};
}

function waterPath(sample,start,end){
  const points=Array.from({length:65},(_,i)=>{
    const {x,z,level}=sample(mix(start,end,i/64));
    return {x,z,y:Math.max(level,terrainHeight(x,z))};
  });
  return {kind:'surface',points};
}

const surfaceRoutes={
  'source-pool':[waterPath(t=>meltSample(1,t),0,1),waterPath(riverSample,0,.027)],
  'river-valley':[waterPath(riverSample,.40,.54)],
  wetland:[waterPath(riverSample,.618,.721)],
  bay:[0,1,2].map(branch=>waterPath(t=>branchSample(branch,t),.74,.955))
};

function iceReference({x,y,z}){
  const ice=iceField(x,z);
  if(!ice||ice.normalized>=1)return y;
  const side=(x-ice.x)*ice.nx+(z-ice.z)*ice.nz;
  return Math.max(y,iceSurface(ice,Math.sign(side)*ice.normalized));
}

const channel=riverSample(valleyT);
const valleyRim=[-1,1].map(side=>terrainHeight(channel.x+side*channel.half*channel.nx,
  channel.z+side*channel.half*channel.nz));

function valleyReference({x,y,z}){
  const lateral=((x-channel.x)*channel.nx+(z-channel.z)*channel.nz)/channel.half;
  return Math.abs(lateral)<1?Math.max(y,mix(...valleyRim,(lateral+1)/2)):y;
}

const bayCenter=riverSample(bayT);
function bayReference({x,y,z},volume){
  const offset=(x-bayCenter.x)*bayCenter.nx+(z-bayCenter.z)*bayCenter.nz;
  // Show the two shoal shoulders between the river's existing branches.
  // Vertical relief is illustrated separately from the reported model volume.
  const shoal=limit(1-Math.abs(Math.abs(offset)-63)/18)*limit((y+3.1)/1.6);
  return y+.72*shoal*(1-Math.exp(-volume/1.7));
}

const metric=(label,value,unit,digits=1)=>({
  label,value:`${value.toLocaleString('zh-CN',{maximumFractionDigits:digits})} ${unit}`
});

export const ridgeBayWetlandPhase=month=>({id:`ridge-bay-${month}`,month});

export function buildRidgeBayFormation(world,getWetland=()=>buildWetlandModel(world,terrainHeight)){
  const {grid}=world.climate,area=grid.step**2;
  const sections={ridge:survey(ridgeSection),'source-pool':survey(sourceSection),
    'river-valley':survey(valleySection),bay:survey(baySection)};
  const flows={...surfaceRoutes,ridge:[runoffPath(world,440,-600),runoffPath(world,400,-520)]};
  const cache=new Map();
  let sediment,wetland;

  function sample(point,month){
    const {x,y,z}=point,k=formationCell(grid,x,z),profile=world.hydraulics[k];
    const frame=world.frames[month-1],channel=riverField(x,z),existing=waterAt(x,z);
    const {main,wetland}=frame.records;
    const stage=channel?.normalized<=1?seasonalRiverLevel(channel.t,main.stage,wetland.stage):
      existing?.level??(world.graph.ocean[k]?0:null);
    const weather=world.climate.frames[month-1];
    const habitat=profile?formationLand(profile,regionalClimate(x,z,y),{cells:frame.cells,weather},k,area).habitat:null;
    return {...point,compareY:null,water:Number.isFinite(stage)&&stage>y+.02?stage:null,
      material:profile?.material??(y<0?'silt':bedrockAt(x,z)),habitat};
  }

  function wetlandSection(month){
    wetland??=getWetland();
    const row=Math.round(.64*wetland.rows),width=wetland.cols+1;
    const state=wetland.frameFor(ridgeBayWetlandPhase(month));
    const section=wetland.points.slice(row*width,(row+1)*width);
    const origin=section[0];
    return {state,points:section.map((p,index)=>{
      const reading=state.readings[row*width+index];
      return {...sample({x:p.x,y:p.bed,z:p.z,distance:Math.hypot(p.x-origin.x,p.z-origin.z)},month),
        water:reading.flooded?p.bed+reading.depth:null,habitat:p.band};
    })};
  }

  function read(id,month=7){
    const station=ridgeBayStations.find(p=>p.id===id),frame=world.frames[month-1];
    if(!station||!Number.isInteger(month)||!frame)return null;
    const key=`${id}:${month}`;
    if(cache.has(key))return cache.get(key);
    const {ice,upper,main,wetland:wetlandRecord}=frame.records;
    let points=sections[id]?.map(p=>sample(p,month)),readings,explanation;
    if(id==='ridge'){
      points=points.map(p=>({...p,compareY:iceReference(p)}));
      const rock=formationMaterials[bedrockAt(station.x,station.z)];
      readings=[{label:'起点基岩',value:rock.name},metric('雪岭集水区降雪水当量',ice.snowfall,'m³'),
        metric('雪岭集水区融雪',ice.melt,'m³')];
      explanation='高脊把坡面水分向两侧。南侧样带接到冰雪集水区，北侧流进另一片局地集水区。高处遇冷积雪，谷内冰体覆盖岩面。冻融可沿岩石裂隙产生岩屑，冰体流经谷床也能长期磨蚀。这里用现有谷床和冰面显示地形关系。';
    }else if(id==='source-pool'){
      readings=[metric('上游冰雪区来水',upper.incoming,'m³'),metric('源河段坡面快流',upper.surface,'m³'),
        metric('源河段浅层补给',upper.baseflow,'m³')];
      explanation='冰碛湖靠较低的出口把融水送向源池。附近坡面落水更快到池，浅层蓄水则缓慢释放。月度读数来自同一套流域收支，蓝线跟随原有融水溪和出池水路。';
    }else if(id==='river-valley'){
      sediment??=buildSedimentYear(world);
      const reach=sediment.frames[month-1].reaches.main;
      const rock=formationMaterials[bedrockAt(channel.x,channel.z)];
      points=points.map(p=>({...p,compareY:valleyReference(p)}));
      readings=[{label:'断面下伏基岩',value:rock.name},
        metric('该断面水位',seasonalRiverLevel(valleyT,main.stage,wetlandRecord.stage),'m',2),
        metric('该段输出砂砾',reach.out.coarse,'m³',2),metric('该段输出细泥',reach.out.fine,'m³',2)];
      explanation='河谷上层的松散冲积物比完整基岩更容易被水带走。水沿低处集中，冲刷河槽，搬运砂砾与细泥。浅槽参考跨接两侧槽缘，用于看出下切空间。月度砂泥由本场景试算，基岩抗蚀性目前用来定性判读。';
    }else if(id==='wetland'){
      const wet=wetlandSection(month);
      points=wet.points;
      readings=[metric('湿地水位',wet.state.waterStage,'m',2),metric('比枯水期多淹面积',wet.state.floodedBank,'m²',0),
        metric('露出且仍湿面积',wet.state.damp,'m²',0)];
      explanation='水面只沿段内能和河道相通的低地扩展。低浅水岸和细泥保持水分，芦苇和莎草适合这里。较高滩地受淹较少，退水后可见滩地草本。';
    }else{
      sediment??=buildSedimentYear(world);
      const reach=sediment.frames[month-1].reaches.mouth;
      points=points.map(p=>({...p,compareY:bayReference(p,reach.deposited.coarse)}));
      readings=[metric('上游湿地流出总水量',wetlandRecord.outflow,'m³',0),
        metric('河口当月沉积砂砾',reach.deposited.coarse,'m³',2),metric('带向湾外的细泥',reach.out.fine,'m³',2)];
      explanation='分汊入湾后水流摊开，较粗的颗粒较早留在浅脊和缓流区，细泥有一部分继续移向外湾。参照线按当月沉积量说明容易加积的位置，固定水位用于比较断面。';
    }
    const result={station,month,points,readings,explanation,flows:flows[id]};
    cache.set(key,result);
    return result;
  }

  return {stations:ridgeBayStations,route:routeSurvey(),read};
}

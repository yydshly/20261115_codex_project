import {terrainHeight} from './large-world.js';
import {regionalThermal} from './regional-geography.js';
import {climateAt} from './annual-climate.js';
import {getWorldAnnualModel} from './world-climate-data.js';
import {ICE_LAKE,iceSample,iceSurface,snowDepthAt} from './glacial-geography.js';
import {BOREAL_SITES} from './boreal-layout.js';
import {SEA_FLOES} from './polar-layout.js';
import {coldGround,thawHollow} from './cold-ground.js';

export const coldMapHref=(focus='all')=>'expedition.html?plan=cold'+(focus==='all'?'':'&focus='+focus)+'#build-1';
export const coldSeasons={winter:{month:1,label:'1 月 · 冻结'},summer:{month:7,label:'7 月 · 融化'}};
export const coldColors={trees:'#99d58e',margin:'#e1d38d',open:'#b7997c',snow:'#edf8ff',ice:'#72cce6'};
const stop=(id,name,x,z,range,detail,extra={})=>({id,name,x,z,range,detail,...extra});
const {x:fx,z:fz}=SEA_FLOES[0],mixed=BOREAL_SITES[1],head=iceSample(0),trough=iceSample(.35);
const north=[
  stop('sea-ice','北境冷海与浮冰',fx,fz,360,'从低海拔开始。北向冷背景长时间压低近岸温度。海冰由海水冻结形成，山谷冰川来自陆上积雪。',{surface:0}),
  stop('tundra','苔原 · 多边形冻裂地',coldGround.x,coldGround.z,94,'表层缺少连续乔木，低草和苔藓成片。冻土冬季收缩，反复开裂与冰楔增长留下多边形边界。切换月份并打开地层剖面，比较冬季冻结和夏季活动层。'),
  stop('thaw','富冰土 · 热融浅洼',thawHollow.x,thawHollow.z,68,'富冰地层局部融化后体积减小，地面下沉。凹地可接住附近的地表水。当前演示切换结冰和积水状态，下沉是长期过程。'),
  stop('coast-edge','冷坡到混交林 · 纬向林缘',-790,-900,310,'低海拔继续向内陆和南侧过渡。山肩的局部高差会把林缘压向坡脚，较暖缓坡才逐步支持更高、更密的乔木。'),
  stop('mixed','北部针阔混交林',mixed.x,mixed.z,220,'向南的热量背景上升，在排水较好的缓坡上形成连续林冠。坡面、沟地和林下覆盖仍各有差别。')
];
const alpine=[
  stop('foot','青岚山脚 · 低处乔木带',850,-605,350,'山脚的纬向背景比北岸暖，同样的林缘条件在山坡上要到更高处才达到。沿山坡向上，海拔造成的冷却迅速增加。'),
  stop('alpine-edge','青岚上坡 · 海拔林线',900,-745,205,'沿坡升高后，热量降到乔木过渡带。用上方两条线路比较，北岸林缘与高山林线由同一冷暖指标判断。真实林线也受风、积雪与基底影响。'),
  stop('scree','高处冻融岩坡',782,-789,230,'风口与岩坡上有裸岩和碎屑。水进入裂隙后反复冻结和融化，经历长期扩裂与脱落，坡脚留下棱角碎石。'),
  stop('snowline','雪岭 · 夏末积雪下缘',470,-590,255,'陡岩、风口与背阴缓坡的积雪并不齐平。可见雪斑来自现有雪岭地形与坡度；蓝白带对照场景月度雪储，其中夏季仍保留的片段用于观察雪线。'),
  stop('cirque','雪岭冰斗 · 冰川源头',head.x,head.z,280,'冰川源头的凹形谷头让积雪集中。多年冰流拔蚀、磨蚀底部和两侧，场景用碗形三面高脊与敞开的下坡出口表达冰斗。',{surface:iceSurface(head,0)}),
  stop('trough','冰川中段 · U 形横谷',trough.x,trough.z,285,'过冰川横切可看到较宽的谷底和陡起的两壁。开启剖面看冰面下的谷床，从这里顺地势下泄到冰碛湖。',{surface:iceSurface(trough,0)}),
  stop('moraine','冰碛湖 · 退冰与融水',ICE_LAKE.x,ICE_LAKE.z,300,'冰退后露出原先占据的谷段，冰缘堆积和地形高差为湖水留下蓄积空间。融水沿湖口下泄，接到现有顺水线。',{surface:ICE_LAKE.level})
];
const point=(x,z)=>({x,z});
export const coldRoutes=[
  {id:'north',name:'北岸低海拔带',color:'#b7dac5',stops:north,path:[...north.slice(0,3),point(-645,-1148),point(-663,-1100),
    point(-625,-1080),point(-680,-956),north[3],point(-875,-776),point(-980,-723),north[4]]},
  {id:'alpine',name:'青岚—雪岭高山带',color:'#9acfff',stops:alpine,path:[...alpine.slice(0,3),point(740,-767),
    point(690,-700),point(619,-650),...alpine.slice(3,5),...Array.from({length:30},(_,i)=>iceSample((i+1)/30)),
    point(240,-216),alpine[6]]}
];
export const coldAuditPaths=coldRoutes.map(route=>route.path.map(p=>[p.x,p.z]));
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const blend=(a,b,t)=>a+(b-a)*t;
export function coldTreeBand(warmth){
  return warmth>=.404?'trees':warmth>=.370?'margin':'open';
}
export const coldBandNames={trees:'乔木适生带',margin:'林线过渡带',open:'冷凉开敞带',snow:'月度雪储带',ice:'冰雪／水面'};
export function coldSurface(x,z,y){
  const sx=(terrainHeight(x+2,z)-terrainHeight(x-2,z))/4;
  const sz=(terrainHeight(x,z+2)-terrainHeight(x,z-2))/4;
  return {slope:Math.hypot(sx,sz),snowDepth:snowDepthAt(x,z,y,Math.hypot(sx,sz))};
}
export function coldReading(p,season,model=getWorldAnnualModel()){
  const y=p.y??terrainHeight(p.x,p.z),{warmth,latitude,cooling}=regionalThermal(p.z,y);
  const month=coldSeasons[season].month;
  const seasonal=climateAt(model,model.frames[month-1],p.x,p.z);
  return {y,warmth,latitude,cooling,...seasonal,band:y<0?'ice':coldTreeBand(warmth)};
}

export function coldProfile(path,elevation=terrainHeight,step=8){
  const points=[];let metres=0;
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],length=Math.hypot(a.x-b.x,a.z-b.z),count=Math.max(1,Math.ceil(length/step));
    for(let j=i===1?0:1;j<=count;j++){
      const t=j/count,x=blend(a.x,b.x,t),z=blend(a.z,b.z,t);
      points.push({x,z,y:elevation(x,z),metres:metres+length*t});
    }
    metres+=length;
  }
  return {points,length:metres};
}

export function glacierCrossSection(t=.35,elevation=terrainHeight){
  const p=iceSample(t),span=2.12*p.half;
  return Array.from({length:81},(_,i)=>{
    const offset=blend(-span,span,i/80),x=p.x+p.nx*offset,z=p.z+p.nz*offset;
    const y=elevation(x,z),u=offset/p.half;
    return {x,z,y,metres:offset+span,ice:Math.abs(u)<1?Math.max(y,iceSurface(p,u)):y};
  });
}

export function activeLayer(season,warmth){
  // Scene depth in metres for the same ice-rich coastal plot.
  return season==='winter'?.06:.44+clamp((warmth-.32)*6,0,.29);
}

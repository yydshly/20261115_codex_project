import {terrainHeight} from './large-world.js';
import {climateAt,windName} from './annual-climate.js';
import {buildFormationStudy,formationCell} from './world-formation.js';
import {leeSwaleZ,rainDivideX,regionalClimate} from './regional-geography.js';
import {tropicalChannel,tropicalRiverField} from './tropical-layout.js';
import {connectedWetCells} from './wetland-layout.js';

export const warmBeltHref='expedition.html?plan=rain-shadow#build-1';
export const warmSeasons={wet:{month:7,name:'7 月 · 雨季'},dry:{month:1,name:'1 月 · 旱季'}};
export const warmColors={ridge:'#e8d296',water:'#57bddf',damp:'#83dfbc'};
const stop=(id,name,x,z,distance,detail)=>({id,name,x,z,distance,detail});
const bank=tropicalChannel(.36);
export const warmStops=[
  stop('forest','雨林河岸 · 漫水低滩',bank.x,bank.z,186,'西南来水在雨林河谷集中。雨季出流抬高时，水从河槽连到低滩。旱季露出的细泥仍能保湿，高岸的乔木留在原位。'),
  stop('windward','西南迎风坡 · 水汽抬升',-644,1100,318,'7 月湿风遇到西侧坡面抬升，迎风坡降雨增强。切到 1 月对照风向和雨量。沿着同一张图向东越岭，近背风坡更少得到这股来水。'),
  stop('ridge','南部主脊 · 分隔迎背风坡',-625,1107,260,'主脊把上坡与下坡分开。雨季主风越过脊线后在近背风段下沉。坡面落下的雨各自沿局地高差下行，地表水不越岭横流。'),
  stop('woodland','背风坡 · 疏林长草',-495,1150,228,'相邻地段的乔木从连片林冠变为间隔明显的斑块。木本位置跨季节固定。草层随根区水分变绿、长高，脊背和薄土处保持较疏的覆盖。'),
  stop('flood-grass','浅沟低草地 · 局地季节积水',-443,leeSwaleZ(-443),156,'背风侧也会下雨。附近坡面来水积在已有浅沟里，低草地先积水，稍高处形成湿草和莎草带，较干的坡肩留下开阔高草与零散乔木。'),
  stop('gravel','草地外缘 · 砾土与稀疏地被',-202,1141,249,'更远的背风侧缺少湿林的水汽背景，砾土坡和离沟较远的地面较干。雨季的地被可以变绿，乔木仍集中在条件更稳定的位置。'),
  stop('gully','干谷 · 沟底与砾坡',100,1270,235,'沟床是低点，局地雨水可沿谷底汇流。对照较远的砾土坡，靠沟地面雨后相对湿润。干谷和背风浅沟各自汇水，浅沟的积水不来自西侧雨林河漫滩。')
];
export const warmPath=[warmStops[0],{x:-1111,z:1118},{x:-970,z:1100},{x:-837,z:979},
  {x:-758,z:1030},{x:-677,z:1095},...warmStops.slice(1,3),{x:-546,z:1121},warmStops[3],warmStops[4],
  {x:-375,z:1198},{x:-268,z:1207},warmStops[5],{x:-55,z:1194},warmStops[6]];

const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const mix=(a,b,t)=>a+(b-a)*t;
export const warmAuditPath=warmPath.map(({x,z})=>[x,z]);

export function warmBeltProfile(elevation=terrainHeight){
  const points=[];let length=0;
  for(let j=1;j<warmPath.length;j++){
    const a=warmPath[j-1],b=warmPath[j],d=Math.hypot(a.x-b.x,a.z-b.z),count=Math.ceil(d/7);
    for(let i=j===1?0:1;i<=count;i++){
      const t=i/count,x=mix(a.x,b.x,t),z=mix(a.z,b.z,t);
      points.push({x,z,y:elevation(x,z),distance:length+d*t});
    }
    length+=d;
  }
  return {points,length};
}

function patch(rows,cols,sample,elevation){
  const bed=[],cells=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const p=sample(j/rows,2*i/cols-1);
    bed.push({...p,bed:elevation(p.x,p.z)});
    if(i<cols&&j<rows){
      const k=j*(cols+1)+i;
      cells.push({indices:[k,k+1,k+cols+1,k+cols+2]});
    }
  }
  return {bed,cells,cols:cols+1};
}

export function makeWarmBelt(world,elevation=terrainHeight){
  const study=buildFormationStudy(world),{climate,frames}=world;
  const flow=m=>frames[m-1].records.south.outflow;
  const low=flow(1),high=flow(7),relative=q=>clamp((q-low)/Math.max(1,high-low));
  const river=patch(45,38,(u,v)=>{
    const t=mix(.322,.403,u),p=tropicalChannel(t),offset=1.92*v*p.half;
    return {x:p.x+p.nx*offset,z:p.z+p.nz*offset,t,breadth:v*1.92,reference:p.level,weight:Math.sin(u*Math.PI)**.66};
  },elevation);
  const swale=patch(49,34,(u,v)=>{
    const x=mix(-475,-370,u);
    return {x,z:leeSwaleZ(x)+v*20,breadth:v,reference:23.53,weight:Math.sin(u*Math.PI)**.64};
  },elevation);
  const wetness=(x,z,month)=>{
    const k=formationCell(study.grid,x,z);
    if(!world.hydraulics[k])return 0;
    return study.read(k,month).moisture;
  };
  const swaleMoisture=month=>wetness(-460,1165,month);
  const makeView=(ground,level,comparison)=>{
    const {bed,cols,cells}=ground;
    const mask=connectedWetCells(bed,cols,p=>level(p)-p.bed-.012);
    const referenceAt=p=>comparison==='river'?tropicalChannel(p.t).level:23.53;
    const extra=bed.map((p,k)=>mask[k]&&p.bed>=referenceAt(p));
    let area=0;
    for(const {indices} of cells){
      const [a,b,c]=indices.map(k=>bed[k]);
      const a2=Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x));
      area+=a2*indices.filter(k=>extra[k]).length/4;
    }
    return {ground,level,mask,extra,referenceAt,area};
  };
  const views=Object.fromEntries(Object.entries(warmSeasons).map(([id,{month}])=>{
    const q=flow(month),rise=.9*relative(q)**.74;
    const fill=clamp((swaleMoisture(month)-.40)/.17);
    const riverView=makeView(river,p=>p.reference+rise*p.weight,'river');
    const swaleView=makeView(swale,p=>p.reference+.84*fill*p.weight,'swale');
    return [id,{month,q,rise,wind:world.climate.frames[month-1].wind,river:riverView,swale:swaleView}];
  }));

  function read(p,season){
    const {month,wind}=views[season],{x,z}=p,y=p.y??elevation(x,z);
    const weather=climateAt(climate,climate.frames[month-1],x,z);
    const raw=regionalClimate(x,z,y);
    const moisture=wetness(x,z,month);
    return {y,month,wind:windName(wind.bearing),lift:weather.lift,rain:weather.rain,
      moisture,background:raw.moisture,lee:x>rainDivideX(z)};
  }
  return {views,read,profile:warmBeltProfile(elevation)};
}

// Rain and soil feed the seasonal grass response. Long-lived wood stays in place.
export function warmPlantPlan(model,elevation=terrainHeight){
  const wood=[],grass=[],banks=[],hash=(i,s)=>{
    const f=Math.sin(i*81.739+s*17.811)*43758.5453;return f-Math.floor(f);
  };
  for(let i=0;i<2400;i++){
    const x=-581+hash(i,1)*378,z=1098+hash(i,2)*160,y=elevation(x,z),swale=leeSwaleZ(x);
    const wet=model.read({x,z,y},'wet'),dry=model.read({x,z,y},'dry');
    const distance=Math.abs(z-swale);
    const offTrail=Math.min(...warmStops.slice(3,6).map(p=>Math.hypot(p.x-x,p.z-z)));
    const east=clamp((x+580)/380),background=(wet.background+dry.background)*.5;
    const eligible=distance>22&&offTrail>14&&y>23&&east<.88&&hash(i,7)<background*.55;
    if(i%12===0&&eligible&&wood.every(p=>Math.hypot(p.x-x,p.z-z)>13))
      wood.push({x,z,y,seed:hash(i,8),height:3.9+3.05*background+1.6*hash(i,3)});
    if(offTrail<2.5||hash(i,6)>.77-east*.31)continue;
    const end=model.views.wet.swale;
    const col=Math.round((z-swale+20)/40*(end.ground.cols-1)),row=Math.round((x+475)/105*49);
    const k=row*end.ground.cols+col,valid=row>=0&&row<=49&&col>=0&&col<end.ground.cols;
    const flooded=valid&&end.extra[k];
    grass.push({x,z,y,seed:hash(i,4),wet:wet.moisture,dry:dry.moisture,flooded});
  }
  const {bed}=model.views.wet.river.ground;
  for(let k=0;k<bed.length;k+=3){
    const p=bed[k],wet=model.views.wet.river;
    if(Math.abs(p.breadth)<1.11||Math.abs(p.breadth)>1.73||hash(k,2)>.77||p.bed<p.reference)continue;
    const onFlood=wet.extra[k],moist=Math.exp(-Math.max(0,p.bed-wet.level(p))/.39);
    if(!onFlood&&moist<.22)continue;
    const q=tropicalRiverField(p.x,p.z);
    if(q.salt>.08)continue;
    banks.push({x:p.x,z:p.z,y:p.bed,seed:hash(k,8),wet:.73+moist*.27,dry:.37+moist*.27,
      flooded:onFlood});
  }
  return {wood,grass,banks};
}

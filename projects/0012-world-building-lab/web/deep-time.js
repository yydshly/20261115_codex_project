import {terrainHeight} from './large-world.js';
import {waterAt} from './water-system.js';
import {isPaleoWetland,paleoSources,paleoWater,paleoWetlandCases,paleoWetlandPoint} from './paleo-wetlands.js';
import {cambrianCase,cambrianPoint,cambrianSources} from './cambrian-margin.js';
import {isMesozoicRiver,mesozoicCases,mesozoicPoint,mesozoicSources,mesozoicWater} from './mesozoic-rivers.js';

export const deepTimeSources={
  ...paleoSources,
  ...mesozoicSources,
  cambrian:cambrianSources.delta,
  seaway:{name:'USGS · 西部内陆海道地层剖面',url:'https://www.usgs.gov/publications/west-east-lithostratigraphic-cross-section-cretaceous-rocks-central-utah-western'},
  forest:{name:'埃尔斯米尔岛原位化石森林调查',url:'https://journalhosting.ucalgary.ca/index.php/arctic/article/view/64792'}
};

export const deepTimeCases={
  seaway:{
    name:'晚白垩世内陆海道',age:'晚白垩世 · 北美西部内陆海道类比',
    start:'flooded',center:[40,60],
    intro:'山前供砂，低盆地给水和沉积物留出空间。海水从南北两端接入低地，退水时岸线向海道中央退移。',
    phases:{
      flooded:{name:'海侵高水位',level:20,detail:'相对水位高时，水面越过缓坡和部分砂脊。较深、较静的海道中央适合积累细泥。'},
      retreat:{name:'海退低水位',level:-12,detail:'相对水位降低，近岸砂带和原浅海底重新出露，水仍从较深的海道轴通过。'},
      now:{name:'现代对照',detail:'回到同一地图坐标，观察现有狭窄湾口和中央陆地如何替代这片贯通低地。'}
    },
    stops:[
      {id:'upland',name:'山前砂源',x:-1395,z:0,range:265,detail:'西侧高地为沉积系统提供砂和粉砂，山前坡降向低盆地迅速减小。'},
      {id:'plain',name:'滨海平原',x:-690,z:65,range:205,detail:'低缓平原离海道中心较远。浅洼先受高水位影响，稍高的平原仍露出。'},
      {id:'sand',name:'岸边砂脊',x:-270,z:115,range:290,detail:'波浪和沿岸水流可在浅水带集中砂。切换水位，比较砂脊的露出和淹没。'},
      {id:'channel',name:'海道轴与泥床',x:510,z:135,range:420,detail:'向海道中央远离主要供砂岸，细颗粒更容易在低能水域沉积。可揭开水面看泥床。'},
      {id:'east',name:'对岸低地',x:1230,z:160,range:250,detail:'越过海道回到东缘缓坡，验证它是大陆内部贯通的浅海，两侧都有陆地。'}
    ]
  },
  forest:{
    name:'始新世高纬暖湿林',age:'约 5,000 万年前 · 埃尔斯米尔岛化石森林类比',
    start:'day',center:[125,-1020],
    intro:'较暖的高纬背景容许树木生长。低地河流和洪泛为林地提供水分，纬度仍控制一年中的日照节律。',
    phases:{
      day:{name:'夏季长昼',level:4,detail:'高纬夏季日照时间长，太阳也能以较低角度照进河谷。温暖、湿润且有一定排水的地方形成较高林冠。'},
      night:{name:'冬季长夜',level:4,detail:'同一处林地进入高纬长夜。示范中落叶型枝冠变疏，常绿型保留叶片，河槽与浅洼仍在原位。'},
      now:{name:'现代对照',detail:'回到北部冷岸和林地。两期共享比较坐标，古林地的河槽和树木分布按古环境独立构建。'}
    },
    stops:[
      {id:'river',name:'曲流与砂质点坝',x:-582,z:-1138,range:160,detail:'河道凸岸的低位砂地经常被水扰动。河岸外侧高一些，开始有疏林。'},
      {id:'floodplain',name:'季节性河漫滩',x:-187,z:-1123,range:112,detail:'细颗粒在河漫滩积累。地表略高于常水位，洪水可以越岸，退水后可长出林下地被。'},
      {id:'peat',name:'积水洼地与有机层',x:158,z:-904,range:96,detail:'浅洼排水缓慢。长期水湿可减慢有机物分解，帮助理解化石树桩为何与煤层伴生。'},
      {id:'canopy',name:'湿润高滩与林冠',x:535,z:-850,range:108,detail:'高滩土壤湿润又有排水，落叶型和常绿型树冠在此形成连续林地。'},
      {id:'terrace',name:'较高河阶',x:720,z:-758,range:165,detail:'离开低洼蓄水区，地表变干，树高和密度随坡面排水条件改变。'}
    ]
  },
  ...paleoWetlandCases,
  ...mesozoicCases,
  cambrian:cambrianCase
};

export function deepTimeHref(id,station){
  return 'expedition.html?plan=deep-time&case='+id+(station?'&station='+station:'')+'#build-1';
}

export const deepTimeAuditPaths=Object.values(deepTimeCases).map(({stops})=>stops.map(({x,z})=>[x,z]));
export const forestRiverZ=x=>-1090+76*Math.sin(x/365)+36*Math.sin(x/147);
export const forestWater=p=>4-.0011*p.x;
const clamp=value=>Math.max(0,Math.min(1,value));
const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
const wave=(x,z)=>Math.sin(x*.019+z*.008)*Math.cos(z*.015-x*.008);
const gauss=value=>Math.exp(-value*value);

function seawayBed(x,z){
  const axis=500+105*Math.sin(z/460)+60*Math.sin(z/228);
  const d=x-axis;
  const corridor=-53+Math.min(1,Math.abs(d)/(d<0?1040:850))**1.4*76;
  const hills=245*gauss((x+1590)/430)*(1+.20*Math.sin(z/190))+
    115*gauss((x-1560)/410)*(1+.23*Math.sin(z/205+1));
  const coastalRidges=10*gauss((d+795)/75)*(1+.36*Math.sin(z/165))+
    5*gauss((d+625)/38)*Math.cos(z/128);
  return corridor+hills+coastalRidges+1.55*wave(x,z);
}

function forestBed(x,z){
  const delta=z-forestRiverZ(x),d=Math.abs(delta);
  const terrace=38*ease((d-128)/370);
  const hills=(224*gauss((x+1320)/530)+145*gauss((z-190)/600)*(1+.45*Math.sin(x/435)))*ease((d-140)/460);
  const pools=6.9*gauss(Math.hypot((x-158)/92,(z+904)/44))+
    5.3*gauss(Math.hypot((x+340)/112,(z+1255)/49));
  return forestWater({x})+2.7+terrace+hills-6.2*gauss(delta/26)-pools+
    .86*wave(x,z)+.36*Math.sin(x*.062-z*.023);
}

export function deepTimeWaterLevel(id,phase,x,z){
  if(id==='cambrian')return 0;
  if(isMesozoicRiver(id))return mesozoicWater(id,phase,x,z);
  if(isPaleoWetland(id))return paleoWater(id,phase,x);
  return id==='forest'?forestWater({x}):deepTimeCases[id].phases[phase].level;
}

export function deepTimePoint(id,phase,x,z){
  if(phase==='now'){
    const bed=terrainHeight(x,z);
    if(isPaleoWetland(id)||isMesozoicRiver(id)||id==='cambrian'){
      const level=waterAt(x,z)?.level??(bed<0?0:null);
      const depth=level===null?0:Math.max(0,level-bed);
      return {bed,level,depth,habitat:depth>0?(id==='cambrian'?'现代海岸水域':'现代河道或湿地水面'):'现代地表'};
    }
    return {bed,level:bed<0?0:null,depth:Math.max(0,-bed),habitat:bed<0?'现今海床':'现代地表'};
  }
  if(id==='cambrian')return cambrianPoint(phase,x,z);
  if(isMesozoicRiver(id))return mesozoicPoint(id,phase,x,z);
  if(isPaleoWetland(id))return paleoWetlandPoint(id,phase,x,z);
  if(id==='seaway'){
    const level=deepTimeCases.seaway.phases[phase].level,bed=seawayBed(x,z),depth=Math.max(0,level-bed);
    const habitat=depth>26?'海道细泥床':depth>0?'近岸水下砂泥':bed<20?'出露砂滩':bed<95?'滨海平原':'山前砂源';
    return {bed,level,depth,habitat};
  }
  const bed=forestBed(x,z),level=forestWater({x}),depth=Math.max(0,level-bed);
  const d=Math.abs(z-forestRiverZ(x)),dry=bed-level;
  const habitat=depth>0?(d<29?'河道':'低洼积水'):dry<1.6?'湿泥与低滩':dry<3.3?'河漫滩林下':dry<13?'湿润高滩林':'排水较好的河阶';
  return {bed,level,depth,habitat};
}

export function deepTimeProfile(id,phase){
  const {stops}=deepTimeCases[id];
  return stops.slice(1).flatMap((b,index)=>{
    const a=stops[index];
    return Array.from({length:index===0?49:48},(_,i)=>{
      const t=(i+Number(index>0))/48,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      return {x,z,...deepTimePoint(id,phase,x,z)};
    });
  });
}

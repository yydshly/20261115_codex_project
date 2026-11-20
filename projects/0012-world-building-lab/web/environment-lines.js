import {ICE_LAKE,iceSample,meltSample} from './glacial-geography.js';
import {riverSample} from './water-system.js';
import {climateAt} from './annual-climate.js';
import {regionalClimate} from './regional-geography.js';
import {drylandHabitat} from './dryland-layout.js';
import {transitionAt,transitionClimate} from './environment-transitions.js';
import {COAST,LOCAL} from './watershed-balance.js';

const clamp=v=>Math.min(1,Math.max(0,v));
const mix=(a,b,t)=>a+(b-a)*t;
export const sweep=(n,sample)=>Array.from({length:n+1},(_,i)=>sample(i/n));

function point(x,z){return {x,z};}
const coldPath=[
  [-708,-1210],[-705,-1170],[-625,-1080],[-680,-956],[-790,-839],[-875,-776],[-980,-723],
  [-1100,-687],[-945,-657],[-784,-535],[-639,-369],[-595,-153],[-555,-63],[-394,66],
  [-242,193],[-149,333],[-156,526],[-88,604],[7,660],[86,692],[173,700],[219,723],
  [56,769],[-214,824],[-461,864],[-650,930],[-840,941],[-1100,1043],[-1370,1125],[-1601,1280]
].map(([x,z])=>point(x,z));
const inlandPath=[
  [-1860,1206],[-1745,1212],[-1650,1213],[-1530,1187],[-1340,1130],[-1134,1094],
  [-944,1040],[-837,979],[-758,1030],[-677,1095],[-625,1107],[-550,1064],[-464,1024],
  [-420,1000],[-328,1069],[-100,1150],[105,1246],[270,1349],[307,1366]
].map(([x,z])=>point(x,z));

const iceTop=t=>{const s=iceSample(t);return {...s,level:s.bed+s.thickness};};
const waterPath=[
  ...sweep(42,iceTop),...sweep(36,t=>meltSample(0,t)),ICE_LAKE,
  ...sweep(49,t=>meltSample(1,t)),...sweep(260,riverSample)
];
const stop=(id,name,p,distance,detail)=>({id,name,p,distance,detail});

export const environmentLines=[
  {id:'water',name:'顺水',color:'#82deef',path:waterPath,
    lead:'沿同一条出海水系看坡降、汇流、沉积和岸地的变化。北部支流在湿地上游汇入。',
    stops:[
      stop('snow','雪岭冰川',iceTop(.18),440,'高海拔雪冰提供季节性补给。先辨认冰面和下方的融水方向。'),
      stop('ice-lake','冰碛湖',ICE_LAKE,355,'融水先进入冰碛湖，湖底和出口的高差决定哪里蓄水、哪里继续下泄。'),
      stop('source','融水与源池',meltSample(1,.77),290,'出湖水沿窄沟下切，接入中央主河源池。越陡的坡段流路越集中。'),
      stop('valley','河谷坡脚',riverSample(.36),340,'河水从高坡落到低谷，水道变宽，水边出现沉积地表和湿岸植被。'),
      stop('join','北支汇口',riverSample(.62),420,'北部扇面与岩层两支先合流，再汇进中央主河。向紫色分水界外看，另一侧的来水另有去处。'),
      stop('wetland','苇泽湿地',riverSample(.675),345,'坡降变缓，涨水在岸边扩开。退水后细泥留在低滩，莎草和芦苇沿水边分布。'),
      stop('estuary','分汊河口',riverSample(.84),430,'河流在低平河口分支，流速减慢，砂砾在浅脊累积。可沿岸比较淡水植物和耐盐植物。'),
      stop('bay','中央海湾',riverSample(.97),550,'水系在海湾接入开阔海面。淡水、泥沙和咸水共同塑造河口与近岸。')
    ]},
  {id:'warmth',name:'南北冷暖',color:'#c3ed91',path:coldPath,
    lead:'从较冷北境走到南部暖湿岸地。纬向冷暖是背景，高差、水汽与距海继续改变当地环境。',
    stops:[
      stop('polar','北境海岸',coldPath[0],465,'高纬冷背景下，北境靠近冷海和冰地。低岸以裸露基底、矮草和疏灌为主。'),
      stop('slope','北境冷坡',coldPath[3],385,'离开冰岸后，坡面接上冷坡丘陵，薄土和苔草逐渐接入林缘。地表和低矮植被在此补了一段过渡。'),
      stop('mixed','针阔混交林',coldPath[7],405,'地势从冷坡转为林地缓坡，乔木密度增加。沿林地下缘看两支溪谷绕过坡脚并下行。'),
      stop('plain','温带河谷与平原',coldPath[15],540,'向南跨过中央河谷后到平原。低坡水分能留在沟地，排水较好的地面有更开阔的草地。'),
      stop('foothill','南部湿沟与暖坡',coldPath[19],370,'从平原浅沟进入南部丘坡。当近海补充水汽时，草丛、矮灌和竹林的边缘可接在同一坡面。'),
      stop('forest','南部湿热林缘',coldPath[26],435,'相对更低纬的陆侧在西南水汽作用下更暖湿，乔木冠层增高，河岸与较干坡面仍有明显差别。'),
      stop('warm-shore','红树林潮沟',coldPath.at(-1),450,'低纬海岸还受咸淡水和淹水影响。雨林岸带在入海口过渡为能耐盐湿的红树林。')
    ]},
  {id:'inland',name:'海岸到内陆',color:'#ffc185',path:inlandPath,
    lead:'沿西南水汽上岸的方向剖开地形，再走向背风坡、砾地和干谷。',
    stops:[
      stop('ocean','西南外海',inlandPath[0],530,'夏季模式下，暖湿空气由西南海面向陆地输送。切到 1 月看主风转向与较低的水汽背景。'),
      stop('coast','浅岸和红树林',inlandPath[2],440,'先跨海陆交界。近岸低地有潮沟和耐盐植被，高一点的淡水河岸接上湿热林地。'),
      stop('windward','迎风抬升坡',inlandPath[9],460,'海上水汽增加低岸湿度，空气遇坡抬升。这里取样于上坡，切月或到背风坡比较降雨指标。'),
      stop('ridge','南部山脊',inlandPath[10],380,'山脊组织前后坡。黄色脊线标高地走向，紫线用实际地形的格网汇水路径估计分界。'),
      stop('lee','雨影林草坡',inlandPath[12],390,'越过主脊之后，背风坡转低，成片树林渐成草地和砾土。季节性浅沟的草带沿沟底延伸。'),
      stop('gobi','戈壁与砾地',inlandPath[15],440,'干地地被变疏，砾石更明显。可与上一段湿林对照，把干区位置同距海和背风条件联系起来。'),
      stop('oasis','干谷泉池与绿洲',inlandPath[17],370,'泉池周围局部重新变湿，绿带依附盆缘水源。西部内流盐盆是地图里的另一种蓄水方式。')
    ]}
];

export function sampleLine(route,elevation,step=9){
  const points=[];
  let distance=0;
  for(let i=0;i<route.path.length;i++){
    const end=route.path[i],start=route.path[Math.max(0,i-1)];
    const length=Math.hypot(end.x-start.x,end.z-start.z);
    const steps=Math.max(1,Math.ceil(length/step));
    for(let j=1;j<=steps;j++){
      const t=j/steps,x=mix(start.x,end.x,t),z=mix(start.z,end.z,t);
      const y=elevation(x,z),level=end.level===undefined?y:mix(start.level??y,end.level,t);
      points.push({x,z,y,level,distance:distance+length*t});
    }
    distance+=length;
  }
  const stations=route.stops.map(station=>{
    const {p}=station;
    const nearest=points.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<=Math.hypot(b.x-p.x,b.z-p.z)?a:b);
    return {...station,at:nearest.distance,y:elevation(p.x,p.z),level:p.level??elevation(p.x,p.z)};
  });
  return {...route,points,stations,length:distance};
}

export function pointAt(points,distance){
  let lo=0,hi=points.length-1;
  while(hi-lo>1){
    const mid=(lo+hi)>>1;
    if(points[mid].distance<distance)lo=mid;else hi=mid;
  }
  const a=points[lo],b=points[hi],t=clamp((distance-a.distance)/Math.max(.01,b.distance-a.distance));
  return {x:mix(a.x,b.x,t),z:mix(a.z,b.z,t),y:mix(a.y,b.y,t),level:mix(a.level,b.level,t)};
}

export function basinGroup(owner,bodies){
  if(owner<0)return owner===COAST?'coast':'unresolved';
  const id=bodies[owner].id;
  if(id==='salt'||id==='saltMarsh')return 'closed';
  return id==='south'?'south':'central';
}

export function terrainBoundaries(world){
  const {climate:{grid:{cols,rows,step,x0,z0},height},graph,bodies}=world;
  const coast=[],divides=[],localDivides=[];
  const sinks=new Int32Array(height.length).fill(-1),counts=new Map();
  const downhill=Array.from(height.keys()).filter(k=>graph.owner[k]===LOCAL).sort((a,b)=>height[a]-height[b]);
  for(const k of downhill){
    const next=graph.next[k],sink=next>=0?sinks[next]:k;
    sinks[k]=sink;
    counts.set(sink,(counts.get(sink)??0)+1);
  }
  const substantial=k=>sinks[k]>=0&&(counts.get(sinks[k])??0)>=7;
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const k=j*cols+i,x=x0+i*step,z=z0+j*step,h=step/2;
    function add(to,edge){
      const water=Boolean(graph.ocean[k]),other=Boolean(graph.ocean[to]);
      if(water!==other)coast.push(edge);
      if(water||other)return;
      const a=basinGroup(graph.owner[k],bodies),b=basinGroup(graph.owner[to],bodies);
      if(a!==b&&a!=='unresolved'&&b!=='unresolved'&&(a!=='coast'||b!=='coast'))divides.push(edge);
      if(a==='unresolved'&&b==='unresolved'){
        if(sinks[k]!==sinks[to]&&substantial(k)&&substantial(to))localDivides.push(edge);
      }else if(a==='unresolved'?substantial(k):b==='unresolved'&&substantial(to)){
        localDivides.push(edge);
      }
    }
    if(i<cols-1)add(k+1,[point(x+h,z-h),point(x+h,z+h)]);
    if(j<rows-1)add(k+cols,[point(x-h,z+h),point(x+h,z+h)]);
  }
  return {coast,divides,localDivides};
}

export function stopClimate(climate,frame,station){
  const {p,y}=station;
  const local=climateAt(climate,frame,p.x,p.z);
  const normal=transitionClimate(regionalClimate(p.x,p.z,y),transitionAt(p.x,p.z));
  const oasis=drylandHabitat(p.x,p.z)?.oasis??0;
  return {...local,warmth:clamp(normal.warmth+frame.wind.heat*.41),
    wetness:Math.max(normal.moisture,oasis*.95)};
}

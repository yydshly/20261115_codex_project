import {sampleLine} from './environment-lines.js';
import {OCEAN} from './ocean-layout.js';
import {LAVA_CRATER} from './volcanic-layout.js';
import {FALL_T,riverSample} from './water-system.js';
import {sectionSample} from './tectonic-section-data.js';

export const tectonicLayers=[
  {id:'boundary',name:'板块边界',color:'#ffc277'},
  {id:'margin',name:'陆缘与海沟',color:'#78dde5'},
  {id:'volcano',name:'火山弧',color:'#ff956d'},
  {id:'fold',name:'断层与褶皱',color:'#dcb3ff'},
  {id:'landforms',name:'坡面与河谷站',color:'#bce4a2'}
];

const fallT=FALL_T+.003,joinT=.40,valleyT=.53;
const valley=riverSample(valleyT);
const bank=(p,offset)=>({x:p.x+p.nx*offset,z:p.z+p.nz*offset});
const valleyBank=offset=>bank(valley,offset);

export const tectonicStops=[
  {id:'trench',name:'东南海沟',x:1810,z:1400,distance:490,layer:'boundary',seabed:true,
    detail:'海洋板块在东南缘向陆地下方弯折，地图中最深的窄槽落在这条板块边界上。箭头指海洋板块相对陆块的汇聚方向。'},
  {id:'margin',name:'大陆架与大陆坡',x:1495,z:870,distance:560,layer:'margin',seabed:true,
    detail:'从海沟向陆地回望，深海底先接较陡的大陆坡，再接地势较平缓的浅水陆架。岩石骨架越出海面的位置才是海岸线。'},
  {id:'forearc',name:'海岸前弧',x:1210,z:410,distance:500,layer:'margin',
    detail:'海沟和火山弧之间是前弧。部分海底沉积物可被刮削、堆积到陆缘。这里的海岸在陆块上，和外海的板块边界相隔一段距离。'},
  {id:'volcano',name:'东部火山弧',...LAVA_CRATER,distance:470,layer:'volcano',
    detail:'下沉的板片在深处释放流体，促进上方地幔部分熔融。岩浆向上运移，沿火山弧集中喷发。现有熔岩与玄武岩场位于这条弧上。'},
  {id:'fault',name:'山前逆冲断层',x:1000,z:-1040,distance:255,layer:'fold',
    detail:'岩层受压可沿倾斜破裂面滑动。一侧岩层被推到另一侧上方，同一条浅色岩层在断面两边出现错位。'},
  {id:'fold',name:'褶皱山前',x:1135,z:-1100,distance:300,layer:'fold',
    detail:'在另一处露头，挤压缩短岩层，同一层沿露头拱起又下弯。长期缩短、抬升与后来的侵蚀共同塑造现有山前起伏。'},
  {id:'ridge',name:'青岚高山',x:1650,z:-1400,distance:580,layer:'fold',
    detail:'青岚高山在内陆抬升带。断层与褶皱提供地势高差，暴露的岩石继续受风化，冰雪与流水再塑造坡谷。沿剖面转向较低的结晶岩坡。'},
  {id:'weathering',name:'青岚结晶岩坡 · 风化层',x:1330,z:-1160,distance:300,layer:'landforms',
    detail:'这里采用和岩性底图一致的结晶岩。岩面沿裂隙风化，岩屑可暂留在较缓的坡面。陡面更易失去松散覆盖；打开风化与沉积层，对照贴在实景高程下的覆盖带。'},
  {id:'saddle',name:'山脊鞍部 · 跨向雪岭一侧',x:855,z:-810,distance:380,layer:'landforms',
    detail:'剖面穿过山脊较低的鞍部，从青岚侧转向雪岭侧。岩性相同的两处坡面也会因坡度和保存条件不同，留下不同厚薄的覆盖层。下游蓝色箭头从地图实际河道开始。'},
  {id:'incision',name:'雪岭下游 · 跌水与窄槽',...riverSample(fallT),distance:325,layer:'landforms',
    detail:'从陡段看水怎样越过原有岩阶，再沿较窄河槽下行。对照浅色现地剖面和蓝色水位，可分辨水面、河床和两侧坡面。岩屑可以随水搬运，河床在长期侵蚀下继续变化。'},
  {id:'confluence',name:'出湖河与中央河汇口',...riverSample(joinT),distance:315,layer:'landforms',
    detail:'从雪岭一侧沿中央主河到汇口，河床已下降。澄镜湖出水从另一侧并入；可以从实景分辨主槽、支流和与水路相邻的陆地。'},
  {id:'valley',name:'中央河谷 · 横切河床与低滩',...valley,distance:300,layer:'landforms',
    detail:'剖面在终点横跨中央河道，两岸低滩覆盖冲积砂砾和细料，底下仍是岩性底图的基岩。河槽下切、河边局部沉积可以在同一断面出现。'}
];

const stopsById=Object.fromEntries(tectonicStops.map(stop=>[stop.id,stop]));
const between=(first,last,n)=>Array.from({length:n},(_,i)=>riverSample(first+(last-first)*i/n));
const legs=[
  ...tectonicStops.slice(0,7),
  {x:1548,z:-1290},{x:1430,z:-1220},stopsById.weathering,
  {x:1200,z:-1030},{x:1050,z:-942},{x:955,z:-902},stopsById.saddle,
  {x:790,z:-760},{x:740,z:-698},{x:674,z:-590},{x:520,z:-475},
  {x:390,z:-405},{x:278,z:-327},{x:195,z:-270},{x:94,z:-180},riverSample(0),
  ...between(.01,fallT,14),stopsById.incision,
  ...between(.132,joinT,28),stopsById.confluence,
  ...between(.413,.486,12),bank(riverSample(.49),50),bank(riverSample(.515),65),
  valleyBank(80),stopsById.valley,valleyBank(-80)
].map(({x,z})=>({x,z}));
export const tectonicRoute={id:'tectonics',path:legs,stops:tectonicStops.map(p=>({...p,p}))};

export function tectonicProfile(elevation){
  const profile=sampleLine(tectonicRoute,elevation,6);
  const forearc=profile.stations.find(s=>s.id==='forearc');
  const read=p=>sectionSample(p,elevation,(p.at??p.distance)<forearc.at);
  const points=profile.points.map(read),stations=profile.stations.map(read);
  const trench=stations[0],arc=stations.find(s=>s.id==='volcano');
  const ridge=stations.find(s=>s.id==='ridge');
  const slab=points.filter(point=>point.distance<=ridge.at).map(({distance})=>{
    const u=distance/ridge.at;
    return {distance,top:trench.y-355*u-365*u*u};
  });
  const arcBase=slab.find(p=>p.distance>=arc.at);
  const crossSection=sampleLine({path:[valleyBank(80),valley,valleyBank(-80)],stops:[]},elevation,2);
  crossSection.points=crossSection.points.map(point=>sectionSample(point,elevation));
  return {...profile,points,stations,slab,arcBase,crossSection,level:OCEAN.level};
}

// Each point is [horizontal distance, height] on a local rock face at the station.
// The reverse fault face slopes down to the right, with the right block moved up and left.
export function rockBand(kind,layer,block,t){
  const y=layer*4.3;
  if(kind==='fold'){
    return {x:(t-.5)*98,y:y+7.2*Math.sin(t*Math.PI*2.05-.62)+2.2*Math.sin(t*Math.PI*4+.2)};
  }
  const seam=10-y*.72;
  return block===0
    ? {x:-47+(seam+46)*t,y}
    : {x:seam-8+(43-seam+8)*t,y:y+12};
}

export const environmentGeology={
  water:{
    overview:['ridge','山地抬升给雪冰与上游流水提供高差。河流再通过下切、搬运与沉积，从山谷塑造到河口。'],
    snow:['ridge','高海拔给雪冰积累提供条件。这里的雪岭和青岚高山是不同山体，沿线可对照山体高差如何组织汇水。'],
    estuary:['forearc','河口借低地接入海湾，淤积与潮汐继续造岸。到东南缘对照另一种海岸地形，看看真正的板块边界离岸多远。'],
    bay:['forearc','中央海湾是本线水系终点。作为对照，东南岸的前弧、外海海沟和火山弧各占不同位置。']
  },
  warmth:{
    overview:['ridge','南北日照背景决定大尺度冷暖，山体抬升增大局部海拔差，同纬山顶与低地也能形成不同的环境。'],
    polar:['ridge','北境冷海岸先受纬度与海洋影响。再比较高山样区，观察海拔如何提供另一条降温路径。'],
    slope:['ridge','同一冷暖带里，山高与坡向会改变积雪、风和植被。青岚提供了独立的高差对照。'],
    plain:['fold','温带平原是在较低的地势上由流水继续塑造的。对照青岚山前，可分辨构造高地与河流沉积低地。']
  },
  inland:{
    overview:['trench','海陆轮廓和山脊提供水汽通行的地形。沿西南路线看迎背风，再去东南陆缘看板块如何造出另一组山海地貌。'],
    ocean:['trench','西南外海提供夏季水汽。东南海沟位于地图另一侧，是同一张地图上的活动大陆边缘对照。'],
    windward:['fold','这里抬升的是遇坡的湿空气。前往青岚山前，可对照另一种抬升：挤压让岩层缩短并升高。'],
    ridge:['fold','南部山脊改变水汽与汇水方向。青岚的褶皱露头演示构造怎样能为这种迎背风分界提供高差。'],
    lee:['ridge','背风偏干的形成依赖山脊的位置和高度。到青岚高山对照构造高差这一前提。']
  }
};

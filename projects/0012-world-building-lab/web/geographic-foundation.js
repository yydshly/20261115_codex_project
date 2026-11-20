import {monthlyWind,windName} from './annual-climate.js';
import {basinGroup,environmentLines,terrainBoundaries} from './environment-lines.js';
import {geographyLegs,reliefBelts} from './regional-geography.js';
import {waterRoutes} from './world-climate-data.js';
import {planBounds} from './world-logic-data.js';
import {buildWorldWaterBalance} from './watershed-world.js';

export const foundationLayers=[
  {id:'shore',name:'海陆边界',color:'#9ce1de'},
  {id:'relief',name:'主山脊',color:'#f3d07c'},
  {id:'wind',name:'水汽来向',color:'#ff9474'},
  {id:'divide',name:'分水岭',color:'#dbc4ff'}
];
export const foundationScale={
  width:planBounds.maxX-planBounds.minX,depth:planBounds.maxZ-planBounds.minZ,
  length:1000,origin:{x:-1680,z:-1440},north:{x:-1770,z:-1430}
};
export const foundationBasins={
  central:{name:'中央海湾外流',color:'#6999ab'},
  south:{name:'西南雨林外流',color:'#76a486'},
  closed:{name:'西部盐盆内流',color:'#b49365'},
  coast:{name:'沿海短流',color:'#8d9c91'},
  unresolved:{name:'局地洼地',color:'#747768'}
};
const anchor=(kind,text,x,z,label=text)=>({kind,text,x,z,label});
export const foundationAnchors=[
  anchor('shore','西南外海',-1845,1250),
  anchor('shore','中央海湾',-1730,-247),
  anchor('shore','北境陆岸',-730,-1260),
  anchor('shore','南部陆地',-270,921),
  anchor('relief','青岚山脉',1300,-1170),
  anchor('relief','南部山脊',-638,1118),
  anchor('relief','雪岭山脊',460,-410),
  anchor('divide','中央海湾流域',-935,-196,'中央外流'),
  anchor('divide','西部内流盐盆',-1710,190,'盐盆内流'),
  anchor('divide','独立的南部出海流域',-1310,846,'西南外流')
];

export const foundationSeams=[
  {id:'north',name:'北部冰岸与混交林',x:-1020,z:-786,lines:['warmth','water'],
    section:[[-760,-1190],[-735,-1118],[-743,-1030],[-826,-902],[-958,-810],[-1080,-737],[-1100,-600]],
    reason:'北境位置偏冷。离海后冷坡上升，再沿支谷边缘下到能支撑林木的较缓坡。',
    connection:'冷岸后方接到起伏侧坡和混交林。坡脚的薄土与冷湿地被逐渐接上林下覆盖，东、西两条支流绕林地下行。',
    check:'从南北冷暖线看林缘剖面，再到顺水线的北支汇口，看两支怎样汇进中央河。'},
  {id:'south',name:'南部湿林与背风干地',x:-610,z:1080,lines:['inland','warmth'],
    section:[[-948,1003],[-785,1062],[-677,1095],[-625,1107],[-541,1144],[-453,1183],[-337,1201],[-254,1240]],
    reason:'7 月西南水汽先遇迎风坡。越过南部主脊后偏干，背风沟谷仍能局部保湿。',
    connection:'冠层向山脊逐步变矮变疏，背风坡接草地和砾土。下坡浅沟集中季节性坡面径流，沟底仍有草带。',
    check:'沿海岸到内陆线看坡度、林冠高度和覆盖的变化，再切换 1 月和 7 月比较降雨。'},
  {id:'west',name:'西部盐盆与高原坡脚',x:-1500,z:518,lines:['water','inland'],
    section:[[-1679,312],[-1580,315],[-1522,352],[-1485,373],[-1410,423],[-1352,458],[-1295,552],[-1285,720]],
    reason:'西坡低地圈住盐盆，高原另一侧已有下切溪谷，经雨林独立出海；中央主河在更北侧入湾。',
    connection:'盐壳滩外侧接到低盆缘，盆缘东侧的浅沟向南延伸，坡面再抬升到高原。高原溪水沿原下切谷流到雨林，盐湖与盐沼在盆内蓄水。',
    check:'从顺水线对照两类出口。看紫色分水岭、黄线剖面和绿色西南出海水路。'},
  {id:'east',name:'东部火山岩岸与陆架',x:1450,z:-13,lines:['inland'],
    section:[[1340,-85],[1462,-16],[1590,166],[1660,273],[1660,315],[1660,450],[1660,585],[1660,805]],
    reason:'东部山前沿支脊过渡为火山岩坡，陆面在海岸以下接向陆架、大陆坡和海沟。',
    connection:'火山侧翼接岩丘和起伏岸坡。岸下按同一个 0 m 海平面接到浅缓陆架，越向外海越深。海蚀洞与入水口可原地查看。',
    check:'从海岸到内陆线打开东部对照，切换海面观察同一条剖面上的岸坡与陆架。'}
].map(seam=>({...seam,view:geographyLegs.find(leg=>leg.id===seam.id).view,
  section:seam.section.map(([x,z])=>({x,z}))}));

export const foundationRegions=[
  {title:'北部冷岸与东北高山',description:'北岸的位置偏冷。青岚—雪岭的海拔进一步降低冷暖指数，形成雪岩和融水源头。',line:'warmth'},
  {title:'中部平原、河谷与湖盆',description:'中央河低处承接雪岭、湖泊与北部双支流。坡降减小时展宽为湿地、河口与海湾。',line:'water'},
  {title:'西南湿林与南部背风干地',description:'西南海面供水汽，近岸和迎风坡偏湿。越岭进入林草过渡和砾地，泉池给干谷保留局地绿带。',line:'inland'},
  {title:'西部盐盆与东部陆架',description:'西部盆缘限制地表外泄。东部岩岸随高程接到陆架和大陆坡；构造示意需与真实地形边界对照。',line:null}
];

export function foundationWind(month){
  const {dx,dz,bearing}=monthlyWind(month);
  const origins=month===7?[[-1773,1445],[-1530,1400],[-1230,1400],[-1460,1000]]:
    [[-1320,-1300],[-880,-1060],[-540,-910],[-1275,-850]];
  const arrows=origins.map(([x,z],i)=>({x,z,dx,dz,length:320,
    text:i===0?(month===7?'7 月 · 西南湿风':'1 月 · 西北风'):null}));
  if(month===7){
    arrows.push(...[[793,900],[520,1010]].map(([x,z],i)=>({x,z,dx:-Math.SQRT1_2,dz:-Math.SQRT1_2,
      length:270,text:i===0?'东南沿海补充水汽':null})));
  }
  return {arrows,name:windName(bearing)};
}

const cached=new WeakMap();
export function buildGeographicFoundation(world){
  if(cached.has(world))return cached.get(world);
  const {climate:{grid,height},graph,bodies}=world;
  const result={bounds:planBounds,grid,height,coast:terrainBoundaries(world),ocean:graph.ocean,
    basins:Array.from(graph.owner,owner=>basinGroup(owner,bodies)),ridges:reliefBelts,
    feeders:waterRoutes.filter(r=>['north','lake','south'].includes(r.id)),
    routes:environmentLines,anchors:foundationAnchors,seams:foundationSeams};
  cached.set(world,result);return result;
}

let planModel;
export function getGeographicFoundation(){
  return planModel??=buildGeographicFoundation(buildWorldWaterBalance());
}

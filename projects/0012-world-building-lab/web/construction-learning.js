import {warmStops,WARM_STAGES,warmView,warmPath,warmApproach,warmObservation} from './warm-learning.js';
import {borealStops,BOREAL_STAGES,borealView,borealPath,borealApproach,borealObservation} from './boreal-learning.js';
import {uplandStops,UPLAND_STAGES,uplandView,uplandPath,uplandApproach,uplandObservation} from './upland-learning.js';
import {yardangStops,YARDANG_STAGES,yardangView,yardangPath,yardangApproach,yardangObservation} from './yardang-learning.js';
import {volcanicStops,VOLCANIC_STAGES,volcanicView,volcanicPath,volcanicApproach,volcanicObservation} from './volcanic-learning.js';
import {fanStops,FAN_STAGES,fanView,fanPath,fanApproach,fanObservation} from './fan-learning.js';
import {strataStops,STRATA_STAGES,strataView,strataPath,strataApproach,strataObservation} from './strata-learning.js';
import {saltStops,SALT_STAGES,saltView,saltPath,saltApproach,saltObservation} from './salt-learning.js';
import {karstStops,KARST_STAGES,karstObservation,karstView,karstPath,karstApproach} from './karst-learning.js';
import {geologyStops,geologyView,geologyObservation,geologyPath,geologyApproach,GEO_STAGES} from './geology-learning.js';
import {skyStops,skyView,skyObservation,skyPath,skyApproach,SKY_STAGES} from './sky-learning.js';
import {drylandStops,drylandView,drylandObservation,drylandPath,drylandApproach,DRYLAND_STAGES} from './dryland-learning.js';
import {tropicalStops,tropicalView,tropicalObservation,tropicalPath,tropicalApproach,TROPICAL_STAGES} from './tropical-learning.js';
import {oceanStops,oceanView,oceanObservation,oceanPath,oceanApproach,OCEAN_STAGES} from './ocean-learning.js';
const routeStep=(t,n)=>{const f=Math.max(0,Math.min(1,t))*n,r=Math.round(f);return Math.abs(f-r)<1e-10?r:f;};
import {polarStops,polarView,polarObservation,polarPath,polarApproach,POLAR_STAGES} from './polar-learning.js';
import {transportStops,transportView,transportObservation,transportPath,transportApproach,TRANSPORT_STAGES} from './transport-learning.js';
import {productionStops,productionObservation,productionView,productionPath,productionGroundPath,PRODUCTION_STAGES} from './production-learning.js';
import {mountainStops,mountainObservation,mountainView,mountainWalkPath,mountainApproach,MOUNTAIN_STAGES} from './mountain-learning.js';
import {bridgeEnds} from './settlement-layout.js';
import {settlementStops,settlementStages,settlementView,settlementPath,settlementPolyline,settlementObservation} from './settlement-learning.js';
import {marineStops,marineStages,marinePath,bayToMarinePath,marineView,marineObservation} from './marine-learning.js';
import {glacialStops,glacialStages,glacialObservation,glacialPath,upstreamWatershedPath,pathThrough} from './glacial-learning.js';
import {caveStops,caveObservation} from './cave-learning.js';
import {caveStages,caveGuide,caveField} from './cave-layout.js';
import {caveTravelPoint} from './cave-navigation.js';
import {forestStops,forestObservation} from './forest-learning.js';
import {forestStages} from './forest-layout.js';
import {INLAND_SITES,channelSample,RIVER_JOIN} from './inland-geography.js';
import {waterStops,waterRouteSample,bankPoint} from './water-system.js';
import {terrainHeight,walkingSurface,walkable,LARGE_WORLD} from './large-world.js';

const join=bankPoint(RIVER_JOIN.t),joinTarget=channelSample(1,.98);
const legacyStops=[...INLAND_SITES,{...waterStops[2],name:'汇流河谷',x:join.x,z:join.z,riverT:RIVER_JOIN.t,targetX:joinTarget.x,targetZ:joinTarget.z,targetY:joinTarget.level},...waterStops.slice(3)].map((r,index)=>({...r,index}));
const text=[
 ['平原的开阔尺度','平原用低起伏的大范围地面建立开阔感。远处的丘陵和盆地山缘仍属于同一世界。',
  ['先看约数百米范围内的低起伏，与远处丘陵、盆地边缘作对照。','草土、局部裸土、砂砾与出湖河岸的湿泥分别覆盖实际地面，下面的形状保持相同。','出湖河穿过平原，沿岸水面低于两侧陆地，最后接入原主河。','开阔草地保留远望，树群和灌丛靠近较湿的河岸；道路与观察点继续留空。']],
 ['盆地的围合结构','进入环山盆地，在真实山缘上回看低平盆底，理解外围高、内部低的空间关系。',
  ['外围山缘、内部盆底与向外溢流的缺口共同形成盆地；盆地内部继续承载湖泊。','较陡山缘露岩和碎砾，盆底转为草土，靠湖处逐渐变成湿岸。','山坡入湖溪流经湖面蓄水，再从西侧出水口穿过盆地边缘，接向平原。','山缘林灌和盆底草地按坡度与湿润条件分开，较陡或通水的位置保留空隙。']],
 ['内陆湖的静水空间','来到湖岸，从人的高度看独立湖面、湖盆、岸线、入水口与出水口。',
  ['隐藏水面后，湖盆底部比湖面低14米；湖岸与周围盆底在同一高度场中连续过渡。','湖底与浅滩使用砂砾色，岸边接湿泥，再向上过渡到草土；地表覆盖跟随岸坡。','统一32米湖面覆盖凹地，东侧溪流入湖、西侧河流出湖；湖水经过平原接回旧水系。','浅水放挺水与浮叶形态，深湖心留空；乔木退到稳定露地，低层植被接住水岸。']],
 ['把新水路接回原世界','沿出湖河来到原主河汇流点。平原、盆地与湖泊现在属于同一条连通的水路。',
  ['汇流口使用真实的两条河床与共同低地，接缝处不抬高床底堵住水路。','两岸草土、湿泥与砾岸连接新旧区域，保持连续的地表过渡。','出湖河从32米向下连接到原主河25米的水位，再继续进入湿地和海湾。','岸上乔木、灌丛和草地沿汇流低地组合，深槽保持通水和观看空间。']],
 ['湿地承接微地形','主河进入原有苇泽湿地，观察几步高差怎样同时影响水面与植物。',
  ['浅洼、露地与主河深槽形成不同高度，水仍然向下游连续延伸。','湿泥、草土与浅水床底分别表现水陆过渡。','较宽浅水承接上游河流，保留主通道与浅岸。','柳形树位于露地；挺水植物从床底长起，浮叶用水面定位，深水留空。']],
 ['河口保持分汊轮廓','继续来到原河口，观察河流怎样在浅滩之间分开并接近海平面。',
  ['主河与支汊之间保留泥沙洲，水路和露地共同构成形状。','泥沙与湿泥接入低平滩地，地表颜色随近水条件变化。','主河和两条分汊保持连通，在入海前逐渐归入统一海平面。','低灌与盐湿草丛保留分汊轮廓，高大树木退到较高的稳定岸地。']],
 ['从静水湖回到海湾','最后抵达原海湾，回看这段从开阔平原、围合盆地到静水湖和入海水系的构建过程。',
  ['海床、岸线和远处陆地仍是同一张大地图的一部分。','沙岸、浅滩与内陆草土连接，为不同环境提供表面差异。','湖、出湖河、主河、湿地、河口和海湾形成连续水位关系。','滨岸树群、矮灌、岸草与水生植物共同补齐上层；场景继续为人物和活动保留空间。']]
];
export const constructionStages=['地形骨架','地表覆盖','水域关系','植被群落'];
legacyStops.forEach((r,i)=>{r.lead=text[i][1];r.next=i===6?'构建主线完成，可自由漫游或分层对照。':'沿同一大地图继续前进，比较下一处空间的四层构建。';});
const surfaceStops=[legacyStops[0],...forestStops,...legacyStops.slice(1)];
const previousStops=[...surfaceStops.slice(0,6),...caveStops,...surfaceStops.slice(6)];
export const constructionStops=[...previousStops.slice(0,11),...glacialStops,...previousStops.slice(11),...marineStops,...settlementStops,...mountainStops,...productionStops,...transportStops,...polarStops,...oceanStops,...tropicalStops,...drylandStops,...skyStops,...geologyStops,...karstStops,...saltStops,...strataStops,...fanStops,...volcanicStops,...yardangStops,...uplandStops,...borealStops,...warmStops].map((r,index)=>({...r,index,legacyIndex:r.forest||r.cave||r.glacial?null:r.index}));
export const constructionStagesFor=index=>constructionStops[index].warm?WARM_STAGES:constructionStops[index].boreal?BOREAL_STAGES:constructionStops[index].upland?UPLAND_STAGES:constructionStops[index].yardang?YARDANG_STAGES:constructionStops[index].volcanic?VOLCANIC_STAGES:constructionStops[index].fan?FAN_STAGES:constructionStops[index].strata?STRATA_STAGES:constructionStops[index].saline?SALT_STAGES:constructionStops[index].karst?KARST_STAGES:constructionStops[index].geology?GEO_STAGES:constructionStops[index].sky?SKY_STAGES:constructionStops[index].dryland?DRYLAND_STAGES:constructionStops[index].tropical?TROPICAL_STAGES:constructionStops[index].ocean?OCEAN_STAGES:constructionStops[index].polar?POLAR_STAGES:constructionStops[index].transport?TRANSPORT_STAGES:constructionStops[index].production?PRODUCTION_STAGES:constructionStops[index].mountain?MOUNTAIN_STAGES:constructionStops[index].settlement?settlementStages:constructionStops[index].marine?marineStages:constructionStops[index].glacial?glacialStages:constructionStops[index].cave?caveStages:constructionStops[index].forest?forestStages:constructionStages;
export function constructionObservation(index,stage){const r=constructionStops[index];if(r.warm)return {...warmObservation(index-110,stage),index};if(r.boreal)return {...borealObservation(index-106,stage),index};if(r.upland)return {...uplandObservation(index-102,stage),index};if(r.yardang)return {...yardangObservation(index-98,stage),index};if(r.volcanic)return {...volcanicObservation(index-94,stage),index};if(r.fan)return {...fanObservation(index-90,stage),index};if(r.strata)return {...strataObservation(index-86,stage),index};if(r.saline)return {...saltObservation(index-82,stage),index};if(r.karst)return {...karstObservation(index-76,stage),index};if(r.geology)return {...geologyObservation(index-72,stage),index};if(r.sky)return {...skyObservation(index-68,stage),index};if(r.dryland)return {...drylandObservation(index-63,stage),index};if(r.tropical)return {...tropicalObservation(index-57,stage),index};if(r.ocean)return {...oceanObservation(index-52,stage),index};if(r.polar)return {...polarObservation(index-47,stage),index};if(r.transport)return {...transportObservation(index-41,stage),index};if(r.production)return {...productionObservation(index-34,stage),index};if(r.mountain)return {...mountainObservation(index-27,stage),index};if(r.settlement)return {...settlementObservation(index-23,stage),index};if(r.marine)return {...marineObservation(index-19,stage),index};if(r.glacial)return {...glacialObservation(r.id,stage),index};if(r.cave)return {...caveObservation(r.id,stage),index};if(r.forest)return {...forestObservation(r.id,stage),index};const i=r.legacyIndex;return {id:`build-${r.id}:${stage}`,index,stage,title:text[i][0]+' · '+constructionStages[stage],prompt:`${r.terrain} · 现在观察${constructionStages[stage]}。`,explanation:text[i][2][stage],reuse:['先确定大形、尺度与通道，再组织细节。','把覆盖与地形形状分开制作，并检查连续过渡。','水面、水位与真实床底共用数据，检查上下游连接。','按地形、地表和水深选择植物，组织层次与留白。'][stage]};}
export function constructionView(index){const r=constructionStops[index];if(r.warm)return warmView(index-110);if(r.boreal)return borealView(index-106);if(r.upland)return uplandView(index-102);if(r.yardang)return yardangView(index-98);if(r.volcanic)return volcanicView(index-94);if(r.fan)return fanView(index-90);if(r.strata)return strataView(index-86);if(r.saline)return saltView(index-82);if(r.karst)return karstView(index-76);if(r.geology)return geologyView(index-72);if(r.sky)return skyView(index-68);if(r.dryland)return drylandView(index-63);if(r.tropical)return tropicalView(index-57);if(r.ocean)return oceanView(index-52);if(r.polar)return polarView(index-47);if(r.transport)return transportView(index-41);if(r.production)return productionView(index-34);if(r.mountain)return mountainView(index-27);if(r.settlement)return settlementView(index-23);if(r.marine)return marineView(index-19);return {x:r.x,z:r.z,y:(r.underground?caveField(r.x,r.z).floor:walkingSurface(r.x,r.z))+LARGE_WORLD.eye,underground:!!r.underground,targetX:r.targetX,targetY:r.targetY,targetZ:r.targetZ};}
const mix=(a,b,u)=>a+(b-a)*u;
function onLand(x,z){if(walkable(x,z))return {x,z,y:walkingSurface(x,z)};for(let radius=5;radius<=80;radius+=5)for(let k=0;k<16;k++){const a=k*Math.PI/8,px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius;if(walkable(px,pz))return {x:px,z:pz,y:walkingSurface(px,pz)};}return {x,z,y:walkingSurface(x,z)};}
function legacyPath(t){
 t=Math.max(0,Math.min(1,t));const section=Math.min(5,Math.floor(t*6)),u=t*6-section,a=legacyStops[section],b=legacyStops[section+1];
 if(section<2)return {...onLand(mix(a.x,b.x,u),mix(a.z,b.z,u)),t};
 if(section===2){
  const bankAt=v=>{const p=channelSample(1,Math.max(.035,Math.min(1,(v-.13)/.87))),offset=p.half+12;return {x:p.x+p.nx*offset,z:p.z+p.nz*offset};};
  // The last approach follows the existing timber bridge. Do not snap across the river.
  if(u>.9){const points=[bankAt(.9),{x:-598,z:-90},{x:-592,z:-104},b],lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));let distance=(u-.9)/.1*lengths.reduce((a,b)=>a+b,0);for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const w=Math.min(1,distance/lengths[i]),x=mix(points[i].x,points[i+1].x,w),z=mix(points[i].z,points[i+1].z,w);return {x,z,y:walkingSurface(x,z),t};}distance-=lengths[i];}}
  let {x,z}=bankAt(u);if(u<.18){const w=u/.18;x=mix(a.x,x,w);z=mix(a.z,z,w);}
  return {...onLand(x,z),t};
 }
 const rt=mix(a.riverT,b.riverT,u),p=waterRouteSample(rt/.9);return {...p,y:Math.max(p.y,walkingSurface(p.x,p.z)),t};
}
function surfacePath(t){
 t=Math.max(0,Math.min(1,t));const section=Math.min(9,Math.floor(t*10)),u=t*10-section;
 if(section>=5)return {...legacyPath((section-4+u)/6),t};
 const a=surfaceStops[section],b=surfaceStops[section+1];
 return {...onLand(mix(a.x,b.x,u),mix(a.z,b.z,u)),t};
}
function previousPath(t){
 t=Math.max(0,Math.min(1,t));const section=Math.min(13,Math.floor(t*14)),u=t*14-section;
 if(section<5)return {...surfacePath((section+u)/10),t,underground:false};
 if(section===5){const a=surfaceStops[5],b=caveStops[0];return {...onLand(mix(a.x,b.x,u),mix(a.z,b.z,u)),t,underground:false};}
 if(section<9)return {...caveTravelPoint(caveGuide((section-6+u)/3)),t};
 if(section===9){
  // This branch has one entrance: return along the actual dry route before joining the lake.
  const points=[...caveStops].reverse().concat([surfaceStops[5],surfaceStops[6]]),lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));let distance=u*lengths.reduce((a,b)=>a+b,0);
  for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const v=Math.min(1,distance/lengths[i]),x=mix(points[i].x,points[i+1].x,v),z=mix(points[i].z,points[i+1].z,v),underground=i<3&&x>=60;return {...caveTravelPoint({x,z,underground}),t};}distance-=lengths[i];}
 }
 return {...surfacePath((section-4+u)/10),t,underground:false};
}
function upstreamConstructionPath(t){
 t=Math.max(0,Math.min(1,t));const section=Math.min(17,Math.floor(t*18)),u=t*18-section;
 if(section<10)return {...previousPath((section+u)/14),t};
 if(section===10)return {...pathThrough([previousStops[10],previousStops[5],{x:180,z:220},{x:730,z:50},{x:780,z:-200},{x:780,z:-480},{x:700,z:-650},{x:540,z:-710},glacialStops[0]],u),t};
 if(section<14)return {...glacialPath((section-11+u)/3),t};
 if(section===14)return {...upstreamWatershedPath((3+u*3)/9),t};
 return {...previousPath((section-4+u)/14),t};
}
export function naturalConstructionPath(t){t=Math.max(0,Math.min(1,t));const f=routeStep(t,22),i=Math.min(21,Math.floor(f)),u=f-i;if(i<18)return {...upstreamConstructionPath((i+u)/18),t};if(i===18)return {...bayToMarinePath(u),t};return {...marinePath((i-19+u)/3),t};}
// Return through the same seabed, coast, bank path and timber bridge before entering the village.
const approachStart=legacyPath(2.4/6);
const returnLegs=[t=>naturalConstructionPath((22-4*t)/22),t=>naturalConstructionPath((18-3*t)/22),t=>legacyPath((3-.6*t)/6),t=>settlementPolyline([approachStart,bridgeEnds(10)[1],bridgeEnds(10)[0],{x:-185,z:405},{x:-410,z:405},{x:-460,z:414},settlementStops[0]],t)];
const returnLengths=returnLegs.map(fn=>{let length=0,prev=fn(0);for(let i=1;i<=300;i++){const p=fn(i/300);length+=Math.hypot(p.x-prev.x,p.y-prev.y,p.z-prev.z);prev=p;}return length;});
export function settlementReturnPath(t){let d=Math.max(0,Math.min(1,t))*returnLengths.reduce((a,b)=>a+b,0);for(let i=0;i<returnLegs.length;i++){if(d<=returnLengths[i]||i===returnLegs.length-1)return {...returnLegs[i](Math.min(1,d/returnLengths[i])),t};d-=returnLengths[i];}}
export function settledConstructionPath(t){const f=routeStep(t,26),i=Math.min(25,Math.floor(f)),u=f-i;if(i<22)return {...naturalConstructionPath((i+u)/22),t};if(i===22)return {...settlementReturnPath(u),t};return {...settlementPath((i-23+u)/3),t};}
export function highlandConstructionPath(t){const f=routeStep(t,33),i=Math.min(32,Math.floor(f)),u=f-i;if(i<26)return {...settledConstructionPath((i+u)/26),t};if(i===26)return {...mountainApproach(u),t};return {...mountainWalkPath((i-27+u)/6),t};}
export function productionReturnPath(t){if(t<.78)return {...highlandConstructionPath(1-(1-26/33)*t/.78),t};return {...productionGroundPath([{x:-270,z:370},{x:-270,z:405},{x:-410,z:405},{x:-460,z:414},{x:-510,z:410},{x:-544,z:417},{x:-590,z:430},{x:-620,z:430},productionStops[0]],(t-.78)/.22),t};}
export function livelihoodConstructionPath(t){const f=routeStep(t,40),i=Math.min(39,Math.floor(f)),u=f-i;if(i<33)return {...highlandConstructionPath((i+u)/33),t};if(i===33)return {...productionReturnPath(u),t};return {...productionPath((i-34+u)/6),t};}
export function transportConstructionPath(t){const f=routeStep(t,46),i=Math.min(45,Math.floor(f)),u=f-i;if(i<40)return {...livelihoodConstructionPath((i+u)/40),t};if(i===40)return {...transportApproach(u),t};return {...transportPath((i-41+u)/5),t};}
export function polarConstructionPath(t){const f=routeStep(t,51),i=Math.min(50,Math.floor(f)),u=f-i;if(i<46)return {...transportConstructionPath((i+u)/46),t};if(i===46)return {...polarApproach(u),t};return {...polarPath((i-47+u)/4),t};}
export function oceanConstructionPath(t){const f=routeStep(t,56),i=Math.min(55,Math.floor(f)),u=f-i;if(i<51)return {...polarConstructionPath((i+u)/51),t};if(i===51)return {...oceanApproach(u),t};return {...oceanPath((i-52+u)/4),t};}
export function tropicalConstructionPath(t){const f=routeStep(t,62),i=Math.min(61,Math.floor(f)),u=f-i;if(i<56)return {...oceanConstructionPath((i+u)/56),t};if(i===56)return {...tropicalApproach(u),t};return {...tropicalPath((i-57+u)/5),t};}
export function drylandConstructionPath(t){const f=routeStep(t,67),i=Math.min(66,Math.floor(f)),u=f-i;if(i<62)return {...tropicalConstructionPath((i+u)/62),t};if(i===62)return {...drylandApproach(u),t};return {...drylandPath((i-63+u)/4),t};}
export function skyConstructionPath(t){const f=routeStep(t,71),i=Math.min(70,Math.floor(f)),u=f-i;if(i<67)return {...drylandConstructionPath((i+u)/67),t};if(i===67)return {...skyApproach(u),t};return {...skyPath((i-68+u)/3),t};}
export function geologyConstructionPath(t){const f=routeStep(t,75),i=Math.min(74,Math.floor(f)),u=f-i;if(i<71)return {...skyConstructionPath((i+u)/71),t};if(i===71)return {...geologyApproach(u),t};return {...geologyPath((i-72+u)/3),t};}
export function karstConstructionPath(t){const f=routeStep(t,81),i=Math.min(80,Math.floor(f)),u=f-i;if(i<75)return {...geologyConstructionPath((i+u)/75),t};if(i===75)return {...karstApproach(u),t};return {...karstPath((i-76+u)/5),t};}
export function saltConstructionPath(t){const f=routeStep(t,85),i=Math.min(84,Math.floor(f)),u=f-i;if(i<81)return {...karstConstructionPath((i+u)/81),t};if(i===81)return {...saltApproach(u),t};return {...saltPath((i-82+u)/3),t};}
export function strataConstructionPath(t){const f=routeStep(t,89),i=Math.min(88,Math.floor(f)),u=f-i;if(i<85)return {...saltConstructionPath((i+u)/85),t};if(i===85)return {...strataApproach(u),t};return {...strataPath((i-86+u)/3),t};}
export function fanConstructionPath(t){const f=routeStep(t,93),i=Math.min(92,Math.floor(f)),u=f-i;if(i<89)return {...strataConstructionPath((i+u)/89),t};if(i===89)return {...fanApproach(u),t};return {...fanPath((i-90+u)/3),t};}
export function volcanicConstructionPath(t){const f=routeStep(t,97),i=Math.min(96,Math.floor(f)),u=f-i;if(i<93)return {...fanConstructionPath((i+u)/93),t};if(i===93)return {...volcanicApproach(u),t};return {...volcanicPath((i-94+u)/3),t};}
export function yardangConstructionPath(t){const f=routeStep(t,101),i=Math.min(100,Math.floor(f)),u=f-i;if(i<97)return {...volcanicConstructionPath((i+u)/97),t};if(i===97)return {...yardangApproach(u),t};return {...yardangPath((i-98+u)/3),t};}
export function uplandConstructionPath(t){const f=routeStep(t,105),i=Math.min(104,Math.floor(f)),u=f-i;if(i<101)return {...yardangConstructionPath((i+u)/101),t};if(i===101)return {...uplandApproach(u),t};return {...uplandPath((i-102+u)/3),t};}
export function constructionNotebook(ids){const out=['# 山海之间 · 从冰雪到海床世界构建主线','',`同一大地图${constructionStops.length}站、四层、${constructionStops.length*4}处观察。几何、水位、植物与生产批次数量为本库创作参数，非地理、水文或经济模拟。`,''];for(const r of constructionStops){out.push(`## ${r.index+1} · ${r.name}`,'');for(let stage=0;stage<4;stage++){const p=constructionObservation(r.index,stage);out.push(`### ${ids.has(p.id)?'✓ 已浏览':'○ 待观察'} · ${p.title}`,'',p.explanation,'',`参考方法：${p.reuse}`,'');}}return out.join('\n');}

// Share the actual new guide corridor with prop placement; the downstream walk already has clearance.
const corridorBins=new Map(),corridorCell=32;
// New ocean legs are survey-only: retain the established land corridor sampling and vegetation.
let previous=polarConstructionPath(0);
for(let i=1;i<=2400;i++){const p=polarConstructionPath(i/2400),a=previous,b=p;previous=p;if(a.riding||b.riding||a.underground||b.underground||a.survey||b.survey)continue;for(let x=Math.floor((Math.min(a.x,b.x)-12)/corridorCell);x<=Math.floor((Math.max(a.x,b.x)+12)/corridorCell);x++)for(let z=Math.floor((Math.min(a.z,b.z)-12)/corridorCell);z<=Math.floor((Math.max(a.z,b.z)+12)/corridorCell);z++){const key=x+','+z;if(!corridorBins.has(key))corridorBins.set(key,[]);corridorBins.get(key).push({a,b});}previous=p;}
export function nearConstructionPath(x,z,radius=4){return (corridorBins.get(Math.floor(x/corridorCell)+','+Math.floor(z/corridorCell))||[]).some(({a,b})=>{const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz,u=len?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/len)):0;return Math.hypot(x-a.x-dx*u,z-a.z-dz*u)<radius;});}

export function borealConstructionPath(t){const f=routeStep(t,109),i=Math.min(108,Math.floor(f)),u=f-i;if(i<105)return {...uplandConstructionPath((i+u)/105),t};if(i===105)return {...borealApproach(u),t};return {...borealPath((i-106+u)/3),t};}

export function constructionPath(t){const f=routeStep(t,115),i=Math.min(114,Math.floor(f)),u=f-i;if(i<109)return {...borealConstructionPath((i+u)/109),t};if(i===109)return {...warmApproach(u),t};return {...warmPath((i-110+u)/5),t};}

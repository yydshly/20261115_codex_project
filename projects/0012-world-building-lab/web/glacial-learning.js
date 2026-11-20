import {marineStops,marinePath,bayToMarinePath,marineObservation} from './marine-learning.js';
import {GLACIAL_SITES,ICE_LAKE,iceSample,iceSurface,iceBankPoint,meltSample,meltBankPoint} from './glacial-geography.js';
import {terrainHeight,walkingSurface,LARGE_WORLD} from './large-world.js';
import {waterStops,waterRouteSample,waterObservation,waterNotebook} from './water-system.js';
export const glacialStages=['山体与冰体','雪冰覆盖','冰湖与融水','完整冰雪环境'];
export const glacialStops=GLACIAL_SITES.map((r,index)=>({...r,glacial:true,targetY:index===0?terrainHeight(r.targetX,r.targetZ)+1:index===1?iceSurface(iceSample(.45),0):index===2?ICE_LAKE.level+.1:meltSample(1,.43).level+.05}));
const content=[
 ['雪山的山体与覆盖','进入雪脊山岭，先看山脊与谷地，再分清岩山、积雪和谷中的冰体。',[
  '素色山体保留山脊、陡坡和谷地，冰川也用独立素色体积显示；不是把整片地形直接涂成白色。',
  '积雪单独覆盖较高、较缓的位置，裸岩与蓝冰分别保留；覆盖层有厚度，步行高度跟随雪面。',
  '谷底的冰川向冰湖方向延伸，湖与融水水位依次下降，再接回原源头池。',
  '雪岩、冰面沟槽、岸冰和稀疏的裸地形态提供尺度；连续观察山体、覆盖和水域各自的作用。']],
 ['冰川是有厚度的冰体','来到谷侧，观察蓝脊冰川的体积、表面沟槽、侧缘与末端。',[
  '谷底与两侧地形先承载冰川，冰体有上表面、底部、侧面和末端，中心厚度沿下游减小。',
  '蓝冰、白雪与深色沟槽分别表现冰面和覆盖；沟槽实际改变上表面高度，未作冰体破裂模拟。',
  '冰川末端附近的窄水道进入冰湖，冰体与流动水面分开制作并按实际高程相接。',
  '沟槽、末端冰面和碎砾细节补齐形态；导览留在谷侧干地，冰体范围不作为普通地面通行。']],
 ['冰湖需要真实湖盆','来到冰碛冰湖，比较湖盆、岸线、开放水面与少量岸冰。',[
  '隐藏水面后可看到湖盆；湖心底部234米，岸线与周围山脚连在同一地形中。',
  '雪冰覆盖与碎砾岸带分开，水下盆底继续存在；岸冰以独立薄冰体呈现。',
  '244米湖面覆盖10米深湖盆，上游窄溪先降至同一湖面再入湖，下游融水溪从湖岸溢出。',
  '保留开放水面和岸冰对照，干岸可以靠近，深水阻挡步行；这里没有动态结冰或融化过程。']],
 ['融水接回原水系','沿融水溪流下降，跟随冰湖出水口走到原有212米源头池。',[
  '窄河床与两岸高地实际修改地形，溪岸导览使用干地，避免镜头穿越水体。',
  '冰雪高地逐渐转为碎砾和湿岸，水面颜色与床底、岸坡分别构建。',
  '水位从244米连续下降到212米，入池前已达到原池水位；原主河从源头继续连接跌水、河谷与海湾。',
  '流纹、砾岸与岸路共同解释流向。场景展示水路连接，不模拟融化速率、流量或季节水位变化。']]
];
glacialStops.forEach((r,i)=>{r.lead=content[i][1];r.next=i===3?'沿融水溪岸进入原源头池，再跟随原主河向下游。':'沿谷侧和干岸继续，观察下一段冰雪环境。';});
export function glacialObservation(id,stage){const i=glacialStops.findIndex(r=>r.id===id);return {id:`build-${id}:${stage}`,stage,title:content[i][0]+' · '+glacialStages[stage],prompt:`${glacialStops[i].terrain} · ${glacialStages[stage]}`,explanation:content[i][2][stage],reuse:['先组织山体、谷地、冰体与蓄水凹地，再确定高程联系。','把积雪、蓝冰、裸岩与岸带覆盖分别制作，保留实际厚度和边界。','床底、水面和出入水口共享高程，逐段检查连接与下游下降。','用细节解释尺度与使用边界，再按需求设计活动和故事。'][stage]};}
export function glacialView(index){const r=glacialStops[index];return {x:r.x,z:r.z,y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye,targetX:r.targetX,targetY:r.targetY,targetZ:r.targetZ,underground:false};}
export function pathThrough(points,u){const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));let d=Math.max(0,Math.min(1,u))*lengths.reduce((a,b)=>a+b,0);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const v=Math.min(1,d/lengths[i]),x=points[i].x+(points[i+1].x-points[i].x)*v,z=points[i].z+(points[i+1].z-points[i].z)*v;return {x,z,y:walkingSurface(x,z),underground:false};}d-=lengths[i];}}
const routes=[
 [glacialStops[0],glacialStops[1]],
 [glacialStops[1],iceBankPoint(.72),iceBankPoint(1),{x:202,z:-236},glacialStops[2]],
 [glacialStops[2],{x:137,z:-214},{x:132,z:-170},glacialStops[3]]
];
export function glacialPath(t){t=Math.max(0,Math.min(1,t));const i=Math.min(2,Math.floor(t*3));return {...pathThrough(routes[i],t*3-i),t};}
export const upstreamWatershedStops=[...glacialStops,...waterStops.map(r=>({...r,waterLegacyIndex:r.index}))].map((r,index)=>({...r,index}));
export function upstreamWatershedPath(t){t=Math.max(0,Math.min(1,t));const i=Math.min(8,Math.floor(t*9)),u=t*9-i;if(i<3)return {...glacialPath((i+u)/3),t};if(i===3)return {...pathThrough([glacialStops[3],meltBankPoint(.6),meltBankPoint(.72),waterStops[0]],u),t};const a=waterStops[i-4],b=waterStops[i-3],rt=a.riverT+(b.riverT-a.riverT)*u,p=waterRouteSample(rt/.9);return {...p,y:Math.max(p.y,walkingSurface(p.x,p.z)),underground:false,t};}
export function upstreamWatershedObservation(index,stage){const r=upstreamWatershedStops[index];if(!r.glacial)return {...waterObservation(r.waterLegacyIndex,stage),index};const p=glacialObservation(r.id,[1,2,3][stage]);return {...p,index,stage,id:`water-${r.id}:${stage}`,title:r.terrain+' · '+['雪冰形态','融水关系','完整冰雪'][stage]};}
export const watershedStops=[...upstreamWatershedStops,...marineStops].map((r,index)=>({...r,index}));
export function watershedPath(t){t=Math.max(0,Math.min(1,t));const f=t*13,i=Math.min(12,Math.floor(f)),u=f-i;if(i<9)return {...upstreamWatershedPath((i+u)/9),t};if(i===9)return {...bayToMarinePath(u),t};return {...marinePath((i-10+u)/3),t};}
export function watershedObservation(index,stage){return index<10?upstreamWatershedObservation(index,stage):{...marineObservation(index-10,stage,true),index};}
export function watershedNotebook(ids){const out=['# 山海之间 · 从冰雪高地到海床','','十四站水系主线、42处观察。水位与冰体为创作参数，未作融化或水文模拟。',''];for(const r of watershedStops){out.push(`## ${r.index+1} · ${r.name}`,'');for(let stage=0;stage<3;stage++){const p=watershedObservation(r.index,stage);out.push(`### ${ids.has(p.id)?'✓ 已浏览':'○ 待观察'} · ${p.title}`,'',p.explanation,'',`参考方法：${p.reuse}`,'');}}return out.join('\n');}

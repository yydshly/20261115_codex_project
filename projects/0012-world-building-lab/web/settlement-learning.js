import {SETTLEMENT_SITES,settlementStages,WORKSHOP,settlementInteriorAt} from './settlement-layout.js';
import {walkingSurface,LARGE_WORLD} from './large-world.js';
export {settlementStages};
const details=[
 ['村路沿较缓平原进入聚落，保留出湖河通水空间；路面随实际地面铺设，房屋基础消化局部高差。','入口的菜圃、宅地与小路先形成疏松村落，再向镇内连续街道过渡。','房屋退到道路两侧，入口坡道从路面升到室内楼面；没有把整片土地压成同一高度。','菜圃、井、车、储物与静态人物提供生活尺度；生产、取水和通行位置有实际空间关系。'],
 ['主路与横巷交汇形成可识别的路网，步行线和小巷各自有连续地面。','道路两侧宅地围绕公共广场组织，井与摊位留在通道旁，形成街区内部的开敞节点。','粮仓、住屋、烘焙坊与工坊用不同体量和界面接街；建筑之间保留巷道与观看缝隙。','公共取水、交换与停留的道具让街区有用途；当前人物为静态尺度道具，没有居民调度系统。'],
 ['临街工坊用独立基础与短坡道连接街面，门前留出进入和驻足空间。','工坊承接街道和街区用途，前场工作、后场居住；门口是公共到私密的过渡。','墙体、门窗开口、屋顶和梁架实际组成建筑；门洞与窗洞不是墙面上的贴图。','从开着的门洞进入，楼面、隔墙与家具延续同一坐标；可用室内剖视移开前墙和屋顶作对照。'],
 ['室内楼面与入口坡道直接相连，门洞和内部通道使用实际可通行宽度。','工作区、中央通道、储物和后部住处形成空间分区，主线穿过真实隔墙门洞。','围墙、开窗、上方梁架和屋顶形成有顶空间；洞穴式地下空间之外，再增加建筑室内这一层。','桌、柜、床与灯具按生活用途布置，通道留空；室内屏蔽雨雪粒子，夜间暖光承接室外昼夜。']
];
export const settlementStops=SETTLEMENT_SITES.map((r,index)=>({...r,index,targetY:r.id==='town-interior'?WORKSHOP.floor+.8:r.id==='town-building'?WORKSHOP.floor+2:walkingSurface(r.targetX,r.targetZ)+1.4,lead:['从自然平原走进河畔村落，先看道路与场地如何接住人类活动。','来到榆湾街区，在路口比较宅地、公共广场与生活用途。','站在临街工坊门前，看基础、门窗与屋顶怎样连接内外。','穿过实际门洞与内部通道，来到工坊后部住处，理解室内怎样承接街道生活。'][index],next:index===3?'生活空间主线完成，可以沿原门洞返回街道或查看室内剖视。':'沿同一条村路与街道继续，进入下一层生活空间。'}));
export function settlementView(index){const r=settlementStops[index];return {x:r.x,z:r.z,y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye,indoor:!!r.indoor,targetX:r.targetX,targetY:r.targetY,targetZ:r.targetZ};}
export function settlementPolyline(points,t){const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));let d=Math.max(0,Math.min(1,t))*lengths.reduce((a,b)=>a+b,0);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const u=lengths[i]?Math.min(1,d/lengths[i]):0,x=points[i].x+(points[i+1].x-points[i].x)*u,z=points[i].z+(points[i+1].z-points[i].z)*u,y=walkingSurface(x,z);return {x,z,y,indoor:!!settlementInteriorAt(x,z,y),underground:false,survey:false};}d-=lengths[i];}}
export function settlementPath(t){const f=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(f)),u=f-i;const points=i===0?[settlementStops[0],{x:-460,z:414},{x:-410,z:405},settlementStops[1]]:i===1?[settlementStops[1],{x:-300,z:405},{x:-270,z:405},settlementStops[2]]:[settlementStops[2],{x:-270,z:383},settlementStops[3]];return {...settlementPolyline(points,u),t};}
export function settlementObservation(index,stage){const r=settlementStops[index];return {id:`build-${r.id}:${stage}`,index,stage,title:r.terrain+' · '+settlementStages[stage],prompt:r.lead,explanation:details[index][stage],reuse:['先确定地形、水源、通路与基础，再组织聚落。','把通行、宅地和公共节点分开设计，保留尺度差异。','把建筑看作连接街道与室内的空间界面。','让家具、灯光和用途回应实际通道，形成可以进入的生活空间。'][stage]};}

import {GEO_SITES,GEO_MOUTH,GEO_COAST_PATH,GEO_BRIDGE_PATH,GEO_EXIT_PATH,GEO_LOOP,NET,GEO_STAGES,geologyField} from './geology-layout.js';
import {walkingSurface,LARGE_WORLD} from './large-world.js';
import {skyView} from './sky-learning.js';
export {GEO_STAGES};
const lessons=[
 ['海崖中的空腔有真实洞顶、侧壁、干燥洞底和向海洞口，保留上方岩体。','层理色带与粗糙岩面沿同一壳体表现；当前不模拟海浪侵蚀过程。','侧水槽床底低于0m，海水与外海同标高相接；干燥观察路高于海面。','沿干路进出洞口，看海面、岩壁和洞顶围合；地下用教学补光，海浪冲刷与潮汐未实现。'],
 ['岩桥同时有上方岩体、下方拱洞和两端支撑，下方沟底仍在同一地形上。','桥顶与拱腹为独立真实表面，厚度沿跨度变化，不以贴图画出一个洞。','下面是干沟谷，海水没有被抬高到桥下；用同一高程检查空隙。','本站可岩桥侧看；下一段会实际走过桥顶，再进入洞网，不把镜头飞越当作过桥。'],
 ['洞网由入口、交汇洞厅、尽端支洞与回环组成；交汇处以空腔并集保留通路。','连续地板、洞顶和边界洞壁围合，分支内部没有封死的隔墙。','本洞网以干燥通路为主，不随意铺满地下湖；海洞和热泉分别使用各自水位。','从岔口进支洞再折返，沿另一条回环走回入口；可以手动探索分支，或剖视对照上方岩体。'],
 ['地热区建立在北侧岩地上，凹地承接热泉，喷气口落在实际地表。','浅色矿物壳、锈色裸岩和黑色气口表达差异，不代表真实矿物成分或测温结果。','热泉水位55m、中心床底52m，与0m海面区别；当前是静态水体，没有热水循环模拟。','三个气口持续升起程序化蒸汽，减少动态时停止运动；没有喷发、压力、伤害或真实地热过程。']
];
export const geologyStops=GEO_SITES.map((r,i)=>({...r,lead:['教学转场到东部海崖，沿实际洞口进入海蚀洞的干燥通路。','回到岸上，从沟谷边观察天然岩桥，比较桥顶、拱腹和桥下空隙。','实际跨过岩桥后进入地下岔口，观察尽端支洞与回环洞网。','沿洞网另一支回到地表，来到矿物壳、热泉与蒸汽共存的地热区。'][i],next:i===3?'地质四站完成，可回到洞网探索分支，或用地质剖视对照岩体内外。':'沿同一岩体与通路继续，区分实地进入、桥顶跨越和剖视观看。'}));
export function geologyPoint(x,z,inside=false){const f=geologyField(x,z),underground=inside&&!!f;return {x,z,y:underground?f.floor:walkingSurface(x,z),underground,geology:true};}
export function geologyView(i){const r=geologyStops[i];return {...r,...geologyPoint(r.x,r.z,!!r.underground),y:geologyPoint(r.x,r.z,!!r.underground).y+LARGE_WORLD.eye};}
function line(points,t,inside=false){const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));let d=Math.max(0,Math.min(1,t))*lengths.reduce((s,v)=>s+v,0);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const u=Math.min(1,d/lengths[i]),a=points[i],b=points[i+1];return geologyPoint(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u,inside);}d-=lengths[i];}}
export function geologyPath(t){const f=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(f)),u=f-i;if(i===0){if(u<.2)return line([GEO_SITES[0],GEO_MOUTH],u/.2,true);return line(GEO_COAST_PATH,(u-.2)/.8);}if(i===1){if(u<.6)return line(GEO_BRIDGE_PATH,u/.6);return line([GEO_BRIDGE_PATH.at(-1),NET.entry,NET.hall,NET.junction],(u-.6)/.4,true);}if(u<.7)return line(GEO_LOOP,u/.7,true);return line([NET.entry,...GEO_EXIT_PATH],(u-.7)/.3,true);}
export function geologyApproach(t){if(t>=.88)return line([GEO_MOUTH,GEO_SITES[0]],(t-.88)/.12,true);const a=skyView(3),b=GEO_MOUTH,u=Math.max(0,t/.88),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,base=(a.y-LARGE_WORLD.eye)*(1-u)+b.y*u;return {x,z,y:Math.max(base+Math.sin(Math.PI*u)*850,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),survey:true,geology:true,transfer:true,underground:false};}
export function geologyObservation(i,s){const r=geologyStops[i];return {id:`build-${r.id}:${s}`,index:i,stage:s,title:r.terrain+' · '+GEO_STAGES[s],prompt:r.lead,explanation:lessons[i][s],reuse:['用实体岩体与实际空腔建立空间关系，明确上方与下方。','真实制作洞顶、岩壁、拱腹与表面层次，检查接合处。','分别检查干路、海水、热泉与真实床底，避免水位混用。','用可进入通路和剖视对照空间，动态效果依附已有形体。'][s]};}

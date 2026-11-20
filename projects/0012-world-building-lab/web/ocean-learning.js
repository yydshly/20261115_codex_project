import {OCEAN_SITES,OCEAN_STAGES,oceanWeight} from './ocean-layout.js';
import {terrainHeight,walkingSurface,LARGE_WORLD} from './large-world.js';
import {polarView} from './polar-learning.js';
export {OCEAN_STAGES};
const lessons=[
 ['同一海面延伸到开阔外海，水下仍有真实海床；远洋不等于处处都是深渊。','外海水下以连续砂砾底为主，用稀疏岩块和颜色变化建立尺度。','海面固定0m；水深=海面减真实海床高程。此站在近海面观察，后面沿剖面下降。','外海留出大面积水体，鱼形群作为尺度参照；它们是静态程序化形态。'],
 ['三座有水下基座的岛体从同一海床隆起，岛间留下实际水道。','岛顶草土、岸边砂带与水下岩坡沿真实高度分布，不把岛屿做成浮在水上的装饰。','0m海面切过岛坡形成岸线；移开水面可比较露头与水下基座。','岛岸有低灌形态，浅岩区有藻形簇；水道保留开敞区域，植物不延伸到深水。'],
 ['大陆架使用相对平缓海床，与群岛水下坡脚连续连接。','架面以砂砾、低砂脊和零散露岩为主，先定底质再选择附着元素。','观察点下降到海面以下，眼睛和床底高度分别计算。图例列出本站实测模型水深。','海草仅在较浅缓底分布；本观察点更深，植被减少，以小型附着簇和岩块承接。'],
 ['大陆架外缘转为明显陡坡，沟槽沿坡面下降；在空间中看见坡顶与坡脚。','陡坡以裸岩、碎石与沟槽为主，平缓处才保留沉积色。','海面仍为0m；坡面加深不是把蓝色加深，而是改变真实床底高程。教学补光帮助看清坡面。','深处不安排光合植物，改为稀疏岩块和附着形态，保留大面积空坡。'],
 ['深海底部继续凹成狭长海沟，沟壁和沉积底具有可见高差。','暗色沉积底、两侧岩壁与少量落石区分谷底和陡壁。','本图海沟约370m深，为紧凑地图压缩的创作尺度，不冒充现实数千米深度；可海面剖视整体对照。','海沟底有少量管状附着形态与发光点形态，不表示真实物种或热液生态。补光与能见度为教学设置。']
];
export const oceanStops=OCEAN_SITES.map((r,i)=>({...r,targetY:i===0?0:i===1?terrainHeight(r.targetX,r.targetZ)+4:terrainHeight(r.targetX,r.targetZ)+3,lead:['从极地观景地以教学镜头转场进入东南外海，比较开放水面与真实床底。','沿海面来到群岛外缘，观察岛体、水道与海底基座。','沿连续剖面进入水下观察，比较大陆架的平缓坡面与底质。','继续下降到大陆坡，看海床坡度、水深与元素密度一起变化。','抵达海沟观察点，回看海面、架面、陡坡与沟底的垂直层次。'][i],next:i===4?'远洋五站完成；下一段以教学镜头转场进入西南雨林，再沿林冠、林下与河岸走向红树林和海口。':'沿同一海洋剖面继续，不切换到独立小场景。'}));
export function oceanPoint(x,z,clearance=18){return {x,z,y:terrainHeight(x,z)+clearance,survey:true,ocean:true,underground:false};}
export function oceanView(index){const r=oceanStops[index];return {...r,...oceanPoint(r.x,r.z,r.clearance),y:terrainHeight(r.x,r.z)+r.clearance+LARGE_WORLD.eye};}
export function oceanPath(t){const f=Math.max(0,Math.min(1,t))*4,i=Math.min(3,Math.floor(f)),u=f-i,a=oceanStops[i],b=oceanStops[i+1],x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;return {...oceanPoint(x,z,a.clearance+(b.clearance-a.clearance)*u),t};}
// Explicit teaching camera transfer, not a new walkable road or simulated voyage.
export function oceanApproach(t){const a=polarView(4),b=oceanView(0),u=Math.max(0,Math.min(1,t)),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,base=(a.y-LARGE_WORLD.eye)*(1-u)+(b.y-LARGE_WORLD.eye)*u;return {x,z,y:Math.max(base+Math.sin(Math.PI*u)*950,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),survey:true,ocean:true,transfer:true,underground:false};}
export function oceanMove(from,x,z){if(Math.abs(x)>1905||Math.abs(z)>1545||oceanWeight(x,z)<.9)return null;const clearance=Math.max(6,Math.min(50,from.y-terrainHeight(from.x,from.z)));return oceanPoint(x,z,clearance);}
export function oceanObservation(index,stage){const r=oceanStops[index];return {id:`build-${r.id}:${stage}`,index,stage,title:r.terrain+' · '+OCEAN_STAGES[stage],prompt:r.lead,explanation:lessons[index][stage],reuse:['先连接水面、岛体、架面、陡坡与沟底，再组织观看路径。','按坡度与沉积条件制作底质，让细节附着真实几何。','统一海面标高，分别计算水深和观察点高度；明确展示尺度。','按深度、底质与光照条件减少植物，使用稀疏元素表现深海空间。'][stage]};}

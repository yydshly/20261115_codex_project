import {MARINE_SITES,marineWeight} from './marine-geography.js';
import {terrainHeight,walkingSurface,LARGE_WORLD} from './large-world.js';
import {waterStops,waterRouteSample} from './water-system.js';

export const marineStages=['海岸骨架','地表与底质','水位与水深','完整海岸生态'];
const lessons=[
 ['岬角伸入海中，低处被水覆盖，较硬的岩脊露出成为礁体；岸外由岩礁间水槽接向浅滩。','岩岸用灰褐岩面与裂隙，洼处转为砂砾；岩与沙的边界跟随地形，先分底质再选素材。','同一零米海面穿过真实岸坡；离岸礁体露头与水下槽沟使用同一高度场。可切换海床剖视检查。','岩面上附着贝壳形小簇，水下岩区承接藻形元素；岩礁、碎石和空槽共同构成岸外层次。'],
 ['低缓滩台衔接高岸与海底，局部凹陷形成潮池；潮池底和露地有真实高差。','滩台表面分为裸岩、湿砂与砾斑，潮池沿凹地成形，避免用蓝色贴片代替凹坑。','金线标高水位 +0.65m，青线标低水位 −0.65m；它们是参考范围，当前海面固定 0m。潮池洼底低于海面。','露地减少高大植物，附着贝壳靠近岩台；浅水藻与露地间留空，让水陆边界可见。'],
 ['缓倾陆架从潮间带向外下降。观察点沿真实海床下降，眼睛进入水面以下，看向有高差的浅海空间。','较缓沙底承接沙脊，局部岩基露出；砂砾色与岩斑决定后续海草、藻类的落点。','海面仍为 0m，水深由海面减实际海床高度得到。HUD 显示所在海床深度与眼睛入水深度；蓝雾随实际入水切换。','海草形态扎根 2–9m 的缓沙底，藻形态附着较浅岩区；成簇与留白共同提供近景尺度。'],
 ['离岸海床进一步下降，形成较深陆架；缓坡、岩块和砂脊让海底成为可以观察的立体空间。','深处底质转为较暗砂砾和岩块，保持与浅海连续的坡面；石块底部嵌入床底，避免悬空。','此处用海床高度表达更大水深，水下观察不会被地面步行逻辑抬到海面。剖视可直接对照岸线与深浅。','深处减少植物，保留稀疏岩块、附着小簇与大片空地；用密度变化表达浅海到深床的空间差异。']
];
export const marineStops=MARINE_SITES.map((r,i)=>({...r,index:i,targetY:terrainHeight(r.targetX,r.targetZ)+(i<2?.2:1),lead:['从海湾沿原栈道回到岸上，进入岬角礁岸。','低平滩台上的露地、潮池和水位参考线共同解释潮间带。','由岸边沿海床进入水下，观察沙底与海草怎样构成浅海。','继续沿海床下降，比较水深、底质和上层元素密度。'][i],next:i===3?'主线抵达海床，可返回岸上或用海床剖视对照。':'沿同一海岸继续，比较水深与底质改变后的空间。'}));
export function marinePoint(x,z,survey=false){return {x,z,y:survey?terrainHeight(x,z):walkingSurface(x,z),survey,underground:false};}
export function marineView(index){const r=marineStops[index];return {...marinePoint(r.x,r.z,!!r.survey),y:(r.survey?terrainHeight(r.x,r.z):walkingSurface(r.x,r.z))+LARGE_WORLD.eye,targetX:r.targetX,targetY:r.targetY,targetZ:r.targetZ};}
function polyline(points,t,survey=false){const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));let d=Math.max(0,Math.min(1,t))*lengths.reduce((s,v)=>s+v,0);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const u=Math.min(1,d/lengths[i]),x=points[i].x+(points[i+1].x-points[i].x)*u,z=points[i].z+(points[i+1].z-points[i].z)*u;return marinePoint(x,z,survey);}d-=lengths[i];}}
export function bayToMarinePath(t){if(t<.52){const p=waterRouteSample((.9-(t/.52)*.1)/.9);return {...p,y:Math.max(p.y,walkingSurface(p.x,p.z)),survey:false};}return polyline([waterStops[4],{x:-1440,z:-440},{x:-1390,z:-455},{x:-1360,z:-480},marineStops[0]],(t-.52)/.48);}
export function marinePath(t){const f=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(f)),u=f-i;return {...polyline([marineStops[i],marineStops[i+1]],u,i>=1),t};}
export function marineSurveyValid(x,z){return marineWeight(x,z)>.98&&terrainHeight(x,z)<9;}
export function marineMove(from,x,z,blocked=()=>false){if(!marineSurveyValid(x,z)||blocked(x,z))return null;const y=terrainHeight(x,z),step=Math.hypot(x-from.x,z-from.z);if(Math.abs(y-from.y)>step*.85+.2)return null;return marinePoint(x,z,y<=.22);}
export function marineObservation(index,stage,water=false){const r=marineStops[index],s=water?[1,2,3][stage]:stage;return {id:`${water?'water':'build'}-${r.id}:${stage}`,index,stage,title:r.terrain+' · '+marineStages[s],prompt:r.lead,explanation:lessons[index][s],reuse:['先建立岸线、滩台和陆架，再安排观看路径。','把地形与底质分开，素材依附真实坡面。','统一海面与海床，直接计算水深并检查水陆连接。','按水深、坡度与底质选择元素，保留通行和观看空间。'][s]};}

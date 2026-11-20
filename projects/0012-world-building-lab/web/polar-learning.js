import {riverBridge} from './water-system.js';
import {POLAR_SITES,POLAR_STAGES,POLAR_LEGS,POLAR_APPROACH,POLAR_BOARDWALK,iceCapField} from './polar-layout.js';
import {productionGroundPath} from './production-learning.js';
import {roadSample,walkingSurface,LARGE_WORLD} from './large-world.js';
export {POLAR_STAGES};
const text=[
 ['北部岸坡和真实海床相接，海水保持全图0m水位。','浅色裸岩、残雪和海面划分冷岸表面，没有把海水改成一整片白地。','海湾与浮冰保留开阔水道，海岸站点位于可走陆地。','与已有温带海岸对照，理解同样的岸坡、水位和岩体如何构成另一种环境。'],
 ['浮冰湾继续使用真实海床与海面，冰体和岸线共用坐标。','海冰具有顶面、底面和侧边；冰山有水上和水下体积。','浮冰之间保留水面，冰山底部高于海床；当前不开放海冰通行。','冰体静态展示，尚无漂移、碰撞、破碎和真实浮力。'],
 ['冰盖建立在独立岩床上，平缓大形与尖锐雪峰有不同轮廓。','冰盖顶、底与侧面形成实际厚度，覆盖层和下面岩床可分层比较。','冰盖南侧连接低地和融水洼地；当前水量不随消融改变。','从岩床边缘观察连续冰面；步行进入冰盖时使用实际冰面高度，不落到床底。'],
 ['低起伏湿冷地形保留浅洼地，与冰盖和海岸连在同一地图。','苔藓色地表、低矮草丛和灌丛代替高大树林，留出开敞视线。','浅融水池有独立水位和真实床底，植物沿岸分布；深处不开放步行。','这是矮植被和湿地表的程序化样本，没有冻土、水热或真实物种模拟。'],
 ['极光观景地位于开敞地面，保留向北方夜空的视线。','雪岩、远处冰盖和低矮苔原共同提供夜景前景与地平线。','极光与全图昼夜、云量和雾共用状态：晴夜显现，日光和阴云使其减弱。','点击“极光夜景”进入冬季晴夜，动态光带与星空同景显示；可恢复原天气。它是表现效果，不是空间天气模拟。']
];
export const polarStops=POLAR_SITES.map((p,i)=>({...p,targetY:p.skyTarget?walkingSurface(p.x,p.z)+400:i===0?4:i===1?12:i===3?24.2:walkingSurface(p.targetX,p.targetZ)+1,lead:['进入北境极地海岸，从岸坡、海面和雪岩开始看极地环境。','沿岸走到浮冰湾，比较海冰、冰山及水下体积。','来到冰盖南缘，比较岩床、冰体厚度与平缓冰面。','进入低矮苔原，在浅融水池旁理解植被与湿地表。','来到北境开敞观景地，点击“极光夜景”，对照晴夜光带、星空与冰雪前景。'][i],next:i===4?'极地五站完成，可恢复原天气；下一段以教学镜头转场进入东南外海，再沿海床逐层下降。':'沿同一北部地形继续，比较下一种极地环境。'}));
export function polarView(index){const p=polarStops[index];return {...p,y:walkingSurface(p.x,p.z)+LARGE_WORLD.eye};}
export function polarObservation(index,stage){const p=polarStops[index];return {id:`build-${p.id}:${stage}`,index,stage,title:p.terrain+' · '+POLAR_STAGES[stage],prompt:p.lead,explanation:text[index][stage],reuse:['先确定海岸、岩床、冰体与低地之间的真实空间关系。','把雪、海冰、冰山、冰盖与苔原覆盖区分开制作。','用水位、厚度与植被高度检查不同环境层次的连接。','让天空效果回应昼夜和天气，并保留可理解的前景与地平线。'][stage]};}
export function polarPath(t){const f=Math.max(0,Math.min(1,t))*4,i=Math.min(3,Math.floor(f));return {...productionGroundPath(POLAR_LEGS[i],f-i),t};}
// Follow the existing village lanes and graded ten-region road before joining the northern footpath.
function northernRoad(t){if(t<.2244||t>.234){const p=roadSample(t);return {...p,y:walkingSurface(p.x,p.z)};}return productionGroundPath(POLAR_BOARDWALK,(t-.2244)/.0096);}
export function polarApproach(t){if(t<.18)return productionGroundPath([{x:-210,z:455},{x:-190,z:455},{x:-190,z:425},{x:-210,z:405},{x:-410,z:405},{x:-460,z:414},{x:-510,z:410},{x:-544,z:417},{x:-590,z:430},{x:-620,z:430},{x:-660,z:450},{x:-474,z:546}],t/.18);if(t<.8){return northernRoad((1+(t-.18)/.62*3)/9);}return productionGroundPath(POLAR_APPROACH,(t-.8)/.2);}

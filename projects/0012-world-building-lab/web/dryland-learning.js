import {DRYLAND_SITES,DRYLAND_STAGES} from './dryland-layout.js';
import {terrainHeight,walkingSurface,LARGE_WORLD} from './large-world.js';
import {tropicalView} from './tropical-learning.js';
export {DRYLAND_STAGES};
const lessons=[
 ['低起伏的大范围地面建立连续草原，不用几块草丛代替整片地貌。','草土与少量裸土、细砾交替，地表形状和覆盖分开制作。','草原没有铺满明水，较高湿润参数只用于解释覆盖率，不代表地下存在真实水库。','密集但较低的草丛保持远望，灌木零散分布；观察路留出净空。'],
 ['缓丘与草原仍在同一连续地面上，不另造独立森林小场景。','草土基底承接疏林，树间保留草地与裸地斑。','湿润参数处于草原到干旱区域的过渡区，当前没有降水与蒸散过程模拟。','树群集中在一段区域，冠层稀疏、树间开敞，区别于密闭雨林。'],
 ['较平缓的戈壁地形与后方干谷接续，保留大尺度起伏。','真实砾石实例、裸土与碎砾色斑共同构成地表，不把戈壁做成另一片沙丘。','这里缺少表面水源，湿润参数较低；地表颜色不是实际含水量测量。','植被覆盖明显减少，低矮灌丛与大片裸地对比，砾石避开通路。'],
 ['干谷有实际下切沟床、两侧岸坡与向低处延伸的走向。','谷底与岸坡用不同砂砾色，地形决定沟槽，材质只补充颗粒差异。','当前沟床保持干燥；末端绿洲是独立静态泉池，不把干谷画成常流河。','低密度旱生形态避开裸沟；比较无明水沟谷与有水绿洲的密度差。'],
 ['绿洲凹地与干谷末端相邻，池盆有真实床底、岸坡和外围陆地。','池岸湿土向外转为草带，再接回干燥砂砾；覆盖沿真实岸坡变化。','泉池水位12m、中心床底8m，有4m水深；用静态泉池表达局地水源，没有地下补给或水量平衡模拟。','湿岸草、灌木与冠树围绕水源集中，深水保持留白；绿洲不能只是在沙地上插几棵树。']
];
export const drylandStops=DRYLAND_SITES.map((r,i)=>({...r,targetY:i===4?12.15:terrainHeight(r.targetX,r.targetZ)+(i===1?6:1),lead:['从湿热海口以教学镜头转场进入南部草原，比较开敞地形与连续低植被。','沿草地来到疏林过渡区，看树群如何嵌入草原。','走向更干燥的砾地，对比覆盖率、颗粒与裸地。','沿高岸观察下切干谷，区分沟谷形状与实际有水河道。','抵达绿洲岸边，看局地水源如何重新组织地表与植被。'][i],next:i===4?'干湿五站完成，沿原地面通路返回草原进入天空四站，比较云层、雷暴、沙尘与晴夜。':'沿同一片地形继续，对比水源与植被覆盖怎样改变空间。'}));
export const drylandPoint=(x,z)=>({x,z,y:walkingSurface(x,z),dryland:true,survey:false,underground:false});
export function drylandView(i){const r=drylandStops[i];return {...r,...drylandPoint(r.x,r.z),y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye};}
export function drylandPath(t){const f=Math.max(0,Math.min(1,t))*4,i=Math.min(3,Math.floor(f)),u=f-i,a=drylandStops[i],b=drylandStops[i+1];return {...drylandPoint(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u),t};}
export function drylandApproach(t){const a=tropicalView(5),b=drylandView(0),u=Math.max(0,Math.min(1,t)),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,base=(a.y-LARGE_WORLD.eye)*(1-u)+(b.y-LARGE_WORLD.eye)*u;return {x,z,y:Math.max(base+Math.sin(Math.PI*u)*800,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),survey:true,dryland:true,transfer:true,underground:false};}
export function drylandObservation(i,stage){const r=drylandStops[i];return {id:`build-${r.id}:${stage}`,index:i,stage,title:r.terrain+' · '+DRYLAND_STAGES[stage],prompt:r.lead,explanation:lessons[i][stage],reuse:['先确定开敞地形、干谷下切和池盆，再安排观察路径。','区分草土、砾石、干谷砂砾与湿岸，不用同一种覆盖铺满世界。','将明水、水深与湿润分布分开说明，明确哪些是创作参数。','按水源位置和干湿差异安排覆盖率、树高与留白。'][stage]};}

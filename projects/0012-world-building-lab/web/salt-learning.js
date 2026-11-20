import {SALT_SITES,SALT_STAGES} from './salt-layout.js';
import {walkingSurface,LARGE_WORLD} from './large-world.js';import {karstView,karstPath} from './karst-learning.js';
export {SALT_STAGES};
const lessons=[
 ['封闭湖盆有实际凹底与周边高地；这里不向海湾接出河道。','白色退水带、灰褐岸地与深槽分别依附湖盆形状。','高水位24m、低水位22m共用中心20m床底，中心水深由4m变为2m，岸线实际收缩。','耐盐低灌退到岸上，深水与裸露盐地留空；形态为教学原型，不对应具体物种。'],
 ['低平地形中叠加微小洼地和土丘，几步高差划出不同湿地块。','湿泥、盐白斑与草土交错，裂缝不是另一条深沟。','高水位浅洼为23.5m，退水参考21.5m；水面按真实微地形裁切，土丘露出。','成簇低草和耐盐灌丛沿湿岸分布，水道与观察通路留空。'],
 ['较平的盐滩仍是连续地面，与前面的水盆分开。','多边形凸起盐脊与裂纹贴在实际地面上，白色材质补充颗粒感。','本段保持干地，不因全图海面或天气变化自动灌水；对照附近盐湖的两档岸线。','中心盐壳保持裸露，耐盐低灌仅零散出现在外围，避免把盐滩铺成草原。'],
 ['中央低、外围高的干湖盆与两圈旧岸阶地共同构成凹地。','浅色裸地、盐脊与阶地边缘提供旧水岸的空间线索。','当前没有明水；岸线圈只是创作参考，不是古水位年代或蒸发过程数据。','从湖水、浅洼到盐壳和干盆，比较同一类环境如何改变上层元素的分布。']
];
export const saltStops=SALT_SITES.map((r,i)=>({...r,lead:['从地下河以教学镜头转场来到西部内流盆地，比较独立盐湖与通海水系。','沿高岸前往盐沼，观察微地形怎样分割浅水与露地。','来到盐壳滩地，近看盐脊、裂纹和大面积裸露地面。','沿缓坡进入干涸湖盆，回看旧岸阶地与中心低地。'][i],next:i===3?'盐湖四站完成，可切换高低水位或查看全貌，再返回已有环境。':'沿同一地面通路继续，比较下一段水陆与植被关系。'}));
export const saltPoint=(x,z)=>({x,z,y:walkingSurface(x,z),saline:true,underground:false,survey:false});
export function saltView(i){const r=saltStops[i];return {...r,...saltPoint(r.x,r.z),y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye};}
export function saltPath(t){const f=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(f)),u=f-i,a=saltStops[i],b=saltStops[i+1];return {...saltPoint(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u),t};}
export function saltApproach(t){t=Math.max(0,Math.min(1,t));if(t<.5)return {...karstPath(1-t/.5*.4),saline:true,saltReturn:true};const a=karstView(3),b=saltView(0),u=(t-.5)/.5,x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;return {x,z,y:Math.max((a.y-1.72)*(1-u)+(b.y-1.72)*u+Math.sin(Math.PI*u)*1100,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),saline:true,survey:true,transfer:true,underground:false};}
export function saltObservation(i,s){const r=saltStops[i];return {id:`build-${r.id}:${s}`,index:i,stage:s,title:r.terrain+' · '+SALT_STAGES[s],prompt:r.lead,explanation:lessons[i][s],reuse:['区分封闭盆地、浅洼、盐滩与干盆的真实高差。','用盐脊与泥地覆盖强化结构，保留地面连续性。','同一床底比较水位和岸线；两档预设不等于真实水循环。','按照浅洼、裸盐地与干岸安排群落，避免无差别铺植物。'][s]};}

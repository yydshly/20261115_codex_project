import {TROPICAL_SITES,TROPICAL_STAGES,tropicalWeight} from './tropical-layout.js';
import {terrainHeight,walkingSurface,walkable,LARGE_WORLD} from './large-world.js';
import {oceanView} from './ocean-learning.js';
export {TROPICAL_STAGES};
const lessons=[
 ['较高林地接向河岸低地，再下降到同一海平面的潮沟与泥滩。林缘有真实坡面和开敞入口。','湿润土色、河床与淡水河面先建立底层；湿热是场景设定，不是当前天气选择。','高大阔叶树从林缘疏到内部密，错开树高，给上层留出轮廓。','板根、藤蔓、蕨形地被和低灌逐步加入，主路保留净空。'],
 ['林冠下面仍是原来的林地地面，没有把地面抬成绿色平台。','河网和土壤保持地面位置，林冠站采用距地26m的教学镜头。','不同树高、宽冠和少量更高树共同形成有高差的顶层；可开合林冠查看下面空间。','上层藤蔓向下连接，树干、板根和林下层让冠层有实际支撑。'],
 ['回到真实地面，站在连续林地和树干之间观察净空。','湿土、较低地面和附近水道共同构成湿润基底；不把整片雨林淹成湿地。','宽冠在高处围合，树干留出人的观看高度和通道。','板根落在实际地面，垂藤从高处下垂，蕨与低灌留在通路外；开合林冠可看清层次。'],
 ['林地下坡接到淡水河岸，河床与岸坡具有真实高差。','新增高原支流从220m降至本段14m接点，原河网再下降到0m；三条下游水道连接海口；盐湿参数向下游增大。','岸上乔木离开深槽，较低的岸边植被承接水陆界面。','蕨形地被、湿岸植物与裸露泥土分开，主河深槽留空。'],
 ['低平河口泥岸被分汊潮沟切开，红树林落点来自真实地形和水域。','下游水道与海水在0m连接；盐湿参数用于植被分布，当前没有动态涨落潮。','红树林用更低的树干、宽冠和成群分布区别于高大雨林。','支柱根从树干分叉落入实际泥床，在水面上下形成体积；根不落入深槽，参观岸路留空。'],
 ['河床、分汊、潮沟、露地与海床使用同一高度场，水面相接。','淡水河上游逐渐下降，下游归入同一0m海面；这里是连通水系样本，不是盐度输运模拟。','高大雨林退向内陆，红树林沿低平盐湿岸地分布，海口开水面保持可见。','用树冠高度、根系、裸泥和开水面比较环境梯度；可湿热全貌回看六站。']
];
export const tropicalStops=TROPICAL_SITES.map((r,i)=>({...r,targetY:i===0?terrainHeight(r.targetX,r.targetZ)+8:i===1?terrainHeight(r.targetX,r.targetZ)+28:i===2?terrainHeight(r.targetX,r.targetZ)+1.2:i===3?2.5:i===4?terrainHeight(r.targetX,r.targetZ)+2:0.3,lead:['进入西南湿热林缘，比较高林地、湿土与向海下降的河网。','教学镜头升到林冠高度，看错层树冠及下方地面。','回到林下，观察宽冠、树干、板根、藤蔓和蕨形层怎样围合空间。','沿干燥岸路来到淡水河边，看真实岸坡、河面与深槽。','走到盐湿岸地，观察潮沟与树干上下的支柱根。','沿岸抵达河海交界，回看淡水河、分汊、红树林和开阔海水的连接。'][i],next:i===5?'湿热六站完成，下一段以教学镜头转场进入南部连续草原，再沿疏林、戈壁、干谷走向绿洲。':'沿同一片湿热环境继续，观察上层元素怎样随地形与水域变化。'}));
export function tropicalPoint(x,z,lift=0){return {x,z,y:walkingSurface(x,z)+lift,tropical:true,survey:lift>0,canopy:lift>0,underground:false};}
export function tropicalView(index){const r=tropicalStops[index];return {...r,...tropicalPoint(r.x,r.z,r.canopy?26:0),y:walkingSurface(r.x,r.z)+(r.canopy?26:0)+LARGE_WORLD.eye};}
export function tropicalPath(t){const f=Math.max(0,Math.min(1,t))*5,i=Math.min(4,Math.floor(f)),u=f-i,a=tropicalStops[i],b=tropicalStops[i+1],x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,lift=(a.canopy?26:0)*(1-u)+(b.canopy?26:0)*u;return {...tropicalPoint(x,z,lift),t};}
export function tropicalApproach(t){const a=oceanView(4),b=tropicalView(0),u=Math.max(0,Math.min(1,t)),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,base=(a.y-LARGE_WORLD.eye)*(1-u)+(b.y-LARGE_WORLD.eye)*u;return {x,z,y:Math.max(base+Math.sin(Math.PI*u)*1100,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),tropical:true,survey:true,transfer:true,underground:false};}
export function tropicalMove(from,x,z){if(tropicalWeight(x,z)<.9||Math.abs(x)>1905||Math.abs(z)>1545)return null;return tropicalPoint(x,z,26);}
export function tropicalObservation(index,stage){const r=tropicalStops[index];return {id:`build-${r.id}:${stage}`,index,stage,title:r.terrain+' · '+TROPICAL_STAGES[stage],prompt:r.lead,explanation:lessons[index][stage],reuse:['先连接高林地、岸坡、低平泥岸与海床，保留人的通路。','水位、床底与湿润盐湿分布共用参数，再安排植被。','用树高、冠幅和密度建立群落差异，树干必须承接冠层。','板根、藤蔓、林下和支柱根依附实际空间，保留水道与观看净空。'][stage]};}

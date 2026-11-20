import {YARDANG_SITES,YARDANG_LEGS,YARDANG_STAGES} from './yardang-layout.js';import {walkingSurface,LARGE_WORLD} from './large-world.js';import {volcanicView} from './volcanic-learning.js';export {YARDANG_STAGES};
const lessons=[
 ['六组残丘沿相近轴向延伸，迎风端较宽钝、背风端逐渐收窄；下方仍是连续地面。','层理色带依附实际丘体，颜色不能代替长条残丘的大形与方向。','本段没有新增水体，静态风向线只解释造型参考，不代表正在进行风蚀或天气风场。','低灌稀疏地留在较低稳定地面，残丘与观看通路保持清晰。'],
 ['两列残丘之间留下开放窄槽，保留槽底、侧坡和向外延伸的出口。','岩面与槽底分别组织，碎砾避开实际行走通路；没有洞顶，不把它登记为地下洞道。','通槽保持干燥，真实风速、积沙与砂粒碰撞尚未模拟。','主线从西侧入口进入槽内，再沿通槽走到东侧出口，近人空间由两侧岩壁形成。'],
 ['裸岩缓坡与散落块石形成较粗糙的地面，区别于连续沙丘和盐壳平地。','较大棱角块石、较小碎砾与地表颜色分担不同尺度，较大块石限制通行。','本段无常流水，天气雨湿仍只是原有表现层，没有积水与地貌演变。','植物只零散出现在稳定碎砾间，裸岩和块石仍为主体。'],
 ['平缓台面与外围陡边形成实际高差，沿缓坡可登上约39m台面。','台面以密集小砾石铺底，少量较大石块作为近景尺度，区别于石漠块石区。','保留干燥台面，不用沙尘遮住真实几何；可用原天气面板另看能见度变化。','稀疏旱生低灌接在台缘，通路和大片砾地保持裸露；以后可扩展荒漠群落与长期侵蚀。']
];
export const yardangStops=YARDANG_SITES.map((r,i)=>({...r,lead:['从火山柱群以教学镜头转场进入南部干旱区域，比较沿同一方向排列的风蚀残丘。','从西侧入口进入两列残丘之间，看开放通槽怎样形成狭窄空间。','走出通槽来到石漠，对照裸岩缓坡、棱角块石与低密度植物。','沿缓坡登上砾石台地，比较细砾铺底与台缘高差。'][i],next:i===3?'风蚀四站完成，可查看全貌，对照残丘、通槽、石漠与砾石台面。':'沿同一地面继续，比较地形、颗粒与稀疏植被。'}));
export const yardangPoint=(x,z)=>({x,z,y:walkingSurface(x,z),yardang:true,underground:false,survey:false});export function yardangView(i){const r=yardangStops[i];return {...r,...yardangPoint(r.x,r.z),y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye};}
export function yardangPath(t){const f=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(f)),u=f-i,points=YARDANG_LEGS[i],lengths=points.slice(1).map((p,j)=>Math.hypot(p.x-points[j].x,p.z-points[j].z));let d=u*lengths.reduce((a,b)=>a+b,0);for(let j=0;j<lengths.length;j++){if(d<=lengths[j]||j===lengths.length-1){const v=Math.min(1,d/lengths[j]),a=points[j],b=points[j+1];return {...yardangPoint(a.x+(b.x-a.x)*v,a.z+(b.z-a.z)*v),t};}d-=lengths[j];}}
export function yardangApproach(t){const a=volcanicView(3),b=yardangView(0),u=Math.max(0,Math.min(1,t)),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;return {x,z,y:Math.max((a.y-1.72)*(1-u)+(b.y-1.72)*u+Math.sin(Math.PI*u)*900,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),yardang:true,survey:true,transfer:true,underground:false};}
export function yardangObservation(i,s){const r=yardangStops[i];return {id:`build-${r.id}:${s}`,index:i,stage:s,title:r.terrain+' · '+YARDANG_STAGES[s],prompt:r.lead,explanation:lessons[i][s],reuse:['先比较残丘长轴、通槽出口和台面高差。','按岩面、块石与小砾石的不同尺度组织细节。','明确干地与风向示意，区分静态造型和真实环境过程。','用裸露、疏密与通行净空组织荒漠空间。'][s]};}

import {STRATA_SITES,STRATA_STAGES,strataWallZ} from './strata-layout.js';import {walkingSurface,LARGE_WORLD} from './large-world.js';import {saltView} from './salt-learning.js';
export {STRATA_STAGES};
const lessons=[
 ['先建立低地、陡壁与上方高地，水平层序依附同一岩体。','横向色带按实际世界高度连续分层，坡面与岩壁共用层位；颜色不是年代测定。','本段为干燥岩壁，不用蓝色材质冒充裂隙水；后面溪谷拥有独立真实床底。','壁脚保留通路，低草与碎块回应近人尺度，高处轮廓仍清晰。'],
 ['矿脉在已有岩体上显示穿过水平层序的方向，不另做一块悬空贴图。','三条有宽度的曲面脉带贴合实际岩壁，晶簇与近景石块呈现突出体积；配色不代表真实矿种或品位。','矿脉展示不声称存在地下热液过程、资源储量或可开采系统。','通路与石块分开，矿脉可用作地标或未来探索线索，采集和经济内容尚未实现。'],
 ['实际登上约108m顶面，比较平顶台塬与之前的尖峰、大山和峰林。','顶面、边缘与侧壁分开组织；横向层位继续延伸，坡道连接低地与顶面。','从高处看后面的低谷，地面高差与溪流水位共同建立垂直关系。','台顶用低矮草灌留出远望，陡边和主线路径保持净空。'],
 ['三段高岸台面沿横向逐级下降，坡面把台面连向谷底，主线另有可走缓坡。','不同高程的裸岩色带、台面边缘与砾地共同表现阶地，不仅在平地上画几条线。','支谷溪流从24m向18m下降，源头和末端小池连通，中心约3m深；现有34米上游凹谷与18米出流口，经西支谷、8米汇口接到原中央主河。','低草偏向较湿的河岸与稳定台面，深槽、陡坡与岩壁保留裸露；支流已连接；真实冲淤和物源演算仍待制作。']
];
export const strataStops=STRATA_SITES.map((r,i)=>({...r,targetZ:i<2?strataWallZ(r.targetX,r.targetY)+.5:r.targetZ,lead:['从盐地以教学镜头转场进入西北岩层区，先看岩壁大形与水平层序。','沿壁脚来到矿脉观察点，比较穿层方向、突出晶簇和近景样本。','沿实际坡道登上台塬，体会平顶与陡边形成的空间。','沿缓坡下到阶地，比较多级高岸、谷底与独立溪流。'][i],next:i===3?'岩层四站完成，可查看全貌，对照岩壁、顶面、阶地与水段。':'沿同一张大地图继续，比较下一段地形与岩层。'}));
export const strataPoint=(x,z)=>({x,z,y:walkingSurface(x,z),strata:true,underground:false,survey:false});
export function strataView(i){const r=strataStops[i];return {...r,...strataPoint(r.x,r.z),y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye};}
export function strataPath(t){const f=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(f)),u=f-i,a=strataStops[i],b=strataStops[i+1];return {...strataPoint(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u),t};}
export function strataApproach(t){const a=saltView(3),b=strataView(0),u=Math.max(0,Math.min(1,t)),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;return {x,z,y:Math.max((a.y-1.72)*(1-u)+(b.y-1.72)*u+Math.sin(Math.PI*u)*1200,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),strata:true,survey:true,transfer:true,underground:false};}
export function strataObservation(i,s){const r=strataStops[i];return {id:`build-${r.id}:${s}`,index:i,stage:s,title:r.terrain+' · '+STRATA_STAGES[s],prompt:r.lead,explanation:lessons[i][s],reuse:['先比较层状岩壁、平顶台塬与多级阶地的大尺度形状。','地层、矿脉和表面材质分开表达，并与实体岩体对齐。','保证水面、床底和岸地连续，明确局部水段的边界。','按坡度、岩体和湿岸安排素材，为未来探索保留通路。'][s]};}

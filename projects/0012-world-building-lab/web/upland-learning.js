import {UPLAND_SITES,UPLAND_STAGES} from './upland-layout.js';import {walkingSurface,LARGE_WORLD} from './large-world.js';import {yardangView} from './yardang-learning.js';export {UPLAND_STAGES};
const lessons=[
 ['台面与缓起伏共同建立开阔高地，当前约220—244m为紧凑世界的压缩创作高程。','连续草土基底承接低草，裸土与浅砾避免把草甸变成一块均匀绿毯。','本段无大片明水，湿润差异只是分布参数，不代表真实降水和地下水循环。','低草、莎草形态与贴地垫状灌草保持开敞视线，当前不对应具体物种。'],
 ['低草丘与浅洼只有小幅高差，仍是真实地面起伏，顶部保持露出。','深色泥炭样表面与草毡贴合草丘和浅洼；尚无实际泥炭累积、生物分解或碳循环。','浅洼水位235.15m，按微地形裁切形成斑块；本区与下游塘群尚无完整补给耦合。','低草偏向草丘，莎草形态靠近浅水边，深水和观察路不铺满植物。'],
 ['三处较大的浅塘有独立凹底和岸坡，短水道连接彼此，不以三张圆片代替地形。','浅岸、湿泥与草地沿水深和岸距变化，塘心保留开阔水面。','塘面由232m、230m下降至228m，再经溪流接向222m与220m末端浅洼；塘缘与通道不封堵。','较湿塘岸有低草和莎草形态，水较深处保持留白；没有浮游生态、鱼类或真实生长。'],
 ['塘群出水沿真实细槽下降，两侧草甸与较低岸地保持连续。','溪床、湿岸与草土分别依附形状，床底低于水面，主通道不会被草丘堵住。','五处塘洼共用四段水道，中心至少约1.4m床底高差；末端220m出水现经新增坡脚谷地接入14m雨林河网，再到海口；原中央主河属于另一条水系。','岸边低草和贴地植物形成稳定低层空间；昼夜和天气沿用原系统，冻融、季节水位与植物生长仍待制作。']
];
export const uplandStops=UPLAND_SITES.map((r,i)=>({...r,lead:['从砾石台地以教学镜头转场来到压缩高程的高原草甸，先看开敞台面与低矮群落。','来到泥炭样湿地，对照草丘和浅洼怎样划开干湿斑块。','沿干岸来到相连浅塘，看每个塘盆、岸坡与连接水道。','继续沿塘群出水方向，比较细槽、湿岸和低草形成的连续空间。'][i],next:i===3?'高原湿地四站保留；可打开“高原到海口”，沿新坡脚谷地进入原雨林河网。':'沿同一高地干岸继续，比较微地形、水域与低植被。'}));
export const uplandPoint=(x,z)=>({x,z,y:walkingSurface(x,z),upland:true,underground:false,survey:false});export function uplandView(i){const r=uplandStops[i];return {...r,...uplandPoint(r.x,r.z),y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye};}
export function uplandPath(t){const f=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(f)),u=f-i,a=uplandStops[i],b=uplandStops[i+1];return {...uplandPoint(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u),t};}
export function uplandApproach(t){const a=yardangView(3),b=uplandView(0),u=Math.max(0,Math.min(1,t)),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;return {x,z,y:Math.max((a.y-1.72)*(1-u)+(b.y-1.72)*u+Math.sin(Math.PI*u)*1000,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),upland:true,survey:true,transfer:true,underground:false};}
export function uplandObservation(i,s){const r=uplandStops[i];return {id:`build-${r.id}:${s}`,index:i,stage:s,title:r.terrain+' · '+UPLAND_STAGES[s],prompt:r.lead,explanation:lessons[i][s],reuse:['先比较高原台面、草丘浅洼与塘盆的实际高差。','把草毡、泥炭样覆盖和浅岸作为附着层组织。','共用水位、床底和连接节点，检查上下游与通道开口。','按草丘、湿岸和水深安排低层群落，明确生态过程尚未实现。'][s]};}

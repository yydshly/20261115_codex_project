import {VOLCANIC_SITES,VOLCANIC_STAGES} from './volcanic-layout.js';import {walkingSurface,LARGE_WORLD} from './large-world.js';import {fanView} from './fan-learning.js';export {VOLCANIC_STAGES};
const lessons=[
 ['在旧火山区东侧增加一处次级火口，外部抬起、内部下陷，保留原主火口。','灰褐火山碎屑和较深内壁依附真实地形，暗色覆盖不会自动生成火口。','90m发光面下有约82m盆底；它是熔岩表现层，与河流、海水和热泉分开。','观察坡道连接内壁高处与流槽干岸；熔岩区域限制步行，暂无伤害、温度和喷发系统。'],
 ['熔岩流槽实际切入坡面，与火口缺口相接，继续向较低台地延伸。','槽底、槽岸和外部黑岩有各自形状，亮色面贴合槽内地形。','示意熔流由90m逐渐下降至40m，亮线仅提示走向，不是流速、黏度或真实液体演算。','两侧干岸与观察路径留空，减少动态会停止辉光起伏与流向示意。'],
 ['冷却台地保持较平缓的主体，表面叠加低幅绳状起伏和实体粗糙岩块。','较暗玄武岩、凝固纹脊和碎块从几何到覆盖分层构建。','活跃槽在上游结束，台地作为固定冷却形态保留；没有把发光面的关闭当作已完成凝固。','低矮植被只在较远、稳定的冷岩边缘稀疏出现，活动熔岩与裸岩核心留空。'],
 ['六边形岩柱贴在实际基底上，相邻岩柱高度不同，形成可观察的柱群剖面。','柱体有侧面与顶面，接缝来自真实几何，不是在平地贴一张六边形纹理。','这是冷却岩体形态样本，不模拟结晶收缩、冷却时间或柱状节理形成过程。','岩柱与块石有基础阻挡，主线沿群体外缘观看；攀爬、破坏与采集系统尚未实现。']
];
export const volcanicStops=VOLCANIC_SITES.map((r,i)=>({...r,lead:['从冲积扇以教学镜头转场进入旧火山区东侧，看次级火口的内外高差。','沿干岸看火口缺口如何连接一条实际下切的熔岩流槽。','走到冷却玄武岩台地，对照流动表面、凝固纹脊与粗糙块石。','继续到柱状岩群外缘，比较实体六边形柱体的顶面、侧壁与接缝。'][i],next:i===3?'火山四站完成，可查看同一区域全貌，对照火口、活跃槽和冷却岩体。':'沿同一观察坡道继续，比较火山地形与岩体状态。'}));
export const volcanicPoint=(x,z)=>({x,z,y:walkingSurface(x,z),volcanic:true,underground:false,survey:false});export function volcanicView(i){const r=volcanicStops[i];return {...r,...volcanicPoint(r.x,r.z),y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye};}
export function volcanicPath(t){const f=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(f)),u=f-i,a=volcanicStops[i],b=volcanicStops[i+1];return {...volcanicPoint(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u),t};}
export function volcanicApproach(t){const a=fanView(3),b=volcanicView(0),u=Math.max(0,Math.min(1,t)),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;return {x,z,y:Math.max((a.y-1.72)*(1-u)+(b.y-1.72)*u+Math.sin(Math.PI*u)*950,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),volcanic:true,survey:true,transfer:true,underground:false};}
export function volcanicObservation(i,s){const r=volcanicStops[i];return {id:`build-${r.id}:${s}`,index:i,stage:s,title:r.terrain+' · '+VOLCANIC_STAGES[s],prompt:r.lead,explanation:lessons[i][s],reuse:['先建立火口、缺口、流槽和冷却岩体的实际形状。','表面颜色、凝固纹理和独立块石各承担不同尺度。','熔岩、水域与热泉使用独立数据，明确表现和模拟的边界。','按干岸、冷岩和活动熔流组织素材与可通行空间。'][s]};}

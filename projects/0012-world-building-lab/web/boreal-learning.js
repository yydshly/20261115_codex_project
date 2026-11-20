import {BOREAL_SITES,BOREAL_STAGES} from './boreal-layout.js';import {walkingSurface,LARGE_WORLD} from './large-world.js';import {uplandView} from './upland-learning.js';export {BOREAL_STAGES};
const lessons=[
 ['缓坡基底上保留细小起伏，创作高程约52—64m；这里是紧凑地图的群落样本，不代表真实气候带。','深褐腐殖样底色和少量针叶碎片贴合地面，覆盖与地形分别控制。','深色尖塔状树冠分层叠置，主干有实体体积；树间保留连续行走净空。','低灌与苔藓形态补地面层，抬头、平视和低头看到不同空间；尚无真实物种和生长过程。'],
 ['沿同一缓坡进入混交段，地形保持连续，不为每棵树单独造一个平台。','针叶样碎片、阔叶落叶和腐殖样底色并存，帮助区别相同坡地上的不同覆盖。','尖冠针叶形态与浅色树干、展开的阔叶冠叠在一起，改变轮廓、遮挡和透光空隙。','蕨形草与低灌填补树间，主线两侧留出净空；混交比例为固定创作参数。'],
 ['同一坡面继续降低，疏林段保留可远看的开敞空间。','较浅落叶色与零散地被形成斑块，林间空地不铺满同一种素材。','白色树干带深色横纹，冠形与针叶林明确不同；较低树密度让天空和远处显露。','林下以低草和蕨形植物为主，实际分布稀于混交段；尚未计算叶面积、真实透光或物种竞争。'],
 ['疏林之后是更新空地样本，倒木沿局部坡面摆放，圆木端点支撑实际地面。','腐殖色地面、苔藓块和倒木分开叠放，避免把林地做成只有树的空地。','稀疏残留乔木围出空地边缘；当前不模拟倒伏、树龄或灾后演替。','九根倒木有实体体积和通行阻挡，苔藓与幼树形态依空地分布；不含分解、生长或可拾取资源。']
];
export const borealStops=BOREAL_SITES.map((r,i)=>({...r,lead:['从高原湿地以教学镜头转场进入寒温带森林样本，先看针叶尖冠与林下层次。','沿同一缓坡走入针阔混交段，比较两种树形怎样组织共同林冠。','继续走到白桦疏林，观察密度、浅色树干和透光空隙。','抵达倒木苔藓林地，低头看腐殖覆盖、倒木和幼树怎样填充空间。'][i],next:i===3?'森林群落四站完成，可返回总览查看已接入与尚未制作的环境。':'沿连续干地继续，比较树形、冠层与林下覆盖。'}));
export const borealPoint=(x,z)=>({x,z,y:walkingSurface(x,z),boreal:true,underground:false,survey:false});
export function borealView(i){const r=borealStops[i];return {...r,...borealPoint(r.x,r.z),y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye};}
export function borealPath(t){const f=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(f)),u=f-i,a=borealStops[i],b=borealStops[i+1];return {...borealPoint(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u),t};}
export function borealApproach(t){const a=uplandView(3),b=borealView(0),u=Math.max(0,Math.min(1,t)),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;return {x,z,y:Math.max((a.y-1.72)*(1-u)+(b.y-1.72)*u+Math.sin(Math.PI*u)*1000,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),boreal:true,survey:true,transfer:true,underground:false};}
export function borealObservation(i,s){const r=borealStops[i];return {id:`build-${r.id}:${s}`,index:i,stage:s,title:r.terrain+' · '+BOREAL_STAGES[s],prompt:r.lead,explanation:lessons[i][s],reuse:['先建立连续缓坡与行走净空，再布置群落。','以落叶、腐殖和苔藓覆盖表达地面差异。','复用不同树干与冠形，按群落改变比例和密度。','乔木、林下、地被与倒木一起形成空间，生态过程需另行构建。'][s]};}

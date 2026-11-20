import {KARST_SITES,KARST_STAGES,UPPER,LOWER,karstField,karstLayerField,karstSupport,riverProfile} from './karst-layout.js';
import {walkingSurface,terrainHeight,LARGE_WORLD} from './large-world.js';
import {geologyView} from './geology-learning.js';
export {KARST_STAGES};
const texts=[
 ['先建立高大峰体、峰间低地与远近轮廓，峰林与下方平台同属地图。','灰褐层理与陡壁表达岩体表面，不用颜色变化替代峰形。','本段不铺明水，后面由天坑与竖井进入独立地下河层。','峰体避开导览通路；这是创作峰形，不模拟岩溶侵蚀年代。'],
 ['石林用较细岩柱与峰林的大形作对照，柱间留出真实地面空间。','岩柱有顶、底和侧面，条带颜色跟随实际高度。','地面仍在同一高平台上，不把每个岩柱之间都画成深水。','柱群的疏密与通路共同建立近人尺度；岩柱有基础阻挡。'],
 ['天坑是实际下陷的开放地形，坑缘74m，盆底约6m，中心继续向竖井打开。','坑壁与坑底通过实际高度变化相接，剖视时可对照下方洞廊。','天坑不是一个蓝色湖面；中心竖井的0m位置也不应被全图海面错误填满。','入口栈道跨向中心观测台，边缘高差限制地面行走，没有自由坠落物理。'],
 ['竖井从天坑底继续下降，井底−34m，地表、上层廊道和下层廊道有独立高程。','圆形井壁、透空升降平台、缆线与层位连接栈道形成可观察空间。','全图海平面在竖井位置留出开口，地下河使用自己的负高程水位。','下一段升降台实际从74m下降到38m，再从38m降到−28m；可暂停、转向和选择平台层位。'],
 ['上层约38m、下层约−28m的洞廊在同一平面位置叠置，没有把它们压成一个最低地面。','每层分别生成地板、洞壁与洞顶，碰撞查询按当前高度选择层位。','上层为干廊，下层继续下降到地下河岸；水体只位于下层河槽。','主线先走上层回环，再乘平台进入下层；上层/下层剖视保留另一层轮廓。'],
 ['下层洞廊接向实际河床，岸路和水槽分别有高程。','干燥岸地、湿岸与较深槽底依附真实几何，洞顶仍在上方。','地下河水面从−35m向−35.6m下降，中心约3m深；没有地下水补给或真实流量模拟。','蓝色流线示意流向，减少动态时停止；深槽阻止步行，沿干岸可返回下层平台。']
];
export const karstStops=KARST_SITES.map((r,i)=>({...r,lead:['进入北部高平台，比较高峰与峰间低地。','沿平台来到细柱石林，比较岩体尺度与疏密。','来到天坑边缘，看地表怎样向下打开。','沿透空栈道抵达竖井升降观察台，可向下看井壁与下方层位。','先降到上层洞廊走回环，再乘同一平台进入下层洞穴。','沿下层干路抵达地下河，看独立床底、水面和岩体围合。'][i],next:i===5?'垂直地下六站完成，可沿原干岸返回平台，选择上层或地表；也可分层剖视。':'沿同一空间继续，比较平面地貌与垂直层位的关系。'}));
export function karstPoint(x,z,layer='surface'){const f=karstField(x,z,layer==='upper'?38:layer==='lower'?-28:74,true),underground=layer!=='surface';return {x,z,y:underground?f?.floor:karstSupport(x,z,walkingSurface(x,z),true),underground,karst:true,liftY:layer==='upper'?38:layer==='lower'?-28:74,layer,open:f?.open||false};}
export function karstView(i){const r=karstStops[i],p=karstPoint(r.x,r.z,r.layer);return {...r,...p,y:p.y+LARGE_WORLD.eye};}
function line(points,t,layer='surface'){const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));let d=Math.max(0,Math.min(1,t))*lengths.reduce((s,v)=>s+v,0);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const u=Math.min(1,d/lengths[i]),a=points[i],b=points[i+1];return karstPoint(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u,layer);}d-=lengths[i];}}
export function karstRide(t,a,b){const u=Math.max(0,Math.min(1,t)),y=a+(b-a)*u;return {x:630,z:-1250,y,underground:true,karst:true,shaftRide:true,liftY:y,layer:'shaft',open:true};}
export function karstPath(t){const f=Math.max(0,Math.min(1,t))*5,i=Math.min(4,Math.floor(f)),u=f-i;if(i===1)return line([karstStops[1],{x:630,z:-1190},karstStops[2]],u);if(i<3)return line([karstStops[i],karstStops[i+1]],u);if(i===3){if(u<1e-10)return karstPoint(630,-1250);if(u<.18)return karstRide(u/.18,74,38);if(u<.55)return line([{x:630,z:-1250},...UPPER,{x:633,z:-1250},{x:630,z:-1250}],(u-.18)/.37,'upper');if(u<.78)return karstRide((u-.55)/.23,38,-28);return line([LOWER[0],LOWER[1],karstStops[4]],(u-.78)/.22,'lower');}return line([karstStops[4],LOWER[2],{x:700,z:-1370},karstStops[5]],u,'lower');}
export function karstApproach(t){const a=geologyView(3),b=karstView(0),u=Math.max(0,Math.min(1,t)),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,base=(a.y-LARGE_WORLD.eye)*(1-u)+(b.y-LARGE_WORLD.eye)*u;return {x,z,y:Math.max(base+Math.sin(Math.PI*u)*850,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),survey:true,karst:true,transfer:true,underground:false};}
export function karstObservation(i,s){const r=karstStops[i];return {id:`build-${r.id}:${s}`,index:i,stage:s,title:r.terrain+' · '+KARST_STAGES[s],prompt:r.lead,explanation:texts[i][s],reuse:['分别建立峰体、坑壁、井筒和洞廊，不把立体空间压成一张表面。','每层保留地板、洞顶与侧壁，检查真实净空和遮挡。','水位与床底使用同一层的数据，避免海面和地下水混用。','以可进入通路、升降台和分层剖视解释上下空间。'][s]};}

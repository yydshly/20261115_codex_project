import {drylandStops,drylandView,drylandPath} from './dryland-learning.js';
export const SKY_STAGES=['晴日基准','天空与光照','能见度与地表','完整天气氛围'];
export const SKY_PRESETS=[{name:'晴日基准',hour:12,weather:'clear',season:1},{name:'层云变化',hour:12,weather:'overcast',season:1},{name:'雷暴闪电',hour:15,weather:'storm',season:1},{name:'风起沙尘',hour:15,weather:'dust',season:1},{name:'晴朗夜空',hour:23,weather:'clear',season:1}].map(p=>({...p,playing:false}));
const baseIndices=[0,1,2,4];
export const skyStops=baseIndices.map((n,i)=>({...drylandStops[n],id:['sky-cloud','sky-storm','sky-dust','sky-night'][i],name:['草原上空的云层变化','疏林远处的雷暴闪电','戈壁中的沙尘能见度','绿洲岸边的晴朗夜空'][i],terrain:['云层变化','雷暴闪电','沙尘','夜空'][i],...(i===1?{targetX:drylandStops[n].x-300,targetZ:drylandStops[n].z+400,targetY:drylandView(n).y+110}:{}),...(i===3?{targetX:drylandStops[n].x+160,targetZ:drylandStops[n].z-260,targetY:drylandView(n).y+115}:{}),dryland:false,sky:true,index:i,preset:i+1,lead:['在同一片草原比较晴日与层云，观察上层薄云、低层云和日光变化。','来到疏林前景，比较雨幕、远处闪电与短暂的场景补光。','在原戈壁观察沙尘，比较远景消隐、暖褐天空与近处尘粒。','到原绿洲岸边看晴夜星点、星带、月光和水岸轮廓。'][i],next:i===3?'天空四站完成，可恢复对照前天气；下一段教学转场到东部海崖，进入海蚀洞、岩桥、洞网与地热主线。':'沿同一地形继续，在下一种前景中理解天气氛围。'}));
const lessons=[
 ['同一地形、植被与观察位置保持不变，先用晴日作为基准。','高处薄云与较低云带分层移动，阴云增多时直接日光减弱。','阴天的远景仍较清楚，与雾和沙尘造成的强遮蔽作区别。','风动、云影色调与水面粗糙度共用天气状态；当前没有真实体积云与云影投射。'],
 ['先保留疏林和地形轮廓，比较晴日时的直接光和阴影。','深色云层、较弱日光与冷灰天际共同形成雷暴前景。','雨幕缩短能见范围，暴露地表变湿、水面变粗糙，地形和水位保持不变。','远处折线闪电约每12秒出现一次低频脉冲，短暂照亮场景；室内、地下和水下抑制外部效果。'],
 ['戈壁砾石、干谷与植被仍是已有模型，晴日先看清远景。','沙尘使天空与天际转为暖褐，太阳直射减弱，与阴雨冷灰区分。','较密距离雾使远景先消隐；界面给出按渲染雾参数计算的参考能见距，不是气象实测。','近景尘粒随风移动并贴合实际地表；不产生降雨、积水或地表侵蚀。'],
 ['同一绿洲岸地先以晴日为基准，保持床底、水面和植被位置。','晴夜日光退去，月光保留环境轮廓，深蓝天空与地面形成明暗层次。','星点与程序化星带随夜色出现，云和沙尘遮蔽夜空。','夜空与原有昼夜状态共用参数；星带是美术表现，不表示真实星座、银河位置或天文时间。']
];
export function skyView(i){return {...drylandView(baseIndices[i]),...skyStops[i]};}
export function skyPath(t){const f=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(f)),u=f-i,a=baseIndices[i],b=baseIndices[i+1];return {...drylandPath((a+(b-a)*u)/4),dryland:false,sky:true};}
export const skyApproach=t=>({...drylandPath(1-Math.max(0,Math.min(1,t))),dryland:false,sky:true});
export function skyObservation(i,s){const r=skyStops[i];return {id:`build-${r.id}:${s}`,index:i,stage:s,title:r.terrain+' · '+SKY_STAGES[s],prompt:r.lead,explanation:lessons[i][s],reuse:['固定环境作为对照，避免把地形变化误认为天气变化。','先统一天空色、云层和光照，再加入局部现象。','让远景雾、地表和水面响应同一套参数，明确展示尺度。','最后加入粒子、闪电或星带，保留低频与减少动态选项。'][s]};}

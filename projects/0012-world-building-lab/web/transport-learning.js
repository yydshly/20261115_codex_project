import {TRANSPORT_SITES,TRANSPORT_STAGES,TRANSPORT_LEGS} from './transport-layout.js';
import {productionGroundPath} from './production-learning.js';
import {walkingSurface,LARGE_WORLD} from './large-world.js';
export {TRANSPORT_STAGES};
const text=[
 ['道路连接已有农田、村落、仓储和河湾，不把运输路线画在地形之外。','路带、路肩与路口指示区分通行和停靠；道路顺着实际地面高差铺设。','生产生活链用道路将产地、仓储和家庭连接；新联运批次沿同一村路进仓。','把路看作可达关系：位置、坡度、宽度和交接点共同决定运输能否持续。'],
 ['原跨河木桥连接真实两岸，桥面与原河床、水面有实际高度差。','补上桥头等候标记、栏杆与通行提示，桥上保留货车宽度。','桥梁关闭时，联运货车在桥头等待；重新开放后从相同位置继续，不穿水或跳到对岸。','桥的价值是让原本分开的两岸形成稳定通路；当前是单车与开关规则，未实现承重或车流。'],
 ['码头落在原出湖河岸，保留同一水位、床底和航道。','岸上接路，坡道接栈台，支桩、系缆柱和吊架提供靠泊及卸货位置。','上游小船沿真实河道送来一批渔获，在此卸货换装陆路货车；未把船直接移到岸上。','水运、岸线与路运通过交接点连接。当前只在这段平缓河道演示，不代表全流域通航。'],
 ['转运场布置在原村口道路旁，离开街道主通道进行停车与集散。','停靠位、分类货架、遮棚与路标划分装卸、储放和转向空间。','过桥货物先入转运场暂存，车辆空载去公共驿站补给检修，回来后装货送原粮仓。','节点连接交通与生产，应该能解释货从哪里来、暂存在何处、接下来由谁运走。'],
 ['公共水井沿用原村镇广场的水源位置，连接现有街道。','水桶、候取位置、照明和告示栏把取水与主路通行分开。','一份补给从水井出发，经实际街道送到驿站；水未送达时车辆不能完成设施放行。','公共服务承接日常需求。水量是当前批次的教学单位，未模拟地下水、管网或饮水处理。'],
 ['驿站与转运场接在同一条村路，维修位和休憩区留在通道两侧。','检修遮棚、工具、饮水箱、候车长椅、照明与清洁收集棚共同组成服务节点。','补给送达且检修完成后放行车辆；随后回转运场装货，送原粮仓并接续渔获生产生活批次。','设施不只提供外观，也提供运行条件；居民排队、岗位作息、完整维修和公共服务管理仍待扩展。']
];
export const transportStops=TRANSPORT_SITES.map((r,index)=>({...r,targetY:walkingSurface(r.targetX,r.targetZ)+1,lead:['从已有村路出发，理解交通怎样连接生产、储运与生活。','来到同一跨河木桥，观察两岸可达性与桥头等待规则。','走到原河岸的新码头，观察水陆换装与真实靠泊位置。','进入村口转运场，看暂存、停靠与分配如何接住一批货物。','回到公共水井，看日常补给如何沿街道送到服务设施。','来到检修与休憩驿站，看公共补给和设施放行怎样让运输继续。'][index],next:index===5?'交通设施主线完成，可播放水陆联运，改变桥梁与服务条件再观察。':'沿同一张大地图继续，观察下一个运输或公共服务节点。'}));
export function transportView(index){const p=transportStops[index];return {...p,y:walkingSurface(p.x,p.z)+LARGE_WORLD.eye};}
export function transportObservation(index,stage){const p=transportStops[index];return {id:`build-${p.id}:${stage}`,index,stage,title:p.terrain+' · '+TRANSPORT_STAGES[stage],prompt:p.lead,explanation:text[index][stage],reuse:['先确认地形、水域和道路的可达关系，再确定节点位置。','为通行、停靠、换装、储放与服务留出不同空间。','用明确的交接和放行条件解释设施怎样支持运行。','让交通服务已有生活链，再扩展居民、车流与公共管理。'][stage]};}
export function transportPath(t){const f=Math.max(0,Math.min(1,t))*5,i=Math.min(4,Math.floor(f));return {...productionGroundPath(TRANSPORT_LEGS[i],f-i),t};}
export const transportApproach=t=>productionGroundPath([{x:-244,z:438},{x:-244,z:429},{x:-244,z:405},transportStops[0]],t);

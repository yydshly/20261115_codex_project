import {PRODUCTION_SITES,PRODUCTION_STAGES,LIFE_LEGS,samplePolyline} from './production-layout.js';
import {settlementInteriorAt} from './settlement-layout.js';
import {walkingSurface,LARGE_WORLD} from './large-world.js';
export {PRODUCTION_STAGES};
const details=[
 ['林地提供木材，平缓边缘承接收集场；保留资源地和村落之间的距离。','树群、树桩、原木与工具架区分生长区和已收集的材料。','木料沿小路送入仓储，再分配给作坊制作木用具。木材不直接替代农田粮食。','播放木材批次，可看原料、运输、加工和家庭用具的去向；当前不模拟树木砍伐和再生。'],
 ['农田选择靠近村路的可耕缓坡，小块地随实际地形分段铺设。','耕地、麦行、菜行、田埂和小水桶区分生产与通行区域。','收获先在田边装运，再送粮仓；与沿河渔获形成并行供给，而非先种田再捕鱼。','播放谷物批次，田边收成随采收减少，货车、仓库、市场、作坊和餐桌随批次变化。'],
 ['实际河湾提供水域条件，岸上的作业点保留干地与出入路线。','栈台、支桩、网架、渔筐与小船构成水岸作业空间，水面与床底仍是原水系。','渔获经岸路并入同一仓储和集市；谷物与渔获可以是两条并行食物来源。','播放渔获批次，看筐装渔获、储运、分拣制作和家庭使用；不模拟鱼群繁殖或真实捕捞。'],
 ['粮仓落在已有街区，入口接主街；沿真实门洞进入，货物在门前卸下。','干粮与木料分区码放，中心通道留空，货架和箱体有实际体积。','仓储接收一批原料，保留一半储备，另一半出库送集市；面板列出实际批次数量。','播放时可见入库、库存与出库变化。这里只处理当前演示批次，没有价格、损耗或长期库存系统。'],
 ['集市位于原街区公共空间，生产路线共用村路与主街。','不同货物使用对应箱筐，摊位与通行带分开；人物仍为静态尺度道具。','集市是分配节点：货物暂存后送往作坊，面板和可见货堆保持相同批次状态。','观察公共空间如何承接交换位置，再理解居民和价格系统需要哪些场地条件；当前没有交易经济。'],
 ['工坊入口、真实楼面和工作通道承接市场来料，不另造孤立加工场景。','原工作桌增加谷物、渔获和木作用具的制作位置，桌边有输入与输出区。','谷物制成口粮、渔获整理成鱼干，木料制成木用具；数量按演示配方转换并记录。','货物被送到工作位置，加工前后有对应形态与账目，再通过门前路送往住宅；未实现角色制作动画。'],
 ['住宅位于现有街道旁，从正门进入，日常生活与生产路线落在同一套建筑中。','补齐餐桌、床铺、储物和照明，家具绕开从门口进入的中间通道。','送货停在门前，口粮、鱼干或用具随后摆到家庭位置；面板分别记录到家和使用。','家庭是本批生产生活链的终点。消费事件使演示账目闭合，完整居民作息和长期需求仍待制作。']
];
export const productionStops=PRODUCTION_SITES.map((r,index)=>({...r,targetY:walkingSurface(r.targetX,r.targetZ)+1,lead:['从林地资源开始，看自然条件如何提供材料，并连接村路与生产设施。','走到缓坡农田，把可耕土地、水源、田间操作和收获路线放在一起理解。','来到同一条河湾，比较渔获与粮食这两种并行的食物来源。','穿过粮仓门洞，看物资怎样入库、分类、保留和出库。','回到村镇集市，看公共空间怎样承接产品分配。','进入已有工坊，看原料、制作位置和成品如何相互连接。','穿过住宅正门，在餐桌与起居空间理解生产最终为谁服务。'][index],next:index===6?'生产生活主线完成，可播放谷物、渔获或木材批次，再回看整条链。':'沿同一片村路、河岸与街区继续，看下一个生产生活环节。'}));
export function productionObservation(index,stage){const r=productionStops[index];return {id:`build-${r.id}:${stage}`,index,stage,title:r.terrain+' · '+PRODUCTION_STAGES[stage],prompt:r.lead,explanation:details[index][stage],reuse:['先明确土地、水源、材料与人的需求，再布置生产地点。','按实际用途划分工作、储物、通行与居住空间。','给原料、成品与运输定义明确节点和数量关系。','先验证一条能看清来去的生活链，再扩展居民、经济和故事。'][stage]};}
export function productionView(index){const r=productionStops[index];return {...r,y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye};}
export function productionGroundPath(points,t){const p=samplePolyline(points,t),y=walkingSurface(p.x,p.z);return {...p,y,indoor:!!settlementInteriorAt(p.x,p.z,y)};}
export function productionPath(t){const f=Math.max(0,Math.min(1,t))*6,i=Math.min(5,Math.floor(f));return {...productionGroundPath(LIFE_LEGS[i],f-i),t};}

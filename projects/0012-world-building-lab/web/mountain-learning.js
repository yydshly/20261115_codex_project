import {MOUNTAIN_SITES,MOUNTAIN_STAGES,MOUNTAIN_APPROACH,mountainPath,cablePoint,linePoint} from './mountain-layout.js';
import {walkingSurface,LARGE_WORLD} from './large-world.js';
export {MOUNTAIN_STAGES,cablePoint};
export function mountainWalkPath(t){const p=mountainPath(t);return p.riding?p:{...p,y:walkingSurface(p.x,p.z)};}
const detail=[
 ['山脚缓坡先提供村落基底，主峰、支脊与峡谷构成远近层次。','草土、碎石和裸岩沿海拔过渡；峰顶雪线保留高山的识别特征。','村路接入盘山步道，补给点靠近出发节点，保留向上交通走廊。','几栋山脚房屋、屋前堆料与路标说明登山路线如何承接生活空间。'],
 ['坡面有真实高度差，折返增加道路长度，让爬升沿山体展开。','浅色碎石路带与坡外草土、岩石区分，弯道改变观看方向。','每一段折返路都有连续高程，沿地面行进；陡坡外围不作为通路。','路旁栏杆、里程桩与落石形成近景尺度，主峰在转弯中反复出现。'],
 ['峡谷切入山体，两侧山肩保留落脚点，谷底低于桥面。','两岸裸岩和谷底阴影强调切割深度，桥面没有把沟谷填平。','悬挂木桥连接实际桥头，桥面、承重索、吊杆与护栏分别可见。','站在吊桥中段看下方空间，理解跨越地形与沿地形修路的差别。'],
 ['下站利用山肩平台，向上站留出跨谷视廊。','站坪与周围裸岩分开，基础消化山坡高差。','上下载客平台、支架、缆索和车厢共用同一轨迹；点击乘坐可实际上行。','候车棚、台阶、站牌与车厢窗框明确人的尺度；当前为一条演示索道。'],
 ['上站设在高处稳定山肩，保留离站后继续登顶的路径。','岩石取代山脚草土，远处雪线显示垂直环境差异。','车厢抵达与下站相同定义的平台高程，可在此反向乘坐下山。','从站台回看山脚与峡谷，观察交通如何把两个高度层连接为一个世界。'],
 ['狭长山脊把两侧坡面分开，步道沿脊线及折返坡连接峰顶。','裸岩、碎石和高处残雪共同划分表面，保留陡坡的方向。','离开上站后恢复连续地面行走，观景护栏布置在路径边侧。','风口路标与远景建立方向感；时间、雾和降雪仍使用全图天气控制。'],
 ['主峰真实抬高至约738m，支峰、山脊与谷地在同一高度场中形成轮廓。','峰顶浅雪与下方裸岩、草坡呈垂直分带，属于人工创作的场景参数。','折返步道接到峰顶观景点，索道只承担中段爬升，最后一段仍需登山。','回看村落、桥梁与两座站房，理解地形—地表—交通—生活空间如何组合。']
];
export const mountainStops=MOUNTAIN_SITES.map((p,i)=>({...p,lead:['从青岚山脚村出发，沿同一片山体理解高山场景与垂直交通。','沿实际坡面折返上行，比较道路长度、坡度与观看方向。','走到悬挂桥面上，观察两侧山肩与真实下切峡谷。','来到索道下站，乘同一车厢跨过山谷、上升到高处。','抵达上站平台，回看垂直高度，再走向山脊。','离开站房，沿高山折返步道进入狭窄山脊。','来到青岚主峰，回望从山脚到峰顶的完整空间关系。'][i],next:i===6?'高山主线完成，可反向乘坐索道或返回其他环境。':'沿山路与垂直交通继续前往下一站。'}));
export function mountainObservation(index,stage){const p=mountainStops[index];return {id:`build-${p.id}:${stage}`,index,stage,title:p.terrain+' · '+MOUNTAIN_STAGES[stage],prompt:p.lead,explanation:detail[index][stage],reuse:['先确定峰、脊、谷与落脚平台的实际高程关系。','沿海拔和坡面组织岩土、草地与雪线，而非平均铺满。','让道路、桥和索道分别解决绕坡、跨谷与爬升。','用站房、栏杆、路标和房屋建立可理解的使用尺度。'][stage]};}
export function mountainView(index){const p=mountainStops[index],a=index===6?{x:1500,z:-1000,y:650}:index===3?{x:1224,z:-953,y:190}:index===4?{x:1420,z:-1110,y:470}:mountainPath((index+.07)/6);return {...p,y:walkingSurface(p.x,p.z)+LARGE_WORLD.eye,targetX:a.x,targetZ:a.z,targetY:a.y+1.72};}
// Leave the workshop through its real doorway, recross the village bridge, then follow the existing eastern watershed approach.
export function mountainApproach(t){const p=linePoint(MOUNTAIN_APPROACH,t);return {...p,y:walkingSurface(p.x,p.z),indoor:t<.01};}

import {rawHeight,random,clamp,smooth} from './terrain.js';
export {random};
export const WORLD={width:640,depth:520,sea:0};
export const regions=[
 {id:'coast',name:'潮汐港',terrain:'海岸',x:-182,z:101,color:'#6a9e92',tree:'pine',landmark:'cabin',radius:73,
  title:'从港口出发：先找到世界的边界',lead:'你是一名测绘旅人，要把沿途记录送到远岛灯塔。第一站从海与陆相遇的地方开始。',shape:'海床、沙岸与抬起的陆地，在同一张连续地形上相接。海岸线来自地面高度与统一海平面的交会。',surface:'低岸铺沙，较高处转为草地，陡坡露岩。过渡带把海与陆连接起来。',elements:'渔屋、码头、松树与船只，让地貌成为出发的港口。建筑和活动回应临水的用途。',next:'离开海岸，沿上坡的路进入丘陵；先观察高差怎样变得柔和。',look:[43,32,53]},
 {id:'hills',name:'风车原野',terrain:'丘陵',x:-79,z:91,color:'#90a462',tree:'oak',landmark:'windmill',radius:68,
  title:'缓坡展开：地形组织开阔的生活',lead:'沿路进入原野。风车成为远处的方向标，房屋与树群之间留出草坡。',shape:'连续圆丘让视线缓慢升降。缓坡能承接道路与聚落，仍需按实际玩法验证坡度。',surface:'草地占据主体，土路切出方向；同一块地面有覆盖和裸露的差异。',elements:'风车、农舍、木栏与树群，在开阔地形中建立大小与疏密的节奏。',next:'顺着低处进入溪谷，比较开阔与围合的变化。',look:[46,32,48]},
 {id:'valley',name:'双岸溪谷',terrain:'山谷',x:-93,z:-9,color:'#598666',tree:'oak',landmark:'cottage',radius:66,
  title:'向低处走：河道把空间连成两岸',lead:'溪流穿过林间。小桥连接两岸，小屋退到较高的坡地。',shape:'两边抬起、中间下切的形状形成围合；河道在连续世界中一直向海延伸。',surface:'坡面是草土，水岸出现深色湿泥和砂砾，陡处保留岩面。',elements:'桥回应跨越，小屋避开低处，树林用成簇分布强化两岸。草地材质与立起的草丛分开。',next:'沿支路向西北进入湿地，注意高差变小后，水如何占据更多空间。',look:[-41,34,48]},
 {id:'wetland',name:'苇泽栈道',terrain:'湿地',x:-184,z:-62,color:'#738f7b',tree:'willow',landmark:'stilt',radius:64,
  title:'几步高差：微地形也能改变整个场景',lead:'道路变成木栈道。低平地形的细微起伏，决定哪些地面露出水面。',shape:'小幅高差形成浅水与草洲；这里和远处海洋采用相同水位，只是低地的位置不同。',surface:'深湿泥和苔草接在水边，没有高山那样强烈的岩雪分带。',elements:'芦苇、柳树、高脚屋与木栈道回应潮湿环境，人物在栈道旁提供尺度。',next:'离开低地，山壁在前方抬升；通路将进入狭窄峡谷。',look:[43,29,44]},
 {id:'canyon',name:'赤壁关隘',terrain:'峡谷',x:-63,z:-148,color:'#b18d68',tree:'cactus',landmark:'tower',radius:68,
  title:'壁与沟：垂直关系改变行进方式',lead:'赤色岩壁夹住道路。瞭望塔提示这里是一个需要观察和通过的关隘。',shape:'窄沟、层阶与陡壁形成垂直空间。它与之前圆缓的丘陵有不同的大形。',surface:'暖色岩面、砂砾与少量沙土突出层阶，植被覆盖明显减少。',elements:'岩柱、仙人掌、桥与瞭望塔，把地形限制转化为地标和跨越线索。',next:'顺着山路登上平顶台地，比较陡壁上方究竟是什么形状。',look:[52,43,48]},
 {id:'mesa',name:'风蚀高台',terrain:'台地',x:66,z:-131,color:'#aa946a',tree:'scrub',landmark:'arch',radius:72,
  title:'登上平顶：同样高，却有不同的空间',lead:'山路抵达开阔高台。石拱成为路径上的视觉门框，低灌木留下远眺空间。',shape:'平坦顶部与陡边形成台地；同样的高度，如果顶部变尖或变圆，使用方式就会不同。',surface:'砂岩、碎砾与裸土表达干燥层次，覆盖不会自动改变下面的形状。',elements:'低灌木、石拱与观察点组织视线；在这里留白与加物件同样重要。',next:'高台逐渐降入干燥盆地，岩层将过渡成连续沙脊。',look:[48,36,49]},
 {id:'dunes',name:'流沙驿站',terrain:'沙丘',x:180,z:-64,color:'#c9ac77',tree:'palm',landmark:'tent',radius:70,
  title:'大形与细节：沙丘和沙纹是两回事',lead:'沙脊连续起伏。旱生植株与营地集中在局部，大片空地保留方向与距离感。',shape:'沙丘是大尺度波状地形，轮廓和阴影先让我们读懂它。',surface:'沙地的暖色与细颗粒属于覆盖层；把沙材质铺到峡谷上，不会自动得到沙丘。',elements:'稀疏植株、岩块、帐篷与驿站旅人集中在局部，不把每片地面放满。',next:'向南接近黑色山锥，比较同样干燥的区域为何形成不同氛围。',look:[46,29,48]},
 {id:'volcano',name:'黑曜火口',terrain:'火山',x:166,z:42,color:'#6d6159',tree:'dead',landmark:'outpost',radius:68,
  title:'围出火口：形状先于氛围',lead:'黑岩环脊围住发亮的火口。观察站停在外围，枯木与裸露岩地回应严酷条件。',shape:'外侧山锥与中心凹陷一起构成火口；只造一个尖锥，表达的是另一种形态。',surface:'玄色岩地与灰烬色差提供表面特征，局部熔岩强化冷暖对照。',elements:'熔岩池、黑岩、枯木和外围观察站共同组织危险感；本例没有伤害或热力规则。',next:'转向内陆雪岭，观察高度、坡度和覆盖怎样再次组合。',look:[64,53,62]},
 {id:'alpine',name:'云脊雪岭',terrain:'高山',x:28,z:-10,color:'#b5c9ca',tree:'pine',landmark:'cabin',radius:76,
  title:'越过雪线：覆盖跟着条件变化',lead:'道路攀升到山脊，针叶林渐稀，岩面和积雪接管高处。回望时，之前的区域仍在同一个世界里。',shape:'峰脊、鞍部与陡坡建立大尺度高差；相机飞行方便观察，不代表道路已可攀爬。',surface:'海拔和坡度一起影响雪、岩、草土分布；雪线是教学规则，不是气候模拟。',elements:'山屋、针叶树与雪岩给高山提供尺度，稀疏配置保留山脊轮廓。',next:'最后越过南侧海湾，前往远岛灯塔，把整条主线重新连起来。',look:[71,56,70]},
 {id:'island',name:'归航灯塔',terrain:'海岛',x:130,z:182,color:'#71a89b',tree:'palm',landmark:'lighthouse',radius:53,
  title:'把世界读成整体：地形承载人物与故事',lead:'测绘记录终于送达灯塔。你走过的区域、路与海湾，共同构成了这一趟旅程。',shape:'岛心、缓坡、浅滩与海床连接在同一地形上，海水把它与主大陆分开。',surface:'沿海拔从沙岸过渡到草地与岩面，统一水位画出岛屿边界。',elements:'灯塔给旅程一个目的地，房屋、码头、船和人物让空间有使用者。',next:'旅程完成。返回全景，或切换三层，重看这一个世界怎样逐层建立。',look:[56,36,62]}
];
export function weightsAt(x,z){let sum=0;const values=regions.map(r=>{const d=Math.hypot(x-r.x,z-r.z)/r.radius;const v=Math.exp(-Math.min(700,d**4*1.5));sum+=v;return v;});return values.map(v=>v/(sum||1));}
export function regionAt(x,z){let result=regions[0],distance=Infinity;for(const r of regions){const d=Math.hypot(x-r.x,z-r.z)/r.radius;if(d<distance){distance=d;result=r;}}return result;}
export const riverCenter=z=>-110+17*Math.sin((z+5)*.028);
export function worldHeight(x,z,includeLegacyRiver=true){
 const w=weightsAt(x,z);let h=0;
 regions.forEach((r,i)=>{if(w[i]<.0001)return;const lx=clamp((x-r.x)*.8,-65,65),lz=clamp((z-r.z)*.8,-65,65);let v=rawHeight(r.id,lx,lz,17);
  if(r.id==='wetland')v=(v-4.5)*2+.5;
  else if(r.id==='alpine')v=v*2.1+7;
  else if(r.id==='volcano')v=v*1.75+4;
  else v=v*1.3+4;
  h+=v*w[i];
 });
 const edge=Math.hypot((x+22)/265,(z+28)/221),mask=(1-smooth(.81,1.045,edge))*(1-smooth(103,153,z));
 h=(h+7)*mask-7;
 const island=29*Math.exp(-(((x-130)/34)**2+((z-182)/32)**2))-5;
 h=Math.max(h,island);
 if(includeLegacyRiver&&z>-50&&z<140){const channel=Math.exp(-(((x-riverCenter(z))/3.4)**2))*smooth(-50,-28,z)*(1-smooth(125,140,z));h=h*(1-channel)-1.7*channel;}
 return h;
}
export function worldSlope(x,z){return Math.hypot((worldHeight(x+1,z)-worldHeight(x-1,z))/2,(worldHeight(x,z+1)-worldHeight(x,z-1))/2);}
const colors={coast:['#71905d','#cbbb90'],hills:['#82965a','#a48e68'],valley:['#6e8c55','#81896d'],wetland:['#758b66','#627f70'],canyon:['#b99b78','#bd976c'],mesa:['#ad9c79','#c3aa7d'],dunes:['#d4b57e','#c7a36b'],volcano:['#5c5954','#746758'],alpine:['#d9e5e0','#8c9e94'],island:['#789a61','#d8c596']};
export function surfaceColor(x,z,h=worldHeight(x,z),slope=0){const w=weightsAt(x,z),result=[0,0,0];regions.forEach((r,i)=>{if(w[i]<.001)return;let c=colors[r.id][0];if(['coast','island'].includes(r.id)&&h<4)c=colors[r.id][1];if(r.id==='alpine'&&h<35)c=slope>.9?'#8c9992':'#7f956a';if(r.id==='wetland'&&h<1.5)c=colors[r.id][1];if(['canyon','mesa'].includes(r.id)&&slope>.6)c=colors[r.id][1];const hex=parseInt(c.slice(1),16);result[0]+=((hex>>16)&255)*w[i];result[1]+=((hex>>8)&255)*w[i];result[2]+=(hex&255)*w[i];});const variation=.96+Math.sin(x*.19+Math.cos(z*.13))*.035;return result.map(v=>Math.round(v*variation));}
export function routePoints(){return regions.map(r=>[r.x,r.z]);}

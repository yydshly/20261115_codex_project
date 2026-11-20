// Shared by the overview and the 3D survey. Coordinates locate today's comparison sites.
import {tectonicRoute} from './tectonic-layout.js';
import {divideAuditPaths} from './basin-divide.js';
import {coldAuditPaths} from './cold-environment.js';
import {warmAuditPath} from './warm-belt.js';
import {coastAuditPath} from './coast-sea.js';
import {legacyAuditPath} from './ice-legacy.js';
import {deepTimeAuditPaths} from './deep-time.js';
import {ventAuditPaths} from './fluid-vents.js';
import {atmospherePath} from './atmosphere-study.js';

export const gapKinds={
  connected:{name:'3D 形成对照已接入',color:'#aadd9a'},
  connection:{name:'形成关系待连通',color:'#f1c680'},
  modern:{name:'现代 3D 待补',color:'#8edce0'},
  ancient:{name:'史前 3D 待补',color:'#d6b9f3'}
};

const entries=[
  {
    id:'rock-to-relief',kind:'connected',name:'从东南陆缘、青岚山到中央河谷的连续剖面',
    mapName:'东部岩性',region:'东南海沟、东部火山弧、青岚山前 → 中央河谷',
    anchor:[1150,-430],paths:[tectonicRoute.path.map(({x,z})=>[x,z])],
    have:'同一条 3D 剖面已从海沟、火山弧和青岚山前，越过鞍部接到跌水、出湖河汇口和中央河谷横剖面。可切换基岩、风化覆盖与水路。',
    gap:'板片构造和覆盖层厚度仍采用示意。深层含水层与长时间的侵蚀沉积留给后续专题。',
    why:'岩性和坡度是后面读土壤、补给和河谷形态的共同前提。',
    check:'从玄武岩和山前层岩切到青岚结晶岩坡，再到河谷冲积层。最后放大河谷横剖面，比较两岸、河床和水面。',
    sample:{mode:'tectonics',label:'打开海沟到中央河谷连续剖面'}
  },{
    id:'basin-borders',kind:'connected',name:'三流域分水坡、入渗与出水',
    mapName:'流域边缘',region:'中央海湾、西南雨林与西部内流盐盆的分水坡',
    anchor:[-1460,510],paths:divideAuditPaths,
    have:'沿三处分水坡航拍，顺坡看格网汇流、地表覆盖与基岩剖面，对照同一小时的坡流、入渗和浅层缓释，再到河口或盆内终点。',
    gap:'中央显示现有扇尾泉溪。雨林谷脚与盐沼湿岸显示样格缓释示意，独立泉口、深层水路和跨界连通待校定。',
    why:'决定哪些地表与湿地能持续得到水，也让盐盆的内流边界在地面上看得懂。',
    check:'在雨结束时对照扇面砂砾、结晶岩坡和盐盆层岩；拖到雨后看浅层缓释。走到三处终点，核对两个入海量和盐盆存水。',
    sample:{mode:'formation',study:'divide',label:'沿分水坡对照同一场雨'}
  },{
    id:'cold-belt',kind:'connected',name:'北部冷岸、林线与高山冻融带',
    mapName:'北部冻融',region:'北境冰岸 → 苔原和混交林；雪岭 → 青岚高处',
    anchor:[-585,-1175],paths:coldAuditPaths,
    have:'在北岸低海拔带和青岚—雪岭高山带用同一冷暖指标比较林缘与林线。可切换 1 月和 7 月，查看多边形冻土、热融浅洼、碎石坡、冰斗、冰下 U 形谷和冰碛湖。',
    gap:'冻土活动层和热融过程采用局地教学样本，冷暖和雪储是场景相对量。林线带显示适生条件，现有群落与多年冰川演变仍以场景设定为准。',
    why:'补全冷环境从岩面、冻土、融水到植被的关系，可直接支撑史前冰缘地貌对照。',
    check:'比较两处林线从哪里开始，切季节看活动层和热融洼地，最后横切冰川看冰下谷床与地表高差。',
    sample:{mode:'cold',label:'查看北岸与高山的两条剖面'}
  },{
    id:'warm-belt',kind:'connected',name:'西南迎风湿林到南部背风草地',
    mapName:'南部湿干带',region:'西南雨林、南部主脊 → 林草过渡和干谷',
    anchor:[-740,1080],paths:[warmAuditPath],
    have:'沿雨林低滩、迎风坡、主脊、背风疏林草地和干谷航拍。在同一站切 7 月与 1 月，观察降雨、根区湿度、河漫滩与季节性积水草地。',
    gap:'河岸水位和浅沟积水是场景季节试算，木本间距按长期干湿条件布置，地被呈现两季状态。群落多年演替待补。',
    why:'西南湿地和南部干地相邻，过渡带决定它们能否被读成一个连续区域。',
    check:'在同一位置两季对照迎背风雨量、坡面湿度、雨林低滩漫水及背风浅沟的独立积水。观察退水后湿草和疏林的分布。',
    sample:{mode:'rain-shadow',label:'在 3D 原位切换雨季与旱季'}
  },{
    id:'coast-shelf',kind:'connected',name:'由河口与岩岸接到浅海、陆架和深海',
    mapName:'浅海与陆架',region:'西南河口浅岸与东部岩岸、东南陆架',
    anchor:[1575,650],paths:[coastAuditPath],
    have:'东部航段已可切换海温和风向，在同一航线上看冷流、海雾和能见度。可继续经过岩岸、浅海、陆架和陆坡，下潜看热液烟囱、冷泉与海沟。',
    gap:'水深沿用压缩地图尺度。冷流温度带与雾的输送使用简化场景条件，暖水礁坪与深处群落保留教学样区。',
    why:'连续的陆海过渡决定河口、岩岸和海床是否属于同一张地图，也提供低海面时的出露参照。',
    check:'切潮位确认岩岸露淹。用同为 3 米水深对照河口和清浅海岸，再下潜比较浅海软硬底群落和陆架、海沟的底栖动物。',
    sample:{mode:'coast-sea',label:'沿线对照河口、礁坪与深海'}
  },{
    id:'ice-age-legacy',kind:'connected',name:'晚更新世到现代的地貌遗存',
    mapName:'退冰遗存',region:'雪岭冰缘 → 中央河谷、河口 → 低海面出露陆架',
    anchor:[-1060,-280],paths:[legacyAuditPath],
    have:'从雪岭旧冰缘、冰碛、冰碛湖到中央河谷、苇泽湿地、河口和内外陆架共八站。六个时期共用坐标，可看冰缘退缩、古河槽逐段被淹和现代湿地分带。',
    gap:'旧冰碛样段、古河槽复原和海侵后回填采用教学尺度。床面高差用于示意填积空间，年代与沉积厚度均未按实地测量校定。',
    why:'这是现有史前时间层最直接的补全，可解释现代一部分谷地、高岸与湿地的由来。',
    check:'在旧冰碛切冰退前后，在内外陆架分别对照何时被淹。打开现代遗存剖面看旧槽、现床面与苇泽湿地分带。',
    sample:{mode:'legacy',epoch:'glacial',label:'追踪晚更新世到现代的地貌遗存'}
  },{
    id:'deep-time',kind:'connected',name:'史前海陆、早期森林与煤系沼泽',
    mapName:'史前海陆与湿地',region:'东部海岸、中央低盆地、苇泽湿地和北部冷岸',
    anchor:[510,135],paths:deepTimeAuditPaths,
    have:'已有古海道、高纬林地、早期森林、煤系沼泽和寒武纪河口至崖脚路线。新增三叠世古河、倒木和侏罗世季节河湖两例。',
    gap:'古水深、植株外形、埋藏层和漂流过程采用教学比例。图谱另有三个史前条目保留概念剖面。',
    why:'水位、坡降与排水控制海岸和河漫滩。河流注入细泥、外海台地陡降、低地长期水湿，分别改变沉积和保存条件。',
    check:'先在河弯切换涨水搬运和退水搁浅，再去同坐标的侏罗世湖缘，对照雨旱季、常年水面和岸边蕨类。',
    sample:{mode:'deep-time',case:'triassic',station:'bar',label:'从古河洪泛到季节湖泊'}
  },{
    id:'local-scenes',kind:'connected',name:'局地现象和特殊群落',
    mapName:'天气与局地环境',region:'南部草原、戈壁、东南暖海和东部地热区',
    anchor:[-420,1000],paths:[...ventAuditPaths,atmospherePath],
    have:'东南海床已可下潜对照热液烟囱与冷泉。东部地热区已有间歇喷发、钙华阶池和酸性泥池。南部已有灌丛火后恢复。新增彩虹、日晕、蜃景、龙卷和热带气旋的原位条件对照。',
    gap:'现代图谱的专项目已有 3D。蜃景与强风环流采用教学近似，尺度、风速与海气响应待进一步验证。',
    why:'局部水热和流体化学可以在同一气候背景下造出差别很大的景观。火后群落主要由季节、干湿和扰动决定，特殊天气需要单独观察光线与风。',
    check:'先在草原对比彩虹和日晕的观察方向，再看戈壁贴地蜃景和草地触地漏斗，最后在暖海俯看眼区、眼墙和螺旋雨带。',
    sample:{mode:'atmosphere',station:'rainbow',label:'沿五站对照天空与风场'}
  }
];

export const environmentGaps=entries.map((entry,index)=>({...entry,rank:index+1}));
export const gapFor=id=>environmentGaps.find(gap=>gap.id===id)??null;
export const gapMapHref=(id=null)=>'expedition.html?'+new URLSearchParams({
  plan:'gaps',...(gapFor(id)?{focus:id}:{})
})+'#build-1';

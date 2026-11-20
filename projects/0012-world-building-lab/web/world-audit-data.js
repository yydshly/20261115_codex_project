import {ancient,groups,modern} from './environment-catalog.js';
import {spatialZones} from './world-logic-data.js';
import {coldMapHref} from './cold-environment.js';
import {warmBeltHref} from './warm-belt.js';
import {atmosphereHref} from './atmosphere-study.js';
import {scrubHref} from './scrub-recovery.js';
import {coastSeaHref} from './coast-sea.js';
import {legacyHref} from './ice-legacy.js';
import {deepTimeHref} from './deep-time.js';
import {ventHref} from './fluid-vents.js';

export const auditCounts={
  modern:modern.length,groups:groups.length,
  linked:modern.filter(item=>item.href).length,
  unlinked:modern.filter(item=>!item.href).length,
  ancient:ancient.length,ancientLinked:ancient.filter(item=>item.href).length
};

export const coverageAudit=[
  {status:'done',title:'现代环境基座 V1',present:'在同一张 3.84 × 3.12 公里的地图上，雪岭到中央海湾可连续步行 2.48 公里。总览与 3D 共用海陆、主山脊、水汽和分水岭。',boundary:'四处接缝已核对地面高程和通行。航拍仍能辨出部分植被和底质样区的直边。',href:'#geographic-foundation',action:'查看统一地理底图'},
  {status:'done',title:'主要地表水路',present:'中央主河及北部双支流通往中央海湾。高原溪流另经雨林出海，西部盐盆保持内流。',boundary:'地表连通已有实景和数值检查，支沟、泥炭浅洼与含水层等补给按局地解释。',href:'expedition.html?plan=lines&focus=water#build-1',action:'沿顺水线查看'},
  {status:'sample',title:'气候带、植被与冰雪',present:'北岸与高山可对照林线、雪储及冻融。西南湿林过南部主脊到背风草地和干谷可原位切换雨季与旱季。',boundary:'气候用相对条件表达。林线显示适生范围，雨季与旱季展示两种场景状态。',href:coldMapHref(),action:'对照北岸与高山'},
  {status:'sample',title:'干谷灌丛与火后恢复',present:'南部干湿线可转入干谷坡面，沿坡肩、坡脚和沟缘对照火前灌丛、火后裸地、首个雨季返青和数年恢复。',boundary:'同一地形采用冬雨夏干的局部气候对照。植被更新用萌蘖和实生两种途径示意。',href:scrubHref,action:'进入干谷坡地对照'},
  {status:'sample',title:'天空、光学天气与极端风场',present:'云层、雷暴、沙尘和夜空路线接入五个 3D 对照，可查看彩虹和日晕的方向、戈壁蜃景、触地龙卷及海上气旋风眼。',boundary:'光学角度按形成几何表达，蜃景和极端风场按教学尺度展示。',href:atmosphereHref,action:'从草原天空看到暖海风场'},
  {status:'sample',title:'海岸、海床与地下',present:'河口、岩岸、浅海海草与造礁珊瑚可一路对照到陆架和海沟。东部航段可看冷流和沿岸海雾，洞穴和岩溶另有剖面。',boundary:'深度、底光、近岸气温和海雾输送采用场景设定。',href:coastSeaHref,action:'沿河口和海床查看'},
  {status:'sample',title:'海底出露与陆上地热',present:'硬底热液烟囱与沉积坡脚冷泉有下潜近景。东部地热区可切换间歇喷发阶段，沿溢流看钙华阶池和酸性泥池的区别。',boundary:'从现有海床和地表定位。地下通道、出露规模、喷发周期和群落配置为教学设定。',href:ventHref('ocean','vent'),action:'打开海陆流体出露路线'},
  {status:'sample',title:'地貌形成过程',present:'已有构造剖面、岩性分区、全年风雨与逐月水量收支。中央海湾可连续观察降雨、泥沙、潮滩植被及风暴潮。',boundary:'三流域已共用一场雨的逐小时试算；潮相、长期岸线和群落反馈仍由中央海湾专题细化。',href:'expedition.html?plan=logic#build-1',action:'读形成主线'},
  {status:'sample',title:'从末次间冰期到现在',present:'十二个时间节点共用三条环境线。盛冰期到现在还可沿八站对照旧冰缘、冰碛、苇泽湿地和被淹的陆架古河槽。',boundary:'水位与冰缘采用压缩场景尺度。古河槽横剖面用床面高差示意沉积空间。',href:legacyHref,action:'在 3D 大地图追踪地貌遗存'},
  {status:'sample',title:'更早的史前环境',present:'晚白垩世内陆海道可看海侵、海退与床底。始新世高纬暖湿林可沿曲流、河漫滩、积水洼地和林冠对照长昼长夜。',boundary:'两例共用现代对照坐标，各自采用独立古地形。',href:deepTimeHref('seaway'),action:'打开古海道与暖湿林'},
  {status:'sample',title:'泥盆纪早期森林与石炭纪煤系沼泽',present:'中央河谷与苇泽湿地的同一组坐标已有两套古景，可以沿古河槽到高滩对比树形、根土、泥炭和洪水覆泥。',boundary:'地形剖面和植株比例用于展示化石与沉积证据。成煤涉及后续长期埋藏。',href:deepTimeHref('devonian','roots'),action:'在同一站对照早期森林与煤系沼泽'},
  {status:'sample',title:'寒武纪三角洲前缘与海底崖坡',present:'东部近岸有八站，从砂坝与河洪泥沙到较清的碳酸盐台地、陡崖和盆底。近岸和崖脚可下潜对照。',boundary:'澄江与布尔吉斯页岩作为不同地点的地层对照。位置、水深和能见度用教学尺度示意。',href:deepTimeHref('cambrian','front'),action:'顺剖面查看两种古海底'},
  {status:'sample',title:'三叠世洪泛地与侏罗世河湖',present:'沿同一组河谷站点看支流汇合、涨水搬运倒木、退水搁浅，再切到雨旱季比较湖心保水和岸边蕨类。',boundary:'水位、补给和搬运速度采用教学尺度，两类古景各依其地层记录构建。',href:deepTimeHref('triassic','bar'),action:'对照古河搬运与季节性河湖'},
  {status:'planned',title:'图谱里其余的史前案例',present:'已有形成条件、概念剖面和参考资料。',boundary:'成冰纪低纬冰川、二叠纪古沙海和早白垩世火山湖盆仍待 3D。',href:'environment.html#ancient',action:'查看史前图谱'}
];

const regionNotes={
  nw:'层岩、台塬与北部支流源区',
  n:'极地海岸、冷坡、上游与岩溶',
  ne:'青岚高山、雪岭及高差过渡',
  w:'内流盐盆、高原塘溪及中央海湾',
  c:'河谷、湖盆、平原与聚落',
  e:'火山、东部岩岸与地热',
  sw:'雨林、红树林及独立出海河口',
  s:'竹林、林草坡、干谷灌丛、戈壁与绿洲',
  se:'沙丘、岛岸、陆架与深海'
};
export const auditRegions=spatialZones.map(({id,name,color})=>({
  id,name:name.split(' · ')[0],color,note:regionNotes[id]
}));

export const auditSeams=[
  {id:'north',title:'北境海岸 → 冷坡 → 混交林',
    seen:'从冰岸到冷坡已经能走通。总图仍能看见雪地的直边，以及高出周围地面的方形林台。',
    issue:'冰岸和冲积扇边缘的高程改为渐变。冷坡以疏林衔接混交林，东西两支仍沿坡脚下行。',
    alt:'北部冰岸的直边和近处独立高起的方形混交林台'},
  {id:'south',title:'西南湿林 → 迎背风山脊 → 草原与砾地',
    seen:'已有湿林、疏林到草地的过渡段。俯视仍见树群集中在样区一侧，地表在数条近直线处切色。',
    issue:'雨林原河床仍保留，河岸和弯道坡肩采用连续过渡。迎风湿林逐步变矮变疏，背风坡接草地和砾土，浅沟保留草带。',
    alt:'雨林成片树群与草地之间近直线的覆盖边界'},
  {id:'west',title:'西部盐盆 ↔ 高原分水坡 → 雨林河口',
    seen:'盐盆内流、高原外流的地表关系已有依据。俯视时盐盆与高原之间仍有成块高台、陡边和水隙，流域分隔容易被读成样区分隔。',
    issue:'盐盆边缘接向高原坡脚，塘溪接续处的岸坡和外排溪谷的弯道已修顺。盐盆在盆内蓄水，高原溪谷经雨林出海。',
    alt:'西部盐盆样区与高原之间的陡边和水隙，另一侧高原溪流通向雨林'},
  {id:'east',title:'东部山前 → 火山岩岸 → 陆架',
    seen:'陆架和大陆坡已有剖面。火山带、岩岸台面仍能辨出长直边和陡直样区边缘。',
    issue:'沿同一条高程剖面可从火山侧翼看到岩岸、陆架和大陆坡。「显示海床」揭开剖面附近的海面。',
    alt:'东部火山样区、岩岸台面与外海相接处的直边'}
];

export const formationAudit=[
  {title:'从海陆构造到中央河谷',baseline:'东南海沟、东部火山弧、青岚断层褶皱已接到中央河谷。沿剖面切换基岩、风化带、坡面和现有河床。',gap:'基岩分区共用地图设定，岩层厚度和地下板片仍为教学示意。',href:'expedition.html?plan=tectonics#build-1',action:'走地质与河谷连续剖面'},
  {title:'分水岭、出口与补给',baseline:'三处分水坡已接入同场雨。沿现有水路看坡面径流、入渗与蓄水，从北支扇尾泉口和雨林、盐盆的缓释样格走到各自终点。',gap:'浅层剖面厚度为示意。西南与盐盆的独立泉口及跨界地下通道待校定。',href:'expedition.html?plan=formation&study=divide#build-1',action:'沿三处分水坡航拍'},
  {title:'纬向背景、海拔与冷暖',baseline:'北岸低海拔与青岚—雪岭高山带共用冷暖规则。沿线比照林线、雪储、冻土活动层、冰斗和冰下横谷。',gap:'相对冷暖、活动层和雪储采用场景参数。深层冻土与多年冰川演变仍需独立模型。',href:coldMapHref(),action:'打开两条冷环境剖面'},
  {title:'雨影、土层与植被',baseline:'雨林、南部主脊、背风疏林长草和干谷已接成一线。对照 7 月与 1 月的降雨、根区湿度、雨林河岸漫水和背风浅沟积水。',gap:'水位和地被为两季的场景试算。长期物种更替和跨年生长待补。',href:warmBeltHref,action:'沿湿干过渡切换两季'}
];

export const auditPriorities=[
  {title:'现代环境基座 V1 已核验',detail:'统一比例、海陆、主脊、季节水汽和分水岭。雪岭到海湾全线可走，四处接缝标明步行与航拍段。'},
  {title:'雪岭到海湾连续步行',detail:'沿干岸与栈道串起雪岭、河谷、湿地、河口和海湾。可自由步行或开启步行导览。'},
  {title:'四处地形接缝的通行复查',detail:'从三条环境线进入北部林台、南部湿干带、西部盆缘和东部海岸，绿色实线标出可连续步行段，金色虚线标出航拍段。'},
  {title:'已接入三流域形成对照',detail:'两个出海流域与西部盐盆共用逐月规则和逐小时降雨试算，可对照补给、出海、盆内留盐和岸带。'},
  {title:'核对史前时间层的区域联系',detail:'暖期、入冰、盛冰期和退冰已接入三线，扩展其他史前时段时沿用同一地图坐标，逐段核对海陆与植被边界。'}
];

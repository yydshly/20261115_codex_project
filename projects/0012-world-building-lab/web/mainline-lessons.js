import {benchmarkLength,benchmarkStops} from './benchmark-trail.js';
import {seaStations} from './mainline-sea.js';

export const mainlineLessons=[
  {id:'ridge',stop:0,title:'山高，水从哪边走',
    script:'先看雪岭的坡面和下方的谷槽。山脊把降到两侧的水分开，海拔高的地方更容易积雪。做世界时，先确定主山脊、分水岭和出海方向，河谷的走向才有依据。接下来沿山坡走，看看冰雪如何从高处接到湖里。',
    task:'先找高处的雪面和低处的谷槽，再到地理底图对照主山脊、分水岭与水汽箭头。',
    studies:[{label:'在总图看山脊和风向',plan:{environmentMode:true,environmentFocus:'warmth'}}]},
  {id:'ice-lake',stop:2,title:'冰舌退开，湖水留下',
    script:'我们站在冰碛湖旁。低洼处留住水，湖水达到出口高度才会流到下游。就在这里切到盛冰期，原来的观察点会被冰覆盖。地形没换地方，冰缘和水面变了，能走的路线也跟着变。',
    task:'点「对照盛冰期」观察冰体，再点「回现在」看同一处湖岸和融水出口。',
    compare:{epoch:'glacial',label:'对照盛冰期'}},
  {id:'source-pool',stop:4,title:'地表水和地下水怎么汇合',
    script:'前面的源池接收从冰湖下来的融水。流域里还有另一条路径，雨水渗进地下，在地势低、地下水头较高的地方出露。这次到同一流域的北支流做对照。试着让雨停一段时间，留意为什么泉口还有水。',
    task:'进北支汇水实验，开启「停雨 14 天」对照地表来水和地下缓释。',
    studies:[{label:'看北支泉口的两条水路',plan:{exchangeMode:true,exchangeFocus:'spring'}}]},
  {id:'river-valley',stop:6,title:'泥沙如何变成滩地和土壤',
    script:'从坡陡的上游走到这里，河谷已经明显展宽。河水涨起来会漫过岸边，流速降低后，砂和细泥会在不同的位置停下。做场景时，先确定河床、河岸和低滩，再用沉积和保水解释岸边的土和植物。',
    task:'打开河漫滩剖面，切换土层和植被，比较低滩细泥与较高岸地。',
    studies:[{label:'看河漫滩土层',plan:{soilMode:true,soilFocus:'flood'}}]},
  {id:'wetland',stop:7,title:'水位怎样画出植被带',
    script:'看苇泽边缘。深槽留着开水，浅水边缘有芦苇，更高的泥滩会周期性露出，适合耐湿的莎草。比较丰水和退水，跟着岸线看一看，哪里先露出，哪里露出来以后还保持湿润。',
    task:'先看「丰水期」，再打开「退水过程」选择「退水 14 天」，比较露滩和莎草、芦苇带。',
    studies:[{label:'对照湿地洪泛与退水',plan:{wetlandMode:true,wetlandFocus:'seasonal'}}]},
  {id:'estuary',stop:8,title:'淡水到这里遇上涨潮',
    script:'河道分汊之后，既有上游来的淡水，也有从海湾顶进来的咸水。涨潮和退潮会改变盐度前缘、泥沙去向和裸露滩面。先在同一来水条件下切换潮段，再把时间切到暖期，看看同一位置是否还露在水面上。',
    task:'先切涨潮与退潮，看盐度前缘移动。返回本站，再对照暖期的淹水范围。',
    compare:{epoch:'interglacial',label:'对照暖期'},
    studies:[
      {label:'比较涨潮与退潮',plan:{estuaryMode:true,estuaryFocus:'fork'}},
      {label:'追踪同一场雨的泥沙',plan:{stormMode:true,stormFocus:'estuary',stormStudy:'sediment'}}
    ]},
  {id:'bay',stop:9,title:'从海湾回读整个流域',
    script:'到海湾了。回想刚才的顺序，山脊和高程安排水路，岩土、降雨和融水决定补给，河流搬运泥沙，最后在湿地和河口形成不同的土层与植被。现在回到总图，用南北冷暖和海岸到内陆两条线，检查这套解释能不能用到别的区域。',
    task:'到地理底图切换三条环境线，再看东部岩岸如何接到水下陆架。',
    studies:[
      {label:'用三条环境线复盘',plan:{environmentMode:true,environmentFocus:'inland',environmentSeam:'east'}},
      {label:'看同一场雨在三流域的去向',plan:{formationMode:true,formationStudy:'event'}}
    ]}
].map(lesson=>({...lesson,...benchmarkStops[lesson.stop]})).concat([
  {id:'coastal-fog',station:'current',name:'东部冷流带与海雾',title:'同一股湿空气，经过不同温度的海面',
    script:'这里的冷流沿东部陆架流动，使近岸海面降温。湿空气经过一段冷水带后可能冷到露点起雾。风继续把已经形成的雾带走，所以岸边能否见到雾，还取决于风向。',
    task:'先保持风向切换冷流和较暖海面，再回到冷流切换离岸风。看雾是抵达岩岸，还是移向外海。'},
  {id:'east-rock',station:'rock',name:'东部岩岸',title:'从岸边接向海床',
    script:'从中央海湾沿南部外海绕到东部岩岸。水线经过同一块斜坡，岩岸在海面下继续延伸。下一段从水面下降到同一片浅水区。',
    task:'继续前往海草床，观察水面升到头顶时，岩脚和底砂是否还在原位。'},
  {id:'seagrass',station:'grass',name:'浅海海草床',title:'清浅的砂底让海草扎根',
    script:'镜头已在水下。清水把更多光送到浅海底，稳定底砂可让海草扎根。水深相近时，浑浊的西南河口仍会有更弱的底光。',
    task:'沿底砂游到礁坪，看相近的水深里，底质怎样改变群落。',
    studies:[{label:'对照西南浑浊河口',plan:{coastStudy:{station:'mouth',view:'dive'}}}]},
  {id:'reef',station:'coral',name:'暖水礁坪',title:'相近水深，砂底接到岩礁',
    script:'浅海从底砂过渡到硬底。岩面提供附着面，这里的光照和暖水条件容许造礁珊瑚生长。离岸后水逐渐变深，适合海草和浅海造礁珊瑚的范围缩小。',
    task:'继续下潜，沿同一片海床观察礁坪退去，陆架的粉砂与底栖动物出现。'},
  {id:'shelf',station:'shelf',name:'大陆架',title:'宽缓海床也会变暗',
    script:'来到大陆架。与刚才的浅海相比，水深已经把大部分光挡在上方。砂和粉砂仍能积在缓坡上，可以寻找贝类与海星。',
    task:'对照正在经过的海床和底光读数，沿边缘继续找坡度开始明显变陡的位置。'},
  {id:'slope',station:'slope',name:'大陆坡',title:'坡面硬底与凹处沉积',
    script:'海床变陡后，细粒容易沿坡移动，在局部凹处积下。裸岩提供附着面，灯下能见到硬底附近的海绵形态。',
    task:'沿这条坡到海沟。也可从坡脚进入海底热液与冷泉，回来后从本站继续。',
    studies:[{label:'看海底热液与冷泉',plan:{fluidVentStudy:{route:'ocean',station:'seep'}}}]},
  {id:'trench',station:'trench',name:'深海海沟',title:'从雪岭抵达深海',
    script:'站点水深约 371 米，采用地图的压缩尺度。自然底光已接近零，眼前的可见光来自观察灯。沿途同一片地表，从陆上的坡谷延续到浅海，再下降为大陆坡和海沟。',
    task:'回看从雪岭到海沟的关系，地形安排水路和深度，水深、底质与光照又一起改变群落。'}
].map(lesson=>({...lesson,seaAt:seaStations[lesson.station].at,at:benchmarkLength+seaStations[lesson.station].at})));

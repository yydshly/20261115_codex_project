// Actual location inventory and sourced formation explanations. Not a climate/erosion simulator.
export const planBounds={minX:-1920,maxX:1920,minZ:-1560,maxZ:1560};
const names=['西北 · 岩岸与台塬','北部 · 冰原与上游','东北 · 高山与山口','西部 · 盐盆与湿地','中部 · 河湖与聚落','东部 · 火山与岩岸','西南 · 湿热林地','南部 · 林草与干旱样本','东南 · 沙丘岛岸与远洋'],colors=['#b9a780','#c6e4e9','#bac6a0','#d4c591','#a9c48b','#c3997c','#7fad86','#c1b079','#80b7c0'],xs=[-1920,-640,640,1920],zs=[-1560,-550,550,1560];
export const spatialZones=names.map((name,i)=>{const row=Math.floor(i/3),col=i%3;return {id:['nw','n','ne','w','c','e','sw','s','se'][i],name,color:colors[i],minX:xs[col],maxX:xs[col+1],minZ:zs[row],maxZ:zs[row+1],x:(xs[col]+xs[col+1])/2,z:(zs[row]+zs[row+1])/2};});
export function zoneAt(x,z){const col=x< -640?0:x<640?1:2,row=z< -550?0:z<550?1:2;return spatialZones[row*3+col];}
export const planCategories={land:'地形与岩体',water:'水域与湿地',plants:'植被与群落',underground:'洞穴与地下',sky:'天空与时间',human:'聚落与生产',transport:'交通与设施'};
export const formationSources={
 seaice:{title:'NSIDC · 海冰与陆冰的区别',url:'https://nsidc.org/learn/parts-cryosphere/sea-ice/science-sea-ice'},
 aurora:{title:'NOAA SWPC · 极光的形成',url:'https://www.spaceweather.gov/phenomena/aurora'},
 spring:{title:'USGS · 泉与地下补给',url:'https://www.usgs.gov/water-science-school/science/springs-and-water-cycle?page=1'},
 mountain:{title:'NPS · 山体形成与侵蚀',url:'https://home.nps.gov/subjects/mountains/geology.htm'},
 rain:{title:'WMO · 迎风抬升与雨影',url:'https://cloudatlas.wmo.int/en/orographic-influences-on-the-windward-side.html'},
 ice:{title:'NPS · 冰川形成与运动',url:'https://www.nps.gov/glac/learn/nature/glacial-geology.htm'},
 river:{title:'WHOI · 河流、河口与三角洲',url:'https://www.whoi.edu/ocean-learning-hub/ocean-topics/how-the-ocean-works/coastal-science/rivers-estuaries-deltas/'},
 fan:{title:'USDA NRCS · 冲积扇沉积',url:'https://directives.nrcs.usda.gov/sites/default/files2/1720626005/Chapter%205%20-%20Deposition%20of%20Sediment.pdf'},
 salt:{title:'Utah Geological Survey · 封闭盐湖',url:'https://geology.utah.gov/popular/great-salt-lake/commonly-asked-questions/'},
 karst:{title:'USGS · 岩溶含水层',url:'https://www.usgs.gov/mission-areas/water-resources/science/karst-aquifers'},
 wind:{title:'NPS · 风成地貌',url:'https://www.nps.gov/subjects/geology/aeolian-landforms.htm'},
 lava:{title:'NPS · 柱状节理与冷却',url:'https://www.nps.gov/subjects/volcanoes/columnar-jointing.htm'},
 ocean:{title:'NOAA · 板块边界地貌',url:'https://oceanexplorer.noaa.gov/ocean-fact/tectonic-features/'},
 wetland:{title:'EPA · 湿地与水饱和土壤',url:'https://www.epa.gov/wetlands/what-wetland'},
 peat:{title:'USGS · 饱和土壤与泥炭分解',url:'https://pubs.usgs.gov/sir/2009/5004/section6.html'}
};
// Each profile explicitly separates physical prerequisites, resulting form and current implementation.
export const formationProfiles={
 polar:{title:'海冰与陆地冰的不同来源',factors:['海水温度与盐度','热量收支','陆地积雪与冰体来源'],chain:['海水降温达到冻结条件','形成漂浮海冰并随条件变化','陆地长期积雪另形成冰川或冰盖','陆冰崩解入海可成为冰山'],requirements:'海冰由海水冻结，冰山来自陆地冰体，两者不能都用积雪压实来解释。',present:'已有厚海冰、带水下体积的冰山和邻近陆地冰盖样本。',gap:'尚无盐度和热量收支、冰山崩解、漂移、海冰季节演化或承重模拟。',sources:['seaice','ice']},
 aurora:{title:'极光与高层大气',factors:['带电粒子','磁场引导','高层大气碰撞发光'],chain:['粒子在磁层相关过程中获得能量','沿磁力线进入高纬上空','与大气原子分子碰撞并激发','退激发发光形成极光'],requirements:'极光不是云反射，也不是普通雷暴闪电；观看还受黑夜、云层和视野等条件影响。',present:'已有极光光带与晴夜预设，按位置和氛围状态显示。',gap:'当前为程序化光带，不模拟磁层、粒子输运、太阳活动或真实极光预报。',sources:['aurora']},
 groundwater:{title:'泉、绿洲与地下补给',factors:['补给与含水层','地表河水或地下水','出露通道与水量收支'],chain:['来水通过地表或地下路径补给','水位与地形或裂隙相交形成泉等出露','持续供水支持干旱区局部植被','热泉还需核对地热与循环深度'],requirements:'绿洲要有可维持的水源，并非都只靠地下泉；热泉也不必位于地表活火山旁。',present:'已有静态泉池、绿洲与地热泉样本。',gap:'尚未建立含水层、补给范围、抽排与蒸发收支、地下循环或地热传热。',sources:['spring']},
 mountain:{title:'山脉、岩层与高差',factors:['构造与岩性','抬升或断裂','流水、冰川与重力'],chain:['基岩与构造建立高差','风化、侵蚀和坡面搬运切割','山脊、峡谷、台塬与坡积物','土层、积雪与植被依条件分布'],requirements:'山体不是由一次降雨形成；抬升背景、岩层抗蚀性与长期剥蚀共同决定轮廓。',present:'已有高峰、层状岩壁和台塬等固定形体。',gap:'尚未建立统一的构造、岩性与地质年代底图，也没有侵蚀演算。',sources:['mountain']},
 climate:{title:'温度、水汽与地带过渡',factors:['热量与海拔','水汽来向','地形迎风与背风'],chain:['海陆与风场输送水汽','迎风抬升可促成云雨','背风下沉可能减雨','水热与土壤共同限制群落'],requirements:'雨影需要山地障碍、风向和水汽条件；不能只把一片森林旁边标成雨影荒漠。',present:'已有晴雨雪、冰雪和多种干湿群落样本。',gap:'约3.8×3.1km压缩地图容纳多气候样本，尚无真实纬度带、统一风场或连续雨影过渡；天气切换不重建地形。',sources:['rain']},
 ice:{title:'冰雪与冰川',factors:['多年积雪收支','温度与坡向','冰体重力运动'],chain:['多年积累超过消融','积雪压实转为冰','足够厚的冰体开始运动','侵蚀搬运与融水塑造下游'],requirements:'白色地表不等于冰川；需要长期质量积累及冰体运动条件。',present:'已有固定雪山、冰川、冰湖、融水、冰盖和海冰形体。',gap:'尚无积累—消融平衡、冰川流动、海冰漂移或真实结冰承重。',sources:['ice']},
 river:{title:'流域、河谷与河口',factors:['集水区与降水','地势与出口','流量和泥沙'],chain:['降水与融水进入集水区','沿地势汇流并侵蚀搬运','坡度与输沙条件变化引起沉积','低地湿地、河口与海湾相接'],requirements:'河流需要上游补给和下游出口；河口是否成三角洲，还取决于泥沙供给及波浪潮流等条件。',present:'原中央主河从冰雪源头经河谷、湿地、河口接海湾；另一条高原塘群现通过新增坡脚陆地与下切河床接到原雨林河网和海口，220→14→0m。',gap:'北部扇面与岩层溪流已补上游和出流谷地，在8米汇口相接，再到原中央主河；高原泥炭浅洼的补给尚未耦合。逐月水量账本已接入外流水系和内流盐盆，中央海湾另有泥沙账本。河口波浪、潮流和泥沙再悬浮尚待构建。',sources:['river']},
 fan:{title:'冲积扇与洪泛地',factors:['上游碎屑供给','山口约束变化','流量、坡度与入渗'],chain:['山地来水携带碎屑','出山口后流路展开','搬运能力变化造成沉积','扇面分流、洲地与洪泛范围'],requirements:'需要来水和物源，河道展开、坡度及入渗会共同影响沉积，不是所有扇形地面都叫冲积扇。',present:'已有扇面、分汊、沙砾洲及手动常水和涨水对照。「流水与泥沙」将物源坡接到扇面、河漫滩和河口，观察不同月份的搬运、分选与落淤。',gap:'物源和沉积量采用月尺度教学参数。长期河床改变、河道迁移和重新起沙仍待构建。',sources:['fan']},
 salt:{title:'内流盆地与盐湖',factors:['盆地出口状态','含盐来水','蒸发与水量收支'],chain:['含溶解盐的水进入盆地','缺少有效外排路径','蒸发移走水而盐留下','水位和盐分变化形成盐湖、盐沼、盐壳'],requirements:'盐湖不能只靠铺白材质；需考虑盆地封闭性、盐分来源和长期水量平衡。',present:'已有独立盐盆、盐湖床底、盐沼与高低水位参考。',gap:'尚无流域盐分输入、蒸发、水量和盐结晶过程。',sources:['salt']},
 karst:{title:'可溶岩与岩溶地下',factors:['可溶岩层','裂隙与水','地下排水通道'],chain:['水沿裂隙进入可溶岩','溶蚀逐渐扩大通道','洞穴、地下河和塌陷发育','峰林、天坑与地表地下连通'],requirements:'典型岩溶以可溶岩及水的溶蚀为前提；其他成因洞穴不能一概叫岩溶。',present:'已有峰林、石林、天坑、竖井、多层洞廊与地下河样本。',gap:'尚无岩性底图、裂隙渗流、溶蚀或塌陷过程。',sources:['karst']},
 cave:{title:'洞穴、岩桥与地下空腔',factors:['岩体结构','具体成因','地下水或海岸作用'],chain:['先识别岩体与成因','沿弱带形成或扩大空腔','保留顶板、侧壁与开口','核对干路、地下水和地表连通'],requirements:'溶洞、海蚀洞、熔岩洞等形成条件不同；空腔几何相似并不代表成因相同。',present:'已有可进入洞口、洞道、洞厅、海蚀洞和回环空腔。',gap:'早期单层洞穴只验证空间与通行，未确定具体岩性和形成史。',sources:['karst','mountain']},
 volcanic:{title:'火山、熔流与冷却岩体',factors:['岩浆供给与通道','喷出或侵入','冷却及后期侵蚀'],chain:['岩浆沿通道到达近地表','熔流铺展或火口堆积','冷却收缩产生裂隙','后期露出岩台与柱状节理'],requirements:'火山需要内部地质背景；柱状节理来自冷却收缩，不能由干热天气直接解释。',present:'已有火口、熔流面、玄武岩台地、柱岩和地热外观。',gap:'尚无岩浆系统、真实喷发、热传导、冷却收缩或断裂生成。',sources:['mountain','lava']},
 wind:{title:'风蚀、砾地与荒漠',factors:['岩性与风化物','风场','地表干湿和覆盖'],chain:['风化提供松散物或暴露岩体','风蚀、搬运与筛选','残丘、通槽或砾石地表','植被和湿度改变可搬运程度'],requirements:'荒漠不只一种地貌；雅丹、戈壁和沙丘的物源、岩体与输运条件不同。',present:'已有定向雅丹、通槽、石漠、戈壁及低灌样本。',gap:'风向为局部造型参考，尚无统一风场、物源连接或风沙输运。',sources:['wind']},
 dunes:{title:'海岸沙丘与植被固沙',factors:['沙滩供沙','足够干燥的沙与风','植被或障碍截沙'],chain:['海滩提供可搬运干沙','风将沙向陆侧搬运','植物或地形减速截沙','前缘沙丘、背风沙丘与灌草带'],requirements:'需要沙源、输沙风与沉积空间；海水并不直接吹成沙丘，植被也会反过来影响沙丘稳定。',present:'已有两道实体沙脊、湿滩、零米水面与不同密度灌草。',gap:'尚无沙源收支、风沙搬运、植被固沙或沙丘迁移；当前是固定形态。',sources:['wind']},
 ocean:{title:'海岸、陆架与深海',factors:['大陆边缘与板块','岩性及侵蚀沉积','海平面、波浪与潮流'],chain:['地质背景建立海陆与深度','海岸侵蚀沉积修改边缘','海平面画出实际岸线','水深、底质与光照限制水下空间'],requirements:'陆架、大陆坡和海沟成因不同；深海沟常关联俯冲，不能仅因离岸更远就随意放置。',present:'已有海岸床底、岛体、陆架、坡面和压缩深度海沟。',gap:'尚无板块边界与火山弧的整体对应，也没有动态海平面、海浪、潮汐或洋流。',sources:['ocean']},
 wetland:{title:'湿地、草丘与泥炭',factors:['地表或地下补给','排水与微地形','饱和时长及分解'],chain:['水补给与排出决定饱和','细小高差分出草丘浅洼','低氧等条件限制分解','特定条件下有机物累积成泥炭'],requirements:'湿地取决于积水/饱和的频率和持续时间；泥炭还需长期有机物收支条件。',present:'已有浅水岸线、微地形、草丘及泥炭样覆盖。',gap:'高原塘群已接入雨林外流水系；泥炭微洼仍缺补给耦合，暂无地下补给、饱和时长、分解或泥炭累积。',sources:['wetland','peat']},
 plants:{title:'群落由水热、土壤和空间共同构建',factors:['温度与供水','土壤、盐湿与排水','光照与扰动'],chain:['地形改变排水与局部环境','土层和水热限制定居','乔木、灌木、地被分层','密度、留白与时间共同塑造群落'],requirements:'竹林、雨林、针叶林、季风林不能只按地图空位摆放；需要明确水热、土壤和扰动前提。',present:'已有乔灌草、水生和红树林样本；新增高原—坡脚—雨林连接带按创作高程与岸距布置低灌、针叶树形、阔叶树形和湿岸草。',gap:'目前多为固定规则与造型；没有统一水热土壤场、真实物种分布或生态演替。',sources:['rain','wetland']},
 sky:{title:'天空、天气与时间',factors:['大气水汽和运动','地形抬升','昼夜与季节背景'],chain:['环境条件影响云雨与能见度','天气改变短时光照氛围','长期气候参与水与冰的收支','长期过程再影响地貌与群落'],requirements:'一次天气变化与长期气候不同；极光属于另一种高层大气现象，不能用下雨或岩性解释。',present:'已有云、雨雪、雷暴、沙尘、夜空和极光表现。',gap:'当前以视觉状态为主，尚无长期气候、水量与地形演化耦合。',sources:['rain']},
 human:{title:'自然条件承接生产与生活',factors:['可建设场地','水源与资源','交通和服务'],chain:['核对地势、水岸与场地条件','选择资源地与生活节点','道路桥港连接生产生活','建筑与设施形成使用空间'],requirements:'这是项目布局判断：住宅、码头、农田和索道应回应地形和用途，不能只当装饰放置。',present:'已有聚落、室内、索道、生产批次与交通换装。',gap:'洪水、边坡、服务能力和长期需求尚未形成完整约束；人物、故事与玩法仍待制作。',sources:[]}
};
export function categoryFor(r){if(r.mountain&&r.id==='mountain-village')return 'human';if(r.transport||r.mountain&&['mountain-lower','mountain-upper','mountain-bridge','mountain-road'].includes(r.id))return 'transport';if(r.settlement||r.production)return 'human';if(r.sky||r.id==='polar-aurora')return 'sky';if(r.cave||r.geology&&r.id==='geo-network'||r.karst&&['karst-shaft','karst-layers','karst-river'].includes(r.id))return 'underground';if(r.forest||r.boreal||r.tropical||r.warm&&r.biome!=='dunes'||r.dryland&&['dryland-grass','dryland-edge'].includes(r.id))return 'plants';if(r.saline||r.upland||r.marine||r.ocean||['lake','river','marsh','estuary','bay'].includes(r.id))return 'water';return 'land';}
export function profileFor(r){if(['human','transport'].includes(categoryFor(r)))return 'human';if(r.id==='polar-aurora')return 'aurora';if(r.sky)return 'sky';if(r.polar)return ['polar-coast','polar-seaice'].includes(r.id)?'polar':r.id==='polar-tundra'?'plants':'ice';if(r.glacial)return 'ice';if(r.id==='dryland-oasis')return 'groundwater';if(r.karst)return 'karst';if(r.cave)return 'cave';if(r.geology)return r.id==='geo-thermal'?'groundwater':r.id==='geo-network'?'cave':'ocean';if(r.volcanic)return 'volcanic';if(r.saline)return 'salt';if(r.fan)return 'fan';if(r.upland||r.id==='marsh')return 'wetland';if(r.warm&&r.biome==='dunes')return 'dunes';if(r.yardang||r.dryland&&r.id!=='dryland-edge'&&r.id!=='dryland-grass')return 'wind';if(r.forest||r.boreal||r.tropical||r.warm||r.dryland)return 'plants';if(r.marine||r.ocean||r.id==='bay')return 'ocean';if(['plain','basin','lake','river','estuary'].includes(r.id))return 'river';return 'mountain';}
const legacyProfile={coast:'ocean',hills:'mountain',valley:'river',wetland:'wetland',canyon:'mountain',mesa:'mountain',dunes:'wind',volcano:'volcanic',alpine:'ice',island:'ocean'};
export function makeWorldInventory(build,terrain){return [...build.map((r,index)=>({...r,key:'build:'+r.id,route:'build',routeIndex:index,category:categoryFor(r),profile:profileFor(r)})),...terrain.map((r,index)=>({...r,key:'terrain:'+r.id,route:'terrain',routeIndex:index,category:'land',profile:legacyProfile[r.id]||'mountain',foundation:true}))].map(r=>({...r,zone:zoneAt(r.x,r.z).id}));}
export function filterInventory(rows,{zone='all',category='all',query='',profile='all'}={}){const q=query.trim().toLocaleLowerCase();return rows.filter(r=>(zone==='all'||r.zone===zone)&&(category==='all'||r.category===category)&&(profile==='all'||r.profile===profile)&&(!q||[r.name,r.terrain,planCategories[r.category],formationProfiles[r.profile].title].join(' ').toLocaleLowerCase().includes(q)));}
export const layoutGaps=[
 {title:'实景风雨与尺度',detail:'全年风雨可在同一地图逐月比较风向、迎背风降水、融雪、地表和植被。约4公里的地图压缩了极地到雨林的距离，逐月结果是相对教学指数。'},
 {title:'四处区域接缝',detail:'已有山肩、冷坡、迎背风丘陵与海床衔接。总览记录了北部林台、南部湿干带、西部盐盆边缘、东部火山岩岸的实景直边或高差接缝。'},
 {title:'水系串联与逐月收支',detail:'高原—雨林与北部扇面、岩层溪流均已作实际地形连接，北部双支谷汇入原中央主河；泥炭浅洼、绿洲和地下水仍缺完整补给收支。原中央主河是另一条外流水系，盐盆保持内流；可在流域收支查看四类水体的逐月变化。完整地质含水层与局地分水岭仍待深化。'},
 {title:'地质骨架、岩性与含水层',detail:'东南俯冲剖面、四类基岩着色和典型地下水路径已接入。干谷泉池与北部岩溶地下河已有独立示例。全域地下水位、层位和跨区交换待深化。'},
 {title:'跨区域形成与史前展示',detail:'中央海湾已接通降雨、输沙、潮滩、植被与风暴潮的局地演示。西南出海流域和内流盆地仍需作同源对照；史前案例已有图谱，尚无可进入的3D时间层。'}
];
export const causalChapters=[
 {title:'先定基岩与高差',profile:'mountain',scene:'mountain-peak',why:'先问山和岩层为什么在这里，再决定峰脊、盆地与通路。'},
 {title:'再定水汽与温度',profile:'climate',scene:'ice-snow',why:'给风向、水汽和冷暖条件，才能讨论迎风、背风与雪线。'},
 {title:'组织集水区与出口',profile:'river',scene:'river',why:'水网要按地势与补给连接；内流盐盆单独核对外排与盐分。'},
 {title:'让侵蚀沉积改变形态',profile:'fan',scene:'fan-apex',why:'流水、冰川和风作用不同，不能只用一种噪声地形代替成因。'},
 {title:'到海岸检查物源',profile:'dunes',scene:'warm-dune-front',why:'先有岸线、沙滩供沙和输沙风，再谈沙丘与植被截沙。'},
 {title:'最后构建群落与生活',profile:'plants',scene:'warm-bamboo-inner',why:'让土、水、热和空间条件承接植物，再安排道路、聚落与生产。'}
];
export function planCameraPose(width,height){return {x:0,y:5200,z:1050,targetX:0,targetY:30,targetZ:0,offsetX:width>=900?175:0,offsetY:width<900?Math.min(160,height*.18):0};}

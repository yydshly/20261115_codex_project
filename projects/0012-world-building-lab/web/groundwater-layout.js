import {LAVA_CRATER,volcanicWeight} from './volcanic-layout.js';
import {karstWeight,SINK,LOWER,riverProfile} from './karst-layout.js';
import {STRATA_SITES,strataWeight} from './strata-layout.js';
import {OASIS,drylandWeight,dryValleyField} from './dryland-layout.js';
import {fanProfile,fanWeight} from './fan-layout.js';

const strength=(x,z,cx,cz,rx,rz)=>1-Math.hypot((x-cx)/rx,(z-cz)/rz);

// Rates apply to the teaching plots in this map, in mm/h or fractions per hour.
export const hydroMaterials={
  crystalline:{name:'结晶岩',color:'#b0a2c7',intake:3.1,rootCapacity:14,hold:8,drain:.14,bypass:.09,fast:.05,slow:.013,
    soil:'花岗质残积薄土',host:'风化带、连通裂隙'},
  layered:{name:'砂岩与泥岩',color:'#dcac73',intake:8,rootCapacity:16,hold:7,drain:.27,bypass:.09,fast:.065,slow:.025,
    soil:'砂质土与细粒残积土',host:'砂岩孔隙、泥岩顶面'},
  volcanic:{name:'玄武岩',color:'#9d7970',intake:8.7,rootCapacity:18,hold:10,drain:.24,bypass:.38,fast:.145,slow:.027,
    soil:'薄土、风化黏粒与玄武岩屑',host:'流间带、连通节理'},
  carbonate:{name:'石灰岩',color:'#aabb8d',intake:16,rootCapacity:10,hold:5,drain:.24,bypass:.72,fast:.31,slow:.039,
    soil:'裸岩与不连续残积土',host:'溶蚀裂隙与洞道'},
  alluvium:{name:'冲积砂砾',color:'#e6d67f',intake:20,rootCapacity:18,hold:7,drain:.5,bypass:.15,fast:.08,slow:.043,
    soil:'河流搬来的砂砾与细料',host:'砂砾粒间孔隙'}
};

export const bedrockIds=['crystalline','layered','volcanic','carbonate'];
export const lithologyLegend=[...bedrockIds,'alluvium'].map(id=>({
  id,color:hydroMaterials[id].color,name:hydroMaterials[id].name+(id==='alluvium'?'盖层':'')
}));

export function bedrockAt(x,z){
  if(karstWeight(x,z)>.16)return 'carbonate';
  if(volcanicWeight(x,z)>.12)return 'volcanic';
  if(strataWeight(x,z)>.13||drylandWeight(x,z)>.14)return 'layered';
  // The mapped fold and thrust exposures share the same sedimentary unit.
  const foldAxis=-1040-(x-1000)*.45;
  if(Math.hypot((x-1085)/182,(z-foldAxis)/112)<1)return 'layered';
  const wobble=14*Math.sin(x/150)+22*Math.sin(z/175);
  const units=[
    ['layered',strength(x,z,-1440,-1000,1050,1100)],
    ['layered',strength(x,z,-55,1430,980,640)],
    ['volcanic',strength(x,z,1330,20,455,605)],
    ['carbonate',strength(x,z,520,-1260,455,430)],
    ['crystalline',.04+.12*strength(x,z,1600,-1290,950,900)]
  ];
  let best=units.at(-1);
  for(const unit of units.slice(0,-1)){
    if(unit[1]+wobble*.001>best[1])best=unit;
  }
  return best[0];
}

export function parentAt(x,z){
  if(fanWeight(x,z)>.52){
    const fan=fanProfile(z);
    if(Math.abs(x-fan.channels[0])<fan.width*.83)return 'alluvium';
  }
  if(drylandWeight(x,z)>.8&&dryValleyField(x,z).distance<21)return 'alluvium';
  return null;
}

export const spring={x:282,z:1356,y:12.2};
export const storagePath=[
  {x:121,z:1286,y:17},{x:181,z:1309,y:15},{x:235,z:1331,y:13.5},spring
];
export const springCreek=[spring,{x:292,z:1360,y:12.14},{x:306,z:1367,y:12.08}];
export const cavePath=[
  {x:SINK.x,z:SINK.z,y:SINK.top+1},
  {x:SINK.x,z:SINK.z,y:4},
  ...LOWER.slice(0,-1).map(p=>({...p,y:p.y+3})),
  {x:720,z:-1378,y:riverProfile(-1378).level+.75},
  {x:720,z:-1425,y:riverProfile(-1425).level+.65}
];

export const groundStops=[
  {id:'rock',phase:'辨认基岩',name:'青岚结晶岩坡',x:1330,z:-1160,distance:750,material:'crystalline',ground:'#a99d9d',
    detail:'这一坡设为花岗质结晶岩。新鲜岩体孔隙少，风化带和连通裂隙能收水。陡坡薄土蓄水有限，同一场雨较多先走坡面与山沟。'},
  {id:'weathering',phase:'风化成土',name:'西北砂岩—泥岩阶地',x:STRATA_SITES[1].targetX,z:-1397,distance:420,material:'layered',ground:'#b59668',
    detail:'露头按砂岩与泥岩相间布置。砂岩风化留下较粗颗粒，泥岩可供给更多细粒；坡度、降雨、植物和成土时间也会改变土层厚度。'},
  {id:'volcanic',phase:'比较裂隙',name:'东部玄武岩流',x:LAVA_CRATER.x,z:48,distance:410,material:'volcanic',ground:'#a78b71',
    detail:'火山弧冷却后留下玄武岩。节理和疏松流间带连通时可导水，致密熔岩内部入渗较慢。这里用一处连通节理的样点参与同雨比较。'},
  {id:'infiltration',phase:'看雨水入渗',name:'北部冲积扇砂砾',x:-974,z:-931,distance:380,material:'alluvium',ground:'#c6a472',
    detail:'这里的砂砾来自上游搬运，盖在基岩上。粗粒间的连通孔隙让水向下渗。若细泥填满孔隙，即使在同一张冲积扇上，入渗也会变慢。'},
  {id:'storage',phase:'看地下蓄水',name:'干谷层间含水带',x:187,z:1304,distance:395,material:'layered',ground:'#b49669',
    detail:'较透水的砂质层在较难透水的泥质层上方蓄水。剖面里的蓝带是饱和孔隙，水受水头差驱动，沿层向低处慢慢移动。干谷地表的雨水可以很快退去。'},
  {id:'spring',phase:'追踪泉水',name:'绿洲接触带泉池',x:OASIS.x,z:OASIS.z,distance:329,material:'layered',ground:'#b49669',
    detail:'含水层在低处碰到沟岸，水从接触带出露，补给原有泉池。停雨后地下储量仍可供水，湿润岸边因此和周边戈壁分开。'},
  {id:'cave',phase:'打开地下空间',name:'岩溶落水洞与地下河',x:677,z:-1340,distance:365,material:'carbonate',ground:'#a5a483',
    detail:'微酸性水长期沿石灰岩裂隙溶蚀，裂隙扩大为洞道。降雨可在落水洞集中下渗，经竖井抵达下层地下河。浅层与细裂隙也能蓄水。'}
];

export const groundwaterLinks={
  water:{
    overview:['infiltration','同一流域里，岩坡更容易产生坡面径流，冲积砂砾可以把一部分水送入浅层地下；地表分水界和地下分水界也可能不同。'],
    snow:['rock','陡坡雪融后先受岩面、浅土和连通裂隙分流。到青岚结晶岩坡，比较裂隙补给和坡面径流。'],
    join:['infiltration','同在支流汇口上游，砂砾扇面能让雨水入渗，层状岩壁也能导水或阻水。'],
    wetland:['infiltration','湿地低滩的细泥容易保水；到上游粗砂砾扇面对照水怎样穿过粒间孔隙。']
  },
  warmth:{
    overview:['weathering','冷暖和水分影响风化速度，基岩提供不同的矿物和颗粒；同一冷暖带内，土壤仍会随母质和地势变化。'],
    slope:['rock','冷坡薄土同时受风化、坡面冲刷和岩性的影响。选结晶岩坡，对照岩面与裂隙。'],
    plain:['infiltration','平原的成土材料可以是河流带来的沉积物。到冲积扇看砂砾、细泥与入渗的区别。'],
    forest:['weathering','暖湿有利于部分化学风化过程，具体土质仍取决于母质、坡度、排水和时间。']
  },
  inland:{
    overview:['spring','从湿坡到干谷，地下水会在地表降雨很少的地点维持泉池和局部绿带。沿地下蓄水和泉水两站对照。'],
    ridge:['storage','岩层倾向、连通裂隙和低透水层会影响地下水去向。看干谷含水层如何沿层向坡脚供水。'],
    gobi:['storage','同样是干地，表面砾石和地下低透水细粒层对雨水的作用不同。'],
    oasis:['spring','这里的泉池由局部砂质层补给。切到雨后时刻，对照地表雨停和地下继续出流的时间差。']
  }
};

export const stormPresets={
  steady:{name:'缓雨',hours:8,total:48},
  burst:{name:'短时强雨',hours:2,total:48}
};
export const stormHours=48;

export function simulateStorm(storm,material){
  const frames=[];
  let rain=0,runoff=0,soil=0,fast=0,slow=0,discharge=0;
  for(let hour=0;hour<=stormHours;hour++){
    const amount=hour>0&&hour<=storm.hours?storm.total/storm.hours:0;
    rain+=amount;
    const infiltrated=Math.min(amount,material.intake,(material.rootCapacity-soil)/(1-material.bypass));
    runoff+=amount-infiltrated;
    soil+=infiltrated*(1-material.bypass);
    const drain=Math.max(0,soil-material.hold)*material.drain;
    soil-=drain;
    fast+=infiltrated*material.bypass;
    slow+=drain;
    const outflow=fast*material.fast+slow*material.slow;
    fast*=1-material.fast;
    slow*=1-material.slow;
    discharge+=outflow;
    frames.push({hour,amount,rain,runoff,soil,groundwater:fast+slow,discharge,outflow,
      recentRunoff:amount-infiltrated,infiltrated});
  }
  return frames;
}

import {terrainHeight} from './large-world.js';
import {HOT_POOL} from './geology-layout.js';

export const ventSources={
  ocean:[
    ['NOAA · 海底热液与冷泉','https://oceanexplorer.noaa.gov/ocean-fact/seeps-vents/'],
    ['NOAA · 冷泉潜航现场','https://oceanexplorer.noaa.gov/expedition-feature/okeanos-ex1903-logs-july7/']
  ],
  land:[
    ['USGS · 间歇泉的地下通道','https://www.usgs.gov/observatories/yvo/news/yellowstones-active-hydrothermal-system-whats-hot-water'],
    ['USGS · 热泉的水化学','https://www.usgs.gov/observatories/yvo/news/diverse-chemistry-yellowstones-hydrothermal-features']
  ]
};
export const ventRoutes={
  ocean:{
    name:'海底热液与冷泉',
    detail:'从火山弧外缘的硬岩样区，下到大陆坡沉积地，再进入海沟。热液口和冷泉分别有自己的地下通道。',
    home:{mode:'coast-sea',station:'slope',name:'河口到深海'},
    center:[1675,1200,-145,570],
    stops:[
      {id:'vent',name:'硬底热液烟囱',x:1610,z:1090,
        source:'下渗海水受热，经硬岩裂隙返回海底', deposit:'硫化物烟囱与细颗粒羽流', life:'暖流和冷海水交界 · 管虫群',
        detail:'下渗海水受热后沿裂隙上升。高温流体与冷海水混合，析出的矿物一部分随羽流升起，一部分堆在喷口周围。部分管虫依赖共生微生物利用化学能。',
        key:['冷海水下渗','受热水沿裂隙上升','混合析出硫化物'],
        pipe:[[-.90,.04],[-.65,.74],[-.36,.83],[.10,.72],[0,.02]]},
      {id:'slope',name:'大陆坡 · 底质对照',x:1650,z:1190,
        source:'上层水体落下的有机碎屑',deposit:'坡面细粒与裸露硬底',
        detail:'沿原有海床下潜。这里保留大陆坡背景，没有集中的流体出露，用来对照相邻喷口和冷泉处的局部沉积与群落。'},
      {id:'seep',name:'沉积坡脚 · 甲烷冷泉',x:1676,z:1325,
        source:'含甲烷孔隙流体沿沉积物裂隙渗出',deposit:'碳酸盐结壳与浅色微生物席',life:'渗漏通道附近 · 深海贻贝群',
        detail:'此处流体温度接近周围海水。沉积物里的微生物消耗一部分甲烷，可促进碳酸盐沉积。部分甲烷以气泡形态逸出，渗漏附近形成微生物席和贻贝群。',
        key:['沉积物中含甲烷流体','沿裂隙渗出','碳酸盐硬底与微生物席'],
        pipe:[[-.71,.74],[-.43,.65],[-.17,.54],[.11,.30],[0,.02]]},
      {id:'trench',name:'海沟 · 细粒沉积背景',x:1810,z:1400,
        source:'上层水体落下的有机碎屑',deposit:'细粒沉积底',
        detail:'这里与海沟主线共用观测点。沟底水深较大，喷口群落仍需要局部流体供应，水深本身无法提供化学能。'}
    ]
  },
  land:{
    name:'陆上间歇泉与地热',
    detail:'在现有东部地热区，沿补给坡、热泉、间歇泉、钙华阶地和酸性泥池对照不同的地下通道与水化学。',
    home:{mode:'tectonics',focus:'volcano',name:'东部火山弧'},
    center:[1655,-438,57,235],
    stops:[
      {id:'recharge',name:'山前补给坡',x:1560,z:-478,source:'雨水沿裂隙和孔隙下渗',
        detail:'雨水可从山前透水坡进入地下。热源、运移通道和流经的岩性决定它出露时的状态。这里示意补给位置，各热泉的出水通道分别绘出。',
        key:['地表降水','裂隙入渗'],pipe:[[0,.02],[.18,.22],[.39,.46],[.72,.75]]},
      {id:'pool',name:'原有地热区 · 常流热泉',x:HOT_POOL.x,z:HOT_POOL.z,
        source:'受热地下水沿通畅通道上升',deposit:'矿物边壳与热水外流',
        detail:'原有热泉作为对照。通畅的路径让热水持续对流或溢流。旁边的间歇泉具有狭窄通道，喷发才会表现出周期。',
        key:['受热水上升','通畅通道','水面持续溢流'],pipe:[[-.69,.72],[-.43,.77],[-.18,.64],[0,.02]]},
      {id:'geyser',name:'间歇泉 · 狭窄通道',x:1610,z:-450,
        source:'受热水在地下腔体蓄积',deposit:'泉口矿物锥',
        detail:'地下腔体蓄水受热，狭窄通道限制自由对流。部分水先溢出，压力下降后更多热水汽化，推动水汽柱上喷，随后回到补水阶段。',
        key:['补给入腔','受热蓄水与局部卸压','水汽喷发后回补'],
        pipe:[[-.83,.25],[-.55,.68],[-.22,.75],[-.03,.61],[.05,.31],[0,.02]]},
      {id:'terrace',name:'钙华阶地与溢流池',x:1697,z:-453,
        source:'流经碳酸盐岩的热水',deposit:'碳酸钙沉积 · 池缘、阶地与流水纹',
        detail:'富含溶解钙和碳酸氢根的热水出露，释放二氧化碳，促进碳酸钙沉淀。池沿逐渐加高，溢流跨过池沿继续流到低阶。',
        key:['流经碳酸盐岩','出露逸出二氧化碳','池沿沉积与向下溢流'],
        pipe:[[-.74,.46],[-.51,.66],[-.30,.58],[0,.02]]},
      {id:'acid',name:'酸性热区 · 泥池与汽孔',x:1739,z:-411,
        source:'火山气体进入有限的浅层水源',deposit:'蚀变黏土、硫质边缘与泥浆',
        detail:'含硫气体进入浅层水，在近地表氧化可形成酸性水。酸性水蚀变周围岩石形成黏土。补水少时，气体从黏稠泥浆中鼓泡。',
        key:['含硫气体上升','浅层水酸化','岩石蚀变与泥池'],
        pipe:[[-.30,.90],[-.18,.62],[-.12,.33],[0,.02]]}
    ]
  }
};

export const ventAuditPaths=Object.values(ventRoutes).map(r=>r.stops.map(({x,z})=>[x,z]));
export const ventHref=(route,station)=>'expedition.html?plan=fluid-vents&route='+route+
  (station?'&station='+station:'')+'#build-1';

export const geyserPhases=[
  {id:'charge',name:'补水蓄热',progress:.24,detail:'液态水在地下腔体聚集，泉口只有弱蒸汽。'},
  {id:'jet',name:'减压喷发',progress:.60,detail:'局部卸压，水汽快速膨胀，形成喷柱。'},
  {id:'recover',name:'回补',progress:.86,detail:'喷柱回落，通道降温并重新进水。'}
];
const clamp=value=>Math.min(1,Math.max(0,value));
export function geyserState(progress){
  const p=clamp(progress);
  const phase=p<.49?geyserPhases[0]:p<.79?geyserPhases[1]:geyserPhases[2];
  const lift=p<.49||p>=.79?0:Math.sin(Math.PI*(p-.49)/.30)**.8;
  return {phase,lift,fill:p<.49?.39+1.18*p:p<.79?.97-(p-.49)*2.15:.32+1.23*(p-.79)};
}

export const ventBed=p=>terrainHeight(p.x,p.z);
export function ventView(p,route){
  const y=ventBed(p);
  if(route==='ocean'){
    const distance=p.id==='trench'?27:21;
    const x=p.x+distance,z=p.z+distance*.57,targetY=y+(p.id==='vent'?3:1.6);
    const cameraY=Math.max(y+5,terrainHeight(x,z)+3.7);
    return [p.x,p.z,targetY,50,undefined,
      {x,y:cameraY,z,targetY,surface:0,deep:true,light:0,ambient:.78,fill:.36,color:'#233e51',density:.010}];
  }
  const raised=p.id==='geyser'?3.8:p.id==='terrace'?2.3:1.3;
  const x=p.x+24,z=p.z+23,targetY=y+raised;
  return [p.x,p.z,targetY,55,undefined,{x,y:Math.max(y+13,terrainHeight(x,z)+8),z,targetY}];
}

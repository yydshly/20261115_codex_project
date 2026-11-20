const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const mound=(x,z,px,pz,rx,rz)=>Math.exp(-(((x-px)/rx)**2+((z-pz)/rz)**2));

export const paleoRiverZ=x=>-368+54*Math.sin((x+1220)/231)+19*Math.sin((x+960)/82);
const site=(id,name,x,offset,range,detail)=>({id,name,x,z:Math.round(paleoRiverZ(x)+offset),range,detail});

export const paleoSources={
  devonian:{name:'Cairo 化石林的古土壤与根系研究',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8409631/'},
  coal:{name:'Smithsonian · 石炭纪原位石松林研究',url:'https://repository.si.edu/server/api/core/bitstreams/723724a8-a9e3-4ae4-99ff-afaf149454e6/content'}
};
export const peatSource={name:'USGS · 泥炭、埋藏和成煤',url:'https://pubs.usgs.gov/circ/c1143/html/text.html'};

export const paleoWetlandCases={
  devonian:{
    name:'泥盆纪早期森林',age:'中泥盆世 · 纽约 Cairo 化石林类比',
    start:'exposed',center:[-1150,-275],overview:[23,935],sectionStation:'roots',
    sectionName:'古土壤与根迹',profileName:'古河槽、漫滩与季节浅洼',
    intro:'古河在平坦泥地上漫流，季节性浅洼蓄水。越往高一点的泥滩，退水后越容易露出能长树、留存根迹的古土壤。',
    phases:{
      exposed:{name:'季节退水',level:2.4,detail:'河槽和最深洼地还有水。漫滩重新露出，较干的部分形成泥裂，能对照长期根系和浅根丛的形态。'},
      overbank:{name:'涨水漫滩',level:4.7,detail:'越岸的水先漫入浅洼和低滩，略高的根区和河阶仍露出。两种树共处一片洪泛平原，样区用不同根形展示它们的差别。'},
      now:{name:'现代对照',detail:'同一坐标处可看到现代中央河谷与湿地。古河槽、洼地与树群是根据化石证据建立的独立时间层。'}
    },
    stops:[
      site('channel','古河槽与砂岸',-1545,-4,196,'河槽汇流并搬运砂泥，往较平缓的岸上走，水减速后能铺上一层细泥。'),
      site('floodplain','泥质河漫滩',-1340,62,126,'低滩随洪水铺上细泥。退水后，部分泥面露出，局部泥裂可以保留湿干交替的痕迹。'),
      site('roots','早期树形与古土壤',-1160,133,102,'这里并排展示有多级侧根的古羊齿类型和基部成丛、根较浅的树蕨状早期树形。打开根迹看同一片泥地的根形差别。'),
      site('pool','季节性水洼',-1000,109,110,'浅洼较难排水，涨水时水边向泥滩扩展。退水时低处还能留下一小片水。'),
      site('terrace','排水较好的高滩',-800,246,178,'高滩受短时淹水的机会较少。离开河岸后，地表水和早期树木的分布都发生变化。')
    ]
  },
  coal:{
    name:'石炭纪煤系沼泽',age:'晚石炭世 · 北美宾夕法尼亚亚纪煤系森林类比',
    start:'mire',center:[-1150,-275],overview:[23,935],sectionStation:'roots',
    sectionName:'植物碎屑、泥炭与覆泥',profileName:'古河槽、石松沼泽到高滩',
    intro:'低平盆地长时间水湿，有机物分解较慢，能在水位较稳、冲刷较弱的地方积累泥炭。河流也会把泥沙带进沼泽。',
    phases:{
      mire:{name:'泥炭积累',level:3.35,detail:'高水位和缓慢排水共同维持沼泽。积水坑之间的微高地长着树状石松，低处能留存枝叶与有机残体。'},
      burial:{name:'洪水覆泥',level:5.25,detail:'以一次埋藏事件为例，浑水漫过低地，局部泥沙盖住泥炭和树根。之后可能经长期埋藏、压实并受热而成煤。'},
      now:{name:'现代对照',detail:'回到同一张地图的中央河谷与苇泽湿地。可对照现代芦苇低滩、较高灌木带与石炭纪的高大沼泽森林。'}
    },
    stops:[
      site('channel','供水河槽与碎屑',-1545,-4,196,'河道把水和碎屑送入低地。靠近主槽的冲积带矿物沉积更多，容易和沼泽内部的有机层区分开。'),
      site('floodplain','湿润低滩与木贼状植物',-1340,62,126,'低滩接收河水，含有不同大小的积水斑块。较平整的泥岸有节状茎和轮生枝。'),
      site('roots','石松林与泥炭剖面',-1160,133,102,'粗直树干上的叶痕和高处的分叉冠是树状石松的观察点。剖面分出地表残体、暗褐泥炭和洪水覆泥。'),
      site('pool','长期积水的沼泽低处',-1000,109,110,'远离主槽的低处退水缓慢。腐殖残体积累和矿物泥沙输入的比例可随位置改变。'),
      site('terrace','沼泽外缘与较高地面',-800,246,178,'水位离地面较远，土壤更容易排水。用这一站对照沼泽内部的厚有机层、积水和树群。')
    ]
  }
};

export const isPaleoWetland=id=>Object.hasOwn(paleoWetlandCases,id);

export function paleoWater(id,phase,x){
  return paleoWetlandCases[id].phases[phase].level-.0017*(x+1160);
}

export function paleoWetlandPoint(id,phase,x,z){
  const d=z-paleoRiverZ(x),distance=Math.abs(d),coal=id==='coal';
  const channelWidth=coal?28:35;
  const channel=Math.exp(-((d/channelWidth)**2));
  const pool=mound(x,z,-1000,paleoRiverZ(-1000)+109,95,45);
  const hollows=mound(x,z,-1265,paleoRiverZ(-1265)+104,69,32)+mound(x,z,-1160,paleoRiverZ(-1160)-117,87,57);
  const ridge=mound(x,z,-1160,paleoRiverZ(-1160)+133,114,54);
  const valley=14*smooth((distance-140)/194)+31*smooth((distance-252)/590);
  const hills=(99*mound(x,z,-1745,480,415,680)+82*mound(x,z,300,-840,650,460))*smooth((distance-133)/390);
  const roughness=(.32*Math.sin(x*.043+z*.032)+.23*Math.cos(z*.095-x*.041));
  const bed=4.05-.0017*(x+1160)-4.9*channel+valley+hills+roughness
    -(coal?2.65:2.15)*pool-(coal?2.23:1.34)*hollows+(coal?.5:1.39)*ridge;
  const level=paleoWater(id,phase,x),depth=Math.max(0,level-bed);
  const peat=coal?smooth((distance-28)/37)*(1-smooth((bed-level-.37)/6.3))*(1-.45*pool):0;
  const fines=depth>0?smooth((distance-30)/54)*smooth(depth/.90):0;
  const habitat=distance<channelWidth?(depth>0?'古河槽':'裸露砂岸'):depth>0?
    coal?(phase==='burial'?'洪水与细泥覆盖带':'沼泽积水'):'季节性积水':
    bed-level>7?'较高地面':coal?(peat>.36?'有机质丰富的低地':'沼泽边缘湿土'):'出露泥滩与古土壤';
  return {bed,level,depth,habitat,peat,fines};
}

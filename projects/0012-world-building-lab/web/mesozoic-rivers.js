const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const gaussian=n=>Math.exp(-n*n);
const lerp=(a,b,t)=>a+(b-a)*t;

export const mesozoicSources={
  triassic:{name:'NPS · 奇恩利组倒木的搬运、埋藏和硅化',url:'https://www.nps.gov/pefo/learn/nature/petrified-wood.htm'},
  jurassic:{name:'USGS · 莫里森组的古水文、湿地和湖泊',url:'https://pubs.usgs.gov/publication/70027187'}
};
export const jurassicClimateSource={name:'USGS · 莫里森组古生态与季节降水',url:'https://pubs.usgs.gov/publication/70027121'};
export const mesoRiverZ=x=>-112+.29*(x+650)+35*Math.sin((x+850)/125);
export const mesoTributaryZ=x=>mesoRiverZ(x)-.69*Math.max(0,x+956)-.035*Math.max(0,x+956)**1.29;
export const CHINLE_BAR={x:-1046,z:Math.round(mesoRiverZ(-1046)+28)};
export const MORRISON_LAKE={x:-1300,z:Math.round(mesoRiverZ(-1300)+158),rx:150,rz:111};
function lakeRadius(x,z){
  const distance=Math.hypot((x-MORRISON_LAKE.x)/MORRISON_LAKE.rx,(z-MORRISON_LAKE.z)/MORRISON_LAKE.rz);
  const edge=gaussian((distance-1)/.27);
  return distance+edge*(.041*Math.sin((x+z)*.056)+.029*Math.cos(z*.071-x*.028));
}
const stop=(id,name,x,z,range,detail)=>({id,name,x,z,range,detail});
const along=(id,name,x,offset,range,detail)=>stop(id,name,x,Math.round(mesoRiverZ(x)+offset),range,detail);
const comparison='恢复同一组坐标上的现代中央河谷、低滩和湿地。古河槽、倒木位置与湖盆采用独立的教学地形。';

export const mesozoicCases={
  triassic:{
    name:'晚三叠世多支古河',age:'晚三叠世 · 奇恩利组河流和石化木记录类比',
    start:'low',center:[-1060,-202],overview:[28,1040],profileName:'上游分支、汇流、砂坝与洪泛平原',
    intro:'两支古河从不同方向汇入低地。一场洪水可以越岸铺下泥砂，也能搬运倒木。退水后，部分倒木停在浅滩并有机会被后续沉积掩埋。',
    phases:{
      low:{name:'常水位',detail:'主槽和支流各自有清楚的水道，较高砂坝和河漫滩多处出露。少量倒木可在岸边停留。'},
      peak:{name:'涨水搬运',detail:'洪水越过低岸与砂坝，水体更浑浊。顺流观察倒木从水槽向下游内侧浅滩移动，可重看同一段过程。'},
      retreat:{name:'退水搁浅',detail:'水主要退回低槽，浅坝上留下搁浅倒木，低滩有湿泥。以后若快速被掩埋，地下水中的矿物可能逐渐在木材中沉积。'},
      now:{name:'现代对照',detail:comparison}
    },
    stops:[
      along('head','上游古河与砂岸',-620,5,165,'河谷变窄，来水主要沿槽内通过。砂随水向较开阔的中段搬运。'),
      stop('side','北侧支流',-792,Math.round(mesoTributaryZ(-792)),164,'北侧支河沿坡降进入主槽，下游汇合处的水和来沙来自两个方向。'),
      along('join','两支汇水与低槽',-945,-7,195,'两支在低处汇入较宽的主槽。涨水时，岸边薄的细泥更容易被新一层水和沉积覆盖。'),
      stop('bar','内弯砂坝与搁浅倒木',CHINLE_BAR.x,CHINLE_BAR.z,127,'涨水时观察顺槽搬运，退水后看倒木如何留在浅坝。快速覆埋可帮助保留形态，硅化发生在随后的地质过程中。'),
      along('plain','河漫滩与洪泛泥地',-1170,54,165,'越岸后水流放缓，泥沙离开主要砂带。退水后低处仍保持湿泥，较高斑块先出露。'),
      stop('shore','洼地边缘与洪水',MORRISON_LAKE.x,MORRISON_LAKE.z-104,151,'浅洼边缘随着洪峰暂时被淹，退水后湿泥留在低地。'),
      along('basin','下游洼地',-1300,130,182,'水可以漫进主河以外的低洼地。这个案例保留浅洼，与侏罗世长期保水的湖盆对照。'),
      along('terrace','较高谷缘',-1475,278,208,'更远的高处排水较快，洪水示意不跨越这里。')
    ]
  },
  jurassic:{
    name:'晚侏罗世漫滩与湖泊',age:'晚侏罗世 · 莫里森组陆相河湖与季节湿地类比',
    start:'dry',center:[-1060,-202],overview:[28,1040],profileName:'古河、洪泛平原、湖岸与常年深水区',
    intro:'季节降雨和河道来水能改变宽阔漫滩。低处的湖泊在这个样区另有稳定的地下补给，所以旱季能保留中心水面，湖岸与浅洼变化更明显。',
    phases:{
      dry:{name:'旱季退水',detail:'漫滩积水收缩，露出湖岸泥带。带有地下补给的湖心仍有水，较高岸边的木本位置保持固定。'},
      wet:{name:'雨季扩水',detail:'较高的河水进入低槽和湖岸低地，湖面沿缓坡扩张，较湿的位置出现更多蕨类和节状地被。'},
      now:{name:'现代对照',detail:comparison}
    },
    stops:[
      along('head','上游古河与较干高地',-620,5,165,'离开河槽后较开阔。旱季地表较干，木本集中在条件稳定的地方。'),
      stop('side','旧支槽与季节淹水洼',-792,Math.round(mesoTributaryZ(-792)),164,'低矮旧槽在雨季接入更多水，旱季多处砂泥出露。'),
      along('join','弯河与宽漫滩',-945,-7,195,'河道之外有较宽的缓平地面，涨水后低滩先被淹，较高的树丛仍露出。'),
      stop('bar','露泥与河岸植被',CHINLE_BAR.x,CHINLE_BAR.z,127,'在同一岸段对比旱季退水和雨季积水。木本树位固定，蕨类和节状地被随根区湿度变化。'),
      along('plain','季节漫水的低槽',-1170,54,165,'洪水可沿低槽向外扩展。离湖岸较远的高泥面仍保留较干的裸地。'),
      stop('shore','湖缘退水带与蕨类',MORRISON_LAKE.x,MORRISON_LAKE.z-104,151,'雨季水面沿湖岸缓坡扩张。旱季水退回低处，湖缘露出湿泥与沙砾。'),
      along('basin','常年湖心与浅水带',-1300,130,182,'湖盆中心在两个季节均有连续水面。地下水补给的背景与季节来水共同决定保水和漫水范围。'),
      along('terrace','湖外高滩与旱生斑块',-1475,278,208,'离湖盆更高、更远，出现不同密度的针叶型木本与低地被，较少受短时漫水。')
    ]
  }
};

export const isMesozoicRiver=id=>Object.hasOwn(mesozoicCases,id);
export const mesoLakeLevel=phase=>phase==='wet'?4.05:2.25;
const riverBase=x=>3.15+.0048*(x+1150);
export function mesoRiverLevel(id,phase,x){
  const rise=phase==='peak'?2.35:phase==='wet'?1.70:phase==='retreat'?-.32:0;
  return riverBase(x)+rise+(id==='jurassic'?.11:0);
}

export function mesozoicWater(id,phase,x,z){
  const river=mesoRiverLevel(id,phase,x);
  return id==='jurassic'?lerp(mesoLakeLevel(phase),river,smooth((lakeRadius(x,z)-.93)/.36)):river;
}

export function mesozoicPoint(id,phase,x,z){
  const triassic=id==='triassic',d=z-mesoRiverZ(x),distance=Math.abs(d);
  const main=Math.exp(-((d/(triassic?34:28))**2));
  const sideDistance=z-mesoTributaryZ(x);
  const tributary=gaussian(sideDistance/(triassic?22:16))*smooth((x+960)/117)*smooth((-585-x)/135);
  const shallow=gaussian((x+1170)/118)*gaussian((d-59)/35);
  const bar=gaussian((x-CHINLE_BAR.x)/86)*gaussian((d-28)/21);
  const plain=riverBase(x)+1.78+12.6*smooth((distance-155)/203)+18*smooth((distance-242)/520);
  const hills=(89*gaussian((x+680)/690)*gaussian((z-420)/488)+
    98*gaussian((x+840)/770)*gaussian((z+960)/484))*smooth((distance-149)/380);
  const lake=lakeRadius(x,z),basin=1-smooth((lake-.15)/1.18);
  const lowBasin=triassic?1.35*basin:7.20*basin;
  const cut=Math.max((triassic?4.95:4.75)*main,(triassic?5:1.95)*tributary);
  const relief=.31*Math.sin(x*.066+z*.053)+.38*Math.sin(z*.023-x*.056);
  const lakePlane=4.8-lowBasin+.30*Math.cos(x*.057+z*.071);
  const bed=lerp(plain-cut+bar*(triassic?1.55:1.02)-shallow*1.17+hills+relief,lakePlane,
    triassic?0:smooth((1.25-lake)/.45))-lowBasin*(triassic?.84:0);
  const level=mesozoicWater(id,phase,x,z),depth=Math.max(0,level-bed),base=mesozoicWater(id,mesozoicCases[id].start,x,z);
  const peak=mesozoicWater(id,triassic?'peak':'wet',x,z);
  const damp=1-smooth((bed-level-.19)/4.0);
  const deposited=triassic?smooth((peak-bed)/1.4)*smooth((distance-13)/55):0;
  const habitat=distance<24||triassic&&tributary>.65?'常流水槽':depth>.25?
    !triassic&&lake<1.13?'湖面与淹水浅岸':'洪泛低地':!triassic&&lake<1.16&&bed<peak?
      '退水露出的湖岸':bar>.54?'河弯砂坝':bed-base>9?'较高谷缘':damp>.28?'湿泥与河岸植被':'出露漫滩';
  return {bed,level,depth,habitat,damp,bar,deposited,lake};
}

import {drylandGuide,dryValleyField} from './dryland-layout.js';
import {terrainHeight} from './large-world.js';

export const scrubHref='expedition.html?plan=scrub-recovery#build-1';
export const scrubBounds={minX:-128,maxX:174,minZ:1170,maxZ:1390};
export const scrubStages={
  before:{name:'火前',description:'常绿硬叶灌丛已连成斑块。坡肩土薄而干，株丛低矮，近沟坡脚保存了更高、更密的灌丛。'},
  burned:{name:'火后初期',description:'多数灌丛失去叶冠。坡上露出焦土、灰土与炭化枝干，斑块边缘保留少量活灌木。'},
  first:{name:'首个雨季起',description:'冬雨后，低处草本和幼苗先铺开。老株基部可长出新枝，裸地里也能从土壤种子库长出新株。切换夏干季查看草本枯黄和幼苗留存。'},
  later:{name:'数年后',description:'萌蘖株和部分实生苗形成新的灌木斑块。沟边保湿带较密，坡肩仍有砾地空隙。草本在灌木未闭合的位置保存得更多。'}
};
export const scrubSeasons={wet:'冬雨之后',dry:'夏季干旱'};
export const scrubStops=[
  {id:'slope',name:'全坡对照',x:30,z:1278,dx:16,dz:158,dy:84,description:'沿同一段坡地，从砾石坡肩下到干谷。对照木本高度、裸地连通与沟缘草带。'},
  {id:'shoulder',name:'薄土坡肩',x:-54,z:1319,dx:-8,dz:45,dy:15,description:'坡肩距沟较远，薄土在夏季较快失水。即使灌丛恢复，浅土砾石之间也留着空隙。'},
  {id:'footslope',name:'汇水坡脚',x:73,z:1286,dx:-27,dz:42,dy:15,description:'附近坡面来水短暂集中，沟缘外侧的细土有更多储水空间。可以同时看到老根萌蘖和开阔地幼苗。'},
  {id:'gully',name:'干谷沟缘',x:102,z:1283,dx:30,dz:19,dy:10,description:'沟缘受季节性来水补给。草本沿湿润边缘较密，行洪沟心仍可保留裸露砂砾。'}
];

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const random=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
const mottling=(x,z)=>.5+.21*Math.sin(x*.077+z*.038)+.16*Math.sin(z*.238-x*.12)+.12*Math.cos(x*.31+z*.13);

export function scrubHabitat(x,z){
  const u=(x-23)/125,v=(z-1280-.11*(x-23))/85;
  const radius=Math.hypot(u,v);
  if(radius>=1.06)return null;
  const edge=smooth((1.05-radius)/.24);
  if(!edge||drylandGuide(x,z).distance<5)return null;
  const {distance,half}=dryValleyField(x,z);
  const retention=1-smooth((distance-half-3)/48);
  const bed=1-smooth((distance-half+4)/6);
  const patch=mottling(x,z);
  const scorch=edge*smooth((patch+.25)/.47);
  return {edge,retention,bed,patch,scorch};
}

export function scrubResponse(habitat,stage,season){
  const {retention}=habitat;
  const moisture=(season==='wet'?.28+.59*retention:.035+.23*retention);
  const recovery=stage==='first'? .25+.62*moisture : .50+.45*retention;
  return {moisture,recovery};
}

export function scrubPlantPlan(elevation=terrainHeight){
  const rows=[];
  let id=0;
  for(let z=scrubBounds.minZ;z<scrubBounds.maxZ;z+=2.4){
    for(let x=scrubBounds.minX;x<scrubBounds.maxX;x+=2.4){
      id++;
      const px=x+2.4*random(id,1),pz=z+2.4*random(id,2),habitat=scrubHabitat(px,pz);
      if(!habitat)continue;
      const {edge,retention,bed,patch,scorch}=habitat;
      const roll=random(id,3);
      rows.push({
        id,x:px,z:pz,y:elevation(px,pz),habitat,
        mature:roll<edge*(.12+.44*patch+.35*retention)*(1-.97*bed),
        burned:random(id,4)<scorch*.96,
        resprout:random(id,5)<.67,
        seed:random(id,6)<edge*(.13+.17*patch)*(1-.96*bed),
        vigor:random(id,7),cover:random(id,8),angle:random(id,9)*2*Math.PI
      });
    }
  }
  return rows;
}

export function scrubPlantState(p,stage,season){
  const {edge,retention,bed,scorch}=p.habitat;
  const {moisture,recovery}=scrubResponse(p.habitat,stage,season);
  const established=p.mature&&(stage==='before'||!p.burned);
  const afterRain=stage==='first'||stage==='later';
  const shoot=afterRain&&p.mature&&p.burned&&p.resprout&&p.vigor<recovery;
  const seed=afterRain&&!p.mature&&p.seed&&p.burned&&p.vigor<recovery*(season==='wet'||stage==='later'?1:.61);
  const age=stage==='later'?1:.32;
  const matureSize=.9+1.2*retention+.85*p.vigor;
  let shrub=0;
  if(established)shrub=matureSize;
  else if(shoot)shrub=matureSize*age*.8;
  else if(seed)shrub=(.55+.85*retention+.77*p.vigor)*age*.82;
  const stems=stage!=='before'&&p.mature&&p.burned&&(stage!=='later'||p.cover<.19);
  const grassAfterFire=stage==='first'?1.05:stage==='later'?.62:.34;
  const grassChance=edge*(.18+.79*moisture)*grassAfterFire*(1-.9*bed)*(shrub>.8?.21:1);
  const herbs=stage!=='burned'&&p.cover<grassChance;
  return {shrub,stems,stemHeight:matureSize*(.62+.32*scorch),shoot,seed,herbs,moisture};
}

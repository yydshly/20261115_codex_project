import {bedrockAt,hydroMaterials,parentAt} from './groundwater-layout.js';
import {regionalClimate} from './regional-geography.js';
import {riverField,waterAt} from './water-system.js';

export const sectionRock={
  offshore:{name:'海底基底',color:'#576a80'},
  ...hydroMaterials
};
export const sectionCover={
  seafloor:{name:'海底沉积',color:'#8aa4a5'},
  bare:{name:'裸岩与薄岩屑',color:'#c5aa90'},
  residual:{name:'原地风化层',color:'#d69c60'},
  alluvium:{name:'河流冲积层',color:'#eadd89'}
};
export const sectionLayers=[
  {id:'rock',name:'基岩',color:'#d3b7df'},
  {id:'cover',name:'风化与沉积',color:'#f3cc81'},
  {id:'water',name:'河床与水流',color:'#8ce4f0'}
];

const clamp=v=>Math.max(0,Math.min(1,v));

export function sectionSample(point,elevation,offshore=false){
  const {x,y,z}=point,r=5;
  const slope=Math.hypot(elevation(x+r,z)-elevation(x-r,z),elevation(x,z+r)-elevation(x,z-r))/(2*r);
  const river=riverField(x,z),water=waterAt(x,z);
  const bank=river?Math.max(0,river.distance-river.half):Infinity;
  const {moisture}=regionalClimate(x,z,y,bank);
  const marine=offshore&&y<0;
  const rock=marine?'offshore':bedrockAt(x,z);
  const lowBank=river?.branch===0&&river.t>=.41&&bank<22&&y-river.level<1.7&&slope<.65;
  const channel=river?.branch===0&&river.normalized<=1&&water&&water.level>y;
  const cover=marine?'seafloor':lowBank||parentAt(x,z)==='alluvium'?'alluvium':channel||slope>.76?'bare':'residual';
  const retained=(1-clamp(slope/.82))*(.65+.35*moisture);
  // The visible upper band is exaggerated to make it legible at map scale.
  const coverDepth=cover==='alluvium'?10+9*retained:cover==='seafloor'?6.5:2.5+12*retained;
  return {...point,slope,rock,cover,coverDepth,waterLevel:marine?0:
    water&&water.level>y+.01?water.level:null};
}

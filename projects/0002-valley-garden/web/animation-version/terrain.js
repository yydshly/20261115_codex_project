import * as THREE from 'three';
import { groundNoise } from './ground.js';
import { localReliefAt } from './surface-field.js';

const smooth=THREE.MathUtils.smoothstep;
let elevation=null;
export function setTerrainElevation(samples){elevation=samples;}
export function riverX(z){return -28+40*Math.exp(-Math.pow((z-30)/22,2))+2*Math.sin(z*.028);}
export function riverWidth(z){return 3.5+.7*Math.sin(z*.025+1)+.22*Math.sin(z*.17)+.08*Math.sin(z*.51+2);}
export function wildnessAt(x,z){
  const outside=Math.max(Math.abs(x)-11.8,-22-z,z-7.3,0);
  return smooth(outside,0,5);
}

/** A managed garden opens into a rolling, unmown valley floor and floodplain. */
export function meadowHeightAt(x,z){
  const d=Math.abs(x-riverX(z)),wild=wildnessAt(x,z);
  const floodplain=smooth(d,riverWidth(z)+2,riverWidth(z)+12);
  const outer=smooth(Math.hypot(x,z+10),12,65);
  const wx=x+(groundNoise(x*.021,z*.021)-.5)*15,wz=z+(groundNoise(x*.024+15,z*.024)-.5)*12;
  const rolls=groundNoise(wx*.013+20,wz*.013+10)*4.6+groundNoise(wx*.033,wz*.025)*1.45;
  const foothills=smooth(Math.abs(x),45,180)*(3+4*groundNoise(x*.011,z*.011));
  const routeCentre=Math.max(0,z-9),routeReserve=smooth(z,-3,0)*(1-smooth(z,18,22))*(1-smooth(Math.abs(x-routeCentre),1.5,3));
  const hummocks=localReliefAt(x,z)*(1-routeReserve);
  const bridgeApproach=1-(1-smooth(Math.abs(z-18),1.5,4))*(1-smooth(Math.abs(x-riverX(18)),8,12));
  let y=.18+wild*floodplain*bridgeApproach*(outer*rolls+foothills+hummocks);
  const pad=(1-smooth(Math.abs(x),6.2,7.2))*smooth(z,-18,-17)*(1-smooth(z,-3,-2));
  y+=((groundNoise(x*.7,z*.7)-.5)*.035+(groundNoise(x*1.8,z*1.8)-.5)*.014)*(1-pad);
  const channel=1-smooth(d,riverWidth(z)-.65,riverWidth(z)+1.5);
  return y*(1-channel)-1.05*channel;
}

export function mountainVertexHeight(row,col,samples=elevation){
  if(!samples)return -Infinity;
  return Math.max(0,samples[row*256+col]-676.7)*.245*smooth((255-row)/255,0,.12)-.35;
}

/** Interpolate the DEM's actual two triangles, so trees meet its rendered surface. */
export function mountainHeightAt(x,z){
  if(!elevation||Math.abs(x)>1150||z< -2340||z> -140)return -Infinity;
  const gx=(x/2300+.5)*255,gy=(z+2340)/2200*255;
  const col=Math.min(254,Math.floor(gx)),row=Math.min(254,Math.floor(gy)),u=gx-col,v=gy-row;
  const a=mountainVertexHeight(row,col),b=mountainVertexHeight(row,col+1),c=mountainVertexHeight(row+1,col),d=mountainVertexHeight(row+1,col+1);
  return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
}

function triangleHeight(x,z,step,vertexHeight){
  const x0=Math.floor(x/step)*step,z0=Math.floor(z/step)*step,u=(x-x0)/step,v=(z-z0)/step;
  const a=vertexHeight(x0,z0),b=vertexHeight(x0+step,z0),c=vertexHeight(x0,z0+step),d=vertexHeight(x0+step,z0+step);
  return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
}
export function meadowSurfaceHeightAt(x,z){
  const extent=Math.max(Math.abs(x),Math.abs(z));
  if(extent>=160)return triangleHeight(x,z,5,meadowHeightAt);
  if(extent>=60)return triangleHeight(x,z,1.25,(vx,vz)=>meadowStitchedHeight(vx,vz,160,5));
  return triangleHeight(x,z,.5,(vx,vz)=>meadowStitchedHeight(vx,vz,60,1.25));
}
export function meadowStitchedHeight(x,z,extent,coarseStep){
  const gx=Math.floor(x/coarseStep)*coarseStep,gz=Math.floor(z/coarseStep)*coarseStep,tx=(x-gx)/coarseStep,tz=(z-gz)/coarseStep;
  const vertex=(vx,vz)=>extent===60?meadowStitchedHeight(vx,vz,160,5):meadowHeightAt(vx,vz);
  const coarse=THREE.MathUtils.lerp(THREE.MathUtils.lerp(vertex(gx,gz),vertex(gx+coarseStep,gz),tx),THREE.MathUtils.lerp(vertex(gx,gz+coarseStep),vertex(gx+coarseStep,gz+coarseStep),tx),tz);
  return THREE.MathUtils.lerp(coarse,meadowHeightAt(x,z),smooth(extent-Math.max(Math.abs(x),Math.abs(z)),0,5));
}
export function heightAt(x,z){return Math.max(meadowSurfaceHeightAt(x,z),mountainHeightAt(x,z));}
const analyticHeightAt=(x,z)=>Math.max(meadowHeightAt(x,z),mountainHeightAt(x,z));
export function slopeAt(x,z){
  return Math.hypot((analyticHeightAt(x+2,z)-analyticHeightAt(x-2,z))/4,(analyticHeightAt(x,z+2)-analyticHeightAt(x,z-2))/4);
}
const groves=[[-59,-49,27,23],[64,-68,34,29],[-103,-109,41,34],[19,-141,37,28],[129,-160,52,48],[-157,-181,54,48]];
/** Shared woods / edge / rough meadow field, with openings between near groves. */
export function woodlandPotentialAt(x,z){
  const base=groundNoise(x*.009+37,z*.009-11)*.68+groundNoise(x*.027,z*.027)*.32;
  let grove=0;
  for(const [gx,gz,rx,rz] of groves)grove=Math.max(grove,Math.exp(-(((x-gx)/rx)**2+((z-gz)/rz)**2)*1.35));
  const opening=Math.exp(-(((x-4)/35)**2+((z+52)/68)**2));
  const near=grove*.83+base*.25-opening*.28;
  return THREE.MathUtils.clamp(THREE.MathUtils.lerp(base,near,smooth(z,-250,-135)),0,1);
}
export function valleyHabitatAt(x,z){
  const garden=smooth(Math.max(Math.abs(x)-14,-28-z,z-12),0,8);
  if(garden===0)return {forest:0,edge:0,rough:0};
  const h=analyticHeightAt(x,z),slope=slopeAt(x,z),potential=woodlandPotentialAt(x,z);
  const suitability=(1-smooth(h,155,265))*(1-smooth(slope,.65,1.18));
  const forest=smooth(potential,.34,.72)*suitability*garden;
  const edge=Math.exp(-(((potential-.43)/.145)**2))*suitability*garden;
  const rough=THREE.MathUtils.clamp(edge*.65+groundNoise(x*.048+8,z*.048-12)*.35,0,1)*garden;
  return {forest,edge,rough};
}
export function forestDensityAt(x,z){return valleyHabitatAt(x,z).forest;}

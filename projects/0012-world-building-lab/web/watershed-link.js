// Authored continuous upland-to-rainforest drainage. Static geometry; no rainfall/erosion simulation.
import {UPLAND_POOLS,UPLAND_SITES,uplandFields,uplandGuide} from './upland-layout.js';
import {TROPICAL_SITES,tropicalChannel,tropicalGuideDistance,tropicalRiverField,tropicalWaterAt} from './tropical-layout.js';
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);},mix=(a,b,t)=>a+(b-a)*t;
const start=UPLAND_POOLS.at(-1),end=tropicalChannel(0);
export const LINK_NODES=[{x:start.x,z:start.z,level:start.level,half:2,depth:1.6},{x:-1325,z:620,level:203,half:3,depth:2.2},{x:-1285,z:720,level:135,half:3.5,depth:2.6},{x:-1150,z:810,level:62,half:4,depth:2.8},{x:-950,z:850,level:30,half:4.5,depth:2.6},{x:-760,z:915,level:19,half:5,depth:2},{x:-760,z:980,level:15,half:5.5,depth:1.7},{x:end.x,z:end.z,level:end.level,half:end.half,depth:end.depth}];
let channelLength=0;
const legs=LINK_NODES.slice(1).map((b,i)=>{
 const a=LINK_NODES[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),before=channelLength;
 channelLength+=length;
 return {a,b,dx,dz,length,i,before};
});
export const LINK_LENGTH=channelLength;
function reachLevel(leg,u){
 const begin=leg.i===0?22/leg.length:.05,end=leg.i===legs.length-1?.7:.95;
 return mix(leg.a.level,leg.b.level,clamp((u-begin)/(end-begin)));
}
function sampleLeg(leg,u){
 const {a,b,dx,dz,length,i,before}=leg;
 return {x:mix(a.x,b.x,u),z:mix(a.z,b.z,u),level:reachLevel(leg,u),
  half:mix(a.half,b.half,u),depth:mix(a.depth,b.depth,u),
  nx:-dz/length,nz:dx/length,leg:i,u,t:clamp((before+u*length)/LINK_LENGTH)};
}
export function linkSample(t){
 const d=clamp(t)*LINK_LENGTH;
 const leg=legs.find(p=>d<=p.before+p.length)??legs.at(-1);
 return sampleLeg(leg,clamp((d-leg.before)/leg.length));
}
function projectLeg(x,z,p){
 const u=clamp(((x-p.a.x)*p.dx+(z-p.a.z)*p.dz)/(p.length*p.length));
 const distance=Math.hypot(x-mix(p.a.x,p.b.x,u),z-mix(p.a.z,p.b.z,u));
 return {p,u,distance};
}
function sampleProjection({p,u,distance}){
 return {...sampleLeg(p,u),distance};
}
function nearestProjection(projections){
 return projections.reduce((best,p)=>p.distance<(best?.distance??175)?p:best,null);
}
export function linkField(x,z){
 if(x< -1510||x> -580||z<440||z>1140)return null;
 const nearest=nearestProjection(legs.map(leg=>projectLeg(x,z,leg)));
 if(!nearest)return null;
 const field=sampleProjection(nearest),old=field.leg===legs.length-1&&tropicalWaterAt(x,z);
 return old?{...field,level:old.level}:field;
}
function oldClearance(x,z){
 let poolClearance=1;
 if(z>533&&z<562){
  const poolEdge=(Math.hypot((x-start.x)/start.rx,(z-start.z)/start.rz)-1)*start.rz;
  const streamEdge=Math.min(...uplandFields(x,z).map(f=>f.distance-f.half));
  poolClearance=mix(smooth(Math.min(poolEdge,streamEdge)/7),1,smooth((z-552)/10));
 }
 const terraceEdge=Math.min(x+1200,-1080-x,z-600,710-z);
 return poolClearance*(1-smooth((terraceEdge+12)/12))*smooth((z-533)/17)
  *Math.min(smooth((uplandGuide(x,z).distance-7)/7),smooth((tropicalGuideDistance(x,z).distance-7)/7));
}
const corridorWeight=distance=>1-smooth((distance-65)/100);
export function linkWeight(x,z){const f=linkField(x,z);return f?corridorWeight(f.distance)*oldClearance(x,z):0;}
// Short bridge crosses the old outlet channel without filling its bed or changing the old viewing ray.
export const LINK_BRIDGE={x:-1295,z:539,halfX:12,halfZ:1.5,y:225};
export function linkSupport(x,z,h){const b=LINK_BRIDGE;return Math.abs(x-b.x)<=b.halfX&&Math.abs(z-b.z)<=b.halfZ?Math.max(h,b.y):h;}
const bank=[];for(let i=0;i<=240;i++){const p=linkSample(i/240),offset=mix(17,p.half+7,smooth(i/15));let x=p.x+p.nx*offset,z=p.z+p.nz*offset;for(let k=0;k<10;k++){const f=linkField(x,z);if(!f||f.distance>=f.half+7)break;const d=f.distance||1;x=f.x+(x-f.x)/d*(f.half+8);z=f.z+(z-f.z)/d*(f.half+8);}const f=linkField(x,z);bank.push({x,z,y:(f?.level??p.level)+1.6,t:i/240});}
export const LINK_GUIDE=[{x:UPLAND_SITES[3].x,z:UPLAND_SITES[3].z,y:UPLAND_SITES[3].floor},{x:-1275,z:539,y:226},{x:-1283,z:539,y:225},{x:-1307,z:539,y:225},...bank,{x:TROPICAL_SITES[0].x,z:TROPICAL_SITES[0].z,y:TROPICAL_SITES[0].floor}];
const guideLegs=LINK_GUIDE.slice(1).map((b,i)=>{const a=LINK_GUIDE[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);return {a,b,dx,dz,length};});
const guideBins=new Map();for(const p of guideLegs){for(let x=Math.floor((Math.min(p.a.x,p.b.x)-9)/16);x<=Math.floor((Math.max(p.a.x,p.b.x)+9)/16);x++)for(let z=Math.floor((Math.min(p.a.z,p.b.z)-9)/16);z<=Math.floor((Math.max(p.a.z,p.b.z)+9)/16);z++){const key=x+','+z;if(!guideBins.has(key))guideBins.set(key,[]);guideBins.get(key).push(p);}}
export function linkGuideField(x,z){let best={distance:Infinity,y:0};for(const p of guideBins.get(Math.floor(x/16)+','+Math.floor(z/16))||[]){const u=clamp(((x-p.a.x)*p.dx+(z-p.a.z)*p.dz)/(p.length*p.length||1)),d=Math.hypot(x-p.a.x-p.dx*u,z-p.a.z-p.dz*u);if(d<best.distance)best={distance:d,y:mix(p.a.y,p.b.y,u)};}return best;}
export function linkTerrain(x,z,h){
 if(x< -1510||x> -580||z<440||z>1140)return h;
 const projections=legs.map(leg=>projectLeg(x,z,leg)),nearest=nearestProjection(projections);
 if(!nearest)return h;
 const clearance=oldClearance(x,z),d=nearest.distance,w=corridorWeight(d)*clearance;
 if(!w)return h;
 const f=sampleProjection(nearest);
 // Keep the channel grade. Blend competing valley shoulders around bends.
 const shoulder=smooth((d-f.half-6)/14);
 let sum=f.level,weights=1;
 for(const p of projections){
  if(p===nearest)continue;
  const weight=shoulder*(1-smooth((p.distance-d)/26));
  if(weight){sum+=reachLevel(p.p,p.u)*weight;weights+=weight;}
 }
 const target=sum/weights+1.7+Math.min(24,d*.16)+1.1*Math.sin(x*.028)*Math.sin(z*.024);
 let terrain=mix(h,target,w);
 if(d<f.half+6){
  const r=d/f.half,bed=r<=1?f.level-f.depth*(1-r*r):f.level+1.7*smooth((d-f.half)/6);
  terrain=mix(terrain,bed,(1-smooth((d-f.half-3)/3))*smooth(w/.35));
 }
 const guide=linkGuideField(x,z);
 const shaped=mix(terrain,guide.y,(1-smooth((guide.distance-2)/3))*smooth((d-f.half-1)/3)*clearance);
 if(z<960)return shaped;
 const river=tropicalRiverField(x,z),bank=1-smooth((river.distance-river.half)/16);
 return mix(shaped,Math.min(h,shaped),bank);
}
export function linkWaterAt(x,z){const f=linkField(x,z);if(!f||f.distance>=f.half||linkWeight(x,z)<.99)return null;const depth=f.depth*(1-(f.distance/f.half)**2);return {level:f.level,depth,bed:f.level-depth,fresh:true,salt:0,watershedLink:true};}
export function linkHabitat(x,z){const f=linkField(x,z),weight=linkWeight(x,z);if(!f||weight<.4)return null;return {...f,weight,moisture:Math.max(.25,1-f.distance/100),band:f.level>140?'highland':f.level>45?'slope':'foothill'};}
export function linkColor(x,z,old){const f=linkHabitat(x,z);if(!f)return old;const rgb=f.distance<f.half?[104,135,127]:f.distance<f.half+8?[143,138,112]:f.band==='highland'?[132,147,99]:f.band==='slope'?[127,140,101]:[103,128,78];return old.map((v,i)=>Math.round(mix(v,rgb[i],f.weight)));}
export const linkReserved=(x,z)=>linkWeight(x,z)>.01;
export const linkNearTile=(x,z)=>x> -1600&&x< -500&&z>360&&z<1220;
export function linkGuideSample(t){const total=guideLegs.reduce((s,p)=>s+p.length,0);let d=clamp(t)*total;for(let i=0;i<guideLegs.length;i++){const p=guideLegs[i];if(d<=p.length||i===guideLegs.length-1){const u=clamp(d/p.length);return {x:mix(p.a.x,p.b.x,u),z:mix(p.a.z,p.b.z,u),y:mix(p.a.y,p.b.y,u)};}d-=p.length;}}

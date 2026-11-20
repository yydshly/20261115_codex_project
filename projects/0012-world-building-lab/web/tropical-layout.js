import {rainDivideX,regionalClimate} from './regional-geography.js';
// Authored humid tropical district. No climate, species or tidal-process simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const TROPICAL={minX:-1920,maxX:-650,minZ:820,maxZ:1550};
export const TROPICAL_STAGES=['地形与土壤','河网与盐湿','乔木与林冠','林下与根系'];
export const TROPICAL_SITES=[
 {id:'tropical-edge',name:'湿热雨林林缘',terrain:'雨林林缘',x:-840,z:930,targetX:-885,targetZ:960,floor:32},
 {id:'tropical-canopy',name:'层叠林冠观察点',terrain:'林冠',x:-1030,z:990,targetX:-1070,targetZ:1010,floor:25,canopy:true,survey:true},
 {id:'tropical-understory',name:'板根与蕨影林下',terrain:'林下',x:-1250,z:1105,targetX:-1270,targetZ:1120,floor:17},
 {id:'tropical-bank',name:'淡水河岸与湿润土层',terrain:'雨林河岸',x:-1450,z:1170,targetX:-1460,targetZ:1228,floor:8},
 {id:'tropical-mangrove',name:'潮沟间的红树林',terrain:'红树林',x:-1600,z:1200,targetX:-1620,targetZ:1234,floor:4.8},
 {id:'tropical-estuary',name:'泥滩与河海交界',terrain:'河海交界',x:-1725,z:1230,targetX:-1790,targetZ:1290,floor:3}
].map((r,index)=>({...r,index,tropical:true}));
export function tropicalWeight(x,z){
 if(x< -1920||x> -410||z<820||z>1550)return 0;
 const inner=1-smooth((x-rainDivideX(z)+145)/325);
 return smooth((x+1920)/55)*inner*smooth((z-820)/55)*smooth((1550-z)/50);
}
export const tropicalCoastX=z=>-1755+18*Math.sin((z-1300)*.025);
export function tropicalChannel(t,branch=0){t=clamp(t);const offset=branch&&t>.72?branch*42*Math.sin((t-.72)/.28*Math.PI):0,dz=350+30*Math.PI*Math.cos(t*Math.PI*2)+(branch&&t>.72?branch*42/.28*Math.PI*Math.cos((t-.72)/.28*Math.PI):0),length=Math.hypot(1000,dz);return {x:-800-1000*t,z:1010+350*t+15*Math.sin(t*Math.PI*2)+offset,t,level:14*Math.pow(Math.max(0,1-t/.9),1.7),half:branch?5+4*t:7+12*t,depth:1.5+2*t,nx:-dz/length,nz:-1000/length,salt:smooth((t-.7)/.24),branch};}
function nearChannel(x,z,branch){let t=clamp((-800-x)/1000);if(branch)t=Math.max(.72,t);for(let i=0;i<4;i++){const q=tropicalChannel(t,branch),a=tropicalChannel(Math.max(branch?.72:0,t-.0001),branch),b=tropicalChannel(Math.min(1,t+.0001),branch),d=b.t-a.t||.0001,dx=(b.x-a.x)/d,dz=(b.z-a.z)/d;t=Math.max(branch?.72:0,Math.min(1,t+((x-q.x)*dx+(z-q.z)*dz)/(dx*dx+dz*dz)));}const q=tropicalChannel(t,branch);return {...q,distance:Math.hypot(x-q.x,z-q.z)};}
export function tropicalRiverField(x,z){let q=nearChannel(x,z,0);if(x< -1490)for(const branch of [-1,1]){const b=nearChannel(x,z,branch);if(b.distance-b.half<q.distance-q.half)q=b;}return q;}
export function tropicalWaterAt(x,z){if(tropicalWeight(x,z)<.02)return null;if(x<tropicalCoastX(z))return {level:0,salt:1,sea:true,tropical:true};const q=tropicalRiverField(x,z);return q.distance<q.half?{...q,tropical:true,fresh:q.salt<.1}:null;}
export function tropicalGuideDistance(x,z){let best={distance:Infinity,y:0};for(let i=1;i<TROPICAL_SITES.length;i++){const a=TROPICAL_SITES[i-1],b=TROPICAL_SITES[i],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),d=Math.hypot(x-a.x-dx*u,z-a.z-dz*u);if(d<best.distance)best={distance:d,y:a.floor+(b.floor-a.floor)*u};}return best;}
export function tropicalTerrain(x,z,h){const w=tropicalWeight(x,z);if(!w)return h;const coast=tropicalCoastX(z),d=x-coast;let target=d<0?-1+d*.13:1.2+Math.min(2,d*.025)+32*smooth((x+1570)/740)+.45*Math.sin(x*.045)*Math.cos(z*.037);const q=tropicalRiverField(x,z),r=Math.min(1,q.distance/q.half),profile=q.distance<q.half?q.level-q.depth*(1-.85*r*r):q.level-.15*q.depth+(q.distance-q.half)*.25,k=1-smooth((q.distance-q.half-10)/22);if(k>0&&x>coast-15)target=target*(1-k)+profile*k;const path=tropicalGuideDistance(x,z),g=1-smooth((path.distance-3.5)/9);if(g>0)target=target*(1-g)+path.y*g;return h*(1-w)+target*w;}
export function tropicalColor(x,z,h){if(tropicalWeight(x,z)<.25)return null;const q=tropicalRiverField(x,z);if(h<0)return [97,123,108];if(x< -1500)return [112,120,83];if(q.distance<q.half+22)return [106,111,71];const f=Math.sin(x*.2+z*.13)*5;return [82+f,111+f,64+f];}
export function tropicalHabitat(x,z,height=25){
 const weight=tropicalWeight(x,z);
 if(weight<.06)return null;
 const q=tropicalRiverField(x,z),water=tropicalWaterAt(x,z),bank=q.distance-q.half;
 const salt=x<tropicalCoastX(z)?1:q.salt*Math.max(0,1-Math.max(0,bank)/100);
 const {moisture}=regionalClimate(x,z,height,bank);
 const cover=weight*smooth((x+1510)/105)*smooth((z-850)/72)*smooth((1335-z)/105)
   *smooth((moisture-.48)/.32)*(1-.83*smooth((x-rainDivideX(z)+174)/222));
 return {salt,moisture,cover,water,river:q,mangrove:x< -1510&&z>1130&&salt>.25,rainforest:cover>.055};
}
export const tropicalReserved=(x,z)=>tropicalWeight(x,z)>.26;
export const tropicalNearTile=(x,z)=>x< -370&&z>740;

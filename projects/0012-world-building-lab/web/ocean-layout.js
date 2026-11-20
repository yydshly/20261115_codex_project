import {eastCoastProfile} from './geology-layout.js';
// Authored vertical scale within a compact map; not real ocean bathymetry.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const OCEAN={minX:1120,maxX:1920,minZ:490,maxZ:1600,level:0};
export const OCEAN_STAGES=['海洋地形骨架','海床底质','海面与水深','水下元素'];
export const OCEAN_ISLANDS=[{x:1360,z:850,rx:64,rz:74,top:47},{x:1430,z:800,rx:33,rz:44,top:25},{x:1395,z:945,rx:42,rz:34,top:19}];
export const OCEAN_SITES=[
 {id:'ocean-open',name:'外海与开阔水面',terrain:'外海',x:1330,z:630,targetX:1430,targetZ:650,clearance:36},
 {id:'ocean-islands',name:'群岛与岛间水道',terrain:'群岛',x:1300,z:840,targetX:1360,targetZ:850,clearance:42},
 {id:'ocean-shelf',name:'大陆架与浅缓海床',terrain:'大陆架',x:1500,z:1030,targetX:1538,targetZ:1046,clearance:13},
 {id:'ocean-slope',name:'大陆坡与海底沟槽',terrain:'大陆坡',x:1650,z:1190,targetX:1690,targetZ:1270,clearance:20},
 {id:'ocean-trench',name:'深海海沟与沉积底',terrain:'深海海沟',x:1810,z:1400,targetX:1828,targetZ:1438,clearance:24}
].map((r,index)=>({...r,index,ocean:true,survey:true}));
export function oceanWeight(x,z){return smooth((x-1120)/75)*smooth((1920-x)/50)*smooth((z-490)/75)*smooth((1600-z)/50);}
export function oceanProfile(x,z){let h=x<1460?-18-(x-1220)*.08:-37.2-(Math.min(x,1720)-1460)*.64;h-=165*Math.exp(-(((x-1810)/65)**2))*smooth((z-1120)/130);h+=2*Math.sin(z*.045+x*.02);// Canonicalize the authored band edge against route-rescaling roundoff.
const bandX=Math.round(x*1e7)/1e7;if(bandX>1490&&bandX<1720)h-=8*Math.pow(.5+.5*Math.sin(z*.06+x*.035),8);for(const q of OCEAN_ISLANDS){const r=Math.hypot((x-q.x)/q.rx,(z-q.z)/q.rz);if(r<1.8){const k=1-smooth(r/1.8),top=q.top*(1-r*r);h=Math.max(h,h*(1-k)+top*k);}}return h;}
export function oceanTerrain(x,z,h){
 const core=oceanWeight(x,z);
 const across=smooth((x-1120)/110)*smooth((1920-x)/65);
 const shore=across*smooth((z-315)/225)*(1-smooth((z-530)/110))*smooth(-h/11);
 const weight=Math.max(core,shore);
 const bed=weight?h*(1-weight)+oceanProfile(x,z)*weight:h;
 if(x<=1370||z<=278||z>=880)return bed;
 const shelf=smooth((x-1370)/165)*smooth((z-278)/92)*(1-smooth((z-515)/365)),
   distanceFromIslands=OCEAN_ISLANDS.reduce((r,p)=>Math.min(r,Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz)),Infinity);
 const integration=shelf*smooth((distanceFromIslands-1.25)/.65);
 return bed+(eastCoastProfile(x,z)-bed)*integration;
}
export function oceanWaterAt(x,z){return oceanWeight(x,z)>.01&&oceanProfile(x,z)<0?{level:0,depth:-oceanProfile(x,z),ocean:true,sea:true,salt:1}:null;}
export function oceanColor(x,z,h){if(oceanWeight(x,z)<.25)return null;return h>2?[113,136,100]:h> -3?[177,167,133]:h> -65?[143,151,132]:h> -210?[101,122,133]:[72,93,114];}
export function oceanDepthColor(h){const d=Math.max(0,-h);return (d<2?[.56,.76,.68]:d<65?[.23,.58,.66]:d<210?[.14,.35,.53]:[.08,.17,.33]);}
export const oceanReserved=(x,z)=>oceanWeight(x,z)>.001;
export const oceanNearTile=(x,z)=>x>1040&&z>410;

export function southOpenSea(x,z,height){
 if(z<=1551||x<=-14||x>=248)return height;
 const fade=smooth((z-1551)/8)*smooth((x+14)/67)*smooth((248-x)/66);
 return height+(Math.min(height,-4)-height)*fade;
}

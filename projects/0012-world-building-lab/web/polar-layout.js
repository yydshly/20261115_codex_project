// Authored polar district, not a latitude, glacier or climate simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const POLAR={minX:-1100,maxX:250,minZ:-1590,maxZ:-1090};
export const ICE_CAP={x:-365,z:-1430,rx:220,rz:110,thickness:42};
export const TUNDRA_POOL={x:55,z:-1246,rx:18,rz:11,level:24,depth:2};
export const POLAR_STAGES=['海岸与岩床','雪冰与覆盖','水域与苔原','极地氛围与极光'];
export const POLAR_SITES=[
 {id:'polar-coast',name:'北境极地海岸',terrain:'极地海岸',x:-710,z:-1210,targetX:-830,targetZ:-1250},
 {id:'polar-seaice',name:'浮冰湾与冰山',terrain:'海冰与冰山',x:-650,z:-1310,targetX:-860,targetZ:-1340},
 {id:'polar-cap',name:'冰盖南缘',terrain:'冰盖',x:-390,z:-1300,targetX:-365,targetZ:-1445},
 {id:'polar-tundra',name:'低矮苔原与融水洼地',terrain:'苔原',x:20,z:-1220,targetX:55,targetZ:-1246},
 {id:'polar-aurora',name:'北境极光观景地',terrain:'极光夜景',x:-90,z:-1435,targetX:-390,targetZ:-2235,skyTarget:true}
].map((r,index)=>({...r,index,polar:true}));
export const POLAR_LEGS=[
 [POLAR_SITES[0],{x:-680,z:-1250},POLAR_SITES[1]],
 [POLAR_SITES[1],{x:-540,z:-1290},POLAR_SITES[2]],
 [POLAR_SITES[2],{x:-260,z:-1240},{x:-100,z:-1200},POLAR_SITES[3]],
 [POLAR_SITES[3],{x:0,z:-1285},{x:90,z:-1290},{x:100,z:-1410},POLAR_SITES[4]]
];
export const POLAR_APPROACH=[{x:-378,z:-888,y:18.29219600375036},{x:-520,z:-960,y:45},{x:-640,z:-1020,y:91.3357543889233},{x:-690,z:-1080,y:58},{x:-720,z:-1130,y:30},{...POLAR_SITES[0],y:8}];
export function polarWeight(x,z){return smooth((x+1100)/70)*smooth((250-x)/80)*smooth((-z-1090)/80)*smooth((1590+z)/60);}
export const polarCoastX=z=>-754+24*Math.sin((z+1210)*.013);
export function iceCapField(x,z){const r=Math.hypot((x-ICE_CAP.x)/ICE_CAP.rx,(z-ICE_CAP.z)/ICE_CAP.rz);return r<1?{r,thickness:ICE_CAP.thickness*Math.pow(1-r*r,1.3)}:null;}
function coastApron(x,z){
 if(x<= -1000||x>= -425||z<= -1200||z>= -920)return 0;
 return smooth((x+1000)/145)*smooth((-425-x)/220)*smooth((z+1200)/44)*smooth((-920-z)/120);
}
function coastApronHeight(x,z){
 const inland=x-polarCoastX(z)-14*Math.sin((z+1140)*.028)+32*smooth((z+1160)/115);
 const slope=56*smooth((z+1160)/180);
 return slope+(inland<0?Math.max(-41,inland*.23):6*smooth(inland/16)+Math.min(26,inland*.12));
}
export function polarWaterAt(x,z){const r=Math.hypot((x-TUNDRA_POOL.x)/TUNDRA_POOL.rx,(z-TUNDRA_POOL.z)/TUNDRA_POOL.rz);if(r<=1)return {...TUNDRA_POOL,normalized:r,fresh:true,polar:true};const apron=coastApron(x,z);if(apron>.98){const depth=-coastApronHeight(x,z);return depth>0?{level:0,polar:true,sea:true,depth}:null;}if(polarWeight(x,z)>.25&&x<polarCoastX(z))return {level:0,polar:true,sea:true,depth:50};return null;}
function nearest(points,x,z){let best={distance:Infinity};for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),distance=Math.hypot(x-a.x-dx*u,z-a.z-dz*u);if(distance<best.distance)best={distance,y:a.y+(b.y-a.y)*u};}return best;}
export function polarTerrain(x,z,original){
 const w=polarWeight(x,z);let h=original;
 if(w){
  const inland=x-polarCoastX(z),cap=Math.exp(-(((x+365)/225)**2+((z+1430)/150)**2));
  const shoreRise=(6+82*cap+2*Math.sin(x*.032)*Math.cos(z*.038))*smooth(inland/16);
  let target=inland<0?Math.max(-52,inland*.62):shoreRise+Math.min(22,inland*.06);
  const r=Math.hypot((x-TUNDRA_POOL.x)/TUNDRA_POOL.rx,(z-TUNDRA_POOL.z)/TUNDRA_POOL.rz);
  if(r<2.2){
   const p=TUNDRA_POOL.level-(r<1?pDepth(r):-.1-3*smooth((r-1)/1.2)),k=1-smooth((r-1.4)/.8);
   target=target*(1-k)+p*k;
  }
  h=original*(1-w)+target*w;
 }
 const apron=coastApron(x,z);
 if(apron)h+=(coastApronHeight(x,z)-h)*apron;
 if(z< -880&&z> -1240&&x> -750&&x< -350){const p=nearest(POLAR_APPROACH,x,z),k=1-smooth((p.distance-4)/12);if(k>0)h=h*(1-k)+p.y*k;}return h;
}
function pDepth(r){return TUNDRA_POOL.depth*Math.pow(Math.max(0,1-r*r),1.1);}
export function polarIceSupport(x,z,h){const ice=iceCapField(x,z);return ice?h+ice.thickness:h;}
export function polarColor(x,z,h){if(polarWeight(x,z)<.25)return null;if(h<0)return [86,120,134];if(x> -180&&z> -1360)return [126,139,105];if(h>65)return [169,183,188];return x< -600?[161,175,177]:[151,166,157];}
export const polarNearTile=(x,z)=>x> -1160&&x<320&&z< -1000;
export const polarReserved=(x,z)=>polarWeight(x,z)>.01||z< -880&&z> -1240&&x> -750&&x< -350&&nearest(POLAR_APPROACH,x,z).distance<9;
export function auroraVisibility({x,z,night=0,cloud=0,weather='clear',sheltered=false,enabled=true}){if(sheltered||!enabled)return 0;return polarWeight(x,z)*clamp(night)*Math.pow(1-clamp(cloud),2)*(weather==='fog'?.08:1);}
export const ICEBERGS=[{x:-885,z:-1290,rx:22,rz:17,top:32,bottom:-24},{x:-910,z:-1400,rx:28,rz:20,top:44,bottom:-31},{x:-815,z:-1430,rx:17,rz:14,top:25,bottom:-18}];
export const SEA_FLOES=[[-810,-1215,24,17],[-865,-1235,19,14],[-934,-1260,32,21],[-850,-1350,23,18],[-985,-1330,27,19],[-985,-1450,30,22],[-780,-1460,18,12]].map(([x,z,rx,rz],i)=>({x,z,rx,rz,top:.35+i*.025,bottom:-1.3}));

export const POLAR_BOARDWALK=[{x:-564.589279572288,z:-62.85184212864,y:30.942030678741347},{x:-568,z:-67,y:30.5},{x:-585.132819,z:-84.34542,y:26.5793779475},{x:-591,z:-89,y:28},{x:-595.84607264,z:-93.3875175,y:28},{x:-599,z:-96,y:28},{x:-602.694517128,z:-98.65892784,y:27.9487790995}];
export function polarBoardwalkSupport(x,z,h){const p=nearest(POLAR_BOARDWALK,x,z);return p.distance<1.35?Math.max(h,p.y):h;}

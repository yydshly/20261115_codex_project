// Authored rock volumes, union cave network and geothermal patch; metres.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const GEOLOGY={minX:1460,maxX:1910,minZ:-540,maxZ:420};
export const HOT_POOL={x:1650,z:-405,rx:16,rz:12,level:55,depth:3};
export const GEO_STAGES=['岩体与空腔','岩层与表面','海水与热泉','洞境与地热'];
export const GEO_SITES=[
 {id:'geo-sea',name:'海崖中的海蚀洞',terrain:'海蚀洞',x:1770,z:270,underground:true,targetX:1775,targetZ:248,targetY:8},
 {id:'geo-bridge',name:'跨越沟谷的天然岩桥',terrain:'岩桥',x:1835,z:125,targetX:1760,targetZ:85,targetY:28},
 {id:'geo-network',name:'岔路与回环洞网',terrain:'分支洞网',x:1660,z:-130,underground:true,targetX:1690,targetZ:-130,targetY:42},
 {id:'geo-thermal',name:'矿物壳、热泉与地热蒸汽',terrain:'火山地热',x:1610,z:-370,targetX:1650,targetZ:-405,targetY:55.2}
].map((r,index)=>({...r,index,geology:true}));
export const GEO_MOUTH={x:1770,z:319,y:2.5};
export const GEO_COAST_PATH=[GEO_MOUTH,{x:1815,z:319,y:2.5},{x:1840,z:270,y:28},{x:1850,z:200,y:42},{x:1835,z:125,y:42}];
export const GEO_BRIDGE_PATH=[GEO_COAST_PATH[4],{x:1845,z:85,y:46},{x:1820,z:85,y:46},{x:1700,z:85,y:46},{x:1650,z:85,y:46},{x:1600,z:30,y:42}];
export const GEO_EXIT_PATH=[{x:1600,z:30,y:42},{x:1600,z:45,y:42},{x:1510,z:45,y:43},{x:1510,z:-300,y:53},{x:1610,z:-370,y:60}];
const n=(x,z,y)=>({x,z,y});
export const NET={entry:n(1600,20,42),hall:n(1600,-60,40),junction:n(1660,-130,38),spur:n(1730,-130,37),north:n(1640,-200,36),west:n(1590,-200,35),loop:n(1560,-140,37)};
export const GEO_LINES=[{kind:'sea',a:n(1770,302,2.5),b:n(1770,235,3),half:9,height:13},...[[NET.entry,NET.hall],[NET.hall,NET.junction],[NET.junction,NET.spur],[NET.junction,NET.north],[NET.north,NET.west],[NET.west,NET.loop],[NET.loop,NET.hall]].map(([a,b])=>({kind:'network',a,b,half:7,height:11}))];
export const GEO_LOOP=[NET.junction,NET.spur,NET.junction,NET.north,NET.west,NET.loop,NET.hall,NET.entry];
export const GEO_VENTS=[{x:1585,z:-390},{x:1625,z:-435},{x:1680,z:-375}];
export const geologyWeight=(x,z)=>smooth((x-1460)/50)*smooth((1910-x)/35)*smooth((z+540)/45)*smooth((420-z)/45);
function onSegment(a,b,x,z){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));return {t,lateral:Math.abs((x-a.x)*dz-(z-a.z)*dx)/Math.hypot(dx,dz),distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t),y:a.y+(b.y-a.y)*t};}
export function geoNearest(points,x,z){let best={distance:Infinity};for(let i=1;i<points.length;i++){const q=onSegment(points[i-1],points[i],x,z);if(q.distance<best.distance)best=q;}return best;}
export function geologyField(x,z,padding=0){if(x<1545-padding||x>1780+padding||z< -211-padding||z>312+padding)return null;let floor=Infinity,ceiling=-Infinity,kind=null,edge=-Infinity;for(const line of GEO_LINES){const q=onSegment(line.a,line.b,x,z);if(q.distance>=line.half+padding)continue;const u=Math.min(1,q.lateral/line.half);let f=q.y+Math.pow(u,4)*.35;if(line.kind==='sea'){const k=smooth((x-1772.5)/2)*smooth((z-230)/15);f=f*(1-k)-1.8*k;}floor=Math.min(floor,f);ceiling=Math.max(ceiling,q.y+3+line.height*Math.sqrt(Math.max(0,1-u*u)));edge=Math.max(edge,line.half-q.distance);kind=line.kind;}return kind?{floor,ceiling,kind,edge}:null;}
export function geologyWaterAt(x,z){const r=Math.hypot((x-HOT_POOL.x)/HOT_POOL.rx,(z-HOT_POOL.z)/HOT_POOL.rz);if(r<1)return {...HOT_POOL,geology:true,fresh:true};const f=geologyField(x,z);return f?.kind==='sea'&&f.floor<0?{level:0,depth:-f.floor,sea:true,salt:1,geology:true}:null;}
const eastShoreZ=x=>315+15*Math.sin((x-1764)/84)+9*Math.sin((x-1764)/29);
// The eastern coast and shelf use the same zero datum.
export function eastCoastProfile(x,z){
 const d=z-eastShoreZ(x);
 if(d<0)return 38*smooth(-d/87);
 return -.095*d-.00024*d*d*(.7+.6*smooth((x-1470)/365));
}
export function eastShelfWaterAt(x,z){
 if(x<1550||x>1875||z<370||z>=880)return null;
 return {level:0,sea:true,salt:1,ocean:true};
}
export function geologyTerrain(x,z,h){const w=geologyWeight(x,z);if(!w)return h;let target=z>240?eastCoastProfile(x,z):37+5*Math.sin(x*.03)*Math.cos(z*.02)+18*(1-smooth((z+300)/100));if(z>220&&z<=240){const k=smooth((z-220)/20);target=target*(1-k)+eastCoastProfile(x,z)*k;}target+=35*Math.exp(-(((x-1640)/145)**2+((z+120)/125)**2));const apron=Math.hypot(x-1770,z-306);if(apron<25){const k=1-smooth((apron-17)/8);target=target*(1-k)+2.5*k;}if(x>1690&&x<1830&&Math.abs(z-85)<50)target=8+32*smooth((Math.abs(z-85)-16)/34);const r=Math.hypot((x-HOT_POOL.x)/HOT_POOL.rx,(z-HOT_POOL.z)/HOT_POOL.rz);if(r<2){const k=1-smooth((r-1.5)/.5),v=r<1?55-3*Math.pow(1-r*r,1.2):55+(r-1)*4;target=target*(1-k)+v*k;}let path={distance:Infinity};for(const points of [GEO_COAST_PATH,GEO_BRIDGE_PATH,GEO_EXIT_PATH]){const q=geoNearest(points,x,z);if(q.distance<path.distance)path=q;}const bridge=x>=1700&&x<=1820&&Math.abs(z-85)<6.5;if(!bridge){const k=1-smooth((path.distance-3.5)/9);target=target*(1-k)+path.y*k;}return h*(1-w)+target*w;}
export function geologySupport(x,z,h){return x>=1700&&x<=1820&&Math.abs(z-85)<5.5?46+.8*Math.sin((x-1700)/120*Math.PI):h;}
export function geologyColor(x,z){if(geologyWeight(x,z)<.3)return null;if(z< -300){const r=Math.hypot((x-1650)/30,(z+405)/24);return r<1.8?[181,166,113]:[137,130,115];}return z>250?[137,143,133]:[139,128,111];}
export const geologyTerrainCut=(x,y,z,cutaway=false)=>{const f=geologyField(x,z);return !!f&&y>f.floor+.08&&y<f.ceiling+.3||cutaway&&!!geologyField(x,z,12);};
export const geologyReserved=(x,z)=>geologyWeight(x,z)>.001;
export const geologyNearTile=(x,z)=>x>1380&&z> -620&&z<500;
export const geologyPortalAt=(x,z)=>Math.abs(x-1770)<12&&z>290&&z<325||Math.abs(x-1600)<10&&z>12&&z<45;

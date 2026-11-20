// Authored strata, veins and river terraces; not geological dating or ore simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const STRATA={minX:-1880,maxX:-1180,minZ:-1540,maxZ:-1220};
export const STRATA_STAGES=['地形与层序','岩面与矿脉','阶地与流水','植被与空间'];
export const STRATA_SITES=[
 {id:'strata-wall',name:'层状岩壁与水平层序',terrain:'层状岩壁',x:-1780,z:-1310,floor:35,targetX:-1780,targetZ:-1381,targetY:74},
 {id:'strata-vein',name:'岩层中的矿脉与近景样本',terrain:'岩层矿脉',x:-1620,z:-1310,floor:35,targetX:-1628,targetZ:-1378,targetY:74},
 {id:'strata-plateau',name:'台塬顶面与陡边',terrain:'台塬',x:-1460,z:-1310,floor:108,targetX:-1460,targetZ:-1410,targetY:111},
 {id:'strata-terrace',name:'多级河流阶地与支谷溪流',terrain:'河流阶地',x:-1247,z:-1310,floor:26,targetX:-1230,targetZ:-1365,targetY:21.2}
].map((r,index)=>({...r,index,strata:true}));
export const strataWeight=(x,z)=>smooth((x+1880)/40)*smooth((-1180-x)/35)*smooth((z+1540)/35)*smooth((-1220-z)/30);
export const STRATA_STREAM={x:-1230,start:-1460,end:-1260,half:4,depth:3};
export const STRATA_POOLS=[{x:-1230,z:-1460,rx:12,rz:12,level:24},{x:-1230,z:-1260,rx:20,rz:18,level:18}];
export function strataRiver(z){const t=clamp((z+1448)/170);return {x:-1230+2*Math.sin(Math.PI*clamp((z+1460)/200)),z,level:24-6*t,t};}
export function strataGuide(x,z){let best={distance:Infinity,y:35};for(let i=1;i<4;i++){const a=STRATA_SITES[i-1],b=STRATA_SITES[i],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),distance=Math.hypot(x-a.x-dx*u,z-a.z-dz*u);if(distance<best.distance)best={distance,y:a.floor+(b.floor-a.floor)*u};}return best;}
export function strataBed(x,z){const ramp=smooth((x+1550)/80);let h=(35+95*smooth((-z-1370)/14))*(1-ramp)+108*ramp;if(x> -1420)h=20+18*(1-smooth((x+1258)/12))+24*(1-smooth((x+1305)/14))+24*(1-smooth((x+1350)/14))+22*(1-smooth((x+1395)/16));if(z>=-1475&&z<=-1240){const p=strataRiver(z),d=Math.hypot(x-p.x,z< -1460?z+1460:z> -1260?z+1260:0);if(d<32){const target=p.level-3+5*smooth((d-4)/14),k=1-smooth((d-21)/11);h=h*(1-k)+target*k;}}for(const p of STRATA_POOLS){const r=Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz);if(r<1.5){const target=p.level-3*Math.max(0,1-r*r)+Math.max(0,r-1)*4,k=1-smooth((r-1.15)/.35);h=z>=-1460&&z<=-1260&&Math.abs(x-strataRiver(z).x)<8?Math.min(h,target):h*(1-k)+target*k;}}const q=strataGuide(x,z),g=1-smooth((q.distance-3.8)/9);return h*(1-g)+q.y*g;}
export function strataTerrain(x,z,h){const w=strataWeight(x,z);return w?h*(1-w)+strataBed(x,z)*w:h;}
export function strataWaterLevel(x,z){for(const p of STRATA_POOLS)if(Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz)<1)return p.level;const q=strataRiver(z);return z>=-1460&&z<=-1260&&Math.abs(x-q.x)<18?q.level:null;}
export function strataWaterAt(x,z){if(strataWeight(x,z)<.98)return null;let level=null;for(const p of STRATA_POOLS)if(Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz)<1){level=p.level;break;}const q=strataRiver(z);if(level===null&&z>=-1460&&z<=-1260&&Math.abs(x-q.x)<18)level=q.level;const bed=strataBed(x,z);return level!==null&&bed<level?{level,bed,depth:level-bed,strata:true,fresh:true,salt:0}:null;}
export const strataBandColor=y=>[[174,133,96],[190,157,114],[137,125,112],[202,173,129],[155,136,109],[184,161,135]][((Math.floor(y/12)%6)+6)%6];
export function strataColor(x,z,h){if(strataWeight(x,z)<.2)return null;if(strataWaterAt(x,z))return [112,139,133];return strataBandColor(h);}
export const strataReserved=(x,z)=>strataWeight(x,z)>.001;
export const strataNearTile=(x,z)=>x< -1100&&z< -1140;
export function strataWallZ(x,y){let a=-1384,b=-1370;for(let i=0;i<32;i++){const z=(a+b)/2;if(strataBed(x,z)>y)a=z;else b=z;}return (a+b)/2;}

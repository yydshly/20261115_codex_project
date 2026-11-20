// Authored closed saline basin. Water presets are comparisons, not hydrology simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const SALT={minX:-1890,maxX:-1470,minZ:-140,maxZ:710};
export const SALT_LAKE={x:-1690,z:80,rx:115,rz:95};
export const SALT_MARSH={x:-1690,z:300,rx:100,rz:85};
export const SALT_CRUST={x:-1710,z:480,rx:110,rz:85};
export const SALT_DRY={x:-1630,z:615,rx:100,rz:55};
export const SALT_STAGES=['封闭盆地','盐壳与湿泥','水位与浅洼','耐盐植被与空间'];
export const SALT_SITES=[
 {id:'salt-lake',name:'内流盐湖与退水岸线',terrain:'盐湖',x:-1558,z:55,targetX:-1635,targetZ:80,targetY:24.1},
 {id:'salt-marsh',name:'盐沼浅洼与干湿斑块',terrain:'盐沼',x:-1566,z:295,targetX:-1650,targetZ:295,targetY:23.6},
 {id:'salt-crust',name:'盐壳滩地与多边形裂纹',terrain:'盐壳滩地',x:-1600,z:470,targetX:-1690,targetZ:480,targetY:24.2},
 {id:'salt-dry',name:'干涸湖盆与旧岸阶地',terrain:'干涸湖盆',x:-1580,z:640,targetX:-1630,targetZ:615,targetY:20.3}
].map((r,index)=>({...r,index,saline:true}));
export const saltWeight=(x,z)=>smooth((x+1890)/40)*smooth((-1470-x)/35)*smooth((z+140)/45)*smooth((710-z)/35);
export const saltRadius=(p,x,z)=>Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz);
let waterLevel=24;export const getSaltWaterLevel=()=>waterLevel;export function setSaltWaterLevel(v){waterLevel=v==='low'||v===22?22:24;return waterLevel;}
export function saltGuide(x,z){let best={distance:Infinity,y:26};for(let i=1;i<4;i++){const a=SALT_SITES[i-1],b=SALT_SITES[i],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),distance=Math.hypot(x-a.x-dx*u,z-a.z-dz*u);if(distance<best.distance)best={distance,y:26+(i===3?-3*u:0)};}return best;}
export function saltBed(x,z){let h=31+1.2*Math.sin(x*.025)*Math.cos((z-200)*.02);for(const [kind,p]of [['lake',SALT_LAKE],['marsh',SALT_MARSH],['crust',SALT_CRUST],['dry',SALT_DRY]]){const r=saltRadius(p,x,z);if(r>=1.5)continue;let y;if(kind==='lake')y=r<1?20+4*r*r:24+9*(r-1);else if(kind==='marsh')y=23.2+.62*Math.sin(x*.09)*Math.cos((z-200)*.1)+Math.max(0,r-.75)*6;else if(kind==='crust')y=24+.12*Math.sin(x*.17)*Math.sin((z-200)*.19)+Math.max(0,r-.85)*9;else y=20+5*smooth(r/.95)+2*smooth((r-1.05)/.08)+2*smooth((r-1.25)/.08);const k=1-smooth((r-1.15)/.35);h=h*(1-k)+y*k;}const g=saltGuide(x,z),k=1-smooth((g.distance-3.5)/8);return h*(1-k)+g.y*k;}
export function saltTerrain(x,z,h){const w=saltWeight(x,z);return w?h*(1-w)+saltBed(x,z)*w:h;}
export function saltWaterAt(x,z){if(saltWeight(x,z)<.95)return null;let level;if(saltRadius(SALT_LAKE,x,z)<1.1)level=waterLevel;else if(saltRadius(SALT_MARSH,x,z)<1.2)level=waterLevel-.5;else return null;const bed=saltBed(x,z);return bed<level?{level,bed,depth:level-bed,saline:true,salt:1,fresh:false}:null;}
export function saltHabitat(x,z){if(saltWeight(x,z)<.98)return null;const water=saltWaterAt(x,z),marsh=saltRadius(SALT_MARSH,x,z),lake=saltRadius(SALT_LAKE,x,z),crust=saltRadius(SALT_CRUST,x,z),dry=saltRadius(SALT_DRY,x,z);return {water,marsh,lake,crust,dry,moist:marsh<1.2||lake<1.2,core:crust<.9||dry<.8};}
export function saltColor(x,z){const f=saltHabitat(x,z);if(!f)return null;if(f.water)return [131,157,145];if(f.marsh<1.1)return [129,139,111];if(f.crust<1.15||f.lake<1||f.dry<1.05)return [218,211,182];return [164,155,127];}
export const saltReserved=(x,z)=>saltWeight(x,z)>.001;
export const saltNearTile=(x,z)=>x< -1390&&z> -220&&z<790;

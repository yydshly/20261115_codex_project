// Authored bamboo, monsoon-forest and coastal-dune transect. No ecology or sediment simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const WARM={minX:100,maxX:1250,minZ:660,maxZ:880};
export const WARM_STAGES=['地形骨架','地表与水岸覆盖','植被骨架','完整群落与林下'];
export const WARM_SITES=[
 {id:'warm-bamboo-edge',name:'竹林林缘与坡地',terrain:'竹林林缘',biome:'bamboo',x:175,z:680,targetX:175,targetZ:725,targetY:84,warmPrimary:true},
 {id:'warm-bamboo-inner',name:'竹秆、竹节与林内通道',terrain:'竹林内部',biome:'bamboo',x:320,z:680,targetX:320,targetZ:725,targetY:76},
 {id:'warm-monsoon-dense',name:'季风林湿润冠层样本',terrain:'季风密林',biome:'monsoon',x:480,z:680,targetX:480,targetZ:725,targetY:70,warmPrimary:true},
 {id:'warm-monsoon-open',name:'季风林较干疏林样本',terrain:'季风疏林',biome:'monsoon',x:680,z:680,targetX:680,targetZ:725,targetY:57},
 {id:'warm-dune-front',name:'临海前缘沙丘与海滩',terrain:'前缘沙丘',biome:'dunes',x:1065,z:680,targetX:1165,targetZ:680,targetY:0.2,warmPrimary:true},
 {id:'warm-dune-back',name:'背风沙丘与灌草斑块',terrain:'背风沙丘',biome:'dunes',x:955,z:780,targetX:990,targetZ:735,targetY:12}
].map((r,index)=>({...r,index,warm:true}));
export const warmWeight=(x,z)=>smooth((x-100)/35)*smooth((1250-x)/35)*smooth((z-660)/20)*smooth((880-z)/35)*(1-smooth((z-710)/45)*(1-smooth((Math.abs(x-790)-50)/60)));
export const warmReserved=(x,z)=>warmWeight(x,z)>.001;
export const warmNearTile=(x,z)=>x>20&&x<1330&&z>500&&z<960;
export function warmGuide(x,z){let best={distance:Infinity};for(let i=1;i<6;i++){const a=WARM_SITES[i-1],b=WARM_SITES[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);if(d<best.distance)best={distance:d};}return best;}
export const warmShore=z=>1150+5*Math.sin((z-620)*.025);
export function warmBed(x,z){const h=80-(x-160)*.055+1.1*Math.sin((z-680)*.03)*Math.cos(x*.015);if(x<760)return h;const shore=warmShore(z),d=shore-x;let coast=d<0?d*.10:d*.026+14*Math.exp(-(((x-1070)/27)**2))+7*Math.exp(-(((x-975)/46)**2));if(d>10)coast+=.14*Math.sin(x*.8+z*.12)*Math.sin(z*.24);const blend=smooth((x-760)/120);return h*(1-blend)+coast*blend;}
export function warmTerrain(x,z,h){const w=warmWeight(x,z);return w?h*(1-w)+warmBed(x,z)*w:h;}
export function warmColor(x,z){if(warmWeight(x,z)<.98)return null;if(x<410)return [112,125,72];if(x<590)return [115,108,69];if(x<800)return [148,118,73];const d=warmShore(z)-x;return d<0?[160,158,128]:d<16?[161,148,111]:x>1020?[219,198,145]:[183,172,117];}
export function warmWaterAt(x,z){if(warmWeight(x,z)<.98||warmBed(x,z)>=0)return null;return {level:0,bed:warmBed(x,z),depth:-warmBed(x,z),warm:true,sea:true,salt:1};}
export const warmHash=(i,s)=>{const n=Math.sin(i*127.1+s*57.3)*43758.5453;return n-Math.floor(n);};
let objects;
export function warmObjects(){if(objects)return objects;const bamboo=[],trees=[],grass=[],shrubs=[],litter=[];
 for(let j=0;j<19;j++)for(let i=0;i<35;i++){const id=j*35+i,x=143+i*6.5+warmHash(id,1)*3,z=620+j*10+warmHash(id,2)*4;if(warmGuide(x,z).distance<4||warmWeight(x,z)<.99||x<240&&warmHash(id,3)<.5)continue;for(let k=0;k<3;k++){const a=k*Math.PI*2/3,xk=x+Math.cos(a)*.7,zk=z+Math.sin(a)*.7;if(warmGuide(xk,zk).distance<3.3)continue;bamboo.push({id:id*3+k,x:xk,z:zk,radius:.12+warmHash(id,4)*.06,height:8+warmHash(id,5)*6,rotation:a,biome:'bamboo'});}}
 for(let j=0;j<13;j++)for(let i=0;i<34;i++){const id=j*34+i,x=430+i*9.5+warmHash(id,6)*3,z=620+j*16+warmHash(id,7)*4,dry=x>590;if(warmGuide(x,z).distance<6||warmWeight(x,z)<.99||dry&&warmHash(id,8)<.52)continue;trees.push({id,x,z,radius:.42+warmHash(id,9)*.18,height:dry?11+warmHash(id,10)*5:16+warmHash(id,10)*7,dry,rotation:warmHash(id,11)*6.28,biome:'monsoon'});}
 for(let i=0;i<4200;i++){const x=140+warmHash(i,12)*1020,z=620+warmHash(i,13)*215;if(warmWeight(x,z)<.99||warmGuide(x,z).distance<3.3||warmBed(x,z)<1)continue;const p={x,z,scale:.35+warmHash(i,14)*.8,rotation:warmHash(i,15)*6.28};if(x<800){if(i%2===0)litter.push(p);if(i%4===0)grass.push({...p,kind:x<410?'fern':'forest'});}else{if(x>1130)continue;if(warmHash(i,16)<(x>1030?.18:.65))grass.push({...p,kind:'dune'});if(x<1015&&i%9===0)shrubs.push(p);}}
 objects={bamboo,trees,grass,shrubs,litter};return objects;}
export function warmBlockedAt(x,z){if(!warmReserved(x,z))return false;const o=warmObjects();return o.bamboo.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+.32)||o.trees.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+.32);}

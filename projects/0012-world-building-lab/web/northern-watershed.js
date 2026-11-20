import {borealWeight} from './boreal-layout.js';
import {polarCoastX,polarWeight} from './polar-layout.js';
// Authored northern tributaries. Geometry and boundary states, not a runoff model.
import {fanGuide,fanWaterAt,fanWeight,getFanFlood} from './fan-layout.js';
import {strataGuide,strataWaterAt,strataWeight} from './strata-layout.js';

const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const mix=(a,b,t)=>a+(b-a)*t;
export const NORTH_OUTLET={x:-1077.0875,z:-339.6275,level:2.19,t:.62};
export const NORTH_REACHES=[
 {id:'strata-head',name:'岩层上游集水凹谷',nodes:[[-1230,-1515,34],[-1230,-1488,29],[-1230,-1460,24]],half:3.2,depth:2.8,startFlat:7,endFlat:18},
 {id:'strata-out',name:'阶地出口与西支谷',nodes:[[-1230,-1260,18],[-1240,-1180,17],[-1250,-980,15],[-1270,-810,13],[-1270,-670,11],[-1210,-600,10],[-1100,-570,8]],half:3.8,depth:2.8,startFlat:25,endFlat:5},
 {id:'fan-head',name:'山口上游与物源坡',nodes:[[-820,-1076,72],[-870,-1080,60],[-920,-1060,46],[-940,-1030,40,1]],half:3.5,depth:2.8,startFlat:8,endFlat:18},
 {id:'fan-out',name:'扇尾出口与东支谷',nodes:[[-940,-849,18,1],[-900,-825,18,1],[-875,-760,15],[-875,-655,12],[-955,-600,10],[-1100,-570,8]],half:4.6,depth:3,startFlat:10,endFlat:5},
 {id:'trunk',name:'汇流低谷与中央主河',nodes:[[-1100,-570,8],[-1100,-510,6],[-1073.017210579065,-429.5354125774246,2.19],[-1077.0875,-339.6275,2.19]],half:5,depth:3,startFlat:5,endFlat:0}
];
const segments=[],bins=new Map();
for(const reach of NORTH_REACHES){let before=0;reach.legs=reach.nodes.slice(1).map((n,i)=>{const a=reach.nodes[i],b=n,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),p={a,b,dx,dz,length,before,reach,i};before+=length;segments.push(p);return p;});reach.length=before;}
for(const p of segments)for(let x=Math.floor((Math.min(p.a[0],p.b[0])-125)/32);x<=Math.floor((Math.max(p.a[0],p.b[0])+125)/32);x++)for(let z=Math.floor((Math.min(p.a[1],p.b[1])-125)/32);z<=Math.floor((Math.max(p.a[1],p.b[1])+125)/32);z++){const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(p);}
function sampleLeg(p,u){const reach=p.reach,begin=p.i===0?reach.startFlat/p.length:.03,end=p.i===reach.legs.length-1?1-reach.endFlat/p.length:.97,v=clamp((u-begin)/Math.max(.01,end-begin)),flood=getFanFlood()?1.1:0;return {x:mix(p.a[0],p.b[0],u),z:mix(p.a[1],p.b[1],u),level:mix(p.a[2]+(p.a[3]||0)*flood,p.b[2]+(p.b[3]||0)*flood,v),groundLevel:mix(p.a[2],p.b[2],v),half:reach.half,depth:reach.depth,nx:-p.dz/p.length,nz:p.dx/p.length,t:(p.before+u*p.length)/reach.length,reach:reach.id};}
export function northSample(id,t){const reach=NORTH_REACHES.find(r=>r.id===id);let d=clamp(t)*reach.length;for(const p of reach.legs){if(d<=p.length||p===reach.legs.at(-1))return sampleLeg(p,clamp(d/p.length));d-=p.length;}}
export function northField(x,z){let best=null;for(const p of bins.get(Math.floor(x/32)+','+Math.floor(z/32))||[]){const u=clamp(((x-p.a[0])*p.dx+(z-p.a[1])*p.dz)/(p.length*p.length)),distance=Math.hypot(x-p.a[0]-p.dx*u,z-p.a[1]-p.dz*u);if(distance>125||best&&distance>=best.distance)continue;best={...sampleLeg(p,u),distance};}return best;}
function clearance(x,z){
 const coastal=1-smooth(polarWeight(x,z)/.36)*(1-smooth((x-polarCoastX(z))/42));
 return coastal*(1-borealWeight(x,z))*Math.min(smooth((fanGuide(x,z).distance-7)/8),smooth((strataGuide(x,z).distance-7)/8));
}
export function northWeight(x,z,f=northField(x,z)){
 if(!f)return 0;
 const exposed=f.reach==='fan-head'&&x> -865&&z< -1040?
   smooth((x+865)/100)*(1-smooth((z+1120)/80))*smooth((f.distance-14)/36):0;
 return (1-smooth((f.distance-45)/75))*clearance(x,z)*(1-exposed);
}
export function northTerrain(x,z,h,central=null){
 const f=northField(x,z),w=northWeight(x,z,f);
 if(!w)return h;
 const fan=smooth((fanWeight(x,z)-.82)/.16),strata=smooth((strataWeight(x,z)-.82)/.16);
 // Fade the overlap on the apron, keeping the original watercourses and their beds.
 const fanCore=fan*smooth((z+1030)/14)*smooth((-849-z)/14);
 const strataCore=strata*smooth((z+1460)/14)*smooth((-1260-z)/14);
 const blend=w*(1-Math.max(fanCore,strataCore));
 const d=f.distance,target=f.groundLevel+2.2+Math.min(18,d*.24)+.55*Math.sin(x*.036)*Math.sin(z*.021);
 let shaped=mix(h,target,blend);
 if(d<f.half+8){
  const r=d/f.half,bed=r<1?f.groundLevel-f.depth*(1-r*r):f.groundLevel+2.2*smooth((d-f.half)/8);
  shaped=mix(shaped,bed,(1-smooth((d-f.half-4)/4))*blend);
 }
 const fanBed=fan*smooth((z+1056)/14)*smooth((-828-z)/14);
 if(strataWaterAt(x,z)||central&&central.normalized<3)return Math.min(h,shaped);
 return mix(shaped,Math.min(h,shaped),fanBed);
}
export function northWaterAt(x,z){const f=northField(x,z);if(!f||f.distance>=f.half||northWeight(x,z,f)<.99||fanWaterAt(x,z)||strataWaterAt(x,z))return null;const depth=f.depth*(1-(f.distance/f.half)**2);return {...f,depth:depth+f.level-f.groundLevel,bed:f.groundLevel-depth,fresh:true,salt:0,northern:true};}
export function northColor(x,z,rgb){const f=northField(x,z),w=northWeight(x,z,f);if(!w)return rgb;const c=f.distance<f.half?[121,141,133]:f.distance<f.half+9?[159,151,124]:f.level>35?[154,153,119]:[124,145,94];return rgb.map((v,i)=>Math.round(mix(v,c[i],w)));}
export const northReserved=(x,z)=>northWeight(x,z)>.01;
export const northNearTile=(x,z)=>x>-1400&&x< -700&&z< -200;

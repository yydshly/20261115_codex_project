import {fanWeight} from './fan-layout.js';
// Authored cool-forest communities, not a climate or ecological succession simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const BOREAL={minX:-1210,maxX:-930,minZ:-800,maxZ:-660};
export const BOREAL_STAGES=['缓坡与微地形','落叶与腐殖覆盖','乔木与林冠','林下与倒木空间'];
export const BOREAL_SITES=[
 {id:'boreal-conifer',name:'针叶林与分层尖冠',terrain:'针叶林',x:-1165,z:-687,floor:64,targetX:-1165,targetZ:-735,targetY:72},
 {id:'boreal-mixed',name:'针阔混交与交叠林冠',terrain:'针阔混交林',x:-1100,z:-687,floor:60,targetX:-1100,targetZ:-735,targetY:68},
 {id:'boreal-birch',name:'白桦疏林与透光空隙',terrain:'白桦疏林',x:-1035,z:-687,floor:56,targetX:-1035,targetZ:-735,targetY:64},
 {id:'boreal-deadwood',name:'倒木、苔藓与更新空地',terrain:'倒木苔藓林地',x:-970,z:-687,floor:52,targetX:-970,targetZ:-735,targetY:54}
].map((r,index)=>({...r,index,boreal:true}));
export const borealWeight=(x,z)=>smooth((x+1210)/22)*smooth((-930-x)/22)*smooth((z+800)/20)*smooth((-660-z)/12);
export function borealSlopeWeight(x,z){
 const dx=x+1070,dz=z+730;
 if(Math.abs(dx)>225||Math.abs(dz)>162)return 0;
 const side=Math.max(0,Math.abs(dx)-103)/122;
 const fall=Math.max(0,Math.abs(dz-9*Math.sin(dx*.021))-38)/115;
 return 1-smooth(Math.hypot(side,fall));
}
function forestEdge(x,z){
 if(x< -1250||x> -910||z< -854||z> -628)return 0;
 const cover=borealSlopeWeight(x,z)*(1-fanWeight(x,z));
 return cover*smooth((x+1250)/40)*smooth((-910-x)/47)*smooth((z+854)/39)*smooth((-628-z)/44);
}
export function borealGuide(x,z){const u=clamp((x+1165)/195),px=-1165+195*u;return {distance:Math.hypot(x-px,z+687),y:64-12*u};}
export function borealBed(x,z){let h=64-(x+1165)*12/195+1.1*Math.sin((z+687)*.055)*Math.cos(x*.025);const g=borealGuide(x,z),k=1-smooth((g.distance-2)/4);return h*(1-k)+g.y*k;}
export function borealTerrain(x,z,h){
 const slope=borealSlopeWeight(x,z);
 if(!slope)return h;
 const w=slope*(1-smooth((fanWeight(x,z)-.10)/.55));
 return h+(borealBed(x,z)-h)*w;
}
const forestSoils=[[101,102,73],[115,109,75],[138,124,86],[95,114,72]];
export function borealColor(x,z){
 const position=clamp((x+1170)/210)*3,index=Math.min(2,Math.floor(position)),weight=smooth(position-index);
 return forestSoils[index].map((v,i)=>v+(forestSoils[index+1][i]-v)*weight);
}
export const borealReserved=(x,z)=>borealWeight(x,z)>.001||forestEdge(x,z)>.50;
export const borealNearTile=(x,z)=>x>-1370&&x<-770&&z>-960&&z<-500;
export const borealHash=(i,s)=>{const n=Math.sin(i*127.1+s*57.3)*43758.5453;return n-Math.floor(n);};
let cached;
export function borealObjects(){if(cached)return cached;const trees=[],logs=[];
 // A jittered lattice keeps crowns varied while retaining a continuous, clear walking lane.
 for(let j=0;j<10;j++)for(let i=0;i<30;i++){const id=j*30+i,x=-1190+i*8.1+borealHash(id,1)*3,z=-780+j*9.2+borealHash(id,2)*3;if(borealWeight(x,z)<.99||borealGuide(x,z).distance<5.5)continue;const zone=Math.min(3,Math.max(0,Math.floor((x+1190)/65))),r=borealHash(id,3);if(zone===2&&r<.45||zone===3&&r<.75)continue;const type=zone===0?'conifer':zone===1?(r<.55?'conifer':'birch'):'birch';trees.push({id,x,z,type,zone,height:type==='conifer'?13+borealHash(id,4)*8:11+borealHash(id,4)*6,radius:type==='conifer'?.38:.25,rotation:borealHash(id,5)*Math.PI*2});}
 for(let row=0;row<18;row++)for(let col=0;col<26;col++){
  const id=300+row*26+col,x=-1250+col*13.2+borealHash(id,1)*8,z=-854+row*13+borealHash(id,2)*8;
  const cover=forestEdge(x,z),chance=borealHash(id,3);
  if(cover<.20||chance>.64*cover||borealWeight(x,z)>.94||borealGuide(x,z).distance<6)continue;
  if(trees.some(p=>Math.hypot(p.x-x,p.z-z)<6))continue;
  const type=x< -1050||borealHash(id,8)<.52?'conifer':'birch';
  trees.push({id,x,z,type,zone:-1,height:4.8+cover*(5+5*borealHash(id,4)),
    radius:.23,rotation:borealHash(id,5)*Math.PI*2});
 }
 for(let i=0;i<9;i++){const x=-1001+(i%3)*18,z=-769+Math.floor(i/3)*24,length=8+borealHash(i,8)*4,angle=.6+borealHash(i,9)*1.7;logs.push({id:i,x,z,length,angle,radius:.42+borealHash(i,10)*.18});}
 cached={trees,logs};return cached;}
export function borealBlockedAt(x,z){if(x< -1252||x> -908||z< -856||z> -626)return false;const {trees,logs}=borealObjects();if(trees.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+.32))return true;return logs.some(p=>{const dx=x-p.x,dz=z-p.z,t=clamp((dx*Math.cos(p.angle)+dz*Math.sin(p.angle))/p.length+.5),px=p.x+(t-.5)*p.length*Math.cos(p.angle),pz=p.z+(t-.5)*p.length*Math.sin(p.angle);return Math.hypot(x-px,z-pz)<p.radius+.32;});}

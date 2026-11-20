// Authored deposition and braided-water comparison. No sediment transport simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const FAN={minX:-1110,maxX:-750,minZ:-1070,maxZ:-810,x:-940,start:-1030,end:-850};
export const FAN_STAGES=['山口与扇面','沉积与沙砾洲','分汊与涨水','洪泛地与植被'];
export const FAN_SITES=[
 {id:'fan-apex',name:'山口与放射状冲积扇',terrain:'冲积扇',x:-990,z:-1010,floor:46,targetX:-940,targetZ:-1005,targetY:39},
 {id:'fan-braid',name:'分流再汇合的辫状水道',terrain:'辫状河道',x:-1030,z:-950,floor:42,targetX:-974,targetZ:-950,targetY:30.3},
 {id:'fan-bar',name:'水道之间的沙砾洲',terrain:'沙砾洲',x:-1015,z:-900,floor:29,targetX:-955,targetZ:-910,targetY:26},
 {id:'fan-flood',name:'低平洪泛地与季节涨水参考',terrain:'季节性洪泛地',x:-1020,z:-860,floor:24,targetX:-940,targetZ:-864,targetY:20.4}
].map((r,index)=>({...r,index,fan:true}));
export const FAN_BARS=[{x:-956,z:-910,rx:11,rz:19},{x:-923,z:-949,rx:10,rz:17}];
export const fanWeight=(x,z)=>smooth((x+1110)/30)*smooth((-750-x)/30)*smooth((z+1070)/25)*smooth((-810-z)/25);
let flood=false;export const getFanFlood=()=>flood;export function setFanFlood(v){flood=v===true||v==='high';return flood;}
export function fanProfile(z){const t=clamp((z+1030)/180),u=clamp((t-.12)/.78),spread=Math.sin(Math.PI*u)*34,center=-940+3*Math.sin(t*8)*Math.sin(Math.PI*t);return {t,z,level:40-22*t,half:3+1.5*t,width:15+85*t,channels:[center,center-spread,center+spread]};}
export function fanGuide(x,z){let best={distance:Infinity,y:46};for(let i=1;i<4;i++){const a=FAN_SITES[i-1],b=FAN_SITES[i],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),distance=Math.hypot(x-a.x-dx*u,z-a.z-dz*u);if(distance<best.distance)best={distance,y:a.floor+(b.floor-a.floor)*u};}return best;}
export function fanBed(x,z){
 const p=fanProfile(z),lateral=Math.abs(x+940),outside=smooth((lateral-p.width)/22);
 let h=p.level+2.4+outside*7;
 const distance=Math.min(...p.channels.map(cx=>Math.abs(x-cx)));
 const spread=Math.hypot(distance,Math.max(0,-1030-z));
 const fanEdge=(1-smooth((lateral-p.width-6)/24))*smooth((z+1048)/6)*smooth((-842-z)/8);
 const channel=p.level-1.8+4.2*smooth((spread-p.half)/10);
 h+=(Math.min(h,channel)-h)*fanEdge;
 for(const b of FAN_BARS){
  const r=Math.hypot((x-b.x)/b.rx,(z-b.z)/b.rz);
  if(r<1.3){
   const target=p.level+.55+.8*Math.min(1,r*r),k=1-smooth((r-.9)/.4);
   h+=(target-h)*k;
  }
 }
 const plain=smooth((z+893)/12)*smooth((-842-z)/8)*(1-smooth((lateral-80)/16));
 h+=(p.level+.55+.42*Math.sin(x*.2)*Math.cos(z*.22)-h)*plain;
 const branch=(1-smooth((distance-p.half-3)/2))*smooth((-842-z)/8);
 h+=(Math.min(h,p.level-1.8+2.5*smooth((distance-p.half)/5))-h)*plain*branch;
 const banks=(1-smooth((spread-p.half)/5))*smooth((z+1034)/4)*smooth((-842-z)/8);
 h+=(Math.min(h,channel)-h)*banks;
 const endR=Math.hypot((x+940)/11,(z+849)/7);
 if(endR<1.5){
  const target=18-1.8*Math.max(0,1-endR*endR)+4*Math.max(0,endR-1),k=1-smooth((endR-1)/.5);
  h+=(Math.min(h,target)-h)*k;
 }
 if(z>-849)h+=3*smooth((z+849)/8);
 const g=fanGuide(x,z),k=1-smooth((g.distance-3.5)/8);
 return h*(1-k)+g.y*k;
}
export function fanTerrain(x,z,h){const w=fanWeight(x,z);return w?h*(1-w)+fanBed(x,z)*w:h;}
export function fanWaterLevel(x,z){const p=fanProfile(z);return z>=-1042&&z<=-842&&Math.abs(x+940)<p.width+6?p.level+(flood?1.1:0):null;}
export function fanWaterAt(x,z){if(fanWeight(x,z)<.98)return null;const level=fanWaterLevel(x,z),bed=fanBed(x,z);return level!==null&&bed<level?{level,bed,depth:level-bed,fan:true,fresh:true,salt:0}:null;}
export function fanColor(x,z){if(fanWeight(x,z)<.2)return null;if(fanWaterAt(x,z))return [129,153,145];const p=fanProfile(z),r=Math.min(...FAN_BARS.map(b=>Math.hypot((x-b.x)/b.rx,(z-b.z)/b.rz)));return r<1.2?[188,173,136]:p.t>.78?[139,155,105]:p.t<.3?[160,150,129]:[181,169,137];}
export const fanReserved=(x,z)=>fanWeight(x,z)>.001;
export const fanNearTile=(x,z)=>x> -1190&&x< -670&&z> -1150&&z< -730;

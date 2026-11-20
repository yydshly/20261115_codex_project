// Authored moisture gradient in a compact district, not climate or groundwater simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const DRYLAND={minX:-570,maxX:450,minZ:900,maxZ:1550};
export const OASIS={x:315,z:1370,rx:38,rz:28,level:12,depth:4};
export const DRYLAND_STAGES=['地形骨架','地表与砾石','水源与干湿','植被与空间'];
export const DRYLAND_SITES=[
 {id:'dryland-grass',name:'连续草原与开敞地平线',terrain:'连续草原',x:-420,z:1000,floor:34,targetX:-455,targetZ:1040},
 {id:'dryland-edge',name:'林草过渡与疏林',terrain:'林草过渡',x:-280,z:1070,floor:34,targetX:-310,targetZ:1110},
 {id:'dryland-gobi',name:'戈壁砾地与裸露地表',terrain:'戈壁砾地',x:-100,z:1150,floor:30,targetX:-65,targetZ:1190},
 {id:'dryland-valley',name:'干谷沟床与侵蚀岸坡',terrain:'干谷',x:100,z:1230,floor:38,targetX:120,targetZ:1290},
 {id:'dryland-oasis',name:'泉池绿洲与湿润岸带',terrain:'绿洲',x:260,z:1350,floor:16,targetX:310,targetZ:1370}
].map((r,index)=>({...r,index,dryland:true}));
export const drylandWeight=(x,z)=>smooth((x+570)/60)*smooth((450-x)/60)*smooth((z-900)/55)*smooth((1550-z)/50);
export function dryValleyField(x,z){const ax=-70,az=1190,dx=385,dz=180,t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz));return {t,x:ax+dx*t,z:az+dz*t,distance:Math.hypot(x-ax-dx*t,z-az-dz*t),floor:25-13*t,half:7+6*t};}
export function drylandGuide(x,z){let best={distance:Infinity,y:0};for(let i=1;i<DRYLAND_SITES.length;i++){const a=DRYLAND_SITES[i-1],b=DRYLAND_SITES[i],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),distance=Math.hypot(x-a.x-dx*u,z-a.z-dz*u);if(distance<best.distance)best={distance,y:a.floor+(b.floor-a.floor)*u};}return best;}
export function oasisField(x,z){return Math.hypot((x-OASIS.x)/OASIS.rx,(z-OASIS.z)/OASIS.rz);}
export function drylandTerrain(x,z,h){const w=drylandWeight(x,z);if(!w)return h;let target=29+4*Math.sin(x*.011)*Math.cos(z*.012)+2*Math.sin(z*.025),q=dryValleyField(x,z),k=1-smooth((q.distance-q.half)/24);if(k>0)target=target*(1-k)+q.floor*k;const r=oasisField(x,z);if(r<2.2){const floor=r<1?OASIS.level-OASIS.depth*Math.pow(1-r*r,1.2):OASIS.level+(r-1)*4;const b=1-smooth((r-1.6)/.6);target=target*(1-b)+floor*b;}const path=drylandGuide(x,z),g=1-smooth((path.distance-3.5)/10);target=target*(1-g)+path.y*g;return h*(1-w)+target*w;}
export function drylandWaterAt(x,z){return drylandWeight(x,z)>.5&&oasisField(x,z)<1?{...OASIS,dryland:true,fresh:true,salt:0}:null;}
export function drylandHabitat(x,z){if(drylandWeight(x,z)<.8)return null;const r=oasisField(x,z),oasis=1-smooth((r-1)/1.7),dry=smooth((x+350)/300),moisture=Math.max(.62*(1-dry)+.07*dry,oasis*.95);return {moisture,dry,oasis,r,water:r<1,woodland:x< -180&&x> -370&&z>1010&&z<1190};}
export function drylandColor(x,z,h){
 const f=drylandHabitat(x,z);
 if(!f)return null;
 if(f.water)return [103,130,112];
 const grass=[133,153,87], gravel=[172,154,115], wet=[111,143,77], silt=[167,143,102];
 const cover=smooth((f.dry-.12)/.69), damp=smooth((f.oasis-.06)/.86);
 const bank=1-smooth((dryValleyField(x,z).distance-15)/18);
 const grain=Math.sin(x*.35+z*.18)*5;
 return grass.map((g,i)=>{
  const soil=g+(gravel[i]-g)*cover;
  const valley=soil+(silt[i]-soil)*bank;
  return valley+(wet[i]-valley)*damp+grain;
 });
}
export const drylandReserved=(x,z)=>drylandWeight(x,z)>.001;
export const drylandNearTile=(x,z)=>x> -650&&x<530&&z>820;

// A held discovery, two approaches, a shared threshold, a look back, then release.
export const PORTAL_DURATION=46;
export const GATE={source:-5.5,destination:7.5,translation:13};
const clamp=x=>Math.max(0,Math.min(1,x));
const s=x=>{x=clamp(x);return x*x*(3-2*x);};
const r=(t,a,b)=>s((t-a)/(b-a));
const mix=(a,b,u)=>a+(b-a)*u;
const vec=(a,b,u)=>a.map((v,i)=>mix(v,b[i],u));
export function portalCamera(p,aspect){
 const position=[...p.camera],target=[...p.target];let fov=p.fov;
 if(aspect<.85){
  const tight=1-r(p.t,29,31)+r(p.t,36,39);
  position[0]=mix(position[0],p.position[0]+(position[0]-p.position[0])*.36,tight);
  target[0]=mix(target[0],p.position[0],tight*.65);target[2]=mix(target[2],p.position[2]-2.2,tight*.8);
  target[2]=mix(target[2],p.position[2]+2*p.lookBack,r(p.t,29,31)*(1-r(p.t,35,38)));
  position[2]=mix(position[2],Math.max(position[2],p.position[2]+8.5),r(p.t,36,39));
  position[0]+=(position[0]-target[0])*.7*p.lookBack;fov+=16+8*p.lookBack+12*r(p.t,29,31)*(1-r(p.t,37,40));
  fov=2*Math.atan(Math.tan(fov*Math.PI/360)*Math.max(1,.54/aspect))*180/Math.PI;
 }
 return{position,target,fov};
}
export function samplePortal(seconds){
 const t=Math.max(0,Math.min(PORTAL_DURATION,seconds)),first=r(t,.7,4.2),approach=r(t,9,16),cross=r(t,18.5,29),last=r(t,37,41);
 const z=3-1.2*first-6*approach-12*cross-2*last,x=.8*(1-first)+last;
 const distance=Math.hypot(.8,1.2)*first+6*approach+12*cross+Math.hypot(1,2)*last;
 const moving=(a,b)=>t>a&&t<b?r(t,a,a+.7)*(1-r(t,b-.7,b)):0;
 const walk=Math.max(moving(.7,4.2),moving(9,16),moving(18.5,29),moving(37,41));
 const lookBack=r(t,30.5,33.5)*(1-r(t,35,37));
 const yaw=Math.PI+.36*(1-first)-2.7*lookBack-.5*last;
 let camera=[mix(5.5,3.5,r(t,2,9)),mix(3.05,2.75,r(t,3,10)),z+7.2];
 let target=[mix(.1,0,r(t,3,8)),mix(1.65,2,r(t,4,9)),z-4];
 camera=vec(camera,[.24,2.8,z+6.4],r(t,11,21));
 target=vec(target,[0,1.9,z-3],r(t,11,21));
 // All camera movement remains in the same mapped coordinate system.
 camera=vec(camera,[12,5.2,-16.2],r(t,30,35));
 target=vec(target,[0,2,-11.5],r(t,30,35));
 target[1]-=Math.sin(Math.PI*r(t,30,35))*1.2;
 camera=vec(camera,[6.5,5.8,-7.3],r(t,36,45));
 target=vec(target,[.8,2,-24],r(t,36,45));
 const destinationCamera=camera.map((v,i)=>i===2?v+GATE.translation:v),destinationTarget=target.map((v,i)=>i===2?v+GATE.translation:v);
 const world=camera[2]>GATE.source?'a':'b';
 const opening=r(t,4.5,10),reach=r(t,14.8,16.3)*(1-r(t,18.3,20));
 const stage=t<4.5?'passing':t<9?'discover':t<16?'approach':t<18.5?'listen':t<27?'cross':t<30.5?'arrive':t<37?'look-back':'release';
 return{id:'portal',t,position:[x,0,z],yaw,distance,walk,reach,camera,target,destinationCamera,destinationTarget,destinationPosition:[x,0,z+13],fov:44,world,blend:opening,opening,stage,lookBack,
  lookYaw:Math.sin(t*.65)*.08*(1-walk)-.4*r(t,4.5,7)*(1-r(t,9,12))-.3*lookBack,lookPitch:-.13*r(t,4.5,8)*(1-r(t,12,16)),umbrellaTilt:.15*r(t,5,9)+.17*r(t,21,28),gust:r(t,18,28),bodyLean:reach*.04};
}

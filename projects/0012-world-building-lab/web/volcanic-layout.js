// Authored secondary volcanic crater and cooled basalt. No eruption or heat simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const VOLCANIC={minX:1180,maxX:1450,minZ:-200,maxZ:400};
export const LAVA_CRATER={x:1300,z:-90,rx:65,rz:55,level:90};
export const VOLCANIC_STAGES=['火口与地形','熔岩覆盖与玄武岩','熔流与冷却形态','完整火山环境'];
export const VOLCANIC_SITES=[
 {id:'volcanic-crater',name:'次级火口与内壁',terrain:'火山口',x:1255,z:-70,floor:108,targetX:1300,targetZ:-90,targetY:90.15},
 {id:'volcanic-channel',name:'有床底的熔岩流槽',terrain:'熔岩流槽',x:1220,z:80,floor:85,targetX:1307,targetZ:80,targetY:65.2},
 {id:'volcanic-basalt',name:'冷却熔岩与玄武岩台地',terrain:'玄武岩台地',x:1250,z:210,floor:55,targetX:1300,targetZ:232,targetY:44},
 {id:'volcanic-columns',name:'六边形柱状节理岩群',terrain:'柱状节理',x:1280,z:330,floor:35,targetX:1385,targetZ:290,targetY:50}
].map((r,index)=>({...r,index,volcanic:true}));
export const volcanicWeight=(x,z)=>smooth((x-1180)/30)*smooth((1450-x)/25)*smooth((z+200)/30)*smooth((400-z)/30);
export function volcanicGuide(x,z){let best={distance:Infinity,y:108};for(let i=1;i<4;i++){const a=VOLCANIC_SITES[i-1],b=VOLCANIC_SITES[i],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),distance=Math.hypot(x-a.x-dx*u,z-a.z-dz*u);if(distance<best.distance)best={distance,y:a.floor+(b.floor-a.floor)*u};}return best;}
export function lavaProfile(z){const t=clamp((z+45)/250);return {x:1300+8*Math.sin(Math.PI*t),z,level:90-50*t,half:5+3*t,t};}
export function volcanicBed(x,z){let h=82-.16*(z+60),r=Math.hypot((x-1300)/65,(z+90)/55);if(r<1.8){const crater=82+40*smooth((r-.4)/.65)-Math.max(0,r-1.1)*20,k=1-smooth((r-1.25)/.55);h=h*(1-k)+crater*k;}if(z> -90&&z<220){const p=lavaProfile(z),d=Math.hypot(x-p.x,z>205?z-205:0);if(d<p.half+15){const target=p.level-2+6*smooth((d-p.half)/12),k=1-smooth((d-p.half-10)/5);h=h*(1-k)+Math.min(h,target)*k;}}const q=Math.hypot((x-1320)/75,(z-235)/60);if(q<1.4){const target=43+.45*Math.sin(x*.7+z*.3)+.25*Math.cos(z*.5),k=1-smooth((q-.8)/.6);h=h*(1-k)+target*k;}if(z>=-45&&z<=220){const p=lavaProfile(z),d=Math.hypot(x-p.x,Math.max(0,z-205));if(d<p.half+5){const k=1-smooth((d-p.half)/5),target=p.level-2+4*smooth((d-p.half)/5);h=h*(1-k)+Math.min(h,target)*k;}}const g=volcanicGuide(x,z),k=1-smooth((g.distance-3.2)/7);return h*(1-k)+g.y*k;}
export function volcanicTerrain(x,z,h){
 if(x<1080||x>1560||z< -315||z>440)return h;
 const spine=1300+23*Math.sin((z+150)*.008);
 const skirt=smooth((x-1080)/135)*smooth((1560-x)/143)*smooth((z+315)/138)*smooth((440-z)/99);
 const foot=26+50*Math.exp(-(((x-spine)/128)**2)) - .07*z+2*Math.sin(x*.033+z*.026);
 const ground=h+(Math.max(h,foot)-h)*skirt;
 const w=volcanicWeight(x,z);
 return w?ground+(volcanicBed(x,z)-ground)*w:ground;
}
export function lavaLevel(x,z){const r=Math.hypot((x-1300)/65,(z+90)/55);if(r<.8)return 90;const p=lavaProfile(z);return z>=-90&&z<=220&&Math.abs(x-p.x)<p.half+12?p.level:null;}
export function lavaAt(x,z){if(volcanicWeight(x,z)<.98)return null;const level=lavaLevel(x,z),bed=volcanicBed(x,z);return level!==null&&bed<level?{level,bed,depth:level-bed,lava:true}:null;}
export const volcanicBlockedAt=(x,z)=>!!lavaAt(x,z);
export function volcanicColor(x,z){if(volcanicWeight(x,z)<.2)return null;if(lavaAt(x,z))return [88,62,47];return z<10?[113,102,88]:z<190?[78,77,71]:[76,82,78];}
export const volcanicReserved=(x,z)=>volcanicWeight(x,z)>.001;
export const volcanicNearTile=(x,z)=>x>1100&&x<1530&&z>-280&&z<480;
export function volcanicColumns(){const out=[];for(let row=-4;row<=4;row++)for(let col=-5;col<=5;col++){if((col/5.3)**2+(row/4.6)**2>1)continue;const x=1385+Math.sqrt(3)*3*(col+(row%2)*.5),z=290+4.5*row,height=24+7*Math.sin(col*.6+row*.8)+4*Math.cos(row*.7);out.push({x,z,height,radius:2.95});}return out;}

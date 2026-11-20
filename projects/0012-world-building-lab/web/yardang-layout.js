// Authored wind-eroded relief. No wind erosion or sediment transport simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const YARDANG={minX:650,maxX:1080,minZ:1220,maxZ:1515};
export const YARDANG_STAGES=['残丘与通槽','岩面与颗粒','干燥与风向参考','稀疏植被与空间'];
export const YARDANG_SITES=[
 {id:'yardang-ridges',name:'沿同一方向延伸的雅丹残丘',terrain:'风蚀雅丹',x:690,z:1280,floor:43,targetX:724,targetZ:1280,targetY:54},
 {id:'yardang-slot',name:'两侧岩壁夹出的风蚀槽',terrain:'风蚀槽',x:810,z:1340,floor:32,targetX:850,targetZ:1340,targetY:36},
 {id:'yardang-stony',name:'裸岩与块石形成的荒漠石漠',terrain:'荒漠石漠',x:930,z:1415,floor:27,targetX:972,targetZ:1410,targetY:31},
 {id:'yardang-gravel',name:'平缓砾石台面与陡边',terrain:'砾石台地',x:1030,z:1450,floor:39,targetX:994,targetZ:1475,targetY:40}
].map((r,index)=>({...r,index,yardang:true}));
export const YARDANG_RIDGES=[{x:740,z:1288,length:50,width:20,height:27},{x:850,z:1280,length:55,width:16,height:23},{x:815,z:1324,length:65,width:20,height:31},{x:815,z:1356,length:65,width:20,height:29},{x:930,z:1304,length:48,width:17,height:25},{x:990,z:1365,length:43,width:15,height:20}];
export const YARDANG_LEGS=[
 [YARDANG_SITES[0],{x:700,z:1250,floor:43},{x:725,z:1250,floor:43},{x:725,z:1340,floor:32},YARDANG_SITES[1]],
 [YARDANG_SITES[1],{x:900,z:1340,floor:32},{x:930,z:1375,floor:29},YARDANG_SITES[2]],
 [YARDANG_SITES[2],{x:1000,z:1415,floor:33},YARDANG_SITES[3]]
];
export const yardangWeight=(x,z)=>smooth((x-650)/30)*smooth((1080-x)/30)*smooth((z-1220)/25)*smooth((1515-z)/25);
export function yardangGuide(x,z){let best={distance:Infinity,y:43};for(const points of YARDANG_LEGS)for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),distance=Math.hypot(x-a.x-dx*u,z-a.z-dz*u);if(distance<best.distance)best={distance,y:a.floor+(b.floor-a.floor)*u};}return best;}
export function yardangRelief(x,z){let h=0;for(const r of YARDANG_RIDGES){const u=(x-r.x)/r.length,taper=.65-.25*Math.max(-1,Math.min(1,u)),v=(z-r.z)/(r.width*taper),n=Math.hypot(u,v);if(n<1)h=Math.max(h,r.height*(1-smooth((n-.15)/.85)));}return h;}
export function yardangBed(x,z){let h=27+.014*(1030-x)+.18*Math.sin(z*.06)+yardangRelief(x,z);const slot=smooth((x-745)/15)*(1-smooth((x-910)/20))*(1-smooth((Math.abs(z-1340)-2.4)/5.6));h=h*(1-slot)+Math.min(h,32)*slot;const r=Math.hypot((x-1010)/58,(z-1470)/37),terrace=1-smooth((r-.8)/.3);h=h*(1-terrace)+(39+.12*Math.sin(x*.24)*Math.cos(z*.23))*terrace;const g=yardangGuide(x,z),k=1-smooth((g.distance-3.3)/7);return h*(1-k)+g.y*k;}
export function yardangTerrain(x,z,h){const w=yardangWeight(x,z);return w?h*(1-w)+yardangBed(x,z)*w:h;}
export function yardangColor(x,z,h){if(yardangWeight(x,z)<.2)return null;const ridge=yardangRelief(x,z);if(ridge>3)return [[174,145,110],[193,164,122],[149,132,110]][((Math.floor(h/5)%3)+3)%3];if(z>1430)return [168,158,135];if(z>1380)return [147,143,130];return [184,165,131];}
export const yardangReserved=(x,z)=>yardangWeight(x,z)>.001;
export const yardangNearTile=(x,z)=>x>570&&x<1160&&z>1140;

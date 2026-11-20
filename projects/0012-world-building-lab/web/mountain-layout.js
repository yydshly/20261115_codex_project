// Authored alpine district and transport geometry, in metres. No geological/rope physics simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const MOUNTAIN_STAGES=['山体骨架','岩土与雪线','道路与索道','完整高山场景'];
export const MOUNTAIN_SITES=[
 {id:'mountain-village',name:'青岚山脚村',terrain:'山脚村落',x:900,z:-710,y:68,targetX:953,targetZ:-748,targetY:89},
 {id:'mountain-road',name:'盘山登山路',terrain:'登山道路',x:1010,z:-800,y:112,targetX:1065,targetZ:-835,targetY:136},
 {id:'mountain-bridge',name:'断岩峡谷吊桥',terrain:'峡谷吊桥',x:1118,z:-879,y:146.3,targetX:1159,targetZ:-905,targetY:153},
 {id:'mountain-lower',name:'云阶索道下站',terrain:'索道下站',x:1220,z:-950,y:190,targetX:1460,targetZ:-1140,targetY:474},
 {id:'mountain-upper',name:'云阶索道上站',terrain:'索道上站',x:1460,z:-1140,y:470,targetX:1220,targetZ:-950,targetY:192},
 {id:'mountain-ridge',name:'风口山脊',terrain:'高山山脊',x:1560,z:-1270,y:600,targetX:1650,targetZ:-1400,targetY:739},
 {id:'mountain-peak',name:'青岚主峰',terrain:'高峰',x:1650,z:-1400,y:738,targetX:1300,targetZ:-1050,targetY:350}
].map((p,index)=>({...p,index,mountain:true}));
const P=(x,z,y)=>({x,z,y});
export const MOUNTAIN_LEGS=[
 [MOUNTAIN_SITES[0],P(962,-710,80),P(942,-758,93),MOUNTAIN_SITES[1]],
 [MOUNTAIN_SITES[1],P(1058,-815,130),P(1080,-855,142),MOUNTAIN_SITES[2]],
 [MOUNTAIN_SITES[2],P(1160,-905,151),P(1190,-920,162),P(1155,-965,176),MOUNTAIN_SITES[3]],
 [MOUNTAIN_SITES[3],MOUNTAIN_SITES[4]],
 [MOUNTAIN_SITES[4],P(1450,-1146,470),P(1405,-1170,487),P(1480,-1195,511),P(1435,-1230,530),P(1530,-1240,559),P(1495,-1280,577),MOUNTAIN_SITES[5]],
 [MOUNTAIN_SITES[5],P(1505,-1320,624),P(1600,-1335,653),P(1560,-1375,673),P(1660,-1380,704),P(1610,-1425,724),MOUNTAIN_SITES[6]]
];
export function linePoint(points,t){const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));let d=clamp(t)*lengths.reduce((s,v)=>s+v,0);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const u=lengths[i]?clamp(d/lengths[i]):0,a=points[i],b=points[i+1];return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,y:a.y+(b.y-a.y)*u};}d-=lengths[i];}}
export function cablePoint(t){t=clamp(t);const a=MOUNTAIN_SITES[3],b=MOUNTAIN_SITES[4];return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*smooth((t-.025)/.95),riding:true,indoor:true,cableT:t};}
export function mountainPath(t){const f=clamp(t)*6,i=Math.min(5,Math.floor(f)),u=f-i;return {...(i===3?cablePoint(u):linePoint(MOUNTAIN_LEGS[i],u)),t};}
function closest(points,x,z){let best={distance:Infinity};for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),px=a.x+dx*u,pz=a.z+dz*u,distance=Math.hypot(x-px,z-pz);if(distance<best.distance)best={x:px,z:pz,y:a.y+(b.y-a.y)*u,distance,u};}return best;}
export const MOUNTAIN_APPROACH=[{x:-270,z:370,y:0},{x:-270,z:405,y:0},{x:-185,z:405,y:0},{x:-102.7,z:413.3,y:0},{x:-78.95,z:360.36,y:0},{x:-149.175,z:333.18,y:0},{x:160,z:400,y:0},{x:180,z:220,y:0},{x:730,z:50,y:0},{x:780,z:-200,y:0},{x:780,z:-480,y:0},{x:810,z:-600,y:0},MOUNTAIN_SITES[0]];
// The graded valley approach is a low corridor between the new shoulders.
const approachValley=MOUNTAIN_APPROACH.slice(8);
export function mountainApproachFalloff(x,z) {
 if (x<640||x>1000||z>135||z<-810) return 1;
 return smooth((closest(approachValley,x,z).distance-12)/64);
}
export const CANYON_BRIDGE=[P(1080,-855,142),P(1160,-905,151)];
export function mountainBridge(x,z){const p=closest(CANYON_BRIDGE,x,z);return p.distance<2.6?p:null;}
export function mountainWeight(x,z){return smooth((x-810)/90)*smooth((1895-x)/95)*smooth((-z-620)/90)*smooth((1600+z)/145);}
export function mountainTerrain(x,z,original){const w=mountainWeight(x,z);if(!w)return original;let h=50+Math.max(0,-z-690)*.71+Math.sin(x*.025+z*.014)*13+Math.cos(z*.045)*7;
 const spineX=920+Math.max(0,-z-700)*1.04+18*Math.sin((z+720)*.012);
 const shoulder=1-smooth((Math.abs(x-spineX)-95)/(x<spineX?390:295));
 const northSlope=1-.35*smooth((-z-1430)/170);
 h=43+(h-43)*(.2+.8*shoulder)*northSlope;
 h+=115*Math.exp(-(((x-1650)/120)**2+((z+1400)/125)**2))+70*Math.exp(-(((x-1770)/85)**2+((z+1240)/95)**2));
 const ravine=closest(CANYON_BRIDGE,x,z);if(ravine.u>.02&&ravine.u<.98)h-=85*(1-smooth(ravine.distance/45))*Math.sin(Math.PI*ravine.u);
 const cable=closest(MOUNTAIN_LEGS[3],x,z),cp=cablePoint(cable.u);if(cable.distance<48)h=Math.min(h,cp.y-38*Math.sin(Math.PI*cable.u)*(1-smooth((cable.distance-20)/28)));
 let nearest={distance:Infinity};for(let i=0;i<6;i++){if(i===3)continue;const p=closest(MOUNTAIN_LEGS[i],x,z);if(p.distance<nearest.distance)nearest=p;}
if(nearest.distance<17&&!mountainBridge(x,z)){const k=1-smooth((nearest.distance-4)/13);h=h*(1-k)+(nearest.y-.06)*k;}
if(ravine.distance<27){const target=ravine.y-.06-55*Math.sin(Math.PI*ravine.u),k=1-smooth((ravine.distance-3)/24);h=h*(1-k)+target*k;}
// Cut a narrow clear corridor under the cabin after landform/path grading. Docks are level at either end.
if(cable.distance<9){const k=1-smooth((cable.distance-4)/5);h=Math.min(h,cp.y-.06-12*Math.sin(Math.PI*cable.u)*k);}
 return original*(1-w)+h*w;
}
export function mountainSupport(x,z,h){const p=mountainBridge(x,z);return p?Math.max(h,p.y):h;}
export function mountainReserved(x,z){if(!mountainWeight(x,z))return false;return MOUNTAIN_SITES.some(p=>Math.hypot(x-p.x,z-p.z)<28)||MOUNTAIN_LEGS.some((p,i)=>i!==3&&closest(p,x,z).distance<7);}
export function mountainSurface(x,z,h){if(mountainWeight(x,z)<.5)return null;if(h>660)return [216,226,225];if(h>410)return [128,137,140];if(h>180)return [133,137,113];return [124,143,101];}
export const mountainNearTile=(x,z)=>x>760&&x<1920&&z< -580;

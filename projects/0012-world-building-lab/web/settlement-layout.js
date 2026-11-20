import {naturalHeight} from './land-base.js';
import {inlandLandform,channelSample} from './inland-geography.js';
import {glacialLandform} from './glacial-geography.js';
import {hydroTerrain} from './water-system.js';
const ground=(x,z)=>hydroTerrain(x,z,inlandLandform(x,z,glacialLandform(x,z,naturalHeight(x,z))));
export const SETTLEMENT={x:-350,z:410,rx:170,rz:65};
const crossing=channelSample(1,.34);
export const TOWN_BRIDGE={...crossing,length:2*(crossing.half+13),width:3.2,y:crossing.level+1.4};
export function bridgeEnds(extra=0){return [-1,1].map(side=>({x:TOWN_BRIDGE.x+TOWN_BRIDGE.nx*(TOWN_BRIDGE.length/2+extra)*side,z:TOWN_BRIDGE.z+TOWN_BRIDGE.nz*(TOWN_BRIDGE.length/2+extra)*side}));}
export const settlementStages=['道路与场地','街区与公共空间','建筑与界面','室内与生活细节'];
export const townRoads=[
 {id:'main',width:5.6,points:[[-510,410],[-460,414],[-410,405],[-345,405],[-270,405],[-212,405]]},
 {id:'lane',width:3.2,points:[[-345,369],[-345,405],[-345,459]]},
 {id:'door',width:3.2,points:[[-270,405],[-270,383],[-270,370]]}
];
const plots=[
 ['farm-a',-462,438,12,13,'民居'],['farm-b',-422,379,12,14,'民居'],
 ['store',-389,382,14,16,'粮仓'],['house-a',-389,439,13,15,'民居'],
 ['bakery',-345,378,16,16,'烘焙坊'],['house-b',-346,441,15,16,'民居'],
 ['house-c',-305,439,14,15,'民居'],['workshop',-270,374,16,18,'工坊与住屋'],
 ['store-b',-229,380,13,15,'店铺'],['house-d',-244,439,14,16,'民居']
];
export const townBuildings=plots.map(([id,x,z,width,depth,use])=>{let top=-Infinity,bottom=Infinity;for(const dx of [-width/2,0,width/2])for(const dz of [-depth/2,0,depth/2]){const h=ground(x+dx,z+dz);top=Math.max(top,h);bottom=Math.min(bottom,h);}return {id,x,z,width,depth,use,floor:top+.25,bottom:bottom-.35,wallHeight:4.3,roofHeight:2.6,front:z>410?-1:1,doorWidth:id==='workshop'?3:2.2};});
export const WORKSHOP=townBuildings.find(b=>b.id==='workshop');
export function inTown(x,z,margin=0){return Math.abs(x-SETTLEMENT.x)<SETTLEMENT.rx+margin&&Math.abs(z-SETTLEMENT.z)<SETTLEMENT.rz+margin;}
export function buildingAt(x,z,margin=0){if(!inTown(x,z,30))return null;return townBuildings.find(b=>Math.abs(x-b.x)<b.width/2+margin&&Math.abs(z-b.z)<b.depth/2+margin)||null;}
export function settlementInteriorAt(x,z,y){const b=buildingAt(x,z,-.4);return b&&(y===undefined||Math.abs(y-b.floor)<2)?b:null;}
export function roofHeightAt(x,z){const b=buildingAt(x,z,.65);return b?b.floor+b.wallHeight+b.roofHeight*Math.max(0,1-Math.abs(x-b.x)/(b.width/2+.65)):null;}
export function settlementReserved(x,z,margin=0){const b=TOWN_BRIDGE,dx=x-b.x,dz=z-b.z;if(Math.abs(dx*b.nx+dz*b.nz)<b.length/2+12+margin&&Math.abs(dx*b.dx+dz*b.dz)<b.width/2+margin)return true;return inTown(x,z,margin);}
export function settlementSupport(x,z,h){const bridge=TOWN_BRIDGE,dx=x-bridge.x,dz=z-bridge.z,along=dx*bridge.nx+dz*bridge.nz,d=Math.abs(along),side=Math.abs(dx*bridge.dx+dz*bridge.dz);if(d<bridge.length/2+10&&side<=bridge.width/2+1e-6){const sign=along<0?-1:1,end=ground(bridge.x+bridge.nx*(bridge.length/2+10)*sign,bridge.z+bridge.nz*(bridge.length/2+10)*sign),t=Math.max(0,(d-bridge.length/2)/10);h=Math.max(h,bridge.y+(end-bridge.y)*t);}if(!inTown(x,z,25))return h;const b=buildingAt(x,z);if(b)return Math.max(h,b.floor);for(const b of townBuildings){const doorZ=b.z+b.front*b.depth/2,along=(z-doorZ)*b.front;if(Math.abs(x-b.x)<b.doorWidth/2+.4&&along>=0&&along<9){const start=ground(b.x,doorZ+b.front*9),ramp=start+(b.floor-start)*(1-along/9);return Math.max(h,ramp);}}return h;}
export const roomObstacles=[
 {x:-275.2,z:369.2,w:2.9,d:4.1,name:'床铺'},
 {x:-264.9,z:369.4,w:2.2,d:3.3,name:'储物柜'},
 {x:-275.3,z:378.3,w:3.4,d:2.2,name:'工作桌'},
 {x:-264.8,z:378,w:2.6,d:4.2,name:'柜台'}
];
export function settlementBlockedAt(x,z,radius=.3){if(!inTown(x,z,25))return false;for(const b of townBuildings){const dx=Math.abs(x-b.x),dz=Math.abs(z-b.z),hx=b.width/2,hz=b.depth/2;if(dx>hx+radius||dz>hz+radius)continue;const atXWall=Math.abs(dx-hx)<radius+.22&&dz<hz+radius,atZWall=Math.abs(dz-hz)<radius+.22&&dx<hx+radius,atDoor=(z-b.z)*b.front>0&&dx<b.doorWidth/2-radius;if(atXWall||atZWall&&!atDoor)return true;}
 if(buildingAt(x,z)?.id==='workshop'){if(Math.abs(z-373)<radius+.12&&Math.abs(x+270)>1.5-radius)return true;if(roomObstacles.some(p=>Math.abs(x-p.x)<p.w/2+radius&&Math.abs(z-p.z)<p.d/2+radius))return true;}return false;}
export const SETTLEMENT_SITES=[
 {id:'town-road',name:'河畔村路',terrain:'道路',x:-495,z:410,targetX:-447,targetZ:412},
 {id:'town-block',name:'榆湾街区',terrain:'街区',x:-350,z:405,targetX:-322,targetZ:407},
 {id:'town-building',name:'临街工坊',terrain:'建筑',x:-270,z:398,targetX:-270,targetZ:383},
 {id:'town-interior',name:'工坊与住屋内部',terrain:'室内',x:-270,z:370,targetX:-275.1,targetZ:368,indoor:true}
].map(r=>({...r,settlement:true}));

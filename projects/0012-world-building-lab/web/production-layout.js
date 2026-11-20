import {channelSample} from './inland-geography.js';
const clamp=v=>Math.max(0,Math.min(1,v));
export const PRODUCTION_STAGES=['自然条件与场地','生产设施与分区','储运与加工关系','完整生活链'];
export const PRODUCTION_SITES=[
 {id:'life-resource',name:'西坡资源林地',terrain:'资源林地',x:-660,z:450,targetX:-675,targetZ:466},
 {id:'life-farm',name:'缓坡农田与田埂',terrain:'农田',x:-566,z:440,targetX:-575,targetZ:457},
 {id:'life-fish',name:'河湾渔场与栈台',terrain:'渔场',x:-130,z:401,targetX:-114.6,targetZ:375.6},
 {id:'life-store',name:'榆湾粮仓内部',terrain:'仓储',x:-389,z:382,targetX:-394,targetZ:381,indoor:true},
 {id:'life-market',name:'村镇集市',terrain:'市场',x:-346,z:411,targetX:-355,targetZ:420},
 {id:'life-craft',name:'加工与制作工坊',terrain:'作坊',x:-270,z:378,targetX:-275,targetZ:378,indoor:true},
 {id:'life-home',name:'临街住宅与餐桌',terrain:'住宅',x:-244,z:438,targetX:-248,targetZ:440,indoor:true}
].map((r,index)=>({...r,index,production:true}));
export const FARM={x:-578,z:464,width:62,depth:36};
export const RESOURCE={x:-676,z:470,radius:30};
const river=channelSample(1,.36);
export const FISH_PIER={level:river.level+1.5,width:2.6,points:[{x:-130,z:401},{x:-120.394,z:387.237},{x:river.x,z:river.z}]};
export function closestSegment(points,x,z){let best={distance:Infinity};for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),px=a.x+u*dx,pz=a.z+u*dz,distance=Math.hypot(x-px,z-pz);if(distance<best.distance)best={distance,x:px,z:pz,u,i};}return best;}
export function productionReserved(x,z,margin=0){return Math.abs(x-FARM.x)<FARM.width/2+8+margin&&Math.abs(z-FARM.z)<FARM.depth/2+8+margin||Math.hypot(x-RESOURCE.x,z-RESOURCE.z)<RESOURCE.radius+margin||closestSegment(FISH_PIER.points,x,z).distance<5+margin;}
// Fixed furniture footprints; actual building walls and door openings remain in settlement-layout.
export const PRODUCTION_OBSTACLES=[
 {x:-394,z:380,w:3,d:8,name:'干粮货架'}, {x:-384,z:380,w:3,d:8,name:'木料货架'},
 {x:-248,z:440,w:2.8,d:2.4,name:'餐桌'}, {x:-239.7,z:441,w:2.3,d:6,name:'床铺与储物'},
 {x:-677,z:467,w:6,d:4,name:'原木堆'}, {x:-653,z:470,w:3,d:3,name:'工具架'}
];
export const productionBlockedAt=(x,z,r=.3)=>PRODUCTION_OBSTACLES.some(p=>Math.abs(x-p.x)<p.w/2+r&&Math.abs(z-p.z)<p.d/2+r);
export function productionPierSupport(x,z,h){const p=closestSegment(FISH_PIER.points,x,z);if(p.distance>FISH_PIER.width/2)return h;const first=FISH_PIER.points[0],u=p.i===1?Math.min(1,Math.hypot(p.x-first.x,p.z-first.z)/9):1;return Math.max(h,h+(FISH_PIER.level-h)*u);}
export const LIFE_LEGS=[
 [PRODUCTION_SITES[0],{x:-620,z:430},{x:-590,z:430},PRODUCTION_SITES[1]],
 [PRODUCTION_SITES[1],{x:-544,z:417},{x:-510,z:410},{x:-460,z:414},{x:-410,z:405},{x:-185,z:405},PRODUCTION_SITES[2]],
 [PRODUCTION_SITES[2],{x:-185,z:405},{x:-389,z:405},{x:-389,z:398},PRODUCTION_SITES[3]],
 [PRODUCTION_SITES[3],{x:-389,z:398},{x:-389,z:405},{x:-346,z:405},PRODUCTION_SITES[4]],
 [PRODUCTION_SITES[4],{x:-346,z:405},{x:-270,z:405},{x:-270,z:383},PRODUCTION_SITES[5]],
 [PRODUCTION_SITES[5],{x:-270,z:383},{x:-270,z:405},{x:-244,z:405},{x:-244,z:429},PRODUCTION_SITES[6]]
];
export const GOODS_NODES={resource:{x:-660,z:450},farm:{x:-566,z:440},fish:{x:-130,z:401},store:{x:-389,z:398},market:{x:-346,z:410},craft:{x:-270,z:390},home:{x:-244,z:429}};
export const GOODS_PATHS={
 resource:[GOODS_NODES.resource,{x:-620,z:430},{x:-590,z:430},{x:-544,z:417},{x:-510,z:410},{x:-460,z:414},{x:-410,z:405},{x:-389,z:405},GOODS_NODES.store],
 farm:[GOODS_NODES.farm,{x:-544,z:417},{x:-510,z:410},{x:-460,z:414},{x:-410,z:405},{x:-389,z:405},GOODS_NODES.store],
 fish:[GOODS_NODES.fish,{x:-185,z:405},{x:-389,z:405},GOODS_NODES.store],
 market:[GOODS_NODES.store,{x:-389,z:405},{x:-346,z:405},GOODS_NODES.market],
 craft:[GOODS_NODES.market,{x:-346,z:405},{x:-270,z:405},GOODS_NODES.craft],
 home:[GOODS_NODES.craft,{x:-270,z:405},{x:-244,z:405},GOODS_NODES.home]
};
export function samplePolyline(points,t){const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));let d=clamp(t)*lengths.reduce((s,v)=>s+v,0);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const u=lengths[i]?clamp(d/lengths[i]):0,a=points[i],b=points[i+1];return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,dx:b.x-a.x,dz:b.z-a.z};}d-=lengths[i];}}

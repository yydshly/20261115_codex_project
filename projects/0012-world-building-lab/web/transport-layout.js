import {channelSample,inlandLandform} from './inland-geography.js';
import {bridgeEnds,TOWN_BRIDGE} from './settlement-layout.js';
import {naturalHeight} from './land-base.js';
import {glacialLandform} from './glacial-geography.js';
import {hydroTerrain,waterAt} from './water-system.js';
import {closestSegment,samplePolyline} from './production-layout.js';
export {samplePolyline};
const ground=(x,z)=>hydroTerrain(x,z,inlandLandform(x,z,glacialLandform(x,z,naturalHeight(x,z))));
export function makeDock(t){const p=channelSample(1,t),at=d=>({x:p.x+p.nx*d,z:p.z+p.nz*d}),land=at(25),deck=at(12),tip=at(3.6),level=p.level+2.4;return {t,river:p,level,land,deck,tip,width:4.2,points:[{...land,y:ground(land.x,land.z)+.025},{...deck,y:level},{...tip,y:level}]};}
export const FREIGHT_DOCK=makeDock(.3),SUPPLY_DOCK=makeDock(.2);
export const BRIDGE_SOUTH=bridgeEnds(10)[0],BRIDGE_NORTH=bridgeEnds(10)[1];
export const TRANSPORT_STAGES=['地形与通路','设施与交接位置','运输与服务规则','完整交通网络'];
export const TRANSPORT_SITES=[
 {id:'trans-road',name:'村路与运输道路',terrain:'运输道路',x:-195,z:405,targetX:-150,targetZ:415},
 {id:'trans-bridge',name:'河湾跨河木桥',terrain:'桥梁',x:TOWN_BRIDGE.x,z:TOWN_BRIDGE.z,targetX:BRIDGE_NORTH.x,targetZ:BRIDGE_NORTH.z},
 {id:'trans-dock',name:'河湾货运码头',terrain:'货运码头',...FREIGHT_DOCK.land,targetX:FREIGHT_DOCK.tip.x,targetZ:FREIGHT_DOCK.tip.z},
 {id:'trans-hub',name:'村口转运与集散场',terrain:'运输节点',x:-195,z:429,targetX:-177,targetZ:440},
 {id:'trans-water',name:'公共水井与补给点',terrain:'公共取水',x:-338,z:410,targetX:-338,targetZ:418},
 {id:'trans-service',name:'检修驿站与候车休憩',terrain:'公共服务',x:-210,z:455,targetX:-202,targetZ:452}
].map((r,index)=>({...r,index,transport:true}));
export const TRANSPORT_NODES={dock:FREIGHT_DOCK.land,hub:{x:-195,z:429},service:{x:-202,z:452},well:{x:-338,z:414},warehouse:{x:-389,z:398}};
export const TRANSPORT_ROADS={
 approach:[FREIGHT_DOCK.land,{x:-55,z:377},BRIDGE_NORTH],
 bridge:[BRIDGE_NORTH,BRIDGE_SOUTH],
 hub:[BRIDGE_SOUTH,{x:-150,z:415},TRANSPORT_NODES.hub],
 service:[TRANSPORT_NODES.hub,{x:-190,z:436},{x:-190,z:452},TRANSPORT_NODES.service],
 return:[TRANSPORT_NODES.service,{x:-190,z:452},{x:-190,z:436},TRANSPORT_NODES.hub],
 warehouse:[TRANSPORT_NODES.hub,{x:-210,z:405},{x:-389,z:405},TRANSPORT_NODES.warehouse],
 water:[TRANSPORT_NODES.well,{x:-338,z:405},{x:-210,z:405},{x:-190,z:425},{x:-190,z:452},TRANSPORT_NODES.service],
 unloading:[TRANSPORT_NODES.warehouse,{x:-389,z:390},{x:-389,z:382},{x:-394,z:378}]
};
export const TRANSPORT_LEGS=[
 [TRANSPORT_SITES[0],{x:-150,z:415},BRIDGE_SOUTH,TRANSPORT_SITES[1]],
 [TRANSPORT_SITES[1],BRIDGE_NORTH,{x:-55,z:377},TRANSPORT_SITES[2]],
 [TRANSPORT_SITES[2],{x:-55,z:377},BRIDGE_NORTH,BRIDGE_SOUTH,{x:-150,z:415},TRANSPORT_SITES[3]],
 [TRANSPORT_SITES[3],{x:-210,z:405},{x:-338,z:405},TRANSPORT_SITES[4]],
 [TRANSPORT_SITES[4],{x:-338,z:405},{x:-210,z:405},{x:-190,z:425},{x:-190,z:455},TRANSPORT_SITES[5]]
];
export function transportPierSupport(x,z,h){for(const dock of [FREIGHT_DOCK,SUPPLY_DOCK]){const p=closestSegment(dock.points,x,z);if(p.distance>dock.width/2+1e-6)continue;const a=dock.points[p.i-1],b=dock.points[p.i];h=Math.max(h,a.y+(b.y-a.y)*p.u);}return h;}
export const TRANSPORT_OBSTACLES=[{x:-177,z:440,w:10,d:5,name:'转运货架'},{x:-186,z:458,w:7,d:1.8,name:'候车长椅'},{x:-175,z:469,w:5,d:4,name:'清洁收集棚'}];
export const transportBlockedAt=(x,z,r=.3)=>TRANSPORT_OBSTACLES.some(p=>Math.abs(x-p.x)<p.w/2+r&&Math.abs(z-p.z)<p.d/2+r);
export function transportReserved(x,z){return [FREIGHT_DOCK,SUPPLY_DOCK].some(d=>closestSegment(d.points,x,z).distance<9)||x> -222&&x< -158&&z>420&&z<479||Object.values(TRANSPORT_ROADS).some(p=>closestSegment(p,x,z).distance<4);}
export const bargePoint=t=>{const p=channelSample(1,.2+.1*Math.max(0,Math.min(1,t)));const level=waterAt(p.x,p.z)?.level??p.level;return {...p,level,y:level+.14};};

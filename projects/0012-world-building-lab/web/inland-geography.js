// Independent, authored geography. This module has no scene or legacy-world dependencies.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const mix=(a,b,t)=>a+(b-a)*t;
export const PLAIN={x:-220,z:340,rx:315,rz:210,level:27};
export const BASIN={x:440,z:520,rx:400,rz:280,floor:38,rim:100};
export const LAKE={x:440,z:520,rx:180,rz:132,level:32,depth:14};
export const RIVER_JOIN={t:.4,x:-590,z:-110,level:25,nx:.24425707757033036,nz:-.9697105135331893,half:12.50668603560012};
export const INLAND_SITES=[
 {id:'plain',name:'长风平原',terrain:'平原',x:-149.17508021415767,z:333.1827139041378,targetX:-450,targetZ:350,targetY:28.5},
 {id:'basin',name:'环山盆地',terrain:'盆地',x:160,z:400,targetX:440,targetZ:520,targetY:34},
 {id:'lake',name:'澄镜内陆湖',terrain:'内陆湖',x:300,z:420,targetX:490,targetZ:535,targetY:32}
];
export const INLAND_CHANNELS=[
 {id:'inlet',name:'山坡入湖溪',nodes:[{x:780,z:380,y:75,half:3.4},{x:680,z:400,y:58,half:4},{x:640,z:425,y:42,half:5},{x:605,z:475,y:32,half:6},{x:592,z:485,y:32,half:6}],depth:1.6},
 {id:'outlet',name:'平原出湖河',nodes:[{x:270,z:520,y:32,half:7},{x:75,z:450,y:29.5,half:6},{x:-160,z:350,y:28.2,half:6},{x:-360,z:170,y:27.7,half:7},{x:-690,z:40,y:26.5,half:7.5},{x:RIVER_JOIN.x,z:RIVER_JOIN.z,y:RIVER_JOIN.level,half:8}],depth:2.4}
];
export function channelSample(channel,t){
 const data=typeof channel==='number'?INLAND_CHANNELS[channel]:channel,ns=data.nodes,scaled=clamp(t)*(ns.length-1),i=Math.min(ns.length-2,Math.floor(scaled)),u=scaled-i;
 const a=ns[Math.max(0,i-1)],b=ns[i],c=ns[i+1],d=ns[Math.min(ns.length-1,i+2)],u2=u*u,u3=u2*u;
 const curve=k=>.5*(2*b[k]+(-a[k]+c[k])*u+(2*a[k]-5*b[k]+4*c[k]-d[k])*u2+(-a[k]+3*b[k]-3*c[k]+d[k])*u3);
 const derivative=k=>.5*((-a[k]+c[k])+2*(2*a[k]-5*b[k]+4*c[k]-d[k])*u+3*(-a[k]+3*b[k]-3*c[k]+d[k])*u2),dx=derivative('x'),dz=derivative('z'),len=Math.hypot(dx,dz)||1;
 return {x:curve('x'),z:curve('z'),level:mix(b.y,c.y,u),half:mix(b.half,c.half,u),nx:-dz/len,nz:dx/len,dx:dx/len,dz:dz/len,t,depth:data.depth,channel:data.id,fresh:true,inland:true,bank:24,bankRise:2.2};
}
export function lakeBoundary(angle){return 1+.055*Math.sin(angle*3)+.03*Math.cos(angle*5);}
export function lakeField(x,z){const dx=(x-LAKE.x)/LAKE.rx,dz=(z-LAKE.z)/LAKE.rz,angle=Math.atan2(dz,dx),normalized=Math.hypot(dx,dz)/lakeBoundary(angle);if(normalized>1.48)return null;return {x:LAKE.x,z:LAKE.z,normalized,distance:normalized*155,half:155,bank:24,bankRise:2,level:LAKE.level,depth:LAKE.depth,t:.56,lake:true,fresh:true,inland:true};}
const bins=new Map(),cell=32;
export const inlandLines=INLAND_CHANNELS.map((c,index)=>({channel:c,points:Array.from({length:401},(_,i)=>channelSample(index,i/400))}));
for(const line of inlandLines)for(let i=0;i<line.points.length-1;i++){const a=line.points[i],b=line.points[i+1],r=Math.max(a.half,b.half)+45,segment={a,b};for(let x=Math.floor((Math.min(a.x,b.x)-r)/cell);x<=Math.floor((Math.max(a.x,b.x)+r)/cell);x++)for(let z=Math.floor((Math.min(a.z,b.z)-r)/cell);z<=Math.floor((Math.max(a.z,b.z)+r)/cell);z++){const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(segment);}}
export function inlandChannelField(x,z){let best=null,score=Infinity;for(const {a,b} of bins.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){const vx=b.x-a.x,vz=b.z-a.z,u=clamp(((x-a.x)*vx+(z-a.z)*vz)/(vx*vx+vz*vz)),px=mix(a.x,b.x,u),pz=mix(a.z,b.z,u),distance=Math.hypot(x-px,z-pz),half=mix(a.half,b.half,u);if(distance>half+44||distance/half>=score)continue;score=distance/half;best={...a,x:px,z:pz,level:mix(a.level,b.level,u),half,distance,normalized:score,t:.4,pathT:mix(a.t,b.t,u)};}return best;}
export function inlandField(x,z){const lake=lakeField(x,z),channel=inlandChannelField(x,z);if(lake&&(!channel||lake.normalized<channel.normalized))return lake;return channel;}
export function inlandWaterAt(x,z){const q=inlandField(x,z);return q&&q.normalized<=1?q:null;}
export function inlandRegionAt(x,z){const plain=Math.hypot((x-PLAIN.x)/PLAIN.rx,(z-PLAIN.z)/PLAIN.rz),basin=Math.hypot((x-BASIN.x)/BASIN.rx,(z-BASIN.z)/BASIN.rz);if(basin<1.22)return {kind:'basin',radius:basin,weight:1-smooth((basin-1.02)/.20)};if(plain<1.2)return {kind:'plain',radius:plain,weight:1-smooth((plain-.85)/.35)};return null;}
export function inlandLandform(x,z,original){
 let h=original;const p=Math.hypot((x-PLAIN.x)/PLAIN.rx,(z-PLAIN.z)/PLAIN.rz);
 if(p<1.2){const target=PLAIN.level+Math.sin(x*.009)*.72+Math.cos(z*.013)*.55;h=mix(h,target,1-smooth((p-.85)/.35));}
 const r=Math.hypot((x-BASIN.x)/BASIN.rx,(z-BASIN.z)/BASIN.rz);
 if(r<1.22){const floor=BASIN.floor+Math.sin(x*.011)*1.2+Math.cos(z*.014)*.7,rim=Math.exp(-(((r-.94)/.22)**2)),target=floor+(BASIN.rim-BASIN.floor)*rim;h=mix(h,target,1-smooth((r-1.02)/.20));}
 return inlandHydro(x,z,h);
}
export function inlandHydro(x,z,original,existingWater=false){
 let h=original;const q=inlandField(x,z);if(!q)return h;
 let target,influence;
 if(q.normalized<=1){target=q.level-q.depth*Math.pow(Math.max(0,1-q.normalized*q.normalized),1.3);influence=1;}
 else{const d=q.distance-q.half;target=q.level+.12+q.bankRise*smooth(d/q.bank);influence=1-smooth((d-q.bank)/20);}
 if(influence>0){const shaped=mix(h,target,influence);h=existingWater?Math.min(h,shaped):shaped;}return h;
}
export function inlandSurface(x,z){const q=inlandField(x,z);if(q&&q.distance<q.half+q.bank){const delta=q.distance-q.half;return delta<3?[117,137,120]:delta<12?[157,152,117]:[135,156,103];}const r=inlandRegionAt(x,z);if(!r||r.weight<.6)return null;if(r.kind==='plain'){const soil=Math.sin(x*.022+z*.008)+Math.cos(z*.031);return soil>1.38?[165,145,106]:[137,163,104];}return r.radius>.72?[151,147,123]:[155,165,111];}
export function inlandNearWaterTile(x,z){if(Math.abs(x-LAKE.x)<LAKE.rx+130&&Math.abs(z-LAKE.z)<LAKE.rz+130)return true;return inlandLines.some(line=>line.points.some((p,i)=>i%12===0&&Math.abs(p.x-x)<115&&Math.abs(p.z-z)<115));}

export const RIVER_JOIN_VIEW={x:RIVER_JOIN.x+RIVER_JOIN.nx*(RIVER_JOIN.half+7),z:RIVER_JOIN.z+RIVER_JOIN.nz*(RIVER_JOIN.half+7)};

// Authored snow, ice and meltwater parameters. No climate or glacier simulation is implied.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const SNOW_RANGE={x:400,z:-380,rx:350,rz:300};
export const ICE_LAKE={x:205,z:-185,rx:50,rz:36,level:244,depth:10};
export const ICE_NODES=[{x:560,z:-570,bed:365,half:30,thickness:38},{x:440,z:-430,bed:310,half:40,thickness:26},{x:330,z:-300,bed:275,half:31,thickness:17},{x:270,z:-260,bed:258,half:20,thickness:8}];
export const MELT_CHANNELS=[
 {id:'ice-inlet',depth:1.5,nodes:[{x:270,z:-260,level:258,half:3},{x:240,z:-216,level:244,half:3.2},{x:230,z:-209,level:244,half:3.5}]},
 {id:'ice-outlet',depth:1.6,nodes:[{x:170,z:-165,level:244,half:3.5},{x:159,z:-154,level:244,half:3.5},{x:145,z:-125,level:229,half:3.1},{x:110,z:-90,level:212,half:3.3},{x:96,z:-74,level:212,half:3.4}]}
];
function sample(nodes,t){const s=clamp(t)*(nodes.length-1),i=Math.min(nodes.length-2,Math.floor(s)),u=s-i,a=nodes[Math.max(0,i-1)],b=nodes[i],c=nodes[i+1],d=nodes[Math.min(nodes.length-1,i+2)];const at=k=>.5*(2*b[k]+(-a[k]+c[k])*u+(2*a[k]-5*b[k]+4*c[k]-d[k])*u*u+(-a[k]+3*b[k]-3*c[k]+d[k])*u*u*u),der=k=>.5*((-a[k]+c[k])+2*(2*a[k]-5*b[k]+4*c[k]-d[k])*u+3*(-a[k]+3*b[k]-3*c[k]+d[k])*u*u),dx=der('x'),dz=der('z'),len=Math.hypot(dx,dz)||1;return {x:at('x'),z:at('z'),dx:dx/len,dz:dz/len,nx:-dz/len,nz:dx/len,half:mix(b.half,c.half,u),i,u,t};}
export function iceSample(t){const p=sample(ICE_NODES,t),a=ICE_NODES[p.i],b=ICE_NODES[p.i+1];return {...p,bed:mix(a.bed,b.bed,p.u),thickness:mix(a.thickness,b.thickness,p.u)};}
export function meltSample(channel,t){const c=MELT_CHANNELS[channel],p=sample(c.nodes,t);return {...p,level:mix(c.nodes[p.i].level,c.nodes[p.i+1].level,p.u),depth:c.depth,bank:14,bankRise:2.2,fresh:true,glacial:true,channel:c.id};}
const iceLine=Array.from({length:501},(_,i)=>iceSample(i/500)),meltLines=MELT_CHANNELS.map((_,c)=>Array.from({length:301},(_,i)=>meltSample(c,i/300)));
export {iceLine,meltLines};
function indexLines(lines,radius){const bins=new Map();for(const points of lines)for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],r=Math.max(a.half,b.half)+radius;for(let x=Math.floor((Math.min(a.x,b.x)-r)/32);x<=Math.floor((Math.max(a.x,b.x)+r)/32);x++)for(let z=Math.floor((Math.min(a.z,b.z)-r)/32);z<=Math.floor((Math.max(a.z,b.z)+r)/32);z++){const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push({a,b});}}return bins;}
const iceBins=indexLines([iceLine],110),meltBins=indexLines(meltLines,38),apronBins=indexLines([meltLines[1]],90);
function nearest(bins,x,z,radius){let best=null,score=Infinity;for(const {a,b} of bins.get(Math.floor(x/32)+','+Math.floor(z/32))||[]){const dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),px=mix(a.x,b.x,u),pz=mix(a.z,b.z,u),distance=Math.hypot(x-px,z-pz),half=mix(a.half,b.half,u);if(distance>half+radius||distance/half>=score)continue;score=distance/half;best={...a,x:px,z:pz,distance,half,normalized:score,t:mix(a.t,b.t,u),level:a.level===undefined?undefined:mix(a.level,b.level,u),bed:a.bed===undefined?undefined:mix(a.bed,b.bed,u),thickness:a.thickness===undefined?undefined:mix(a.thickness,b.thickness,u)};}return best;}
export const iceField=(x,z)=>nearest(iceBins,x,z,110);
export function iceSurface(p,u){const groove=Math.pow(Math.max(0,Math.cos((p.t*12+u*.22)*Math.PI*2)),14)*Math.min(3.4,p.thickness*.18);return p.bed+5*u*u+p.thickness*Math.pow(Math.max(0,1-u*u),.55)-groove;}
export function iceLakeField(x,z){const r=Math.hypot((x-ICE_LAKE.x)/ICE_LAKE.rx,(z-ICE_LAKE.z)/ICE_LAKE.rz);return r<2.1?{x:ICE_LAKE.x,z:ICE_LAKE.z,normalized:r,distance:r*42,half:42,bank:18,bankRise:2.2,depth:ICE_LAKE.depth,level:ICE_LAKE.level,lake:true,glacial:true,fresh:true,t:0}:null;}
export function glacialWaterField(x,z){const lake=iceLakeField(x,z),channel=nearest(meltBins,x,z,38);if(!lake)return channel;if(!channel)return lake;if(lake.normalized<=1||channel.normalized<=1)return lake.normalized<channel.normalized?lake:channel;const dl=lake.distance-lake.half,dc=channel.distance-channel.half,w=smooth(.5+(dl-dc)/24),q=dl<dc?lake:channel;return {...q,level:mix(lake.level,channel.level,w)};}
export function glacialWaterAt(x,z){const q=glacialWaterField(x,z);return q&&q.normalized<=1?q:null;}
export function snowRegion(x,z){const r=Math.hypot((x-SNOW_RANGE.x)/SNOW_RANGE.rx,(z-SNOW_RANGE.z)/SNOW_RANGE.rz);return r<1?{r,weight:1-smooth((r-.82)/.18)}:null;}
export function glacialLandform(x,z,original){let h=original;const apron=nearest(apronBins,x,z,90);if(apron){const d=Math.max(0,apron.distance-apron.half),w=(1-smooth((d-25)/65))*(1-smooth((apron.t-.5)/.28)),target=apron.level+8+d*.25;h=mix(h,Math.max(h,target),w);}
 const r=snowRegion(x,z);if(r){const a=Math.exp(-(((x-535)/95)**2+((z+560)/100)**2)),b=Math.exp(-(((x-600)/70)**2+((z+420)/150)**2)),target=245+120*Math.max(0,1-r.r*r.r)+150*a+70*b+Math.sin(x*.035)*Math.cos(z*.031)*5;h=mix(h,target,r.weight);}const ice=iceField(x,z);if(ice){const target=ice.bed+5*Math.min(1,ice.normalized)**2+Math.max(0,ice.normalized-1)*30,w=1-smooth((ice.distance-ice.half-70)/40);h=mix(h,target,w);}return glacialHydro(x,z,h);}
export function glacialHydro(x,z,original,existingWater=false){const q=glacialWaterField(x,z);if(!q)return original;if(q.normalized>1&&iceField(x,z)?.normalized<=1.02)return original;let target,w;if(q.normalized<=1){target=q.level-q.depth*Math.pow(Math.max(0,1-q.normalized*q.normalized),1.3);w=1;}else{const d=q.distance-q.half;target=q.level+.08+q.bankRise*smooth(d/q.bank);w=1-smooth((d-q.bank)/20);}if(w<=0)return original;const h=mix(original,target,w);return existingWater?Math.min(original,h):h;}
export function snowDepthAt(x,z,height,slope=0){const region=snowRegion(x,z);if(!region||region.weight<.35||height<295||slope>.85||glacialWaterAt(x,z)||iceField(x,z)?.normalized<1.12)return 0;return (.18+.5*smooth((height-295)/100))*(.7+.3*Math.sin(x*.023+z*.014)**2);}
export function glacialSurface(x,z,height){if(!snowRegion(x,z)&&!glacialWaterField(x,z))return null;const q=glacialWaterField(x,z);if(q&&q.distance<q.half+16)return q.normalized<1.08?[116,148,154]:[149,157,151];return height>295?[144,159,168]:[139,153,154];}
export function iceBankPoint(t,gap=35){const p=iceSample(t),offset=p.half+gap;return {x:p.x+p.nx*offset,z:p.z+p.nz*offset};}
export function meltBankPoint(t,gap=7){const p=meltSample(1,t),offset=p.half+gap;return {x:p.x+p.nx*offset,z:p.z+p.nz*offset};}
const glacierView=iceBankPoint(.45),meltView=meltBankPoint(.43);
export const GLACIAL_SITES=[
 {id:'ice-snow',name:'雪脊山岭',terrain:'雪山',x:470,z:-590,targetX:620,targetZ:-530},
 {id:'ice-glacier',name:'蓝脊冰川',terrain:'冰川',...glacierView,targetX:iceSample(.45).x,targetZ:iceSample(.45).z},
 {id:'ice-lake',name:'冰碛冰湖',terrain:'冰湖',x:171,z:-215,targetX:205,targetZ:-185},
 {id:'ice-melt',name:'融水溪流',terrain:'融水溪流',...meltView,targetX:meltSample(1,.43).x,targetZ:meltSample(1,.43).z}
];
export function glacialNearTile(x,z){return (x>90&&x<650&&z< -70&&z> -660)||meltLines.some(line=>line.some((p,i)=>i%15===0&&Math.abs(p.x-x)<105&&Math.abs(p.z-z)<105));}

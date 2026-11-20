import {raisedRelief, ecotoneInfluence, regionalSurface, seamSurfaceInfluence, leeSwaleTerrain} from './regional-geography.js';
import {northTerrain,northColor,northField} from './northern-watershed.js';
import {linkTerrain,linkColor,linkSupport} from './watershed-link.js';
import {warmTerrain,warmColor,warmBlockedAt,warmWeight} from './warm-layout.js';
import {borealTerrain,borealColor,borealBlockedAt,borealWeight,borealSlopeWeight} from './boreal-layout.js';
import {uplandTerrain,uplandColor,uplandWeight} from './upland-layout.js';
import {yardangTerrain,yardangColor,yardangWeight} from './yardang-layout.js';
import {volcanicTerrain,volcanicColor,volcanicBlockedAt,volcanicWeight} from './volcanic-layout.js';
import {fanTerrain,fanColor,fanWeight} from './fan-layout.js';
import {strataTerrain,strataColor,strataWeight} from './strata-layout.js';
import {saltTerrain,saltColor,saltWeight} from './salt-layout.js';
import {karstTerrain,karstSupport,karstColor,karstWeight} from './karst-layout.js';
import {geologyTerrain,geologySupport,geologyColor,geologyWeight} from './geology-layout.js';
import {drylandTerrain,drylandColor,drylandWeight} from './dryland-layout.js';
import {tropicalTerrain,tropicalColor,tropicalWeight,tropicalRiverField} from './tropical-layout.js';
import {oceanTerrain,oceanColor,oceanWeight,southOpenSea} from './ocean-layout.js';
import {polarTerrain,polarIceSupport,polarColor,polarBoardwalkSupport,polarWeight,polarWaterAt} from './polar-layout.js';
import {coldGroundRelief} from './cold-ground.js';
import {transportBlockedAt,transportPierSupport} from './transport-layout.js';
import {productionBlockedAt,productionPierSupport} from './production-layout.js';
import {mountainTerrain,mountainSupport,mountainSurface,mountainWeight,mountainApproachFalloff} from './mountain-layout.js';
import {settlementSupport,settlementBlockedAt} from './settlement-layout.js';
import {marineSurface,marineWeight} from './marine-geography.js';
import {glacialLandform,glacialSurface,iceField,snowDepthAt,snowRegion} from './glacial-geography.js';
import {forestSurface} from './forest-layout.js';
import {regions,worldHeight,worldSlope,surfaceColor,random} from './world-layout.js';
import {inlandLandform,inlandSurface} from './inland-geography.js';
import {naturalHeight} from './land-base.js';
import {hydroTerrain,waterAt,riverField,waterPlatforms,nearestWaterTrail,riverBridge,riverBridgePoint,northBankSupport} from './water-system.js';
export {random};
export const SCALE=6,HEIGHT_SCALE=3;
import {benchmarkElevation,benchmarkNear,trailHalfWidth} from './benchmark-trail.js';
import {lifeRoadCrossing} from './life-route.js';

export const LARGE_WORLD={width:3840,depth:3120,eye:1.72,walkSpeed:4.4,runSpeed:8.2};
export const stops=regions.map((r,index)=>({...r,index,x:r.x*SCALE,z:r.z*SCALE}));
stops[0]={...stops[0],x:-189*SCALE,z:110*SCALE};
export const VOLCANO={x:regions[7].x*SCALE,z:regions[7].z*SCALE,lava:28.6*HEIGHT_SCALE,radius:8.7*SCALE};
stops[7]={...stops[7],x:VOLCANO.x+40,z:VOLCANO.z-110};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function baseHeight(x,z){return inlandLandform(x,z,glacialLandform(x,z,naturalHeight(x,z)));}
export function biomeIndex(x,z){let index=0,best=Infinity;for(let i=0;i<stops.length;i++){const r=regions[i],d=Math.hypot(x/SCALE-r.x,z/SCALE-r.z)/r.radius;if(d<best){best=d;index=i;}}return index;}
export function roadPoint(t){const scaled=clamp(t,0,1)*9,index=Math.min(8,Math.floor(scaled)),u=scaled-index,p0=stops[Math.max(0,index-1)],p1=stops[index],p2=stops[index+1],p3=stops[Math.min(9,index+2)],u2=u*u,u3=u2*u;const c=key=>.5*((2*p1[key])+(-p0[key]+p2[key])*u+(2*p0[key]-5*p1[key]+4*p2[key]-p3[key])*u2+(-p0[key]+3*p1[key]-3*p2[key]+p3[key])*u3);return {x:c('x'),z:c('z')};}
export const plots=stops.flatMap((r,index)=>{
 const offset=index===7?[15,35]:index===8?[-40,45]:[0,-14];
 const main={index,kind:r.landmark,x:r.x+offset[0],z:r.z+offset[1],radius:index===5?12:10,main:true};
 const result=[main];
 if([0,1,2,9].includes(index))for(const [i,dx,dz] of [[0,-22,12],[1,21,18],[2,37,-7],[3,-35,-18]])result.push({index,kind:index===9?'hut':'cottage',x:r.x+dx,z:r.z+dz,radius:8,main:false});
 if(index===6)for(const [dx,dz] of [[18,16],[-18,23]])result.push({index,kind:'tent',x:r.x+dx,z:r.z+dz,radius:8,main:false});
 return result.map(p=>({...p,y:Math.max(index===3?2.2:.7,baseHeight(p.x,p.z)),halfX:p.kind==='arch'?8:4.8,halfZ:p.kind==='arch'?3:3.7}));
});
const bins=new Map(),cell=32,samples=[];
for(let i=0;i<=1800;i++){const t=i/1800,p=roadPoint(t);samples.push({...p,t,index:i,base:baseHeight(p.x,p.z),y:Math.max(1.25,baseHeight(p.x,p.z))});}
for(let i=0;i<samples.length;i++){const from=Math.max(0,i-5),to=Math.min(1600,i+5);if(i>1600)continue;let sum=0,count=0;for(let j=from;j<=to;j++){sum+=samples[j].y;count++;}samples[i].y=sum/count;}
for(let pass=0;pass<2;pass++){for(let i=1;i<=1600;i++){const a=samples[i-1],b=samples[i],d=Math.hypot(b.x-a.x,b.z-a.z);b.y=Math.min(b.y,a.y+d*.27);}for(let i=1599;i>=0;i--){const a=samples[i+1],b=samples[i],d=Math.hypot(b.x-a.x,b.z-a.z);b.y=Math.min(b.y,a.y+d*.27);}}
// Raise crossings above the new water profile, and spread their approaches at the same grade cap.
for(let i=0;i<=1600;i++){const p=samples[i],w=waterAt(p.x,p.z);if(w)p.y=Math.max(p.y,w.level+2.6);}
for(let i=1;i<=1600;i++){const a=samples[i-1],b=samples[i];b.y=Math.max(b.y,a.y-Math.hypot(b.x-a.x,b.z-a.z)*.27);}
for(let i=1599;i>=0;i--){const a=samples[i+1],b=samples[i];b.y=Math.max(b.y,a.y-Math.hypot(b.x-a.x,b.z-a.z)*.27);}
for(let i=0;i<=1600;i++){const p=samples[i],key=`${Math.floor(p.x/cell)},${Math.floor(p.z/cell)}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(p);}
export function nearestRoad(x,z,maxDistance=24){let best=null,bestDistance=maxDistance;const cx=Math.floor(x/cell),cz=Math.floor(z/cell),range=Math.ceil(maxDistance/cell);for(let dx=-range;dx<=range;dx++)for(let dz=-range;dz<=range;dz++)for(const p of bins.get(`${cx+dx},${cz+dz}`)||[]){const next=samples[Math.min(1600,p.index+1)],vx=next.x-p.x,vz=next.z-p.z,length=vx*vx+vz*vz,u=length?clamp(((x-p.x)*vx+(z-p.z)*vz)/length,0,1):0,px=p.x+vx*u,pz=p.z+vz*u,d=Math.hypot(px-x,pz-z);if(d<bestDistance){best={x:px,z:pz,y:p.y+(next.y-p.y)*u,t:p.t+(next.t-p.t)*u};bestDistance=d;}}return best?{...best,distance:bestDistance}:null;}
// Keep full-size buildings beside the road, including bends near settlements.
for(const p of plots){const road=nearestRoad(p.x,p.z,15);if(!road)continue;let dx=p.x-road.x,dz=p.z-road.z,len=Math.hypot(dx,dz);if(len<.01){const a=roadPoint(Math.max(0,road.t-.002)),b=roadPoint(Math.min(1,road.t+.002));dx=-(b.z-a.z);dz=b.x-a.x;len=Math.hypot(dx,dz)||1;}const shift=17-road.distance;p.x+=dx/len*shift;p.z+=dz/len*shift;p.y=Math.max(p.index===3?2.2:.7,baseHeight(p.x,p.z));}
export const decks=[0,9].map(index=>{const r=stops[index],dx=-Math.SQRT1_2,dz=Math.SQRT1_2;let x=r.x,z=r.z;for(let i=0;i<130&&baseHeight(x,z)>.15;i++){x+=dx*3;z+=dz*3;}return {index,x:x+dx*7,z:z+dz*7,y:1.4,length:22,width:3.3,angle:-Math.PI*.75};});
for(const p of plots){const q=riverField(p.x,p.z);if(q&&q.distance<q.half+p.radius+15){let dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz)||1,shift=q.half+p.radius+16-d;p.x+=dx/d*shift;p.z+=dz/d*shift;}p.y=Math.max(p.index===3?2.2:.7,hydroTerrain(p.x,p.z,baseHeight(p.x,p.z)));}
// A water-bank relocation must also preserve the existing road clearance.
for(const p of plots){for(let n=0;n<4;n++){const road=nearestRoad(p.x,p.z,14);if(!road)break;let dx=p.x-road.x,dz=p.z-road.z,len=Math.hypot(dx,dz)||1;p.x+=dx/len*(17-road.distance);p.z+=dz/len*(17-road.distance);}p.y=Math.max(p.index===3?2.2:.7,hydroTerrain(p.x,p.z,baseHeight(p.x,p.z)));}
export function terrainHeight(x,z){
 const original=baseHeight(x,z);
 const relief=raisedRelief(x,z,original);
 const ice=relief>original ? iceField(x,z) : null;
 const protection=ice ? smooth((ice.normalized-1.05)/.8) : 1;
 let addition=(relief-original)*protection*mountainApproachFalloff(x,z);
 if (addition>0 && x>530 && x<890 && z>-825 && z<-475) {
  const pass=nearestRoad(x,z,100);
  if (pass) addition*=smooth((pass.distance-9)/91);
 }
 if (addition>0 && z<-1080 && x<-600 && polarWaterAt(x,z)?.sea) addition=0;
 let h=original+addition;
 const road=nearestRoad(x,z,16);
 if(road && original>.1){
  const blend=(1-smooth((road.distance-3.6)/10))*smooth((original-.1)/2.2);
  h=h*(1-blend)+road.y*blend;
 }
 for(const p of plots){if(Math.abs(x-p.x)>p.radius+5||Math.abs(z-p.z)>p.radius+5)continue;const d=Math.hypot(x-p.x,z-p.z),blend=1-smooth((d-p.radius*.55)/(p.radius*.75));h=h*(1-blend)+p.y*blend;}
 const authored=warmTerrain(x,z,borealTerrain(x,z,uplandTerrain(x,z,yardangTerrain(x,z,volcanicTerrain(x,z,fanTerrain(x,z,strataTerrain(x,z,saltTerrain(x,z,karstTerrain(x,z,geologyTerrain(x,z,drylandTerrain(x,z,tropicalTerrain(x,z,oceanTerrain(x,z,polarTerrain(x,z,mountainTerrain(x,z,hydroTerrain(x,z,h))))))))))))))));
 const swaled=road&&road.distance<8?authored:leeSwaleTerrain(x,z,authored);
 const height=northTerrain(x,z,linkTerrain(x,z,swaled),riverField(x,z));
 // Keep the old road grade through the shoulders of the tributary crossing.
 // Inside its channel this only ever lowers the bed. The road deck carries the walk.
 if(road && height>road.y) {
  const tributary=northField(x,z);
  if(tributary && z>-615) {
   const blend=(1-smooth((road.distance-3.6)/9))*(1-smooth((tributary.distance-90)/30))*smooth((z+615)/55);
   return height+(road.y-height)*blend;
  }
 }
 return coldGroundRelief(x,z,southOpenSea(x,z,height));
}
export function roadSample(t){const i=clamp(t,0,1)*1800,a=Math.min(1799,Math.floor(i)),u=i-a,p=roadPoint(t);const y=t<=8/9?samples[a].y*(1-u)+samples[a+1].y*u:Math.max(.1,baseHeight(p.x,p.z));return {...p,y,t};}
export function riverBridgeHeight(along){
 const b=riverBridge,span=b.length/2;
 if(Math.abs(along)<=span)return b.y;
 const end=riverBridgePoint(Math.sign(along)*(span+b.rampLength));
 const ground=terrainHeight(end.x,end.z),weight=Math.max(0,1-(Math.abs(along)-span)/b.rampLength);
 return ground+weight*(b.y-ground);
}
function riverBridgeSupport(x,z,h){
 const b=riverBridge,dx=x-b.x,dz=z-b.z,along=dx*b.nx+dz*b.nz;
 return Math.abs(along)<b.length/2+b.rampLength&&Math.abs(dx*b.dx+dz*b.dz)<b.width/2?
  Math.max(h,riverBridgeHeight(along)):h;
}
function roadSupport(x,z,h){
 const crossingDist=Math.hypot(x-lifeRoadCrossing.x,z-lifeRoadCrossing.z);
 const shoulder=4*(1-smooth((crossingDist-6)/10));
 const road=nearestRoad(x,z,3.3+shoulder);
 if(!road)return h;
 const weight=road.distance<=3.3?1:1-smooth((road.distance-3.3)/shoulder);
 return Math.max(h,h+(road.y+.15-h)*weight);
}
function originalWalkingSurface(x,z){let h=terrainHeight(x,z);if(h>295){const slope=Math.hypot((terrainHeight(x+2,z)-terrainHeight(x-2,z))/4,(terrainHeight(x,z+2)-terrainHeight(x,z-2))/4);h+=snowDepthAt(x,z,h,slope);}h=roadSupport(x,z,h);for(const d of decks){const dx=x-d.x,dz=z-d.z,c=Math.cos(d.angle),s=Math.sin(d.angle);if(Math.abs(dx*c-dz*s)<d.length/2&&Math.abs(dx*s+dz*c)<d.width/2)h=Math.max(h,d.y);}for(const p of waterPlatforms)if(Math.abs(x-p.x)<p.halfX&&Math.abs(z-p.z)<p.halfZ)h=Math.max(h,p.y);h=riverBridgeSupport(x,z,h);const trail=nearestWaterTrail(x,z);if(trail)h=Math.max(h,trail.y);return northBankSupport(x,z,linkSupport(x,z,karstSupport(x,z,geologySupport(x,z,polarBoardwalkSupport(x,z,polarIceSupport(x,z,transportPierSupport(x,z,productionPierSupport(x,z,mountainSupport(x,z,settlementSupport(x,z,h))))))))));}
function benchmarkBase(x,z){
 const ground=originalWalkingSurface(x,z),water=waterAt(x,z);
 return Math.max(ground,water?water.level+.48:.21);
}
export function benchmarkDeck(at){return benchmarkElevation(at,benchmarkBase);}
export function walkingSurface(x,z){
 const at=benchmarkNear(x,z,trailHalfWidth),ground=originalWalkingSurface(x,z);
 return at===null?ground:Math.max(ground,benchmarkDeck(at));
}
export function walkable(x,z,fromX=x,fromZ=z){if(warmBlockedAt(x,z)||borealBlockedAt(x,z)||volcanicBlockedAt(x,z)||transportBlockedAt(x,z)||productionBlockedAt(x,z)||settlementBlockedAt(x,z))return false;if(iceField(x,z)?.normalized<1.04)return false;if(Math.abs(x)>1905||Math.abs(z)>1545)return false;if(Math.hypot(x-VOLCANO.x,z-VOLCANO.z)<VOLCANO.radius&&terrainHeight(x,z)<VOLCANO.lava+.2)return false;const h=walkingSurface(x,z),w=waterAt(x,z);if(h<.2||(w&&w.level-h>.22))return false;const distance=Math.hypot(x-fromX,z-fromZ);return distance<.001||Math.abs(h-walkingSurface(fromX,fromZ))<distance*.8+.16;}
const colorCache=new Map();
function cachedColor(ix,iz){const key=ix+','+iz;if(!colorCache.has(key)){const x=ix*20/SCALE,z=iz*20/SCALE;const h=worldHeight(x,z,false);colorCache.set(key,surfaceColor(x,z,h,worldSlope(x,z)));}return colorCache.get(key);}
function authoredGroundColor(x,z,heightHint){let cachedHeight=heightHint;const height=()=>cachedHeight??=terrainHeight(x,z);const warm=warmColor(x,z);if(warm)return warm;const upland=uplandColor(x,z);if(upland)return upland;const yardang=yardangColor(x,z,height());if(yardang)return yardang;const volcanic=volcanicColor(x,z);if(volcanic)return volcanic;const fan=fanColor(x,z);if(fan)return fan;const strata=strataColor(x,z,height());if(strata)return strata;const saline=saltColor(x,z);if(saline)return saline;const karst=karstColor(x,z);if(karst)return karst;const geo=geologyColor(x,z);if(geo)return geo;const dryland=drylandColor(x,z,height());if(dryland)return dryland;const tropical=tropicalColor(x,z,height());if(tropical)return tropical;const ocean=oceanColor(x,z,height());if(ocean)return ocean;const polar=polarColor(x,z,height());if(polar)return polar;const mountain=mountainSurface(x,z,height());if(mountain)return mountain;const marine=marineSurface(x,z,height());if(marine)return marine;const cold=glacialSurface(x,z,height());if(cold)return cold;const floor=forestSurface(x,z);if(floor)return floor;const inland=inlandSurface(x,z);if(inland)return inland;const ix=Math.floor(x/20),iz=Math.floor(z/20),u=x/20-ix,v=z/20-iz,a=cachedColor(ix,iz),b=cachedColor(ix+1,iz),c=cachedColor(ix,iz+1),d=cachedColor(ix+1,iz+1),rgb=a.map((value,i)=>Math.round((value*(1-u)+b[i]*u)*(1-v)+(c[i]*(1-u)+d[i]*u)*v));const q=riverField(x,z);if(q&&q.distance<q.half+q.bank){const wet=q.normalized<1.12,bank=q.t<.35?[132,143,137]:q.t<.7?[102,123,87]:[162,151,112],blend=wet?.92:.65;return rgb.map((v,i)=>Math.round(v*(1-blend)+bank[i]*blend));}const road=nearestRoad(x,z,4.5);if(road&&baseHeight(x,z)>.1){const mix=1-smooth((road.distance-2.6)/1.5);return rgb.map((v,i)=>Math.round(v*(1-mix)+[143,128,97][i]*mix));}return rgb;}
export function viewClear(view){const horizontal=Math.hypot(view.targetX-view.x,view.targetZ-view.z),pitch=Math.atan2(view.targetY-view.y,horizontal);if(pitch<-.78||pitch>.6)return false;for(let i=1;i<32;i++){const u=i/32,x=view.x+(view.targetX-view.x)*u,z=view.z+(view.targetZ-view.z)*u,y=view.y+(view.targetY-view.y)*u;if(terrainHeight(x,z)>y-.22)return false;}return true;}
export function stationView(index){const r=stops[index],main=plots.find(p=>p.index===index&&p.main);if(index===0){const p=roadSample(.004),ahead=roadSample(.028);return {x:p.x,z:p.z,y:walkingSurface(p.x,p.z)+LARGE_WORLD.eye,targetX:ahead.x,targetZ:ahead.z,targetY:ahead.y+LARGE_WORLD.eye,roadEntry:true};}if(index===7){const x=VOLCANO.x+12,z=VOLCANO.z-80;return {x,z,y:walkingSurface(x,z)+LARGE_WORLD.eye,targetX:VOLCANO.x,targetZ:VOLCANO.z,targetY:VOLCANO.lava};}const offsets={1:[18,30],2:[-23,22],3:[24,20],4:[20,29],5:[-24,23],6:[22,29],8:[17,24],9:[-26,26]},[dx,dz]=offsets[index],target={targetX:main.x,targetZ:main.z,targetY:main.y+(index===9?7:index===4?5:2.2)},make=(x,z)=>({x,z,y:Math.max(walkingSurface(x,z),.6)+LARGE_WORLD.eye,...target}),valid=v=>walkable(v.x,v.z)&&!plots.some(p=>Math.abs(v.x-p.x)<p.halfX+.4&&Math.abs(v.z-p.z)<p.halfZ+.4)&&viewClear(v),preferred=make(main.x+dx,main.z+dz);if(valid(preferred))return preferred;const angle=Math.atan2(dx,dz);for(const radius of [28,36,44,18])for(let i=0;i<16;i++){const a=angle+(i%2?1:-1)*Math.ceil(i/2)*Math.PI/8,v=make(main.x+Math.sin(a)*radius,main.z+Math.cos(a)*radius);if(valid(v))return v;}return preferred;}
export function markerFor(index,stage){const r=stops[index],main=plots.find(p=>p.index===index&&p.main);if(stage===2)return {x:main.x,z:main.z,y:main.y+2};if(stage===1){const x=r.x+13,z=r.z+14;return {x,z,y:terrainHeight(x,z)+.3};}return {x:r.x,z:r.z,y:terrainHeight(r.x,r.z)+4};}

const sceneWeights = [
  warmWeight, borealWeight, uplandWeight, yardangWeight, volcanicWeight, fanWeight,
  strataWeight, saltWeight, karstWeight, geologyWeight, drylandWeight, tropicalWeight,
  oceanWeight, polarWeight, mountainWeight, marineWeight
];
function surfaceIntegrationAt(x, z) {
  const influence = ecotoneInfluence(x, z);
  if (influence <= 0) return 0;
  let core = snowRegion(x, z)?.weight ?? 0;
  for (const weight of sceneWeights) {
    core = Math.max(core, weight(x, z));
    if (core >= 1) return 0;
  }
  return influence * (1 - smooth((core - .68) / .32));
}
export function groundColor(x, z, heightHint) {
  const height = heightHint ?? terrainHeight(x, z);
  const original = authoredGroundColor(x, z, height);
  const seams=seamSurfaceInfluence(x,z);
  const influence=Math.max(surfaceIntegrationAt(x,z),seams.north*.9,seams.south*.96,seams.west*.78,seams.east*.87);
  const river = influence>0 ? riverField(x,z) : null;
  const tropical=seams.south>0&&x< -690?tropicalRiverField(x,z):null;
  const bank=Math.min(river?river.distance-river.half:Infinity,tropical?tropical.distance-tropical.half:Infinity);
  const color=regionalSurface(x,z,height,bank,original,influence,seams);
  const forest=height>.2?borealSlopeWeight(x,z):0;
  const blended=forest?borealColor(x,z).map((value,i)=>color[i]+(value-color[i])*forest):color;
  return northColor(x,z,linkColor(x,z,blended));
}

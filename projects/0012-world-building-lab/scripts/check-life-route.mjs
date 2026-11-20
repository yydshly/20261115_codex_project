import assert from 'node:assert/strict';
import {register} from 'node:module';
import {FootpathWalk,benchmarkLength,benchmarkPoint} from '../web/benchmark-trail.js';
import {lifeLength,lifePoint,lifeStops} from '../web/life-route.js';
import {plots,terrainHeight,walkingSurface,riverBridgeHeight} from '../web/large-world.js';
import {riverBridge,riverBridgePoint,waterAt} from '../web/water-system.js';
import {TOWN_BRIDGE} from '../web/settlement-layout.js';
import {moveInWorld} from '../web/cave-navigation.js';
import {vegetationPlacements} from '../web/vegetation-rules.js';
import {outletFloodModel,outletRise,wetlandFloodModel} from '../web/life-inundation.js';
import {buildWetlandModel} from '../web/wetland-layout.js';
import {buildWorldWaterBalance} from '../web/watershed-world.js';
import {clearWorldPlanQuery,setValleyLifeQuery} from '../web/expedition-url.js';

const expeditionUrl=suffix=>new URL('/expedition.html'+suffix,'http://127.0.0.1:52932');
const triassic=expeditionUrl('?v=latest&plan=deep-time&case=triassic&station=bar&phase=peak&view=dive&focus=water&note=ours#build-36');
clearWorldPlanQuery(triassic);
assert.equal(triassic.search,'?v=latest&note=ours');
assert.equal(triassic.hash,'#build-36');

const foundation=expeditionUrl('?plan=foundation&focus=inland&month=3&seam=east&stage=original#build-2');
clearWorldPlanQuery(foundation);
assert.equal(foundation.search,'?stage=original');
const unrecognized=expeditionUrl('?plan=__proto__&case=ours&epoch=recent#build-1');
clearWorldPlanQuery(unrecognized);
assert.equal(unrecognized.search,'?case=ours&epoch=recent');

const snow=expeditionUrl('?v=latest&walk=snow-to-deep&station=coastal-fog&epoch=interglacial&at=2306&plan=timeline&focus=warmth#ice-1');
clearWorldPlanQuery(snow);
assert.equal(snow.search,'?v=latest&walk=snow-to-deep&station=coastal-fog&epoch=interglacial&at=2306');
assert.equal(snow.hash,'#ice-1');
const snowWithGuide=expeditionUrl('?walk=snow-to-bay&guide=main&station=wetland&plan=deep-time&case=coal#ice-1');
clearWorldPlanQuery(snowWithGuide);
assert.equal(snowWithGuide.search,'?walk=snow-to-bay&guide=main&station=wetland');
const snowWithoutGuide=expeditionUrl('?walk=snow-to-bay&station=bank&epoch=interglacial&plan=timeline');
clearWorldPlanQuery(snowWithoutGuide);
assert.equal(snowWithoutGuide.search,'?walk=snow-to-bay&epoch=interglacial');

const valley=expeditionUrl('?v=latest&walk=snow-to-deep&station=coastal-fog&epoch=interglacial&at=2306&guide=main&stop=91&connection=north-fan&plan=deep-time&case=triassic&phase=peak&keep=yes#build-36');
setValleyLifeQuery(valley,0);
assert.equal(valley.search,'?v=latest&walk=valley-life&stop=0&keep=yes');
assert.equal(valley.hash,'#build-36');
setValleyLifeQuery(valley,4);
assert.equal(valley.searchParams.get('stop'),'4');
const atStation=valley.href;
for(const invalid of [-1,1.5,NaN,'5',Number.MAX_SAFE_INTEGER+1]){
  setValleyLifeQuery(valley,invalid);
  assert.equal(valley.href,atStation);
}
setValleyLifeQuery(valley,null);
assert.equal(valley.search,'?v=latest&keep=yes');
const offRoute=snow.href;
setValleyLifeQuery(snow,null);
assert.equal(snow.href,offRoute);

register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('three');
const {buildSettlement}=await import('../web/settlement-scene.js');
const {buildProduction}=await import('../web/production-scene.js');
const {buildTransport}=await import('../web/transport-scene.js');
const {buildGlacial}=await import('../web/glacial-scene.js');
const {buildLifeConnections}=await import('../web/life-route-scene.js');
const scene=new THREE.Scene(),obstacles=new Map();
const key=(x,z)=>Math.floor(x/16)+','+Math.floor(z/16);
function addObstacle(x,z,radius){
  const cell=key(x,z);
  if(!obstacles.has(cell))obstacles.set(cell,[]);
  obstacles.get(cell).push({x,z,radius});
}
const town=buildSettlement(scene,addObstacle,{textures:false});
buildProduction(scene,{textures:false,registerObstacle:addObstacle});
buildTransport(scene,{textures:false,registerObstacle:addObstacle});
const {boulders}=buildGlacial(scene,{textures:false});
for(const b of boulders)addObstacle(b.x,b.z,b.radius);
for(const p of vegetationPlacements()){
  if(p.layer==='canopy'&&p.kind!=='dead')addObstacle(p.x,p.z,(p.kind==='forestOak'?.55:p.kind==='forestBirch'?.36:.3)*p.scale);
}
const connections=buildLifeConnections(scene);
assert.equal(connections.children.length,2);
for(const mesh of connections.children){
  assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite),'new connector geometry is finite');
}
const deck=town.root.getObjectByName('Town bridge deck').geometry.attributes.position;
for(let i=0;i<deck.count;i++){
  const dx=deck.getX(i)-TOWN_BRIDGE.x,dz=deck.getZ(i)-TOWN_BRIDGE.z;
  if(Math.abs(dx*TOWN_BRIDGE.nx+dz*TOWN_BRIDGE.nz)<TOWN_BRIDGE.length/2-.001){
    assert.ok(deck.getY(i)>=TOWN_BRIDGE.y+.02,'rendered deck sides must stay above the water with the walking surface');
  }
}

function step(from,target){
  const {x,z,at}=target;
  const next=moveInWorld(from,x,z);
  assert.ok(next&&!next.indoor&&!next.survey&&!next.underground,`blocked at ${at.toFixed(2)} m at ${x},${z}`);
  for(const dx of [-16,0,16])for(const dz of [-16,0,16]){
    assert.ok((obstacles.get(key(x+dx,z+dz))??[]).every(p=>Math.hypot(x-p.x,z-p.z)>=p.radius+.32),
      `scene prop at ${at.toFixed(2)} m`);
  }
  assert.ok(plots.every(p=>Math.abs(x-p.x)>=p.halfX+.3||Math.abs(z-p.z)>=p.halfZ+.3),`plot at ${at.toFixed(2)} m`);
  const water=waterAt(x,z);
  if(water)assert.ok(next.y>=water.level+.35,'bridge or deck must support feet above the baseline water');
  return next;
}
const place=point=>({...point,y:walkingSurface(point.x,point.z),underground:false});
const walk=new FootpathWalk(lifeLength,lifePoint);
let current=place(lifePoint(0)),guidedSteps=0;
walk.playing=true;
while(walk.playing)walk.advance(2,target=>{current=step(current,target);guidedSteps++;return true;});
assert.ok(walk.done&&walk.obstacle===null);
assert.ok(lifeLength>2500&&lifeLength<2900);
assert.deepEqual(lifeStops.map(s=>s.id),['farm','village','market','road','bridge','dock','join','wetland','mouth','bay']);
assert.ok(Math.hypot(current.x-benchmarkPoint(benchmarkLength).x,current.z-benchmarkPoint(benchmarkLength).z)<.001);

// Smaller steps catch jumps at the old road edge and bridge approach in both directions.
const samples=Math.ceil(lifeLength/.09);
for(const [start,end] of [[0,lifeLength],[lifeLength,0]]){
  current=place(lifePoint(start));
  for(let i=1;i<=samples;i++)current=step(current,lifePoint(start+(end-start)*i/samples));
}
const span=riverBridge.length/2;
for(const side of [-1,1]){
  const end=side*(span+riverBridge.rampLength),point=riverBridgePoint(end);
  assert.equal(riverBridgeHeight(end),terrainHeight(point.x,point.z),'ramp joins the shore continuously');
  assert.equal(riverBridgeHeight(side*span),riverBridge.y,'ramp joins the bridge deck');
}
const outlet=outletFloodModel(terrainHeight);
const wetland=wetlandFloodModel(buildWetlandModel(buildWorldWaterBalance(),terrainHeight));
const newlyWet=outlet.levels.filter(level=>level!==null);
assert.ok(newlyWet.length>500&&wetland.newlyFlooded>1000,'both views show additional connected inundation');
for(const [i,level] of outlet.levels.entries()){
  if(level===null)continue;
  const p=outlet.points[i];
  assert.ok(outlet.high[i]&&!outlet.low[i]&&p.bed<level&&level-p.low<=outletRise+.001);
}
console.log(JSON.stringify({metres:Math.round(lifeLength),guidedSteps,fineStepsEachDirection:samples,
  stations:lifeStops.map(s=>({name:s.name,at:Math.round(s.at)})),
  outletNewWetSamples:newlyWet.length,wetlandNewFloodSquareMetres:Math.round(wetland.newlyFlooded)},null,2));

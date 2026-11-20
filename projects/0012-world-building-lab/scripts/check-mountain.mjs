import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {register} from 'node:module';
import {runInNewContext} from 'node:vm';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('three');
const {MOUNTAIN_SITES,MOUNTAIN_LEGS,CANYON_BRIDGE,cablePoint,linePoint,mountainPath,mountainWeight}=await import('../web/mountain-layout.js');
const {mountainView,mountainApproach}=await import('../web/mountain-learning.js');
const {constructionStops,constructionPath,settledConstructionPath,constructionObservation,constructionView}=await import('../web/construction-learning.js');
const {terrainHeight,walkingSurface,walkable,viewClear,LARGE_WORLD}=await import('../web/large-world.js');
const {moveInWorld}=await import('../web/cave-navigation.js');
const {buildMountain}=await import('../web/mountain-scene.js');
assert.ok(constructionStops.length>=106);assert.deepEqual(constructionStops.slice(27,34).map(r=>r.id),MOUNTAIN_SITES.map(r=>r.id));
const ids=new Set(constructionStops.flatMap(r=>[0,1,2,3].map(s=>constructionObservation(r.index,s).id)));assert.equal(ids.size,constructionStops.length*4);assert.equal(constructionStops.slice(0,27).flatMap(r=>[0,1,2,3].map(s=>constructionObservation(r.index,s).id)).length,108);
for(let i=0;i<=3600;i++){const a=settledConstructionPath(i/3600),b=constructionPath(i/3600*26/(constructionStops.length-1));assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-7,'Preserve all previous 27 stations and route positions');}
const scene=new THREE.Scene(),mountain=buildMountain(scene);scene.updateMatrixWorld(true);let meshCount=0;mountain.root.traverse(o=>{if(!o.isMesh)return;meshCount++;for(const a of Object.values(o.geometry.attributes))assert.ok([...a.array].every(Number.isFinite));});
assert.ok(meshCount>250);const layers=[];for(let stage=0;stage<4;stage++){mountain.setStage(stage);assert.equal(mountain.transport.visible,stage>=2);assert.equal(mountain.details.visible,stage>=3);layers.push({stage,transport:mountain.transport.visible,details:mountain.details.visible});}
const stations=MOUNTAIN_SITES.map((r,i)=>{const v=mountainView(i),p=constructionPath((27+i)/(constructionStops.length-1));assert.ok(walkable(r.x,r.z));assert.ok(viewClear(v),r.name+' needs an unobstructed terrain view');assert.equal(constructionView(27+i).y,v.y);assert.ok(Math.hypot(p.x-r.x,p.z-r.z)<1e-7);assert.ok(Math.abs(p.y-walkingSurface(r.x,r.z))<.07);return {name:r.name,height:walkingSurface(r.x,r.z),eye:v.y};});
assert.ok(stations[6].height>730&&stations[0].height<75);assert.equal(mountainWeight(470,-590),0,'Keep the older glacier district independent');
let walkingSamples=0,minBridgeGap=Infinity;
for(const leg of [0,1,2,4,5]){let p=mountainPath(leg/6);p={...p,y:walkingSurface(p.x,p.z),underground:false};for(let i=1;i<=2400;i++){const q=linePoint(MOUNTAIN_LEGS[leg],i/2400),next=moveInWorld(p,q.x,q.z);assert.ok(next,'The entire walking guide must work with actual movement, leg '+leg+' sample '+i);p=next;walkingSamples++;}}
for(let i=0;i<=300;i++){const p=linePoint(CANYON_BRIDGE,i/300);assert.ok(Math.abs(walkingSurface(p.x,p.z)-p.y)<.001);if(i>60&&i<240)minBridgeGap=Math.min(minBridgeGap,p.y-terrainHeight(p.x,p.z));}assert.ok(minBridgeGap>30,'Bridge must span actual empty canyon space');
let approachSamples=0,p={...mountainApproach(0),underground:false};for(let i=1;i<=16000;i++){const q=mountainApproach(i/16000),next=moveInWorld(p,q.x,q.z);assert.ok(next,'The town-to-mountain connector must be walkable at '+i);p=next;approachSamples++;}
function renderedHeight(x,z){const step=160/48,x0=Math.floor((x+1920)/step)*step-1920,z0=Math.floor((z+1600)/step)*step-1600,u=(x-x0)/step,v=(z-z0)/step,a=terrainHeight(x0,z0),b=terrainHeight(x0+step,z0),c=terrainHeight(x0,z0+step),d=terrainHeight(x0+step,z0+step);return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);}
let minCabinClearance=Infinity,minRenderedClearance=Infinity;
for(let i=50;i<=950;i++){const p=cablePoint(i/1000);mountain.moveCabin(i/1000);assert.ok(mountain.cabin.position.distanceTo(new THREE.Vector3(p.x,p.y,p.z))<1e-8);for(const dx of [-2,0,2])for(const dz of [-2,0,2]){minCabinClearance=Math.min(minCabinClearance,p.y-terrainHeight(p.x+dx,p.z+dz));minRenderedClearance=Math.min(minRenderedClearance,p.y-renderedHeight(p.x+dx,p.z+dz));}}
assert.ok(minCabinClearance>3&&minRenderedClearance>3,'The whole cabin floor must clear the rendered mountain between docks');
for(const t of [0,1]){const p=cablePoint(t),s=MOUNTAIN_SITES[t===0?3:4];assert.equal(p.y,s.y);assert.ok(Math.hypot(p.x-s.x,p.z-s.z)<1e-9);}
const source=readFileSync(new URL('../web/expedition.js',import.meta.url),'utf8');
const travelSource=source.slice(source.indexOf('function updateTour(dt){'),source.indexOf('function refreshCableUI'));let frames=0;
for(const down of [false,true]){let arrivals=0;const start=cablePoint(down?1:0),state={auto:true,phase:'travel',pace:1,feet:new THREE.Vector3(start.x,start.y,start.z),travel:{from:(down?31:30)/(constructionStops.length-1),to:(down?30:31)/(constructionStops.length-1),time:0,duration:32,destination:down?30:31,manualRide:true,start:new THREE.Vector3(start.x,start.y,start.z)}};
 const context={state,buildMode:true,waterMode:false,roadSample:constructionPath,walkingSurface,terrainHeight,LARGE_WORLD,mountainScene:mountain,lookAtPoint(){},arrive(index,auto){assert.equal(index,down?30:31);assert.equal(auto,false,'Manual ride must end on the platform without auto-running the next chapter');arrivals++;state.auto=false;}};
 runInNewContext(travelSource+'\nthis.advance=updateTour;',context);
 for(let i=0;i<750&&state.auto;i++){context.advance(.05);frames++;if(i===170){state.auto=false;const held=state.feet.clone();for(let j=0;j<10;j++)context.advance(.05);assert.equal(state.feet.distanceTo(held),0,'Paused cabin and passenger must stay together');state.auto=true;}if(state.riding)assert.ok(state.feet.distanceTo(mountain.cabin.position)<1e-7);}
 assert.equal(arrivals,1);assert.ok(Math.hypot(state.feet.x-(down?1220:1460),state.feet.z-(down?-950:-1140))<1e-7);
}
const html=readFileSync(new URL('../web/expedition.html',import.meta.url),'utf8');for(const id of ['cable-ride','cable-status','mountain-overview'])assert.ok(html.includes(`id="${id}"`));assert.ok(source.includes('if(state.riding){status('),'No walking out of an airborne cabin');assert.ok(source.includes("'mountain'].includes")||source.includes("'mountain'"));
const result={result:'passed',date:'2026-11-17',constructionStations:constructionStops.length,constructionObservations:constructionStops.length*4,oldObservationsPreserved:108,stations,meshCount,layers,walkingSamples,approachSamples,minBridgeGap,minCabinClearance,minRenderedClearance,automaticRideFrames:frames,bothDirections:true,pausePreserved:true,browserVisualCheck:'deferred by user: provide in-app browser entry only; in-app browser control unavailable and alternative Edge access not approved',limits:'CPU geometry, actual movement and controller tests; GPU appearance/performance not yet verified; authored mountain and single cabin, no rope dynamics or transport scheduling'};
writeFileSync(new URL('../assets/mountain-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

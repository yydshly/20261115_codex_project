import {karstField,karstWaterAt} from '../web/karst-layout.js';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('three');
const {geologyField}=await import('../web/geology-layout.js');
const {geologyWalkable}=await import('../web/geology-navigation.js');
const {CAVE_SITES,CAVE_WATER,caveProfile,caveField:legacyCaveField,caveVoidAt,caveWalkable:legacyCaveWalkable,caveGuide,caveStages}=await import('../web/cave-layout.js');
const caveField=(x,z,y=74)=>karstField(x,z,y,true)||geologyField(x,z)||legacyCaveField(x,z),caveWalkable=(x,z,y=74)=>{const f=karstField(x,z,y,true);return f?f.layer!=='shaft'&&(f.open||f.edge>.7)&&!(karstWaterAt(x,z)?.level>f.floor+.2):geologyField(x,z)?geologyWalkable(x,z):legacyCaveWalkable(x,z);};
const {moveInWorld,caveTravelPoint}=await import('../web/cave-navigation.js');
const {buildCave,cutCaveTerrain}=await import('../web/cave-scene.js');
const {terrainHeight,walkingSurface,walkable}=await import('../web/large-world.js');
const {constructionStops,constructionView,constructionPath,constructionObservation,constructionStagesFor,constructionNotebook}=await import('../web/construction-learning.js');
const scene=new THREE.Scene(),cave=buildCave(scene,{textures:false});
assert.ok(constructionStops.length>=106);
assert.deepEqual(constructionStops.slice(6,10).map(r=>r.id),CAVE_SITES.map(r=>r.id));
const ids=new Set(constructionStops.flatMap(r=>[0,1,2,3].map(s=>constructionObservation(r.index,s).id)));
assert.equal(ids.size,constructionStops.length*4);assert.equal((constructionNotebook(ids).match(/### ✓ 已浏览/g)||[]).length,constructionStops.length*4);
for(const id of ['plain','forest-edge','forest-dense','forest-understory','forest-gap','basin','lake','river','marsh','estuary','bay'])for(let s=0;s<4;s++)assert.ok(ids.has(`build-${id}:${s}`),'Preserve the previous 44 observation IDs');
const centre=caveField(CAVE_WATER.x,CAVE_WATER.z);assert.equal(centre.floor,CAVE_WATER.level-CAVE_WATER.depth);assert.equal(caveWalkable(CAVE_WATER.x,CAVE_WATER.z),false);
let minHeadroom=Infinity,minCover=Infinity;
for(let i=0;i<=1600;i++){const p=caveGuide(i/1600);if(!p.underground)continue;const f=caveField(p.x,p.z);assert.ok(caveWalkable(p.x,p.z));minHeadroom=Math.min(minHeadroom,f.ceiling-f.floor);if(p.x>85)minCover=Math.min(minCover,terrainHeight(p.x,p.z)-f.ceiling);}
assert.ok(minHeadroom>2.25&&minCover>10);
for(const [key,m] of Object.entries(cave.meshes)){for(const a of Object.values(m.geometry.attributes))assert.ok([...a.array].every(Number.isFinite),key);assert.ok([...m.geometry.index.array].every(i=>i<m.geometry.attributes.position.count));}
scene.updateMatrixWorld(true);
// Reproduce the actual mouth tile and test the clipping used by TerrainTiles.
const mouthGeo=new THREE.PlaneGeometry(160,160,128,128);mouthGeo.rotateX(-Math.PI/2);const v=mouthGeo.attributes.position;
for(let i=0;i<v.count;i++){const x=v.getX(i)+80,z=v.getZ(i)+400;v.setXYZ(i,x,terrainHeight(x,z),z);}const originalIndices=mouthGeo.index.count;cutCaveTerrain(mouthGeo);const mouthIndices=mouthGeo.index.count;
assert.ok(mouthIndices<originalIndices,'There must be a real opening in the hillside surface');
const terrainMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mouthMesh=new THREE.Mesh(mouthGeo,terrainMaterial);scene.add(mouthMesh);scene.updateMatrixWorld(true);
const stations=[];
for(const r of CAVE_SITES){const index=constructionStops.findIndex(s=>s.id===r.id),v=constructionView(index);assert.equal(v.underground,r.underground);assert.equal(constructionStagesFor(index).join('/'),caveStages.join('/'));const from=new THREE.Vector3(v.x,v.y,v.z),target=new THREE.Vector3(v.targetX,v.targetY,v.targetZ),length=from.distanceTo(target),ray=new THREE.Raycaster(from,target.clone().sub(from).normalize(),.06,length-.3),hits=ray.intersectObjects([...Object.values(cave.meshes),mouthMesh],false);assert.equal(hits.length,0,r.name+' default view must not be blocked by floor, roof, walls or hillside');stations.push({name:r.name,eyeHeight:v.y,underground:v.underground,terrainAbove:terrainHeight(v.x,v.z),caveFloor:r.underground?caveField(v.x,v.z).floor:null});}
let from=caveTravelPoint({...CAVE_SITES[0]});
for(let i=1;i<=1600;i++){const target=caveTravelPoint(caveGuide(i/1600)),next=moveInWorld(from,target.x,target.z);assert.ok(next,'The entrance and entire dry guide need continuous walking support');from=next;}
assert.equal(from.underground,true);
for(let i=1599;i>=0;i--){const target=caveTravelPoint(caveGuide(i/1600)),next=moveInWorld(from,target.x,target.z);assert.ok(next,'Walking must return through the same mouth without jumping to the roof');from=next;}
assert.equal(from.underground,false);
const below=caveTravelPoint({...CAVE_SITES[2]}),above={x:below.x,z:below.z,y:walkingSurface(below.x,below.z),underground:false};
assert.ok(above.y-below.y>20);assert.equal(moveInWorld(above,above.x+.1,above.z).underground,false);assert.equal(moveInWorld(below,below.x+.1,below.z).underground,true);
assert.equal(moveInWorld(below,below.x,caveProfile(below.x).z+40),null,'Do not escape through a side wall');
assert.equal(moveInWorld(caveTravelPoint({...CAVE_SITES[3]}),CAVE_WATER.x,CAVE_WATER.z),null,'Deep underground water must block walking');
let underSamples=0,maxMicroStep=0;
for(let i=0;i<=12000;i++){const t=i/12000,p=constructionPath(t),n=constructionPath(Math.min(1,t+1e-8*26/(constructionStops.length-1)));assert.ok(p.warm?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.boreal?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.upland?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.yardang?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.volcanic?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.fan?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.strata?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.saline?(p.survey||p.shaftRide?Number.isFinite(p.y):p.underground?caveWalkable(p.x,p.z,p.y):walkable(p.x,p.z)):p.karst?(p.survey||p.shaftRide?Number.isFinite(p.y):p.underground?caveWalkable(p.x,p.z,p.y):walkable(p.x,p.z)):p.geology?(p.survey?p.y>=terrainHeight(p.x,p.z):p.underground?caveWalkable(p.x,p.z):walkable(p.x,p.z)):p.riding?Number.isFinite(p.y):p.dryland?p.y>=terrainHeight(p.x,p.z):p.tropical?p.y>=terrainHeight(p.x,p.z):p.ocean?p.y>=terrainHeight(p.x,p.z):p.survey?Math.abs(p.y-terrainHeight(p.x,p.z))<1e-8:p.underground?caveWalkable(p.x,p.z):walkable(p.x,p.z));if(p.underground&&!p.shaftRide){underSamples++;assert.ok(Math.abs(p.y-caveField(p.x,p.z,p.y).floor)<1e-7);}maxMicroStep=Math.max(maxMicroStep,Math.hypot(p.x-n.x,p.z-n.z));}
assert.ok(underSamples>1500*26/(constructionStops.length-1)&&maxMicroStep<.025);
for(let i=0;i<constructionStops.length;i++){const p=constructionPath(i/(constructionStops.length-1)),r=constructionStops[i];assert.ok(Math.hypot(p.x-r.x,p.z-r.z)<1e-6);assert.equal(!!p.underground,!!r.underground);}
cutCaveTerrain(mouthGeo,true);assert.ok(mouthGeo.index.count<mouthIndices);cutCaveTerrain(mouthGeo,false);assert.equal(mouthGeo.index.count,mouthIndices,'Cutaway must restore the regular opening without losing terrain');
const sectionTiles=[];for(const tx of [0,160])for(const tz of [320,480]){const g=new THREE.PlaneGeometry(160,160,64,64);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)+tx+80,z=p.getZ(i)+tz+80;p.setXYZ(i,x,terrainHeight(x,z),z);}cutCaveTerrain(g,true);const m=new THREE.Mesh(g,terrainMaterial);m.updateMatrixWorld(true);sectionTiles.push(m);}
for(const eye of [new THREE.Vector3(167,310,535),new THREE.Vector3(167,410,600)])for(const r of CAVE_SITES){const target=new THREE.Vector3(r.x,r.underground?caveField(r.x,r.z).floor+1:walkingSurface(r.x,r.z)+1,r.z),ray=new THREE.Raycaster(eye,target.clone().sub(eye).normalize(),0,eye.distanceTo(target)-.4);const hits=ray.intersectObjects(sectionTiles,false);assert.equal(hits.length,0,'Cutaway '+r.id+' eye '+eye.toArray()+' blocked at '+hits[0]?.point.toArray());}
cave.setCutaway(true);assert.equal(cave.meshes.roof.visible,false);assert.equal(cave.meshes.right.visible,false);assert.equal(cave.wire.visible,true);cave.setCutaway(false);assert.equal(cave.meshes.roof.visible,true);
const controller=readFileSync(new URL('../web/expedition.js',import.meta.url),'utf8'),source=controller.slice(controller.indexOf('function setLayer(stage){'),controller.indexOf('function updateLesson'));
assert.ok(!source.includes('initialize()'));
const context={state:{index:8,feet:below,overview:false,caveOverview:false},stops:constructionStops,buildMode:true,climateUI:null,vegetationMode:false,marineScene:{setStage(){}},settlementScene:{setStage(){}},mountainScene:{setStage(){},moveCabin(){}},productionScene:{setStage(){}},transportScene:{setStage(){}},northScene:null,linkScene:null,warmScene:null,borealScene:null,uplandScene:null,yardangScene:null,volcanicScene:null,fanScene:null,strataScene:null,saltScene:null,karstScene:null,geologyScene:{setStage(){},setCutaway(){}},drylandScene:{setStage(){}},tropicalScene:{setStage(){}},oceanScene:{setStage(){}},polarScene:{setStage(){}},tiles:{setStage(){}},sceneStage(){},waterScene:{setStage(){}},inlandScene:{setStage(){}},forestScene:{setStage(){}},caveScene:cave,glacialScene:{setStage(){}},analysisLabels:()=>constructionStagesFor(context.state.index),water:{visible:true},plantLayers:{canopy:1,understory:1,ground:1,aquatic:1},vegetationScene:{setLayer(){}},setConditions(){},updateForest(){},refreshVegetationUI(){},document:{querySelectorAll(){return [];}},constructionStagesFor};
runInNewContext(source+'\nthis.applyLayer=setLayer;',context);
const layerChecks=[];for(let stage=0;stage<4;stage++){context.applyLayer(stage);assert.equal(cave.water.visible,stage>=2);assert.equal(cave.details.visible,stage===3);assert.equal(cave.meshes.floor.material===cave.meshes.roof.material,stage===0);layerChecks.push({stage,water:cave.water.visible,formations:cave.details.visible});}
// Run the actual travel update across all construction legs, especially the entrance boundary.
const travelSource=controller.slice(controller.indexOf('function updateTour(dt){'),controller.indexOf('function tick(time='));assert.ok(travelSource.startsWith('function updateTour')&&!travelSource.includes('requestAnimationFrame'));
let automaticTravelFrames=0;
for(let leg=0;leg<constructionStops.length-1;leg++){const start=constructionPath(leg/(constructionStops.length-1)),feet=new THREE.Vector3(start.x,start.y,start.z),travelState={auto:true,phase:'travel',pace:1,feet,roadT:leg/(constructionStops.length-1),underground:!!start.underground,travel:{from:leg/(constructionStops.length-1),to:(leg+1)/(constructionStops.length-1),time:0,duration:8,start:feet.clone(),destination:leg+1}},travelContext={$:()=>({textContent:""}),northScene:null,linkScene:null,warmScene:null,borealScene:null,uplandScene:null,yardangScene:null,volcanicScene:null,fanScene:null,strataScene:null,saltScene:null,karstScene:{moveLift(){}},mountainScene:{moveCabin(){}},state:travelState,buildMode:true,waterMode:false,roadSample:constructionPath,walkingSurface,terrainHeight,LARGE_WORLD:{eye:1.72},lookAtPoint(){},arrive(){travelState.auto=false;}};
 runInNewContext(travelSource+'\nthis.travel=updateTour;',travelContext);
 for(let i=0;i<=160&&travelState.auto;i++){travelContext.travel(.05);automaticTravelFrames++;if(travelState.underground&&!travelState.shaftRide){const f=caveField(feet.x,feet.z,feet.y);assert.ok(f,'Underground camera state must correspond to its actual position');assert.ok(Math.abs(feet.y-f.floor)<1e-6,'Never lift the camera to the roof terrain during travel');}assert.ok([feet.x,feet.y,feet.z].every(Number.isFinite));}
 assert.ok(Math.hypot(feet.x-constructionStops[leg+1].x,feet.z-constructionStops[leg+1].z)<1e-6);
}
const result={result:'passed',stations,constructionStations:constructionStops.length,observations:constructionStops.length*4,oldObservationsPreserved:44,minDryGuideHeadroom:minHeadroom,minGuideRockCover:minCover,maximumWaterDepth:CAVE_WATER.depth,waterLevel:CAVE_WATER.level,waterBed:centre.floor,mouthTrianglesRemoved:(originalIndices-mouthIndices)/3,walkingRoundTripSamples:3200,wholeRouteSamples:12001,undergroundRouteSamples:underSamples,automaticTravelFrames,maxMicroStep,formations:cave.formations.length,layerChecks,browserVisualCheck:'not part of this CPU script; see settlement-browser-check.json for partial browser verification',limits:'CPU geometry, ray, movement and controller checks; not rendered-image, cave geology, groundwater flow or full game physics validation'};
writeFileSync(new URL('../assets/cave-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

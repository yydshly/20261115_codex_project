import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const THREE=await import('three');
const {terrainHeight}=await import('../web/large-world.js');
const {buildWorldWaterBalance}=await import('../web/watershed-world.js');
const {environmentLines}=await import('../web/environment-lines.js');
const {createWatershedBalanceScene,clippedWaterGeometry}=await import('../web/watershed-balance-scene.js');
const {wetlandPhases,wetlandLinks,connectedWetCells,buildWetlandModel}=await import('../web/wetland-layout.js');
const {createWetlandScene}=await import('../web/wetland-scene.js');

const grid=Array.from({length:15},(_,i)=>({x:i%5,z:Math.floor(i/5),bed:-1,breadth:i%5-2}));
const depth=p=>[0,1,2,5,10,14].includes(p.z*5+p.x)?1:-1;
const mask=connectedWetCells(grid,5,depth);
assert.deepEqual([...mask.keys()].filter(k=>mask[k]),[0,1,2,5,10]);

const world=buildWorldWaterBalance(),model=buildWetlandModel(world,terrainHeight);
const stages=Object.fromEntries(wetlandPhases.map(phase=>[phase.id,model.frameFor(phase)]));
assert.equal(stages.high.waterStage,world.frames[6].records.wetland.stage);
assert.equal(stages.low.waterStage,world.frames[0].records.wetland.stage);
assert.ok(stages.high.floodedBank>1900&&stages.low.floodedBank===0);
assert.ok(stages.day7.exposed>1100&&stages.day30.exposed<stages.day7.exposed);
assert.ok(wetlandPhases.every((p,i)=>i===0||stages[p.id].flooded<=stages[wetlandPhases[i-1].id].flooded));
assert.ok(stages.day7.survey.waterMask===model.frameFor(wetlandPhases[2]).survey.waterMask);
const firstSite=model.stations[0],seasonal=model.stations.find(p=>p.id==='seasonal');
const permanent=model.stations.find(p=>p.id==='permanent');
const reading=(f,{point:p})=>f.readings[p.row*(model.cols+1)+p.col];
assert.ok(reading(stages.high,seasonal).flooded&&!reading(stages.day7,seasonal).flooded);
assert.ok(reading(stages.day7,seasonal).damp&&!reading(stages.low,seasonal).damp);
assert.ok(reading(stages.low,permanent).flooded&&reading(stages.low,firstSite).flooded);
for(const plant of model.plants){
  const p=model.points[plant.index];
  assert.notEqual(p.band,'channel');
  assert.equal(plant.y,terrainHeight(plant.x,plant.z));
  if(plant.kind==='willow')assert.equal(p.months,0);
}
assert.ok(model.plants.some(p=>p.kind==='sedge'&&model.points[p.index].band==='seasonal'));
assert.ok(model.plants.some(p=>p.kind==='reed'&&model.points[p.index].band==='permanent'));
for(const route of environmentLines){
  assert.ok(wetlandLinks[route.id].overview);
  for(const [key,id] of Object.entries(wetlandLinks[route.id])){
    assert.ok(key==='overview'||route.stops.some(s=>s.id===key));
    assert.ok(model.stations.some(s=>s.id===id));
  }
}

const calls=[],view=new THREE.Scene(),original={setLocalMask:predicate=>calls.push(predicate)};
const scene=createWetlandScene(view,{model:world,show:(...flags)=>calls.push(flags),hide:()=>calls.push('restore')},original);
assert.equal(scene.show({phase:wetlandPhases[0],overlay:true}).labels.length,2);
scene.hide();
assert.deepEqual(calls.map(p=>typeof p),['function','object']);
scene.show({phase:wetlandPhases[0]});
assert.equal(calls.at(-1)[3].riverSurvey.stage,stages.high.waterStage);
scene.show({phase:wetlandPhases[2],station:scene.model.stations[2],layer:'bands'});
assert.equal(calls.at(-1)[3].riverSurvey.stage,stages.day7.waterStage);
view.traverse(o=>{
  const p=o.geometry?.getAttribute('position');
  if(p)assert.ok(p.array.every(Number.isFinite),o.name||o.type);
});
scene.hide();
assert.deepEqual(calls.slice(-2),[null,'restore']);

const material=new THREE.MeshStandardMaterial(),mesh=()=>new THREE.Mesh(new THREE.BufferGeometry(),material);
const water={river:mesh(),flowMaterial:material},inland={lake:mesh(),channels:mesh()},salt={water:mesh()};
const baseScene=new THREE.Scene(),balance=createWatershedBalanceScene(baseScene,{
  water,inland,salt,weather:{setAnnualClimate(){}},reduced:true
});
const phase=wetlandPhases[2],survey=stages.day7.survey;
balance.show(7,'wetland','water',{riverSurvey:survey});
const waterMesh=baseScene.children[0].children[0],retreat=waterMesh.geometry;
const river=world.patches.river,full=clippedWaterGeometry(river,p=>p.bed+1);
const skipped=clippedWaterGeometry(river,p=>p.bed+1,{waterMask:new Uint8Array(river.bed.length)});
assert.ok(full.getAttribute('position').count>0);
assert.equal(skipped.getAttribute('position').count,0);
balance.show(7,'wetland','water');
assert.notEqual(waterMesh.geometry,retreat,'Leaving the wetland survey should refresh the unchanged month.');
balance.hide();
assert.ok(water.river.visible);
console.log('Connected flooding, dry exposure, stable plant zones, day-7 moisture and original scene restoration passed.');

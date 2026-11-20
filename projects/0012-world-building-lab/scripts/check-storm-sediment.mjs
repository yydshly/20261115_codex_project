import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const {terrainHeight}=await import('../web/large-world.js');
const {buildWorldWaterBalance}=await import('../web/watershed-world.js');
const {stormCatchment,runStormComparison,stormSettings}=await import('../web/basin-storm.js');
const {buildEstuaryModel}=await import('../web/estuary-layout.js');
const {buildShoreEvolution,makeShoreSurvey,shoreBenchmarks,stormSediment,sedimentPlume}=await import('../web/storm-sediment.js');
const {clippedWaterGeometry}=await import('../web/watershed-balance-scene.js');

const world=buildWorldWaterBalance(),catchment=stormCatchment(world);
const trial=runStormComparison(world,catchment);
const {flood,ebb}=trial.scenarios;
assert.deepEqual(flood.frames.map(f=>f.sedimentIn),ebb.frames.map(f=>f.sedimentIn));
const rising=stormSediment(flood),falling=stormSediment(ebb);
for(const simulation of [rising,falling]){
  assert.ok(simulation.frames.every(f=>Math.abs(f.residual)<1e-8));
  assert.ok(simulation.frames.every(f=>f.deposited>=0&&f.exported>=0&&f.suspended>=0));
}
const h=trial.referencePeak,high=rising.frames[h],low=falling.frames[h];
assert.ok(high.velocity[3]<0&&low.velocity[3]>0);
assert.ok(high.centre<low.centre&&high.deposited>low.deposited&&high.exported<low.exported);
assert.ok(sedimentPlume(high,.862,.25)>sedimentPlume(low,.862,.25));
assert.ok(sedimentPlume(low,.922,.25)>sedimentPlume(high,.922,.25));
assert.ok(high.marsh[1]>high.marsh[0]&&low.marsh[1]>low.marsh[0]);

const model=buildEstuaryModel(world,terrainHeight),survey=makeShoreSurvey(model);
const initial=model.frame('dry','ebb'),evolution=buildShoreEvolution(model,survey,[rising,falling]);
let previousArea=-1;
for(const count of shoreBenchmarks){
  const snapshot=evolution.at(count);
  const revised=model.frame('dry','ebb',null,snapshot.bedChange);
  assert.deepEqual(revised.levels,initial.levels);
  const sampledVolume=snapshot.bedChange.reduce((sum,lift,i)=>sum+lift*survey.area[i],0);
  const expectedVolume=rising.final.deposited*Math.ceil(count/2)+falling.final.deposited*Math.floor(count/2);
  assert.ok(Math.abs(sampledVolume-snapshot.stored)<1e-7);
  assert.ok(Math.abs(expectedVolume-snapshot.stored-snapshot.excess)<1e-7);
  const exposed=survey.area.reduce((sum,area,i)=>sum+(initial.wet[i]&&!revised.wet[i]
    &&revised.bed[i].bed>=revised.levels[i]?area:0),0);
  assert.ok(exposed>previousArea);previousArea=exposed;
}
const latest=evolution.at(shoreBenchmarks.at(-1));
const p=model.bed[latest.bedChange.findIndex(n=>n>.05)];
assert.ok(model.deltaAt(latest.bedChange,p.x,p.z)>.05);
const after=model.frame('dry','ebb',null,latest.bedChange);
const clip=frame=>clippedWaterGeometry({bed:frame.bed,cells:model.cells},
  p=>frame.levels[p.row*model.cols+p.col],
  {waterMask:frame.wet,heightAt:(x,z)=>terrainHeight(x,z)+model.deltaAt(latest.bedChange,x,z)*(frame===after?1:0)});
const beforeMesh=clip(initial),afterMesh=clip(after);
assert.notDeepEqual(beforeMesh.userData.shoreline,afterMesh.userData.shoreline);
beforeMesh.dispose();afterMesh.dispose();
const reset=buildShoreEvolution(model,survey,[rising,falling]);
reset.at(shoreBenchmarks.at(-1));
assert.equal(reset.at(0).stored,0);
assert.deepEqual(reset.at(40).bedChange,evolution.at(40).bedChange);

const dry=runStormComparison(world,catchment,{...stormSettings,rain:0});
const drySediment=stormSediment(dry.scenarios.flood);
assert.ok(drySediment.frames.every(f=>f.supplied===0&&f.suspended===0&&f.deposited===0&&f.exported===0));
assert.equal(buildShoreEvolution(model,survey,[drySediment]).at(800).stored,0);

console.log(JSON.stringify({hour:h,suspendedCentre:[high.centre,low.centre],deposited:[high.deposited,low.deposited],
  exported:[high.exported,low.exported],stableShoreArea:previousArea,stored:latest.stored},null,2));

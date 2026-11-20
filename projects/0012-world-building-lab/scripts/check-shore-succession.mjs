import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const {terrainHeight}=await import('../web/large-world.js');
const {buildWorldWaterBalance}=await import('../web/watershed-world.js');
const {stormCatchment,runStormComparison}=await import('../web/basin-storm.js');
const {buildEstuaryModel}=await import('../web/estuary-layout.js');
const {buildShoreEvolution,makeShoreSurvey,shoreEventLimit,stormSediment}=await import('../web/storm-sediment.js');
const {bankTestFloods,growNewShore,surveyNewShore,testNewShore}=await import('../web/shore-succession.js');
const {shorePlantSites}=await import('../web/shore-succession-scene.js');

const world=buildWorldWaterBalance(),model=buildEstuaryModel(world,terrainHeight),survey=makeShoreSurvey(model);
const {scenarios}=runStormComparison(world,stormCatchment(world));
const sediment=stormSediment(scenarios.flood);
const evolution=buildShoreEvolution(model,survey,[sediment,stormSediment(scenarios.ebb)]);
const seed=evolution.at(shoreEventLimit),habitat=surveyNewShore(model,survey,seed);
const original=model.frame('dry','ebb');
assert.ok(habitat.area>0);
assert.ok(habitat.cells.every(p=>original.wet[p.i]&&!habitat.start.wet[p.i]&&p.height>=habitat.start.levels[p.i]));
assert.ok(habitat.cells.every(p=>p.frequency>=0&&p.frequency<=1&&(p.frequency===0)===(p.salt===null)));

const start=growNewShore(habitat,0),first=growNewShore(habitat,1),grown=growNewShore(habitat,8);
assert.equal(start.bareArea,habitat.area);
assert.ok(first.saltGrassArea>0&&first.reedArea===0);
assert.ok(grown.reedArea>0&&grown.bareArea<first.bareArea);
assert.ok(grown.patches.every(p=>p.cover>=0&&p.cover<=1&&(!p.reedCover||p.salt<5.6)));
assert.ok(grown.patches.filter(p=>p.frequency===0).every(p=>p.cover===0));
const sites=shorePlantSites(grown.patches);
assert.ok(sites.reed.salt<sites.rush.salt);

const control=testNewShore(model,survey,habitat,start,scenarios.flood,sediment);
assert.deepEqual(control.bare,control.grown);
const comparison=testNewShore(model,survey,habitat,grown,scenarios.flood,sediment);
assert.equal(comparison.budget,bankTestFloods*sediment.final.exportedFine);
assert.ok(comparison.grown.retained>comparison.bare.retained);
assert.ok(comparison.grown.eroded<comparison.bare.eroded);
assert.ok(comparison.grown.retreat<comparison.bare.retreat);
for(const row of [comparison.bare,comparison.grown]){
  const volume=row.shape.bedChange.reduce((n,value,i)=>n+(value-seed.bedChange[i])*survey.area[i],0);
  assert.ok(Math.abs(volume-row.retained+row.eroded)<1e-7);
  assert.ok(Math.abs(row.exported+row.retained-row.eroded-comparison.budget)<1e-7);
  assert.equal(row.retreat,habitat.cells.reduce((n,p)=>n+(row.wet[p.i]?p.area:0),0));
}
const empty=surveyNewShore(model,survey,evolution.at(0));
assert.equal(empty.area,0);
assert.equal(growNewShore(empty,8).reedArea,0);
assert.equal(testNewShore(model,survey,empty,growNewShore(empty,8),scenarios.flood,sediment).grown.retreat,0);

console.log(JSON.stringify({initialArea:habitat.area,firstGrass:first.saltGrassArea,
  year8:{grass:grown.saltGrassArea,reed:grown.reedArea},
  saltSamples:{grass:sites.rush.salt,reed:sites.reed.salt},
  scenario:'flood',retained:[comparison.bare.retained,comparison.grown.retained],
  lostShore:[comparison.bare.retreat,comparison.grown.retreat]},null,2));

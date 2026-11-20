import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const {terrainHeight}=await import('../web/large-world.js');
const {buildWorldWaterBalance}=await import('../web/watershed-world.js');
const {stormCatchment,runStormComparison}=await import('../web/basin-storm.js');
const {buildEstuaryModel}=await import('../web/estuary-layout.js');
const {buildShoreEvolution,makeShoreSurvey,shoreEventLimit,stormSediment}=await import('../web/storm-sediment.js');
const {growNewShore,surveyNewShore}=await import('../web/shore-succession.js');
const {compareSeaChange,moveShorePlants,seaMask,seaSettings}=await import('../web/shore-sea-change.js');

const world=buildWorldWaterBalance(),model=buildEstuaryModel(world,terrainHeight),survey=makeShoreSurvey(model);
const {scenarios}=runStormComparison(world,stormCatchment(world));
const morph=buildShoreEvolution(model,survey,[stormSediment(scenarios.flood),stormSediment(scenarios.ebb)]);
const shape=morph.at(shoreEventLimit),original=shape.bedChange.slice();
const habitat=surveyNewShore(model,survey,shape),growth=growNewShore(habitat,8);
const test=(settings,patches=growth)=>compareSeaChange(model,survey,shape,habitat,patches,settings);
const calm=test({rise:0,surge:0});
assert.ok(Object.values(calm.stats).every(n=>n===0));
assert.deepEqual(calm.stages.before.frame.wet,calm.stages.after.frame.wet);
assert.equal(moveShorePlants(model,survey,growth,calm,{rise:0,surge:0}).routes.length,0);
const riseOnly=test({...seaSettings,surge:0}),stormOnly=test({...seaSettings,rise:0});
assert.ok(riseOnly.stats.permanentArea>0);
assert.equal(riseOnly.stats.volume,0);
assert.equal(stormOnly.stats.permanentArea,0);
assert.ok(stormOnly.stats.temporaryArea>0);

const coastal=test(seaSettings),{before,rise,peak,after}=coastal.stages;
assert.equal(rise.frame.tide.height,after.frame.tide.height);
assert.ok(Math.abs(peak.frame.tide.height-before.frame.tide.height-seaSettings.rise-seaSettings.surge)<1e-12);
assert.ok(coastal.stats.temporaryArea>coastal.stats.permanentArea);
assert.ok(coastal.stats.scourWet>0&&coastal.stats.newLandPeak>coastal.stats.newLandRise);
assert.deepEqual(shape.bedChange,original);
const lost=after.shape.bedChange.reduce((n,value,i)=>n+(original[i]-value)*survey.area[i],0);
assert.ok(Math.abs(lost-coastal.stats.volume)<1e-8);
assert.ok(after.shape.bedChange.every((value,i)=>value>=0&&value<=original[i]));
assert.ok(coastal.depths.every((value,i)=>value===0||peak.frame.wet[i]));
assert.ok(coastal.masks.every((value,i)=>!(value&seaMask.temporary)||!before.frame.wet[i]&&!rise.frame.wet[i]&&peak.frame.wet[i]));
assert.ok(test(seaSettings,growNewShore(habitat,0)).stats.volume>coastal.stats.volume);

const migration=moveShorePlants(model,survey,growth,coastal,seaSettings);
assert.ok(migration.grassMoved>0&&migration.reedMoved>0&&migration.lostCover>0);
assert.deepEqual(migration.routes.map(r=>r.kind).sort(),['grass','reed']);
const old=new Map(growth.patches.map(p=>[p.i,p]));
for(const {corridor} of migration.routes){
  assert.ok(corridor.length>1&&corridor.length<=13);
  const start=old.get(corridor[0]),end=after.frame.bed[corridor.at(-1)];
  assert.ok(start.cover>0&&end.bed>start.height);
  for(let i=1;i<corridor.length;i++)assert.ok(Math.hypot(after.frame.bed[corridor[i]].x-after.frame.bed[corridor[i-1]].x,
    after.frame.bed[corridor[i]].z-after.frame.bed[corridor[i-1]].z)<=5.01);
}
assert.ok(migration.growth.patches.every(p=>!p.reedCover||p.salt<5.6));
const bare=growNewShore(habitat,0);
assert.equal(moveShorePlants(model,survey,bare,test(seaSettings,bare),seaSettings).grassMoved,0);

console.log(JSON.stringify({settings:seaSettings,levels:Object.values(coastal.stages).map(s=>s.frame.tide.height),
  ...coastal.stats,grassMigration:migration.grassMoved,reedMigration:migration.reedMoved,lostCover:migration.lostCover},null,2));

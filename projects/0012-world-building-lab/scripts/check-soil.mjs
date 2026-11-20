import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const THREE=await import('three');
const {createSoilModel,soilStops,transectPosition,soilPlacements}=await import('../web/soil-model.js');
const {createSoilScene,soilProbes}=await import('../web/soil-scene.js');
const {buildSedimentYear}=await import('../web/sediment-model.js');
const {buildWorldWaterBalance}=await import('../web/watershed-world.js');

const world=buildWorldWaterBalance(),sediment=buildSedimentYear(world),model=createSoilModel(world,sediment);
const observations={};
for(const stop of soilStops){
  const samples=soilProbes.map(t=>{
    const {x,z}=transectPosition(stop,t);
    return model.sample(stop.id,x,z);
  });
  for(const s of samples){
    assert.ok(s.rootDepth>0&&Math.abs(s.topsoil+s.subsoil+s.material-s.rootDepth)<1e-8);
    assert.ok(s.fine+s.gravel<=1);
    assert.equal(s.months.length,12);
    for(const m of s.months)assert.ok(m.moisture>=0&&m.moisture<=1&&m.salt>=0&&m.salt<=1);
  }
  const plants=soilPlacements(model,stop),counts={};
  for(const {kind,sample} of plants){
    assert.ok(!sample.months.every(m=>m.depth>.46));
    if(stop.id==='mouth'&&sample.salt>.33)assert.ok(kind==='rush'||kind==='coastShrub');
    counts[kind]=(counts[kind]??0)+1;
  }
  observations[stop.id]={samples,counts};
}
const {head,fan,flood,mouth}=observations;
assert.ok(head.samples[0].slope>head.samples[2].slope&&head.samples[0].rootDepth<head.samples[2].rootDepth);
assert.ok(fan.samples[0].gravel>fan.samples[2].gravel&&fan.samples[0].wetness<fan.samples[2].wetness);
assert.ok(!flood.samples[1].months[0].flooded&&flood.samples[1].months[6].flooded);
assert.ok(flood.samples[1].fine>fan.samples[1].fine);
assert.ok(mouth.samples[0].salt>mouth.samples[2].salt+.3);
assert.ok(mouth.samples[0].months[0].salt>mouth.samples[0].months[6].salt);
assert.ok(flood.counts.reed>0&&flood.counts.sedge>0&&mouth.counts.rush>0&&mouth.counts.coastShrub>0);
assert.equal(model.freshDeposit('flood',7).volume,sediment.frames[6].reaches.flood.overbank.fine);

const scene=new THREE.Scene(),plants=[new THREE.Group(),new THREE.Group()],water=[];
plants[1].visible=false;
const layer=createSoilScene(scene,{model:world,show(...args){water.push(args);},hide(){water.push('restored');}},
  {model:sediment},{originalPlants:plants});
layer.show(7,'head','profile',0);
const group=scene.getObjectByName('soil and plant transitions');
const profile=group.getObjectByName('soil profile head'),surface=group.getObjectByName('soil surface head');
assert.ok(group.visible&&profile.visible&&plants.every(p=>!p.visible));
assert.ok(profile.geometry.attributes.position.count>100&&surface.geometry.attributes.color.itemSize===4);
assert.ok(profile.geometry.attributes.position.array.every(Number.isFinite));
layer.show(1,'mouth','plants',0);
const foliage=group.getObjectByName('soil plants mouth');
const mesh=foliage.children[0].children[0];
const oldPositions=mesh.instanceMatrix.array.slice(),oldColors=mesh.instanceColor.array.slice();
layer.show(7,'mouth','plants',0);
assert.ok(foliage.visible&&oldPositions.every((v,i)=>v===mesh.instanceMatrix.array[i]));
assert.ok(oldColors.some((v,i)=>v!==mesh.instanceColor.array[i]));
layer.show(7,'all','profile',1);
assert.ok(!profile.visible&&surface.parent.visible);
layer.hide();
assert.ok(!group.visible&&plants[0].visible&&!plants[1].visible&&water.at(-1)==='restored');

console.log(JSON.stringify(Object.fromEntries(Object.entries(observations).map(([id,{samples,counts}])=>[id,{
  soilCm:samples.map(s=>Math.round(s.rootDepth)),coarse:samples.map(s=>Math.round(s.gravel*100)),
  salinityJanJuly:samples.map(s=>[s.months[0],s.months[6]].map(m=>Math.round(m.salt*100))),
  floodJanJuly:samples.map(s=>[s.months[0].flooded,s.months[6].flooded]),plantCounts:counts
}])),null,2));

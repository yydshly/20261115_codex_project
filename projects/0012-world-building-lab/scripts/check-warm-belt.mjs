import assert from 'node:assert/strict';
import {register} from 'node:module';
import {buildWorldWaterBalance} from '../web/watershed-world.js';
import {makeWarmBelt,warmPlantPlan,warmStops} from '../web/warm-belt.js';
import {terrainHeight} from '../web/large-world.js';
import {gapFor} from '../web/environment-gaps.js';

register('./three-test-loader.mjs',import.meta.url);
const {Scene,Matrix4}=await import('three');
const {makeWarmBeltScene}=await import('../web/warm-belt-scene.js');
const world=buildWorldWaterBalance(),model=makeWarmBelt(world),{wet,dry}=model.views;
const reading=(id,season)=>model.read(warmStops.find(p=>p.id===id),season);
assert.equal(warmStops.length,7);
assert.ok(model.profile.length>1350&&model.profile.length<1530);
assert.ok(model.profile.points.every(p=>p.y===terrainHeight(p.x,p.z)));
assert.ok(reading('windward','wet').lift>0&&!reading('windward','wet').lee);
const lee=model.read({x:-550,z:1109},'wet');
assert.ok(lee.lift<0&&lee.lee&&lee.rain<reading('windward','wet').rain*.35);
assert.ok(reading('flood-grass','wet').moisture>reading('flood-grass','dry').moisture+.1);
assert.notEqual(reading('ridge','wet').wind,reading('ridge','dry').wind);
assert.ok(wet.q>dry.q&&wet.rise>dry.rise);

for(const key of ['river','swale']){
  assert.equal(dry[key].area,0);
  assert.ok(wet[key].area>200);
  const view=wet[key];
  for(const [i,p] of view.ground.bed.entries()){
    if(view.extra[i])assert.ok(view.mask[i]&&view.level(p)>p.bed&&p.bed>=view.referenceAt(p));
  }
}
assert.ok(wet.river.ground.bed.every(p=>p.x<-1100)&&wet.swale.ground.bed.every(p=>p.x>-500));
const plants=warmPlantPlan(model);
assert.ok(plants.wood.length>8&&plants.grass.some(p=>p.flooded)&&plants.banks.some(p=>p.flooded));

const scene=new Scene(),controller=makeWarmBeltScene(scene,()=>world);
controller.show({season:'wet',layer:'water',stop:warmStops[4]});
const root=scene.getObjectByName('southwest rainforest to lee grassland');
const crowns=root.getObjectByName('fixed sparse tree crowns');
const grass=root.getObjectByName('fixed seasonal grass and sedges'),pose=new Matrix4();
assert.ok(root.visible&&crowns.count>0&&grass.count>0);
crowns.getMatrixAt(0,pose);
const tree=pose.clone();
grass.getMatrixAt(0,pose);
const wetTuft=pose.clone();
const areas=[];
root.traverse(o=>{
  if(/connected overbank water|swale seasonal water/.test(o.name))areas.push(o.geometry.attributes.position.count);
  for(const a of Object.values(o.geometry?.attributes??{}))assert.ok(a.array.every(Number.isFinite));
});
assert.ok(areas.slice(0,2).every(n=>n>0)&&areas.slice(2,4).every(n=>n===0));
controller.show({season:'dry',layer:'water',stop:warmStops[4]});
crowns.getMatrixAt(0,pose);
assert.ok(tree.equals(pose));
grass.getMatrixAt(0,pose);
assert.ok(!wetTuft.equals(pose));
controller.hide();assert.equal(root.visible,false);
assert.equal(gapFor('warm-belt').sample.mode,'rain-shadow');
console.log('7 stations, two seasonal soil states, independent flood surfaces and unchanged tree locations passed.');

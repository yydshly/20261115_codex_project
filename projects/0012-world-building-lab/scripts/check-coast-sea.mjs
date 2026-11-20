import assert from 'node:assert/strict';
import {register} from 'node:module';
import {coastDive,coastPlacements,coastProfile,coastRead,coastStops,coastTides,diveSightline,southwestTidePatch} from '../web/coast-sea.js';
import {terrainHeight} from '../web/large-world.js';
import {gapFor} from '../web/environment-gaps.js';
import {planBounds} from '../web/world-logic-data.js';

register('./three-test-loader.mjs',import.meta.url);
const {Scene,Object3D}=await import('three');
const {createCoastSeaScene}=await import('../web/coast-sea-scene.js');
const [mouth,open,rock,grass,coral,shelf,slope,trench]=coastStops;
const high=coastRead(rock,'high'),low=coastRead(rock,'low');
assert.ok(high.depth>0&&!high.exposed);
assert.ok(low.exposed&&low.light===null);
assert.ok(coastRead(mouth,'low').depth<coastRead(mouth,'high').depth);
assert.ok(coastRead(mouth,'high').atThree<.1&&coastRead(grass,'high').atThree>.65);
assert.equal(coastRead(grass,'high').habitat.name,'稳定细砂与浅海沉积');
assert.equal(coastRead(coral,'high').habitat.name,'暖水礁坪硬底');
assert.ok(coastRead(trench,'high').light<1e-10);
for(const site of [mouth,grass,coral,shelf,slope,trench])for(const tide of Object.keys(coastTides)){
  const reading=coastRead(site,tide),eye=coastDive(site,reading);
  assert.ok(eye&&eye.y<reading.surface&&eye.y>terrainHeight(eye.x,eye.z)+.75,site.id+' '+tide);
  assert.ok(diveSightline(eye,site),site.id+' '+tide+' camera-to-bed sightline');
  assert.equal(eye.light,reading.light);
  if(eye.deep)assert.ok(eye.ambient>.5&&eye.fill>.25);
}
assert.equal(coastDive(rock,low),null);
assert.equal(coastDive(open,coastRead(open,'high')),null);

const profile=coastProfile();
assert.equal(coastStops.length,8);
assert.ok(profile.length>5000&&profile.length<6500);
assert.ok(profile.points.every(p=>p.y<.66&&p.y===terrainHeight(p.x,p.z)));
assert.ok(profile.points.every(p=>p.z>=planBounds.minZ&&p.z<=planBounds.maxZ&&p.x>=planBounds.minX&&p.x<=planBounds.maxX));
const tidal=southwestTidePatch();
const highMask=tidal('high'),lowMask=tidal('low');
assert.ok(highMask.wet.filter(Boolean).length>lowMask.wet.filter(Boolean).length);
const placements=coastPlacements();
for(const {site,records} of placements){
  assert.ok(records.length>10,site.id);
  assert.ok(records.every(p=>p.y===terrainHeight(p.x,p.z)));
}
assert.ok(placements.find(p=>p.site===grass).records.every(p=>p.kind==='grass'));
assert.ok(placements.find(p=>p.site===coral).records.some(p=>p.kind==='coral'));
assert.ok(placements.find(p=>p.site===trench).records.every(p=>p.kind==='cucumber'||p.kind==='shell'));

const scene=new Scene(),sea=new Object3D(),tropicalWater=new Object3D(),oceanLife=new Object3D(),oceanGuides=new Object3D();
sea.position.y=.08;
const controller=createCoastSeaScene(scene,{sea,tropicalWater,oceanLife,oceanGuides});
controller.show(mouth,'high','surface');
assert.ok(sea.visible&&!tropicalWater.visible&&oceanLife.visible);
assert.equal(sea.position.y,.08+coastTides.high.height);
const plot=controller.show(trench,'low','dive');
assert.ok(plot.dive?.deep&&!sea.visible&&!oceanLife.visible&&!oceanGuides.visible&&tropicalWater.visible);
const root=scene.getObjectByName('coastal sea transect');
const lamp=root.children.find(child=>child.isSpotLight);
assert.ok(lamp.intensity/lamp.position.distanceToSquared(lamp.target.position)>3);
controller.show(rock,'low','bed');
assert.equal(sea.visible,false);
assert.equal(lamp.intensity,0);
root.traverse(o=>{
  for(const attr of Object.values(o.geometry?.attributes??{}))assert.ok(attr.array.every(Number.isFinite));
});
controller.hide();
assert.ok(sea.visible&&oceanLife.visible&&oceanGuides.visible&&tropicalWater.visible&&!root.visible);
assert.equal(sea.position.y,.08);
assert.equal(gapFor('coast-shelf').sample.mode,'coast-sea');
console.log('8 stations, full water route, tide exposure, lighting, bathymetry, local communities and scene restoration passed.');

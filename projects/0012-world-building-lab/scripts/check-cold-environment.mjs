import assert from 'node:assert/strict';
import {register} from 'node:module';
import {coldGround,thawHollow} from '../web/cold-ground.js';
import {activeLayer,coldMapHref,coldProfile,coldReading,coldRoutes,glacierCrossSection} from '../web/cold-environment.js';
import {terrainHeight} from '../web/large-world.js';
import {regionalClimate} from '../web/regional-geography.js';
import {iceSample} from '../web/glacial-geography.js';
import {modern} from '../web/environment-catalog.js';
import {gapFor} from '../web/environment-gaps.js';

register('./three-test-loader.mjs',import.meta.url);
const {Scene}=await import('three');
const {createColdEnvironmentScene}=await import('../web/cold-environment-scene.js');
const [north,alpine]=coldRoutes;
const sample=id=>coldRoutes.flatMap(r=>r.stops).find(p=>p.id===id);
const read=id=>coldReading(sample(id),'summer');
assert.equal(north.stops.length+alpine.stops.length,12);
assert.equal(read('tundra').band,'open');
assert.equal(read('coast-edge').band,'margin');
assert.equal(read('mixed').band,'trees');
assert.equal(read('foot').band,'trees');
assert.equal(read('alpine-edge').band,'margin');
assert.equal(read('scree').band,'open');
assert.equal(read('tundra').cooling,0);
assert.ok(read('snowline').latitude>read('tundra').latitude&&read('snowline').warmth<read('tundra').warmth);
assert.ok(read('snowline').snow>0&&coldReading(sample('snowline'),'winter').snow>read('snowline').snow);
assert.ok(activeLayer('summer',read('tundra').warmth)>.4&&activeLayer('winter',read('tundra').warmth)<.1);

const {x,z,rx,level}=thawHollow;
assert.ok(terrainHeight(x,z)<level-.5);
assert.ok(Math.abs(terrainHeight(x-rx,z)-level)<1e-6);
assert.ok(Math.abs(terrainHeight(x+rx,z)-level)<1e-6);
assert.ok(Math.hypot(x-coldGround.x,z-coldGround.z)<coldGround.rx);
for(const route of coldRoutes){
  const {points,length}=coldProfile(route.path);
  assert.ok(length>750);
  for(const [i,p] of points.entries()){
    assert.equal(p.y,terrainHeight(p.x,p.z));
    assert.equal(coldReading(p,'summer').warmth,regionalClimate(p.x,p.z,p.y).warmth);
    if(i)assert.ok(p.metres>points[i-1].metres&&p.metres-points[i-1].metres<=8.01);
  }
}
const cross=glacierCrossSection(),middle=cross[40];
assert.equal(middle.y,terrainHeight(middle.x,middle.z));
assert.ok(middle.ice>middle.y+20);
assert.ok(cross[0].y-middle.y>25&&cross.at(-1).y-middle.y>25);
assert.ok(Math.abs(cross[32].y-cross[48].y)<2&&cross[32].y-middle.y<3);
const head=iceSample(0);
assert.ok(terrainHeight(head.x-head.dx*65,head.z-head.dz*65)>terrainHeight(head.x,head.z)+30);
assert.ok(terrainHeight(iceSample(.12).x,iceSample(.12).z)<terrainHeight(head.x,head.z)-10);

const world=new Scene(),ui=createColdEnvironmentScene(world);
ui.show({route:'north',stop:'tundra',season:'winter',layer:'section'});
const root=world.getObjectByName('coast to alpine cold environments');
assert.ok(root.visible&&root.getObjectByName('north').visible&&!root.getObjectByName('alpine').visible);
const cut=root.getObjectByName('permafrost cutaway'),water=root.getObjectByName('thaw hollow surface');
assert.ok(cut.visible&&cut.getObjectByName('winter active layer').visible);
const iceColor=water.material.color.getHex();
ui.show({route:'north',stop:'tundra',season:'summer',layer:'section'});
assert.ok(!cut.getObjectByName('winter active layer').visible&&cut.getObjectByName('summer active layer').visible);
assert.notEqual(water.material.color.getHex(),iceColor);
ui.show({route:'alpine',stop:'trough',season:'summer',layer:'section'});
assert.ok(!root.getObjectByName('north').visible&&root.getObjectByName('glacier valley cutaway').visible);
ui.show({route:'alpine',stop:'trough',season:'winter',layer:'land'});
assert.equal(root.getObjectByName('glacier valley cutaway').visible,false);
root.traverse(o=>{
  for(const a of Object.values(o.geometry?.attributes??{}))assert.ok(a.array.every(Number.isFinite));
});
ui.hide();assert.equal(root.visible,false);
assert.equal(gapFor('cold-belt').sample.mode,'cold');
assert.deepEqual(modern.filter(entry=>entry.href?.includes('?plan=cold')).map(entry=>entry.title),
  ['冻土、多边形地面与热融洼地','冰川地貌与冻融坡']);
assert.match(coldMapHref('alpine'),/plan=cold&focus=alpine/);
console.log('12 stations, shared cold index, basin floor and ice, freeze/thaw scene states, and atlas links passed.');

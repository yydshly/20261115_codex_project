import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {terrains, surfaces, layers} from '../web/world-data.js';
import {heightAt, slopeAt, materialAt, waterLevel} from '../web/terrain.js';

const state = biome => ({biome,seed:17,height:1,surface:'auto'});
const ranges=[];
for(const terrain of terrains){
 const s=state(terrain.id),heights=[];
 for(let x=-48;x<=48;x+=3)for(let z=-48;z<=48;z+=3){
  const h=heightAt(s,x,z),slope=slopeAt(s,x,z);
  assert.ok(Number.isFinite(h)&&Number.isFinite(slope)&&slope>=0,`${terrain.id}: invalid terrain`);
  assert.equal(heightAt(s,x,z),h,'Generation must be repeatable');
  assert.ok(surfaces.some(m=>m.id===materialAt(s,x,z)),`${terrain.id}: missing surface`);
  heights.push(h);
 }
 ranges.push({id:terrain.id,min:Math.min(...heights),max:Math.max(...heights)});
 assert.ok(Math.max(...heights)-Math.min(...heights)>.5,`${terrain.id}: unexpectedly flat`);
}
const island=state('island');
assert.ok(heightAt(island,0,0)>waterLevel(island)&&heightAt(island,48,48)<waterLevel(island),'Island must expose land and surrounding sea');
const volcano=state('volcano');
assert.ok(heightAt(volcano,0,0)<heightAt(volcano,10,0),'Volcano must have a crater, not only a cone');
assert.ok(heightAt(volcano,0,0)<waterLevel(volcano)&&heightAt(volcano,10,0)>waterLevel(volcano),'Lava must intersect the crater and stay below its rim');
const alpine=state('alpine');
assert.equal(materialAt(alpine,-15,6),'snow','Alpine peak should show its height zone');
const valley=state('valley'),before=heightAt(valley,10,15);
for(const surface of surfaces){valley.surface=surface.id;assert.equal(heightAt(valley,10,15),before,'Surface swaps must preserve the skeleton');}
for(const [x,z] of [[-30,-10],[10,20],[40,12]]){
 assert.ok(Math.abs(heightAt({...valley,height:1.3},x,z)-heightAt(valley,x,z)*1.3)<1e-10);
}
const root=fileURLToPath(new URL('../',import.meta.url));
assert.equal(terrains.length,10);assert.equal(surfaces.length,9);assert.equal(layers.length,7);
const packageJson=JSON.parse(readFileSync(root+'web/package.json'));
assert.equal(packageJson.dependencies.three,'0.180.0');
for(const id of [...terrains.map(t=>t.id),...surfaces.map(s=>'surface-'+s.id),...[0,1,2].map(i=>'stage-'+i),...['valley','hills','canyon','wetland','mesa','coast'].map(i=>'element-'+i)])assert.ok(existsSync(root+`web/assets/previews/${id}.jpg`),`Missing actual screenshot: ${id}`);
for(const filename of ['three.module.js','three.core.js','OrbitControls.js','LICENSE'])assert.ok(existsSync(root+'web/runtime/'+filename));
console.log(JSON.stringify({result:'passed',terrainRanges:ranges,catalogue:{terrains:10,surfaces:9,layers:7,actualScreenshots:28}},null,2));

import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ambienceMixAt } from './ambience.js';
import { createGardenBench } from './garden-moments.js';
import { heightAt,riverX,riverWidth } from './terrain.js';
import { borderWeightAt } from './planting-plan.js';
import { pathSampleAt } from './path-layout.js';

const straight={riverX:()=>0,riverWidth:()=>3};
const near=ambienceMixAt({x:4,y:1.7,z:0},straight),far=ambienceMixAt({x:38,y:1.7,z:0},straight);
assert(near.river>far.river*5,'Walking to the bank does not bring the stream closer');
assert(near.pan<-.4,'Stream on the listener’s left is not panned left');
assert(ambienceMixAt({x:4,y:1.7,z:0},{...straight,right:{x:-1,z:0}}).pan>.4,'Turning around did not swap the stream direction');
assert(ambienceMixAt({x:4,y:1.7,z:0},{...straight,indoors:true}).river<near.river*.4,'Rooms do not shelter outdoor sound');
assert(ambienceMixAt({x:4,y:1.7,z:0},{...straight,evening:1}).birds<near.birds,'Bird calls do not quieten at dusk');
for(const x of [-120,-30,0,60,120])for(const z of [-125,-20,18,100]){
  const mix=ambienceMixAt({x,y:heightAt(x,z)+1.7,z},{riverX,riverWidth});
  assert(Object.values(mix).every(Number.isFinite));assert(Math.abs(mix.pan)<=.82&&mix.river>=0&&mix.river<.7);
}

const scene=new THREE.Scene(),map=new THREE.Texture(),bench=createGardenBench(scene,{heightAt,wood:{color:map,normal:map,roughness:map}});
assert.equal(bench.group.children.length,3,'A single bench should add only three draws');
assert.equal(bench.contacts.length,4);
assert(pathSampleAt(bench.group.position.x,bench.group.position.z).distance>2,'Bench blocks the main garden path');
assert(borderWeightAt(bench.group.position.x,bench.group.position.z)<.01,'Bench is placed inside a flower bed');
for(const foot of bench.contacts)assert(pathSampleAt(foot.x,foot.z).distance>1.6,'Bench feet overlap the approach');
assert(bench.position.y-heightAt(bench.position.x,bench.position.z)>1.1&&bench.position.y-heightAt(bench.position.x,bench.position.z)<1.4,'Seated eye height is not plausible');
assert(bench.target.clone().sub(bench.position).length()>8);
for(const mesh of bench.group.children){
  assert(mesh.castShadow&&mesh.receiveShadow);
  assert(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite));
}
console.log('OK: stream distance, direction, shelter and dusk mix; three-draw bench, clear path and seated eye height');

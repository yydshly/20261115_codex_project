import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWindField,windWeatherAt,localWindAt,plantOffsetAt,injectWind,windUniforms } from './wind-field.js';
import { createFootstepTracker } from './footsteps.js';
import { createGardenWildlife } from './garden-wildlife.js';
import { seededRandom,heightAt } from './landscape.js';

const wind=createWindField();let previous=null,min=1,max=0;
for(let i=0;i<1800;i++){
  const weather=wind.update(i*.1),sample=wind.sample(0,2);min=Math.min(min,sample.strength);max=Math.max(max,sample.strength);
  assert(sample.strength>=0&&sample.strength<1);assert(Math.abs(Math.hypot(weather.direction.x,weather.direction.z)-1)<1e-12);
  if(previous)assert(Math.abs(weather.strength-previous.strength)<.02,'Wind gust has an abrupt step');previous=weather;
  const root=plantOffsetAt(weather,{x:2,z:3},0,.4);assert.deepEqual(root,{x:0,y:0,z:0});
  const tip=wind.plantOffset({x:2,z:3},.4,.4);assert(Math.hypot(tip.x,tip.z)<.06&&tip.y===0);
}
assert(max>min*2,'Shared wind lacks a gentle-to-gust variation');
const shader={uniforms:{},vertexShader:'#include <begin_vertex>'};injectWind(shader,{height:.4});
assert.equal(shader.uniforms.gardenWindStrength,windUniforms.strength);assert.equal(shader.uniforms.gardenWindDirection,windUniforms.direction);
assert.equal(shader.uniforms.gardenWindTime,windUniforms.time);
const strong={...windWeatherAt(7),strength:.8},calm={...strong,strength:.2};
assert(Math.abs(plantOffsetAt(strong,{x:2,z:3},.3,.4).x/plantOffsetAt(calm,{x:2,z:3},.3,.4).x-4)<1e-10);
const still=createWindField({animate:false});still.update(50);assert.equal(still.sample(0,0).strength,0);assert.equal(windUniforms.strength.value,0);

function travel(speed,active=true){const steps=createFootstepTracker(),events=[];for(let i=0;i<300;i++){const e=steps.update({x:speed*i/60,z:0,dt:1/60,active,surface:'wood'});if(e)events.push(e);}return events;}
const regular=travel(3),quick=travel(6.2);assert(regular.length>=10&&regular.length<=14);assert(quick.length>regular.length&&quick.length<19);
assert.equal(travel(0).length,0,'Blocked movement produces footsteps');assert.equal(travel(3,false).length,0,'A camera transition produces footsteps');
assert(regular.every((e,i)=>e.surface==='wood'&&(!i||e.side!==regular[i-1].side)));
const tracker=createFootstepTracker();tracker.update({x:0,z:0,dt:.02,active:true});assert.equal(tracker.update({x:50,z:0,dt:.02,active:true}),null,'Teleport emits a footstep');
for(let i=0;i<120;i++)assert.equal(tracker.update({x:50,z:0,dt:.02,active:false}),null,'Stopped walker keeps stepping');

const perches=[];for(const [x,z]of [[-2.05,1.4],[2.05,2.5],[6.8,5.4]])for(let i=0;i<7;i++){
  const px=x+Math.sin(i*2)*.5,pz=z+Math.cos(i*2)*.6;perches.push({x:px,y:heightAt(px,pz)+.35,z:pz,windRoot:{x:px,z:pz},windHeight:.35,plantHeight:.4});
}
wind.update(1);const wildlife=createGardenWildlife(new THREE.Scene(),{flowerPerches:perches,heightAt,random:seededRandom(65473),wind});
const camera=new THREE.PerspectiveCamera();camera.position.set(0,2,4);wildlife.update(1,camera);
const b=wildlife.butterflies[0],point=b.stops[0],offset=wind.plantOffset(point.plant.windRoot,.35,.4);
assert.equal(b.state.phase,'resting');assert(b.root.position.distanceTo(point.clone().add(new THREE.Vector3(offset.x,0,offset.z)))<1e-10,'Perched butterfly does not follow its wind-bent flower');
console.log(JSON.stringify({windMin:min,windMax:max,walkSteps:regular.length,quickSteps:quick.length,restingFlowerOffset:offset}));
console.log('OK: shared smooth wind, rooted stems, butterfly contact, actual-motion footsteps, cadence, stop/block/teleport suppression');

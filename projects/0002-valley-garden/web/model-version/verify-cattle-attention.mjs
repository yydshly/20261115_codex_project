import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createGrazingCow} from './cattle-behavior.js';
import {createCowRoaming} from './cattle-roaming.js';
import {cowAttention} from './cattle-attention.js';

const loader=new GLTFLoader();loader.register(()=>({name:'CPUHeadInspection',loadTexture:async()=>new THREE.Texture()}));
const b=await readFile(new URL('./assets/models/life/cow.glb',import.meta.url)),asset=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const cow=createGrazingCow(asset.scene,{surfaceHeight:()=>0}),other=createGrazingCow(asset.scene,{phaseOffset:23.5,surfaceHeight:()=>0});
const p=new THREE.Vector3(),centre=new THREE.Vector3(),origin=new THREE.Vector3();
function actualYaw(){
  centre.set(0,0,0);for(const i of cow.noseSamples){cow.mesh.getVertexPosition(i,p);centre.add(p);}
  p.copy(centre).divideScalar(cow.noseSamples.length);cow.mesh.skeleton.bones[2].getWorldPosition(origin);cow.mesh.worldToLocal(origin);
  return Math.atan2(p.x-origin.x,p.z-origin.z);
}
const standing=progress=>({phase:'looking',graze:0,walkBlend:0,speed:0,gaitDistance:0,lookProgress:progress});
cow.update(0,standing(0));const neutral=actualYaw();assert(Math.abs(neutral)<.02,'Source baked head turn still biases the upright head');
cow.update(1,standing(.25));const left=actualYaw();cow.update(2,standing(.75));const right=actualYaw();
assert(left<-.24&&right>.24,'Actual skinned muzzle does not look to both sides');
const bones=cow.mesh.skeleton.bones,lengths=bones.map(b=>b.position.length()),feet=cow.legBones.map(l=>l.hoof.getWorldPosition(new THREE.Vector3()));
let minYaw=Infinity,maxYaw=-Infinity,maxStep=0,lastYaw=neutral;
for(let frame=0;frame<=180;frame++){
  const t=frame/30;cow.update(t,standing(t/6));const yaw=actualYaw();
  if(frame)maxStep=Math.max(maxStep,Math.abs(yaw-lastYaw));lastYaw=yaw;minYaw=Math.min(minYaw,yaw);maxYaw=Math.max(maxYaw,yaw);
  assert.equal(cow.root.rotation.y,0,'Head looking rotates the animal root');assert.equal(cow.root.position.length(),0,'Head looking moves the animal root');
  bones.forEach((bone,i)=>assert(Math.abs(bone.position.length()-lengths[i])<1e-10,'Head attention stretches a bone'));
  cow.legBones.forEach((leg,i)=>assert(leg.hoof.getWorldPosition(p).distanceTo(feet[i])<1e-8,'Head looking slides a planted hoof'));
}
assert(maxStep<.025,'Head changes direction abruptly');
cow.update(0,standing(.25));other.update(0,standing(.25));assert(cow.state.headYaw*other.state.headYaw<0,'Two cows look in lockstep');
assert(cowAttention(0,{walkBlend:1,headingRate:-.2}).yaw<0&&cowAttention(0,{walkBlend:1,headingRate:.2}).yaw>0,'Walking head does not anticipate the bend');
const roam=createCowRoaming({x:0,z:0,heading:0,isSafe:()=>true,seed:4187});
let minClearance=Infinity,maxClearance=-Infinity,maxForageOffset=0;const feed=cow.feedingPoint();
for(let frame=0;frame<1200;frame++){
  const t=frame/60,m=roam.sample(t);cow.update(t,m);
  if(m.graze>.999){minClearance=Math.min(minClearance,cow.state.muzzleClearance);maxClearance=Math.max(maxClearance,cow.state.muzzleClearance);cow.mesh.getVertexPosition(cow.muzzleIndex,p);maxForageOffset=Math.max(maxForageOffset,Math.hypot(p.x-feed.x,p.z-feed.z));}
}
assert(minClearance>.06&&maxClearance<.20,'Corrected head misses edible grass height');assert(maxForageOffset<.08,'Grazing look sweeps outside the mouth grass patch');
console.log(JSON.stringify({sourceRestCorrectionDegrees:cow.state.restYaw*180/Math.PI,neutralDegrees:neutral*180/Math.PI,actualLookRangeDegrees:[minYaw,maxYaw].map(x=>x*180/Math.PI),maxFrameYawDegrees:maxStep*180/Math.PI,minClearance,maxClearance,maxForageOffset}));

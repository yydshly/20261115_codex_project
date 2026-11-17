import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createCowRoaming } from './cattle-roaming.js';
import { createGrazingCow } from './cattle-behavior.js';
import { cowStride } from './cattle-gait.js';

const isSafe=(x,z)=>Math.hypot(x,z)<4.7&&!(x>1.1&&x<2.1&&z>-.5&&z<1.5);
const roam=createCowRoaming({x:0,z:0,heading:1.2,isSafe,seed:4187}),repeated=createCowRoaming({x:0,z:0,heading:1.2,isSafe,seed:4187});
assert.deepEqual(roam.stops,repeated.stops);assert(roam.stops.length>=4,'Random grazing stops were not generated');
const phases=new Set();let previous=roam.sample(0),maxSpeed=0;
for(let t=.05;t<roam.duration+.5;t+=.05){const p=roam.sample(t);phases.add(p.phase);assert(isSafe(p.x,p.z),'A cow left its safe area or crossed an obstacle');assert(Math.hypot(p.x,p.z)<roam.bounds.radius);assert(Math.hypot(p.x-previous.x,p.z-previous.z)<.024,'Cow position jumps at a behavior transition');maxSpeed=Math.max(maxSpeed,p.speed);previous=p;}
for(const phase of ['walking','grazing','looking','raising','lowering'])assert(phases.has(phase),`Missing ${phase}`);assert(!phases.has('turning'),'The cow still rotates in place');assert(maxSpeed>.35&&maxSpeed<.37);
for(let t=.05;t<roam.duration;t+=.05){const a=roam.sample(t-.05),b=roam.sample(t),distance=Math.hypot(b.x-a.x,b.z-a.z),turn=Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading));if(a.speed===0&&b.speed===0){assert(distance<1e-8&&Math.abs(turn)<1e-8,'A stationary animal moves or rotates');}if(a.speed>.1&&b.speed>.1){const forward=(b.x-a.x)*Math.sin((a.heading+b.heading)/2)+(b.z-a.z)*Math.cos((a.heading+b.heading)/2);assert(forward>distance*.995||Math.abs(b.heading-a.heading)>Math.PI,'A walking animal translates sideways');}}

const loader=new GLTFLoader();loader.register(()=>({name:'CPUCattleWalk',loadTexture:async()=>new THREE.Texture()}));
const bytes=await readFile(new URL('./assets/models/life/cow.glb',import.meta.url)),asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const cow=createGrazingCow(asset.scene,{surfaceHeight:()=>0}),position=cow.mesh.geometry.attributes.position,sole=[];
for(let i=0;i<position.count;i+=3)if(position.getY(i)<.025&&position.getZ(i)>-.96&&position.getZ(i)<.55)sole.push(i);
const point=new THREE.Vector3(),lastFeet=new Map();let minSole=Infinity,maxLift=0,maxStanceStep=0,walkFrames=0,legTravel=0;
const stage=roam.stages.find(s=>s.kind==='walking'&&s.end-s.start>4);
assert(stage,'No useful walking segment');
for(let t=stage.start;t<stage.end;t+=1/60){
  const motion=roam.sample(t);motion.predict=seconds=>roam.sample(t+seconds);cow.root.position.set(motion.x,.005,motion.z);cow.root.rotation.y=motion.heading;cow.update(t,motion);
  if(motion.walkBlend<.999)continue;walkFrames++;
  for(const i of sole){cow.mesh.getVertexPosition(i,point).applyMatrix4(cow.mesh.matrixWorld);minSole=Math.min(minSole,point.y);maxLift=Math.max(maxLift,point.y);}
  for(const [i,{upper,hoof,leg}]of cow.legBones.entries()){
    legTravel=Math.max(legTravel,Math.abs(upper.rotation.x));const phase=(motion.gaitDistance/cowStride+leg.phase)%1,planted=!cow.gait.feet[i].swing;
    hoof.getWorldPosition(point);const last=lastFeet.get(i);if(last&&planted&&last.planted&&phase>.06&&phase<.59&&last.phase>.06&&last.phase<.59)maxStanceStep=Math.max(maxStanceStep,point.distanceTo(last.point));lastFeet.set(i,{phase,planted,point:point.clone()});
  }
}
assert(walkFrames>100&&legTravel>.2,'The cow translates without a leg gait');
assert(minSole>-.025,`Hooves penetrate the ground: ${minSole}`);assert(maxLift<.18,`Excessive hoof lift: ${maxLift}`);assert(maxLift>.055,'Hooves never lift for a step');assert(maxStanceStep<.012,`Planted hooves slide: ${maxStanceStep}`);
console.log(JSON.stringify({randomStops:roam.stops.length,fullCycleSeconds:Math.round(roam.duration),maxSpeed,minSole,maxLift,maxStanceStep,walkFrames}));
const previousBones=cow.mesh.skeleton.bones.map(b=>b.quaternion.clone()),phaseSoles={};let maxJointStep=0,maxJointEvent;
for(let frame=0;frame<120*30;frame++){
  const time=frame/30,motion=roam.sample(time);motion.predict=seconds=>roam.sample(time+seconds);cow.root.position.set(motion.x,.005,motion.z);cow.root.rotation.y=motion.heading;cow.update(time,motion);
  cow.mesh.skeleton.bones.forEach((b,i)=>{const step=b.quaternion.angleTo(previousBones[i]);if(frame&&step>maxJointStep){maxJointStep=step;maxJointEvent={time,bone:b.name,phase:motion.phase,gaitDistance:motion.gaitDistance};}previousBones[i].copy(b.quaternion);});
  if(frame%3===0)for(const i of sole){cow.mesh.getVertexPosition(i,point).applyMatrix4(cow.mesh.matrixWorld);phaseSoles[motion.phase]=Math.min(phaseSoles[motion.phase]??Infinity,point.y);}
}
console.log(JSON.stringify({maxJointStepDegrees:maxJointStep*180/Math.PI,maxJointEvent,minSoleByPhase:phaseSoles}));
assert(maxJointStep<.20,'A hoof transition snaps a joint between frames');
assert(Object.values(phaseSoles).every(y=>y>-.010),'Starting, turning or stopping pushes a hoof through the floor');
const touchdown=[],lastHeights=[];
for(let frame=-10;frame<1210;frame++){
  const cycle=frame/600;const motion={phase:'walking',graze:0,walkBlend:1,speed:.36,gaitDistance:cycle*cowStride};cow.root.position.set(0,.005,cycle*cowStride);cow.root.rotation.y=0;cow.update(cycle*cowStride/.36,motion);
  cow.legBones.forEach(({hoof,leg},i)=>{hoof.getWorldPosition(point);const h=point.y-(.045-(leg.sole||0));if(lastHeights[i]>.007&&h<=.007&&cycle>=1&&cycle<2)touchdown.push({leg:i,cycle});lastHeights[i]=h;});
}
assert.equal(touchdown.length,4,'The slow walk does not have four distinct footfalls');const order=touchdown.map(p=>p.leg),start=order.indexOf(2),lateral=[...order.slice(start),...order.slice(0,start)];assert.deepEqual(lateral,[2,0,3,1],'The cow uses a diagonal sequence instead of hind/fore on the same side');
console.log('Lateral footfall sequence '+JSON.stringify(lateral));

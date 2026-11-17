import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { actorSoundMixAt,createActorFootsteps } from './actor-footsteps.js';
import { loadValleyLife,createValleyLife } from './valley-life.js';
import { heightAt } from './terrain.js';
import { createCourtyardFooting } from './foot-grounding.js';
import { createCourtyardPath } from './courtyard-path.js';
import { seededRandom } from './landscape.js';

const listener={x:0,y:1.7,z:0},near=actorSoundMixAt({x:3,y:0,z:0},listener),far=actorSoundMixAt({x:22,y:0,z:0},listener);
assert(near.gain>far.gain*10&&near.cutoff>far.cutoff);
assert(near.pan>.8&&actorSoundMixAt({x:3,y:0,z:0},listener,{x:-1,z:0}).pan<-.8);
assert(actorSoundMixAt({x:3,y:0,z:0},listener,undefined,true).gain<near.gain*.4);
assert.equal(actorSoundMixAt({x:33,y:0,z:0},listener).gain,0);
let previous=1;for(let d=0;d<40;d+=.1){const m=actorSoundMixAt({x:d,y:0,z:0},listener);assert(m.gain<=previous&&Math.abs(m.pan)<=.88);previous=m.gain;}

// Transitions, seeks and repeated held contacts must never invent a landing.
const fake={group:{visible:true},gardener:{visible:true,position:{x:0,y:0,z:0}},footing:{soles:{left:{x:0,y:0,z:0,clearance:0},right:{x:0,y:0,z:0,clearance:0}}},locomotion:{walking:true,weight:1},cattle:[]};
const tracker=createActorFootsteps();let t=0;
function tick(left,right,{moving=true,dt=1/30}={}){t+=dt;fake.gardener.position.x+=moving?.015:0;fake.locomotion.walking=moving;fake.footing.soles.left.clearance=left;fake.footing.soles.right.clearance=right;return tracker.update(dt,t,fake,()=> 'stone');}
assert.equal(tick(.04,0).length,0);assert.equal(tick(0,0).length,0);
tick(.04,0);assert.equal(tick(.005,0).length,1);assert.equal(tick(.005,0).length,0);
tick(0,.04,{moving:false});assert.equal(tick(0,0,{moving:false}).length,0);
tick(.04,0);t+=5;assert.equal(tick(0,0).length,0);
tick(.04,0);fake.group.visible=false;assert.equal(tick(0,0).length,0);fake.group.visible=true;
tick(.04,0);assert.equal(tick(0,0,{dt:0}).length,0);

// Check the actual rig, corrected shoe soles and existing four-leg solver.
GLTFLoader.prototype.loadAsync=async function(url){this.register(()=>({name:'CPUAudioInspection',loadTexture:async()=>new THREE.Texture()}));const b=await readFile(new URL(url));return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),new URL('.',url).href);};
const assets=await loadValleyLife({capabilities:{getMaxAnisotropy:()=>8}}),scene=new THREE.Scene(),texture=new THREE.Texture();
const courtyard=createCourtyardPath(scene,{heightAt,stone:{color:texture,normal:texture,roughness:texture},random:seededRandom(73019)});
const supportHeight=createCourtyardFooting(courtyard.surfaceHeightAt,heightAt),life=createValleyLife(scene,assets,{heightAt,walkHeight:heightAt,supportHeight});
const camera=new THREE.PerspectiveCamera();camera.position.set(10,3,15);
const observer=createActorFootsteps(),events=[],lift={left:0,right:0};let maxShoeGap=0;
for(let frame=0;frame<1080;frame++){
  const time=frame/30;life.update(1/30,time,camera);
  for(const [side,sole]of Object.entries(life.footing.soles))lift[side]=Math.max(lift[side],sole.clearance);
  const landed=observer.update(1/30,time,life,(x,z)=>courtyard.surfaceHeightAt(x,z)!==null?'stone':'grass');
  for(const e of landed){events.push({...e,time});if(e.kind==='human')maxShoeGap=Math.max(maxShoeGap,e.position.y-supportHeight(e.position.x,e.position.z));else assert(['walking','lowering'].includes(life.cattle[e.actor].motion.phase),'Stationary grazing cattle produce hoof sounds');}
}
const human=events.filter(e=>e.kind==='human'),cows=events.filter(e=>e.kind==='cow');
console.log(JSON.stringify({humanLandings:human.length,cowLandings:cows.length,shoeLift:lift,maxShoeGap,nearGain:near.gain,farGain:far.gain}));
assert(human.length>=8,'Real shoe soles do not trigger footsteps');assert(cows.length>=12,'Real hoof touchdowns do not trigger sounds');
assert(human.every(e=>e.surface==='stone'&&Number.isFinite(e.speed))&&maxShoeGap<.025);
assert(cows.every(e=>e.surface==='grass'));
for(const leg of [0,1,2,3])assert(cows.some(e=>e.leg===leg),'A hoof never makes contact');
for(const actor of [0,1])assert(cows.some(e=>e.actor===actor),'A cow has no audible landings');
const p=life.gardener.position;camera.position.set(p.x,p.y+1.7,p.z+1.5);
for(let i=0;i<80;i++){life.update(1/30,36+i/30,camera);const e=observer.update(1/30,36+i/30,life,()=> 'stone');assert(!e.some(s=>s.kind==='human'),'Proximity-stopped person still steps');}
life.setVisible(false);for(let i=0;i<30;i++){life.update(1/30,39+i/30,camera);assert.equal(observer.update(1/30,39+i/30,life,()=> 'grass').length,0);}
console.log('OK: actual shoe/hoof landings, four feet and two cattle, proximity/visibility/seek/pause suppression, distance, pan and distant softening');

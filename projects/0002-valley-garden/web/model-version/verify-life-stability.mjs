// Exercise actual skeletal tracks across several turns and proximity stops.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadValleyLife,createValleyLife } from './valley-life.js';
import { heightAt } from './terrain.js';
import { createCourtyardFooting } from './foot-grounding.js';
import { createCourtyardPath } from './courtyard-path.js';
import { seededRandom } from './landscape.js';

GLTFLoader.prototype.loadAsync=async function(url){
  this.register(()=>({name:'CPUCharacterInspection',loadTexture:async()=>new THREE.Texture()}));
  const b=await readFile(new URL(url));return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),new URL('.',url).href);
};
const assets=await loadValleyLife({capabilities:{getMaxAnisotropy:()=>8}});
assets.gardener.scene.traverse(o=>{
  if(!o.isMesh)return;
  assert(!o.castShadow&&o.receiveShadow,'The resident must receive world shade without entering the cached world shadow map');
  assert(!o.frustumCulled,'A fixed rest-pose bound can cull the animated resident');
});
const scene=new THREE.Scene(),texture=new THREE.Texture(),stone={color:texture,normal:texture,roughness:texture};
const courtyard=createCourtyardPath(scene,{heightAt,stone,random:seededRandom(73019)});
const supportHeight=createCourtyardFooting(courtyard.surfaceHeightAt,heightAt),terrainHeight=createCourtyardFooting(()=>null,heightAt);
for(let i=0;i<50;i++){const x=Math.sin(i)*.8,z=i*.125-1;assert(Math.abs(terrainHeight(x,z)-heightAt(x,z))<1e-7,'Cached footing changed the rendered terrain triangles');}
const life=createValleyLife(scene,assets,{heightAt,walkHeight:heightAt,supportHeight});
const camera=new THREE.PerspectiveCamera();camera.position.set(10,3,15);
const bones=[];life.gardener.traverse(o=>{if(o.isBone)bones.push(o);});
const soles=[];life.gardener.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const skin=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;for(let i=0;i<skin.count;i++){let foot=0;for(let j=0;j<4;j++)if(/Foot|Toe/.test(mesh.skeleton.bones[skin.getComponent(i,j)]?.name))foot+=weights.getComponent(i,j);if(foot>=.5)soles.push({mesh,index:i});}});
let previous=bones.map(b=>b.quaternion.clone()),maxStep=0,maxRootStep=0,previousY=0,clearMin=Infinity,clearMax=-Infinity;
const point=new THREE.Vector3();
for(let frame=0;frame<3200;frame++){
  life.update(1/60,frame/60,camera);
  bones.forEach((bone,i)=>{maxStep=Math.max(maxStep,bone.quaternion.angleTo(previous[i]));previous[i].copy(bone.quaternion);});
  if(frame)maxRootStep=Math.max(maxRootStep,Math.abs(life.gardener.position.y-previousY));previousY=life.gardener.position.y;
  if(frame%37===0){let clearance=Infinity;for(const {mesh,index}of soles){mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);clearance=Math.min(clearance,point.y-supportHeight(point.x,point.z));}clearMin=Math.min(clearMin,clearance);clearMax=Math.max(clearMax,clearance);}
}
assert(maxStep<.12,`A turn abruptly changed a limb by ${maxStep} radians in one frame`);
console.log('Sole inspection',JSON.stringify({samples:life.footing.samples,fullShoeVertices:soles.length,clearMin,clearMax,maxRootStep}));
assert(clearMin>-.004&&clearMax<.006,'Full shoe geometry still floats or penetrates the path');
assert(maxRootStep<.008,'Sole correction suddenly moves the body vertically');
const root=life.gardener.position.clone();camera.position.set(root.x,root.y+1.7,root.z+1.5);
for(let i=0;i<180;i++)life.update(1/60,54+i/60,camera);
assert(Math.hypot(life.gardener.position.x-root.x,life.gardener.position.z-root.z)<.001,'The resident did not stop near the visitor');
previous=bones.map(b=>b.quaternion.clone());for(let i=0;i<60;i++)life.update(1/60,57+i/60,camera);
assert(bones.every((b,i)=>b.quaternion.angleTo(previous[i])<.001),'A paused resident still changes pose');
// The hysteresis band keeps tiny visitor movements from toggling the gait.
for(let i=0;i<40;i++){camera.position.z=root.z+1.8+(i%2?.015:-.015);life.update(1/60,58+i/60,camera);}
assert(Math.hypot(life.gardener.position.x-root.x,life.gardener.position.z-root.z)<.001,'The pause threshold chatters at its boundary');
life.setQuality(false);for(let i=0;i<60;i++)life.update(1/60,60+i/60,camera);
life.setQuality(true);assert(life.gardener.visible,'Quality switching hid a nearby resident');
console.log(`OK: resident pose continuity, stable proximity stop and world-shadow separation; largest limb step ${(maxStep*180/Math.PI).toFixed(2)} degrees`);

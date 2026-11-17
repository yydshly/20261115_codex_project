import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGardenWildlife } from './garden-wildlife.js';
import { heightAt,seededRandom } from './landscape.js';

const flowerPerches=[];
for(const [cx,cz]of [[-2.05,1.4],[2.05,2.5],[6.8,5.4]])for(let i=0;i<7;i++){
  const x=cx+Math.sin(i*2)*.5,z=cz+Math.cos(i*2)*.6;
  flowerPerches.push({x,y:heightAt(x,z)+.35,z,kind:'flower'});
}
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,2,4);
const make=animate=>createGardenWildlife(scene,{flowerPerches,heightAt,random:seededRandom(65473),animate});
const wildlife=make(true);assert.equal(wildlife.butterflies.length,3);assert.equal(wildlife.birds.length,2);
let meshes=0,triangles=0;
wildlife.group.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=o.geometry.attributes.position.count/3;
  assert(o.geometry.attributes.position.count>0);assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
  assert(Array.from(o.geometry.attributes.normal.array).every(Number.isFinite),'Animal surface normals contain invalid values');
  assert(Array.from(o.geometry.attributes.uv.array).every(Number.isFinite),'Animal texture coordinates contain invalid values');
  assert(!o.material.transparent&&!o.castShadow,'Small animals should not add alpha sorting or a moving shadow pass');
});
assert(meshes<=27&&triangles<60000,`Wildlife exceeded its refined surface budget: ${meshes} draws / ${triangles} triangles`);
for(const b of wildlife.butterflies){
  const fore=b.wings[0].fore.children[0];fore.geometry.computeBoundingBox();
  assert(fore.geometry.boundingBox.getSize(new THREE.Vector3()).y>.0015,'Butterfly membrane is still flat');
  assert(fore.material.map&&fore.material.normalMap&&fore.material.roughnessMap,'Butterfly scales lack surface shading');
  assert.equal(fore.material.transmission,0,'Wing translucency added a costly refraction pass');
}
let flying=0,resting=0,quiet=0,maxSpeed=0,maxTurn=0,maxWingLag=0,maxFlex=0;const old=new Map();
for(let frame=0;frame<6000;frame++){
  wildlife.update(frame/30,camera);
  for(const b of wildlife.butterflies){
    maxWingLag=Math.max(maxWingLag,Math.abs(b.wings[0].fore.rotation.z-b.wings[0].hind.rotation.z));
    maxFlex=Math.max(maxFlex,Math.abs(b.foreMaterial.userData.flex.value));
    assert(b.root.position.y>=heightAt(b.root.position.x,b.root.position.z)+.1,'Butterfly crosses the ground');
    if(b.state.phase==='flying')flying++;else{
      resting++;assert(b.stops.some(p=>p.distanceTo(b.root.position)<.00001),'Resting butterfly floats away from its flower');
    }
    const previous=old.get(b);
    if(previous){maxSpeed=Math.max(maxSpeed,b.root.position.distanceTo(previous.p)*30);maxTurn=Math.max(maxTurn,b.root.quaternion.angleTo(previous.q)*180/Math.PI);}
    old.set(b,{p:b.root.position.clone(),q:b.root.quaternion.clone()});
  }
  for(const b of wildlife.birds)if(b.state.flying)assert(b.root.position.y-heightAt(b.root.position.x,b.root.position.z)>=13-.00001,'Bird route intersects the low courtyard');
  if(wildlife.birds.every(b=>!b.state.flying))quiet++;
}
assert(flying>0&&resting>flying,'Butterflies should spend more time on flowers than in flight');
assert(quiet>1800,'Birds circle continuously instead of leaving quiet intervals');
assert(maxWingLag>.25&&maxFlex>.8,'Forewing, hindwing and flexible tips move as one rigid card');
assert(maxSpeed<1.6&&maxTurn<25,`Butterfly motion snaps: ${maxSpeed} m/s, ${maxTurn} deg/frame`);
wildlife.setQuality(false);wildlife.update(16,camera);assert(wildlife.inspect().butterflies<=2&&wildlife.inspect().birds<=1);
wildlife.setVisible(false);assert.deepEqual([wildlife.inspect().butterflies,wildlife.inspect().birds],[0,0]);
const still=make(false);still.update(1,camera);const positions=still.butterflies.map(b=>b.root.position.clone());still.update(51,camera);
assert(still.birds.every(b=>!b.root.visible)&&still.butterflies.every((b,i)=>b.root.position.equals(positions[i])),'Reduced-motion setting leaves flapping or flying animals');
assert(still.butterflies.every(b=>b.root.rotation.x===0&&b.root.rotation.z===0&&b.foreMaterial.userData.flex.value===0&&b.hindMaterial.userData.flex.value===0),'Reduced-motion insects retain a moving surface or airborne body pose');
console.log(JSON.stringify({meshes,triangles,restSamples:resting,flightSamples:flying,quietBirdFrames:quiet,maxSpeed,maxTurn,maxWingLag,maxFlex}));
console.log('OK: modest counts, flower contacts, smooth takeoff/landing, intermittent high bird routes, quality/visibility/reduced-motion controls');

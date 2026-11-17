import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {samplePortal,GATE,portalCamera} from '../web/portal-score.mjs';
// The canvas stub supplies texture allocation only. These tests inspect real Three.js
// scene geometry/cameras, and do not claim GPU, shader or visual validation.
const context=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
const {createPortalWorlds}=await import('../web/portal-world.mjs');
const worlds=createPortalWorlds();
test('both authored worlds construct finite geometry and all actor materials cut at the actual threshold',()=>{
 for(const [id,w]of Object.entries(worlds)){
  let vertices=0;w.scene.traverse(o=>{if(!o.geometry)return;const a=o.geometry.attributes.position;for(const v of a.array)assert.ok(Number.isFinite(v),`${id}/${o.type}`);vertices+=a.count;});assert.ok(vertices>10000);
  w.traveler.root.traverse(o=>{if(!o.isMesh)return;for(const m of(Array.isArray(o.material)?o.material:[o.material])){assert.equal(m.clippingPlanes.length,1);const plane=m.clippingPlanes[0],z=id==='source'?GATE.source:GATE.destination;assert.ok(Math.abs(plane.distanceToPoint(new THREE.Vector3(0,0,z)))<1e-8);}});
 }
});
test('traveler stays in view at discovery, listening, arrival, look-back and final pause, on wide and tall viewports',()=>{
 const w=worlds.source,box=new THREE.Box3(),point=new THREE.Vector3();
 for(const aspect of[2.3,.54,.5])for(let t=0;t<=46;t+=.25){
  const p=samplePortal(t);w.update(p);const view=portalCamera(p,aspect);
  w.camera.aspect=aspect;w.camera.fov=view.fov;w.camera.position.fromArray(view.position);w.camera.lookAt(new THREE.Vector3(...view.target));w.camera.updateProjectionMatrix();w.camera.updateMatrixWorld();w.scene.updateMatrixWorld(true);box.setFromObject(w.traveler.root);
  for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z]){point.set(x,y,z).project(w.camera);assert.ok(Math.abs(point.x)<.96,`horizontal crop aspect=${aspect} t=${t} x=${point.x}`);assert.ok(Math.abs(point.y)<.96,`vertical crop aspect=${aspect} t=${t} y=${point.y}`);assert.ok(point.z>-1&&point.z<1);}
 }
});

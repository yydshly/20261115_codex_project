import test from 'node:test';
import assert from 'node:assert/strict';
import {METHODS,DURATION,samplePassage} from '../web/connections-score.mjs';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
test('all seven scores stay finite and are seekable without prior frames',()=>{
 assert.equal(new Set(METHODS.map(m=>m.id)).size,7);
 for(const {id,duration=DURATION}of METHODS)for(let i=0;i<=duration*60;i++){
  const p=samplePassage(id,i/60);for(const k of['position','camera','target']){assert.equal(p[k].length,3);assert.ok(p[k].every(Number.isFinite),`${id}/${k}/${i}`);}
  assert.ok(p.blend>=0&&p.blend<=1);assert.ok(distance(p.camera,p.target)>.1);
  assert.deepEqual(p,samplePassage(id,i/60));
 }
});
test('movement and camera trajectories have no accidental single-frame jumps',()=>{
 for(const {id,duration=DURATION}of METHODS){let last=samplePassage(id,0);for(let i=1;i<=duration*100;i++){
  const p=samplePassage(id,i/100);assert.ok(distance(p.position,last.position)<.04,`${id}:actor@${i/100}`);assert.ok(distance(p.camera,last.camera)<.12,`${id}:camera@${i/100}`);assert.ok(distance(p.target,last.target)<.12,`${id}:target@${i/100}`);last=p;
 }}
});
test('portal keeps one coordinate transform for both actor and camera across the threshold',()=>{
 for(let t=0;t<46;t+=.02){const p=samplePassage('portal',t);assert.ok(Math.abs(p.destinationPosition[2]-p.position[2]-13)<1e-10);assert.ok(Math.abs(p.destinationCamera[2]-p.camera[2]-13)<1e-10);assert.ok(Math.abs(p.destinationTarget[2]-p.target[2]-13)<1e-10);assert.equal(p.world,p.camera[2]>-5.5?'a':'b');}
});
test('time and action keep the actor in place; the response begins after reaching',()=>{
 for(const id of['time','action'])for(let t=0;t<=24;t+=.1)assert.deepEqual(samplePassage(id,t).position,samplePassage(id,0).position);
 assert.equal(samplePassage('action',6).reach,1);assert.ok(samplePassage('action',6).wave<0);assert.ok(samplePassage('action',7).wave>0);
 assert.equal(samplePassage('match',10.99).cut,false);assert.equal(samplePassage('match',11).cut,true);
});

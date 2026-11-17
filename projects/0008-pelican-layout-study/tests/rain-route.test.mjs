import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleJourney,pathAt,PATH_LENGTH,DURATION,legPose} from '../web/rain-route.mjs';
const separation=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

test('the traveler follows one monotone route and stops on the river bank',()=>{
 let previous=0;
 for(let t=0;t<=DURATION;t+=.05){const p=sampleJourney(t);assert.ok(p.distance>=previous-1e-9);assert.ok(separation(p.position,pathAt(p.distance))<1e-9);assert.ok(p.position.every(Number.isFinite));previous=p.distance;}
 assert.deepEqual(sampleJourney(0).position,sampleJourney(7.5).position);
 assert.ok(separation(sampleJourney(55).position,sampleJourney(68).position)<1e-9);
 assert.equal(sampleJourney(68).walk,0);assert.ok(Math.abs(sampleJourney(68).distance-PATH_LENGTH)<1e-9);
});
test('chapter boundaries preserve world and camera positions without a cut',()=>{
 for(const join of[19,45]){
  const a=sampleJourney(join-.00001),b=sampleJourney(join+.00001);
  assert.equal(b.chapter,a.chapter+1);assert.ok(separation(a.position,b.position)<.0001);
  assert.ok(separation(a.camera.offset,b.camera.offset)<.0001);assert.ok(separation(a.camera.target,b.camera.target)<.0001);
 }
 for(const join of[3.2,7.5,20,33,45,54,62]){const a=sampleJourney(join-.00001),b=sampleJourney(join+.00001);assert.ok(separation(a.camera.offset,b.camera.offset)<.001);}
});
test('leg inverse kinematics put planted feet on the shared ground plane',()=>{
 for(let d=0;d<PATH_LENGTH;d+=.025)for(const side of[0,1]){
  const bob=Math.sin(d/1.18*Math.PI*4)*.018,pose=legPose(d,side,bob,1),hipHeight=.75;
  const actualY=hipHeight-.36*Math.cos(pose.hip)-.36*Math.cos(pose.hip+pose.knee);
  const actualZ=-.36*Math.sin(pose.hip)-.36*Math.sin(pose.hip+pose.knee);
  assert.ok(Math.abs(actualY-pose.footY)<.00001);assert.ok(Math.abs(actualZ-pose.footZ)<.00001);
  if(Math.sin(pose.phase)<=0)assert.ok(Math.abs(.035+bob+actualY-.11)<.00001);
  assert.ok(Math.abs(pose.hip+pose.knee+pose.ankle)<1e-9);
 }
});

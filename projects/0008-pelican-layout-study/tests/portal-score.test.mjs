import test from 'node:test';
import assert from 'node:assert/strict';
import {samplePortal,PORTAL_DURATION,GATE} from '../web/portal-score.mjs';
test('discovery and listening really stop the feet before committing to the doorway',()=>{
 for(const [a,b]of[[4.3,8.9],[16.1,18.4],[29.1,36.9]]){const start=samplePortal(a);for(let t=a;t<b;t+=.1){const p=samplePortal(t);assert.deepEqual(p.position,start.position);assert.equal(p.walk,0);}}
 assert.ok(samplePortal(16.5).reach>.95);assert.ok(samplePortal(17).position[2]>GATE.source);assert.ok(samplePortal(34).lookBack>.98);
});
test('the body passes first, camera passes once, and the final camera stays inside the garden',()=>{
 let bodyTime,eyeTime,changes=0,previous='a';
 for(let t=0;t<=PORTAL_DURATION;t+=.01){const p=samplePortal(t);if(bodyTime===undefined&&p.position[2]<GATE.source)bodyTime=t;if(eyeTime===undefined&&p.world==='b')eyeTime=t;if(p.world!==previous)changes++;previous=p.world;}
 assert.ok(bodyTime>18.5&&bodyTime<23);assert.ok(eyeTime>bodyTime+3);assert.equal(changes,1);assert.equal(samplePortal(46).world,'b');
});
test('the final steps remain on the modeled causeway, with room for both feet',()=>{
 for(let t=29;t<=46;t+=.02){const p=samplePortal(t),z=p.destinationPosition[2],center=z>-5?0:Math.sin((-z-5)*.09)*2.6;assert.ok(Math.abs(p.position[0]-center)+.25<1.42);}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { WindField,TreeMotion } from '../web/js/wind.mjs';
import { STATIONS,readSave,chargeQuality,canRing } from '../web/js/state.mjs';
import { findPath,makeWalkable,riverX } from '../web/js/navigation.mjs';
test('a player gust travels through space, expires, and leaves still air',()=>{
 const w=new WindField({ambient:false});w.emit(0,400,1,0,1);assert.equal(w.sample(1000,400).energy,0);
 const early=w.sample(0,400).energy;w.update(2);assert.ok(w.sample(220,400).energy>.9);assert.ok(w.sample(0,400).energy<early*.01);
 w.update(7);assert.equal(w.packets.length,0);assert.equal(w.sample(0,400).energy,0);
});
test('plant poses stay on whole pixels and settle to rest',()=>{
 const rig={kind:'oak',width:100,height:100,origin:[50,100],clumps:[{cx:10,cy:20},{cx:80,cy:20}]};
 const tree=new TreeMotion(rig,180,400),w=new WindField({ambient:false});w.emit(0,400);
 let moved=false;
 for(let i=0;i<1800;i++){w.update(1/60);tree.update(1/60,w);for(const p of tree.offsets){assert.ok(p.every(Number.isInteger));if(p.some(x=>x))moved=true;}}
 assert.ok(moved);assert.ok(tree.offsets.every(p=>p.every(x=>x===0)));
});
test('ringing requires proximity, reading, and a moderate breath',()=>{
 const s=STATIONS[0],near={x:s.x-20,y:s.y+20};
 assert.equal(chargeQuality(.3),'soft');assert.equal(chargeQuality(1.1),'gentle');assert.equal(chargeQuality(2),'strong');
 assert.ok(canRing(s,near,1.1,true));assert.equal(canRing(s,near,1.1,false),false);assert.equal(canRing(s,{x:0,y:0},1.1,true),false);assert.equal(canRing(s,near,2,true),false);
});
test('save data is bounded to the current game and malformed data is recoverable',()=>{
 assert.deepEqual(readSave('{broken'),{completed:[],ended:false});
 assert.deepEqual(readSave(JSON.stringify({version:1,completed:['oak','oak','unknown'],ended:true})),{completed:['oak'],ended:false});
});
test('crossing the creek routes through the bridge instead of through water',()=>{
 const walk=makeWalkable();const path=findPath({x:370,y:530},{x:590,y:465},walk);
 assert.ok(path.length>0);assert.ok(path.every(p=>walk(p.x,p.y)));
 const crossing=path.filter(p=>Math.abs(p.x-riverX(p.y))<38);assert.ok(crossing.length>0);assert.ok(crossing.every(p=>p.y>407&&p.y<437));
});
test('every shipped tree image matches the recorded source-derived hash',async()=>{
 const base=new URL('../web/assets/trees/',import.meta.url),m=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
 assert.equal(m.rigs[0].clumps.length,14);assert.equal(m.rigs[1].clumps.length,8);
 for(const f of m.files){const b=await readFile(new URL(f.file,base));assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);}
 assert.ok(m.rigs.every(r=>r.reconstructionExact));
});

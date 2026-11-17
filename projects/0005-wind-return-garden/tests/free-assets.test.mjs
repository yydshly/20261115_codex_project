import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {frameRect,GARDEN_PROPS,CARE_SPOTS} from '../web/js/free-assets.mjs';
import {TREE_LAYOUT} from '../web/js/scene.mjs';
import {findPath,makeWalkable,riverX} from '../web/js/navigation.mjs';
import {STATIONS} from '../web/js/state.mjs';

test('selected originals and all license notices match the recorded downloads',async()=>{
  const base=new URL('../web/assets/free-samples/',import.meta.url),m=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
  assert.equal(m.assets.length,9);assert.equal(m.files.filter(f=>f.file.endsWith('.png')).length,10);
  assert.equal(m.files.filter(f=>f.file.endsWith('LICENSE.txt')).length,4);
  for(const f of m.files){const bytes=await readFile(new URL(f.file,base));assert.equal(bytes.length,f.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);}
  for(const a of m.assets)for(const pose of Object.values(a.states)){
    const f=m.files.find(f=>f.file===pose.file);assert.ok(f);assert.equal(pose.frames*pose.frameWidth,f.width);assert.equal(pose.frameHeight,f.height);
    assert.ok(pose.bounds[0]>=0&&pose.bounds[2]<=pose.frameWidth);assert.ok(pose.anchor[1]<=pose.frameHeight);
  }
  const cat=m.assets.find(a=>a.id==='cat');assert.equal(cat.states.walk.scale,cat.states.idle.scale);
});
test('animation frames wrap inside the original sheet without interpolating frames',()=>{
  const pose={fps:8,frames:8,frameWidth:86,frameHeight:86};
  assert.deepEqual(frameRect(pose,0),[0,0,86,86]);assert.deepEqual(frameRect(pose,.875),[602,0,86,86]);
  assert.deepEqual(frameRect(pose,1),[0,0,86,86]);assert.deepEqual(frameRect(pose,-1),[0,0,86,86]);
});
const trees=TREE_LAYOUT.map(([kind,x,y,scale])=>({x,y,scale,rig:{kind}})),walk=makeWalkable(trees,GARDEN_PROPS);
test('new props do not block the three chimes, living corners, bench or bridge',()=>{
  for(const p of [...STATIONS.map(s=>({x:s.x-24,y:s.y+24})),...CARE_SPOTS,{x:366,y:500}]){
    const route=findPath({x:370,y:530},p,walk);assert.ok(route.length,JSON.stringify(p));assert.ok(route.every(p=>walk(p.x,p.y)));
  }
  for(const p of GARDEN_PROPS.filter(p=>p.radius))assert.equal(walk(p.x,p.y),false);
});

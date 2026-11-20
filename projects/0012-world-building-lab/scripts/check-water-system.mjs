import assert from 'node:assert/strict';
import {riverSample,riverLevel,riverField,branchSample,waterAt,waterStops,waterPlatforms,waterTrail,waterRouteSample,waterObservation,waterNotebook,FALL_T,FALL_TOP,FALL_BOTTOM,riverBridge,SOURCE_POOL} from '../web/water-system.js';
import {terrainHeight,walkingSurface,walkable,plots} from '../web/large-world.js';
assert.equal(waterStops.length,6);
assert.equal(FALL_TOP-FALL_BOTTOM,8);
assert.equal(riverLevel(FALL_T,true),FALL_TOP);assert.equal(riverLevel(FALL_T),FALL_BOTTOM);
let length=0,previous=riverSample(0),maxLevelRise=0,minDepth=Infinity;
for(let i=1;i<=1600;i++){const p=riverSample(i/1600);length+=Math.hypot(p.x-previous.x,p.z-previous.z);maxLevelRise=Math.max(maxLevelRise,p.level-previous.level);const depth=p.level-terrainHeight(p.x,p.z);minDepth=Math.min(minDepth,depth);assert.ok(waterAt(p.x,p.z),'Main river must remain connected');assert.ok(depth>.05,'River surface must stay above its carved bed');previous=p;}
assert.equal(maxLevelRise,0,'Water must not flow uphill');assert.equal(riverSample(1).level,0,'River must meet the sea at the same level');
for(const b of [1,2])for(let i=0;i<=120;i++){const p=branchSample(b,.70+.27*i/120);assert.ok(waterAt(p.x,p.z));assert.ok(p.level-terrainHeight(p.x,p.z)>.05,'Delta branches need their own real bed');}
const delta=branchSample(1,.82),main=riverSample(.82);assert.ok(Math.hypot(delta.x-main.x,delta.z-main.z)>delta.half+main.half,'Delta must contain separated channels and exposed land');
for(const r of waterStops){assert.ok(walkable(r.x,r.z),r.name+' viewing point must be supported');assert.ok(walkingSurface(r.x,r.z)>=waterPlatforms[r.index].y-.01);}
for(const p of waterTrail)assert.ok(walkingSurface(p.x,p.z)>=p.y-.01,'Rendered boardwalk and walking support must agree');
for(const t of [.08,.22,.35,.56,.76]){const p=riverSample(t);assert.equal(walkable(p.x,p.z),false,'Walking must stop at elevated river water too');}
assert.equal(walkable(riverBridge.x,riverBridge.z),true,'Bridge must support passage over the river');
assert.ok(SOURCE_POOL.level-terrainHeight(SOURCE_POOL.x,SOURCE_POOL.z)>2,'Source pool needs a basin');
const ids=new Set(waterStops.flatMap(r=>[0,1,2].map(s=>waterObservation(r.index,s).id)));assert.equal(ids.size,18);
const md=waterNotebook(ids);assert.equal((md.match(/### ✓ 已浏览/g)||[]).length,18);assert.ok(md.includes('\n\n'),'Export must contain actual newlines');
for(const p of plots){const w=waterAt(p.x,p.z);assert.ok(!w||p.y>w.level,'Existing buildings must not be submerged');}
for(let i=0;i<=300;i++){const p=waterRouteSample(i/300);assert.ok([p.x,p.y,p.z].every(Number.isFinite));}
console.log(JSON.stringify({result:'passed',stations:6,observations:18,riverLengthMetres:Math.round(length),sourceLevel:SOURCE_POOL.level,seaLevel:0,waterfallMetres:8,maxLevelRise,minCentreDepth:minDepth,boardwalkSamples:waterTrail.length},null,2));

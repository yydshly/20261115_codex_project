import assert from 'node:assert/strict';
import {WORLD,regions,worldHeight,worldSlope,surfaceColor,weightsAt} from '../web/world-layout.js';
let min=Infinity,max=-Infinity,maxHalfStep=0,wet=0,dry=0;
for(let x=-WORLD.width/2;x<=WORLD.width/2;x+=8)for(let z=-WORLD.depth/2;z<=WORLD.depth/2;z+=8){
 const h=worldHeight(x,z),s=worldSlope(x,z),w=weightsAt(x,z);
 assert.ok(Number.isFinite(h)&&Number.isFinite(s));assert.equal(h,worldHeight(x,z),'Height field must be repeatable');
 min=Math.min(min,h);max=Math.max(max,h);maxHalfStep=Math.max(maxHalfStep,Math.abs(worldHeight(x+.5,z)-h),Math.abs(worldHeight(x,z+.5)-h));
 const rgb=surfaceColor(x,z,h,s);assert.ok(rgb.every(v=>Number.isFinite(v)&&v>=0&&v<=255));
 assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-8,'Biome blend must remain normalized across the world');
}
assert.ok(maxHalfStep<8,'Unexpected height jump at a region boundary');
assert.equal(regions.length,10);assert.equal(new Set(regions.map(r=>r.id)).size,10);
for(const r of regions)for(const key of ['lead','shape','surface','elements','next'])assert.ok(r[key]?.length>12,`${r.id}: incomplete guided reading`);
for(let x=-210;x<-160;x+=3)for(let z=-85;z<-40;z+=3){if(worldHeight(x,z)<0)wet++;else dry++;}
assert.ok(wet>0&&dry>0,'Wetland must contain both shallow water and exposed land');
assert.ok(worldHeight(130,182)>0&&worldHeight(130,130)<0,'Final island must be separated by a sea channel');
assert.ok(worldHeight(166,42)<28.6&&worldHeight(179,42)>28.6,'Crater must expose lava below its rim');
assert.ok(worldHeight(28,-10)>worldHeight(-79,91)+25,'Mountain region must establish a distinct elevation');
console.log(JSON.stringify({result:'passed',world:{width:WORLD.width,depth:WORLD.depth,min,max,maxHalfStep},routeStops:regions.length,wetland:{wet,dry}},null,2));

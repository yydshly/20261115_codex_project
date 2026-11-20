import assert from 'node:assert/strict';
import {LARGE_WORLD,VOLCANO,stops,plots,decks,roadPoint,roadSample,terrainHeight,walkingSurface,walkable,stationView,viewClear,nearestRoad} from '../web/large-world.js';
assert.equal(stops.length,10);assert.ok(LARGE_WORLD.width>=3800&&LARGE_WORLD.depth>=3100);
let minSeparation=Infinity;
for(let i=0;i<10;i++)for(let j=i+1;j<10;j++)minSeparation=Math.min(minSeparation,Math.hypot(stops[i].x-stops[j].x,stops[i].z-stops[j].z));
assert.ok(minSeparation>450,'Regions should occupy distinct large-scale spaces');
assert.ok(plots.filter(p=>p.kind==='cottage').every(p=>p.halfX<6),'Building dimensions should stay at human scale');
for(const [i,r] of stops.entries()){const p=roadPoint(i/9);assert.ok(Math.hypot(p.x-r.x,p.z-r.z)<1e-6,'Route must connect each region');const view=stationView(i);assert.ok([view.x,view.y,view.z].every(Number.isFinite));assert.ok(view.y>=terrainHeight(view.x,view.z)+1.5,'Viewpoint must remain above terrain');}
let maxGrade=0,previous=roadSample(0);
for(let i=1;i<=1600;i++){const p=roadSample(i/1800),distance=Math.hypot(p.x-previous.x,p.z-previous.z);maxGrade=Math.max(maxGrade,Math.abs(p.y-previous.y)/distance);previous=p;}
assert.ok(maxGrade<=.270001,'Road height should respect the declared grade cap');
let craterClearance=Infinity;for(let i=0;i<=1600;i++){const p=roadPoint(i/1800);craterClearance=Math.min(craterClearance,Math.hypot(p.x-VOLCANO.x,p.z-VOLCANO.z));}
assert.ok(craterClearance>VOLCANO.radius+20,'Land route must go around the lava crater');
const craterView=stationView(7);let sightClearance=Infinity;
for(let i=1;i<95;i++){const u=i/100,x=craterView.x+(VOLCANO.x-craterView.x)*u,z=craterView.z+(VOLCANO.z-craterView.z)*u,y=craterView.y+(VOLCANO.lava-craterView.y)*u;sightClearance=Math.min(sightClearance,y-terrainHeight(x,z));}
assert.ok(sightClearance>.3,'Rim viewpoint must see the lava above intervening terrain');
for(const p of plots){const road=nearestRoad(p.x,p.z,12);assert.ok(!road,'Buildings must leave clearance beside the main road');}
assert.equal(walkable(780,780),false,'Walking must not continue into the sea channel');
assert.equal(walkable(VOLCANO.x,VOLCANO.z),false,'Walking must stop before entering the lava');
for(let i=1;i<10;i++)assert.ok(viewClear(stationView(i)),`Region ${i+1}: terrain must not hide the default landmark view`);
for(const d of decks){assert.ok(walkingSurface(d.x,d.z)>=d.y);assert.ok(walkable(d.x,d.z),'Pier surface should support the camera above water');}
for(let i=20;i<1500;i+=73){const t=(i+.37)/1800,p=roadSample(t),nearest=nearestRoad(p.x,p.z,2);assert.ok(nearest&&nearest.distance<.08);assert.ok(Math.abs(nearest.y-p.y)<.04,'Interpolated road surface should not jump between discrete sample heights');}
const entry=stationView(0);assert.ok(walkable(entry.x,entry.z));assert.ok(Math.abs(entry.y-walkingSurface(entry.x,entry.z)-LARGE_WORLD.eye)<1e-8);
console.log(JSON.stringify({result:'passed',dimensions:LARGE_WORLD,minRegionSeparation:minSeparation,maxRoadGrade:maxGrade,buildingPlots:plots.length},null,2));

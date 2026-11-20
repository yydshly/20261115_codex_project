import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {environmentAt,candidateFor,clearanceAt,vegetationPlacements,plantTypes,plantLayers,VEGETATION_BAY_VIEW,countNear} from '../web/vegetation-rules.js';
import {vegetationStops,vegetationRouteSample,vegetationObservation,vegetationNotebook} from '../web/vegetation-learning.js';
import {waterStops,riverSample} from '../web/water-system.js';
import {walkable} from '../web/large-world.js';

const records=[...vegetationPlacements()],layers=Object.fromEntries(Object.keys(plantLayers).map(k=>[k,0])),species={},near=vegetationStops.map(()=>new Set());
for(const p of records){
 const e=environmentAt(p.x,p.z);assert.ok(plantTypes[p.kind]);assert.equal(p.layer,plantTypes[p.kind].layer);assert.ok(clearanceAt(p.x,p.z,p.layer));assert.ok(e.slope<=.9);layers[p.layer]++;species[p.kind]=(species[p.kind]||0)+1;
 if(p.layer==='canopy'){assert.ok(e.depth<-.38&&e.height<=170&&e.slope<=.65);assert.ok(!(e.salt>.35&&e.height<4.5),'Tall trees must retreat from low salt-wet ground');}
 if(p.kind==='lily'){assert.ok(e.salt<=.35&&e.depth>.25&&e.depth<1.1);assert.ok(Math.abs(p.y-e.level-.04)<1e-7,'Floating leaves must use the water level');}
 if(p.kind==='reed')assert.ok(e.salt<=.35&&e.depth>.07&&e.depth<.8);
 if(p.kind==='rush')assert.ok(e.salt>.35&&e.depth>-.6&&e.depth<.12);
 if(p.kind==='seagrass')assert.ok(e.salt>.35&&e.depth>=.18&&e.depth<1.3);
 if(p.layer==='ground')assert.ok(e.depth<=0);
 if(p.kind!=='lily')assert.ok(Math.abs(p.y-e.height+.035)<1e-7,'Rooted plants must attach to terrain');
 vegetationStops.forEach((r,i)=>{if(Math.hypot(p.x-r.x,p.z-r.z)<130)near[i].add(p.kind);});
}
assert.equal(Object.keys(species).length,Object.keys(plantTypes).length,'Every supplied morphology should actually appear');
for(const count of Object.values(layers))assert.ok(count>0);
assert.ok(near[0].has('alpineTuft')&&near[0].has('dwarf'));assert.ok(!near[0].has('lily'));
assert.ok(near[2].has('birch')&&near[2].has('oak'));assert.ok(near[3].has('reed')&&near[3].has('lily'));
assert.ok(near[4].has('rush')&&near[4].has('coastShrub'));assert.ok(near[5].has('coastPine'));
for(const t of [0,.2,.4,.6,.8,.96]){const r=riverSample(t),e=environmentAt(r.x,r.z);for(const layer of ['canopy','understory','ground'])assert.equal(candidateFor(e,layer,.5),null,'Deep main channels must remain clear');}
const dryCounts=countNear(records,1104,-380.9);assert.equal(dryCounts.aquatic,0,'The inspector must count the actual dry location, not a water-route stop');assert.ok(dryCounts.understory>0);
const ids=new Set(vegetationStops.flatMap(r=>[0,1,2].map(stage=>vegetationObservation(r.index,stage).id)));assert.equal(ids.size,18);
const md=vegetationNotebook(ids);assert.equal((md.match(/### ✓ 已浏览/g)||[]).length,18);assert.ok(md.includes('\n\n'));
for(const r of vegetationStops)assert.ok(walkable(r.x,r.z),'All six viewing locations must have a walking surface');
for(let i=0;i<=300;i++){const p=vegetationRouteSample(i/300);assert.ok([p.x,p.y,p.z].every(Number.isFinite));}
assert.deepEqual(vegetationStops.slice(0,5).map(r=>[r.x,r.z]),waterStops.slice(0,5).map(r=>[r.x,r.z]));assert.deepEqual([vegetationStops[5].x,vegetationStops[5].z],[VEGETATION_BAY_VIEW.x,VEGETATION_BAY_VIEW.z]);
const again=[];for(const p of vegetationPlacements()){again.push(p);if(again.length===100)break;}assert.deepEqual(again,records.slice(0,100),'Distribution must be deterministic');
const result={result:'passed',fixedInstances:records.length,layers,species,stations:near.map((kinds,index)=>({name:vegetationStops[index].name,kinds:[...kinds]})),observations:18,limits:'Authored scene rules; not ecology or species simulation'};
writeFileSync(new URL('../assets/vegetation-distribution-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

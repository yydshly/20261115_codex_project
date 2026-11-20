import assert from 'node:assert/strict';
import {benchmarkLength,benchmarkPoint} from '../web/benchmark-trail.js';
import {terrainHeight} from '../web/large-world.js';
import {buildRidgeBayFormation,ridgeBayStations} from '../web/ridge-bay-formation.js';
import {formationMaterials} from '../web/world-hydraulics.js';
import {formationCell,formationHabitat} from '../web/world-formation.js';
import {buildWorldWaterBalance} from '../web/watershed-world.js';
import {wetlandBands} from '../web/wetland-layout.js';

const world=buildWorldWaterBalance();
const model=buildRidgeBayFormation(world);
assert.deepEqual(model.stations.map(s=>s.id),['ridge','source-pool','river-valley','wetland','bay']);
assert.equal(model.stations,ridgeBayStations);
assert.equal(model.stations[0].at,0);
assert.equal(model.stations.at(-1).at,benchmarkLength);
assert.equal(model.read('unknown',7),null);
assert.equal(model.read('ridge',13),null);
for(const [index,station] of model.stations.entries()){
  if(index)assert.ok(station.at>model.stations[index-1].at);
  const at=benchmarkPoint(station.at);
  assert.deepEqual([station.x,station.z],[at.x,at.z]);
  assert.ok(model.route.some(p=>p.x===at.x&&p.z===at.z));
  assert.ok(station.view.every(Number.isFinite));
  for(const month of [1,4,7,10]){
    const view=model.read(station.id,month);
    assert.equal(view.station,station);
    assert.equal(view.month,month);
    assert.ok(view.readings.every(r=>r.label.length&&r.value.length));
    assert.ok(view.explanation.length);
    assert.ok(view.points.length>=38);
    view.points.forEach((p,i)=>{
      assert.equal(p.y,terrainHeight(p.x,p.z));
      if(i)assert.ok(p.distance>view.points[i-1].distance);
      assert.ok(p.water===null||p.water>p.y);
      assert.ok(p.compareY===null||p.compareY>=p.y);
      assert.ok(Object.hasOwn(formationMaterials,p.material));
      assert.ok(p.habitat===null||Object.hasOwn(formationHabitat,p.habitat)||Object.hasOwn(wetlandBands,p.habitat));
    });
  }
}

const ridge=model.read('ridge',1);
const [north,south]=ridge.flows;
assert.ok(north.points.at(-1).z<north.points[0].z);
assert.ok(south.points.at(-1).z>south.points[0].z);
for(const {points} of [north,south]){
  const indices=points.map(p=>formationCell(world.climate.grid,p.x,p.z));
  for(let i=1;i<indices.length;i++){
    assert.equal(world.graph.next[indices[i-1]],indices[i]);
    assert.ok(points[i].y<points[i-1].y);
  }
}
assert.ok(ridge.points.some(p=>p.compareY-p.y>15));

const numberWet=reading=>reading.points.filter(p=>p.water!==null).length;
for(const id of ['source-pool','river-valley','wetland','bay']){
  assert.notDeepEqual(model.read(id,1).readings,model.read(id,7).readings);
}
for(const id of ['river-valley','wetland']){
  assert.ok(numberWet(model.read(id,7))>numberWet(model.read(id,1)));
}
assert.deepEqual(new Set(model.read('wetland',7).points.map(p=>p.habitat)),new Set(Object.keys(wetlandBands)));
const relief=r=>Math.max(...r.points.map(p=>p.compareY-p.y));
assert.ok(relief(model.read('river-valley',7))>2);
assert.ok(relief(model.read('bay',7))>relief(model.read('bay',1)));

console.log('Ridge-to-bay terrain, surveyed stations, distinct divides and shared seasonal readings passed.');

import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const THREE=await import('three');
const {terrainHeight}=await import('../web/large-world.js');
const {buildWorldWaterBalance,cellPosition}=await import('../web/watershed-world.js');
const {environmentLines}=await import('../web/environment-lines.js');
const {parentAt}=await import('../web/groundwater-layout.js');
const {northField,NORTH_OUTLET}=await import('../web/northern-watershed.js');
const {createWaterExchangeScene}=await import('../web/water-exchange-scene.js');
const {buildWaterExchange,exchangeState,exchangeLayers,exchangeLinks,exchangeWaterTable}=await import('../web/water-exchange.js');

const world=buildWorldWaterBalance(),model=buildWaterExchange(world,terrainHeight);
const north=world.bodies.findIndex(p=>p.id==='north'),{grid}=model;
assert.ok(model.cells.length>0&&model.divides.length>0);
for(const k of model.cells){
  const p=cellPosition(grid,k);
  assert.equal(world.graph.owner[k],north);
  assert.equal(parentAt(p.x,p.z),'alluvium');
  assert.equal(world.graph.waterCells[k],0);
}
assert.equal(model.totalArea,model.cells.length*grid.step**2);
assert.ok(model.rills.length>2);
for(const path of model.rills){
  for(let i=1;i<path.length;i++){
    assert.equal(world.graph.next[path[i-1]],path[i]);
    assert.ok(world.climate.height[path[i]]<world.climate.height[path[i-1]]);
  }
}
for(const f of model.frames){
  const basin=world.frames[f.month-1].records.north;
  assert.ok(f.surface<=basin.surface&&f.baseflow<=basin.baseflow&&f.recharge<=basin.percolation);
  assert.ok(Math.abs(f.start+f.recharge-f.baseflow-f.ground)<1e-7);
}
const wet=exchangeState(model,'wet'),dry=exchangeState(model,'dry');
const rainless=exchangeState(model,'dry',true);
assert.ok(wet.surface>200&&wet.wetland.area>dry.wetland.area&&wet.wetland.stage>dry.wetland.stage);
assert.equal(dry.surface,0);
assert.ok(dry.baseflow>0&&rainless.baseflow>0);
assert.equal(rainless.surface+rainless.recharge,0);
assert.ok(Math.abs(rainless.ground+rainless.groundReleased-dry.ground)<1e-8);
assert.ok(rainless.groundReleased>rainless.baseflow);
assert.ok(model.spring.y>dry.river);
assert.ok(model.creek.every((p,i)=>i===0||p.y<=model.creek[i-1].y+.05));
assert.equal(northField(model.creek.at(-1).x,model.creek.at(-1).z).reach,'fan-out');
assert.ok(model.routes.low.some(p=>Math.hypot(p.x-NORTH_OUTLET.x,p.z-NORTH_OUTLET.z)<.5));
assert.ok(model.routes.low.at(-1).level<model.head.level);
for(const state of [wet,dry,rainless]){
  const h=model.profile.map(p=>exchangeWaterTable(model,state,p));
  assert.ok(h.every((y,i)=>i===0||y<=h[i-1]+.04));
}
for(const r of environmentLines){
  assert.ok(exchangeLinks[r.id].overview);
  for(const [key,focus] of Object.entries(exchangeLinks[r.id])){
    assert.ok(key==='overview'||r.stops.some(p=>p.id===key));
    assert.ok(model.stations.some(p=>p.id===focus));
  }
}

const scene=new THREE.Scene(),calls=[];
const exchange=createWaterExchangeScene(scene,{model:world,show:(...args)=>calls.push(args),hide:()=>calls.push(['hide'])});
const layers=new Set(exchangeLayers.map(l=>l.id));
assert.equal(exchange.show({season:'wet',layers,overlay:true}).labels.length,3);
exchange.hide();
assert.equal(calls.length,0,'Environment lines retain ownership of their seasonal water surfaces.');
assert.equal(exchange.show({season:'wet',layers}).labels.length,5);
assert.deepEqual(calls.at(-1),[7,'wetland','water']);
assert.equal(exchange.show({season:'dry',layers,station:model.stations[2],noRain:true}).state.surface,0);
assert.deepEqual(calls.at(-1),[1,'wetland','water']);
exchange.update(.016);
exchange.hide();
assert.deepEqual(calls.at(-1),['hide']);
scene.traverse(o=>{
  const p=o.geometry?.getAttribute('position');
  if(p)assert.ok(p.array.every(Number.isFinite));
});
console.log('Water exchange routing, fan contributions, rainless recession, seasonal wetland, Three.js paths and view restoration passed.');

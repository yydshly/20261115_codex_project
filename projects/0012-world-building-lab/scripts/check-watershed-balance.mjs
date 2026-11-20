import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const THREE=await import('three');
const {drainageGraph,makeStorageCurve,simulateWaterBalance,LOCAL,COAST}=await import('../web/watershed-balance.js');
const {buildWorldWaterBalance,seasonalRiverLevel,riverWindow}=await import('../web/watershed-world.js');
const {clippedWaterGeometry,createWatershedBalanceScene}=await import('../web/watershed-balance-scene.js');
const {riverLevel}=await import('../web/water-system.js');
const {terrainHeight}=await import('../web/large-world.js');
const {constructionStops,constructionObservation}=await import('../web/construction-learning.js');

const grid={cols:5,rows:5,step:10,x0:0,z0:0};
const height=Float32Array.from([
  -2, -1, 7, 8, 5,
  -2,  1, 7, 6, 5,
  -2,  2, 6,-1, 5,
  -2,  1, 5, 6, 5,
  -2, -1, 7, 7, 5
]);
const receivers=new Int16Array(height.length).fill(-1);
receivers[8]=0;
const graph=drainageGraph(grid,height,receivers);
assert.equal(graph.owner[11],COAST);
assert.equal(graph.owner[13],LOCAL,'An inland low cell below sea level has no ocean connection.');
assert.equal(graph.next[13],-1);
const modelCurve=makeStorageCurve([{bed:0,area:15},{bed:1,area:5}],0,3);
assert.equal(modelCurve.volumeAt(2),35);
assert.ok(Math.abs(modelCurve.stageAt(35)-2)<1e-8);

const world=buildWorldWaterBalance();
const {frames,climate}=world;
assert.equal(frames.length,12);
assert.equal(climate.height.length,7857);
const maxError=Math.max(...frames.map(frame=>Math.abs(frame.totals.residual)));
assert.ok(maxError<1e-6,'Every monthly world budget must close in scenario cubic metres.');
const ranges={};
for(const body of world.bodies){
  const records=frames.map(f=>f.records[body.id]);
  assert.ok(records.every(v=>Math.abs(v.residual)<1e-6));
  assert.ok(records.every(v=>v.storage>=0&&v.outflow>=0));
  if(body.closed)assert.ok(records.every(v=>v.outflow===0));
  if(!body.curve)continue;
  assert.ok(records.every(v=>v.storage<body.curve.capacity));
  for(const v of records)assert.ok(Math.abs(body.curve.volumeAt(v.stage)-v.storage)<1e-6);
  const stages=records.map(v=>v.stage),areas=records.map(v=>v.area);
  const low=Math.min(...stages),high=Math.max(...stages);
  assert.ok(high-low>.07);
  ranges[body.id]={low,high,lowMonth:stages.indexOf(low)+1,highMonth:stages.indexOf(high)+1,
    wetAreaDifference:Math.max(...areas)-Math.min(...areas)};
}
assert.ok(frames[3].records.ice.melt>frames[0].records.ice.melt+20);
assert.ok(frames[0].records.main.baseflow>0&&frames[6].records.main.surface>frames[0].records.main.surface);
for(const {records} of frames){
  assert.equal(records.main.incoming,records.upper.outflow+records.lake.outflow);
  assert.equal(records.wetland.incoming,records.main.outflow+records.north.outflow);
  let last=Infinity;
  for(let i=0;i<=800;i++){
    const t=riverWindow[0]+i/800*(riverWindow[1]-riverWindow[0]);
    const y=seasonalRiverLevel(t,records.main.stage,records.wetland.stage);
    assert.ok(y<=last+1e-8,'Upstream high water must not create an uphill stage profile.');
    if(i===0||i===800)assert.ok(Math.abs(y-riverLevel(t))<1e-8);
    last=y;
  }
}
for(const id of ['lake','salt','saltMarsh']){
  const r=ranges[id];
  const low=clippedWaterGeometry(world.patches[id],()=>r.low),high=clippedWaterGeometry(world.patches[id],()=>r.high);
  assert.ok(low.attributes.position.count>100&&high.attributes.position.count>low.attributes.position.count);
  for(const geometry of [low,high]){
    const pos=geometry.attributes.position;
    for(let i=0;i<pos.count;i+=9){
      assert.ok(pos.getY(i)>terrainHeight(pos.getX(i),pos.getZ(i))-.22);
    }
  }
  low.dispose();high.dispose();
}
const material=new THREE.MeshStandardMaterial();
const mesh=()=>new THREE.Mesh(new THREE.BufferGeometry(),material);
const water={river:mesh(),flowMaterial:material}, inland={lake:mesh(),channels:mesh()}, salt={water:new THREE.Group()};
inland.channels.visible=false;
let bound=null;
const preview=createWatershedBalanceScene(new THREE.Scene(),{water,inland,salt,reduced:true,weather:{
  setAnnualClimate(texture){bound=texture;}
}});
preview.show(7,'main','runoff');
assert.ok(bound?.isDataTexture&&!water.river.visible&&!inland.lake.visible&&!salt.water.visible);
preview.show(2,'salt','water');
preview.hide();
assert.ok(!bound&&water.river.visible&&inland.lake.visible&&salt.water.visible&&!inland.channels.visible);
assert.equal(constructionStops.length,116);
assert.equal(new Set(constructionStops.flatMap(r=>[0,1,2,3].map(s=>constructionObservation(r.index,s).id))).size,464);
console.log(JSON.stringify({months:frames.length,gridCells:climate.height.length,
  waterBalanceErrorM3:maxError,range:ranges,shorelineGeometry:true,downhillStages:true,
  endorheicOutflow:0,originalMeshesRestored:true,constructionStations:116,observations:464},null,2));

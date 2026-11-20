import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
register('./three-test-loader.mjs',import.meta.url);

const THREE=await import('three');
const {buildWorldWaterBalance}=await import('../web/watershed-world.js');
const {buildFormationStudy,drySpellDays,formationLayers,lineFormation}=await import('../web/world-formation.js');
const {formationMaterials,monthlyHydraulics}=await import('../web/world-hydraulics.js');
const {createFormationScene}=await import('../web/formation-scene.js');

const world=buildWorldWaterBalance(),study=buildFormationStudy(world);
const {hydraulics,frames,graph}=world;
assert.equal(hydraulics.filter(Boolean).length,graph.ocean.filter(isSea=>!isSea).length);
assert.ok(hydraulics.every((p,k)=>graph.ocean[k]?p===null:p.capacity>0&&p.release>0&&p.release<1));
assert.ok(monthlyHydraulics(formationMaterials.alluvium,.15,.19).intake>
  monthlyHydraulics(formationMaterials.crystalline,.15,.19).intake);
assert.ok(monthlyHydraulics(formationMaterials.alluvium,.15,.19).intake>
  monthlyHydraulics(formationMaterials.alluvium,.65,.19).intake);
assert.ok(frames.every(f=>Math.abs(f.totals.residual)<1e-6));

const reported={};
for(const basin of study.basins){
  assert.ok(basin.cells.length>70&&basin.probes.every(p=>study.groups[p.k]===basin.id));
  for(const path of basin.paths){
    assert.ok(path.every(k=>study.groups[k]===basin.id));
    for(let i=1;i<path.length;i++)assert.equal(graph.next[path[i-1]],path[i]);
  }
  const wet=study.stats(basin,7),dry=study.stats(basin,7,drySpellDays);
  assert.ok(wet.surface>0&&wet.recharge>0&&wet.baseflow>0);
  assert.ok(dry.ground<wet.ground&&dry.baseflow>0&&dry.rain+dry.surface+dry.recharge===0);
  if(basin.id==='closed'){
    assert.equal(wet.outflow,0);assert.equal(dry.outflow,0);
    assert.ok(wet.stage>0&&wet.evaporation>0);
  }else{
    assert.ok(wet.outflow>0);assert.equal(dry.outflow,null);
  }
  const same=study.sameStorm(basin);
  assert.equal(same.rain,48);
  assert.ok(Math.abs(same.rain-same.runoff-same.soil-same.groundwater-same.discharge)<1e-8);
  reported[basin.id]={cells:basin.cells.length,runoffIn48mm:same.runoff,outflow:wet.outflow,
    rainlessBaseflow:dry.baseflow,bankHabitat:study.read(basin.probes[1].k,7).habitat};
}
assert.ok(reported.central.runoffIn48mm<reported.closed.runoffIn48mm&&reported.closed.runoffIn48mm<reported.south.runoffIn48mm);
assert.deepEqual(Object.values(reported).map(p=>p.bankHabitat),['marsh','woodland','salt']);

const scene=new THREE.Scene(),waterCalls=[],mapCalls=[];
const display=createFormationScene(scene,{
  model:world,show(...args){waterCalls.push(args);},hide(){waterCalls.push('restored');}
},{setLithologyMap(texture){mapCalls.push(texture);}});
const state={month:7,days:0,layer:'water',focus:'all',probe:null};
assert.equal(display.show(state).labels.length,3);
for(const {id:layer} of formationLayers)display.show({...state,month:1,focus:'south',layer});
assert.ok(mapCalls[0].isDataTexture&&mapCalls.some(x=>x===null));
assert.deepEqual(display.show({...state,focus:'closed',probe:1}).labels.map(p=>p.text),
  ['盐湖与盐沼 · 盆内蓄水','浅洼盐壳与盐湿土']);
display.hide();
assert.equal(waterCalls.at(-1),'restored');
assert.equal(mapCalls.at(-1),null);
assert.equal(scene.getObjectByName('world formation comparison').visible,false);

const source=name=>readFileSync(new URL(`../web/${name}`,import.meta.url),'utf8');
assert.deepEqual(Object.values(lineFormation),['central','south','closed']);
assert.ok(source('environment-lines-ui.js').includes("openFormation('formation',focus)"));
assert.ok(source('expedition.js').includes("formationMode:planName==='formation'"));
assert.ok(source('journey.html').includes('href="expedition.html?plan=formation#build-1"'));
console.log(JSON.stringify(reported,null,2));

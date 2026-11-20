import assert from 'node:assert/strict';
import {register} from 'node:module';
import {buildFormationStudy,formationCell} from '../web/world-formation.js';
import {buildWorldWaterBalance} from '../web/watershed-world.js';
import {basinCellWater,basinEventDefaults,basinEventHours,createBasinEventModel,surveyEventBank} from '../web/basin-event-model.js';
import {buildBasinDivides} from '../web/basin-divide.js';
import {buildWaterExchange} from '../web/water-exchange.js';
import {terrainHeight} from '../web/large-world.js';

register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('three');
const {createFormationScene}=await import('../web/formation-scene.js');
const {clippedWaterGeometry}=await import('../web/watershed-balance-scene.js');

const ramp={
  bed:[[0,0],[1,0],[0,1],[1,1]].map(([x,z])=>({x,z,bed:x})),
  cells:[{indices:[0,1,2,3]}]
};
const newlyWet=clippedWaterGeometry(ramp,()=>.6,{heightAt:x=>x,referenceAt:()=>.3});
const vertices=newlyWet.attributes.position;
assert.ok(vertices.count>0);
for(let i=0;i<vertices.count;i++){
  assert.ok(vertices.getX(i)>=.299&&vertices.getX(i)<=.601);
}
newlyWet.dispose();
const world=buildWorldWaterBalance(),study=buildFormationStudy(world);
const model=createBasinEventModel(study),event=model.run();
assert.deepEqual(event.settings,basinEventDefaults);
const [central,south,closed]=event.results;
const end=r=>r.frames.at(-1);
assert.ok(central.peak>south.peak);
assert.ok(end(central).exported>0&&end(south).exported>0);
assert.ok(end(central).deposited>end(south).deposited);
assert.ok(closed.frames.every(f=>f.exported===0&&f.saltExport===0&&f.sedimentExport===0));
assert.ok(end(closed).saltRetained>500&&end(closed).retained>0);
assert.ok(closed.frames[24].readings.saltMarsh.salinity<closed.frames[0].readings.saltMarsh.salinity);
assert.ok(closed.frames[120].readings.saltMarsh.salinity>closed.frames[24].readings.saltMarsh.salinity);
const wetter=surveyEventBank(event.surfaces.wetland,central.frames,'wetland',24);
const receding=surveyEventBank(event.surfaces.wetland,central.frames,'wetland',48);
assert.ok(wetter.flooded>receding.flooded&&receding.damp>0);

const divides=buildBasinDivides(model),exchange=buildWaterExchange(world,terrainHeight);
const cell=p=>formationCell(study.grid,p.x,p.z);
assert.equal(divides.reduce((count,d)=>count+d.stops.length,0),12);
const wetSamples=divides.map((d,i)=>{
  const {slope,local,handoff,waterway,stops,byCell}=d,r=event.results[i];
  assert.ok(slope.length>=3&&local.length>=2);
  const belongs=path=>path.forEach((p,j)=>{
    if(j+1<path.length)assert.equal(world.graph.next[cell(p)],cell(path[j+1]));
    assert.ok(study.height[cell(p)]<=study.height[cell(path[Math.max(0,j-1)])]);
  });
  belongs(slope);belongs(local);
  assert.ok(slope.every(p=>study.groups[p.k]===d.basin.id)&&local.every(p=>study.groups[cell(p)]==='unresolved'));
  assert.equal(handoff[0],slope.at(-1));assert.equal(handoff[1],waterway[0]);
  assert.equal(stops[3].x,waterway.at(-1).x);assert.equal(stops[3].z,waterway.at(-1).z);
  assert.equal(stops[3].node,['centralMouth','south','saltMarsh'][i]);
  assert.equal(slope.at(-1).sink,['north','southUpland','saltMarsh'][i]);
  assert.ok(d.section.every(p=>p.y===terrainHeight(p.x,p.z)));
  const sample=byCell.get(cell(stops[1])),wet=basinCellWater(r.frames[8],sample),dry=basinCellWater(r.frames[24],sample);
  assert.ok(Math.abs(wet.infiltration+wet.runoff-9.6)<1e-5);
  assert.ok(dry.runoff===0&&dry.infiltration===0&&dry.baseflow>0);
  return wet;
});
assert.ok(wetSamples[0].infiltration>wetSamples[2].infiltration&&wetSamples[2].infiltration>wetSamples[1].infiltration);
assert.deepEqual(divides[0].springCreek,exchange.creek);
assert.equal(divides[0].stops[2].x,exchange.spring.x);
assert.ok(divides.slice(1).every(d=>d.springCreek.length===0));

for(const run of [event,model.run({rain:96,duration:4,month:1})]){
  for(const r of run.results){
    assert.equal(r.frames.length,basinEventHours+1);
    assert.ok(Math.abs(end(r).rainTotal/r.area*1000-run.settings.rain)<1e-8);
    assert.ok(end(r).deposited>0);
    for(const f of r.frames){
      for(const k of ['waterResidual','sedimentResidual','saltResidual'])
        assert.ok(Math.abs(f[k])<1e-6,k);
      assert.ok(f.retained>=0&&f.shallow>=0&&f.saltRetained>=0&&f.deposited>=0);
    }
    for(const c of r.basin.eventCells){
      assert.equal(study.groups[c.k],r.basin.id);
      if(c.next>=0){
        assert.equal(world.graph.next[c.k],r.basin.eventCells[c.next].k);
        assert.equal(study.groups[world.graph.next[c.k]],r.basin.id);
      }
    }
  }
}
const noRain=model.run({...basinEventDefaults,rain:0});
for(const r of noRain.results)assert.ok(r.frames.every(f=>
  f.rainTotal===0&&f.exported===0&&f.deposited===0&&f.washed===0&&f.retained===0));

const scene=new THREE.Scene(),balanceCalls=[],tileCalls=[];
const tab=createFormationScene(scene,{
  model:world,show(...args){balanceCalls.push(args);},hide(){balanceCalls.push('hide');}
},{setLithologyMap(texture){tileCalls.push(texture);}});
const state={settings:basinEventDefaults,focus:'all',hour:24,layer:'water'};
tab.showEvent(state);
const layer=scene.getObjectByName('same rain in three basins');
assert.ok(layer.visible);
for(const [focus,display,hour] of [['all','water',24],['central','bank',48],['south','sediment',22],['closed','bank',120]]){
  tab.showEvent({...state,focus,layer:display,hour});
  tab.updateEvent(.2);
  const meshes=layer.children[1].children.filter(o=>o.isMesh);
  assert.ok(meshes.length>0,focus);
  for(const m of meshes){
    for(const a of Object.values(m.geometry.attributes))
      assert.ok(a.array.length>0&&a.array.every(Number.isFinite),focus+' finite '+a.itemSize);
  }
}
const routeState=tab.showEvent({...state,divide:0});
const surveyGroup=layer.getObjectByName('rainfall along the three drainage divides');
assert.ok(surveyGroup.visible&&routeState.survey.cases.length===3);
for(const {basin:{id}} of divides){
  for(let index=0;index<4;index++){
    const shot=tab.showEvent({...state,focus:id,hour:index===1?8:24,divide:index});
    assert.equal(shot.event,routeState.event);
    assert.equal(shot.survey.stop,shot.survey.entry.stops[index]);
    assert.equal(surveyGroup.getObjectByName(id).visible,true);
  }
}
surveyGroup.traverse(o=>{
  for(const a of Object.values(o.geometry?.attributes??{}))assert.ok(a.array.every(Number.isFinite));
});
tab.showEvent(state);assert.equal(surveyGroup.visible,false);
tab.show({month:7,days:0,layer:'water',focus:'closed',probe:null});
assert.equal(layer.visible,false);
assert.ok(tileCalls.at(-1).isDataTexture);
tab.hide();
assert.equal(balanceCalls.at(-1),'hide');

console.log(JSON.stringify({
  rain:event.settings,
  outlook:event.results.map(r=>({
    id:r.basin.id,cells:r.basin.eventCells.length,peakHour:r.peak,
    rainVolume:Math.round(end(r).rainTotal),exported:Math.round(end(r).exported),
    deposited:+end(r).deposited.toFixed(1),retained:Math.round(end(r).retained),
    saltRetained:Math.round(end(r).saltRetained)
  })),
  wetlandAt24h:wetter,wetlandAt48h:receding
},null,2));

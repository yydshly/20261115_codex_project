import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const {terrainHeight}=await import('../web/large-world.js');
const {buildWorldWaterBalance}=await import('../web/watershed-world.js');
const {environmentLines}=await import('../web/environment-lines.js');
const {buildWetlandModel}=await import('../web/wetland-layout.js');
const {buildEstuaryModel}=await import('../web/estuary-layout.js');
const {stormCatchment,runBasinStorm,runStormComparison,stormSettings,stormLinks,stormStops,stormHours,stormTideAt,tidePeriod}=await import('../web/basin-storm.js');

const world=buildWorldWaterBalance();
const catchment=stormCatchment(world);
const wetland=buildWetlandModel(world,terrainHeight);
const estuary=buildEstuaryModel(world,terrainHeight);
const north=world.bodies.findIndex(b=>b.id==='north');
assert.ok(catchment.cells.length>=40&&catchment.cells.length<=50);
assert.ok(catchment.cells.every(({k})=>world.graph.owner[k]===north&&!world.graph.waterCells[k]));
for(const route of environmentLines){
  const link=stormLinks[route.id];
  assert.ok(link.overview);
  assert.ok(Object.values(link).every(id=>stormStops.some(stop=>stop.id===id)));
}

function run(rain,duration=6){
  const event=runBasinStorm(world,catchment,{...stormSettings,rain,duration});
  assert.equal(event.frames.length,stormHours+1);
  assert.ok(event.frames.every(f=>Math.abs(f.residual)<1e-7));
  assert.ok(Math.abs(event.frames.at(-1).cumulativeRain-rain*catchment.areaTotal/1000)<1e-7);
  return event;
}

const dry=run(0),event=run(stormSettings.rain),strong=run(140),short=run(stormSettings.rain,2);
const baseline=dry.frames[0],rain=event.frames[3],rainEnded=event.frames[7];
assert.ok(dry.frames.every(f=>f.wetlandStage===baseline.wetlandStage&&f.mouth===0&&f.baseflow===0));
assert.ok(rain.runoff>0&&rain.infiltration>0&&rain.groundwater>0);
assert.ok(rainEnded.runoff===0&&rainEnded.baseflow>0);
assert.ok(event.wetlandPeak>stormSettings.duration&&event.coastPeak>event.wetlandPeak);
assert.ok(short.frames[1].runoff>event.frames[1].runoff);
assert.ok(short.wetlandPeak<event.wetlandPeak);

const wetPeak=wetland.frameForEvent(event.frames[event.wetlandPeak],event);
const wetStrong=wetland.frameForEvent(strong.frames[strong.wetlandPeak],strong);
const retreat=event.frames[event.coastPeak+24];
const wetRetreat=wetland.frameForEvent(retreat,event);
const wetBaseline=wetland.frameForEvent(baseline,dry);
assert.ok(wetStrong.floodedBank>wetPeak.floodedBank&&wetPeak.floodedBank>0);
assert.ok(wetRetreat.waterStage<wetPeak.waterStage&&wetRetreat.floodedBank<wetPeak.floodedBank);
assert.equal(wetBaseline.retreated,0);
assert.ok(wetRetreat.retreated>0);

const shoreFlight=(test,step)=>{
  const source=test.frames[step];
  const frame=estuary.frame('dry','ebb',source);
  return {frame,...estuary.eventShore(test,source,frame)};
};
const base=shoreFlight(dry,0),crest=shoreFlight(event,event.coastPeak);
const coastRetreat=shoreFlight(event,retreat.hour),last=shoreFlight(event,stormHours);
assert.equal(base.area,0);
assert.ok(crest.covered>0&&crest.frame.saltLine.upstream<base.frame.saltLine.upstream);
assert.ok(coastRetreat.covered<crest.covered&&coastRetreat.area>0);
assert.ok(coastRetreat.frame.saltLine.upstream>crest.frame.saltLine.upstream);
assert.ok(last.area<coastRetreat.area);

const pair=runStormComparison(world,catchment);
const {flood,ebb}=pair.scenarios;
const aligned=pair.referencePeak;
assert.equal(aligned,event.coastPeak);
assert.equal(flood.frames[aligned].tide.height,ebb.frames[aligned].tide.height);
assert.equal(flood.frames[aligned].tide.direction,-1);
assert.equal(ebb.frames[aligned].tide.direction,1);
for(const test of [flood,ebb]){
  assert.ok(test.frames.every((f,h)=>Math.abs(f.residual)<1e-7&&f.mouth>=0&&f.mouthStorage>=0&&
    f.groundwater===event.frames[h].groundwater&&f.runoff===event.frames[h].runoff));
}
assert.ok(flood.frames[aligned].leave<ebb.frames[aligned].leave);
const compareHour=aligned+2;
const slow=wetland.frameForEvent(flood.frames[compareHour],flood);
const fast=wetland.frameForEvent(ebb.frames[compareHour],ebb);
assert.ok(slow.waterStage>fast.waterStage&&slow.retreated<fast.retreated);
const rising=shoreFlight(flood,compareHour),falling=shoreFlight(ebb,compareHour);
assert.ok(rising.frame.saltLine.upstream>falling.frame.saltLine.upstream);
assert.ok(falling.area>rising.area&&rising.area>0);
const spinUp=Array.from({length:Math.ceil(tidePeriod)},(_,i)=>({
  wetlandStage:ebb.frames[0].wetlandStage,tide:stormTideAt(ebb.comparison,i-Math.ceil(tidePeriod))
}));
const earlierMasks=[...spinUp,...ebb.frames.slice(0,compareHour)].map(f=>estuary.frame('dry','ebb',f).wet);
assert.ok(falling.damp.every((d,i)=>!d||!falling.frame.wet[i]&&earlierMasks.some(mask=>mask[i])));

const tideOnly=runStormComparison(world,catchment,{...stormSettings,rain:0}).scenarios.ebb;
assert.ok(tideOnly.frames.every(f=>f.mouth===0&&f.wetlandStage===baseline.wetlandStage));
assert.ok(shoreFlight(tideOnly,compareHour).area>0);
assert.notEqual(runStormComparison(world,catchment,{...stormSettings,duration:2}).referencePeak,aligned);

console.log(JSON.stringify({
  area:catchment.areaTotal,event:stormSettings,
  wetlandPeak:{hour:event.wetlandPeak,stage:wetPeak.waterStage,newlyFlooded:wetPeak.floodedBank},
  coastPeak:{hour:event.coastPeak,flow:event.frames[event.coastPeak].mouth,newlyFlooded:crest.covered},
  saltFrontMetres:[base,crest,coastRetreat].map(r=>r.frame.saltLine.upstream),
  retreat:{hour:retreat.hour,wetMud:wetRetreat.retreated,wetShore:coastRetreat.area},
  tideComparison:{aligned,hour:compareHour,wetlandStage:[slow.waterStage,fast.waterStage],
    wetlandMud:[slow.retreated,fast.retreated],saltFront:[rising,falling].map(r=>r.frame.saltLine.upstream),
    wetShore:[rising.area,falling.area]}
},null,2));

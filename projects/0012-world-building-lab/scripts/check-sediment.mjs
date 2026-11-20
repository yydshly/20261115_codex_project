import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const THREE=await import('three');
const {buildSedimentYear,sedimentVolume}=await import('../web/sediment-model.js');
const {sedimentSurveys,sedimentPatch,createSedimentScene}=await import('../web/sediment-scene.js');
const {buildWorldWaterBalance}=await import('../web/watershed-world.js');

const world=buildWorldWaterBalance(),year=buildSedimentYear(world),survey=sedimentSurveys(world);
const [january,,,,,,july]=year.frames,december=year.frames.at(-1);
assert.equal(year.frames.length,12);
assert.ok(year.toFanHead.some(Boolean));
let residual=0;
for(const [i,frame] of year.frames.entries()){
  assert.equal(frame.water,world.frames[i]);
  const {reaches:r}=frame;
  assert.equal(r.mouth.water,world.frames[i].records.wetland.outflow);
  assert.equal(r.north.water,world.frames[i].records.north.outflow);
  for(const grain of ['coarse','fine']){
    residual=Math.max(residual,Math.abs(frame.residual[grain]));
    assert.ok(Math.abs(frame.residual[grain])<1e-9);
    assert.equal(r.fan.input[grain],r.head.out[grain]);
    assert.equal(r.mouth.input[grain],r.flood.out[grain]);
    for(const reach of Object.values(r)){
      assert.ok(reach.out[grain]>=0&&reach.deposited[grain]>=0);
      assert.ok(Math.abs(reach.input[grain]-reach.out[grain]-reach.deposited[grain])<1e-10);
    }
    if(i>0)for(const id of ['fan','flood','mouth']){
      assert.ok(frame.yearDeposits[id][grain]>=year.frames[i-1].yearDeposits[id][grain]);
    }
  }
}
assert.equal(january.reaches.head.erosion,0);
assert.ok(july.reaches.head.erosion>january.reaches.head.erosion);
assert.ok(july.reaches.fan.deposited.coarse>july.reaches.fan.deposited.fine);
assert.ok(sedimentVolume(july.reaches.north.out)>sedimentVolume(january.reaches.north.out)*4);
assert.equal(january.reaches.flood.overbankArea,0);
assert.equal(sedimentVolume(january.reaches.flood.overbank),0);
assert.ok(july.reaches.flood.overbankArea>1000&&july.reaches.flood.overbank.fine>july.reaches.flood.overbank.coarse);
assert.ok(july.reaches.mouth.deposited.coarse>january.reaches.mouth.deposited.coarse);

const geometry={};
for(const id of ['fan','flood','mouth']){
  const low=sedimentPatch(survey,id,january,false);
  const high=sedimentPatch(survey,id,july,false);
  const accumulated=sedimentPatch(survey,id,december,true);
  assert.ok(high.position.length>low.position.length&&accumulated.position.length>=high.position.length,id);
  for(const result of [low,high,accumulated]){
    assert.equal(result.position.length,result.color.length);
    assert.ok(result.position.every(Number.isFinite)&&result.color.every(Number.isFinite));
  }
  geometry[id]=[low,high,accumulated].map(p=>p.position.length/9);
}

const scene=new THREE.Scene(),waterState=[];
const overlay=createSedimentScene(scene,{model:world,show(...args){waterState.push(args);},
  hide(){waterState.push('restore');}},{reduced:true});
overlay.show(7,'head','month');
const group=scene.getObjectByName('seasonal sediment');
assert.ok(group.visible&&group.getObjectByName('sediment hillslope scour traces').geometry.attributes.position.count>0);
overlay.show(7,'mouth','base');
assert.ok(!group.getObjectByName('sediment mouth').visible);
overlay.show(12,'mouth','year');
assert.ok(group.getObjectByName('sediment mouth').geometry.attributes.position.count>0);
overlay.hide();
assert.ok(!group.visible);
assert.deepEqual(waterState,[[7,'all','water'],[7,'all','water'],[12,'all','water'],'restore']);

console.log(JSON.stringify({months:year.frames.length,maxGrainResidualM3:residual,
  julySlopeErosion:july.reaches.head.erosion,julyFanGravel:july.reaches.fan.deposited.coarse,
  northTransfer:[january,july].map(frame=>sedimentVolume(frame.reaches.north.out)),
  floodplainJuly:{area:july.reaches.flood.overbankArea,fine:july.reaches.flood.overbank.fine},
  mouthSand:[january,july].map(frame=>frame.reaches.mouth.deposited.coarse),
  depositionTriangles:{columns:['january','july','decemberAccumulated'],...geometry}},null,2));

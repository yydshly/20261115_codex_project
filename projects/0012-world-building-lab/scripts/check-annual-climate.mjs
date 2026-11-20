import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const THREE=await import('three');
const {buildAnnualClimate,climateAt,monthlyWind}=await import('../web/annual-climate.js');
const {buildWorldAnnualModel,createAnnualClimateScene}=await import('../web/annual-climate-scene.js');
const {constructionStops,constructionObservation}=await import('../web/construction-learning.js');

// One symmetric ridge. The same two points should swap upslope and downslope
// roles when the cross-ridge component reverses.
const ridgeGrid={x0:-720,z0:-720,cols:37,rows:37,step:40};
const ridge=buildAnnualClimate(ridgeGrid,x=>45+235*Math.max(0,1-Math.abs(x)/380),[]);
const march=ridge.frames[2],october=ridge.frames[9];
for(const [frame,side] of [[march,-1],[october,1]]){
  const windward=climateAt(ridge,frame,side*200,0),lee=climateAt(ridge,frame,-side*200,0);
  assert.ok(windward.lift>.1&&lee.lift<-.1);
  assert.ok(windward.rain+windward.snowfall>3*(lee.rain+lee.snowfall));
}

const model=buildWorldAnnualModel();
assert.equal(model.frames.length,12);
assert.equal(new Set(model.frames.map(f=>f.wind.bearing)).size,12);
const [winter,spring,summer,autumn]=[1,4,7,10].map(m=>model.frames[m-1]);
assert.equal(monthlyWind(7).bearing,225);
assert.equal(monthlyWind(1).bearing,315);
const summerUp=climateAt(model,summer,-665,1100),summerLee=climateAt(model,summer,-425,980);
assert.ok(summerUp.rain>summerLee.rain*3&&summerUp.soil>summerLee.soil);
assert.ok(winter.flow.ice.snow>.1&&spring.flow.ice.melt>winter.flow.ice.melt+.1);
assert.ok(summer.flow.main.index>winter.flow.main.index+.35);
assert.ok(summer.flow.south.index>winter.flow.south.index+.3);
assert.ok(summer.flow.salt.cells>0);
assert.ok(autumn.wind.dx<0&&summer.wind.dx>0);
for(const frame of model.frames){
  for(const field of ['moisture','rain','snowfall','snow','melt','soil','runoff']){
    assert.ok(frame[field].every(v=>Number.isFinite(v)&&v>=0));
  }
  assert.ok(frame.soil.every(v=>v<=.62));
  for(const flow of Object.values(frame.flow))assert.ok(flow.cells>0&&flow.index>=0&&flow.index<=1);
}

const scene=new THREE.Scene(),writes=[];
let flood=false, painted=null;
const controller=createAnnualClimateScene(scene,{
  reduced:true,readFlood:()=>flood,setFlood:v=>{flood=v;writes.push(v);},
  weather:{setAnnualClimate(texture,grid,layer){painted=texture?{texture,grid,layer}:null;}}
});
controller.show(7,'rain');controller.update(.05);
assert.equal(flood,true);
assert.ok(painted.texture.isDataTexture&&painted.texture.image.data.some(v=>v>0));
controller.show(1,'response');controller.update(.05);
assert.equal(painted.layer,'response');assert.equal(flood,false);
controller.hide();assert.equal(painted,null);assert.equal(scene.children[0].visible,false);
flood=true;
controller.show(1,'wind');assert.equal(flood,false);
controller.hide();assert.equal(flood,true);
assert.deepEqual(writes,[true,false,false,true]);
assert.equal(constructionStops.length,116);
assert.equal(new Set(constructionStops.flatMap(stop=>[0,1,2,3]
  .map(layer=>constructionObservation(stop.index,layer).id))).size,464);
console.log(JSON.stringify({
  months:12,gridCells:model.height.length,windReversal:true,
  summerWindwardRain:summerUp.rain,summerLeeRain:summerLee.rain,
  springMelt:spring.flow.ice.melt,winterMelt:winter.flow.ice.melt,
  mainRunoffIndex:[winter,spring,summer,autumn].map(f=>f.flow.main.index),
  flowPresetRestored:true,stations:116,observations:464
},null,2));

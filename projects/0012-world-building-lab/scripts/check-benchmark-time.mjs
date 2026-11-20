import assert from 'node:assert/strict';
import {register} from 'node:module';
import {BenchmarkWalk,benchmarkLength,benchmarkPoint,benchmarkStops} from '../web/benchmark-trail.js';
import {benchmarkRunAt,createBenchmarkTimeNavigation,modernPassage,surveyBenchmarkTime} from '../web/benchmark-time.js';
import {epochs} from '../web/ice-age.js';

register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('three');
const {createIceAgeScene}=await import('../web/ice-age-scene.js');
const {createBenchmarkTimeTrace}=await import('../web/benchmark-trail-scene.js');
const view=new THREE.Scene(),modern=new THREE.Group();
view.add(modern);
const timeline=createIceAgeScene(view,[modern]),trace=createBenchmarkTimeTrace(view);

const results={},sites={};
for(const id of Object.keys(epochs)){
  const frame=timeline.show(id,true,'water');
  if(id==='now'){
    assert.ok(modern.visible);
    assert.equal(timeline.water.length,0);
    assert.equal(modernPassage.walked,benchmarkLength);
    results[id]={walking:Math.round(benchmarkLength),air:0,runs:1};
    continue;
  }
  assert.equal(modern.visible,false);
  assert.ok(timeline.water.some(layer=>layer.kind==='sea'));
  assert.ok(timeline.water.some(layer=>layer.kind==='river'));
  assert.ok(timeline.water.some(layer=>layer.kind==='lake'));
  const nav=createBenchmarkTimeNavigation(frame,timeline.water),passage=surveyBenchmarkTime(nav);
  const {runs,walked,total}=passage;
  assert.ok(walked>0&&walked<total);
  assert.equal(runs[0].start,0);
  assert.equal(runs.at(-1).end,total);
  for(let i=1;i<runs.length;i++){
    assert.equal(runs[i].start,runs[i-1].end);
    assert.notEqual(runs[i].method,runs[i-1].method);
  }
  trace.show(passage,nav);
  const group=view.children.at(-1);
  assert.equal(group.children.length,runs.length);
  assert.ok(group.children.some(line=>line.material.isLineDashedMaterial));
  trace.hide();
  assert.equal(group.children.length,0);
  sites[id]=benchmarkStops.map(({at})=>{
    const p=benchmarkPoint(at);
    return nav.inspect(p.x,p.z);
  });
  if(id==='interglacial'){
    const mouth=sites[id][8],shore=nav.shoreView(mouth.x,mouth.z);
    assert.ok(shore&&shore.y>frame.epoch.sea);
  }
  for(const phase of [0,1]){
    const guide=new BenchmarkWalk();
    guide.playing=true;
    let prior=benchmarkPoint(0),i=phase;
    const strides=[2.17,1.34,2.46,1.91,1.52];
    while(guide.playing)guide.advance(strides[i++%strides.length],p=>{
      if(benchmarkRunAt(passage,p.at).method==='walk'){
        const from=benchmarkRunAt(passage,prior.at).method==='air'?p:prior;
        assert.ok(nav.step(from,p.x,p.z),id+' walk segment rejected at '+p.at.toFixed(2)+' m');
      }
      prior=p;
      return true;
    });
    assert.ok(guide.done);
  }
  results[id]={walking:Math.round(walked),air:Math.round(total-walked),runs:runs.length};
  assert.ok(view.children[1].children.length<=5,'bounded number of rendered climate frames');
}
const iceLake=2,estuary=8,bay=9,river=6;
assert.equal(sites.interglacial[estuary].reason,'sea');
assert.equal(sites.interglacial[bay].reason,'sea');
assert.equal(sites.glacial[iceLake].reason,'ice');
assert.ok(sites.glacial[iceLake].thickness>1);
assert.ok(sites.inception[iceLake].thickness<sites.glacial[iceLake].thickness);
assert.equal(sites.glacial[bay].reason,null);
assert.equal(sites.holocene[bay].reason,'sea');
assert.notEqual(sites.interglacial[river].cover,sites.glacial[river].cover);
assert.deepEqual(
  Object.values(sites).map(s=>[s[estuary].x,s[estuary].z]),
  Array(Object.keys(sites).length).fill([sites.glacial[estuary].x,sites.glacial[estuary].z])
);
timeline.hide();
assert.ok(modern.visible);
console.log(JSON.stringify(results,null,2));

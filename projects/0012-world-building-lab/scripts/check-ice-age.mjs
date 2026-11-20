import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const THREE=await import('three');
const {createIceAgeScene}=await import('../web/ice-age-scene.js');
const {epochs,gridPoint,heightOnGrid,iceAgeStation}=await import('../web/ice-age.js');
const {terrainHeight}=await import('../web/large-world.js');
const {environmentLines}=await import('../web/environment-lines.js');
const {ICE_CAP}=await import('../web/polar-layout.js');

const scene=new THREE.Scene(),ground=new THREE.Group(),hidden=new THREE.Group();
hidden.visible=false;
scene.add(ground,hidden);
const layer=createIceAgeScene(scene,[ground,hidden]);
const initialHeight=terrainHeight(-1675,-197);
const {model,routes}=layer.prepare();
const {grid}=model;
const indexAt=(x,z)=>Math.round((x-grid.x0)/grid.step)+grid.cols*Math.round((z-grid.z0)/grid.step);
const stop=(route,id)=>routes.find(line=>line.id===route).stops.find(point=>point.id===id).p;
const sample=(route,id)=>{
  const {x,z}=stop(route,id);
  return indexAt(x,z);
};

assert.deepEqual(routes.map(r=>r.id),environmentLines.map(r=>r.id));
for(const route of routes){
  const original=environmentLines.find(r=>r.id===route.id);
  assert.ok(route.stops.length>=4);
  for(const s of route.stops){
    const point=original.stops.find(p=>p.id===s.id);
    if(point)assert.deepEqual(s.p,point.p,s.id+' keeps the original observation coordinates');
    assert.ok(s.cold&&s.now);
  }
}
for(const [route,id] of [['water','bay'],['inland','ocean'],['inland','east-shelf']]){
  const k=sample(route,id);
  assert.equal(model.modernOcean[k],1,id+' lies below the modern sea');
  assert.equal(model.coldOcean[k],0,id+' is exposed in the ice age');
}
const trench=indexAt(1820,1460);
assert.equal(model.coldOcean[trench],1,'the SE trench remains connected to the open ocean');
assert.ok(model.ice[sample('water','ice-lake')]>10,'the extended tongue reaches the ice lake');
assert.ok(model.iceArea>0&&model.exposedArea>0);
assert.equal(model.covers[sample('warmth','mixed')],'tundra');
assert.equal(model.covers[sample('warmth','plain')],'steppe');
assert.equal(model.covers[sample('warmth','forest')],'refuge');
assert.equal(model.covers[sample('inland','lee')],'steppe');
for(const river of Object.values(model.channels)){
  const {x,z,level}=river.at(-1);
  assert.equal(level,epochs.glacial.sea);
  assert.equal(model.coldOcean[indexAt(x,z)],1,'the extended river reaches connected sea');
  assert.ok(heightOnGrid(grid,model.land,x,z)<level,'the mouth sits below its water surface');
  for(let i=river.length-24;i<river.length-1;i++)assert.ok(river[i+1].level<river[i].level);
}
for(let k=0;k<model.modern.length;k+=197){
  const {x,z}=gridPoint(grid,k);
  if(Math.abs(x)<=1920&&Math.abs(z)<=1600)assert.ok(Math.abs(terrainHeight(x,z)-model.modern[k])<.001);
}
const timeline=scene.children.at(-1);
assert.equal(timeline.visible,false);
const first=layer.show('glacial',true);
assert.ok(timeline.visible);
assert.equal(ground.visible,false);
ground.visible=true;
layer.update();
assert.equal(ground.visible,false,'per-frame changes cannot reveal modern geometry in ice age');
const [rings,modernLine,cold]=timeline.children;
assert.ok(rings.visible&&cold.visible&&!modernLine.visible);
const advanceIds=['inception','earlyRebound','stadial','midRebound','approachMaximum'];
assert.deepEqual(Object.keys(epochs),['interglacial',...advanceIds,'glacial','early','pulse','warming','holocene','now']);
const frames=[first];
for(const id of ['early','pulse','warming','holocene']){
  const before=frames.at(-1),frame=layer.show(id,true,'water'),group=timeline.children.at(-1);
  frames.push(frame);
  assert.equal(ground.visible,false);
  assert.equal(timeline.children.filter(node=>node.visible).length,2,'only the active snapshot and markers are visible');
  assert.ok(rings.children[0].visible&&!rings.children[1].visible,'only the current route mouth is shown');
  assert.equal(frame.land,model.land,'each prehistoric frame has the same bathymetry');
  assert.ok(frame.epoch.sea>before.epoch.sea);
  assert.ok(frame.coldOcean.every((f,k)=>f>=before.coldOcean[k]),'the connected sea expands');
  assert.ok(frame.ice.every((h,k)=>h<=before.ice[k]+.0001),'ice retreats from thin margins');
  assert.ok(frame.ice.filter(h=>h>1.7).length<before.ice.filter(h=>h>1.7).length);
  for(const [key,point] of Object.entries(frame.mouths)){
    assert.ok(point.x>before.mouths[key].x,'both mouths move toward land');
    assert.ok(Math.abs(heightOnGrid(grid,frame.surface,point.x,point.z)-frame.epoch.sea)<.1);
    assert.equal(frame.rivers.find(r=>r.id===key).points.at(-1),point,'visible river ends at the mouth');
  }
  for(const object of group.children.filter(item=>item.isMesh)){
    assert.ok(object.geometry.attributes.position.count>0);
    for(const value of object.geometry.attributes.position.array)assert.ok(Number.isFinite(value));
  }
}
const [glacial,early,pulse,warming,holocene]=frames;
const eastShelf=sample('inland','east-shelf'),bay=sample('water','bay'),salt=indexAt(-1690,80);
assert.equal(early.coldOcean[eastShelf],0);
assert.equal(early.covers[eastShelf],'gravel','exposed offshore shelf is distinct from a muddy estuary');
assert.equal(pulse.coldOcean[eastShelf],1);
assert.equal(warming.coldOcean[bay],0);
assert.equal(holocene.coldOcean[bay],1);
assert.ok(frames.every(frame=>!frame.coldOcean[salt]));
const iceLake=routes[0].stops.find(s=>s.id==='ice-lake');
assert.match(iceAgeStation(early,iceLake),/冰厚/);
assert.match(iceAgeStation(warming,iceLake),/露出湖面/);
assert.deepEqual([glacial,warming,holocene].map(f=>f.covers[sample('warmth','mixed')]),['tundra','steppe','refuge']);
assert.ok(holocene.coverTypes.has('wetland'));
const modern=layer.show('now',true);
assert.ok(!cold.visible&&modernLine.visible);
assert.ok(modern.mouths.central.x>holocene.mouths.central.x);
assert.ok(ground.visible&&!hidden.visible);
const warm=layer.show('interglacial',true);
assert.equal(warm.epoch.sea,8);
assert.equal(warm.land,modern.surface,'the highstand uses the existing ground rather than glacial channels');
assert.ok(!ground.visible&&!hidden.visible);
const bayHead=sample('water','tidal-bank'),mangroveBank=sample('inland','coast');
for(const k of [bayHead,mangroveBank]){
  assert.equal(glacial.coldOcean[k],0);
  assert.equal(modern.coldOcean[k],0);
  assert.equal(warm.coldOcean[k],1);
  assert.equal(warm.covers[k],'water','flooded banks lose terrestrial cover');
}
assert.equal(warm.coldOcean[salt],0,'high sea level does not flood the inland salt basin');
assert.equal(warm.covers[sample('warmth','mixed')],'broadleaf');
assert.ok(warm.coverTypes.has('wetland'));
assert.doesNotMatch(iceAgeStation(warm,iceLake),/冰厚/);
const snow=stop('water','snow');
assert.ok(heightOnGrid(grid,warm.ice,snow.x,snow.z)<snow.thickness,'narrower and thinner than the modern glacier');
assert.ok(warm.ice[indexAt(ICE_CAP.x,ICE_CAP.z)]<ICE_CAP.thickness);
const coveredByIce=frame=>frame.ice.filter(thickness=>thickness>1.7).length;
assert.ok(coveredByIce(warm)>0&&coveredByIce(warm)<coveredByIce(holocene));
for(const [id,mouth] of Object.entries(warm.mouths)){
  assert.ok(mouth.x>modern.mouths[id].x,'the highstand mouth lies upstream of the modern one');
  assert.equal(mouth.level,warm.epoch.sea);
  assert.ok(heightOnGrid(grid,warm.surface,mouth.x,mouth.z)<=warm.epoch.sea+.001);
  assert.equal(warm.rivers.find(r=>r.id===id).points.at(-1),mouth);
}
const warmView=timeline.children.at(-1);
warmView.traverse(object=>{
  if(!object.isMesh)return;
  for(const n of object.geometry.attributes.position.array)assert.ok(Number.isFinite(n));
});
const advanceFrames=advanceIds.map(id=>{
  const frame=layer.show(id,true,'inland');
  assert.equal(frame.land,model.land,'the connected sea follows the same bathymetry in every advance snapshot');
  assert.equal(frame.coldOcean[salt],0);
  assert.ok(!ground.visible&&!hidden.visible);
  assert.ok(!rings.children[0].visible&&rings.children[1].visible);
  assert.equal(timeline.children.filter(node=>node.visible).length,2);
  for(const [key,mouth] of Object.entries(frame.mouths)){
    assert.equal(frame.rivers.find(r=>r.id===key).points.at(-1),mouth);
    assert.equal(mouth.level,frame.epoch.sea);
    assert.ok(heightOnGrid(grid,frame.surface,mouth.x,mouth.z)<=frame.epoch.sea+.01);
  }
  return frame;
});
const advanceSequence=[warm,...advanceFrames,glacial],seaChanges=[-1,1,-1,1,-1,-1];
for(const [i,direction] of seaChanges.entries()){
  const a=advanceSequence[i],b=advanceSequence[i+1];
  assert.equal(Math.sign(b.epoch.sea-a.epoch.sea),direction,'retain both temporary sea-level rebounds');
  const seaArea=frame=>frame.coldOcean.reduce((sum,cell)=>sum+cell,0);
  assert.equal(Math.sign(seaArea(b)-seaArea(a)),direction);
  assert.equal(Math.sign(coveredByIce(b)-coveredByIce(a)),-direction);
  for(const key of Object.keys(a.mouths))assert.equal(Math.sign(b.mouths[key].x-a.mouths[key].x),direction);
}
const [inception,rebound,stadial,midRebound,approachMaximum]=advanceFrames;
const southwest=sample('inland','ocean'),mixed=sample('warmth','mixed');
assert.deepEqual([warm,inception,rebound,stadial].map(frame=>frame.coldOcean[bay]),[1,0,1,0]);
assert.deepEqual([warm,inception,rebound,stadial].map(frame=>frame.coldOcean[southwest]),[1,0,1,0]);
assert.deepEqual([stadial,midRebound,approachMaximum].map(frame=>frame.coldOcean[eastShelf]),[1,1,0]);
assert.deepEqual([warm,inception,rebound,stadial].map(frame=>frame.covers[mixed]),['broadleaf','steppe','refuge','tundra']);
assert.match(iceAgeStation(inception,iceLake),/开阔水面/);
assert.match(iceAgeStation(stadial,iceLake),/冰厚/);
layer.show('now',true);
assert.ok(!warmView.visible&&modernLine.visible&&ground.visible&&!hidden.visible);
const groupCount=timeline.children.length;
layer.show('glacial',false);
assert.equal(timeline.children.length,groupCount,'returning to a previous time reuses its meshes');
layer.hide();
assert.ok(!timeline.visible&&ground.visible&&!hidden.visible);
assert.equal(terrainHeight(-1675,-197),initialHeight);
console.log('Twelve time nodes: highstand, ice advance and rebounds, deglaciation, shifting outlets and vegetation, and reversible rendering verified.');

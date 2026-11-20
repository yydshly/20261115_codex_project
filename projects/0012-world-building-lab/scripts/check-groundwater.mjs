import assert from 'node:assert/strict';
import {register} from 'node:module';

register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('three');
const {terrainHeight}=await import('../web/large-world.js');
const {environmentLines}=await import('../web/environment-lines.js');
const {karstField,karstWaterAt}=await import('../web/karst-layout.js');
const {karstSeaGeometry}=await import('../web/karst-scene.js');
const {drylandWaterAt}=await import('../web/dryland-layout.js');
const {bedrockAt,parentAt,bedrockIds,groundStops,groundwaterLinks,hydroMaterials,simulateStorm,
  stormPresets,stormHours,storagePath,springCreek,cavePath}=await import('../web/groundwater-layout.js');
const {createGroundwaterScene}=await import('../web/groundwater-scene.js');

for(const s of groundStops){
  assert.ok(Number.isFinite(terrainHeight(s.x,s.z)));
  const lithology=s.id==='infiltration'?parentAt(s.x,s.z):bedrockAt(s.x,s.z);
  assert.equal(lithology,s.material,s.id);
}
assert.ok(storagePath.slice(0,-1).every(p=>p.y<terrainHeight(p.x,p.z)));
assert.ok(storagePath.every((p,i)=>i===0||p.y<storagePath[i-1].y));
assert.equal(drylandWaterAt(springCreek[0].x,springCreek[0].z),null);
assert.ok(drylandWaterAt(springCreek.at(-1).x,springCreek.at(-1).z)?.fresh);
assert.ok(karstWaterAt(cavePath.at(-1).x,cavePath.at(-1).z)?.karst);
assert.ok(cavePath.slice(2).every(p=>karstField(p.x,p.z,p.y)));
for(const route of environmentLines){
  const links=groundwaterLinks[route.id];
  assert.ok(links.overview);
  for(const [step,[focus]] of Object.entries(links)){
    assert.ok(step==='overview'||route.stops.some(p=>p.id===step));
    assert.ok(groundStops.some(p=>p.id===focus));
  }
}
for(const storm of Object.values(stormPresets)){
  for(const material of Object.values(hydroMaterials)){
    const frames=simulateStorm(storm,material);
    assert.equal(frames.length,stormHours+1);
    for(const [i,f] of frames.entries()){
      assert.ok(Object.values(f).every(value=>value>=0&&Number.isFinite(value)));
      assert.ok(Math.abs(f.rain-(f.runoff+f.soil+f.groundwater+f.discharge))<1e-9);
      assert.ok(i===0||f.discharge>=frames[i-1].discharge);
    }
    assert.equal(frames[stormHours].rain,48);
    assert.ok(frames[stormHours].outflow>0);
    assert.equal(frames[stormHours].recentRunoff,0);
  }
}
const steady=Object.fromEntries(Object.entries(hydroMaterials).map(([id,r])=>[id,simulateStorm(stormPresets.steady,r)]));
assert.ok(steady.crystalline[8].runoff>steady.layered[8].runoff);
assert.ok(steady.alluvium[8].groundwater>steady.carbonate[8].groundwater);
assert.ok(steady.carbonate[8].outflow>steady.layered[8].outflow);
assert.ok(steady.layered[24].outflow>steady.carbonate[24].outflow);
assert.ok(simulateStorm(stormPresets.burst,hydroMaterials.layered)[8].runoff>steady.layered[8].runoff);

const scene=new THREE.Scene(),cut=[],tint=[];
const original=karstSeaGeometry(),sea=new THREE.Mesh(original);
const map=createGroundwaterScene(scene,{
  tiles:{setLithologyMap:texture=>tint.push(texture),setKarstCutaway:on=>cut.push(['terrain',on])},
  karst:{setCutaway:on=>cut.push(['cave',on])},sea
});
const overall=map.show({frame:steady.layered[8]});
assert.equal(overall.length,groundStops.length);
assert.equal(new Set(overall.map(p=>p.id)).size,groundStops.length);
assert.ok(tint[0].isDataTexture);
assert.ok(new Set(Array.from(tint[0].image.data)).size>=bedrockIds.length);
for(const station of groundStops){
  assert.ok(map.show({station,frame:steady[station.material][8]}).length);
  map.update(.016);
}
assert.deepEqual(cut,[['terrain',true],['cave',true]]);
function waterCovered(x,z){
  const ray=new THREE.Raycaster(new THREE.Vector3(x,-z,2),new THREE.Vector3(0,0,-1));
  return ray.intersectObject(sea).length>0;
}
assert.notEqual(sea.geometry,original);
assert.equal(waterCovered(720,-1410),false);
assert.equal(waterCovered(1000,-1410),true);
map.hide();
assert.deepEqual(cut.slice(2),[['terrain',false],['cave',false]]);
assert.equal(tint.at(-1),null);
assert.equal(sea.geometry,original);
assert.equal(waterCovered(720,-1410),true);
map.setMap(true);map.hide();
assert.equal(tint.at(-1),null);
scene.traverse(o=>{
  const p=o.geometry?.getAttribute('position');
  if(p)assert.ok(p.array.every(Number.isFinite),o.name||o.type);
});
console.log('Groundwater domains, local paths, both 48 mm storm balances, map geometry and state restoration passed.');

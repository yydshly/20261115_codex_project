import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const THREE=await import('three');
const {terrainHeight}=await import('../web/large-world.js');
const {buildWorldWaterBalance}=await import('../web/watershed-world.js');
const {environmentLines}=await import('../web/environment-lines.js');
const {modern}=await import('../web/environment-catalog.js');
const {karstSeaGeometry}=await import('../web/karst-scene.js');
const {riverGeometry}=await import('../web/water-scene.js');
const {createWatershedBalanceScene,clippedWaterGeometry}=await import('../web/watershed-balance-scene.js');
const {buildEstuaryModel,estuaryBounds,estuaryLinks,connectedEstuary,tides}=await import('../web/estuary-layout.js');
const {createEstuaryScene}=await import('../web/estuary-scene.js');

const toy=Array.from({length:12},(_,i)=>({i,bed:[0,1,4,11].includes(i)?-1:1}));
const connected=connectedEstuary(toy,4,new Float64Array(12),p=>p.i===0);
assert.deepEqual([...connected.keys()].filter(k=>connected[k]),[0,1,4]);
const world=buildWorldWaterBalance(),model=buildEstuaryModel(world,terrainHeight);
const high=model.frame('dry','high'),low=model.frame('dry','low'),wet=model.frame('wet','high');
const flood=model.frame('dry','flood'),ebb=model.frame('dry','ebb');
assert.ok(high.saltLine.upstream>wet.saltLine.upstream+60);
assert.ok(high.saltLine.upstream>low.saltLine.upstream);
assert.ok(high.tideLine.upstream>high.saltLine.upstream);
assert.equal(flood.tide.height,ebb.tide.height);
assert.equal(flood.tide.direction,-ebb.tide.direction);
assert.deepEqual(flood.levels,ebb.levels);
assert.notEqual(flood.saltLine.upstream,ebb.saltLine.upstream);
for(const season of ['dry','wet'])for(const id of Object.keys(tides)){
  const f=model.frame(season,id);
  assert.ok(f.profile.every((p,i)=>Number.isFinite(p.salt)&&p.salt>=0&&p.salt<=32&&(!i||p.salt>=f.profile[i-1].salt)));
  assert.ok(f.profile[1].salt<.2);
  assert.ok(f.saltLine&&f.tideLine);
}
const flat=model.stations.find(p=>p.id==='flat'),spot=flat.row*model.cols+flat.col;
assert.equal(high.wet[spot],1);
assert.equal(low.wet[spot],0);
for(const f of [high,low]){
  const levels=new Map(model.bed.map((p,i)=>[p,f.levels[i]]));
  const mesh=new THREE.Mesh(clippedWaterGeometry(model,p=>levels.get(p),{waterMask:f.wet}),
    new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  const ray=new THREE.Raycaster(new THREE.Vector3(flat.x,10,flat.z),new THREE.Vector3(0,-1,0));
  assert.equal(ray.intersectObject(mesh).length>0,f===high);
}
assert.ok(model.measured(low).exposed>model.measured(high).exposed+7000);
for(const p of model.plants){
  assert.equal(p.y,terrainHeight(p.x,p.z));
  if(p.kind==='reed')assert.ok(p.salinity<10.5);
  if(p.kind==='rush')assert.ok(p.salinity>=4.2);
}
assert.ok(model.plants.some(p=>p.kind==='reed')&&model.plants.some(p=>p.kind==='rush'));
for(const route of environmentLines)for(const [site,id] of Object.entries(estuaryLinks[route.id])){
  assert.ok(site==='overview'||route.stops.some(s=>s.id===site));
  assert.ok(model.stations.some(s=>s.id===id));
}
assert.equal(modern.find(p=>p.title==='河口潮汐与咸淡水交界').href,'expedition.html?plan=estuary#build-1');

const scene=new THREE.Scene(),calls=[];
const sea=new THREE.Mesh(karstSeaGeometry(),new THREE.MeshStandardMaterial());
const original=sea.geometry;
const estuary=createEstuaryScene(scene,{model:world,show:(...args)=>calls.push(args),hide:()=>calls.push('restore')},{
  sea,water:{setEstuaryTide:value=>calls.push(value)},vegetation:{setLocalMask:value=>calls.push(value)}
});
assert.equal(estuary.show({season:'wet',tide:'high',overlay:true}).labels.length,2);
estuary.hide();
assert.deepEqual(calls,[]);
estuary.show({season:'dry',tide:'high'});
assert.notEqual(sea.geometry,original);
const isSea=(x,y)=>new THREE.Raycaster(new THREE.Vector3(x,y,4),new THREE.Vector3(0,0,-1)).intersectObject(sea).length>0;
assert.equal(isSea(-1470,220),false);
assert.equal(isSea(-1900,220),true);
assert.equal(calls.find(Array.isArray)[3].riverSurvey.downstreamX,estuaryBounds.maxX);
assert.equal(calls.at(-1),tides.high.height);
estuary.show({season:'wet',tide:'ebb',layer:'natural'});
assert.equal(calls.at(-1),tides.ebb.height);
estuary.update(.023);
scene.traverse(o=>{
  const p=o.geometry?.getAttribute('position');
  if(p)assert.ok(p.array.every(Number.isFinite));
});
estuary.hide();
assert.equal(sea.geometry,original);
assert.equal(isSea(-1470,220),true);
assert.deepEqual(calls.slice(-3),[null,null,'restore']);

const basic=new THREE.MeshStandardMaterial(),mock=()=>new THREE.Mesh(new THREE.BufferGeometry(),basic);
const river={river:mock(),flowMaterial:basic},inland={lake:mock(),channels:mock()},salt={water:mock()};
const balanceRoot=new THREE.Scene(),preview=createWatershedBalanceScene(balanceRoot,{
  water:river,inland,salt,weather:{setAnnualClimate(){}},reduced:true
});
preview.show(1,'all','water',{riverSurvey:high.survey});
const tail=balanceRoot.children[0].children;
const p=tail[0].geometry.getAttribute('position');
for(let i=0;i<p.count;i++)assert.ok(p.getX(i)>=estuaryBounds.maxX-.002);
assert.equal(tail[5].visible,false);
assert.equal(tail[6].visible,true);
assert.ok(riverGeometry(false,null,.4).getAttribute('position').count<riverGeometry().getAttribute('position').count);
preview.show(1,'all','water');
assert.equal(tail[5].visible,true);
assert.equal(tail[6].visible,false);
preview.hide();
assert.equal(river.river.visible,true);
console.log('Four tidal stages, seasonal salt intrusion, exposed flats, plant zones and original water restoration passed.');

// CPU validation of actual glTF data and scene geometry; it does not claim GPU visual QA.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadModelLibrary, createModelCottage, createModelGarden,createModelLawn } from './model-assets.js';
import { createMountains } from './mountains.js';
import { createStream } from './stream.js';
import { budgetReflections } from './reflection-budget.js';
import { timberGeometry } from './timber.js';
import { createFineGrass } from './fine-grass.js';
import { createGeometryContactShadows } from './contact-shadows.js';
import { borderWeightAt } from './planting-plan.js';
import { createCourtyardPath } from './courtyard-path.js';
import { courtyardPathLength,pathFrameAt } from './path-layout.js';
import { createModelWoodland } from './valley-woodland.js';
import { createValleyVegetation } from './valley-vegetation.js';
import { createValleyGeology } from './valley-geology.js';
import { loadValleyLife,createValleyLife } from './valley-life.js';
import { surfaceFieldAt,localReliefAt } from './surface-field.js';
import { grazingInfluenceAt } from './meadow-field.js';
import { streamBedProfileAt } from './stream-profile.js';
import { createGardenWildlife } from './garden-wildlife.js';
import { createGroundSurface,createGroundGeometry,createBankGeometry } from './ground.js';
import { createLightingRig,foliageLighting } from './lighting.js';
import { riverX, riverWidth, heightAt, seededRandom } from './landscape.js';
import { setTerrainElevation,meadowHeightAt,meadowSurfaceHeightAt,mountainHeightAt,wildnessAt,valleyHabitatAt } from './terrain.js';

const originalFetch=globalThis.fetch;
globalThis.fetch=async (request,options)=>{
  const url=typeof request==='string'?request:request instanceof URL?request.href:request.url;
  if(url.startsWith('file:')){
    const bytes=await readFile(new URL(url));return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}});
  }
  return originalFetch(request,options);
};
globalThis.ProgressEvent=class extends Event{constructor(type,details){super(type);Object.assign(this,details);}};
THREE.TextureLoader.prototype.loadAsync=async()=>new THREE.Texture();
GLTFLoader.prototype.loadAsync=async function(url){
  this.register(()=>({name:'CPUAssetInspection',loadTexture:async()=>new THREE.Texture()}));
  const bytes=await readFile(new URL(url));
  return this.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),new URL('.',url).href);
};
const renderer={capabilities:{getMaxAnisotropy:()=>8}};
const models=await loadModelLibrary(renderer);
for(const id of ['grass','lawn','meadow'])for(const variant of models[id])for(const part of variant.parts){
  assert.equal(part.material.alphaMap.mipmaps.length,10,'Thin scan grass has no coverage-preserving mip levels');
  assert.equal(part.material.map.mipmaps.length,10,'Scan grass colour still averages in the black atlas background');
}
for(const [name,variants] of Object.entries(models))for(const variant of variants){
  assert(variant.size.y>0&&Number.isFinite(variant.size.y),`${name} has invalid height`);
  for(const part of variant.parts)for(const attr of Object.values(part.geometry.attributes)){
    assert(attr.array.every(Number.isFinite),`${name} contains non-finite vertex data`);
  }
}
const bytes=await readFile(new URL('./assets/terrain/kaiser-height.f32',import.meta.url));
const elevation=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
setTerrainElevation(elevation);
const scene=new THREE.Scene();
for(const style of ['townhouse','house','cottage']){
  const house=createModelCottage(scene,models,style);
  const collider=house.colliders[0];
  assert(collider.minX<0&&collider.maxX>0&&collider.minZ<collider.maxZ);
  assert(collider.maxZ< -3,`${style} blocks the garden spawn`);
  const glass=models[style][0].parts.find(p=>/glaz/i.test(p.material.name));
  assert(glass?.material.isMeshPhysicalMaterial&&glass.material.transmission>0.8,'Window glass is missing its physical transmission');
  assert(glass.material.ior>1.5&&glass.material.thickness>=.008&&!glass.material.transparent,'Glass is still an alpha-blended hole');
  if(style==='cottage'){
    const {interior}=house;
    assert.equal(models.cottage[0].windows.length,7);
    assert.equal(interior.windowDressings.length,7);
    assert.equal(interior.furniture.length,9);
    house.group.updateMatrixWorld(true);
    for(const item of interior.furniture){
      const box=new THREE.Box3().setFromObject(item).translate(house.group.position.clone().negate());
      assert(box.min.x>= -3.74&&box.max.x<=3.74&&box.min.z>= -5.28&&box.max.z<=4.16,'Imported furniture crosses an exterior wall');
      assert(Math.abs(box.min.y-.363)<.00001,'Imported furniture is not seated on the floor');
    }
    const windowRay=new THREE.Raycaster();
    for(const dressed of interior.windowDressings){
      const centre=new THREE.Vector3().fromArray(dressed.opening.min).add(new THREE.Vector3().fromArray(dressed.opening.max)).multiplyScalar(.5).add(house.group.position);
      const normal=new THREE.Vector3(0,0,1).applyQuaternion(dressed.group.quaternion);
      const right=new THREE.Vector3(1,0,0).applyQuaternion(dressed.group.quaternion);
      let roomHits=0;
      for(const x of [-.22,.22])for(const y of [-.22,.22]){
        const origin=centre.clone().addScaledVector(normal,1).addScaledVector(right,dressed.width*x);origin.y+=dressed.height*y;
        windowRay.set(origin,normal.clone().negate());
        const hits=windowRay.intersectObject(house.group,true);
        assert(hits.some(h=>/glaz/i.test(h.object.material.name)),`${dressed.opening.name} has no glass in its actual opening`);
        if(hits.some(h=>h.object.parent===interior.group))roomHits++;
      }
      assert(roomHits>=2,`${dressed.opening.name} still sees through an empty shell`);
    }
    const dayIntensity=interior.lightSources.map(l=>l.intensity);
    house.setEvening(1);assert(interior.lightSources.every((l,i)=>l.intensity>dayIntensity[i]),'Indoor lights do not follow dusk');
    house.setEvening(0);
    interior.setLampsOn(false);house.setEvening(1);
    assert(interior.lightSources.every(l=>l.intensity===0),'Dusk overrides the manual lamp switch');
    interior.setLampsOn(true);
    assert(interior.lightSources.every((l,i)=>l.intensity>dayIntensity[i]),'Lamps do not restore the current dusk level');
    house.setEvening(0);
    console.log('OK: seven real glazed/dressed windows, furnished rooms, ceiling/partitions and dusk lighting');
  }
  console.log(`${style}: size ${models[style][0].size.toArray().map(x=>x.toFixed(3)).join(' × ')}, wall collider ${JSON.stringify(collider)}`);
}
const garden=createModelGarden(scene,models,{heightAt,riverX,riverWidth,random:seededRandom(5044)});
const scanWildlife=createGardenWildlife(new THREE.Scene(),{flowerPerches:garden.flowerPerches,heightAt,random:seededRandom(65473)});
assert.equal(scanWildlife.butterflies.length,3,'Actual flower assets do not provide three valid butterfly habitats');
assert.equal(scanWildlife.birds.length,2);
for(const b of scanWildlife.butterflies)for(const p of b.stops){
  assert(p.toArray().every(Number.isFinite));
  assert(p.y-heightAt(p.x,p.z)>.12&&p.y-heightAt(p.x,p.z)<.8,'Actual butterfly rest point misses the flowering layer');
}
console.log(`OK: ${garden.flowerPerches.length} real scan-derived flower contacts support three small butterfly habitats`);
const scanCount=name=>garden.group.children.filter(o=>o.isInstancedMesh&&o.name.includes(name)).reduce((sum,o)=>sum+o.count,0);
assert(scanCount('shrub_02')>=50,'Mature model borders are missing');
assert(scanCount('flower_gazania')>=140,'Low flowering model borders are missing');
for(const mesh of garden.group.children)if(mesh.isInstancedMesh)assert(mesh.instanceMatrix.array.every(Number.isFinite));
console.log(`OK: planted ${scanCount('shrub_02')} mature shrub and ${scanCount('flower_gazania')} Gazania model instances`);
assert(garden.planting.patchCount>=60,'Mixed border drifts are missing');
for(const p of garden.planting.plants){
  assert(borderWeightAt(p.x,p.z)>.63,'A border plant sits outside its prepared soil');
  assert(p.height>=.10&&p.height<1.25,'A border asset is outside garden-scale proportions');
}
for(const mesh of garden.group.children)if(mesh.isInstancedMesh&&/periwinkle|gazania|fern_02|shrub_02|sorrel/.test(mesh.name)){
  for(let i=0;i<mesh.count;i++){
    const m=mesh.instanceMatrix.array,x=m[i*16+12],y=m[i*16+13],z=m[i*16+14];
    assert(Math.abs(y+.006-heightAt(x,z))<.0001,'A botanical root floats above the soil');
  }
}
{
  const testScene=new THREE.Scene(),root=new THREE.Group(),hiddenRoot=new THREE.Group(),grass=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());
  const source=new THREE.MeshStandardMaterial({alphaTest:.28,alphaMap:new THREE.Texture()}),mesh=new THREE.Mesh(new THREE.BoxGeometry(),source);
  grass.userData.contactCaster=false;root.add(mesh,grass);hiddenRoot.visible=false;testScene.add(root,hiddenRoot);
  const viewport=new THREE.Vector4(0,0,800,600),clear=new THREE.Color('#536677');let currentTarget=null,currentAlpha=.3,rendered=0,fail=false;
  const mock={shadowMap:{autoUpdate:true},xr:{enabled:true},autoClear:false,
    getRenderTarget:()=>currentTarget,getClearColor:c=>c.copy(clear),getClearAlpha:()=>currentAlpha,getViewport:v=>v.copy(viewport),
    setRenderTarget:t=>{currentTarget=t;},setViewport:v=>viewport.copy(v),setClearColor:(c,a)=>{clear.set(c);currentAlpha=a;},clear(){},
    render(world){if(world===testScene){assert(mesh.material.isShaderMaterial);assert(!grass.visible);assert.equal(mesh.material.uniforms.alphaMap.value,source.alphaMap);assert.equal(mesh.material.blendEquation,THREE.MinEquation);if(fail)throw new Error('Simulated bake failure');}rendered++;}
  };
  const contact=createGeometryContactShadows(mock,testScene);contact.bake([root]);assert.equal(rendered,3);assert.equal(contact.captures,1);
  const restored=()=>{assert.equal(mesh.material,source);assert(grass.visible&&!hiddenRoot.visible&&root.visible);assert.equal(currentTarget,null);assert.equal(currentAlpha,.3);assert(mock.xr.enabled&&mock.shadowMap.autoUpdate&&!mock.autoClear);assert.deepEqual(viewport.toArray(),[0,0,800,600]);assert.equal(clear.getHexString(),'536677');};
  restored();fail=true;assert.throws(()=>contact.bake([root]),/Simulated bake failure/);restored();assert.equal(contact.captures,1);contact.dispose();
  console.log('OK: geometry contact capture keeps real alpha cutouts, height limit, blur and restores renderer/material state even after failure');
}
const woodland=createModelWoodland(scene,models,{heightAt,riverX,random:seededRandom(8266)});
const camera=new THREE.PerspectiveCamera(52,1,.1,2300);camera.position.set(15,14,38);camera.lookAt(0,2,-40);
woodland.update(1,camera);
const levelCounts=()=>woodland.visibleCounts.slice();
let levels=levelCounts();assert(levels.reduce((a,b)=>a+b,0)<=698);
assert(levels[0]<=6&&levels[1]<=22&&levels[0]>0);
assert(woodland.foothillCount>=2500,'Wooded foothills are missing');
assert(new Set(woodland.trees.map(t=>t.family)).size===4,'Mixed canopy families are missing');
assert(woodland.visibleFamilies.filter(n=>n>0).length>=3,'The overview still shows only one canopy silhouette');
for(let i=0;i<3;i++){
  const ids=['firNear','firFar','firDistant','firHorizon'];
  for(const id of ids){assert(models[id][i].size.equals(models.firNear[i].size),'Fir LOD changed root or scale');
    for(const part of models[id][i].parts){
      if(/twigs/.test(part.material.name)){assert.equal(part.material.alphaMap.mipmaps.length,11);assert.equal(part.material.map.mipmaps.length,11);assert.equal(part.material.alphaTest,.30);}
      else assert(!part.material.alphaMap,'Needle alpha was incorrectly applied to fir bark');
    }
  }
  assert(models.firHorizon[i].triangles<6000,'Far conifers exceed their horizon budget');
}
for(const t of woodland.trees)assert(Math.abs(t.y+.08-heightAt(t.x,t.z))<.00001,'Tree roots missed the shared terrain');
const parts=models.matureNear[0].parts,leaves=parts.find(p=>/leaves/.test(p.material.name));
assert(models.matureNear[0].size.equals(models.matureFar[0].size));
assert(models.matureNear[0].size.equals(models.matureDistant[0].size));
assert.equal(models.matureNear[0].triangles,266394);
assert.equal(models.matureFar[0].triangles,67621);
assert.equal(models.matureDistant[0].triangles,9919);
assert(leaves.material.alphaMap&&leaves.material.alphaTest>0);
assert.equal(leaves.material.alphaMap.mipmaps.length,11,'Coverage-preserving tree alpha mips are missing');
assert(!leaves.material.alphaToCoverage,'Derivative alpha smoothing erases small leaf cards');
assert.equal(leaves.material.map.mipmaps.length,11,'Alpha-weighted leaf colour mipmaps are missing');
assert(models.matureHorizon[0].triangles<1800,'Horizon trees still use subpixel branch detail');
assert(parts.filter(p=>!/leaves/.test(p.material.name)).every(p=>!p.material.alphaMap),'Bark must remain opaque');
assert.equal(models.matureFar[0].parts[0].material,models.matureNear[0].parts[0].material,'Tree LODs should share materials');
camera.position.set(1000,20,1000);camera.lookAt(2000,20,2000);woodland.update(2,camera);levels=levelCounts();
assert.equal(levels.reduce((a,b)=>a+b,0),0,'Out-of-view woodland still consumes the visible tree budget');
camera.position.set(15,14,38);camera.lookAt(0,2,-40);woodland.update(3,camera);
assert(levelCounts()[2]+levelCounts()[3]>100,'Distant wooded slopes are not displayed');
assert(levelCounts()[3]>120,'Horizon LOD is not used on distant slopes');
camera.lookAt(100,14,100);woodland.update(4,camera);
assert(levelCounts()[2]<100,'Rotating in place failed to update forest visibility');
console.log(`OK: ${woodland.treeCount} mature trees, including ${woodland.foothillCount} on wooded slopes; LOD/view budgets and rotation updates valid`);
const valleyPlants=createValleyVegetation(scene,models,{heightAt,riverX,riverWidth,random:seededRandom(72941)});
assert(valleyPlants.counts.scrub>=400&&valleyPlants.counts.sapling>=150&&valleyPlants.counts.rough>=4000,'Forest-edge layers are missing');
for(const p of valleyPlants.items){assert(Math.abs(p.y+.012-heightAt(p.x,p.z))<.00001,'An understory root floats');assert(Math.abs(p.x-riverX(p.z))>riverWidth(p.z)+1.49,'Understory crossed into the water');assert(!(Math.abs(p.x)<16&&p.z>-29&&p.z<12),'Wild scrub invaded the managed garden');}
camera.position.set(1000,20,1000);valleyPlants.update(camera);assert(valleyPlants.group.children.every(m=>m.count===0),'Out-of-range scrub still renders');
assert(valleyHabitatAt(0,-10).forest===0&&valleyHabitatAt(0,-10).edge===0,'Woodland field altered the cottage garden');
console.log(`OK: valley edge instances ${JSON.stringify(valleyPlants.counts)}, planted on land with distance budgets`);
const texture=new THREE.Texture(),set={color:texture,normal:texture,roughness:texture};
const nature={elevation,aerial:texture,dryGrass:texture,rock:set,gravel:set,grass:set,soil:set,wood:set};
const courtyard=createCourtyardPath(scene,{heightAt,stone:set,random:seededRandom(73019)});
assert(courtyard.surfaces.length>45,'Too many flagstone cells were discarded');
for(const attr of Object.values(courtyard.mesh.geometry.attributes))assert(attr.array.every(Number.isFinite));
for(const stone of courtyard.surfaces)for(const [x,y,z] of stone.outline){
  assert(y-heightAt(x,z)>.004&&y-heightAt(x,z)<.012,'Flagstone edges float above, or sink below, the lawn');
}
for(const {centre:[x,y,z]}of courtyard.surfaces)assert(Math.abs(courtyard.surfaceHeightAt(x,z)-y)<1e-7,'Footing height differs from the actual flagstone cap');
scene.updateMatrixWorld(true);
const pathRay=new THREE.Raycaster();let capHits=0;
for(let i=0;i<100;i++){
  const f=pathFrameAt((i+.5)/100*courtyardPathLength);
  assert(Math.abs(f.x-riverX(f.z))>riverWidth(f.z)+.6,'Garden path cuts through the stream instead of joining the bridge approach');
  pathRay.set(new THREE.Vector3(f.x,10,f.z),new THREE.Vector3(0,-1,0));
  const hit=pathRay.intersectObject(courtyard.mesh)[0];
  if(hit){
    if(hit.faceIndex%5===0)assert(hit.face.normal.y>.5,'A path cap is back-facing');
    // A cap bridges small turf undulations; its interior must remain within 2 cm.
    assert(hit.point.y-heightAt(f.x,f.z)>.001&&hit.point.y-heightAt(f.x,f.z)<.02,'Path surface is not seated at walking height');capHits++;
  }
}
assert(capHits>78,'Flagstones leave large holes along the walking route');
console.log(`OK: ${courtyard.surfaces.length} fitted flagstones, seated bevel edges and ${capHits}/100 centreline coverage`);
const ground=createGroundSurface(nature,{riverX,riverWidth,habitatAt:valleyHabitatAt});
const grazingSites=[{x:7,z:11,radius:.65,occlusion:.35,grazing:1,grazingRadius:2.8},{x:18,z:-6,radius:.65,occlusion:.35,grazing:1,grazingRadius:2.8}];
grazingSites[0].feedingPoint=new THREE.Vector3(8,heightAt(8,11)+.12,11);grazingSites[1].feedingPoint=new THREE.Vector3(19,heightAt(19,-6)+.12,-6);
ground.setContacts([...garden.contacts,...woodland.contacts,...grazingSites],{minX:-4,maxX:4,minZ:-15.06,maxZ:-5.06});
assert(ground.contactAt(7,11)[3]>.95,'Grazed ground does not share the pasture crop field');
assert(ground.weightsAt(5,3).grass>.95,'Managed garden lawn lost grass coverage');
assert(ground.weightsAt(9.5,4).soil>.5,'Flowerbed soil is missing');
assert(ground.weightsAt(0,5).soil>.5,'Path soil is missing');
assert(ground.contactAt(2.05,0)[2]>.7,'Path-side flowerbed mulch is missing');
assert(ground.weightsAt(2.05,0).grass<.1,'Lawn grass grows through a prepared flowerbed');
const shoreline=ground.weightsAt(riverX(30)+riverWidth(30)+1.4,30);
assert(shoreline.soil>.2&&shoreline.gravel>.1,'Soil/gravel riverbank transition is missing');
assert(ground.contactAt(woodland.contacts[0].x,woodland.contacts[0].z)[0]>.4,'Tree-root contact is missing');
const lawn=createModelLawn(scene,models,{heightAt,weightsAt:ground.weightsAt,random:seededRandom(18274),grazingSites});
assert.equal(lawn.shortCount,3000);assert.equal(lawn.meadowCount,10500);
assert(lawn.pastureCount>=1500,'Close pasture lacks scan-grass layers');
assert.equal(lawn.forageItems.length,28,'Scanned edible grass is missing under the muzzles');
for(const site of grazingSites){const feed=site.feedingPoint,near=lawn.forageItems.filter(p=>Math.hypot(p.x-feed.x,p.z-feed.z)<.55);assert(near.length>=14&&near.some(p=>Math.hypot(p.x-feed.x,p.z-feed.z)<.001),'Edible grass is not aligned with the actual mouth position');assert(near.some(p=>heightAt(p.x,p.z)+p.height>feed.y),'The mouth floats above all forage tips');}
const crop=lawn.pastureItems.filter(p=>grazingInfluenceAt(p.x,p.z,grazingSites)>.8),tall=lawn.pastureItems.filter(p=>grazingInfluenceAt(p.x,p.z,grazingSites)<.2);
assert(crop.length>20&&tall.length>200&&tall.reduce((s,p)=>s+p.height,0)/tall.length>crop.reduce((s,p)=>s+p.height,0)/crop.length*2,'Grazed and unmown grass have the same height');
for(const mesh of lawn.group.children){
  const matrix=mesh.instanceMatrix.array;
  for(let i=0;i<mesh.count;i++)assert(ground.weightsAt(matrix[i*16+12],matrix[i*16+14]).grass>.85,'A short grass tuft crossed onto exposed soil or water');
}
lawn.update(camera);
assert(lawn.group.children.some(m=>m.count<m.userData.fullCount),'Distant grass detail is never reduced');
camera.position.set(1000,20,1000);lawn.update(camera);
assert(lawn.group.children.every(m=>m.count===0),'Out-of-range grass still renders');
const fineGrass=createFineGrass(scene,{heightAt,weightsAt:ground.weightsAt,random:seededRandom(92833),grazingSites});
assert(fineGrass.count>100000&&fineGrass.count<700000,'Near grass density exceeds the intended draw budget');
assert(fineGrass.pastureCount>15000,'Close pasture lacks fine grass volume');
assert.equal(fineGrass.feedingCount,2800,'Visible fine blades are missing at the feeding points');
for(const mesh of fineGrass.group.children){
  assert(mesh.instanceMatrix.array.every(Number.isFinite));
  for(let i=0;i<Math.min(30,mesh.count);i++){
    const matrix=mesh.instanceMatrix.array,x=matrix[i*16+12],y=matrix[i*16+13],z=matrix[i*16+14];
    assert(ground.weightsAt(x,z).grass>.899,'Fine grass crossed onto soil or gravel');
    assert(Math.abs(y+.006-heightAt(x,z))<.0001,'Fine grass floats above the actual ground');
  }
}
fineGrass.update(camera);assert(fineGrass.group.children.every(m=>!m.visible),'Out-of-range fine grass still renders');
console.log(`OK: ${fineGrass.count} near grass blades, exact ground contacts and distance culling`);
const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
ground.material.onBeforeCompile(shader);
assert(shader.fragmentShader.includes('float roughnessFactor='),'Ground roughness variable is missing');
assert(shader.fragmentShader.includes('getTangentFrame(-vViewPosition,normal,groundUv)'),'Ground normal UV frame is missing');
assert.equal(shader.uniforms.groundContacts.value,ground.atlas);
assert(shader.fragmentShader.includes('float lawnRoughness=.90+'),'Grass may still use the low-roughness source map directly');
const nearGround=createGroundGeometry(meadowHeightAt,{habitatAt:valleyHabitatAt}),middleGround=createGroundGeometry(meadowHeightAt,{near:false,middle:true,habitatAt:valleyHabitatAt}),farGround=createGroundGeometry(meadowHeightAt,{near:false,habitatAt:valleyHabitatAt});
assert(nearGround.attributes.landCover.array.some(v=>v>.8),'Near meadow has no woodland-edge colour field');
assert(nearGround.attributes.surfaceCover.array.some(v=>v>.6),'The meadow has no connected exposed-soil/rock patches');
for(const g of [nearGround,middleGround,farGround])for(const attr of Object.values(g.attributes))assert(attr.array.every(Number.isFinite));
for(const [fine,coarse,extent,step] of [[nearGround,middleGround,60,1.25],[middleGround,farGround,160,5]]){
  const heights=new Map(),cp=coarse.attributes.position;
  for(let i=0;i<cp.count;i++)heights.set(`${cp.getX(i)},${cp.getZ(i)}`,cp.getY(i));
  const p=fine.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i);let expected;
    if(Math.abs(x)===extent){const z0=Math.floor(z/step)*step;expected=THREE.MathUtils.lerp(heights.get(`${x},${z0}`),heights.get(`${x},${z0+step}`),(z-z0)/step);}
    else if(Math.abs(z)===extent){const x0=Math.floor(x/step)*step;expected=THREE.MathUtils.lerp(heights.get(`${x0},${z}`),heights.get(`${x0+step},${z}`),(x-x0)/step);}
    if(expected!==undefined)assert(Math.abs(p.getY(i)-expected)<.00001,'A near/middle/far ground seam opened');
  }
}
const groundRaycaster=new THREE.Raycaster(),nearMesh=new THREE.Mesh(nearGround),middleMesh=new THREE.Mesh(middleGround),farMesh=new THREE.Mesh(farGround);
for(let i=0;i<160;i++){
  const x=-215+(i*31.37)%430,z=-220+(i*23.13)%400;
  groundRaycaster.set(new THREE.Vector3(x,50,z),new THREE.Vector3(0,-1,0));
  const hit=groundRaycaster.intersectObjects([nearMesh,middleMesh,farMesh])[0];
  assert(hit&&Math.abs(hit.point.y-meadowSurfaceHeightAt(x,z))<.0001,'Grass/tree root sampler missed rendered meadow triangles');
}
const bank=createBankGeometry({heightAt:meadowHeightAt,riverX,riverWidth});
for(let i=0;i<bank.attributes.normal.count;i++)assert(bank.attributes.normal.getY(i)>0,'A riverbank face points down and may be culled');
const outerHeights=[];
for(let x=15;x<60;x+=2)for(let z=-50;z<50;z+=2)if(Math.abs(x-riverX(z))>riverWidth(z)+12)outerHeights.push(meadowHeightAt(x,z));
assert(Math.max(...outerHeights)-Math.min(...outerHeights)>2,'The outer meadow is still flat');
assert.equal(wildnessAt(5,0),0);assert.equal(wildnessAt(30,0),1);
assert.equal(surfaceFieldAt(0,-10).bare,0);assert(surfaceFieldAt(29,-29).bare>.7,'Natural erosion scar is missing');
assert(ground.weightsAt(29,-29).grass<.3,'Dense lawn grows over an exposed erosion scar');
const metreRelief=[];for(let x=20;x<80;x+=2)for(let z=-100;z<-30;z+=2)metreRelief.push(Math.abs(localReliefAt(x,z)-localReliefAt(x+1,z)));
assert(Math.max(...metreRelief)>.15,'The meadow still lacks metre-scale surface relief');
const geology=createValleyGeology(scene,models,{heightAt,riverX,riverWidth,random:seededRandom(91477)});
assert(geology.items.length>85&&geology.obstacles.length===9,'Outcrops, loose stones or stream obstructions are missing');
for(const r of geology.items){assert(Number.isFinite(r.y)&&r.h>0);if(!r.channel){assert(r.y<heightAt(r.x,r.z),'A scan boulder is floating above the ground');assert(surfaceFieldAt(r.x,r.z).bare>.17,'A boulder left the eroded terrain patches');}}
console.log(`OK: ${geology.items.length} embedded scan rocks, including ${geology.obstacles.length} stream obstructions; three terrain resolutions align with the root sampler`);
console.log(`OK: matte layered ground, contact masks, seams, rolling outer meadow and ${lawn.shortCount}/${lawn.meadowCount} short/wild grass instances`);
const mountain=createMountains(scene,nature);mountain.geometry.computeBoundingBox();
assert.equal(mountain.geometry.index.count/3,130050);
assert(mountain.geometry.boundingBox.max.y>390&&mountain.geometry.boundingBox.max.y<410);
const raycaster=new THREE.Raycaster(),origin=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0);
for(let i=0;i<120;i++){
  const x=-450+(i*197.13)%900,z=-160-(i*119.73)%700;
  raycaster.set(origin.set(x,800,z),down);
  const hit=raycaster.intersectObject(mountain)[0];
  assert(hit&&Math.abs(hit.point.y-mountainHeightAt(x,z))<.001,'DEM sampler differs from the rendered triangles');
}
const cover=mountain.geometry.attributes.forestCover;
assert(cover&&cover.array.some(x=>x>.8),'Forested mountain material coverage is missing');
assert(mountain.geometry.attributes.meadowFoot.array.some(x=>x>.99)&&mountain.geometry.attributes.meadowFoot.array.some(x=>x<.01),'Mountain foot no longer blends into the meadow');
const stream=createStream(scene,nature,{riverX,riverWidth});
stream.setObstacles(geology.obstacles);assert.equal(stream.water.material.uniforms.streamRockCount.value,9);
const bedPositions=stream.bed.geometry.attributes.position;
for(let i=0;i<bedPositions.count;i+=29){const z=bedPositions.getZ(i),u=(bedPositions.getX(i)-riverX(z))/(2*riverWidth(z))+.5;assert(Math.abs(bedPositions.getY(i)+.05+streamBedProfileAt(z,u).depth)<.00005,'Water absorption and the physical bed use different depths');}
assert(Math.abs(stream.profileAt(-6,.5).depth-stream.profileAt(-45,.5).depth)>.1,'Pools and riffles have the same depth');
const lifeAssets=await loadValleyLife(renderer),life=createValleyLife(scene,lifeAssets,{heightAt,walkHeight:heightAt,obstacles:[...woodland.colliders,...garden.colliders,...geology.colliders]});
assert.equal(life.cattle.length,2);assert(life.walkClip.duration>0&&lifeAssets.gardener.size.y>1.5&&lifeAssets.gardener.size.y<1.7);
for(const c of life.cattle){assert.equal(c.roaming.stops.length,6,'A pasture cow has no connected safe grazing stops');for(const stage of c.roaming.stages)if(stage.kind==='walking')assert(c.roaming.lineSafe(stage.from,stage.to),'A real pasture route crosses an obstacle');}
const hoofProbes=life.cattle.map(c=>{
  const g=c.behavior.mesh.geometry,p=g.attributes.position,s=g.attributes.skinIndex,w=g.attributes.skinWeight,feet=Array.from({length:4},()=>[]);
  for(let i=0;i<p.count;i+=2)if(p.getY(i)<.06)for(let j=0;j<4;j++){const leg=(s.getComponent(i,j)-7)/3;if(Number.isInteger(leg)&&leg>=0&&leg<4&&w.getComponent(i,j)>.999)feet[leg].push(i);}
  return feet;
});
const lifeCamera=new THREE.PerspectiveCamera();lifeCamera.position.set(0,2,15);
let lowestHoof=Infinity,highestSupport=-Infinity;const solePoint=new THREE.Vector3();
const firstWalk=life.cattle[0].roaming.stages.find(s=>s.kind==='walking');
for(let frame=0;frame<Math.ceil((firstWalk.end+3)*30);frame++){
  life.update(1/30,frame/30,lifeCamera);if(frame%6)continue;
  life.cattle.forEach((c,k)=>hoofProbes[k].forEach((indices,leg)=>{
    let clearance=Infinity;for(const i of indices){c.behavior.mesh.getVertexPosition(i,solePoint).applyMatrix4(c.behavior.mesh.matrixWorld);clearance=Math.min(clearance,solePoint.y-heightAt(solePoint.x,solePoint.z));}
    lowestHoof=Math.min(lowestHoof,clearance);if(!c.behavior.gait.feet[leg].swing)highestSupport=Math.max(highestSupport,clearance);
  }));
}
assert(lowestHoof>-.006&&highestSupport<.008,'A real placed animal floats or penetrates the rendered valley terrain');
console.log('Actual scene hoof contact '+JSON.stringify({lowestHoof,highestSupport}));
let actorSkin=false;life.gardener.traverse(o=>{if(o.isSkinnedMesh)actorSkin=true;});assert(actorSkin,'The resident lost the original skeleton');
for(let i=0;i<60;i++){life.update(.25,i*.25,lifeCamera);const p=life.gardener.position;assert(Math.abs(p.x)<.35&&p.z>-.5&&p.z<6,'The resident left the garden walkway');assert(Math.abs(life.footing.clearance-.0015)<.006,'Animated soles float above the ground');}
for(const c of life.cattle){assert(surfaceFieldAt(c.x,c.z).bare<.2,'A pasture animal is standing on an outcrop');assert(Math.abs(c.group.position.y-heightAt(c.x,c.z)-.005)<.0001);}
lifeCamera.position.set(0,1.9,5.2);for(let i=0;i<100;i++){life.update(.1,20+i*.1,lifeCamera);assert(life.gardener.position.distanceTo(lifeCamera.position)>.9,'The resident entered the normal arrival viewpoint');}
const pausedRoot=life.gardener.position.clone();lifeCamera.position.set(pausedRoot.x,pausedRoot.y+1.7,pausedRoot.z+1.2);for(let i=0;i<20;i++)life.update(.1,40+i*.1,lifeCamera);assert(Math.hypot(life.gardener.position.x-pausedRoot.x,life.gardener.position.z-pausedRoot.z)<.001,'The resident kept walking into a nearby visitor');
assert.equal(life.colliders.length,3);life.setVisible(false);assert(!life.group.visible&&life.colliders.every(c=>c.maxX<c.minX));life.setVisible(true);assert(life.group.visible&&life.colliders.every(c=>c.maxX>c.minX));
console.log('OK: one 1.60 m rigged resident walks the garden route; two cattle meet the pasture, and the life visibility control works');
for(const dimensions of [[.32,.12,2.5],[.15,1.15,.15],[.7,.065,.09]]){
  const timber=timberGeometry(...dimensions,4);timber.computeBoundingBox();
  for(const attr of Object.values(timber.attributes))assert(attr.array.every(Number.isFinite),'Timber has invalid grain UVs or bevel normals');
  const actual=timber.boundingBox.getSize(new THREE.Vector3()).toArray();
  dimensions.forEach((size,i)=>assert(Math.abs(actual[i]-size)<.00001,'Edge bevel changed bridge dimensions'));
}
{
  const testScene=new THREE.Scene(),glass=new THREE.MeshPhysicalMaterial({transmission:.9});
  const pane=new THREE.Mesh(new THREE.BoxGeometry(1,1,.008),glass),detail=new THREE.Group();
  detail.userData.omitFromReflection=true;testScene.add(pane,detail);
  const testWater=new THREE.Mesh();testWater.material.uniforms={time:{value:0},eye:{value:new THREE.Vector3()}};
  let captured=0;
  testWater.onBeforeRender=()=>{assert(!detail.visible);assert(!pane.material.transmission);captured++;};
  const budget=budgetReflections(testWater,testScene),testCamera=new THREE.PerspectiveCamera();
  testCamera.position.set(0,2,5);testCamera.updateMatrixWorld();
  const capture=()=>testWater.onBeforeRender({},testScene,testCamera);
  capture();capture();assert.equal(captured,1,'Main/transmission passes duplicated reflection capture');
  testWater.material.uniforms.time.value=.01;capture();assert.equal(captured,1);
  testWater.material.uniforms.time.value=.1;capture();assert.equal(captured,2);
  testCamera.position.x=2;testCamera.updateMatrixWorld();testWater.material.uniforms.time.value=.11;capture();assert.equal(captured,3);
  assert(detail.visible&&pane.material===glass,'Reflection changed the main scene visibility or glass');
  budget.setQuality(false);testWater.material.uniforms.time.value=.12;capture();testWater.material.uniforms.time.value=.20;capture();assert.equal(captured,4);
}
const lightingRenderer={shadowMap:{}},lighting=createLightingRig(scene,lightingRenderer);
lighting.update(1,{water:stream.water,setEvening(){}});
assert(stream.water.material.uniforms.sunDirection.value.equals(foliageLighting.direction.value));
assert(stream.water.material.uniforms.sunColor.value.equals(lighting.sun.color));
assert.equal(lightingRenderer.shadowMap.type,THREE.PCFSoftShadowMap);
assert(Math.abs(lightingRenderer.toneMappingExposure-.92)<.000001);
lighting.update(0,null,camera);lighting.sun.shadow.needsUpdate=false;lighting.update(0,null,camera);
assert(!lighting.sun.shadow.needsUpdate,'Stationary sun shadows still redraw each frame');
const walkShadowCentre=lighting.sun.target.position.clone(),dayDirection=foliageLighting.direction.value.clone();
assert(walkShadowCentre.distanceTo(camera.position)<13,'Detailed sun shadow did not follow the walker');
camera.position.x+=2;lighting.update(0,null,camera);assert(lighting.sun.shadow.needsUpdate,'Moving the viewpoint did not refresh caster shadows');
assert(Math.abs(lighting.sun.target.position.x-walkShadowCentre.x-2)<.06,'Walking did not move the sun shadow coverage');
assert(foliageLighting.direction.value.distanceTo(dayDirection)<.000001,'Following shadows changed the daylight direction');
lighting.sun.shadow.needsUpdate=false;lighting.update(0,null,null);
assert(lighting.sun.target.position.equals(new THREE.Vector3(0,0,-8))&&lighting.sun.shadow.needsUpdate,'Overview did not restore the courtyard shadow coverage');
lighting.sun.shadow.needsUpdate=false;lighting.update(0,null,null);assert(!lighting.sun.shadow.needsUpdate,'Stationary overview shadows still redraw each frame');
lighting.sun.shadow.needsUpdate=false;lighting.update(.5,null,camera);assert(lighting.sun.shadow.needsUpdate,'Changing daylight did not refresh sun shadows');
lighting.sun.shadow.needsUpdate=false;lighting.invalidateShadows();assert(lighting.sun.shadow.needsUpdate,'House switching cannot invalidate old shadows');
lighting.setQuality(false);assert.equal(lighting.sun.shadow.mapSize.x,1024);
lighting.setQuality(true);assert.equal(lighting.sun.shadow.mapSize.x,2048);
assert(stream.water.material.fragmentShader.includes('float rf0 = 0.0204;'));
assert(!stream.water.material.fragmentShader.includes('vec3 outgoingLight = albedo;'));
assert(stream.water.material.fragmentShader.includes('vec2 reflectedUv='),'Reflection filtering patch failed');
assert(stream.water.material.vertexShader.includes('streamCoordinate=uv;'),'Stream UV varying patch failed');
const flowUv=stream.water.geometry.attributes.uv;
assert.equal(flowUv.getY(0),0);assert(flowUv.getY(flowUv.count-1)>1000);
for(let i=stream.rowStride;i<flowUv.count;i+=stream.rowStride)assert(flowUv.getY(i)>flowUv.getY(i-stream.rowStride),'Flow distance must increase downstream');
assert(!stream.water.material.fragmentShader.includes('float a=cross*'),'Old striped sine-wave field still active');
assert(!stream.water.material.fragmentShader.includes('float lace='),'Old periodic foam field still active');
stream.update(8);assert.equal(stream.water.material.uniforms.time.value,8);
for(const mesh of [mountain,stream.water])for(const attr of Object.values(mesh.geometry.attributes))assert(attr.array.every(Number.isFinite));
console.log(`OK: ${Object.keys(models).length} real asset sets loaded, variants finite, building bounds valid, DEM and stream geometry complete (CPU only)`);

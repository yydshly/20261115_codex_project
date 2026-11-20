import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('three');
const {FOREST_SITES,FOREST_GAP,forestField}=await import('../web/forest-layout.js');
const {terrainHeight,walkingSurface,viewClear,walkable,plots}=await import('../web/large-world.js');
const {constructionStops,constructionPath,constructionView,constructionObservation,constructionStagesFor,constructionNotebook,nearConstructionPath}=await import('../web/construction-learning.js');
const {environmentAt,vegetationPlacements}=await import('../web/vegetation-rules.js');
const {buildVegetation}=await import('../web/vegetation-scene.js');
const {buildForestDetails}=await import('../web/forest-scene.js');
const scene=new THREE.Scene(),obstacles=[];
const plants=await buildVegetation(scene,(x,z,radius)=>obstacles.push({x,z,radius}));
const details=buildForestDetails(scene,(x,z,radius)=>obstacles.push({x,z,radius}));
const fixed=plants.records,forest=fixed.filter(p=>forestField(p.x,p.z));
assert.ok(forest.length>2000,'Build a continuous forest, not just four scattered props');
assert.ok(constructionStops.length>=106);
const expected=['plain',...FOREST_SITES.map(r=>r.id),'basin','cave-mouth','cave-tunnel','cave-hall','cave-water','lake','ice-snow','ice-glacier','ice-lake','ice-melt','river','marsh','estuary','bay','marine-reef','marine-tidal','marine-shallow','marine-bed','town-road','town-block','town-building','town-interior','mountain-village','mountain-road','mountain-bridge','mountain-lower','mountain-upper','mountain-ridge','mountain-peak','life-resource','life-farm','life-fish','life-store','life-market','life-craft','life-home','trans-road','trans-bridge','trans-dock','trans-hub','trans-water','trans-service','polar-coast','polar-seaice','polar-cap','polar-tundra','polar-aurora','ocean-open','ocean-islands','ocean-shelf','ocean-slope','ocean-trench','tropical-edge','tropical-canopy','tropical-understory','tropical-bank','tropical-mangrove','tropical-estuary','dryland-grass','dryland-edge','dryland-gobi','dryland-valley','dryland-oasis','sky-cloud','sky-storm','sky-dust','sky-night','geo-sea','geo-bridge','geo-network','geo-thermal','karst-peaks','karst-stones','karst-sink','karst-shaft','karst-layers','karst-river','salt-lake','salt-marsh','salt-crust','salt-dry','strata-wall','strata-vein','strata-plateau','strata-terrace','fan-apex','fan-braid','fan-bar','fan-flood','volcanic-crater','volcanic-channel','volcanic-basalt','volcanic-columns','yardang-ridges','yardang-slot','yardang-stony','yardang-gravel','upland-meadow','upland-peat','upland-pools','upland-stream','boreal-conifer','boreal-mixed','boreal-birch','boreal-deadwood','warm-bamboo-edge','warm-bamboo-inner','warm-monsoon-dense','warm-monsoon-open','warm-dune-front','warm-dune-back'];
assert.deepEqual(constructionStops.map(r=>r.id),expected);
const ids=new Set(constructionStops.flatMap(r=>[0,1,2,3].map(s=>constructionObservation(r.index,s).id)));
assert.equal(ids.size,constructionStops.length*4);
for(const id of ['plain','basin','lake','river','marsh','estuary','bay'])for(let s=0;s<4;s++)assert.ok(ids.has(`build-${id}:${s}`),'Old observation IDs must remain valid');
assert.equal((constructionNotebook(ids).match(/### ✓ 已浏览/g)||[]).length,constructionStops.length*4);
const stations=FOREST_SITES.map(r=>{const index=constructionStops.findIndex(s=>s.id===r.id),v=constructionView(index);assert.ok(viewClear(v));assert.ok(walkable(r.x,r.z));assert.ok(Math.abs(v.y-walkingSurface(r.x,r.z)-1.72)<1e-8);assert.equal(constructionStagesFor(index).join('/'),'林地基底/树冠围合/林下层次/完整空间');return {name:r.name,canopyCover:plants.canopyCoverAt(r.x,r.z),layers:Object.fromEntries(['canopy','understory','ground'].map(layer=>[layer,forest.filter(p=>p.layer===layer&&Math.hypot(p.x-r.x,p.z-r.z)<20).length]))};});
assert.ok(stations[1].canopyCover>.7&&stations[2].canopyCover>.7,'Dense and understory stations need real overlapping crowns');
assert.ok(stations[0].canopyCover<stations[1].canopyCover*.6,'The edge must have more open sky');
assert.equal(stations[3].canopyCover,0,'The gap needs an actual overhead opening');
assert.ok(stations[1].layers.canopy>10&&stations[2].layers.understory>20);
assert.ok(forest.filter(p=>p.kind==='fern').length>150);
assert.ok(forest.filter(p=>p.kind==='moss').length>300);
assert.ok(forest.some(p=>p.kind==='flowers'&&Math.hypot(p.x-FOREST_GAP.x,p.z-FOREST_GAP.z)<20));
for(const p of forest){assert.ok(environmentAt(p.x,p.z).depth<=0);assert.ok(Math.abs(p.y-terrainHeight(p.x,p.z)+.035)<1e-7);const buffer=p.layer==='canopy'?2.2:p.layer==='understory'?1.3:.75;assert.equal(nearConstructionPath(p.x,p.z,buffer),false);if(p.layer==='canopy'){assert.ok(p.kind==='forestOak'||p.kind==='forestBirch');assert.ok(Math.hypot(p.x-FOREST_GAP.x,p.z-FOREST_GAP.z)>FOREST_GAP.radius+7.4);}}
// Inspect the actual instanced crown meshes, not just the distribution labels.
const treeBounds=[];
for(const kind of ['forestOak','forestBirch']){const group=plants.groups.find(g=>g.userData.kind===kind);assert.ok(group);const c=group.userData,p=fixed.find(p=>p.kind===kind&&Math.floor(p.x/320)*320+160===c.center.x&&Math.floor(p.z/320)*320+160===c.center.z),placement=new THREE.Matrix4().compose(new THREE.Vector3(p.x,p.y,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.rotation),new THREE.Vector3().setScalar(p.scale)),inverse=placement.clone().invert(),positions=[];group.traverse(o=>{if(o.isMesh&&o.material.color.g>o.material.color.r*1.1){const m=new THREE.Matrix4();o.getMatrixAt(0,m);o.geometry.computeBoundingBox();const box=o.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(m));positions.push({min:box.min.y,max:box.max.y});}});assert.ok(positions.length>=6);const crownBottom=Math.min(...positions.map(p=>p.min)),crownTop=Math.max(...positions.map(p=>p.max));assert.ok(crownBottom>10&&crownTop>20,'Crowns must be above the human activity space');treeBounds.push({kind,crownBottom,crownTop});}
for(let i=0;i<=4000;i++){const p=constructionPath(i/4000*4/(constructionStops.length-1));assert.ok(walkable(p.x,p.z));assert.ok(!plots.some(o=>Math.abs(o.x-p.x)<o.halfX+.4&&Math.abs(o.z-p.z)<o.halfZ+.4));assert.ok(!obstacles.some(o=>Math.hypot(o.x-p.x,o.z-p.z)<o.radius+.33),'Tree trunks and fallen logs must leave the guide corridor open');}
assert.ok(details.records.length>=3);
for(const p of details.records){for(const end of [p.a,p.b])assert.ok(Math.abs(end[1]-terrainHeight(end[0],end[2])-p.radius*.7)<1e-7);}
details.setStage(0);assert.equal(details.group.visible,false);details.setStage(2);assert.equal(details.group.visible,true);
plants.setLayer('ground',false);plants.update(FOREST_SITES[2]);assert.ok(plants.groups.filter(g=>g.userData.layer==='ground').every(g=>!g.visible));
plants.setLayer('ground',true);plants.update(FOREST_SITES[2]);assert.ok(plants.groups.some(g=>g.userData.layer==='canopy'&&g.userData.kind==='forestOak'&&g.visible));
const repeated=[...vegetationPlacements()].filter(p=>forestField(p.x,p.z));assert.deepEqual(repeated,forest,'The complete forest must regenerate deterministically');
// Exercise the actual controller's layer function against the generated geometry.
// This is a CPU integration check, not a browser or WebGL test.
const controller=readFileSync(new URL('../web/expedition.js',import.meta.url),'utf8'),layerFunction=controller.slice(controller.indexOf('function setLayer(stage){'),controller.indexOf('function updateLesson'));
assert.ok(layerFunction.startsWith('function setLayer')&&!layerFunction.includes('initialize()'),'Extract only the layer controller');
const tabs=Array.from({length:4},(_,i)=>({dataset:{analysis:String(i)},setAttribute(){}})),context={state:{index:2,feet:FOREST_SITES[1],overview:false},stops:constructionStops,buildMode:true,climateUI:null,vegetationMode:false,marineScene:{setStage(){}},settlementScene:{setStage(){}},mountainScene:{setStage(){},moveCabin(){}},productionScene:{setStage(){}},transportScene:{setStage(){}},northScene:null,linkScene:null,warmScene:null,borealScene:null,uplandScene:null,yardangScene:null,volcanicScene:null,fanScene:null,strataScene:null,saltScene:null,karstScene:null,geologyScene:{setStage(){},setCutaway(){}},drylandScene:{setStage(){}},tropicalScene:{setStage(){}},oceanScene:{setStage(){}},polarScene:{setStage(){}},tiles:{setStage(s){this.stage=s;}},sceneStage(){},waterScene:{setStage(s){this.stage=s;}},inlandScene:{setStage(s){this.stage=s;}},forestScene:details,caveScene:{setStage(){}},glacialScene:{setStage(){}},analysisLabels:()=>constructionStagesFor(context.state.index),water:{visible:true},plantLayers:{canopy:1,understory:1,ground:1,aquatic:1},vegetationScene:plants,setConditions(){},updateForest(p,o){plants.update(p,o);},refreshVegetationUI(){},applyVegetationStep(){},document:{querySelectorAll(){return tabs;}},constructionStagesFor};
runInNewContext(layerFunction+'\nthis.applyLayer=setLayer;',context);
const layerChecks=[];
for(let stage=0;stage<4;stage++){context.applyLayer(stage);assert.equal(plants.layers.canopy,stage>=1);assert.equal(plants.layers.understory,stage>=2);assert.equal(plants.layers.ground,stage>=3);assert.equal(details.group.visible,stage>=2);assert.equal(context.water.visible,true);assert.equal(context.tiles.stage,1);layerChecks.push({stage,canopy:plants.layers.canopy,understory:plants.layers.understory,ground:plants.layers.ground,deadwood:details.group.visible});}
context.state.index=constructionStops.findIndex(r=>r.id==='lake');context.applyLayer(0);assert.equal(context.water.visible,false);assert.equal(context.tiles.stage,0);context.applyLayer(3);assert.equal(context.water.visible,true);assert.ok(Object.values(plants.layers).every(Boolean),'Leaving the forest section must restore the other regions');
const result={result:'passed',fixedInstances:fixed.length,forestInstances:forest.length,forestLayers:Object.fromEntries(['canopy','understory','ground'].map(layer=>[layer,forest.filter(p=>p.layer===layer).length])),stations,treeBounds,fallenLogs:details.records.length,layerChecks,routeCollisionSamples:4001,constructionStations:constructionStops.length,observations:constructionStops.length*4,oldObservationsPreserved:28,browserVisualCheck:'not part of this CPU script; see settlement-browser-check.json for partial browser verification',limits:'CPU geometry and authored spatial rules; not rendered-image, real ecology, navigation or GPU performance validation'};
writeFileSync(new URL('../assets/forest-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

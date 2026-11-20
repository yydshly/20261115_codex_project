import {karstField,karstWaterAt} from '../web/karst-layout.js';
import {caveField as legacyCaveField,caveWalkable as legacyCaveWalkable} from '../web/cave-layout.js';
import {geologyField} from '../web/geology-layout.js';
import {geologyWalkable} from '../web/geology-navigation.js';
const caveField=(x,z,y=74)=>karstField(x,z,y,true)||geologyField(x,z)||legacyCaveField(x,z),caveWalkable=(x,z,y=74)=>{const f=karstField(x,z,y,true);return f?f.layer!=='shaft'&&(f.open||f.edge>.7)&&!(karstWaterAt(x,z)?.level>f.floor+.2):geologyField(x,z)?geologyWalkable(x,z):legacyCaveWalkable(x,z);};
import {forestField} from '../web/forest-layout.js';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {PLAIN,BASIN,LAKE,INLAND_SITES,INLAND_CHANNELS,RIVER_JOIN,channelSample,lakeBoundary,lakeField,inlandRegionAt} from '../web/inland-geography.js';
import {terrainHeight,walkingSurface,walkable,viewClear,LARGE_WORLD} from '../web/large-world.js';
import {waterAt,riverSample,riverBridge} from '../web/water-system.js';
import {environmentAt,vegetationPlacements,countNear} from '../web/vegetation-rules.js';
import {constructionStops,constructionStages,constructionView,constructionPath,constructionObservation,constructionNotebook,nearConstructionPath} from '../web/construction-learning.js';

// Check the terrain triangles actually used by the lowest water-tile resolution.
function meshHeight(x,z,res=48){const step=160/res,x0=Math.floor((x+1920)/step)*step-1920,z0=Math.floor((z+1600)/step)*step-1600,u=(x-x0)/step,v=(z-z0)/step,a=terrainHeight(x0,z0),b=terrainHeight(x0+step,z0),c=terrainHeight(x0,z0+step),d=terrainHeight(x0+step,z0+step);return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);}
const plainHeights=[];
for(let x=PLAIN.x-100;x<=PLAIN.x+100;x+=20)for(let z=PLAIN.z-90;z<=PLAIN.z+90;z+=20){const e=environmentAt(x,z);if(!e.river&&!waterAt(x,z)&&inlandRegionAt(x,z)?.kind==='plain')plainHeights.push(e.height);}
const plainRelief=Math.max(...plainHeights)-Math.min(...plainHeights);
assert.ok(plainHeights.length>20&&plainRelief<5,'The plain needs a genuinely low-relief interior');
const basinRim=terrainHeight(BASIN.x+BASIN.rx*.94,BASIN.z);
assert.ok(basinRim>LAKE.level+45,'The basin must be surrounded by actual elevated ground');
assert.equal(terrainHeight(LAKE.x,LAKE.z),LAKE.level-LAKE.depth);
assert.equal(waterAt(LAKE.x,LAKE.z).level,LAKE.level);
assert.equal(walkable(LAKE.x,LAKE.z),false,'The lake centre cannot be walked on');
let minLakeDepth=Infinity;
for(let i=0;i<180;i++){const a=i*Math.PI/90,b=lakeBoundary(a),x=LAKE.x+Math.cos(a)*LAKE.rx*.9*b,z=LAKE.z+Math.sin(a)*LAKE.rz*.9*b;assert.ok(lakeField(x,z).normalized<1);assert.equal(waterAt(x,z).level,LAKE.level);minLakeDepth=Math.min(minLakeDepth,LAKE.level-terrainHeight(x,z));assert.ok(meshHeight(x,z)<LAKE.level,'The lake surface needs to cover the rendered basin');}
assert.ok(minLakeDepth>.2);
const oldJoin=riverSample(RIVER_JOIN.t),newJoin=channelSample(1,1);
assert.ok(Math.hypot(oldJoin.x-newJoin.x,oldJoin.z-newJoin.z)<1e-8);
assert.ok(Math.abs(oldJoin.level-newJoin.level)<1e-8);
assert.equal(oldJoin.t,riverBridge.t,'The new route uses the existing bridge at the confluence');
assert.ok(lakeField(...[channelSample(0,1).x,channelSample(0,1).z]).normalized<1);
assert.ok(lakeField(...[channelSample(1,0).x,channelSample(1,0).z]).normalized<1);
const channels=[];
for(let i=0;i<=800;i++){const p=channelSample(0,i/800),q=lakeField(p.x,p.z);if(q&&q.normalized<=1)assert.equal(p.level,LAKE.level,'The inlet must reach lake level before entering the lake');}
for(let c=0;c<2;c++){let prev=channelSample(c,0),length=0,minDepth=Infinity,minMeshDepth=Infinity;for(let i=0;i<=800;i++){const p=channelSample(c,i/800);assert.ok(p.level<=prev.level+1e-9,'Water cannot rise downstream');assert.ok(waterAt(p.x,p.z),'Both channels must be connected');const depth=p.level-terrainHeight(p.x,p.z);minDepth=Math.min(minDepth,depth);minMeshDepth=Math.min(minMeshDepth,p.level+.035-meshHeight(p.x,p.z));assert.ok(depth>.1,'A real bed must lie under the channel');length+=Math.hypot(p.x-prev.x,p.z-prev.z);prev=p;}assert.ok(minMeshDepth>0,'Terrain triangles must not cover the channel centre');channels.push({name:INLAND_CHANNELS[c].name,lengthMetres:Math.round(length),minDepth,minRenderedCentreDepth:minMeshDepth});}
assert.ok(constructionStops.length>=106);assert.equal(constructionStages.length,4);
for(let i=0;i<constructionStops.length;i++){const r=constructionStops[i],v=constructionView(i);assert.ok(r.canopy?v.y>terrainHeight(r.x,r.z)+20:r.ocean?v.y>terrainHeight(r.x,r.z)+6:r.survey?terrainHeight(r.x,r.z)<0:r.underground?caveWalkable(r.x,r.z,v.y-1.72):walkable(r.x,r.z),r.name+' needs the correct floor support');if(!r.cave&&!r.marine&&!r.mountain&&!r.production&&!r.transport&&!r.upland&&!r.yardang&&!r.volcanic&&!r.fan&&!r.strata&&!r.saline&&!r.karst&&!r.geology&&!r.sky&&!r.dryland&&!r.tropical&&!r.ocean&&!r.polar)assert.ok(viewClear(v),r.name+' needs an unobstructed terrain view');assert.ok(Math.abs(v.y-(r.canopy?walkingSurface(r.x,r.z)+26:r.ocean?terrainHeight(r.x,r.z)+r.clearance:r.survey?terrainHeight(r.x,r.z):r.underground?caveField(r.x,r.z,v.y-1.72).floor:walkingSurface(v.x,v.z))-LARGE_WORLD.eye)<1e-8);const p=constructionPath(i/(constructionStops.length-1));assert.ok(Math.hypot(p.x-r.x,p.z-r.z)<1e-6,'The route must reach the actual station');}
let maxSampleStep=0,maxMicroStep=0,prev=constructionPath(0);
for(let i=0;i<=6000;i++){const t=i/6000,p=constructionPath(t),next=constructionPath(Math.min(1,t+1e-8*26/(constructionStops.length-1)));assert.ok([p.x,p.y,p.z].every(Number.isFinite));assert.ok(p.warm?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.boreal?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.upland?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.yardang?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.volcanic?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.fan?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.strata?(p.survey?Number.isFinite(p.y):walkable(p.x,p.z)):p.saline?(p.survey||p.shaftRide?Number.isFinite(p.y):p.underground?caveWalkable(p.x,p.z,p.y):walkable(p.x,p.z)):p.karst?(p.survey||p.shaftRide?Number.isFinite(p.y):p.underground?caveWalkable(p.x,p.z,p.y):walkable(p.x,p.z)):p.geology?(p.survey?p.y>=terrainHeight(p.x,p.z):p.underground?caveWalkable(p.x,p.z):walkable(p.x,p.z)):p.riding?Number.isFinite(p.y):p.dryland?p.y>=terrainHeight(p.x,p.z):p.tropical?p.y>=terrainHeight(p.x,p.z):p.ocean?p.y>=terrainHeight(p.x,p.z):p.survey?Math.abs(p.y-terrainHeight(p.x,p.z))<1e-8:p.underground?caveWalkable(p.x,p.z):walkable(p.x,p.z),'Every sampled route location needs its own layer support');maxSampleStep=Math.max(maxSampleStep,Math.hypot(p.x-prev.x,p.z-prev.z));maxMicroStep=Math.max(maxMicroStep,Math.hypot(next.x-p.x,next.z-p.z));prev=p;}
assert.ok(maxMicroStep<.025,'Do not snap sideways across the river');
const ids=new Set(constructionStops.flatMap(r=>constructionStages.map((_,s)=>constructionObservation(r.index,s).id)));
assert.equal(ids.size,constructionStops.length*4);assert.equal((constructionNotebook(ids).match(/### ✓ 已浏览/g)||[]).length,constructionStops.length*4);
const records=[...vegetationPlacements()],stations=INLAND_SITES.map(r=>({name:r.name,...countNear(records,r.x,r.z)}));
for(const r of stations)assert.ok(r.canopy>0&&r.understory>0&&r.ground>0,r.name+' needs actual upper layers');
assert.ok(stations[2].aquatic>0,'Lake shores need actual aquatic vegetation');
let lakePlants=0;
for(const p of records.filter(p=>!forestField(p.x,p.z)))assert.equal(nearConstructionPath(p.x,p.z,p.layer==='canopy'?7:p.layer==='understory'?2.5:1.65),false,'Plants must leave the new guide corridor clear');
for(const p of records){const q=lakeField(p.x,p.z);if(!q||q.normalized>1.1)continue;const e=environmentAt(p.x,p.z);assert.equal(e.salt,0,'The inland lake must use freshwater rules');assert.notEqual(p.kind,'palm');if(q.normalized<.65)assert.fail('The deep lake centre must stay empty');lakePlants++;}
assert.ok(lakePlants>20);
// Import real Three.js geometry without requiring a second dependency installation.
const runtime=new URL('../web/runtime/three.module.js',import.meta.url).href,geo=new URL('../web/inland-geography.js',import.meta.url).href;
const source=readFileSync(new URL('../web/inland-scene.js',import.meta.url),'utf8').replace("from 'three'",`from '${runtime}'`).replace("from './inland-geography.js'",`from '${geo}'`);
const {lakeGeometry,inlandChannelGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const meshes=[lakeGeometry(),inlandChannelGeometry()].map(g=>{for(const a of Object.values(g.attributes))assert.ok([...a.array].every(Number.isFinite));assert.ok([...g.index.array].every(i=>i<g.attributes.position.count));const info={vertices:g.attributes.position.count,triangles:g.index.count/3};g.dispose();return info;});
assert.equal(readFileSync(new URL('../web/index.html',import.meta.url),'utf8'),readFileSync(new URL('../web/journey.html',import.meta.url),'utf8'));
const result={result:'passed',plainReliefMetres:plainRelief,basinRimMetres:basinRim,lakeLevelMetres:LAKE.level,lakeCentreDepthMetres:LAKE.depth,confluenceLevelMetres:RIVER_JOIN.level,channels,stations,observations:constructionStops.length*4,routeSamples:6001,maxSampleStep,maxMicroStep,waterMeshes:meshes,browserVisualCheck:'not part of this CPU script; see settlement-browser-check.json for partial browser verification',limits:'Authored geography and scene rules; not hydrological or ecological simulation'};
writeFileSync(new URL('../assets/inland-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

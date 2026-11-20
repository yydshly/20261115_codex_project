import {createWatershedBalanceScene} from './watershed-balance-scene.js';
import {createSedimentScene} from './sediment-scene.js';
import {createSoilScene} from './soil-scene.js';
import {createEnvironmentLinesScene} from './environment-lines-scene.js';
import {createAnnualClimateScene} from './annual-climate-scene.js';
import {clearWorldPlanQuery,setRidgeBayQuery,setValleyLifeQuery} from './expedition-url.js';
import {WorldViewControls,overviewMode} from './view-controls.js';
import {divePoseClear} from './coast-sea.js';
import {buildNorthernWatershed} from './northern-watershed-scene.js';
import {WatershedTour,mountWatershedUI} from './watershed-tour.js';
import {buildWatershedLink} from './watershed-link-scene.js';
import {makeWorldInventory,planCameraPose} from './world-logic-data.js';
import {buildWorldPlan} from './world-plan-scene.js';
import {mountWorldPlan} from './world-plan-ui.js';
import {createIceAgeScene} from './ice-age-scene.js';
import {createTectonicScene} from './tectonic-scene.js';
import {createGroundwaterScene} from './groundwater-scene.js';
import {createWaterExchangeScene} from './water-exchange-scene.js';
import {createWetlandScene} from './wetland-scene.js';
import {createEstuaryScene} from './estuary-scene.js';
import {createFormationScene} from './formation-scene.js';
import {createBasinStormScene} from './basin-storm-scene.js';
import {buildWarm} from './warm-scene.js';
import {buildBoreal} from './boreal-scene.js';
import {buildUpland} from './upland-scene.js';
import {buildYardang} from './yardang-scene.js';
import {buildVolcanic} from './volcanic-scene.js';
import {buildFan} from './fan-scene.js';
import {getFanFlood} from './fan-layout.js';
import {buildStrata} from './strata-scene.js';
import {buildSalt} from './salt-scene.js';
import {getSaltWaterLevel} from './salt-layout.js';
import {buildKarst,karstSeaGeometry} from './karst-scene.js';
import {karstField,getKarstLiftLevel} from './karst-layout.js';
import {buildGeology} from './geology-scene.js';
import {geologyField} from './geology-layout.js';
import {SKY_PRESETS} from './sky-learning.js';
import {buildSpecialWeather,referenceVisibility} from './special-weather.js';
import {buildDryland} from './dryland-scene.js';
import {buildTropical} from './tropical-scene.js';
import {tropicalMove} from './tropical-learning.js';
import {tropicalWeight} from './tropical-layout.js';
import {buildOcean} from './ocean-scene.js';
import {oceanMove} from './ocean-learning.js';
import {oceanWeight,OCEAN_SITES} from './ocean-layout.js';
import {buildPolar} from './polar-scene.js';
import {buildTransport} from './transport-scene.js';
import {TransportFlow} from './transport-flow.js';
import {bindTransportUI} from './transport-ui.js';
import {buildProduction} from './production-scene.js';
import {ProductionFlow} from './production-flow.js';
import {bindProductionUI} from './production-ui.js';
import {buildMountain} from './mountain-scene.js';
import {mountMapProgress} from './world-progress.js';
import {buildSettlement} from './settlement-scene.js';
import {inTown,settlementInteriorAt,WORKSHOP} from './settlement-layout.js';
import {buildWeather} from './weather-scene.js';
import {bindWeatherUI} from './weather-ui.js';
import {climateStations} from './world-weather.js';
import {marineView,marineMove,marineStages} from './marine-learning.js';
import {buildMarine} from './marine-scene.js';
import {glacialView,upstreamWatershedStops,watershedStops,watershedPath,watershedObservation,watershedNotebook} from './glacial-learning.js';
import {buildGlacial} from './glacial-scene.js';
import {caveField as legacyCaveField,caveWalkable} from './cave-layout.js';
import {moveInWorld} from './cave-navigation.js';
import {BenchmarkWalk,benchmarkLength,benchmarkNear,benchmarkPoint} from './benchmark-trail.js';
import {benchmarkRunAt,createBenchmarkTimeNavigation,modernPassage,surveyBenchmarkTime} from './benchmark-time.js';
import {epochs} from './ice-age.js';
import {buildBenchmarkTrail,createBenchmarkTimeTrace} from './benchmark-trail-scene.js';
import {mountBenchmarkTrail} from './benchmark-trail-ui.js';
import {mainlineLessons} from './mainline-lessons.js';
import {mountMainlineGuide} from './mainline-guide-ui.js';
import {seaFrame,seaPace,seaStations} from './mainline-sea.js';
import {createMainlineSeaScene} from './coast-sea-scene.js';
import {buildCoastalFog,defaultFogCase,isCoastalFogZone,outerFogSite,readCoastalFog,shoreFogSite} from './coastal-fog.js';
import {createCoastalFogScene} from './coastal-fog-scene.js';
import {lifePoint} from './life-route.js';
import {buildLifeConnections,createLifeVisuals} from './life-route-scene.js';
import {mountLifeRoute} from './life-route-ui.js';
import {buildCave} from './cave-scene.js';
import {forestField} from './forest-layout.js';
import {buildForestDetails} from './forest-scene.js';
import * as THREE from 'three';
import {LARGE_WORLD,VOLCANO,stops as terrainStops,plots,terrainHeight,walkingSurface,walkable,benchmarkDeck,roadSample as landRoadSample,nearestRoad,stationView,viewClear,markerFor as landMarkerFor} from './large-world.js';
import {TerrainTiles,buildForests,buildSettlements,makeGrass,updateGrass,updateForest,blockedAt,animateDetails,sceneStage,makeSky,addObstacle,vegetationScene,weatherGrass} from './large-scene.js';
import {NavigationMap,navigationLabel} from './large-map.js';
import {observationFor as landObservation,notebookMarkdown as landNotebook} from './journey-learning.js';

import {waterStops,waterPlatforms,waterRouteSample,waterObservation,waterNotebook,riverSample,FALL_T} from './water-system.js';
import {buildWaterSystem} from './water-scene.js';
import {vegetationStops,vegetationRouteSample,vegetationObservation,vegetationNotebook} from './vegetation-learning.js';
import {plantLayers,plantTypes,habitats,environmentAt,surfaceName} from './vegetation-rules.js';
import {constructionStops,constructionStages,constructionStagesFor,constructionPath,constructionView,constructionObservation,constructionNotebook} from './construction-learning.js';
import {buildInlandWater} from './inland-scene.js';
const caveField=(x,z)=>karstField(x,z,state.feet.y)||geologyField(x,z)||legacyCaveField(x,z);
let buildMode=true,vegetationMode=false,waterMode=false,stops=constructionStops,waterScene,inlandScene,forestScene,caveScene,glacialScene,marineScene,settlementScene,mountainScene,productionScene,productionUI,transportScene,transportUI,northScene,linkScene,linkUI,warmScene,borealScene,uplandScene,yardangScene,volcanicScene,fanScene,strataScene,saltScene,karstScene,geologyScene,specialScene,skyWeatherBefore=null,drylandScene,tropicalScene,oceanScene,polarScene,polarWeatherBefore=null,conditionOn=false,canopyShade=0,shadeTarget=0,baseAmbient=1.8,baseSun=3.2,undergroundBlend=0,submergedBlend=0,weatherFogDensity=.00075,weatherCanopyFactor=1,weatherScene,climateUI,progressPanel,worldPlan,benchmarkUI;
const benchmarkWalk=new BenchmarkWalk();
let timelineScene,benchmarkTrace,benchmarkTime=null,benchmarkAir=false;
let mainlineUI,mainlineTravel=null,mainlineReturn=null,mainlineSeaScene,mainlineSeaFrame=null,coastalFogScene;
let coastalFogCase={...defaultFogCase};
const mistColor=new THREE.Color('#b8cbd0');
let lifeRouteUI;
const benchmarkPassage=()=>benchmarkTime?.passage??modernPassage;
const productionFlow=new ProductionFlow(),transportFlow=new TransportFlow(),linkTour=new WatershedTour();
const stageCount=()=>buildMode?4:3,fullStage=()=>stageCount()-1,allStages=()=>Array.from({length:stageCount()},(_,i)=>i);

function configureRoute(mode){buildMode=mode==='build';vegetationMode=mode==='vegetation';waterMode=mode==='water'||vegetationMode;stops=buildMode?constructionStops:vegetationMode?vegetationStops:waterMode?watershedStops:terrainStops;NOTE_KEY=buildMode?'worldform:0012:construction-notes:v1':vegetationMode?'worldform:0012:vegetation-notes:v1':waterMode?'worldform:0012:water-notes:v1':'worldform:0012:large-world-notes:v1';}
function setConditions(value){if(conditionOn===value)return;conditionOn=value;tiles.setEcology(value);$('show-habitats').setAttribute('aria-pressed',String(value));$('habitat-legend').hidden=!value;}
function refreshVegetationUI(){if(!vegetationScene)return;document.querySelectorAll('[data-plant-layer]').forEach(b=>b.setAttribute('aria-pressed',String(vegetationScene.layers[b.dataset.plantLayer])));const e=environmentAt(state.feet.x,state.feet.z);$('plant-environment').textContent=`${e.forest?.zone||habitats[e.habitat].name} · ${Math.round(e.height)}m · 坡度${Math.round(Math.atan(e.slope)*180/Math.PI)}° · ${surfaceName(e.surface)}`;$('plant-factors').textContent=`湿润度 ${Math.round(e.moisture*100)}% · 盐湿影响 ${Math.round(e.salt*100)}%${e.depth>0?' · 水深 '+e.depth.toFixed(1)+'m':''}${e.forest?' · 树冠覆盖约 '+Math.round(vegetationScene.canopyCoverAt(e.x,e.z)*100)+'%':''}`;$('plant-total').textContent='全图固定植被 '+vegetationScene.records.length.toLocaleString()+' · '+Object.keys(vegetationScene.species).length+'种形态';const counts=vegetationScene.nearbyAt(state.feet.x,state.feet.z);$('plant-counts').textContent=Object.entries(plantLayers).map(([k,v])=>v+' '+counts[k]).join(' / ');}
function applyVegetationStep(stage){if(!vegetationScene)return;for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,stage===2||(stage===1&&['canopy','understory'].includes(layer)));setConditions(stage===0);forestScene?.setStage(stage===2?3:stage===1?2:0);updateForest(state.feet,state.overview);refreshVegetationUI();}

const routeT=index=>buildMode?index/(stops.length-1):waterMode?(vegetationMode?stops[index].riverT/.90:index/(stops.length-1)):index/9;
const roadSample=t=>buildMode?constructionPath(t):vegetationMode?vegetationRouteSample(t):waterMode?watershedPath(t):landRoadSample(t);
const observationFor=(i,s)=>buildMode?constructionObservation(i,s):vegetationMode?vegetationObservation(i,s):waterMode?watershedObservation(i,s):landObservation(i,s);
const notebookMarkdown=ids=>buildMode?constructionNotebook(ids):vegetationMode?vegetationNotebook(ids):waterMode?watershedNotebook(ids):landNotebook(ids);
const markerFor=(i,s)=>buildMode?{x:stops[i].targetX,y:stops[i].targetY,z:stops[i].targetZ}:waterMode?{x:stops[i].targetX,y:stops[i].targetY,z:stops[i].targetZ}:landMarkerFor(i,s);
const noteTotal=()=>stops.length*stageCount();
const overviewStops=()=>buildMode?constructionStops:vegetationMode?vegetationStops:waterMode?watershedStops:waterStops;
const analysisLabels=()=>buildMode?constructionStagesFor(state.index):vegetationMode?['生长条件','林灌层次','完整群落']:waterMode?(stops[state.index].marine?marineStages.slice(1):stops[state.index].glacial?['雪冰形态','融水关系','完整冰雪']:['河床','水面岸线','生态使用']):['地形','地表','场景'];
function buildStops(){$('watershed-labels').innerHTML=overviewStops().map((r,i)=>`<button data-watershed-stop="${i}">${navigationLabel(r)}</button>`).join('');document.querySelectorAll('[data-watershed-stop]').forEach(b=>b.addEventListener('click',()=>{const index=Number(b.dataset.watershedStop),id=overviewStops()[index].id;if(!waterMode&&!buildMode){switchRoute('water');warp(watershedStops.findIndex(r=>r.id===id));}else warp(index);}));document.documentElement.dataset.route=buildMode?'build':waterMode?'water':'terrain';$('large-stops').style.gridTemplateColumns=`repeat(${stops.length},minmax(0,1fr))`;$('large-stops').setAttribute('aria-label',buildMode?`世界构建${stops.length}站主线`:waterMode?'冰雪到海床十四站水系主线':'地形十站主线');$('large-stops').innerHTML=stops.map((r,i)=>`<button data-large-stop="${i}" aria-label="前往第${i+1}站：${r.name}"><small>${String(i+1).padStart(2,'0')} / ${r.terrain}</small><span>${r.name}</span></button>`).join('');document.querySelectorAll('[data-large-stop]').forEach(b=>b.addEventListener('click',()=>warp(Number(b.dataset.largeStop))));document.querySelectorAll('[data-analysis]').forEach((b,i)=>{b.hidden=i>=stageCount();b.textContent=analysisLabels()[i]||'';});$('large-route').value=buildMode?'build':vegetationMode?'vegetation':waterMode?'water':'terrain';$('water-overview').textContent=buildMode?'世界全貌':vegetationMode?'植被全貌':'水系全貌';$('road-return').textContent=waterMode?'回到水岸':'回到主路';}
function switchRoute(mode){lifeRouteUI?.close();closeBenchmark();state.shaftRide=false;state.riding=false;enterWalk();configureRoute(mode);setConditions(false);for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,true);state.notes=new Set();state.finished=false;state.visited=new Set([0]);buildStops();navigation.setRoute(stops,roadSample);loadNotes();arrive(0);$('analysis-content').hidden=!(buildMode||vegetationMode);$('show-analysis').setAttribute('aria-expanded',String(buildMode||vegetationMode));}
const loadStarted=performance.now();
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const state={index:0,stage:2,auto:false,phase:'walk',time:0,lesson:0,roadT:0,travel:null,pace:1,yaw:0,pitch:0,targetYaw:0,targetPitch:0,feet:new THREE.Vector3(),notes:new Set(),visited:new Set([0]),finished:false,linkOverview:false,planOverview:false,overview:false,caveOverview:false,marineOverview:false,townOverview:false,mountainOverview:false,warmOverview:false,borealOverview:false,uplandOverview:false,yardangOverview:false,volcanicOverview:false,fanOverview:false,strataOverview:false,saltOverview:false,karstOverview:false,karstSection:'lower',shaftRide:false,karstOpen:false,karstLayer:'surface',geologyOverview:false,geologyBridgeView:false,drylandOverview:false,tropicalOverview:false,oceanOverview:false,polarOverview:false,transportOverview:false,transportFollowing:false,productionOverview:false,productionFollowing:false,indoor:false,riding:false,cableT:0,survey:false,underground:false};
const pressed=new Set();let NOTE_KEY='worldform:0012:construction-notes:v1';
let renderer,scene,camera,tiles,navigation,viewerControls,sun,ambient,sky,water,lava,marker,lastTime=0,frame=0,lastHud=0,lastLod=0,lastLodPosition=new THREE.Vector3(Infinity,0,Infinity),pointer;
const surfaceFogColor=new THREE.Color('#d1ded1'),caveFogColor=new THREE.Color('#23312e');
const shallowSeaFog=new THREE.Color('#648d96'),deepSeaFog=new THREE.Color('#213c50'),seaFog=new THREE.Color();
const projected=new THREE.Vector3(),direction=new THREE.Vector3(),sunOffset=new THREE.Vector3(-230,380,200);
function shortAngle(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
function lookAtPoint(x,y,z,instant=false){const dx=x-state.feet.x,dz=z-state.feet.z;state.targetYaw=Math.atan2(dx,-dz);state.targetPitch=Math.max(stops[state.index]?.karst?-1.54:-.8,Math.min(.65,Math.atan2(y-(state.feet.y+LARGE_WORLD.eye),Math.hypot(dx,dz))));if(instant){state.yaw=state.targetYaw;state.pitch=state.targetPitch;}}
function safeView(index){if(buildMode)return constructionView(index);if(vegetationMode){const r=stops[index],target=vegetationScene?.viewTarget(index,2)||{x:r.x-15,y:terrainHeight(r.x-15,r.z)+.5,z:r.z};return {x:r.x,z:r.z,y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye,targetX:target.x,targetY:target.y,targetZ:target.z};}if(waterMode){const r=stops[index];if(r.marine)return marineView(index-10);if(r.glacial)return glacialView(index);const legacy=r.waterLegacyIndex??index,p=waterPlatforms[legacy],target=legacy===0?riverSample(.028):legacy===1?riverSample(FALL_T+.0002):null;return {x:r.x,z:r.z,y:Math.max(walkingSurface(r.x,r.z),p.y)+LARGE_WORLD.eye,targetX:target?.x??r.targetX,targetZ:target?.z??r.targetZ,targetY:target?target.level+(legacy===1?3:0):r.targetY};}const view=stationView(index);if(walkable(view.x,view.z)&&!blockedAt(view.x,view.z)&&(view.roadEntry||viewClear(view)))return view;const main=plots.find(p=>p.index===index&&p.main);for(const radius of [25,35,45])for(let i=0;i<16;i++){const a=i*Math.PI/8,x=main.x+Math.sin(a)*radius,z=main.z+Math.cos(a)*radius;const candidate={...view,x,z,y:walkingSurface(x,z)+LARGE_WORLD.eye};if(walkable(x,z)&&!blockedAt(x,z)&&viewClear(candidate))return candidate;}const r=stops[index];return {...view,x:r.x,z:r.z,y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye};}
function status(text){$('expedition-status').textContent=text;}
function note(stage){const p=observationFor(state.index,stage);if(!p)return;state.notes.add(p.id);try{localStorage.setItem(NOTE_KEY,JSON.stringify([...state.notes]));}catch{}$('large-note-count').textContent=state.notes.size+'/'+noteTotal();}
function loadNotes(){try{const saved=JSON.parse(localStorage.getItem(NOTE_KEY)||'[]'),valid=new Set(stops.flatMap(r=>allStages().map(stage=>observationFor(r.index,stage).id)));if(Array.isArray(saved))state.notes=new Set(saved.filter(id=>valid.has(id)));}catch{}$('large-note-count').textContent=state.notes.size+'/'+noteTotal();}
function setLayer(stage){
 if(state.planOverview) {
  tiles.setStage(1);
  sceneStage(2);
  glacialScene?.setStage(3);
  for (const layer of Object.keys(plantLayers)) vegetationScene.setLayer(layer,true);
  updateForest(state.feet,true);
  return;
 }
 state.stage=stage;northScene?.setStage(stage);linkScene?.setStage(buildMode&&(stops[state.index].upland||stops[state.index].tropical)?stage:3,!!stops[state.index].tropical);const warm=buildMode&&stops[state.index].warm;warmScene?.setStage(warm?stage:3);const boreal=buildMode&&stops[state.index].boreal;borealScene?.setStage(boreal?stage:3);const upland=buildMode&&stops[state.index].upland;uplandScene?.setStage(upland?stage:3);const yardang=buildMode&&stops[state.index].yardang;yardangScene?.setStage(yardang?stage:3);const volcanic=buildMode&&stops[state.index].volcanic;volcanicScene?.setStage(volcanic?stage:3);const fan=buildMode&&stops[state.index].fan;fanScene?.setStage(fan?stage:3);const strata=buildMode&&stops[state.index].strata;strataScene?.setStage(strata?stage:3);const saline=buildMode&&stops[state.index].saline;saltScene?.setStage(saline?stage:3);const karst=buildMode&&stops[state.index].karst;karstScene?.setStage(karst?stage:3);karstScene?.setCutaway(!!state.karstOverview);karstScene?.setSection(state.karstSection);tiles.setKarstCutaway?.(!!state.karstOverview);const geology=buildMode&&stops[state.index].geology;geologyScene?.setStage(geology?stage:3);geologyScene?.setCutaway(!!state.geologyOverview);tiles.setGeologyCutaway?.(!!state.geologyOverview);const skyMode=buildMode&&stops[state.index].sky;if(skyMode&&climateUI){if(!skyWeatherBefore)skyWeatherBefore=climateUI.settings;climateUI.applyPreset(SKY_PRESETS[stage===0?0:stops[state.index].preset]);}const dryland=buildMode&&stops[state.index].dryland;drylandScene?.setStage(dryland?stage:3);const tropical=buildMode&&stops[state.index].tropical;tropicalScene?.setStage(tropical?stage:3);const ocean=buildMode&&stops[state.index].ocean;oceanScene?.setStage(ocean?stage:3);const polar=buildMode&&stops[state.index].polar;polarScene?.setStage(polar?stage:3);const transit=buildMode&&stops[state.index].transport;transportScene?.setStage(transit?stage:3);const production=buildMode&&stops[state.index].production;productionScene?.setStage(production?stage:3);const mountain=buildMode&&stops[state.index].mountain;mountainScene?.setStage(mountain?stage:3);const town=buildMode&&stops[state.index].settlement;const marine=(buildMode||waterMode&&!vegetationMode)&&stops[state.index].marine;const glacial=(buildMode||waterMode&&!vegetationMode)&&stops[state.index].glacial;const cave=buildMode&&stops[state.index].cave;const forest=buildMode&&stops[state.index].forest;
 if(warm){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(2);inlandScene?.setStage(3);water.visible=stage>=1;setConditions(false);updateForest(state.feet,state.overview);}
 else if(boreal){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(2);inlandScene?.setStage(3);water.visible=true;setConditions(false);updateForest(state.feet,state.overview);}
 else if(upland){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(2);inlandScene?.setStage(3);water.visible=stage>=2;setConditions(false);updateForest(state.feet,state.overview);}
 else if(yardang){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(2);inlandScene?.setStage(3);water.visible=stage>=2;setConditions(false);updateForest(state.feet,state.overview);}
 else if(volcanic){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(2);inlandScene?.setStage(3);water.visible=stage>=2;setConditions(false);updateForest(state.feet,state.overview);}
 else if(fan){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(2);inlandScene?.setStage(3);water.visible=stage>=2;setConditions(false);updateForest(state.feet,state.overview);}
 else if(strata){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(2);inlandScene?.setStage(3);water.visible=stage>=2;setConditions(false);updateForest(state.feet,state.overview);}
 else if(saline){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(2);inlandScene?.setStage(3);water.visible=stage>=2;setConditions(false);updateForest(state.feet,state.overview);}
 else if(karst){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(2);inlandScene?.setStage(3);water.visible=stage>=2;setConditions(false);updateForest(state.feet,state.overview);}
 else if(geology){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(stage>=2?2:0);inlandScene?.setStage(stage>=2?3:0);water.visible=stage>=2;setConditions(false);updateForest(state.feet,state.overview);}
 else if(skyMode){tiles.setStage(1);sceneStage(2);waterScene?.setStage(2);inlandScene?.setStage(3);forestScene?.setStage(3);water.visible=true;setConditions(false);for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,true);updateForest(state.feet,state.overview);}
 else if(dryland){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(stage>=2?2:0);inlandScene?.setStage(stage>=2?3:0);water.visible=stage>=2;setConditions(false);updateForest(state.feet,state.overview);}
 else if(tropical){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(stage>=1?2:0);inlandScene?.setStage(stage>=1?3:0);water.visible=stage>=1;setConditions(false);updateForest(state.feet,state.overview);}
 else if(ocean){tiles.setStage(stage===0?0:1);sceneStage(0);waterScene?.setStage(stage>=2?2:0);inlandScene?.setStage(stage>=2?3:0);water.visible=stage>=2&&!state.oceanOverview;setConditions(false);for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,stage>=3);updateForest(state.feet,state.overview);}
 else if(polar){tiles.setStage(stage===0?0:1);sceneStage(stage>=2?2:0);waterScene?.setStage(stage>=2?2:0);inlandScene?.setStage(stage>=2?3:0);water.visible=stage>=2;setConditions(false);for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,stage>=2);updateForest(state.feet,state.overview);}
 else if(transit){tiles.setStage(stage===0?0:1);sceneStage(2);waterScene?.setStage(2);inlandScene?.setStage(3);forestScene?.setStage(3);settlementScene?.setStage(3);water.visible=true;setConditions(false);for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,true);updateForest(state.feet,state.overview);}
 else if(production){tiles.setStage(stage===0?0:1);sceneStage(2);waterScene?.setStage(2);inlandScene?.setStage(3);forestScene?.setStage(3);water.visible=true;setConditions(false);for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,true);settlementScene?.setStage(stage===0?0:stage===1?2:3);updateForest(state.feet,state.overview);}
 else if(mountain){tiles.setStage(stage===0?0:1);sceneStage(stage===3?2:0);waterScene?.setStage(2);inlandScene?.setStage(3);water.visible=true;setConditions(false);for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,stage>=3);updateForest(state.feet,state.overview);}
 else if(town){tiles.setStage(1);sceneStage(2);waterScene?.setStage(2);inlandScene?.setStage(3);forestScene?.setStage(3);water.visible=true;for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,true);setConditions(false);settlementScene?.setStage(stage);updateForest(state.feet,state.overview);}
 else if(marine){const s=buildMode?stage:[1,2,3][stage];tiles.setStage(s===0?0:1);sceneStage(s===3?2:0);waterScene?.setStage(s<2?0:2);inlandScene?.setStage(s<2?0:3);forestScene?.setStage(s===3?3:0);water.visible=s>=2;for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,true);setConditions(false);marineScene?.setStage(s);updateForest(state.feet,state.overview);}
 else if(glacial){const s=buildMode?stage:[1,2,3][stage];tiles.setStage(s===0?0:1);sceneStage(s===3?2:0);waterScene?.setStage(s<2?0:s===3?2:1);inlandScene?.setStage(s<2?0:3);water.visible=s>=2;forestScene?.setStage(s===3?3:0);for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,true);setConditions(false);glacialScene?.setStage(s);updateForest(state.feet,state.overview);}
 else if(cave){tiles.setStage(1);sceneStage(2);waterScene?.setStage(2);inlandScene?.setStage(3);forestScene?.setStage(3);water.visible=true;for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,true);setConditions(false);caveScene?.setStage(stage);updateForest(state.feet,state.overview);}
 else if(forest){tiles.setStage(1);sceneStage(2);waterScene?.setStage(2);inlandScene?.setStage(3);water.visible=true;for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,layer==='canopy'?stage>=1:layer==='understory'?stage>=2:layer==='ground'?stage>=3:true);forestScene?.setStage(stage);setConditions(false);updateForest(state.feet,state.overview);refreshVegetationUI();}
 else {const physical=buildMode?(stage===0?0:stage===3?2:1):vegetationMode?2:stage;if(!vegetationMode)for(const layer of Object.keys(plantLayers))vegetationScene.setLayer(layer,true);tiles.setStage(physical);sceneStage(buildMode?(stage===3?2:0):physical);waterScene?.setStage(buildMode?(stage>=2?(stage===3?2:1):0):physical);inlandScene?.setStage(buildMode?stage:physical===0?0:physical+1);forestScene?.setStage(buildMode?(stage===3?3:0):vegetationMode?(stage===2?3:stage===1?2:0):physical===2?3:0);water.visible=buildMode?stage>=2:vegetationMode||stage>0||!waterMode;if(vegetationMode)applyVegetationStep(stage);else setConditions(false);updateForest(state.feet,state.overview);}
 tiles.setMarineDepth?.(!!marine&&(state.marineOverview||(buildMode?stage===2:stage===1)));if(!marine)marineScene?.setStage(3);if(state.marineOverview)water.visible=false;
 if(!town&&!production)settlementScene?.setStage(3);if(!glacial)glacialScene?.setStage(buildMode&&!stops[state.index].forest&&!stops[state.index].cave?stage:!buildMode&&!vegetationMode&&stage===0?0:3);if(!cave)caveScene?.setStage(3);if(state.caveOverview)sceneStage(0);
 document.querySelectorAll('[data-analysis]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.analysis)===stage));b.textContent=analysisLabels()[Number(b.dataset.analysis)];});
}


function updateLesson(stage,aim=true){state.lesson=stage;if(buildMode||waterMode&&!vegetationMode)setLayer(stage);if(vegetationMode)applyVegetationStep(stage);const r=stops[state.index],p=observationFor(state.index,stage);$('large-explanation').textContent=p.explanation;$('large-reuse').textContent='参考方法 · '+p.reuse;if(state.auto)$('large-narrative').textContent=p.prompt;document.querySelectorAll('[data-analysis]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.analysis)===stage)));
 if(aim){const m=markerFor(state.index,stage);if(buildMode){const v=constructionView(state.index);lookAtPoint(v.targetX,v.targetY,v.targetZ);}else if(stage===1&&!waterMode){state.targetPitch=-.52;state.targetYaw=state.yaw;}else if(vegetationMode){const p=vegetationScene.viewTarget(state.index,stage);lookAtPoint(p.x,p.y,p.z);}else if(waterMode){const v=safeView(state.index);lookAtPoint(v.targetX,v.targetY,v.targetZ);}else lookAtPoint(m.x,m.y,m.z);const caveMark=buildMode&&r.cave?caveField(m.x,m.z):null;marker.position.set(m.x,r.warm||r.boreal||r.upland||r.yardang||r.volcanic||r.fan||r.strata||r.saline||r.karst||r.geology?r.targetY+.2:r.ocean||r.marine?terrainHeight(m.x,m.z)+.2:r.glacial?r.targetY+.15:caveMark?(stage===2&&caveMark.water?caveMark.water.level+.12:caveMark.floor+.2):Math.max(terrainHeight(m.x,m.z),0)+1.3,m.z);marker.scale.setScalar(r.indoor?.22:r.settlement?.5:1);marker.visible=!$('analysis-content').hidden;}}
const sedimentFocus=stop=>stop.fan?"fan":stop.id==="marsh"?"flood":["estuary","bay"].includes(stop.id)?"mouth":null;
function updateStation(){climateUI?.refresh();progressPanel?.refresh();const r=stops[state.index];$('station-sediment').hidden=!sedimentFocus(r);$('station-soil').hidden=!sedimentFocus(r);$('warm-overview').hidden=!r.warm;$('warm-legend').hidden=!r.warm;$('boreal-overview').hidden=!r.boreal;$('boreal-legend').hidden=!r.boreal;$('upland-overview').hidden=!r.upland;$('upland-legend').hidden=!r.upland;$('yardang-overview').hidden=!r.yardang;$('yardang-legend').hidden=!r.yardang;$('volcanic-overview').hidden=!r.volcanic;$('volcanic-legend').hidden=!r.volcanic;$('fan-controls').hidden=!r.fan;$('fan-overview').hidden=!r.fan;if(r.fan){$('fan-water-state').textContent=getFanFlood()?'涨水参考：比常水位抬高1.1m':'常水参考：局部水段40m至18m';document.querySelectorAll('[data-fan-water]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.fanWater==='high')===getFanFlood())));}$('strata-overview').hidden=!r.strata;$('strata-legend').hidden=!r.strata;$('salt-controls').hidden=!r.saline;if(r.saline){$('salt-water-state').textContent=getSaltWaterLevel()===24?'高水位参考：盐湖24m / 盐沼23.5m':'退水参考：盐湖22m / 盐沼21.5m';document.querySelectorAll('[data-salt-water]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.saltWater==='low')===(getSaltWaterLevel()===22))));}$('salt-overview').hidden=!r.saline;$('karst-controls').hidden=!r.karst;$('karst-overview').hidden=!r.karst;$('karst-legend').hidden=!r.karst;$('geology-overview').hidden=!r.geology;$('geology-side').hidden=r.id!=='geo-bridge';$('geology-legend').hidden=!r.geology;$('sky-controls').hidden=!r.sky;$('sky-restore').hidden=!skyWeatherBefore;$('dryland-overview').hidden=!r.dryland;$('dryland-legend').hidden=!r.dryland;$('tropical-overview').hidden=!r.tropical;$('tropical-canopy').hidden=!r.tropical;$('tropical-legend').hidden=!r.tropical;$('tropical-canopy').setAttribute('aria-pressed',String(!!tropicalScene?.canopyOpen));$('tropical-canopy').textContent=tropicalScene?.canopyOpen?'合上林冠':'打开林冠';$('ocean-overview').hidden=!r.ocean;$('ocean-legend').hidden=!r.ocean;if(r.ocean){const h=terrainHeight(state.feet.x,state.feet.z);$('ocean-legend').textContent=`海面 0m · 床底 ${h.toFixed(1)}m · 水深 ${Math.max(0,-h).toFixed(1)}m · 紧凑地图创作尺度 · 教学观察/补光 · 金线为海面到海床`;} $('polar-night').hidden=!r.polar;$('polar-overview').hidden=!r.polar;$('polar-restore').hidden=!polarWeatherBefore;if(!r.production)productionUI?.open(false);if(!r.transport&&!r.production)transportUI?.open(false);$('transport-controls').hidden=!(r.transport||r.production);$('transport-overview').hidden=!r.transport;$('production-controls').hidden=!r.production;$('production-overview').hidden=!r.production;$('mountain-overview').hidden=!r.mountain;$('town-cutaway').hidden=!r.settlement;$('cave-cutaway').hidden=!(buildMode&&r.cave);$('marine-cutaway').hidden=!r.marine;$('marine-legend').hidden=!r.marine;$('road-return').textContent=r.warm||r.boreal||r.upland||r.yardang||r.volcanic||r.fan||r.strata||r.saline||r.karst||r.geology||r.dryland||r.tropical||r.ocean||r.marine?'回到观察点':waterMode?'回到水岸':'回到主路';$('plant-controls').hidden=!!(r.warm||r.boreal||r.upland||r.yardang||r.volcanic||r.fan||r.strata||r.saline||r.karst||r.geology||r.sky||r.dryland||r.tropical||r.ocean||r.polar||r.marine||buildMode&&r.cave);if(r.warm||r.boreal||r.upland||r.yardang||r.volcanic||r.fan||r.strata||r.saline||r.karst||r.geology||r.sky||r.dryland||r.tropical||r.ocean||r.cave||r.marine){$('vegetation-panel').hidden=true;$('plant-controls').setAttribute('aria-expanded','false');}$('large-chapter').textContent=`${String(state.index+1).padStart(2,'0')} / ${r.terrain} · ${r.name}`;$('large-title').textContent=r.name;$('large-narrative').textContent=r.lead;$('navigation-place').textContent=r.name;document.querySelectorAll('[data-large-stop]').forEach(b=>{const active=Number(b.dataset.largeStop)===state.index;b.classList.toggle('active',active);b.setAttribute('aria-current',String(active));});const node=$('large-stops').querySelector(`[data-large-stop="${state.index}"]`);$('large-stops').scrollTo({left:node.offsetLeft-$('large-stops').clientWidth/2+node.clientWidth/2,behavior:reduced?'instant':'smooth'});updateLesson(state.lesson,false);refreshVegetationUI();}
function setCaveInspection(value){state.caveOverview=value;tiles?.setCaveCutaway(value);caveScene?.setCutaway(value);$('cave-cutaway').setAttribute('aria-pressed',String(value));if(camera){camera.fov=value?(innerWidth<650?72:48):(innerWidth<650?72:64);camera.updateProjectionMatrix();}if(value)sceneStage(0);}
function setMarineInspection(value){state.marineOverview=value;$('marine-cutaway').setAttribute('aria-pressed',String(value));setLayer(state.stage);}
function setTownInspection(value){state.townOverview=value;settlementScene?.setCutaway(value);$('town-cutaway').setAttribute('aria-pressed',String(value));}
function enterWalk(){if(linkTour.kind!=='highland'&&(state.connectionSurvey||state.survey)){const v=safeView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=false;}state.connectionSurvey=false;linkTour.stop();if(state.travel&&buildMode&&(stops[state.index].warm||stops[state.index].boreal||stops[state.index].upland)&&state.survey){const v=constructionView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=false;state.underground=false;}if(state.travel&&buildMode&&stops[state.index].yardang&&state.survey){const v=constructionView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=false;state.underground=false;}if(state.travel&&buildMode&&stops[state.index].volcanic&&state.survey){const v=constructionView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=false;state.underground=false;}if(state.travel&&buildMode&&stops[state.index].fan&&state.survey){const v=constructionView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=false;state.underground=false;}if(state.travel&&buildMode&&stops[state.index].strata&&state.survey){const v=constructionView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=false;state.underground=false;}if(state.travel&&buildMode&&stops[state.index].saline&&state.survey){const v=constructionView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=false;state.underground=false;}if(state.shaftRide){state.auto=false;pressed.clear();status('升降中已暂停 · 可转向，点击继续导览恢复升降');return;}if(state.travel&&buildMode&&stops[state.index].karst&&state.survey){const v=constructionView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=false;state.underground=!!v.underground;state.karstOpen=!!v.open;}if(state.travel&&buildMode&&stops[state.index].geology&&state.survey){const v=constructionView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=false;state.underground=!!v.underground;lookAtPoint(v.targetX,v.targetY,v.targetZ,true);}if(buildMode&&stops[state.index].dryland&&state.survey){const v=constructionView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=false;state.underground=false;lookAtPoint(v.targetX,v.targetY,v.targetZ,true);}if(buildMode&&stops[state.index].tropical&&state.survey&&(!stops[state.index].canopy||tropicalWeight(state.feet.x,state.feet.z)<.9)){const v=constructionView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=!!v.survey;state.underground=false;lookAtPoint(v.targetX,v.targetY,v.targetZ,true);}if(state.travel&&buildMode&&stops[state.index].ocean&&oceanWeight(state.feet.x,state.feet.z)<.9){const v=constructionView(state.index);state.feet.set(v.x,v.y-LARGE_WORLD.eye,v.z);state.survey=true;state.underground=false;state.indoor=false;lookAtPoint(v.targetX,v.targetY,v.targetZ,true);}state.linkOverview=false;state.planOverview=false;state.warmOverview=false;state.borealOverview=false;state.uplandOverview=false;state.yardangOverview=false;state.volcanicOverview=false;state.fanOverview=false;state.strataOverview=false;state.saltOverview=false;state.karstOverview=false;state.geologyOverview=false;state.geologyBridgeView=false;state.drylandOverview=false;state.tropicalOverview=false;state.oceanOverview=false;state.polarOverview=false;transportUI?.setFollow(false);state.transportOverview=false;productionUI?.setFollow(false);state.productionOverview=false;if(state.riding){status('索道途中请留在车厢内 · 可暂停、转向，或回到站台');return;}climateUI?.stop();setTownInspection(false);setMarineInspection(false);setCaveInspection(false);setTownInspection(false);state.mountainOverview=false;$('mountain-overview').setAttribute('aria-pressed','false');state.overview=false;waterScene?.setOverview(false);$('water-overview').setAttribute('aria-pressed','false');state.auto=false;state.travel=null;state.phase='walk';pressed.clear();$('pause-expedition').hidden=true;$('begin-expedition').hidden=false;$('begin-expedition').textContent=state.finished?'重新走主线 →':state.index===0?(buildMode?'开始构建主线 →':vegetationMode?'开始植被主线 →':waterMode?'开始水系主线 →':'开始主线 →'):'从本站继续 →';$('walk-mode').setAttribute('aria-pressed','true');$('navigation-mode').textContent=buildMode&&stops[state.index].ocean?'海洋教学观察':'实地漫游';setLayer(fullStage());marker.visible=false;status('WASD / 方向键移动 · 拖动转向 · Shift 加速');}
function arrive(index,auto=false){linkTour.stop();state.shaftRide=false;state.linkOverview=false;state.planOverview=false;state.warmOverview=false;state.borealOverview=false;state.uplandOverview=false;state.yardangOverview=false;state.volcanicOverview=false;state.fanOverview=false;state.strataOverview=false;state.saltOverview=false;state.karstOverview=false;state.geologyOverview=false;state.geologyBridgeView=false;state.drylandOverview=false;state.tropicalOverview=false;state.oceanOverview=false;state.polarOverview=false;transportFlow.pause();transportUI?.setFollow(false);state.transportOverview=false;productionFlow.pause();productionUI?.setFollow(false);state.productionOverview=false;state.riding=false;state.travel=null;if(buildMode&&stops[index].mountain){state.cableT=index>=31?1:0;mountainScene?.moveCabin(state.cableT);}state.index=index;state.visited.add(index);state.phase=auto?'observe':'walk';state.auto=auto;state.time=0;state.lesson=(buildMode||vegetationMode)&&!auto?fullStage():0;state.roadT=routeT(index);const view=safeView(index);state.feet.set(view.x,view.y-LARGE_WORLD.eye,view.z);state.underground=!!view.underground;state.karstOpen=!!view.open;state.karstLayer=view.layer||'surface';if(view.karst)karstScene?.moveLift(view.layer==='lower'?-28:view.layer==='upper'?38:74);state.survey=!!view.survey;state.indoor=!!view.indoor;const nearby=nearestRoad(view.x,view.z,30);if(nearby&&!waterMode&&!buildMode)state.roadT=nearby.t;lookAtPoint(view.targetX,view.targetY,view.targetZ,true);updateStation();state.finished=false;$('begin-expedition').textContent=index===0?(buildMode?'开始构建主线 →':vegetationMode?'开始植被主线 →':waterMode?'开始水系主线 →':'开始主线 →'):'从本站继续 →';
 $('begin-expedition').hidden=auto;$('pause-expedition').hidden=!auto;$('pause-expedition').textContent='暂停导览 Ⅱ';$('walk-mode').setAttribute('aria-pressed',String(!auto));$('navigation-mode').textContent=auto?'主线驻足':'实地观察';if(auto){updateLesson(0,false);status('主线驻足 · 从人的高度逐层理解环境构建');}else status('已进入 '+stops[index].name+' · 拖动看四周，WASD移动');history.replaceState(null,'',`#${buildMode?'build':vegetationMode?'plants':waterMode?'water':'region'}-${index+1}`);
 tiles.update(state.feet,true);for(let i=0;i<4;i++)tiles.tick();updateForest(state.feet,state.overview);updateGrass(state.feet,true);}
async function warp(index){lifeRouteUI?.close();closeBenchmark();state.shaftRide=false;state.riding=false;enterWalk();$('large-fade').hidden=false;$('large-fade').classList.add('active');await new Promise(resolve=>setTimeout(resolve,reduced?0:220));arrive(index,false);await new Promise(resolve=>setTimeout(resolve,80));$('large-fade').classList.remove('active');await new Promise(resolve=>setTimeout(resolve,reduced?0:260));$('large-fade').hidden=true;}
function beginTour(){lifeRouteUI?.close();linkTour.stop();state.linkOverview=false;state.planOverview=false;state.warmOverview=false;state.borealOverview=false;state.uplandOverview=false;state.yardangOverview=false;state.volcanicOverview=false;state.fanOverview=false;state.strataOverview=false;state.saltOverview=false;state.karstOverview=false;state.geologyOverview=false;state.geologyBridgeView=false;state.drylandOverview=false;state.tropicalOverview=false;state.oceanOverview=false;state.polarOverview=false;transportFlow.pause();transportUI?.setFollow(false);state.transportOverview=false;productionFlow.pause();productionUI?.setFollow(false);state.productionOverview=false;if(state.riding||state.shaftRide){state.auto=true;return;}climateUI?.stop();setTownInspection(false);setMarineInspection(false);setCaveInspection(false);setTownInspection(false);state.mountainOverview=false;$('mountain-overview').setAttribute('aria-pressed','false');state.overview=false;waterScene?.setOverview(false);$('water-overview').setAttribute('aria-pressed','false');pressed.clear();setLayer(fullStage());$('pause-expedition').textContent='暂停导览 Ⅱ';if((buildMode||waterMode&&!vegetationMode)&&!state.finished&&Math.hypot(state.feet.x-stops[state.index].x,state.feet.z-stops[state.index].z)>2){arrive(state.index,true);return;}if(!state.finished&&Math.hypot(state.feet.x-stops[state.index].x,state.feet.z-stops[state.index].z)>100){travelTo(state.index);return;}if(state.finished){arrive(0,true);}else{state.auto=true;state.phase='observe';state.time=0;state.lesson=0;$('begin-expedition').hidden=true;$('pause-expedition').hidden=false;$('pause-expedition').textContent='暂停导览 Ⅱ';$('navigation-mode').textContent='主线驻足';$('walk-mode').setAttribute('aria-pressed','false');updateLesson(0,false);}status('沿主线导览 · 随时可暂停或切换实地漫游');}
function travelTo(index){linkTour.stop();state.linkOverview=false;state.planOverview=false;state.warmOverview=false;state.borealOverview=false;state.uplandOverview=false;state.yardangOverview=false;state.volcanicOverview=false;state.fanOverview=false;state.strataOverview=false;state.saltOverview=false;state.karstOverview=false;state.geologyOverview=false;state.geologyBridgeView=false;state.drylandOverview=false;state.tropicalOverview=false;state.oceanOverview=false;state.polarOverview=false;transportFlow.pause();transportUI?.setFollow(false);state.transportOverview=false;productionFlow.pause();productionUI?.setFollow(false);state.productionOverview=false;if(state.riding||state.shaftRide)return;const cableRide=buildMode&&((state.index===30&&index===31)||(state.index===31&&index===30));climateUI?.stop();setTownInspection(false);setMarineInspection(false);setCaveInspection(false);setTownInspection(false);state.mountainOverview=false;$('mountain-overview').setAttribute('aria-pressed','false');state.overview=false;waterScene?.setOverview(false);$('water-overview').setAttribute('aria-pressed','false');pressed.clear();state.auto=true;state.phase='travel';const from=state.roadT,to=routeT(index);let length=0,prev=roadSample(from);for(let i=1;i<=32;i++){const p=roadSample(from+(to-from)*i/32);length+=Math.hypot(p.x-prev.x,p.z-prev.z);prev=p;}state.travel={from,to,destination:index,time:0,duration:cableRide||buildMode&&state.index===79&&index===80?32:Math.max(7,Math.min(24,length/65)),start:state.feet.clone()};if(cableRide){state.riding=true;state.indoor=true;setLayer(fullStage());}state.index=index;updateStation();$('large-title').textContent='前往 '+stops[index].name;$('large-narrative').textContent=!buildMode&&!waterMode&&index===9?'最后一段越过海湾，去往远岛灯塔。小地图中的方向标会同步跟随我们的实际位置。':stops[Math.max(0,index-1)].next;$('begin-expedition').hidden=true;$('pause-expedition').hidden=false;$('pause-expedition').textContent='暂停导览 Ⅱ';$('navigation-mode').textContent=buildMode&&stops[index].ocean?(index===52?'教学镜头转场 · 非步行':'海洋教学观察 · 补光'):waterMode?'沿水岸导览':!buildMode&&index===9?'跨海导览':'沿路导览';$('walk-mode').setAttribute('aria-pressed','false');status(buildMode&&stops[index].tropical?'湿热教学主线 · 林冠采用高处镜头，其余站保留地面通路':buildMode&&stops[index].ocean?'海洋教学镜头 · 暂停可转向，切回实地观察将返回海洋观察点':cableRide?'索道乘坐 · 可暂停、拖动看窗外 · 到站后恢复步行':'沿路快速导览 · 按实地漫游可停下观察');}
function finish(){marker.visible=false;state.auto=false;state.phase='walk';state.travel=null;state.finished=true;$('large-title').textContent=buildMode?'从自然到生活，读懂同一个世界。':vegetationMode?'先有生长条件，再有完整群落。':waterMode?'从雪山与冰川，一路走到海床。':'从地面，重新理解整个世界。';$('large-narrative').textContent=buildMode?`当前主线共${stops.length}站、${stops.length*4}处讲解，串联自然地形、水域、群落、地下空间、聚落、交通及新增环境。已完成的是本轮观察路线，真实环境过程与游戏内容仍需按进度清单继续补全。`:vegetationMode?'从高山短草、溪岸林灌到湿地水生植物和滨岸群落：地形、地表与水域决定适合放什么；乔木、灌木、地被、水生四层共同组织场景。可继续分层对照，或切回水系主线。':waterMode?'从雪山、冰川、冰湖与融水溪流，进入原源头池、跌水、河谷、苇泽、河口和海湾，再沿礁岸、潮间带进入浅海与海床：高程决定水路，水路改变岸线与场景。可以继续漫游，或逐层查看这条水系的构建方式。':'沿途的港口、原野、峡谷与群山，共同构成一个可以进入的空间。导航图帮助我们定位，真实的观看发生在道路、地面与建筑之间。';$('begin-expedition').hidden=false;$('begin-expedition').textContent='重新走主线 →';$('pause-expedition').hidden=true;$('navigation-mode').textContent=buildMode?'构建完成':waterMode?'抵达海床':'抵达灯塔';$('walk-mode').setAttribute('aria-pressed','true');status('主线结束 · 可继续实地漫游，或打开构建总览');}
function groundStep(from,x,z){
 const p=moveInWorld(from,x,z);
 return p&&(p.underground||!blockedAt(x,z)&&!marineScene?.blockedAt(x,z))?p:null;
}
function setFeet(p){
 state.feet.set(p.x,p.y,p.z);state.underground=p.underground;
 state.karstOpen=!!p.open;state.karstLayer=p.layer||'surface';state.survey=!!p.survey;state.indoor=!!p.indoor;
}
function placeOnFoot(point,look,anchor=0){
 if(state.riding||state.shaftRide){status('请先抵达站台，再进入地面步行');return false;}
 const p={...point,y:walkingSurface(point.x,point.z),underground:false};
 if(!groundStep(p,p.x,p.z)){status('步行入口有阻挡，请从地图选择另一段');return false;}
 if(worldPlan?.active)worldPlan.close();
 if(!buildMode)switchRoute('build');
 arrive(anchor);enterWalk();setFeet(p);
 lookAtPoint(look.x,walkingSurface(look.x,look.z)+LARGE_WORLD.eye,look.z,true);
 return true;
}
function syncExpeditionUrl(change){
 const url=new URL(location.href);
 change(url);
 if(url.href!==location.href)history.replaceState(history.state,'',url);
}
function getResumeSearch(){
 const chapter=mainlineReturn?.index??(mainlineUI?.active?mainlineUI.index:null);
 const epoch=mainlineReturn?.epoch??benchmarkTime?.frame.id??'now';
 if(chapter!==null)return {walk:'snow-to-deep',station:mainlineLessons[chapter].id,epoch};
 if(benchmarkUI?.active)return {walk:'snow-to-bay',epoch,at:benchmarkWalk.distance.toFixed(2)};
 if(worldPlan?.active){
  const params=new URLSearchParams(location.search);
  return params.has('plan')?params:{plan:'map'};
 }
 if(lifeRouteUI?.active)return {walk:'valley-life',stop:lifeRouteUI.station};
 return '';
}
function openLifeRoute(index=0){
 if(state.riding||state.shaftRide){status('请先抵达站台，再进入生活线');return false;}
 if(worldPlan?.active)worldPlan.close();
 closeBenchmark();climateUI?.open(false);
 transportFlow.pause();productionFlow.pause();transportUI?.open(false);productionUI?.open(false);
 $('vegetation-panel').hidden=true;
 return lifeRouteUI.open(index);
}
function updateLifeRoute(dt){
 if(!lifeRouteUI?.active)return;
 if(state.phase!=='walk'||overviewMode(state,linkTour.kind)||$('large-notes-dialog').open||
    !$('help-panel').hidden||progressPanel?.dialog.open){lifeRouteUI.pause();return;}
 lifeRouteUI.tick(LARGE_WORLD.runSpeed*2*dt);
}
function renderBenchmark(at=benchmarkWalk.distance){
 mainlineUI?.renderCoastal(mainlineSeaFrame?.coastal,coastalFogCase);
 if(mainlineSeaFrame){benchmarkUI.renderSea(mainlineSeaFrame);return;}
 const {x,z}=state.feet;
 benchmarkUI.render(benchmarkWalk,{at,x,z,air:benchmarkAir,site:benchmarkTime?.navigation.inspect(x,z)});
}
function placeBenchmark(x,z,at){
 const navigation=benchmarkTime?.navigation;
 const site=navigation?.inspect(x,z),ground={x,z,y:walkingSurface(x,z),underground:false};
 benchmarkAir=site?!!site.reason||benchmarkRunAt(benchmarkPassage(),at).method==='air':!groundStep(ground,x,z);
 const y=site?.y??ground.y;
 setFeet({x,z,y:benchmarkAir?(site?.top??Math.max(0,y))+55:y,underground:false});
 $('navigation-mode').textContent=benchmarkAir?'雪岭到海湾 · 航拍':benchmarkTime?'雪岭到海湾 · 当期地面':'雪岭到海湾 · 连续步行';
}
function lookOnBenchmark(at,instant=false){
 const navigation=benchmarkTime?.navigation;
 if(benchmarkAir&&navigation&&(instant||benchmarkWalk.done)){
  const {x,z}=state.feet;
  if(navigation.inspect(x,z).reason==='sea'){
   const shore=navigation.shoreView(x,z);
   if(shore){lookAtPoint(shore.x,shore.y,shore.z,instant);return;}
  }
 }
 if(benchmarkWalk.done){
  const bay=benchmarkTime?.frame.mouths.central??riverSample(.88);
  lookAtPoint(bay.x,bay.level+.6,bay.z,instant);
  return;
 }
 const look=benchmarkPoint(at+(benchmarkAir?54:7.5));
 const y=benchmarkTime?.navigation.inspect(look.x,look.z).top??benchmarkDeck(look.at);
 lookAtPoint(look.x,y+(benchmarkAir?0:LARGE_WORLD.eye),look.z,instant);
}
function moveBenchmarkPoint(at){
 stopMainlineTravel();leaveMainlineSea();
 const p=benchmarkPoint(at);
 benchmarkWalk.reset(p.at);pressed.clear();
 placeBenchmark(p.x,p.z,p.at);
 lookOnBenchmark(p.at,true);
 renderBenchmark();
}
function changeBenchmarkTime(id){
 if(!Object.hasOwn(epochs,id)||!benchmarkUI.active)return;
 if(mainlineSeaFrame)moveBenchmarkPoint(benchmarkLength);
 const {x,z}=state.feet;
 const at=benchmarkNear(x,z,12)??benchmarkWalk.distance;
 const wasAir=benchmarkAir;
 stopMainlineTravel();
 benchmarkWalk.reset(at);pressed.clear();
 if(id==='now'){
  if(benchmarkTime)timelineScene.hide();
  benchmarkTime=null;benchmarkTrace.hide();
 }else{
  const frame=timelineScene.show(id,false,'water');
  const navigation=createBenchmarkTimeNavigation(frame,timelineScene.water);
  const passage=surveyBenchmarkTime(navigation);
  benchmarkTime={frame,navigation,passage};
  benchmarkTrace.show(passage,navigation);
 }
 placeBenchmark(x,z,at);
 if(wasAir!==benchmarkAir)lookOnBenchmark(at,true);
 benchmarkUI.setPeriod(id,benchmarkPassage());
 mainlineUI?.setEpoch(id);
 renderBenchmark();
}
function resetBenchmark(){
 lifeRouteUI?.close();
 if(benchmarkUI?.active){moveBenchmarkPoint(0);return true;}
 if(!placeOnFoot(benchmarkPoint(0),benchmarkPoint(8),constructionStops.findIndex(stop=>stop.id==='ice-snow')))return false;
 benchmarkAir=false;benchmarkUI.display(true);
 benchmarkUI.setMode('explore');
 benchmarkUI.setPeriod('now',modernPassage);
 moveBenchmarkPoint(0);
 return true;
}
function closeBenchmark(){
 if(!benchmarkUI?.active)return;
 stopMainlineTravel();mainlineUI?.hide();benchmarkWalk.pause();
 if(mainlineSeaFrame)moveBenchmarkPoint(benchmarkLength);
 if(benchmarkTime){
  changeBenchmarkTime('now');
  if(benchmarkAir)moveBenchmarkPoint(0);
 }
 benchmarkAir=false;
 benchmarkUI.display(false);
 $('navigation-place').textContent=stops[state.index].name;
}
function leaveMainlineSea(){
 if(!mainlineSeaFrame)return;
 mainlineSeaFrame=null;state.mainlineSea=false;
 mainlineSeaScene.hide();coastalFogScene.hide();
}
function showMainlineSea(at){
 if(!mainlineSeaFrame){
  state.mainlineSea=true;
  benchmarkWalk.reset(benchmarkLength);
  pressed.clear();
 }
 mainlineSeaFrame=seaFrame(at);
 const {p,mode}=mainlineSeaFrame;
 if(mode==='沿岸航行'&&isCoastalFogZone(p.x,p.z)){
  const field=buildCoastalFog(coastalFogCase.sea,coastalFogCase.wind);
  const location=readCoastalFog(field,p.x,p.z);
  if(location){
   const shore=readCoastalFog(field,shoreFogSite.x,shoreFogSite.z);
   const outer=readCoastalFog(field,outerFogSite.x,outerFogSite.z);
   mainlineSeaFrame.coastal={...location,shoreMist:shore.mist,outerMist:outer.mist};
  }
 }
 setFeet({x:p.x,y:p.y-LARGE_WORLD.eye,z:p.z,underground:false});
 $('navigation-mode').textContent=mode+' · 雪岭到深海';
 renderBenchmark();
}
function locateMainline(lesson){
 if(lesson.seaAt===undefined){moveBenchmarkPoint(lesson.at);aimMainline(lesson);return;}
 stopMainlineTravel();
 if(benchmarkTime)changeBenchmarkTime('now');
 showMainlineSea(lesson.seaAt);
}
function aimMainline(lesson){
 const target=upstreamWatershedStops[lesson.stop];
 if(!benchmarkTime&&target)lookAtPoint(target.targetX,target.targetY,target.targetZ,true);
}
function stopMainlineTravel(){
 if(!mainlineTravel)return;
 const travel=mainlineTravel;
 mainlineTravel=null;benchmarkWalk.pause();travel.cancel();renderBenchmark();
}
function travelMainline(from,next,arrive,cancel){
 if(!benchmarkUI.active||state.phase!=='walk'||state.overview||state.planOverview)return false;
 if(next.seaAt!==undefined){
  coastalFogCase={...coastalFogCase,overview:false};
  if(benchmarkTime)changeBenchmarkTime('now');
  const start=from.seaAt??0,at=mainlineSeaFrame?.p.at??start;
  if(!mainlineSeaFrame||at<start-.01||at>=next.seaAt-.01)showMainlineSea(start);
  mainlineTravel={next,arrive,cancel};
  return true;
 }
 const point=benchmarkPoint(benchmarkWalk.distance);
 const away=Math.hypot(state.feet.x-point.x,state.feet.z-point.z)>.40;
 if(away||benchmarkWalk.distance<from.at-.05||benchmarkWalk.distance>=next.at-.01)moveBenchmarkPoint(from.at);
 benchmarkWalk.obstacle=null;
 mainlineTravel={next,arrive,cancel};
 benchmarkWalk.playing=true;
 $('landscape').focus({preventScroll:true});
 renderBenchmark();
 return true;
}
function selectBenchmarkMode(mode,index){
 if(mode==='mainline'&&mainlineUI?.active&&index===undefined)return;
 stopMainlineTravel();benchmarkWalk.pause();
 benchmarkUI.setMode(mode);
 if(mode==='explore'){
  mainlineUI.hide();
  if(mainlineSeaFrame)moveBenchmarkPoint(benchmarkLength);else renderBenchmark();
 }else{
  const station=mainlineLessons.findLastIndex(lesson=>lesson.at<=benchmarkWalk.distance+.05);
  mainlineUI.show(index??Math.max(0,station));
 }
}
function openMainlineStudy(plan,index,epoch){
 mainlineReturn={index,epoch};
 worldPlan.open(plan);
 $('benchmark-controls').textContent='返回主线讲解';
}
function restoreMainline(){
 if(!mainlineReturn)return;
 const {index,epoch}=mainlineReturn;
 mainlineReturn=null;
 $('benchmark-controls').textContent='雪岭到深海';
 if(!resetBenchmark())return;
 selectBenchmarkMode('mainline',index);
 if(epoch!=='now')changeBenchmarkTime(epoch);
}
function updateRidgeBayUrl(reading){
 if(!mainlineReturn)syncExpeditionUrl(url=>setRidgeBayQuery(url,reading));
}
function walkRidgeBayStation(station){
 const index=mainlineLessons.findIndex(lesson=>lesson.id===station);
 if(index<0)return;
 mainlineReturn={index,epoch:'now'};
 worldPlan.close();
 if(!mainlineUI.active)return;
 syncExpeditionUrl(url=>{
  url.searchParams.delete('epoch');
  url.searchParams.delete('at');
  url.searchParams.delete('guide');
  url.searchParams.set('walk','snow-to-deep');
  url.searchParams.set('station',station);
 });
}
function toggleBenchmarkGuide(){
 if(benchmarkWalk.playing){benchmarkWalk.pause();renderBenchmark();return;}
 const current=benchmarkPoint(benchmarkWalk.distance);
 if(benchmarkWalk.done||benchmarkWalk.obstacle)moveBenchmarkPoint(0);
 else if(Math.hypot(state.feet.x-current.x,state.feet.z-current.z)>.40)moveBenchmarkPoint(benchmarkWalk.distance);
 benchmarkWalk.playing=true;
 $('landscape').focus({preventScroll:true});
 renderBenchmark();
}
function updateBenchmark(dt){
 if(mainlineSeaFrame&&mainlineTravel){
  const {next,arrive}=mainlineTravel,at=mainlineSeaFrame.p.at;
  const advance=Math.min(next.seaAt,at+seaPace(at)*dt);
  showMainlineSea(advance);
  if(advance===next.seaAt){mainlineTravel=null;arrive();}
  return;
 }
 if(!benchmarkWalk.playing)return;
 if(state.phase!=='walk'||state.planOverview||state.overview||state.riding){stopMainlineTravel();benchmarkWalk.pause();renderBenchmark();return;}
 const remaining=mainlineTravel?Math.max(0,mainlineTravel.next.at-benchmarkWalk.distance):Infinity;
 const pace=mainlineTravel?5:benchmarkTime?6:9;
 benchmarkWalk.advance(Math.min(remaining,LARGE_WORLD.runSpeed*pace*dt),target=>{
  const navigation=benchmarkTime?.navigation;
  if(navigation){
   if(benchmarkRunAt(benchmarkPassage(),target.at).method==='air'){
    const site=navigation.inspect(target.x,target.z);
    setFeet({...target,y:site.top+55,underground:false});
    benchmarkAir=true;
    return true;
   }
   const from=benchmarkAir?target:state.feet,p=navigation.step(from,target.x,target.z);
   if(!p)return false;
   setFeet(p);benchmarkAir=false;
   return true;
  }
  const p=groundStep(state.feet,target.x,target.z);
  if(!p||p.underground||p.indoor||p.survey)return false;
  setFeet(p);benchmarkAir=false;
  return true;
 });
 $('navigation-mode').textContent=benchmarkAir?'雪岭到海湾 · 航拍':benchmarkTime?'雪岭到海湾 · 当期地面':'雪岭到海湾 · 连续步行';
 lookOnBenchmark(benchmarkWalk.distance);
 if(mainlineTravel&&Math.abs(mainlineTravel.next.at-benchmarkWalk.distance)<.001){
  const {next,arrive}=mainlineTravel;
  mainlineTravel=null;benchmarkWalk.pause();aimMainline(next);arrive();
 }else if(benchmarkWalk.obstacle)stopMainlineTravel();
 renderBenchmark();
}
function stepBenchmarkTime(forward,right,distance){
 if(benchmarkAir)return false;
 const x=state.feet.x+(Math.sin(state.yaw)*forward+Math.cos(state.yaw)*right)*distance;
 const z=state.feet.z+(-Math.cos(state.yaw)*forward+Math.sin(state.yaw)*right)*distance;
 const at=benchmarkNear(x,z,12);
 const p=at===null||benchmarkRunAt(benchmarkPassage(),at).method==='air'?null:benchmarkTime.navigation.step(state.feet,x,z);
 if(p){setFeet(p);benchmarkWalk.reset(at);}
 renderBenchmark();
 return !!p;
}
function attemptMove(forward,right,distance){
 if(mainlineSeaFrame)return false;
 stopMainlineTravel();benchmarkWalk.pause();if(benchmarkTime)return stepBenchmarkTime(forward,right,distance);if(benchmarkUI?.active&&benchmarkAir)return false;if(state.shaftRide){status('升降途中请留在平台内 · 暂停后可拖动转向');return false;}if(buildMode&&(stops[state.index].warm||stops[state.index].boreal||stops[state.index].upland||stops[state.index].yardang||stops[state.index].volcanic||stops[state.index].fan||stops[state.index].strata||stops[state.index].saline||stops[state.index].karst||stops[state.index].geology||stops[state.index].dryland||stops[state.index].tropical||stops[state.index].ocean||stops[state.index].polar)&&state.stage<fullStage())enterWalk();if(state.riding){status('索道途中可拖动看风景 · 抵达站台后恢复步行');return false;}if(climateUI?.running)climateUI.stop({notify:true});if(state.linkOverview||state.warmOverview||state.borealOverview||state.uplandOverview||state.yardangOverview||state.volcanicOverview||state.fanOverview||state.strataOverview||state.saltOverview||state.karstOverview||state.geologyOverview||state.geologyBridgeView||state.drylandOverview||state.tropicalOverview||state.oceanOverview||state.polarOverview||state.transportFollowing||state.transportOverview||state.productionFollowing||state.productionOverview||state.mountainOverview||state.overview||state.caveOverview||state.marineOverview||state.townOverview||state.auto||state.travel||state.phase!=='walk')enterWalk();const dx=(Math.sin(state.yaw)*forward+Math.cos(state.yaw)*right)*distance,dz=(-Math.cos(state.yaw)*forward+Math.sin(state.yaw)*right)*distance;
 const step=(x,z)=>{const from={x:state.feet.x,z:state.feet.z,y:state.feet.y,underground:state.underground},p=state.survey?(tropicalWeight(from.x,from.z)>.9?tropicalMove(from,x,z):oceanWeight(from.x,from.z)>.9?oceanMove(from,x,z):marineMove(from,x,z,(x,z)=>marineScene.blockedAt(x,z))):groundStep(from,x,z);if(!p)return false;setFeet(p);return true;};
 let moved=step(state.feet.x+dx,state.feet.z+dz);if(!moved){moved=step(state.feet.x+dx,state.feet.z)||moved;moved=step(state.feet.x,state.feet.z+dz)||moved;}
 lifeRouteUI?.manual();
 if(benchmarkUI?.active){
  const at=benchmarkNear(state.feet.x,state.feet.z,8);
  if(moved&&at!==null)benchmarkWalk.reset(at);
  renderBenchmark();
 }
 if(moved){const nearest=nearestRoad(state.feet.x,state.feet.z,14);if(nearest&&!waterMode&&!buildMode)state.roadT=nearest.t;status(state.indoor?'室内步行 · 通过实际门洞返回街道，墙体、隔墙和家具限制通行':state.survey?'沿海床观察 · 方向键移动，拖动转向；回到观察点可返回本站':state.underground?'地下漫游 · 洞顶、洞壁、岩体与深水限制通行':'实地漫游 · 拖动转向，Shift加速');}else status(state.survey?'前方为岩块、陡坎或观察区边界 · 可回到观察点':state.underground?'前方为洞壁、岩体、陡坎或深水 · 沿干地通道前行':'前方为水域、陡坡或物件 · 沿道路行进，或回到主路');return moved;}

function showNotes(){state.auto=false;pressed.clear();$('pause-expedition').textContent='继续导览 ▷';$('large-notes-list').innerHTML=stops.map((r,index)=>`<article><button data-note-region="${index}">${String(index+1).padStart(2,'0')} · ${r.name} ↗</button>${allStages().map(stage=>{const p=observationFor(index,stage);return `<p class="${state.notes.has(p.id)?'recorded':''}">${state.notes.has(p.id)?'✓':'○'} ${p.title}</p>`;}).join('')}</article>`).join('');$('large-notes-dialog').showModal();}
function wireUI(){
 $('station-soil').addEventListener('click',()=>worldPlan?.open({soilMode:true,soilFocus:sedimentFocus(stops[state.index])}));
 $('station-sediment').addEventListener('click',()=>worldPlan?.open({sedimentMode:true,sedimentFocus:sedimentFocus(stops[state.index])}));
 $('station-formation').addEventListener('click',()=>worldPlan?.open({logic:true}));
 $('warm-overview').addEventListener('click',()=>{const open=!state.warmOverview;enterWalk();state.warmOverview=open;status(open?'同一横断面 · 竹林、季风林与海岸沙丘':'已返回原竹林季风林沙丘观察点');});
 $('boreal-overview').addEventListener('click',()=>{const open=!state.borealOverview;enterWalk();state.borealOverview=open;status(open?'同一林地 · 针叶、混交、白桦与倒木':'已返回原森林群落观察点');});
 $('upland-overview').addEventListener('click',()=>{const open=!state.uplandOverview;enterWalk();state.uplandOverview=open;status(open?'同一高地 · 草甸、泥炭浅洼、塘群与溪流':'已返回原高原湿地观察点');});
 $('yardang-overview').addEventListener('click',()=>{const open=!state.yardangOverview;enterWalk();state.yardangOverview=open;status(open?'同一干旱区域 · 雅丹残丘、开放通槽、石漠与砾台':'已返回原风蚀观察点');});
 $('volcanic-overview').addEventListener('click',()=>{const open=!state.volcanicOverview;enterWalk();state.volcanicOverview=open;status(open?'原火山区东侧 · 次级火口、流槽、冷岩台地与柱群':'已返回原火山观察点');});
 $('fan-overview').addEventListener('click',()=>{const open=!state.fanOverview;enterWalk();state.fanOverview=open;status(open?'同一扇面 · 山口、辫流、沙砾洲与洪泛地':'已返回原冲积扇观察点');});document.querySelectorAll('[data-fan-water]').forEach(b=>b.addEventListener('click',()=>{enterWalk();fanScene.setFlood(b.dataset.fanWater);tiles.refreshFanWater();$('fan-water-state').textContent=getFanFlood()?'涨水参考：比常水位抬高1.1m':'常水参考：局部水段40m至18m';document.querySelectorAll('[data-fan-water]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));status('同一扇面与洲地 · 水位参考改变淹没范围，不模拟洪水演算');}));
 $('strata-overview').addEventListener('click',()=>{const open=!state.strataOverview;enterWalk();state.strataOverview=open;status(open?'同一岩层区 · 岩壁、穿层矿脉、台塬与多级阶地':'已返回原岩层观察点');});
 $('salt-overview').addEventListener('click',()=>{const open=!state.saltOverview;enterWalk();state.saltOverview=open;status(open?'同一封闭盆地 · 盐湖、浅洼、盐壳与干盆':'已返回原盐地观察位置');});document.querySelectorAll('[data-salt-water]').forEach(b=>b.addEventListener('click',()=>{enterWalk();saltScene.setWaterLevel(b.dataset.saltWater);tiles.refreshSaltWater();$('salt-water-state').textContent=getSaltWaterLevel()===24?'高水位参考：盐湖24m / 盐沼23.5m':'退水参考：盐湖22m / 盐沼21.5m';document.querySelectorAll('[data-salt-water]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));status('同一床底 · 水面与岸线已按实际地形更新；非自然水循环模拟');}));
 $('karst-overview').addEventListener('click',()=>{if(state.shaftRide)return;const open=!state.karstOverview;enterWalk();state.karstOverview=open;setLayer(state.stage);status(state.karstOverview?'垂直剖视 · 按上层/下层按钮对照独立洞廊':'已返回原层位观察点');});
 document.querySelectorAll('[data-karst-section]').forEach(b=>b.addEventListener('click',()=>{if(state.shaftRide)return;enterWalk();state.karstSection=b.dataset.karstSection;state.karstOverview=true;state.auto=false;state.travel=null;state.phase='walk';setLayer(state.stage);}));
 document.querySelectorAll('[data-karst-level]').forEach(b=>b.addEventListener('click',()=>{if(state.shaftRide||Math.hypot(state.feet.x-630,state.feet.z+1250)>2.9||Math.abs(state.feet.y-getKarstLiftLevel())>.5){status('请从当前洞层原路回到中央升降平台，再选择层位');return;}const to=Number(b.dataset.karstLevel);if(Math.abs(to-state.feet.y)<.1)return;enterWalk();state.linkOverview=false;state.planOverview=false;state.warmOverview=false;state.borealOverview=false;state.uplandOverview=false;state.yardangOverview=false;state.volcanicOverview=false;state.fanOverview=false;state.strataOverview=false;state.saltOverview=false;state.karstOverview=false;setLayer(fullStage());state.travel={fromLevel:state.feet.y,toLevel:to,time:0,duration:8};state.phase='shaft';state.shaftRide=true;state.auto=true;pressed.clear();$('begin-expedition').hidden=true;$('pause-expedition').hidden=false;$('pause-expedition').textContent='暂停升降 Ⅱ';}));

 $('geology-overview').addEventListener('click',()=>{climateUI?.stop();state.auto=false;state.travel=null;state.phase='walk';pressed.clear();state.overview=false;state.geologyBridgeView=false;state.geologyOverview=!state.geologyOverview;$('water-overview').setAttribute('aria-pressed','false');waterScene?.setOverview(false);setLayer(state.stage);status(state.geologyOverview?'地质剖视 · 移开同一岩体上方地表与洞顶，查看实际空腔和回环':'已返回原地质观察位置');});$('geology-side').addEventListener('click',()=>{state.auto=false;state.travel=null;state.phase='walk';pressed.clear();state.overview=false;state.linkOverview=false;state.planOverview=false;state.warmOverview=false;state.borealOverview=false;state.uplandOverview=false;state.yardangOverview=false;state.volcanicOverview=false;state.fanOverview=false;state.strataOverview=false;state.saltOverview=false;state.karstOverview=false;state.geologyOverview=false;state.geologyBridgeView=!state.geologyBridgeView;$('water-overview').setAttribute('aria-pressed','false');waterScene?.setOverview(false);setLayer(state.stage);status(state.geologyBridgeView?'固定侧看镜头 · 桥顶、拱腹与下面的实际沟谷':'已返回岩桥岸上观察点');});
 document.querySelectorAll('[data-sky-preset]').forEach(b=>b.addEventListener('click',()=>{enterWalk();if(!skyWeatherBefore)skyWeatherBefore=climateUI.settings;climateUI.applyPreset(SKY_PRESETS[Number(b.dataset.skyPreset)]);$('sky-restore').hidden=false;status('同一观察位置 · '+SKY_PRESETS[Number(b.dataset.skyPreset)].name);}));$('sky-restore').addEventListener('click',()=>{if(!skyWeatherBefore)return;state.auto=false;state.travel=null;state.phase='walk';pressed.clear();$('begin-expedition').hidden=false;$('pause-expedition').hidden=true;const saved=skyWeatherBefore;skyWeatherBefore=null;climateUI.applyPreset(saved);$('sky-restore').hidden=true;status('已恢复进入天空主线前的时间、天气与季节');});$('sky-flashes').addEventListener('click',()=>{specialScene.setFlashes(!specialScene.flashesEnabled);$('sky-flashes').setAttribute('aria-pressed',String(specialScene.flashesEnabled));$('sky-flashes').textContent=specialScene.flashesEnabled?'关闭闪电':'开启闪电';});
 $('sky-atmosphere').addEventListener('click',()=>{
  const skyStop=stops[state.index].id;
  const station=skyStop==='sky-storm'?'tornado':skyStop==='sky-dust'?'mirage':'rainbow';
  worldPlan.open({atmosphereStudy:{station}});
 });
 $('dryland-overview').addEventListener('click',()=>{climateUI?.stop();state.auto=false;state.travel=null;state.phase='walk';pressed.clear();state.overview=false;state.drylandOverview=!state.drylandOverview;waterScene?.setOverview(false);status(state.drylandOverview?'同一南部区域 · 草原、疏林、戈壁、干谷与绿洲':'已返回原干湿观察位置');});
 $('tropical-canopy').addEventListener('click',()=>{tropicalScene.toggleCanopy();updateStation();});$('tropical-overview').addEventListener('click',()=>{climateUI?.stop();state.auto=false;state.travel=null;state.phase='walk';pressed.clear();state.overview=false;state.tropicalOverview=!state.tropicalOverview;waterScene?.setOverview(false);status(state.tropicalOverview?'同一湿热区域 · 高林地、淡水河、潮沟与红树林':'已返回原湿热观察位置');});
 $('ocean-overview').addEventListener('click',()=>{climateUI?.stop();waterScene?.setOverview(false);$('water-overview').setAttribute('aria-pressed','false');marker.visible=false;transportFlow.pause();productionFlow.pause();transportUI?.setFollow(false);productionUI?.setFollow(false);state.auto=false;state.travel=null;state.phase='walk';state.overview=false;state.oceanOverview=!state.oceanOverview;pressed.clear();setLayer(state.stage);$('navigation-mode').textContent=state.oceanOverview?'海洋剖视':'海洋教学观察';status(state.oceanOverview?'移开同一海面 · 群岛、架面、陡坡与海沟共用真实床底 · 再点返回':'已返回原海洋观察位置');});
 $('polar-night').addEventListener('click',showPolarNight);$('polar-restore').addEventListener('click',()=>{if(polarWeatherBefore){const saved=polarWeatherBefore;polarWeatherBefore=null;climateUI.edit(saved);$('polar-restore').hidden=true;status('已恢复进入极光夜景前的天气与时刻');}});$('polar-overview').addEventListener('click',()=>{transportFlow.pause();productionFlow.pause();transportUI?.setFollow(false);productionUI?.setFollow(false);state.auto=false;state.travel=null;state.phase='walk';state.polarOverview=!state.polarOverview;pressed.clear();status(state.polarOverview?'同一北部区域 · 海岸、浮冰、冰盖与苔原':'已返回原极地观察位置');});
 $('transport-overview').addEventListener('click',()=>{transportFlow.pause();transportUI?.setFollow(false);productionFlow.pause();productionUI?.setFollow(false);state.auto=false;state.travel=null;state.phase='walk';state.productionOverview=false;state.transportOverview=!state.transportOverview;if(state.transportOverview)transportUI?.open(false);pressed.clear();status(state.transportOverview?'同一河湾 · 道路、木桥、码头、转运场与公共设施':'已返回交通观察点');});
 $('production-overview').addEventListener('click',()=>{transportFlow.pause();transportUI?.setFollow(false);state.transportOverview=false;productionFlow.pause();productionUI?.setFollow(false);state.auto=false;state.travel=null;state.phase='walk';state.productionOverview=!state.productionOverview;if(state.productionOverview)productionUI?.open(false);pressed.clear();$('production-overview').setAttribute('aria-pressed',String(state.productionOverview));status(state.productionOverview?'同一张地图 · 林地、农田与河湾经村路汇入仓储、市场、作坊和住宅':'已返回生产生活观察点');});
 $('mountain-overview').addEventListener('click',()=>{state.mountainOverview=!state.mountainOverview;state.auto=false;pressed.clear();$('mountain-overview').setAttribute('aria-pressed',String(state.mountainOverview));$('navigation-mode').textContent=state.mountainOverview?'高山全貌':'实地观察';status(state.mountainOverview?'同一座山体 · 山路折返、峡谷跨越与索道爬升 · 再点返回':'已返回原观察位置');});
 $('cable-ride').addEventListener('click',()=>{if(state.riding){state.auto=!state.auto;return;}if(!buildMode||![30,31].includes(state.index))return;const target=state.index===30?31:30;const dock=stops[state.index];if(Math.hypot(state.feet.x-dock.x,state.feet.z-dock.z)>7){status('请先回到索道站台，再乘坐车厢');return;}state.roadT=routeT(state.index);travelTo(target);state.travel.manualRide=true;});

 buildStops();$('weather-controls').addEventListener('click',()=>{productionUI?.open(false);transportUI?.open(false);});$('plant-controls').addEventListener('click',()=>{productionUI?.open(false);transportUI?.open(false);const open=$('vegetation-panel').hidden;$('vegetation-panel').hidden=!open;$('plant-controls').setAttribute('aria-expanded',String(open));refreshVegetationUI();});$('close-vegetation').addEventListener('click',()=>{$('vegetation-panel').hidden=true;$('plant-controls').setAttribute('aria-expanded','false');});
 document.querySelectorAll('[data-plant-layer]').forEach(b=>b.addEventListener('click',()=>{state.auto=false;state.travel=null;state.phase='walk';$('pause-expedition').textContent='继续导览 ▷';$('walk-mode').setAttribute('aria-pressed','true');$('navigation-mode').textContent='植被对照';const k=b.dataset.plantLayer;vegetationScene.setLayer(k,!vegetationScene.layers[k]);updateForest(state.feet,state.overview);refreshVegetationUI();status('植被分层对照 · 可分别开关乔木、灌木、地被和水生层');}));$('show-habitats').addEventListener('click',()=>{state.auto=false;$('pause-expedition').textContent='继续导览 ▷';setConditions(!conditionOn);});
 $('habitat-legend').innerHTML=Object.values(habitats).map(h=>`<span><i style="background:${h.color}"></i>${h.name}</span>`).join('');
 $('town-cutaway').addEventListener('click',()=>{climateUI?.stop();state.auto=false;state.travel=null;state.phase='walk';pressed.clear();state.overview=false;setCaveInspection(false);setMarineInspection(false);setTownInspection(!state.townOverview);$('navigation-mode').textContent=state.townOverview?'室内剖视':'实地观察';status(state.townOverview?'移开工坊屋顶与临街前墙 · 同一建筑、门洞与家具 · 再点返回':'已返回原观察位置');});
 $('marine-cutaway').addEventListener('click',()=>{state.auto=false;state.travel=null;state.phase='walk';$('pause-expedition').textContent='继续导览 ▷';pressed.clear();state.mountainOverview=false;$('mountain-overview').setAttribute('aria-pressed','false');state.overview=false;waterScene?.setOverview(false);$('water-overview').setAttribute('aria-pressed','false');setMarineInspection(!state.marineOverview);$('navigation-mode').textContent=state.oceanOverview?'海洋剖视 · 同一海面0m与真实海床 · 约370m压缩深度':state.marineOverview?'海床剖视':'实地观察';status(state.marineOverview?'暂时移开同一海面 · 岸线、滩台、陆架与海床仍为实际地形 · 再点返回':'已返回原观察位置');});
 $('cave-cutaway').addEventListener('click',()=>{state.auto=false;state.travel=null;pressed.clear();state.mountainOverview=false;$('mountain-overview').setAttribute('aria-pressed','false');state.overview=false;waterScene?.setOverview(false);$('water-overview').setAttribute('aria-pressed','false');setCaveInspection(!state.caveOverview);if(!state.caveOverview)setLayer(state.stage);$('navigation-mode').textContent=state.caveOverview?'地下剖视':'实地观察';status(state.caveOverview?'同一洞体剖视 · 暂时移开上方地表、洞顶和近侧洞壁 · 再点返回':'已返回原观察位置');});
 $('water-overview').addEventListener('click',()=>{state.linkOverview=false;state.planOverview=false;state.warmOverview=false;state.borealOverview=false;state.uplandOverview=false;state.yardangOverview=false;state.volcanicOverview=false;state.fanOverview=false;state.strataOverview=false;state.saltOverview=false;state.karstOverview=false;state.geologyOverview=false;state.geologyBridgeView=false;state.drylandOverview=false;state.tropicalOverview=false;state.oceanOverview=false;state.polarOverview=false;transportFlow.pause();transportUI?.setFollow(false);state.transportOverview=false;state.productionOverview=false;productionFlow.pause();productionUI?.setFollow(false);setTownInspection(false);if(state.marineOverview)setMarineInspection(false);if(state.caveOverview){setCaveInspection(false);setLayer(state.stage);}state.overview=!state.overview;state.auto=false;if(!state.riding&&!state.shaftRide)state.travel=null;pressed.clear();$('water-overview').setAttribute('aria-pressed',String(state.overview));waterScene?.setOverview(state.overview,roadSample);if(vegetationMode&&state.overview)applyVegetationStep(2);updateForest(state.feet,state.overview);$('navigation-mode').textContent=state.overview?(buildMode?'世界全貌':vegetationMode?'植被全貌':'水系全貌'):'实地观察';$('landmark-label').hidden=true;status(state.overview?'俯看同一张大地图 · 金线为水岸导览，蓝色为连续水路 · 再点返回地面':'已返回水岸 · WASD移动，拖动转向');});$('large-route').addEventListener('change',()=>switchRoute($('large-route').value));
 $('begin-expedition').addEventListener('click',beginTour);$('pause-expedition').addEventListener('click',()=>{if(!state.auto&&state.phase==='walk'){beginTour();return;}state.auto=!state.auto;$('pause-expedition').textContent=state.auto?'暂停导览 Ⅱ':'继续导览 ▷';$('navigation-mode').textContent=state.auto?'主线导览':'已暂停';status(state.auto?'继续主线':'已暂停 · 可以拖动转向，或切换实地漫游');});
 $('next-region').addEventListener('click',()=>{if(state.index>=stops.length-1)finish();else travelTo(state.index+1);});$('walk-mode').addEventListener('click',enterWalk);$('road-return').addEventListener('click',()=>warp(state.index));
 $('show-analysis').addEventListener('click',()=>{const open=$('analysis-content').hidden;$('analysis-content').hidden=!open;$('show-analysis').setAttribute('aria-expanded',String(open));if(!open){setLayer(fullStage());marker.visible=false;}else updateLesson(state.lesson,false);});
 document.querySelectorAll('[data-analysis]').forEach(b=>b.addEventListener('click',()=>{state.auto=false;state.travel=null;state.phase='walk';$('pause-expedition').textContent='继续导览 ▷';const stage=Number(b.dataset.analysis);setLayer(stage);updateLesson(stage,true);note(stage);}));
 $('toggle-card').addEventListener('click',()=>{const collapsed=!$('card-content').hidden;$('card-content').hidden=collapsed;$('toggle-card').textContent=collapsed?'+':'−';$('toggle-card').setAttribute('aria-expanded',String(!collapsed));document.querySelector('.journey-card').classList.toggle('collapsed',collapsed);});
 $('large-light').addEventListener('change',()=>setLight($('large-light').value));$('large-pace').addEventListener('change',()=>state.pace=Number($('large-pace').value));$('large-notebook').addEventListener('click',showNotes);$('close-large-notes').addEventListener('click',()=>$('large-notes-dialog').close());$('large-notes-list').addEventListener('click',e=>{const b=e.target.closest('[data-note-region]');if(b){$('large-notes-dialog').close();warp(Number(b.dataset.noteRegion));}});
 $('download-large-notes').addEventListener('click',()=>{const blob=new Blob(['\ufeff'+notebookMarkdown(state.notes)+(climateUI?.notebook()||'')],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=buildMode?'山海之间-世界构建手记.md':vegetationMode?'山海之间-植被构建手记.md':waterMode?'山海之间-水系观察手记.md':'山海之间-大地图观察手记.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 $('help-button').addEventListener('click',()=>{const open=$('help-panel').hidden;$('help-panel').hidden=!open;$('help-button').setAttribute('aria-expanded',String(open));if(state.auto){$('pause-expedition').textContent='继续导览 ▷';$('navigation-mode').textContent='已暂停';}state.auto=false;pressed.clear();});$('close-help').addEventListener('click',()=>{$('help-panel').hidden=true;$('help-button').setAttribute('aria-expanded','false');});
 const canvas=$('landscape');canvas.tabIndex=0;canvas.addEventListener('pointerdown',e=>{linkTour.pause();if(overviewMode(state,linkTour.kind))return;if(e.button!==0||state.geologyOverview||state.geologyBridgeView||state.drylandOverview||state.tropicalOverview||state.oceanOverview||state.polarOverview||state.transportOverview||state.productionOverview||state.mountainOverview||state.overview||state.caveOverview||state.marineOverview||state.townOverview)return;productionUI?.setFollow(false);if(!state.riding&&!state.shaftRide){state.auto=false;if(state.travel){state.travel=null;state.phase='walk';}}$('navigation-mode').textContent='自由转向';if(climateUI?.running)climateUI.stop({notify:true});pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus();if(!state.riding)$('pause-expedition').textContent='继续导览 ▷';});canvas.addEventListener('pointermove',e=>{if(overviewMode(state,linkTour.kind))return;if(!pointer||pointer.id!==e.pointerId)return;state.yaw+=(e.clientX-pointer.x)*.0034;state.pitch=Math.max(stops[state.index]?.karst?-1.54:-1.1,Math.min(.8,state.pitch-(e.clientY-pointer.y)*.003));state.targetYaw=state.yaw;state.targetPitch=state.pitch;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',()=>pointer=null);canvas.addEventListener('pointercancel',()=>pointer=null);
 const keySet=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);addEventListener('keydown',e=>{if(overviewMode(state,linkTour.kind)||state.planOverview||e.ctrlKey||e.metaKey||e.altKey||!keySet.has(e.code)||e.target.closest('select,dialog,input,textarea')||!$('help-panel').hidden)return;e.preventDefault();if(!pressed.has(e.code)&&!e.code.startsWith('Shift')){const forward=['KeyW','ArrowUp'].includes(e.code)?1:['KeyS','ArrowDown'].includes(e.code)?-1:0,right=['KeyD','ArrowRight'].includes(e.code)?1:['KeyA','ArrowLeft'].includes(e.code)?-1:0;attemptMove(forward,right,.38);}pressed.add(e.code);});addEventListener('keyup',e=>pressed.delete(e.code));addEventListener('blur',()=>pressed.clear());
 document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();const key={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'}[b.dataset.move];attemptMove(b.dataset.move==='forward'?1:b.dataset.move==='back'?-1:0,b.dataset.move==='right'?1:b.dataset.move==='left'?-1:0,.35);pressed.add(key);b.setPointerCapture(e.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>pressed.delete({forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'}[b.dataset.move]));});
}
function showPolarNight(){if(!stops[state.index].polar)return;if(!polarWeatherBefore)polarWeatherBefore=climateUI.settings;climateUI.edit({hour:23,season:3,weather:'clear',playing:false});setLayer(fullStage());lookAtPoint(state.feet.x-300,state.feet.y+400,state.feet.z-800,true);$('polar-restore').hidden=false;status('冬季晴夜 · 极光随夜色显现；改变天气可比较遮蔽，恢复原天气可返回');}
function setLight(mode){climateUI?.edit({hour:mode==='night'?23:mode==='dusk'?18:12,playing:false});}
function pauseForClimate(){linkTour.stop();state.linkOverview=false;state.planOverview=false;state.warmOverview=false;state.borealOverview=false;state.uplandOverview=false;state.yardangOverview=false;state.volcanicOverview=false;state.fanOverview=false;state.strataOverview=false;state.saltOverview=false;state.karstOverview=false;state.geologyOverview=false;state.geologyBridgeView=false;state.drylandOverview=false;state.tropicalOverview=false;state.oceanOverview=false;state.polarOverview=false;transportFlow.pause();transportUI?.setFollow(false);state.transportOverview=false;state.productionOverview=false;productionFlow.pause();productionUI?.setFollow(false);if(state.riding||state.shaftRide){state.auto=false;pressed.clear();$('pause-expedition').textContent='继续导览 ▷';return;}state.auto=false;state.travel=null;state.phase='walk';pressed.clear();setMarineInspection(false);setCaveInspection(false);setTownInspection(false);state.mountainOverview=false;$('mountain-overview').setAttribute('aria-pressed','false');state.overview=false;waterScene?.setOverview(false);$('water-overview').setAttribute('aria-pressed','false');updateLesson(fullStage(),false);$('begin-expedition').hidden=false;$('pause-expedition').hidden=true;$('navigation-mode').textContent='定点时序对照';}
function startClimateChapter(){state.phase='climate';pressed.clear();$('navigation-mode').textContent='主线 · 同景演变';status('保持观察位置 · 春晨、夏午、暮色、秋雨、冬雪与冬夜');climateUI.start({auto:true,done:()=>{if(state.index===stops.length-1)finish();else travelTo(state.index+1);}});}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.fov=state.caveOverview?(innerWidth<650?72:48):(innerWidth<650?72:64);camera.updateProjectionMatrix();navigation?.resize();}
function updateCamera(dt){
 const near=worldPlan?.timelineActive?3:.08;
 if(camera.near!==near){camera.near=near;camera.updateProjectionMatrix();}
 if(mainlineSeaFrame){
  const {p,target,immersed,depth,light,coastal}=mainlineSeaFrame,underwater=p.y<-.08;
  const darkness=Math.min(1,Math.max(0,(depth-3)/85)),natural=Math.sqrt(light);
  if(camera.view?.enabled)camera.clearViewOffset();
  camera.position.set(p.x,p.y,p.z);camera.lookAt(target.x,target.y,target.z);
  seaFog.copy(shallowSeaFog).lerp(deepSeaFog,darkness);
  scene.fog.color.copy(surfaceFogColor).lerp(seaFog,immersed);
  scene.fog.density=.00035+immersed*(.007+.006*darkness);
  if(coastal){
   if(coastalFogCase.overview&&!mainlineTravel){
    camera.position.set(1510,355,810);camera.lookAt(1510,4,463);
   }else{
    if(!mainlineTravel&&Math.abs(p.at-seaStations.current.at)<.1)camera.lookAt(1515,9,340);
    scene.fog.color.lerp(mistColor,coastal.mist);
    scene.fog.density=coastal.density;
   }
  }
  ambient.intensity=baseAmbient*(1-immersed)+(.80+.84*natural)*immersed;
  sun.intensity=baseSun*(1-immersed)+(.33+1.34*natural)*immersed;
  sun.position.copy(camera.position).add(sunOffset);sun.target.position.copy(camera.position);sun.target.updateMatrixWorld();
  return underwater&&{target:[target.x,target.y,target.z],surface:0,deep:depth>25};
 }
 if(state.linkOverview&&linkTour.kind!=='highland'){camera.setViewOffset(innerWidth,innerHeight,innerWidth<700?145:175,0,innerWidth,innerHeight);scene.fog.density=.00005;camera.position.set(-1050,innerWidth<900?2300:1800,700);camera.lookAt(-1180,40,-900);sky.position.copy(camera.position);return;}if(state.linkOverview){camera.setViewOffset(innerWidth,innerHeight,innerWidth<700?145:175,0,innerWidth,innerHeight);scene.fog.density=.00012;camera.position.set(-1050,innerWidth<900?2000:1550,2300);camera.lookAt(-1280,80,950);sky.position.copy(camera.position);return;}if(state.planOverview){const pose=planCameraPose(innerWidth,innerHeight);
 const focus = typeof worldPlan === 'undefined' ? null : worldPlan?.view;
 const closeView=focus?.[5];
 const dive=closeView?.light===undefined?null:closeView;
 const lowLight=worldPlan?.comparisonHour>=22;
 if (focus) {
  const [x,z,y,distance,azimuth]=focus;
  const framing = innerWidth < 900 ? 1.24 : 1;
  const dx=azimuth===undefined?-.18:Math.cos(azimuth)*.69*framing;
  const dz=azimuth===undefined?.60*framing:Math.sin(azimuth)*.69*framing;
  Object.assign(pose,{x:x+distance*dx,y:y+distance*.87*framing,z:z+distance*dz,targetX:x,targetY:y,targetZ:z});
  if(closeView)Object.assign(pose,{x:closeView.x,y:closeView.y,z:closeView.z,targetY:closeView.targetY});
 }
 const atmosphereWeather=worldPlan?.comparisonWeather?weatherScene.frame:null;
 scene.fog.density=dive?.density??(atmosphereWeather?Math.min(.0017,atmosphereWeather.fog*.61):.000025);
 if(dive)scene.fog.color.set(dive.color);else if(atmosphereWeather)scene.fog.color.setRGB(...atmosphereWeather.horizon);else scene.fog.color.copy(surfaceFogColor);
 if(dive?.tintHorizon){
  const skyColors=sky.material.uniforms;
  skyColors.bottomColor.value.copy(scene.fog.color);
  skyColors.topColor.value.copy(scene.fog.color).multiplyScalar(1.14);
  skyColors.sunVisibility.value=0;
 }
 ambient.intensity=dive?.ambient??(dive?.deep?.32:atmosphereWeather?.ambientIntensity??Math.max(baseAmbient,lowLight?.45:1.8));
 sun.intensity=dive?Math.max(dive.fill??.055,baseSun*dive.light):atmosphereWeather?.sunIntensity??Math.max(baseSun,lowLight?0:1.5);
 if(worldPlan?.panelCollapsed){if(camera.view?.enabled)camera.clearViewOffset();}
 else camera.setViewOffset(innerWidth,innerHeight,pose.offsetX,closeView?Math.min(pose.offsetY,80):pose.offsetY,innerWidth,innerHeight);
 camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(pose.targetX,pose.targetY,pose.targetZ);
 if(closeView&&camera.position.distanceTo(lastLodPosition)>50){
  tiles.update(camera.position);lastLodPosition.copy(camera.position);
 }
 sky.position.copy(camera.position);
 return dive&&{target:[pose.targetX,pose.targetY,pose.targetZ],surface:dive.surface,deep:dive.deep};
 }if(camera.view?.enabled)camera.clearViewOffset();const deepOcean=oceanWeight(state.feet.x,state.feet.z)>.9;const underwater=!state.geologyOverview&&!state.geologyBridgeView&&!state.drylandOverview&&!state.tropicalOverview&&!state.oceanOverview&&!state.overview&&!state.caveOverview&&!state.marineOverview&&!state.townOverview&&state.survey&&water.visible&&state.feet.y+LARGE_WORLD.eye<-.1;submergedBlend+=((underwater?1:0)-submergedBlend)*Math.min(1,dt*4);undergroundBlend+=((state.underground&&!state.karstOpen&&!state.overview&&!state.caveOverview&&!state.geologyOverview&&!state.karstOverview?1:0)-undergroundBlend)*Math.min(1,dt*4);sun.intensity=baseSun*(1-undergroundBlend*.97)*(1-submergedBlend*.72);scene.fog.color.copy(surfaceFogColor).lerp(caveFogColor,undergroundBlend).lerp(new THREE.Color('#27616d'),submergedBlend);canopyShade+=(shadeTarget-canopyShade)*Math.min(1,dt*3);ambient.intensity=baseAmbient*(1-.42*canopyShade*weatherCanopyFactor)*(1-undergroundBlend*.92)*(1-submergedBlend*.4)*(state.indoor?.55:1);scene.fog.density=state.overview||state.caveOverview||state.marineOverview||state.townOverview?.00012:state.underground&&!state.karstOpen&&!state.karstOverview?.006:weatherFogDensity+submergedBlend*(.012+Math.max(0,-state.feet.y)*.0003);if(deepOcean&&state.survey&&!state.overview){scene.fog.density=.0045;if(state.feet.y<0){scene.fog.color.set('#173643');ambient.intensity=Math.max(.58,ambient.intensity);}}if(state.warmOverview){scene.fog.density=.00012;camera.position.set(675,innerWidth<900?1500:1050,2000);camera.lookAt(675,40,730);sky.position.copy(camera.position);return;}if(state.borealOverview){scene.fog.density=.00012;camera.position.set(-1065,innerWidth<900?450:340,-300);camera.lookAt(-1065,58,-730);sky.position.copy(camera.position);return;}if(state.uplandOverview){scene.fog.density=.00012;camera.position.set(-950,innerWidth<900?1450:1150,1300);camera.lookAt(-1300,230,300);sky.position.copy(camera.position);return;}if(state.yardangOverview){scene.fog.density=.00012;camera.position.set(600,innerWidth<900?820:640,1950);camera.lookAt(870,40,1370);sky.position.copy(camera.position);return;}if(state.volcanicOverview){scene.fog.density=.00012;camera.position.set(1050,innerWidth<900?1050:800,1000);camera.lookAt(1320,65,90);sky.position.copy(camera.position);return;}if(state.fanOverview){scene.fog.density=.00012;camera.position.set(-650,innerWidth<900?650:480,-450);camera.lookAt(-940,30,-945);sky.position.copy(camera.position);return;}if(state.strataOverview){scene.fog.density=.00012;camera.position.set(-1450,innerWidth<900?1350:1050,-300);camera.lookAt(-1510,65,-1370);sky.position.copy(camera.position);return;}if(state.saltOverview){scene.fog.density=.00012;camera.position.set(-1100,innerWidth<900?1200:950,1200);camera.lookAt(-1670,25,280);sky.position.copy(camera.position);return;}if(state.karstOverview){ambient.intensity=Math.max(1.6,baseAmbient);sun.intensity=Math.max(1,baseSun);scene.fog.density=.00012;camera.position.set(980,innerWidth<900?900:680,-700);camera.lookAt(550,35,-1260);sky.position.copy(camera.position);return;}if(state.geologyBridgeView){scene.fog.density=.0003;camera.position.set(1760,75,240);camera.lookAt(1760,25,85);sky.position.copy(camera.position);return;}if(state.geologyOverview){scene.fog.density=.00015;camera.position.set(2000,innerWidth<900?1500:1300,1100);camera.lookAt(1680,35,-50);sky.position.copy(camera.position);return;}if(state.drylandOverview){scene.fog.density=.00015;camera.position.set(-50,innerWidth<900?1250:1000,2100);camera.lookAt(-60,22,1225);sky.position.copy(camera.position);return;}if(state.tropicalOverview){scene.fog.density=.00015;camera.position.set(-1100,innerWidth<900?1300:1050,2100);camera.lookAt(-1300,15,1150);sky.position.copy(camera.position);return;}if(state.oceanOverview){ambient.intensity=1.8;sun.intensity=Math.max(1,sun.intensity);scene.fog.density=.00012;camera.position.set(2380,innerWidth<900?1500:1150,2350);camera.lookAt(1510,-100,1060);sky.position.copy(camera.position);return;}if(state.polarOverview){scene.fog.density=.00014;camera.position.set(-400,1250,-300);camera.lookAt(-420,45,-1330);sky.position.copy(camera.position);return;}if(state.transportOverview){scene.fog.density=.00015;camera.position.set(-125,innerWidth<900?640:440,920);camera.lookAt(-120,29,410);sky.position.copy(camera.position);return;}if(state.productionOverview){scene.fog.density=.00015;camera.position.set(-430,innerWidth<900?630:440,900);camera.lookAt(-410,28,425);sky.position.copy(camera.position);return;}if(state.mountainOverview){scene.fog.density=.00018;camera.position.set(650,1250,-250);camera.lookAt(1350,380,-1090);sky.position.copy(camera.position);return;}if(state.townOverview){camera.position.set(-251,WORKSHOP.floor+31,407);camera.lookAt(-270,WORKSHOP.floor+1,374);sky.position.copy(camera.position);return;}if(state.marineOverview){camera.position.set(-1670,innerWidth<650?650:480,innerWidth<650?-100:-340);camera.lookAt(-1465,-8,-800);sky.position.copy(camera.position);return;}if(state.caveOverview){camera.position.set(167,innerWidth<650?410:310,innerWidth<650?600:535);camera.lookAt(170,35,345);sky.position.copy(camera.position);return;}if(state.overview){camera.position.set(buildMode?0:-560,buildMode?(innerWidth<900?3800:2600):innerWidth<650?3000:1800,buildMode?(innerWidth<900?3600:2600):innerWidth<650?2200:1300);camera.lookAt(buildMode?0:-520,buildMode?100:70,buildMode?0:-300);sky.position.copy(camera.position);return;}state.yaw+=shortAngle(state.yaw,state.targetYaw)*Math.min(1,dt*5);state.pitch+=(state.targetPitch-state.pitch)*Math.min(1,dt*5);camera.position.set(state.feet.x,state.feet.y+LARGE_WORLD.eye,state.feet.z);direction.set(Math.sin(state.yaw)*Math.cos(state.pitch),Math.sin(state.pitch),-Math.cos(state.yaw)*Math.cos(state.pitch));camera.lookAt(camera.position.clone().add(direction));sky.position.copy(camera.position);sun.position.copy(camera.position).add(sunOffset);sun.target.position.copy(camera.position);sun.target.updateMatrixWorld();}
function updateTour(dt){if(!state.auto)return;const delta=dt*state.pace;if(state.phase==='shaft'&&state.travel){const f=state.travel;f.time+=delta;const u=Math.min(1,f.time/f.duration),y=f.fromLevel+(f.toLevel-f.fromLevel)*u;karstScene.moveLift(y);state.feet.set(630,y,-1250);state.underground=y<73.9;state.karstOpen=true;state.karstLayer=y>50?'surface':y>0?'upper':'lower';if(u===1){state.shaftRide=false;state.auto=false;state.travel=null;state.phase='walk';$('pause-expedition').hidden=true;$('begin-expedition').hidden=false;status('抵达 '+y+'m · 沿连接栈道进入洞廊，原路返回可换层');}}else if(state.phase==='travel'&&state.travel){const f=state.travel;f.time+=delta;const u=Math.min(1,f.time/f.duration),t=f.from+(f.to-f.from)*u,p=roadSample(t);state.roadT=t;if(p.warm)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':'竹林、季风林与海岸沙丘主线';if(p.boreal)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':'森林群落主线';if(p.upland)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':'高原草甸与湿地主线';if(p.yardang)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':'风蚀与石漠主线';if(p.volcanic)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':'火口与冷却岩体主线';if(p.fan)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':'冲积扇与洪泛地主线';if(p.strata)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':'岩层台塬主线';if(p.saline)$('navigation-mode').textContent=p.saltReturn?'原路返回洞廊与竖井':p.transfer?'教学镜头转场 · 非步行':'内流盐地环境主线';state.shaftRide=!!p.shaftRide;state.karstOpen=!!p.open;state.karstLayer=p.layer||'surface';if(p.karst&&Number.isFinite(p.liftY))karstScene.moveLift(p.liftY);if(p.karst)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':p.shaftRide?'竖井升降中':p.underground?'上下洞廊主线':'岩溶地面主线';if(p.geology)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':p.underground?'地质地下主线':'地质地面主线';if(p.sky)$('navigation-mode').textContent='天空与天气主线';if(p.dryland)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':'干湿环境主线';if(p.tropical)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':p.canopy?'林冠教学观察':'湿热环境主线';if(p.ocean)$('navigation-mode').textContent=p.transfer?'教学镜头转场 · 非步行':'海洋教学观察 · 补光';const blend=buildMode||waterMode&&!vegetationMode?1:Math.min(1,u*7),x=f.start.x*(1-blend)+p.x*blend,z=f.start.z*(1-blend)+p.z*blend;state.underground=!!p.underground;state.survey=!!p.survey;state.indoor=!!p.indoor;state.riding=!!p.riding;if(state.riding){state.cableT=p.cableT;mountainScene?.moveCabin(p.cableT);}state.feet.set(x,p.underground||p.survey||p.riding?p.y:(buildMode||waterMode)?Math.max(walkingSurface(x,z),p.y):t>8/9?Math.max(.6,terrainHeight(x,z),p.y):walkingSurface(x,z),z);const look=roadSample(Math.max(0,Math.min(1,t+(f.to<f.from?-.004:.004))));if(!state.shaftRide)lookAtPoint(look.x,(look.underground||look.survey||look.riding?look.y:Math.max(look.y,terrainHeight(look.x,look.z)))+LARGE_WORLD.eye,look.z);if(u===1)arrive(f.destination,!f.manualRide);}
 else if(state.phase==='observe'){const previous=Math.min(fullStage(),Math.floor(state.time/5));state.time+=delta;const next=Math.min(fullStage(),Math.floor(state.time/5));if(next!==previous){note(previous);updateLesson(next,true);}if(state.time>=stageCount()*5){note(fullStage());if(climateUI?.joinTour&&climateStations.has(stops[state.index].id)){startClimateChapter();return;}if(state.index===stops.length-1)finish();else travelTo(state.index+1);}}}
function updateTransport(dt){const canAdvance=!$('large-notes-dialog').open&&$('help-panel').hidden&&!progressPanel?.dialog.open&&!(buildMode&&stops[state.index].transport&&state.stage<3);const wasFollowing=state.transportFollowing;if(canAdvance)transportFlow.advance(dt);const delivery=transportFlow.takeDelivery();if(delivery){transportUI.setFollow(false);productionFlow.receiveDelivery(delivery.kind,delivery.units);productionFlow.start();if(wasFollowing)productionUI.setFollow(true);status('联运渔获已入原粮仓 · 正在接续市场、作坊与家庭使用');}const f=transportScene.update(transportFlow,{day:Math.max(0,baseSun/3.2)});transportUI.render();if(state.transportFollowing){const p=f.behind;state.feet.set(p.x,walkingSurface(p.x,p.z),p.z);state.underground=false;state.survey=false;state.indoor=false;state.phase='transport';const index=41+f.stop;if(state.index!==index){state.index=index;state.roadT=routeT(index);state.lesson=fullStage();updateStation();history.replaceState(null,'',`#build-${index+1}`);}const target=f.boatPhase?f.river:f.point;lookAtPoint(target.x,f.boatPhase?f.river.y+1:walkingSurface(target.x,target.z)+1.1,target.z);$('navigation-mode').textContent=f.blocked?'设施等待':'跟随水陆联运';}}
function updateProduction(dt,time){const canAdvance=!$('large-notes-dialog').open&&$('help-panel').hidden&&!progressPanel?.dialog.open&&!(buildMode&&stops[state.index].production&&state.stage<3);if(canAdvance)productionFlow.advance(dt);const f=productionScene.update(productionFlow,time);productionUI.render();if(state.productionFollowing){const p=f.behind;state.feet.set(p.x,walkingSurface(p.x,p.z),p.z);state.underground=false;state.survey=false;state.indoor=!!settlementInteriorAt(p.x,p.z,state.feet.y);state.phase='production';const index=34+f.stop;if(state.index!==index){state.index=index;state.roadT=routeT(index);state.lesson=fullStage();updateStation();history.replaceState(null,'',`#build-${index+1}`);}lookAtPoint(f.point.x,walkingSurface(f.point.x,f.point.z)+1.2,f.point.z);$('navigation-mode').textContent='跟随运输 · '+f.recipe.product;}}
function refreshCableUI(){$('warm-overview').setAttribute('aria-pressed',String(state.warmOverview));$('boreal-overview').setAttribute('aria-pressed',String(state.borealOverview));$('upland-overview').setAttribute('aria-pressed',String(state.uplandOverview));$('yardang-overview').setAttribute('aria-pressed',String(state.yardangOverview));$('volcanic-overview').setAttribute('aria-pressed',String(state.volcanicOverview));$('fan-overview').setAttribute('aria-pressed',String(state.fanOverview));$('strata-overview').setAttribute('aria-pressed',String(state.strataOverview));$('salt-overview').setAttribute('aria-pressed',String(state.saltOverview));$('karst-overview').setAttribute('aria-pressed',String(state.karstOverview));document.querySelectorAll('[data-karst-level]').forEach(b=>b.disabled=state.shaftRide);document.querySelectorAll('[data-karst-section]').forEach(b=>{b.disabled=state.shaftRide;b.setAttribute('aria-pressed',String(state.karstSection===b.dataset.karstSection));});$('geology-overview').setAttribute('aria-pressed',String(state.geologyOverview));$('geology-side').setAttribute('aria-pressed',String(state.geologyBridgeView));$('dryland-overview').setAttribute('aria-pressed',String(state.drylandOverview));$('tropical-overview').setAttribute('aria-pressed',String(state.tropicalOverview));$('ocean-overview').setAttribute('aria-pressed',String(state.oceanOverview));$('polar-overview').setAttribute('aria-pressed',String(state.polarOverview));$('transport-overview').setAttribute('aria-pressed',String(state.transportOverview));$('production-overview').setAttribute('aria-pressed',String(state.productionOverview));const b=$('cable-ride'),at=buildMode&&[30,31].includes(state.index);b.hidden=!at&&!state.riding;b.textContent=state.riding?(state.auto?'暂停索道 Ⅱ':'继续乘坐 ▷'):state.index===30?'乘索道上山 ↑':'乘索道下山 ↓';b.disabled=state.mountainOverview||state.overview||(!state.riding&&state.stage<2);for(const id of ['walk-mode','next-region','plant-controls','show-analysis','begin-expedition','weather-compare','mountain-overview','production-controls','production-overview','transport-controls','transport-overview','polar-night','polar-overview','ocean-overview','tropical-overview','tropical-canopy','dryland-overview','sky-restore','sky-flashes','sky-atmosphere','geology-overview','geology-side','karst-overview','salt-overview','strata-overview','fan-overview','volcanic-overview','yardang-overview','upland-overview','boreal-overview','warm-overview','world-plan','station-formation','connection-controls','north-controls'])$(id).disabled=state.riding||state.shaftRide;document.querySelectorAll('[data-analysis]').forEach(n=>n.disabled=state.riding||state.shaftRide);$('cable-status').hidden=!state.riding;$('cable-status').textContent=state.riding?`${state.travel?.destination===30?'下行':'上行'} · 高程 ${state.feet.y.toFixed(0)}m · ${Math.round((state.travel?.time||0)/(state.travel?.duration||32)*100)}%${state.auto?'':' · 已暂停'}`:'';}
function applyConnectionFrame(f){if(!buildMode)switchRoute('build');if(state.index!==f.anchor){state.index=f.anchor;updateStation();}state.auto=false;state.phase=f.done?'walk':'connection';state.underground=false;state.indoor=false;state.connectionSurvey=!!f.survey;state.survey=false;state.feet.set(f.p.x,f.survey?f.p.y:walkingSurface(f.p.x,f.p.z),f.p.z);lookAtPoint(f.look.x,f.look.targetY??walkingSurface(f.look.x,f.look.z)+LARGE_WORLD.eye,f.look.z,true);$('large-title').textContent=f.title;$('large-narrative').textContent=f.explanation;$('navigation-mode').textContent=f.survey?'沿实际水网 · 教学巡河（非步行）':'沿连续干岸 · 加速导览';}function updateConnection(dt){northScene?.syncWater();if(linkTour.playing&&!$('large-notes-dialog').open&&$('help-panel').hidden&&!progressPanel?.dialog.open)applyConnectionFrame(linkTour.update(dt*state.pace));linkUI?.refresh();}
function mainlineSeaPosition(viewMode){
 if(viewMode==='mainlineSea'){
  const {x,y,z}=camera.position;
  return '入水 '+Math.max(0,-y).toFixed(2)+' m · X '+x.toFixed(1)+' · Z '+z.toFixed(1);
 }
 if(coastalFogCase.overview&&!mainlineTravel)return '俯看沿岸雾带';
 return mainlineTravel?'跟随导览 · '+mainlineSeaFrame.mode:mainlineSeaFrame.mode;
}
function tick(time=0){requestAnimationFrame(tick);const dt=Math.min(.05,(time-lastTime)/1000||0);lastTime=time;updateTour(dt);
 if(!state.auto&&pressed.size){const f=(pressed.has('KeyW')||pressed.has('ArrowUp')?1:0)-(pressed.has('KeyS')||pressed.has('ArrowDown')?1:0),r=(pressed.has('KeyD')||pressed.has('ArrowRight')?1:0)-(pressed.has('KeyA')||pressed.has('ArrowLeft')?1:0),length=Math.hypot(f,r);if(length)attemptMove(f/length,r/length,(pressed.has('ShiftLeft')||pressed.has('ShiftRight')?LARGE_WORLD.runSpeed:LARGE_WORLD.walkSpeed)*dt);}
 updateBenchmark(dt);updateLifeRoute(dt);updateConnection(dt);updateTransport(dt);updateProduction(dt,time);refreshCableUI();worldPlan?.updateClimate(dt);
 const weatherSettings=climateUI.update(worldPlan?.comparisonActive?0:dt);
 weatherScene.set(worldPlan?.comparisonWeather??(worldPlan?.comparisonActive?{hour:worldPlan.comparisonHour,season:worldPlan.comparisonSeason,weather:'clear'}:weatherSettings));const wf=weatherScene.update(dt,{eye:new THREE.Vector3(state.feet.x,state.feet.y+LARGE_WORLD.eye,state.feet.z),underground:state.underground&&!state.karstOpen,indoor:state.indoor,underwater:state.survey&&water.visible&&state.feet.y+LARGE_WORLD.eye<-.1,overview:state.overview,cutaway:state.warmOverview||state.borealOverview||state.uplandOverview||state.yardangOverview||state.volcanicOverview||state.fanOverview||state.strataOverview||state.saltOverview||state.karstOverview||state.geologyOverview||state.geologyBridgeView||state.drylandOverview||state.tropicalOverview||state.oceanOverview||state.polarOverview||state.transportOverview||state.productionOverview||state.mountainOverview||state.caveOverview||state.marineOverview||state.townOverview,reduced,suppressParticles:buildMode&&stops[state.index].sky&&state.stage<3,surfaceEffects:!conditionOn&&!(buildMode&&(state.stage===0||stops[state.index].sky&&state.stage<2))});if(buildMode&&stops[state.index].sky&&state.stage<2)wf.fog=.00075;specialScene.update(dt,wf,{yaw:state.yaw,eye:new THREE.Vector3(state.feet.x,state.feet.y+LARGE_WORLD.eye,state.feet.z),enabled:!(buildMode&&stops[state.index].sky&&state.stage<3),reduced,indoor:state.indoor,underground:state.underground&&!state.karstOpen,underwater:state.survey&&state.feet.y<0,overview:state.overview,cutaway:state.warmOverview||state.borealOverview||state.uplandOverview||state.yardangOverview||state.volcanicOverview||state.fanOverview||state.strataOverview||state.saltOverview||state.karstOverview||state.geologyOverview||state.geologyBridgeView||state.drylandOverview||state.tropicalOverview||state.oceanOverview||state.polarOverview||state.caveOverview||state.marineOverview||state.townOverview||state.mountainOverview||state.transportOverview||state.productionOverview});settlementScene.update(wf);polarScene.update(dt,wf,{eye:new THREE.Vector3(state.feet.x,state.feet.y+LARGE_WORLD.eye,state.feet.z),reduced,indoor:state.indoor,underground:state.underground&&!state.karstOpen,underwater:state.survey,overview:state.overview,cutaway:state.warmOverview||state.borealOverview||state.uplandOverview||state.yardangOverview||state.volcanicOverview||state.fanOverview||state.strataOverview||state.saltOverview||state.karstOverview||state.geologyOverview||state.geologyBridgeView||state.drylandOverview||state.tropicalOverview||state.oceanOverview||state.polarOverview||state.caveOverview||state.marineOverview||state.townOverview});baseSun=wf.sunIntensity;baseAmbient=wf.ambientIntensity;weatherFogDensity=wf.fog;weatherCanopyFactor=1-wf.winter*.55;surfaceFogColor.setRGB(...wf.horizon);
 volcanicScene.update(dt,{reduced});fanScene.syncWater();saltScene.syncWater();karstScene.update(dt,{eye:new THREE.Vector3(state.feet.x,state.feet.y+LARGE_WORLD.eye,state.feet.z),underground:state.underground&&!state.karstOpen,overview:state.karstOverview||state.overview,reduced});geologyScene.update(dt,wf,{eye:new THREE.Vector3(state.feet.x,state.feet.y+LARGE_WORLD.eye,state.feet.z),underground:state.underground,overview:state.overview||state.geologyOverview,reduced});oceanScene.update({x:state.feet.x,y:state.feet.y+LARGE_WORLD.eye,z:state.feet.z},{enabled:state.survey,overview:state.overview||state.oceanOverview});const diveView=updateCamera(dt);const viewMode=state.mainlineSea?(diveView&&!mainlineTravel?'mainlineSea':'guided-sea'):overviewMode(state,linkTour.kind);viewerControls?.afterCamera(viewMode,state.feet,diveView,dt);
 const atmosphereFov=worldPlan?.comparisonWeather&&worldPlan.view?.[5]?.fov;
 if(atmosphereFov&&atmosphereFov!==camera.fov){camera.fov=atmosphereFov;camera.updateProjectionMatrix();}
 if(mainlineSeaFrame)mainlineSeaScene.show(mainlineSeaFrame,camera.position,viewerControls?.diveTarget??mainlineSeaFrame.target);if(mainlineSeaFrame?.coastal)coastalFogScene.show(coastalFogCase,time*.001);else coastalFogScene.hide();sky.position.copy(camera.position);camera.updateMatrixWorld(true);worldPlan?.update(camera,state.planOverview,viewerControls?.diveTarget);if(time-lastLod>350){lastLod=time;vegetationScene.update(state.feet,state.overview);shadeTarget=!state.overview&&tropicalWeight(state.feet.x,state.feet.z)>.9?tropicalScene.canopyCoverAt(state.feet.x,state.feet.z):!state.overview&&forestField(state.feet.x,state.feet.z)&&vegetationScene.root.parent.visible&&vegetationScene.layers.canopy&&(!buildMode||!stops[state.index].forest||state.stage>=1)?vegetationScene.canopyCoverAt(state.feet.x,state.feet.z):0;if(!$('vegetation-panel').hidden)refreshVegetationUI();if(state.feet.distanceTo(lastLodPosition)>50){tiles.update(state.feet);lastLodPosition.copy(state.feet);updateForest(state.feet,state.overview);}updateGrass(state.feet);}if(frame%3===0)tiles.tick();if(!reduced){animateDetails(time);waterScene?.update(time);inlandScene?.update(time);caveScene?.update(time);glacialScene?.update(time);lava.material.emissiveIntensity=.8+Math.sin(time*.001)*.12;}
 if(time-lastHud>130){if(stops[state.index].sky)$('sky-visibility').textContent=`当前渲染雾参考能见距约 ${referenceVisibility(wf.fog)}m · 非气象实测`;lastHud=time;const viewYaw=overviewMode(state,linkTour.kind)?(viewerControls?.yaw()??state.yaw):state.yaw,degrees=((viewYaw*180/Math.PI)%360+360)%360,head=['N','NE','E','SE','S','SW','W','NW'][Math.round(degrees/45)%8];$('world-compass').textContent=head+' · '+Math.round(degrees)+'°';$('world-position').textContent=mainlineSeaFrame?mainlineSeaPosition(viewMode):benchmarkUI?.active&&benchmarkAir?`X ${state.feet.x.toFixed(1)} m · Z ${state.feet.z.toFixed(1)} m · 航拍`:overviewMode(state,linkTour.kind)?'自由总览 · 左拖旋转 · 右拖平移 · 滚轮缩放':state.connectionSurvey?`巡河教学镜头 · 距地 ${(state.feet.y+LARGE_WORLD.eye-terrainHeight(state.feet.x,state.feet.z)).toFixed(1)} m · 非步行`:state.warmOverview?'竹林到海岸全貌 · 丘坡、林地与沙丘':stops[state.index].warm?'环境横断面 · 竹林、季风林、海岸沙丘':state.borealOverview?'森林群落全貌 · 树形、林冠与林下':stops[state.index].boreal?'森林样本 · 针叶、混交、白桦与倒木':state.uplandOverview?'高原湿地全貌 · 台面、浅洼与塘溪':stops[state.index].upland?'高原样本 · 塘群接雨林海口 · 压缩高程':state.yardangOverview?'风蚀全貌 · 残丘、通槽与砾石台面':stops[state.index].yardang?'干旱地貌 · 无新增水体 · 风向仅静态参考':state.volcanicOverview?'火山全貌 · 火口与冷却岩体':stops[state.index].volcanic?'火山区 · 熔岩90m至40m · 观察干岸':state.fanOverview?'冲积扇全貌 · 分汊与洲地':stops[state.index].fan?`冲积扇 · ${getFanFlood()?'涨水参考 +1.1m':'常水参考'} · 局部水段`:state.strataOverview?'岩层全貌 · 实际岩壁、台塬与阶地':stops[state.index].strata?`岩层区 · 脚下${state.feet.y.toFixed(1)}m · 局部溪流24m至18m`:state.saltOverview?'盐地全貌 · 同一湖盆与水位对照':stops[state.index].saline?`内流盐地 · 盐湖${getSaltWaterLevel()}m / 盐沼${getSaltWaterLevel()-.5}m · 独立水位`:state.shaftRide?`竖井升降 · ${state.feet.y.toFixed(1)}m${state.auto?'':' · 已暂停'}`:state.karstOverview?`垂直剖视 · ${state.karstSection==='upper'?'上层38m':'下层−28m'} · 另一层保留轮廓`:stops[state.index].karst?`岩溶 ${state.karstLayer} · 脚下 ${state.feet.y.toFixed(1)}m · ${state.karstOpen?'开放井筒 / 栈道':'独立洞层'}`:state.geologyOverview?'地质剖视 · 同一岩体、拱洞、分支与地热':state.geologyBridgeView?'岩桥侧看 · 固定镜头，原位置保留':state.riding?`索道车厢 · 高程 ${state.feet.y.toFixed(1)} m · ${Math.round(state.cableT*100)}% 向山上`:state.townOverview?'室内剖视 · 移开同一建筑的屋顶与前墙':state.indoor?`室内 · ${settlementInteriorAt(state.feet.x,state.feet.z,state.feet.y)?.use||'生活空间'} · 沿通道返回门洞`:state.oceanOverview?'海洋剖视 · 同一海面0m与真实海床 · 约370m压缩深度':state.marineOverview?'海床剖视 · 海面 0m · 移开水面查看真实床底':state.survey?(tropicalWeight(state.feet.x,state.feet.z)>.9?`林冠教学观察 · 距地 ${(state.feet.y-terrainHeight(state.feet.x,state.feet.z)).toFixed(1)} m`:`${oceanWeight(state.feet.x,state.feet.z)>.9?'海洋教学观察 / 补光':'沿海床观察'} · 海床水深 ${Math.max(0,-terrainHeight(state.feet.x,state.feet.z)).toFixed(1)} m · 眼睛入水 ${Math.max(0,-state.feet.y-LARGE_WORLD.eye).toFixed(1)} m`):state.caveOverview?'地下剖视 · 同一洞体与覆土地表':state.underground?`地下 · 洞底 ${state.feet.y.toFixed(1)} m · 净空 ${(caveField(state.feet.x,state.feet.z).ceiling-state.feet.y).toFixed(1)} m`:state.overview?`全流域俯看 · 再点${buildMode?'世界':vegetationMode?'植被':'水系'}全貌返回岸边`:`X ${state.feet.x.toFixed(1)} m · Z ${state.feet.z.toFixed(1)} m · 眼高 1.72 m`;const main=(buildMode||waterMode)?{x:stops[state.index].targetX,z:stops[state.index].targetZ,y:stops[state.index].targetY}:plots.find(p=>p.index===state.index&&p.main),distance=Math.hypot(main.x-state.feet.x,main.z-state.feet.z);projected.set(main.x,main.y+(buildMode&&stops[state.index].cave?0:!buildMode&&!waterMode&&state.index===9?20:11),main.z).project(camera);const visible=!state.uplandOverview&&!state.yardangOverview&&!state.volcanicOverview&&!state.fanOverview&&!state.strataOverview&&!state.saltOverview&&!state.karstOverview&&!state.geologyOverview&&!state.geologyBridgeView&&!state.drylandOverview&&!state.tropicalOverview&&!state.oceanOverview&&!state.overview&&!state.caveOverview&&!state.marineOverview&&!state.townOverview&&distance<550&&projected.z>0&&projected.z<1&&Math.abs(projected.x)<.95&&Math.abs(projected.y)<.9;$('landmark-label').hidden=!visible;if(visible){$('landmark-label').style.left=(projected.x*.5+.5)*innerWidth+'px';$('landmark-label').style.top=(-projected.y*.5+.5)*innerHeight+'px';$('landmark-name').textContent=stops[state.index].name;$('landmark-distance').textContent=Math.round(distance)+' m';}}
 $('watershed-labels').hidden=!state.overview||state.planOverview;if(state.overview&&!state.planOverview)overviewStops().forEach((r,i)=>{projected.set(r.x,Math.max(terrainHeight(r.x,r.z),buildMode||r.glacial||r.marine?0:waterPlatforms[r.waterLegacyIndex??i].y)+8,r.z).project(camera);const b=$('watershed-labels').children[i];b.hidden=(!!r.forest&&r.id!=='forest-edge')||(!!r.cave&&r.id!=='cave-mouth')||(!!r.glacial&&r.id!=='ice-snow')||(!!r.marine&&r.id!=='marine-reef')||(!!r.settlement&&r.id!=='town-road')||(!!r.mountain&&r.id!=='mountain-peak')||(!!r.production&&r.id!=='life-resource')||(!!r.transport&&r.id!=='trans-road')||(!!r.polar&&r.id!=='polar-coast')||(!!r.ocean&&r.id!=='ocean-open')||(!!r.tropical&&r.id!=='tropical-edge')||(!!r.dryland&&r.id!=='dryland-grass')||(!!r.sky&&r.id!=='sky-cloud')||(!!r.geology&&r.id!=='geo-sea')||(!!r.karst&&r.id!=='karst-peaks')||(!!r.saline&&r.id!=='salt-lake')||(!!r.strata&&r.id!=='strata-wall')||(!!r.fan&&r.id!=='fan-apex')||(!!r.volcanic&&r.id!=='volcanic-crater')||(!!r.yardang&&r.id!=='yardang-ridges')||(!!r.upland&&r.id!=='upland-meadow')||(!!r.boreal&&r.id!=='boreal-conifer')||(!!r.warm&&!r.warmPrimary);if(r.warmPrimary)b.textContent=r.biome==='bamboo'?'竹林 · 竹秆与叶簇':r.biome==='monsoon'?'季风林 · 密林到疏林':'海岸沙丘 · 前缘到背风';if(r.id==='boreal-conifer')b.textContent='森林群落 · 针叶到倒木';if(r.id==='upland-meadow')b.textContent='高原 · 草甸到塘溪';if(r.id==='yardang-ridges')b.textContent='风蚀 · 雅丹到砾台';if(r.id==='volcanic-crater')b.textContent='火山 · 火口到柱状岩';if(r.id==='fan-apex')b.textContent='冲积 · 扇面到洪泛地';if(r.id==='strata-wall')b.textContent='岩层 · 岩壁到阶地';if(r.id==='salt-lake')b.textContent='盐地 · 盐湖到干盆';if(r.id==='karst-peaks')b.textContent='岩溶 · 峰林到地下河';if(r.id==='geo-sea')b.textContent='地质 · 海洞到地热';if(r.id==='sky-cloud')b.textContent='天空 · 云层到夜空';if(r.id==='dryland-grass')b.textContent='干湿 · 草原到绿洲';if(r.id==='tropical-edge')b.textContent='湿热 · 雨林到红树林';if(r.id==='ocean-open')b.textContent='远洋 · 群岛到海沟';if(r.id==='polar-coast')b.textContent='极地 · 海冰到极光';if(r.id==='trans-road')b.textContent='交通 · 联运与公共设施';if(r.id==='life-resource')b.textContent='生产 · 资源到住宅';if(r.id==='mountain-peak')b.textContent='高山 · 村落到峰顶';if(r.id==='town-road')b.textContent='聚落 · 道路到室内';if(r.id==='marine-reef')b.textContent='海岸 · 礁岸到海床';if(r.id==='ice-snow')b.textContent='冰雪 · 山川湖溪';if(r.id==='cave-mouth')b.textContent='洞穴 · 地下段';if(r.id==='forest-edge')b.textContent='森林 · 林缘到林窗';b.style.left=(projected.x*.5+.5)*innerWidth+'px';b.style.top=((-projected.y*.5+.5)*innerHeight+(buildMode?(r.id==='forest-edge'?-35:r.id==='plain'?12:0):r.glacial||r.marine?0:[12,-12,0,0,-25,6][r.waterLegacyIndex??i]))+'px';});if(benchmarkTime)timelineScene.update();renderer.render(scene,camera);if(frame%3===0){if(lifeRouteUI?.active||linkTour.active||state.linkOverview)navigation.render(state.feet,state.yaw,lifeRouteUI?.active?lifeRouteUI.station:state.index);else navigation.render(state.feet,state.yaw,state.index,!state.overview&&!stops[state.index].karst&&!stops[state.index].geology&&(state.underground||state.caveOverview||buildMode&&!!stops[state.index].cave),!state.overview&&!stops[state.index].tropical&&!stops[state.index].ocean&&(state.survey||state.marineOverview||!!stops[state.index].marine),!state.overview&&(state.townOverview||inTown(state.feet.x,state.feet.z,20)),!state.overview&&!!stops[state.index].mountain,!state.overview&&!!stops[state.index].production,!state.overview&&!!stops[state.index].transport,!state.overview&&!!stops[state.index].polar,!state.overview&&!!stops[state.index].ocean,!state.overview&&!!stops[state.index].tropical,!state.overview&&(!!stops[state.index].dryland||!!stops[state.index].sky),!state.overview&&!!stops[state.index].sky,!state.overview&&!!stops[state.index].geology,!state.overview&&!!stops[state.index].karst,!state.overview&&!!stops[state.index].saline,!state.overview&&!!stops[state.index].strata,!state.overview&&!!stops[state.index].fan,!state.overview&&!!stops[state.index].volcanic,!state.overview&&!!stops[state.index].yardang,!state.overview&&!!stops[state.index].upland,!state.overview&&!!stops[state.index].boreal,!state.overview&&!!stops[state.index].warm);}frame++;}
async function initialize(){renderer=new THREE.WebGLRenderer({canvas:$('landscape'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#d1ded1',.00075);camera=new THREE.PerspectiveCamera(64,innerWidth/innerHeight,.08,25000);sky=makeSky();scene.add(sky);sun=new THREE.DirectionalLight('#fff0d4',3.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-170,right:170,top:170,bottom:-170,near:1,far:900});sun.shadow.normalBias=.15;sun.shadow.bias=-.00015;scene.add(sun,sun.target);ambient=new THREE.HemisphereLight('#d8e9e5','#827b61',1.8);scene.add(ambient);
 water=new THREE.Mesh(karstSeaGeometry(),new THREE.MeshStandardMaterial({color:'#5b9897',roughness:.28,metalness:.16,side:THREE.DoubleSide}));water.rotation.x=-Math.PI/2;scene.add(water);lava=new THREE.Mesh(new THREE.CircleGeometry(VOLCANO.radius,64),new THREE.MeshStandardMaterial({color:'#d38c42',emissive:'#ad3c0c',emissiveIntensity:.8,roughness:.5}));lava.rotation.x=-Math.PI/2;lava.position.set(VOLCANO.x,VOLCANO.lava,VOLCANO.z);scene.add(lava);marker=new THREE.Mesh(new THREE.TorusGeometry(1.8,.04,6,40),new THREE.MeshBasicMaterial({color:'#f1cb81'}));marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);
 const initialRoute=location.hash.match(/^#(build|forest|cave|ice|marine|town|mountain|life|transit|polar|ocean|tropical|dryland|sky|geology|karst|salt|strata|fan|volcanic|yardang|upland|boreal|warm|bamboo|monsoon|dunes|plants|water|region|stop)-(\d+)$/);configureRoute(!initialRoute||['build','forest','cave','ice','marine','town','mountain','life','transit','polar','ocean','tropical','dryland','sky','geology','karst','salt','strata','fan','volcanic','yardang','upland','boreal','warm','bamboo','monsoon','dunes'].includes(initialRoute[1])?'build':initialRoute[1]==='plants'?'vegetation':initialRoute[1]==='water'?'water':'terrain');const initialIndex=initialRoute?Math.max(0,Math.min(stops.length-1,['warm','bamboo','monsoon','dunes'].includes(initialRoute[1])?Number(initialRoute[2])+({warm:109,bamboo:109,monsoon:111,dunes:113}[initialRoute[1]]):initialRoute[1]==='boreal'?Number(initialRoute[2])+105:initialRoute[1]==='upland'?Number(initialRoute[2])+101:initialRoute[1]==='yardang'?Number(initialRoute[2])+97:initialRoute[1]==='volcanic'?Number(initialRoute[2])+93:initialRoute[1]==='fan'?Number(initialRoute[2])+89:initialRoute[1]==='strata'?Number(initialRoute[2])+85:initialRoute[1]==='salt'?Number(initialRoute[2])+81:initialRoute[1]==='karst'?Number(initialRoute[2])+75:initialRoute[1]==='geology'?Number(initialRoute[2])+71:initialRoute[1]==='sky'?Number(initialRoute[2])+67:initialRoute[1]==='dryland'?Number(initialRoute[2])+62:initialRoute[1]==='tropical'?Number(initialRoute[2])+56:initialRoute[1]==='ocean'?Number(initialRoute[2])+51:initialRoute[1]==='polar'?Number(initialRoute[2])+46:initialRoute[1]==='transit'?Number(initialRoute[2])+40:initialRoute[1]==='life'?Number(initialRoute[2])+33:initialRoute[1]==='mountain'?Number(initialRoute[2])+26:initialRoute[1]==='town'?Number(initialRoute[2])+22:initialRoute[1]==='marine'?Number(initialRoute[2])+18:initialRoute[1]==='ice'?Number(initialRoute[2])+10:initialRoute[1]==='cave'?Number(initialRoute[2])+5:Number(initialRoute[2])-(initialRoute[1]==='forest'?0:1))):0;const first=safeView(initialIndex);state.feet.set(first.x,first.y-LARGE_WORLD.eye,first.z);lookAtPoint(first.targetX,first.targetY,first.targetZ,true);tiles=new TerrainTiles(scene);await tiles.initialize(state.feet,p=>{$('large-loading-progress').value=p*.4;});$('large-loading-text').textContent='种植林地，连接聚落…';await buildForests(scene,p=>{$('large-loading-progress').value=.4+p*.4;});buildSettlements(scene);waterScene=buildWaterSystem(scene,addObstacle,water);inlandScene=buildInlandWater(scene);forestScene=buildForestDetails(scene,addObstacle);caveScene=buildCave(scene);$('large-loading-text').textContent='构建冰川、雪面与融水…';await new Promise(resolve=>setTimeout(resolve,0));glacialScene=buildGlacial(scene);marineScene=buildMarine(scene);settlementScene=buildSettlement(scene,addObstacle);mountainScene=buildMountain(scene);productionScene=buildProduction(scene,{registerObstacle:addObstacle});transportScene=buildTransport(scene,{registerObstacle:addObstacle});drylandScene=buildDryland(scene,{registerObstacle:addObstacle});tropicalScene=buildTropical(scene,{registerObstacle:addObstacle});oceanScene=buildOcean(scene);polarScene=buildPolar(scene,{registerObstacle:addObstacle});for(const p of glacialScene.boulders)addObstacle(p.x,p.z,p.radius);makeGrass(scene);$('large-loading-text').textContent='连接昼夜、天气与季节…';await new Promise(resolve=>setTimeout(resolve,0));northScene=buildNorthernWatershed(scene);linkScene=buildWatershedLink(scene,{registerObstacle:addObstacle});warmScene=buildWarm(scene,{registerObstacle:addObstacle});borealScene=buildBoreal(scene,{registerObstacle:addObstacle});uplandScene=buildUpland(scene);yardangScene=buildYardang(scene,{registerObstacle:addObstacle});volcanicScene=buildVolcanic(scene,{registerObstacle:addObstacle});fanScene=buildFan(scene);strataScene=buildStrata(scene,{registerObstacle:addObstacle});saltScene=buildSalt(scene);karstScene=buildKarst(scene,{registerObstacle:addObstacle});geologyScene=buildGeology(scene,{registerObstacle:addObstacle});specialScene=buildSpecialWeather(scene);weatherScene=buildWeather(scene,{sun,ambient,sky,sea:water,sunOffset,vegetation:vegetationScene,tiles,grass:weatherGrass(),waterScene,inlandScene,glacialScene,settlementScene});updateGrass(state.feet,true);updateForest(state.feet,state.overview);$('large-loading-text').textContent='绘制导航缩略图…';await new Promise(resolve=>setTimeout(resolve,0));navigation=new NavigationMap($('navigation-map'),(index,route)=>{if(route==='life-walk'){lifeRouteUI?.jump(index);return;}if(route==='build'&&!buildMode)switchRoute('build');else if(route==='terrain'&&(waterMode||buildMode))switchRoute('terrain');warp(index);},stops,roadSample);viewerControls=new WorldViewControls(camera,$('landscape'),{diveClear:(eye,target,surface)=>worldPlan?.diveCheck(eye,target)??divePoseClear(eye,target,surface),baseFov:()=>state.caveOverview?(innerWidth<650?72:48):(innerWidth<650?72:64),onInteract:()=>linkTour.pause()});viewerControls.mount(document);wireUI();productionUI=bindProductionUI({document,flow:productionFlow,onOpen:()=>{transportFlow.pause();transportUI?.setFollow(false);transportUI?.open(false);climateUI?.open(false);$('vegetation-panel').hidden=true;$('plant-controls').setAttribute('aria-expanded','false');},onStart:()=>{transportFlow.pause();transportUI?.setFollow(false);if(!buildMode||!stops[state.index]?.production){switchRoute('build');arrive(35);}const follow=productionUI.following;enterWalk();if(follow)productionUI.setFollow(true);state.auto=false;setLayer(fullStage());status('播放当前演示批次 · 可开启跟随运输，或在场景中自行观察');},onFollow:value=>{state.productionFollowing=value;if(value){transportFlow.pause();transportUI?.setFollow(false);state.transportOverview=false;state.overview=false;state.mountainOverview=false;state.productionOverview=false;state.auto=false;state.travel=null;state.phase='production';pressed.clear();}else if(state.phase==='production')state.phase='walk';},onReset:()=>productionScene.update(productionFlow),onPause:()=>status('批次已暂停 · 货物、库存和运输位置一起保留')});transportUI=bindTransportUI({document,flow:transportFlow,onOpen:()=>{productionFlow.pause();productionUI.setFollow(false);productionUI.open(false);climateUI?.open(false);$('vegetation-panel').hidden=true;$('plant-controls').setAttribute('aria-expanded','false');},onStart:()=>{if(!buildMode||!stops[state.index]?.transport){switchRoute('build');arrive(43);}if(!transportFlow.started||transportFlow.done)productionFlow.reset('fish');productionFlow.pause();const follow=transportUI.following;enterWalk();if(follow)transportUI.setFollow(true);setLayer(fullStage());status('新联运批次到仓后会接续原渔获生活链；可关闭桥梁或手动补水检修');},onFollow:value=>{state.transportFollowing=value;if(value){productionFlow.pause();productionUI.setFollow(false);state.overview=false;state.productionOverview=false;state.transportOverview=false;state.mountainOverview=false;state.auto=false;state.travel=null;state.phase='transport';pressed.clear();}else if(state.phase==='transport')state.phase='walk';},onReset:()=>transportScene.update(transportFlow),onHandoff:async()=>{transportUI.open(false);await warp(34+productionFlow.frame().stop);productionUI.open(true);}});climateUI=bindWeatherUI({document,reduced,getStop:()=>stops[state.index],onManual:pauseForClimate,onCancel:()=>{state.auto=false;if(state.riding||state.shaftRide)return;state.phase='walk';$('begin-expedition').hidden=false;$('pause-expedition').hidden=true;$('navigation-mode').textContent='实地观察';},onCue:cue=>{if(state.phase==='climate')$('large-narrative').textContent=cue.name+' · '+cue.focus;},canAdvance:automatic=>!benchmarkWalk.playing&&!$('large-notes-dialog').open&&$('help-panel').hidden&&!state.overview&&!state.caveOverview&&!state.marineOverview&&!state.townOverview&&!state.mountainOverview&&!progressPanel?.dialog.open&&(!automatic||state.auto&&state.phase==='climate')});progressPanel=mountMapProgress({document,getResumeSearch,getScene:()=>`${buildMode?'build':vegetationMode?'plants':waterMode?'water':'region'}-${state.index+1}`,onOpen:()=>{transportFlow.pause();productionFlow.pause();state.auto=false;pressed.clear();$('pause-expedition').textContent='继续导览 ▷';status('世界导览 · 可回到当前站点');}});linkUI=mountWatershedUI({document,tour:linkTour,getLayer:()=>state.stage,onLayer:s=>{linkTour.pause();state.lesson=s;setLayer(s);},onPlay:()=>{enterWalk();if(!buildMode)switchRoute('build');linkTour.play();applyConnectionFrame(linkTour.frame());},onJump:i=>{enterWalk();if(!buildMode)switchRoute('build');applyConnectionFrame(linkTour.jump(i));},onOverview:()=>{enterWalk();state.linkOverview=true;},onStop:(returnToGround=true)=>{if(returnToGround){enterWalk();updateStation();}else{linkTour.pause();state.auto=false;state.phase='connection';}}});
 buildBenchmarkTrail(scene);
 buildLifeConnections(scene);
 benchmarkUI=mountBenchmarkTrail(document,{onReset:resetBenchmark,onGuide:toggleBenchmarkGuide,onClose:closeBenchmark,
  onEpoch:changeBenchmarkTime,onPoint:moveBenchmarkPoint,onMode:selectBenchmarkMode});
 mainlineUI=mountMainlineGuide($('benchmark-lesson'),{
  onPoint:locateMainline,
  onTravel:travelMainline,onPause:stopMainlineTravel,onStudy:openMainlineStudy,onCompare:changeBenchmarkTime,
  onCoastalChange:settings=>{
   coastalFogCase={...coastalFogCase,...settings};
   if(mainlineSeaFrame)showMainlineSea(mainlineSeaFrame.p.at);
  }
 });
 $('benchmark-controls').addEventListener('click',()=>{
  if(mainlineReturn){worldPlan.close();return;}
  if(benchmarkUI.active)closeBenchmark();
  else if(resetBenchmark())selectBenchmarkMode('mainline',0);
 });
 const modernRoots=scene.children.filter(object=>object!==sky&&!object.isLight);
 timelineScene=createIceAgeScene(scene,modernRoots,water);
 benchmarkTrace=createBenchmarkTimeTrace(scene);
 mainlineSeaScene=createMainlineSeaScene(scene,water);
 coastalFogScene=createCoastalFogScene(scene);
 const annualScene=createAnnualClimateScene(scene,{weather:weatherScene,reduced,readFlood:getFanFlood,
  setFlood:active=>{fanScene.setFlood(active);northScene.syncWater();tiles.refreshFanWater();}
 });
 weatherScene.registerAnnualPlants([
  {root:warmScene.structure,evergreen:true},{root:warmScene.understory,evergreen:true},
  {root:tropicalScene.canopies,evergreen:true},{root:tropicalScene.lower,evergreen:true},
  {root:borealScene.canopy,evergreen:true},{root:borealScene.understory,evergreen:false},
  {root:drylandScene.plants,evergreen:false},{root:northScene.plants,evergreen:false}
 ]);
 const balanceScene=createWatershedBalanceScene(scene,{water:waterScene,inland:inlandScene,salt:saltScene,weather:weatherScene,reduced});
 const planRows=makeWorldInventory(constructionStops,terrainStops),planModel=buildWorldPlan(scene,planRows);
 const sedimentScene=createSedimentScene(scene,balanceScene,{reduced});
 const soilScene=createSoilScene(scene,balanceScene,sedimentScene,{originalPlants:[vegetationScene.root,fanScene.plants,northScene.plants]});
 const environmentScene=createEnvironmentLinesScene(scene,balanceScene,water,groundStep);
 const tectonicScene=createTectonicScene(scene,water);
 const groundwaterScene=createGroundwaterScene(scene,{tiles,karst:karstScene,sea:water,reduced});
 const exchangeScene=createWaterExchangeScene(scene,balanceScene,{reduced});
 const wetlandScene=createWetlandScene(scene,balanceScene,vegetationScene);
 const estuaryScene=createEstuaryScene(scene,balanceScene,{sea:water,water:waterScene,vegetation:vegetationScene,reduced});
 const stormScene=createBasinStormScene(scene,balanceScene,{exchange:exchangeScene,wetland:wetlandScene,estuary:estuaryScene,vegetation:vegetationScene,reduced});
 const formationScene=createFormationScene(scene,balanceScene,tiles);
 lifeRouteUI=mountLifeRoute(document,{
  visuals:createLifeVisuals(scene,wetlandScene),pose:()=>state.feet,
  place:point=>{
   pressed.clear();
   if(!lifeRouteUI.active){
    const anchor=constructionStops.findIndex(stop=>stop.id==='life-farm');
    return placeOnFoot(point,lifePoint(point.at+10),anchor);
   }
   const next=groundStep({...point,y:walkingSurface(point.x,point.z),underground:false},point.x,point.z);
   if(!next)return false;
   enterWalk();setFeet(next);
   $('navigation-mode').textContent='河谷到海湾 · 连续步行';
   return true;
  },
  step:point=>{
   const p=groundStep(state.feet,point.x,point.z);
   if(!p||p.underground||p.indoor||p.survey)return false;
   setFeet(p);return true;
  },
  aim:(target,height,instant)=>lookAtPoint(target.x,walkingSurface(target.x,target.z)+height,target.z,instant),
  onStation:index=>syncExpeditionUrl(url=>setValleyLifeQuery(url,index)),
  onDisplay:active=>{
   if(!active)syncExpeditionUrl(url=>setValleyLifeQuery(url,null));
   navigation.setLifeWalk(active);
   $('navigation-mode').textContent=active?'河谷到海湾 · 连续步行':'实地观察';
   if(!active)$('navigation-place').textContent=stops[state.index].name;
  }
 });
 $('life-walk-controls').addEventListener('click',()=>lifeRouteUI.active?lifeRouteUI.close():openLifeRoute());
 worldPlan=mountWorldPlan({document,scene,sky,rows:planRows,model:planModel,annualScene,balanceScene,sedimentScene,soilScene,environmentScene,tectonicScene,groundwaterScene,exchangeScene,wetlandScene,estuaryScene,stormScene,formationScene,timelineScene,modernRoots,coastResources:{sea:water,tropicalWater:tropicalScene.hydrology,oceanLife:oceanScene.ecology,oceanGuides:oceanScene.guides},scrubResources:{tiles,dryland:drylandScene},reduced,onBenchmark:resetBenchmark,onRidgeBayState:updateRidgeBayUrl,onRidgeBayWalk:walkRidgeBayStation,onSeamWalk:(point,look,name)=>{if(placeOnFoot(point,look))status(name+' · 已进入可步行段');},getCurrent:()=>buildMode?`build:${stops[state.index].id}`:waterMode?planRows.filter(r=>!r.foundation).reduce((a,b)=>Math.hypot(a.x-state.feet.x,a.z-state.feet.z)<Math.hypot(b.x-state.feet.x,b.z-state.feet.z)?a:b).key:`terrain:${stops[state.index].id}`,onOpen:()=>{lifeRouteUI?.close();closeBenchmark();enterWalk();climateUI?.open(false);transportFlow.pause();productionFlow.pause();transportUI?.open(false);productionUI?.open(false);$('vegetation-panel').hidden=true;state.planOverview=true;state.overview=true;setLayer(fullStage());state.auto=false;waterScene?.setOverview(false);pressed.clear();status('当前地图总图 · 按方位找元素，再读形成逻辑');},onHide:()=>syncExpeditionUrl(clearWorldPlanQuery),onClose:()=>{enterWalk();restoreMainline();},onGo:row=>{enterWalk();if((row.route==='build')!==buildMode||row.route==='terrain'&&(waterMode||vegetationMode))switchRoute(row.route);warp(row.routeIndex);}});loadNotes();resize();addEventListener('resize',resize);arrive(initialIndex,false);enterWalk();if(new URLSearchParams(location.search).has('aurora')&&stops[state.index].polar)showPolarNight();if(new URLSearchParams(location.search).has('climate'))climateUI.open(true);if(new URLSearchParams(location.search).has('transport')&&stops[state.index].transport)transportUI.open(true);if(new URLSearchParams(location.search).has('production')&&stops[state.index].production)productionUI.open(true);$('analysis-content').hidden=!(buildMode||vegetationMode);$('show-analysis').setAttribute('aria-expanded',String(buildMode||vegetationMode));$('large-title').textContent=(buildMode||waterMode)?stops[state.index].name:state.index===0?'从港口，走进山海。':stops[state.index].name;$('large-loading-progress').value=1;$('large-loading').hidden=true;if(new URLSearchParams(location.search).has('connection')){const route=new URLSearchParams(location.search).get('connection');if(['north-fan','north-strata'].includes(route))linkUI.choose(route);linkUI.open(true);}const planQuery=new URLSearchParams(location.search),planName=planQuery.get('plan'),studyFocus=planQuery.get('focus');
 if(['snow-to-bay','snow-to-deep'].includes(planQuery.get('walk'))&&resetBenchmark()){
  const time=planQuery.get('epoch'),at=Number(planQuery.get('at'));
  if(time&&time!=='now')changeBenchmarkTime(time);
  if(Number.isFinite(at)&&at>0)moveBenchmarkPoint(at);
  if(planQuery.get('guide')==='main'||planQuery.get('walk')==='snow-to-deep'){
   const i=mainlineLessons.findIndex(lesson=>lesson.id===planQuery.get('station'));
   selectBenchmarkMode('mainline',i<0?undefined:i);
  }
 }
 if(planName===null&&planQuery.get('walk')==='valley-life')openLifeRoute(Number(planQuery.get('stop')));
 if(planName!==null)worldPlan.open({ridgeBayStudy:planName==='ridge-bay'?{station:planQuery.get('station'),month:planQuery.get('month'),compare:planQuery.get('compare')}:null,gapAudit:planName==='gaps'?{focus:studyFocus}:null,logic:planName==='logic',geography:planName==='geography',geographyLeg:planName==='geography'?studyFocus:null,mapZone:planQuery.get('zone'),
  annualMode:planName==='annual',balanceMode:planName==='balance',sedimentMode:planName==='sediment',soilMode:planName==='soil',
  balanceFocus:planName==='balance'?studyFocus:null,sedimentFocus:planName==='sediment'?studyFocus:null,
  soilFocus:planName==='soil'?studyFocus:null,environmentMode:['lines','foundation'].includes(planName),environmentFocus:['lines','foundation'].includes(planName)?studyFocus:null,
  environmentMonth:['lines','foundation'].includes(planName)?planQuery.get('month'):null,environmentSeam:planName==='foundation'?planQuery.get('seam'):null,
  tectonicsMode:planName==='tectonics',tectonicsFocus:planName==='tectonics'?studyFocus:null,
  coldClimate:planName==='cold'?{focus:studyFocus,station:planQuery.get('station'),month:planQuery.get('month')}:null,
  warmBeltStudy:planName==='rain-shadow'?{station:planQuery.get('station'),month:planQuery.get('month')}:null,
  fluidVentStudy:planName==='fluid-vents'?{route:planQuery.get('route'),station:planQuery.get('station'),section:planQuery.get('view')==='section'}:null,
  scrubStudy:planName==='scrub-recovery'?{station:planQuery.get('station'),stage:planQuery.get('stage'),season:planQuery.get('season')}:null,
  atmosphereStudy:planName==='atmosphere'?{station:planQuery.get('station'),condition:planQuery.get('condition'),view:planQuery.get('view')}:null,
  coastStudy:planName==='coast-sea'?{station:planQuery.get('station'),tide:planQuery.get('tide'),view:planQuery.get('view')}:null,
  groundwaterMode:planName==='groundwater',groundwaterFocus:planName==='groundwater'?studyFocus:null,
  exchangeMode:planName==='exchange',exchangeFocus:planName==='exchange'?studyFocus:null,
  wetlandMode:planName==='wetland',wetlandFocus:planName==='wetland'?studyFocus:null,
  estuaryMode:planName==='estuary',estuaryFocus:planName==='estuary'?studyFocus:null,
  formationMode:planName==='formation',formationFocus:studyFocus,formationMonth:planQuery.get('month'),formationStudy:planQuery.get('study'),
  timeline:planName==='timeline'?{focus:studyFocus,epoch:planQuery.get('epoch'),station:planQuery.get('station')}:null,
  deepTimeStudy:planName==='deep-time'?{case:planQuery.get('case'),phase:planQuery.get('phase'),station:planQuery.get('station'),view:planQuery.get('view'),focus:studyFocus}:null,
  legacyStudy:planName==='legacy'?{epoch:planQuery.get('epoch'),station:planQuery.get('station'),section:planQuery.get('view')==='section'}:null,
  stormMode:planName==='storm',stormFocus:planName==='storm'?studyFocus:null,stormStudy:planQuery.get('study')});console.info('[large-world] ready',Math.round(performance.now()-loadStarted),'ms');tick();}
initialize().catch(error=>{$('large-loading').hidden=true;$('large-error').hidden=false;$('large-error-text').textContent=/WebGL/i.test(error.message)?'图形环境初始化失败：'+error.message:'程序初始化失败：'+error.message;console.error(error);});

import {lifePathVerge} from './life-route.js';
import {benchmarkNear} from './benchmark-trail.js';
import {ecotoneInfluence, regionalClimate} from './regional-geography.js';
import {transitionAt,transitionClimate,transitionBelts} from './environment-transitions.js';
import {northReserved,northNearTile} from './northern-watershed.js';
import {linkReserved,linkNearTile} from './watershed-link.js';
import {warmReserved,warmNearTile} from './warm-layout.js';
import {borealReserved,borealNearTile} from './boreal-layout.js';
import {uplandReserved} from './upland-layout.js';
import {yardangReserved} from './yardang-layout.js';
import {volcanicReserved} from './volcanic-layout.js';
import {fanReserved} from './fan-layout.js';
import {strataReserved} from './strata-layout.js';
import {saltReserved} from './salt-layout.js';
import {karstReserved} from './karst-layout.js';
import {geologyReserved} from './geology-layout.js';
import {drylandReserved} from './dryland-layout.js';
import {tropicalReserved} from './tropical-layout.js';
import {oceanReserved} from './ocean-layout.js';
import {polarReserved,polarNearTile,polarWeight} from './polar-layout.js';
import {transportReserved} from './transport-layout.js';
import {productionReserved} from './production-layout.js';
import {mountainReserved} from './mountain-layout.js';
import {settlementReserved} from './settlement-layout.js';
import {marineWeight} from './marine-geography.js';
import {iceField,glacialWaterField,snowDepthAt} from './glacial-geography.js';
import {caveVoidAt} from './cave-layout.js';
import {FOREST,FOREST_GAP,FOREST_SITES,forestField} from './forest-layout.js';
import {inlandField,inlandRegionAt,INLAND_SITES,RIVER_JOIN_VIEW} from './inland-geography.js';
import {nearConstructionPath} from './construction-learning.js';
import {terrainHeight,biomeIndex,nearestRoad,plots,decks,VOLCANO} from './large-world.js';
import {riverField,waterAt,waterPlatforms,nearestWaterTrail,waterStops,riverBridge} from './water-system.js';

export const plantLayers={canopy:'乔木',understory:'灌木',ground:'地被',aquatic:'水生'};
export const habitats={
 alpine:{name:'高山稀疏带',color:'#b6bb9d'},forest:{name:'林地与草坡',color:'#6e9b61'},
 riparian:{name:'淡水岸带',color:'#87b477'},marsh:{name:'浅水湿地',color:'#7baca1'},
 saline:{name:'盐湿岸带',color:'#b4a673'},dry:{name:'干旱地带',color:'#c8a27b'},
 bare:{name:'裸岩与陡坡',color:'#99968d'},water:{name:'深水留白',color:'#608fa3'}
};
export const plantTypes={
 forestOak:{name:'高冠林木',layer:'canopy',height:21},forestBirch:{name:'高冠桦形树',layer:'canopy',height:20},
 pine:{name:'山地针叶树',layer:'canopy',height:11},birch:{name:'溪岸桦形树',layer:'canopy',height:9},
 oak:{name:'阔叶乔木',layer:'canopy',height:11},willow:{name:'柳形湿岸树',layer:'canopy',height:8},
 coastPine:{name:'滨岸风塑松',layer:'canopy',height:9},palm:{name:'岛屿棕榈',layer:'canopy',height:8},
 dwarf:{name:'高山矮灌',layer:'understory',height:.65},fern:{name:'蕨形林下草本',layer:'understory',height:.8},
 shrub:{name:'林缘灌丛',layer:'understory',height:1.7},coastShrub:{name:'耐盐矮灌',layer:'understory',height:1.1},
 cactus:{name:'旱生肉质株',layer:'understory',height:2.3},dead:{name:'枯木',layer:'canopy',height:5},
 tuft:{name:'草丛',layer:'ground',height:.45},alpineTuft:{name:'高山短草',layer:'ground',height:.22},
 flowers:{name:'草甸花丛',layer:'ground',height:.35},moss:{name:'低矮苔垫',layer:'ground',height:.09},
 sedge:{name:'湿岸莎草',layer:'aquatic',height:.7},reed:{name:'挺水芦苇',layer:'aquatic',height:1.9},
 lily:{name:'浮叶植物',layer:'aquatic',height:.08},rush:{name:'盐湿草丛',layer:'aquatic',height:.55},
 seagrass:{name:'近岸沉水草',layer:'aquatic',height:.5}
};
export const hash=(x,z,seed=0)=>{const v=Math.sin(x*127.1+z*311.7+seed*73.13)*43758.5453;return v-Math.floor(v);};
export const VEGETATION_BAY_VIEW={x:-1440,z:-440};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

// Explicit art rules, shared by placement, the condition view and the explanation panel.
// Moisture and salt values are scene parameters; no climate or plant-growth simulation is implied.
export function environmentAt(x,z){
 const height=terrainHeight(x,z),slope=Math.hypot((terrainHeight(x+2,z)-terrainHeight(x-2,z))/4,(terrainHeight(x,z+2)-terrainHeight(x,z-2))/4);
 const biome=biomeIndex(x,z),river=glacialWaterField(x,z)||inlandField(x,z)||riverField(x,z),water=waterAt(x,z);
 const level=water?.level??(height<.15?0:river?.level??null),depth=level===null?-10:level-height;
 if(polarWeight(x,z)>.25)return {x,z,height,slope,biome,polar:true,forest:null,inlandRegion:'polar',river:null,level,depth,bank:Infinity,salt:water?.sea?1:0,moisture:.65,surface:depth>.04?'water':x> -180&&z> -1360?'tundra':'snow',habitat:depth>1.6?'water':depth>.04?'marsh':'alpine',dry:false};
 const bank=river?river.distance-river.half:Infinity;
 const salt=marineWeight(x,z)>.98?1:river?.fresh?0:river?clamp((river.t-.69)/.22):(height<14&&[0,3,9].includes(biome)?.85*Math.exp(-Math.max(0,height)/14):height<.15?1:0);
 const forest = forestField(x,z), region = inlandRegionAt(x,z);
 const legacyDry = [4,5,6,7].includes(biome) && !river && !region && marineWeight(x,z)<.98;
 const transition = forest || region || biome===9 ? 0 : ecotoneInfluence(x,z);
 const climate = transitionClimate(regionalClimate(x,z,height,bank),transitionAt(x,z));
 const legacyMoisture = clamp((legacyDry?.15:.48)+(river?Math.exp(-Math.max(0,bank)/32)*.5:0)+(biome===3?.22:0)-(slope>.7?.17:0));
 const moisture = clamp(legacyMoisture * (1-transition) + climate.moisture * transition);
 const dry = biome===7 && !river && volcanicReserved(x,z) || (transition>.45 ? moisture<.26 && !river : legacyDry);
 let surface=depth>.04?'water':height>174?'snow':slope>.9?'rock':forest&&forest.weight>.12?(forest.gap>.4?'grass':'litter'):region?(river&&bank<8?'mud':region.kind==='basin'&&slope>.4?'gravel':'grass'):biome===7&&transition<.45?'ash':dry?'gravel':salt>.35&&height<5?'sand':river&&bank<8?'mud':height>125?'gravel':'grass';
 let habitat=depth>1.6?'water':depth>.04?(salt>.35?'saline':'marsh'):slope>.9||Math.hypot(x-VOLCANO.x,z-VOLCANO.z)<VOLCANO.radius+7?'bare':height>170?'alpine':salt>.35&&height<7?'saline':moisture>.82&&bank<14?'marsh':river&&bank<55?'riparian':dry?'dry':'forest';
 return {x,z,height,slope,biome,forest,inlandRegion:region?.kind||null,river,level,depth,bank,salt,moisture,surface,habitat,dry,transition,warmth:climate.warmth};
}
export function candidateFor(e,layer,variation=.5){
 if(e.habitat==='bare'||iceField(e.x,e.z)?.normalized<1.12||snowDepthAt(e.x,e.z,e.height,e.slope)>.1)return null;
 if(layer==='canopy'){
  if(e.depth>-.38||e.slope>.65||e.height<.65||e.height>170)return null;
  if(e.salt>.35&&e.height<4.5)return null;
  if(e.dry)return e.biome===7&&variation<.14?'dead':null;
  if(e.forest){if(e.forest.gapDistance<FOREST_GAP.radius+7.4)return null;return variation<.23?'forestBirch':'forestOak';}
  if(e.biome===9&&!e.inlandRegion)return 'palm';
  if(e.salt>.35)return 'coastPine';
  if (e.transition > .45 && e.bank > 36) {
   if (e.moisture < .34 || e.warmth < .17) return null;
   const conifer = clamp(.72 - e.warmth) * .95 + clamp((e.height - 65) / 210);
   return variation < conifer ? 'pine' : e.warmth < .52 ? 'birch' : 'oak';
  }
  if(e.height>100)return 'pine';
  if(e.moisture>.8&&e.bank<36&&variation<.5)return 'willow';
  if(e.river&&e.bank<65)return variation<.53?'birch':'oak';
  return variation<.25?'pine':'oak';
 }
 if(layer==='understory'){
  if(e.depth>-.08||e.slope>.85)return null;
  if(e.forest)return e.forest.gap>.7?'shrub':variation<.7?'fern':'shrub';
  if(e.height>170)return e.slope<.4?'dwarf':null;
  if(e.salt>.35&&e.height<8)return 'coastShrub';
  if(e.dry)return e.biome===7?null:variation<.3?'cactus':'shrub';
  return e.moisture>.72&&e.height<110?'fern':e.height>125?'dwarf':'shrub';
 }
 if(layer==='ground'){
  if(e.depth>0||e.slope>.72||e.surface==='ash'||e.salt>.45&&e.height<2.1)return null;
  if(e.dry)return e.transition>.45&&variation<.22&&e.moisture>.09?'alpineTuft':null;
  if(e.forest)return e.forest.gap>.5?(variation>.5?'flowers':'tuft'):variation>.2?'moss':'tuft';
  if(e.height>170)return variation<.28?'moss':'alpineTuft';
  if(e.height>130)return 'alpineTuft';
  if(e.moisture>.8&&variation<.35)return 'moss';
  return variation>.84?'flowers':'tuft';
 }
 if(layer==='aquatic'){
  if(e.river?.glacial)return null;
  if(e.slope>.5||!Number.isFinite(e.level)||e.bank>22)return null;
  if(e.salt>.35){if(e.depth>=.18&&e.depth<1.3)return e.river?.t>.86||!e.river?'seagrass':null;return e.depth>-.6&&e.depth<.12?'rush':null;}
  if(!e.river||e.river.t<.28)return null;
  if(e.depth>.25&&e.depth<1.1&&e.river.t>.5&&e.river.t<.71)return 'lily';
  if(e.depth>.07&&e.depth<.8&&e.river.t>.43)return 'reed';
  return e.depth>-.65&&e.depth<.18?'sedge':null;
 }
 return null;
}

export function clearanceAt(x,z,layer){
 const leeGround=layer==='ground'&&x>= -575&&x< -318&&z>=1105&&z<1265&&transitionAt(x,z)?.id==='lee';
 if(northReserved(x,z)||linkReserved(x,z)||warmReserved(x,z)||borealReserved(x,z)||uplandReserved(x,z)||yardangReserved(x,z)||volcanicReserved(x,z)||fanReserved(x,z)||strataReserved(x,z)||saltReserved(x,z)||karstReserved(x,z)||geologyReserved(x,z)||drylandReserved(x,z)&&!leeGround||tropicalReserved(x,z)||oceanReserved(x,z)||polarReserved(x,z)||transportReserved(x,z)||productionReserved(x,z)||mountainReserved(x,z)||settlementReserved(x,z,layer==='canopy'?8:2))return false;
 if(x>58&&x<95&&Math.abs(z-340)<24&&caveVoidAt(x,terrainHeight(x,z),z))return false;
 const canopy=layer==='canopy',radius=canopy?5:layer==='understory'?1.5:.65;
 if(benchmarkNear(x,z,radius+1.8)!==null||lifePathVerge(x,z,radius+1.2))return false;
 if(nearConstructionPath(x,z,forestField(x,z)?(canopy?2.2:layer==='understory'?1.3:.75):canopy?7:radius+1))return false;
 if(Math.abs(x)>1880||Math.abs(z)>1510||nearestRoad(x,z,canopy?10:4.5))return false;
 if(plots.some(p=>Math.abs(x-p.x)<p.halfX+radius+2&&Math.abs(z-p.z)<p.halfZ+radius+2))return false;
 if(waterPlatforms.some(p=>Math.abs(x-p.x)<p.halfX+radius&&Math.abs(z-p.z)<p.halfZ+radius))return false;
 if(nearestWaterTrail(x,z))return false;const b=riverBridge,dx=x-b.x,dz=z-b.z;if(Math.abs(dx*b.nx+dz*b.nz)<b.length/2+radius&&Math.abs(dx*b.dx+dz*b.dz)<1.8+radius)return false;for(const d of decks){const dx=x-d.x,dz=z-d.z,c=Math.cos(d.angle),s=Math.sin(d.angle);if(Math.abs(dx*c-dz*s)<d.length/2+radius&&Math.abs(dx*s+dz*c)<d.width/2+radius)return false;}
 // Keep the human viewing position clear, with tall trunks set farther back.
 if([...waterStops,...INLAND_SITES,RIVER_JOIN_VIEW].some(r=>Math.hypot(x-r.x,z-r.z)<(canopy?12:layer==='understory'?5.5:1.5)))return false;
 if(FOREST_SITES.some(r=>Math.hypot(x-r.x,z-r.z)<(canopy?2.8:layer==='understory'?1.8:.8)))return false;
 if(Math.hypot(x-VEGETATION_BAY_VIEW.x,z-VEGETATION_BAY_VIEW.z)<(canopy?12:layer==='understory'?5.5:1.5))return false;
 return true;
}
export function placementAt(x,z,layer,seed=0){
 const e=environmentAt(x,z),v=hash(x,z,seed),kind=candidateFor(e,layer,v);
 if(!kind||!clearanceAt(x,z,layer))return null;
 // Broad clusters with small, deterministic holes instead of uniformly filled grids.
 const patch=.5+.25*Math.sin(x*.019+Math.sin(z*.013)*2)+.25*Math.cos(z*.024-x*.007);
 let density=e.forest?(layer==='canopy'?.04+e.forest.canopy*.9:layer==='understory'?(e.forest.gap>.6?.12:.18+e.forest.weight*.6):.45+e.forest.weight*.5):layer==='canopy'?.18+patch*.63:layer==='understory'?.13+patch*.55:layer==='aquatic'?.38+patch*.56:.35+patch*.6;
 if (e.transition > 0 && layer !== 'aquatic') {
  const cover = layer==='canopy'
   ? clamp((e.moisture-.27)/.48) * clamp((e.warmth-.12)/.30)
   : .25 + .75 * clamp((e.moisture-.08)/.56);
  density *= 1-e.transition*(1-cover);
 }
 if(hash(x,z,seed+7)>density)return null;
 return {x,z,y:kind==='lily'?e.level+.04:e.height-.035,kind,layer,scale:.72+hash(x,z,seed+4)*.55,rotation:hash(x,z,seed+3)*Math.PI*2,habitat:e.habitat};
}
const colorCache=new Map();
export function habitatColor(x,z){const ix=Math.floor(x/24),iz=Math.floor(z/24),key=ix+','+iz;if(!colorCache.has(key)){const e=environmentAt(ix*24+12,iz*24+12);colorCache.set(key,habitats[e.habitat].color);}return colorCache.get(key);}
export function surfaceName(surface){return {water:'水下床底',tundra:'苔原苔草覆盖',snow:'雪岩与碎砾',rock:'裸岩',ash:'火山灰岩',sand:'沙砾地',mud:'湿泥岸',gravel:'碎石薄土',grass:'草土覆盖',litter:'落叶林地'}[surface];}

export function* vegetationPlacements(){const treePoints=[];
 // Whole-world upper layers; jitter and continuous cluster fields break up the regular sampling lattice.
 for(const layer of ['canopy','understory']){const step=layer==='canopy'?23:27;for(let x=-1850;x<1850;x+=step)for(let z=-1490;z<1490;z+=step){const px=x+(hash(x,z,2)-.5)*step*.9,pz=z+(hash(x,z,3)-.5)*step*.9,p=forestField(px,pz)?null:placementAt(px,pz,layer,17);if(p){if(layer==='canopy')treePoints.push(p);yield p;}}}
 // At the reading stops, denser bank groves use the same habitat tests and retain trunk spacing.
 for(const r of [...waterStops.slice(0,5),VEGETATION_BAY_VIEW,...INLAND_SITES])for(let dx=-65;dx<=65;dx+=11)for(let dz=-65;dz<=65;dz+=11){const x=r.x+dx+(hash(dx,dz,71)-.5)*6,z=r.z+dz+(hash(dx,dz,72)-.5)*6,p=forestField(x,z)?null:placementAt(x,z,'canopy',73);if(p&&treePoints.every(q=>Math.hypot(q.x-x,q.z-z)>7)){treePoints.push(p);yield p;}}
 // A continuous forest, rather than four isolated patches. Shared rules keep the trail and canopy gap open.
 for(const layer of ['canopy','understory','ground']){const step=layer==='canopy'?7.5:layer==='understory'?4.5:3.5;for(let x=FOREST.x-FOREST.rx*1.15;x<=FOREST.x+FOREST.rx*1.15;x+=step)for(let z=FOREST.z-FOREST.rz*1.15;z<=FOREST.z+FOREST.rz*1.15;z+=step){const px=x+(hash(x,z,111)-.5)*step*.55,pz=z+(hash(x,z,112)-.5)*step*.55;if(!forestField(px,pz))continue;const p=placementAt(px,pz,layer,113);if(p){if(layer==='canopy'){p.scale=.92+hash(px,pz,114)*.28;treePoints.push(p);}yield p;}}}
 // Ground and water-edge communities, sampled in a corridor wide enough to include both banks.
 const cells=new Set();
 for(let x=-1800;x<850;x+=5.5)for(let z=-650;z<850;z+=5.5){const px=x+(hash(x,z,51)-.5)*4.5,pz=z+(hash(x,z,53)-.5)*4.5,q=inlandField(px,pz)||riverField(px,pz);if(!q||q.distance>q.half+92)continue;const key=Math.floor(px/4)+','+Math.floor(pz/4);if(cells.has(key))continue;cells.add(key);for(const layer of ['ground','aquatic']){const p=forestField(px,pz)?null:placementAt(px,pz,layer,37);if(p)yield p;}}
 // Ground cover between the southern forest edge and the lee-side foothills.
 for(const {points,width} of transitionBelts){
  const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
  for(let x=Math.min(...xs)-width;x<Math.max(...xs)+width;x+=8){
   for(let z=Math.min(...zs)-width;z<Math.max(...zs)+width;z+=8){
    const px=x+(hash(x,z,233)-.5)*6,pz=z+(hash(x,z,234)-.5)*6;
    const belt=transitionAt(px,pz),key=Math.floor(px/4)+','+Math.floor(pz/4);
    if(!belt||belt.strength<.2||cells.has(key)||forestField(px,pz)||hash(px,pz,239)>belt.strength)continue;
    const plant=placementAt(px,pz,'ground',241);
    if(!plant)continue;
    cells.add(key);
    yield {...plant,transitionBelt:belt.id};
   }
  }
 }
 for (let x=-1080; x<660; x+=11) for (let z=680; z<1440; z+=11) {
  const px=x+(hash(x,z,131)-.5)*8, pz=z+(hash(x,z,132)-.5)*8;
  if (ecotoneInfluence(px,pz)<.55 || !clearanceAt(px,pz,'ground')) continue;
  const key=Math.floor(px/4)+','+Math.floor(pz/4);
  if (cells.has(key)) continue;
  const p=placementAt(px,pz,'ground',133);
  if (p) {cells.add(key);yield p;}
 }
 // A closer reading patch at each stop still has to pass exactly the same habitat rules.
 for(const r of [...waterStops.slice(0,5),VEGETATION_BAY_VIEW,...INLAND_SITES])for(let dx=-40;dx<=40;dx+=3.2)for(let dz=-40;dz<=40;dz+=3.2){const x=r.x+dx+(hash(dx,dz,91)-.5)*2,z=r.z+dz+(hash(dx,dz,92)-.5)*2,key=Math.floor(x/3)+','+Math.floor(z/3);if(cells.has(key))continue;cells.add(key);for(const layer of ['understory','ground','aquatic']){if(layer==='understory'&&hash(x,z,93)>.13)continue;const p=forestField(x,z)?null:placementAt(x,z,layer,41);if(p)yield p;}}

}

export function countNear(records,x,z,radius=130){const counts={canopy:0,understory:0,ground:0,aquatic:0};for(const p of records)if(Math.hypot(p.x-x,p.z-z)<radius)counts[p.layer]++;return counts;}

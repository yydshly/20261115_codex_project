import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);

const THREE=await import('three');
const {terrainHeight}=await import('../web/large-world.js');
const {waterAt}=await import('../web/water-system.js');
const {borealObjects}=await import('../web/boreal-layout.js');
const {tropicalHabitat}=await import('../web/tropical-layout.js');
const {getWorldAnnualModel}=await import('../web/annual-climate-scene.js');
const {environmentLines,sampleLine,terrainBoundaries,stopClimate,pointAt}=await import('../web/environment-lines.js');
const {buildWorldWaterBalance}=await import('../web/watershed-world.js');
const {monthlyWind}=await import('../web/annual-climate.js');
const {transitionAt,transitionBelts}=await import('../web/environment-transitions.js');
const {vegetationPlacements,clearanceAt}=await import('../web/vegetation-rules.js');
const {createEnvironmentLinesScene,lineThemes}=await import('../web/environment-lines-scene.js');
const {buildGeographicFoundation,getGeographicFoundation,foundationScale,foundationWind}=await import('../web/geographic-foundation.js');
const {geographyLegs,reliefBelts}=await import('../web/regional-geography.js');
const {planBounds}=await import('../web/world-logic-data.js');

const climate=getWorldAnnualModel(),world=buildWorldWaterBalance(climate);
const routes=environmentLines.map(r=>sampleLine(r,terrainHeight));
assert.deepEqual(routes.map(r=>r.stations.length),[8,7,7]);
for(const route of routes){
  assert.ok(route.length>1600&&route.points.length>150);
  assert.ok(route.stations.every((station,i)=>!i||route.stations[i-1].at<station.at));
  assert.ok(route.points.every(p=>[p.x,p.y,p.z,p.level].every(Number.isFinite)));
  const sample=pointAt(route.points,route.stations[2].at);
  assert.ok(Math.hypot(sample.x-route.stations[2].p.x,sample.z-route.stations[2].p.z)<8);
}
const [water,warmth,inland]=routes;
assert.ok(water.points.every((p,i)=>!i||p.level<=water.points[i-1].level+1e-7));
assert.ok(water.stations.at(-1).level<1&&water.stations[0].level>350);
const look=(route,station,month)=>stopClimate(climate,climate.frames[month-1],route.stations[station]);
assert.ok(look(warmth,0,1).warmth<look(warmth,6,1).warmth-.3);
assert.ok(look(warmth,1,1).warmth<look(warmth,0,1).warmth);
assert.ok(look(inland,2,7).wetness>look(inland,5,7).wetness+.4);
assert.ok(look(inland,2,7).rain>look(inland,4,7).rain);
assert.ok(look(inland,6,7).wetness>look(inland,5,7).wetness+.3);
assert.ok(look(inland,3,7).rain>look(inland,3,1).rain);
assert.ok(monthlyWind(1).dz>0&&monthlyWind(7).dz<0);

const {coast,divides,localDivides}=terrainBoundaries(world);
assert.ok(coast.length>200&&divides.length>80);
assert.ok(localDivides.some(([a,b])=>Math.hypot((a.x+b.x)/2+625,(a.z+b.z)/2-1107)<110));
assert.equal(world.frames[6].records.salt.outflow,0);
const foundation=buildGeographicFoundation(world);
assert.equal(foundation.routes,environmentLines);
assert.equal(foundation.ridges,reliefBelts);
assert.deepEqual(foundation.coast,{coast,divides,localDivides});
assert.deepEqual(getGeographicFoundation().coast,foundation.coast);
assert.deepEqual([foundationScale.width,foundationScale.depth,foundationScale.length],[3840,3120,1000]);
assert.equal(foundation.grid.step,40);
assert.ok(['central','south','closed'].every(id=>foundation.basins.includes(id)));
assert.deepEqual(foundation.seams.map(s=>s.id),['north','south','west','east']);
for(const seam of foundation.seams){
  assert.equal(seam.view,geographyLegs.find(leg=>leg.id===seam.id).view);
  assert.ok(seam.x>=planBounds.minX&&seam.x<=planBounds.maxX&&seam.z>=planBounds.minZ&&seam.z<=planBounds.maxZ);
  assert.ok(seam.lines.every(id=>environmentLines.some(line=>id===line.id)));
}
const winterWind=foundationWind(1).arrows[0],summerWind=foundationWind(7).arrows[0],
  southeast=foundationWind(7).arrows.find(a=>a.text?.includes('东南'));
assert.ok(winterWind.dx>0&&winterWind.dz>0&&summerWind.dx>0&&summerWind.dz<0);
assert.ok(southeast.dx<0&&southeast.dz<0);
const northSlope=[-815,-780,-745].map(z=>terrainHeight(-1080,z));
assert.ok(northSlope[0]>30&&northSlope[1]-northSlope[0]<25&&northSlope[2]>northSlope[0]);
assert.ok(borealObjects().trees.filter(p=>p.zone===-1).length>35);
assert.ok(tropicalHabitat(-860,1120).cover>tropicalHabitat(-630,1120).cover+.5);
assert.ok(terrainHeight(-465,1177)<terrainHeight(-465,1205)-1);
for(const z of [200,480]){
  assert.ok(terrainHeight(-1520,z)>terrainHeight(-1480,z)+10);
  assert.ok(terrainHeight(-1480,z)>24&&terrainHeight(-1370,z)>190);
}
for(const frame of world.frames){
  assert.equal(frame.records.salt.outflow,0);
  assert.equal(frame.records.saltMarsh.outflow,0);
}
const eastSamples=[370,450,515,585,650,805];
const eastHeights=eastSamples.map(z=>terrainHeight(1660,z));
assert.ok(eastHeights.every((h,i)=>h<0&&(!i||h<eastHeights[i-1])));
assert.ok(eastSamples.every(z=>waterAt(1660,z).level===0));
const bcounts={};
for(const {transitionBelt,x,y,z} of vegetationPlacements()){
  if(!transitionBelt)continue;
  assert.equal(transitionAt(x,z).id,transitionBelt);
  assert.ok(clearanceAt(x,z,'ground')&&Math.abs(y-terrainHeight(x,z))<.04);
  bcounts[transitionBelt]=(bcounts[transitionBelt]??0)+1;
}
assert.ok(transitionBelts.every(b=>bcounts[b.id]>25));

const scene=new THREE.Scene(),waterCalls=[],sea=new THREE.Mesh();
const originalSea=sea.geometry;
const display=createEnvironmentLinesScene(scene,{model:world,show(...args){waterCalls.push(args);},
  hide(){waterCalls.push('restored');}},sea);
const enabled=new Set(lineThemes.map(t=>t.id));
const first=display.show(null,null,7,enabled);
assert.ok(first.annotations.some(p=>p.text.includes('西南湿风')));
assert.ok(first.annotations.some(p=>p.text==='1 km')&&first.annotations.some(p=>p.text.includes('N 北')));
const second=display.show(inland,inland.stations[3],1,new Set(['divide']));
assert.ok(second.annotations.some(p=>p.text==='南部山脊')&&second.annotations.every(p=>p.kind!=='wind'));
const root=scene.getObjectByName('three environmental transects');
root.traverse(o=>{if(o.geometry)assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));});
display.hide();
assert.ok(!root.visible);
assert.deepEqual(waterCalls,[[7,'all','water'],[1,'all','water'],'restored']);
for(const seam of foundation.seams){
  const {annotations,section}=display.show(null,null,1,enabled,seam);
  assert.ok(annotations.some(p=>p.kind==='seam'&&p.text===seam.name&&p.x===seam.x&&p.z===seam.z));
  assert.ok(section.points.length>25&&section.points.every(p=>p.y===terrainHeight(p.x,p.z)));
  assert.equal(root.getObjectByName(seam.name).visible,true);
}
const east=foundation.seams.find(s=>s.id==='east');
display.show(null,null,7,enabled,east,true);
assert.notEqual(sea.geometry,originalSea);
assert.equal(sea.visible,true);
display.hide();
assert.equal(sea.geometry,originalSea);
console.log(JSON.stringify({
  routes:routes.map(r=>({name:r.name,stops:r.stations.length,metres:Math.round(r.length)})),
  coastlineEdges:coast.length,divideEdges:divides.length,localDivideEdges:localDivides.length,transitionPlants:bcounts,
  northernColdToSouthernWarm:[look(warmth,0,1).warmth,look(warmth,6,1).warmth],
  windwardAndGobiMoisture:[look(inland,2,7).wetness,look(inland,5,7).wetness],
  oasisMoisture:look(inland,6,7).wetness
},null,2));

import assert from 'node:assert/strict';
import {register} from 'node:module';

register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('three');
const {terrainHeight}=await import('../web/large-world.js');
const {environmentLines}=await import('../web/environment-lines.js');
const {modern}=await import('../web/environment-catalog.js');
const {LAVA_CRATER}=await import('../web/volcanic-layout.js');
const {environmentGeology,rockBand,tectonicLayers,tectonicProfile}=await import('../web/tectonic-layout.js');
const {createTectonicScene}=await import('../web/tectonic-scene.js');
const {drawTectonicSection}=await import('../web/tectonic-section-plot.js');
const {tectonicView}=await import('../web/tectonic-ui.js');
const {planCameraPose}=await import('../web/world-logic-data.js');
const {bedrockAt}=await import('../web/groundwater-layout.js');
const {riverField,riverSample,waterAt}=await import('../web/water-system.js');
const profile=tectonicProfile(terrainHeight);
const {stations,points,slab}=profile;
const [trench,margin,forearc,volcano,fault,fold,ridge]=stations;
const [weathering,saddle,incision,confluence,valley]=stations.slice(7);

assert.ok(trench.y< -280&&trench.y<terrainHeight(trench.x-50,trench.z)-60);
assert.ok(trench.y<margin.y&&margin.y<0&&forearc.y>0);
assert.deepEqual([volcano.x,volcano.z],[LAVA_CRATER.x,LAVA_CRATER.z]);
assert.ok(ridge.y>fault.y&&ridge.y>fold.y&&ridge.y>volcano.y);
assert.equal(slab[0].top,trench.y);
assert.ok(points.every((p,i)=>i===0||p.distance>points[i-1].distance));
assert.ok(stations.every((p,i)=>i===0||p.at>stations[i-1].at));
assert.ok(slab.every((p,i)=>i===0||p.top<slab[i-1].top));
assert.ok(profile.arcBase.distance-volcano.at<10);
assert.equal(stations.length,12);
assert.ok(profile.length>6600&&profile.length<7000);
assert.equal(slab.at(-1).distance,ridge.at);
assert.equal(trench.rock,'offshore');
assert.equal(volcano.rock,'volcanic');
assert.equal(fault.rock,'layered');
assert.equal(fold.rock,bedrockAt(fold.x,fold.z));
assert.equal(weathering.rock,'crystalline');
assert.equal(weathering.cover,'residual');
assert.ok(weathering.coverDepth>saddle.coverDepth);
assert.equal(incision.cover,'bare');
assert.equal(valley.cover,'alluvium');
assert.equal(valley.rock,'layered');
assert.ok(incision.waterLevel>confluence.waterLevel&&confluence.waterLevel>valley.waterLevel);
for(const p of points){
  assert.equal(p.y,terrainHeight(p.x,p.z));
  assert.ok(p.waterLevel===null||p.waterLevel>=p.y);
}
assert.equal(Math.round(profile.crossSection.length),160);
const cross=profile.crossSection.points;
assert.equal(cross[40].y,valley.y);
assert.ok(cross[0].y>valley.waterLevel&&cross.at(-1).y>valley.waterLevel);
assert.ok(cross.some(p=>p.cover==='alluvium'&&p.waterLevel===null));

for(const [width,height] of [[380,750],[638,871],[877,871],[1024,768],[1440,900]]){
  const [x,z,y,d,azimuth]=tectonicView(null,true,width),pose=planCameraPose(width,height);
  const framing=width<900?1.24:1;
  const camera=new THREE.PerspectiveCamera(width<650?72:64,width/height,.08,14000);
  camera.setViewOffset(width,height,pose.offsetX,pose.offsetY,width,height);
  camera.position.set(x+d*Math.cos(azimuth)*.69*framing,y+d*.87*framing,z+d*Math.sin(azimuth)*.69*framing);
  camera.lookAt(x,y,z);camera.updateMatrixWorld();
  for(const s of [trench,volcano,ridge,valley]){
    const p=new THREE.Vector3(s.x,s.y+26,s.z).project(camera);
    const u=(p.x+1)*width/2,v=(1-p.y)*height/2;
    assert.ok(u>42&&u<width-(width<900?42:375)&&v>75&&v<(width<900?height*.56:height-30),
      `${s.id} annotation fits the clear map area at ${width}px (${u.toFixed(1)}, ${v.toFixed(1)})`);
  }
}
assert.equal(modern.find(entry=>entry.title.includes('板块边界')).href,'expedition.html?plan=tectonics#build-1');

const exposed=rockBand('fault',3,0,1),raised=rockBand('fault',3,1,0);
assert.ok(raised.x<exposed.x&&raised.y>exposed.y);
const folded=[0,.25,.5,.75,1].map(t=>rockBand('fold',3,0,t).y);
assert.ok(folded[1]>folded[0]&&folded[1]>folded[2]&&folded[3]<folded[2]&&folded[3]<folded[4]);
for(const route of environmentLines){
  const links=environmentGeology[route.id];
  assert.ok(links.overview);
  for(const [id,[focus]] of Object.entries(links)){
    assert.ok(id==='overview'||route.stops.some(p=>p.id===id));
    assert.ok(stations.some(p=>p.id===focus));
  }
}

const scene=new THREE.Scene(),sea=new THREE.Mesh(),layers=new Set(tectonicLayers.map(l=>l.id));
const geology=createTectonicScene(scene,sea);
const sectionLayers=new Set(['rock','cover','water']);
const [seafloor]=geology.show({layers,hideSea:true});
assert.equal(sea.visible,false);
geology.show({layers,station:valley,hideSea:false,sectionLayers});
const cover=scene.getObjectByName('continuous section cover land');
const waterStrip=scene.getObjectByName('continuous section water land');
assert.ok(cover.parent.visible&&waterStrip.parent.visible);
assert.ok(cover.geometry.attributes.position.count>1000&&waterStrip.geometry.attributes.position.count>100);
assert.equal(scene.getObjectByName('continuous section rock sea floor').visible,false);
const arrows=[];
scene.traverse(object=>{if(object.name==='flow along the central river')arrows.push(object);});
assert.ok(arrows.length>=8);
for(const arrow of arrows){
  const {x,z,y}=arrow.position,river=riverField(x,z);
  const direction=new THREE.Vector3(0,1,0).applyQuaternion(arrow.quaternion);
  assert.ok(river&&river.branch===0&&river.normalized<.025);
  assert.ok(Math.abs(waterAt(x,z).level+6-y)<.01);
  const flow=riverSample(river.t);
  assert.ok(direction.x*flow.dx+direction.z*flow.dz>.98);
}
geology.show({layers,station:trench,hideSea:true,sectionLayers:new Set(['rock'])});
assert.equal(cover.parent.visible,false);
assert.equal(waterStrip.parent.visible,false);
assert.equal(scene.getObjectByName('continuous section rock sea floor').visible,true);
geology.hide();

// Run the real canvas draw entry point for both scales and the river cross section.
const moves=[],finite=(...coords)=>{assert.ok(coords.every(Number.isFinite));moves.push(coords);};
const canvas={width:480,height:226,getContext:()=>({
  beginPath(){},closePath(){},clearRect:finite,fillRect:finite,moveTo:finite,lineTo:finite,
  rect:finite,clip(){},save(){},restore(){},fill(){},stroke(){},setLineDash(){},arc:finite,
  fillText(text,x,y){assert.ok(text);finite(x,y);}
})};
assert.equal(drawTectonicSection(canvas,profile,null,sectionLayers,true,false).last,profile.length);
assert.equal(Math.round(drawTectonicSection(canvas,profile,valley,sectionLayers,true,true).last),160);
assert.ok(drawTectonicSection(canvas,profile,weathering,sectionLayers,false,true).first>0);
assert.ok(moves.length>1200);
assert.ok(seafloor.y<0);
const [surface]=geology.show({layers});
assert.equal(sea.visible,true);
assert.ok(surface.y>0);
const annotations=geology.show({layers:new Set(['fold']),hideSea:true});
assert.deepEqual(annotations.map(p=>p.id),['fault','fold','ridge']);
geology.hide();
assert.equal(sea.visible,true);
assert.equal(scene.children[0].visible,false);
sea.visible=false;
geology.show({layers,hideSea:true});
geology.hide();
assert.equal(sea.visible,false);
scene.traverse(o=>{
  if(o.geometry?.attributes.position)assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));
});
console.log('The continuous 12-stop profile, cross-section, scene layers, canvas, framing, and legacy geology links passed.');

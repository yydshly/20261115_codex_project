import assert from 'node:assert/strict';
import {register} from 'node:module';
import {writeFileSync} from 'node:fs';
import {coastDive,coastRead,coastStops,divePoseClear} from '../web/coast-sea.js';
import {ventRoutes,ventView} from '../web/fluid-vents.js';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('three');
const {WorldViewControls,MiniMapView,overviewMode}=await import('../web/view-controls.js');
class Target{
 constructor(){this.listeners=new Map();this.capture=new Set();this.style={};this.clientWidth=1000;this.clientHeight=800;}
 addEventListener(type,fn,options){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);if(options?.capture)this.capture.add(fn);}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);this.capture.delete(fn);}
 fire(type,fields={}){const e={type,target:this,pointerId:1,pointerType:'mouse',button:0,clientX:100,clientY:100,pageX:100,pageY:100,ctrlKey:false,shiftKey:false,metaKey:false,deltaMode:0,preventDefault(){this.prevented=true;},stopPropagation(){},stopImmediatePropagation(){this.stopped=true;},...fields};const listeners=[...(this.listeners.get(type)||[])].sort((a,b)=>Number(this.capture.has(b))-Number(this.capture.has(a)));for(const fn of listeners){fn(e);if(e.stopped)break;}return e;}
 getRootNode(){return this.ownerDocument;}
 setPointerCapture(){}releasePointerCapture(){}hasPointerCapture(){return true;}
 getBoundingClientRect(){return {left:0,top:0,width:1000,height:800};}
 closest(){return null;}
}
const document=new Target(),canvas=new Target();canvas.ownerDocument=document;document.ownerDocument=document;
const camera=new THREE.PerspectiveCamera(64,1000/800,.1,12000),homePosition=new THREE.Vector3(-1050,2300,700),homeTarget=new THREE.Vector3(-1180,40,-900),player=new THREE.Vector3(-990,46,-1010),playerBefore=player.clone();
camera.position.copy(homePosition);camera.lookAt(homeTarget);const view=new WorldViewControls(camera,canvas);
camera.position.copy(homePosition);camera.lookAt(homeTarget);view.afterCamera('linkOverview:north-fan',player);const startDistance=camera.position.distanceTo(view.orbit.target);
canvas.fire('wheel',{deltaY:-120});const zoomDistance=camera.position.distanceTo(view.orbit.target);assert.ok(zoomDistance<startDistance,'actual OrbitControls wheel zooms in');
canvas.fire('pointerdown');canvas.fire('pointermove',{clientX:250,clientY:145,pageX:250,pageY:145});canvas.fire('pointerup');const rotatedPosition=camera.position.clone();assert.ok(rotatedPosition.distanceTo(homePosition)>100,'left drag rotates real camera');
// Simulate the authored preset trying to reset the camera on the next animation frame.
camera.position.copy(homePosition);camera.lookAt(homeTarget);view.afterCamera('linkOverview:north-fan',player);assert.ok(camera.position.distanceTo(rotatedPosition)<1e-7,'preset does not erase mouse movement');
const targetBefore=view.orbit.target.clone();canvas.fire('pointerdown',{button:2});canvas.fire('pointermove',{button:2,clientX:160,clientY:155,pageX:160,pageY:155});canvas.fire('pointerup',{button:2});assert.ok(view.orbit.target.distanceTo(targetBefore)>1,'right drag pans actual focus');
const keyboardBefore=view.orbit.target.clone();document.fire('keydown',{code:'ArrowRight',target:canvas});document.fire('keyup',{code:'ArrowRight'});assert.ok(view.orbit.target.distanceTo(keyboardBefore)>1,'arrow pans overview without moving player');
const typingBefore=view.orbit.target.clone();document.fire('keydown',{code:'ArrowRight',target:{closest:()=>({})}});assert.ok(view.orbit.target.distanceTo(typingBefore)<1e-9,'editing a panel does not pan map');
view.reset();assert.ok(camera.position.distanceTo(view.home.position)<1e-7);assert.ok(Math.abs(camera.position.distanceTo(view.orbit.target)-startDistance)<1e-7,'reset restores fitted overview');
view.zoom(10000);assert.ok(camera.position.distanceTo(view.orbit.target)<=camera.far*.65+1e-7,'zooming out must stay inside the render distance');view.reset();
const touchBefore=camera.position.distanceTo(view.orbit.target);canvas.fire('pointerdown',{pointerType:'touch',pointerId:11});canvas.fire('pointerdown',{pointerType:'touch',pointerId:12,clientX:200,pageX:200});canvas.fire('pointermove',{pointerType:'touch',pointerId:12,clientX:300,pageX:300});canvas.fire('pointerup',{pointerType:'touch',pointerId:11});canvas.fire('pointerup',{pointerType:'touch',pointerId:12});assert.ok(camera.position.distanceTo(view.orbit.target)<touchBefore,'two-finger pinch zooms actual camera');
const changedPreset=new THREE.Vector3(400,1000,500);camera.position.copy(changedPreset);camera.lookAt(0,50,0);view.afterCamera('linkOverview:north-fan',player);assert.ok(camera.position.distanceTo(changedPreset)<1e-7,'an intentional authored view change replaces the orbit home');view.zoom(.8);view.reset();assert.ok(camera.position.distanceTo(changedPreset)<1e-7);

// Repaint the authored map pose each frame, just as the history panel does.
const studyButton={closest:query=>query.includes('#world-plan-panel')?{}:null};
const formField={closest:query=>query.includes('select')?{}:null};
function authorOverview(dt=0){
 camera.position.copy(changedPreset);
 camera.lookAt(0,50,0);
 view.afterCamera('planOverview',player,null,dt);
}
authorOverview();
const focusAtStation=view.orbit.target.clone(),stationDistance=view.home.distance;
for(const code of ['KeyW','ArrowRight']){
 const before=view.orbit.target.clone();
 const e=document.fire('keydown',{code,target:studyButton});
 assert.ok(e.prevented,'a focused comparison button still allows map controls');
 for(let frame=0;frame<15;frame++)authorOverview(.04);
 assert.ok(view.orbit.target.distanceTo(before)>40,'holding '+code+' pans over multiple frames');
 document.fire('keyup',{code});
 const stopped=view.orbit.target.clone();
 authorOverview(.04);
 assert.ok(view.orbit.target.distanceTo(stopped)<1e-7,'releasing '+code+' stops movement');
}
document.fire('keydown',{code:'KeyQ',target:studyButton});
for(let frame=0;frame<10;frame++)authorOverview(.04);
document.fire('keyup',{code:'KeyQ'});
const closer=camera.position.distanceTo(view.orbit.target);
assert.ok(closer<stationDistance*.7,'Q zooms in while held');
document.fire('keydown',{code:'KeyE',target:studyButton});
for(let frame=0;frame<10;frame++)authorOverview(.04);
document.fire('keyup',{code:'KeyE'});
assert.ok(camera.position.distanceTo(view.orbit.target)>closer*1.4,'E zooms out while held');
document.fire('keydown',{code:'KeyW',target:studyButton});
document.fire('focusin',{target:formField});
const focusWhileEditing=view.orbit.target.clone();
for(let frame=0;frame<10;frame++)authorOverview(.04);
assert.ok(view.orbit.target.distanceTo(focusWhileEditing)<1e-7,'entering a form field releases camera keys');
const fieldArrow=document.fire('keydown',{code:'ArrowDown',target:formField});
assert.ok(!fieldArrow.prevented,'a select keeps its own arrow keys');
document.fire('keydown',{code:'KeyR',target:studyButton});
authorOverview();
assert.ok(view.orbit.target.distanceTo(focusAtStation)<1e-7&&Math.abs(view.home.distance-stationDistance)<1e-7,
 'R resets the overview while a button has focus');

const diveSites=coastStops.flatMap(site=>{
 const pose=coastDive(site,coastRead(site,'high'));
 return pose?[[site,pose]]:[];
}).concat(ventRoutes.ocean.stops.map(site=>[site,ventView(site,'ocean')[5]]));
view.diveClear=divePoseClear;
for(const [site,pose] of diveSites){
 const dive={target:[site.x,pose.targetY,site.z],surface:pose.surface,deep:pose.deep};
 const start=new THREE.Vector3(pose.x,pose.y,pose.z);
 const author=(dt=0)=>{camera.position.copy(start);camera.lookAt(...dive.target);view.afterCamera('planOverview',player,dive,dt);};
 const wet=()=>assert.ok(divePoseClear(camera.position,view.orbit.target,dive.surface),site.id+' remains underwater with a clear sightline');
 author();
 assert.ok(camera.position.distanceTo(start)<1e-7,site.id+' opens at the authored dive camera');
 assert.ok(view.orbit.target.distanceTo(new THREE.Vector3(...dive.target))<1e-7);
 const startFov=camera.fov;
 canvas.fire('wheel',{deltaY:120});assert.ok(camera.fov>startFov);assert.ok(camera.position.distanceTo(start)<1e-7);
 assert.ok(view.orbit.maxDistance<start.distanceTo(view.orbit.target)*1.27);
 for(let i=0;i<6;i++)canvas.fire('wheel',{deltaY:180});
 assert.equal(camera.fov,80);wet();
 canvas.fire('pointerdown');canvas.fire('pointermove',{clientX:134,clientY:100,pageX:134,pageY:100});canvas.fire('pointerup');
 assert.ok(camera.position.distanceTo(start)>.02,site.id+' accepts a small rotate');
 wet();
 const rotated=camera.position.clone();author();assert.ok(camera.position.distanceTo(rotated)<1e-7);
 for(const button of [0,2]){
  canvas.fire('pointerdown',{button});canvas.fire('pointermove',{button,clientX:890,clientY:727,pageX:890,pageY:727});canvas.fire('pointerup',{button});
  wet();
 }
 view.reset();assert.ok(camera.position.distanceTo(start)<1e-7);assert.equal(camera.fov,64);

 const heading=view.orbit.target.clone().sub(start).setY(0).normalize();
 const focusedButton={closest:query=>query.includes('#world-plan-panel')?{}:null};
 const forward=document.fire('keydown',{code:'KeyW',target:focusedButton});
 assert.ok(forward.prevented,'a focused plan button must not swallow underwater movement');
 for(let i=0;i<25;i++){author(.04);wet();}
 const travelled=camera.position.clone().sub(start).dot(heading);
 assert.ok(travelled>.35,site.id+' swims forward while W is held');
 document.fire('keyup',{code:'KeyW'});
 const stopped=camera.position.clone();author(.04);assert.ok(camera.position.distanceTo(stopped)<1e-7,'keyup stops movement');
 document.fire('keydown',{code:'KeyA',target:{closest:()=>({})}});
 author(.04);assert.ok(camera.position.distanceTo(stopped)<1e-7,'selects and other inputs retain their keys');
 const focusBefore=stopped.clone();
 document.fire('keydown',{code:'ArrowRight',target:canvas});
 for(let i=0;i<12;i++)author(.04);
 document.fire('keyup',{code:'ArrowRight'});
 assert.ok(camera.position.distanceTo(focusBefore)>.12,site.id+' strafes with the arrow key');
 wet();
 document.fire('keydown',{code:'KeyR',target:canvas});
 const y=camera.position.y;
 document.fire('keydown',{code:'KeyQ',target:canvas});
 for(let i=0;i<25;i++){author(.04);wet();}
 document.fire('keyup',{code:'KeyQ'});
 assert.ok(camera.position.y<y-.12,site.id+' descends without crossing the seabed');
 const lower=camera.position.y;
 document.fire('keydown',{code:'KeyE',target:canvas});
 for(let i=0;i<140;i++){author(.04);wet();}
 document.fire('keyup',{code:'KeyE'});
 assert.ok(camera.position.y>lower+.12,site.id+' ascends without crossing the water surface');
 document.fire('keydown',{code:'KeyR',target:canvas});
 assert.ok(camera.position.distanceTo(start)<1e-7&&camera.fov===64,'R restores dive station and lens');
}

camera.position.set(player.x,player.y+1.72,player.z);camera.lookAt(player.x,player.y+1.72,player.z-10);view.afterCamera(null,player);const feetCamera=camera.position.clone(),fov=camera.fov;canvas.fire('wheel',{deltaY:-100});assert.ok(camera.fov<fov);assert.ok(camera.position.distanceTo(feetCamera)<1e-9,'ground zoom changes lens, not physical position');view.reset();assert.equal(camera.fov,64);assert.ok(player.distanceTo(playerBefore)<1e-9,'all camera gestures preserve player position');
const mini=new MiniMapView(),map=new THREE.OrthographicCamera(-2000,2000,1600,-1600,.1,12000);map.position.set(0,4000,2400);map.lookAt(0,0,0);const mapHome=map.position.clone();mini.apply(map,player);const a=new THREE.Vector3(player.x+100,player.y,player.z).project(map),b=new THREE.Vector3(player.x,player.y,player.z).project(map),before=a.distanceTo(b);mini.setZoom(2);mini.apply(map,player);const c=new THREE.Vector3(player.x+100,player.y,player.z).project(map),d=new THREE.Vector3(player.x,player.y,player.z).project(map);assert.ok(Math.abs(c.distanceTo(d)/before-2)<1e-7,'minimap magnifies real projected geometry');assert.ok(Math.abs(d.x)<1e-7&&Math.abs(d.y)<1e-7,'zoomed minimap focuses player');mini.apply(map,player);const stable=map.position.clone();mini.apply(map,player);assert.ok(map.position.distanceTo(stable)<1e-9,'mini focus does not drift');mini.setZoom(1);mini.apply(map,player);assert.ok(map.position.distanceTo(mapHome)<1e-9);assert.equal(mini.setZoom(100),4);assert.equal(mini.setZoom(0),.65);
assert.equal(overviewMode({linkOverview:true},'north-fan'),'linkOverview:north-fan');assert.equal(overviewMode({planOverview:true}),'planOverview');assert.equal(overviewMode({}),null);
const result={result:'passed',date:'2026-11-18',actualOrbitControlsVersion:'0.180.0',mouseWheel:true,leftDragRotate:true,rightDragPan:true,touchPinch:true,keyboardPan:true,panelEditingProtected:true,poseSurvivesPresetFrames:true,intentionalPresetChangesRespected:true,resetFitsOverview:true,zoomOutInsideFarClip:true,groundZoomPreservesPosition:true,miniProjectionMagnification:2,miniPlayerFocus:true,miniReset:true,limits:'Actual Three.js controls and projection with a synthetic DOM event target; native browser mouse/scroll and layout acceptance are separate.'};writeFileSync(new URL('../assets/view-controls-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

import * as THREE from 'three';
import {OrbitControls} from './runtime/OrbitControls.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const scaleFov=(fov,factor,min,max)=>clamp(
 THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(fov/2))*factor)),min,max
);
const movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','KeyE','KeyQ']);
const keyboardFields='input,select,textarea,[contenteditable]:not([contenteditable="false"]),dialog';
const flags=['mainlineSea','planOverview','linkOverview','warmOverview','borealOverview','uplandOverview','yardangOverview','volcanicOverview','fanOverview','strataOverview','saltOverview','karstOverview','geologyOverview','geologyBridgeView','drylandOverview','tropicalOverview','oceanOverview','polarOverview','transportOverview','productionOverview','mountainOverview','caveOverview','marineOverview','townOverview','overview'];
export function overviewMode(state,kind='highland'){const key=flags.find(k=>state[k]);return key?key+(key==='linkOverview'?':'+kind:''):null;}

export class WorldViewControls{
 constructor(camera,canvas,{baseFov=()=>64,onInteract=()=>{},diveClear=()=>true}={}){
  this.camera=camera;this.canvas=canvas;this.baseFov=baseFov;this.onInteract=onInteract;this.diveClear=diveClear;
  this.mode=null;this.dive=null;this.diveFov=null;this.groundFov=baseFov();this.pose=null;this.home=null;this.preset=null;
  this.keys=new Set();this.diveBlocked=false;
  this.orbit=new OrbitControls(camera,canvas);this.orbit.enabled=false;this.orbit.enableDamping=false;this.orbit.screenSpacePanning=false;this.orbit.zoomSpeed=.85;this.orbit.rotateSpeed=.65;
  this.orbit.addEventListener('change',()=>{if(this.mode){this.captureOrbit();this.refresh();}});
  this.orbit.addEventListener('start',()=>onInteract());
  canvas.addEventListener('wheel',e=>{
   if(this.guided||this.mode&&!this.dive)return;
   if(this.dive)e.stopImmediatePropagation();
   e.preventDefault();
   const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?600:1);
   this.zoom(Math.exp(clamp(pixels*.0012,-.3,.3)));
  },{passive:false,capture:true});
  const doc=canvas.ownerDocument;
  doc.addEventListener('keydown',e=>this.handleKey(e));
  doc.addEventListener('keyup',e=>{
   if(this.keys.delete(e.code)&&this.keys.size===0){this.diveBlocked=false;this.refresh();}
  });
  doc.addEventListener('focusin',e=>{
   if(e.target?.closest?.(keyboardFields))this.clearKeys();
  });
  doc.defaultView?.addEventListener('blur',()=>this.clearKeys());
 }
 handleKey(e){
  if(!this.mode||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.target?.closest?.(keyboardFields))return;
  if(movementKeys.has(e.code)){
   e.preventDefault();
   if(!this.keys.has(e.code)){
    this.keys.add(e.code);
    this.onInteract();
    this.moveWithKeys(.055);
   }
  }else if(e.code==='KeyR'){e.preventDefault();if(!e.repeat)this.reset();}
  else if(e.code==='Equal'||e.code==='NumpadAdd'){e.preventDefault();this.zoom(.8);}
  else if(e.code==='Minus'||e.code==='NumpadSubtract'){e.preventDefault();this.zoom(1.25);}
 }
 clearKeys(){this.keys.clear();this.diveBlocked=false;}
 get diveTarget(){return this.dive?this.orbit.target:null;}
 yaw(){const d=this.camera.getWorldDirection(new THREE.Vector3());return Math.atan2(d.x,-d.z);}
 save(){this.pose={position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone(),target:this.orbit.target.clone()};}
 restorePose(){
  this.camera.position.copy(this.pose.position);
  this.camera.quaternion.copy(this.pose.quaternion);
  this.orbit.target.copy(this.pose.target);
 }
 captureOrbit(){
  if(this.dive&&this.pose&&!this.validDive(this.camera.position,this.orbit.target)){
   this.restorePose();
   return;
  }
  this.save();
 }
 validDive(eye,target){
  const range=this.dive.deep?23:9;
  return (!this.home||eye.distanceToSquared(this.home.position)<=range*range)&&
   this.diveClear(eye,target,this.dive.surface);
 }
 limitDiveZoom(distance){
  this.diveFocusDistance=distance;
  this.orbit.minDistance=distance*.68;
  this.orbit.maxDistance=distance*1.26;
 }
 translateDive(delta){
  const eye=this.camera.position.clone().add(delta);
  const focus=this.orbit.target.clone().add(delta);
  // Moving up a slope may put the old look point inside it. Look closer along the same ray.
  const candidates=[focus,eye.clone().lerp(focus,.48),eye.clone().lerp(focus,.22)];
  const nextFocus=candidates.find(target=>eye.distanceToSquared(target)>=1&&this.validDive(eye,target));
  if(!nextFocus)return false;
  this.camera.position.copy(eye);
  this.orbit.target.copy(nextFocus);this.orbit.cursor.copy(nextFocus);
  if(nextFocus!==focus)this.limitDiveZoom(eye.distanceTo(nextFocus));
  this.orbit.update();this.captureOrbit();
  return true;
 }
 moveWithKeys(dt){
  if(!this.keys.size||!dt)return;
  const held=(a,b)=>Number(this.keys.has(a)||this.keys.has(b));
  const x=held('KeyD','ArrowRight')-held('KeyA','ArrowLeft');
  const z=held('KeyW','ArrowUp')-held('KeyS','ArrowDown');
  const y=Number(this.keys.has('KeyE'))-Number(this.keys.has('KeyQ'));
  if(this.dive){
   this.swim(dt,x,z,y);
   this.refresh();
   return;
  }
  const length=Math.hypot(x,z);
  if(length){
   const pixels=dt*this.canvas.clientHeight*.42/length;
   this.pan(x*pixels,z*pixels);
  }
  if(y)this.zoom(Math.exp(y*dt*1.25));
 }
 swim(dt,x,z,y){
  if(!x&&!y&&!z){this.diveBlocked=false;return;}
  const forward=this.orbit.target.clone().sub(this.camera.position).setY(0).normalize();
  const right=new THREE.Vector3().crossVectors(forward,this.camera.up);
  const delta=forward.multiplyScalar(z).addScaledVector(right,x);
  delta.normalize().multiplyScalar(dt*(this.dive.deep?5:2.6));
  const vertical=new THREE.Vector3(0,y*dt*(this.dive.deep?2.9:1.15),0);
  const moved=this.translateDive(delta.clone().add(vertical))||
   (x||z)&&y&&(this.translateDive(delta)||this.translateDive(vertical));
  this.diveBlocked=!moved;
 }
 afterCamera(mode,focus,dive,dt=0){
  this.guided=mode==='guided-sea';
  if(!mode||this.guided){this.orbit.enabled=false;this.mode=null;this.dive=null;this.clearKeys();this.pose=null;this.home=null;this.preset=null;if(this.camera.fov!==this.groundFov){this.camera.fov=this.groundFov;this.camera.updateProjectionMatrix();}this.refresh();return;}
  if(dive)mode='dive';
  const presetChanged=this.preset&&(this.camera.position.distanceTo(this.preset.position)>1e-6||this.camera.quaternion.angleTo(this.preset.quaternion)>1e-6);
  const surfaceChanged=dive&&this.dive&&dive.surface!==this.dive.surface;
  this.dive=dive;
  if(this.mode!==mode||presetChanged||surfaceChanged){
   this.preset={position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone()};
   this.mode=mode;this.pose=null;this.home=null;this.clearKeys();this.diveFov=this.baseFov();this.camera.fov=this.baseFov();this.camera.updateProjectionMatrix();
   if(dive){
    this.orbit.target.fromArray(dive.target);
    const offset=this.camera.position.clone().sub(this.orbit.target),distance=offset.length();
    const azimuth=Math.atan2(offset.x,offset.z),polar=Math.acos(clamp(offset.y/distance,-1,1));
    this.limitDiveZoom(distance);
    this.orbit.minAzimuthAngle=azimuth-.77;this.orbit.maxAzimuthAngle=azimuth+.77;
    this.orbit.minPolarAngle=Math.max(.02,polar-.24);this.orbit.maxPolarAngle=Math.min(Math.PI-.02,polar+.24);
    this.orbit.cursor.copy(this.orbit.target);
    this.orbit.maxTargetRadius=dive.deep?4:1.8;
   }else{
    const direction=this.camera.getWorldDirection(new THREE.Vector3());
    const height=mode==='planOverview'||mode==='overview'||mode.startsWith('linkOverview')?0:clamp(focus.y,-450,900);
    let distance=(height-this.camera.position.y)/direction.y;
    if(!Number.isFinite(distance)||distance<20)distance=Math.max(80,this.camera.position.distanceTo(focus));
    this.orbit.target.copy(this.camera.position).addScaledVector(direction,distance);
    this.orbit.minDistance=Math.max(18,distance*.025);
    this.orbit.maxDistance=Math.min(Math.max(1500,distance*4),Math.max(distance,this.camera.far*.65));
    this.orbit.minAzimuthAngle=-Infinity;this.orbit.maxAzimuthAngle=Infinity;
    this.orbit.minPolarAngle=.02;
    this.orbit.maxPolarAngle=Math.max(Math.PI/2-.02,Math.acos(clamp((this.camera.position.y-this.orbit.target.y)/distance,-1,1))+.03);
    this.orbit.maxTargetRadius=Infinity;
   }
   this.orbit.enabled=true;this.orbit.update();this.home={position:this.camera.position.clone(),target:this.orbit.target.clone(),distance:this.camera.position.distanceTo(this.orbit.target)};this.save();
  }else{
   // The authored overview branches still establish lighting and responsive view offsets.
   // Restore the user's camera after those branches, so they cannot erase mouse input.
   this.restorePose();
   if(dive&&this.camera.fov!==this.diveFov){this.camera.fov=this.diveFov;this.camera.updateProjectionMatrix();}
   this.orbit.update();
   this.moveWithKeys(dt);
  }
  this.refresh();
 }
 zoom(factor){
  this.onInteract();
  if(this.dive){this.diveFov=scaleFov(this.diveFov,factor,38,80);this.camera.fov=this.diveFov;this.camera.updateProjectionMatrix();}
  else if(this.mode){const offset=this.camera.position.clone().sub(this.orbit.target),distance=clamp(offset.length()*factor,this.orbit.minDistance,this.orbit.maxDistance);offset.setLength(distance);this.camera.position.copy(this.orbit.target).add(offset);this.orbit.update();this.captureOrbit();}
  else{this.groundFov=scaleFov(this.groundFov,factor,24,90);this.camera.fov=this.groundFov;this.camera.updateProjectionMatrix();}
  this.refresh();
 }
 pan(dx,dy){if(!this.mode)return;this.camera.updateMatrixWorld(true);const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),forward=new THREE.Vector3().crossVectors(this.camera.up,right).normalize(),distance=this.camera.position.distanceTo(this.orbit.target),scale=2*distance*Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2))/Math.max(1,this.canvas.clientHeight),delta=right.multiplyScalar(dx*scale).addScaledVector(forward,dy*scale);this.camera.position.add(delta);this.orbit.target.add(delta);this.orbit.update();this.captureOrbit();this.refresh();}
 reset(){
  this.clearKeys();
  if(this.mode&&this.home){
   this.camera.position.copy(this.home.position);this.orbit.target.copy(this.home.target);
   if(this.dive){
    this.orbit.cursor.copy(this.home.target);this.limitDiveZoom(this.home.distance);
    this.diveFov=this.baseFov();this.camera.fov=this.diveFov;this.camera.updateProjectionMatrix();
   }
   this.orbit.update();this.captureOrbit();
  }else{this.groundFov=this.baseFov();this.camera.fov=this.groundFov;this.camera.updateProjectionMatrix();}
  this.refresh();
 }
 refresh(){
  if(!this.panel)return;
  this.panel.hidden=this.guided;
  const zoomDistance=this.dive?this.diveFocusDistance:this.home?.distance;
  const distanceScale=zoomDistance?zoomDistance/Math.max(.1,this.camera.position.distanceTo(this.orbit.target)):1;
  const fov=this.dive?this.diveFov:this.mode?this.baseFov():this.groundFov;
  const scale=distanceScale*Math.tan(THREE.MathUtils.degToRad(this.baseFov()/2))/Math.tan(THREE.MathUtils.degToRad(fov/2));
  const label=(this.dive?'下潜':this.mode?'总览':'视野')+' '+scale.toFixed(1)+'×';
  const swimHint=this.diveBlocked?'已到观察区边缘、水面或海床 · 按 R 复位':
   'WASD / 方向键潜游 · E 上浮 · Q 下潜\n左拖转向 · 滚轮调整视野 · R 复位';
  const hint=this.dive?swimHint:
   this.mode?'总览镜头 · WASD / 方向键平移 · Q 放大 · E 缩小 · R 复位\n左拖旋转 · 右拖或 Shift＋左拖平移 · 滚轮缩放':
    '实地观察 · WASD / 方向键移动 · 拖动转向 · 滚轮调整视野';
  if(this.scaleElement.textContent!==label)this.scaleElement.textContent=label;
  if(this.hintElement.textContent!==hint)this.hintElement.textContent=hint;
  this.panel.dataset.mode=this.dive?'dive':this.mode?'map':'walk';
 }
 mount(document){const p=document.createElement('section');p.id='view-controls';p.setAttribute('aria-label','画面旋转平移与缩放');p.innerHTML='<div><span id="view-scale" role="status">视野 1.0×</span><button type="button" data-view-action="in" aria-label="放大画面" title="放大画面">＋</button><button type="button" data-view-action="out" aria-label="缩小画面" title="缩小画面">−</button><button type="button" data-view-action="reset" aria-label="重置当前视角" title="重置当前视角">复位</button></div><small id="view-hint"></small>';document.body.append(p);this.panel=p;this.scaleElement=p.querySelector('#view-scale');this.hintElement=p.querySelector('#view-hint');p.querySelector('[data-view-action=in]').addEventListener('click',()=>this.zoom(.8));p.querySelector('[data-view-action=out]').addEventListener('click',()=>this.zoom(1.25));p.querySelector('[data-view-action=reset]').addEventListener('click',()=>this.reset());this.refresh();}
}

export class MiniMapView{
 constructor(){this.zoom=1;this.poses=new WeakMap();}
 setZoom(value){this.zoom=clamp(value,.65,4);return this.zoom;}
 apply(camera,player){if(!camera)return;let base=this.poses.get(camera);if(!base){base=camera.position.clone();this.poses.set(camera,base);}camera.position.copy(base);if(this.zoom>1&&player){const direction=camera.getWorldDirection(new THREE.Vector3()),distance=Math.abs(direction.y)>.001?(player.y-base.y)/direction.y:1000,center=base.clone().addScaledVector(direction,distance),blend=clamp((this.zoom-1)/.7,0,1);camera.position.x+=(player.x-center.x)*blend;camera.position.z+=(player.z-center.z)*blend;}camera.zoom=this.zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
}

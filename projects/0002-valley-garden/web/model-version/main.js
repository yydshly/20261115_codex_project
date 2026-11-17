import * as THREE from 'three';
import { loadModelLibrary, createModelCottage, createModelGarden,createModelLawn } from './model-assets.js';
import { buildCottage } from './cottage.js';
import { createModelWoodland } from './valley-woodland.js';
import { createValleyVegetation } from './valley-vegetation.js';
import { createValleyGeology } from './valley-geology.js';
import { loadValleyLife,createValleyLife } from './valley-life.js';
import { buildLandscape, seededRandom, heightAt, riverX, riverWidth } from './landscape.js';
import { loadNatureMaterials } from './nature.js';
import { createLightingRig } from './lighting.js';
import { createFineGrass } from './fine-grass.js';
import { createGeometryContactShadows } from './contact-shadows.js';
import { createCharacterShadows } from './character-shadows.js';
import { createGlassBudget } from './glass-budget.js';
import { createMotionReview } from './motion-review.js';
import { createAmbience } from './ambience.js';
import { createGardenBench } from './garden-moments.js';
import { createGardenWildlife } from './garden-wildlife.js';
import { createWindField,windWeatherAt,localWindAt } from './wind-field.js';
import { createFootstepTracker } from './footsteps.js';
import { createActorFootsteps,actorSoundMixAt } from './actor-footsteps.js';

const $=id=>document.getElementById(id);
const editionPath=location.pathname.indexOf('/model-version/');
if(editionPath>=0)$('original-version').href=location.pathname.slice(0,editionPath)+'/';
const ui={root:$('experience'),canvas:$('world'),loading:$('loading'),detail:$('loading-detail'),enter:$('enter'),location:$('location'),hint:$('control-hint')};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer=matchMedia('(pointer: coarse)').matches;
const inspectPerformance=new URLSearchParams(location.search).has('inspect');
const fixedInspection=inspectPerformance&&new URLSearchParams(location.search).has('fixed');
const requestedInspectionTime=Number(new URLSearchParams(location.search).get('time')||0);
const inspectionStartTime=inspectPerformance&&Number.isFinite(requestedInspectionTime)?THREE.MathUtils.clamp(requestedInspectionTime,0,3600):0;
let renderer;
function failure(error){
  console.error(error);$('failure').hidden=false;
  $('failure-detail').textContent='请确认本地服务正在运行，浏览器支持 WebGL 2；模型加载失败时可重新进入。'+(error?.message?' '+error.message:'');
  ui.loading.hidden=true;
}
window.addEventListener('error',event=>{if(!renderer)failure(event.error||new Error(event.message));});
try { await boot(); } catch(error){failure(error);}

async function boot(){
  renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.transmissionResolutionScale=.75;
  if(inspectPerformance)renderer.info.autoReset=false;
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#b8cdd3',.00068);
  const camera=new THREE.PerspectiveCamera(52,1,.1,2300);camera.rotation.order='YXZ';
  const lighting=createLightingRig(scene,renderer);
  const wind=createWindField({animate:!reducedMotion});wind.update(inspectionStartTime);
  ui.detail.textContent='让自然光落进花园…';
  const [nature,models,lifeAssets]=await Promise.all([loadNatureMaterials(renderer),loadModelLibrary(renderer,(done,total)=>{ui.detail.textContent=`正在准备花园细节 ${done} / ${total}`;}),loadValleyLife(renderer)]);
  const pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromEquirectangular(nature.sky).texture;scene.environmentIntensity=.6;scene.environmentRotation.y=Math.PI*.65;pmrem.dispose();
  const landscape=buildLandscape(scene,renderer,nature);
  const bench=createGardenBench(scene,{heightAt,wood:nature.wood});
  lighting.update(0,landscape);
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const classicCottage=buildCottage(scene),importedCottage=createModelCottage(scene,models,'cottage'),starter=createModelCottage(scene,models,'townhouse'),bungalow=createModelCottage(scene,models);
  classicCottage.colliders[0].maxZ=-5.15;classicCottage.group.visible=false;bungalow.group.visible=false;starter.group.visible=false;
  let cottage=importedCottage;
  const terrainWalkHeight=landscape.walkHeight;
  landscape.walkHeight=(x,z)=>{
    if(cottage!==classicCottage&&Math.abs(x)<7&&z>-17&&z< -2.05)return cottage.walkHeight(x,z)??heightAt(x,z);
    return terrainWalkHeight(x,z);
  };
  const vegetation=createModelWoodland(scene,models,{heightAt,riverX,random:seededRandom(8266)});
  const valleyPlants=createValleyVegetation(scene,models,{heightAt,riverX,riverWidth,random:seededRandom(72941)});
  const modelGarden=createModelGarden(scene,models,{heightAt,riverX,riverWidth,random:seededRandom(5044)});
  const wildlife=createGardenWildlife(scene,{flowerPerches:modelGarden.flowerPerches,heightAt,random:seededRandom(65473),animate:!reducedMotion,wind});
  const geology=createValleyGeology(scene,models,{heightAt,riverX,riverWidth,random:seededRandom(91477)});
  landscape.setStreamObstacles(geology.obstacles);
  const life=createValleyLife(scene,lifeAssets,{heightAt,walkHeight:landscape.walkHeight,supportHeight:landscape.footingHeight,animate:!reducedMotion,obstacles:[...vegetation.colliders,...modelGarden.colliders,...geology.colliders]});
  const characterShadows=createCharacterShadows(renderer,scene,life.gardener,{region:[0,0,.5,1]});
  const animalShadows=createCharacterShadows(renderer,scene,life.herd,{prefix:'cattle',span:34,actors:()=>life.cattle.map(c=>c.group),sharedTarget:characterShadows.target,region:[.5,0,.5,1],sharedSampler:true});
  characterShadows.setDebug(inspectPerformance?Number(new URLSearchParams(location.search).get('shadowDebug')):0);
  landscape.shadowReceivers.forEach(material=>{characterShadows.attach(material);animalShadows.attach(material);});
  const glassBudget=createGlassBudget(scene);
  const groundContacts=[...vegetation.contacts,...valleyPlants.contacts,...modelGarden.contacts,...geology.contacts,...life.contacts,...bench.contacts];
  landscape.ground.setContacts(groundContacts,cottage.colliders[0]);
  const lawn=createModelLawn(scene,models,{heightAt,weightsAt:landscape.ground.weightsAt,random:seededRandom(18274),grazingSites:life.cattle});
  const fineGrass=createFineGrass(scene,{heightAt,weightsAt:landscape.ground.weightsAt,random:seededRandom(92833),grazingSites:life.cattle});
  for(const group of [fineGrass.group,lawn.group,modelGarden.group])group.traverse(mesh=>{
    if(!mesh.isMesh)return;
    for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){characterShadows.attach(material);animalShadows.attach(material);}
  });
  let colliders=[...cottage.colliders,...vegetation.colliders,...modelGarden.colliders,...geology.colliders,...life.colliders,...landscape.colliders,bench.collider];
  ui.detail.textContent='花开好了，正在等你…';

  let mode='overview',yaw=0,pitch=0,sensitivity=1,evening=0,targetEvening=0,overviewPaused=reducedMotion||fixedInspection;
  let transition=null,drag=null,toastTimer,hasEntered=false,audio=null,muted=true,soundBusy=false,lampsOn=true,seatYaw=0;
  let elapsed=inspectionStartTime,lastTime=performance.now(),locationClock=0,shoreToast=0,fpsTime=0,fpsFrames=0;
  let lastInspection=0;
  const keys=new Set(),velocity=new THREE.Vector2();
  const footstepTracker=createFootstepTracker(),actorFootsteps=createActorFootsteps();let windReviewTime=null,soundReviewPaused=false;
  const orbit={target:new THREE.Vector3(0,2.8,-8),theta:.34,phi:1.36,radius:47};
  const views={
    rest:{position:bench.position,target:bench.target},
    garden:{position:new THREE.Vector3(0,landscape.walkHeight(0,5.2)+1.7,5.2),target:new THREE.Vector3(0,2.1,-10)},
    stream:{position:new THREE.Vector3(landscape.bridgeCenter+5.7,landscape.walkHeight(landscape.bridgeCenter+5.7,18)+1.7,18),target:new THREE.Vector3(-4,2.2,-9)}
  };
  const pasture=life.cattle[0].group,offset=new THREE.Vector3(7.2,0,7.2);
  const pastureEye=new THREE.Vector3(pasture.position.x+offset.x,0,pasture.position.z+offset.z);pastureEye.y=heightAt(pastureEye.x,pastureEye.z)+2.0;
  views.pasture={position:pastureEye,target:pasture.position.clone().add(new THREE.Vector3(0,.72,0))};
  const sideEye=pasture.position.clone().add(new THREE.Vector3(-5.2,0,0).applyQuaternion(pasture.quaternion));sideEye.y=heightAt(sideEye.x,sideEye.z)+1.55;
  views.cowSide={position:sideEye,target:pasture.position.clone().add(new THREE.Vector3(0,.64,0))};
  const waterEyeX=riverX(3)+riverWidth(3)+1.4;
  views.water={position:new THREE.Vector3(waterEyeX,heightAt(waterEyeX,3)+1.7,3),target:new THREE.Vector3(riverX(9)+riverWidth(9)*.58,-.05,9)};
  const butterflySpot=wildlife.butterflies[0]?.stops[0];
  if(butterflySpot)views.butterflies={position:butterflySpot.clone().add(new THREE.Vector3(.12,.10,.23)),target:butterflySpot.clone()};
  views.birds={position:new THREE.Vector3(0,20,5),target:new THREE.Vector3(0,20,-20)};
  const review=createMotionReview({root:ui.root,seek(view){
    if(view==='step'){elapsed+=1/30;return;}
    const stages=life.cattle[0].roaming.stages,walking=stages.find(s=>s.kind==='walking');
    elapsed=view==='side'||view==='walkFeet'?walking.start+2.5:view==='stopFeet'?walking.end+.7:view==='look'?11.4:view==='water'?10:view==='tail'?.1:1;
  },observe(view){if(view==='water'){goTo('water',{instant:true});review.focus='water';}else{setMode('walk');transition=null;setActive('pasture');updateLocation('牧场动作检查');}},getStatus(){const c=life.cattle[0];return `时间 ${elapsed.toFixed(2)} · ${c.behavior.state.phase} · 看向 ${(c.behavior.state.headYaw*180/Math.PI).toFixed(1)}° · 嘴缝 ${(c.behavior.state.mouthOpening*1000).toFixed(1)} mm · 尾摆 ${(c.behavior.state.tail*180/Math.PI).toFixed(1)}°`;}});
  if(review.enabled)renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{review.errors.push([gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment)].filter(Boolean).join(' '));review.update();};
  const reviewEye=new THREE.Vector3(),reviewTarget=new THREE.Vector3(),reviewOffset=new THREE.Vector3();
  function reviewCamera(){
    if(!review.enabled||!review.focus||review.focus==='water')return;
    const c=life.cattle[0],kind=review.focus;
    if(kind==='feet'||kind==='walkFeet'||kind==='stopFeet'){
      reviewTarget.set(-.07,.20,-.22).applyQuaternion(c.group.quaternion).add(c.group.position);
      reviewOffset.set(-1.55,.30,1.65).applyQuaternion(c.group.quaternion);reviewEye.copy(reviewTarget).add(reviewOffset);
    }else if(kind==='look'){
      reviewTarget.set(-.07,1.03,.85).applyQuaternion(c.group.quaternion).add(c.group.position);
      reviewOffset.set(1.25,.18,2.20).applyQuaternion(c.group.quaternion);reviewEye.copy(reviewTarget).add(reviewOffset);
    }else if(kind==='head'){
      c.behavior.mesh.getVertexPosition(c.behavior.muzzleIndex,reviewTarget).applyMatrix4(c.behavior.mesh.matrixWorld);reviewTarget.y+=.055;
      reviewOffset.set(.85,.22,.10).applyQuaternion(c.group.quaternion);reviewEye.copy(reviewTarget).add(reviewOffset);
    }else{
      reviewTarget.set(kind==='tail'?-.075:0,kind==='tail'?.82:.68,kind==='tail'?-.94:0).applyQuaternion(c.group.quaternion).add(c.group.position);
      reviewOffset.set(kind==='tail'?1.65:-3.8,kind==='tail'?.25:.30,kind==='tail'?-1.5:.2).applyQuaternion(c.group.quaternion);reviewEye.copy(reviewTarget).add(reviewOffset);
    }
    camera.position.copy(reviewEye);camera.lookAt(reviewTarget);
  }
  const orbitPosition=()=>new THREE.Vector3(orbit.radius*Math.sin(orbit.phi)*Math.sin(orbit.theta),orbit.radius*Math.cos(orbit.phi),orbit.radius*Math.sin(orbit.phi)*Math.cos(orbit.theta)).add(orbit.target);
  camera.position.copy(orbitPosition());camera.lookAt(orbit.target);
  vegetation.update(1,camera);
  valleyPlants.update(camera);
  geology.update(camera);life.update(0,inspectionStartTime,camera);
  wildlife.update(inspectionStartTime,camera);
  const contactShadows=createGeometryContactShadows(renderer,scene);
  landscape.ground.setContactShadow(contactShadows.texture,contactShadows.bounds);

  function resize(){
    const {width,height}=ui.canvas.getBoundingClientRect();renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  const observer=new ResizeObserver(resize);observer.observe(ui.root);resize();
  function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
  function setActive(view){document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
  function setMode(next){
    mode=next;ui.root.dataset.mode=mode;keys.clear();velocity.set(0,0);footstepTracker.reset();
    const walk=mode==='walk',seated=mode==='seated';ui.enter.querySelector('span').textContent=walk||seated?'返回全景':'进入花园';
    $('rest').setAttribute('aria-pressed',String(seated));$('rest').querySelector('span').textContent=seated?'起身走走':'庭院小憩';
    ui.hint.textContent=seated?(coarsePointer?'拖动环顾 · 点击「起身走走」离座':'拖动环顾 · E / 空格起身'):walk?(coarsePointer?'左侧行走 · 拖动画面环顾':'WASD 行走 · 拖动环顾 · Shift 快步'):'拖动环绕 · 滚轮拉近';
    $('touch-controls').hidden=!(walk&&coarsePointer);
    if(!walk&&document.pointerLockElement)document.exitPointerLock();
  }
  function goTo(view,{instant=false}={}){
    if(document.pointerLockElement)document.exitPointerLock();
    const start=camera.position.clone(),startQ=camera.quaternion.clone();
    if(view==='overview'){
      setMode('overview');orbit.theta=.34;orbit.phi=1.36;orbit.radius=47;overviewPaused=reducedMotion||fixedInspection;
      camera.position.copy(orbitPosition());camera.lookAt(orbit.target);
    }else{
      setMode(view==='rest'?'seated':'walk');camera.position.copy(views[view].position);camera.lookAt(views[view].target);
      const euler=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=euler.y;pitch=euler.x;
      if(view==='rest'){seatYaw=yaw;toast('坐一会，听听山谷；点击「起身走走」即可离座');}
      else if(!hasEntered){toast(coarsePointer?'用左侧方向键行走，拖动画面环顾':'WASD 行走，拖动环顾；双击画面可锁定鼠标');hasEntered=true;}
    }
    const end=camera.position.clone(),endQ=camera.quaternion.clone();camera.position.copy(start);camera.quaternion.copy(startQ);
    transition=instant?null:{start,end,startQ,endQ,time:0,duration:reducedMotion?.01:1.55};
    if(instant){camera.position.copy(end);camera.quaternion.copy(endQ);}setActive(view);
    ui.canvas.focus({preventScroll:true});updateLocation(view==='overview'?'花园全景':view==='rest'?'庭院长椅':view==='stream'?'溪畔木桥':view==='water'?'溪流浅滩':view==='pasture'?'溪谷牧场':'庭院花径');
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>goTo(b.dataset.view)));
  ui.enter.addEventListener('click',()=>goTo(mode==='overview'?'garden':'overview'));
  $('rest').addEventListener('click',()=>goTo(mode==='seated'?'garden':'rest'));
  function syncLampButton(){
    $('house-lamps').hidden=!cottage.interior;
    $('house-lamps').setAttribute('aria-pressed',String(lampsOn));
    $('house-lamps').setAttribute('aria-label',lampsOn?'关闭小屋灯光':'点亮小屋灯光');
    $('house-lamps').querySelector('span').textContent=lampsOn?'熄灭小屋':'点亮小屋';
  }
  syncLampButton();
  $('house-lamps').addEventListener('click',()=>{
    if(!cottage.interior)return;lampsOn=!lampsOn;cottage.interior.setLampsOn(lampsOn);syncLampButton();
    toast(lampsOn?'小屋的灯亮了，暮色下更清楚':'小屋灯光已关闭');
  });
  $('brand-home').addEventListener('click',event=>{event.preventDefault();goTo('overview');});
  const settings=$('settings');
  function toggleSettings(open){settings.hidden=!open;$('settings-toggle').setAttribute('aria-expanded',String(open));if(!open)ui.canvas.focus({preventScroll:true});}
  $('settings-toggle').addEventListener('click',()=>toggleSettings(settings.hidden));
  $('settings-close').addEventListener('click',()=>toggleSettings(false));
  $('sensitivity').addEventListener('input',e=>{sensitivity=Number(e.target.value);});
  $('house-style').addEventListener('change',e=>{
    cottage=e.target.value==='imported'?importedCottage:e.target.value==='bungalow'?bungalow:e.target.value==='starter'?starter:classicCottage;
    classicCottage.group.visible=cottage===classicCottage;importedCottage.group.visible=cottage===importedCottage;bungalow.group.visible=cottage===bungalow;starter.group.visible=cottage===starter;
    landscape.ground.setContacts(groundContacts,cottage.colliders[0]);
    contactShadows.bake([cottage.group,modelGarden.group,vegetation.group,geology.group,bench.group]);
    cottage.interior?.setLampsOn(lampsOn);syncLampButton();
    lighting.invalidateShadows();
    if(inspectPerformance)console.info('[contact-qa] '+JSON.stringify({style:e.target.value,...contactShadows.inspect()}));
    colliders=[...cottage.colliders,...vegetation.colliders,...modelGarden.colliders,...geology.colliders,...life.colliders,...landscape.colliders,bench.collider];
    if(mode==='walk')goTo('garden');
    toast(cottage===classicCottage?'经典白屋':cottage===bungalow?'乡间平房':cottage===starter?'双层住宅':'砖墙花园小屋');
  });
  $('quality').addEventListener('change',e=>{
    const high=e.target.value==='high';landscape.setQuality(high);vegetation.setQuality(high);valleyPlants.setQuality(high);geology.setQuality(high);life.setQuality(high);wildlife.setQuality(high);characterShadows.setQuality(high);animalShadows.setQuality(high);glassBudget.setQuality(high);lawn.setQuality(high);fineGrass.setQuality(high);renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.5:1));renderer.transmissionResolutionScale=high?.75:.5;
    // Keep shadow shader variants warm; resizing the map avoids a scene-wide
    // shader recompile and preserves contact shadows in the faster mode.
    lighting.setQuality(high);resize();toast(high?'细腻画面已开启':'已切换流畅画面');
  });
  $('light').addEventListener('click',()=>{
    targetEvening=targetEvening?0:1;$('light').setAttribute('aria-pressed',String(Boolean(targetEvening)));
    $('light').querySelector('span').textContent=targetEvening?'暮色':'晨光';
  });
  $('valley-life').addEventListener('change',e=>{life.setVisible(e.target.checked);lighting.invalidateShadows();});
  $('garden-wildlife').addEventListener('change',e=>wildlife.setVisible(e.target.checked));

  function look(dx,dy){
    if(transition)return;
    if(mode==='walk'||mode==='seated'){
      yaw-=dx*.0022*sensitivity;pitch=THREE.MathUtils.clamp(pitch-dy*.0022*sensitivity,mode==='seated'?-.65:-1.25,mode==='seated'?.75:1.15);
      if(mode==='seated')yaw=THREE.MathUtils.clamp(yaw,seatYaw-1.25,seatYaw+1.25);
    }
    else {orbit.theta-=dx*.003;orbit.phi=THREE.MathUtils.clamp(orbit.phi-dy*.003,.4,1.52);overviewPaused=true;}
  }
  ui.canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;ui.canvas.focus({preventScroll:true});drag={x:e.clientX,y:e.clientY,id:e.pointerId};
    ui.canvas.setPointerCapture(e.pointerId);
  });
  ui.canvas.addEventListener('pointermove',e=>{
    if(document.pointerLockElement===ui.canvas){look(e.movementX,e.movementY);return;}
    if(drag?.id===e.pointerId){look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;}
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])ui.canvas.addEventListener(event,()=>{drag=null;});
  ui.canvas.addEventListener('dblclick',async()=>{
    if(mode!=='walk')return;
    try{await ui.canvas.requestPointerLock();}catch{toast('当前浏览器可用拖动环顾');}
  });
  ui.canvas.addEventListener('wheel',e=>{if(mode==='overview'){e.preventDefault();orbit.radius=THREE.MathUtils.clamp(orbit.radius+e.deltaY*.03,21,115);overviewPaused=true;}},{passive:false});
  ui.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('keydown',e=>{
    if(['INPUT','SELECT','BUTTON','A'].includes(e.target.tagName))return;
    if(e.code==='Escape'){toggleSettings(false);keys.clear();return;}
    if(mode==='seated'&&['KeyE','Space'].includes(e.code)){e.preventDefault();if(!e.repeat)goTo('garden');return;}
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].includes(e.code)){
      e.preventDefault();keys.add(e.code);if(e.code==='Space'&&mode==='overview'&&!e.repeat){overviewPaused=!overviewPaused;toast(overviewPaused?'观景已暂停':'继续缓缓观景');}
    }
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{keys.clear();drag=null;footstepTracker.reset();});
  document.addEventListener('visibilitychange',()=>{keys.clear();footstepTracker.reset();actorFootsteps.reset();lastTime=performance.now();audio?.setVisible(!document.hidden).catch(()=>{});});
  for(const button of document.querySelectorAll('[data-move]')){
    const codes={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'};
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(codes[button.dataset.move]);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(codes[button.dataset.move]));
  }
  function blocked(x,z){
    if(Math.abs(x)>125||z< -130||z>105)return true;
    if(landscape.inWater(x,z)){
      if(elapsed-shoreToast>9){toast('沿着花径，可以从木桥过溪');shoreToast=elapsed;}return true;
    }
    const r=.28;return colliders.some(b=>x>b.minX-r&&x<b.maxX+r&&z>b.minZ-r&&z<b.maxZ+r);
  }
  function walk(dt){
    const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?6.2:3;
    const f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
    const r=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const target=new THREE.Vector2(r,f);if(target.lengthSq()>1)target.normalize();target.multiplyScalar(speed);
    velocity.lerp(target,1-Math.exp(-11*dt));
    const dx=(Math.cos(yaw)*velocity.x-Math.sin(yaw)*velocity.y)*dt;
    const dz=(-Math.sin(yaw)*velocity.x-Math.cos(yaw)*velocity.y)*dt;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
    for(let i=0;i<steps;i++){
      if(!blocked(camera.position.x+dx/steps,camera.position.z))camera.position.x+=dx/steps;
      if(!blocked(camera.position.x,camera.position.z+dz/steps))camera.position.z+=dz/steps;
    }
    const surface=landscape.surfaceAt(camera.position.x,camera.position.z);
    const step=footstepTracker.update({x:camera.position.x,z:camera.position.z,dt,active:Boolean(f||r),surface});if(step)audio?.footstep(step);
    const desired=landscape.walkHeight(camera.position.x,camera.position.z)+1.7;
    const bob=reducedMotion||!(f||r)?0:-Math.cos(footstepTracker.phase*Math.PI*2)*.018*Math.min(1,velocity.length()/3);
    camera.position.y=THREE.MathUtils.lerp(camera.position.y,desired+bob,1-Math.exp(-14*dt));
    camera.rotation.set(pitch,yaw,0,'YXZ');
  }
  function updateLocation(text){ui.location.replaceChildren();const dot=document.createElement('i');ui.location.append(dot,document.createTextNode(text));}
  function locationName(){
    const {x,z}=camera.position;
    if(Math.abs(z-18)<2&&Math.abs(x-landscape.bridgeCenter)<9)return '溪畔木桥';
    if(Math.abs(x)<6&&z< -2&&z> -6)return '小屋门廊';
    if(Math.abs(x)<13&&z> -24&&z<9)return '庭院花径';
    if(life.cattle.some(c=>Math.hypot(c.x-x,c.z-z)<8))return '溪谷牧场';
    if(Math.abs(x-riverX(z))<riverWidth(z)+3)return '溪流浅滩';
    if(z< -40)return '山谷林间';return '溪谷草甸';
  }

  $('sound').addEventListener('click',async()=>{
    if(soundBusy)return;soundBusy=true;$('sound').disabled=true;
    try{
      if(!audio)audio=createAmbience({riverX,riverWidth,isIndoors:({x,z})=>x>cottage.colliders[0].minX&&x<cottage.colliders[0].maxX&&z>cottage.colliders[0].minZ&&z<cottage.colliders[0].maxZ});
      audio.update(camera,evening,wind.sample(camera.position.x,camera.position.z));await audio.setEnabled(muted);muted=!muted;
      $('sound').setAttribute('aria-pressed',String(!muted));$('sound').setAttribute('aria-label',muted?'开启环境与脚步声':'关闭环境与脚步声');
      toast(muted?'环境声音已关闭':'声音已开启，走走听听脚步与微风');
    }catch{toast('当前浏览器未能开启声音，请再试一次');}
    finally{soundBusy=false;$('sound').disabled=false;}
  });
  const requestedView=inspectPerformance&&new URLSearchParams(location.search).get('view');
  const wildlifeReview=['birds','butterflies'].includes(requestedView)?requestedView:null;
  let wildlifeReviewClock=inspectionStartTime,wildlifeReviewPaused=true,wildlifeReviewRate=.35;
  if(wildlifeReview){
    const panel=document.createElement('aside');panel.setAttribute('aria-label','小生物动作检查');
    panel.style.cssText='position:absolute;z-index:60;top:168px;left:20px;max-width:calc(100% - 40px);padding:9px 12px;border-radius:12px;background:#243b32ed;color:#f4f0db;font:12px/1.7 sans-serif;';
    const controls=document.createElement('div');controls.style.cssText='display:flex;gap:6px;flex-wrap:wrap';panel.append(controls);
    const add=(label,action)=>{const button=document.createElement('button');button.textContent=label;button.style.cssText='border:1px solid #ffffff55;border-radius:6px;background:#506450;color:inherit;padding:4px 9px';button.addEventListener('click',action);controls.append(button);return button;};
    if(wildlifeReview==='birds'){
      add('扑翼姿态',()=>{wildlifeReviewClock=1;wildlifeReviewPaused=true;});
      add('滑翔姿态',()=>{wildlifeReviewClock=3;wildlifeReviewPaused=true;});
    }else{
      add('停栖姿态',()=>{wildlifeReviewClock=1;wildlifeReviewPaused=true;});
      add('起飞姿态',()=>{wildlifeReviewClock=wildlife.butterflies[0].schedule[0].rest+.8;wildlifeReviewPaused=true;});
    }
    add('连续慢放',()=>{wildlifeReviewClock=wildlifeReview==='birds'?1:wildlife.butterflies[0].schedule[0].rest-.8;wildlifeReviewRate=.35;wildlifeReviewPaused=false;});
    add('暂停',()=>{wildlifeReviewPaused=true;});
    add('逐帧',()=>{wildlifeReviewPaused=true;wildlifeReviewClock+=1/60;});
    ui.root.append(panel);
  }
  if(inspectPerformance&&new URLSearchParams(location.search).has('windReview')){
    const panel=document.createElement('aside');panel.setAttribute('aria-label','风与脚步检查');panel.style.cssText='position:absolute;z-index:60;top:168px;left:20px;padding:9px 12px;border-radius:12px;background:#243b32ed;font:12px/1.7 sans-serif;display:flex;gap:6px';
    const samples=Array.from({length:161},(_,i)=>localWindAt(windWeatherAt(i),0,2));
    const calm=samples.reduce((a,b)=>a.strength<b.strength?a:b),gust=samples.reduce((a,b)=>a.strength>b.strength?a:b);
    for(const [label,value]of [['轻风时刻',calm.time],['阵风时刻',gust.time],['实时风',null]]){const button=document.createElement('button');button.textContent=label;button.style.cssText='padding:4px 9px;border:1px solid #ffffff55;border-radius:6px;background:#506450;color:inherit';button.addEventListener('click',()=>{windReviewTime=value;});panel.append(button);}
    ui.root.append(panel);
  }
  if(inspectPerformance&&new URLSearchParams(location.search).has('soundReview')){
    const panel=document.createElement('aside');panel.setAttribute('aria-label','人物与牛声音检查');panel.style.cssText='position:absolute;z-index:60;top:326px;left:20px;max-width:calc(100% - 40px);padding:9px 12px;border-radius:12px;background:#243b32ed;font:12px/1.7 sans-serif;display:flex;gap:6px;flex-wrap:wrap';
    const add=(label,action)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='padding:4px 9px;border:1px solid #ffffff55;border-radius:6px;background:#506450;color:inherit';b.addEventListener('click',action);panel.append(b);return b;};
    function listen(kind,distance){
      setMode('walk');transition=null;soundReviewPaused=false;pause.textContent='暂停动作';
      if(kind==='cow'){elapsed=life.cattle[0].roaming.stages.find(s=>s.kind==='walking').start+2;life.update(0,elapsed,camera);}
      actorFootsteps.reset();const actor=kind==='cow'?life.cattle[0].group:life.gardener;
      camera.position.set(actor.position.x+distance*.8,0,actor.position.z+distance*.6);camera.position.y=landscape.walkHeight(camera.position.x,camera.position.z)+1.7;
      camera.lookAt(actor.position.clone().add(new THREE.Vector3(0,kind==='cow'?.65:.85,0)));const e=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=e.y;pitch=e.x;
      updateLocation(kind==='cow'?'牛蹄声音检查':'人物脚步检查');
    }
    for(const [label,kind,distance]of [['人物近处','human',3.5],['人物远处','human',22],['牛近处','cow',3.5],['牛远处','cow',22]])add(label,()=>listen(kind,distance));
    const pause=add('暂停动作',()=>{soundReviewPaused=!soundReviewPaused;pause.textContent=soundReviewPaused?'继续动作':'暂停动作';actorFootsteps.reset();});
    ui.root.append(panel);
  }
  if(requestedView&&views[requestedView])goTo(requestedView,{instant:true});
  await renderer.compileAsync(scene,camera);
  glassBudget.update(camera);
  await renderer.compileAsync(scene,camera);
  contactShadows.bake([cottage.group,modelGarden.group,vegetation.group,geology.group,bench.group]);
  if(inspectPerformance)console.info('[contact-qa] '+JSON.stringify(contactShadows.inspect()));
  animalShadows.render(camera,lighting.sun);characterShadows.render(camera,lighting.sun);
  if(inspectPerformance)console.info('[character-qa] '+JSON.stringify(characterShadows.inspect()));
  renderer.render(scene,camera);
  ui.root.dataset.ready='true';ui.loading.classList.add('done');setTimeout(()=>ui.loading.hidden=true,900);

  function frame(now){
    const updateStarted=inspectPerformance?performance.now():0;
    const rawDelta=Math.max(0,(now-lastTime)/1000),dt=Math.min(rawDelta,.05);lastTime=now;
    if(document.hidden){requestAnimationFrame(frame);return;}elapsed+=rawDelta*(soundReviewPaused?0:review.enabled?(review.paused?0:review.rate):1);
    wind.update(windReviewTime??elapsed);
    if(transition){
      transition.time+=rawDelta;const raw=Math.min(1,transition.time/transition.duration),t=raw*raw*(3-2*raw);
      camera.position.lerpVectors(transition.start,transition.end,t);camera.quaternion.slerpQuaternions(transition.startQ,transition.endQ,t);
      if(raw===1)transition=null;
    }else if(mode==='overview'){
      if(!overviewPaused&&!drag)orbit.theta=.34+Math.sin(elapsed*.035)*.06;camera.position.copy(orbitPosition());camera.lookAt(orbit.target);
    }else if(mode==='seated'||wildlifeReview)camera.rotation.set(pitch,yaw,0,'YXZ');
    else walk(dt);
    evening=THREE.MathUtils.lerp(evening,targetEvening,1-Math.exp(-dt*.9));
    lighting.update(evening,landscape,mode==='overview'?null:camera);
    if(wildlifeReview&&!wildlifeReviewPaused)wildlifeReviewClock+=rawDelta*wildlifeReviewRate;
    const actorDelta=soundReviewPaused||review.enabled&&review.paused?0:dt;
    life.update(actorDelta,elapsed,camera);reviewCamera();
    for(const event of actorFootsteps.update(actorDelta,elapsed,life,landscape.surfaceAt))audio?.actorFootstep(event,camera);
    wildlife.update(wildlifeReview?wildlifeReviewClock:elapsed,camera);
    if(wildlifeReview)wildlife.reviewCamera(wildlifeReview,camera);
    glassBudget.update(camera);review.update?.();
    cottage.setEvening?.(evening);
    landscape.update(elapsed);vegetation.update(elapsed,camera);valleyPlants.update(camera);geology.update(camera);modelGarden.update(elapsed);lawn.update(camera);fineGrass.update(camera);
    locationClock+=dt;if(mode==='walk'&&!transition&&locationClock>1){updateLocation(locationName());locationClock=0;}
    fpsTime+=rawDelta;fpsFrames++;if(fpsTime>=1){$('performance').textContent=`${Math.round(fpsFrames/fpsTime)} 帧 / 秒`;fpsTime=0;fpsFrames=0;}
    const windSample=wind.sample(camera.position.x,camera.position.z);
    if(audio&&!muted)audio.update(camera,evening,windSample);
    if(inspectPerformance){
      $('moment-status').hidden=false;
      const a=audio?.inspect();$('moment-status').textContent=`姿态 ${mode} · 屋灯 ${lampsOn?'开':'关'} · 声音 ${a?.state||'未开启'}${a?.bankDistance!==undefined?' · 距岸 '+a.bankDistance.toFixed(1)+' m · 溪水 '+a.river.toFixed(2):''}`;
      const w=wildlife.inspect();$('wildlife-status').hidden=false;$('wildlife-status').textContent=`小生物 ${w.enabled?'开':'关'} · 可见蝶 ${w.butterflies} / 鸟 ${w.birds} · ${w.phases.join('/')} · ${w.birdPhases.join('/')}`;
      $('wind-walk-status').hidden=false;$('wind-walk-status').textContent=`风强 ${windSample.strength.toFixed(3)} · 风声 ${a?.windGain?.toFixed(3)??'未开启'} · 脚步 ${a?.footsteps??0} / ${a?.lastSurface??'—'} · 脚步峰值 ${a?.maxFootPeak?.toFixed(3)??'0'} · ${mode}`;
      const detected=actorFootsteps.inspect(),right={x:camera.matrixWorld.elements[0],z:camera.matrixWorld.elements[2]};
      $('actor-sound-status').hidden=false;$('actor-sound-status').textContent=[['human','人物',life.gardener],['cow','牛',life.cattle[0].group]].map(([kind,label,actor])=>{const mix=actorSoundMixAt(actor.position,camera.position,right),s=a?.actors[kind];return `${label} 落脚 ${detected[kind]} / 播放 ${s?.played??0} · 距离 ${mix.distance.toFixed(1)} m · 增益 ${mix.gain.toFixed(3)} · 波形 ${s?.recentPeak?.toFixed(4)??'0'}`;}).join('\n');
    }
    if(inspectPerformance)renderer.info.reset();
    const renderStarted=inspectPerformance?performance.now():0;
    animalShadows.render(camera,lighting.sun);characterShadows.render(camera,lighting.sun);
    renderer.render(scene,camera);
    if(inspectPerformance&&now-lastInspection>5000){
      console.info('[valley-qa] '+JSON.stringify({view:mode,fps:$('performance').textContent,updateMs:Math.round(renderStarted-updateStarted),frameGapMs:Math.round(rawDelta*1000),renderMs:Math.round(performance.now()-renderStarted),draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,reflectionCaptures:landscape.water.userData.reflectionCaptures||0,treeLods:vegetation.visibleCounts,canopyFamilies:vegetation.visibleFamilies,edgeLayers:valleyPlants.counts,distantPanes:glassBudget.cheapCount,physicalPanes:glassBudget.physicalCount,footing:life.footing,cattle:life.cattle.map(c=>({...c.behavior.state,x:c.x,z:c.z,stops:c.roaming.stops.length})),water:landscape.stream.inspect(),pastureTufts:lawn.pastureCount,pastureBlades:fineGrass.pastureCount,characterCaptures:characterShadows.captures}));lastInspection=now;
    }
    requestAnimationFrame(frame);
  }
  lastTime=performance.now();requestAnimationFrame(frame);
}

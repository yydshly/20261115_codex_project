import * as THREE from 'three';
import { buildCottage } from './cottage.js';
import { buildVegetation } from './vegetation.js';
import { buildLandscape, seededRandom, heightAt, riverX } from './landscape.js';
import { loadNatureMaterials } from './nature.js';

const $=id=>document.getElementById(id);
const ui={root:$('experience'),canvas:$('world'),loading:$('loading'),detail:$('loading-detail'),enter:$('enter'),location:$('location'),hint:$('control-hint')};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer=matchMedia('(pointer: coarse)').matches;
let renderer;
function failure(error){
  console.error(error);$('failure').hidden=false;
  $('failure-detail').textContent='请使用开启硬件加速的现代浏览器（支持 WebGL 2）。如果画面曾正常显示，请重新进入。'+(error?.message?' '+error.message:'');
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
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#b6ced4',.00112);
  const camera=new THREE.PerspectiveCamera(52,1,.1,2300);camera.rotation.order='YXZ';
  const sun=new THREE.DirectionalLight('#fff3d9',2.65);sun.position.set(-45,85,48);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-43,right:43,top:43,bottom:-43,near:1,far:190});
  sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.025;sun.shadow.bias=-.00008;sun.shadow.radius=2.2;
  sun.target.position.set(0,0,-8);scene.add(sun,sun.target);
  const ambient=new THREE.HemisphereLight('#c5dfeb','#647443',.8);scene.add(ambient);
  const fill=new THREE.DirectionalLight('#dce9e5',.12);fill.position.set(40,28,-60);scene.add(fill);
  ui.detail.textContent='让自然光落进花园…';
  const nature=await loadNatureMaterials(renderer);
  const pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromEquirectangular(nature.sky).texture;scene.environmentIntensity=.6;scene.environmentRotation.y=Math.PI*.65;pmrem.dispose();
  const landscape=buildLandscape(scene,renderer,nature);
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const cottage=buildCottage(scene);
  const vegetation=buildVegetation(scene,{heightAt,riverX,random:seededRandom(8266)});
  // Include the front door's projection so that a visitor stops at a comfortable distance.
  cottage.colliders[0].maxZ=-5.15;
  const colliders=[...cottage.colliders,...vegetation.colliders,...landscape.colliders];
  ui.detail.textContent='花开好了，正在等你…';

  let mode='overview',yaw=0,pitch=0,sensitivity=1,evening=0,targetEvening=0,overviewPaused=reducedMotion;
  let transition=null,drag=null,toastTimer,hasEntered=false,audio=null,muted=true;
  let elapsed=0,lastTime=performance.now(),locationClock=0,shoreToast=0,fpsTime=0,fpsFrames=0;
  const keys=new Set(),velocity=new THREE.Vector2();
  const orbit={target:new THREE.Vector3(0,3,-8),theta:.45,phi:1.43,radius:58};
  const views={
    garden:{position:new THREE.Vector3(2.6,landscape.walkHeight(2.6,5.2)+1.7,5.2),target:new THREE.Vector3(-.6,2.1,-10)},
    stream:{position:new THREE.Vector3(landscape.bridgeCenter+5.7,landscape.walkHeight(landscape.bridgeCenter+5.7,18)+1.7,18),target:new THREE.Vector3(-4,2.2,-9)}
  };
  const orbitPosition=()=>new THREE.Vector3(orbit.radius*Math.sin(orbit.phi)*Math.sin(orbit.theta),orbit.radius*Math.cos(orbit.phi),orbit.radius*Math.sin(orbit.phi)*Math.cos(orbit.theta)).add(orbit.target);
  camera.position.copy(orbitPosition());camera.lookAt(orbit.target);

  function resize(){
    const {width,height}=ui.canvas.getBoundingClientRect();renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  const observer=new ResizeObserver(resize);observer.observe(ui.root);resize();
  function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
  function setActive(view){document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
  function setMode(next){
    mode=next;ui.root.dataset.mode=mode;keys.clear();velocity.set(0,0);
    const walk=mode==='walk';ui.enter.querySelector('span').textContent=walk?'返回全景':'进入花园';
    ui.hint.textContent=walk?(coarsePointer?'左侧行走 · 拖动画面环顾':'WASD 行走 · 拖动环顾 · Shift 快步'):'拖动环绕 · 滚轮拉近';
    $('touch-controls').hidden=!(walk&&coarsePointer);
    if(!walk&&document.pointerLockElement)document.exitPointerLock();
  }
  function goTo(view){
    if(document.pointerLockElement)document.exitPointerLock();
    const start=camera.position.clone(),startQ=camera.quaternion.clone();
    if(view==='overview'){
      setMode('overview');orbit.theta=.45;orbit.phi=1.43;orbit.radius=58;overviewPaused=reducedMotion;
      camera.position.copy(orbitPosition());camera.lookAt(orbit.target);
    }else{
      setMode('walk');camera.position.copy(views[view].position);camera.lookAt(views[view].target);
      const euler=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=euler.y;pitch=euler.x;
      if(!hasEntered){toast(coarsePointer?'用左侧方向键行走，拖动画面环顾':'WASD 行走，拖动环顾；双击画面可锁定鼠标');hasEntered=true;}
    }
    const end=camera.position.clone(),endQ=camera.quaternion.clone();camera.position.copy(start);camera.quaternion.copy(startQ);
    transition={start,end,startQ,endQ,time:0,duration:reducedMotion?.01:1.55};setActive(view);
    ui.canvas.focus({preventScroll:true});updateLocation(view==='overview'?'花园全景':view==='stream'?'溪畔木桥':'庭院花径');
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>goTo(b.dataset.view)));
  ui.enter.addEventListener('click',()=>goTo(mode==='walk'?'overview':'garden'));
  $('brand-home').addEventListener('click',event=>{event.preventDefault();goTo('overview');});
  const settings=$('settings');
  function toggleSettings(open){settings.hidden=!open;$('settings-toggle').setAttribute('aria-expanded',String(open));if(!open)ui.canvas.focus({preventScroll:true});}
  $('settings-toggle').addEventListener('click',()=>toggleSettings(settings.hidden));
  $('settings-close').addEventListener('click',()=>toggleSettings(false));
  $('sensitivity').addEventListener('input',e=>{sensitivity=Number(e.target.value);});
  $('quality').addEventListener('change',e=>{
    const high=e.target.value==='high';landscape.setQuality(high);renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.5:1));
    renderer.shadowMap.enabled=high;resize();toast(high?'细腻画面已开启':'已切换流畅画面');
  });
  $('light').addEventListener('click',()=>{
    targetEvening=targetEvening?0:1;$('light').setAttribute('aria-pressed',String(Boolean(targetEvening)));
    $('light').querySelector('span').textContent=targetEvening?'暮色':'晨光';
  });

  function look(dx,dy){
    if(transition)return;
    if(mode==='walk'){yaw-=dx*.0022*sensitivity;pitch=THREE.MathUtils.clamp(pitch-dy*.0022*sensitivity,-1.25,1.15);}
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
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].includes(e.code)){
      e.preventDefault();keys.add(e.code);if(e.code==='Space'&&mode==='overview'&&!e.repeat){overviewPaused=!overviewPaused;toast(overviewPaused?'观景已暂停':'继续缓缓观景');}
    }
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{keys.clear();drag=null;});
  document.addEventListener('visibilitychange',()=>{keys.clear();lastTime=performance.now();});
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
    const desired=landscape.walkHeight(camera.position.x,camera.position.z)+1.7;
    const bob=reducedMotion?0:Math.sin(elapsed*9)*.018*Math.min(1,velocity.length()/3);
    camera.position.y=THREE.MathUtils.lerp(camera.position.y,desired+bob,1-Math.exp(-14*dt));
    camera.rotation.set(pitch,yaw,0,'YXZ');
  }
  function updateLocation(text){ui.location.replaceChildren();const dot=document.createElement('i');ui.location.append(dot,document.createTextNode(text));}
  function locationName(){
    const {x,z}=camera.position;
    if(Math.abs(z-18)<2&&Math.abs(x-landscape.bridgeCenter)<9)return '溪畔木桥';
    if(Math.abs(x)<6&&z< -2&&z> -6)return '小屋门廊';
    if(Math.abs(x)<13&&z> -24&&z<9)return '庭院花径';
    if(z< -40)return '山谷林间';return '溪谷草甸';
  }

  // Original synthesized ambience; no downloaded recordings or autoplay.
  $('sound').addEventListener('click',async()=>{
    try{
      if(!audio)audio=createAmbience();await audio.context.resume();muted=!muted;
      audio.gain.gain.setTargetAtTime(muted?0:.09,audio.context.currentTime,.4);
      $('sound').setAttribute('aria-pressed',String(!muted));$('sound').setAttribute('aria-label',muted?'开启溪流与鸟鸣':'关闭环境声音');
      toast(muted?'环境声音已关闭':'听，溪流与远处的鸟鸣');
    }catch{toast('当前浏览器未能开启声音，请再试一次');}
  });
  await renderer.compileAsync(scene,camera);
  renderer.render(scene,camera);
  ui.root.dataset.ready='true';ui.loading.classList.add('done');setTimeout(()=>ui.loading.hidden=true,900);

  function frame(now){
    const rawDelta=(now-lastTime)/1000,dt=Math.min(rawDelta,.05);lastTime=now;
    if(document.hidden){requestAnimationFrame(frame);return;}elapsed+=dt;
    if(transition){
      transition.time+=dt;const raw=Math.min(1,transition.time/transition.duration),t=raw*raw*(3-2*raw);
      camera.position.lerpVectors(transition.start,transition.end,t);camera.quaternion.slerpQuaternions(transition.startQ,transition.endQ,t);
      if(raw===1)transition=null;
    }else if(mode==='overview'){
      if(!overviewPaused&&!drag)orbit.theta=.45+Math.sin(elapsed*.035)*.07;camera.position.copy(orbitPosition());camera.lookAt(orbit.target);
    }else walk(dt);
    evening=THREE.MathUtils.lerp(evening,targetEvening,1-Math.exp(-dt*.9));
    landscape.setEvening(evening);sun.color.set('#fff3d9').lerp(new THREE.Color('#ffca8b'),evening);sun.intensity=2.65-evening*1.25;
    ambient.intensity=.8-evening*.3;scene.environmentIntensity=.6-evening*.27;renderer.toneMappingExposure=1.05-evening*.07;
    landscape.update(elapsed);vegetation.update(elapsed);
    locationClock+=dt;if(mode==='walk'&&!transition&&locationClock>1){updateLocation(locationName());locationClock=0;}
    fpsTime+=rawDelta;fpsFrames++;if(fpsTime>=1){$('performance').textContent=`${Math.round(fpsFrames/fpsTime)} 帧 / 秒`;fpsTime=0;fpsFrames=0;}
    if(audio&&!muted)audio.update(elapsed);
    renderer.render(scene,camera);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function createAmbience(){
  const context=new (window.AudioContext||window.webkitAudioContext)(),gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
  const buffer=context.createBuffer(1,context.sampleRate*5,context.sampleRate),samples=buffer.getChannelData(0);
  let last=0;for(let i=0;i<samples.length;i++){const white=Math.random()*2-1;last=(last+.035*white)/1.035;samples[i]=last*4;}
  const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
  const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2600;
  source.connect(filter).connect(gain);source.start();let nextBird=3;
  return {context,gain,update(time){if(time<nextBird)return;nextBird=time+5+Math.random()*9;
    const bird=context.createOscillator(),envelope=context.createGain(),t=context.currentTime;
    bird.type='sine';bird.frequency.setValueAtTime(1800+Math.random()*500,t);bird.frequency.exponentialRampToValueAtTime(2800,t+.12);bird.frequency.exponentialRampToValueAtTime(1750,t+.3);
    envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(.08,t+.04);envelope.gain.exponentialRampToValueAtTime(.001,t+.42);
    bird.connect(envelope).connect(gain);bird.start(t);bird.stop(t+.45);bird.onended=()=>{bird.disconnect();envelope.disconnect();};
  }};
}

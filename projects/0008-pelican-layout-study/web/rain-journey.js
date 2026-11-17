import * as THREE from 'three';
import {createWorld} from './rain-world.mjs';
import {createTraveler} from './rain-traveler.mjs';
import {createInkFinish} from './rain-ink.mjs';
import {sampleJourney,CHAPTERS,DURATION,clamp,smooth} from './rain-route.mjs';

const $=id=>document.getElementById(id),body=document.body,host=$('journey'),canvas=$('rain-world');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let entered=false,playing=false,finished=false,time=0,weatherTime=0,lastFrame=0,lastPaint=0,lastChapter=-1,renderedSeconds=-1;
let renderer,scene,camera,world,traveler,finish,visible=true,dragging=false,lastX=0,lastY=0,orbitX=0,orbitY=0,orbitTargetX=0,orbitTargetY=0;
let audio=null,soundOn=false,lastAudioDrop=-1,lastAudioStep=-1;
const target=new THREE.Vector3(),offset=new THREE.Vector3(),quaternion=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
const chapters=[...document.querySelectorAll('[role=tab]')];
const clockLabel=t=>`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;

function updateUI(pose,force=false){
 const chapter=pose.chapter,cue=CHAPTERS[chapter];
 if(chapter!==lastChapter||force){
  body.dataset.chapter=chapter;$('chapter-number').textContent=['Ⅰ','Ⅱ','Ⅲ'][chapter];$('chapter-name').textContent=cue.name;$('chapter-subtitle').textContent=cue.subtitle;$('path-caption').textContent=cue.caption;
  canvas.setAttribute('aria-label',`雨的三种距离，第${chapter+1}幕${cue.name}。同一位撑伞旅人沿石径${chapter===0?'从木廊出发':chapter===1?'穿过竹林':'走到江岸，望向雾中远山'}。`);
  chapters.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===chapter));tab.tabIndex=i===chapter?0:-1;});lastChapter=chapter;updateSound();
 }
 const verses=[{start:1.7,end:6.8,text:'伸出手，\n接住眼前这一滴。'},{start:24,end:29.6,text:'雨落下来，\n青绿一层层展开。'},{start:48.8,end:54.6,text:'穿过这片叶，\n就看见更远的天地。'}];
 const verse=verses.find(v=>time>v.start&&time<v.end);
 $('verse').classList.toggle('visible',entered&&!finished&&!!verse);if(verse)$('verse-text').textContent=verse.text;
 if(Math.abs(time-renderedSeconds)>.085||force){$('journey-progress').value=time;$('journey-time').textContent=`${clockLabel(time)} / 01:08`;host.dataset.time=time.toFixed(3);host.dataset.distance=pose.distance.toFixed(4);host.dataset.position=pose.position.map(v=>v.toFixed(4)).join(',');renderedSeconds=time;}
}
function syncState(){
 body.dataset.state=finished?'finished':entered?'journey':'invitation';host.dataset.playing=String(playing);
 $('play-journey').textContent=playing?'暂停行走 Ⅱ':finished?'重走一程 ↻':'继续行走 ▷';$('play-journey').setAttribute('aria-pressed',String(playing));$('ending').hidden=!finished;
 $('invitation').inert=entered;$('invitation').setAttribute('aria-hidden',String(entered));$('journey-controls').inert=!entered;$('journey-controls').setAttribute('aria-hidden',String(!entered));updateSound();
}
function start(){time=0;weatherTime=0;entered=true;playing=true;finished=false;world.resetEffects();lastChapter=-1;syncState();updateUI(sampleJourney(time),true);history.replaceState(null,'','#journey');canvas.focus({preventScroll:true});}
function togglePlay(){if(finished||!entered){start();return;}playing=!playing;syncState();}
function seek(seconds){time=clamp(seconds,0,DURATION);entered=true;playing=false;finished=false;world.resetEffects();syncState();updateUI(sampleJourney(time),true);history.replaceState(null,'',`#at-${time.toFixed(1)}`);}
function readHash(){const match=location.hash.match(/^#at-(\d+(?:\.\d+)?)$/);if(match){time=clamp(Number(match[1]),0,DURATION);entered=true;playing=false;finished=false;}}
$('begin-journey').addEventListener('click',start);$('play-journey').addEventListener('click',togglePlay);$('replay-journey').addEventListener('click',start);
$('journey-progress').addEventListener('input',e=>seek(Number(e.target.value)));
chapters.forEach((tab,index)=>{tab.disabled=true;tab.addEventListener('click',()=>seek(Number(tab.dataset.time)));tab.addEventListener('keydown',event=>{let target;if(event.key==='ArrowRight')target=Math.min(2,index+1);if(event.key==='ArrowLeft')target=Math.max(0,index-1);if(event.key==='Home')target=0;if(event.key==='End')target=2;if(target!==undefined){event.preventDefault();seek(Number(chapters[target].dataset.time));chapters[target].focus();}});});
$('about-toggle').addEventListener('click',()=>{const notes=$('making-notes'),open=notes.hidden;notes.hidden=!open;$('about-toggle').setAttribute('aria-expanded',String(open));if(open){playing=false;syncState();notes.scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'start'});}});
function expand(active){body.classList.toggle('is-expanded',active);$('journey-expand').setAttribute('aria-pressed',String(active));$('journey-expand').textContent=active?'收起 ↙':'展开 ↗';resize();}
$('journey-expand').addEventListener('click',()=>expand(!body.classList.contains('is-expanded')));
addEventListener('keydown',event=>{if(event.key==='Escape'&&body.classList.contains('is-expanded'))expand(false);if(event.code==='Space'&&document.activeElement===canvas){event.preventDefault();togglePlay();}if(document.activeElement===canvas&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();seek(time+(event.key==='ArrowRight'?3:-3));}});
canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragging||reduced.matches)return;orbitTargetX=clamp(orbitTargetX+(e.clientX-lastX)*.003,-.38,.38);orbitTargetY=clamp(orbitTargetY+(e.clientY-lastY)*.002,-.12,.20);lastX=e.clientX;lastY=e.clientY;});
canvas.addEventListener('pointerup',()=>{dragging=false;});canvas.addEventListener('pointercancel',()=>{dragging=false;});
document.addEventListener('visibilitychange',()=>{lastFrame=0;updateSound();});new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastFrame=0;updateSound();},{threshold:.05}).observe(host);
addEventListener('hashchange',()=>{readHash();if(world){world.resetEffects();syncState();updateUI(sampleJourney(time),true);}});
function resize(){if(!renderer)return;const box=host.getBoundingClientRect();renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();if(finish)finish.resize();}
new ResizeObserver(resize).observe(host);

function createSound(){
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;const ac=new AC(),gain=ac.createGain(),filter=ac.createBiquadFilter();gain.gain.value=0;gain.connect(ac.destination);filter.type='lowpass';filter.frequency.value=1200;filter.Q.value=.35;filter.connect(gain);
 const buffer=ac.createBuffer(1,ac.sampleRate*3,ac.sampleRate),data=buffer.getChannelData(0);let seed=57;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*.5;}
 const source=ac.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(filter);source.start();audio={ac,gain,filter,buffer};return true;
}
function updateSound(){if(!audio)return;const active=soundOn&&visible&&!document.hidden;audio.gain.gain.setTargetAtTime(active?(time<12?.11:time<45?.21:.13):0,audio.ac.currentTime,.45);audio.filter.frequency.setTargetAtTime(time<12?800:time<45?2200:1350,audio.ac.currentTime,1);if(active&&audio.ac.state==='suspended')audio.ac.resume().catch(()=>{});}
$('journey-sound').addEventListener('click',()=>{if(!audio&&!createSound()){$('journey-sound').textContent='雨声不可用';return;}soundOn=!soundOn;$('journey-sound').textContent=soundOn?'雨声 开':'雨声 关';$('journey-sound').setAttribute('aria-pressed',String(soundOn));audio.ac.resume().catch(()=>{});updateSound();});
function soundEvents(pose){if(!audio||!soundOn||!visible||document.hidden)return;const ac=audio.ac,t=ac.currentTime,drop=Math.floor(weatherTime/1.7),step=Math.floor(pose.distance/.59);
 if(drop!==lastAudioDrop&&time<18){lastAudioDrop=drop;const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(1200,t);o.frequency.exponentialRampToValueAtTime(420,t+.18);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.65);o.connect(g);g.connect(audio.gain);o.start();o.stop(t+.7);}
 if(step!==lastAudioStep&&pose.walk>.3){lastAudioStep=step;const s=ac.createBufferSource(),filter=ac.createBiquadFilter(),g=ac.createGain();s.buffer=audio.buffer;filter.type='lowpass';filter.frequency.value=420;g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.0001,t+.13);s.connect(filter);filter.connect(g);g.connect(audio.gain);s.start(t,0,.14);}
}
function render(now){
 requestAnimationFrame(render);const dt=lastFrame?Math.min((now-lastFrame)/1000,1):0;lastFrame=now;if(!visible||document.hidden)return;
 if(playing){time=Math.min(DURATION,time+dt);if(time>=DURATION){playing=false;finished=true;syncState();updateUI(sampleJourney(time),true);}}
 if(!reduced.matches)weatherTime+=dt;
 orbitX+=(orbitTargetX-orbitX)*Math.min(1,dt*4);orbitY+=(orbitTargetY-orbitY)*Math.min(1,dt*4);if(!dragging){orbitTargetX*=Math.max(0,1-dt*.18);orbitTargetY*=Math.max(0,1-dt*.18);}
 if(now-lastPaint<1000/30)return;lastPaint=now;
 const pose=sampleJourney(time),actor=traveler.update(pose,weatherTime);world.update(weatherTime,pose,actor);
 offset.fromArray(pose.camera.offset);const portrait=camera.aspect<.85;if(portrait){const closeSpace=1.14+.26*(1-smooth((pose.time-5)/8));offset.multiplyScalar(closeSpace);offset.y+=.4;}
 quaternion.setFromAxisAngle(up,orbitX);offset.applyQuaternion(quaternion);offset.y+=orbitY*offset.length();
 target.set(pose.position[0]+pose.camera.target[0],pose.camera.target[1]+(portrait?.3:0),pose.position[2]+pose.camera.target[2]);camera.position.set(pose.position[0],0,pose.position[2]).add(offset);const portraitFov=portrait?8+12*smooth((pose.time-50)/18):0;camera.fov=pose.camera.fov+portraitFov;camera.updateProjectionMatrix();camera.lookAt(target);
 finish.render(scene,camera);
 if(host.dataset.ready!=='true'){$('loading').hidden=true;for(const id of['begin-journey','play-journey','journey-progress'])$(id).disabled=false;chapters.forEach(tab=>tab.disabled=false);host.dataset.ready='true';}
 updateUI(pose);soundEvents(pose);host.dataset.frames=String(Number(host.dataset.frames||0)+1);
}

try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(42,1,.1,420);world=createWorld(scene);traveler=createTraveler();scene.add(traveler.root);finish=createInkFinish(renderer);host.dataset.traveler=traveler.root.uuid;host.dataset.scene=scene.uuid;host.dataset.renderer='WebGL2';host.dataset.geometry='procedural-3d';host.dataset.art='pigment-depth-ink';
 resize();readHash();traveler.update(sampleJourney(time),0);world.update(0,sampleJourney(time));updateUI(sampleJourney(time),true);syncState();
 requestAnimationFrame(render);
}catch(error){console.error(error);host.dataset.ready='error';$('loading').innerHTML='<span>风景暂未展开。</span><p>需要支持 WebGL 2 的浏览器，请刷新后重试。</p>';}

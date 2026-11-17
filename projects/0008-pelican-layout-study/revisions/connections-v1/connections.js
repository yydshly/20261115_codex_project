import * as THREE from 'three';
import {createPassageWorld} from './connections-world.mjs';
import {METHODS,DURATION,samplePassage,clamp,ramp} from './connections-score.mjs';

const $=id=>document.getElementById(id),host=$('player'),canvas=$('passage');
let method=METHODS[0],time=0,playing=false,entered=false,dirty=true,ready=false,last=0,lastPaint=0,frames=0,visible=true;
let renderer,a,b,journey,bufferA,bufferB,finish,quadScene,quadCamera;
const size=new THREE.Vector2(),look=new THREE.Vector3(),orb=new THREE.Vector3();
const stamp=t=>`00:${Math.floor(t).toString().padStart(2,'0')}`;
for(const [index,m]of METHODS.entries()){
 const button=document.createElement('button');button.type='button';button.id=`method-${m.id}`;button.role='tab';button.setAttribute('aria-controls','player');button.innerHTML=`<span>0${index+1}</span>${m.name}`;button.addEventListener('click',()=>select(m.id,true));
 button.addEventListener('keydown',e=>{let i;if(e.key==='ArrowRight')i=(index+1)%7;if(e.key==='ArrowLeft')i=(index+6)%7;if(e.key==='Home')i=0;if(e.key==='End')i=6;if(i!==undefined){e.preventDefault();select(METHODS[i].id,true);$(`method-${METHODS[i].id}`).focus();}});$('methods').append(button);
}
function select(id,autoplay=false,at=0){
 method=METHODS.find(m=>m.id===id)||METHODS[0];time=clamp(at,0,DURATION);entered=autoplay||time>0;playing=autoplay&&ready;last=0;dirty=true;updateText();sync();if(ready)saveHash();
}
function updateText(){const n=METHODS.indexOf(method)+1;
 $('method-label').textContent=`0${n} / ${method.name}`;$('reading-kicker').textContent=`0${n} / ${method.kind}`;$('reading-title').textContent=method.title;$('reading-body').textContent=method.body;$('feeling').textContent=method.feeling;$('verse-text').textContent=method.verse;$('verse-kicker').textContent=method.kicker;$('end-line').textContent=method.end;
 for(const m of METHODS){const active=m.id===method.id,button=$(`method-${m.id}`);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
 host.setAttribute('aria-labelledby',`method-${method.id}`);canvas.setAttribute('aria-label',`${method.name}：${method.body}。按空格播放或暂停。`);
}
function sync(){
 host.dataset.playing=String(playing);host.dataset.method=method.id;host.dataset.state=!entered?'invitation':time>=24?'finished':'viewing';
 $('start').hidden=entered;$('verse').classList.toggle('quiet',entered&&time>5&&time<method.arrival);$('end-note').hidden=time<24;
 $('play').textContent=playing?'Ⅱ 暂停':time>=24?'↻ 重播':'▷ 播放';$('play').setAttribute('aria-pressed',String(playing));$('play').setAttribute('aria-label',playing?'暂停':'播放');
 $('progress').value=time;$('clock').textContent=`${stamp(time)} / 00:24`;
 $('place-label').textContent=method.id==='time'?(time<8?'午后 · 金色回廊':time<17?'入夜 · 同一座回廊':'清晨 · 同一座回廊'):time<5?'金色回廊':time<method.arrival?({walk:'循着路，向前',portal:'越过一道门',detail:'一滴之内',morph:'形状正在生长',action:'世界正在回应',match:'一个圆，另一个世界'}[method.id]):'靛蓝水庭';
 if(time>=method.arrival){$('verse-text').textContent=method.id==='time'?'晨光落下，\n还是来时的地方。':'到了这里，\n再看一会儿远方。';$('verse-kicker').textContent=method.id==='time'?'同一处空间，留下三段光阴。':'让抵达之后，也有停留。';}else{$('verse-text').textContent=method.verse;$('verse-kicker').textContent=method.kicker;}
}
function toggle(){if(!ready)return;if(time>=24)time=0;entered=true;playing=!playing;last=0;dirty=true;sync();saveHash();}
function seek(t){time=clamp(t,0,DURATION);playing=false;entered=true;dirty=true;sync();saveHash();}
function saveHash(){history.replaceState(null,'',`#${method.id}@${time.toFixed(2)}`);}
function readHash(){const m=location.hash.match(/^#([a-z]+)(?:@(\d+(?:\.\d+)?))?$/);if(m)select(m[1],false,Number(m[2]||0));}
for(const id of['start','play'])$(id).addEventListener('click',toggle);
const restart=()=>{time=0;entered=true;playing=true;dirty=true;last=0;sync();saveHash();};$('replay').addEventListener('click',restart);
$('next').addEventListener('click',()=>select(METHODS[(METHODS.indexOf(method)+1)%7].id,true));$('progress').addEventListener('input',e=>seek(Number(e.target.value)));$('turning-point').addEventListener('click',()=>{seek(method.turn);host.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});});
canvas.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();toggle();}if(['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();seek(time+(e.key==='ArrowRight'?1:-1));}});
function expand(active){document.body.classList.toggle('expanded',active);$('expand').textContent=active?'收起 ↙':'展开 ↗';$('expand').setAttribute('aria-pressed',String(active));dirty=true;resize();}
$('expand').addEventListener('click',()=>expand(!document.body.classList.contains('expanded')));addEventListener('keydown',e=>{if(e.key==='Escape')expand(false);});
addEventListener('hashchange',readHash);document.addEventListener('visibilitychange',()=>{last=0;dirty=true;});new IntersectionObserver(e=>{visible=e[0].isIntersecting;last=0;dirty=true;}).observe(host);
function resize(){if(!renderer)return;const box=host.getBoundingClientRect();renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.setSize(box.width,box.height,false);renderer.getDrawingBufferSize(size);bufferA.setSize(size.x,size.y);bufferB.setSize(size.x,size.y);finish.uniforms.pixel.value.set(1/size.x,1/size.y);finish.uniforms.aspect.value=size.x/size.y;a.portalUniforms.viewport.value.copy(size);for(const w of[a,b,journey]){w.camera.aspect=box.width/box.height;w.camera.updateProjectionMatrix();}dirty=true;}
new ResizeObserver(resize).observe(host);
function cameraAt(world,position,target,fov=44,adapt=true){
 const c=world.camera;c.position.fromArray(position);look.fromArray(target);c.fov=fov;
 if(c.aspect<.85&&adapt){const s=1.18;c.position.sub(look).multiplyScalar(s).add(look);c.fov+=9;}
 c.lookAt(look);c.updateProjectionMatrix();c.updateMatrixWorld();
}
function drawTo(world,target){renderer.setRenderTarget(target);renderer.clear();renderer.render(world.scene,world.camera);}
function render(){
 renderer.info.reset();
 const p=samplePassage(method.id,time),u=finish.uniforms;u.mode.value=0;u.amount.value=0;u.front.value=bufferA.texture;u.back.value=bufferB.texture;u.near.value=.08;u.far.value=180;
 let current=a,backNeeded=false;const destination={...p,position:p.destinationPosition||p.position,walk:method.id==='detail'||method.id==='match'?(time>16&&time<21?.45:0):p.walk,distance:Math.max(0,time-15)*.45};
 if(method.id==='walk'){
  journey.update(p);cameraAt(journey,p.camera,p.target,p.fov);drawTo(journey,bufferA);current=journey;
 }else if(method.id==='portal'){
  const crossed=p.position[2]<-4.5;b.update({...destination,position:p.destinationPosition,distance:p.distance});b.traveler.root.visible=crossed;
  cameraAt(b,p.destinationCamera,p.destinationTarget,p.fov,false);drawTo(b,bufferB);backNeeded=true;
  if(p.world==='a'){a.update(p);a.traveler.root.visible=!crossed;a.portalUniforms.view.value=bufferB.texture;cameraAt(a,p.camera,p.target,p.fov,false);drawTo(a,bufferA);}else{u.front.value=bufferB.texture;current=b;}
 }else if(method.id==='detail'){
  a.update(p);cameraAt(a,p.camera,p.target,p.fov,false);b.update(destination);cameraAt(b,p.destinationCamera,p.destinationTarget,p.fov);drawTo(b,bufferB);backNeeded=true;drawTo(a,bufferA);
  a.droplet.getWorldPosition(orb);const distance=a.camera.position.distanceTo(orb);orb.project(a.camera);u.center.value.set((orb.x+1)/2,(orb.y+1)/2);u.amount.value=(.31/(Math.max(.12,distance)*Math.tan(p.fov*Math.PI/360))*.5)*ramp(time,6.8,8)+ramp(time,10,13)*2.3;u.mode.value=time>6.8?1:0;
 }else if(method.id==='match'&&p.cut){
  b.update(destination);cameraAt(b,p.destinationCamera,p.destinationTarget,p.fov,false);drawTo(b,bufferA);current=b;
 }else{
  a.update(p);cameraAt(a,p.camera,p.target,p.fov,method.id!=='match');drawTo(a,bufferA);
 }
 renderer.setRenderTarget(null);renderer.clear();renderer.render(quadScene,quadCamera);
 host.dataset.time=time.toFixed(3);host.dataset.frame=String(++frames);host.dataset.scene=current.scene.uuid;host.dataset.actor=current.traveler.root.uuid;host.dataset.position=p.position.map(v=>v.toFixed(3)).join(',');host.dataset.composite=backNeeded?'two-spaces':'one-space';host.dataset.transition=(p.blend||0).toFixed(3);host.dataset.drawCalls=String(renderer.info.render.calls);
}
function tick(now){requestAnimationFrame(tick);const dt=last?Math.min((now-last)/1000,.15):0;last=now;if(!ready||document.hidden||!visible)return;
 if(playing){time=Math.min(24,time+dt);dirty=true;if(time>=24){playing=false;saveHash();}sync();}
 if(!dirty||now-lastPaint<1000/30)return;lastPaint=now;render();dirty=false;
}
try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.info.autoReset=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 a=createPassageWorld('a');b=createPassageWorld('b');journey=createPassageWorld('journey');
 const target=()=>new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true,depthTexture:new THREE.DepthTexture(1,1,THREE.UnsignedIntType)});bufferA=target();bufferB=target();
 finish=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{front:{value:bufferA.texture},back:{value:bufferB.texture},pixel:{value:new THREE.Vector2(1,1)},aspect:{value:1},mode:{value:0},amount:{value:0},center:{value:new THREE.Vector2(.5,.5)},near:{value:.08},far:{value:180}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`varying vec2 vUv;uniform sampler2D front;uniform sampler2D back;uniform vec2 pixel;uniform float aspect;uniform float mode;uniform float amount;uniform vec2 center;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec3 color=texture2D(front,vUv).rgb;
  if(mode>.5){float d=length((vUv-center)*vec2(aspect,1.));float mask=1.-smoothstep(amount-.008,amount+.008,d);color=mix(color,texture2D(back,vUv).rgb,mask);float ring=(1.-smoothstep(.001,.006,abs(d-amount)))*(1.-smoothstep(.6,1.,amount));color+=vec3(.35,.38,.32)*ring;}
  vec2 q=vUv-.5;float vignette=1.-.15*dot(q,q);color*=vignette;float grain=hash(floor(vUv/pixel*.8))-.5;color*=1.+grain*.038;gl_FragColor=vec4(color*vec3(1.015,1.005,.99),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 quadScene=new THREE.Scene();quadCamera=new THREE.Camera();quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),finish));resize();ready=true;host.dataset.ready='true';$('loading').hidden=true;for(const id of['start','play','progress'])$(id).disabled=false;
 readHash();updateText();sync();render();requestAnimationFrame(tick);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;ready=false;$('loading').hidden=false;$('loading').textContent='图形连接已中断，请刷新继续。';sync();});
}catch(error){host.dataset.ready='error';$('loading').textContent='画面未能启动，请使用支持 WebGL 2 的浏览器。';console.error(error);}

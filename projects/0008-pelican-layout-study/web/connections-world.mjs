import * as THREE from 'three';
import {Reflector} from './vendor/three/Reflector.js';
import {paintMaterial,roundedBox} from './rain-art.mjs';
import {createTraveler} from './rain-traveler.mjs';
import {clamp,smooth,ramp,lerp} from './connections-score.mjs';

const gold=new THREE.Color('#c6a078'),blue=new THREE.Color('#728fa9'),cream=new THREE.Color('#e0c9a0'),moonColor=new THREE.Color('#e6b991');
const mixColor=(a,b,u)=>new THREE.Color(a).lerp(new THREE.Color(b),u);
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#fff8eab0');g.addColorStop(.3,'#ffe6bc35');g.addColorStop(1,'#ffebca00');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}

export function createPassageWorld(kind='a'){
 const scene=new THREE.Scene();scene.name=`passage-${kind}`;scene.fog=new THREE.Fog('#b79a7c',22,94);
 const camera=new THREE.PerspectiveCamera(44,1,.08,180),traveler=createTraveler();scene.add(traveler.root);
 const materials=[],arches=[],floating=[],ribbons=[],leaves=[];
 const mesh=(g,m,parent,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 function pigment(a,b=a,extra={}){const m=paintMaterial(a,extra);materials.push({m,a:new THREE.Color(a),b:new THREE.Color(b)});return m;}
 const plaster=pigment('#c9a17c','#6d8eac'),edge=pigment('#e8c598','#d5d6c3'),dark=pigment('#785747','#2b5276'),bronze=pigment('#a97348','#b99178',{metalness:.35,roughness:.6});
 const groundMat=pigment('#c3aa84','#223f65',{transparent:true,depthWrite:false}),ground=mesh(new THREE.PlaneGeometry(180,160,1,1),groundMat,scene,0,-.036,-32);ground.rotation.x=-Math.PI/2;
 const reflector=new Reflector(new THREE.PlaneGeometry(180,160),{color:'#788d9b',textureWidth:512,textureHeight:320,clipBias:.006,multisample:0});reflector.rotation.x=-Math.PI/2;reflector.position.set(0,-.07,-32);reflector.name='water-with-real-reflections';scene.add(reflector);
 const skyUniforms={top:{value:new THREE.Color('#6d787d')},bottom:{value:new THREE.Color('#e4c39d')}};
 const sky=new THREE.Mesh(new THREE.SphereGeometry(145,24,16),new THREE.ShaderMaterial({uniforms:skyUniforms,side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vP;uniform vec3 top;uniform vec3 bottom;void main(){float h=smoothstep(-.03,.65,normalize(vP).y);gl_FragColor=vec4(mix(bottom,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));sky.renderOrder=-10;scene.add(sky);
 const hemi=new THREE.HemisphereLight('#f1dbc1','#575f67',2.5);scene.add(hemi);
 const key=new THREE.DirectionalLight('#ffe0a6',3.2);key.position.set(-14,17,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-25,right:25,top:25,bottom:-28,near:1,far:80});key.shadow.bias=-.0005;key.shadow.normalBias=.035;scene.add(key,key.target);
 const rim=new THREE.DirectionalLight('#90b8d8',1.5);rim.position.set(4,9,-22);scene.add(rim);
 const moonMat=new THREE.MeshBasicMaterial({color:moonColor}),moon=mesh(new THREE.SphereGeometry(4.3,48,32),moonMat,scene,0,10,-28);moon.castShadow=false;
 const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color:'#f2bf92',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.position.copy(moon.position);glow.scale.set(24,24,1);scene.add(glow);
 // Slightly uneven concentric relief keeps the moon related to the umbrella's ribs.
 for(let i=0;i<5;i++){const ring=mesh(new THREE.TorusGeometry(4.22-i*.045,.008,3,100),new THREE.MeshBasicMaterial({color:'#a79084',transparent:true,opacity:.16}),moon);ring.position.z=.22+i*.17;}
 const sun=mesh(new THREE.SphereGeometry(3.5,32,24),new THREE.MeshBasicMaterial({color:'#ffe0ad'}),scene,-26,14,-52);sun.castShadow=false;
 const columnGeo=roundedBox(.52,2.8,.64,.05),baseGeo=roundedBox(.85,.18,.90,.045),archCurve=new THREE.EllipseCurve(0,0,1.82,1.82,0,Math.PI,false,0);
 const archGeo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archCurve.getPoints(36).map(p=>new THREE.Vector3(p.x,p.y,0))),36,.27,8,false);
 const rowCount=kind==='journey'?2:4;
 for(let row=0;row<rowCount;row++)for(const side of[-1,1]){
  const g=new THREE.Group();g.position.set(side*5.2,0,-row*7-2);scene.add(g);
  for(const x of[-1.82,1.82]){mesh(columnGeo,plaster,g,x,1.48,0);mesh(baseGeo,edge,g,x,.12,0);mesh(baseGeo,edge,g,x,2.85,0);}
  mesh(archGeo,plaster,g,0,2.9,0);
  const trim=mesh(archGeo,edge,g,0,2.9,-.18);trim.scale.set(.94,.94,.8);
  const lintel=mesh(roundedBox(4.4,.25,.85,.035),dark,g,0,.03,0);
  const position=g.position.clone(),yaw=(row%2?-.1:.08)*side;
  arches.push({g,position,side,row,yaw,lintel});
 }
 // Long cut walls make the source feel enclosed; the water garden releases that pressure.
 const walls=[];
 for(const side of[-1,1]){const w=mesh(roundedBox(1.1,8,25,.1),plaster,scene,side*11.2,4,-10);walls.push(w);
  for(let j=0;j<6;j++){const slat=mesh(new THREE.BoxGeometry(4.5,.17,.24),edge,scene,side*9.2,6.2,-2-j*4.2);slat.rotation.z=side*.13;walls.push(slat);}}
 // A continuous pale path gives the actor an actual ground and a repeated measure of distance.
 const pathMat=pigment('#ddc9a4','#b0c3cb',{roughness:.55});
 for(let i=0;i<29;i++){const p=mesh(roundedBox(2.1,.12,1.05,.07),pathMat,scene,Math.sin(i*.57)*.14,.025,9-i*1.65);p.rotation.y=Math.sin(i*1.8)*.025;}
 const mountains=[];
 for(let i=0;i<8;i++){
  const shape=new THREE.Shape(),x=-55+i*15,h=7+(i%3)*4;shape.moveTo(-13,0);shape.bezierCurveTo(-10,h*.8,-4,h*.5,0,h);shape.bezierCurveTo(5,h*.65,7,h*.6,14,0);shape.lineTo(-13,0);
  const mountain=mesh(new THREE.ExtrudeGeometry(shape,{depth:3,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:1,bevelThickness:1}),pigment(i%2?'#b6957f':'#c1a98d',i%2?'#3b5b81':'#647693'),scene,x,-2,-54-(i%3)*6);mountain.castShadow=false;mountains.push(mountain);
 }
 // Floating porcelain boats/seed forms, modeled rather than image billboards.
 for(let i=0;i<16;i++){
  const g=new THREE.Group();g.position.set((i%2?1:-1)*(4+(i%5)*2.6),.25,-4-i*2.2);scene.add(g);
  const petal=mesh(new THREE.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI/2),edge,g);petal.scale.set(.25+.06*(i%3),.2,.7);petal.rotation.x=Math.PI;
  const stem=mesh(new THREE.CylinderGeometry(.012,.018,1.3,5),bronze,g,0,.62,0);stem.rotation.z=.1;
  const leaf=mesh(new THREE.SphereGeometry(1,12,8),bronze,g,0,1.33,0);leaf.scale.set(.28,.035,.12);leaf.rotation.z=.28;
  floating.push({g,y:g.position.y,i});
 }
 // Fine carved lines live in the space, catching sidelight without a flat picture backdrop.
 for(let i=0;i<13;i++){
  const pts=[];for(let j=0;j<=30;j++){const u=j/30;pts.push(new THREE.Vector3(-10+i*.065,1+u*4.4,-9+Math.sin(u*4.5+i*.11)*2.1));}
  const ribbon=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),30,.013,3,false),bronze,scene);ribbons.push(ribbon);
 }
 const dustGeo=new THREE.BufferGeometry(),dustData=[];let seed=927;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<120;i++)dustData.push((random()-.5)*22,random()*8,-random()*30);
 dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dustData,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({size:.035,color:'#ffe4bc',transparent:true,opacity:.45,depthWrite:false}));scene.add(dust);
 // A small, located object is shared by detail and action studies.
 const plinth=new THREE.Group();plinth.position.set(0,0,.2);scene.add(plinth);mesh(roundedBox(.65,1.08,.65,.04),dark,plinth,0,.53,0);mesh(roundedBox(.9,.09,.9,.05),edge,plinth,0,1.1,0);
 const droplet=mesh(new THREE.SphereGeometry(.31,36,24),new THREE.MeshPhysicalMaterial({color:'#c8e0e1',metalness:.25,roughness:.08,transparent:true,opacity:.86,clearcoat:1}),plinth,0,1.72,0);droplet.scale.y=1.35;
 const dropletHalo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color:'#97d7ed',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));dropletHalo.scale.set(2,2,1);dropletHalo.position.set(0,1.72,0);plinth.add(dropletHalo);
 const touch=new THREE.Group();touch.position.set(.40,0,.39);scene.add(touch);mesh(roundedBox(.55,.85,.45,.04),dark,touch,0,.42,0);const seedLight=mesh(new THREE.SphereGeometry(.13,20,12),new THREE.MeshBasicMaterial({color:'#ffc08b'}),touch,0,1.175,0);mesh(new THREE.CylinderGeometry(.012,.02,.3,8),bronze,touch,0,.99,0);const contactGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color:'#ffc18c',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));contactGlow.position.set(0,1.175,0);contactGlow.scale.set(1.5,1.5,1);touch.add(contactGlow);const point=new THREE.PointLight('#f4b270',0,7,1.5);point.position.set(.40,1.3,.39);scene.add(point);
 const ripple=new THREE.Mesh(new THREE.RingGeometry(.985,1,150),new THREE.MeshBasicMaterial({color:'#e9ccac',transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));ripple.rotation.x=-Math.PI/2;ripple.position.set(.35,.105,.2);scene.add(ripple);

 // The portal samples the destination render using screen projection, so the view is
 // coherent as the camera approaches. The destination has its own real 3D depth.
 const portalGroup=new THREE.Group();portalGroup.position.set(0,0,-4.5);scene.add(portalGroup);
 for(const x of[-2.7,2.7])mesh(roundedBox(.44,4.4,.65,.04),edge,portalGroup,x,2.2,0);
 const portalCurve=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI;portalCurve.push(new THREE.Vector3(Math.cos(a)*2.7,4.3+Math.sin(a)*2.7,0));}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(portalCurve),48,.23,8,false),edge,portalGroup);
 const portalShape=new THREE.Shape();portalShape.moveTo(-2.5,0);portalShape.lineTo(2.5,0);portalShape.lineTo(2.5,4.3);portalShape.absarc(0,4.3,2.5,0,Math.PI,false);portalShape.lineTo(-2.5,0);
 const portalUniforms={view:{value:null},opening:{value:0},viewport:{value:new THREE.Vector2(1,1)}};
 const portalPlane=mesh(new THREE.ShapeGeometry(portalShape,48),new THREE.ShaderMaterial({uniforms:portalUniforms,side:THREE.DoubleSide,toneMapped:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D view;uniform float opening;uniform vec2 viewport;varying vec2 vUv;void main(){vec2 uv=gl_FragCoord.xy/viewport;vec3 destination=texture2D(view,uv).rgb;gl_FragColor=vec4(mix(vec3(.16,.19,.23),destination,opening),1.);}' }),portalGroup,0,0,-.02);portalPlane.castShadow=false;

 // The continuous path includes both zones in a single scene, with no image compositing.
 if(kind==='journey'){
  for(let row=0;row<4;row++)for(const side of[-1,1]){
   const g=new THREE.Group();g.position.set(side*(5+row*.4),.65,-18-row*6);g.rotation.z=side*(.12+row*.06);scene.add(g);const m=paintMaterial('#7d9bb2');
   for(const x of[-1.82,1.82])mesh(columnGeo,m,g,x,1.48,0);mesh(archGeo,m,g,0,2.9,0);
  }
  moon.position.z=-57;glow.position.copy(moon.position);mountains.forEach(m=>m.position.z-=27);
  // Source walls end before the threshold so the eye sees the water garden ahead.
  for(const w of walls){if(w.geometry.parameters.depth>10){w.scale.z=.42;w.position.z=0;}}
  ground.geometry.dispose();ground.geometry=new THREE.PlaneGeometry(180,23);ground.position.z=4;
 }

 function update(pose){
  let u=kind==='b'?1:kind==='journey'?pose.blend:pose.blend;
  const timeStudy=pose.id==='time',isMorph=pose.id==='morph',isAction=pose.id==='action';
  if(!isMorph&&!isAction&&kind==='a')u=0;
  let lightU=timeStudy?Math.sin(clamp(pose.phase,0,2)*Math.PI/2):u;
  if(kind==='journey')lightU=pose.blend*.8;
  materials.forEach(({m,a,b})=>m.color.copy(a).lerp(b,u));
  scene.fog.color.copy(mixColor('#b99d80','#3d5875',lightU));scene.fog.near=22+lightU*10;
  skyUniforms.top.value.copy(mixColor('#71818b','#172e55',lightU));skyUniforms.bottom.value.copy(mixColor('#e6bd91','#ab9d9b',lightU));
  hemi.color.copy(mixColor('#f1dbc1','#a7c6e5',lightU));hemi.intensity=lerp(2.5,1.8,lightU);key.color.copy(mixColor('#ffe0a6','#b4d4f3',lightU));key.intensity=lerp(3.2,1.65,lightU);
  key.position.set(-14+9*lightU,17,5-18*lightU);rim.intensity=lerp(1.2,2.3,lightU);
  moon.visible=lightU>.18||kind==='b';glow.visible=moon.visible;moonMat.color.copy(moonColor);if(pose.id==='match')moonMat.color.copy(mixColor('#c2864d','#e6b991',ramp(pose.t,11,19)));sun.visible=lightU<.8;
  if(timeStudy){
   const dawn=ramp(pose.phase,1.25,2);skyUniforms.bottom.value.copy(mixColor('#e6bd91','#283c61',lightU)).lerp(new THREE.Color('#edb7a7'),dawn);skyUniforms.top.value.copy(mixColor('#71818b','#0c1b36',lightU)).lerp(new THREE.Color('#899eae'),dawn);scene.fog.color.copy(mixColor('#b99d80','#3c506b',lightU)).lerp(new THREE.Color('#d1af9f'),dawn*.8);hemi.intensity=2.5-1.75*lightU;rim.intensity=1.2-.6*lightU;
   key.position.set(-20+pose.phase*24,7+Math.abs(1-pose.phase)*13,8-pose.phase*9);key.color.copy(mixColor('#ffe0a6','#bed6f0',lightU)).lerp(new THREE.Color('#ffd2ac'),dawn);key.intensity=3.2-2.6*lightU;moon.position.set(-6+pose.phase*6,10+Math.sin(pose.phase*Math.PI)*7,-28);glow.position.copy(moon.position);sun.position.set(28,2+dawn*10,-45);sun.visible=pose.phase>1.35||pose.phase<.5;
  }else{moon.position.set(0,10,kind==='journey'?-57:-28);glow.position.copy(moon.position);}
  groundMat.opacity=kind==='b'?.06:kind==='journey'?1:timeStudy?1:1-u*.96;
  reflector.visible=kind==='b'||kind==='journey'||u>.025;
  for(const a of arches){
   let f=kind==='b'?1:isMorph?u:isAction?smooth((pose.wave-Math.hypot(a.position.x-.35,a.position.z-.2))/8):0;
   a.g.position.copy(a.position);a.g.position.x+=a.side*f*(.3+a.row*.22);a.g.position.y=f*(.8+a.row*.28);a.g.rotation.z=a.side*f*(.2+a.row*.055);a.g.rotation.y=a.yaw*f;a.g.scale.set(1+.12*f,1+.18*f,1);
  }
  walls.forEach(w=>{w.visible=kind!=='b'&&u<.97;w.scale.y=1-u*.97;});
  floating.forEach(({g,y,i})=>{g.visible=kind==='b'||kind==='journey'||u>.04;g.position.y=y+Math.sin(pose.t*.55+i)*.06;g.scale.setScalar(kind==='b'||kind==='journey'?1:Math.max(.001,u));});
  dust.rotation.y=pose.t*.009;dust.material.opacity=.28+lightU*.18;
  ribbons.forEach(r=>{r.visible=u<.85;});
  plinth.visible=pose.id==='detail'&&kind==='a';touch.visible=isAction&&kind==='a';
  droplet.rotation.y=pose.t*.2;dropletHalo.material.opacity=.6+.2*Math.sin(pose.t*1.2);
  point.intensity=isAction?(1-ramp(pose.t,7,13))*5*ramp(pose.t,5.5,6.3):0;seedLight.scale.setScalar(1+.18*Math.sin(pose.t*2));
  ripple.visible=isAction&&pose.wave>0&&pose.wave<45;if(ripple.visible){ripple.scale.setScalar(Math.max(.01,pose.wave));ripple.material.opacity=(1-clamp(pose.wave/50))*.65;}
  portalGroup.visible=pose.id==='portal'&&kind==='a';portalUniforms.opening.value=pose.blend;
  const actorPose={...pose,time:pose.t+12,position:pose.position};traveler.update(actorPose,pose.t);
  traveler.root.visible=true;
 }
 return{scene,camera,traveler,update,reflector,moon,portalUniforms,portalPlane,plinth,droplet,stats:{arches:arches.length,realReflection:true}};
}

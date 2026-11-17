import * as THREE from 'three';
import {Reflector} from './vendor/three/Reflector.js';
import {paintMaterial,roundedBox,makeLightShaft} from './rain-art.mjs';
import {createTraveler} from './rain-traveler.mjs';
import {GATE} from './portal-score.mjs';

const mesh=(parent,g,m,x=0,y=0,z=0,shadow=true)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;};
const mix=(a,b,u)=>a+(b-a)*u;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
const line=(parent,points,color,opacity=1)=>{const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(o);return o;};
const tube=(parent,pts,r,material)=>mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),24,r,6,false),material);
const paper=(color,extra={})=>paintMaterial(color,{side:THREE.DoubleSide,roughness:.95,...extra});
function engraved(color='#d6c5a5',density=13){
 const material=paper(color),base=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{base(shader);shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  vec3 etch=vWashWorld;float stroke=abs(sin((etch.x+etch.z*.68+etch.y*.37)*${density.toFixed(1)}));float crossStroke=abs(sin((etch.y-etch.x*.28+etch.z*.52)*${(density*.74).toFixed(1)}));
  float carved=(1.-smoothstep(.035,.13,stroke))*.22+(1.-smoothstep(.02,.08,crossStroke))*.09;diffuseColor.rgb*=1.-carved;`);};
 material.customProgramCacheKey=()=>`engraved-${density}`;return material;
}
function radialTexture(){const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d'),g=cx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#fff8dbdd');g.addColorStop(.2,'#fff2c76b');g.addColorStop(1,'#fff2c700');cx.fillStyle=g;cx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
function sky(scene,top,bottom){
 const uniforms={top:{value:new THREE.Color(top)},bottom:{value:new THREE.Color(bottom)}};
 const o=mesh(scene,new THREE.SphereGeometry(160,24,16),new THREE.ShaderMaterial({uniforms,side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vP;uniform vec3 top;uniform vec3 bottom;void main(){float h=smoothstep(-.03,.7,normalize(vP).y);gl_FragColor=vec4(mix(bottom,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}),0,0,0,false);o.receiveShadow=false;return uniforms;
}
function lighting(scene,isGarden){
 const hemi=new THREE.HemisphereLight(isGarden?'#e7ebc9':'#ddd5bf',isGarden?'#284d4a':'#22232b',isGarden?2.15:1.15);scene.add(hemi);
 const key=new THREE.DirectionalLight(isGarden?'#ffe3ad':'#f0dec1',isGarden?2.7:2.2);key.position.set(isGarden?-9:-12,18,isGarden?-12:8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-20,right:20,top:26,bottom:-24,near:1,far:70});key.shadow.bias=-.0005;key.shadow.normalBias=.025;scene.add(key,key.target);
 const rim=new THREE.DirectionalLight(isGarden?'#b2ddd3':'#94aaa5',isGarden?1.4:.5);rim.position.set(8,8,-15);scene.add(rim);return{hemi,key,rim};
}
function actor(scene,plane){
 const a=createTraveler(),seen=new Set();scene.add(a.root);
 a.root.traverse(o=>{if(!o.isMesh)return;for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(!seen.has(m)){seen.add(m);m.clippingPlanes=[plane];m.clipShadows=true;}});
 return a;
}
const doorShape=()=>{const s=new THREE.Shape();s.moveTo(-2.45,0);s.lineTo(2.45,0);s.lineTo(2.45,4.3);s.absarc(0,4.3,2.45,0,Math.PI,false);s.lineTo(-2.45,0);return s;};
function makeDoor(scene,z,reverse=false){
 const frame=new THREE.Group();frame.position.z=z;scene.add(frame);
 const ink=engraved(reverse?'#70877c':'#35353b',18),ivory=engraved(reverse?'#e9c599':'#e9dcc2',21);
 for(const x of[-2.65,2.65]){mesh(frame,roundedBox(.37,4.4,.64,.04),ink,x,2.2);mesh(frame,roundedBox(.055,4.35,.68,.01),ivory,x+(x>0?-.06:.06),2.2);}
 const pts=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI;pts.push([Math.cos(a)*2.65,4.3+Math.sin(a)*2.65,0]);}tube(frame,pts,.18,ink);tube(frame,pts.map(p=>[p[0]*.985,4.3+(p[1]-4.3)*.985,.06]),.035,ivory);
 const uniforms={view:{value:null},opening:{value:0},viewport:{value:new THREE.Vector2(1,1)},reverse:{value:reverse?1:0}};
 const material=new THREE.ShaderMaterial({uniforms,side:THREE.DoubleSide,toneMapped:false,vertexShader:'varying vec2 vDoor;void main(){vDoor=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D view;uniform float opening;uniform vec2 viewport;uniform float reverse;varying vec2 vDoor;
 void main(){float width=2.48*opening;float aperture=1.-smoothstep(width-.018,width+.018,abs(vDoor.x));float hatch=smoothstep(.88,.99,sin(vDoor.x*48.+vDoor.y*11.));vec3 page=vec3(.34,.31,.25)*(1.-hatch*.15);vec3 other=texture2D(view,gl_FragCoord.xy/viewport).rgb;float light=(1.-smoothstep(.01,.06,abs(abs(vDoor.x)-width)))*opening*(1.-opening)*2.;gl_FragColor=vec4(mix(page,other,aperture)+vec3(.32,.4,.24)*light,1.);}`});
 const surface=mesh(frame,new THREE.ShapeGeometry(doorShape(),48),material,0,0,reverse?.025:-.025,false);surface.receiveShadow=false;
 mesh(frame,roundedBox(5.4,.12,1.1,.04),ivory,0,.02,0);
 return{frame,surface,uniforms};
}

function sourceWorld(){
 const scene=new THREE.Scene();scene.name='engraved-archive';scene.fog=new THREE.Fog('#9e9b91',17,60);const camera=new THREE.PerspectiveCamera(44,1,.08,220);
 const light=lighting(scene,false);sky(scene,'#535e61','#c0b9a4');
 const ivory=engraved('#cdbf9e',19),dark=engraved('#37383b',28),chalk=engraved('#e0d3b6',15),stone=engraved('#938c7e',17);
 const ground=mesh(scene,new THREE.PlaneGeometry(55,65),ivory,0,-.035,0);ground.rotation.x=-Math.PI/2;
 for(let i=0;i<22;i++){const z=12-i*1.05;line(scene,[[-7,.006,z],[7,.006,z]],'#47484a',.38);}
 for(const x of[-5.8,-2.9,0,2.9,5.8])line(scene,[[x,.009,15],[x,.009,-8]],'#505050',.3);
 for(const side of[-1,1]){
  mesh(scene,roundedBox(1,9,29,.02),ivory,side*7,4.45,3);
  for(let i=0;i<5;i++){
   const z=11-i*4.5;
   mesh(scene,roundedBox(.82,8.5,.8,.02),chalk,side*6.2,4.2,z);mesh(scene,roundedBox(1.05,.3,1,.02),dark,side*6.2,.13,z);
   mesh(scene,roundedBox(.28,9,.9,.01),dark,side*6.7,4.48,z);
   mesh(scene,new THREE.BoxGeometry(13.4,.18,.23),dark,0,8.2,z);
  }
  // The frames are sculpted print plates: relief, ink paths and their own shadows.
  for(let i=0;i<3;i++){
   const panel=new THREE.Group();panel.position.set(side*6.35,3.7,6.5-i*5.5);panel.rotation.y=-side*Math.PI/2;scene.add(panel);
   mesh(panel,roundedBox(3.4,4.35,.14,.03),dark);mesh(panel,new THREE.BoxGeometry(3.13,4.08,.08),chalk,0,0,.11);
   for(let j=0;j<9;j++){const pts=[];for(let k=0;k<=30;k++){const x=-1.4+k/30*2.8,y=-1.65+j*.15+Math.sin(x*1.6+j*.13+i)*(.13+j*.02);pts.push([x,y,.17]);}line(panel,pts,'#424742',.8);}
   tube(panel,[[-.3,-.3,.18],[-.4,.5,.19],[-.28,1.35,.18]],.022,dark);
   for(let j=0;j<8;j++){const y=j*.17;line(panel,[[-.35,y,.2],[-1.1+Math.sin(j)*.15,y+.44,.2]],'#464842');line(panel,[[-.35,y,.2],[.6,y+.55,.2]],'#464842');}
   const disc=mesh(panel,new THREE.CircleGeometry(.4,40),stone,.76,.9,.2,false);disc.receiveShadow=false;
  }
 }
 // A single aperture interrupts the solid end wall; the rest is truly enclosing geometry.
 for(const x of[-8,8])mesh(scene,roundedBox(10.7,10.5,1,.02),ivory,x,5.2,-5.7);
 mesh(scene,roundedBox(5.7,3.4,1,.02),ivory,0,8.6,-5.7);
 for(let i=0;i<8;i++)for(const side of[-1,1]){const block=mesh(scene,new THREE.BoxGeometry(.3,1.5+.12*i,1.7),i%2?dark:stone,side*(4.5+(i%2)*.18),.75+i*.08,-2.4);block.rotation.z=side*.035;}
 const door=makeDoor(scene,GATE.source),traveler=actor(scene,new THREE.Plane(new THREE.Vector3(0,0,1),-GATE.source));
 const spill=new THREE.PointLight('#edc46f',0,17,1.1);spill.position.set(0,2.8,-4.6);scene.add(spill);
 const shaft=makeLightShaft(scene,[0,4.8,-5.15],[.3,.03,4.8],2.2);shaft.uniforms.uColor.value.set('#c8dab1');
 const spillMat=new THREE.MeshBasicMaterial({color:'#c9d9a6',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
 const spillGeo=new THREE.BufferGeometry();spillGeo.setAttribute('position',new THREE.Float32BufferAttribute([-2.3,.012,-5.2,2.3,.012,-5.2,4,.012,4,-2.3,.012,-5.2,4,.012,4,-3,.012,4],3));spillGeo.computeVertexNormals();mesh(scene,spillGeo,spillMat,0,0,0,false);
 const visitorPetal=mesh(scene,leafGeometry(.24,.65,.08),paper('#e78566'),0,.2,0,false);
 const dustGeo=new THREE.BufferGeometry(),positions=[];for(let i=0;i<90;i++)positions.push(Math.sin(i*24.3)*6,((i*19.7)%1)*7,Math.cos(i*7.3)*7+2);dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#ded4b9',size:.023,transparent:true,opacity:.4,depthWrite:false}));scene.add(dust);
 return{scene,camera,traveler,door,update(p){
  traveler.update({...p,time:p.t+12},p.t);spill.intensity=p.opening*4.4;spillMat.opacity=p.opening*.14;shaft.uniforms.uStrength.value=p.opening*.08;
  const u=ramp(p.t,3.4,8.3);visitorPetal.visible=p.t>=3.4&&p.t<11;visitorPetal.position.set(-.4+Math.sin(u*4)*.8,1.5*(1-u)+Math.sin(u*Math.PI)*.5,-5.3+u*7.1);visitorPetal.rotation.set(u*3,0,u*8);visitorPetal.scale.setScalar(1-ramp(p.t,8,11));
  door.uniforms.opening.value=p.opening;dust.rotation.y=p.t*.003;
 }};
}

function leafGeometry(width,length,cup=.3){
 const rows=18,cols=8,positions=[],uvs=[],indices=[];
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
  const u=i/rows,v=j/cols*2-1,w=Math.pow(Math.max(0,Math.sin(u*Math.PI)),.72)*width;
  positions.push(v*w+.2*width*Math.sin(u*Math.PI),u*length,Math.sin(u*Math.PI)*cup+v*v*w*.19+Math.sin(u*8+v)*.035*Math.sin(u*Math.PI));uvs.push(j/cols,u);
  if(i<rows&&j<cols){const k=i*(cols+1)+j;indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function gardenWorld(){
 const scene=new THREE.Scene();scene.name='wind-grown-painted-garden';scene.fog=new THREE.Fog('#b7cbbb',27,110);const camera=new THREE.PerspectiveCamera(44,1,.08,220);lighting(scene,true);sky(scene,'#407d88','#f1c7a1');
 const greens=['#296b64','#4e8a73','#87aa7d','#547e83','#b1b77d'],corals=['#dc826b','#eca57e','#d6a653','#efc09a'],mats=greens.map(c=>paper(c)),stemMat=paper('#32675b'),veinMat=new THREE.LineBasicMaterial({color:'#d7d1a0',transparent:true,opacity:.6});
 const plants=[],petals=[];
 function addLeaf(parent,w,h,color,angle=0){
  const group=new THREE.Group();parent.add(group);const leaf=mesh(group,leafGeometry(w,h,.25+h*.03),color,0,0,0);leaf.rotation.y=.15;group.rotation.z=angle;
  const pts=[];for(let i=0;i<=22;i++){const u=i/22;pts.push([.2*w*Math.sin(u*Math.PI),u*h,Math.sin(u*Math.PI)*(.25+h*.03)+.025]);}line(group,pts,'#dbd4a7',.52);
  for(const u of[.3,.48,.65,.8])for(const side of[-1,1])line(group,[[.2*w*Math.sin(u*Math.PI),u*h,Math.sin(u*Math.PI)*(.25+h*.03)+.03],[side*Math.sin((u+.09)*Math.PI)*w*.82,(u+.09)*h,Math.sin((u+.09)*Math.PI)*(.25+h*.03)+w*.11+.03]],'#e4d4a9',.35);
  return group;
 }
 const plantSites=[[-4,1],[-5,-5],[5.5,-1],[6.5,-8],[-8,-12],[9,-15],[-13,-18],[15,-24],[-4.8,-25],[6.5,-28],[-18,-32],[19,-36]];
 plantSites.forEach(([x,z],i)=>{
  const root=new THREE.Group();root.position.set(x,0,z);root.rotation.y=(i%3)*.8;scene.add(root);const h=4+(i%4)*1.35;
  const island=mesh(scene,new THREE.SphereGeometry(1,24,12),mats[i%5],x,-.12,z);island.scale.set(2.5+(i%3),.32,3.2);
  tube(root,[[0,0,0],[Math.sin(i)*.3,h*.5,.05],[Math.sin(i)*.65,h,0]],.065,stemMat);
  for(let j=0;j<4;j++){const holder=new THREE.Group();holder.position.set(Math.sin(i)*.3,h*(.28+j*.17),0);holder.rotation.y=j*1.75+i*.6;root.add(holder);const l=addLeaf(holder,.8+(i%3)*.26,2.1+(j%2)*.8,mats[(i+j)%5],(j%2?1:-1)*(.6+j*.12));l.rotation.x=.12+j*.1;}
  plants.push({root,i,base:root.rotation.z});
 });
 // Two large flowers are composed of curved modeled petals and fine seed relief.
 for(const [index,site]of [[0,[-3.6,6.8,-14]],[1,[6.5,5.5,-21]]]){
  const root=new THREE.Group();root.position.set(site[0],0,site[2]);scene.add(root);tube(root,[[0,0,0],[.7,site[1]*.45,.2],[0,site[1],0]],.1,stemMat);
  const flower=new THREE.Group();flower.position.y=site[1];root.add(flower);flower.rotation.x=.42;flower.rotation.z=index?-.22:.14;
  for(let j=0;j<7;j++){const pivot=new THREE.Group();pivot.rotation.z=j/7*Math.PI*2;flower.add(pivot);const leaf=mesh(pivot,leafGeometry(.92,2.8,.55),paper(corals[(j+index)%4]));leaf.rotation.x=-.45;petals.push({leaf,j});}
  const heart=mesh(flower,new THREE.SphereGeometry(.52,22,14),paper('#dba84d'),0,0,.35);heart.scale.z=.38;
  const dots=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,6,5),paper('#774b35'),31),dummy=new THREE.Object3D();for(let j=0;j<31;j++){const r=Math.sqrt(j/31)*.43,a=j*2.399;dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,.52);dummy.updateMatrix();dots.setMatrixAt(j,dummy.matrix);}flower.add(dots);plants.push({root,i:index+18,base:0});
 }
 const sun=mesh(scene,new THREE.SphereGeometry(7.1,40,28),new THREE.MeshBasicMaterial({color:'#f5d7a3'}),-15,17,-54,false);sun.receiveShadow=false;
 const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:radialTexture(),color:'#eccd9d',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));halo.position.copy(sun.position);halo.scale.set(38,38,1);scene.add(halo);
 // Far banks use broad painted contours rather than the source's etched straight lines.
 for(let layer=0;layer<4;layer++){
  const verts=[],idx=[],n=80;for(let i=0;i<=n;i++){const x=-95+i/n*190,y=3+layer*1.9+Math.sin(x*.07+layer)*2.3+Math.cos(x*.13-layer)*1.2;verts.push(x,-.3,-45-layer*9,x,y,-45-layer*9);if(i<n){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();mesh(scene,g,paper(['#638d87','#87a49a','#a9bab0','#c2c9b7'][layer]),0,0,0,false);
 }
 const clock={value:0},base=Reflector.ReflectorShader;
 const waterShader={uniforms:{...THREE.UniformsUtils.clone(base.uniforms),uTime:clock},vertexShader:base.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 vWater;').replace('vUv = textureMatrix','vWater=(modelMatrix*vec4(position,1.)).xyz;vUv = textureMatrix'),fragmentShader:base.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 vWater; uniform float uTime;').replace('vec4 base = texture2DProj( tDiffuse, vUv );','vec4 wave=vUv;wave.x+=sin(vWater.z*2.1+vWater.x*.6+uTime*.8)*.0017*wave.w;wave.y+=cos(vWater.x*1.3+uTime*.5)*.0008*wave.w;vec4 base=texture2DProj(tDiffuse,wave);').replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','vec3 paint=mix(blendOverlay(base.rgb,color),vec3(.14,.32,.30),.22);paint+=sin(vWater.z*8.+sin(vWater.x*.2)*5.+uTime*.45)*.008;float fog=1.-exp(-pow(distance(cameraPosition,vWater)*.016,2.));gl_FragColor=vec4(mix(paint,vec3(.53,.65,.58),fog),1.);')};
 const lake=new Reflector(new THREE.PlaneGeometry(220,220),{color:'#7eaca0',textureWidth:640,textureHeight:360,clipBias:.006,multisample:0,shader:waterShader});lake.rotation.x=-Math.PI/2;lake.position.set(0,-.12,-60);scene.add(lake);
 // Curved ochre causeway: one continuous physical route through the water.
 const verts=[],indices=[],segments=70;for(let i=0;i<=segments;i++){const z=14-i/segments*60,x=z>-5?0:Math.sin((-z-5)*.09)*2.6;for(const side of[-1,1])verts.push(x+side*(1.5+Math.sin(i*.37)*.08),-.012+Math.sin(i*.3)*.008,z);if(i<segments){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
 const pathGeo=new THREE.BufferGeometry();pathGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));pathGeo.setIndex(indices);pathGeo.computeVertexNormals();mesh(scene,pathGeo,paper('#cbb98a'));
 const paving=paper('#e4d3ab');for(let i=0;i<17;i++){const z=12-i*1.3,x=z>-5?0:Math.sin((-z-5)*.09)*2.6;const tile=mesh(scene,roundedBox(1.65,.085,.94,.055),paving,x,.012,z);tile.rotation.y=Math.sin(i*3)*.035;}
 for(let i=0;i<14;i++){const pad=mesh(scene,new THREE.CircleGeometry(.45+(i%3)*.26,26,.12,Math.PI*1.88),mats[i%5],(i%2?1:-1)*(2.5+(i%5)*1.7),-.055,-2-i*2.4,false);pad.rotation.x=-Math.PI/2;pad.rotation.z=i*.8;}
 const pollenGeo=new THREE.BufferGeometry(),points=[];for(let i=0;i<95;i++)points.push(Math.sin(i*7.3)*17,1+(i*3.7)%9,-(i*1.17)%42);pollenGeo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const pollen=new THREE.Points(pollenGeo,new THREE.PointsMaterial({color:'#f5dc9f',size:.045,transparent:true,opacity:.5,depthWrite:false}));scene.add(pollen);
 const reverseDoor=makeDoor(scene,GATE.destination,true),traveler=actor(scene,new THREE.Plane(new THREE.Vector3(0,0,-1),GATE.destination));
 const ripples=[];for(let i=0;i<4;i++){const ring=mesh(scene,new THREE.RingGeometry(.985,1,96),new THREE.MeshBasicMaterial({color:'#dbdfb6',transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false}),0,-.04,0,false);ring.rotation.x=-Math.PI/2;ripples.push(ring);}
 return{scene,camera,traveler,door:reverseDoor,update(p){
  traveler.update({...p,time:p.t+12,position:p.destinationPosition},p.t);clock.value=p.t;lake.material.uniforms.uTime.value=p.t;
  plants.forEach(({root,i,base})=>{root.rotation.z=base+Math.sin(p.t*.6+i*.9)*.032+Math.sin(p.t*.35-root.position.z*.04)*.025;root.rotation.x=Math.sin(p.t*.43+i*.5)*.018;});petals.forEach(({leaf,j})=>leaf.rotation.x=-.45+Math.sin(p.t*.72+j)*.04);pollen.rotation.y=p.t*.008;
  ripples.forEach((r,i)=>{const u=(p.t*.15+i*.25)%1;r.position.x=i%2?3.6:-3.8;r.position.z=-4-i*5;r.scale.setScalar(.1+u*1.4);r.material.opacity=(1-u)*.25;});reverseDoor.uniforms.opening.value=1;
 }};
}

export function createPortalWorlds(){return{source:sourceWorld(),garden:gardenWorld()};}

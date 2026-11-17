import * as THREE from 'three';
import {Reflector} from './vendor/three/Reflector.js';
import {pathAt,PATH_LENGTH,sampleJourney,smooth,clamp} from './rain-route.mjs';
import {paintMaterial,surfaceTexture,wetStoneGeometry,makeMist,makeLightShaft} from './rain-art.mjs';

export function createWorld(scene){
 const rnd=(()=>{let n=4087;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};})(),range=(a,b)=>a+rnd()*(b-a);
 const clock={value:0},pathSamples=Array.from({length:180},(_,i)=>pathAt(i/179*PATH_LENGTH));
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),quaternion=new THREE.Quaternion(),axisY=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
 const standard=(color,extra={})=>paintMaterial(color,extra);
 function mesh(g,m,p=[0,0,0],parent=scene,shadow=true){const o=new THREE.Mesh(g,m);o.position.fromArray(p);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;}
 function batch(g,m,transforms,shadow=true){const o=new THREE.InstancedMesh(g,m,transforms.length);o.castShadow=shadow;o.receiveShadow=true;transforms.forEach((v,i)=>{position.fromArray(v.p);scale.fromArray(v.s||[1,1,1]);quaternion.setFromEuler(new THREE.Euler(...(v.r||[0,0,0])));if(v.q)quaternion.fromArray(v.q);matrix.compose(position,quaternion,scale);o.setMatrixAt(i,matrix);if(v.c)o.setColorAt(i,new THREE.Color(v.c));});o.computeBoundingSphere();scene.add(o);return o;}
 function segmentTransform(a,b,radius){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);direction.subVectors(end,start);quaternion.setFromUnitVectors(axisY,direction.clone().normalize());return{p:start.add(end).multiplyScalar(.5).toArray(),s:[radius,direction.length(),radius],q:quaternion.toArray()};}
 function nearestPath(x,z){let best=Infinity;for(const p of pathSamples)best=Math.min(best,Math.hypot(p[0]-x,p[2]-z));return best;}
 function terrainHeight(x,z){const shore=-36.4+Math.sin(x*.18)*.65+Math.sin(x*.43)*.28;if(z<shore)return-(shore-z)*.30;const noise=(Math.sin(x*.93+z*.2)+Math.sin(z*.7-x*.21))*.025;return nearestPath(x,z)<1.7?-.015:noise;}
 const groundTexture=surfaceTexture('stone',rnd),woodTexture=surfaceTexture('wood',rnd);
 const groundGeo=new THREE.PlaneGeometry(110,100,100,90);groundGeo.rotateX(-Math.PI/2);groundGeo.translate(0,0,-.5);const gp=groundGeo.attributes.position,colors=[];
 for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i);gp.setY(i,terrainHeight(x,z));const moss=.5+.5*Math.sin(x*.33+Math.cos(z*.22)),v=range(.94,1.04);const color=new THREE.Color().setRGB((.68+moss*.13)*v,(.79+moss*.09)*v,(.73+moss*.07)*v);colors.push(color.r,color.g,color.b);}
 groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.computeVertexNormals();mesh(groundGeo,standard('#839c93',{map:groundTexture,vertexColors:true,roughness:.74}),[0,0,0],scene,false);
 const stoneMat=standard('#899e9b',{roughness:.31,metalness:.08,map:groundTexture}),stones=[];
 for(let i=0;i<92;i++){const d=i/91*PATH_LENGTH,p=pathAt(d),q=pathAt(Math.min(PATH_LENGTH,d+.1)),yaw=Math.atan2(q[0]-p[0],q[2]-p[2]);for(let side of[-1,1])stones.push({p:[p[0]+Math.cos(yaw)*side*.36,0,p[2]-Math.sin(yaw)*side*.36],s:[range(.40,.52),.06,range(.30,.40)],r:[0,yaw+range(-.15,.15),0],c:new THREE.Color().setHSL(.44,range(.03,.11),range(.64,.82))});}
 batch(wetStoneGeometry(),stoneMat,stones);
 const ribbonPositions=[],ribbonIndices=[];
 for(let i=0;i<=180;i++){const p=pathAt(i/180*PATH_LENGTH),q=pathAt(Math.min(PATH_LENGTH,i/180*PATH_LENGTH+.1)),yaw=Math.atan2(q[0]-p[0],q[2]-p[2]);for(const side of[-1,1])ribbonPositions.push(p[0]+Math.cos(yaw)*side*.96,-.005,p[2]-Math.sin(yaw)*side*.96);if(i<180){const a=i*2;ribbonIndices.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const ribbonGeo=new THREE.BufferGeometry();ribbonGeo.setAttribute('position',new THREE.Float32BufferAttribute(ribbonPositions,3));ribbonGeo.setIndex(ribbonIndices);ribbonGeo.computeVertexNormals();mesh(ribbonGeo,standard('#657f77',{roughness:.49,metalness:.06}),[0,0,0],scene,false);
 const rockTransforms=[];
 for(let i=0;i<55;i++){const x=range(-15,16),z=range(-36,9);if(nearestPath(x,z)<2.3||z>-.8&&x>-2)continue;const size=range(.11,.48);rockTransforms.push({p:[x,terrainHeight(x,z)+size*.13,z],s:[size*range(1.2,1.9),size*.62,size],r:[rnd()*.4,rnd()*6,rnd()*.3],c:new THREE.Color().setHSL(.42,.08,range(.56,.76))});}
 for(const [x,z,s]of[[1.9,.3,.28],[2.2,.1,.19],[7.2,-35.6,.53],[-.5,-36.0,.35]])rockTransforms.push({p:[x,terrainHeight(x,z)+s*.15,z],s:[s*1.5,s*.65,s],r:[.1,x*.7,.1],c:'#9aafa4'});
 const rockGeo=new THREE.IcosahedronGeometry(1,2),rp=rockGeo.attributes.position;for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),r=1+.08*Math.sin(x*4+z*5)+.05*Math.cos(y*6-z);rp.setXYZ(i,x*r,y*r,z*r);}rockGeo.computeVertexNormals();batch(rockGeo,standard('#657d70',{roughness:.47,metalness:.04}),rockTransforms);

 // The pavilion is open to the path: roof, supporting beams and basin are all meshes.
 const pavilion=new THREE.Group();scene.add(pavilion);pavilion.name='eaves-and-courtyard';
 const timber=standard('#85664e',{map:woodTexture,roughness:.80}),roofMat=standard('#415858',{roughness:.47,metalness:.07});
 mesh(new THREE.BoxGeometry(8.2,.13,7.8),standard('#7c8b77',{roughness:.72}),[-4.1,-.06,3.55],pavilion);
 for(const x of[-7.8,-1.0])for(const z of[.3,6.6]){
  mesh(new THREE.BoxGeometry(.25,3.45,.25),timber,[x,1.72,z],pavilion);mesh(new THREE.CylinderGeometry(.23,.25,.24,8),stoneMat,[x,.12,z],pavilion);
 }
 for(const z of[.3,6.6])mesh(new THREE.BoxGeometry(8,.29,.24),timber,[-4.05,3.35,z],pavilion);
 for(const x of[-7.8,-1.0])mesh(new THREE.BoxGeometry(.24,.25,7.2),timber,[x,3.3,3.45],pavilion);
 const roofY=x=>4.83-1.65*Math.pow(Math.abs((x+4.2)/4.75),.8)+.25*Math.pow(Math.abs((x+4.2)/4.75),12);
 const roofPos=[],roofIds=[],nx=36,nz=14;for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const x=-8.95+i/nx*9.5,z=-.65+j/nz*8.2;roofPos.push(x,roofY(x),z);}
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const a=i*(nz+1)+j,b=a+nz+1;roofIds.push(a,a+1,b,a+1,b+1,b);}
 const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(roofPos,3));roofGeo.setIndex(roofIds);roofGeo.computeVertexNormals();mesh(roofGeo,standard('#45595b',{side:THREE.DoubleSide,roughness:.62}),[0,0,0],pavilion);
 const tiles=[];for(let side of[-1,1])for(let i=0;i<8;i++)for(let j=0;j<20;j++){const x=-4.2+side*(.20+i*.57),y=roofY(x)+.045,z=-.65+j*.418;const slope=(roofY(x+.01)-roofY(x-.01))/.02;tiles.push(segmentTransform([x-.28,y-.28*slope,z],[x+.28,y+.28*slope,z],.075));}
 const tileBatch=batch(new THREE.CylinderGeometry(1,1,1,6,1,true,0,Math.PI),roofMat,tiles);tileBatch.name='curved-roof-tiles';
 mesh(new THREE.CylinderGeometry(.13,.13,8.5,8),roofMat,[-4.2,4.90,3.45],pavilion).rotation.x=Math.PI/2;
 for(const z of[.1,2.6,5.1])mesh(new THREE.BoxGeometry(.16,.18,8),timber,[-4.05,3.05,z],pavilion).rotation.y=Math.PI/2;
 const basinPos=new THREE.Vector3(.65,0,.45),basinProfile=[new THREE.Vector2(.37,0),new THREE.Vector2(.50,.10),new THREE.Vector2(.60,.42),new THREE.Vector2(.62,.52),new THREE.Vector2(.49,.52),new THREE.Vector2(.47,.42),new THREE.Vector2(.36,.16)];
 const basin=mesh(new THREE.LatheGeometry(basinProfile,48),standard('#8b9c91',{roughness:.53,map:groundTexture}),basinPos.toArray());basin.name='stone-basin';
 const basinWater=mesh(new THREE.CircleGeometry(.485,64),new THREE.MeshPhysicalMaterial({color:'#719590',roughness:.12,metalness:.25,clearcoat:1,clearcoatRoughness:.08}),[basinPos.x,.455,basinPos.z],scene,false);basinWater.rotation.x=-Math.PI/2;
 mesh(new THREE.TorusGeometry(.556,.034,6,32),standard('#546c4c'),[basinPos.x,.526,basinPos.z]).rotation.x=Math.PI/2;
 const drips=[];for(let i=0;i<5;i++)drips.push(mesh(new THREE.SphereGeometry(.026,7,5),new THREE.MeshPhysicalMaterial({color:'#dbe7d1',roughness:.06,metalness:.08,transparent:true,opacity:.86}),[.56,2,.45],scene,false));
 const handDrop=mesh(new THREE.SphereGeometry(.026,8,6),new THREE.MeshPhysicalMaterial({color:'#e3ecdb',roughness:.08,metalness:.12}),[0,-20,0],scene,false);
 const handTouch=mesh(new THREE.RingGeometry(.035,.044,20),new THREE.MeshBasicMaterial({color:'#e4edd5',transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}),[0,-20,0],scene,false);handTouch.rotation.x=-Math.PI/2;
 // A small paper lantern motivates the warm glints in the sheltered foreground.
 const lantern=new THREE.Group();lantern.position.set(-1.65,2.72,2.6);pavilion.add(lantern);
 const paper=new THREE.MeshStandardMaterial({color:'#d8bd8b',emissive:'#f3bb6a',emissiveIntensity:.65,roughness:.88});
 const lamp=mesh(new THREE.SphereGeometry(.23,20,16),paper,[0,0,0],lantern,false);lamp.scale.set(1,1.4,1);
 for(const y of[-.30,.30])mesh(new THREE.CylinderGeometry(.13,.13,.05,16),timber,[0,y,0],lantern,false);
 mesh(new THREE.CylinderGeometry(.012,.012,.70,6),timber,[0,.66,0],lantern,false);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const rib=mesh(new THREE.TorusGeometry(.23,.003,3,24,Math.PI),timber,[0,0,0],lantern,false);rib.rotation.y=a;rib.rotation.z=Math.PI/2;rib.scale.y=1.4;}
 const lanternLight=new THREE.PointLight('#ffd1a0',11,8,1.8);lanternLight.position.set(-1.5,2.5,2.7);scene.add(lanternLight);
 const dropLight=new THREE.PointLight('#efd9aa',0,.8,2);scene.add(dropLight);

 // A dark bamboo grove encloses the continuous stone path, with a bright exit.
 const trunkTransforms=[],nodeTransforms=[],branchTransforms=[],leafTransforms=[];
 const stems=[],viewCorridors=[];
 for(let t=8;t<=53;t+=.8){const p=sampleJourney(t);for(const factor of[1,1.14])viewCorridors.push({x:p.position[0],z:p.position[2],dx:p.camera.offset[0]*factor,dz:p.camera.offset[2]*factor});}
 function blocksMainView(x,z){for(const c of viewCorridors){const f=clamp(((x-c.x)*c.dx+(z-c.z)*c.dz)/(c.dx*c.dx+c.dz*c.dz));const distance=Math.hypot(x-c.x-c.dx*f,z-c.z-c.dz*f);if(f>.08&&distance<1.32||Math.hypot(x-c.x-c.dx,z-c.z-c.dz)<1.55)return true;}return false;}
 for(let i=0;i<330;i++){const x=range(-17,17),z=range(-32.5,-3.3);if(nearestPath(x,z)<1.8||z< -23&&x>1&&x<12||blocksMainView(x,z))continue;stems.push({x,z,h:range(5.2,10.8),r:range(.055,.105),leanX:range(-.65,.65),leanZ:range(-.5,.5)});}
 const leafGeo=new THREE.BufferGeometry();leafGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.075,.025,.40,0,.045,.51,.075,.018,.40,0,0,1.0],3));leafGeo.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);leafGeo.computeVertexNormals();
 const greens=['#244e47','#356359','#547c65','#284f47','#6b8b6d'];
 for(const s of stems){const parts=Math.ceil(s.h/.90);for(let j=0;j<parts;j++){const a=j/parts,b=(j+1)/parts;const start=[s.x+s.leanX*a*a,a*s.h,s.z+s.leanZ*a*a],end=[s.x+s.leanX*b*b,b*s.h,s.z+s.leanZ*b*b];const item=segmentTransform(start,end,s.r*(1-a*.45));item.c=greens[Math.floor(rnd()*greens.length)];trunkTransforms.push(item);nodeTransforms.push({p:end,s:[s.r*(1-a*.4)*1.12,.026,s.r*(1-a*.4)*1.12],c:'#899477'});}
  for(let level=0;level<5;level++){const frac=.39+level*.12,base=[s.x+s.leanX*frac*frac,s.h*frac,s.z+s.leanZ*frac*frac],azimuth=rnd()*Math.PI*2;for(let side=0;side<2;side++){
   const angle=azimuth+side*Math.PI,reach=range(.7,1.5),tip=[base[0]+Math.sin(angle)*reach,base[1]+range(.10,.40),base[2]+Math.cos(angle)*reach];branchTransforms.push(segmentTransform(base,tip,.015*(1-frac*.5)));
   for(let k=0;k<8;k++){const f=.18+k*.105,spread=(k%2?1:-1)*range(.35,.85),yaw=angle+spread;leafTransforms.push({p:[base[0]+(tip[0]-base[0])*f,base[1]+(tip[1]-base[1])*f,base[2]+(tip[2]-base[2])*f],s:[range(.60,1.10),1,range(.37,.76)],r:[range(-.30,.36),yaw,range(-.2,.2)],c:greens[Math.floor(rnd()*greens.length)]});}
  }}
 }
 batch(new THREE.CylinderGeometry(1,1,1,7),standard('#3c5a3b',{flatShading:true}),trunkTransforms);
 batch(new THREE.CylinderGeometry(1,1,1,8),standard('#6c8057',{roughness:.8}),nodeTransforms);
 batch(new THREE.CylinderGeometry(1,1,1,4),standard('#344e36'),branchTransforms);
 const leafMaterial=standard('#86a787',{side:THREE.DoubleSide,roughness:.70});
 const paintLeaf=leafMaterial.onBeforeCompile;leafMaterial.onBeforeCompile=shader=>{paintLeaf(shader);shader.uniforms.uRainTime=clock;shader.vertexShader='uniform float uRainTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float sway=sin(uRainTime*1.15+instanceMatrix[3].x*.65+instanceMatrix[3].z*.27); transformed.y+=sway*position.z*position.z*.105; transformed.x+=cos(uRainTime*.8+instanceMatrix[3].z)*position.z*.025;');};
 const leaves=batch(leafGeo,leafMaterial,leafTransforms);leaves.name='wind-bent-bamboo-leaves';
 const ferns=[];for(let i=0;i<65;i++){const x=range(-11,11),z=range(-32,8);if(nearestPath(x,z)<1.2)continue;for(let j=0;j<9;j++)ferns.push({p:[x,terrainHeight(x,z)+.05,z],s:[.8,1,range(.25,.70)],r:[-.6+range(-.1,.1),j/9*Math.PI*2,0],c:greens[Math.floor(rnd()*greens.length)]});}
 batch(leafGeo,standard('#627a4b',{side:THREE.DoubleSide,flatShading:true}),ferns);

 // The ridges are curved land masses: their feet sink into water rather than ending in a wall.
 for(let layer=0;layer<5;layer++){
  const verts=[],indices=[],vertexColors=[],nx=100,nz=18,front=-94-layer*24,depth=range(29,44),peaks=Array.from({length:5},(_,i)=>({x:-110+i*51+range(-12,12),w:range(18,34),h:range(8,20)+layer*1.2}));
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
   const x=-170+i/nx*340,u=j/nz;let height=0;for(const p of peaks)height+=p.h*Math.exp(-Math.pow((x-p.x)/p.w,2));
   const y=height*Math.pow(Math.sin(u*Math.PI),.85)-.8+Math.sin(x*.15+u*5)*Math.sin(u*Math.PI)*.55;
   verts.push(x,y,front-u*depth);const color=new THREE.Color(['#819f99','#9cb4aa','#b4c6b8','#c6d0bf','#d0d8c9'][layer]);color.multiplyScalar(.93+u*.05+.025*Math.sin(x*.13));vertexColors.push(color.r,color.g,color.b);
   if(i<nx&&j<nz){const a=i*(nz+1)+j,b=a+nz+1;indices.push(a,a+1,b,a+1,b+1,b);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));g.setIndex(indices);g.computeVertexNormals();mesh(g,standard('#e1e8dd',{vertexColors:true,roughness:1,side:THREE.DoubleSide}),[0,0,0],scene,false);
 }
 const shader=Reflector.ReflectorShader;
 const waterShader={uniforms:{...THREE.UniformsUtils.clone(shader.uniforms),uTime:clock,uFog:{value:new THREE.Color('#d8e1d5')},uFogDensity:{value:.018}},vertexShader:shader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 vWorld;').replace('vUv = textureMatrix','vWorld = (modelMatrix * vec4(position,1.0)).xyz; vUv = textureMatrix'),fragmentShader:shader.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 vWorld; uniform float uTime; uniform vec3 uFog; uniform float uFogDensity;').replace('vec4 base = texture2DProj( tDiffuse, vUv );','vec4 wateryUv=vUv; float ripple=sin(vWorld.z*2.4+sin(vWorld.x*.7)+uTime*.48); wateryUv.x += ripple*.0012*wateryUv.w; wateryUv.y += cos(vWorld.x*1.6+sin(vWorld.z*.4)+uTime*.33)*.0006*wateryUv.w; vec4 base=texture2DProj(tDiffuse,wateryUv);').replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','float stroke=sin(vWorld.z*6.7+sin(vWorld.x*.35)*2.8+uTime*.32)*.007; vec3 watery=mix(blendOverlay(base.rgb,color),vec3(.66,.75,.70),.53)+stroke; float fog=1.0-exp(-pow(distance(cameraPosition,vWorld)*uFogDensity,2.0)); gl_FragColor=vec4(mix(watery,uFog,fog),1.0);')};
 const lake=new Reflector(new THREE.PlaneGeometry(300,240),{color:0xaabca9,textureWidth:640,textureHeight:360,clipBias:.004,multisample:0,shader:waterShader});lake.rotation.x=-Math.PI/2;lake.position.set(0,-.13,-155);lake.name='river-with-spatial-reflections';scene.add(lake);
 // A quiet far sail gives the final empty water a place to look toward.
 const boat=new THREE.Group();boat.position.set(7.5,-.08,-76);boat.rotation.y=-.38;boat.name='far-sail-in-the-same-world';scene.add(boat);
 const hullPositions=[],hullIds=[],boatSections=20,boatBands=8;
 for(let i=0;i<=boatSections;i++)for(let j=0;j<=boatBands;j++){
  const along=i/boatSections,s=j/boatBands,angle=Math.PI*s,width=Math.pow(Math.sin(along*Math.PI),.65)*.54;
  hullPositions.push((along-.5)*3.8,-Math.sin(angle)*.38+.18*Math.pow(Math.abs(along-.5)*2,3),Math.cos(angle)*width);
  if(i<boatSections&&j<boatBands){const a=i*(boatBands+1)+j,b=a+boatBands+1;hullIds.push(a,b,a+1,a+1,b,b+1);}
 }
 const hullGeo=new THREE.BufferGeometry();hullGeo.setAttribute('position',new THREE.Float32BufferAttribute(hullPositions,3));hullGeo.setIndex(hullIds);hullGeo.computeVertexNormals();mesh(hullGeo,standard('#354f4c',{side:THREE.DoubleSide,roughness:.65}),[0,0,0],boat,false);
 mesh(new THREE.CylinderGeometry(.032,.042,3.2,8),standard('#49605a'),[-.18,1.5,0],boat,false);
 const sailPositions=[],sailUvs=[],sailIds=[],sailN=9;
 for(let j=0;j<=sailN;j++)for(let i=0;i<=sailN;i++){const u=i/sailN,v=j/sailN;sailPositions.push(-.15+u*(1.55-v*.5),.38+v*2.55,Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*.26);sailUvs.push(u,v);if(i<sailN&&j<sailN){const a=j*(sailN+1)+i,b=a+sailN+1;sailIds.push(a,b,a+1,b,b+1,a+1);}}
 const sailGeo=new THREE.BufferGeometry();sailGeo.setAttribute('position',new THREE.Float32BufferAttribute(sailPositions,3));sailGeo.setAttribute('uv',new THREE.Float32BufferAttribute(sailUvs,2));sailGeo.setIndex(sailIds);sailGeo.computeVertexNormals();mesh(sailGeo,standard('#becac0',{side:THREE.DoubleSide,roughness:1}),[0,0,0],boat,false);
 const farLamp=mesh(new THREE.SphereGeometry(.095,10,8),new THREE.MeshStandardMaterial({color:'#d2b77e',emissive:'#e6c080',emissiveIntensity:.65}),[-1.10,.34,0],boat,false);
 const sheenMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:clock},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float uTime;void main(){float side=pow(max(0.,1.-abs(vUv.x-.5)*2.),2.);float ends=sin(vUv.y*3.14159);float lines=.45+.55*pow(max(0.,sin(vUv.y*185.+sin(vUv.x*14.)+uTime*.35)),5.);gl_FragColor=vec4(.89,.84,.66,side*ends*lines*.055);}'});
 const sheen=mesh(new THREE.PlaneGeometry(5,33),sheenMaterial,[7.5,-.118,-61],scene,false);sheen.rotation.x=-Math.PI/2;sheen.rotation.z=.08;
 // Smooth wet surfaces remain in the same coordinate system as the feet.
 const puddleMat=new THREE.MeshPhysicalMaterial({color:'#577b6b',metalness:.12,roughness:.21,clearcoat:.8,clearcoatRoughness:.1,transparent:true,opacity:.42});
 const puddleShape=new THREE.Shape();for(let j=0;j<=26;j++){const a=j/26*Math.PI*2,r=.8+.12*Math.sin(a*3)+.09*Math.cos(a*7);if(j===0)puddleShape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else puddleShape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
 const puddleGeo=new THREE.ShapeGeometry(puddleShape),puddles=[];for(let i=0;i<20;i++){const p=pathAt(range(3,PATH_LENGTH-1)),o=mesh(puddleGeo,puddleMat,[p[0]+range(-.4,.4),.035,p[2]],scene,false);o.rotation.set(-Math.PI/2,0,rnd()*6.28);o.scale.set(range(.20,.66),range(.15,.34),1);puddles.push(o);}
 // Ripples have world positions: at the basin, at footfalls, and across wet ground.
 const rippleGeometry=new THREE.RingGeometry(.94,1,36);rippleGeometry.rotateX(-Math.PI/2);
 const ripples=[];for(let i=0;i<23;i++){const mat=new THREE.MeshBasicMaterial({color:'#cbd4bd',transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide,fog:true});const o=mesh(rippleGeometry,mat,[0,.04,0],scene,false);ripples.push({mesh:o,born:-1000,life:1.4});}
 let rippleSlot=3,lastFoot=-1,lastDrip=-1;
 const splashGeometry=new THREE.SphereGeometry(.016,5,4),splashMat=standard('#ced9c2',{roughness:.25}),splashes=[];
 for(let i=0;i<24;i++){const o=mesh(splashGeometry,splashMat,[0,-20,0],scene,false);splashes.push({mesh:o,born:-100,origin:new THREE.Vector3(),vx:0,vz:0});}
 function footfall(world,t){const item=ripples[rippleSlot];rippleSlot=3+(rippleSlot-2)%(ripples.length-3);item.mesh.position.set(world.x,.045,world.z);item.born=t;item.life=1.4;for(let i=0;i<4;i++){const s=splashes[(rippleSlot*4+i)%splashes.length];s.born=t;s.origin.copy(world);s.origin.y=.04;s.vx=range(-.12,.12);s.vz=range(-.12,.12);}}
 const rainCount=1900,rainPositions=new Float32Array(rainCount*6),rainSeeds=Array.from({length:rainCount},()=>[range(-22,22),rnd()*17,range(-22,22),range(.7,1.3)]);
 const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:'#d3dfca',transparent:true,opacity:.40,depthWrite:false,fog:true}));rain.frustumCulled=false;rain.name='rain-in-world-space';scene.add(rain);
 const fogStart=new THREE.Color('#a7bfbd'),fogEnd=new THREE.Color('#dce4d8');
 const hemi=new THREE.HemisphereLight('#c9e0e1','#4f6a61',1.85);scene.add(hemi);
 const light=new THREE.DirectionalLight('#d9e6d9',2.05);light.position.set(-8,15,-8);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-16;light.shadow.camera.right=16;light.shadow.camera.top=16;light.shadow.camera.bottom=-16;light.shadow.camera.near=1;light.shadow.camera.far=60;light.shadow.normalBias=.035;light.shadow.bias=-.00016;light.shadow.radius=5;scene.add(light,light.target);
 const skyGap=new THREE.SpotLight('#dfebc9',65,20,.39,.95,1.8);skyGap.position.set(3.5,10.8,-18);skyGap.target.position.set(-.3,.1,-17);scene.add(skyGap,skyGap.target);
 const shafts=[makeLightShaft(scene,[3.5,10.6,-18],[-.3,0,-17],2.25),makeLightShaft(scene,[5.5,11.5,-24],[1,0,-23],1.65)];
 const mist=makeMist(scene);
 scene.fog=new THREE.FogExp2(fogStart,.028);scene.background=fogStart.clone();
 function update(t,pose,traveler){
  clock.value=t;const river=pose.river;
  boat.position.x=7.5+Math.sin(t*.045)*.65;boat.rotation.z=Math.sin(t*.32)*.012;boat.position.y=-.08+Math.sin(t*.42)*.018;
  const forest=smooth((-pose.position[2]-4)/10)*(1-river);
  scene.fog.color.copy(fogStart).lerp(fogEnd,river);scene.fog.density=.032+forest*.010-river*.018;scene.background.copy(scene.fog.color);lake.material.uniforms.uTime.value=t;lake.material.uniforms.uFog.value.copy(scene.fog.color);lake.material.uniforms.uFogDensity.value=scene.fog.density;
  light.position.set(pose.position[0]-8,15,pose.position[2]-9);light.target.position.set(pose.position[0],0,pose.position[2]-2);light.target.updateMatrixWorld();
  hemi.intensity=1.85+river*.55;light.intensity=2.05-river*.65;mist.update(t,scene.fog.color,river);
  for(let i=0;i<shafts.length;i++)shafts[i].uniforms.uStrength.value=.060+Math.sin(t*.23+i)*.009;
  for(let i=0;i<rainCount;i++){const s=rainSeeds[i],x=s[0]+pose.position[0]+Math.sin(t*.14+s[2])*.15,z=s[2]+pose.position[2],y=((s[1]-t*9*s[3])%17+17)%17;
   const roofHere=x> -9&&x<.55&&z>-.65&&z<7.55,umbrellaRadius=Math.hypot(x-(pose.position[0]-.25),z-pose.position[2]);
   const canopyHere=umbrellaRadius<.90,canopyY=2.245+.24*(1-umbrellaRadius*umbrellaRadius),shelter=roofHere?roofY(x):canopyHere?canopyY:-100;
   const o=i*6,py=y<shelter||z<-35.5&&y<-.12?-100:y;rainPositions[o]=x;rainPositions[o+1]=py;rainPositions[o+2]=z;rainPositions[o+3]=x-.045;rainPositions[o+4]=Math.max(py-.32*s[3],py===-100?-100:shelter);rainPositions[o+5]=z+.01;
  }rainGeometry.attributes.position.needsUpdate=true;
  for(let i=0;i<drips.length;i++){const phase=((t/1.7+i*.23)%1),drop=drips[i];drop.position.set(.56,3.42-(phase*phase)*2.96,.45);drop.scale.setScalar(1);drop.scale.y=1.2+phase*1.4;drop.visible=phase<.96;}
  handDrop.visible=pose.reach>.25;handTouch.visible=false;dropLight.intensity=0;if(handDrop.visible&&traveler?.hand){const p=(t/.95)%1,v=p*p,h=traveler.hand;handDrop.position.set(.55+(h.x-.55)*v,3.42+(h.y+.04-3.42)*v,1.7+(h.z-1.7)*v);handDrop.scale.set(1,1+p*1.2,1);if(p>.90){handTouch.visible=true;handTouch.position.set(h.x,h.y+.05,h.z);handTouch.scale.setScalar(.7+(p-.9)*10);handTouch.material.opacity=(1-p)*5;dropLight.position.copy(h).y+=.06;dropLight.intensity=(1-p)*5;}}
  const drip=Math.floor(t/1.7);if(drip!==lastDrip){lastDrip=drip;for(let i=0;i<3;i++){ripples[i].born=t+i*.16;ripples[i].life=1.7;ripples[i].mesh.position.set(basinPos.x,.459,basinPos.z);}}
  const step=Math.floor(pose.distance/.59);if(step!==lastFoot){lastFoot=step;if(pose.walk>.25&&traveler?.feet)footfall(traveler.feet[step%2],t);}
  for(const r of ripples){const age=t-r.born,p=age/r.life;r.mesh.visible=p>=0&&p<1;if(r.mesh.visible){const basin=r===ripples[0]||r===ripples[1]||r===ripples[2],radius=(basin?.035:.04)+p*(basin?.40:.35);r.mesh.scale.setScalar(radius);r.mesh.material.opacity=(1-p)*.38;}}
  for(const s of splashes){const age=t-s.born;s.mesh.visible=age>=0&&age<.42;if(s.mesh.visible)s.mesh.position.set(s.origin.x+s.vx*age,s.origin.y+age*.8-age*age*2,s.origin.z+s.vz*age);}
 }
 function resetEffects(){lastFoot=-1;lastDrip=-1;ripples.forEach(r=>r.born=-1000);splashes.forEach(s=>s.born=-1000);}
 return{update,resetEffects,lake,light,stats:{bambooStems:stems.length,bambooSegments:trunkTransforms.length,leaves:leafTransforms.length,rainDrops:rainCount,routeLength:PATH_LENGTH},basinPos};
}

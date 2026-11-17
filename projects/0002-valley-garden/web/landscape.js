import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tiledMaterialMaps } from './nature.js';

export function seededRandom(seed = 1206) {
  return () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
}
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x-a)/(b-a), 0, 1); return t*t*(3-2*t); };
export function riverX(z) { return -28 + 40*Math.exp(-Math.pow((z-30)/22, 2)) + 2*Math.sin(z*0.028); }
export function riverWidth(z) { return 3.5 + 0.7*Math.sin(z*0.025+1); }
export function heightAt(x,z) {
  const far = smooth(28,100,Math.abs(x)) * (6+5*Math.sin(z*0.013+x*0.02));
  let y = 0.18 + far + smooth(25,100,Math.hypot(x,z+10))*0.7*(Math.sin(x*.07)*Math.cos(z*.035));
  if (Math.abs(x)<14 && z>-28 && z<12) y=0.18;
  const d = Math.abs(x-riverX(z));
  const channel = 1-smooth(riverWidth(z)-0.65,riverWidth(z)+1.5,d);
  y = y*(1-channel) - 1.05*channel;
  return y;
}

export function buildLandscape(scene, renderer, nature) {
  const random=seededRandom(570213), dummy=new THREE.Object3D();
  const colliders=[];
  const color=new THREE.Color();
  const terrainGeo=new THREE.PlaneGeometry(1100,1100,440,440);
  terrainGeo.rotateX(-Math.PI/2);
  const p=terrainGeo.attributes.position;
  const colors=[];
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),z=p.getZ(i)-150,y=heightAt(x,z);
    p.setXYZ(i,x,y,z);
    const variation=(Math.sin(x*.21+z*.13)+Math.sin(x*.63-z*.37))*.025+random()*.035;
    color.setRGB(.81+variation,.92+variation,.72+variation);
    if(Math.abs(x-riverX(z))<riverWidth(z)+1.6) color.set('#9c9d86').multiplyScalar(.85+random()*.3);
    colors.push(color.r,color.g,color.b);
  }
  terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); terrainGeo.computeVertexNormals();
  const terrain=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({...tiledMaterialMaps(nature.grass,340),color:'#74a854',normalScale:new THREE.Vector2(.38,.38),vertexColors:true,roughness:1}));
  terrain.receiveShadow=true; scene.add(terrain);

  // Continuous, overlapping mountain ridges; genuine geometry from every viewpoint.
  const ridgeGeo=new THREE.PlaneGeometry(1500,820,330,195); ridgeGeo.rotateX(-Math.PI/2);
  const rp=ridgeGeo.attributes.position;
  const peaks=[[-500,-510,210,160,190],[-265,-370,184,112,165],[-165,-565,204,115,165],
    [80,-760,100,160,170],[260,-420,188,125,185],[425,-575,240,135,180],[620,-480,180,145,175]];
  for(let i=0;i<rp.count;i++) {
    const x=rp.getX(i),z=rp.getZ(i)-560;let base=0;
    for(const [cx,cz,h,sx,sz] of peaks)base=Math.max(base,h*Math.exp(-(((x-cx)/sx)**2)-(((z-cz)/sz)**2)));
    const warp=fractal(x*.006,z*.006)*35;
    const folds=1-Math.abs(fractal((x+warp)*.019,z*.015)*2-1);
    const detail=fractal(x*.09,z*.075);
    // Multiscale ridges and gullies replace the old periodic, rounded hills.
    const y=Math.max(-3,base*(.76+folds*.27)*.68+(detail-.5)*Math.min(10,base*.08));
    rp.setXYZ(i,x,y,z);
  }
  ridgeGeo.computeVertexNormals();
  const cliffMaterial=new THREE.MeshStandardMaterial({...tiledMaterialMaps(nature.rock,145,85),normalScale:new THREE.Vector2(.65,.65),roughness:1});
  cliffMaterial.onBeforeCompile=shader=>{
    shader.uniforms.cliffAerial={value:nature.aerial};
    shader.vertexShader='varying vec3 vCliffPosition; varying vec3 vCliffNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCliffPosition=position; vCliffNormal=normal;');
    shader.fragmentShader='uniform sampler2D cliffAerial; varying vec3 vCliffPosition; varying vec3 vCliffNormal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 cliffWeights=pow(abs(normalize(vCliffNormal)),vec3(4.));
      cliffWeights/=max(dot(cliffWeights,vec3(1.)),.001);
      vec3 cliffRock=texture2D(map,vCliffPosition.zy*.085).rgb*cliffWeights.x
        +texture2D(map,vCliffPosition.xz*.085).rgb*cliffWeights.y
        +texture2D(map,vCliffPosition.xy*.085).rgb*cliffWeights.z;
      cliffRock=mix(cliffRock,vec3(dot(cliffRock,vec3(.2126,.7152,.0722)))*vec3(.72,.86,1.),.7);
      float cliffSteep=1.-abs(normalize(vCliffNormal).y);
      float cliffExposure=clamp(smoothstep(.12,.6,cliffSteep)*.75+smoothstep(45.,160.,vCliffPosition.y)*.5,.08,1.);
      vec3 cliffMoss=texture2D(cliffAerial,vCliffPosition.xz*.014).rgb*vec3(.40,.64,.50);
      diffuseColor.rgb*=mix(cliffMoss,cliffRock*.72,cliffExposure);
    `);
  };
  cliffMaterial.customProgramCacheKey=()=> 'triplanar-cliff-v1';
  scene.add(new THREE.Mesh(ridgeGeo,cliffMaterial));

  const sky=new THREE.Mesh(new THREE.SphereGeometry(1900,48,24),new THREE.MeshBasicMaterial({
    map:nature.sky,side:THREE.BackSide,depthWrite:false,fog:false
  }));
  sky.rotation.y=Math.PI*.65;sky.renderOrder=-10;scene.add(sky);

  // Low mist follows the mountain foot, rather than covering the nearby garden.
  const cloudMap=softTexture();
  const mist=[];
  for(let i=0;i<32;i++) {
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudMap,color:'#e6eeeb',opacity:.16+random()*.10,depthWrite:false}));
    sprite.position.set((random()-.5)*540,25+random()*20,-130-random()*65);
    sprite.scale.set(95+random()*110,9+random()*12,1);scene.add(sprite);mist.push(sprite);
  }

  const waterGeo=new THREE.BufferGeometry(),wv=[],wu=[],wi=[];
  const sections=650;
  for(let i=0;i<=sections;i++) {
    const z=-650+i*1000/sections,cx=riverX(z),w=riverWidth(z);
    wv.push(cx-w,-z,0,cx+w,-z,0);wu.push(0,i/14,1,i/14);
    if(i<sections){let a=i*2;wi.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  waterGeo.setAttribute('position',new THREE.Float32BufferAttribute(wv,3));waterGeo.setAttribute('uv',new THREE.Float32BufferAttribute(wu,2));waterGeo.setIndex(wi);waterGeo.computeVertexNormals();
  const normalMap=makeWaterNormal();
  const water=new Water(waterGeo,{textureWidth:768,textureHeight:768,waterNormals:normalMap,sunDirection:new THREE.Vector3(-.45,.85,.56).normalize(),sunColor:0xfff4de,waterColor:0x356768,distortionScale:.68,fog:true});
  water.rotation.x=-Math.PI/2;water.position.y=-.05;scene.add(water);
  water.material.uniforms.size.value=27;
  water.material.uniforms.streamBedMap={value:nature.gravel.color};
  // Water is a dielectric: the former .3 reflectance looked like polished metal.
  // The shallow bed is a procedural optical approximation, not a fluid simulation.
  water.material.fragmentShader=water.material.fragmentShader.replace('float rf0 = 0.3;','float rf0 = 0.035;');
  water.material.fragmentShader='uniform sampler2D streamBedMap;\n'+water.material.fragmentShader;
  water.material.fragmentShader=water.material.fragmentShader.replace('void main() {',`
    float streamHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float streamNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(streamHash(i),streamHash(i+vec2(1.,0.)),f.x),mix(streamHash(i+vec2(0.,1.)),streamHash(i+1.),f.x),f.y);}
    void main() {`);
  water.material.fragmentShader=water.material.fragmentShader.replace('vec3 outgoingLight = albedo;',`
    float channelCenter=-28.+40.*exp(-pow((worldPosition.z-30.)/22.,2.))+2.*sin(worldPosition.z*.028);
    float channelWidth=3.5+.7*sin(worldPosition.z*.025+1.);
    float bankDistance=channelWidth-abs(worldPosition.x-channelCenter);
    float channelDepth=smoothstep(.05,3.4,bankDistance);
    vec2 bentUv=worldPosition.xz*.42+surfaceNormal.xz*.1;
    vec3 stoneColor=texture2D(streamBedMap,bentUv).rgb*vec3(.64,.73,.69);
    float caustic=pow(1.-abs(streamNoise(worldPosition.xz*3.+surfaceNormal.xz*.4+vec2(time*.7,-time*.9))*2.-1.),18.);
    stoneColor+=vec3(.025,.04,.032)*caustic;
    vec3 transmitted=mix(stoneColor,vec3(.025,.08,.072),channelDepth*.73);
    vec3 outgoingLight=mix(transmitted,albedo,clamp(reflectance+.10+channelDepth*.16,0.,.95));
    float streak=streamNoise(vec2(worldPosition.x*7.+sin(worldPosition.z*.8),worldPosition.z*2.2+time*2.6));
    float foam=smoothstep(.69,.89,streak)*(.10+.42*(1.-smoothstep(.15,1.1,bankDistance)));
    outgoingLight=mix(outgoingLight,vec3(.66,.72,.69),foam);
  `);

  const bankV=[],bankC=[],bankI=[],bankUv=[];
  for(const side of [-1,1]){
    const offset=bankV.length/3;
    for(let i=0;i<=650;i++){
      const z=-650+i*1000/650,w=riverWidth(z),cx=riverX(z);
      for(const [d,h,c] of [[w-.08,-.09,'#858974'],[w+.95,.14,'#8c9570'],[w+2.5,null,'#6b8b45']]){
        const x=cx+side*d;bankV.push(x,h??heightAt(x,z)+.045,z);bankUv.push(x*.32,z*.32);const col=new THREE.Color(c).multiplyScalar(1.5);bankC.push(col.r,col.g,col.b);
      }
      if(i<650){const a=offset+i*3;bankI.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5);}
    }
  }
  const bankGeo=new THREE.BufferGeometry();bankGeo.setAttribute('position',new THREE.Float32BufferAttribute(bankV,3));bankGeo.setAttribute('uv',new THREE.Float32BufferAttribute(bankUv,2));bankGeo.setAttribute('color',new THREE.Float32BufferAttribute(bankC,3));bankGeo.setIndex(bankI);bankGeo.computeVertexNormals();
  const banks=new THREE.Mesh(bankGeo,new THREE.MeshStandardMaterial({...tiledMaterialMaps(nature.gravel,1),normalScale:new THREE.Vector2(.55,.55),vertexColors:true,roughness:.9,side:THREE.DoubleSide}));banks.receiveShadow=true;scene.add(banks);

  const rockGeo=new THREE.IcosahedronGeometry(1,2),rockPos=rockGeo.attributes.position;
  for(let i=0;i<rockPos.count;i++){const x=rockPos.getX(i),y=rockPos.getY(i),z=rockPos.getZ(i),n=.88+noise2(x*9+3,z*8+y*3)*.22;rockPos.setXYZ(i,x*n,y*n,z*n);}rockGeo.computeVertexNormals();
  const rocks=new THREE.InstancedMesh(rockGeo,new THREE.MeshStandardMaterial({...tiledMaterialMaps(nature.gravel,1),normalScale:new THREE.Vector2(.8,.8),roughness:.66}),1550);
  for(let i=0;i<1550;i++){
    const z=-135+random()*260,side=random()<.5?-1:1,x=riverX(z)+side*(riverWidth(z)-.42+random()*1.55),s=.055+Math.pow(random(),2)*.44;
    dummy.position.set(x,Math.max(-.18,heightAt(x,z))+.035,z);dummy.rotation.set(random()*1.5,random()*6,random()*.8);dummy.scale.set(s*1.6,s*.8,s);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);rocks.setColorAt(i,color.setHSL(.10,.04,.52+random()*.2));
  }rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);

  // The route is made of separate irregular flagstones, with living grass between.
  const stoneGeo=new THREE.CylinderGeometry(1,1,.075,7);const paths=[];
  for(let z=-2;z<12;z+=.68) for(let x=-.76;x<=.8;x+=.78) paths.push([x+(random()-.5)*.15,z+(random()-.5)*.1,.47+random()*.11]);
  for(let i=0;i<24;i++){const t=i/23;paths.push([-6*t,12+6*t,.55]);}
  const stones=new THREE.InstancedMesh(stoneGeo,new THREE.MeshStandardMaterial({...tiledMaterialMaps(nature.gravel,1),color:'#ccc9b8',normalScale:new THREE.Vector2(.2,.2),roughness:.96}),paths.length);
  paths.forEach(([x,z,s],i)=>{dummy.position.set(x,heightAt(x,z)+.055,z);dummy.rotation.set(0,random()*6,0);dummy.scale.set(s,1,s*.83);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);stones.setColorAt(i,color.setHSL(.12,.09,.53+random()*.18));});
  stones.receiveShadow=true;scene.add(stones);

  // White picket fence, open at the central gate and at the riverside.
  const fencePieces=[],posts=[],rails=[];
  const segments=[[-11,7,-1.6,7],[1.6,7,12,7],[12,7,12,-22],[12,-22,-12,-22],[-12,-22,-12,4]];
  for(const [ax,az,bx,bz] of segments){
    const length=Math.hypot(bx-ax,bz-az),steps=Math.floor(length/.34),angle=Math.atan2(bx-ax,bz-az);
    for(let i=0;i<=steps;i++){
      const t=i/steps,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
      if(Math.abs(x-riverX(z))<riverWidth(z)+1.1) continue;
      fencePieces.push([x,heightAt(x,z),z,angle]);
      if(i%8===0) posts.push([x,heightAt(x,z),z,angle]);
    }
    for(let i=0;i<steps;i++){
      const t=(i+.5)/steps,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
      if(Math.abs(x-riverX(z))<riverWidth(z)+1.5)continue;
      for(const y of [.38,.79]){const g=new THREE.BoxGeometry(.07,.08,length/steps+.02);g.rotateY(angle);g.translate(x,heightAt(x,z)+y,z);rails.push(g);}
    }
  }
  const fenceMat=new THREE.MeshStandardMaterial({color:'#eeeede',roughness:.8});
  const pickets=new THREE.InstancedMesh(new THREE.BoxGeometry(.11,.97,.065),fenceMat,fencePieces.length);
  const caps=new THREE.InstancedMesh(new THREE.ConeGeometry(.078,.14,4),fenceMat,fencePieces.length);
  fencePieces.forEach(([x,y,z,a],i)=>{dummy.position.set(x,y+.56,z);dummy.rotation.set(0,a,0);dummy.scale.set(1,1,1);dummy.updateMatrix();pickets.setMatrixAt(i,dummy.matrix);dummy.position.y=y+1.1;dummy.rotation.y=a+Math.PI/4;dummy.updateMatrix();caps.setMatrixAt(i,dummy.matrix);});
  pickets.castShadow=true;scene.add(pickets,caps);
  const fenceRails=new THREE.Mesh(mergeGeometries(rails),fenceMat);fenceRails.castShadow=true;scene.add(fenceRails);rails.forEach(g=>g.dispose());
  const pillar=new THREE.InstancedMesh(new THREE.BoxGeometry(.2,1.25,.2),fenceMat,posts.length);
  posts.forEach(([x,y,z],i)=>{dummy.position.set(x,y+.625,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();pillar.setMatrixAt(i,dummy.matrix);});pillar.castShadow=true;scene.add(pillar);
  colliders.push({minX:-11.3,maxX:-1.55,minZ:6.85,maxZ:7.15},{minX:1.55,maxX:12.2,minZ:6.85,maxZ:7.15},{minX:11.85,maxX:12.15,minZ:-22.2,maxZ:7.15},{minX:-12.15,maxX:12.15,minZ:-22.15,maxZ:-21.85},{minX:-12.15,maxX:-11.85,minZ:-22,maxZ:4});

  const bridgeCenter=riverX(18),bridgeParts=[],wood=new THREE.MeshStandardMaterial({color:'#8f7451',roughness:.89});
  function bridgeBox(w,h,d,x,y,z){let g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);bridgeParts.push(g);}
  for(let i=0;i<44;i++){
    const x=bridgeCenter-7.5+i*15/43,y=bridgeHeight(x);
    bridgeBox(.32,.12,2.5,x,y-.06,18);
  }
  for(const z of [16.72,19.28]) {
    for(let i=0;i<9;i++){const x=bridgeCenter-6.9+i*1.725,y=bridgeHeight(x);bridgeBox(.15,1.15,.15,x,y+.55,z);}
    for(let i=0;i<24;i++){
      const x=bridgeCenter-7+i*14/23,y=bridgeHeight(x);
      bridgeBox(.7,.1,.12,x,y+1.03,z);bridgeBox(.7,.065,.09,x,y+.5,z);
    }
    colliders.push({minX:bridgeCenter-7.4,maxX:bridgeCenter+7.4,minZ:z-.12,maxZ:z+.12});
  }
  const bridge=new THREE.Mesh(mergeGeometries(bridgeParts),wood);bridge.castShadow=true;bridge.receiveShadow=true;scene.add(bridge);bridgeParts.forEach(g=>g.dispose());
  function bridgeHeight(x){return .18+.7*Math.sin(clamp((x-(bridgeCenter-7.7))/15.4,0,1)*Math.PI);}
  function walkHeight(x,z){
    if(Math.abs(z-18)<1.3&&Math.abs(x-bridgeCenter)<7.7)return bridgeHeight(x)+.08;
    if(Math.abs(x)<5.65&&z>=-6&&z<-2.05) return z< -2.9?.72:.18+(-z-2.05)/.85*.54;
    return heightAt(x,z);
  }
  function inWater(x,z){return Math.abs(x-riverX(z))<riverWidth(z)+.1&&!(Math.abs(z-18)<1.3&&Math.abs(x-bridgeCenter)<8);}

  return {sky,water,colliders,walkHeight,inWater,bridgeCenter,
    setQuality(high){water.material.uniforms.distortionScale.value=high?.68:.48;},
    setEvening(t){sky.material.color.setRGB(1.-t*.22,1.-t*.37,1.-t*.52);water.material.uniforms.sunColor.value.set('#fff4de').lerp(new THREE.Color('#efc193'),t);},
    update(time){water.material.uniforms.time.value=time*.82;mist.forEach((m,i)=>{m.position.x+=Math.sin(i+time*.008)*.002;});}
  };
}

function softTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,.8)');g.addColorStop(.4,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
function makeWaterNormal(){
  const size=256,data=new Uint8Array(size*size*4);
  function periodic(x,y,nx,ny){
    const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;
    fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
    const at=(a,b)=>{a=((a%nx)+nx)%nx;b=((b%ny)+ny)%ny;const h=Math.sin(a*127.1+b*311.7)*43758.5453;return h-Math.floor(h);};
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(ix,iy),at(ix+1,iy),fx),THREE.MathUtils.lerp(at(ix,iy+1),at(ix+1,iy+1),fx),fy);
  }
  const height=(x,y)=>periodic(x/size*8,y/size*12,8,12)*.7+periodic(x/size*24,y/size*40,24,40)*.22+periodic(x/size*50,y/size*64,50,64)*.08;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=height(x+1,y)-height(x-1,y),dy=height(x,y+1)-height(x,y-1),j=(y*size+x)*4;
    data[j]=127+dx*650;data[j+1]=127+dy*650;data[j+2]=245;data[j+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
// Deterministic, non-periodic value noise for geological erosion at several scales.
function noise2(x,y){
  const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;
  fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
  const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453123;return n-Math.floor(n);};
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),fx),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),fx),fy);
}
function fractal(x,y){let value=0,weight=.5,total=0;for(let i=0;i<5;i++){value+=noise2(x,y)*weight;total+=weight;x=x*2.07+13.17;y=y*2.03+7.43;weight*=.49;}return value/total;}

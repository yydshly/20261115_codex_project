import * as THREE from 'three';
import { createCourtyardFooting } from './foot-grounding.js';
import { createMountains } from './mountains.js';
import { createStream } from './stream.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tiledMaterialMaps } from './nature.js';
import { createGroundSurface,createGroundGeometry,createBankGeometry } from './ground.js';
import { heightAt,meadowHeightAt,setTerrainElevation,riverX,riverWidth,valleyHabitatAt } from './terrain.js';
import { timberGeometry } from './timber.js';
import { createCourtyardPath } from './courtyard-path.js';
export { heightAt,riverX,riverWidth } from './terrain.js';

export function seededRandom(seed = 1206) {
  return () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
}
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x-a)/(b-a), 0, 1); return t*t*(3-2*t); };
export function buildLandscape(scene, renderer, nature) {
  setTerrainElevation(nature.elevation);
  const random=seededRandom(570213), dummy=new THREE.Object3D();
  const colliders=[];
  const ground=createGroundSurface(nature,{riverX,riverWidth,habitatAt:valleyHabitatAt});
  for(const region of [{near:false},{near:false,middle:true},{near:true}]){
    const terrain=new THREE.Mesh(createGroundGeometry(meadowHeightAt,{...region,habitatAt:valleyHabitatAt}),ground.material);
    terrain.name=region.near?'Detailed local meadow':region.middle?'Metre-scale valley relief':'Distant meadow ring';terrain.receiveShadow=true;scene.add(terrain);
  }

  const mountains=createMountains(scene,nature);

  const sky=new THREE.Mesh(new THREE.SphereGeometry(1900,48,24),new THREE.MeshBasicMaterial({
    map:nature.sky,side:THREE.BackSide,depthWrite:false,fog:false
  }));
  sky.rotation.y=Math.PI*.65;sky.renderOrder=-10;scene.add(sky);

  // Low mist follows the mountain foot, rather than covering the nearby garden.
  const cloudMap=softTexture();
  const mist=[];
  for(let i=0;i<32;i++) {
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudMap,color:'#e6eeeb',opacity:.06+random()*.05,depthWrite:false}));
    sprite.position.set((random()-.5)*1250,28+random()*35,-290-random()*340);
    sprite.scale.set(170+random()*220,18+random()*22,1);scene.add(sprite);mist.push(sprite);
  }

  const stream=createStream(scene,nature,{riverX,riverWidth}),water=stream.water;

  const bankGeo=createBankGeometry({heightAt:meadowHeightAt,riverX,riverWidth});
  const banks=new THREE.Mesh(bankGeo,ground.material);banks.receiveShadow=true;scene.add(banks);

  // Near-bank rocks are imported scan assets in this edition.

  const courtyardPath=createCourtyardPath(scene,{heightAt,random:seededRandom(73019),stone:nature.flagstone});

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

  const bridgeCenter=riverX(18),bridgeParts=[],wood=new THREE.MeshStandardMaterial({...tiledMaterialMaps(nature.wood,1),color:'#bdb4a6',roughness:1,normalScale:new THREE.Vector2(.38,.38),vertexColors:true});
  wood.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(roughnessFactor,.82);');};
  wood.customProgramCacheKey=()=> 'weathered-bridge-wood-1';
  function bridgeBox(w,h,d,x,y,z){const g=timberGeometry(w,h,d,bridgeParts.length);g.translate(x,y,z);bridgeParts.push(g);}
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
  const bridge=new THREE.Mesh(mergeGeometries(bridgeParts),wood);bridge.name='Weathered timber footbridge';bridge.castShadow=true;bridge.receiveShadow=true;scene.add(bridge);bridgeParts.forEach(g=>g.dispose());
  function bridgeHeight(x){return .18+.7*Math.sin(clamp((x-(bridgeCenter-7.7))/15.4,0,1)*Math.PI);}
  function walkHeight(x,z){
    if(Math.abs(z-18)<1.3&&Math.abs(x-bridgeCenter)<7.7)return bridgeHeight(x)+.08;
    if(Math.abs(x)<5.65&&z>=-6&&z<-2.05) return z< -2.9?.72:.18+(-z-2.05)/.85*.54;
    return heightAt(x,z);
  }
  function inWater(x,z){return Math.abs(x-riverX(z))<riverWidth(z)+.1&&!(Math.abs(z-18)<1.3&&Math.abs(x-bridgeCenter)<8);}

  return {sky,water,stream,colliders,walkHeight,inWater,bridgeCenter,ground,footingHeight:createCourtyardFooting(courtyardPath.surfaceHeightAt,heightAt),shadowReceivers:[ground.material,courtyardPath.mesh.material,wood],
    surfaceAt(x,z){
      if(Math.abs(z-18)<1.3&&Math.abs(x-bridgeCenter)<7.7)return 'wood';
      if(courtyardPath.surfaceHeightAt(x,z)!==null||(Math.abs(x)<5.65&&z>=-6&&z< -2.05))return 'stone';
      const weights=ground.weightsAt(x,z);return weights.gravel>.45?'gravel':weights.soil>.5?'soil':'grass';
    },
    setStreamObstacles(rocks){stream.setObstacles(rocks);},
    setQuality(high){stream.setQuality(high);},
    setEvening(t){sky.material.color.setRGB(1.-t*.22,1.-t*.37,1.-t*.52);water.material.uniforms.sunColor.value.set('#fff4de').lerp(new THREE.Color('#efc193'),t);},
    update(time){stream.update(time);mist.forEach((m,i)=>{m.position.x+=Math.sin(i+time*.008)*.002;});}
  };
}

function softTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,.8)');g.addColorStop(.4,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}

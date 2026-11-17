import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { pathFrameAt,pathSampleAt } from './path-layout.js';
import { surfaceFieldAt } from './surface-field.js';
import { createFootGrounding } from './foot-grounding.js';
import { createGrazingCow } from './cattle-behavior.js';
import { createCowRoaming } from './cattle-roaming.js';
import { createHoofContacts } from './cattle-grounding.js';
import { riverX,riverWidth } from './terrain.js';

/** Licensed, textured GLBs; the person's original skeleton/animation stay intact. */
export async function loadValleyLife(renderer){
  const loader=new GLTFLoader(),result={};
  await Promise.all(['gardener','cow'].map(async id=>{
    const gltf=await loader.loadAsync(new URL(`./assets/models/life/${id}.glb`,import.meta.url).href);
    gltf.scene.traverse(o=>{
      if(!o.isMesh)return;o.castShadow=id!=='gardener';o.receiveShadow=true;
      // The resident receives stable world shadows; its projection has a separate current-pose pass.
      if(id==='gardener')o.frustumCulled=false;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        m.metalness=0;m.roughness=Math.max(.72,m.roughness);m.envMapIntensity=.55;
        if(id==='gardener'){m.roughness=Math.max(.9,m.roughness);m.normalScale?.setScalar(.35);}
        for(const key of ['map','normalMap','roughnessMap'])if(m[key])m[key].anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      }
    });
    gltf.scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(gltf.scene,true);
    result[id]={...gltf,bounds,size:bounds.getSize(new THREE.Vector3())};
  }));
  return result;
}

export function createValleyLife(scene,assets,{heightAt,walkHeight,supportHeight=walkHeight,animate=true,obstacles=[]}){
  const group=new THREE.Group();group.name='A garden resident and two pasture cattle';scene.add(group);
  const herd=new THREE.Group();herd.name='Roaming pasture cattle';group.add(herd);
  const gardener=new THREE.Group();gardener.name='Garden resident · animated walk';group.add(gardener);
  const human=assets.gardener.scene;gardener.add(human);
  human.position.x-=assets.gardener.bounds.getCenter(new THREE.Vector3()).x;
  human.position.z-=assets.gardener.bounds.getCenter(new THREE.Vector3()).z;human.position.y-=assets.gardener.bounds.min.y;
  const mixer=new THREE.AnimationMixer(human),sourceWalk=assets.gardener.animations.find(c=>c.name.toLowerCase()==='walk');
  if(!sourceWalk)throw new Error('人物模型缺少行走动画');
  const walkClip=sourceWalk.clone();
  // The source cycle's end differs from its start by up to ten degrees at a knee.
  // Close a short tail of this runtime copy, leaving the downloaded GLB intact.
  for(const track of walkClip.tracks){
    const size=track.getValueSize(),first=Array.from(track.values.slice(0,size));
    for(let i=0;i<track.times.length;i++){
      const blend=THREE.MathUtils.smoothstep(track.times[i],walkClip.duration-.12,walkClip.duration);if(!blend)continue;
      if(track.name.endsWith('.quaternion')){
        const q=new THREE.Quaternion().fromArray(track.values,i*size).normalize();q.slerp(new THREE.Quaternion().fromArray(first).normalize(),blend).toArray(track.values,i*size);
      }else for(let j=0;j<size;j++)track.values[i*size+j]=THREE.MathUtils.lerp(track.values[i*size+j],first[j],blend);
    }
  }
  // Blend towards a held, dressed pose; restarting the walk clip on every turn popped the limbs.
  const pauseClip=new THREE.AnimationClip('Garden pause',1,walkClip.tracks.map(track=>{
    const size=track.getValueSize(),pose=Array.from(track.values.slice(0,size));
    return new track.constructor(track.name,[0,1],[...pose,...pose],track.getInterpolation());
  }));
  const action=mixer.clipAction(walkClip),pauseAction=mixer.clipAction(pauseClip);
  action.setEffectiveWeight(animate?1:0).play();action.timeScale=.44;pauseAction.setEffectiveWeight(animate?0:1).play();mixer.setTime(0);
  const cattle=[],contacts=[],walkerCollider={minX:0,maxX:0,minZ:0,maxZ:0},colliders=[walkerCollider];
  const isSafe=(x,z)=>{
    if((Math.abs(x)<13.5&&z>-24&&z<9.5)||pathSampleAt(x,z).distance<1.9||Math.abs(x-riverX(z))<riverWidth(z)+2.2||surfaceFieldAt(x,z).bare>.26)return false;
    if(obstacles.some(b=>x>b.minX-1.25&&x<b.maxX+1.25&&z>b.minZ-1.25&&z<b.maxZ+1.25))return false;
    const y=heightAt(x,z);return [-1,1].every(a=>[-1,1].every(b=>Math.abs(heightAt(x+a*.45,z+b*1.2)-y)<.17));
  };
  for(const [index,cx,cz,heading,h] of [[0,7,11,1.2,1.40],[1,18,-6,-.8,1.29]]){
    let best=null,roaming=null;const candidates=[];
    for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++){
      const x=cx+dx,z=cz+dz;
      if(!isSafe(x,z))continue;
      const y=heightAt(x,z),spread=Math.max(...[-1,1].flatMap(a=>[-1,1].map(b=>Math.abs(heightAt(x+a*.45,z+b*1.2)-y))));
      const open=Array.from({length:8},(_,i)=>isSafe(x+Math.sin(i*Math.PI/4)*2,z+Math.cos(i*Math.PI/4)*2)).filter(Boolean).length;
      const score=spread+surfaceFieldAt(x,z).bare*4+Math.hypot(dx,dz)*.012+(8-open)*.016;
      candidates.push({x,z,y,score});
    }
    for(const candidate of candidates.sort((a,b)=>a.score-b.score)){
      const planned=createCowRoaming({x:candidate.x,z:candidate.z,heading,isSafe,seed:4187+index*219,phaseOffset:index?8:0});
      if(planned){best=candidate;roaming=planned;break;}
    }
    if(!best)throw new Error('牧场缺少可安全慢走的连续草地');
    const cow=new THREE.Group();cow.name=`Pasture cow ${index+1} · walking and grazing`;herd.add(cow);
    const behavior=createGrazingCow(assets.cow.scene,{phaseOffset:index?23.5:6,animate,surfaceHeight:heightAt}),scale=h/assets.cow.size.y;
    behavior.root.scale.setScalar(scale);behavior.root.position.y=-assets.cow.bounds.min.y*scale;cow.add(behavior.root);
    const feedingPoints=roaming.stops.map(p=>{placeCow(cow,p.x,p.z,p.heading);return behavior.feedingPoint();});
    placeCow(cow,best.x,best.z,heading);behavior.shadow.visible=false;behavior.shadow.castShadow=false;
    cattle.push({group:cow,behavior,roaming,anchor:{...best},...best,height:h,grazingRadius:2.8,feedingPoint:feedingPoints[0],feedingPoints});
    contacts.push({x:best.x,z:best.z,radius:.65,occlusion:0,grazing:1,grazingRadius:2.8});
    const halfX=(Math.abs(Math.cos(heading))*.40+Math.abs(Math.sin(heading))*1.20)*scale;
    const halfZ=(Math.abs(Math.sin(heading))*.40+Math.abs(Math.cos(heading))*1.20)*scale;
    colliders.push({minX:best.x-halfX,maxX:best.x+halfX,minZ:best.z-halfZ,maxZ:best.z+halfZ});
  }
  function placeCow(cow,x,z,heading){
    const sx=(heightAt(x+.8,z)-heightAt(x-.8,z))/1.6,sz=(heightAt(x,z+.8)-heightAt(x,z-.8))/1.6;
    cow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-sx,1,-sz).normalize());cow.rotateY(heading);cow.position.set(x,heightAt(x,z)+.005,z);
  }
  function animalCollider(c,i){const scale=c.height/assets.cow.size.y,heading=c.motion?.heading||0,halfX=(Math.abs(Math.cos(heading))*.40+Math.abs(Math.sin(heading))*1.20)*scale,halfZ=(Math.abs(Math.sin(heading))*.40+Math.abs(Math.cos(heading))*1.20)*scale;Object.assign(colliders[i+1],{minX:c.x-halfX,maxX:c.x+halfX,minZ:c.z-halfZ,maxZ:c.z+halfZ});}
  const hoofContacts=createHoofContacts(group,cattle,heightAt),footing=createFootGrounding(gardener,supportHeight);
  if(typeof location!=='undefined'){const params=new URLSearchParams(location.search);if(params.has('inspect')&&params.has('review')&&params.has('contactDebug'))hoofContacts.patches.material.uniforms.contactDebug.value=1;}
  let clock=6,high=true,walkWeight=animate?1:0,visitorClose=false;
  const locomotion={walking:false,weight:walkWeight};
  let blendTarget=walkWeight,blendFrom=walkWeight,blendElapsed=.32;
  function update(dt,time,camera){
    const distance=Math.hypot(gardener.position.x-camera.position.x,gardener.position.z-camera.position.z);
    if(distance<1.8)visitorClose=true;else if(distance>2.15)visitorClose=false;
    if(animate&&group.visible&&!visitorClose)clock+=dt;
    // Keep this short route clear of the normal garden arrival point.
    const travel=8,turn=2,period=2*(travel+turn),phase=clock%period;
    let s,heading,moving;
    if(phase<travel){s=2.2+phase*.45;heading=0;moving=true;}
    else if(phase<travel+turn){s=5.8;heading=Math.PI*THREE.MathUtils.smoothstep(phase,travel,travel+turn);moving=false;}
    else if(phase<2*travel+turn){s=5.8-(phase-travel-turn)*.45;heading=Math.PI;moving=true;}
    else{s=2.2;heading=Math.PI+Math.PI*THREE.MathUtils.smoothstep(phase,2*travel+turn,period);moving=false;}
    const f=pathFrameAt(s);gardener.position.set(f.x,walkHeight(f.x,f.z)+.012,f.z);
    gardener.rotation.y=Math.atan2(-f.nz,f.nx)+heading;
    if(group.visible)Object.assign(walkerCollider,{minX:f.x-.24,maxX:f.x+.24,minZ:f.z-.24,maxZ:f.z+.24});
    // Pair the short garden route with a slower source gait.
    const walking=moving&&animate&&!visitorClose&&group.visible;
    const target=walking?1:0;
    if(target!==blendTarget){blendFrom=walkWeight;blendTarget=target;blendElapsed=0;}
    blendElapsed=Math.min(.32,blendElapsed+dt);
    walkWeight=THREE.MathUtils.lerp(blendFrom,blendTarget,THREE.MathUtils.smoothstep(blendElapsed,0,.32));
    locomotion.walking=walking;locomotion.weight=walkWeight;
    action.setEffectiveWeight(walkWeight);pauseAction.setEffectiveWeight(1-walkWeight);mixer.update(dt);
    footing.update(dt);
    gardener.visible=distance<(high?125:85);
    cattle.forEach((c,i)=>{
      c.motion=c.roaming.sample(animate?time:0,c.motion);c.motion.predict=seconds=>c.roaming.sample((animate?time:0)+seconds);c.x=c.motion.x;c.z=c.motion.z;placeCow(c.group,c.x,c.z,c.motion.heading);
      c.group.visible=c.group.position.distanceTo(camera.position)<(high?320:210);
      if(c.group.visible&&group.visible)c.behavior.update(time,c.motion);if(group.visible)animalCollider(c,i);
    });
    if(group.visible)hoofContacts.update();
  }
  return {group,gardener,herd,cattle,contacts,colliders,mixer,walkClip,pauseClip,footing:footing.state,locomotion,update,setQuality(value){high=value;},setVisible(value){
    group.visible=value;
    for(let i=0;i<colliders.length;i++)if(value&&i)animalCollider(cattle[i-1],i-1);else Object.assign(colliders[i],value?{minX:gardener.position.x-.24,maxX:gardener.position.x+.24,minZ:gardener.position.z-.24,maxZ:gardener.position.z+.24}:{minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity});
  }};
}

import * as THREE from 'three';
import { treeWindTime } from './model-assets.js';
import { forestDensityAt,slopeAt } from './terrain.js';

/** Whole scanned trees form groves, wooded foothills and thinning upper slopes. */
export function createModelWoodland(scene,library,{heightAt,riverX,random}){
  const group=new THREE.Group();group.name='Mature groves and wooded DEM slopes';scene.add(group);
  const trees=[];let foothillCount=0;
  function tree(x,z,height,foothill=false){
    const y=heightAt(x,z);
    if((z> -150||y<3)&&Math.abs(x-riverX(z))<8.5)return false;
    trees.push({x,y:y-.08,z,height,angle:random()*Math.PI*2,width:.8+random()*.4});
    if(foothill)foothillCount++;
    return true;
  }
  tree(-8.7,-1.3,8);tree(9.5,-14.8,9);tree(-9.4,-22,8.5);
  for(let attempt=0,placed=0;attempt<2500&&placed<230;attempt++){
    const x=-190+random()*380,z=-200+random()*145;
    if(random()>forestDensityAt(x,z)*.9+.08)continue;
    if(tree(x,z,9+random()*7))placed++;
  }
  for(let i=0;i<40;i++)tree((i%2?1:-1)*(48+random()*90),-45+random()*115,8+random()*7);
  for(let attempt=0;attempt<42000&&foothillCount<2700;attempt++){
    const deep=foothillCount>1750;
    const x=(random()-.5)*(deep?1700:1000),z=deep?-380-random()*850:-155-random()*500;
    const density=forestDensityAt(x,z);
    if(density<.22||random()>density*.72||slopeAt(x,z)>1.05)continue;
    tree(x,z,(11+random()*9)*(1-THREE.MathUtils.smoothstep(heightAt(x,z),140,250)*.35),true);
  }
  const variants=['matureNear','matureFar','matureDistant','matureHorizon'].map(id=>library[id][0]);
  const pools=variants.map((variant,level)=>variant.parts.map(part=>{
    const mesh=new THREE.InstancedMesh(part.geometry,part.material,trees.length);mesh.count=0;
    mesh.name=`Mature tree LOD ${level} · ${part.material.name}`;
    mesh.castShadow=level<2;mesh.receiveShadow=true;mesh.frustumCulled=false;
    group.add(mesh);return mesh;
  }));
  const dummy=new THREE.Object3D(),lastPosition=new THREE.Vector3(Infinity,0,0),lastRotation=new THREE.Quaternion();
  const frustum=new THREE.Frustum(),viewProjection=new THREE.Matrix4(),sphere=new THREE.Sphere();
  let lastUpdate=-100,high=true,lastAspect=0;
  function update(time,camera){
    treeWindTime.value=time;
    if(!camera)return;
    if(time-lastUpdate<.25)return;
    if(camera.position.distanceToSquared(lastPosition)<.35**2&&camera.quaternion.angleTo(lastRotation)<.012&&camera.aspect===lastAspect)return;
    lastUpdate=time;lastPosition.copy(camera.position);lastRotation.copy(camera.quaternion);lastAspect=camera.aspect;
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const ordered=trees.map(t=>({tree:t,distance:Math.hypot(t.x-camera.position.x,t.y-camera.position.y,t.z-camera.position.z)})).sort((a,b)=>a.distance-b.distance);
    const counts=[0,0,0,0],bands=[0,0,0];
    for(const {tree:t,distance} of ordered){
      if(distance>(high?1500:1000))continue;
      // A conservative crown sphere also leaves room for the mirrored water view.
      sphere.center.set(t.x,t.y+t.height*.5,t.z);sphere.radius=t.height*1.2;
      if(!frustum.intersectsSphere(sphere))continue;
      const level=distance<54&&counts[0]<(high?6:2)?0:distance<112&&counts[1]<(high?22:10)?1:distance<240?2:3;
      const band=distance<220?0:distance<500?1:2;
      if(level>=2&&bands[band]>=(high?[140,180,200]:[70,80,90])[band])continue;
      const scale=t.height/variants[level].size.y;
      dummy.position.set(t.x,t.y,t.z);dummy.rotation.set(0,t.angle,0);dummy.scale.set(scale*t.width,scale,scale*t.width);dummy.updateMatrix();
      for(const mesh of pools[level])mesh.setMatrixAt(counts[level],dummy.matrix);
      counts[level]++;
      if(level>=2)bands[band]++;
    }
    for(let level=0;level<4;level++)for(const mesh of pools[level]){mesh.count=counts[level];mesh.instanceMatrix.needsUpdate=true;}
  }
  return {group,treeCount:trees.length,foothillCount,trees,
    contacts:trees.filter(t=>Math.abs(t.x)<85&&Math.abs(t.z)<85).map(t=>({x:t.x,z:t.z,radius:Math.max(.55,t.height*.085),occlusion:.8,soil:.55,soilRadius:1.1+t.height*.06})),
    colliders:trees.filter(t=>Math.abs(t.x)<200&&Math.abs(t.z)<200).map(t=>({minX:t.x-.36,maxX:t.x+.36,minZ:t.z-.36,maxZ:t.z+.36})),
    update,setQuality(value){high=value;lastUpdate=-100;lastPosition.set(Infinity,0,0);}};
}

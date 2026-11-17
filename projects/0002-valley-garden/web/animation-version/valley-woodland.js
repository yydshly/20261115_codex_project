import * as THREE from 'three';
import { treeWindTime } from './model-assets.js';
import { forestDensityAt,slopeAt,woodlandPotentialAt } from './terrain.js';
import { groundNoise } from './ground.js';
import { surfaceFieldAt } from './surface-field.js';

/** Mixed, uneven-aged groves share their habitat with the ground and scrub layer. */
export function createModelWoodland(scene,library,{heightAt,riverX,random}){
  const group=new THREE.Group();group.name='Mixed valley groves and wooded DEM slopes';scene.add(group);
  const trees=[];let foothillCount=0;
  function plant(x,z,height,foothill=false,specimen=false){
    const y=heightAt(x,z);
    if((z> -150||y<3)&&Math.abs(x-riverX(z))<8.5)return false;
    if(!specimen&&surfaceFieldAt(x,z).bare>.72)return false;
    const fir=!specimen&&random()<(foothill?.66:.49),family=fir?1+Math.floor(random()*3):0,age=groundNoise(x*.047+4,z*.047-3);
    trees.push({x,y:y-.08,z,height:specimen?height:height*(.78+age*.38),family,
      angle:random()*Math.PI*2,width:.76+random()*.37,depth:.81+random()*.31,
      leanX:specimen?0:(random()-.5)*.055,leanZ:specimen?0:(random()-.5)*.055,tint:.84+random()*.21});
    if(foothill)foothillCount++;return true;
  }
  plant(-8.7,-1.3,8,false,true);plant(9.5,-14.8,9,false,true);plant(-9.4,-22,8.5,false,true);
  for(let attempt=0,placed=0;attempt<6500&&placed<320;attempt++){
    const x=-190+random()*380,z=-220+random()*182,density=forestDensityAt(x,z);
    if(density<.12||random()>density*.82||slopeAt(x,z)>1.05)continue;
    if(trees.some(t=>Math.abs(t.z-z)<2.1&&Math.hypot(t.x-x,t.z-z)<2.1))continue;
    if(plant(x,z,7.5+random()*8.5))placed++;
  }
  for(let i=0;i<68;i++){
    const x=(i%2?1:-1)*(35+random()*100),z=-42+random()*122;
    if(woodlandPotentialAt(x,z)<.12&&random()>.12)continue;
    plant(x,z,6+random()*8);
  }
  for(let attempt=0;attempt<65000&&foothillCount<2700;attempt++){
    const deep=foothillCount>1700,x=(random()-.5)*(deep?1700:1050),z=deep?-380-random()*850:-155-random()*520;
    const density=forestDensityAt(x,z);
    if(density<.16||random()>density*.78||slopeAt(x,z)>1.05)continue;
    plant(x,z,(9+random()*12)*(1-THREE.MathUtils.smoothstep(heightAt(x,z),140,260)*.35),true);
  }
  const broad=['matureNear','matureFar','matureDistant','matureHorizon'],fir=['firNear','firFar','firDistant','firHorizon'];
  const variants=[broad.map(id=>library[id][0]),...[0,1,2].map(i=>fir.map(id=>library[id][i]))];
  const pools=variants.map((levels,family)=>levels.map((variant,level)=>variant.parts.map(part=>{
    const mesh=new THREE.InstancedMesh(part.geometry,part.material,trees.length);mesh.count=0;
    mesh.name=`Mature tree LOD ${level} · ${family?'fir '+family:'broadleaf'} · ${part.material.name}`;
    mesh.castShadow=level<2;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.forestLevel=level;mesh.userData.forestFamily=family;
    group.add(mesh);return mesh;
  })));
  const dummy=new THREE.Object3D(),colour=new THREE.Color(),lastPosition=new THREE.Vector3(Infinity,0,0),lastRotation=new THREE.Quaternion();
  const frustum=new THREE.Frustum(),viewProjection=new THREE.Matrix4(),sphere=new THREE.Sphere();
  let lastUpdate=-100,high=true,lastAspect=0,visibleCounts=[0,0,0,0],visibleFamilies=[0,0,0,0];
  function update(time,camera){
    treeWindTime.value=time;if(!camera)return;
    if(time-lastUpdate<.25)return;
    if(camera.position.distanceToSquared(lastPosition)<.35**2&&camera.quaternion.angleTo(lastRotation)<.012&&camera.aspect===lastAspect)return;
    lastUpdate=time;lastPosition.copy(camera.position);lastRotation.copy(camera.quaternion);lastAspect=camera.aspect;
    camera.updateMatrixWorld();frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const ordered=trees.map(tree=>({tree,distance:Math.hypot(tree.x-camera.position.x,tree.y-camera.position.y,tree.z-camera.position.z)})).sort((a,b)=>a.distance-b.distance);
    const counts=variants.map(()=>[0,0,0,0]),levels=[0,0,0,0],bands=[0,0,0],families=[0,0,0,0];
    for(const {tree:t,distance} of ordered){
      if(distance>(high?1500:1000))continue;
      sphere.center.set(t.x,t.y+t.height*.5,t.z);sphere.radius=t.height*1.18;if(!frustum.intersectsSphere(sphere))continue;
      const level=distance<54&&levels[0]<(high?6:2)?0:distance<112&&levels[1]<(high?22:10)?1:distance<240?2:3;
      const band=distance<220?0:distance<500?1:2;
      if(level>=2&&bands[band]>=(high?[180,230,260]:[80,100,110])[band])continue;
      const variant=variants[t.family][level],scale=t.height/variant.size.y;
      dummy.position.set(t.x,t.y,t.z);dummy.rotation.set(t.leanX,t.angle,t.leanZ);dummy.scale.set(scale*t.width,scale,scale*t.depth);dummy.updateMatrix();
      for(const mesh of pools[t.family][level]){
        const index=counts[t.family][level];mesh.setMatrixAt(index,dummy.matrix);
        const leaf=/leaves|twigs/.test(mesh.material.name);colour.setRGB(leaf?t.tint:1,leaf?t.tint*(.98+t.family*.006):1,leaf?t.tint*.96:1);mesh.setColorAt(index,colour);
      }
      counts[t.family][level]++;levels[level]++;families[t.family]++;if(level>=2)bands[band]++;
    }
    for(let family=0;family<4;family++)for(let level=0;level<4;level++)for(const mesh of pools[family][level]){
      mesh.count=counts[family][level];mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }
    visibleCounts=levels;visibleFamilies=families;
  }
  return {group,treeCount:trees.length,foothillCount,trees,get visibleCounts(){return visibleCounts;},get visibleFamilies(){return visibleFamilies;},
    contacts:trees.filter(t=>Math.abs(t.x)<85&&Math.abs(t.z)<85).map(t=>({x:t.x,z:t.z,radius:Math.max(.55,t.height*.085),occlusion:.8,soil:.55,soilRadius:1.1+t.height*.06})),
    colliders:trees.filter(t=>Math.abs(t.x)<200&&Math.abs(t.z)<200).map(t=>({minX:t.x-.36,maxX:t.x+.36,minZ:t.z-.36,maxZ:t.z+.36})),
    update,setQuality(value){high=value;lastUpdate=-100;lastPosition.set(Infinity,0,0);}};
}

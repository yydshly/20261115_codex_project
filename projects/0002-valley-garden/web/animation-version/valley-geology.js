import * as THREE from 'three';
import { surfaceFieldAt } from './surface-field.js';
import { slopeAt } from './terrain.js';

/** Buried scan meshes form outcrops, talus and isolated in-channel obstructions. */
export function createValleyGeology(scene,library,{heightAt,riverX,riverWidth,random}){
  const group=new THREE.Group();group.name='Eroded banks, exposed outcrops and loose stones';scene.add(group);
  const cells=new Map(),items=[],contacts=[],colliders=[],obstacles=[];
  const variants=[...library.stone,...library.moss].sort((a,b)=>a.triangles-b.triangles).slice(0,4);
  function add(x,z,h,width=1,channel=false){
    const variant=variants[Math.floor(random()*variants.length)],key=`${variant.name}:${Math.floor(x/24)}:${Math.floor(z/24)}`;
    if(!cells.has(key))cells.set(key,{variant,items:[]});
    const base=channel?-.05-h*.64:heightAt(x,z)-h*(.32+random()*.15);
    const item={x,z,y:base,h,width,angle:random()*Math.PI*2,leanX:(random()-.5)*.24,leanZ:(random()-.5)*.24,channel};
    cells.get(key).items.push(item);items.push(item);
    if(!channel){
      contacts.push({x,z,radius:Math.max(.13,h*.55),occlusion:.62,soil:.55,soilRadius:h*.9});
      if(h>.7)colliders.push({minX:x-h*.35,maxX:x+h*.35,minZ:z-h*.35,maxZ:z+h*.35});
    }
    return {item,variant};
  }
  // Outcrop clusters follow the same scars as the ground's bare-soil layer.
  for(let attempt=0;attempt<12000&&items.length<260;attempt++){
    const x=-130+random()*260,z=-190+random()*270;
    if(Math.abs(x)<16&&z>-29&&z<24)continue;
    if(Math.abs(x-riverX(z))<riverWidth(z)+3||slopeAt(x,z)>.9)continue;
    const field=surfaceFieldAt(x,z);if(field.bare<.18||random()>field.bare*.65)continue;
    const h=random()<.22?.7+random()*1.5:.10+random()*.40;
    add(x,z,h,1+random()*.75);
  }
  // A few low boulders break the water surface without blocking the bridge.
  for(const [z,side,offset,h] of [[-35,1,.50,.65],[-23,-1,.68,.80],[-11,1,.65,.56],[1,-1,.54,.75],[9,1,.58,.52],[27,-1,.60,.66],[36,1,.60,.76],[44,-1,.53,.55],[58,1,.58,.90]]){
    const x=riverX(z)+side*riverWidth(z)*offset;
    const {item,variant}=add(x,z,h,1.15,true),transform=new THREE.Object3D(),point=new THREE.Vector3(),extent=new THREE.Box3();
    const scale=h/variant.size.y;transform.position.set(x,item.y,z);transform.rotation.set(item.leanX,item.angle,item.leanZ);transform.scale.set(scale*item.width,scale,scale*(.82+item.width*.18));transform.updateMatrix();
    // Measure the actual stone at the waterline. A height-derived radius put the old foam inside the mesh.
    for(const part of variant.parts){const vertices=part.geometry.attributes.position;for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(transform.matrix);if(Math.abs(point.y+.05)<.075)extent.expandByPoint(point);}}
    const centre=extent.isEmpty()?new THREE.Vector3(x,-.05,z):extent.getCenter(new THREE.Vector3()),size=extent.getSize(new THREE.Vector3());
    obstacles.push({x:centre.x,z:centre.z,radius:Math.max(h*.43,Math.max(size.x,size.z)*.48)});
  }
  const dummy=new THREE.Object3D();let high=true;
  for(const {variant,items:cluster} of cells.values())for(const part of variant.parts){
    const mesh=new THREE.InstancedMesh(part.geometry,part.material,cluster.length);mesh.name=`Embedded scan rocks · ${variant.name}`;
    cluster.forEach((p,i)=>{const scale=p.h/variant.size.y;dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.leanX,p.angle,p.leanZ);dummy.scale.set(scale*p.width,scale,scale*(.82+p.width*.18));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.userData.fullCount=mesh.count;group.add(mesh);
  }
  return {group,items,contacts,colliders,obstacles,update(camera){
    for(const mesh of group.children){
      const d=Math.max(0,mesh.boundingSphere.center.distanceTo(camera.position)-mesh.boundingSphere.radius);
      mesh.visible=d<(high?270:180);mesh.castShadow=d<70;
    }
  },setQuality(value){high=value;}};
}

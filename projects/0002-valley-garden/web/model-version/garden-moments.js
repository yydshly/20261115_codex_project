import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { timberGeometry } from './timber.js';
import { tiledMaterialMaps } from './nature.js';

/** One modest outdoor bench, using the retained photographed weathered wood PBR. */
export function createGardenBench(scene,{heightAt,wood}){
  const group=new THREE.Group();group.name='Garden resting bench';group.position.set(6.2,heightAt(6.2,1.7),1.7);group.rotation.y=-2.14;
  const boards=[],frame=[],bolts=[],feet=[],dummy=new THREE.Vector3();
  const woodMaterial=new THREE.MeshStandardMaterial({...tiledMaterialMaps(wood,1),color:'#a8957a',roughness:.91,normalScale:new THREE.Vector2(.27,.27),vertexColors:true});
  const iron=new THREE.MeshStandardMaterial({color:'#3c433d',metalness:.65,roughness:.76});
  function board(w,h,d,x,y,z,angle=0){const g=timberGeometry(w,h,d,boards.length);g.rotateX(angle);g.translate(x,y,z);boards.push(g);}
  function bar(w,h,d,x,y,z){const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);frame.push(g);}
  for(let i=0;i<5;i++)board(1.84,.038,.082,0,.465,-.18+i*.094);
  for(let i=0;i<4;i++){
    const y=.59+i*.108,z=-.24-(y-.5)*.16;board(1.84,.086,.032,0,y,z,-.16);
    for(const x of [-.68,.68]){const g=new THREE.CylinderGeometry(.007,.007,.009,7);g.rotateX(Math.PI/2);g.translate(x,y,z+.019);bolts.push(g);}
  }
  group.updateMatrixWorld(true);
  for(const x of [-.68,.68]){
    bar(.045,.045,.49,x,.414,.015);bar(.045,.47,.045,x,.685,-.255);
    board(.073,.035,.47,x,.675,.015);
    for(const z of [-.19,.23]){
      dummy.set(x,0,z).applyMatrix4(group.matrixWorld);
      const base=heightAt(dummy.x,dummy.z)-group.position.y-.012;
      bar(.045,.42-base,.045,x,(base+.42)/2,z);
      feet.push({x:dummy.x,z:dummy.z,radius:.10,occlusion:.43,soil:.12,soilRadius:.19});
    }
  }
  bar(1.38,.045,.045,0,.21,-.19);
  for(const [name,pieces,material] of [['Weathered wooden bench slats',boards,woodMaterial],['Bench metal frame',frame,iron],['Bench flush fixings',bolts,iron]]){
    const mesh=new THREE.Mesh(mergeGeometries(pieces),material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);pieces.forEach(g=>g.dispose());
  }
  scene.add(group);group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(group);
  const position=new THREE.Vector3(0,1.23,.08).applyMatrix4(group.matrixWorld);
  const target=new THREE.Vector3(0,1.12,12).applyMatrix4(group.matrixWorld);
  return {group,position,target,contacts:feet,collider:{minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z}};
}

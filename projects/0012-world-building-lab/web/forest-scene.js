import * as THREE from 'three';
import {FOREST_LOGS} from './forest-layout.js';
import {terrainHeight} from './large-world.js';
import {nearConstructionPath} from './construction-learning.js';

export function buildForestDetails(scene,registerObstacle){const group=new THREE.Group();group.name='forest-floor-details';scene.add(group);const records=[];
 const bark=new THREE.MeshStandardMaterial({color:'#756951',roughness:1}),end=new THREE.MeshStandardMaterial({color:'#b29a70',roughness:1}),moss=new THREE.MeshStandardMaterial({color:'#788e5e',roughness:1});
 for(const p of FOREST_LOGS){const dx=Math.cos(p.angle)*p.length/2,dz=Math.sin(p.angle)*p.length/2,a=new THREE.Vector3(p.x-dx,terrainHeight(p.x-dx,p.z-dz)+p.radius*.7,p.z-dz),b=new THREE.Vector3(p.x+dx,terrainHeight(p.x+dx,p.z+dz)+p.radius*.7,p.z+dz);if(Array.from({length:9},(_,i)=>i/8).some(u=>nearConstructionPath(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u,2.5)))continue;
  const direction=b.clone().sub(a),length=direction.length(),log=new THREE.Mesh(new THREE.CylinderGeometry(p.radius*.85,p.radius,length,8),[bark,end,end]);log.position.copy(a).lerp(b,.5);log.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());log.castShadow=log.receiveShadow=true;group.add(log);
  for(let i=0;i<5;i++){const u=i/4,x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,y=a.y+(b.y-a.y)*u;registerObstacle?.(x,z,p.radius+.3);if(i%2===0){const patch=new THREE.Mesh(new THREE.SphereGeometry(1,7,4),moss);patch.position.set(x,y+p.radius*.65,z);patch.scale.set(.36,.12,.24);patch.receiveShadow=true;group.add(patch);}}
  records.push({...p,a:a.toArray(),b:b.toArray()});
 }
 return {group,records,setStage(stage){group.visible=stage>=2;}};
}

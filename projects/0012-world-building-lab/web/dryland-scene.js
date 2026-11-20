import * as THREE from 'three';
import {OASIS,drylandWeight,drylandHabitat,drylandGuide,dryValleyField} from './dryland-layout.js';
import {terrainHeight} from './large-world.js';
import {scrubHabitat} from './scrub-recovery.js';
import {tropicalFernGeometry} from './tropical-scene.js';
export function drylandPlacements(){const out={grass:[],shrub:[],gravel:[],trees:[]},hash=(i,s)=>{const n=Math.sin(i*127.1+s*57.3)*43758.5453;return n-Math.floor(n);};for(let i=0;i<10500;i++){const x=-510+hash(i,1)*890,z=965+hash(i,2)*525,f=drylandHabitat(x,z);if(!f||f.water||drylandGuide(x,z).distance<3.5)continue;const y=terrainHeight(x,z),roll=hash(i,3);if(f.moisture>.35&&roll<f.moisture*.85)out.grass.push({x,z,y,scale:.45+hash(i,4)*.65,moisture:f.moisture});else if(f.dry>.45&&roll<.33&&f.oasis<.1)out.gravel.push({x,z,y,scale:.15+hash(i,5)*.65,moisture:f.moisture});else if(roll>.97&&dryValleyField(x,z).distance>15)out.shrub.push({x,z,y,scale:.45+hash(i,6)*.65,moisture:f.moisture});if(i%19===0&&drylandGuide(x,z).distance>8&&((f.woodland&&roll>.25)||(f.oasis>.3&&f.r>1.15&&f.r<2.5)))out.trees.push({x,z,y,scale:1,height:f.oasis>.3?7+hash(i,7)*3:10+hash(i,7)*5,oasis:f.oasis>.3});}return out;}
function grassGeometry(){const v=[];for(let j=0;j<5;j++){const a=j*Math.PI*.4,x=Math.cos(a),z=Math.sin(a);v.push(-z*.055,0,x*.055,z*.055,0,-x*.055,x*.2,1-j*.08,z*.2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return g;}
export function buildDryland(scene,{registerObstacle}={}){const root=new THREE.Group(),cover=new THREE.Group(),water=new THREE.Group(),plants=new THREE.Group();root.name='grassland-gobi-dry-valley-oasis';root.add(cover,water,plants);scene.add(root);const records=drylandPlacements(),dummy=new THREE.Object3D();function batch(points,geo,mat,group,name,shape){const mesh=new THREE.InstancedMesh(geo,mat,points.length);points.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,i*2.399,0);dummy.scale.setScalar(p.scale);shape?.(dummy,p);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.computeBoundingSphere();mesh.name=name;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 batch(records.gravel,new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:'#978573',roughness:1}),cover,'gobi-actual-gravel',(d,p)=>{d.position.y+=p.scale*.18;d.scale.y*=.55;});const grass=plantBatch(records.grass,grassGeometry(),new THREE.MeshStandardMaterial({color:'#879951',side:THREE.DoubleSide,roughness:1}),plants,'continuous-grass');const shrubs=plantBatch(records.shrub,new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:'#879068',roughness:1}),plants,'sparse-dry-shrubs',(d,p)=>{d.position.y+=p.scale*.4;d.scale.y*=.65;});

 function plantBatch(points,geometry,material,parent,name,shape){
  const outside=[],inside=[];
  for(const p of points)(scrubHabitat(p.x,p.z)?inside:outside).push(p);
  const mesh=batch([...outside,...inside],geometry,material,parent,name,shape);
  return {mesh,outside:outside.length,total:points.length};
 }
 const pool=new THREE.Mesh(new THREE.CircleGeometry(1,96),new THREE.MeshStandardMaterial({color:'#568e85',transparent:true,opacity:.92,roughness:.23,side:THREE.DoubleSide}));pool.rotation.x=-Math.PI/2;pool.scale.set(OASIS.rx,OASIS.rz,1);pool.position.set(OASIS.x,OASIS.level+.035,OASIS.z);water.add(pool);
 const bark=new THREE.MeshStandardMaterial({color:'#89714d',roughness:1}),leaves=new THREE.MeshStandardMaterial({color:'#698849',roughness:1,side:THREE.DoubleSide});batch(records.trees,new THREE.CylinderGeometry(.28,.43,1,7),bark,plants,'transition-and-oasis-trunks',(d,p)=>{d.position.y+=p.height/2;d.scale.set(1,p.height,1);registerObstacle?.(p.x,p.z,1.1);});const woods=records.trees.filter(p=>!p.oasis),palms=records.trees.filter(p=>p.oasis);batch(woods,new THREE.IcosahedronGeometry(1,1),leaves,plants,'open-woodland-crowns',(d,p)=>{d.position.y+=p.height;d.scale.set(4,3,4);});batch(palms,tropicalFernGeometry(),leaves,plants,'oasis-fan-crowns',(d,p)=>{d.position.y+=p.height;d.scale.set(3.2,2.3,3.2);});return {root,cover,water,plants,pool,records,
 setScrubComparison(active){
  for(const {mesh,outside,total} of [grass,shrubs])mesh.count=active?outside:total;
 },
 setStage(s){cover.visible=s>=1;water.visible=s>=2;plants.visible=s>=3;}};}

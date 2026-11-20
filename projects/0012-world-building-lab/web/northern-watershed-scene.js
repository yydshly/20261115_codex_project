import * as THREE from 'three';
import {NORTH_REACHES,northSample,northField,northWeight} from './northern-watershed.js';
import {terrainHeight} from './large-world.js';
import {waterAt,northBankPoint} from './water-system.js';
import {getFanFlood} from './fan-layout.js';

const geometryCache=new Map();
export function northernWaterGeometry(){
 const key=getFanFlood();if(geometryCache.has(key))return geometryCache.get(key).clone();
 const vertices=[],indices=[];
 const node=(x,z)=>({x,z,h:terrainHeight(x,z),w:waterAt(x,z)});
 const wet=p=>p.w&&p.h<p.w.level+.01;
 function tri(a,b,c,depth=0){const q=[a,b,c],n=q.filter(wet).length;if(!n)return;const center=node((a.x+b.x+c.x)/3,(a.z+b.z+c.z)/3);if(depth<3&&(n<3||!wet(center))){const ab=node((a.x+b.x)/2,(a.z+b.z)/2),bc=node((b.x+c.x)/2,(b.z+c.z)/2),ca=node((c.x+a.x)/2,(c.z+a.z)/2);tri(a,ab,ca,depth+1);tri(ab,b,bc,depth+1);tri(ca,bc,c,depth+1);tri(ab,bc,ca,depth+1);return;}if(n<3||!wet(center))return;const start=vertices.length/3;for(const p of q)vertices.push(p.x,p.w.level+.025,p.z);indices.push(start,start+1,start+2);}
 for(const reach of NORTH_REACHES){const count=Math.ceil(reach.length/1.8);for(let i=0;i<count;i++){const a=northSample(reach.id,i/count),b=northSample(reach.id,(i+1)/count),half=reach.half+1;for(let j=0;j<10;j++){const u=(j/5-1)*half,v=((j+1)/5-1)*half,A=node(a.x+a.nx*u,a.z+a.nz*u),B=node(b.x+b.nx*u,b.z+b.nz*u),C=node(b.x+b.nx*v,b.z+b.nz*v),D=node(a.x+a.nx*v,a.z+a.nz*v);tri(A,B,C);tri(A,C,D);}}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();geometryCache.set(key,g);return g.clone();
}
export function northernPlants(){const records={grass:[],shrubs:[],gravel:[]},hash=(i,s)=>{const v=Math.sin(i*127.1+s*43.7)*43758.5453;return v-Math.floor(v);};for(let i=0;i<9000;i++){const x=-1390+hash(i,1)*680,z=-1525+hash(i,2)*1200,f=northField(x,z);if(!f||northWeight(x,z,f)<.85||f.distance<f.half+3)continue;const y=terrainHeight(x,z),w=waterAt(x,z),slope=Math.hypot(terrainHeight(x+1,z)-terrainHeight(x-1,z),terrainHeight(x,z+1)-terrainHeight(x,z-1))/2;if(w&&w.level>y-.05||slope>.6||Math.abs(z+390)<4)continue;const p={x,y,z,scale:.35+hash(i,3)*.6};if(f.level>30&&hash(i,4)<.28)records.gravel.push(p);else if(f.distance<f.half+14)records.grass.push(p);else if(hash(i,4)<.025)records.shrubs.push(p);}return records;}
export function buildNorthernWatershed(scene){
 const root=new THREE.Group(),water=new THREE.Group(),cover=new THREE.Group(),plants=new THREE.Group(),bridge=new THREE.Group();root.name='northern-two-catchments-connected-to-central-river';root.add(water,cover,plants,bridge);scene.add(root);
 let flood=null,waterMesh;function syncWater(){if(flood===getFanFlood())return;flood=getFanFlood();if(waterMesh){water.remove(waterMesh);waterMesh.geometry.dispose();waterMesh.material.dispose();}waterMesh=new THREE.Mesh(northernWaterGeometry(),new THREE.MeshStandardMaterial({color:'#72a59c',roughness:.3,transparent:true,opacity:.93,side:THREE.DoubleSide}));water.add(waterMesh);}
 syncWater();const records=northernPlants(),dummy=new THREE.Object3D();
 function batch(name,ps,geometry,color,parent,height){const m=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}),ps.length);ps.forEach((p,i)=>{dummy.position.set(p.x,p.y+p.scale*height/2,p.z);dummy.rotation.set(0,i*2.399,0);dummy.scale.set(p.scale,p.scale*height,p.scale);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});m.name=name;m.computeBoundingSphere();parent.add(m);}
 batch('northern-source-gravel',records.gravel,new THREE.DodecahedronGeometry(1,0),'#a7997c',cover,.35);batch('northern-stable-bank-shrubs',records.shrubs,new THREE.IcosahedronGeometry(1,0),'#83996d',plants,.7);
 const blades=new THREE.BufferGeometry();blades.setAttribute('position',new THREE.Float32BufferAttribute([-.05,0,0,.05,0,0,.1,1,0,0,0,-.05,0,0,.05,0,.8,.1],3));blades.computeVertexNormals();batch('northern-wet-bank-grass',records.grass,blades,'#9aa976',plants,1);
 // A narrow, curved pedestrian deck follows the pre-existing riverbank route.
 const v=[],idx=[],points=Array.from({length:25},(_,i)=>northBankPoint(.614+i*.012/24));for(const p of points){const a=northBankPoint(p.riverT-.0001),b=northBankPoint(p.riverT+.0001),length=Math.hypot(b.x-a.x,b.z-a.z),nx=-(b.z-a.z)/length,nz=(b.x-a.x)/length;for(const side of [-1,1])v.push(p.x+nx*side*1.5,p.y,p.z+nz*side*1.5);}for(let i=0;i<24;i++){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const deck=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#a18b67',roughness:.9,side:THREE.DoubleSide}));deck.name='old-bank-route-over-new-tributary';bridge.add(deck);
 return {root,water,cover,plants,bridge,deck,records,syncWater,get waterMesh(){return waterMesh;},setStage(s){cover.visible=s>=1;water.visible=s>=2;bridge.visible=s>=2;plants.visible=s>=3;}};
}

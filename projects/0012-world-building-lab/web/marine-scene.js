import * as THREE from 'three';
import {MARINE,marineWeight,shoreX} from './marine-geography.js';
import {marineStops,marinePath} from './marine-learning.js';
import {terrainHeight,random} from './large-world.js';

export function marineSlope(x,z){return Math.hypot(terrainHeight(x+1,z)-terrainHeight(x-1,z),terrainHeight(x,z+1)-terrainHeight(x,z-1))/2;}
export function marineSubstrate(x,z){return Math.sin(x*.047+z*.023)+Math.cos(z*.069)>.75?'rock':'sand';}
let guideSamples;
export function nearMarineGuide(x,z,radius=4){if(marineStops.some(r=>Math.hypot(r.x-x,r.z-z)<radius+2))return true;guideSamples??=Array.from({length:181},(_,i)=>marinePath(i/180));for(const p of guideSamples){if(Math.hypot(p.x-x,p.z-z)<radius)return true;}return false;}
export function tideContour(level){const out=[];for(let z=-600;z>=-780;z-=2){const shore=shoreX(z);let b=shore+12,a=b-1;while(a>shore-190&&terrainHeight(a,z)>level){b=a;a-=1;}for(let i=0;i<28;i++){const x=(a+b)/2;if(terrainHeight(x,z)>level)b=x;else a=x;}out.push(new THREE.Vector3((a+b)/2,level+.08,z));}return out;}
export function marinePlacements(){const rng=random(88391),out=[];for(let z=-1100;z<-540;z+=7)for(let x=-1745;x<-1200;x+=7){const px=x+rng()*5,pz=z+rng()*5;if(marineWeight(px,pz)<.999||nearMarineGuide(px,pz,3.8))continue;const y=terrainHeight(px,pz),depth=-y,slope=marineSlope(px,pz),substrate=marineSubstrate(px,pz),roll=rng();let kind=null;
 if(depth>2&&depth<9&&slope<.2&&substrate==='sand'&&roll<.68)kind='seagrass';
 else if(depth>.3&&depth<7&&slope<.65&&substrate==='rock'&&roll<.65)kind='algae';
 else if(depth>-.6&&depth<1&&roll<.33)kind='shell';
 else if(depth>1&&depth<32&&slope<.3&&roll<.055)kind='rock';
 if(kind)out.push({kind,x:px,z:pz,y,depth,slope,substrate,scale:.7+rng()*.7,rotation:rng()*Math.PI*2});
 }return out;}
function blades(tall){const g=new THREE.BufferGeometry(),v=[],idx=[];for(let j=0;j<5;j++){const a=j*Math.PI*.4,h=tall?1.7+j*.18:.65+j*.07,w=tall?.22:.085,dx=Math.cos(a),dz=Math.sin(a),base=v.length/3;v.push(-dz*w,0,dx*w,dz*w,0,-dx*w,dx*.22-dz*w,h*.65,dz*.22+dx*w,dx*.22+dz*w,h*.65,dz*.22-dx*w,dx*.5,h,dz*.5);idx.push(base,base+1,base+2,base+1,base+3,base+2,base+2,base+3,base+4);}g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return g;}
export function buildMarine(scene){const root=new THREE.Group(),substrate=new THREE.Group(),ecology=new THREE.Group(),references=new THREE.Group();root.name='marine-world';root.add(substrate,ecology,references);scene.add(root);const records=marinePlacements(),obstacles=[];
 const geos={rock:new THREE.IcosahedronGeometry(1,1),shell:new THREE.ConeGeometry(.16,.18,6),seagrass:blades(false),algae:blades(true)},colors={rock:'#737e76',shell:'#d5c7a2',seagrass:'#668d58',algae:'#6e8150'},batches={};
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),scale=new THREE.Vector3();
 for(const kind of Object.keys(geos)){const points=records.filter(p=>p.kind===kind),mesh=new THREE.InstancedMesh(geos[kind],new THREE.MeshStandardMaterial({color:colors[kind],roughness:.95,side:THREE.DoubleSide}),points.length);mesh.name='marine-'+kind;points.forEach((p,i)=>{const rock=kind==='rock',s=p.scale;q.setFromAxisAngle(up,p.rotation);scale.set(rock?s*1.7:s,rock?s*.8:s,rock?s*1.2:s);matrix.compose(new THREE.Vector3(p.x,p.y+(rock?s*.25:kind==='shell'?.05:0),p.z),q,scale);mesh.setMatrixAt(i,matrix);if(rock)obstacles.push({...p,radius:s*1.9});});mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.castShadow=kind==='rock';(kind==='rock'?substrate:ecology).add(mesh);batches[kind]=mesh;}
 for(const [level,color] of [[MARINE.low,'#77ddd1'],[MARINE.high,'#f4cc7c']]){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(tideContour(level)),new THREE.LineDashedMaterial({color,dashSize:3,gapSize:2,depthTest:false}));line.computeLineDistances();line.renderOrder=6;references.add(line);}
 // Actual-depth transect, visible only in the explanatory water layer.
 const points=Array.from({length:151},(_,i)=>{const p=marinePath(i/150);return new THREE.Vector3(p.x,p.y+.18,p.z);});const transect=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:'#f3d6a0',dashSize:3,gapSize:3,depthTest:false}));transect.computeLineDistances();references.add(transect);
 return {root,substrate,ecology,references,records,batches,obstacles,setStage(stage){substrate.visible=stage>=1;references.visible=stage===2;ecology.visible=stage===3;},blockedAt(x,z){return obstacles.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+.35);}};
}

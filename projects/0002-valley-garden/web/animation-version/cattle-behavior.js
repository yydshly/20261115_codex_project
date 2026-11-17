import * as THREE from 'three';
import { separateCowLips,createCowMouthLining,lipHeightAt } from './cattle-mouth.js';
import { createCowGait } from './cattle-gait.js';
import { cowAttention } from './cattle-attention.js';

const smooth=THREE.MathUtils.smoothstep;
const templates=new WeakMap();
const legs=[
  {x:-.23,hip:.32,knee:.27,foot:.292,phase:.75,bend:-1,sole:.015},
  {x:.055,hip:.32,knee:.26,foot:.289,phase:.25,bend:-1,sole:.015},
  {x:-.245,hip:-.78,knee:-.84,foot:-.76,phase:0,bend:-1},
  {x:.078,hip:-.78,knee:-.83,foot:-.80,phase:.5,bend:-1,sole:.0044}
];

function prepare(source){
  if(templates.has(source))return templates.get(source);
  source.updateMatrixWorld(true);const meshes=[];source.traverse(o=>{if(o.isMesh)meshes.push(o);});
  if(meshes.length!==1)throw new Error('当前奶牛动作需要单一静态网格');
  const input=meshes[0],mouth=separateCowLips(input.geometry.clone().applyMatrix4(input.matrixWorld)),geometry=mouth.geometry,p=geometry.attributes.position;
  const indices=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4),noseCentre=new THREE.Vector3(),noseSamples=[];let muzzle=0,nearest=Infinity;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(z>1.12&&y>.985&&y<1.075){noseCentre.x+=x;noseCentre.y+=y;noseCentre.z+=z;noseSamples.push(i);}
    const neck=smooth(z,.36,.63)*smooth(y,.68,.94),head=neck*smooth(z+(y-1)*.60,.66,.84);
    const seam=lipHeightAt(z),naturalJaw=head*smooth(z,.86,1.06)*(1-smooth(y,seam-.009,seam+.012));
    const mouthSide=geometry.attributes.mouthSide.getX(i),jaw=mouthSide?THREE.MathUtils.lerp(naturalJaw,mouthSide<0?head:0,smooth(z,1.04,1.12)):naturalJaw;
    const tailWidth=THREE.MathUtils.lerp(.16,.05,smooth(y,.58,.92));
    const tail=(1-smooth(z,-1.055,-.985))*(1-smooth(Math.abs(x+.075),tailWidth*.70,tailWidth))*(1-smooth(y,1.16,1.25));
    const tailTip=tail*(1-smooth(y,.52,.79));
    const legIndex=(z<-.22?2:0)+(x>-.085?1:0),leg=legs[legIndex];
    const upperLeg=(1-smooth(y,.48,.87))*(1-smooth(Math.hypot((x-leg.x)/.22,(z-leg.knee)/.28),.55,1.15));
    const legWeight=THREE.MathUtils.lerp(1,upperLeg,smooth(y,.26,.40));
    const lower=1-smooth(y,.30,.47),hoof=1-smooth(y,.09,.17),base=5+legIndex*3;
    const scores=tail>.05?[[4,tail-tailTip],[17,tailTip],[0,1-tail]]:legWeight>.001?[[0,1-legWeight],[base,legWeight*(1-lower)],[base+1,legWeight*lower*(1-hoof)],[base+2,legWeight*lower*hoof]]:[[0,1-neck],[1,neck-head],[2,head-jaw],[3,jaw]];
    scores.forEach(([bone,weight],j)=>{indices[i*4+j]=bone;weights[i*4+j]=weight;});
    // Muzzle support at the grazing skull angle, with the head counter-rotating at the poll.
    const d=y*Math.cos(.80)-z*Math.sin(.80);if(z>.90&&y<1.20&&d<nearest){nearest=d;muzzle=i;}
  }
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  // Only the fixed torso/legs enter the cached sun map. The moving neck has no stale self-shadow.
  const caster=geometry.clone(),triangles=[],index=geometry.index;
  for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);if([a,b,c].every(v=>indices[v*4]===0&&weights[v*4]>.999))triangles.push(a,b,c);}
  caster.setIndex(triangles);
  const lining=createCowMouthLining(geometry,mouth.edges),mouthSamples=mouth.pairs.sort((a,b)=>p.getZ(b.upper)-p.getZ(a.upper)).slice(0,8);
  noseCentre.divideScalar(noseSamples.length);const restYaw=-Math.atan2(noseCentre.x-.14,noseCentre.z-.77);
  const template={geometry,caster,lining,mouthSamples,noseSamples,restYaw,material:input.material,muzzle,restMuzzle:new THREE.Vector3().fromBufferAttribute(p,muzzle)};
  templates.set(source,template);return template;
}

/** Runtime armature and lip seam over the retained static GLB. */
export function createGrazingCow(source,{phaseOffset=6,animate=true,surfaceHeight}){
  const template=prepare(source),root=new THREE.Group(),body=new THREE.Bone(),neck=new THREE.Bone(),head=new THREE.Bone(),jaw=new THREE.Bone(),tail=new THREE.Bone(),tailTip=new THREE.Bone();
  body.name='Cow fixed body';neck.name='Cow neck';head.name='Cow head';jaw.name='Cow jaw';tail.name='Cow tail';
  neck.position.set(0,.84,.25);head.position.set(.14,.26,.52);jaw.position.set(.04,-.04,.11);tail.position.set(-.075,1.18,-.99);tailTip.position.set(0,-.42,-.12);tailTip.name='Cow tail tip';
  body.add(neck,tail);tail.add(tailTip);neck.add(head);head.add(jaw);
  const legBones=legs.map((leg,i)=>{const upper=new THREE.Bone(),lower=new THREE.Bone(),hoof=new THREE.Bone();upper.name=`Cow leg ${i+1} shoulder`;lower.name=`Cow leg ${i+1} knee`;hoof.name=`Cow leg ${i+1} hoof`;upper.position.set(leg.x,.83,leg.hip);lower.position.set(0,-.43,leg.knee-leg.hip);hoof.position.set(0,-.36,leg.foot-leg.knee);body.add(upper);upper.add(lower);lower.add(hoof);return {upper,lower,hoof,leg};});
  const mesh=new THREE.SkinnedMesh(template.geometry,template.material);mesh.name='Cow · grazing head and articulated four-beat walk';mesh.add(body);mesh.bind(new THREE.Skeleton([body,neck,head,jaw,tail,...legBones.flatMap(l=>[l.upper,l.lower,l.hoof]),tailTip]));mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;root.add(mesh);
  const lining=new THREE.SkinnedMesh(template.lining,new THREE.MeshBasicMaterial({color:'#281c19',side:THREE.DoubleSide}));lining.name='Cow opening mouth · dark lip lining';lining.bind(mesh.skeleton,mesh.bindMatrix);lining.frustumCulled=false;lining.castShadow=false;root.add(lining);
  const shadow=new THREE.Mesh(template.caster,new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}));shadow.name='Cow fixed torso shadow';shadow.castShadow=true;shadow.userData.shadowOnly=true;root.add(shadow);
  const point=new THREE.Vector3(),otherPoint=new THREE.Vector3(),gait=createCowGait(mesh,body,legBones,surfaceHeight);
  const state={phase:'grazing',graze:1,muzzleClearance:0,jaw:0,tail:0,mouthOpening:0,headYaw:0,restYaw:template.restYaw};
  function pose(graze,time,moving,motion){
    // Rotate fixed-length cervical/skull segments. Do not translate the neck to chase the ground.
    const attention=cowAttention(time,{...motion,graze},phaseOffset,moving);state.headYaw=attention.yaw;
    // The retained mesh has a baked rightward head turn. Undo it before adding live attention.
    neck.rotation.set(graze*1.035,template.restYaw+attention.yaw*.42,0);
    head.rotation.set(-graze*.28+attention.pitch,attention.yaw*.58,0);
    const chew=time*5.3+phaseOffset,open=.5-.5*Math.cos(chew),feeding=smooth(graze,.55,.95);
    state.jaw=moving?(.003+open*.047)*(.28+.72*feeding):0;
    jaw.rotation.set(state.jaw,moving?Math.sin(chew+.7)*.009*(.35+.65*feeding):0,moving?Math.sin(chew)*.006:0);
    const swish=((time+phaseOffset*.63)%9.4)/9.4,envelope=Math.sin(Math.PI*THREE.MathUtils.clamp((swish-.18)/.42,0,1))**2;
    state.tail=moving?Math.sin(time*.73+phaseOffset)*.045+Math.sin((swish-.18)/.42*Math.PI*3)*envelope*.62:0;
    tail.rotation.set(moving?.06+Math.sin(time*.8)*.025:0,0,state.tail);
    tailTip.rotation.set(moving?Math.sin(time*1.1+.7)*.08:0,moving?Math.sin(time*.9)*.05:0,moving?Math.sin((swish-.18)/.42*Math.PI*3-.65)*envelope*.38:0);
    root.updateWorldMatrix(true,false);root.updateMatrixWorld(true);
  }
  function update(time,motion){
    const phase=animate?(time+phaseOffset)%38:6;
    const graze=motion?.graze??(phase<20?1:phase<23?1-smooth(phase,20,23):phase<28?0:phase<31?smooth(phase,28,31):1);
    state.phase=motion?.phase||(phase<20||phase>=31?'grazing':phase<23?'raising':phase<28?'looking':'lowering');state.graze=graze;state.speed=motion?.speed||0;state.walkBlend=motion?.walkBlend||0;
    const lookProgress=motion?.lookProgress??THREE.MathUtils.clamp((phase-23)/5,0,1);
    pose(graze,time,animate,{...motion,lookProgress});gait.update(time,motion);mesh.getVertexPosition(template.muzzle,point).applyMatrix4(mesh.matrixWorld);
    state.muzzleClearance=point.y-surfaceHeight(point.x,point.z);
    state.mouthOpening=0;for(const sample of template.mouthSamples){mesh.getVertexPosition(sample.upper,point);mesh.getVertexPosition(sample.lower,otherPoint);state.mouthOpening=Math.max(state.mouthOpening,point.distanceTo(otherPoint));}
  }
  return {root,mesh,lining,shadow,state,update,gait,legBones,mouthSamples:template.mouthSamples,noseSamples:template.noseSamples,muzzleIndex:template.muzzle,feedingPoint(){gait.reset();pose(1,0,false);mesh.getVertexPosition(template.muzzle,point).applyMatrix4(mesh.matrixWorld);return point.clone();}};
}

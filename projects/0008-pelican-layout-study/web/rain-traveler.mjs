import * as THREE from 'three';
import {legPose,smooth} from './rain-route.mjs';
import {paintMaterial,surfaceTexture,roundedBox} from './rain-art.mjs';

export function createTraveler(){
 const root=new THREE.Group();root.name='the-same-traveler';
 let n=94;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 const clothTexture=surfaceTexture('cloth',random),paperTexture=surfaceTexture('umbrella',random);
 const material=(color,extra={})=>paintMaterial(color,extra);
 const coat=material('#dbceb0',{map:clothTexture}),coatDark=material('#b6a585',{map:clothTexture}),ink=material('#314b48'),skin=material('#dab790'),hair=material('#2d3834'),boot=material('#454c43',{roughness:.52}),scarf=material('#a85e40',{map:clothTexture}),pack=material('#536e68',{map:clothTexture});
 function mesh(geometry,mat,parent=root,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const sphere=(rx,ry,rz,mat,parent,x,y,z)=>{const m=mesh(new THREE.SphereGeometry(1,20,14),mat,parent,x,y,z);m.scale.set(rx,ry,rz);return m;};
 const torso=new THREE.Group();root.add(torso);
 const body=mesh(new THREE.CylinderGeometry(.24,.32,.67,24),coat,torso,0,1.06,0);body.scale.z=.72;
 const collar=mesh(new THREE.CylinderGeometry(.145,.20,.12,10),scarf,torso,0,1.42,0);collar.scale.z=.8;
 const scarfTail=mesh(roundedBox(.10,.40,.035,.012),scarf,torso,.16,1.18,.23);scarfTail.rotation.z=-.15;
 const head=new THREE.Group();head.position.set(0,1.59,.01);torso.add(head);
 sphere(.18,.235,.175,skin,head,0,0,0);
 const cap=mesh(new THREE.SphereGeometry(.19,12,8,0,Math.PI*2,0,Math.PI*.57),hair,head,0,.038,-.015);cap.scale.y=.82;
 sphere(.045,.05,.035,skin,head,0,-.01,.171);
 sphere(.016,.012,.012,ink,head,-.075,.026,.158);sphere(.016,.012,.012,ink,head,.075,.026,.158);
 sphere(.045,.062,.04,skin,head,-.17,-.01,0);sphere(.045,.062,.04,skin,head,.17,-.01,0);
 const backpack=mesh(roundedBox(.40,.46,.19,.055),pack,torso,0,1.12,-.25);backpack.rotation.x=-.06;
 mesh(roundedBox(.42,.12,.22,.045),coatDark,torso,0,1.36,-.26);
 const blanket=mesh(new THREE.CylinderGeometry(.069,.069,.34,16),coatDark,torso,0,1.46,-.27);blanket.rotation.z=Math.PI/2;
 for(const x of[-.12,.12]){mesh(roundedBox(.025,.32,.023,.008),ink,torso,x,1.16,-.357);mesh(roundedBox(.046,.040,.015,.008),material('#a48e60',{metalness:.35,roughness:.45}),torso,x,1.07,-.374);}
 for(const x of[-.17,.17])mesh(new THREE.BoxGeometry(.035,.46,.026),ink,torso,x,1.17,.185);
 const belt=mesh(new THREE.CylinderGeometry(.29,.30,.055,10),coatDark,torso,0,.86,0);belt.scale.z=.77;
 const capeGeometry=new THREE.BufferGeometry(),capePositions=[],capeIndices=[],capeUvs=[];const around=36,levels=7;
 for(let j=0;j<=levels;j++)for(let i=0;i<=around;i++){const a=i/around*Math.PI*2,down=j/levels,r=.245+down*.145+Math.sin(a*7)*.008*down;capePositions.push(Math.sin(a)*r,1.02-down*(.46+.06*Math.cos(a)),Math.cos(a)*r*.76);capeUvs.push(i/around,j/levels);}
 for(let j=0;j<levels;j++)for(let i=0;i<around;i++){const a=j*(around+1)+i,b=a+around+1;capeIndices.push(a,b,a+1,b,b+1,a+1);}
 capeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(capePositions,3));capeGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(capeUvs,2));capeGeometry.setIndex(capeIndices);capeGeometry.computeVertexNormals();const cape=mesh(capeGeometry,coat,torso);const capeBase=capeGeometry.attributes.position.array.slice();
 const legs=[];
 for(let side=0;side<2;side++){
  const hip=new THREE.Group();hip.position.set(side?.135:-.135,.79,0);root.add(hip);
  const upper=mesh(new THREE.CylinderGeometry(.072,.062,.36,7),ink,hip,0,-.18,0);
  const knee=new THREE.Group();knee.position.y=-.36;hip.add(knee);mesh(new THREE.CylinderGeometry(.063,.052,.36,7),ink,knee,0,-.18,0);
  const ankle=new THREE.Group();ankle.position.y=-.36;knee.add(ankle);
  const shoe=mesh(roundedBox(.15,.13,.27,.035),boot,ankle,0,-.015,.055);shoe.geometry.translate(0,0,.015);
  mesh(new THREE.BoxGeometry(.155,.025,.285),ink,ankle,0,-.07,.065);
  legs.push({hip,knee,ankle,shoe});
 }
 const upperArmGeometry=new THREE.CylinderGeometry(.062,.075,1,8),forearmGeometry=new THREE.CylinderGeometry(.05,.06,1,8);
 const arms=[0,1].map(()=>({upper:mesh(upperArmGeometry,coat,torso),fore:mesh(forearmGeometry,coat,torso),hand:sphere(.056,.07,.05,skin,torso,0,0,0)}));
 const axis=new THREE.Vector3(0,1,0),v=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3();
 function between(m,start,end){a.fromArray(start);b.fromArray(end);v.subVectors(b,a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=v.length();m.quaternion.setFromUnitVectors(axis,v.normalize());}
 const umbrellaPivot=new THREE.Group();umbrellaPivot.position.set(.32,1.24,.13);root.add(umbrellaPivot);
 const shaft=mesh(new THREE.CylinderGeometry(.014,.014,1.29,8),material('#b3a17c',{roughness:.38}),umbrellaPivot,0,.57,0);
 const canopy=new THREE.Group();canopy.position.y=.97;umbrellaPivot.add(canopy);
 const panels=16,rings=9,radius=.95,cloths=[material('#bd7848',{roughness:.62,map:paperTexture,emissive:'#4b2811',emissiveIntensity:.16}),material('#ce8a53',{roughness:.65,map:paperTexture,emissive:'#4b2811',emissiveIntensity:.16})];
 const canopyY=r=>.24*(1-r*r)+.02*Math.sin(r*Math.PI);
 for(let s=0;s<panels;s++){
  const positions=[],indices=[],uvs=[];
  for(let j=0;j<=rings;j++)for(let k=0;k<2;k++){const r=j/rings,angle=(s+k)/panels*Math.PI*2;positions.push(Math.sin(angle)*radius*r,canopyY(r)-.024*Math.sin(r*Math.PI),Math.cos(angle)*radius*r);uvs.push((s+k)/panels*2,r);}
  for(let j=0;j<rings;j++){const i=j*2;indices.push(i,i+2,i+1,i+2,i+3,i+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();const panel=mesh(g,cloths[s%2],canopy);panel.material.side=THREE.DoubleSide;
  const angle=s/panels*Math.PI*2,points=[];for(let j=0;j<=6;j++){const r=j/6;points.push(new THREE.Vector3(Math.sin(angle)*radius*r,canopyY(r)-.008,Math.cos(angle)*radius*r));}
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.007,3,false),material('#d4a173'),canopy);
  sphere(.014,.018,.014,cloths[0],canopy,Math.sin(angle)*radius,-.005,Math.cos(angle)*radius);
  if(s%3===0)sphere(.013,.023,.013,material('#d3e2d6',{roughness:.14,metalness:.14}),canopy,Math.sin(angle)*radius,-.035,Math.cos(angle)*radius);
 }
 sphere(.043,.072,.043,material('#7f5137'),canopy,0,.28,0);
 const handWorld=new THREE.Vector3();
 function update(pose,weatherTime){
  const phase=pose.distance/1.18*Math.PI*2,bob=Math.sin(phase*2)*.018*pose.walk;
  root.position.set(pose.position[0],.035+bob,pose.position[2]);
  const startYaw=2.43,heading=pose.yaw;let yawDelta=Math.atan2(Math.sin(heading-startYaw),Math.cos(heading-startYaw));root.rotation.y=startYaw+yawDelta*smooth((pose.time-6)/3);
  torso.rotation.z=Math.sin(phase)*.025*pose.walk;torso.rotation.x=-.025*pose.walk;
  const lookingFar=smooth((pose.time-54)/9);
  head.rotation.x=-.15*pose.reach+.045*Math.sin(weatherTime*.7)*(1-pose.walk)-lookingFar*.035;head.rotation.y=(1-pose.walk)*.1*Math.sin(weatherTime*.32)-lookingFar*.35;
  head.rotation.y+=pose.lookYaw||0;head.rotation.x+=pose.lookPitch||0;torso.rotation.x+=pose.bodyLean||0;
  legs.forEach((leg,side)=>{const angles=legPose(pose.distance,side,bob,pose.walk);leg.hip.position.y=.75+.04*(1-pose.walk);leg.hip.rotation.x=angles.hip;leg.knee.rotation.x=angles.knee;leg.ankle.rotation.x=angles.ankle;});
  const swing=Math.sin(phase)*.22*pose.walk,reach=pose.reach;
  const leftShoulder=[-.265,1.32,0],leftElbow=[-.34,1.04+reach*.09,swing*.45+reach*.27],leftHand=[-.34-reach*.06,.86+reach*.28,swing+reach*.61];
  between(arms[0].upper,leftShoulder,leftElbow);between(arms[0].fore,leftElbow,leftHand);arms[0].hand.position.fromArray(leftHand);
  between(arms[1].upper,[.265,1.32,0],[.36,1.08,.10]);between(arms[1].fore,[.36,1.08,.10],[.32,1.27,.13]);arms[1].hand.position.set(.32,1.27,.13);
  umbrellaPivot.rotation.z=-.085+Math.sin(weatherTime*.7)*.025;umbrellaPivot.rotation.x=.04+Math.sin(weatherTime*.47)*.025-.10*pose.reach-lookingFar*.10;
  umbrellaPivot.rotation.z+=(pose.umbrellaTilt||0)+Math.sin(weatherTime*1.35)*(pose.gust||0)*.045;
  scarfTail.rotation.x=Math.sin(weatherTime*1.2)*.13*(1+(pose.gust||0));
  const pos=capeGeometry.attributes.position;for(let i=0;i<pos.count;i++){const y=capeBase[i*3+1],weight=Math.max(0,1.02-y);pos.array[i*3+2]=capeBase[i*3+2]+Math.sin(weatherTime*1.4+capeBase[i*3]*5)*weight*.035*(1+(pose.gust||0)*1.6);}
  pos.needsUpdate=true;root.updateMatrixWorld(true);arms[0].hand.getWorldPosition(handWorld);
  return{hand:handWorld,feet:legs.map(leg=>leg.ankle.getWorldPosition(new THREE.Vector3()))};
 }
 return{root,update,umbrellaPivot,canopy,legs};
}

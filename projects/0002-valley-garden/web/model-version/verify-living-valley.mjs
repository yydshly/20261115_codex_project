import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createGrazingCow } from './cattle-behavior.js';
import { createStream } from './stream.js';
import { riverX,riverWidth } from './terrain.js';
import { grazingInfluenceAt,meadowGrowthAt } from './meadow-field.js';
import { streamSurfaceOffset } from './stream-flow.js';

const loader=new GLTFLoader();loader.register(()=>({name:'CPUAnimalInspection',loadTexture:async()=>new THREE.Texture()}));
const bytes=await readFile(new URL('./assets/models/life/cow.glb',import.meta.url));
const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
let original;asset.scene.traverse(o=>{if(o.isMesh)original=o;});
const before=original.geometry.attributes.position.array.slice(),floor=.18;
const cow=createGrazingCow(asset.scene,{surfaceHeight:()=>floor}),other=createGrazingCow(asset.scene,{phaseOffset:23.5,surfaceHeight:()=>floor});
cow.root.position.set(7,floor,11);cow.root.rotation.y=1.2;cow.root.scale.setScalar(.99);
assert.equal(cow.mesh.geometry,other.mesh.geometry,'Cattle duplicate their prepared geometry');
assert.notEqual(cow.mesh.skeleton,other.mesh.skeleton,'Cattle share one animated skeleton');
const position=cow.mesh.geometry.attributes.position,point=new THREE.Vector3(),rest=new THREE.Vector3(),hooves=[];
const segmentLengths=cow.mesh.skeleton.bones.map(b=>b.position.length());
for(let i=0;i<position.count;i+=7)if(position.getY(i)<.045)hooves.push(i);
const phases=new Set();let minJaw=Infinity,maxJaw=-Infinity,minTail=Infinity,maxTail=-Infinity,maxHoofError=0,minHead=Infinity;
for(let frame=0;frame<1140;frame++){
  const t=frame/30;cow.update(t);other.update(t);phases.add(cow.state.phase);
  minJaw=Math.min(minJaw,cow.state.jaw);maxJaw=Math.max(maxJaw,cow.state.jaw);minTail=Math.min(minTail,cow.state.tail);maxTail=Math.max(maxTail,cow.state.tail);
  assert(cow.mesh.skeleton.bones.every((b,i)=>Math.abs(b.position.length()-segmentLengths[i])<1e-10),'Grazing translates or stretches a neck segment');
  if(cow.state.graze>.999){assert(cow.state.muzzleClearance>.06&&cow.state.muzzleClearance<.20,'Natural muzzle height misses edible grass');assert(cow.mesh.skeleton.bones[1].rotation.x+cow.mesh.skeleton.bones[2].rotation.x<1.05,'The skull folds back under the neck');}
  for(const index of hooves){cow.mesh.getVertexPosition(index,point).applyMatrix4(cow.mesh.matrixWorld);rest.fromBufferAttribute(position,index).applyMatrix4(cow.mesh.matrixWorld);maxHoofError=Math.max(maxHoofError,point.distanceTo(rest));}
  if(frame%95===0)for(let i=0;i<position.count;i++){if(position.getZ(i)<.87)continue;cow.mesh.getVertexPosition(i,point).applyMatrix4(cow.mesh.matrixWorld);minHead=Math.min(minHead,point.y-floor);}
}
assert.deepEqual([...phases].sort(),['grazing','looking','lowering','raising']);assert(maxHoofError<1e-6,'Grazing rocks the planted hooves');assert(minHead>.02,'Grazing pushes the head into the ground');
assert(maxJaw-minJaw>.035&&maxTail-minTail>.2,'Chewing or tail motion is missing');
const feeding=cow.feedingPoint(),localFeeding=cow.mesh.worldToLocal(feeding.clone());assert(localFeeding.z>.8,'The feeding point is tucked back between the front legs');
cow.update(0);other.update(0);assert(cow.state.graze>.99&&other.state.graze<.01,'Both cows perform an identical cycle');
assert.deepEqual(original.geometry.attributes.position.array,before,'Runtime rig modified the retained source mesh');assert(!original.geometry.attributes.skinIndex,'Runtime skin weights leaked into the source');
const expression=createGrazingCow(asset.scene,{phaseOffset:0,surfaceHeight:()=>0}),ep=expression.mesh.geometry.attributes.position,ei=expression.mesh.geometry.attributes.skinIndex,ew=expression.mesh.geometry.attributes.skinWeight;
let tipIndex=-1;for(let i=0;i<ep.count;i++)if(ep.getY(i)<.38)for(let j=0;j<4;j++)if(ei.getComponent(i,j)===17&&ew.getComponent(i,j)>.95){tipIndex=i;break;}
assert(tipIndex>=0&&expression.mouthSamples.length>=4&&expression.lining.geometry.index.count>30,'The visible mouth or tail tip is missing');
let smallestGap=Infinity,largestGap=0,tailMin=Infinity,tailMax=-Infinity,tipMinY=Infinity;
for(let frame=0;frame<282;frame++){expression.update(frame/30,{graze:1,phase:'grazing',walkBlend:0,speed:0,gaitDistance:0});smallestGap=Math.min(smallestGap,expression.state.mouthOpening);largestGap=Math.max(largestGap,expression.state.mouthOpening);expression.mesh.getVertexPosition(tipIndex,point);tailMin=Math.min(tailMin,point.x);tailMax=Math.max(tailMax,point.x);tipMinY=Math.min(tipMinY,point.y);}
assert(largestGap>.006&&largestGap<.022&&smallestGap<largestGap*.50,'A rotating jaw does not actually open and close the lip seam');assert(tailMax-tailMin>.30&&tipMinY>.18,'Tail skin does not visibly swish, or intersects the ground');
for(const sample of expression.mouthSamples)assert(ep.getY(sample.upper)<.980,'The mouth seam intersects the nasal pad');
for(let i=0;i<ep.count;i+=5)if(ep.getY(i)>.985&&ep.getZ(i)>1.08)for(let j=0;j<4;j++)assert(!(ei.getComponent(i,j)===3&&ew.getComponent(i,j)>.001),'Chewing deforms a nostril');
console.log('Expression geometry '+JSON.stringify({mouthGapMin:smallestGap,mouthGapMax:largestGap,tailTipLateralTravel:tailMax-tailMin,tailTipMinHeight:tipMinY}));
const texture=new THREE.Texture(),maps={color:texture,normal:texture,roughness:texture};
const stream=createStream(new THREE.Scene(),{gravel:maps},{riverX,riverWidth}),first=Array.from(stream.drift.instanceMatrix.array);stream.update(10);
for(let i=0;i<16;i++){const m=stream.drift.instanceMatrix.array,x=m[i*16+12],z=m[i*16+14],side=(x-riverX(z))/riverWidth(z);assert(Math.abs(side)<.90,'A drifting leaf left the water');assert(z-first[i*16+14]>1&&Math.hypot(x-first[i*16+12],z-first[i*16+14])<15,'Leaves do not advect through the curved channel');assert(m[i*16+13]>-.05+streamSurfaceOffset(z,side,10),'A leaf intersects the moving water surface');}
assert(stream.flow.speed(-6,0)>stream.flow.speed(18,0)*1.3,'Shallow riffles do not accelerate the surface flow');assert(stream.flow.speed(18,.8)<stream.flow.speed(18,0),'The bank flows as fast as the channel centre');
assert(stream.profileAt(9,.79).depth<.35&&stream.profileAt(9,.79).riffle>.9,'The shallow-water viewpoint still looks into a deep pool');
const rock={x:riverX(9)+riverWidth(9)*.58,z:9,radius:.25};stream.setObstacles([rock]);
let rockClearance=Infinity;for(let i=0;i<80;i++){const q=stream.flow.sample(stream.flow.timeAtZ(9)-1+i/40,.58);rockClearance=Math.min(rockClearance,Math.hypot(q.x-rock.x,q.z-rock.z));}assert(rockClearance>rock.radius,'Surface tracers pass through the stone');
assert(stream.foam.instanceMatrix.array.every(Number.isFinite)&&stream.foam.geometry.attributes.flowOpacity.array.some(v=>v>.4),'Moving broken foam is missing');
for(let i=0;i<100;i++){assert(Math.abs(streamSurfaceOffset(i*.2,0,i*.17))<.020);assert(Math.abs(streamSurfaceOffset(i,1,i))<1e-12,'Waves lift the stationary shoreline');}
const threadPositions=stream.ribbons.geometry.attributes.position.array.slice();stream.update(11);assert(stream.ribbons.geometry.attributes.position.array.every(Number.isFinite));assert(stream.ribbons.geometry.attributes.position.array.some((v,i)=>Math.abs(v-threadPositions[i])>.02),'Curved surface threads remain stationary');
stream.setQuality(false);assert.equal(stream.ribbons.geometry.drawRange.count,160*6*6/2);assert.equal(stream.foam.count,182);
const sites=[{x:7,z:11,grazingRadius:2.8}];assert(grazingInfluenceAt(7,11,sites)>.99&&grazingInfluenceAt(15,11,sites)===0);
const growth=Array.from({length:100},(_,i)=>meadowGrowthAt(i*.53,Math.sin(i)*5));assert(Math.max(...growth)-Math.min(...growth)>.5,'Pasture growth has no coherent variation');
console.log('OK: grazing/raising/looking/lowering, chewing and tail motion; hoof drift '+maxHoofError.toFixed(8)+' m, minimum head clearance '+minHead.toFixed(3)+' m; drifting leaves stay in the channel');

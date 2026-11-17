import * as THREE from '../../web/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../../web/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createGrazingCow } from '../../web/model-version/cattle-behavior.js';
import { createCowRoaming } from '../../web/model-version/cattle-roaming.js';
const loader=new GLTFLoader();loader.register(()=>({name:'InspectionTextures',loadTexture:async()=>new THREE.Texture()}));
const b=await readFile(new URL('../../web/model-version/assets/models/life/cow.glb',import.meta.url)),asset=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const cow=createGrazingCow(asset.scene,{surfaceHeight:()=>0}),mode=process.argv[2]||'mouth',roam=createCowRoaming({x:0,z:0,heading:0,isSafe:(x,z)=>Math.hypot(x,z)<4.7,seed:4187});
if(mode==='mouth'){
  cow.update((Math.PI*3-6)/5.3,{graze:1,phase:'grazing',walkBlend:0,speed:0,gaitDistance:0});
  cow.mesh.skeleton.bones[1].rotation.set(0,0,0);cow.mesh.skeleton.bones[2].rotation.set(0,0,0);cow.root.updateMatrixWorld(true);
}else{
  const end=roam.stages.find(s=>s.kind==='walking').start+2.1;
  for(let t=0;t<=end;t+=1/60){const m=roam.sample(t);m.predict=seconds=>roam.sample(t+seconds);cow.root.position.set(m.x,.005,m.z);cow.root.rotation.y=m.heading;cow.update(t,m);}
}
const meshes=[cow.mesh,cow.lining],p=[],uv=[],index=[],point=new THREE.Vector3();let darkFrom=0;
for(const mesh of meshes){const g=mesh.geometry,offset=p.length/3;for(let i=0;i<g.attributes.position.count;i++){mesh.getVertexPosition(i,point);p.push(...point.toArray());uv.push(g.attributes.uv?.getX(i)||0,g.attributes.uv?.getY(i)||0);}for(let i=0;i<g.index.count;i++)index.push(offset+g.index.getX(i));if(mesh===cow.mesh)darkFrom=index.length/3;}
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setIndex(index);geometry.computeVertexNormals();
const root=new URL('./.local/',import.meta.url);await mkdir(root,{recursive:true});
for(const [name,values]of Object.entries({position:new Float32Array(p),normal:geometry.attributes.normal.array,uv:new Float32Array(uv),indices:new Uint32Array(index)}))await writeFile(new URL(`${mode}-${name}.bin`,root),Buffer.from(values.buffer,values.byteOffset,values.byteLength));
await writeFile(new URL(`${mode}.json`,root),JSON.stringify({darkFrom,mode}));console.log(JSON.stringify({mode,vertices:p.length/3,triangles:index.length/3,mouthOpening:cow.state.mouthOpening}));

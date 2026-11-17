// Offline asset preparation. Raw CC0 source and npm tooling stay in ignored .local/.
import { readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { MeshoptSimplifier } from '../.local/tools/meshoptimizer/meshopt_simplifier.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(root,'.local/upstream/jacaranda'),out=resolve(root,'assets/models/trees/jacaranda');
await mkdir(out,{recursive:true});await mkdir(resolve(out,'textures'),{recursive:true});
await MeshoptSimplifier.ready;
const original=JSON.parse(await readFile(resolve(source,'source.gltf'),'utf8'));
const raw=await readFile(resolve(source,original.buffers[0].uri));
const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
function accessor(id){const a=original.accessors[id],v=original.bufferViews[a.bufferView],Type=types[a.componentType];
  if(v.byteStride)throw new Error('Unexpected strided source');
  return new Type(raw.buffer,raw.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*components[a.type]);
}
const distantOnly=process.argv.includes('--distant-only');
const report=distantOnly?JSON.parse(await readFile(resolve(out,'manifest.json'),'utf8')):{source:'https://polyhaven.com/a/jacaranda_tree',license:'CC0-1.0',tool:'meshoptimizer 1.3.0 (MIT)',lods:[]};
const positionAccessors=original.meshes[0].primitives.map(p=>original.accessors[p.attributes.POSITION]);
report.sourceBounds={min:[0,1,2].map(i=>Math.min(...positionAccessors.map(a=>a.min[i]))),max:[0,1,2].map(i=>Math.max(...positionAccessors.map(a=>a.max[i])))};
const trunkPrimitive=original.meshes[0].primitives.find(p=>/trunk/.test(original.materials[p.material].name));
const trunk=accessor(trunkPrimitive.attributes.POSITION),baseY=report.sourceBounds.min[1],baseMin=[Infinity,Infinity],baseMax=[-Infinity,-Infinity];
for(let i=0;i<trunk.length;i+=3)if(trunk[i+1]<baseY+.45){baseMin[0]=Math.min(baseMin[0],trunk[i]);baseMax[0]=Math.max(baseMax[0],trunk[i]);baseMin[1]=Math.min(baseMin[1],trunk[i+2]);baseMax[1]=Math.max(baseMax[1],trunk[i+2]);}
report.origin=[(baseMin[0]+baseMax[0])/2,baseY,(baseMin[1]+baseMax[1])/2];
for(const [name,targets,errorLimit] of [['near',[85000,26000,160000],.004],['far',[22000,7000,40000],.009],['distant',[2300,1200,6500],.03]]){
  if(distantOnly&&name!=='distant')continue;
  const json=structuredClone(original);json.accessors=[];json.bufferViews=[];json.meshes[0].primitives=[];
  json.nodes[0].name=`Jacaranda mature tree ${name}`;
  const chunks=[];let byteLength=0;const stats=[];
  function append(data,definition){
    const padding=(4-byteLength%4)%4;if(padding){chunks.push(Buffer.alloc(padding));byteLength+=padding;}
    const buffer=Buffer.from(data.buffer,data.byteOffset,data.byteLength),view=json.bufferViews.length;
    json.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:buffer.length});chunks.push(buffer);byteLength+=buffer.length;
    const id=json.accessors.length;json.accessors.push({...definition,bufferView:view,byteOffset:0,count:data.length/components[definition.type]});return id;
  }
  for(const [part,p] of original.meshes[0].primitives.entries()){
    const pos=accessor(p.attributes.POSITION),normal=accessor(p.attributes.NORMAL),uv=accessor(p.attributes.TEXCOORD_0),input=accessor(p.indices);
    const attrs=new Float32Array(pos.length/3*5);
    for(let i=0;i<pos.length/3;i++){attrs.set(normal.subarray(i*3,i*3+3),i*5);attrs.set(uv.subarray(i*2,i*2+2),i*5+3);}
    const [indices,error]=MeshoptSimplifier.simplifyWithAttributes(input,pos,3,attrs,5,[.12,.12,.12,.5,.5],null,targets[part]*3,errorLimit,['Permissive']);
    const [remap,count]=MeshoptSimplifier.compactMesh(indices),attributes={};
    for(const key of ['POSITION','NORMAL','TEXCOORD_0','COLOR_0']){
      if(p.attributes[key]===undefined)continue;
      const a=original.accessors[p.attributes[key]],data=accessor(p.attributes[key]),n=components[a.type],compact=new data.constructor(count*n);
      for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)compact.set(data.subarray(i*n,i*n+n),remap[i]*n);
      const definition={componentType:a.componentType,type:a.type,...(a.normalized?{normalized:true}:{})};
      if(key==='POSITION'){
        const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
        for(let i=0;i<compact.length;i++)min[i%3]=Math.min(min[i%3],compact[i]),max[i%3]=Math.max(max[i%3],compact[i]);
        definition.min=min;definition.max=max;
      }
      attributes[key]=append(compact,definition);
    }
    const index=append(indices,{componentType:5125,type:'SCALAR'});json.meshes[0].primitives.push({attributes,indices:index,material:p.material});
    stats.push({material:json.materials[p.material].name,sourceTriangles:input.length/3,triangles:indices.length/3,error});
    console.log(name,stats.at(-1));
  }
  json.buffers=[{uri:`tree-${name}.bin`,byteLength}];
  await writeFile(resolve(out,`tree-${name}.bin`),Buffer.concat(chunks));
  await writeFile(resolve(out,`tree-${name}.gltf`),JSON.stringify(json));
  report.lods=report.lods.filter(l=>l.name!==name);
  report.lods.push({name,parts:stats,triangles:stats.reduce((n,p)=>n+p.triangles,0),bytes:byteLength});
}
for(const image of original.images)await copyFile(resolve(source,image.uri),resolve(out,image.uri));
await copyFile(resolve(source,'textures/leaves_alpha_1k.png'),resolve(out,'textures/leaves_alpha_1k.png'));
const files=[];
for(const name of [...report.lods.flatMap(l=>[`tree-${l.name}.gltf`,`tree-${l.name}.bin`]),...original.images.map(i=>i.uri),'textures/leaves_alpha_1k.png']){
  const data=await readFile(resolve(out,name));files.push({path:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
await writeFile(resolve(out,'manifest.json'),JSON.stringify({...report,files},null,2)+'\n');
await copyFile(resolve(source,'download-manifest.json'),resolve(out,'source-manifest.json'));
console.log('Prepared tree LODs',report.lods.map(l=>({name:l.name,triangles:l.triangles,MB:(l.bytes/1e6).toFixed(2)})));

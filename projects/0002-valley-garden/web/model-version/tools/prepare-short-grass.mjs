// Offline low-cost grass variants derived from the retained CC0 scan model.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { MeshoptSimplifier } from '../.local/tools/meshoptimizer/meshopt_simplifier.js';
const meadow=process.argv.includes('--meadow'),stem=meadow?'grass-meadow':'grass-short';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),source=resolve(root,'assets/models/plants/grass_medium_02'),out=resolve(root,`assets/models/plants/${meadow?'grass_meadow':'grass_short'}`);
await mkdir(out,{recursive:true});await MeshoptSimplifier.ready;
const original=JSON.parse(await readFile(resolve(source,'model.gltf'),'utf8')),raw=await readFile(resolve(source,original.buffers[0].uri));
const json=structuredClone(original),chunks=[],sizes={SCALAR:1,VEC2:2,VEC3:3},types={5126:Float32Array,5125:Uint32Array,5123:Uint16Array};
json.accessors=[];json.bufferViews=[];let length=0;const stats=[];
function sourceArray(id){const a=original.accessors[id],v=original.bufferViews[a.bufferView];if(v.byteStride)throw new Error('Unexpected stride');return new types[a.componentType](raw.buffer,raw.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*sizes[a.type]);}
function append(array,definition){const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}const b=Buffer.from(array.buffer,array.byteOffset,array.byteLength),view=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:length,byteLength:b.length});chunks.push(b);length+=b.length;const id=json.accessors.length;json.accessors.push({...definition,bufferView:view,count:array.length/sizes[definition.type]});return id;}
for(let m=0;m<original.meshes.length;m++){
  const p=original.meshes[m].primitives[0],pos=sourceArray(p.attributes.POSITION),normal=sourceArray(p.attributes.NORMAL),uv=sourceArray(p.attributes.TEXCOORD_0),input=new Uint32Array(sourceArray(p.indices)),attrs=new Float32Array(pos.length/3*5);
  for(let i=0;i<pos.length/3;i++){attrs.set(normal.subarray(i*3,i*3+3),i*5);attrs.set(uv.subarray(i*2,i*2+2),i*5+3);}
  const [indices,error]=MeshoptSimplifier.simplifyWithAttributes(input,pos,3,attrs,5,[.1,.1,.1,meadow?1.2:.5,meadow?1.2:.5],null,(meadow?420:180)*3,meadow?.012:.025,['Permissive']);
  const [remap,count]=MeshoptSimplifier.compactMesh(indices),attributes={};
  for(const key of ['POSITION','NORMAL','TEXCOORD_0']){
    const a=original.accessors[p.attributes[key]],data=sourceArray(p.attributes[key]),n=sizes[a.type],compact=new data.constructor(count*n);
    for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)compact.set(data.subarray(i*n,i*n+n),remap[i]*n);
    attributes[key]=append(compact,{componentType:a.componentType,type:a.type,...(a.min?{min:a.min,max:a.max}:{})});
  }
  json.meshes[m].primitives=[{attributes,indices:append(indices,{componentType:5125,type:'SCALAR'}),material:p.material}];
  stats.push({mesh:original.meshes[m].name,sourceTriangles:input.length/3,triangles:indices.length/3,error});
}
json.buffers=[{uri:`${stem}.bin`,byteLength:length}];
for(const image of json.images)image.uri='../grass_medium_02/'+image.uri;
await writeFile(resolve(out,`${stem}.bin`),Buffer.concat(chunks));await writeFile(resolve(out,'model.gltf'),JSON.stringify(json));
const files=[];for(const path of ['model.gltf',`${stem}.bin`]){const b=await readFile(resolve(out,path));files.push({path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
await writeFile(resolve(out,'manifest.json'),JSON.stringify({source:'https://polyhaven.com/a/grass_medium_02',license:'CC0-1.0',tool:'meshoptimizer 1.3.0',variants:stats,files},null,2)+'\n');
console.log(`Prepared ${stem}`,stats.map(s=>s.triangles));

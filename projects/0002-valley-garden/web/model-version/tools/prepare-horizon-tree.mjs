// Small, leaf-area-preserving horizon derivative. All existing LODs stay intact.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {MeshoptSimplifier} from '../.local/tools/meshoptimizer/meshopt_simplifier.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../assets/models/trees/jacaranda');
const source=JSON.parse(await readFile(resolve(root,'tree-distant.gltf'),'utf8')),raw=await readFile(resolve(root,source.buffers[0].uri));
const types={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array},sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
const array=id=>{const a=source.accessors[id],v=source.bufferViews[a.bufferView];return new types[a.componentType](raw.buffer,raw.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*sizes[a.type]);};
const doc=structuredClone(source);doc.accessors=[];doc.bufferViews=[];doc.meshes[0].primitives=[];
const chunks=[],parts=[];let length=0;
function append(data,definition){
  const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}
  const bytes=Buffer.from(data.buffer,data.byteOffset,data.byteLength),view=doc.bufferViews.length;
  doc.bufferViews.push({buffer:0,byteOffset:length,byteLength:bytes.length});chunks.push(bytes);length+=bytes.length;
  const id=doc.accessors.length;doc.accessors.push({...definition,bufferView:view,byteOffset:0,count:data.length/sizes[definition.type]});return id;
}
await MeshoptSimplifier.ready;
for(const [part,p] of source.meshes[0].primitives.entries()){
  const pos=array(p.attributes.POSITION),normal=array(p.attributes.NORMAL),uv=array(p.attributes.TEXCOORD_0),attrs=new Float32Array(pos.length/3*5);
  for(let i=0;i<pos.length/3;i++){attrs.set(normal.subarray(i*3,i*3+3),i*5);attrs.set(uv.subarray(i*2,i*2+2),i*5+3);}
  const [indices,error]=MeshoptSimplifier.simplifyWithAttributes(array(p.indices),pos,3,attrs,5,[.1,.1,.1,.8,.8],null,[140,160,1200][part]*3,.08,['Permissive']);
  const [remap,count]=MeshoptSimplifier.compactMesh(indices),compacted={};
  for(const [name,id] of Object.entries(p.attributes)){
    const a=source.accessors[id],data=array(id),n=sizes[a.type],out=new data.constructor(count*n);
    for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)out.set(data.subarray(i*n,i*n+n),remap[i]*n);
    compacted[name]=out;
  }
  let leafArea=0,leafScale=1;
  if(/leaves/.test(source.materials[p.material].name)){
    const vertices=compacted.POSITION,parents=new Uint32Array(count).map((_,i)=>i);
    const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
    for(let i=0;i<indices.length;i+=3){const r=find(indices[i]);parents[find(indices[i+1])]=r;parents[find(indices[i+2])]=r;}
    for(let i=0;i<indices.length;i+=3){
      const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3,ab=[0,1,2].map(k=>vertices[b+k]-vertices[a+k]),ac=[0,1,2].map(k=>vertices[c+k]-vertices[a+k]);
      leafArea+=Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])*.5;
    }
    leafScale=Math.sqrt(1900/leafArea);const centres=new Map();
    for(let i=0;i<count;i++){const r=find(i);if(!centres.has(r))centres.set(r,[0,0,0,0]);const c=centres.get(r);for(let k=0;k<3;k++)c[k]+=vertices[i*3+k];c[3]++;}
    for(let i=0;i<count;i++){const c=centres.get(find(i));for(let k=0;k<3;k++){const centre=c[k]/c[3];vertices[i*3+k]=centre+(vertices[i*3+k]-centre)*leafScale;}}
  }
  const attributes={};
  for(const [name,data] of Object.entries(compacted)){
    const a=source.accessors[p.attributes[name]],def={componentType:a.componentType,type:a.type,...(a.normalized?{normalized:true}:{})};
    if(name==='POSITION'){def.min=[Infinity,Infinity,Infinity];def.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i++){def.min[i%3]=Math.min(def.min[i%3],data[i]);def.max[i%3]=Math.max(def.max[i%3],data[i]);}}
    attributes[name]=append(data,def);
  }
  doc.meshes[0].primitives.push({attributes,indices:append(indices,{componentType:5125,type:'SCALAR'}),material:p.material});
  parts.push({material:source.materials[p.material].name,triangles:indices.length/3,error,...(leafArea?{leafAreaBefore:leafArea,leafAreaAfter:1900,leafScale}:{})});
}
doc.buffers=[{uri:'horizon-tree.bin',byteLength:length}];
await writeFile(resolve(root,'horizon-tree.bin'),Buffer.concat(chunks));await writeFile(resolve(root,'horizon-tree.gltf'),JSON.stringify(doc));
const files=[];for(const path of ['horizon-tree.bin','horizon-tree.gltf']){const bytes=await readFile(resolve(root,path));files.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(resolve(root,'horizon-manifest.json'),JSON.stringify({source:'https://polyhaven.com/a/jacaranda_tree',license:'CC0-1.0',tool:'meshoptimizer 1.3.0 (MIT)',parts,triangles:parts.reduce((sum,p)=>sum+p.triangles,0),files},null,2)+'\n');
console.log('Prepared horizon tree',parts);

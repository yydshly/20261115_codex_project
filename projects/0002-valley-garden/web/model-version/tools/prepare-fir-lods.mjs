// Browser derivatives of three CC0 firs; original files remain in .local/research.
import { readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { MeshoptSimplifier } from '../.local/tools/meshoptimizer/meshopt_simplifier.js';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..'),input=resolve(base,'.local/research/fir-sapling'),output=resolve(base,'assets/models/trees/fir');
await mkdir(resolve(output,'textures'),{recursive:true});
const source=JSON.parse(await readFile(resolve(input,'source.gltf'),'utf8')),raw=await readFile(resolve(input,source.buffers[0].uri));
const sourceManifest=JSON.parse(await readFile(resolve(input,'source-manifest.json'),'utf8'));
const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
const array=id=>{const a=source.accessors[id],v=source.bufferViews[a.bufferView];if(v.byteStride)throw new Error('Interleaved source');return new types[a.componentType](raw.buffer,raw.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*sizes[a.type]);};
function area(positions,indices){let sum=0;for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3,ab=[0,1,2].map(k=>positions[b+k]-positions[a+k]),ac=[0,1,2].map(k=>positions[c+k]-positions[a+k]);sum+=Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])*.5;}return sum;}
function expandCards(pos,indices,factor){
  const n=pos.length/3,parent=Uint32Array.from({length:n},(_,i)=>i);
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(let i=0;i<indices.length;i+=3){const root=find(indices[i]);parent[find(indices[i+1])]=root;parent[find(indices[i+2])]=root;}
  const sums=new Map();for(let i=0;i<n;i++){const id=find(i);if(!sums.has(id))sums.set(id,[0,0,0,0]);const p=sums.get(id);for(let k=0;k<3;k++)p[k]+=pos[i*3+k];p[3]++;}
  for(let i=0;i<n;i++){const p=sums.get(find(i));for(let k=0;k<3;k++)pos[i*3+k]=p[k]/p[3]+(pos[i*3+k]-p[k]/p[3])*factor;}
}
const origins=source.meshes.map(m=>{
  const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  for(const p of m.primitives){const a=source.accessors[p.attributes.POSITION];for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],a.min[k]);bounds.max[k]=Math.max(bounds.max[k],a.max[k]);}}
  const pos=array(m.primitives[0].attributes.POSITION),sum=[0,0,0];let count=0;
  for(let i=0;i<pos.length;i+=3)if(pos[i+1]<.12){sum[0]+=pos[i];sum[2]+=pos[i+2];count++;}
  return {...bounds,origin:[sum[0]/count,0,sum[2]/count]};
});
const report={source:sourceManifest.source,authors:sourceManifest.authors,license:sourceManifest.license,sourceBytes:sourceManifest.files.reduce((a,f)=>a+f.bytes,0),tool:'meshoptimizer 1.3.0 (MIT)',variants:origins,lods:[],files:[]};
async function record(path,upstream){const data=await readFile(resolve(output,path));report.files.push({path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),...(upstream?{url:upstream.url,md5:upstream.md5}:{})});}
for(const entry of sourceManifest.files.filter(f=>f.path.startsWith('textures/'))){await copyFile(resolve(input,entry.path),resolve(output,entry.path));await record(entry.path,entry);}
await MeshoptSimplifier.ready;
for(const [name,targets,errorLimit] of [['near',[17000,100000,600],.008],['far',[2400,45000,180],.025],['distant',[300,10000,60],.07],['horizon',[60,4500,20],.16]]){
  const doc=structuredClone(source);doc.bufferViews=[];doc.accessors=[];doc.meshes=source.meshes.map(m=>({name:m.name,primitives:[]}));
  doc.nodes=source.nodes.map((n,i)=>({...n,translation:[0,0,0],extras:{...n.extras,forestBounds:origins[n.mesh]}}));
  const chunks=[],parts=[];let bytes=0;
  function append(data,def){const pad=(4-bytes%4)%4;if(pad){chunks.push(Buffer.alloc(pad));bytes+=pad;}const body=Buffer.from(data.buffer,data.byteOffset,data.byteLength),view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:bytes,byteLength:body.length});chunks.push(body);bytes+=body.length;const id=doc.accessors.length;doc.accessors.push({...def,bufferView:view,byteOffset:0,count:data.length/sizes[def.type]});return id;}
  for(const [mi,m] of source.meshes.entries())for(const [pi,p] of m.primitives.entries()){
    const positions=array(p.attributes.POSITION),normal=array(p.attributes.NORMAL),uv=array(p.attributes.TEXCOORD_0),attributes=new Float32Array(positions.length/3*5),originalIndices=array(p.indices);
    for(let i=0;i<positions.length/3;i++){attributes.set(normal.subarray(i*3,i*3+3),i*5);attributes.set(uv.subarray(i*2,i*2+2),i*5+3);}
    const [indices,error]=MeshoptSimplifier.simplifyWithAttributes(originalIndices,positions,3,attributes,5,[.1,.1,.1,.75,.75],null,Math.min(originalIndices.length,targets[pi]*3),errorLimit,['Permissive']);
    const [remap,count]=MeshoptSimplifier.compactMesh(indices),compacted={};
    for(const [key,id] of Object.entries(p.attributes)){const data=array(id),n=sizes[source.accessors[id].type],out=new data.constructor(count*n);for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)out.set(data.subarray(i*n,i*n+n),remap[i]*n);compacted[key]=out;}
    const leaf=/twigs/.test(source.materials[p.material].name),sourceArea=leaf?area(positions,originalIndices):0,beforeArea=leaf?area(compacted.POSITION,indices):0;
    const leafScale=leaf?Math.min(name==='horizon'?7:name==='distant'?5:3.5,Math.sqrt(sourceArea*.95/Math.max(beforeArea,.001))):1;
    if(leaf)expandCards(compacted.POSITION,indices,leafScale);
    const attrs={};for(const [key,data] of Object.entries(compacted)){
      const a=source.accessors[p.attributes[key]],def={componentType:a.componentType,type:a.type,...(a.normalized?{normalized:true}:{})};
      if(key==='POSITION'){def.min=[Infinity,Infinity,Infinity];def.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i++){def.min[i%3]=Math.min(def.min[i%3],data[i]);def.max[i%3]=Math.max(def.max[i%3],data[i]);}}
      attrs[key]=append(data,def);
    }
    doc.meshes[mi].primitives.push({attributes:attrs,indices:append(Uint32Array.from(indices),{componentType:5125,type:'SCALAR'}),material:p.material});
    parts.push({variant:mi,material:source.materials[p.material].name,triangles:indices.length/3,error,...(leaf?{sourceArea,retainedArea:beforeArea*leafScale**2,leafScale}:{})});
  }
  const bin=`fir-${name}.bin`,gltf=`fir-${name}.gltf`;doc.buffers=[{uri:bin,byteLength:bytes}];await writeFile(resolve(output,bin),Buffer.concat(chunks));await writeFile(resolve(output,gltf),JSON.stringify(doc));await record(bin);await record(gltf);
  report.lods.push({name,triangles:parts.reduce((n,p)=>n+p.triangles,0),parts});console.log(name,parts.map(p=>p.triangles).join(','),'bytes',bytes);
}
await writeFile(resolve(output,'manifest.json'),JSON.stringify(report,null,2));

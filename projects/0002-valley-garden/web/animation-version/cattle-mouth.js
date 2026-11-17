import * as THREE from 'three';

// Source inspection places the lip below the nasal pad; the old 1.025 m plane crossed a nostril.
export const lipHeightAt=z=>.966+(z-1.04)*.012;

/** Split only the muzzle lip seam, retaining source UVs and the original indexed body. */
export function separateCowLips(geometry,{enabled=true}={}){
  if(!enabled){geometry.setAttribute('mouthSide',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count),1));return {geometry,edges:[],pairs:[]};}
  const attributes=Object.fromEntries(Object.entries(geometry.attributes).map(([name,a])=>[name,{attribute:a,values:Array.from(a.array)}]));
  const positions=attributes.position.values,sourceCount=positions.length/3,tags=Array.from({length:sourceCount},(_,i)=>positions[i*3+2]>1.04?(positions[i*3+1]>=lipHeightAt(positions[i*3+2])?1:-1):0);
  const index=geometry.index,triangles=[],cache=new Map(),edges=[],pairs=new Map();
  const component=(i,d)=>positions[i*3+d],distance=i=>component(i,1)-lipHeightAt(component(i,2));
  function intersect(a,b,da,db,plane,tag){
    const key=`${Math.min(a,b)}:${Math.max(a,b)}:${plane}:${tag}`;if(cache.has(key))return cache.get(key);
    const t=da/(da-db),id=tags.length;
    for(const {attribute,values}of Object.values(attributes))for(let c=0;c<attribute.itemSize;c++)values.push(THREE.MathUtils.lerp(values[a*attribute.itemSize+c],values[b*attribute.itemSize+c],t));
    tags.push(tag);cache.set(key,id);return id;
  }
  function clip(poly,field,plane,tag){
    const result=[];for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],da=field(a),db=field(b);if(da>=0)result.push(a);
      if((da>=0)!==(db>=0))result.push(intersect(a,b,da,db,plane,tag));
    }return result;
  }
  function fan(poly){for(let i=1;i+1<poly.length;i++)triangles.push(poly[0],poly[i],poly[i+1]);}
  for(let i=0;i<index.count;i+=3){
    const face=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    if(face.every(v=>component(v,2)<=1.04)){triangles.push(...face);continue;}
    const front=clip(face,v=>component(v,2)-1.04,'z',0);fan(clip(face,v=>1.04-component(v,2),'z',0));
    if(front.length<3)continue;
    fan(clip(front,distance,'lip',1));fan(clip(front,v=>-distance(v),'lip',-1));
    const seam=[];
    for(let j=0;j<front.length;j++){
      const a=front[j],b=front[(j+1)%front.length],da=distance(a),db=distance(b);
      if(da*db<0){const upper=intersect(a,b,da,db,'lip',1),lower=intersect(a,b,da,db,'lip',-1);seam.push({upper,lower});pairs.set(upper,{upper,lower});}
    }
    if(seam.length===2)edges.push(seam);
  }
  for(const [name,{attribute,values}]of Object.entries(attributes))geometry.setAttribute(name,new THREE.BufferAttribute(new attribute.array.constructor(values),attribute.itemSize,attribute.normalized));
  geometry.setAttribute('mouthSide',new THREE.Float32BufferAttribute(tags,1));geometry.setIndex(triangles);geometry.computeBoundingBox();
  return {geometry,edges,pairs:[...pairs.values()]};
}

/** Dark lining between upper/lower copies of each lip edge; follows the same skeleton. */
export function createCowMouthLining(geometry,edges){
  const position=geometry.attributes.position,skin=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight,p=[],s=[],w=[],indices=[];
  for(const edge of edges){
    const start=p.length/3;
    for(const i of [edge[0].upper,edge[1].upper,edge[0].lower,edge[1].lower]){
      p.push(position.getX(i),position.getY(i),position.getZ(i));for(let j=0;j<4;j++){s.push(skin.getComponent(i,j));w.push(weights.getComponent(i,j));}
    }
    indices.push(start,start+1,start+2,start+1,start+3,start+2);
  }
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(p,3));result.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(s,4));result.setAttribute('skinWeight',new THREE.Float32BufferAttribute(w,4));result.setIndex(indices);return result;
}

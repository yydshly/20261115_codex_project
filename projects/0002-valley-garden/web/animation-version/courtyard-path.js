import * as THREE from 'three';
import { courtyardPathLength,pathFrameAt } from './path-layout.js';

// Clip true adjoining cells, rather than scattering copies of a regular prism.
function clip(polygon,nx,ny,limit){
  const result=[];
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    const da=a[0]*nx+a[1]*ny-limit,db=b[0]*nx+b[1]*ny-limit;
    if(da<=1e-9)result.push(a);
    if((da<0)!==(db<0)){const t=da/(da-db);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  }
  return result;
}
function inset(polygon,amount){
  let result=polygon;
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    result=clip(result,dy,-dx,dy*a[0]-dx*a[1]-amount*length);
  }
  return result;
}
export function createCourtyardPath(scene,{heightAt,random,stone}){
  const sites=[];
  for(let s=.2;s<courtyardPathLength;s+=.62+random()*.22){
    for(const side of [-1,1]){
      if(random()<.12&&s>1&&s<courtyardPathLength-1)continue;
      sites.push([side*(.15+random()*.33),s+(random()-.5)*.56]);
    }
  }
  const positions=[],uvs=[],colours=[],surfaces=[],colour=new THREE.Color();
  function triangle(a,b,c,tint){
    for(const p of [a,b,c]){positions.push(...p.xyz);uvs.push(...p.uv);colours.push(tint.r,tint.g,tint.b);}
  }
  for(let id=0;id<sites.length;id++){
    const site=sites[id];let polygon=[[-.65,0],[.65,0],[.65,courtyardPathLength],[-.65,courtyardPathLength]];
    for(let j=0;j<sites.length&&polygon.length;j++)if(j!==id){
      const other=sites[j];polygon=clip(polygon,2*(other[0]-site[0]),2*(other[1]-site[1]),other[0]**2+other[1]**2-site[0]**2-site[1]**2);
    }
    if(polygon.length<3)continue;
    polygon=inset(polygon,.007+random()*.005);if(polygon.length<3)continue;
    const top=inset(polygon,.0035);if(top.length!==polygon.length)continue;
    const centre=top.reduce((p,q)=>[p[0]+q[0]/top.length,p[1]+q[1]/top.length],[0,0]);
    const h=.006+random()*.004;
    const angle=random()*Math.PI*2,offset=[random()*8,random()*8],c=Math.cos(angle),s=Math.sin(angle);
    const world=([d,along],y)=>{const f=pathFrameAt(along),x=f.x+f.nx*d*f.halfWidth/.65,z=f.z+f.nz*d*f.halfWidth/.65;
      return {xyz:[x,heightAt(x,z)+y,z],uv:[(x*c-z*s)/1.5+offset[0],(x*s+z*c)/1.5+offset[1]]};};
    const cap=top.map(p=>world(p,h)),shoulder=polygon.map(p=>world(p,h-.004)),bottom=polygon.map(p=>world(p,-.038));
    const middle=world(centre,h+.0015);
    colour.setHSL(.075+random()*.045,.08+random()*.16,.67+random()*.18);
    const faceTint=colour.clone(),edgeTint=colour.clone().multiplyScalar(.87),sideTint=colour.clone().multiplyScalar(.72);
    for(let i=0;i<polygon.length;i++){
      const n=(i+1)%polygon.length;
      // XZ polygons are counterclockwise: reverse the winding for upward caps.
      triangle(middle,cap[n],cap[i],faceTint);
      triangle(cap[i],cap[n],shoulder[i],edgeTint);triangle(cap[n],shoulder[n],shoulder[i],edgeTint);
      triangle(shoulder[i],shoulder[n],bottom[i],sideTint);triangle(shoulder[n],bottom[n],bottom[i],sideTint);
    }
    surfaces.push({id,outline:cap.map(p=>p.xyz),centre:middle.xyz,exposure:h});
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const material=new THREE.MeshStandardMaterial({map:stone.color,normalMap:stone.normal,roughnessMap:stone.roughness,
    color:'#f0eee9',vertexColors:true,roughness:1,normalScale:new THREE.Vector2(.23,.23),envMapIntensity:.45});
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(.84,roughnessFactor);');};
  material.customProgramCacheKey=()=> 'seated-natural-flagstones-1';
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Jointed weathered courtyard flagstones';mesh.receiveShadow=true;scene.add(mesh);
  // Low creeping growth occupies selected corners/joints, away from the worn centre.
  const leaves=[],leafColours=[],leafUvs=[];
  const green=new THREE.Color('#536c32'),pale=new THREE.Color('#7b8b46');
  for(const surface of surfaces){
    if(random()>.42)continue;
    const corner=surface.outline[Math.floor(random()*surface.outline.length)];
    const radius=.018+random()*.04;
    for(let i=0;i<14+random()*16;i++){
      const a=random()*Math.PI*2,r=Math.sqrt(random())*radius,x=corner[0]+Math.cos(a)*r,z=corner[2]+Math.sin(a)*r;
      const y=heightAt(x,z)+.006+random()*.006,size=.004+random()*.008;
      colour.copy(green).lerp(pale,random());
      for(let p=0;p<6;p++){
        for(const [xx,yy,zz,u,v] of [[x,y+.002,z,.5,.5],
          [x+Math.cos(a+p*Math.PI/3)*size,y,z+Math.sin(a+p*Math.PI/3)*size* .65,0,0],
          [x+Math.cos(a+(p+1)*Math.PI/3)*size,y,z+Math.sin(a+(p+1)*Math.PI/3)*size*.65,1,1]]){
          leaves.push(xx,yy,zz);leafColours.push(colour.r,colour.g,colour.b);leafUvs.push(u,v);
        }
      }
    }
  }
  const leafGeometry=new THREE.BufferGeometry();leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute(leaves,3));leafGeometry.setAttribute('color',new THREE.Float32BufferAttribute(leafColours,3));leafGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(leafUvs,2));leafGeometry.computeVertexNormals();
  const jointPlants=new THREE.Mesh(leafGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));
  jointPlants.name='Sparse creeping leaves in flagstone joints';jointPlants.receiveShadow=true;jointPlants.userData.omitFromReflection=true;scene.add(jointPlants);
  return {mesh,surfaces,jointPlants,surfaceHeightAt:createPathSurfaceSampler(surfaces)};
}

/** Exact upward cap triangles, indexed into metre-sized cells for sole-height queries. */
export function createPathSurfaceSampler(surfaces){
  const cells=new Map();
  for(const surface of surfaces)for(let i=0;i<surface.outline.length;i++){
    const triangle=[surface.centre,surface.outline[i],surface.outline[(i+1)%surface.outline.length]];
    const xs=triangle.map(p=>p[0]),zs=triangle.map(p=>p[2]);
    for(let x=Math.floor(Math.min(...xs));x<=Math.floor(Math.max(...xs));x++)for(let z=Math.floor(Math.min(...zs));z<=Math.floor(Math.max(...zs));z++){
      const key=x+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(triangle);
    }
  }
  return (x,z)=>{
    let height=null;
    for(const [a,b,c]of cells.get(Math.floor(x)+':'+Math.floor(z))||[]){
      const denominator=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
      if(Math.abs(denominator)<1e-12)continue;
      const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/denominator;
      const v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/denominator,w=1-u-v;
      if(Math.min(u,v,w)<-1e-7)continue;
      const y=u*a[1]+v*b[1]+w*c[1];height=height===null?y:Math.max(height,y);
    }
    return height;
  };
}

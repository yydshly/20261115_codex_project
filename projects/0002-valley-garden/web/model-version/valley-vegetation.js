import * as THREE from 'three';
import { valleyHabitatAt,slopeAt } from './terrain.js';
import { pathSampleAt } from './path-layout.js';
import { surfaceFieldAt } from './surface-field.js';

/** Real scrub, young firs and rough-grass clumps feather the wooded margins. */
export function createValleyVegetation(scene,library,{heightAt,riverX,riverWidth,random}){
  const group=new THREE.Group();group.name='Valley scrub, regeneration and rough meadow';group.userData.omitFromReflection=true;scene.add(group);
  const cells=new Map(),contacts=[],items=[],counts={scrub:0,sapling:0,fern:0,herb:0,rough:0};
  const variants={scrub:library.hedge.slice(0,2),sapling:library.firDistant,fern:library.fern,herb:library.sorrel.filter(v=>v.triangles>=280),rough:library.meadow.slice(0,2)};
  function suitable(x,z){
    if(Math.abs(x)<16&&z>-29&&z<12)return false;
    if(Math.abs(x-riverX(z))<riverWidth(z)+1.5)return false;
    if(surfaceFieldAt(x,z).bare>.58)return false;
    if(x>-3&&x<15&&z>-4&&z<23){const p=pathSampleAt(x,z);if(p.distance<p.halfWidth+1.1)return false;}
    return slopeAt(x,z)<.95;
  }
  function add(kind,x,z,height){
    const variant=variants[kind][Math.floor(random()*variants[kind].length)],key=`${kind}:${variant.name}:${Math.floor(x/24)}:${Math.floor(z/24)}`;
    if(!cells.has(key))cells.set(key,{kind,variant,instances:[]});
    const item={kind,x,z,y:heightAt(x,z)-.012,height,angle:random()*Math.PI*2,width:.85+random()*.30};
    cells.get(key).instances.push(item);items.push(item);counts[kind]++;
    if(kind!=='rough'&&Math.abs(x)<78&&Math.abs(z)<78)contacts.push({x,z,radius:Math.max(.15,height*.30),occlusion:.28,soil:kind==='scrub'?.16:0,soilRadius:height*.35});
  }
  for(let attempt=0;attempt<22000&&(counts.scrub<430||counts.sapling<170||counts.fern<100||counts.herb<700);attempt++){
    const x=-170+random()*340,z=-245+random()*310;if(!suitable(x,z))continue;
    const h=valleyHabitatAt(x,z);if(h.edge<.22||random()>h.edge*.7)continue;
    if(counts.scrub<430){
      const patchHeight=.65+random()*.85+h.forest*.35,patchCount=4+Math.floor(random()*5);
      for(let i=0;i<patchCount&&counts.scrub<430;i++){
        const a=random()*Math.PI*2,r=Math.sqrt(random())*(2.2+random()*1.7),sx=x+Math.cos(a)*r,sz=z+Math.sin(a)*r;
        if(suitable(sx,sz)&&valleyHabitatAt(sx,sz).edge>.16)add('scrub',sx,sz,patchHeight*(.76+random()*.43));
      }
    }
    if(counts.sapling<170&&random()<.29){const sx=x+(random()-.5)*1.2,sz=z+(random()-.5)*1.2;if(suitable(sx,sz))add('sapling',sx,sz,1.8+random()*3.4);}
    if(counts.fern<100&&h.forest>.2&&Math.hypot(x,z)<110&&random()<.26)add('fern',x,z,.22+random()*.22);
    if(counts.herb<700&&h.forest>.1&&Math.hypot(x,z)<135){
      for(let i=0;i<5&&counts.herb<700;i++){
        const a=random()*Math.PI*2,r=random()*1.5,sx=x+Math.cos(a)*r,sz=z+Math.sin(a)*r;
        if(suitable(sx,sz))add('herb',sx,sz,.10+random()*.08);
      }
    }
  }
  for(let attempt=0;attempt<32000&&counts.rough<4800;attempt++){
    const x=-105+random()*210,z=-190+random()*260;if(!suitable(x,z))continue;
    const h=valleyHabitatAt(x,z);if(h.forest>.75||random()>.06+h.rough*.46)continue;
    add('rough',x,z,.22+h.edge*.44+random()*.21);
  }
  // Unmown foreground turf has visible volume around the erosion scars.
  for(let attempt=0;attempt<30000&&counts.rough<8500;attempt++){
    const x=-65+random()*130,z=-55+random()*125;if(!suitable(x,z))continue;
    const patch=surfaceFieldAt(x,z),clump=.5+.5*Math.sin(x*.31+Math.sin(z*.22)*2);
    if(random()>.16+clump*.42||valleyHabitatAt(x,z).forest>.8)continue;
    add('rough',x,z,.16+clump*.24+patch.bare*.22+random()*.12);
  }
  const dummy=new THREE.Object3D(),roughMaterials=new Map();let high=true;
  for(const {kind,variant,instances} of cells.values())for(const part of variant.parts){
    let material=part.material;
    if(kind==='rough'){
      if(!roughMaterials.has(material)){const copy=material.clone();copy.color.set('#9dad75');copy.onBeforeCompile=material.onBeforeCompile;copy.customProgramCacheKey=material.customProgramCacheKey;roughMaterials.set(material,copy);}
      material=roughMaterials.get(material);
    }
    const mesh=new THREE.InstancedMesh(part.geometry,material,instances.length);mesh.name=`Valley ${kind} · ${variant.name}`;
    instances.forEach((p,i)=>{const scale=p.height/variant.size.y;dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(scale*p.width,scale,scale*p.width);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.receiveShadow=true;mesh.castShadow=false;mesh.computeBoundingSphere();mesh.userData.kind=kind;mesh.userData.fullCount=mesh.count;group.add(mesh);
  }
  return {group,contacts,counts,items,update(camera){
    for(const mesh of group.children){
      const distance=Math.max(0,mesh.boundingSphere.center.distanceTo(camera.position)-mesh.boundingSphere.radius);
      const end=mesh.userData.kind==='rough'?155:['fern','herb'].includes(mesh.userData.kind)?110:280;
      const fade=1-THREE.MathUtils.smoothstep(distance,high?65:40,end);
      mesh.count=Math.floor(mesh.userData.fullCount*(high?1:.55)*fade);mesh.visible=mesh.count>0;
    }
  },setQuality(value){high=value;}};
}

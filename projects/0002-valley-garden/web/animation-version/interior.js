import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Use the existing finite panes with a consistent dielectric glass material. */
export function configureWindowGlass(input){
  const material=input.isMeshPhysicalMaterial?input:new THREE.MeshPhysicalMaterial({name:input.name,vertexColors:input.vertexColors});
  if(material!==input)input.dispose();
  // The source colour texture contains painted-in pale highlights; reflections
  // should come from the shared HDR environment and the actual view angle.
  material.map=null;material.normalMap=null;material.roughnessMap=null;
  material.color.set('#edf5f1');material.metalness=0;material.roughness=.09;
  material.transmission=.90;material.thickness=.008;material.ior=1.52;
  material.attenuationColor.set('#eef4ed');material.attenuationDistance=4;
  material.specularIntensity=1;material.envMapIntensity=1.35;
  material.opacity=1;material.transparent=false;material.depthWrite=true;
  material.side=THREE.FrontSide;material.needsUpdate=true;
  return material;
}

/** Exterior-visible rooms, in the original cottage's local metre coordinates. */
export function createCottageInterior(parent,library,model){
  const group=new THREE.Group();group.name='Cottage furnished rooms and dressed windows';parent.add(group);
  group.userData.omitFromReflection=true;
  const furniture=[],windowDressings=[],lightSources=[],lampMaterials=[];
  const paint=new THREE.MeshStandardMaterial({color:'#bdb5a2',roughness:.96,envMapIntensity:.14});
  const ceilingPaint=new THREE.MeshStandardMaterial({color:'#d2caba',roughness:1,envMapIntensity:.1});
  const frame=new THREE.MeshStandardMaterial({color:'#dddcc9',roughness:.66,envMapIntensity:.38});
  const timberSource=model.parts.find(p=>/finished oak/i.test(p.material.name))?.material;
  const wood=new THREE.MeshStandardMaterial({color:'#86705a',roughness:.8,envMapIntensity:.18});
  if(timberSource?.map){wood.map=timberSource.map.clone();wood.map.wrapS=wood.map.wrapT=THREE.RepeatWrapping;wood.map.repeat.set(4,7);wood.map.needsUpdate=true;}
  const bronze=new THREE.MeshStandardMaterial({color:'#796249',metalness:.65,roughness:.48,envMapIntensity:.35});
  const fabric=new THREE.MeshStandardMaterial({color:'#d8ccb5',roughness:.98,side:THREE.DoubleSide,envMapIntensity:.18,bumpMap:weaveTexture(),bumpScale:.00045});
  const rugMaterial=new THREE.MeshStandardMaterial({color:'#77735d',roughness:1,envMapIntensity:.12,bumpMap:fabric.bumpMap,bumpScale:.001});
  function box(name,w,h,d,x,y,z,material=paint){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.name=name;mesh.position.set(x,y,z);
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  // Floor and ceiling stop the empty shell reading as a roof-sized hall.
  box('Oak interior floor',7.48,.035,9.44,0,.343,-.56,wood);
  box('Plaster ceiling',7.48,.12,9.44,0,3.13,-.56,ceilingPaint);
  box('Living room partition left',3.14,2.72,.12,-2.17,1.72,-.65);
  box('Living room partition right',3.14,2.72,.12,2.17,1.72,-.65);
  box('Partition doorway lintel',1.2,.55,.12,0,2.805,-.65);
  for(const x of [-.6,.6]){
    box('Hallway front return',.12,2.72,2.31,x,1.72,3.005);
    box('Hallway rear return',.12,2.72,1.24,x,1.72,.03);
    box('Living doorway header',.12,.55,1.2,x,2.805,1.25);
  }
  box('Kitchen and study divider',.12,2.72,3.63,.3,1.72,-3.465);
  // Low cabinetry and the rear work area give side/rear windows real depth.
  box('Rear kitchen base cabinets',2.95,.82,.59,1.885,.77,-4.84,wood);
  box('Kitchen stone counter',3.02,.055,.65,1.885,1.207,-4.84,frame);
  box('Study writing desk',1.6,.065,.68,-2.35,1.11,-3.94,wood);
  for(const x of [-3.03,-1.67])for(const z of [-4.18,-3.70])box('Study desk leg',.06,.72,.06,x,.72,z,wood);
  const shelf=new THREE.Group();shelf.name='Oak bookcase with books';shelf.position.set(2.92,.36,-.15);group.add(shelf);
  const bookCovers=['#67745e','#775949','#c2ae80','#666a77','#967a58'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.95,envMapIntensity:.12}));
  function shelfBox(w,h,d,x,y,z,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;shelf.add(mesh);}
  for(const x of [-.58,.58])shelfBox(.055,2,.32,x,1,0,wood);
  shelfBox(1.16,2,.04,0,1,-.14,wood);
  for(let i=0;i<5;i++){
    shelfBox(1.16,.045,.32,0,.06+i*.46,0,wood);
    for(let j=0;j<8;j++){
      const height=.24+((j*7+i*3)%9)*.013;
      shelfBox(.075+((j+i)%3)*.012,height,.19,-.46+j*.12,.085+i*.46+height/2,.025,bookCovers[(i+j)%bookCovers.length]);
    }
  }
  // Import complete furniture assets, preserving all pieces and their materials.
  function place(id,name,x,z,angle=0,height){
    const variant=library[id][0],item=new THREE.Group();item.name=name;
    item.position.set(x,.363,z);item.rotation.y=angle;
    if(height)item.scale.setScalar(height/variant.size.y);
    for(const part of variant.parts){
      const material=part.material.clone();material.envMapIntensity=.22;
      const mesh=new THREE.Mesh(part.geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;item.add(mesh);
      if(id==='readingLamp'&&(/bulb|glass|emiss/i.test(material.name)||material.emissive?.getHex()>0)){
        material.emissive.set('#ffd4a1');material.emissiveIntensity=.18;lampMaterials.push(material);
      }
    }
    item.userData.importedAsset=id;group.add(item);furniture.push(item);return item;
  }
  place('sofa','Imported upholstered living sofa',-2.22,1.08,0,1.0);
  place('coffeeTable','Imported stone-top coffee table',-2.16,2.62,0,.46);
  place('armchair','Imported window-side armchair',-1.23,2.5,-Math.PI*.25,.86);
  place('armchair','Imported rear reading armchair',-2.35,-2.7,Math.PI,.86);
  place('readingLamp','Imported living room lamp',-3.31,1.3,0,1.6);
  place('readingLamp','Imported study lamp',-3.20,-3.15,0,1.6);
  box('Living woven rug',2.82,.018,2.42,-2.04,.372,2.23,rugMaterial);
  box('Reading room woven rug',2.30,.018,1.83,-2.35,.372,-2.87,rugMaterial);
  // An open table nook is visible through the front-right window.
  place('coffeeTable','Imported window table',1.96,2.6,0,.73);
  place('armchair','Imported breakfast chair',2.0,1.29,0,.86);
  place('armchair','Imported window reading chair',3.03,2.73,-Math.PI*.5,.86);
  for(const [x,z] of [[-3.31,1.3],[-3.20,-3.15]]){
    const light=new THREE.PointLight('#ffd2a0',3,4.5,2);light.position.set(x,1.74,z);light.castShadow=false;
    light.userData.baseIntensity=4;group.add(light);lightSources.push(light);
  }
  const ceilingBounce=new THREE.PointLight('#eed5b0',.6,5.1,2);ceilingBounce.position.set(1.8,2.35,1.6);
  ceilingBounce.userData.baseIntensity=.6;group.add(ceilingBounce);lightSources.push(ceilingBounce);

  for(const opening of model.windows){
    const min=new THREE.Vector3(...opening.min),max=new THREE.Vector3(...opening.max),size=max.clone().sub(min),centre=min.clone().add(max).multiplyScalar(.5);
    const width=['front','back'].includes(opening.side)?size.x:size.z,height=size.y;
    const dressed=new THREE.Group();dressed.name=`Window dressing · ${opening.name}`;dressed.position.copy(centre);
    dressed.rotation.y={front:0,back:Math.PI,left:-Math.PI/2,right:Math.PI/2}[opening.side];group.add(dressed);
    const insert=(name,geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;dressed.add(mesh);return mesh;};
    const divisions=width>1.8?[-width/6,width/6]:[0];
    for(const x of divisions)insert('Painted window mullion',new THREE.BoxGeometry(.032,height,.035),frame,x,0,.014);
    insert('Painted window crossbar',new THREE.BoxGeometry(width,.028,.035),frame,0,.025,.014);
    const railY=height/2+.17,rail=new THREE.CylinderGeometry(.013,.013,width+.38,12);rail.rotateZ(Math.PI/2);
    insert('Bronze curtain rail',rail,bronze,0,railY,-.21);
    const drop=centre.y+railY-.41,panelWidth=width*.32;
    for(const sign of [-1,1]){
      insert('Gathered linen curtain',curtainGeometry(panelWidth,drop),fabric,sign*(width/2-.10),railY-.04,-.22);
      for(let i=0;i<7;i++){
        const ring=new THREE.TorusGeometry(.022,.004,5,10);ring.rotateY(Math.PI/2);
        insert('Curtain ring',ring,bronze,sign*(width/2-.10)+(i/6-.5)*panelWidth*.68,railY-.014,-.21);
      }
    }
    windowDressings.push({group:dressed,opening,width,height});
    batchFixtures(dressed);
  }
  batchFixtures(shelf);batchFixtures(group);
  function setEvening(value){
    const t=THREE.MathUtils.clamp(value,0,1);
    for(const light of lightSources)light.intensity=light.userData.baseIntensity*(.24+t*.76);
    for(const material of lampMaterials)material.emissiveIntensity=.12+t*.75;
  }
  setEvening(0);
  return {group,furniture,windowDressings,lightSources,setEvening};
}

/** Keep small fixed window fittings and books from becoming hundreds of draws. */
function batchFixtures(parent){
  const buckets=new Map();
  for(const child of [...parent.children]){
    if(!child.isMesh||Array.isArray(child.material))continue;
    if(!buckets.has(child.material))buckets.set(child.material,[]);
    buckets.get(child.material).push(child);
  }
  for(const [material,meshes] of buckets){
    if(meshes.length<2)continue;
    const pieces=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});
    const merged=new THREE.Mesh(mergeGeometries(pieces),material);merged.name=`Interior fittings · ${meshes[0].name}`;
    merged.castShadow=true;merged.receiveShadow=true;
    for(const mesh of meshes){parent.remove(mesh);mesh.geometry.dispose();}
    pieces.forEach(geometry=>geometry.dispose());parent.add(merged);
  }
}

function curtainGeometry(width,height){
  const geometry=new THREE.PlaneGeometry(width,height,40,32),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const u=p.getX(i)/width+.5,v=p.getY(i)/height+.5;
    const pleat=(Math.sin(u*Math.PI*12)*.035+Math.sin(u*Math.PI*24)*.008)*(.7+(1-v)*.3);
    p.setXYZ(i,(u-.5)*width*(.68+.32*(1-v)),(v-1)*height,pleat+Math.sin(v*Math.PI)*.025);
  }
  geometry.computeVertexNormals();return geometry;
}

function weaveTexture(){
  const size=128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const v=128+(x%4===0?17:0)-(y%4===0?15:0)+Math.sin(x*2.3+y*3.7)*6,o=(y*size+x)*4;
    data[o]=data[o+1]=data[o+2]=v;data[o+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(8,28);texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}

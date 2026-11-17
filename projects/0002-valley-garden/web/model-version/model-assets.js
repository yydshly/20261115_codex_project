import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { foliageLighting } from './lighting.js';
import { groundNoise } from './ground.js';
import { wildnessAt } from './terrain.js';
import { createPlantingPlan } from './planting-plan.js';
import { pathSampleAt } from './path-layout.js';
import { createCottageInterior,configureWindowGlass } from './interior.js';
import { grazingInfluenceAt,meadowGrowthAt } from './meadow-field.js';
import { injectWind,windUniforms } from './wind-field.js';
export const treeWindTime=windUniforms.time;

const SOURCES={
  house:'architecture/bungalow-house.glb',
  townhouse:'architecture/two-storey-home.glb',
  cottage:'architecture/garden-cottage.glb',
  sofa:'interior/sofa_02/model.gltf',
  coffeeTable:'interior/coffee_table_round_01/model.gltf',
  armchair:'interior/modern_arm_chair_01/model.gltf',
  readingLamp:'interior/industrial_pipe_lamp/model.gltf',
  daisy:'plants/flower_gazania/model.gltf',
  hedge:'plants/shrub_02/model.gltf',
  sorrel:'plants/sorrel/model.gltf',
  matureNear:'trees/jacaranda/leafy-tree-near.gltf',
  matureFar:'trees/jacaranda/leafy-tree-far.gltf',
  matureDistant:'trees/jacaranda/leafy-tree-distant.gltf',
  matureHorizon:'trees/jacaranda/horizon-tree.gltf',
  firNear:'trees/fir/fir-near.gltf',
  firFar:'trees/fir/fir-far.gltf',
  firDistant:'trees/fir/fir-distant.gltf',
  firHorizon:'trees/fir/fir-horizon.gltf',
  flower:'plants/periwinkle_plant/model.gltf',
  fern:'plants/fern_02/model.gltf',
  grass:'plants/grass_medium_02/model.gltf',
  lawn:'plants/grass_short/model.gltf',
  meadow:'plants/grass_meadow/model.gltf',
  shrub:'nature/shrub_03/shrub_03_1k.gltf',
  tree:'nature/pine_sapling_small/pine_sapling_small_1k.gltf',
  stone:'nature/rock_07/rock_07_1k.gltf',
  moss:'nature/rock_moss_set_01/rock_moss_set_01_1k.gltf'
};
const OPACITY={
  flower:'plants/periwinkle_plant/textures/periwinkle_plant_opacity_1k.png',
  fern:'plants/fern_02/textures/fern_02_alpha_1k.png',
  grass:'plants/grass_medium_02/textures/grass_medium_02_alpha_1k.png',
  lawn:'plants/grass_medium_02/textures/grass_medium_02_alpha_1k.png',
  meadow:'plants/grass_medium_02/textures/grass_medium_02_alpha_1k.png',
  shrub:'nature/shrub_03/textures/shrub_03_alpha_1k.png',
  tree:'nature/pine_sapling_small/textures/pine_sapling_small_twig_alpha_1k.png',
  daisy:'plants/flower_gazania/textures/opacity_1k.png',
  hedge:'plants/shrub_02/textures/opacity_1k.png',
  sorrel:'plants/sorrel/textures/shrub_sorrel_01_alpha_1k.png'
};

/** Real glTF assets only: each botanical collection becomes independent variants. */
export async function loadModelLibrary(renderer,onProgress=()=>{}){
  const loader=new GLTFLoader(),library={};let loaded=0;
  const treeResponse=await fetch(new URL('./assets/models/trees/jacaranda/manifest.json',import.meta.url));
  if(!treeResponse.ok)throw new Error('成熟树模型元数据加载失败');
  const treeMetadata=await treeResponse.json();
  const coverageRoot=new URL('./assets/models/trees/jacaranda/textures/',import.meta.url);
  const [coverageMetadata,coverageBuffer,leafColourBuffer]=await Promise.all([
    fetch(new URL('leaves-coverage.json',coverageRoot)).then(r=>{if(!r.ok)throw new Error('叶冠蒙版元数据加载失败');return r.json();}),
    fetch(new URL('leaves-coverage.bin',coverageRoot)).then(r=>{if(!r.ok)throw new Error('叶冠蒙版加载失败');return r.arrayBuffer();}),
    fetch(new URL('leaves-colour-mips.bin',coverageRoot)).then(r=>{if(!r.ok)throw new Error('叶冠颜色加载失败');return r.arrayBuffer();})
  ]);
  const coverageLevels=coverageMetadata.levels.map(l=>({data:new Uint8Array(coverageBuffer,l.offset,l.bytes),width:l.width,height:l.height}));
  const canopyOpacity=new THREE.DataTexture(coverageLevels[0].data,1024,1024,THREE.RGBAFormat);
  canopyOpacity.mipmaps=coverageLevels;canopyOpacity.generateMipmaps=false;
  canopyOpacity.minFilter=THREE.LinearMipmapLinearFilter;canopyOpacity.magFilter=THREE.LinearFilter;
  canopyOpacity.wrapS=canopyOpacity.wrapT=THREE.RepeatWrapping;canopyOpacity.flipY=false;
  canopyOpacity.colorSpace=THREE.NoColorSpace;canopyOpacity.needsUpdate=true;
  canopyOpacity.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const leafColourLevels=coverageMetadata.levels.map(l=>({data:new Uint8Array(leafColourBuffer,l.offset,l.bytes),width:l.width,height:l.height}));
  const canopyColour=new THREE.DataTexture(leafColourLevels[0].data,1024,1024,THREE.RGBAFormat);
  canopyColour.mipmaps=leafColourLevels;canopyColour.generateMipmaps=false;canopyColour.flipY=false;
  canopyColour.minFilter=THREE.LinearMipmapLinearFilter;canopyColour.magFilter=THREE.LinearFilter;
  canopyColour.wrapS=canopyColour.wrapT=THREE.RepeatWrapping;canopyColour.colorSpace=THREE.SRGBColorSpace;
  canopyColour.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());canopyColour.needsUpdate=true;
  const grassRoot=new URL('./assets/models/plants/grass_mips/',import.meta.url);
  const grassResponses=await Promise.all(['levels.json','alpha.bin','colour.bin'].map(name=>fetch(new URL(name,grassRoot))));
  if(grassResponses.some(r=>!r.ok))throw new Error('草叶缩放材质加载失败');
  const [grassLevels,grassAlphaBuffer,grassColourBuffer]=await Promise.all([grassResponses[0].json(),grassResponses[1].arrayBuffer(),grassResponses[2].arrayBuffer()]);
  function grassTexture(buffer,colour){
    const levels=grassLevels.levels.map(l=>({data:new Uint8Array(buffer,l.offset,l.bytes),width:l.width,height:l.height}));
    const map=new THREE.DataTexture(levels[0].data,512,512,THREE.RGBAFormat);map.mipmaps=levels;map.generateMipmaps=false;
    map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.flipY=false;map.wrapS=map.wrapT=THREE.RepeatWrapping;
    map.colorSpace=colour?THREE.SRGBColorSpace:THREE.NoColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());map.needsUpdate=true;return map;
  }
  const grassOpacity=grassTexture(grassAlphaBuffer,false),grassColour=grassTexture(grassColourBuffer,true);
  const firRoot=new URL('./assets/models/trees/fir/textures/',import.meta.url);
  const firResponses=await Promise.all(['twigs-mips.json','twigs-alpha-mips.bin','twigs-colour-mips.bin'].map(name=>fetch(new URL(name,firRoot))));
  if(firResponses.some(r=>!r.ok))throw new Error('冷杉材质加载失败');
  const [firLevels,firAlphaBuffer,firColourBuffer]=await Promise.all([firResponses[0].json(),firResponses[1].arrayBuffer(),firResponses[2].arrayBuffer()]);
  function firTexture(buffer,colour){
    const levels=firLevels.levels.map(l=>({data:new Uint8Array(buffer,l.offset,l.bytes),width:l.width,height:l.height}));
    const map=new THREE.DataTexture(levels[0].data,1024,1024,THREE.RGBAFormat);map.mipmaps=levels;map.generateMipmaps=false;
    map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.flipY=false;map.wrapS=map.wrapT=THREE.RepeatWrapping;
    map.colorSpace=colour?THREE.SRGBColorSpace:THREE.NoColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());map.needsUpdate=true;return map;
  }
  const firOpacity=firTexture(firAlphaBuffer,false),firColour=firTexture(firColourBuffer,true);
  const surfaces={};
  await Promise.all(['roof','plaster','brick'].map(async name=>{
    const entries=await Promise.all(['color','normal','roughness'].map(async channel=>{
      const map=await new THREE.TextureLoader().loadAsync(new URL(`./assets/materials/${name}-${channel}.jpg`,import.meta.url).href);
      map.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;
      map.wrapS=map.wrapT=THREE.RepeatWrapping;map.flipY=false;
      map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return [channel,map];
    }));surfaces[name]=Object.fromEntries(entries);
  }));
  await Promise.all(Object.entries(SOURCES).map(async([id,path])=>{
    const gltf=await loader.loadAsync(new URL(`./assets/models/${path}`,import.meta.url).href);
    let opacity=null;
    const isGrass=['grass','lawn','meadow'].includes(id),opacityPath=isGrass?null:OPACITY[id];
    if(id.startsWith('mature'))opacity=canopyOpacity;
    if(id.startsWith('fir'))opacity=firOpacity;
    if(isGrass)opacity=grassOpacity;
    if(opacityPath){
      opacity=await new THREE.TextureLoader().loadAsync(new URL(`./assets/models/${opacityPath}`,import.meta.url).href);
      opacity.colorSpace=THREE.NoColorSpace;opacity.flipY=false;
      opacity.wrapS=opacity.wrapT=THREE.RepeatWrapping;
      opacity.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    }
    gltf.scene.updateMatrixWorld(true);
    const roots=['house','townhouse','cottage','sofa','coffeeTable','armchair','readingLamp'].includes(id)||id.startsWith('mature')?[gltf.scene]:gltf.scene.children;
    library[id]=roots.filter(root=>{let found=false;root.traverse(o=>found ||= !!o.isMesh);return found;})
      .map(root=>prepareVariant(root,id,renderer,opacity,surfaces,treeMetadata,canopyColour,grassColour,firColour));
    library[id].sort(id.startsWith('fir')?((a,b)=>a.name.localeCompare(b.name)):((a,b)=>a.triangles-b.triangles));
    if(!library[id].length)throw new Error(`模型 ${id} 没有可显示的网格`);
    onProgress(++loaded,Object.keys(SOURCES).length);
  }));
  // All LODs use the same UV atlases. Share one material/texture set on the GPU.
  const matureMaterials=new Map(library.matureNear[0].parts.map(p=>[p.material.name,p.material]));
  for(const id of ['matureFar','matureDistant','matureHorizon'])for(const part of library[id][0].parts){
    const shared=matureMaterials.get(part.material.name);if(!shared)throw new Error('树木 LOD 材质不匹配');
    part.material.dispose();part.material=shared;
  }
  const firMaterials=new Map(library.firNear[0].parts.map(p=>[p.material.name,p.material]));
  for(const id of ['firNear','firFar','firDistant','firHorizon'])for(const variant of library[id])for(const part of variant.parts){
    const shared=firMaterials.get(part.material.name);if(part.material!==shared){part.material.dispose();part.material=shared;}
  }
  return library;
}

function prepareVariant(root,id,renderer,opacity,surfaces,treeMetadata,canopyColour,grassColour,firColour){
  const firBounds=root.userData.forestBounds;
  const bounds=firBounds?new THREE.Box3(new THREE.Vector3(...firBounds.min),new THREE.Vector3(...firBounds.max)):id.startsWith('mature')?new THREE.Box3(new THREE.Vector3(...treeMetadata.sourceBounds.min),new THREE.Vector3(...treeMetadata.sourceBounds.max)):new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
  const center=bounds.getCenter(new THREE.Vector3());center.y=bounds.min.y;
  if(id.startsWith('mature'))center.fromArray(treeMetadata.origin);
  if(firBounds)center.fromArray(firBounds.origin);
  const buckets=new Map(),windows=[];let triangles=0;
  root.traverse(object=>{
    if(!object.isMesh)return;
    if(object.isSkinnedMesh)throw new Error('植物资产应为静态网格');
    const input=object.geometry,index=input.index;
    const opening=object.userData.building_glazing_contact;
    if(opening){
      input.computeBoundingBox();
      const box=input.boundingBox.clone().applyMatrix4(object.matrixWorld).translate(center.clone().negate());
      windows.push({name:object.name,side:opening.side,min:box.min.toArray(),max:box.max.toArray()});
    }
    const groups=input.groups.length?input.groups:[{start:0,count:index?index.count:input.attributes.position.count,materialIndex:0}];
    for(const group of groups){
      const sourceMaterial=Array.isArray(object.material)?object.material[group.materialIndex]:object.material;
      if(!buckets.has(sourceMaterial.uuid))buckets.set(sourceMaterial.uuid,{sourceMaterial,geometries:[]});
      const data={position:[],normal:[],uv:[],uv1:[]};
      // GLTFLoader enables USE_COLOR for these materials; dropping COLOR_0 renders them black.
      if(sourceMaterial.vertexColors)data.color=[];
      for(let n=group.start;n<group.start+group.count;n++){
        const v=index?index.getX(n):n;
        for(const [name,components] of [['position',3],['normal',3],['uv',2],['uv1',2]]){
          const attribute=input.getAttribute(name)|| (name==='uv1'?input.getAttribute('uv'):null);
          data[name].push(attribute?attribute.getX(v):0,attribute?attribute.getY(v):0);
          if(components===3)data[name].push(attribute?attribute.getZ(v):(name==='normal'?1:0));
        }
        if(data.color){const attribute=input.getAttribute('color');data.color.push(attribute?attribute.getX(v):1,attribute?attribute.getY(v):1,attribute?attribute.getZ(v):1,attribute?.itemSize===4?attribute.getW(v):1);}
      }
      const geometry=new THREE.BufferGeometry();
      for(const name of Object.keys(data))geometry.setAttribute(name,new THREE.Float32BufferAttribute(data[name],name.startsWith('uv')?2:name==='color'?4:3));
      geometry.applyMatrix4(object.matrixWorld);geometry.translate(-center.x,-center.y,-center.z);
      if(!input.attributes.normal)geometry.computeVertexNormals();
      buckets.get(sourceMaterial.uuid).geometries.push(geometry);triangles+=group.count/3;
    }
  });
  const parts=[];
  for(const {sourceMaterial,geometries} of buckets.values()){
    let material=sourceMaterial.clone();
    const geometry=mergeGeometries(geometries,false);
    geometries.forEach(g=>g.dispose());
    material.envMapIntensity=.8;
    if(['house','townhouse','cottage'].includes(id)){
      if(/mineral render|white outdoor paint/.test(material.name)){
        material.roughness=.91;material.metalness=0;
        material.bumpMap=material.map;material.bumpScale=/mineral/.test(material.name)?.003:.0007;
        if(material.specularIntensity!==undefined)material.specularIntensity=.25;
      }
      if(/sandstone/.test(material.name)){material.bumpMap=material.map;material.bumpScale=.025;material.roughness=.94;}
      if(/finished oak/.test(material.name)){material.bumpMap=material.map;material.bumpScale=.008;material.roughness=.64;}
      if(/glaz/i.test(material.name))material=configureWindowGlass(material);
    }
    const masked=id.startsWith('fir')?/twigs/i.test(material.name):id.startsWith('mature')?/leaves/i.test(material.name):id!=='tree'||/twig/i.test(material.name);
    if(opacity&&masked){material.alphaMap=opacity;material.transparent=false;material.depthWrite=true;material.alphaTest=id.startsWith('mature')||id.startsWith('fir')?.30:.28;material.side=THREE.DoubleSide;}
    for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(material[key])material[key].anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    if(material.alphaTest>0){material.alphaToCoverage=false;material.side=THREE.DoubleSide;}
    if(id.startsWith('mature')&&masked){material.map=canopyColour;material.normalScale.setScalar(.42);material.color.set('#a2b48b');}
    if(id.startsWith('fir')&&masked){material.map=firColour;material.normalScale.setScalar(.28);material.color.set('#b9c8b0');material.roughness=1;}
    if(['grass','lawn','meadow'].includes(id)){
      material.map=grassColour;material.roughness=1;material.normalScale?.setScalar(.28);
    }
    // New physical maps are a runtime derivative; the downloaded GLBs stay byte-identical.
    if(['house','townhouse','cottage'].includes(id)){
      const roof=/red clay roof|Clay roof tiles|dark natural slate/i.test(material.name);
      const wall=/mineral render|Render, warm beige/i.test(material.name);
      const brick=/red running-bond brick/i.test(material.name);
      if(roof||wall||brick){
        const maps=surfaces[roof?'roof':brick?'brick':'plaster'];
        material.map=maps.color;material.normalMap=maps.normal;material.roughnessMap=maps.roughness;
        material.bumpMap=null;material.roughness=roof?.88:.96;material.metalness=0;
        material.normalScale.setScalar(roof?.48:brick?.42:.24);material.color.set(roof?'#a3aeb6':brick?'#f2e7dc':'#f5f4ed');
        const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
        for(let i=0;i<p.count;i++)uv.setXY(i,roof?p.getX(i)*.4:(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))*.5,roof?-p.getZ(i)*.45:p.getY(i)*.5);
        uv.needsUpdate=true;
      }
    }else{
      material.envMapIntensity=.62;
      const borderBotany=['flower','daisy','fern','hedge','shrub','sorrel'].includes(id);
      if(borderBotany){
        material.color.set(({flower:'#e7dfdc',daisy:'#d3d8bd',fern:'#b8c2a4',hedge:'#ccd2be',shrub:'#c9ccb7',sorrel:'#e6ead8'})[id]);
        material.roughness=.96;material.metalness=0;material.normalScale?.setScalar(.32);material.aoMapIntensity=.8;
      }
      material.onBeforeCompile=shader=>{
        if(borderBotany){
          shader.vertexShader='varying float botanicalHeight;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nbotanicalHeight=clamp(position.y/${Math.max(.001,size.y).toFixed(5)},0.,1.);`);
          shader.fragmentShader='varying float botanicalHeight;\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse*=mix(.80,1.,smoothstep(.02,.40,botanicalHeight));');
          shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(.84,roughnessFactor);');
        }
        if(opacity&&masked){
          shader.uniforms.foliageSunDirection=foliageLighting.direction;
          shader.uniforms.foliageSunColour=foliageLighting.colour;
          shader.uniforms.foliageSunIntensity=foliageLighting.strength;
          shader.fragmentShader='uniform vec3 foliageSunDirection,foliageSunColour; uniform float foliageSunIntensity;\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
            vec3 foliageLightView=normalize(mat3(viewMatrix)*foliageSunDirection);
            float leafTransmission=pow(max(0.,dot(-normal,foliageLightView)),2.);
            reflectedLight.indirectDiffuse+=diffuseColor.rgb*foliageSunColour*(.008+leafTransmission*.018*foliageSunIntensity);
          `);
        }
        if(id.startsWith('mature')||id.startsWith('fir'))injectWind(shader,{height:size.y,flex:id.startsWith('fir')?.014:.018,flutter:masked?.006:0});
        else if(['lawn','meadow','grass'].includes(id))injectWind(shader,{height:size.y,flex:.26});
        else if(borderBotany||id==='tree')injectWind(shader,{height:size.y,flex:['hedge','shrub','tree'].includes(id)?.065:.12});
        if(['grass','lawn','meadow'].includes(id))shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(roughnessFactor,.88);');
        if((id.startsWith('mature')||id.startsWith('fir'))&&masked)shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(roughnessFactor,.82);');
      };
      material.customProgramCacheKey=()=>`shared-valley-wind-1-${id}-${size.y.toFixed(5)}`;
    }
    parts.push({geometry,material});
  }
  return {name:root.name,size,parts,triangles,windows};
}

export function createModelCottage(scene,library,style='house'){
  const model=library[style][0],group=new THREE.Group();group.name=`Imported Innerscene ${style}`;
  group.position.set(0,.18,-9.5);
  for(const part of model.parts){const mesh=new THREE.Mesh(part.geometry,part.material);mesh.castShadow=!(part.material.transmission>0||part.material.transparent);mesh.receiveShadow=true;group.add(mesh);}
  const interior=style==='cottage'?createCottageInterior(group,library,model):null;
  scene.add(group);group.updateMatrixWorld(true);
  const raycaster=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),origin=new THREE.Vector3();
  const footprint=new THREE.Box3();
  for(const part of model.parts)if(/mineral render|Render, warm beige|red running-bond brick/i.test(part.material.name)){
    part.geometry.computeBoundingBox();footprint.union(part.geometry.boundingBox);
  }
  if(footprint.isEmpty())throw new Error('建筑缺少可核对的外墙边界');
  const collider={minX:footprint.min.x,maxX:footprint.max.x,minZ:footprint.min.z+group.position.z,maxZ:footprint.max.z+group.position.z};
  return {group,interior,colliders:[collider],setEvening(value){interior?.setEvening(value);},walkHeight(x,z){
    if(Math.abs(x)>6.5||z< -16||z> -2.8)return null;
    raycaster.set(origin.set(x,1.35,z),down);
    const hits=raycaster.intersectObject(group,true);
    return hits.length?hits[0].point.y:null;
  }};
}

class ModelBatch{
  constructor(variant){this.variant=variant;this.transforms=[];}
  add(x,y,z,height,angle=0,width=1){const scale=height/Math.max(.001,this.variant.size.y);this.transforms.push({x,y,z,scale,angle,width});}
  finish(parent,{shadow=true}={}){
    if(!this.transforms.length)return;
    const dummy=new THREE.Object3D();
    for(const part of this.variant.parts){
      const mesh=new THREE.InstancedMesh(part.geometry,part.material,this.transforms.length);
      mesh.name=`Imported ${this.variant.name} × ${this.transforms.length}`;mesh.castShadow=shadow;mesh.receiveShadow=true;
      this.transforms.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.scale*p.width,p.scale,p.scale*p.width);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
      mesh.computeBoundingSphere();parent.add(mesh);
    }
  }
}

/** Managed short lawn inside the fence, with clustered tall scan meshes outside. */
export function createModelLawn(scene,library,{heightAt,weightsAt,random,grazingSites=[]}){
  const group=new THREE.Group();group.name='Managed lawn and wild meadow';scene.add(group);
  group.userData.omitFromReflection=true;
  const cells=new Map(),pastureItems=[],forageItems=[];let shortCount=0,meadowCount=0,pastureCount=0,highQuality=true;
  function add(kind,x,z,height){
    const key=`${kind}:${Math.floor(x/24)}:${Math.floor(z/24)}`;
    if(!cells.has(key))cells.set(key,{kind,batches:library[kind==='forage'?'grass':kind==='lawn'||kind==='pasture'?'meadow':kind].map(v=>new ModelBatch(v))});
    const batches=cells.get(key).batches;
    batches[Math.floor(random()*batches.length)].add(x,heightAt(x,z)-.012,z,height,random()*Math.PI*2,kind==='lawn'?2:1.25);
    if(kind==='pasture')pastureItems.push({x,z,height});
    if(kind==='forage')forageItems.push({x,z,height});
  }
  for(let attempt=0;attempt<60000&&shortCount<3000;attempt++){
    const x=-14+random()*28,z=-25+random()*36;
    if(Math.abs(x)<6.6&&z>-17&&z< -2)continue;
    if(wildnessAt(x,z)>.35||weightsAt(x,z).grass<.86)continue;
    // Scan tufts blend into the dense 2.5–5 cm cut lawn instead of standing out as weeds.
    add('lawn',x,z,.028+Math.pow(random(),2)*.035);shortCount++;
  }
  for(let attempt=0;attempt<120000&&meadowCount<10500;attempt++){
    const x=-62+random()*124,z=-85+random()*150,wild=wildnessAt(x,z);
    if(wild<.08||weightsAt(x,z).grass<.86)continue;
    if(Math.abs(z-18)<1.8&&Math.abs(x)<13)continue;
    const cluster=groundNoise(x*.17+6,z*.17+3)*.7+groundNoise(x*.043,z*.043)*.3;
    if(random()>.12+cluster*.85)continue;
    const crop=grazingInfluenceAt(x,z,grazingSites);
    const h=THREE.MathUtils.lerp((.10+cluster*.30+random()*.13)*(.4+.6*wild),.035+random()*.025,crop);
    add('meadow',x,z,h);meadowCount++;
  }
  // A close pasture has a cropped feeding area and irregular, taller outer tussocks.
  for(const site of grazingSites){const target=pastureCount+850;for(let attempt=0;attempt<5200&&pastureCount<target;attempt++){
    const angle=random()*Math.PI*2,r=Math.sqrt(random())*6.1,x=site.x+Math.cos(angle)*r,z=site.z+Math.sin(angle)*r;
    if(weightsAt(x,z).grass<.88||pathSampleAt(x,z).distance<1.3)continue;
    if(Math.abs(x)<12.2&&z>-22.2&&z<7.3)continue;
    const growth=meadowGrowthAt(x,z),crop=grazingInfluenceAt(x,z,grazingSites);
    if(random()>.28+growth*.65)continue;
    const h=THREE.MathUtils.lerp(.10+growth*.29+random()*.045,.027+random()*.025,crop);
    add('pasture',x,z,h);pastureCount++;
  }}
  for(const site of grazingSites)for(const feed of site.feedingPoints||[site.feedingPoint].filter(Boolean)){
    const clearance=feed.y-heightAt(feed.x,feed.z);
    for(let i=0;i<(site.feedingPoints?7:14);i++){
      const a=random()*Math.PI*2,r=i?Math.sqrt(random()):0,x=feed.x+Math.cos(a)*r*.42,z=feed.z+Math.sin(a)*r*.32;
      add('forage',x,z,THREE.MathUtils.clamp(clearance+.025+(random()-.5)*.04,.10,.19));
    }
  }
  const pastureMaterials=new Map(),forageMaterials=new Map();
  for(const {kind,batches} of cells.values())for(const batch of batches){
    const start=group.children.length;batch.finish(group,{shadow:false});
    for(const mesh of group.children.slice(start)){
      mesh.userData.grassKind=kind;mesh.userData.fullCount=mesh.count;
      if(kind==='pasture'){
        if(!pastureMaterials.has(mesh.material)){const original=mesh.material,copy=original.clone();copy.onBeforeCompile=original.onBeforeCompile;copy.customProgramCacheKey=original.customProgramCacheKey;copy.color.multiply(new THREE.Color('#b5c59c'));pastureMaterials.set(original,copy);}
        mesh.material=pastureMaterials.get(mesh.material);
      }
      if(kind==='forage'){
        if(!forageMaterials.has(mesh.material)){const original=mesh.material,copy=original.clone();copy.onBeforeCompile=original.onBeforeCompile;copy.customProgramCacheKey=original.customProgramCacheKey;copy.color.multiply(new THREE.Color('#9bbb7d'));forageMaterials.set(original,copy);}
        mesh.material=forageMaterials.get(mesh.material);
      }
    }
  }
  return {group,count:shortCount+meadowCount+pastureCount+forageItems.length,shortCount,meadowCount,pastureCount,pastureItems,forageItems,update(camera){
    for(const mesh of group.children){
      const distance=Math.max(0,mesh.boundingSphere.center.distanceTo(camera.position)-mesh.boundingSphere.radius);
      const end=mesh.userData.grassKind==='lawn'?38:62,start=highQuality?20:13;
      const fade=1-THREE.MathUtils.smoothstep(distance,start,end);
      mesh.count=Math.floor(mesh.userData.fullCount*(highQuality?1:.45)*fade);
      mesh.visible=mesh.count>0;
    }
  },setQuality(high){highQuality=high;}};
}

export function createModelGarden(scene,library,{heightAt,riverX,riverWidth,random}){
  const group=new THREE.Group();group.name='Imported botanical and scanned rock models';scene.add(group);
  const contacts=[];
  const batches={},patchVariants=new Map(),flowerPerches=[],perchByVariant=new Map();
  const planting=createPlantingPlan(random);
  for(const id of ['flower','daisy','hedge','fern','sorrel','grass','shrub','tree','stone','moss'])batches[id]=library[id].map(v=>new ModelBatch(v));
  // These scattered tufts are only 12–27 cm high; the retained meadow derivative
  // preserves their scan silhouette without repeating thousands of subpixel faces.
  batches.grass=library.meadow.map(v=>new ModelBatch(v));
  const pick=id=>{
    // Use full variants near paths, lighter variants for repeated meadow plants.
    const pool=id==='flower'?batches[id].filter(b=>/_0[234]_/.test(b.variant.name)):id==='daisy'?batches[id].slice(0,4):id==='sorrel'?batches[id].filter(b=>b.variant.triangles>=280):batches[id],limit=pool.length;
    return pool[Math.floor(random()*limit)];
  };
  function plant(id,x,z,h,width=1,patch=null){
    if(Math.abs(x-riverX(z))<riverWidth(z)+.7)return;
    let batch;
    if(patch!==null){const key=`${id}:${patch}`;if(!patchVariants.has(key))patchVariants.set(key,pick(id));batch=patchVariants.get(key);}
    else batch=pick(id);
    batch.add(x,heightAt(x,z)-.006,z,h,random()*Math.PI*2,width);
    if(id==='flower'||id==='daisy'){
      // Retain a real upper, upward-facing vertex from the placed scan mesh.
      // Pollinators land on the flower geometry rather than a guessed ground height.
      if(!perchByVariant.has(batch.variant)){
        let best=null;
        for(const part of batch.variant.parts){
          const p=part.geometry.attributes.position,n=part.geometry.attributes.normal;
          for(let i=0;i<p.count;i++)if((!n||n.getY(i)>.35)&&(!best||p.getY(i)>best.y))best=new THREE.Vector3().fromBufferAttribute(p,i);
        }
        perchByVariant.set(batch.variant,best||new THREE.Vector3(0,batch.variant.size.y,0));
      }
      const local=perchByVariant.get(batch.variant),p=batch.transforms.at(-1),a=p.angle,s=p.scale;
      flowerPerches.push({x:x+(local.x*Math.cos(a)+local.z*Math.sin(a))*s*width,
        y:p.y+local.y*s+.008,z:z+(-local.x*Math.sin(a)+local.z*Math.cos(a))*s*width,patch,kind:id,
        windRoot:{x,z},windHeight:local.y*s,plantHeight:h});
    }
    if(id!=='grass')contacts.push({x,z,radius:id==='hedge'?h*.48:Math.max(.10,h*.38),occlusion:id==='hedge'?.44:.25,
      soil:id==='hedge'?.28:0,soilRadius:h*.45});
  }
  for(const p of planting.plants)plant(p.kind,p.x,p.z,p.height,p.width,p.patch);
  const saplings=[[-14.2,-15,2.8],[14.8,-24,3.3],[-16.5,-28,2.6]];
  for(const [x,z,h] of saplings)plant('tree',x,z,h);
  // Ferns follow the shaded water margins; the centre path and bridge approach stay clear.
  for(let i=0;i<95;i++){
    const z=-40+random()*85,side=i%2?1:-1;
    const x=riverX(z)+side*(riverWidth(z)+.9+random()*1.4);
    if(Math.abs(z-18)<2.1)continue;
    plant(i%3===0?'shrub':'fern',x,z,.28+random()*.36);
  }
  for(let i=0;i<1150;i++){
    const x=-25+random()*52,z=-35+random()*80;
    const route=pathSampleAt(x,z);
    if(route.distance<route.halfWidth+.25||(Math.abs(x)<1.65&&z>-3&&z<13)||(Math.abs(x)<7&&z>-16.5&&z< -2)||(z>11&&z<20&&Math.abs(x+(z-12))<2)||(Math.abs(z-18)<2&&Math.abs(x-riverX(z))<9))continue;
    plant('grass',x,z,.12+random()*.15);
  }
  const colliders=saplings.map(([x,z])=>({minX:x-.2,maxX:x+.2,minZ:z-.2,maxZ:z+.2}));
  // Actual scanned rocks, independently recentered from the six-rock source collection.
  for(let i=0;i<67;i++){
    const z=-65+random()*140,side=i%2?1:-1,x=riverX(z)+side*(riverWidth(z)-.25+random()*.8);
    if(Math.abs(z-18)<3)continue;
    const id=i%3?'moss':'stone',h=.15+Math.pow(random(),2)*.6;
    pick(id).add(x,Math.max(-.19,heightAt(x,z))-.04,z,h,random()*6.28);
    contacts.push({x,z,radius:.2+h*.65,occlusion:.6});
    if(h>.55)colliders.push({minX:x-.35,maxX:x+.35,minZ:z-.35,maxZ:z+.35});
  }
  for(const [id,models] of Object.entries(batches))for(const batch of models){
    const start=group.children.length;batch.finish(group,{shadow:!['grass','daisy','sorrel'].includes(id)});
    if(['grass','flower','daisy','sorrel'].includes(id))for(const mesh of group.children.slice(start))mesh.userData.omitFromReflection=true;
    if(id==='grass')for(const mesh of group.children.slice(start))mesh.userData.contactCaster=false;
  }
  return {group,colliders,contacts,planting,flowerPerches,update(){}};
}

import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

/** Local CC0 photographs. Sources, exact download URLs and hashes live beside them. */
export async function loadNatureMaterials(renderer) {
  const loader=new THREE.TextureLoader(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  async function texture(name,color=false){
    const map=await loader.loadAsync(new URL(`../assets/materials/${name}.jpg`,import.meta.url).href);
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=anisotropy;
    map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    return map;
  }
  async function groundTexture(name,color=false){
    const map=await loader.loadAsync(new URL(`../model-version/assets/ground/${name}.jpg`,import.meta.url).href);
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=anisotropy;map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;return map;
  }
  const wood=Object.fromEntries(await Promise.all(['color','normal','roughness'].map(async channel=>{
    const map=await loader.loadAsync(new URL(`../model-version/assets/materials/bridge/${channel}.jpg`,import.meta.url).href);
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=anisotropy;map.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;return [channel,map];
  })));
  const flagstone=Object.fromEntries(await Promise.all(['color','normal','roughness'].map(async channel=>{
    const map=await loader.loadAsync(new URL(`../model-version/assets/materials/flagstone/${channel}.jpg`,import.meta.url).href);
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=anisotropy;map.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;return [channel,map];
  })));
  const [grassColor,grassNormal,grassRoughness,dryGrassColor,soilColor,soilNormal,soilRoughness,rockColor,rockNormal,rockRoughness,gravelColor,gravelNormal,gravelRoughness,aerial,sky,elevation]=await Promise.all([
    groundTexture('lawn-fresh-color',true),groundTexture('lawn-fresh-normal'),groundTexture('lawn-fresh-roughness'),
    groundTexture('lawn-color',true),
    groundTexture('soil-color',true),groundTexture('soil-normal'),groundTexture('soil-roughness'),
    texture('rock-color',true),texture('rock-normal'),texture('rock-roughness'),
    texture('gravel-color',true),texture('gravel-normal'),texture('gravel-roughness'),texture('aerial-color',true),
    new HDRLoader().loadAsync(new URL('../assets/materials/sky.hdr',import.meta.url).href),
    fetch(new URL('../model-version/assets/terrain/kaiser-height.f32',import.meta.url)).then(response=>{if(!response.ok)throw new Error('山地高程加载失败');return response.arrayBuffer();}).then(buffer=>new Float32Array(buffer))
  ]);
  sky.mapping=THREE.EquirectangularReflectionMapping;
  if(elevation.length!==256*256)throw new Error('山地高程数据不完整');
  return {wood,flagstone,grass:{color:grassColor,normal:grassNormal,roughness:grassRoughness},dryGrass:dryGrassColor,soil:{color:soilColor,normal:soilNormal,roughness:soilRoughness},rock:{color:rockColor,normal:rockNormal,roughness:rockRoughness},gravel:{color:gravelColor,normal:gravelNormal,roughness:gravelRoughness},aerial,sky,elevation};
}

export function tiledMaterialMaps(set,x,y=x){
  const maps={};
  for(const [property,key] of [['map','color'],['normalMap','normal'],['roughnessMap','roughness']]){
    maps[property]=set[key].clone();maps[property].repeat.set(x,y);
  }
  return maps;
}

import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

/** Local CC0 photographs. Sources, exact download URLs and hashes live beside them. */
export async function loadNatureMaterials(renderer) {
  const loader=new THREE.TextureLoader(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  async function texture(name,color=false){
    const map=await loader.loadAsync(new URL(`./assets/materials/${name}.jpg`,import.meta.url).href);
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=anisotropy;
    map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    return map;
  }
  const [grassColor,grassNormal,grassRoughness,rockColor,rockNormal,rockRoughness,gravelColor,gravelNormal,gravelRoughness,aerial,sky]=await Promise.all([
    texture('grass-color',true),texture('grass-normal'),texture('grass-roughness'),
    texture('rock-color',true),texture('rock-normal'),texture('rock-roughness'),
    texture('gravel-color',true),texture('gravel-normal'),texture('gravel-roughness'),texture('aerial-color',true),
    new HDRLoader().loadAsync(new URL('./assets/materials/sky.hdr',import.meta.url).href)
  ]);
  sky.mapping=THREE.EquirectangularReflectionMapping;
  return {grass:{color:grassColor,normal:grassNormal,roughness:grassRoughness},rock:{color:rockColor,normal:rockNormal,roughness:rockRoughness},gravel:{color:gravelColor,normal:gravelNormal,roughness:gravelRoughness},aerial,sky};
}

export function tiledMaterialMaps(set,x,y=x){
  const maps={};
  for(const [property,key] of [['map','color'],['normalMap','normal'],['roughnessMap','roughness']]){
    maps[property]=set[key].clone();maps[property].repeat.set(x,y);
  }
  return maps;
}

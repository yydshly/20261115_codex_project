import * as THREE from 'three';
import { mountainVertexHeight,forestDensityAt,setTerrainElevation,meadowHeightAt } from './terrain.js';

/** An actual Tyrolean DEM surface, scaled to the miniature valley's art direction. */
export function createMountains(scene,nature){
  setTerrainElevation(nature.elevation);
  const positions=[],uv=[],indices=[],cover=[],foot=[],n=256;
  for(let row=0;row<n;row++)for(let col=0;col<n;col++){
    const x=(col/(n-1)-.5)*2300,z=-140-(1-row/(n-1))*2200;
    positions.push(x,mountainVertexHeight(row,col),z);uv.push(col/(n-1),row/(n-1));
    cover.push(forestDensityAt(x,z));
    foot.push(1-THREE.MathUtils.smoothstep(mountainVertexHeight(row,col)-meadowHeightAt(x,z),0,12));
    if(row<n-1&&col<n-1){const a=row*n+col;indices.push(a,a+n,a+1,a+1,a+n,a+n+1);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  geometry.setAttribute('forestCover',new THREE.Float32BufferAttribute(cover,1));
  geometry.setAttribute('meadowFoot',new THREE.Float32BufferAttribute(foot,1));
  const material=new THREE.MeshStandardMaterial({map:nature.rock.color,roughness:1,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.mountainMeadow={value:nature.aerial};
    shader.uniforms.mountainLawn={value:nature.grass.color};shader.uniforms.mountainSoil={value:nature.soil.color};shader.uniforms.mountainDryGrass={value:nature.dryGrass};
    shader.vertexShader='attribute float forestCover,meadowFoot; varying float woodedSlope,meadowTransition; varying vec3 mountainPosition; varying vec3 mountainNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmountainPosition=position; mountainNormal=normal; woodedSlope=forestCover;meadowTransition=meadowFoot;');
    shader.fragmentShader='uniform sampler2D mountainMeadow,mountainLawn,mountainSoil,mountainDryGrass; varying float woodedSlope,meadowTransition; varying vec3 mountainPosition; varying vec3 mountainNormal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 geologicalNormal=normalize(mountainNormal);
      vec3 weights=pow(abs(geologicalNormal),vec3(5.));weights/=max(dot(weights,vec3(1.)),.001);
      vec3 stone=texture2D(map,mountainPosition.zy*.052).rgb*weights.x
        +texture2D(map,mountainPosition.xz*.052).rgb*weights.y
        +texture2D(map,mountainPosition.xy*.052).rgb*weights.z;
      vec3 grass=texture2D(mountainMeadow,mountainPosition.xz*.008).rgb;
      vec3 broad=texture2D(mountainMeadow,mountainPosition.xz*.00085).rgb;
      float steepness=1.-abs(geologicalNormal.y);
      float exposed=smoothstep(.13,.48,steepness);
      exposed=max(exposed,smoothstep(220.,380.,mountainPosition.y)*.7);
      vec3 meadow=grass*vec3(.37,.48,.26)*(.8+broad.g*.5);
      vec3 forest=grass*vec3(.14,.27,.15)*(.8+broad.g*.5);
      vec3 vegetated=mix(meadow,forest,smoothstep(.18,.8,woodedSlope)*.86);
      vec3 footLawn=texture2D(mountainLawn,mountainPosition.xz/1.4).rgb*.94;
      footLawn=mix(footLawn,texture2D(mountainDryGrass,mountainPosition.xz/2.1).rgb*.90,.10);
      vec3 footSoil=texture2D(mountainSoil,mountainPosition.xz/1.3).rgb*mix(vec3(1.),vec3(.65,.66,.53),woodedSlope);
      vec3 valleyFloor=mix(footLawn,footSoil,woodedSlope*.5);
      vegetated=mix(vegetated,valleyFloor,meadowTransition);
      vec3 cliff=stone*vec3(.72,.77,.79);
      diffuseColor.rgb*=mix(vegetated,cliff,exposed);
    `);
  };
  material.customProgramCacheKey=()=> 'wooded-kaiser-soft-foot-3';
  const mountain=new THREE.Mesh(geometry,material);mountain.name='Wilder Kaiser real elevation terrain · 130050 triangles';
  scene.add(mountain);
  return mountain;
}

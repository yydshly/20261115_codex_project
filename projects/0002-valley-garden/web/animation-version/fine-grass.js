import * as THREE from 'three';
import { groundNoise } from './ground.js';
import { treeWindTime } from './model-assets.js';
import { foliageLighting } from './lighting.js';
import { grazingInfluenceAt,meadowGrowthAt } from './meadow-field.js';
import { pathSampleAt } from './path-layout.js';

/** Dense, mown fescue with slightly taller margins; all dimensions are metres. */
export function createFineGrass(scene,{heightAt,weightsAt,random,grazingSites=[]}){
  const group=new THREE.Group();group.name='Close lawn blade volume';group.userData.omitFromReflection=true;scene.add(group);
  const positions=[],uv=[],indices=[];
  for(let row=0;row<=3;row++){
    const t=row/3,width=row===3?0:.052*(.75+.25*Math.sin(t*Math.PI));
    for(const side of [-1,1]){positions.push(side*width*.5,t,t*t*.38);uv.push((side+1)/2,t);}
    if(row<3){const a=row*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.98,metalness:0,side:THREE.DoubleSide,envMapIntensity:.45});
  material.onBeforeCompile=shader=>{
    shader.uniforms.fineGrassTime=treeWindTime;
    shader.uniforms.fineGrassSun=foliageLighting.direction;
    shader.vertexShader='uniform float fineGrassTime; varying vec3 fineGrassWorld; varying float grassTip;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      grassTip=position.y;
      transformed.x+=sin(fineGrassTime*.85+instanceMatrix[3].x*.7+instanceMatrix[3].z*.4)*position.y*position.y*.055;
      fineGrassWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;
    `);
    shader.fragmentShader='uniform vec3 fineGrassSun; varying vec3 fineGrassWorld; varying float grassTip;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float grassDistance=length(cameraPosition.xz-fineGrassWorld.xz);
      float grassFade=smoothstep(12.,18.,grassDistance);
      float coverage=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
      if(coverage<grassFade)discard;
      diffuseColor.rgb*=mix(.76,1.06,grassTip);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      float grassTransmission=pow(max(0.,dot(-normal,normalize(mat3(viewMatrix)*fineGrassSun))),1.5);
      reflectedLight.indirectDiffuse+=diffuseColor.rgb*(.05+grassTransmission*.14);
    `);
  };
  material.customProgramCacheKey=()=> 'mown-fescue-volume-2';
  const dummy=new THREE.Object3D(),colour=new THREE.Color(),wetColour=new THREE.Color('#617c37'),heightCache=new Map();let count=0,high=true;
  function gridHeight(ix,iz){const key=`${ix},${iz}`;if(!heightCache.has(key))heightCache.set(key,heightAt(ix*.5,iz*.5));return heightCache.get(key);}
  function rootHeight(x,z){
    const ix=Math.floor(x*2),iz=Math.floor(z*2),u=x*2-ix,v=z*2-iz;
    const a=gridHeight(ix,iz),b=gridHeight(ix+1,iz),c=gridHeight(ix,iz+1),d=gridHeight(ix+1,iz+1);
    return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  function addBatch(transforms,colours,name){
    if(!transforms.length)return;
    const mesh=new THREE.InstancedMesh(geometry,material,transforms.length);mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=true;
    transforms.forEach(([x,y,z,h,angle,leanX,leanZ],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(leanX,angle,leanZ);dummy.scale.set(h,h,h);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,colours[i]);});
    mesh.computeBoundingSphere();mesh.userData.fullCount=mesh.count;group.add(mesh);count+=mesh.count;
  }
  for(let cx=-12;cx<12;cx+=6)for(let cz=-24;cz<12;cz+=6){
    const transforms=[],colours=[];
    for(let i=0;i<80000;i++){
      const x=cx+random()*6,z=cz+random()*6;
      if(Math.abs(x)<4.22&&z>-15.22&&z< -4.84)continue;
      if(Math.abs(x)<1.3&&z>-5.1&&z< -2.45)continue;
      if(weightsAt(x,z).grass<.9)continue;
      const edge=Math.min(x+12,12-x,z+24,12-z);
      if(random()>THREE.MathUtils.smoothstep(edge,0,2.2)*(.65+.35*groundNoise(x*.8,z*.8)))continue;
      const growth=groundNoise(x*.22+11,z*.22+3)*.65+groundNoise(x*.057,z*.057)*.35;
      const fenceDistance=Math.min(Math.abs(Math.abs(x)-11.65),Math.abs(z-6.85),Math.abs(z+21.7));
      const margin=1-THREE.MathUtils.smoothstep(fenceDistance,.12,.85);
      const h=(.024+random()*.022)*( .88+growth*.24)+margin*(.022+random()*.03);
      const moisture=THREE.MathUtils.clamp(growth+(random()-.5)*.28,0,1);
      colour.set('#9aa55d').lerp(wetColour,moisture);
      transforms.push([x,rootHeight(x,z)-.006,z,h,random()*Math.PI*2,(random()-.5)*.95,(random()-.5)*.95]);colours.push(colour.clone());
    }
    addBatch(transforms,colours,'Near grass blades');
  }
  const courtyardCount=count;
  let feedingCount=0;
  for(const site of grazingSites){
    const transforms=[],colours=[];
    for(let i=0;i<24000;i++){
      const angle=random()*Math.PI*2,r=Math.sqrt(random())*4.6,x=site.x+Math.cos(angle)*r,z=site.z+Math.sin(angle)*r;
      if(Math.abs(x)<12.2&&z>-22.2&&z<7.3)continue;
      if(weightsAt(x,z).grass<.9||pathSampleAt(x,z).distance<1.3)continue;
      const growth=meadowGrowthAt(x,z),crop=grazingInfluenceAt(x,z,grazingSites);
      if(random()>.38+growth*.62)continue;
      const h=THREE.MathUtils.lerp(.055+growth*.18+random()*.06,.025+random()*.025,crop);
      colour.set('#a2a96a').lerp(wetColour,growth*.75+random()*.15);
      transforms.push([x,rootHeight(x,z)-.006,z,h,random()*Math.PI*2,(random()-.5)*.85,(random()-.5)*.85]);colours.push(colour.clone());
    }
    addBatch(transforms,colours,'Pasture fine blades · cropped and tussock layers');
    for(const feed of site.feedingPoints||[site.feedingPoint].filter(Boolean)){
      const leaves=[],leafColours=[],clearance=feed.y-heightAt(feed.x,feed.z);
      for(let i=0;i<(site.feedingPoints?700:1400);i++){
        const a=random()*Math.PI*2,r=Math.sqrt(random()),x=feed.x+Math.cos(a)*r*.48,z=feed.z+Math.sin(a)*r*.38;
        const h=THREE.MathUtils.clamp(clearance+.025+(random()-.5)*.065,.085,.20)*(1-r*.18);
        colour.set('#7b9953').lerp(wetColour,random()*.45);
        leaves.push([x,rootHeight(x,z)-.006,z,h,random()*Math.PI*2,(random()-.5)*.55,(random()-.5)*.55]);leafColours.push(colour.clone());
      }
      addBatch(leaves,leafColours,'Edible grass leaves under the grazing muzzle');feedingCount+=leaves.length;
    }
  }
  return {group,count,pastureCount:count-courtyardCount,feedingCount,update(camera){for(const mesh of group.children){
    const distance=Math.max(0,mesh.boundingSphere.center.distanceTo(camera.position)-mesh.boundingSphere.radius);
    mesh.visible=distance<(high?18:12);mesh.count=Math.floor(mesh.userData.fullCount*(high?1:.48));
  }},setQuality(value){high=value;}};
}

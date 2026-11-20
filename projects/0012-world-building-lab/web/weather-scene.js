import {roofHeightAt} from './settlement-layout.js';
import * as THREE from 'three';
import {weatherFrame,interpolateFrame} from './world-weather.js';
import {terrainHeight,random} from './large-world.js';
import {waterAt} from './water-system.js';
import {forestField} from './forest-layout.js';

export function weatherSurface(x,z){const h=terrainHeight(x,z),water=waterAt(x,z),level=water?.level??0;return {height:Math.max(h,level,roofHeightAt(x,z)??-Infinity),wet:level>h+.02,forest:forestField(x,z)};}
export function addWeatherExposure(geometry){const p=geometry.attributes.position,values=new Float32Array(p.count);for(let i=0;i<p.count;i++){const water=waterAt(p.getX(i),p.getZ(i));values[i]=p.getY(i)>(water?.level??0)+.02?1:0;}geometry.setAttribute('wfExposure',new THREE.BufferAttribute(values,1));}
export function patchWeatherShader(shader,uniforms,{plant=false,evergreen=false,aquatic=false,ground=false,depth=false,annualOnly=false}={}){
 Object.assign(shader.uniforms,uniforms);
 const declarations='\nuniform float wfTime;uniform float wfWind;uniform float wfWinter;uniform float wfSnow;uniform float wfWet;uniform float wfSurface;uniform vec3 wfLeaf;varying vec3 wfWorld;varying float wfUp;varying float wfExposed;\n';
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>'+declarations+(ground?'attribute float wfExposure;\n':''));
 let vertex='\n';if(plant&&!aquatic)vertex+='transformed.x += sin(wfTime*1.8+position.y*1.7)*wfWind*0.06*min(2.0,abs(position.y));\n';
 vertex+='vec4 wfP=vec4(transformed,1.0);vec3 wfN=normal;\n#ifdef USE_INSTANCING\nwfP=instanceMatrix*wfP;wfN=mat3(instanceMatrix)*wfN;\n#endif\nwfWorld=(modelMatrix*wfP).xyz;wfUp=max(0.0,normalize(mat3(modelMatrix)*wfN).y);';
 vertex+=ground?'wfExposed=wfExposure;':aquatic?'wfExposed=0.0;':'wfExposed=step(0.1,wfWorld.y);';
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>'+vertex);
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>'+declarations+`
 uniform float wfAnnual; uniform float wfRainMap; uniform vec4 wfClimateGrid; uniform sampler2D wfClimate;
 vec4 annualSample(){return texture2D(wfClimate,clamp((wfWorld.xz-wfClimateGrid.xy)/wfClimateGrid.zw,0.0,1.0));}
 `);
 const thinning=plant&&!evergreen&&!aquatic?`float wfPatch=fract(sin(dot(floor(wfWorld.xz*2.5),vec2(12.9898,78.233)))*43758.5453);
 if(wfAnnual>.5){if(wfPatch<annualSample().b*.46)discard;}
 ${annualOnly?'':'else {if(wfPatch<wfWinter*0.65)discard;}'}
 `:'';
 if(depth){shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() {\n'+thinning);return shader;}
 const groundTint=ground?`
 float wfGreen=smoothstep(1.02,1.28,diffuseColor.g/max(0.01,diffuseColor.r));
 diffuseColor.rgb*=mix(vec3(1.0),wfLeaf,wfGreen*.5*wfExposed*wfSurface*(1.0-wfAnnual));
 if(wfAnnual>.5){
   diffuseColor.rgb*=mix(vec3(1.07,.92,.76),vec3(.73,.89,.92),annual.g*wfExposed);
   vec3 rainColor=mix(vec3(.61,.35,.13),vec3(.07,.56,.91),smoothstep(.01,.72,annual.r));
   rainColor=mix(rainColor,vec3(.86,.93,1.),smoothstep(.04,.42,annual.a));
   diffuseColor.rgb=mix(diffuseColor.rgb,rainColor,.63*wfRainMap*wfExposed);
 }`:'';
 const tint=plant&&!aquatic?`
 diffuseColor.rgb *= mix(vec3(1.0),wfLeaf,${annualOnly?'0.0':evergreen?'0.15':'1.0'}*(1.0-wfAnnual));
 vec3 responsive=mix(vec3(1.3,.62,.29),vec3(.72,1.15,.82),smoothstep(.03,.41,annual.g));
 diffuseColor.rgb*=mix(vec3(1.),responsive,wfAnnual*${evergreen?'0.33':'0.78'});
 `:'';
 const wet=annualOnly?'annual.g*wfAnnual':'mix(wfWet,annual.g,wfAnnual)';
 const snow=annualOnly?'annual.b*wfAnnual':'mix(wfSnow,annual.b,wfAnnual)';
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec4 annual=vec4(0.);
 if(wfAnnual>.5)annual=annualSample();
 ${thinning+tint+groundTint}
 float surfaceWet=${wet};
 diffuseColor.rgb *= 1.0-surfaceWet*.24*wfExposed;
 float wfCover=${snow}*smoothstep(.30,.85,wfUp)*wfExposed;
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.83,.90,.94),wfCover*(1.0-wfRainMap*.72));
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,0.3,surfaceWet*wfExposed);');return shader;
}

export function buildWeather(scene,{sun,ambient,sky,sea,sunOffset,vegetation,tiles,grass,waterScene,inlandScene,glacialScene,settlementScene}){
 let target=weatherFrame(),current=target,time=0,lastParticles=-1;
 const uniforms={wfTime:{value:0},wfWind:{value:.18},wfWinter:{value:0},wfSnow:{value:0},wfWet:{value:0},
  wfSurface:{value:1},wfLeaf:{value:new THREE.Vector3(...target.leafTint)},wfAnnual:{value:0},
  wfRainMap:{value:0},wfClimateGrid:{value:new THREE.Vector4(0,0,1,1)},wfClimate:{value:null}};
 const decorated=new WeakMap(),surfaceMaterials=new Set(),plantMaterials=[];
 function coat(material,options={}){if(!material?.isMeshStandardMaterial)return material;if(decorated.has(material))return material;material.onBeforeCompile=shader=>patchWeatherShader(shader,uniforms,options);material.customProgramCacheKey=()=>JSON.stringify(['world-weather-v1',options]);material.needsUpdate=true;decorated.set(material,options);return material;}
 settlementScene?.roofGroup.traverse(o=>{if(o.isMesh&&o.userData.weatherExterior)coat(o.material);});
 const plantCache=new Map();for(const group of vegetation.groups){const kind=group.userData.kind,aquatic=group.userData.layer==='aquatic',evergreen=['pine','coastPine','palm','cactus','dead'].includes(kind);group.traverse(mesh=>{if(!mesh.isMesh)return;const green=mesh.material.color.g>mesh.material.color.r*1.05&&mesh.material.color.g>mesh.material.color.b*1.04;if(!green)return;const key=mesh.material.uuid+':'+evergreen+':'+aquatic;if(!plantCache.has(key)){const mat=mesh.material.clone();coat(mat,{plant:true,evergreen,aquatic});plantCache.set(key,mat);plantMaterials.push(mat);}mesh.material=plantCache.get(key);if(!aquatic){const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});depth.onBeforeCompile=shader=>patchWeatherShader(shader,uniforms,{plant:true,evergreen,depth:true});depth.customProgramCacheKey=()=> 'world-weather-depth-v1-'+evergreen;mesh.customDepthMaterial=depth;}});}
 function decorateTerrain(mesh){if(!mesh?.material?.vertexColors)return;if(!mesh.geometry.attributes.wfExposure)addWeatherExposure(mesh.geometry);coat(mesh.material,{ground:true});surfaceMaterials.add(mesh.material);}
 tiles.onWeatherMesh=decorateTerrain;for(const tile of tiles.tiles)if(tile.mesh)decorateTerrain(tile.mesh);
 if(grass){coat(grass.material,{plant:true});grass.customDepthMaterial=undefined;}
 const waterMaterials=new Set([sea.material,waterScene.flowMaterial,waterScene.poolMaterial]);for(const root of [inlandScene.group,glacialScene.waters])root.traverse(o=>{if(o.isMesh&&o.material.transparent&&o.material.bumpMap)waterMaterials.add(o.material);});
 const waterBases=new Map([...waterMaterials].filter(Boolean).map(m=>[m,{color:m.color.clone(),roughness:m.roughness,bumpScale:m.bumpScale}]));
 const iceFilm=new THREE.Mesh(inlandScene.lake.geometry.clone(),new THREE.MeshStandardMaterial({color:'#b8d3dc',roughness:.48,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));iceFilm.position.y=.07;inlandScene.group.add(iceFilm);
 const iceLakeFilm=new THREE.Mesh(glacialScene.lake.geometry.clone(),iceFilm.material);iceLakeFilm.position.y=.07;glacialScene.waters.add(iceLakeFilm);
 const root=new THREE.Group();root.name='weather-and-night-sky';scene.add(root);const moon=new THREE.DirectionalLight('#a9c8f2',0);scene.add(moon,moon.target);
 const moonDisc=new THREE.Mesh(new THREE.SphereGeometry(75,12,8),new THREE.MeshBasicMaterial({color:'#d3def0',fog:false}));root.add(moonDisc);
 const rng=random(60771),stars=[];for(let i=0;i<420;i++){const a=rng()*Math.PI*2,y=.08+rng()*.9,r=Math.sqrt(1-y*y)*11000;stars.push(Math.cos(a)*r,y*11000,Math.sin(a)*r);}const starField=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(stars,3)),new THREE.PointsMaterial({color:'#dce8ff',size:15,transparent:true,opacity:0,depthWrite:false,fog:false}));root.add(starField);
 const count=700,particles=Array.from({length:count},()=>({x:(rng()-.5)*100,z:(rng()-.5)*100,phase:rng(),h:0})),rainGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*6),3)),snowGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));
 const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:'#c4deed',transparent:true,opacity:.55,depthWrite:false})),snow=new THREE.Points(snowGeometry,new THREE.PointsMaterial({color:'#edf3f3',size:.16,transparent:true,opacity:.86,depthWrite:false}));rain.frustumCulled=snow.frustumCulled=false;root.add(rain,snow);
 let particleAnchor=new THREE.Vector3(Infinity,0,Infinity);
 return {root,moon,moonDisc,starField,rain,snow,particles,uniforms,plantMaterials,surfaceMaterials,waterMaterials:waterBases,iceFilm,iceLakeFilm,
  setAnnualClimate(texture,grid,layer){
   uniforms.wfAnnual.value=texture?1:0;
   uniforms.wfRainMap.value=texture&&layer==='rain'?1:0;
   if(texture){
    uniforms.wfClimate.value=texture;
    uniforms.wfClimateGrid.value.set(grid.x0-grid.step/2,grid.z0-grid.step/2,grid.cols*grid.step,grid.rows*grid.step);
   }
  },
  registerAnnualPlants(groups){
   for(const {root,evergreen} of groups)root.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.material?.isMeshStandardMaterial||decorated.has(mesh.material))return;
    const c=mesh.material.color;
    if(c.g<=c.r*1.04||c.g<=c.b*1.03)return;
    const key=mesh.material.uuid+':annual:'+evergreen;
    if(!plantCache.has(key))plantCache.set(key,coat(mesh.material.clone(),{plant:true,evergreen,annualOnly:true}));
    mesh.material=plantCache.get(key);
   });
  },
  set(value){target=weatherFrame(value);},get frame(){return current;},
  update(dt,context={}){time+=context.reduced?0:dt;current=interpolateFrame(current,target,1-Math.exp(-dt*1.8));const f=current;uniforms.wfSurface.value=context.surfaceEffects===false?0:1;uniforms.wfTime.value=time;uniforms.wfWind.value=context.reduced?0:f.wind;uniforms.wfWinter.value=f.winter;uniforms.wfSnow.value=context.surfaceEffects===false?0:f.snowCover;uniforms.wfWet.value=context.surfaceEffects===false?0:f.wetness;uniforms.wfLeaf.value.set(...f.leafTint);
   sun.color.setRGB(...f.sunColor);ambient.color.setRGB(...f.horizon);sky.material.uniforms.topColor.value.setRGB(...f.top);sky.material.uniforms.bottomColor.value.setRGB(...f.horizon);sunOffset.set(...f.sunDirection).normalize().multiplyScalar(460);sky.material.uniforms.sunDirection.value.copy(sunOffset).normalize();const su=sky.material.uniforms;if(su.cloudCover){su.cloudCover.value=f.cloud;su.weatherTime.value=time*f.wind;su.sunVisibility.value=f.day*(1-f.cloud*.65)*(1-f.dust*.6);}
   for(const [m,b] of waterBases){m.color.copy(b.color).multiply(new THREE.Color(...f.waterTint)).multiplyScalar(2);m.roughness=Math.min(.88,b.roughness+f.wind*.38);m.bumpScale=b.bumpScale+f.waterChop;}
   iceFilm.material.opacity=f.winter*.62;iceFilm.visible=iceLakeFilm.visible=f.winter>.02&&context.surfaceEffects!==false&&uniforms.wfAnnual.value===0;
   const eye=context.eye||new THREE.Vector3();sun.position.copy(eye).add(sunOffset);sun.target.position.copy(eye);sun.target.updateMatrixWorld();starField.position.copy(eye);starField.material.opacity=f.stars;moonDisc.position.copy(eye).add(new THREE.Vector3(-f.sunDirection[0],Math.max(.18,-f.sunDirection[1]),-f.sunDirection[2]).normalize().multiplyScalar(10000));moonDisc.visible=f.night>.1&&f.cloud<.7&&f.dust<.2;moon.position.copy(eye).add(new THREE.Vector3(200,280,-180));moon.target.position.copy(eye);moon.intensity=context.underground?0:f.moonIntensity;
   const sheltered=context.underground||context.indoor||context.underwater||context.overview||context.cutaway;rain.visible=!context.suppressParticles&&!sheltered&&f.rain>.02;snow.visible=!context.suppressParticles&&!sheltered&&f.snow>.02;rain.material.opacity=f.rain*.55;snow.material.opacity=f.snow*.86;
   if(rain.visible||snow.visible){if(eye.distanceTo(particleAnchor)>6||time-lastParticles>.8){lastParticles=time;particleAnchor.copy(eye);for(const p of particles){const s=weatherSurface(eye.x+p.x,eye.z+p.z);p.h=s.height+(s.forest?.canopy>.6&&s.forest?.gap<.5?19:0);}}
    const rp=rainGeometry.attributes.position,sp=snowGeometry.attributes.position;for(let i=0;i<count;i++){const p=particles[i],phase=(p.phase+time*(rain.visible?.65:.075))%1,h=Math.max(p.h,eye.y-12)+phase*42,x=eye.x+p.x+Math.sin(time*.4+i)*f.wind*(snow.visible?1.5:.2),z=eye.z+p.z;rp.setXYZ(i*2,x,h,z);rp.setXYZ(i*2+1,x+.35*f.wind,h+1.6,z+.12);sp.setXYZ(i,x,h,z);}rp.needsUpdate=sp.needsUpdate=true;
   }return f;
  }
 };
}

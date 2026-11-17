import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCharacterShadows } from './character-shadows.js';
import { createGlassBudget } from './glass-budget.js';
import { createLightingRig } from './lighting.js';

{
  const scene=new THREE.Scene(),glass=new THREE.MeshPhysicalMaterial({transmission:.9,roughness:.09}),wood=new THREE.MeshStandardMaterial();
  const pane=new THREE.Mesh(new THREE.BoxGeometry(),glass),mixed=new THREE.Mesh(new THREE.BoxGeometry(),[glass,wood]);scene.add(pane,mixed);
  const budget=createGlassBudget(scene),camera=new THREE.PerspectiveCamera();camera.position.set(0,0,30);budget.update(camera);
  assert.equal(budget.cheapCount,2);assert.equal(pane.material.transmission,0);assert(pane.material.transparent&&pane.material.opacity>0&&pane.material.opacity<1);assert.equal(mixed.material[1],wood);
  assert(pane.material.premultipliedAlpha,'Thin panes dim reflected light with their transparency');
  camera.position.z=7.5;budget.update(camera);assert.notEqual(pane.material,glass,'Thin glass chatters within the hysteresis band');
  assert(pane.material.opacity<.15,'Ordinary garden panes became an opaque film');
  camera.position.z=6;budget.update(camera);assert.equal(pane.material,glass);assert.equal(pane.material.transmission,.9);
  camera.position.z=8;budget.update(camera);assert.equal(pane.material,glass);
  budget.setQuality(false);budget.update(camera);assert.notEqual(pane.material,glass);
  camera.position.z=4;budget.update(camera);assert.equal(pane.material,glass);
  mixed.visible=false;budget.update(camera);assert.equal(budget.physicalCount,1,'Invisible house variants count towards the active window budget');
  pane.position.z=100;camera.position.z=105;budget.update(camera);assert.equal(pane.material,glass,'Pane distance ignored its world-space transform');
  budget.physical();assert.equal(pane.material,glass);assert.equal(mixed.material[0],glass);budget.dispose();
}
{
  const scene=new THREE.Scene(),life=new THREE.Group(),resident=new THREE.Group(),cow=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()),world=new THREE.Group();
  resident.add(new THREE.Mesh(new THREE.BoxGeometry(.5,1.6,.4),new THREE.MeshStandardMaterial()));life.add(resident,cow);scene.add(life,world);
  const hidden=new THREE.Group();hidden.visible=false;scene.add(hidden);
  const sun=new THREE.DirectionalLight();sun.position.set(-48,65,40);scene.add(sun,sun.target);
  const viewport=new THREE.Vector4(0,0,1280,720),scissor=new THREE.Vector4(3,4,700,500),clear=new THREE.Color('#63837b');let target=null,alpha=.4,fail=false,renders=0,scissorTest=false,animalPass=false;
  const renderer={shadowMap:{enabled:true,autoUpdate:true,needsUpdate:true},xr:{enabled:true},autoClear:false,
    getRenderTarget:()=>target,getViewport:v=>v.copy(viewport),getClearColor:c=>c.copy(clear),getClearAlpha:()=>alpha,
    getScissor:v=>v.copy(scissor),getScissorTest:()=>scissorTest,setScissor:v=>scissor.copy(v),setScissorTest:v=>{scissorTest=v;},
    setRenderTarget:t=>{target=t;},setViewport:v=>viewport.copy(v),setClearColor:(c,a)=>{clear.set(c);alpha=a;},clear(){},
    render(s,c){assert.equal(s,scene);assert.equal(c.isOrthographicCamera,true);assert(scene.overrideMaterial.isMeshDepthMaterial);assert.equal(scene.overrideMaterial.depthPacking,THREE.RGBADepthPacking);assert(!scene.matrixWorldAutoUpdate&&!renderer.shadowMap.enabled);assert(life.visible&&(animalPass?cow.visible&&!resident.visible:resident.visible&&!cow.visible)&&!world.visible&&!hidden.visible&&!sun.visible);assert(scissorTest);assert.deepEqual(viewport.toArray(),scissor.toArray());if(animalPass)assert.deepEqual(viewport.toArray(),[512,0,512,1024]);assert(target.isWebGLRenderTarget);renders++;if(fail)throw new Error('Simulated resident pass failure');}
  };
  const shadow=createCharacterShadows(renderer,scene,resident),camera=new THREE.PerspectiveCamera();camera.position.set(0,2,8);
  const receiving=new THREE.MeshStandardMaterial();shadow.attach(receiving);const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};receiving.onBeforeCompile(shader);
  assert.equal(shader.uniforms.residentDepth.value,shadow.target.texture);assert(shader.vertexShader.includes('residentReceiverPosition=(modelMatrix*residentWorld).xyz'));
  const restored=()=>{assert.equal(target,null);assert.deepEqual(viewport.toArray(),[0,0,1280,720]);assert.deepEqual(scissor.toArray(),[3,4,700,500]);assert(!scissorTest);assert.equal(clear.getHexString(),'63837b');assert.equal(alpha,.4);assert(scene.matrixWorldAutoUpdate&&scene.overrideMaterial===null);assert(world.visible&&cow.visible&&life.visible&&!hidden.visible&&sun.visible);assert(renderer.xr.enabled&&renderer.shadowMap.enabled&&renderer.shadowMap.autoUpdate&&renderer.shadowMap.needsUpdate&&!renderer.autoClear);};
  for(let i=0;i<30;i++){resident.position.x=i*.01;assert(shadow.render(camera,sun));restored();}
  assert.equal(shadow.captures,30,'Character map did not follow each visible pose');assert.equal(renders,30);assert(shadow.uniforms.residentShadowMatrix.value.elements.every(Number.isFinite));
  fail=true;assert.throws(()=>shadow.render(camera,sun),/Simulated resident/);restored();assert.equal(shadow.uniforms.residentShadowEnabled.value,0);fail=false;
  camera.position.set(300,10,300);assert(!shadow.render(camera,sun));assert.equal(shadow.captures,30);
  shadow.setQuality(false);assert.equal(shadow.target.width,512);shadow.setQuality(true);assert.equal(shadow.target.width,1024);
  const animalShadow=createCharacterShadows(renderer,scene,cow,{prefix:'cattle',span:34,sharedTarget:shadow.target,region:[.5,0,.5,1],sharedSampler:true});animalShadow.attach(receiving);
  const combined={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};receiving.onBeforeCompile(combined);
  assert(combined.uniforms.residentDepth&&!combined.uniforms.cattleDepth,'Animal shadow allocated another texture sampler');
  assert.equal((combined.fragmentShader.match(/uniform sampler2D residentDepth;/g)||[]).length,1);
  assert(combined.fragmentShader.includes('float residentProjection()')&&combined.fragmentShader.includes('float cattleProjection()'));
  animalPass=true;camera.position.set(0,2,8);assert(animalShadow.render(camera,sun));restored();fail=true;assert.throws(()=>animalShadow.render(camera,sun),/Simulated resident/);restored();fail=false;
  animalShadow.dispose();shadow.dispose();
}
{
  const scene=new THREE.Scene(),renderer={shadowMap:{}},rig=createLightingRig(scene,renderer);rig.update(0);rig.sun.shadow.needsUpdate=false;
  for(let i=0;i<60;i++)rig.update(0);assert(!rig.sun.shadow.needsUpdate,'Stationary daylight still redraws the entire valley each frame');
  assert(rig.sun.intensity<2.35&&rig.ambient.intensity>.36&&scene.environmentIntensity>.65,'Balanced daylight did not lift indirect shade');
  const camera=new THREE.PerspectiveCamera();camera.position.set(4,2,5);camera.lookAt(0,2,-10);rig.update(0,null,camera);scene.updateMatrixWorld(true);rig.sun.shadow.updateMatrices(rig.sun);
  const origin=new THREE.Vector3(1,0,-3).applyMatrix4(rig.sun.shadow.matrix);
  camera.position.x+=2;rig.update(0,null,camera);scene.updateMatrixWorld(true);rig.sun.shadow.updateMatrices(rig.sun);
  const shifted=new THREE.Vector3(1,0,-3).applyMatrix4(rig.sun.shadow.matrix);
  for(const key of ['x','y']){const pixels=(shifted[key]-origin[key])*rig.sun.shadow.mapSize.x;assert(Math.abs(pixels-Math.round(pixels))<.00001,'Walking shifts the world shadow by fractional texels');}
}
console.log('OK: distant/near glazing hysteresis, isolated current-pose shadow capture and complete render-state restoration, including failure');

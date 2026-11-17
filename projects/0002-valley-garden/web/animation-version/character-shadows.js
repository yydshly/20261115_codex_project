import * as THREE from 'three';

/** The moving resident gets a small, current-pose map, separate from the cached valley. */
export function createCharacterShadows(renderer,scene,resident,{prefix='resident',span=9,actors=()=>[resident],sharedTarget=null,region=[0,0,1,1],sharedSampler=false}={}){
  const target=sharedTarget||new THREE.WebGLRenderTarget(1024/region[2],1024/region[3],{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
  target.texture.name='Resident current-pose depth';target.texture.generateMipmaps=false;target.texture.colorSpace=THREE.NoColorSpace;
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.FrontSide,blending:THREE.NoBlending});depth.toneMapped=false;
  const camera=new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,.1,Math.max(30,span*3)),focus=new THREE.Vector3(),direction=new THREE.Vector3(),actorPosition=new THREE.Vector3();
  const bias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  const uniforms={residentDepth:{value:target.texture},residentShadowMatrix:{value:new THREE.Matrix4()},residentShadowRegion:{value:new THREE.Vector4(...region)},residentShadowTexel:{value:new THREE.Vector2(1/target.width,1/target.height)},residentShadowEnabled:{value:0},residentShadowDebug:{value:0}};
  let high=true,captures=0;
  const rename=source=>source.replaceAll('resident',prefix),shaderUniforms=Object.fromEntries(Object.entries(uniforms).filter(([name])=>!sharedSampler||name!=='residentDepth').map(([name,value])=>[rename(name),value]));
  const attached=new Set();
  function attach(material){
    if(attached.has(material))return;attached.add(material);
    const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey.bind(material);
    material.onBeforeCompile=function(shader,...args){
      previous.call(this,shader,...args);Object.assign(shader.uniforms,shaderUniforms);
      shader.vertexShader=rename('varying vec3 residentReceiverPosition;\n')+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',rename(`#include <project_vertex>
        vec4 residentWorld=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          residentWorld=instanceMatrix*residentWorld;
        #endif
        residentReceiverPosition=(modelMatrix*residentWorld).xyz;
      `));
      let fragment=rename(`varying vec3 residentReceiverPosition;
        uniform sampler2D residentDepth;uniform mat4 residentShadowMatrix;
        uniform vec4 residentShadowRegion;
        uniform vec2 residentShadowTexel;uniform float residentShadowEnabled,residentShadowDebug;
        float residentProjection(){
          if(residentShadowEnabled<.5)return 0.;
          vec4 projected=residentShadowMatrix*vec4(residentReceiverPosition,1.);
          vec3 p=projected.xyz/projected.w;
          if(p.x<=0.||p.x>=1.||p.y<=0.||p.y>=1.||p.z<=0.||p.z>=1.)return 0.;
          float shade=0.;
          for(int x=0;x<2;x++)for(int y=0;y<2;y++){
            vec2 offset=(vec2(float(x),float(y))-.5)*residentShadowTexel*1.35;
            vec4 depthSample=textureLod(residentDepth,residentShadowRegion.xy+p.xy*residentShadowRegion.zw+offset,0.);
            float z=dot(depthSample,vec4(.99609375,.0038909912109375,.00001519918441772461,.00000005960464477539));
            shade+=step(z+.00035,p.z);
          }
          return shade*.25;
        }
      `);
      if(sharedSampler){fragment='uniform sampler2D residentDepth;\n'+fragment.replace(`uniform sampler2D ${prefix}Depth;`,'').replaceAll(`${prefix}Depth,`,'residentDepth,');shader.fragmentShader=shader.fragmentShader.replace('uniform sampler2D residentDepth;','');}
      shader.fragmentShader=fragment+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',rename(`#include <lights_fragment_end>
        float residentShade=residentProjection();
        reflectedLight.directDiffuse*=1.-residentShade*.95;
        reflectedLight.directSpecular*=1.-residentShade*.95;
        reflectedLight.indirectDiffuse*=1.-residentShade*.22;
        reflectedLight.indirectSpecular*=1.-residentShade*.15;
      `));
      shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',rename(`#include <dithering_fragment>
        if(residentShadowDebug>.5)gl_FragColor.rgb=mix(vec3(.04,.08,.4),vec3(1.,.05,.05),residentShade);
      `));
    };
    material.customProgramCacheKey=()=>previousKey()+`|current-${prefix}-shadow-1`;material.needsUpdate=true;
  }
  function render(viewCamera,sun){
    uniforms.residentShadowEnabled.value=0;
    if(!resident.visible||!resident.parent?.visible)return false;
    // All passes consume the same updated skeleton. No animation is advanced in a render pass.
    resident.parent.updateWorldMatrix(true,false);resident.parent.updateMatrixWorld(true);
    const active=actors().filter(a=>a.visible);if(!active.length)return false;focus.set(0,0,0);let distance=Infinity;
    for(const actor of active){actor.getWorldPosition(actorPosition);distance=Math.min(distance,actorPosition.distanceTo(viewCamera.position));focus.add(actorPosition);}focus.divideScalar(active.length);focus.y+=.8;
    if(distance>(high?70:48))return false;
    direction.copy(sun.position).sub(sun.target.position).normalize();camera.position.copy(focus).addScaledVector(direction,Math.max(12,span*1.25));camera.lookAt(focus);camera.updateMatrixWorld(true);
    uniforms.residentShadowMatrix.value.copy(bias).multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
    const visible=scene.children.map(o=>[o,o.visible]),siblings=resident.parent.children.filter(o=>o!==resident).map(o=>[o,o.visible]);
    const saved={target:renderer.getRenderTarget(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor?.(new THREE.Vector4()),scissorTest:renderer.getScissorTest?.(),clear:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,xr:renderer.xr.enabled,shadowEnabled:renderer.shadowMap.enabled,shadowAuto:renderer.shadowMap.autoUpdate,shadowNeeds:renderer.shadowMap.needsUpdate,background:scene.background,override:scene.overrideMaterial,sceneAuto:scene.matrixWorldAutoUpdate};
    try{
      for(const [o]of visible)o.visible=o===resident.parent&&o.visible;
      for(const [o]of siblings)o.visible=false;
      scene.background=null;scene.overrideMaterial=depth;scene.matrixWorldAutoUpdate=false;renderer.xr.enabled=false;renderer.shadowMap.enabled=false;renderer.autoClear=true;
      renderer.setRenderTarget(target);
      const tile=new THREE.Vector4(region[0]*target.width,region[1]*target.height,region[2]*target.width,region[3]*target.height);
      renderer.setViewport(tile);renderer.setScissor?.(tile);renderer.setScissorTest?.(true);
      renderer.setClearColor(0xffffff,1);renderer.clear();renderer.render(scene,camera);
      captures++;uniforms.residentShadowEnabled.value=1;return true;
    }finally{
      for(const [o,v]of visible)o.visible=v;for(const [o,v]of siblings)o.visible=v;
      scene.background=saved.background;scene.overrideMaterial=saved.override;scene.matrixWorldAutoUpdate=saved.sceneAuto;renderer.xr.enabled=saved.xr;renderer.autoClear=saved.autoClear;
      renderer.shadowMap.enabled=saved.shadowEnabled;renderer.shadowMap.autoUpdate=saved.shadowAuto;renderer.shadowMap.needsUpdate=saved.shadowNeeds;
      renderer.setRenderTarget(saved.target);renderer.setViewport(saved.viewport);if(saved.scissor)renderer.setScissor(saved.scissor);if(saved.scissorTest!==undefined)renderer.setScissorTest(saved.scissorTest);renderer.setClearColor(saved.clear,saved.alpha);
    }
  }
  return {attach,render,uniforms,target,camera,get captures(){return captures;},setDebug(value){uniforms.residentShadowDebug.value=Number(value);},setQuality(value){high=value;const size=high?1024:512;target.setSize(size/region[2],size/region[3]);uniforms.residentShadowTexel.value.set(1/target.width,1/target.height);},inspect(){
    const tileX=region[0]*target.width,tileY=region[1]*target.height,tileW=region[2]*target.width,tileH=region[3]*target.height;
    const pixels=new Uint8Array(tileW*tileH*4);renderer.readRenderTargetPixels(target,tileX,tileY,tileW,tileH,pixels);
    let occupied=0,minDepth=1,probeIndex=0;const bounds=new THREE.Box3(),point=new THREE.Vector3();
    const unpack=i=>pixels[i]/255*.99609375+pixels[i+1]/255*.0038909912109375+pixels[i+2]/255*.00001519918441772461+pixels[i+3]/255*.00000005960464477539;
    const unproject=(index,z)=>point.set(((index%tileW)+.5)/tileW*2-1,(Math.floor(index/tileW)+.5)/tileH*2-1,z*2-1).applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld);
    for(let i=0;i<pixels.length;i+=4)if(pixels[i]<254||pixels[i+1]<254||pixels[i+2]<254||pixels[i+3]<254){
      occupied++;const z=unpack(i);bounds.expandByPoint(unproject(i/4,z));if(z<minDepth){minDepth=z;probeIndex=i/4;}
    }
    const ground=unproject(probeIndex,minDepth).clone();ground.addScaledVector(direction,(resident.position.y-ground.y)/direction.y);
    const projected=ground.clone().applyMatrix4(uniforms.residentShadowMatrix.value);
    return {captures,resolution:tileW,enabled:uniforms.residentShadowEnabled.value,occupiedFraction:occupied/(tileW*tileH),depthWorldBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},root:resident.position.toArray(),groundProbe:{world:ground.toArray(),uv:projected.toArray(),sourceDepth:minDepth,occluded:projected.z>minDepth+.00035}};
  },dispose(){if(!sharedTarget)target.dispose();depth.dispose();}};
}

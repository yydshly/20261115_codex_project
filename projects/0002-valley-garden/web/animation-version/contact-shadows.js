import * as THREE from 'three';

/** Static, height-limited geometry occlusion for the managed garden's near-flat ground. */
export function createGeometryContactShadows(renderer,scene){
  const bounds=new THREE.Vector4(-14,14,-24,9),width=768,height=1024;
  const options={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false};
  const target=new THREE.WebGLRenderTarget(width,height,options),scratch=target.clone();
  target.texture.name='Garden low-geometry contact occlusion';
  const camera=new THREE.OrthographicCamera(-14,14,16.5,-16.5,.1,16);
  camera.position.set(0,12,-7.5);camera.up.set(0,0,-1);camera.lookAt(0,.18,-7.5);camera.updateMatrixWorld();
  const cache=new Map();
  function caster(source){
    if(cache.has(source))return cache.get(source);
    const material=new THREE.ShaderMaterial({
      uniforms:{alphaMap:{value:source.alphaMap},baseMap:{value:source.map},useAlpha:{value:source.alphaMap?1:0},
        useBase:{value:source.map?1:0},cutoff:{value:source.alphaTest||.01},
        opacity:{value:source.transmission>.1?0:(source.opacity??1)}},
      vertexShader:`varying vec2 contactUv;varying float contactHeight;
        void main(){contactUv=uv;vec4 world=vec4(position,1.);
          #ifdef USE_INSTANCING
            world=instanceMatrix*world;
          #endif
          world=modelMatrix*world;contactHeight=world.y-.18;
          gl_Position=projectionMatrix*viewMatrix*world;
        }`,
      fragmentShader:`varying vec2 contactUv;varying float contactHeight;
        uniform sampler2D alphaMap,baseMap;uniform float useAlpha,useBase,cutoff,opacity;
        void main(){
          float influence=pow(1.-smoothstep(.015,1.15,contactHeight),2.);
          if(influence<.004)discard;
          float alpha=opacity;
          if(useAlpha>.5)alpha*=texture2D(alphaMap,contactUv).g;
          if(useBase>.5)alpha*=texture2D(baseMap,contactUv).a;
          if(alpha<cutoff)discard;
          gl_FragColor=vec4(vec3(1.-influence*.84),1.);
        }`,
      side:THREE.DoubleSide,depthTest:false,depthWrite:false,transparent:true,toneMapped:false,
      blending:THREE.CustomBlending,blendEquation:THREE.MinEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor
    });
    cache.set(source,material);return material;
  }
  const blurMaterial=new THREE.ShaderMaterial({
    uniforms:{inputMap:{value:target.texture},stepUv:{value:new THREE.Vector2()}},depthTest:false,depthWrite:false,toneMapped:false,
    vertexShader:'varying vec2 blurUv;void main(){blurUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`varying vec2 blurUv;uniform sampler2D inputMap;uniform vec2 stepUv;
      void main(){vec3 c=texture2D(inputMap,blurUv).rgb*.227027;
        c+=(texture2D(inputMap,blurUv+stepUv*1.384615).rgb+texture2D(inputMap,blurUv-stepUv*1.384615).rgb)*.316216;
        c+=(texture2D(inputMap,blurUv+stepUv*3.230769).rgb+texture2D(inputMap,blurUv-stepUv*3.230769).rgb)*.070270;
        gl_FragColor=vec4(c,1.);
      }`
  });
  const blurScene=new THREE.Scene(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),blurMaterial);quad.frustumCulled=false;blurScene.add(quad);
  let captures=0;
  function bake(roots){
    const visible=scene.children.map(o=>[o,o.visible]),materials=[],hidden=[];
    const oldTarget=renderer.getRenderTarget(),oldClear=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();
    const oldAuto=renderer.autoClear,oldShadows=renderer.shadowMap.autoUpdate,oldXr=renderer.xr.enabled;
    const oldViewport=renderer.getViewport(new THREE.Vector4()),oldBackground=scene.background;
    try{
      for(const [o] of visible)o.visible=roots.includes(o)&&o.visible;
      for(const root of roots)root.traverse(o=>{
        if(!o.isMesh)return;
        if(o.userData.contactCaster===false){hidden.push([o,o.visible]);o.visible=false;return;}
        const source=o.material;materials.push([o,source]);o.material=Array.isArray(source)?source.map(caster):caster(source);
      });
      scene.background=null;renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.autoClear=true;
      renderer.setClearColor(0xffffff,1);renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
      blurMaterial.uniforms.inputMap.value=target.texture;blurMaterial.uniforms.stepUv.value.set(.85/width,0);
      renderer.setRenderTarget(scratch);renderer.render(blurScene,camera);
      blurMaterial.uniforms.inputMap.value=scratch.texture;blurMaterial.uniforms.stepUv.value.set(0,.85/height);
      renderer.setRenderTarget(target);renderer.render(blurScene,camera);captures++;
    }finally{
      for(const [o,material] of materials)o.material=material;
      for(const [o,value] of hidden)o.visible=value;
      for(const [o,value] of visible)o.visible=value;
      scene.background=oldBackground;renderer.autoClear=oldAuto;renderer.shadowMap.autoUpdate=oldShadows;renderer.xr.enabled=oldXr;
      renderer.setRenderTarget(oldTarget);renderer.setViewport(oldViewport);renderer.setClearColor(oldClear,oldAlpha);
    }
  }
  return {texture:target.texture,bounds,bake,get captures(){return captures;},inspect(){
    const pixels=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
    let min=255,dark=0,sum=0;
    for(let i=0;i<pixels.length;i+=4){const v=pixels[i];min=Math.min(min,v);sum+=v;if(v<248)dark++;}
    const sample=(x,z)=>{const col=Math.round((x-bounds.x)/(bounds.y-bounds.x)*(width-1)),row=Math.round((bounds.w-z)/(bounds.w-bounds.z)*(height-1));return pixels[(row*width+col)*4];};
    return {captures,min,mean:Math.round(sum/(width*height)),coveredFraction:+(dark/(width*height)).toFixed(3),house:sample(0,-10),openLawn:sample(5,0)};
  },dispose(){
    target.dispose();scratch.dispose();quad.geometry.dispose();blurMaterial.dispose();for(const m of cache.values())m.dispose();cache.clear();
  }};
}

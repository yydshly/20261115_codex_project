import * as THREE from 'three';

// A light finishing pass keeps near silhouettes legible and lets distant pigment dissolve.
export function createInkFinish(renderer){
 const depth=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthTexture:depth,depthBuffer:true,stencilBuffer:false});
 const uniforms={tColor:{value:target.texture},tDepth:{value:depth},uPixel:{value:new THREE.Vector2(1,1)},uSize:{value:new THREE.Vector2(1,1)},uNear:{value:.1},uFar:{value:420}};
 const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:true,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D tColor;uniform sampler2D tDepth;uniform vec2 uPixel;uniform vec2 uSize;uniform float uNear;uniform float uFar;varying vec2 vUv;
   #include <common>
   #include <packing>
   float distanceAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDepth,uv).x,uNear,uFar);}
   float paper(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
   void main(){
    vec3 base=texture2D(tColor,vUv).rgb;
    vec3 left=texture2D(tColor,vUv-vec2(uPixel.x,0)).rgb,right=texture2D(tColor,vUv+vec2(uPixel.x,0)).rgb;
    float d=distanceAt(vUv),dx=abs(distanceAt(vUv+vec2(uPixel.x,0))-distanceAt(vUv-vec2(uPixel.x,0))),dy=abs(distanceAt(vUv+vec2(0,uPixel.y))-distanceAt(vUv-vec2(0,uPixel.y)));
    float edge=smoothstep(.004,.028,(dx+dy)/max(d,.3))*(1.-smoothstep(22.,70.,d));
    vec3 ink=base*vec3(.63,.69,.67)+vec3(.004,.009,.007);
    vec3 color=mix(base,ink,edge*.32);
    color=mix(color,(left+base*2.+right)*.25,.055);
    color+=max((left+right)*.5-vec3(1.05),vec3(0.))*.025;
    float grain=paper(floor(vUv*uSize*.8))-.5;
    color*=vec3(1.012,1.008,.993)*(1.+grain*.024);
    gl_FragColor=vec4(max(color,vec3(0.)),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const stage=new THREE.Scene(),camera=new THREE.Camera(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);quad.frustumCulled=false;stage.add(quad);
 const size=new THREE.Vector2();
 return{
  resize(){renderer.getDrawingBufferSize(size);target.setSize(size.x,size.y);uniforms.uPixel.value.set(1/size.x,1/size.y);uniforms.uSize.value.copy(size);},
  render(scene,camera3d){uniforms.uNear.value=camera3d.near;uniforms.uFar.value=camera3d.far;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera3d);renderer.setRenderTarget(null);renderer.render(stage,camera);},
  dispose(){target.dispose();material.dispose();quad.geometry.dispose();}
 };
}

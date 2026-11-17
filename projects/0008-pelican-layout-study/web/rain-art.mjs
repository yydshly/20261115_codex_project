import * as THREE from 'three';

// Pigment is anchored to the modeled surface, so it stays still when the camera moves.
export function paintMaterial(color,options={}){
 const material=new THREE.MeshStandardMaterial({color,roughness:.83,flatShading:false,...options});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vWashWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
   vec4 washPosition=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
    washPosition=instanceMatrix*washPosition;
   #endif
   vWashWorld=(modelMatrix*washPosition).xyz;
   #include <project_vertex>`);
  shader.fragmentShader=`varying vec3 vWashWorld;
   float washHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
   float washNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(washHash(i),washHash(i+vec2(1,0)),f.x),mix(washHash(i+vec2(0,1)),washHash(i+1.0),f.x),f.y);}
   `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 washUv=vWashWorld.xz+vec2(vWashWorld.y*.21,vWashWorld.y*.47);
   float pigment=washNoise(washUv*3.2)*.65+washNoise(washUv*15.0)*.35;
   diffuseColor.rgb*=mix(.79,1.13,pigment);
   diffuseColor.rgb+=vec3(.014,.012,.007)*(1.0-pigment);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
   #ifdef USE_FOG
    float washDistance=length(cameraPosition-vWashWorld);
    float groundMist=exp(-max(vWashWorld.y,0.0)*.9)*smoothstep(5.0,45.0,washDistance)*.18;
    gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,groundMist);
   #endif`);
 };
 return material;
}

export function surfaceTexture(kind,random){
 const c=document.createElement('canvas');c.width=c.height=512;const cx=c.getContext('2d');
 const bases={wood:'#b8ad98',stone:'#c4c9bd',cloth:'#ddd2b5',umbrella:'#dbc29b'};cx.fillStyle=bases[kind]||bases.stone;cx.fillRect(0,0,512,512);
 for(let i=0;i<1750;i++){
  const x=random()*512,y=random()*512,r=2+random()*22;
  const g=cx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(45,66,53,${random()*.09})`);g.addColorStop(1,'rgba(45,66,53,0)');cx.fillStyle=g;cx.fillRect(x-r,y-r,r*2,r*2);
 }
 for(let i=0;i<3200;i++){
  const x=random()*512,y=random()*512;cx.strokeStyle=`rgba(${kind==='wood'?'55,39,25':'58,70,52'},${.025+random()*.10})`;cx.lineWidth=.35+random()*.8;cx.beginPath();cx.moveTo(x,y);
  if(kind==='wood')cx.bezierCurveTo(x+3,y+15,x-2,y+35,x+random()*3,y+40+random()*100);
  else if(kind==='cloth'||kind==='umbrella')cx.lineTo(x+(i%2?1:18),y+(i%2?18:1));
  else cx.lineTo(x+random()*10-5,y+random()*9-4);cx.stroke();
 }
 if(kind==='wood')for(let i=0;i<6;i++){const x=random()*512,y=random()*512;cx.strokeStyle='#68543b30';cx.lineWidth=1;for(let r=3;r<15;r+=3){cx.beginPath();cx.ellipse(x,y,r,r*3.5,0,0,Math.PI*2);cx.stroke();}}
 const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;
 texture.repeat.set(kind==='wood'?1:kind==='stone'?11:2,kind==='wood'?3:kind==='stone'?11:2);texture.anisotropy=4;return texture;
}

export function roundedBox(w,h,d,r=.06){
 const geometry=new THREE.BoxGeometry(w,h,d,5,5,5),p=geometry.attributes.position,n=geometry.attributes.normal,half=new THREE.Vector3(w/2-r,h/2-r,d/2-r),v=new THREE.Vector3(),core=new THREE.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);core.set(THREE.MathUtils.clamp(v.x,-half.x,half.x),THREE.MathUtils.clamp(v.y,-half.y,half.y),THREE.MathUtils.clamp(v.z,-half.z,half.z));v.sub(core).normalize();n.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(r).add(core);p.setXYZ(i,v.x,v.y,v.z);}return geometry;
}

export function wetStoneGeometry(){
 const g=new THREE.CylinderGeometry(1,.98,1,20,3),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),r=1+.055*Math.sin(a*3)+.045*Math.cos(a*7),y=p.getY(i),bevel=1-.08*Math.pow(Math.abs(y)*2,5);p.setXYZ(i,x*r*bevel,y,z*r*bevel);}g.computeVertexNormals();return g;
}

export function makeMist(scene){
 const uniforms={uTime:{value:0},uColor:{value:new THREE.Color('#c1d4cb')},uOpacity:{value:.13}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:'varying vec2 vUv; varying vec3 vWorld; void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 vUv;varying vec3 vWorld;uniform float uTime;uniform vec3 uColor;uniform float uOpacity;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
   void main(){float cloud=noise(vec2(vUv.x*5.+uTime*.021,vUv.y*2.2+uTime*.007)+vWorld.z*.13);float edge=pow(max(0.,1.-pow(abs(vUv.x-.5)*2.,3.)),2.)*sin(vUv.y*3.14159);float alpha=edge*smoothstep(.18,.86,cloud)*uOpacity;gl_FragColor=vec4(uColor,alpha);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
 const planes=[];
 for(const [x,y,z,w,h]of[[-2,.85,-9,17,2.6],[2,1.2,-17,19,3.3],[-1,.95,-25,22,3.1],[0,.6,-36,45,2.5],[0,1.3,-65,110,4],[0,.6,-91,235,5],[0,1.8,-118,270,7]]){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);m.position.set(x,y,z);m.renderOrder=2;scene.add(m);planes.push(m);
 }
 return{update(t,color,river){uniforms.uTime.value=t;uniforms.uColor.value.copy(color);uniforms.uOpacity.value=.12+river*.035;},planes};
}

export function makeLightShaft(scene,from,to,radius=2.2){
 const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),length=a.distanceTo(b);
 const uniforms={uColor:{value:new THREE.Color('#dfd8ab')},uStrength:{value:.065}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
  vertexShader:'varying vec3 vNormal;varying vec3 vWorld;varying vec2 vUv;void main(){vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec3 vNormal;varying vec3 vWorld;varying vec2 vUv;uniform vec3 uColor;uniform float uStrength;void main(){vec3 view=normalize(cameraPosition-vWorld);float facing=pow(abs(dot(normalize(vNormal),view)),1.7);float ends=smoothstep(0.,.20,vUv.y)*(1.-smoothstep(.70,1.,vUv.y));gl_FragColor=vec4(uColor,facing*ends*uStrength);}' });
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.1,radius,length,32,1,true),material);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),a.clone().sub(b).normalize());scene.add(mesh);return{mesh,uniforms};
}

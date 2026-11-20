import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {atmosphereView,cycloneCenter,cycloneWind,findAtmosphereStop,mirageEye,mirageSheet,opticalAngles,tornadoCenter} from './atmosphere-study.js';

const random=(i,k)=>{const n=Math.sin(i*94.33+k*23.79)*48734.63;return n-Math.floor(n);};
const noiseGLSL=`
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){
    vec2 f=fract(p),i=floor(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
      mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
  }
  float billow(vec2 p){return .54*noise(p)+.30*noise(p*2.1)+.16*noise(p*4.2);}
`;
const planeVertex=`
  varying vec2 vUv;
  void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;

function cloudDeck({x,y,z,size,spiral,seed}){
  const material=new THREE.ShaderMaterial({
    uniforms:{t:{value:0},strength:{value:1},spiral:{value:spiral},seed:{value:seed}},
    transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:planeVertex,
    fragmentShader:`
      varying vec2 vUv;
      uniform float t,strength,spiral,seed;
      ${noiseGLSL}
      void main(){
        vec2 p=(vUv-.5)*2.;float r=length(p);
        float edge=1.-smoothstep(.72,1.,r);
        float a=atan(p.y,p.x);
        float n=billow(p*9.+seed+vec2(t*.022,-t*.011));
        float alpha;
        if(spiral>.5){
          float eye=smoothstep(.126,.185,r);
          float w=(r-.232)/.085,wall=exp(-w*w);
          float arm=pow(.5+.5*cos(a*3.0+log(max(r,.10))*6.1-t*.56),3.);
          float bands=smoothstep(.12,.43,r)*arm*.88;
          float core=wall*strength+bands*(.16+.84*strength);
          alpha=eye*edge*smoothstep(.29,.77,core*1.15+n*.62)*(.29+.71*strength);
        }else{
          alpha=edge*smoothstep(.17,.71,n+max(0.,.33*(1.-r)))*.92;
        }
        vec3 dark=vec3(.18,.23,.28),light=vec3(.68,.73,.77);
        vec3 color=mix(dark,light,smoothstep(.16,.88,n));
        if(spiral>.5)color=mix(color,vec3(.91,.94,.99),.58);
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size,size),material);
  mesh.rotation.x=-Math.PI/2;
  mesh.position.set(x,y,z);
  if(spiral)mesh.renderOrder=31;
  return mesh;
}

function funnel(radius,height,x,y,z,dust=false){
  const geometry=new THREE.CylinderGeometry(1,1,1,42,22,true);
  geometry.translate(0,.5,0);
  const material=new THREE.ShaderMaterial({
    uniforms:{t:{value:0},radius:{value:radius},height:{value:height},dust:{value:Number(dust)}},
    vertexShader:`
      uniform float t,radius,height,dust;
      varying vec2 vUv;
      void main(){
        vUv=uv;
        float h=position.y;
        float taper=dust>.5?(1.0-.64*h):(.10+.29*h+.61*pow(h,4.4));
        float angle=uv.x*6.283185;
        float perturb=.93+.10*sin(angle*5.+h*11.+t*1.7)+.06*cos(angle*9.-h*23.);
        vec3 p=position;
        p.xz*=radius*taper*perturb;
        p.x+=sin(h*3.3)*height*.11+sin(t*1.15+h*5.)*h*3.;
        p.z-=sin(h*3.86)*height*.096;
        p.y*=height;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
    fragmentShader:`
      uniform float t,dust;
      varying vec2 vUv;
      ${noiseGLSL}
      void main(){
        vec2 p=vec2(cos(vUv.x*6.283-t*1.8),sin(vUv.x*6.283-t*1.8));
        float cloud=billow(p*4.2+vec2(vUv.y*8.,vUv.y*25.-t*1.15));
        vec3 color=mix(vec3(.15,.18,.19),vec3(.54,.55,.54),cloud);
        float alpha=smoothstep(.15,.76,cloud+.21)*(.76+.24*vUv.y);
        if(dust>.5){
          color=mix(vec3(.29,.23,.15),vec3(.61,.52,.36),cloud);
          alpha*=.73*(1.-smoothstep(.32,1.,vUv.y));
        }
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side:THREE.DoubleSide,transparent:true,depthWrite:false
  });
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.set(x,y,z);
  mesh.frustumCulled=false;
  return mesh;
}

function rainCurtain(x,y,z,size,spiral){
  const geometry=new THREE.PlaneGeometry(size,88,1,1);
  const group=new THREE.Group();
  for(let i=0;i<(spiral?7:3);i++){
    const a=spiral?i*2.399:i*.54, r=spiral?128+i*26:55+i*29;
    const material=new THREE.ShaderMaterial({
      uniforms:{t:{value:0},strength:{value:1},seed:{value:i*7.7}},
      transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:planeVertex,
      fragmentShader:`
        varying vec2 vUv;uniform float t,strength,seed;
        ${noiseGLSL}
        void main(){
          vec2 p=vUv;float n=billow(vec2(p.x*19.+p.y*2.2,seed+t*.30));
          float shape=smoothstep(0.,.24,p.x)*(1.-smoothstep(.74,1.,p.x))*smoothstep(0.,.82,p.y);
          float streak=pow(.5+.5*sin((p.x+p.y*.08)*104.+seed),4.);
          gl_FragColor=vec4(.46,.52,.54,shape*strength*(n*.25+streak*.044));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(x+Math.cos(a)*r,y,z+Math.sin(a)*r);
    mesh.rotation.y=-a;
    group.add(mesh);
  }
  return group;
}

function mirageBand(){
  const positions=[],uv=[],indices=[];
  const width=118,segments=80;
  for(let i=0;i<=segments;i++){
    const u=i/segments,z=mirageSheet.z+(u-.5)*width;
    const x=mirageSheet.x+Math.abs(z-mirageSheet.z)*.13,y=terrainHeight(x,z);
    positions.push(x,y+.03,z,x,y+2.7,z);
    uv.push(u,0,u,1);
    if(i<segments){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
  }
  const geometry=new THREE.BufferGeometry().setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const material=new THREE.ShaderMaterial({
    uniforms:{t:{value:0},strength:{value:1}},
    transparent:true,side:THREE.DoubleSide,depthWrite:false,vertexShader:planeVertex,
    fragmentShader:`
      varying vec2 vUv;uniform float t,strength;
      void main(){
        vec2 p=vUv;
        float wave=sin(p.x*71.+t*2.)*.08+sin(p.x*167.-t*3.)*.032;
        float outline=.38+sin(p.x*34.0)*.12+cos(p.x*78.0+t*.80)*.076+wave;
        float fade=smoothstep(.02,.21,p.x)*(1.-smoothstep(.70,.99,p.x));
        float height=smoothstep(.01,.24,p.y)*(1.-smoothstep(.58+.7*wave,.85+.7*wave,p.y));
        vec3 color=mix(vec3(.18,.36,.38),vec3(.62,.79,.86),smoothstep(outline-.07,outline+.09,p.y));
        gl_FragColor=vec4(color,height*fade*strength*.8);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  return new THREE.Mesh(geometry,material);
}

function windArrows(){
  const entries=[];
  for(const [radius,count] of [[82,9],[139,12],[215,13],[300,15],[389,16]]){
    for(let i=0;i<count;i++){
      const theta=(i/count+radius*.003)*Math.PI*2;
      const x=cycloneCenter.x+Math.cos(theta)*radius,z=cycloneCenter.z+Math.sin(theta)*radius;
      const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),
        new THREE.Vector3(x,Math.max(0,terrainHeight(x,z))+28,z),20,0xa7ecff,5,3);
      arrow.line.material.depthTest=arrow.cone.material.depthTest=false;
      arrow.line.material.depthWrite=arrow.cone.material.depthWrite=false;
      arrow.line.material.fog=arrow.cone.material.fog=false;
      arrow.cone.material.transparent=arrow.line.material.transparent=true;
      arrow.line.renderOrder=arrow.cone.renderOrder=51;
      entries.push({x,z,arrow});
    }
  }
  return entries;
}

export function createAtmosphereScene(scene,sky,{reduced=false}={}){
  const {opticalMode,opticalStrength}=sky.material.uniforms;
  const root=new THREE.Group();
  root.name='optical-and-severe-weather';
  root.visible=false;scene.add(root);
  const groups={};
  let mode=null,enabled=true,age=0,arrows=[],cycloneClouds=[];
  const direction=new THREE.Vector3();
  const mirageGround=terrainHeight(mirageEye.x,mirageEye.z);

  function group(name){
    const g=new THREE.Group();
    g.name=name;root.add(g);return g;
  }

  function layer(id){
    if(groups[id])return groups[id];
    const g=groups[id]=group(id);
    if(id==='rainbow'){
      const [x,z]=atmosphereView(findAtmosphereStop(id)),y=terrainHeight(x,z);
      g.add(rainCurtain(x,y+52,z,184,false));
    }
    if(id==='mirage')g.add(mirageBand());
    if(id==='tornado'){
      const {x,z}=tornadoCenter,y=terrainHeight(x,z);
      g.add(rainCurtain(x-81,y+51,z-72,130,false));
      g.add(cloudDeck({x:x-14,y:y+121,z:z-23,size:402,spiral:0,seed:3.1}));
      g.add(cloudDeck({x:x+7,y:y+102,z:z+4,size:275,spiral:0,seed:7.7}));
      const vortex=new THREE.Group();
      vortex.name='rotating-funnel';
      vortex.add(funnel(45,115,x,y-.32,z),funnel(37,107,x+1.8,y,z),funnel(19,10,x,y+.12,z,true));
      g.add(vortex);
    }
    if(id==='cyclone'){
      const {x,z}=cycloneCenter;
      g.add(rainCurtain(x,46,z,136,true));
      cycloneClouds=[
        cloudDeck({x,y:88,z,size:875,spiral:1,seed:1.8}),
        cloudDeck({x,y:118,z,size:943,spiral:1,seed:4.8}),
        cloudDeck({x,y:140,z,size:940,spiral:1,seed:7.1})
      ];
      g.add(...cycloneClouds);
      arrows=windArrows();
      for(const {arrow} of arrows)g.add(arrow);
    }
    return g;
  }

  function show(id,condition,vectors,shore){
    if(mode!==id)age=0;
    mode=id;enabled=condition;root.visible=true;
    opticalMode.value=id==='rainbow'?1:id==='halo'?2:0;
    opticalStrength.value=condition?1:0;
    sky.material.uniforms.opticalRadius.value.set(opticalAngles.rainbow,opticalAngles.halo);
    const current=layer(id);
    for(const g of Object.values(groups))g.visible=g===current;
    if(id==='rainbow')current.visible=condition;
    if(id==='tornado')current.getObjectByName('rotating-funnel').visible=condition;
    if(id==='cyclone'){
      for(const cloud of cycloneClouds)cloud.material.depthTest=shore;
      for(const {x,z,arrow} of arrows){
        const v=cycloneWind(x,z,condition);
        arrow.visible=vectors&&!shore;
        arrow.setDirection(direction.set(v.x,0,v.z).normalize());
        arrow.setLength(9+v.speed*41,4+v.speed*7,3+v.speed*5);
        arrow.setColor(v.speed>.55?0x95611c:0x31567a);
      }
    }
  }

  return {
    show,
    update(dt){
      if(!mode)return;
      if(!reduced)age+=dt;
      groups[mode].traverse(object=>{
        const uniforms=object.material?.uniforms;
        if(uniforms?.t)uniforms.t.value=age;
        if(mode==='cyclone'&&uniforms?.strength)uniforms.strength.value=enabled?1:.24;
      });
    },
    project(camera){
      if(mode!=='mirage')return;
      const strength=enabled?1-THREE.MathUtils.smoothstep(camera.position.y,mirageGround+8,mirageGround+25):0;
      groups.mirage.children[0].material.uniforms.strength.value=strength;
    },
    hide(){mode=null;root.visible=false;opticalMode.value=0;opticalStrength.value=0;}
  };
}

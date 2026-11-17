import * as THREE from 'three';
import { createStreamFlow,streamSurfaceOffset } from './stream-flow.js';
import { riffleCentres } from './stream-profile.js';

const fract=v=>v-Math.floor(v),hash=i=>fract(Math.sin(i*127.1+13.7)*43758.5453);

/** Visible surface advection, rather than a stationary shimmer on a flat mirror. */
export function createStreamMotion(scene,{riverX,riverWidth}){
  const flow=createStreamFlow(riverX,riverWidth),dummy=new THREE.Object3D(),p={};let rocks=[];
  const leafGeometry=new THREE.BufferGeometry();leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.004,-.052,-.025,0,-.008,0,.003,.058,.025,0,-.008],3));leafGeometry.setIndex([0,1,2,0,2,3]);leafGeometry.computeVertexNormals();
  const drift=new THREE.InstancedMesh(leafGeometry,new THREE.MeshStandardMaterial({color:'#81764f',roughness:.94,side:THREE.DoubleSide}),16);
  drift.name='Fallen leaves following the stream current';drift.receiveShadow=true;drift.frustumCulled=false;scene.add(drift);
  const colour=new THREE.Color();for(let i=0;i<16;i++){colour.setHSL(.13+(i%4)*.011,.17+(i%3)*.07,.22+(i%5)*.025);drift.setColorAt(i,colour);}
  const foamGeometry=new THREE.CircleGeometry(1,8);foamGeometry.rotateX(-Math.PI/2);
  const opacity=new THREE.InstancedBufferAttribute(new Float32Array(364),1);foamGeometry.setAttribute('flowOpacity',opacity);
  const foamMaterial=new THREE.MeshStandardMaterial({color:'#d4dfd6',roughness:1,transparent:true,opacity:.60,depthWrite:false,side:THREE.DoubleSide});
  foamMaterial.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float flowOpacity;varying float movingFoamAlpha;varying vec2 movingFoamUv;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmovingFoamAlpha=flowOpacity;movingFoamUv=uv;');
    shader.fragmentShader='varying float movingFoamAlpha;varying vec2 movingFoamUv;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a*=movingFoamAlpha*(1.-smoothstep(.25,1.,length(movingFoamUv*2.-1.)));if(diffuseColor.a<.008)discard;');
  };
  foamMaterial.customProgramCacheKey=()=> 'advected-stream-foam-1';
  const foam=new THREE.InstancedMesh(foamGeometry,foamMaterial,364);foam.name='Moving broken foam through riffles and around stones';foam.receiveShadow=true;foam.frustumCulled=false;scene.add(foam);
  const strands=160,segments=6,vertices=(segments+1)*2,positions=new Float32Array(strands*vertices*3),alphas=new Float32Array(strands*vertices),indices=[];
  for(let i=0;i<strands;i++)for(let j=0;j<segments;j++){const a=i*vertices+j*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  const ribbonGeometry=new THREE.BufferGeometry();ribbonGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));ribbonGeometry.setAttribute('flowAlpha',new THREE.BufferAttribute(alphas,1));ribbonGeometry.setIndex(indices);
  const ribbonMaterial=new THREE.MeshBasicMaterial({color:'#c5d8cd',transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide,toneMapped:true});
  ribbonMaterial.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float flowAlpha;varying float strandAlpha;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstrandAlpha=flowAlpha;');
    shader.fragmentShader='varying float strandAlpha;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a*=strandAlpha;');
  };
  ribbonMaterial.customProgramCacheKey=()=> 'curved-advected-stream-threads-1';
  const ribbons=new THREE.Mesh(ribbonGeometry,ribbonMaterial);ribbons.name='Short curved surface threads separating around rocks';ribbons.frustumCulled=false;ribbons.userData.omitFromReflection=true;scene.add(ribbons);
  const q={};
  function update(time){
    for(let i=0;i<16;i++){
      const side=Math.sin(i*7.73)*.67,clock=i/16*flow.duration+time*(1-.55*side*side);flow.sample(clock,side,p);
      dummy.position.set(p.x,-.05+streamSurfaceOffset(p.z,p.side,time)+.007,p.z);
      dummy.rotation.set(Math.sin(time*.7+i)*.022,Math.atan2(p.tx,p.tz)+i*2.4+Math.sin(time*.17+i)*.18,Math.cos(time*.63+i)*.025);dummy.scale.setScalar(.72+(i%5)*.14);dummy.updateMatrix();drift.setMatrixAt(i,dummy.matrix);
    }
    drift.instanceMatrix.needsUpdate=true;
    const sources=[...rocks.map(r=>({...r,kind:'rock'})),...riffleCentres.map(z=>({z,kind:'riffle'}))];
    for(let i=0;i<364;i++){
      const source=sources[i%sources.length],lifetime=3.7+hash(i+4)*2.2,age=fract(time/lifetime+hash(i+11));
      let side,startZ;
      if(source.kind==='rock'){
        side=(source.x-riverX(source.z))/riverWidth(source.z)+(i%2?-1:1)*source.radius*(.7+hash(i+2)*.65)/riverWidth(source.z);
        startZ=source.z-source.radius*2.2;
      }else{side=(hash(i+17)-.5)*1.45;startZ=source.z-2.4;}
      side=Math.max(-.82,Math.min(.82,side));flow.sample(flow.timeAtZ(startZ)+age*lifetime*(1-.55*side*side),side,p);
      dummy.position.set(p.x,-.05+streamSurfaceOffset(p.z,p.side,time)+.004,p.z);dummy.rotation.set(0,Math.atan2(p.tx,p.tz),0);
      dummy.scale.set(.018+hash(i)*.018,1,.065+hash(i+9)*.075);dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix);
      opacity.setX(i,THREE.MathUtils.smoothstep(age,0,.12)*(1-THREE.MathUtils.smoothstep(age,.74,1))*(.50+hash(i+8)*.45));
    }
    foam.instanceMatrix.needsUpdate=true;opacity.needsUpdate=true;
    for(let i=0;i<strands;i++){
      const rock=rocks.length&&i<80?rocks[i%rocks.length]:null,life=5.2+hash(i+99)*3.2,age=fract(time/life+hash(i+91));
      const z=rock?rock.z-rock.radius*2.4:i<128?riffleCentres[i%riffleCentres.length]-2.5:-55+hash(i+3)*120;
      let side=rock?(rock.x-riverX(rock.z))/riverWidth(rock.z)+(i%2?1:-1)*rock.radius*(1.05+hash(i+45)*.45)/riverWidth(rock.z):(hash(i+22)-.5)*1.55;
      side=Math.max(-.82,Math.min(.82,side));
      const clock=flow.timeAtZ(z)+age*life*(1-.55*side*side),length=.38+hash(i+41)*.65,width=.009+hash(i+5)*.016;
      const fade=THREE.MathUtils.smoothstep(age,0,.13)*(1-THREE.MathUtils.smoothstep(age,.72,1)),strength=rock?.65:i<128?.36:.16;
      for(let j=0;j<=segments;j++){
        const u=j/segments;flow.sample(clock-u*length,side,q);
        const halfWidth=width*Math.sin(Math.PI*u),y=-.05+streamSurfaceOffset(q.z,q.side,time)+.009;
        for(let k=0;k<2;k++){const n=i*vertices+j*2+k,sign=k?1:-1;positions[n*3]=q.x+q.tz*halfWidth*sign;positions[n*3+1]=y;positions[n*3+2]=q.z-q.tx*halfWidth*sign;alphas[n]=fade*strength*Math.sin(Math.PI*u)*( .72+.28*Math.sin(i*7.+u*15.+time*1.7));}
      }
    }
    ribbonGeometry.attributes.position.needsUpdate=true;ribbonGeometry.attributes.flowAlpha.needsUpdate=true;
  }
  update(0);
  return {flow,drift,foam,ribbons,update,setObstacles(value){rocks=value;flow.setObstacles(value);},setQuality(high){foam.count=high?364:182;ribbonGeometry.setDrawRange(0,indices.length*(high?1:.5));}};
}

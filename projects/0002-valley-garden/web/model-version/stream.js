import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { tiledMaterialMaps } from './nature.js';
import { budgetReflections } from './reflection-budget.js';
import { streamBedProfileAt,createStreamProfileTexture } from './stream-profile.js';
import { streamSurfaceGLSL } from './stream-flow.js';
import { createStreamMotion } from './stream-motion.js';

/** Realtime reflected water over a separate, shadow-receiving gravel stream bed. */
export function createStream(scene,nature,{riverX,riverWidth}){
  const positions=[],uv=[],indices=[],bottom=[],flows=[],rows=[],across=24;
  for(let z=-650;z<350;z+=z>-80&&z<100?.35:1.8)rows.push(z);rows.push(350);
  const sections=rows.length-1;
  let arcLength=0,previousZ=-650,previousX=riverX(previousZ);
  for(let i=0;i<=sections;i++){
    const z=rows[i],w=riverWidth(z),cx=riverX(z);
    if(i)arcLength+=Math.hypot(z-previousZ,cx-previousX);
    previousZ=z;previousX=cx;
    for(let j=0;j<=across;j++){
      const t=j/across,x=cx+(t*2-1)*w,profile=streamBedProfileAt(z,t),depth=profile.depth;
      // Metres across the channel, and cumulative centre-line arc length downstream.
      positions.push(x,-z,0);uv.push((t*2-1)*w,arcLength);
      flows.push(t*2-1,profile.riffle);
      bottom.push(x,-.05-depth,z);
      if(i<sections&&j<across){const a=i*(across+1)+j;indices.push(a,a+across+1,a+1,a+1,a+across+1,a+across+2);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  geometry.setAttribute('streamFlow',new THREE.Float32BufferAttribute(flows,2));
  const bedGeometry=new THREE.BufferGeometry();bedGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bottom,3));
  const bedUv=[];for(let i=0;i<bottom.length;i+=3)bedUv.push(bottom[i]*.65,bottom[i+2]*.65);
  bedGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(bedUv,2));bedGeometry.setIndex(indices);bedGeometry.computeVertexNormals();
  const bed=new THREE.Mesh(bedGeometry,new THREE.MeshStandardMaterial({...tiledMaterialMaps(nature.gravel,1),color:'#8b978b',roughness:1,normalScale:new THREE.Vector2(.65,.65),side:THREE.DoubleSide}));bed.receiveShadow=true;bed.name='Contoured gravel river bed';scene.add(bed);
  const data=new Uint8Array([128,128,255,255]);const normal=new THREE.DataTexture(data,1,1);normal.needsUpdate=true;
  const water=new Water(geometry,{textureWidth:512,textureHeight:512,waterNormals:normal,sunDirection:new THREE.Vector3(-48,68,40).normalize(),sunColor:0xfff2dc,waterColor:0x3d7270,distortionScale:.42,fog:true});
  water.name='Flowing stream · reflection, shallow refraction, absorption';water.rotation.x=-Math.PI/2;water.position.y=-.05;
  const material=water.material;material.uniforms.streamBedMap={value:nature.gravel.color};
  material.uniforms.streamProfileMap={value:createStreamProfileTexture()};
  material.uniforms.streamRocks={value:Array.from({length:9},()=>new THREE.Vector4())};material.uniforms.streamRockCount={value:0};
  material.vertexShader='attribute vec2 streamFlow;varying vec2 streamCoordinate;\n'+streamSurfaceGLSL+material.vertexShader;
  material.vertexShader=material.vertexShader.replace('mirrorCoord = modelMatrix * vec4( position, 1.0 );',`streamCoordinate=uv;
    vec3 flowPosition=position;
    flowPosition.z=movingSurface(-position.y,streamFlow.x,time,streamFlow.y);
    mirrorCoord = modelMatrix * vec4(flowPosition,1.0);`).replaceAll('vec4( position, 1.0 )','vec4(flowPosition,1.0)');
  material.fragmentShader='uniform sampler2D streamBedMap,streamProfileMap; uniform vec4 streamRocks[9]; uniform int streamRockCount; varying vec2 streamCoordinate;\n'+material.fragmentShader;
  const start=material.fragmentShader.indexOf('vec4 getNoise('),end=material.fragmentShader.indexOf('void sunLight(',start);
  material.fragmentShader=material.fragmentShader.slice(0,start)+`
    ${streamSurfaceGLSL}
    float channelCenter(float z){return -28.+40.*exp(-pow((z-30.)/22.,2.))+2.*sin(z*.028);}
    float channelWidth(float z){return 3.5+.7*sin(z*.025+1.)+.22*sin(z*.17)+.08*sin(z*.51+2.);}
    vec3 bedProfile(vec2 world){return texture2D(streamProfileMap,vec2(clamp((world.x-channelCenter(world.y))/(2.*channelWidth(world.y))+.5,0.,1.),clamp((world.y+650.)/1000.,0.,1.))).rgb;}
    vec2 flowDirection(float z){float slope=-80.*(z-30.)/(22.*22.)*exp(-pow((z-30.)/22.,2.))+.056*cos(z*.028);return normalize(vec2(slope,1.));}
    float flowNoise(vec2 p);
    vec3 obstacleWake(vec2 world){
      vec2 tangent=flowDirection(world.y),across=vec2(tangent.y,-tangent.x),gradient=vec2(0.);float foam=0.;
      for(int i=0;i<9;i++){
        if(i>=streamRockCount)break;
        vec2 delta=world-streamRocks[i].xy;float radius=streamRocks[i].z;
        float along=dot(delta,tangent),side=dot(delta,across);
        float spread=radius*.8+max(0.,along)*.16;
        float envelope=smoothstep(-radius,.2,along)*(1.-smoothstep(radius,radius*8.,along))*exp(-side*side/max(.025,spread*spread));
        float travel=along-time*(.84+.18*sin(side*3.));
        float wakeRidge=cos((abs(side)-max(0.,along)*.18)*24.-time*2.4);
        gradient+=(tangent*cos(travel*10.)+across*wakeRidge*.65)*envelope*.065;
        float nose=(length(vec2(along,side))-radius*1.10)/max(.05,radius*.12),flank=1.-smoothstep(-radius*.15,radius*.45,along);
        float bow=exp(-nose*nose)*flank;
        float trailSide=(abs(side)-radius*.52-max(0.,along)*.11)/max(.07,radius*.24);
        float strands=exp(-trailSide*trailSide);
        float bubbles=smoothstep(.52,.83,flowNoise(vec2(side*24.,travel*15.)));
        foam+=bow*.55+envelope*strands*bubbles*.95;
      }
      return vec3(gradient,clamp(foam,0.,1.));
    }
    // Small multipliers retain float precision along the kilometre-scale arc UV.
    float flowHash(vec2 p){vec3 h=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));h+=dot(h,h.yzx+33.33);return fract((h.x+h.y)*h.z);}
    float flowNoise(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(flowHash(i),flowHash(i+vec2(1.,0.)),f.x),mix(flowHash(i+vec2(0.,1.)),flowHash(i+1.),f.x),f.y);
    }
    float flowHeight(vec2 p){
      p+=vec2(flowNoise(p*.27+8.1),flowNoise(p*.19-3.7))*.63;
      mat2 rotation=mat2(.83,-.56,.56,.83);
      return (flowNoise(p*vec2(3.8,.95))-.5)*.031
        +(flowNoise(rotation*p*5.1)-.5)*.010
        +(flowNoise(rotation*p*11.7+17.)-.5)*.003;
    }
    vec2 currentVelocity(vec2 world){
      vec2 tangent=flowDirection(world.y),across=vec2(tangent.y,-tangent.x);
      float side=clamp((world.x-channelCenter(world.y))/channelWidth(world.y),-1.,1.);
      float speed=(.78+bedProfile(world).g*.48)*(1.-.55*side*side);
      vec2 velocity=tangent*speed;
      for(int i=0;i<9;i++){
        if(i>=streamRockCount)break;
        vec2 delta=world-streamRocks[i].xy;float r=streamRocks[i].z*1.08;
        float a=dot(delta,tangent),b=dot(delta,across),r2=max(r*r,dot(delta,delta));
        // A bounded cylinder-flow approximation bends the surface texture at both shoulders.
        float influence=r*r/(r2*r2);
        velocity+=speed*influence*(tangent*(b*b-a*a)-across*(2.*a*b));
        float wake=smoothstep(0.,r,a)*(1.-smoothstep(r*2.,r*7.,a))*exp(-b*b/max(.04,r*r));
        velocity+=across*sin(a*7.-time*2.8)*wake*.16;
      }
      return vec2(dot(velocity,across),dot(velocity,tangent));
    }
    float advectedHeight(vec2 p,vec2 delta,float phase){
      vec2 a=p-delta*phase*3.2,b=p-delta*fract(phase+.5)*3.2;
      return mix(flowHeight(a),flowHeight(b),abs(phase*2.-1.));
    }
    vec4 getNoise(vec2 ignored){
      float width=channelWidth(worldPosition.z);
      float centre=1.-clamp(abs(streamCoordinate.x)/width,0.,1.);
      // Bounded shear avoids stretching cross-channel wavelengths forever.
      float shear=sin(time*.23)*centre*.18;
      vec2 p=streamCoordinate-vec2(0.,time*.78+shear);
      vec2 delta=currentVelocity(worldPosition.xz)-vec2(0.,.78);float phase=fract(time/3.2);
      float epsilon=.035+min(length(eye-worldPosition.xyz)*.0009,.12);
      float dx=(advectedHeight(p+vec2(epsilon,0.),delta,phase)-advectedHeight(p-vec2(epsilon,0.),delta,phase))/(2.*epsilon);
      float dy=(advectedHeight(p+vec2(0.,epsilon),delta,phase)-advectedHeight(p-vec2(0.,epsilon),delta,phase))/(2.*epsilon);
      vec2 tangent=flowDirection(worldPosition.z),across=vec2(tangent.y,-tangent.x);
      float riffle=bedProfile(worldPosition.xz).g;
      vec2 gradient=(across*dx+tangent*dy)*mix(.85,1.85,riffle)+obstacleWake(worldPosition.xz).xy;
      float side=clamp(streamCoordinate.x/width,-1.,1.),z=worldPosition.z;
      gradient.x+=(movingSurface(z,side+.05/width,time,riffle)-movingSurface(z,side-.05/width,time,riffle))/.10;
      gradient.y+=(movingSurface(z+.05,side,time,riffle)-movingSurface(z-.05,side,time,riffle))/.10;
      return vec4(-gradient.x,-gradient.y,1.,1.);
    }
  `+material.fragmentShader.slice(end);
  material.fragmentShader=material.fragmentShader.replace('float rf0 = 0.3;','float rf0 = 0.0204;')
    .replace('100.0, 2.0, 0.5','180.0, 1.05, 0.5')
    .replace('vec3 outgoingLight = albedo;',`
      float width=channelWidth(worldPosition.z);
      float edge=clamp((width-abs(worldPosition.x-channelCenter(worldPosition.z)))/width,0.,1.);
      vec3 profile=bedProfile(worldPosition.xz);
      float depth=profile.r*1.6;
      vec2 bedUv=worldPosition.xz*.65+surfaceNormal.xz*.18*depth;
      vec3 gravel=texture2D(streamBedMap,bedUv).rgb;
      vec2 moving=streamCoordinate-vec2(0.,time*.88);
      float caustic=pow(1.-abs(flowNoise(moving*4.4+surfaceNormal.xz*.3)*2.-1.),16.);
      vec3 transmittance=exp(-vec3(.48,.24,.17)*depth*1.7);
      vec3 bedLight=gravel*vec3(.69,.75,.66)*(1.+caustic*.16)*(.36+.64*getShadowMask());
      vec3 refraction=bedLight*transmittance+vec3(.026,.085,.072)*(1.-transmittance);
      vec3 outgoingLight=mix(refraction,reflectionSample,reflectance)+specularLight*.32;
      float bankMetres=width-abs(worldPosition.x-channelCenter(worldPosition.z));
      float shore=1.-smoothstep(.015,.20,bankMetres);
      float patches=smoothstep(.64,.84,flowNoise(moving*vec2(6.2,2.1)));
      outgoingLight=mix(outgoingLight,vec3(.53,.61,.56),shore*patches*.045);
      float wakeFoam=obstacleWake(worldPosition.xz).z;
      float riffleFoam=smoothstep(.67,.88,flowNoise(moving*vec2(7.,1.8)+vec2(flowNoise(moving*1.3)*2.,0.)))*profile.g*.19;
      vec3 foamLight=vec3(.69,.75,.69)*(.35+.65*getShadowMask());
      outgoingLight=mix(outgoingLight,foamLight,clamp(wakeFoam*.53+riffleFoam,0.,.53));
    `);
  material.fragmentShader=material.fragmentShader.replace(/vec3 reflectionSample = vec3\( texture2D\( mirrorSampler, mirrorCoord.xy \/ mirrorCoord.w \+ distortion \) \);/,`
    vec2 reflectedUv=mirrorCoord.xy/mirrorCoord.w+distortion;
    vec3 reflectionSample=texture2D(mirrorSampler,reflectedUv).rgb*.5;
    reflectionSample+=(texture2D(mirrorSampler,reflectedUv+vec2(.0007,0.)).rgb
      +texture2D(mirrorSampler,reflectedUv-vec2(.0007,0.)).rgb
      +texture2D(mirrorSampler,reflectedUv+vec2(0.,.0007)).rgb
      +texture2D(mirrorSampler,reflectedUv-vec2(0.,.0007)).rgb)*.125;
  `);
  scene.add(water);
  const motion=createStreamMotion(scene,{riverX,riverWidth});
  const reflectionBudget=budgetReflections(water,scene);
  return {water,bed,drift:motion.drift,foam:motion.foam,ribbons:motion.ribbons,flow:motion.flow,rowStride:across+1,profileAt:streamBedProfileAt,inspect(){const m=new THREE.Matrix4();motion.foam.getMatrixAt(4,m);return {time:material.uniforms.time.value,rocks:material.uniforms.streamRockCount.value,radii:material.uniforms.streamRocks.value.map(r=>r.z),foamMarker:m.elements.slice(12,15),strandMarker:Array.from(motion.ribbons.geometry.attributes.position.array.slice(84*3,84*3+3))};},setObstacles(rocks){material.uniforms.streamRockCount.value=Math.min(9,rocks.length);rocks.slice(0,9).forEach((r,i)=>material.uniforms.streamRocks.value[i].set(r.x,r.z,r.radius,0));motion.setObstacles(rocks);},update(time){material.uniforms.time.value=time;motion.update(time);},setQuality(high){reflectionBudget.setQuality(high);motion.setQuality(high);material.uniforms.distortionScale.value=high?.42:.25;}};
}

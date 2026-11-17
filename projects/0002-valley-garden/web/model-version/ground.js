import * as THREE from 'three';
import { pathSampleAt } from './path-layout.js';
import { borderWeightAt } from './planting-plan.js';
import { groundNoise,surfaceFieldAt } from './surface-field.js';
import { grazingInfluenceAt } from './meadow-field.js';
export { groundNoise } from './surface-field.js';

const clamp=THREE.MathUtils.clamp;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

/** Shared world-space grass/soil/gravel layers and a sparse, object-derived contact atlas. */
export function createGroundSurface(nature,{riverX,riverWidth,habitatAt}){
  const size=2048,extent=160,data=new Uint8Array(size*size*4);
  const atlas=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);atlas.magFilter=atlas.minFilter=THREE.LinearFilter;atlas.needsUpdate=true;
  const white=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;
  const geometryOcclusion={value:white},geometryBounds={value:new THREE.Vector4(-14,14,-24,9)};
  const foundation=new THREE.Vector4(-4,4,-15.06,-5.06);
  function paint(bounds,coverage){
    const px=x=>clamp(Math.floor((x/extent+.5)*size),0,size-1);
    for(let row=px(bounds[2]);row<=px(bounds[3]);row++)for(let col=px(bounds[0]);col<=px(bounds[1]);col++){
      const x=((col+.5)/size-.5)*extent,z=((row+.5)/size-.5)*extent,[ao,soil,border=0,grazed=0]=coverage(x,z);
      const offset=(row*size+col)*4;
      for(const [channel,value] of [[0,ao],[1,soil],[2,border],[3,grazed]])data[offset+channel]=Math.round(255*(1-(1-data[offset+channel]/255)*(1-clamp(value,0,1))));
    }
  }
  function setContacts(contacts,box){
    data.fill(0);
    paint([-12,12,-23,7.5],(x,z)=>{const bed=borderWeightAt(x,z);return [.055*bed,.97*bed,bed];});
    paint([-2,12,-3.5,19],(x,z)=>{
      const path=pathSampleAt(x,z);
      const irregular=(groundNoise(x*6,z*6)-.5)*.045;
      return [0,.89*(1-smooth(path.halfWidth-.015,path.halfWidth+.12,path.distance+irregular))];
    });
    for(const c of contacts){
      const radius=Math.max(c.radius,c.soilRadius||0,(c.grazingRadius||0)*1.5);
      if(Math.abs(c.x)>extent/2+radius||Math.abs(c.z)>extent/2+radius)continue;
      paint([c.x-radius,c.x+radius,c.z-radius,c.z+radius],(x,z)=>{
        const d=Math.hypot(x-c.x,z-c.z);
        return [(c.occlusion??.5)*(1-smooth(0,c.radius,d)),c.soil?(c.soil)*(1-smooth(0,c.soilRadius||c.radius,d)):0,0,c.grazing?grazingInfluenceAt(x,z,[c]):0];
      });
    }
    if(box)foundation.set(box.minX,box.maxX,box.minZ,box.maxZ);
    atlas.needsUpdate=true;
  }
  function contactAt(x,z){
    const u=(x/extent+.5)*size-.5,v=(z/extent+.5)*size-.5;
    if(u<0||v<0||u>size-1||v>size-1)return [0,0,0,0];
    const x0=Math.floor(u),z0=Math.floor(v),tx=u-x0,tz=v-z0,result=[];
    for(let c=0;c<4;c++){
      const at=(a,b)=>data[(Math.min(size-1,b)*size+Math.min(size-1,a))*4+c]/255;
      result.push(THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(x0,z0),at(x0+1,z0),tx),THREE.MathUtils.lerp(at(x0,z0+1),at(x0+1,z0+1),tx),tz));
    }
    return result;
  }
  function weightsAt(x,z){
    const edge=Math.abs(x-riverX(z))-riverWidth(z),gravel=1-smooth(.15,2.3,edge);
    const bankSoil=smooth(.35,1.1,edge)*(1-smooth(1.7,2.9,edge))*.8;
    const forest=habitatAt?.(x,z).forest||0;
    const surface=surfaceFieldAt(x,z);
    const soil=Math.max(contactAt(x,z)[1],bankSoil,forest*.50,surface.bare)*(1-gravel);
    return {grass:1-gravel-soil,soil,gravel};
  }
  const material=new THREE.MeshStandardMaterial({map:nature.grass.color,normalMap:nature.grass.normal,roughnessMap:nature.grass.roughness,normalScale:new THREE.Vector2(.38,.38),roughness:1});
  material.onBeforeCompile=shader=>{
    shader.uniforms.groundGeometryOcclusion=geometryOcclusion;shader.uniforms.groundGeometryBounds=geometryBounds;
    Object.assign(shader.uniforms,{groundDryGrass:{value:nature.dryGrass},groundSoilColor:{value:nature.soil.color},groundSoilNormal:{value:nature.soil.normal},groundGravelColor:{value:nature.gravel.color},groundGravelNormal:{value:nature.gravel.normal},groundGravelRough:{value:nature.gravel.roughness},groundRockColor:{value:nature.rock.color},groundRockNormal:{value:nature.rock.normal},groundContacts:{value:atlas},groundFoundation:{value:foundation}});
    shader.vertexShader='attribute vec3 landCover,surfaceCover; varying vec3 groundHabitat,groundSurface; varying vec3 groundPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngroundPosition=(modelMatrix*vec4(transformed,1.)).xyz;groundHabitat=landCover;groundSurface=surfaceCover;');
    shader.fragmentShader=`
      varying vec3 groundPosition,groundHabitat,groundSurface;
      uniform sampler2D groundDryGrass,groundSoilColor,groundSoilNormal;
      uniform sampler2D groundGravelColor,groundGravelNormal,groundGravelRough,groundContacts;
      uniform sampler2D groundRockColor,groundRockNormal;
      uniform vec4 groundFoundation,groundGeometryBounds;
      uniform sampler2D groundGeometryOcclusion;
      float groundHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float groundNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(groundHash(i),groundHash(i+vec2(1.,0.)),f.x),mix(groundHash(i+vec2(0.,1.)),groundHash(i+1.),f.x),f.y);}
      vec4 fieldTileHash(vec2 p){return fract(sin(vec4(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)),dot(p,vec2(419.2,371.9)),dot(p,vec2(12.4,89.1))))*43758.5453);}
      vec3 untiledField(sampler2D tex,vec2 uv){
        vec2 cell=floor(uv),blend=smoothstep(.2,.8,fract(uv)),dx=dFdx(uv),dy=dFdy(uv);
        vec4 a=fieldTileHash(cell),b=fieldTileHash(cell+vec2(1.,0.)),c=fieldTileHash(cell+vec2(0.,1.)),d=fieldTileHash(cell+1.);
        a.zw=sign(a.zw-.5);b.zw=sign(b.zw-.5);c.zw=sign(c.zw-.5);d.zw=sign(d.zw-.5);
        vec3 ca=textureGrad(tex,uv*a.zw+a.xy,dx*a.zw,dy*a.zw).rgb;
        vec3 cb=textureGrad(tex,uv*b.zw+b.xy,dx*b.zw,dy*b.zw).rgb;
        vec3 cc=textureGrad(tex,uv*c.zw+c.xy,dx*c.zw,dy*c.zw).rgb;
        vec3 cd=textureGrad(tex,uv*d.zw+d.xy,dx*d.zw,dy*d.zw).rgb;
        return mix(mix(ca,cb,blend.x),mix(cc,cd,blend.x),blend.y);
      }
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec2 groundUv=groundPosition.xz/1.4;
      vec2 soilUv=groundPosition.xz/1.3;
      vec2 gravelUv=groundPosition.xz*.65;
      vec2 contactUv=groundPosition.xz/160.+.5;
      float inAtlas=step(0.,contactUv.x)*step(contactUv.x,1.)*step(0.,contactUv.y)*step(contactUv.y,1.);
      vec4 contact=texture2D(groundContacts,contactUv)*inAtlas;
      float centre=-28.+40.*exp(-pow((groundPosition.z-30.)/22.,2.))+2.*sin(groundPosition.z*.028);
      float width=3.5+.7*sin(groundPosition.z*.025+1.)+.22*sin(groundPosition.z*.17)+.08*sin(groundPosition.z*.51+2.);
      float bankDistance=abs(groundPosition.x-centre)-width;
      float boundaryNoise=(groundNoise(groundPosition.xz*1.1)-.5)*.45;
      float gravelWeight=1.-smoothstep(.15,2.3,bankDistance+boundaryNoise);
      float bankSoil=smoothstep(.35,1.1,bankDistance)*(1.-smoothstep(1.7,2.9,bankDistance))*.8;
      float brokenEdge=(groundNoise(groundPosition.xz*2.3)-.5)*.13*groundSurface.x;
      float bare=clamp(groundSurface.x+brokenEdge,0.,1.);
      float soilWeight=max(max(max(contact.g,bankSoil),groundHabitat.x*.50),bare)*(1.-gravelWeight);
      float stoneWeight=min(soilWeight,groundSurface.y*(1.-gravelWeight));
      vec4 groundWeights=vec4(1.-gravelWeight-soilWeight,soilWeight-stoneWeight,gravelWeight,stoneWeight);
      float wetness=(1.-smoothstep(-.05,.8,bankDistance))*(1.-smoothstep(.18,.4,groundPosition.y));
      float outside=max(max(abs(groundPosition.x)-11.8,-22.-groundPosition.z),groundPosition.z-7.3);
      float wildness=smoothstep(0.,5.,outside);
      float patches=groundNoise(groundPosition.xz*.11)*.6+groundNoise(groundPosition.xz*.031)*.4;
      float variation=mix(.90,.73,wildness)+patches*mix(.16,.37,wildness);
      vec2 rotatedUv=mat2(.8,-.6,.6,.8)*groundUv*.71+vec2(37.,19.);
      vec3 lawn=mix(texture2D(map,groundUv).rgb,texture2D(map,rotatedUv).rgb,.32);
      vec3 dryGrass=untiledField(groundDryGrass,groundPosition.xz/2.1);
      // Unmanaged slopes carry a litter-rich field surface; cut turf stays inside the garden.
      lawn=mix(lawn,dryGrass,wildness*(.57+.20*(1.-patches)));
      float dryPatch=smoothstep(.48,.76,patches)*wildness*.48;
      lawn=mix(lawn,dryGrass,dryPatch)*variation;
      // Dense, cut turf carries broad moisture/growth changes, not a white grain layer.
      float growth=groundNoise(groundPosition.xz*.22+vec2(11.,3.))*.65+groundNoise(groundPosition.xz*.057)*.35;
      vec3 lawnTint=mix(vec3(.69,.88,.57),vec3(.87,.98,.75),growth);
      lawn*=mix(lawnTint,vec3(1.),wildness*.8);
      lawn=mix(lawn,dryGrass,smoothstep(.36,.82,groundHabitat.z)*wildness*.19);
      lawn=mix(lawn,dryGrass,groundSurface.z*wildness*.40);
      lawn*=mix(vec3(1.),vec3(.79,.88,.69),groundHabitat.y*wildness*.35);
      // A colour patch follows soil moisture, rather than a uniformly pale carpet.
      lawn*=mix(vec3(1.),vec3(.77,.91,.66),wildness*(1.-patches)*.6);
      lawn*=mix(vec3(1.),vec3(.89,.96,.73),contact.a*.60);
      vec3 soilColor=texture2D(groundSoilColor,soilUv).rgb;
      soilColor*=mix(vec3(1.),vec3(.64,.56,.47),contact.b*.85);
      soilColor*=mix(vec3(1.),vec3(.65,.66,.53),groundHabitat.x);
      vec3 gravelColor=texture2D(groundGravelColor,gravelUv).rgb;
      vec3 rockColor=texture2D(groundRockColor,groundPosition.xz*.36).rgb*vec3(.86,.87,.81);
      diffuseColor.rgb*=(lawn*groundWeights.x+soilColor*groundWeights.y+gravelColor*groundWeights.z+rockColor*groundWeights.w)*mix(1.,.67,wetness);
      vec2 boxCentre=vec2((groundFoundation.x+groundFoundation.y)*.5,(groundFoundation.z+groundFoundation.w)*.5);
      vec2 boxHalf=vec2(groundFoundation.y-groundFoundation.x,groundFoundation.w-groundFoundation.z)*.5;
      vec2 q=abs(groundPosition.xz-boxCentre)-boxHalf;
      float wallDistance=length(max(q,0.))+min(max(q.x,q.y),0.);
      vec2 geometryUv=vec2((groundPosition.x-groundGeometryBounds.x)/(groundGeometryBounds.y-groundGeometryBounds.x),
        (groundGeometryBounds.w-groundPosition.z)/(groundGeometryBounds.w-groundGeometryBounds.z));
      float inGeometry=step(0.,geometryUv.x)*step(geometryUv.x,1.)*step(0.,geometryUv.y)*step(geometryUv.y,1.);
      float geometryShadow=(1.-texture2D(groundGeometryOcclusion,geometryUv).r)*inGeometry;
      float groundOcclusion=max(max(max(contact.r*.45,exp(-max(wallDistance,0.)/.24)*.72),geometryShadow*.90),groundHabitat.x*.28);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
      // The source lawn map has a median of .25: direct use made it look wet and glittery.
      float lawnRoughness=.90+texture2D(roughnessMap,groundUv).g*.09;
      float soilRoughness=.94;
      float gravelRoughness=max(.82,texture2D(groundGravelRough,gravelUv).g);
      // Constant matte stone keeps the full material within WebGL 2's 16-sampler floor.
      float stoneRoughness=.95;
      float groundRoughness=lawnRoughness*groundWeights.x+soilRoughness*groundWeights.y+gravelRoughness*groundWeights.z+stoneRoughness*groundWeights.w;
      float roughnessFactor=roughness*mix(groundRoughness,.57,wetness*.65);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
      vec3 groundNormal=(texture2D(normalMap,groundUv).xyz*2.-1.)*groundWeights.x
        +(texture2D(groundSoilNormal,soilUv).xyz*2.-1.)*groundWeights.y
        +(texture2D(groundGravelNormal,gravelUv).xyz*2.-1.)*groundWeights.z
        +(texture2D(groundRockNormal,groundPosition.xz*.36).xyz*2.-1.)*groundWeights.w;
      float normalDetail=1.-smoothstep(8.,55.,length(vViewPosition));
      groundNormal.xy*=normalScale*mix(.16,.75,normalDetail);
      normal=normalize(getTangentFrame(-vViewPosition,normal,groundUv)*normalize(groundNormal));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse*=1.-groundOcclusion*.65;\nreflectedLight.indirectSpecular*=1.-groundOcclusion*.45;');
  };
  material.customProgramCacheKey=()=> 'grazed-valley-ground-9';
  setContacts([]);
  return {material,atlas,setContacts,contactAt,weightsAt,foundation,setContactShadow(texture,bounds){geometryOcclusion.value=texture;geometryBounds.value.copy(bounds);}};
}

export function createGroundGeometry(heightAt,{near=true,middle=false,habitatAt}={}){
  const extent=near?60:middle?160:550,segments=near?240:middle?256:220;
  const geometry=new THREE.PlaneGeometry(extent*2,extent*2,segments,segments);
  geometry.rotateX(-Math.PI/2);const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i)+(near||middle?0:-150);let y=heightAt(x,z);
    if(near||middle){
      const step=near?1.25:5,gx=Math.floor(x/step)*step,gz=Math.floor(z/step)*step,tx=(x-gx)/step,tz=(z-gz)/step;
      const coarse=THREE.MathUtils.lerp(THREE.MathUtils.lerp(heightAt(gx,gz),heightAt(gx+step,gz),tx),THREE.MathUtils.lerp(heightAt(gx,gz+step),heightAt(gx+step,gz+step),tx),tz);
      y=THREE.MathUtils.lerp(coarse,y,smooth(0,5,extent-Math.max(Math.abs(x),Math.abs(z))));
    }
    p.setXYZ(i,x,y,z);
  }
  if(!near){
    const keep=[],index=geometry.index.array;
    for(let i=0;i<index.length;i+=3){
      const ids=[index[i],index[i+1],index[i+2]],x=ids.reduce((s,id)=>s+p.getX(id),0)/3,z=ids.reduce((s,id)=>s+p.getZ(id),0)/3;
      const hole=middle?60:160;
      if(Math.abs(x)<hole&&Math.abs(z)<hole)continue;keep.push(...ids);
    }
    geometry.setIndex(keep);
  }
  const cover=[],surface=[];for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=habitatAt?.(x,z),s=surfaceFieldAt(x,z);cover.push(h?.forest||0,h?.edge||0,h?.rough||0);surface.push(s.bare,s.stone,s.dry);}
  geometry.setAttribute('landCover',new THREE.Float32BufferAttribute(cover,3));geometry.setAttribute('surfaceCover',new THREE.Float32BufferAttribute(surface,3));geometry.computeVertexNormals();return geometry;
}

export function createBankGeometry({heightAt,riverX,riverWidth}){
  const positions=[],uv=[],indices=[];
  for(const side of [-1,1]){
    const offset=positions.length/3;
    for(let i=0;i<=650;i++){
      const z=-650+i*1000/650,w=riverWidth(z),cx=riverX(z);
      for(const [d,h] of [[w-.08,-.09],[w+.95,.14],[w+2.5,null]]){
        const x=cx+side*d;positions.push(x,h??heightAt(x,z)+.012,z);uv.push(x*.32,z*.32);
      }
      if(i<650){
        const a=offset+i*3,triangles=[a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5];
        for(let t=0;t<triangles.length;t+=3)indices.push(triangles[t],triangles[t+(side>0?1:2)],triangles[t+(side>0?2:1)]);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('landCover',new THREE.Float32BufferAttribute(new Float32Array(positions.length),3));geometry.setAttribute('surfaceCover',new THREE.Float32BufferAttribute(new Float32Array(positions.length),3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

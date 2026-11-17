import * as THREE from 'three';
import { foliageLighting } from './lighting.js';

const clamp=THREE.MathUtils.clamp;
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
const lineDistance=(x,y,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(x-ax-dx*t,y-ay-dy*t);};

/** Original colour, micro-normal and roughness maps; no image downloads. */
export function createWildlifeSurfaces(){
  function maps(kind,warm=false){
    const size=256,colour=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
    const base=new THREE.Color(warm?'#c5ad74':'#d5d3b9');
    const veins=[[.003,.005,.029,.027],[.008,.009,.035,.014],[.009,.005,.032,.003],[.003,.002,.024,-.019],[.006,.001,.017,-.026],[.013,.013,.023,.024],[.018,.008,.029,.016]];
    for(let j=0;j<size;j++)for(let i=0;i<size;i++){
      const u=i/(size-1),v=j/(size-1),n=hash(i,j),k=(j*size+i)*4;
      let rgb,grain,rough;
      if(kind==='butterfly'){
        const x=u*.041,z=v*.075-.034;
        const vein=Math.exp(-Math.min(...veins.map(a=>lineDistance(x,z,...a)))/.00016);
        const spot=Math.exp(-(((x-.022)/.00165)**2+((z-.015)/.0022)**2)*1.6)+Math.exp(-(((x-.017)/.0017)**2+((z+.014)/.0024)**2)*1.6);
        const tip=THREE.MathUtils.smoothstep(x+.15*z+.0006*Math.sin(z*1800),.0295,.0345)*THREE.MathUtils.smoothstep(z,.010,.022);
        const mottling=.955+.045*Math.sin(u*25+Math.sin(v*19))+.035*(n-.5);
        const shade=clamp(mottling-vein*.20-spot*.52-tip*.40,.35,1);
        rgb=[base.r*shade,base.g*shade,base.b*shade];
        grain=(n-.5)*.11+Math.sin(i*1.9+j*.48)*.025+vein*.10;rough=.72+(n-.5)*.14;
      }else{
        const shaft=Math.exp(-Math.abs(u-.5)*120),barb=Math.sin((v*83+Math.abs(u-.5)*23)*Math.PI*2);
        const shade=.92+barb*.028+(n-.5)*.045-shaft*.055;
        rgb=[shade,shade,shade];grain=barb*.06+(n-.5)*.055+shaft*.08;rough=.79+(n-.5)*.12;
      }
      for(let c=0;c<3;c++)colour[k+c]=Math.round(clamp(rgb[c],0,1)*255);
      colour[k+3]=normal[k+3]=roughness[k+3]=255;
      normal[k]=Math.round(128+grain*105);normal[k+1]=Math.round(128+(hash(j,i)-.5)*10);normal[k+2]=254;
      roughness[k]=roughness[k+1]=roughness[k+2]=Math.round(rough*255);
    }
    function texture(data,srgb=false){const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
    // Colour samples above are linear, then encoded for the sRGB texture.
    const c=new THREE.Color();for(let k=0;k<colour.length;k+=4){c.setRGB(colour[k]/255,colour[k+1]/255,colour[k+2]/255).convertLinearToSRGB();colour[k]=c.r*255;colour[k+1]=c.g*255;colour[k+2]=c.b*255;}
    return {map:texture(colour,true),normalMap:texture(normal),roughnessMap:texture(roughness)};
  }
  const pale=maps('butterfly'),ochre=maps('butterfly',true),feather=maps('feather');
  const body=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0,envMapIntensity:.30});
  function butterfly(warm=false){
    const material=new THREE.MeshPhysicalMaterial({...(warm?ochre:pale),vertexColors:true,roughness:.92,metalness:0,
      normalScale:new THREE.Vector2(.32,.26),envMapIntensity:.35,specularIntensity:.22,sheen:.12,sheenRoughness:.85,sheenColor:'#ded6bd'});
    decorate(material,.0009,true);return material;
  }
  function feathers(){
    const material=new THREE.MeshStandardMaterial({...feather,vertexColors:true,roughness:.95,metalness:0,normalScale:new THREE.Vector2(.35,.25),envMapIntensity:.30});
    decorate(material,.0032,false);return material;
  }
  function decorate(material,amplitude,scatter){
    const flex={value:0};material.userData.flex=flex;
    material.onBeforeCompile=shader=>{
      shader.uniforms.wildlifeFlex=flex;shader.uniforms.wildlifeSun=foliageLighting.direction;shader.uniforms.wildlifeSunColour=foliageLighting.colour;
      shader.vertexShader='uniform float wildlifeFlex;varying vec3 wildlifeWorldNormal;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        transformed.y+=wildlifeFlex*${amplitude.toFixed(5)}*pow(clamp(position.x/${scatter?'.037':'.115'},0.,1.),1.5);
        wildlifeWorldNormal=normalize(mat3(modelMatrix)*objectNormal);
      `);
      if(scatter){
        shader.fragmentShader='varying vec3 wildlifeWorldNormal;uniform vec3 wildlifeSun,wildlifeSunColour;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
          float wingBacklight=max(0.,dot(-normalize(wildlifeWorldNormal),wildlifeSun));
          reflectedLight.indirectDiffuse+=diffuseColor.rgb*wildlifeSunColour*wingBacklight*.085;
        `);
      }
    };
    material.customProgramCacheKey=()=>`wildlife-curved-surface-${scatter?'membrane':'feather'}-2`;
  }
  return {body,butterfly,feathers};
}

import * as THREE from 'three';

const clamp=THREE.MathUtils.clamp,smooth=THREE.MathUtils.smoothstep;
const hash=n=>{const a=Math.sin(n*127.1+17.7)*43758.5453;return a-Math.floor(a);};
const noise=t=>{const n=Math.floor(t),s=smooth(t-n,0,1);return THREE.MathUtils.lerp(hash(n),hash(n+1),s);};
export const windUniforms={time:{value:0},strength:{value:0},direction:{value:new THREE.Vector2(.8,.6)}};

export function windWeatherAt(time){
  const angle=.62+.14*Math.sin(time*.037)+.065*Math.sin(time*.011);
  const gust=Math.max(0,Math.sin(time*.205-.7))**4;
  return {time,strength:.22+.21*noise(time*.065)+.37*gust,direction:{x:Math.cos(angle),z:Math.sin(angle)}};
}
export function localWindAt(weather,x,z){
  const d=weather.direction,front=.88+.12*Math.sin((x*d.x+z*d.z)*.036-weather.time*.16);
  return {...weather,strength:weather.strength*front};
}
export function plantOffsetAt(weather,root,height,totalHeight,flex=.12){
  const local=localWindAt(weather,root.x,root.z),d=local.direction;
  const phase=root.x*.071+root.z*.053,weight=Math.min(.32,totalHeight*flex)*clamp(height/Math.max(.001,totalHeight),0,1)**2;
  const along=.68+.24*Math.sin(weather.time*.80+phase)+.08*Math.sin(weather.time*2.3+phase*1.7);
  const across=.18*Math.sin(weather.time*1.13+phase*1.3),amount=weight*local.strength;
  return {x:(d.x*along-d.z*across)*amount,y:0,z:(d.z*along+d.x*across)*amount};
}
export function createWindField({animate=true}={}){
  let weather=windWeatherAt(0);
  return {update(time){weather=windWeatherAt(animate?time:0);if(!animate)weather.strength=0;
    windUniforms.time.value=weather.time;windUniforms.strength.value=weather.strength;windUniforms.direction.value.set(weather.direction.x,weather.direction.z);return weather;
  },sample(x,z){return localWindAt(weather,x,z);},plantOffset(root,height,totalHeight,flex=.12){return plantOffsetAt(weather,root,height,totalHeight,flex);},get weather(){return weather;}};
}

// Same travelling gust and anchored bend as the CPU flower/animal contact sampler.
const windGLSL=`
uniform float gardenWindTime,gardenWindStrength;uniform vec2 gardenWindDirection;
vec2 gardenWindOffset(vec2 root,float height,float totalHeight,float flex){
  float front=.88+.12*sin(dot(root,gardenWindDirection)*.036-gardenWindTime*.16);
  float phase=root.x*.071+root.y*.053;
  float h=clamp(height/max(.001,totalHeight),0.,1.);
  float amount=min(.32,totalHeight*flex)*h*h*gardenWindStrength*front;
  float along=.68+.24*sin(gardenWindTime*.80+phase)+.08*sin(gardenWindTime*2.3+phase*1.7);
  float across=.18*sin(gardenWindTime*1.13+phase*1.3);
  return (gardenWindDirection*along+vec2(-gardenWindDirection.y,gardenWindDirection.x)*across)*amount;
}
`;
export function injectWind(shader,{height,flex=.12,flutter=0}={}){
  shader.uniforms.gardenWindTime=windUniforms.time;shader.uniforms.gardenWindStrength=windUniforms.strength;shader.uniforms.gardenWindDirection=windUniforms.direction;
  shader.vertexShader=windGLSL+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    mat4 windWorldMatrix=modelMatrix;
    #ifdef USE_INSTANCING
      windWorldMatrix=modelMatrix*instanceMatrix;
    #endif
    vec3 windRoot=windWorldMatrix[3].xyz;
    vec3 windVertex=(windWorldMatrix*vec4(position,1.)).xyz;
    float windHeight=max(0.,windVertex.y-windRoot.y);
    float windTotalHeight=${Math.max(.001,height).toFixed(6)}*length(windWorldMatrix[1].xyz);
    vec2 windMove=gardenWindOffset(windRoot.xz,windHeight,windTotalHeight,${flex.toFixed(6)});
    windMove+=gardenWindDirection*${flutter.toFixed(6)}*gardenWindStrength*pow(clamp(windHeight/max(.001,windTotalHeight),0.,1.),2.)*sin(gardenWindTime*3.1+windVertex.x*1.7+windVertex.z*.9);
    vec3 windWorldMove=vec3(windMove.x,0.,windMove.y);
    // Invert the orthogonal rotation/scale columns, preserving world wind direction.
    transformed+=vec3(dot(windWorldMove,windWorldMatrix[0].xyz)/max(.000001,dot(windWorldMatrix[0].xyz,windWorldMatrix[0].xyz)),
      dot(windWorldMove,windWorldMatrix[1].xyz)/max(.000001,dot(windWorldMatrix[1].xyz,windWorldMatrix[1].xyz)),
      dot(windWorldMove,windWorldMatrix[2].xyz)/max(.000001,dot(windWorldMatrix[2].xyz,windWorldMatrix[2].xyz)));
  `);
}

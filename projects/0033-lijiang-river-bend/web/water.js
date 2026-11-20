import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { atmosphere, noise } from './shaders.js';
import { bounds, RIVERBED_LAYER } from './river-layout.js';
import { createWakeHistory } from './wake-history.js';

const vertexShader = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vReflection;
varying vec4 vClip;
varying vec3 vWorld;

void main() {
  vec4 point = vec4(position, 1.0);
  vWorld = (modelMatrix * point).xyz;
  vReflection = textureMatrix * point;
  vClip = projectionMatrix * modelViewMatrix * point;
  gl_Position = vClip;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tMirrorDepth;
uniform sampler2D tBedColor;
uniform sampler2D tBedDepth;
uniform sampler2D tBathymetry;
uniform sampler2D tWakeHistory;
uniform vec2 uReflectionTexel;
uniform vec2 uBedTexel;
uniform vec2 uClipping;
uniform vec4 uTerrainDomain;
uniform mat4 uViewProjection;
uniform mat4 uMirrorViewProjection;
uniform mat4 uMirrorInverse;
uniform float uTime;
uniform vec4 uVessel;
uniform float uWakeSpeed;
uniform vec2 uPropWash;
uniform vec4 uWakeDomain;
varying vec4 vReflection;
varying vec4 vClip;
varying vec3 vWorld;
${noise}
${atmosphere}

float eyeDistance(float depth) {
  return (uClipping.x*uClipping.y) / (uClipping.y - depth*(uClipping.y - uClipping.x));
}

float edgeDistance(vec2 uv) {
  vec2 margin = min(uv, 1.0 - uv);
  return min(margin.x, margin.y);
}

float floorHeight(vec2 world) {
  vec2 uv = (vec2(world.x,-world.y) - uTerrainDomain.xy)/uTerrainDomain.zw;
  vec2 encoded = texture2D(tBathymetry,uv).rg;
  return dot(encoded,vec2(65280.0,255.0))*(8.0/65535.0) - 7.0;
}

vec2 waveSlope(vec2 p, vec2 direction, float frequency, float phase, float amplitude) {
  float angle = dot(p,direction)*frequency + phase;
  float band = 1.0-smoothstep(0.55,2.30,fwidth(angle));
  return direction*amplitude*band*cos(angle);
}

vec2 rippleSlope(vec2 point, float depth, float wind) {
  vec2 p = point + vec2(-uTime*0.019,uTime*0.13);
  vec2 warp = vec2(noise2(p*0.25 + 28.2),noise2(p*0.18 - 12.3))-0.5;
  p += warp*2.8;
  vec2 slope = waveSlope(p,vec2(0.883,0.469),1.76,-uTime*2.28 + warp.x*3.9,0.017);
  slope += waveSlope(p,vec2(0.514,0.858),3.89,-uTime*3.71 + warp.y*4.3,0.015);
  slope += waveSlope(p,vec2(0.976,-0.218),6.59,-uTime*5.12 - warp.x*6.5,0.013);
  slope += waveSlope(p,vec2(-0.368,0.930),12.72,uTime*6.76 + warp.y*9.9,0.010);
  slope += waveSlope(p,vec2(0.728,0.686),22.60,-uTime*9.33 + (warp.x-warp.y)*11.8,0.008);
  return slope*wind*mix(0.35,1.0,smoothstep(0.05,1.7,depth));
}

vec2 lappingSlope(vec2 point, float depth, float range, float footprint) {
  float band = 1.0-smoothstep(0.66,1.88,fwidth(depth)*30.0+footprint*2.6);
  float coverage = smoothstep(0.034,0.11,depth)*(1.0-smoothstep(0.17,0.54,depth))
    *(1.0-smoothstep(11.0,24.0,range))*band;
  if (coverage <= 0.0) return vec2(0.0);

  // The sampled bed turns the small ripples along the contours at the shelf toe.
  vec2 gradient = vec2(floorHeight(point + vec2(0.53,0.0)),floorHeight(point + vec2(0.0,0.53))) + depth;
  float magnitude = length(gradient);
  vec2 upslope = gradient/max(0.035,magnitude);
  float variation = noise2(point*vec2(0.94,0.67)+vec2(8.1,3.7));
  float phase = depth*30.0 - uTime*2.45 + variation*4.3;
  float lap = (cos(phase)*0.76 + cos(phase*1.69 + 2.2)*0.24) * smoothstep(0.30,0.68,variation);
  return upslope*(lap*coverage*0.015);
}

vec3 propWake(vec2 point) {
  if (uWakeSpeed < 0.05 && uPropWash.x < 0.1) return vec3(0.0);
  vec2 forward = uVessel.zw;
  vec2 across = vec2(forward.y, -forward.x);
  vec2 offset = point - uVessel.xy;
  float aft = -dot(offset, forward);
  if (aft < -0.32 || aft > 2.48 || abs(dot(offset,across)) > 1.80) return vec3(0.0);
  float flank = dot(offset, across);
  float distanceAft = max(0.0,aft);
  float drive = uPropWash.x;
  float plane = uPropWash.y;
  float plume = exp(-flank*flank/(0.09 + distanceAft*mix(0.110,0.185,plane)))
    * smoothstep(-0.19,0.14,aft) * (1.0-smoothstep(0.72,2.48,aft));
  float flecks = smoothstep(0.19,0.83,noise2(point*7.8 - forward*uTime*2.1));
  float wave = sin(aft*12.7 + flank*3.5 - uTime*8.4);
  float churn = (0.19 + 0.81*drive)*smoothstep(0.02,0.65,drive+uWakeSpeed*0.033);
  float foam = plume*drive*mix(0.72,1.0,plane)*flecks;
  vec2 slope = plume*churn*(forward*0.073*wave + across*0.10*(flecks-0.51));
  return vec3(slope, clamp(foam,0.0,1.0));
}

vec3 trailWake(vec2 point) {
  if (uWakeDomain.z == 0.0) return vec3(0.0);
  vec2 uv = (point-uWakeDomain.xy)*uWakeDomain.z;
  float coverage = smoothstep(0.0,0.017,edgeDistance(uv));
  if (coverage <= 0.0) return vec3(0.0);
  vec3 cells = texture2D(tWakeHistory,uv).rgb;
  vec2 slope = (cells.rg*255.0-128.0)*(0.2/127.0);
  float foam = cells.b;
  if (foam > 0.004) {
    float breakup = noise2(point*5.2+vec2(3.6,uTime*0.20));
    foam *= mix(0.48,1.02,smoothstep(0.24,0.81,breakup));
  }
  return vec3(slope,foam)*coverage*uWakeDomain.w;
}

float waterFresnel(float cosine) {
  const float ior = 1.333;
  float transmitted = sqrt(max(0.0,1.0 - (1.0-cosine*cosine)/(ior*ior)));
  float perpendicular = (cosine - ior*transmitted) / (cosine + ior*transmitted);
  float parallel = (ior*cosine - transmitted) / (ior*cosine + transmitted);
  return 0.5*(perpendicular*perpendicular + parallel*parallel);
}

float causticLight(vec2 point, float depth, float range) {
  vec2 p = point*7.4 + vec2(uTime*0.32,-uTime*0.22);
  vec2 drift = vec2(noise2(p*0.38 + 2.9),noise2(p*0.29 - 8.2));
  p += (drift - 0.5)*3.4;
  float field = sin(p.x + sin(p.y)*0.94) + sin(p.x*0.47-p.y*0.91 + uTime*0.20)
    + sin(p.x*0.57+p.y*1.13 - uTime*0.17);
  float glints = exp(-abs(field)*4.4)*smoothstep(0.28,0.66,drift.y);
  return glints * smoothstep(0.05,0.25,depth) * (1.0 - smoothstep(0.55,1.65,depth))
    * (1.0 - smoothstep(8.0,26.0,range));
}

// The local bed height estimates the optical path even if the straight camera ray sees the far bank.
vec3 transmittedLight(vec2 screen, vec3 ray, float surfaceDepth, float range) {
  float downward = max(0.44,-ray.y);
  float depth = surfaceDepth;
  float travel = depth/downward;
  vec3 bottom = vWorld + ray*travel;
  float shiftDepth = clamp(-floorHeight(bottom.xz),0.0,7.0);
  travel = mix(travel,shiftDepth/downward,0.68);
  bottom = vWorld + ray*travel;
  float bentDepth = -bottom.y;
  vec4 projected = uViewProjection*vec4(bottom,1.0);
  vec2 bedUV = projected.xy/max(0.05,projected.w)*0.5 + 0.5;
  float uvCoverage = smoothstep(0.0,0.035,edgeDistance(bedUV));
  float actualDepth = eyeDistance(texture2D(tBedDepth,bedUV).r);
  float actualY = cameraPosition.y + (bottom.y-cameraPosition.y)*actualDepth/max(0.05,projected.w);
  float agreement = 1.0-smoothstep(0.20,0.60+bentDepth*0.13,abs(actualY+bentDepth));
  // Where stones emerge, leave the exposed part to the opaque draw and the submerged part to refraction.
  float submerged = 1.0-smoothstep(0.008,0.046,actualY);
  float coverage = uvCoverage*agreement*submerged;
  float path = mix(travel,clamp(-actualY/downward,0.0,10.0),coverage*0.56);

  float baseDistance = eyeDistance(texture2D(tBedDepth,screen).r);
  float baseY = cameraPosition.y*(1.0 - baseDistance/vClip.w);
  float baseCoverage = (1.0-smoothstep(0.015,0.12,baseY))
    * (1.0-smoothstep(0.17,0.87,abs(baseY+bentDepth)));
  vec3 sediment = aerialPerspective(vec3(0.151,0.146,0.117),bottom,range);
  vec3 baseBed = mix(sediment,texture2D(tBedColor,screen).rgb,baseCoverage);
  vec3 refractedBed = texture2D(tBedColor,clamp(bedUV,uBedTexel,1.0-uBedTexel)).rgb;
  vec3 bed = mix(baseBed,refractedBed,coverage);
  float glints = causticLight(bottom.xz,bentDepth,range);
  bed *= 1.0+0.083*glints*coverage*cloudTransmission(bottom.xz);

  float suspendedSilt = mix(0.89,1.14,noise2(vWorld.xz*vec2(0.046,0.023)+vec2(11.7,3.4)));
  vec3 transmittance = exp(-vec3(0.56,0.25,0.32)*path*suspendedSilt);
  vec3 body = aerialPerspective(vec3(0.022,0.061,0.053)*mix(0.85,1.08,cloudTransmission(vWorld.xz)),vWorld,range);
  return mix(body,bed,transmittance);
}

vec3 reflectedLight(vec3 view, vec3 n, float footprint, float roughness) {
  vec2 flatUV = vReflection.xy / vReflection.w;
  vec3 flatRay = reflect(-view,vec3(0.0,1.0,0.0));
  float depth = texture2D(tMirrorDepth,flatUV).r;
  float hit = 1430.0;
  if (depth < 0.999999) {
    vec4 reflectedPoint = uMirrorInverse*vec4(flatUV*2.0-1.0,depth*2.0-1.0,1.0);
    vec3 position = reflectedPoint.xyz/max(reflectedPoint.w,0.0001);
    hit = clamp(dot(position-vWorld,flatRay),0.0,1430.0);
  }
  float rippleAngle = mix(0.48,0.63,smoothstep(18.0,196.0,hit));
  vec3 waveRay = mix(flatRay,reflect(-view,n),rippleAngle);
  waveRay.y = max(0.002,waveRay.y);
  vec4 distorted = uMirrorViewProjection*vec4(vWorld + waveRay*hit,1.0);
  vec2 projected = distorted.xy/max(0.05,distorted.w)*0.5 + 0.5;
  float edge = smoothstep(0.0,0.058,min(edgeDistance(flatUV),edgeDistance(projected)));
  vec2 texel = min(vec2(0.12),uReflectionTexel);
  vec2 uv = clamp(mix(flatUV,projected,edge),texel*2.0,1.0-texel*2.0);
  // Unresolvable short waves broaden distant highlights instead of aliasing into stripes.
  float unresolved = smoothstep(0.054,0.66,footprint);
  vec2 blur = texel*mix(vec2(0.58,0.47),vec2(2.7,1.46),roughness*0.61+unresolved*0.39);
  vec3 reflected = texture2D(tDiffuse,uv).rgb*0.42;
  reflected += texture2D(tDiffuse,uv + blur).rgb*0.145;
  reflected += texture2D(tDiffuse,uv - blur).rgb*0.145;
  reflected += texture2D(tDiffuse,uv + vec2(blur.x,-blur.y)).rgb*0.145;
  reflected += texture2D(tDiffuse,uv + vec2(-blur.x,blur.y)).rgb*0.145;
  return reflected;
}

void main() {
  vec2 screen = 0.5 + 0.5*(vClip.xy/vClip.w);
  vec3 incident = cameraPosition-vWorld;
  float range = length(incident);
  vec3 view = incident/range;
  float depth = max(0.0,-floorHeight(vWorld.xz));
  float footprint = length(fwidth(vWorld.xz));
  vec3 localWash = propWake(vWorld.xz);
  vec3 trail = trailWake(vWorld.xz);
  float wetWake = smoothstep(0.06,0.38,depth);
  vec3 wake = vec3(clamp(localWash.xy + trail.xy,vec2(-0.17),vec2(0.17)),
    1.0-(1.0-localWash.z)*(1.0-trail.z))*wetWake;
  float wind = smoothstep(0.27,0.78,noise2(vWorld.xz*0.071+vec2(12.7+uTime*0.007,0.6)));
  vec2 slope = rippleSlope(vWorld.xz,depth,mix(0.24,1.06,wind))
    + lappingSlope(vWorld.xz,depth,range,footprint) + wake.xy;
  vec3 n = normalize(vec3(-slope.x,1.0,-slope.y));
  float fresnel = waterFresnel(clamp(mix(view.y,dot(n,view),0.83),0.0,1.0));
  vec3 transmitted = transmittedLight(screen,refract(-view,n,1.0/1.333),depth,range);
  float roughness = clamp(wind*0.66+wake.z*0.51,0.0,1.0);
  vec3 reflected = reflectedLight(view,n,footprint,roughness);
  vec3 combined = mix(transmitted,reflected,fresnel);
  if (wake.z > 0.001) {
    vec3 foam = aerialPerspective(mix(vec3(0.60,0.67,0.66),vec3(0.73,0.79,0.77),cloudTransmission(vWorld.xz)),vWorld,range);
    combined = mix(combined,foam,wake.z*0.59);
  }
  vec3 halfAngle = normalize(view + sunDirection);
  combined += cloudKeyTint*(0.021*cloudTransmission(vWorld.xz))*pow(max(dot(n,halfAngle),0.0),mix(71.0,31.0,roughness));
  gl_FragColor = vec4(combined, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function buildWater(camera, bathymetry) {
  const wakeHistory = createWakeHistory(bathymetry);
  const bedTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
  });
  const uniforms = {
    color: { value: new THREE.Color() },
    tDiffuse: { value: null },
    tMirrorDepth: { value: null },
    textureMatrix: { value: null },
    tBedColor: { value: null },
    tBedDepth: { value: null },
    tBathymetry: { value: null },
    tWakeHistory: { value: null },
    uClipping: { value: new THREE.Vector2(camera.near, camera.far) },
    uTerrainDomain: { value: new THREE.Vector4(bounds.left,bounds.start,bounds.right-bounds.left,bounds.end-bounds.start) },
    uViewProjection: { value: new THREE.Matrix4() },
    uMirrorViewProjection: { value: new THREE.Matrix4() },
    uMirrorInverse: { value: new THREE.Matrix4() },
    uBedTexel: { value: new THREE.Vector2(1, 1) },
    uReflectionTexel: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uVessel: { value: new THREE.Vector4() },
    uWakeSpeed: { value: 0 },
    uPropWash: { value: new THREE.Vector2() },
    uWakeDomain: { value: null },
  };
  const water = new Reflector(new THREE.PlaneGeometry(bounds.right-bounds.left, bounds.end-bounds.start), {
    textureWidth: 1, textureHeight: 1, clipBias: 0.0004, multisample: 0,
    shader: { name: 'River surface', uniforms, vertexShader, fragmentShader },
  });
  // Reflector clones its uniforms. Keep the original texture objects attached to the framebuffer.
  const surface = water.material.uniforms;
  const reflectionTarget = water.getRenderTarget();
  const mirrorDepth = new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  reflectionTarget.depthTexture = mirrorDepth;
  surface.tMirrorDepth.value = mirrorDepth;
  surface.tBathymetry.value = bathymetry;
  surface.tWakeHistory.value = wakeHistory.texture;
  surface.uWakeDomain.value = wakeHistory.domain;
  surface.tBedColor.value = bedTarget.texture;
  surface.tBedDepth.value = bedTarget.depthTexture;
  water.position.z = -(bounds.start + bounds.end) / 2;
  water.rotation.x = -Math.PI / 2;
  water.renderOrder = 2;
  const lastCamera = new THREE.Matrix4();
  let needsUpdate = true;
  let needsReflection = true;
  const propSource = {};
  let wakeSource = null;
  let localWashChanged = false;
  const nextPropPosition = new THREE.Vector4();
  const renderReflection = water.onBeforeRender;
  water.onBeforeRender = function (...args) {
    if (!needsReflection) return;
    renderReflection.apply(water, args);
    const mirror = water.camera;
    // Reflector updates the projection with an oblique clip plane. Unproject with that same matrix.
    surface.uMirrorViewProjection.value.multiplyMatrices(mirror.projectionMatrix,mirror.matrixWorldInverse);
    surface.uMirrorInverse.value.copy(surface.uMirrorViewProjection.value).invert();
    needsReflection = false;
  };
  return {
    mesh: water,
    setWake(vessel) {
      const speed = vessel?.speed ?? 0;
      const throttle = vessel?.throttle ?? 0;
      const planing = vessel?.planing ?? 0;
      const wash = surface.uPropWash.value;
      localWashChanged ||= surface.uWakeSpeed.value !== Math.abs(speed) || wash.x !== throttle || wash.y !== planing;
      surface.uWakeSpeed.value = Math.abs(speed);
      wash.set(throttle,planing);
      wakeSource = null;
      if (!vessel) return;
      const reverse = vessel.reverse ?? (speed < -0.1);
      const aft = vessel.stern ?? 2.65;
      const heading = (vessel.propYaw ?? vessel.yaw) + (reverse ? Math.PI : 0);
      propSource.x = vessel.propX ?? vessel.x-Math.sin(vessel.yaw)*aft;
      propSource.z = vessel.propZ ?? -vessel.t+Math.cos(vessel.yaw)*aft;
      propSource.heading = heading;
      propSource.speed = speed;
      propSource.throttle = throttle;
      propSource.planing = planing;
      wakeSource = propSource;
      nextPropPosition.set(propSource.x,propSource.z,Math.sin(heading),-Math.cos(heading));
      localWashChanged ||= !surface.uVessel.value.equals(nextPropPosition);
      surface.uVessel.value.copy(nextPropPosition);
    },
    advanceWake(seconds, reducedMotion) {
      const evolved = wakeHistory.advance(seconds,wakeSource,reducedMotion);
      const changed = evolved || localWashChanged;
      localWashChanged = false;
      return changed;
    },
    clearWake() {
      wakeHistory.clear();
      localWashChanged = true;
    },
    invalidate() { needsUpdate = true; },
    resize(width, height) {
      const ratio = Math.min(0.92, 1360 / Math.max(width, height));
      const w = Math.max(1, Math.round(width * ratio));
      const h = Math.max(1, Math.round(height * ratio));
      bedTarget.setSize(w, h);
      surface.uBedTexel.value.set(1/w, 1/h);
      const rw = Math.max(1, Math.round(w * 0.84));
      const rh = Math.max(1, Math.round(h * 0.84));
      reflectionTarget.setSize(rw, rh);
      surface.uReflectionTexel.value.set(1/rw, 1/rh);
      needsUpdate = true;
    },
    renderBed(renderer, scene, time) {
      surface.uTime.value = time;
      if (!needsUpdate && camera.matrixWorld.equals(lastCamera)) return false;
      needsUpdate = false;
      needsReflection = true;
      lastCamera.copy(camera.matrixWorld);
      surface.uViewProjection.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      water.visible = false;
      const cameraLayers = camera.layers.mask;
      const previousTarget = renderer.getRenderTarget();
      camera.layers.set(RIVERBED_LAYER);
      try {
        renderer.setRenderTarget(bedTarget);
        renderer.render(scene, camera);
      } finally {
        renderer.setRenderTarget(previousTarget);
        camera.layers.mask = cameraLayers;
        water.visible = true;
      }
      return true;
    },
  };
}

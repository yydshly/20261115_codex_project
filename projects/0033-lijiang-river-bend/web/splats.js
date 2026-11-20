import * as THREE from 'three';
import { DETAIL_LAYER, riverBank, riverCenter, rng } from './river-layout.js';
import { mistRadiance } from './shaders.js';

const vertexShader = /* glsl */ `
attribute vec3 center;
attribute vec3 extent;
attribute vec2 rotation;
attribute vec4 pigment;
attribute float crown;
varying vec2 vGaussian;
varying vec4 vPigment;

vec2 projectAxis(vec3 v, vec3 eye, float z) {
  return vec2(projectionMatrix[0][0], projectionMatrix[1][1]) *
    (v.xy/z + eye.xy*v.z/(z*z));
}

void main() {
  vec4 eye = modelViewMatrix*vec4(center, 1.0);
  vGaussian = position.xy * 3.0;
  vPigment = pigment;
  if (eye.z > -0.16) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float z = -eye.z;
  float footprint = max(max(extent.x, extent.y), extent.z);
  vPigment.a *= smoothstep(footprint*1.9, footprint*5.0, z);
  // Leave the lit edges of the nearby leaf meshes visible from the boat.
  vPigment.a *= mix(1.0, smoothstep(14.0, 33.0, length(eye.xyz)), crown);
  vec2 a = projectAxis(mat3(modelViewMatrix)*vec3(rotation.x,0.0,rotation.y)*extent.x, eye.xyz, z);
  vec2 b = projectAxis(mat3(modelViewMatrix)*vec3(0.0,1.0,0.0)*extent.y, eye.xyz, z);
  vec2 c = projectAxis(mat3(modelViewMatrix)*vec3(-rotation.y,0.0,rotation.x)*extent.z, eye.xyz, z);
  // Project the three covariance axes, then factor the 2x2 screen-space covariance.
  float xx = dot(vec3(a.x,b.x,c.x), vec3(a.x,b.x,c.x));
  float xy = dot(vec3(a.x,b.x,c.x), vec3(a.y,b.y,c.y));
  float yy = dot(vec3(a.y,b.y,c.y), vec3(a.y,b.y,c.y));
  float sx = sqrt(max(xx, 0.00000001));
  float shear = xy / sx;
  float sy = sqrt(max(yy - shear*shear, 0.00000001));
  vec2 offset = vec2(sx*vGaussian.x, shear*vGaussian.x + sy*vGaussian.y);
  gl_Position = projectionMatrix * eye;
  gl_Position.xy += offset * gl_Position.w;
}
`;

const fragmentShader = /* glsl */ `
varying vec2 vGaussian;
varying vec4 vPigment;
void main() {
  float q = dot(vGaussian,vGaussian);
  if (q > 9.0) discard;
  float alpha = vPigment.a * exp(-0.5*q);
  gl_FragColor = vec4(vPigment.rgb, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function buildSplats(canopies) {
  const random = rng(91183);
  const splats = [];
  const create = (x, y, z, width, height, length, angle, color, opacity, crown = 0) => ({
    center: [x, y, z],
    extent: [width, height, length],
    rotation: [Math.cos(angle), Math.sin(angle)],
    pigment: [color.r, color.g, color.b, opacity],
    crown: [crown],
    depth: 0,
  });
  for (const canopy of canopies) {
    for (let i = 0; i < 5; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 0.64 + 0.28 * random();
      const x = canopy.x + Math.cos(angle) * canopy.rx * radius;
      const z = -canopy.t + Math.sin(angle) * canopy.rz * radius;
      const y = canopy.y + (random() - 0.28) * canopy.ry;
      splats.push(create(x, y, z, canopy.rx*0.16, canopy.ry*0.135, canopy.rz*0.15,
        angle, canopy.tint, 0.11 + random()*0.13, 1));
    }
  }

  const mist = new THREE.Color().setRGB(...mistRadiance);
  const reaches = [
    [-335, 42], [-226, 40], [-128, 22], [114, 24], [192, 28], [286, 34], [376, 32],
    [517, 48], [698, 44], [843, 51], [1038, 56],
  ];
  for (const [midpoint, span] of reaches) {
    for (let i = 0; i < 26; i++) {
      const t = midpoint + (random()-0.5)*span*2;
      const side = random() < 0.5 ? -1 : 1;
      const x = THREE.MathUtils.lerp(riverCenter(t), riverBank(t, side), 0.33 + random()*0.72);
      const streamAngle = Math.atan2(riverCenter(t+1) - riverCenter(t-1), 2);
      const height = 0.63 + random()*3.4;
      splats.push(create(x, height, -t, 6+random()*10, 0.48+random()*1.38, 12+random()*19,
        streamAngle+(random()-0.5)*0.4,mist,0.006+random()*0.012));
    }
  }

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3));
  geometry.setIndex([0,1,2, 0,2,3]);
  geometry.instanceCount = splats.length;
  const fields = [['center',3], ['extent',3], ['rotation',2], ['pigment',4], ['crown',1]];
  for (const [name, size] of fields) {
    const attribute = new THREE.InstancedBufferAttribute(new Float32Array(splats.length * size), size);
    geometry.setAttribute(name, attribute.setUsage(THREE.DynamicDrawUsage));
  }
  const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
  }));
  mesh.layers.set(DETAIL_LAYER);
  mesh.frustumCulled = false;
  const lastDirection = new THREE.Vector3();
  const direction = new THREE.Vector3();

  return {
    mesh,
    count: splats.length,
    sort(camera) {
      camera.getWorldDirection(direction);
      if (lastDirection.dot(direction) > 0.99994) return;
      lastDirection.copy(direction);
      for (const splat of splats) {
        const [x, y, z] = splat.center;
        splat.depth = x*direction.x + y*direction.y + z*direction.z;
      }
      splats.sort((a, b) => b.depth - a.depth);
      for (const [name] of fields) {
        const attribute = geometry.getAttribute(name);
        splats.forEach((splat, i) => attribute.array.set(splat[name], i * attribute.itemSize));
        attribute.needsUpdate = true;
      }
    },
  };
}

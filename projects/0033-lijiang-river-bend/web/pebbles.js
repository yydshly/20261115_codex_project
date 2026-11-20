import * as THREE from 'three';
import { bounds, navigationBounds, RIVERBED_LAYER, riverBank, rng } from './river-layout.js';
import { atmosphere, landscapeVertex, noise } from './shaders.js';

const palette = [
  ['#928879', '#bfb8a4', '#8b9189', '#c3baa2'],
  ['#5e6966', '#696c61', '#535750', '#77796d'],
  ['#bbab93', '#9b8168', '#ac8c73', '#8e7860'],
  ['#d3c8ab', '#a5a79e', '#b8b6a9', '#d2c5a9'],
].map((group) => group.map((color) => new THREE.Color(color)));

// Each deposit follows a local bar rather than covering the shoreline at one density.
const gravelBars = [
  { t: -299, side: -1, width: 28, reach: 6.3 },
  { t: 23, side: -1, width: 38, reach: 8.7 },
  { t: 106, side: 1, width: 29, reach: 7.4 },
  { t: 248, side: 1, width: 31, reach: 7.9 },
  { t: 652, side: -1, width: 42, reach: 8.2 },
  { t: 822, side: 1, width: 41, reach: 7.5 },
  { t: 902, side: -1, width: 27, reach: 6.1 },
];

const terrainDomain = new THREE.Vector4(bounds.left, bounds.start, bounds.right-bounds.left, bounds.end-bounds.start);

const shoreMoistureFragment = /* glsl */ `
float shoreMoisture(vec2 p, float height) {
  float shelter = noise2(p*vec2(0.72,0.48)+vec2(9.6,4.3));
  float pockets = noise2(vec2(p.x*2.36+p.y*0.93,p.y*2.84-p.x*0.74)-3.1);
  float wetTop = 0.19 + 0.47*shelter + 0.12*pockets;
  return 1.0-smoothstep(-0.075,wetTop,height + (pockets-0.5)*0.08);
}
`;

function barToeCenter(t) {
  return -25.21 + 0.12*(t-18.4) - 0.29*Math.sin(t*0.62);
}

function barToe(x, t) {
  return Math.exp(-(((t-18.4)/7.25)**2) - (((x-barToeCenter(t))/1.62)**2));
}

// Continuous deposition bands are shared by the scattered clasts and the silt shader.
function gravelRibbon(x, t) {
  const cross = x - 0.168*t + Math.sin(t*0.083)*2.1 + Math.sin(t*0.029)*2.5;
  const streak = Math.sin(cross*1.55 + Math.sin(t*0.39+0.1)*0.29);
  const shallow = Math.sin(x*0.40 + t*0.128 + Math.sin(x*0.18-t*0.344)*0.61);
  const lenticular = Math.cos(t*0.30 + Math.sin(cross*0.37)*2.34);
  const bands = THREE.MathUtils.smoothstep(0.5 + (streak*0.40 + shallow*0.32 + lenticular*0.28)*0.5, 0.25, 0.80);
  return Math.max(bands, barToe(x,t)*(0.83 + 0.17*bands));
}

export const shoreSediment = /* glsl */ `
${shoreMoistureFragment}
float gravelRibbon(vec2 p) {
  float t = -p.y;
  float crossflow = p.x - 0.168*t + sin(t*0.083)*2.1 + sin(t*0.029)*2.5;
  float streak = sin(crossflow*1.55 + sin(t*0.39+0.1)*0.29);
  float shallow = sin(p.x*0.40 + t*0.128 + sin(p.x*0.18-t*0.344)*0.61);
  float lenticular = cos(t*0.30 + sin(crossflow*0.37)*2.34);
  float bands = smoothstep(0.25,0.80,0.5 + (streak*0.40 + shallow*0.32 + lenticular*0.28)*0.5);
  float toeCenter = -25.21 + 0.12*(t-18.4) - 0.29*sin(t*0.62);
  vec2 toeOffset = vec2((t-18.4)/7.25,(p.x-toeCenter)/1.62);
  return max(bands,exp(-dot(toeOffset,toeOffset))*(0.83 + 0.17*bands));
}

vec4 shoreDeposit(vec2 p, float height, float country, float footprint) {
  float ribbon = gravelRibbon(p);
  float siltFlow = noise2(vec2(p.x*0.61+p.y*0.44,p.y*1.17-p.x*0.36));
  float pores = noise2(p*72.3 + 2.17);
  float wetness = shoreMoisture(p,height);
  vec2 drifts = vec2(p.x*1.17+p.y*0.47,p.y*0.53-p.x*0.23);
  float settled = smoothstep(0.34,0.75,noise2(drifts + vec2(2.1,5.9))*0.76 + siltFlow*0.24);
  float wetSilt = wetness*settled*(1.0-smoothstep(0.18,0.72,abs(height+0.09)));
  vec3 fines = mix(vec3(0.128,0.116,0.092),vec3(0.264,0.235,0.188),
    0.41 + (siltFlow-0.5)*0.52 + (country-0.5)*0.31 + (ribbon-0.5)*0.18);
  fines = mix(fines,vec3(0.098,0.091,0.072),wetSilt*0.35);
  float detail = 1.0-smoothstep(0.017,0.092,footprint);
  float relief = (siltFlow-0.5)*0.018;
  fines *= mix(vec3(1.0),vec3(0.72,0.78,0.81),wetness);
  fines *= 1.0 + (pores-0.5)*0.11*detail;
  if (detail > 0.0) {
    vec2 sediment = vec2(dot(p,vec2(0.94,0.28)),dot(p,vec2(-0.32,0.91)))*15.6;
    sediment += (vec2(noise2(p*4.2 + 18.1),noise2(p*4.9 - 4.4))-0.5)*0.88;
    vec2 cell = floor(sediment);
    float nearest = 2.0;
    float tone = 0.5;
    vec2 contact = vec2(0.0);
    for (int y = -1; y <= 1; ++y) {
      for (int x = -1; x <= 1; ++x) {
        vec2 seed = cell + vec2(float(x),float(y));
        vec3 grain = vec3(grainHash(seed+7.1),grainHash(seed+26.9),grainHash(seed-14.2));
        vec2 delta = sediment - (seed + 0.5 + (grain.xy-0.5)*0.70);
        vec2 oval = vec2(delta.x + delta.y*(grain.y-0.5)*0.82,delta.y);
        oval *= vec2(mix(0.71,1.12,grain.x),mix(0.98,1.44,grain.z));
        float size = mix(0.24,0.69,grain.z*grain.z)*mix(0.65,1.15,ribbon);
        float distanceToClast = length(oval)/size;
        if (distanceToClast < nearest) {
          nearest = distanceToClast;
          tone = grainHash(seed+83.7);
          contact = oval;
        }
      }
    }
    float present = smoothstep(0.21,0.51,ribbon + (tone-0.5)*0.38 - wetSilt*0.31);
    float silhouette = (1.0-smoothstep(0.71,1.08,nearest))*present*detail;
    float contactDark = (1.0-smoothstep(0.97,1.45,nearest))*present*detail;
    vec3 gravel = mix(vec3(0.103,0.113,0.101),vec3(0.35,0.311,0.246),tone);
    gravel *= 0.93 + (pores-0.5)*0.18 - dot(contact,vec2(0.31,-0.49));
    gravel *= mix(vec3(1.0),vec3(0.72,0.79,0.81),wetness);
    fines = mix(fines*(1.0-contactDark*0.32),gravel,silhouette);
    relief += silhouette*(1.0-min(1.0,nearest*nearest))*0.013;
  }
  return vec4(fines,relief);
}
`;

const stoneFragment = /* glsl */ `
uniform sampler2D uPebbleLight;
uniform vec4 uTerrainDomain;
uniform bool uHasBakedLight;
varying vec3 vNormalWorld;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vTint;
${noise}
${atmosphere}
${shoreMoistureFragment}

void main() {
  vec3 n = normalize(vNormalWorld);
  vec3 towardEye = normalize(cameraPosition - vWorld);
  float distanceToEye = distance(cameraPosition, vWorld);
  vec2 mineralUV = vec2(vLocal.x*3.7 + vLocal.y*2.5, vLocal.z*3.4 - vLocal.y*1.9);
  float inclusions = fbm(mineralUV + vWorld.xz*2.22);
  float crystalline = noise2(mineralUV*4.3 - vWorld.xz*1.71);
  float mottling = noise2(mineralUV*1.8 + vWorld.xz*2.9);
  float poreCoverage = 1.0 - smoothstep(0.16,0.69,length(fwidth(mineralUV)));
  float seamField = dot(vLocal,vec3(0.31,1.42,0.68)) + (inclusions-0.5)*0.46;
  float quartz = (1.0-smoothstep(0.016,0.042 + 0.52*fwidth(seamField),abs(seamField-0.29)))
    * smoothstep(0.50,0.78,noise2(vWorld.xz*1.20 + 2.17))*poreCoverage;
  float localY = smoothstep(-0.40,0.51,vLocal.y);
  float wet = shoreMoisture(vWorld.xz,vWorld.y + (inclusions-0.5)*0.10);
  float algae = smoothstep(0.49,0.66,mottling)*smoothstep(0.22,0.69,inclusions)
    *(1.0-localY*0.64)*smoothstep(-1.9,-0.72,vWorld.y)*(1.0-smoothstep(-0.07,0.28,vWorld.y));
  vec3 color = vTint * (0.74 + inclusions*0.35 + (mottling-0.47)*0.23 + (crystalline-0.5)*0.23*poreCoverage);
  color = mix(color,vec3(0.151,0.170,0.106),algae*0.83);
  color += vec3(0.181,0.157,0.120)*quartz;
  color *= mix(vec3(1.0),vec3(0.66,0.73,0.75),wet*(0.84+0.16*mottling));
  vec2 terrainUV = (vec2(vWorld.x,-vWorld.z)-uTerrainDomain.xy)/uTerrainDomain.zw;
  vec2 baked = uHasBakedLight ? texture2D(uPebbleLight,terrainUV).rg : vec2(1.0,0.0);
  float exposure = mix(0.28,1.0,baked.x)*(1.0-baked.y*0.58);
  float diffuse = max(0.0,dot(n,sunDirection));
  float contact = mix(0.33,1.0,smoothstep(-0.38,0.42,vLocal.y));
  float skyLight = 0.40 + 0.22*max(0.0,n.y);
  color *= (cloudDiffuseTint*skyLight*(1.0-baked.y*0.16)
    + cloudKeyTint*(0.62*diffuse*exposure*cloudTransmission(vWorld.xz)))*contact;
  vec3 halfVector = normalize(sunDirection + towardEye);
  float lustre = pow(max(0.0,dot(n,halfVector)),mix(21.0,44.0,wet));
  float rim = pow(1.0-clamp(dot(n,towardEye),0.0,1.0),5.0);
  float airFilm = smoothstep(-0.06,0.018,vWorld.y);
  color += vec3(0.64,0.71,0.71)*(0.006 + wet*airFilm*0.054)*lustre*exposure;
  color += vec3(0.20,0.253,0.267)*rim*(0.019 + 0.060*wet*airFilm)*contact;
  gl_FragColor = vec4(aerialPerspective(color,vWorld,distanceToEye),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function addStone(batches, side, detail, form, stone) {
  const key = [side,Math.floor(stone.t/50),detail,form].join(':');
  if (!batches.has(key)) batches.set(key, { detail, form, stones: [] });
  batches.get(key).stones.push(stone);
}

function addRockbankClasts(heightAt, batches, contact) {
  const random = rng(729708);
  // Chips collect in small groups on the flatter ground between the shelves and the channel.
  const groups = [[225.2,2.4],[231.1,1.6],[238.7,2.1],[246.8,2.7],[253.6,1.4],[263.4,2.6]];
  const normal = new THREE.Vector3();
  for (const [center, span] of groups) {
    let placed = 0;
    for (let i = 0; i < 116 && placed < 20; i++) {
      const t = center + (random()+random()-1)*span*1.4;
      const x = riverBank(t,-1) - 0.95 + random()*4.65;
      const y = heightAt(x,t);
      if (y < -0.77 || y > 0.47 || shoreNormal(heightAt,x,t,normal).y < 0.80) continue;
      const coarse = placed < 2;
      const rx = coarse ? 0.16+0.13*random() : 0.035+0.086*random()**1.7;
      const ry = rx*(0.24+0.20*random());
      const rz = rx*(0.56+0.39*random());
      const spin = Math.atan2(riverBank(t+0.52,-1)-riverBank(t-0.52,-1),1.04)
        + (random()-0.39)*1.98;
      const weathered = palette[random() < 0.65 ? 1 : 0];
      const tint = weathered[Math.floor(random()*weathered.length)].clone().multiplyScalar(0.78+0.23*random());
      const stone = { x,t,y:y-ry*(0.19+0.23*random()),rx,ry,rz,spin,tint,tiltTowardUp:0.16 };
      // Uneven, partly embedded chips use the same clast geometry as larger river stones.
      addStone(batches,-1,coarse ? 2 : rx > 0.069 ? 1 : 0,coarse ? 2 : 0,stone);
      if (coarse) contact.push(stone);
      placed++;
    }
  }
}

function distributeStones(heightAt, random) {
  const batches = new Map();
  const contact = [];
  const coarseStep = 3.2;
  for (const side of [-1, 1]) {
    const bars = gravelBars.filter((bar) => bar.side === side);
    for (let reach = navigationBounds.start-19; reach < navigationBounds.end+35; reach += coarseStep) {
      const bar = bars.find((entry) => Math.abs(reach-entry.t) < entry.width);
      const samples = bar ? (bar.t === 23 ? 261 : 104) : 23;
      const toeSamples = side < 0 && reach > 6 && reach < 31 ? 127 : 0;
      for (let i = 0; i < samples + toeSamples; i++) {
        const toe = i >= samples;
        const t = reach + coarseStep*random();
        const bank = riverBank(t, side);
        const x = toe ? barToeCenter(t) + (random()-0.5)*5.8 : bank - side*(-2.4 + 19.2*random()**1.23);
        const across = -side*(x-bank);
        const ground = heightAt(x, t);
        if (ground < -2.13 || ground > 0.72) continue;
        const patch = gravelRibbon(x,t);
        const barStrength = bar ? Math.exp(-(((t-bar.t)/bar.width)**4) - (((across - 4.8)/bar.reach)**2)) : 0;
        const shoal = THREE.MathUtils.smoothstep(ground,-2.13,-0.46);
        const probability = toe
          ? barToe(x,t)*THREE.MathUtils.smoothstep(ground,-0.95,-0.35)*1.42
          : (0.19 + 0.34*patch + barStrength*(0.084 + 0.65*patch))*shoal;
        if (random() > probability) continue;
        const size = random();
        const radius = (toe ? (0.041 + 0.109*size**2.15)
          : (0.026 + (0.219 + patch*0.081 + barStrength*0.062)*size**3.1
            + Math.max(0,size-0.983)*(3.7 + 4.1*barStrength))) * (0.81 + random()*0.38);
        const type = random();
        const group = palette[type < 0.44 ? 0 : type < 0.68 ? 1 : type < 0.87 ? 2 : 3];
        const tint = group[Math.floor(random()*group.length)].clone().multiplyScalar(0.82 + 0.30*random());
        const slab = random();
        const ry = radius*(0.25 + 0.55*slab*slab);
        const rz = radius*(0.53 + random()*0.48);
        const spin = Math.atan2(riverBank(t+0.52,side) - riverBank(t-0.52,side),1.04)
          + Math.PI*0.52 + (random()-0.5)*(slab < 0.53 ? 1.1 : Math.PI*1.8);
        const stone = {
          t, x, y: ground - ry*(0.15 + 0.39*random()), rx: radius, ry, rz, spin, tint,
        };
        const detail = radius > 0.151 ? 2 : radius > 0.070 ? 1 : 0;
        const variant = Math.floor(random()*3);
        const form = detail === 2 && bar ? variant : (side < 0 ? 0 : 1);
        addStone(batches,side,detail,form,stone);
        if (bar && radius > 0.079) contact.push(stone);
      }
    }
  }
  addRockbankClasts(heightAt,batches,contact);
  return { batches, contact };
}

// Rounded clasts retain some bedding facets. Smooth normals follow the deformed clast surface.
function clastGeometry(detail, form) {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const points = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const direction = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const bitangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const surface = new THREE.Vector3();
  const sample = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3(1, 0, 0);
  const deformation = (p, out) => {
    const broad = 0.12*Math.sin(p.x*2.9 + p.y*2.9 + p.z*1.8 + form*1.9);
    const worn = 0.035*Math.cos(p.z*6.8 - p.y*4.3 + form*3.7);
    const bevel = Math.abs(p.x*0.78 + p.y*0.40 - p.z*0.32)**3;
    const flatten = 1.0 - p.y*p.y*(0.08 + form*0.066);
    const profile = 1 + broad + worn + 0.083*p.x*p.z - (0.07 + form*0.064)*bevel;
    out.set((p.x + (0.096 + form*0.056)*p.y)*profile, (p.y + 0.156*p.x*p.z)*profile*flatten,
      (p.z + 0.09*p.x*p.y)*profile);
  };
  for (let i = 0; i < points.count; i++) {
    direction.fromBufferAttribute(points, i).normalize();
    tangent.crossVectors(Math.abs(direction.y) > 0.9 ? side : up, direction).normalize();
    bitangent.crossVectors(direction,tangent);
    deformation(direction, surface);
    deformation(sample.copy(direction).addScaledVector(tangent,0.003).normalize(),a);
    deformation(sample.copy(direction).addScaledVector(bitangent,0.003).normalize(),b);
    normal.crossVectors(a.sub(surface),b.sub(surface)).normalize();
    points.setXYZ(i,surface.x,surface.y,surface.z);
    normals.setXYZ(i,normal.x,normal.y,normal.z);
  }
  return geometry;
}

function shoreNormal(heightAt, x, t, out) {
  const dx = heightAt(x + 0.09,t) - heightAt(x - 0.09,t);
  const dt = heightAt(x,t + 0.09) - heightAt(x,t - 0.09);
  return out.set(-dx,0.18,dt).normalize();
}

function instanceStones(batches, material, heightAt) {
  const groups = new THREE.Group();
  const geometry = Array.from({ length: 3 }, (_, detail) => Array.from({ length: 3 }, (_, form) => clastGeometry(detail,form)));
  const object = new THREE.Object3D();
  const normal = new THREE.Vector3();
  const up = new THREE.Vector3(0,1,0);
  const rotation = new THREE.Quaternion();
  for (const { detail, form, stones } of batches.values()) {
    const mesh = new THREE.InstancedMesh(geometry[detail][form], material, stones.length);
    for (const [i, stone] of stones.entries()) {
      const { x, t, y, rx, ry, rz, spin, tint, tiltTowardUp = 0.41 } = stone;
      shoreNormal(heightAt,x,t,normal).lerp(up,tiltTowardUp).normalize();
      object.quaternion.setFromUnitVectors(up,normal);
      object.quaternion.multiply(rotation.setFromAxisAngle(up,spin));
      object.position.set(x,y,-t);
      object.scale.set(rx,ry,rz);
      object.updateMatrix();
      mesh.setMatrixAt(i,object.matrix);
      mesh.setColorAt(i,tint);
    }
    mesh.layers.enable(RIVERBED_LAYER);
    mesh.computeBoundingSphere();
    groups.add(mesh);
  }
  return groups;
}

function shadowFootprints(stones, heightAt) {
  const geometry = new THREE.PlaneGeometry(2,2);
  geometry.rotateX(-Math.PI*0.5);
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        float radius = length(vUv*2.0 - 1.0);
        float shade = (1.0-smoothstep(0.28,0.95,radius)) * 0.56;
        gl_FragColor = vec4(0.043,0.037,0.030,shade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(geometry,material,stones.length);
  const object = new THREE.Object3D();
  const normal = new THREE.Vector3();
  const up = new THREE.Vector3(0,1,0);
  const rotation = new THREE.Quaternion();
  for (const [i, { x,t,rx,rz,spin,ry }] of stones.entries()) {
    const shadowX = x + ry*0.43;
    const shadowT = t - ry*0.28;
    const ground = heightAt(shadowX,shadowT);
    object.position.set(shadowX,ground + (ground < 0 ? Math.min(0.007,-ground*0.4) : 0.007),-shadowT);
    object.quaternion.setFromUnitVectors(up,shoreNormal(heightAt,shadowX,shadowT,normal));
    object.quaternion.multiply(rotation.setFromAxisAngle(up,spin));
    object.scale.set(rx*1.36,1,rz*1.46);
    object.updateMatrix();
    mesh.setMatrixAt(i,object.matrix);
  }
  mesh.layers.enable(RIVERBED_LAYER);
  mesh.computeBoundingSphere();
  return mesh;
}

export function buildPebbles(heightAt, terrainLight = null) {
  const { batches, contact } = distributeStones(heightAt,rng(862055));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPebbleLight: { value: terrainLight },
      uTerrainDomain: { value: terrainDomain },
      uHasBakedLight: { value: terrainLight !== null },
    },
    vertexShader: landscapeVertex, fragmentShader: stoneFragment,
  });
  return [instanceStones(batches,material,heightAt),shadowFootprints(contact,heightAt)];
}

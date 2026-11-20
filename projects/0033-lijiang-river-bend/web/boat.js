import * as THREE from 'three';
import { atmosphere, noise } from './shaders.js';

// Metres. The keel is below the water plane, the cockpit floor above it.
const stations = [
  // z, half beam, sheer, keel
  [-2.46, 0.028, 0.528, -0.015],
  [-2.34, 0.107, 0.507, -0.065],
  [-2.11, 0.234, 0.473, -0.109],
  [-1.75, 0.389, 0.435, -0.143],
  [-1.32, 0.506, 0.397, -0.178],
  [-0.78, 0.588, 0.371, -0.195],
  [-0.20, 0.620, 0.365, -0.201],
  [0.43, 0.615, 0.371, -0.195],
  [1.04, 0.576, 0.386, -0.170],
  [1.58, 0.502, 0.407, -0.133],
  [2.04, 0.416, 0.430, -0.086],
  [2.24, 0.365, 0.439, -0.060],
];
const section = [
  [-1, 1], [-0.96, 0.78], [-0.86, 0.53], [-0.71, 0.27], [-0.52, 0.08], [0, 0],
  [0.52, 0.08], [0.71, 0.27], [0.86, 0.53], [0.96, 0.78], [1, 1],
];
const palette = {
  hull: ['#6b5440','#6f5c47','#775b43','#604d3b','#544637'],
  inside: ['#938067','#85735b','#8f7b5c','#7c6b53','#73624e'],
  floor: ['#938067','#a58e70','#8e775e','#9a8060','#a48e69','#8c785d','#957b63'],
  bow: ['#aa9272','#9c8665','#a78f71','#9a8163'],
  rail: '#665340',
  rib: '#715f48',
  seat: '#8e7254',
  iron: '#383832',
  rope: '#b0a088',
};

const vertexShader = /* glsl */ `
attribute vec3 aTimber;
attribute float aFinish;
varying vec3 vWorld;
varying vec3 vNormalWorld;
varying vec3 vTimber;
varying vec2 vGrain;
varying float vFinish;
void main() {
  vTimber = aTimber;
  vFinish = aFinish;
  vGrain = uv;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vNormalWorld = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalWorld;
varying vec3 vTimber;
varying vec2 vGrain;
varying float vFinish;
${noise}
${atmosphere}

void main() {
  vec3 n = normalize(vNormalWorld) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 eye = normalize(cameraPosition - vWorld);
  float knots = fbm(vGrain * vec2(12.0, 4.5));
  float rippled = vGrain.x + 0.052 * noise2(vGrain * vec2(8.0, 2.4)) + 0.022 * knots;
  vec2 fiberUV = vec2(rippled * 95.0, vGrain.y * 3.6);
  float pixelWidth = max(fwidth(fiberUV.x), fwidth(fiberUV.y));
  float grain = mix(noise2(fiberUV), 0.5, smoothstep(0.19, 1.05, pixelWidth));
  float flecks = noise2(vec2(rippled * 34.0, vGrain.y * 0.99));
  float fibers = (knots-0.5)*0.36 + (grain-0.5)*0.28 + (flecks-0.5)*0.12;
  float wood = step(0.5, vFinish);
  float bilgeDamp = (1.0 - smoothstep(-0.07, 0.26, vWorld.y + (knots-0.5)*0.063)) * wood;
  vec3 pigment = vTimber * (1.0 + fibers * mix(0.32, 1.0, wood));
  pigment *= mix(vec3(1.0), vec3(0.63,0.69,0.70), 0.71*bilgeDamp);
  float openSky = 0.56 + 0.34 * max(0.0, n.y);
  float direct = max(0.0, dot(n,sunDirection)) * 0.49;
  vec3 color = pigment*(openSky*cloudDiffuseTint+direct*cloudKeyTint*cloudTransmission(vWorld.xz));
  vec3 halfAngle = normalize(eye + sunDirection);
  float glint = pow(max(0.0, dot(n,halfAngle)), mix(16.0,39.0,bilgeDamp));
  color += vec3(0.41,0.43,0.44) * glint * (0.025 + bilgeDamp*0.076 + (1.0-wood)*0.02);
  gl_FragColor = vec4(aerialPerspective(color, vWorld, distance(vWorld, cameraPosition)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function stationAt(z) {
  const slot = Math.max(0, stations.findIndex((row) => row[0] >= z) - 1);
  const [a, b] = stations.slice(slot, slot + 2);
  const t = (z - a[0]) / (b[0] - a[0]);
  return {
    z,
    beam: THREE.MathUtils.lerp(a[1], b[1], t),
    sheer: THREE.MathUtils.lerp(a[2], b[2], t),
    keel: THREE.MathUtils.lerp(a[3], b[3], t),
  };
}

function sectionPoint(station, shape, inside) {
  const [x, y] = shape;
  const beam = inside ? Math.max(0.008, station.beam - 0.039) : station.beam;
  const sheer = inside ? station.sheer - 0.028 : station.sheer;
  const low = inside ? 0.041 + Math.max(0.0, station.z - 1.19) * 0.038 : station.keel;
  return [x * beam, THREE.MathUtils.lerp(low, sheer, y), station.z];
}

function buildMesh() {
  const positions = [];
  const coloring = [];
  const finish = [];
  const grain = [];
  const indices = [];
  const color = new THREE.Color();

  function put(point, uv, shade, timber = true) {
    const slot = positions.length / 3;
    positions.push(...point);
    grain.push(...uv);
    color.set(shade);
    coloring.push(color.r, color.g, color.b);
    finish.push(Number(timber));
    return slot;
  }

  function quad(points, uv, shade) {
    const start = positions.length / 3;
    points.forEach((point, i) => put(point, uv[i], shade));
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  function skin(inside) {
    const rows = stations.flatMap(([z], i) => i === stations.length - 1
      ? [stationAt(z)]
      : [stationAt(z), stationAt(THREE.MathUtils.lerp(z, stations[i + 1][0], 0.5))]);
    for (let band = 0; band < section.length - 1; band++) {
      const first = positions.length / 3;
      const step = inside ? palette.inside : palette.hull;
      const shade = step[Math.min(band, section.length - 2 - band)];
      rows.forEach((station) => {
        put(sectionPoint(station, section[band], inside), [band * 0.20, station.z], shade);
        put(sectionPoint(station, section[band + 1], inside), [band * 0.20 + 0.12, station.z], shade);
      });
      for (let i = 0; i < rows.length - 1; i++) {
        const a = first + i * 2;
        if (inside) indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        else indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }

  function plank(points, thickness, grainAcross, shade) {
    const uv = (p) => grainAcross ? [p[2], p[0]] : [p[0], p[2]];
    quad(points, points.map(uv), shade);
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const face = [b, a, [a[0], a[1] - thickness, a[2]], [b[0], b[1] - thickness, b[2]]];
      quad(face, face.map(uv), shade);
      if (thickness >= 0.017 && i === points.length - 1) {
        const bottom = points.map(([x, y, z]) => [x, y - thickness, z]).reverse();
        quad(bottom, bottom.map(uv), shade);
      }
    }
  }

  function rectangularPlank(minX, maxX, y, near, far, thickness, grainAcross, shade) {
    plank([[minX,y,near],[minX,y,far],[maxX,y,far],[maxX,y,near]], thickness, grainAcross, shade);
  }

  function tube(points, diameter, shade, timber = true) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const length = curve.getLength();
    const steps = Math.min(84, Math.max(points.length * 2, Math.ceil(length * 12)));
    const geometry = new THREE.TubeGeometry(curve, steps, diameter / 2, 7, false);
    const pos = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const start = positions.length / 3;
    for (let i = 0; i < pos.count; i++) {
      put([pos.getX(i), pos.getY(i), pos.getZ(i)], [uv.getY(i) * diameter * Math.PI, uv.getX(i) * length], shade, timber);
    }
    for (const i of geometry.index.array) indices.push(start + i);
    geometry.dispose();
  }

  function ironPin(x, y, z) {
    const sideCount = 6;
    const rad = 0.007;
    const top = put([x, y, z], [0, 0], palette.iron, false);
    for (let i = 0; i < sideCount; i++) {
      const a = i * Math.PI * 2 / sideCount;
      put([x + Math.cos(a) * rad, y, z + Math.sin(a) * rad], [0, 0], palette.iron, false);
      indices.push(top, top + 1 + (i + 1) % sideCount, top + 1 + i);
    }
  }

  skin(false);
  skin(true);

  for (const side of [-1, 1]) {
    tube(stations.map(([z, beam, sheer]) => [side * (beam - 0.012), sheer, z]), 0.057, palette.rail);
  }

  // Close the stern and protect the pointed stem with a solid foredeck.
  const prow = stationAt(-2.46);
  const stem = [[-prow.beam,prow.sheer,prow.z],[-0.018,prow.keel,prow.z],
    [0.018,prow.keel,prow.z],[prow.beam,prow.sheer,prow.z]];
  quad(stem, stem.map(([x, y]) => [x, y]), palette.hull[0]);
  const aft = stationAt(2.24);
  tube([[-aft.beam, aft.sheer, aft.z],[0, aft.sheer + 0.011, aft.z + 0.022],[aft.beam, aft.sheer, aft.z]], 0.057, palette.rail);
  for (let row = 0; row < 4; row++) {
    const y = aft.keel + (aft.sheer - aft.keel) * row / 4;
    const nextY = aft.keel + (aft.sheer - aft.keel) * (row + 1) / 4;
    const width = aft.beam * (0.68 + row * 0.084);
    const nextWidth = aft.beam * (0.68 + (row + 1) * 0.084);
    const face = [[-width,y,aft.z],[width,y,aft.z],[nextWidth,nextY,aft.z],[-nextWidth,nextY,aft.z]];
    quad(face, face.map(([x, y]) => [y, x]), palette.hull[row]);
  }
  const foredeck = [stationAt(-2.446), stationAt(-2.11), stationAt(-1.69)];
  const deckHeight = (station, across) => station.sheer - 0.025 - Math.abs(across) * 0.012;
  const top = (station, across) => [station.beam * across, deckHeight(station, across), station.z];
  for (let row = 0; row < foredeck.length - 1; row++) {
    const [a, b] = foredeck.slice(row, row + 2);
    const lining = [top(a,-0.98),top(b,-0.98),top(b,0.98),top(a,0.98)];
    for (const point of lining) point[1] -= 0.016;
    quad(lining, lining.map(([x,,z]) => [x, z]), palette.inside[4]);
    for (let i = 0; i < 4; i++) {
      const min = -1 + i * 0.5 + 0.012;
      const max = min + 0.476;
      plank([top(a,min),top(b,min),top(b,max),top(a,max)], 0.022, false, palette.bow[i]);
    }
  }
  rectangularPlank(-0.36, 0.36, 0.355, 1.70, 2.16, 0.047, true, palette.seat);

  const soleWidth = 0.645;
  const step = soleWidth / palette.floor.length;
  for (const [i, shade] of palette.floor.entries()) {
    const min = -soleWidth / 2 + i * step + 0.002;
    const max = min + step - 0.005;
    rectangularPlank(min, max, 0.089 + (i % 3 - 1) * 0.003, -1.48, 1.76, 0.036, false, shade);
    for (const z of [-1.31, 0.19, 1.61]) ironPin((min + max) / 2, 0.094, z);
  }
  for (const z of [-1.48,-0.84,-0.23,0.43,1.05,1.61]) {
    const station = stationAt(z);
    const curve = section.map((shape) => {
      const [x, y, t] = sectionPoint(station, shape, true);
      return [x * 0.969, y + 0.018, t];
    });
    tube(curve, 0.036, palette.rib);
  }
  for (const z of [-1.12, 0.85]) {
    const width = stationAt(z).beam - 0.114;
    rectangularPlank(-width, width, 0.268, z - 0.108, z + 0.122, 0.036, true, palette.seat);
    for (const x of [-width + 0.047, width - 0.047]) {
      ironPin(x, 0.272, z - 0.069);
      ironPin(x, 0.272, z + 0.069);
    }
  }

  const rope = [];
  for (let i = 0; i <= 44; i++) {
    const u = i / 44;
    const angle = u * Math.PI * 5.7;
    const radius = 0.104 - 0.049 * u;
    const x = 0.020 + Math.cos(angle) * radius;
    const z = -1.96 + Math.sin(angle) * radius * 0.92;
    const station = stationAt(z);
    rope.push([x, deckHeight(station, x / station.beam) + 0.008 + u * 0.004, z]);
  }
  rope.push([0.020,0.456,-2.13],[0.009,0.482,-2.23],[0.011,0.505,-2.31]);
  tube(rope, 0.015, palette.rope, false);
  rectangularPlank(-0.028, 0.028, 0.514, -2.306, -2.227, 0.026, false, palette.rail);
  tube([[-0.050,0.515,-2.267],[0,0.513,-2.269],[0.050,0.515,-2.267]], 0.025, palette.rail);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(grain, 2));
  geometry.setAttribute('aTimber', new THREE.Float32BufferAttribute(coloring, 3));
  geometry.setAttribute('aFinish', new THREE.Float32BufferAttribute(finish, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    name: 'Weathered river boat timber',
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  }));
}

export function buildBoat() {
  const boat = new THREE.Group();
  boat.name = 'Wooden river boat';
  boat.add(buildMesh());
  boat.visible = false;
  return boat;
}

import * as THREE from 'three';
import { makeFoliageMaterials } from './foliage-material.js';
import { bounds, DETAIL_LAYER, navigationBounds, riverBank, rng } from './river-layout.js';
import { landscapeVertex } from './shaders.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const EAST = new THREE.Vector3(1, 0, 0);
const smooth = THREE.MathUtils.smoothstep;
const tileSize = 27;
const shrubType = 3;
const rootSides = 7;

const rootVertex = /* glsl */ `
attribute vec3 rootBark;
varying vec3 vBarkNormal;
#define main placeRootVertex
${landscapeVertex}
#undef main
void main() {
  placeRootVertex();
  vLocal = rootBark;
  vBarkNormal = normal;
}
`;

const species = [
  { limbs: 9, firstBough: 0.32, spread: 0.41, rise: 0.16, lean: 0.082, stem: 0.038, spray: 0.29,
    blade: 0.030, bladeWidth: 0.30, sweep: 0.19, tint: '#60774a' },
  { limbs: 11, firstBough: 0.32, spread: 0.28, rise: 0.10, lean: 0.113, stem: 0.030, spray: 0.24,
    blade: 0.024, bladeWidth: 0.25, sweep: 0.085, tint: '#4c6547' },
  { limbs: 8, firstBough: 0.24, spread: 0.36, rise: 0.23, lean: 0.093, stem: 0.036, spray: 0.30,
    blade: 0.032, bladeWidth: 0.21, sweep: 0.26, tint: '#748057' },
  { limbs: 9, firstBough: 0.09, spread: 0.53, rise: 0.12, lean: 0.027, stem: 0.014, spray: 0.40,
    blade: 0.056, bladeWidth: 0.29, sweep: 0.18, tint: '#677f50' },
];

function patch(x, t) {
  return 0.51 + 0.19 * Math.sin(x * 0.103 + t * 0.141 + 1.42 * Math.sin(t * 0.048))
    + 0.16 * Math.sin(x * 0.207 - t * 0.093 + Math.cos(x * 0.167))
    + 0.13 * Math.sin(t * 0.218 - x * 0.089);
}

function meshData() {
  return { positions: [], normals: [], indices: [], uv: [], exposure: [], leafTint: [] };
}

function geometryFrom(data) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
  geometry.setIndex(data.indices);
  if (data.uv.length) {
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
    geometry.setAttribute('exposure', new THREE.Float32BufferAttribute(data.exposure, 1));
  }
  if (data.leafTint.length) geometry.setAttribute('leafTint', new THREE.Float32BufferAttribute(data.leafTint, 1));
  return geometry;
}

function tube(data, path, radius, sides, reference) {
  const base = data.positions.length / 3;
  const tangent = new THREE.Vector3();
  const right = new THREE.Vector3();
  const across = new THREE.Vector3();
  const spoke = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  for (const [ring, center] of path.entries()) {
    tangent.subVectors(path[Math.min(path.length - 1, ring + 1)], path[Math.max(0, ring - 1)]).normalize();
    right.crossVectors(reference ?? (Math.abs(tangent.y) > 0.94 ? EAST : UP), tangent).normalize();
    across.crossVectors(tangent, right);
    for (let side = 0; side < sides; side++) {
      const azimuth = TAU * side / sides;
      spoke.copy(right).multiplyScalar(Math.cos(azimuth)).addScaledVector(across, Math.sin(azimuth));
      vertex.copy(center).addScaledVector(spoke, radius[ring]);
      data.positions.push(vertex.x, vertex.y, vertex.z);
      data.normals.push(spoke.x, spoke.y, spoke.z);
      if (ring === path.length - 1) continue;
      const a = base + ring * sides + side;
      const b = base + ring * sides + (side + 1) % sides;
      data.indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
}

function sprayCard(data, center, size, yaw, pitch, roll, variant, exposure) {
  const u = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
  const v = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const normal = new THREE.Vector3().crossVectors(u, v).normalize();
  const horizontal = u.clone().multiplyScalar(Math.cos(roll)).addScaledVector(v, Math.sin(roll));
  const vertical = v.clone().multiplyScalar(Math.cos(roll)).addScaledVector(u, -Math.sin(roll));
  const index = data.positions.length / 3;
  const tileX = (variant % 2) * 0.5;
  const tileY = (1 - Math.floor(variant / 2)) * 0.5;
  for (const [x, y] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
    const p = center.clone()
      .addScaledVector(horizontal, size * (x - 0.5))
      .addScaledVector(vertical, size * 0.89 * (y - 0.5));
    data.positions.push(p.x, p.y, p.z);
    data.normals.push(normal.x, normal.y, normal.z);
    data.uv.push(tileX + x * 0.5, tileY + y * 0.5);
    data.exposure.push(exposure);
  }
  data.indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
}

const bladeOutline = [[0, 0], [0.31, 1], [0.68, 0.83], [1, 0.05], [0.71, -0.73], [0.36, -0.96]];
const bladePoints = [...bladeOutline, [0.48, 0]];

function leafBlade(data, base, yaw, pitch, roll, length, width, curl, exposure, tint) {
  const along = new THREE.Vector3(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
  const across = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw)).applyAxisAngle(along, roll);
  const top = new THREE.Vector3().crossVectors(across, along);
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const index = data.positions.length / 3;
  for (const [u, v] of bladePoints) {
    // The midrib holds a shallow arch while the two margins curl toward its underside.
    const arch = Math.sin(u * Math.PI);
    const camber = curl * u * u + 0.089 * arch * (1 - v * v) + 0.025 * v * arch;
    point.copy(base).addScaledVector(along, u * length).addScaledVector(across, v * width)
      .addScaledVector(top, camber * length);
    const longitudinal = 2 * curl * u + Math.PI * Math.cos(u * Math.PI) * (0.089 * (1 - v * v) + 0.025 * v);
    const transverse = (0.025 - 0.178 * v) * arch * length / width;
    normal.copy(top).addScaledVector(along, -longitudinal).addScaledVector(across, -transverse).normalize();
    data.positions.push(point.x, point.y, point.z);
    data.normals.push(normal.x, normal.y, normal.z);
    data.uv.push(u, 0.5 + 0.5 * v);
    data.exposure.push(exposure);
    data.leafTint.push(tint);
  }
  for (let side = 0; side < bladeOutline.length; side++) {
    data.indices.push(index + bladeOutline.length, index + side, index + (side + 1) % bladeOutline.length);
  }
}

function leafyShoots(high, random, spec, base, direction, diameter, exposure, shootCount) {
  for (let shoot = 0; shoot < shootCount; shoot++) {
    const spread = direction + (shoot - (shootCount - 1) * 0.5) * 1.34 + (random() - 0.5) * 0.6;
    const reach = diameter * (0.26 + random() * 0.31);
    const end = base.clone().add(new THREE.Vector3(Math.cos(spread) * reach,
      diameter * (random() * 0.52 - 0.17), Math.sin(spread) * reach));
    const elbow = base.clone().lerp(end, 0.58).addScaledVector(UP, diameter * 0.09);
    const thickness = spec.stem * (0.042 + random() * 0.032);
    tube(high.bark, [base, elbow, end], [thickness, thickness * 0.60, thickness * 0.26], 3);

    const leaves = 7 + Math.floor(random() * 4);
    const shootTint = 0.24 + random() * 0.45;
    for (let i = 0; i < leaves; i++) {
      const u = 0.08 + (i + 0.67 * random()) * 0.92 / leaves;
      const petiole = u < 0.58 ? base.clone().lerp(elbow, u / 0.58) : elbow.clone().lerp(end, (u - 0.58) / 0.42);
      const side = i % 2 ? 1 : -1;
      const yaw = spread + side * (0.50 + random() * 1.46);
      const pitch = -0.48 + random() * 1.19 + u * 0.16;
      const roll = (random() - 0.5) * 2.17;
      const length = spec.blade * (0.74 + random() * 0.70) * (1.18 - 0.31 * u);
      const width = length * spec.bladeWidth * (0.84 + 0.33 * random());
      const curl = (random() - 0.70) * 0.37;
      const visibility = THREE.MathUtils.clamp(exposure + (random() - 0.53) * 0.27 + (u - 0.41) * 0.15, 0, 1);
      const tint = THREE.MathUtils.clamp(shootTint + (random() - 0.5) * 0.45, 0, 1);
      leafBlade(high.blades, petiole, yaw, pitch, roll, length, width, curl, visibility, tint);
    }
    leafBlade(high.blades, end, spread, -0.1, (random()-0.5)*0.8, spec.blade*0.73,
      spec.blade*spec.bladeWidth*0.77, -0.13, exposure, Math.min(1, shootTint + 0.14));
  }
}

function stemPosition(spec, level) {
  return new THREE.Vector3(spec.lean*level*level+Math.sin(level*7.4)*level*0.022,
    level,-spec.lean*level*0.43+Math.sin(level*4.1)*level*0.031);
}

function buildTree(spec, type) {
  const random = rng(51901 + type * 771);
  const shoots = rng(84553 + type * 1421);
  const high = { leaves: meshData(), blades: meshData(), bark: meshData() };
  const middle = { leaves: meshData(), bark: meshData() };
  const distant = type === 0 ? { leaves: meshData() } : null;
  const stem = (level) => stemPosition(spec,level);
  const shrubStem = (level, fork) => {
    const lean = Math.max(0, level - 0.075) ** 1.12 * (fork > 0 ? 0.26 : 0.31);
    return stem(level).add(new THREE.Vector3(fork * lean * 0.86, 0, fork * lean * 0.51));
  };
  const trunk = [stem(-0.123), stem(0.013), stem(0.064), stem(0.23), stem(0.45), stem(0.68), stem(0.91), stem(1.0)];
  const taper = [1.46, 1.17, 0.99, 0.76, 0.61, 0.41, 0.20, 0.045].map((width) => width * spec.stem);
  tube(high.bark, trunk, taper, 9);
  tube(middle.bark, trunk, taper, 6);

  if (type === shrubType) {
    for (const fork of [-1, 1]) {
      const leader = [0.032, 0.24, 0.56, fork > 0 ? 0.85 : 0.73].map((height) => shrubStem(height, fork));
      const scale = [0.73, 0.54, 0.38, 0.08].map((size) => size * spec.stem);
      tube(high.bark, leader, scale, 6);
      tube(middle.bark, leader, scale, 4);
    }
  }

  const addSprays = (center, diameter, direction, exposure, outer) => {
    const age = Math.floor(random() * 4);
    const fullLobe = exposure > 0.57 && (age !== 1 || outer);
    const insideLayers = fullLobe ? 3 : 2;
    for (let i = 0; i < 4; i++) {
      const yaw = direction + i * 1.62 + random() * 0.55;
      const pitch = 0.43 + random() * 0.97;
      const roll = (random() - 0.5) * 1.36;
      const place = center.clone().add(new THREE.Vector3(
        (random() - 0.5) * diameter * 0.43, (random() - 0.5) * diameter * 0.46, (random() - 0.5) * diameter * 0.43,
      ));
      const variation = 0.87 + random() * 0.37;
      // Interior cards supply the densely overlapped leaves behind the articulated outer shoots.
      if (i < insideLayers) sprayCard(high.leaves, place.clone().lerp(center, 0.21), diameter * variation * 0.95,
        yaw, pitch, roll, (age + i) % 4, exposure * 0.85);
      if (i < 2) sprayCard(middle.leaves, place, diameter * 1.14, yaw, pitch, roll, (age + i) % 4, exposure);
      if (distant && outer && i < 2) sprayCard(distant.leaves, center, diameter * 1.4, yaw, pitch, roll, (age + i) % 4, exposure);
    }
    leafyShoots(high, shoots, spec, center, direction, diameter, exposure, fullLobe ? 3 : 2);
  };

  for (let i = 0; i < spec.limbs; i++) {
    const order = i / (spec.limbs - 1);
    const collar = spec.firstBough + order * (0.79 - spec.firstBough) + (random() - 0.55) * 0.077;
    const start = type === shrubType && collar < 0.72 ? shrubStem(collar, i % 3 - 1) : stem(collar);
    const azimuth = i * 2.399963 + 0.96 * (random() - 0.5);
    const crown = 1 + spec.sweep * Math.cos(azimuth - 1.32);
    const canopyDepth = 0.83 + Math.sin(order*Math.PI)*0.24 - 0.37*order ** 2;
    const reach = spec.spread * (0.67 + random() * 0.52) * canopyDepth * crown;
    const bend = azimuth + (random() - 0.5) * 0.55;
    const run = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth));
    const end = start.clone().addScaledVector(run, reach);
    end.y += spec.rise * (0.62 + random() * 0.74);
    const elbow = start.clone().add(new THREE.Vector3(Math.cos(bend) * reach * 0.49, spec.rise * (0.28 + 0.26 * random()),
      Math.sin(bend) * reach * 0.49));
    const wrist = elbow.clone().lerp(end, 0.66).addScaledVector(UP, spec.rise * (0.24 * random() - 0.16));
    const radius = spec.stem * (0.48 - 0.24 * order);
    tube(high.bark, [start, elbow, wrist, end], [radius, radius * 0.63, radius * 0.34, 0.0018], 6);
    tube(middle.bark, [start, elbow, wrist, end], [radius, radius * 0.63, radius * 0.34, 0.0018], 4);

    for (let fork = 0; fork < 3; fork++) {
      const startAt = fork === 0 ? start.clone().lerp(elbow, 0.63) : elbow.clone().lerp(end, 0.32 * fork);
      const spread = bend + (fork % 2 === 0 ? -1 : 1) * (0.72 + random() * 0.66);
      const branchLength = reach * (0.36 + random() * 0.40);
      const tip = startAt.clone().add(new THREE.Vector3(
        Math.cos(spread) * branchLength, (random() * 0.18 + 0.045) * (1 - 0.42 * order), Math.sin(spread) * branchLength,
      ));
      const angled = startAt.clone().lerp(tip, 0.53).addScaledVector(UP, -0.021);
      tube(high.bark, [startAt, angled, tip], [radius * 0.58, radius * 0.34, 0.001], 5);
      addSprays(tip, spec.spray * (0.67 + random() * 0.47), spread, 0.38 + 0.52 * order, false);
    }
    addSprays(end, spec.spray * (0.84 + random() * 0.47), bend, 0.51 + 0.44 * order, true);
  }

  addSprays(stem(0.91), spec.spray * 0.84, 2.6, 0.98, true);
  addSprays(stem(0.99), spec.spray * 0.68, 5.0, 1, true);
  return (distant ? [high, middle, distant] : [high, middle]).map((level) => ({
    leaves: geometryFrom(level.leaves),
    blades: level.blades ? geometryFrom(level.blades) : null,
    bark: level.bark ? geometryFrom(level.bark) : null,
  }));
}

function grassClump(tall) {
  const random = rng(tall ? 98176 : 48522);
  const positions = [];
  const indices = [];
  const bladeCount = tall ? 9 : 7;
  for (let blade = 0; blade < bladeCount; blade++) {
    const angle = blade * 2.399963 + random() * 0.55;
    const forwardX = Math.cos(angle);
    const forwardZ = Math.sin(angle);
    const height = 0.43 + random() * 0.57;
    const reach = (0.12 + random() * 0.42) * (tall ? 0.66 : 1);
    const width = (0.024 + random() * 0.037) * (tall ? 0.72 : 1);
    const offset = -0.022 + random() * 0.12;
    const base = positions.length / 3;
    for (let rung = 0; rung <= 4; rung++) {
      const u = rung / 4;
      const extent = offset + reach * u ** 1.52;
      const centerX = forwardX * extent;
      const centerZ = forwardZ * extent;
      const y = height * (u * 1.27 - u * u * 0.36);
      const half = width * (0.95 - u * 0.94);
      positions.push(
        centerX - forwardZ * half, y, centerZ + forwardX * half,
        centerX + forwardZ * half, y, centerZ - forwardX * half,
      );
      if (rung === 4) continue;
      const a = base + rung * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function fernClump() {
  const random = rng(10882);
  const positions = [];
  const indices = [];
  for (let frond = 0; frond < 6; frond++) {
    const angle = frond * 2.399963 + random() * 0.42;
    const radius = 0.62 + random() * 0.39;
    const height = 0.21 + random() * 0.17;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    for (let pair = 0; pair < 7; pair++) {
      const u = 0.12 + pair * 0.125;
      const leaf = (0.15 + 0.12 * Math.sin(u * Math.PI)) * (1 - 0.74 * u);
      const x = dx * radius * u;
      const z = dz * radius * u;
      const y = Math.sin(u * 2.03) * height;
      for (const side of [-1, 1]) {
        const lateralX = -dz * side;
        const lateralZ = dx * side;
        const index = positions.length / 3;
        positions.push(
          x, y, z,
          x + lateralX * leaf * 0.49, y + 0.024, z + lateralZ * leaf * 0.49,
          x + dx * leaf * 0.51 + lateralX * leaf, y - 0.029, z + dz * leaf * 0.51 + lateralZ * leaf,
          x + dx * leaf * 0.39 + lateralX * leaf * 0.49, y - 0.008, z + dz * leaf * 0.39 + lateralZ * leaf * 0.49,
        );
        indices.push(index, index + 1, index + 3, index + 1, index + 2, index + 3);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function fallenLeaf() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, -0.5, -0.25, 0.04, -0.07, 0, 0.1, 0.05, 0.21, 0.02, 0.12, 0.02, 0.05, 0.56,
  ], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3, 1, 4, 2, 2, 4, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function tileItems(items) {
  const tiles = new Map();
  for (const item of items) {
    const col = Math.floor(item.x / tileSize);
    const row = Math.floor(item.t / tileSize);
    const key = `${col}:${row}`;
    if (!tiles.has(key)) {
      tiles.set(key, { x: (col + 0.5) * tileSize, t: (row + 0.5) * tileSize, items: [] });
    }
    tiles.get(key).items.push(item);
  }
  return tiles.values();
}

function posePlant(transform, item, tile) {
  transform.position.set(item.x-tile.x, item.y-tile.y, tile.t-item.t);
  transform.rotation.set(item.leanX ?? 0, item.angle, item.leanZ ?? 0);
  transform.scale.set(item.sx,item.sy,item.sz);
  transform.updateMatrix();
}

function placeBatch(geometry, material, items, center) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const transform = new THREE.Object3D();
  for (const [i, item] of items.entries()) {
    posePlant(transform,item,center);
    mesh.setMatrixAt(i, transform.matrix);
    mesh.setColorAt(i, item.tint);
  }
  mesh.computeBoundingSphere();
  return mesh;
}

function traceRoot(data, anchor, heightAt, {size,width,reach,angle,bend,exposed}) {
  const steps = Math.max(5,Math.ceil(reach/0.105));
  const path = [anchor];
  const radii = [width];
  const surface = [heightAt(anchor.x,anchor.z)];
  const lift = anchor.y-surface[0];
  for (let step = 1; step <= steps; step++) {
    const u = step/steps;
    const radius = width*(0.09+0.91*(1-u)**1.28);
    const heading = angle+bend*Math.sin(u*2.46);
    const x = anchor.x+Math.cos(heading)*reach*u;
    const z = anchor.z+Math.sin(heading)*reach*u;
    const y = heightAt(x,z);
    const last = path.at(-1);
    const span = Math.hypot(x-last.x,z-last.z);
    // A root re-enters the bank rather than bridging an abrupt shelf break.
    if (Math.abs(y-surface.at(-1)) > 0.047+span*2.10) break;
    const collar = 1-smooth(u,0.0,0.38);
    const cover = -0.29+exposed*0.35+0.28*Math.sin(u*TAU+angle);
    path.push(new THREE.Vector3(x,y+lift*collar+radius*cover,z));
    radii.push(radius);
    surface.push(y);
  }
  if (path.length < 4) return;
  const end = path.length-1;
  for (let ring = Math.max(2,end-2); ring <= end; ring++) {
    const taper = (ring-end+2)/2;
    const radius = radii[ring]*(1-taper*0.81);
    radii[ring] = radius;
    path[ring].y -= taper*(0.013+width*0.36+radius*1.6);
    if (ring === end) path[ring].y = Math.min(path[ring].y,surface[ring]-radius-0.007);
  }
  tube(data,path,radii,rootSides,UP);
  let distance = 0;
  const rotation = angle*0.71;
  for (const [ring,point] of path.entries()) {
    if (ring) distance += point.distanceTo(path[ring-1]);
    const barkRadius = radii[ring]/size;
    for (let side = 0; side < rootSides; side++) {
      const azimuth = TAU*side/rootSides+rotation;
      data.barkCoordinates.push(Math.cos(azimuth)*barkRadius,distance/size,Math.sin(azimuth)*barkRadius);
    }
  }
}

function makeRootBatch(tile, heightAt, material) {
  const candidates = tile.items.filter(({t,edge,sy,type}) =>
    t > -22 && t < 352 && edge < (t > 216 && t < 277 ? 23 : 15.5) && sy > (type === shrubType ? 1.28 : 1.04));
  candidates.sort((a,b) => a.edge-b.edge+1.44*(b.sy-a.sy));
  const cutting = { ...meshData(), barkCoordinates:[] };
  const transform = new THREE.Object3D();
  const surface = (x,z) => heightAt(x+tile.x,tile.t-z)-tile.y;
  for (const tree of candidates.slice(0,15)) {
    const spec = species[tree.type];
    const shrub = tree.type === shrubType;
    const random = rng(Math.imul(Math.floor(tree.x*127),160481183)^Math.imul(Math.floor(tree.t*197),523592429));
    const trunkRadius = spec.stem*Math.sqrt(tree.sx*tree.sz);
    posePlant(transform,tree,tile);
    const count = shrub ? 3 : 4+Math.floor(random()*3);
    for (let root = 0; root < count; root++) {
      const angle = tree.angle+TAU*root/count+(random()-0.5)*0.55;
      const level = shrub ? 0.024+random()*0.019 : 0.040+random()*0.038;
      const anchor = stemPosition(spec,level).applyMatrix4(transform.matrix);
      const width = trunkRadius*(0.47+random()*0.31);
      const reach = Math.min(2.12,trunkRadius*(3.1+random()*5.2));
      traceRoot(cutting,anchor,surface,{ size:tree.sy,width,reach,angle,bend:(random()-0.5)*0.61,exposed:random() });
    }
  }
  if (!cutting.indices.length) return null;
  const geometry = geometryFrom(cutting);
  geometry.setAttribute('rootBark',new THREE.Float32BufferAttribute(cutting.barkCoordinates,3));
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry,material);
  mesh.name = 'Surface roots';
  return mesh;
}

function renderTrees(trees, forms, materials, heightAt) {
  const forest = new THREE.Group();
  for (const tile of tileItems(trees)) {
    const nearPath = tile.items.some((tree) => tree.t >= navigationBounds.start - 20
      && tree.t <= navigationBounds.end + 20
      && tree.edge <= (tree.t > -37 && tree.t < 255 ? 33 : 17));
    tile.y = heightAt(tile.x, tile.t);
    const center = new THREE.Vector3(tile.x, tile.y, -tile.t);
    const distant = placeBatch(forms[0][2].leaves, materials.leaves, tile.items.map((tree) => {
      const width = species[tree.type].spread / species[0].spread;
      return { ...tree, sx: tree.sx * width, sz: tree.sz * width };
    }), tile);
    const addTrees = (group, items, tier) => {
      for (let type = 0; type < species.length; type++) {
        const treesOfType = items.filter((tree) => tree.type === type);
        if (!treesOfType.length) continue;
        const form = forms[type][tier];
        group.add(placeBatch(form.leaves, materials.leaves, treesOfType, tile));
        if (form.blades) group.add(placeBatch(form.blades, materials.blades, treesOfType, tile));
        if (form.bark) group.add(placeBatch(form.bark, materials.bark, treesOfType, tile));
      }
    };
    if (nearPath) {
      // A bounded number of foreground crowns carry individual leaves and woody shoots.
      // Preserve dense background cover with the same mid-distance trees in both levels.
      const ranked = [...tile.items].sort((a, b) => a.edge - b.edge + 0.9 * (b.sy - a.sy));
      const detailed = ranked.filter((tree) => tree.edge < 22).slice(0, 13);
      const medium = new THREE.Group();
      addTrees(medium, tile.items, 1);
      const roots = makeRootBatch(tile,heightAt,materials.roots);
      if (roots) medium.add(roots);
      const lod = new THREE.LOD();
      lod.position.copy(center);
      if (detailed.length) {
        const close = new THREE.Group();
        addTrees(close, detailed, 0);
        addTrees(close, tile.items.filter((tree) => !detailed.includes(tree)), 1);
        if (roots) close.add(roots.clone());
        lod.addLevel(close, 0);
      }
      lod.addLevel(medium, detailed.length ? 29 : 0, 0.11);
      lod.addLevel(distant, 108, 0.15);
      forest.add(lod);
    } else {
      distant.position.copy(center);
      forest.add(distant);
    }
  }
  return forest;
}

function collectTrees(heightAt, random) {
  const tints = species.map((form) => new THREE.Color(form.tint));
  const trees = [];
  const occupied = new Map();
  const cellSize = 3.4;
  const record = (t, side, edge, height, type, placed = false) => {
    const x = riverBank(t, side) + side * edge;
    if (x < bounds.left + 1 || x > bounds.right - 1) return;
    const y = heightAt(x, t);
    const slope = Math.hypot(heightAt(x + 0.75, t) - heightAt(x - 0.75, t),
      heightAt(x, t + 0.75) - heightAt(x, t - 0.75)) / 1.5;
    if (y < (placed ? 0.14 : 0.19) || slope > (placed ? 1.9 : 1.64)) return;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(t / cellSize);
    const clear = type === shrubType ? 0.43 + height * 0.36 : 1.18 + height * 0.13;
    for (let u = -1; u <= 1; u++) {
      for (let v = -1; v <= 1; v++) {
        const group = occupied.get(`${col + u}:${row + v}`) ?? [];
        if (group.some((other) => Math.hypot(x - other.x, t - other.t) < Math.max(clear, other.clear))) return;
      }
    }
    const tint = tints[type].clone().multiplyScalar(0.83 + random() * 0.31);
    const sx = height * (0.88 + random() * 0.32);
    const sz = height * (0.86 + random() * 0.39);
    const angle = random() * TAU;
    const lean = placed ? 0.17 : 0.11 + Math.min(0.16, slope * 0.13);
    const tree = { x, t, y: y - 0.04, sx, sy: height, sz, angle, tint, edge, type, clear,
      leanX: (random() - 0.5) * lean, leanZ: (random() - 0.5) * lean };
    const key = `${col}:${row}`;
    if (!occupied.has(key)) occupied.set(key, []);
    occupied.get(key).push(tree);
    trees.push(tree);
  };

  const framingGrove = [
    [-3, -1, 4.7, 4.8, 1], [4.5, -1, 6.8, 6.6, 0], [9.8, -1, 7.2, 4.3, 2],
    [17.6, -1, 4.9, 5.2, 0], [22.8, -1, 5.6, 6.9, 1], [27.2, -1, 7.6, 4.7, 2],
    [34, -1, 7.2, 6.0, 0], [40.8, -1, 4.1, 4.1, 1], [48, -1, 6.9, 6.7, 0],
    [19, 1, 3.6, 5.0, 0], [49, 1, 4.4, 4.6, 1], [56, 1, 6.1, 5.8, 2],
  ];
  for (const plant of framingGrove) record(...plant, true);

  for (let i = 0; i < 16700; i++) {
    const inValley = i < 14300;
    const t = inValley ? -37 + random() * 450 : -161 + random() * 129;
    const side = random() > 0.51 ? 1 : -1;
    const edge = 1.7 + random() ** 1.64 * (inValley ? 111 : 70);
    const x = riverBank(t, side) + side * edge;
    const grove = patch(x, t);
    const height = heightAt(x, t);
    if (random() > 0.18 + grove * 0.69 || height < 0.15) continue;
    const scrub = random() < 0.31 + 0.28 * (1 - smooth(edge, 2, 16)) + 0.22 * smooth(height, 36, 77);
    const type = scrub ? shrubType : Math.floor(random() * shrubType);
    const stature = scrub
      ? (0.42 + random() ** 1.37 * 2.22) * (0.75 + grove * 0.34)
      : (1.25 + random() ** 1.58 * 5.2) * (0.76 + grove * 0.31) * (1 - 0.39 * smooth(height, 31, 80));
    if (side < 0 && t > -11 && t < 48 && edge < 4.1 && stature > 1.25) continue;
    record(t, side, edge, stature, type);
  }
  const extension = rng(441872);
  for (const [start, end, samples] of [[bounds.start + 35, -163, 3450], [415, bounds.end - 23, 8750]]) {
    for (let i = 0; i < samples; i++) {
      const t = start + extension()*(end-start);
      const side = extension() < 0.5 ? -1 : 1;
      const edge = 2.2 + extension()**1.64*115;
      const grove = patch(riverBank(t, side) + side*edge, t);
      if (extension() > 0.13 + 0.72*grove) continue;
      const type = extension() < 0.36 ? shrubType : Math.floor(extension()*shrubType);
      const size = type === shrubType ? 0.45 + extension()**1.8*1.82 : 1.65 + extension()**1.42*4.8;
      record(t, side, edge, size*(0.74 + grove*0.41), type);
    }
  }
  return trees;
}

function makeGrass(heightAt, random, material) {
  const grass = new THREE.Group();
  const colors = ['#728050', '#617346', '#6a7648', '#7b8051', '#596d44', '#818353'].map((color) => new THREE.Color(color));
  const herbs = ['#62794d', '#728453', '#516c46', '#71804f'].map((color) => new THREE.Color(color));
  const litter = ['#706348', '#806d4c', '#66583b', '#907c56'].map((color) => new THREE.Color(color));
  const fields = [[], [], [], []];
  for (let i = 0; i < 7200; i++) {
    const close = i < 2900;
    const extension = i >= 4700;
    const t = extension
      ? (i < 5350 ? -360 + random()*202 : 413 + random()*635)
      : (close ? -24 + random()*108 : -139 + random()*341);
    const side = random() > (close ? 0.69 : 0.51) ? 1 : -1;
    const edge = 0.25 + random() ** 1.47 * (close ? 9.8 : 5.5);
    const x = riverBank(t, side) + side * edge;
    const density = patch(x * 1.37, t * 2.4);
    const y = heightAt(x, t);
    if (density < 0.32 || y < 0.025 || y > 4.8 || random() > density + 0.20) continue;
    const reed = edge < 2.9 && y < 0.8 && density > 0.62;
    const height = reed ? 0.34 + random() ** 1.3 * 0.83 : 0.085 + random() ** 1.65 * 0.38;
    const pigment = colors[Math.floor(random() * colors.length)].clone().multiplyScalar(0.85 + random() * 0.24);
    fields[Number(reed)].push({ x, t, y: y - 0.014, sx: height * (0.82 + random() * 0.71),
      sy: height, sz: height * (0.79 + random() * 0.76), angle: random() * TAU, tint: pigment });
  }
  for (let i = 0; i < 2380; i++) {
    const fern = i < 560;
    const t = -14 + random() * (fern ? 103 : 80);
    const side = random() > 0.87 ? 1 : -1;
    const edge = 3.45 + random() ** 1.2 * (fern ? 20 : 14);
    const x = riverBank(t, side) + side * edge;
    const y = heightAt(x, t);
    const dx = (heightAt(x + 0.3, t) - heightAt(x - 0.3, t)) / 0.6;
    const dt = (heightAt(x, t + 0.3) - heightAt(x, t - 0.3)) / 0.6;
    const clump = patch(x * 1.42 + 7, t * 1.9 - 3);
    if (y < 0.49 || y > 7.1 || clump < (fern ? 0.44 : 0.36) || Math.hypot(dx, dt) > 1.04) continue;
    const size = fern ? 0.28 + random() ** 1.7 * 0.5 : 0.038 + random() * 0.11;
    const palette = fern ? herbs : litter;
    fields[fern ? 2 : 3].push({
      x, t, y: y + (fern ? -0.015 : 0.014), sx: size * (0.84 + random() * 0.29), sy: size, sz: size,
      angle: random() * TAU, tint: palette[Math.floor(random() * palette.length)],
    });
  }
  const geometries = [grassClump(false), grassClump(true), fernClump(), fallenLeaf()];
  for (const [type, plants] of fields.entries()) {
    for (const tile of tileItems(plants)) {
      tile.y = heightAt(tile.x, tile.t);
      const batch = placeBatch(geometries[type], material, tile.items, tile);
      if (type === 3) batch.layers.set(DETAIL_LAYER);
      batch.position.set(tile.x, tile.y, -tile.t);
      grass.add(batch);
    }
  }
  return grass;
}

export function buildVegetation(heightAt) {
  const random = rng(976311);
  const materials = makeFoliageMaterials();
  materials.roots = materials.bark.clone();
  materials.roots.vertexShader = rootVertex;
  const forms = species.map(buildTree);
  const trees = collectTrees(heightAt, random);
  const shadeCanopies = trees.map((tree) => ({
    x: tree.x, t: tree.t, y: tree.y + tree.sy * 0.63,
    rx: tree.sx * species[tree.type].spread * 0.77,
    ry: tree.sy * 0.31, rz: tree.sz * species[tree.type].spread * 0.77,
    tint: tree.tint,
  }));
  const closeCanopies = shadeCanopies
    .filter((crown) => crown.t > 6 && crown.t < 101 && crown.rx > 0.75)
    .filter((_, index) => index % 13 === 0)
    .map((crown) => ({
      ...crown, rx: crown.rx * 0.73, ry: crown.ry * 0.58, rz: crown.rz * 0.73,
    }));
  return {
    meshes: [renderTrees(trees, forms, materials, heightAt), makeGrass(heightAt, random, materials.grass)],
    closeCanopies,
    shadeCanopies,
  };
}

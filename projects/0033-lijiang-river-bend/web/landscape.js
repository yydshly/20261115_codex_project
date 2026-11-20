import * as THREE from 'three';
import { landscapeVertex, skyFragment, skyVertex } from './shaders.js';
import { terrainFragment } from './terrain-material.js';
import { buildBankOutcrops } from './bank-outcrops.js';
import { groundHeight } from './karst.js';
import { bounds, coreBounds, RIVERBED_LAYER } from './river-layout.js';

export { bounds, DETAIL_LAYER, RIVERBED_LAYER, riverBank, riverCenter, riverHalfWidth, rng } from './river-layout.js';
function terrainAxis(start, detailedStart, detailedEnd, end, fineStep, coarseStep) {
  const stops = [];
  const sections = [];
  for (const [from, to, step] of [
    [start, detailedStart, coarseStep], [detailedStart, detailedEnd, fineStep], [detailedEnd, end, coarseStep],
  ]) {
    const cells = Math.ceil((to-from)/step);
    sections.push({ from, to, cells, index: stops.length, inverseStep: cells/(to-from) });
    for (let i = 0; i < cells; i++) stops.push(from + (to-from)*i/cells);
  }
  stops.push(end);
  return {
    stops,
    cellAt(value) {
      const section = value < detailedStart ? sections[0] : value < detailedEnd ? sections[1] : sections[2];
      return section.index + THREE.MathUtils.clamp((value-section.from)*section.inverseStep, 0, section.cells - 0.00001);
    },
  };
}

const across = terrainAxis(bounds.left, coreBounds.left, coreBounds.right, bounds.right, 1.5, 6);
const along = terrainAxis(bounds.start, coreBounds.start, coreBounds.end, bounds.end, 1.625, 3.35);

function bakeBathymetry(heightAt) {
  const width = 1024;
  const height = 1536;
  const data = new Uint8Array(width * height * 2);
  const stepX = (bounds.right - bounds.left)/width;
  const stepT = (bounds.end - bounds.start)/height;
  for (let row = 0; row < height; row++) {
    const t = bounds.start + (row + 0.5)*stepT;
    for (let col = 0; col < width; col++) {
      const x = bounds.left + (col + 0.5)*stepX;
      // Encode the signed height in [-7, 1] without losing precision near the waterline.
      const encoded = Math.round(65535*THREE.MathUtils.clamp((heightAt(x, t) + 7)/8, 0, 1));
      const index = (row*width + col)*2;
      data[index] = encoded >>> 8;
      data[index + 1] = encoded & 255;
    }
  }
  const map = new THREE.DataTexture(data, width, height, THREE.RGFormat, THREE.UnsignedByteType);
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  return map;
}

const distantRidges = [
  [-724,-293,110,220,94,-0.74], [-995,-65,190,145,105,0.28],
  [-672,206,147,215,135,0.88], [-1005,389,225,190,105,-0.51],
  [-634,721,110,185,112,-0.72], [-902,1060,220,235,127,0.26],
  [693,-292,128,195,113,0.45], [958,-108,196,150,125,-0.42],
  [756,358,142,241,101,-0.64], [972,541,205,165,137,0.37],
  [667,848,149,242,94,0.63], [936,1060,226,170,138,-0.63],
  [-506,1437,214,171,104,-0.29], [-142,1688,270,187,106,0.47],
  [310,1554,230,150,103,-0.62], [683,1420,152,204,116,0.52],
  [-680,-756,183,177,107,0.53], [-196,-904,207,138,86,-0.59],
  [352,-796,222,188,113,0.49],
  // Low ridges behind the sharper peaks give the haze more than one depth layer.
  [-1280,-460,275,314,109,-0.52], [-1510,100,248,365,119,0.46],
  [-1320,634,218,312,95,0.79], [-1475,1190,320,260,110,-0.37],
  [1330,-535,265,318,112,0.57], [1568,29,255,282,113,-0.72],
  [1410,685,246,309,108,0.41], [1295,1390,272,326,127,0.82],
  [-775,1926,280,302,115,-0.47], [87,2220,322,269,133,0.29], [689,1980,284,313,102,-0.72],
  [-794,-1180,282,270,109,0.42], [-238,-1450,278,257,121,-0.64], [487,-1280,307,251,106,0.22],
].map(([x,t,width,length,rise,angle]) => ({ x,t,width,length,rise, sin: Math.sin(angle), cos: Math.cos(angle) }));

function distantHeight(x, t) {
  let relief = 0;
  for (const ridge of distantRidges) {
    const dx = x-ridge.x;
    const dt = t-ridge.t;
    const u = (dx*ridge.cos+dt*ridge.sin)/ridge.width;
    const v = (dt*ridge.cos-dx*ridge.sin)/ridge.length;
    if (Math.abs(u) > 2.6 || Math.abs(v) > 2.6) continue;
    const crest = Math.exp(-1.8*(u-0.21*v*v)**2-v*v);
    const notch = 0.62+0.30*Math.cos(v*3.4+u*0.83)+0.08*Math.sin(v*8.0-u*1.7);
    relief += ridge.rise*crest*notch;
  }
  return 8 + relief;
}

function buildHorizon(material, edgeNormals) {
  const edge = [];
  const columns = across.stops.length-1;
  const rows = along.stops.length-1;
  for (let col = 0; col < columns; col++) edge.push([col,0]);
  for (let row = 0; row < rows; row++) edge.push([columns,row]);
  for (let col = columns; col > 0; col--) edge.push([col,rows]);
  for (let row = rows; row > 0; row--) edge.push([0,row]);

  const offsets = [0, 10, 23, 39, 60, 86, 118, 157, 205, 260, 325, 400, 485,
    580, 690, 815, 950, 1090, 1235, 1390, 1545, 1720, 1900];
  const centerX = (bounds.left+bounds.right)/2;
  const centerT = (bounds.start+bounds.end)/2;
  const halfWidth = (bounds.right-bounds.left)/2;
  const halfLength = (bounds.end-bounds.start)/2;
  const count = edge.length;
  const positions = new Float32Array(offsets.length*count*3);
  const faces = new Uint16Array((offsets.length-1)*count*6);
  for (const [ring, offset] of offsets.entries()) {
    const transition = THREE.MathUtils.smoothstep(offset, 24, 225);
    for (const [i, [col,row]] of edge.entries()) {
      const edgeX = across.stops[col];
      const edgeT = along.stops[row];
      const x = edgeX + (edgeX-centerX)*offset/halfWidth;
      const t = edgeT + (edgeT-centerT)*offset/halfLength;
      const base = offset < 225 ? groundHeight(x,t) : 0;
      const height = THREE.MathUtils.lerp(base, distantHeight(x,t), transition);
      const index = ring*count+i;
      positions.set([x,height,-t], index*3);
      if (ring === offsets.length-1) continue;
      const next = ring*count+(i+1)%count;
      faces.set([index,index+count,next,next,index+count,next+count], index*6);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(faces, 1));
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal').array;
  for (const [i,[col,row]] of edge.entries()) {
    const index = (row*(columns+1)+col)*3;
    normals.set(edgeNormals.subarray(index, index+3),i*3);
  }
  return new THREE.Mesh(geometry, material);
}

export function buildTerrain() {
  const columns = across.stops.length - 1;
  const rows = along.stops.length - 1;
  const points = new Float32Array((columns + 1) * (rows + 1) * 3);
  const indices = new Uint32Array(columns * rows * 6);
  const stride = columns + 1;
  let cursor = 0;
  for (let row = 0; row <= rows; row++) {
    const t = along.stops[row];
    for (let col = 0; col <= columns; col++) {
      const x = across.stops[col];
      const index = (row * stride + col) * 3;
      points[index] = x;
      points[index + 1] = groundHeight(x, t);
      points[index + 2] = -t;
      if (row === rows || col === columns) continue;
      const a = row * stride + col;
      indices.set([a, a + 1, a + stride, a + 1, a + stride + 1, a + stride], cursor);
      cursor += 6;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  const lightMap = { value: null };
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTerrainLight: lightMap,
      uTerrainDomain: { value: new THREE.Vector4(bounds.left, bounds.start, bounds.right-bounds.left, bounds.end-bounds.start) },
    },
    vertexShader: landscapeVertex, fragmentShader: terrainFragment,
  });
  const tiled = new THREE.Group();
  const normals = geometry.getAttribute('normal').array;
  const tileSize = 40;
  for (let startT = 0; startT < rows; startT += tileSize) {
    for (let startX = 0; startX < columns; startX += tileSize) {
      const width = Math.min(tileSize, columns - startX);
      const depth = Math.min(tileSize, rows - startT);
      const pitch = width + 1;
      const tilePoints = new Float32Array(pitch * (depth + 1) * 3);
      const tileNormals = new Float32Array(tilePoints.length);
      const tileIndices = new Uint16Array(width * depth * 6);
      let nextIndex = 0;
      for (let r = 0; r <= depth; r++) {
        const source = ((startT + r) * stride + startX) * 3;
        tilePoints.set(points.subarray(source, source + pitch * 3), r * pitch * 3);
        tileNormals.set(normals.subarray(source, source + pitch * 3), r * pitch * 3);
        if (r === depth) continue;
        for (let c = 0; c < width; c++) {
          const a = r * pitch + c;
          tileIndices.set([a, a+1, a+pitch, a+1, a+pitch+1, a+pitch], nextIndex);
          nextIndex += 6;
        }
      }
      const tile = new THREE.BufferGeometry();
      tile.setAttribute('position', new THREE.BufferAttribute(tilePoints, 3));
      tile.setAttribute('normal', new THREE.BufferAttribute(tileNormals, 3));
      tile.setIndex(new THREE.BufferAttribute(tileIndices, 1));
      tile.computeBoundingBox();
      const mesh = new THREE.Mesh(tile, material);
      if (tile.boundingBox.min.y < 0) mesh.layers.enable(RIVERBED_LAYER);
      tiled.add(mesh);
    }
  }
  const horizonMaterial = material.clone();
  horizonMaterial.defines.DISTANT_TERRAIN = 1;
  horizonMaterial.uniforms.uTerrainLight = lightMap;
  tiled.add(buildHorizon(horizonMaterial, normals));
  function groundAt(x, t) {
    const u = across.cellAt(x);
    const v = along.cellAt(t);
    const col = Math.floor(u);
    const row = Math.floor(v);
    const a = (row*stride + col)*3 + 1;
    const f = u - col;
    const g = v - row;
    const right = points[a + 3];
    const downstream = points[a + stride*3];
    if (f + g <= 1) return points[a]*(1 - f - g) + right*f + downstream*g;
    return points[a + (stride + 1)*3]*(f + g - 1) + right*(1 - g) + downstream*(1 - f);
  }
  const rockMaterial = material.clone();
  rockMaterial.defines.ROCK_OUTCROP = 1;
  rockMaterial.uniforms.uTerrainLight = lightMap;
  const outcrops = buildBankOutcrops(groundAt,rockMaterial);
  tiled.add(...outcrops.meshes);

  return {
    mesh: tiled,
    bathymetry: bakeBathymetry(outcrops.heightAt),
    heightAt: outcrops.heightAt,
    setRootFooting: outcrops.setRootFooting,
    setLightMap(texture) { lightMap.value = texture; },
  };
}

export function buildSky() {
  const material = new THREE.ShaderMaterial({
    vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 24), material);
  mesh.renderOrder = -100;
  mesh.position.z = -(bounds.start + bounds.end)*0.5;
  return mesh;
}

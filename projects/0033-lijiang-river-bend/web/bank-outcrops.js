import * as THREE from 'three';
import { RIVERBED_LAYER, riverBank } from './river-layout.js';

// Cross sections run from the submerged toe back into the existing limestone footslope.
const profiles = [
  [[-1.28,0],[-0.89,0.08],[-0.61,0.13],[-0.45,0.33],[-0.29,0.34],[0.02,0.64],
    [0.31,0.67],[0.65,0.76],[0.92,1],[1.37,0.96],[2.76,0.80],[4.2,0.69],[6.2,0.38],[8.5,0]],
  [[-1.06,0],[-0.57,0.04],[-0.33,0.26],[0.21,0.43],[0.59,0.68],[0.96,0.76],
    [1.63,0.74],[2.11,0.98],[2.53,1],[3.44,0.91],[4.16,0.62],[5.9,0.49],[7.9,0.26],[9.1,0]],
  [[-0.91,0],[-0.56,0.1],[-0.16,0.19],[0.02,0.43],[0.45,0.47],[1.02,0.69],
    [1.47,0.69],[1.81,0.91],[2.33,1],[3.06,0.78],[4.4,0.72],[5.8,0.29],[7.03,0.24],[8.54,0]],
  [[-1.28,0],[-0.90,0.07],[-0.66,0.12],[-0.52,0.19],[-0.36,0.41],[-0.15,0.43],
    [0.09,0.39],[0.24,0.60],[0.38,0.70],[0.73,0.70],[0.94,0.95],[1.22,1],[1.73,0.91],
    [2.52,0.81],[3.72,0.76],[5.38,0.43],[6.82,0.29],[8.5,0]],
  [[-1.10,0],[-0.77,0.05],[-0.47,0.13],[-0.35,0.27],[-0.18,0.31],[0.03,0.28],
    [0.19,0.51],[0.40,0.57],[0.80,0.53],[1.02,0.79],[1.31,0.83],[1.66,0.79],
    [1.97,0.97],[2.36,1],[2.86,0.91],[3.94,0.70],[5.77,0.49],[7.62,0.23],[8.7,0]],
].map((profile) => profile.flatMap(([d, y], index) => {
  if (index === 0) return [[d,y]];
  const [previousD, previousY] = profile[index-1];
  const steps = Math.ceil((d-previousD)/0.43);
  return Array.from({ length: steps }, (_, step) => [
    THREE.MathUtils.lerp(previousD,d,(step+1)/steps), THREE.MathUtils.lerp(previousY,y,(step+1)/steps),
  ]);
}));

const reaches = [
  // Side, center, half length, rise, setback, profile, optional joints.
  // Joints use an along-bank offset, cross-bank tilt, half width and incision in metres.
  [1,87,14.8,2.35,0.69,1], [1,149,12.1,1.55,1.12,2],
  [-1,234.8,12.7,3.24,0.56,3,[[-6.5,-0.38,0.46,0.63],[-2.3,0.30,0.26,0.48],
    [1.5,0.47,0.34,0.67],[5.7,-0.28,0.57,0.54],[8.2,0.12,0.28,0.46]]],
  [-1,257.4,11.25,2.89,0.25,4,[[-6.9,0.34,0.36,0.43],[-3.6,-0.21,0.52,0.51],
    [1.8,-0.33,0.29,0.57],[5.3,0.41,0.50,0.47]]],
  [-1,333,15.4,3.72,1.05,1], [-1,550,13.2,2.56,0.61,2],
  [1,683,17.8,3.07,1.12,0], [-1,813,19.5,2.92,0.85,1],
];

const { lerp, smoothstep } = THREE.MathUtils;

function noise1(x, seed) {
  const cell = Math.floor(x);
  const sample = (i) => {
    const n = Math.imul(i+seed, 198491317);
    return ((Math.imul(n ^ (n >>> 15), 6542989) ^ (n >>> 8)) >>> 0) / 4294967295;
  };
  return lerp(sample(cell),sample(cell+1),smoothstep(x-cell,0,1));
}

function crossSection(t, site) {
  const bend = (t-site.mid)/site.span;
  const edge = 1-smoothstep(Math.abs(bend),0.54,1);
  const rib = noise1(t*0.63,site.seed+74);
  const joint = noise1(t*2.4,site.seed+51);
  const face = site.joints ? (noise1(t*0.83,site.seed+221)-0.5)*edge*0.66 : 0;
  return {
    bank: riverBank(t,site.side),
    shift: site.setback + 0.53*bend + (noise1(t*0.22,site.seed)-0.5)*1.32 + (joint-0.5)*0.26 + face,
    swell: site.rise*edge*(0.80 + rib*0.35 + joint*0.09),
    edge,
    joint,
  };
}

function fractureDepth(site, row, t, d) {
  if (!site.joints) return 0;
  let depth = 0;
  for (const [offset, dip, width, relief] of site.joints) {
    const trace = site.mid+offset+dip*d+(noise1(d*1.74,site.seed+offset*13)-0.5)*0.29;
    const edge = t-trace;
    const shoulder = width*(edge < 0 ? 1.18 : 0.88);
    const taper = 1-smoothstep(Math.abs(edge),shoulder*0.11,shoulder);
    const front = -0.82+0.33*noise1(offset*0.83,site.seed+39);
    const back = 2.7+1.9*noise1(offset*0.64,site.seed+170);
    const panel = smoothstep(d,front,front+0.78)*(1-smoothstep(d,back-1.28,back+0.67));
    depth = Math.max(depth,relief*taper*panel);
  }
  return row.edge*depth;
}

function surfaceRise(site, row, t, d, sectionHeight, incision) {
  const rough = site.joints ? noise1(t*1.19+d*1.52,site.seed+143)-0.5 : 0;
  const ledges = (row.joint-0.49)*0.22*Math.sin(d*2.18+sectionHeight*2.4)+rough*0.31;
  return (row.swell+row.edge*ledges)*sectionHeight-incision-0.085;
}

function makeOutcrop(site, material, groundAt) {
  const steps = Math.ceil(2*site.span/(site.joints ? 0.15 : 0.26));
  const profile = site.profile;
  const columns = profile.length;
  const positions = new Float32Array((steps+1)*columns*3);
  const coverage = new Float32Array((steps+1)*columns);
  const seams = new Float32Array((steps+1)*columns);
  const edges = new Float64Array(steps+1);
  const faces = new Uint16Array(steps*(columns-1)*6);
  let next = 0;
  for (let i = 0; i <= steps; i++) {
    const t = lerp(site.minT,site.maxT,i/steps);
    const row = crossSection(t,site);
    edges[i] = row.bank+site.side*row.shift;
    for (const [j,[d, height]] of profile.entries()) {
      const x = edges[i]+site.side*d;
      const incision = fractureDepth(site,row,t,d);
      const rise = surfaceRise(site,row,t,d,height,incision);
      const index = i*columns+j;
      positions.set([x,groundAt(x,t)+rise,-t],index*3);
      coverage[index] = smoothstep(rise,0.0,0.38)
        * (1 - smoothstep(d,profile.at(-1)[0]*0.59,profile.at(-1)[0]*0.93));
      seams[index] = smoothstep(incision,0.04,0.56)*coverage[index];
      if (i === steps || j === columns-1) continue;
      const b = index+1;
      const c = index+columns;
      const dNext = c+1;
      const quad = site.side > 0 ? [index,b,c,b,dNext,c] : [index,c,b,b,c,dNext];
      faces.set(quad,next);
      next += 6;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('rockCoverage',new THREE.BufferAttribute(coverage,1));
  geometry.setAttribute('rockSeam',new THREE.BufferAttribute(seams,1));
  geometry.setAttribute('rootFooting',new THREE.BufferAttribute(new Float32Array(coverage.length),1));
  geometry.setIndex(new THREE.BufferAttribute(faces,1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const mesh = new THREE.Mesh(geometry,material);
  if (geometry.boundingBox.min.y < 0) mesh.layers.enable(RIVERBED_LAYER);
  const { min, max } = geometry.boundingBox;
  return { ...site, steps, edges, positions, mesh, minX:min.x, maxX:max.x };
}

function patchHeight(patch, x, t) {
  const { profile, steps, edges, positions, minT, span, side } = patch;
  const along = THREE.MathUtils.clamp((t-minT)*steps/(span*2),0,steps-0.000001);
  const row = Math.floor(along);
  const v = along-row;
  const d = (x-lerp(edges[row],edges[row+1],v))*side;
  let left = 0;
  let right = profile.length-1;
  if (d < profile[left][0] || d > profile[right][0]) return -Infinity;
  while (right-left > 1) {
    const middle = (left+right) >> 1;
    if (profile[middle][0] <= d) left = middle;
    else right = middle;
  }
  const u = (d-profile[left][0])/(profile[right][0]-profile[left][0]);
  const stride = profile.length*3;
  const a = row*stride+left*3+1;
  // Both bank directions use the same diagonal in cross-section coordinates.
  return u+v <= 1
    ? positions[a]*(1-u-v)+positions[a+3]*u+positions[a+stride]*v
    : positions[a+stride+3]*(u+v-1)+positions[a+3]*(1-v)+positions[a+stride]*(1-u);
}

function paintFooting(patch, canopies, heightAt) {
  const contacts = canopies.filter(({x,t,ry}) => ry > 0.39 && x > patch.minX-1.15 && x < patch.maxX+1.15
    && t > patch.minT-1.15 && t < patch.maxT+1.15).map(({x,t,rx,rz}) => ({
    x,t,y:heightAt(x,t), across:THREE.MathUtils.clamp(rx*0.47,0.37,1.20),
    along:THREE.MathUtils.clamp(rz*0.55,0.40,1.26),
  }));
  const { positions, mesh } = patch;
  const coverage = mesh.geometry.getAttribute('rockCoverage').array;
  const footing = mesh.geometry.getAttribute('rootFooting');
  for (let i = 0; i < footing.count; i++) {
    if (coverage[i] <= 0) continue;
    const x = positions[i*3], y = positions[i*3+1], t = -positions[i*3+2];
    let soil = 0;
    for (const root of contacts) {
      const u = (x-root.x)/root.across;
      const v = (t-root.t)/root.along;
      const distance = u*u+v*v+0.69*(y-root.y)**2;
      soil = Math.max(soil,1-smoothstep(distance,0.16,1.65));
    }
    footing.array[i] = soil*coverage[i];
  }
  footing.needsUpdate = true;
}

export function buildBankOutcrops(groundAt, material) {
  const sites = reaches.map(([side,mid,span,rise,setback,profile,joints], index) => ({
    side,mid,span,rise,setback,joints,profile: profiles[profile],
    seed: 763 + index*197, minT: mid-span, maxT: mid+span,
  }));
  const patches = sites.map((site) => makeOutcrop(site,material,groundAt));
  // Lighting and bathymetry query millions of ground points, mostly outside these small patches.
  const bandSize = 24;
  const byBand = new Map();
  for (const patch of patches) {
    for (let band = Math.floor(patch.minT/bandSize); band <= Math.floor(patch.maxT/bandSize); band++) {
      if (!byBand.has(band)) byBand.set(band,[]);
      byBand.get(band).push(patch);
    }
  }
  function heightAt(x,t) {
    let y = groundAt(x,t);
    const nearby = byBand.get(Math.floor(t/bandSize));
    if (!nearby) return y;
    for (const patch of nearby) {
      if (t <= patch.minT || t >= patch.maxT || x <= patch.minX || x >= patch.maxX) continue;
      y = Math.max(y,patchHeight(patch,x,t));
    }
    return y;
  }
  return {
    meshes: patches.map(({ mesh }) => mesh),
    heightAt,
    setRootFooting(canopies) {
      for (const patch of patches) {
        if (patch.joints) paintFooting(patch,canopies,heightAt);
      }
    },
  };
}

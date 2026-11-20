import * as THREE from 'three';
import { RIVERBED_LAYER, rng } from './river-layout.js';
import { atmosphere, noise } from './shaders.js';

const up = new THREE.Vector3(0,1,0);
const face = new THREE.Vector3(0,0,1);
const plank = new THREE.BoxGeometry(1,1,1);
const timberPost = new THREE.CylinderGeometry(0.45,0.51,1,9);
const rod = new THREE.CylinderGeometry(0.5,0.5,1,8);
const tire = new THREE.TorusGeometry(0.5,0.151,8,20);
const pinHead = new THREE.CircleGeometry(0.5,6).rotateX(-Math.PI/2);
const timber = ['#8c8070','#918571','#a49885','#7c7265','#9b8974','#a69a87','#857969'];
const darkWood = '#655748';
const galvanized = '#515351';
const rubber = '#343a37';
const sisal = '#878069';

const vertexShader = /* glsl */ `
attribute vec3 aPigment;
attribute vec4 aGrain;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vPigment;
varying vec4 vGrain;
void main() {
  vWorld = (modelMatrix*vec4(position,1.0)).xyz;
  vNormal = normalize(mat3(modelMatrix)*normal);
  vPigment = aPigment;
  vGrain = aGrain;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vPigment;
varying vec4 vGrain;
${noise}
${atmosphere}

void main() {
  vec3 n = normalize(vNormal);
  vec2 grain = vGrain.xy + vec2(vGrain.w*4.3,vGrain.w*2.7);
  float wood = 1.0-step(0.5,vGrain.z);
  float waterline = noise2(grain*vec2(2.0,9.0));
  float damp = 1.0-smoothstep(-0.048,0.28,vWorld.y + (waterline-0.5)*0.11);
  vec3 pigment = vPigment;
  if (wood > 0.5) {
    vec2 knot = grain*vec2(1.15,3.8);
    float swirl = noise2(knot);
    float drift = grain.y+(swirl-0.5)*0.095;
    vec2 fibers = vec2(grain.x*4.7,drift*105.0);
    float detail = 1.0-smoothstep(0.61,1.86,max(fwidth(fibers.x),fwidth(fibers.y)));
    float silver = noise2(vec2(grain.x*2.7,drift*16.0));
    float shade = (swirl-0.5)*0.24 + (silver-0.5)*0.19 + (noise2(fibers)-0.5)*0.27*detail;
    pigment *= 1.0+shade;
    pigment *= mix(vec3(1.0),vec3(0.62,0.67,0.63),damp);
    float algae = exp(-abs(vWorld.y+0.02)*17.0)*smoothstep(0.47,0.68,waterline);
    pigment = mix(pigment,vec3(0.049,0.058,0.027),algae*0.45);
  } else {
    vec2 speckle = grain*vec2(92.0,44.0);
    float detail = 1.0-smoothstep(0.39,1.9,length(fwidth(speckle)));
    pigment *= mix(0.95,1.15,noise2(speckle))*mix(1.0,0.82,damp*detail);
  }
  float sky = 0.49+0.33*(n.y*0.5+0.5);
  float key = max(0.0,dot(n,sunDirection))*0.43;
  vec3 eye = normalize(cameraPosition-vWorld);
  float gleam = pow(max(0.0,dot(n,normalize(sunDirection+eye))),mix(19.0,33.0,damp));
  vec3 color = pigment*(cloudDiffuseTint*sky+cloudKeyTint*key*cloudTransmission(vWorld.xz));
  color += vec3(0.019,0.021,0.023)*gleam*(0.24+0.76*damp);
  gl_FragColor = vec4(aerialPerspective(color,vWorld,distance(vWorld,cameraPosition)),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function point({ x, t, y }) {
  return new THREE.Vector3(x,y,-t);
}

function segmentFrame(segment) {
  const start = point(segment.start);
  const along = point(segment.end).sub(start);
  const length = along.length();
  along.divideScalar(length);
  const across = new THREE.Vector3().crossVectors(up,along).normalize();
  const normal = new THREE.Vector3().crossVectors(along,across).normalize();
  const rotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,normal,along));
  const { width } = segment;
  return {
    along,across,normal,rotation,length,width,
    at(distance, offset = 0) {
      return start.clone().addScaledVector(along,distance).addScaledVector(across,offset);
    },
  };
}

function makeBatch(random) {
  const positions = [];
  const normals = [];
  const colors = [];
  const grains = [];
  const indices = [];
  const transform = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const pigment = new THREE.Color();
  return {
    append(geometry, center, rotation, widths, color, finish = 0, axis = 0) {
      scale.fromArray(widths);
      transform.compose(center,rotation,scale);
      normalMatrix.getNormalMatrix(transform);
      pigment.set(color);
      const seed = random();
      const base = positions.length/3;
      const points = geometry.getAttribute('position');
      const directions = geometry.getAttribute('normal');
      for (let i = 0; i < points.count; i++) {
        p.fromBufferAttribute(points,i).multiply(scale);
        const x = p.getComponent(axis);
        const y = p.getComponent((axis+1)%3) + p.getComponent((axis+2)%3)*0.77;
        grains.push(x,y,finish,seed);
        p.fromBufferAttribute(points,i).applyMatrix4(transform);
        n.fromBufferAttribute(directions,i).applyNormalMatrix(normalMatrix);
        positions.push(p.x,p.y,p.z);
        normals.push(n.x,n.y,n.z);
        colors.push(pigment.r,pigment.g,pigment.b);
      }
      for (const index of geometry.index.array) indices.push(base+index);
    },
    toMesh(material) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      geometry.setAttribute('aPigment',new THREE.Float32BufferAttribute(colors,3));
      geometry.setAttribute('aGrain',new THREE.Float32BufferAttribute(grains,4));
      geometry.setIndex(indices);
      return new THREE.Mesh(geometry,material);
    },
  };
}

function connect(batch, geometry, a, b, diameter, color, finish = 0) {
  const delta = b.clone().sub(a);
  const length = delta.length();
  if (length < 0.023) return;
  const orientation = new THREE.Quaternion().setFromUnitVectors(up,delta.divideScalar(length));
  batch.append(geometry,a.clone().lerp(b,0.5),orientation,[diameter,length,diameter],color,finish,1);
}

function addDeck(batch, frame, random, ramp) {
  const thickness = ramp ? 0.073 : 0.097;
  const count = Math.ceil(frame.length/(ramp ? 0.24 : 0.275));
  const spacing = frame.length/count;
  for (let i = 0; i < count; i++) {
    const center = frame.at((i+0.5)*spacing).addScaledVector(frame.normal,-thickness*0.5);
    center.y -= 0.001 + random()*0.006;
    batch.append(plank,center,frame.rotation,
      [frame.width*(0.987+random()*0.013),thickness,spacing-0.008],timber[Math.floor(random()*timber.length)]);
    for (const side of [-1,1]) {
      const pin = frame.at((i+0.5)*spacing,side*(frame.width*0.5-0.15));
      pin.y = center.y + frame.normal.y*thickness*0.5 + 0.002;
      batch.append(pinHead,pin,frame.rotation,[0.020,1,0.020],galvanized,1);
    }
  }
  for (const side of [-1,1]) {
    const beam = frame.at(frame.length*0.5,frame.width*side*0.31).addScaledVector(frame.normal,-thickness-0.075);
    batch.append(plank,beam,frame.rotation,[0.135,0.156,frame.length],darkWood,0,2);
  }
  const joists = Math.max(1,Math.ceil(frame.length/1.64));
  for (let i = 0; i <= joists; i++) {
    const along = 0.095+(frame.length-0.19)*i/joists;
    const beam = frame.at(along).addScaledVector(frame.normal,-thickness-0.205);
    batch.append(plank,beam,frame.rotation,[frame.width-0.07,0.125,0.139],darkWood);
  }
}

function addPilings(above, below, frame, heightAt, ramp) {
  const count = Math.max(2,Math.ceil(frame.length/(ramp ? 2.9 : 2.55)));
  const piles = [];
  for (let i = 0; i <= count; i++) {
    const distance = 0.20+(frame.length-0.40)*i/count;
    const pair = [];
    for (const side of [-1,1]) {
      const deck = frame.at(distance,side*frame.width*0.30);
      const top = deck.clone().addScaledVector(up,-0.065);
      const bottom = deck.clone();
      bottom.y = heightAt(deck.x,-deck.z)-0.16;
      pair.push({ top,bottom });
      if (bottom.y >= top.y - 0.021) continue;
      const water = new THREE.Vector3(top.x,0.003,top.z);
      const diameter = ramp ? 0.137 : 0.182;
      if (bottom.y <= 0 && top.y > 0) {
        connect(below,timberPost,bottom,water,diameter,darkWood);
        connect(above,timberPost,water,top,diameter,'#776750');
      } else {
        connect(top.y < 0 ? below : above,timberPost,bottom,top,diameter,darkWood);
      }
    }
    piles.push(pair);
  }
  for (let i = 1; i < piles.length; i++) {
    for (let side = 0; side < 2; side++) {
      const start = piles[i-1][side];
      const end = piles[i][side];
      const a = start.top.clone();
      const b = end.top.clone();
      a.y = Math.max(0.041,start.bottom.y+0.11,start.top.y-0.75);
      b.y -= 0.12;
      if (a.y < start.top.y-0.20 && b.y > end.bottom.y+0.075) connect(above,rod,a,b,0.072,darkWood);
    }
  }
}

function addRail(batch, frame) {
  const posts = Math.max(2,Math.ceil(frame.length/1.8)+1);
  for (const side of [-1,1]) {
    const inset = side*(frame.width*0.5-0.055);
    const start = frame.at(0.19,inset).addScaledVector(up,0.81);
    const end = frame.at(frame.length-0.21,inset).addScaledVector(up,0.81);
    connect(batch,rod,start,end,0.062,'#8a7b67');
    for (let i = 0; i < posts; i++) {
      const top = start.clone().lerp(end,i/(posts-1));
      connect(batch,timberPost,top.clone().addScaledVector(up,-0.85),top,0.082,darkWood);
    }
  }
}

function addMooringHardware(above, below, frame, berth, turningPoint) {
  const facing = point({ ...berth,y: 0 }).sub(frame.at(frame.length*0.5)).dot(frame.across);
  const side = Math.sign(facing) || 1;
  const out = frame.across.clone().multiplyScalar(side);
  const tireRotation = new THREE.Quaternion().setFromUnitVectors(face,out);
  const capRotation = new THREE.Quaternion();
  const offsets = [0.60,frame.length*0.5,frame.length-0.58];
  for (const [i, distance] of offsets.entries()) {
    const edge = frame.at(distance,side*(frame.width*0.5+0.056));
    const hub = edge.clone();
    hub.y = Math.max(0.12,edge.y-0.31);
    const rubberBatch = hub.y < 0.22 ? below : above;
    rubberBatch.append(tire,hub,tireRotation,[0.34,0.34,0.38],rubber,1);
    const a = edge.clone().addScaledVector(out,-0.105).addScaledVector(up,0.071);
    const b = hub.clone().addScaledVector(up,0.176);
    connect(above,rod,a,b,0.023,sisal,1);
    const pedestal = frame.at(distance,side*(frame.width*0.5-0.17));
    if (i === 1) continue;
    const postTop = pedestal.clone().addScaledVector(up,0.53);
    connect(above,timberPost,pedestal.clone().addScaledVector(up,-0.19),postTop,0.151,'#726555');
    const band = postTop.clone().addScaledVector(up,-0.095);
    above.append(timberPost,band,capRotation,[0.157,0.080,0.157],turningPoint ? '#9a7852' : '#77847b',1);
    const cleat = pedestal.clone().addScaledVector(frame.across,-side*0.185);
    above.append(plank,cleat.clone().addScaledVector(up,0.011),frame.rotation,[0.11,0.026,0.21],galvanized,1,2);
    const neck = cleat.clone().addScaledVector(up,0.084);
    connect(above,rod,cleat,neck,0.075,galvanized,1);
    connect(above,rod,neck.clone().addScaledVector(frame.along,-0.125),
      neck.addScaledVector(frame.along,0.125),0.039,galvanized,1);
  }
}

export function buildDocks(layout, heightAt) {
  const docks = new THREE.Group();
  const material = new THREE.ShaderMaterial({ vertexShader,fragmentShader });
  for (const dock of layout) {
    const random = rng(dock.id === 'origin' ? 814761 : 683927);
    const above = makeBatch(random);
    const below = makeBatch(random);
    for (const [index, segment] of dock.deckSegments.entries()) {
      const frame = segmentFrame(segment);
      const ramp = index !== dock.deckSegments.length-1;
      addDeck(above,frame,random,ramp);
      addPilings(above,below,frame,heightAt,ramp);
      if (ramp) addRail(above,frame);
      else addMooringHardware(above,below,frame,dock.berths.wood,dock.id !== 'origin');
    }
    const pileFeet = below.toMesh(material);
    pileFeet.layers.enable(RIVERBED_LAYER);
    const model = new THREE.Group();
    model.name = `landing-${dock.id}`;
    model.add(above.toMesh(material),pileFeet);
    docks.add(model);
  }
  return docks;
}

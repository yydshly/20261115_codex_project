import * as THREE from 'three';
import { atmosphere, noise } from './shaders.js';

const UP = new THREE.Vector3(0, 1, 0);
const { clamp, lerp } = THREE.MathUtils;
const skin = '#ba9074';
const fabric = 1;
const hardware = 2;

const vertexShader = /* glsl */ `
attribute vec3 pigment;
attribute float finish;
varying vec3 vPigment;
varying float vFinish;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
void main() {
  vPigment = pigment;
  vFinish = finish;
  vLocal = position;
  vWorld = (modelMatrix * vec4(position,1.0)).xyz;
  vNormal = normalize(normalMatrix * normal) * mat3(viewMatrix);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vPigment;
varying float vFinish;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
${noise}
${atmosphere}
void main() {
  vec3 n = normalize(vNormal);
  vec3 eye = normalize(cameraPosition-vWorld);
  vec2 cloth = vec2(vLocal.x+0.41*vLocal.z,vLocal.y+0.12*vLocal.z);
  float crease = fbm(cloth*vec2(26.0,37.0)+vec2(vLocal.z*11.0,0.0));
  float fiber = 0.0;
  vec2 weave = cloth*vec2(832.0,640.0);
  if (vFinish > 0.5 && vFinish < 1.5) {
    fiber = (noise2(weave)-0.5)*(1.0-smoothstep(0.33,1.12,length(fwidth(weave))));
  }
  vec3 pigment = vPigment*(0.94+0.12*crease+0.15*fiber);
  float sky = 0.5+0.5*n.y;
  float softLight = max(dot(n,sunDirection),0.0);
  vec3 fill = mix(vec3(0.46,0.54,0.55),cloudDiffuseTint,sky);
  vec3 color = pigment*(fill+cloudKeyTint*(0.32*softLight*cloudTransmission(vWorld.xz)));
  vec3 halfAngle = normalize(eye+sunDirection);
  float highlight = pow(max(0.0,dot(n,halfAngle)),vFinish < 0.5 ? 19.0 : 32.0);
  color += vec3(0.86,0.84,0.80)*highlight*(vFinish < 0.5 ? 0.028 : 0.012);
  gl_FragColor = vec4(aerialPerspective(color,vWorld,distance(vWorld,cameraPosition)),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function point(anchor) {
  return anchor.isVector3 ? anchor.clone() : new THREE.Vector3(...anchor);
}

function loft(rows, sides, sculpt = null) {
  const positions = [];
  const indices = [];
  for (const [i,[y,rx,front,back,center = 0]] of rows.entries()) {
    for (let j = 0; j < sides; j++) {
      const angle = j/sides*2*Math.PI;
      const facing = Math.cos(angle);
      const x = rx*Math.sin(angle);
      const z = center-facing*(facing > 0 ? front : back);
      positions.push(...(sculpt ? sculpt(x,y,z,angle,facing) : [x,y,z]));
      if (i === rows.length-1) continue;
      const a = i*sides+j;
      const b = i*sides+(j+1)%sides;
      indices.push(a,a+sides,b,b,a+sides,b+sides);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const softBall = new THREE.SphereGeometry(1,16,12);
const strip = new THREE.BoxGeometry(1,1,1);

function batch(material) {
  const positions = [], normals = [], colors = [], finishes = [], indices = [];
  const color = new THREE.Color();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  function add(geometry, tone, finish, origin = [0,0,0], scale = [1,1,1], rotation = new THREE.Quaternion()) {
    const offset = positions.length/3;
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    matrix.compose(point(origin),rotation,point(scale));
    normalMatrix.getNormalMatrix(matrix);
    color.set(tone);
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position,i).applyMatrix4(matrix);
      n.fromBufferAttribute(normal,i).applyMatrix3(normalMatrix).normalize();
      positions.push(p.x,p.y,p.z);
      normals.push(n.x,n.y,n.z);
      colors.push(color.r,color.g,color.b);
      finishes.push(finish);
    }
    for (const index of geometry.index.array) indices.push(index+offset);
  }
  return {
    add,
    oval(center, radii, tone, finish = fabric) { add(softBall,tone,finish,center,radii); },
    strap(from, to, width, thickness, tone, finish = fabric) {
      const start = point(from);
      const end = point(to);
      const axis = end.clone().sub(start);
      const height = axis.length();
      const rotate = new THREE.Quaternion().setFromUnitVectors(UP,axis.normalize());
      add(strip,tone,finish,start.lerp(end,0.5),[width,height,thickness],rotate);
    },
    mesh() {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      geometry.setAttribute('pigment',new THREE.Float32BufferAttribute(colors,3));
      geometry.setAttribute('finish',new THREE.Float32BufferAttribute(finishes,1));
      geometry.setIndex(indices);
      geometry.computeBoundingSphere();
      return new THREE.Mesh(geometry,material);
    },
  };
}

function headMesh(material, cap, tour) {
  const parts = batch(material);
  const face = loft([
    [0,0.020,0.031,0.041,-0.009],[0.013,0.046,0.044,0.054,-0.006],
    [0.037,0.060,0.066,0.066],[0.066,0.071,0.066,0.076],
    [0.091,0.077,0.071,0.080],[0.117,0.076,0.072,0.083],
    [0.142,0.077,0.069,0.081],[0.166,0.074,0.060,0.079],
    [0.190,0.052,0.045,0.058],[0.207,0.006,0.007,0.008],
  ],32,(x,y,z,angle,facing) => {
    if (facing <= 0) return [x,y,z];
    const nose = Math.exp(-((x/0.014)**2 + ((y-0.082)/0.032)**2)) * 0.025;
    const cheek = Math.exp(-(((Math.abs(x)-0.037)/0.023)**2 + ((y-0.074)/0.026)**2)) * 0.007;
    return [x,y,z-nose-cheek];
  });
  parts.add(face,skin,0);
  for (const side of [-1,1]) {
    const x = side*0.075;
    parts.oval([x,0.082,0.012],[0.014,0.026,0.018],skin,0);
    parts.oval([x+side*0.010,0.081,0.005],[0.003,0.013,0.008],'#92654d',0);
    const eyeX = side*0.031;
    parts.oval([eyeX,0.104,-0.068],[0.013,0.0042,0.005],'#c7b1a0',0);
    parts.oval([eyeX,0.104,-0.073],[0.0041,0.0041,0.0018],'#3d3029',0);
    parts.oval([eyeX,0.118,-0.068],[0.015,0.0035,0.004],'#4b3c33',0);
  }
  parts.oval([0,0.081,-0.088],[0.013,0.012,0.010],skin,0);
  parts.oval([0,0.044,-0.068],[0.0185,0.0023,0.0033],'#855c4b',0);
  parts.add(loft([
    [0.109,0.071,0.01,0.081,0.010],[0.134,0.079,0.054,0.086,0.003],
    [0.164,0.076,0.066,0.080],[0.200,0.029,0.036,0.043],[0.212,0.003,0.004,0.005],
  ],24,(x,y,z,angle,facing) => {
    const swept = 1-THREE.MathUtils.smoothstep(y,0.13,0.17);
    return [x,y+swept*(facing > 0 ? 0.037*facing : 0.006*Math.sin(angle*7)),z];
  }),'#3f3732',0);

  parts.add(loft([
    [0.151,0.078,0.072,0.087],[0.160,0.081,0.075,0.089],[0.182,0.078,0.073,0.085],
    [0.203,0.058,0.061,0.066],[0.212,0.037,0.042,0.044],[0.217,0.003,0.006,0.006],
  ],28),cap,fabric);
  const brim = tour ? [0.118,0.145,0.113,-0.017] : [0.086,0.126,0.035,-0.040];
  const [width,front,back,center] = brim;
  parts.add(loft([
    [0.149,0.071,0.072,0.055],[0.142,width,front,back,center],
    [0.147,width,front,back,center],[0.154,0.071,0.071,0.058],
  ],36,(x,y,z) => [x,y-0.024*(x/width)**2+0.022*Math.max(0,-z/front),z]),cap,fabric);
  return parts.mesh();
}

function torsoMesh(material, outfit) {
  const parts = batch(material);
  parts.add(loft([
    [0.004,0.113,0.074,0.091],[0.067,0.150,0.108,0.110],
    [0.165,0.142,0.093,0.098],[0.266,0.161,0.110,0.101,-0.012],
    [0.365,0.187,0.108,0.091,-0.016],[0.424,0.180,0.087,0.075,-0.012],
    [0.470,0.080,0.055,0.058,-0.021],[0.484,0.043,0.042,0.045,-0.021],
  ],24,(x,y,z,angle) => [x*(1+0.027*Math.cos(angle*4+y*30)),y,z+Math.sin(angle*4+y*35)*0.008]),outfit.shirt,fabric);
  parts.add(loft([[0.443,0.049,0.045,0.047],[0.496,0.044,0.038,0.042],[0.552,0.041,0.037,0.042]],16),skin,0, [0,0,-0.041]);
  if (outfit.vest) {
    parts.add(loft([
      [0.087,0.117,0.089,0.106],[0.105,0.139,0.105,0.117],
      [0.176,0.155,0.111,0.120],[0.263,0.162,0.117,0.133,-0.004],
      [0.369,0.155,0.110,0.105,-0.020],[0.427,0.111,0.070,0.078,-0.016],
      [0.457,0.066,0.048,0.052,-0.023],
    ],24,(x,y,z,angle) => [x,y+Math.cos(angle*2)*0.012,z-0.007*Math.cos(angle*5+y*7)]),outfit.vest,fabric);
    for (const side of [-1,1]) {
      parts.oval([side*0.070,0.267,-0.111],[0.064,0.139,0.028],outfit.vest,fabric);
      parts.strap([side*0.084,0.126,0.098],[side*0.095,0.416,0.047],0.022,0.009,'#666353');
    }
    for (const y of [0.139,0.202]) {
      parts.strap([-0.12,y,-0.118],[0.12,y-0.004,-0.118],0.016,0.015,'#4c4c3e');
      parts.add(strip,'#31372f',hardware,[0.016,y,-0.131],[0.033,0.021,0.013]);
    }
  } else {
    parts.strap([0,0.090,-0.103],[-0.003,0.440,-0.090],0.015,0.008,'#616d68');
    parts.strap([-0.067,0.444,-0.094],[-0.123,0.402,-0.098],0.023,0.009,'#7c8881');
    parts.strap([0.061,0.445,-0.094],[0.118,0.403,-0.100],0.025,0.009,'#778981');
    for (const y of [0.168,0.258,0.343]) parts.oval([0,y,-0.117],[0.004,0.004,0.002],'#a2a390',hardware);
  }
  return parts.mesh();
}

function limb(material, profile, tone, endTone = null) {
  const parts = batch(material);
  parts.add(loft(profile.map(([y,x,z]) => [y,x,z,z]),14,(x,y,z,angle) => {
    const fold = 1+0.05*Math.sin(y*22+angle*1.7)+0.037*Math.sin(y*48-angle*3);
    return [x*fold,y,z*fold];
  }),tone,fabric);
  if (endTone) {
    const [,x,z] = profile.at(-2);
    parts.add(loft([[0.933,x*1.04,z*1.07,z*1.07],[0.972,x*0.94,z*0.95,z*0.95],
      [1.010,x*0.86,z*0.86,z*0.86]],14),endTone,fabric);
  }
  return parts.mesh();
}

function handMesh(material, side) {
  const parts = batch(material);
  parts.oval([0,-0.026,0.008],[0.031,0.047,0.018],skin,0);
  for (let i = 0; i < 4; i++) {
    const x = side*(-0.023+i*0.015);
    const reach = Math.sin((i+0.5)/4*Math.PI)*0.013;
    parts.oval([x,0.012+reach,0.002],[0.0082,0.030,0.012],skin,0);
    parts.oval([x,0.029+reach,-0.011],[0.0076,0.013,0.011],'#b88e73',0);
  }
  parts.oval([-side*0.027,-0.018,-0.012],[0.013,0.031,0.013],skin,0);
  return parts.mesh();
}

function shoeMesh(material) {
  const parts = batch(material);
  parts.oval([0,0.018,-0.066],[0.052,0.019,0.127],'#2d322f',hardware);
  parts.oval([0,0.046,-0.080],[0.049,0.036,0.112],'#454944',fabric);
  parts.oval([0,0.065,-0.009],[0.044,0.057,0.051],'#454944',fabric);
  for (let i = 0; i < 4; i++) {
    const z = -0.043-i*0.015;
    const y = 0.103-i*0.006;
    parts.strap([-0.023,y,z],[0.024,y-0.004,z+0.005],0.003,0.003,'#717873');
  }
  return parts.mesh();
}

// Solve for the bend in the plane chosen by the elbow or kneecap. The ends stay on their anchors.
function bentJoint(start, end, firstLength, secondLength, hint, target, axis, bend) {
  axis.subVectors(end,start);
  const distance = Math.max(axis.length(),0.001);
  axis.multiplyScalar(1/distance);
  bend.copy(hint).addScaledVector(axis,-hint.dot(axis)).normalize();
  const maxSpan = firstLength+secondLength;
  const clamped = clamp(distance,Math.abs(firstLength-secondLength)+0.001,maxSpan-0.001);
  const run = (clamped**2+firstLength**2-secondLength**2)/(2*clamped);
  const lift = Math.sqrt(Math.max(0,firstLength**2-run**2));
  return target.copy(start).addScaledVector(axis,run*distance/clamped).addScaledVector(bend,lift);
}

const clothes = {
  tour: { shirt:'#78867d', cuff:'#66766e', pants:'#53564b', cap:'#958e77', vest:null },
  fast: { shirt:'#586a73', cuff:'#4a5c64', pants:'#656763', cap:'#64716b', vest:'#927058' },
};

export function buildBoatDriver({ outfit = 'tour', hips, heels, hands }) {
  const tour = outfit === 'tour';
  const colors = tour ? clothes.tour : clothes.fast;
  const material = new THREE.ShaderMaterial({ name:'Cloth and skin under river daylight',vertexShader,fragmentShader });
  const mesh = new THREE.Group();
  mesh.name = tour ? 'Wooden boat operator' : 'Runabout operator';
  const pelvis = point(hips);
  const heelPoints = heels.map(point);
  const grips = hands.map(point);
  const chest = new THREE.Group();
  chest.add(torsoMesh(material,colors));
  mesh.add(chest);
  const head = new THREE.Group();
  head.position.set(0,0.505,-0.046);
  head.add(headMesh(material, colors.cap, tour));
  chest.add(head);

  const legs = [-1,1].map((side,index) => {
    const upper = limb(material,[[-0.08,0.049,0.053],[0.08,0.101,0.096],[0.46,0.091,0.078],[0.87,0.067,0.062],[1.05,0.047,0.052]],colors.pants);
    const lower = limb(material,[[-0.10,0.048,0.048],[0.025,0.065,0.060],[0.34,0.071,0.058],[0.72,0.049,0.040],[1.025,0.036,0.038]],colors.pants);
    const shoe = shoeMesh(material);
    shoe.position.copy(heelPoints[index]);
    shoe.rotation.y = side*-0.14;
    mesh.add(shoe,lower,upper);
    return { upper,lower,ankle:shoe.position.clone().add(new THREE.Vector3(0,0.095,0)),hip:new THREE.Vector3(side*0.081,-0.024,0.006),
      bend:new THREE.Vector3(side*0.24,0.40,-1.0) };
  });
  const arms = [-1,1].map((side) => {
    const upper = limb(material,[[-0.18,0.032,0.037],[0.02,0.071,0.061],[0.37,0.057,0.052],[0.76,0.051,0.045],[1.035,0.044,0.045]],colors.shirt);
    const lower = limb(material,[[-0.12,0.042,0.046],[0.05,0.048,0.052],[0.48,0.041,0.046],[0.77,0.034,0.034],[1.002,0.027,0.028]],colors.shirt,colors.cuff);
    const hand = handMesh(material,side);
    mesh.add(upper,lower,hand);
    return { upper,lower,hand,shoulder:new THREE.Vector3(side*0.163,0.366,-0.018),
      bend:new THREE.Vector3(side*0.72,-1.0,0.28) };
  });

  const from = new THREE.Vector3();
  const joint = new THREE.Vector3();
  const delta = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const wrist = new THREE.Vector3();
  const eye = new THREE.Vector3();
  function place(piece, a, b) {
    delta.subVectors(b,a);
    const height = delta.length();
    piece.position.copy(a);
    piece.scale.y = Math.max(height,0.001);
    piece.quaternion.setFromUnitVectors(UP,delta.normalize());
  }

  function update({ time = 0, steering = 0, throttle = 0, hands: nextHands } = {}) {
    const turn = clamp(steering,-1,1);
    const power = clamp(throttle,0,1);
    if (nextHands) for (let i = 0; i < grips.length; i++) {
      const anchor = nextHands[i];
      if (anchor.isVector3) grips[i].copy(anchor);
      else grips[i].fromArray(anchor);
    }
    chest.position.copy(pelvis);
    chest.position.y += Math.sin(time*2.15)*0.0031;
    chest.rotation.set(-0.090-power*0.068, (tour ? -0.05 : 0)+turn*0.085, -turn*0.044, 'YXZ');
    head.rotation.set(0.044+power*0.058,-turn*0.145,turn*0.019,'YXZ');
    chest.updateMatrix();
    head.updateMatrix();
    eye.set(0,0.104,-0.076).applyMatrix4(head.matrix).applyMatrix4(chest.matrix);

    for (const leg of legs) {
      from.copy(leg.hip).add(pelvis);
      bentJoint(from,leg.ankle,0.384,0.396,leg.bend,joint,axis,bend);
      place(leg.upper,from,joint);
      place(leg.lower,joint,leg.ankle);
    }
    for (const [i,arm] of arms.entries()) {
      from.copy(arm.shoulder).applyMatrix4(chest.matrix);
      bentJoint(from,grips[i],0.281,0.305,arm.bend,joint,axis,bend);
      wrist.copy(grips[i]).lerp(joint,0.18);
      place(arm.upper,from,joint);
      place(arm.lower,joint,wrist);
      arm.hand.position.copy(grips[i]);
      delta.subVectors(grips[i],wrist).normalize();
      arm.hand.quaternion.setFromUnitVectors(UP,delta);
      arm.hand.rotateY((i === 0 ? 1 : -1)*(tour ? 0.94 : 1.12));
    }
  }

  update();
  return { mesh,head,eye,update };
}

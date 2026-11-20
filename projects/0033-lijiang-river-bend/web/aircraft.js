import * as THREE from 'three';
import { atmosphere, noise } from './shaders.js';

const vertexShader = /* glsl */ `
attribute vec3 aPigment;
attribute float aFinish;
varying vec3 vPigment;
varying float vFinish;
varying vec3 vLocal;
varying vec3 vWorld;
varying vec3 vSurface;
void main() {
  vPigment = aPigment;
  vFinish = aFinish;
  vLocal = position;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vSurface = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vPigment;
varying float vFinish;
varying vec3 vLocal;
varying vec3 vWorld;
varying vec3 vSurface;
${noise}
${atmosphere}

float skinLine(float value, float radius) {
  float feather = max(0.0009, fwidth(value)*0.65);
  return (1.0-smoothstep(radius, radius+feather, abs(value)))
    * (1.0-smoothstep(radius*2.0, radius*8.0, feather));
}

void main() {
  vec3 n = normalize(vSurface) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 eye = normalize(cameraPosition-vWorld);
  vec3 tint = vPigment;
  vec3 lakePaint = vec3(0.128,0.166,0.142);
  float facing = clamp(dot(n,eye),0.0,1.0);
  float skyMix = 0.5 + 0.5*n.y;
  float sun = (0.5+0.5*dot(n,sunDirection))*cloudTransmission(vWorld.xz);
  vec3 reflected = reflect(-eye,n);
  float horizon = smoothstep(-0.28,0.43,reflected.y);
  vec3 reflection = mix(vec3(0.145,0.195,0.182),horizonLight*0.72,horizon);
  float coating = 0.04 + 0.13*pow(1.0-facing,3.3);
  float softSpecular = 0.031;
  float seam = 0.0;
  float occlusion = 1.0;
  if (vFinish < 0.5) {
    float belt = vLocal.y + 0.116 - 0.12*smoothstep(0.38,2.35,vLocal.z);
    tint = mix(tint,lakePaint,0.80*skinLine(belt,0.045));
    tint = mix(tint,tint*0.88,0.68*(1.0-smoothstep(-0.27,-0.09,belt)));
    seam = max(skinLine(vLocal.z+1.37,0.006),skinLine(vLocal.z-0.70,0.004));
    // The wing dims the upper cabin from the wide cloud light above it.
    occlusion -= 0.22*smoothstep(0.04,0.5,vLocal.y)*(1.0-smoothstep(0.30,1.1,abs(vLocal.z+0.27)));
  } else if (vFinish > 3.5) {
    if (vFinish < 4.5) {
      float wingTip = smoothstep(2.96,3.02,abs(vLocal.x));
      tint = mix(tint,lakePaint,0.58*wingTip);
      float span = abs(vLocal.x);
      float flap = skinLine(vLocal.z-0.36+span*0.037,0.011)*smoothstep(0.53,0.72,span)*(1.0-smoothstep(2.93,3.09,span));
      float hinge = skinLine(span-1.82,0.007)*smoothstep(0.28,0.37,vLocal.z);
      seam = max(flap,hinge);
    } else {
      tint = mix(tint,lakePaint,0.58*smoothstep(0.99,1.04,vLocal.y));
      seam = skinLine(vLocal.z-2.24,0.007)*smoothstep(0.28,0.40,vLocal.y);
    }
  }
  vec2 panels = vec2(vLocal.x*2.4+vLocal.y*3.1, vLocal.z*1.4);
  float oxidation = noise2(panels) + 0.39*noise2(panels*4.5);
  float runningGrime = noise2(vec2(panels.x*3.7,panels.y*0.8));
  float joint = seam*(0.6+0.4*runningGrime);
  tint *= (0.90 + 0.083*oxidation)*(1.0-0.23*joint);
  vec3 fill = mix(vec3(0.39,0.47,0.45),cloudDiffuseTint*0.94,skyMix);
  vec3 color = tint*occlusion*(fill+cloudKeyTint*(0.19*sun));
  if (vFinish > 0.5 && vFinish < 1.5) {
    // Tinted glazing receives the same muted valley bounce and cloud reflection as the paint.
    float glassReflect = 0.18 + 0.50*pow(1.0-facing,3.2);
    color = mix(tint*(0.43+0.16*sun),reflection*0.69,glassReflect);
    coating = 0.0;
    softSpecular = 0.068;
  } else if (vFinish > 1.5 && vFinish < 2.5) {
    coating *= 0.28;
    softSpecular = 0.009;
  }
  vec3 halfVector = normalize(eye + sunDirection);
  color += reflection*coating + vec3(0.86,0.91,0.90)*softSpecular*pow(max(0.0,dot(n,halfVector)),13.0);
  gl_FragColor = vec4(aerialPerspective(color,vWorld,distance(vWorld,cameraPosition)),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const propDiscVertex = /* glsl */ `
varying vec2 vProp;
varying vec3 vWorld;
void main() {
  vProp = uv*2.0-1.0;
  vWorld = (modelMatrix*vec4(position,1.0)).xyz;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
`;

const propDiscFragment = /* glsl */ `
uniform float uPower;
varying vec2 vProp;
varying vec3 vWorld;
${atmosphere}

void main() {
  float r = length(vProp);
  float trace = smoothstep(0.12,0.26,r)*(1.0-smoothstep(0.82,1.0,r));
  float tips = smoothstep(0.79,0.87,r)*(1.0-smoothstep(0.95,0.995,r));
  float thickness = 0.049+0.041*(1.0-r);
  float alpha = uPower*(trace*thickness + tips*0.036);
  vec3 color = mix(vec3(0.134,0.163,0.149),vec3(0.52,0.56,0.54),tips*0.26);
  gl_FragColor = vec4(aerialPerspective(color,vWorld,distance(vWorld,cameraPosition)),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const ivory = '#c6c9ba';
const spruce = '#6e7c71';
const trim = '#65736c';
const tire = '#343a38';
const steel = '#919b97';
const spinner = '#a2aca5';
const glass = '#415450';
const gasket = '#49524e';
const up = new THREE.Vector3(0, 1, 0);

// Longitudinal stations in metres from spinner to tail. The cabin has additional headroom.
const sections = [
  [-2.25, 0.16, 0.015, 0.17, 0.16],
  [-2.17, 0.288, 0.008, 0.28, 0.26],
  [-1.98, 0.38, -0.005, 0.348, 0.32],
  [-1.56, 0.465, -0.026, 0.367, 0.38],
  [-1.33, 0.49, -0.018, 0.399, 0.414],
  [-0.84, 0.527, 0.004, 0.57, 0.422],
  [-0.25, 0.535, 0.017, 0.59, 0.419],
  [0.32, 0.469, 0.012, 0.545, 0.401],
  [0.74, 0.368, 0.002, 0.425, 0.348],
  [1.24, 0.274, 0.019, 0.315, 0.254],
  [1.74, 0.173, 0.044, 0.229, 0.185],
  [2.16, 0.103, 0.07, 0.173, 0.119],
  [2.44, 0.053, 0.085, 0.125, 0.07],
  [2.52, 0.019, 0.097, 0.076, 0.045],
];

function grid(rows, columns, point, closeEnds = false) {
  const coords = [];
  const faces = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      coords.push(...point(row, column));
      if (row === rows-1 || column === columns-1) continue;
      const first = row*columns + column;
      faces.push(first, first+1, first+columns, first+1, first+columns+1, first+columns);
    }
  }
  if (closeEnds) {
    for (const row of [0, rows-1]) {
      const center = [0,0,0];
      const base = row*columns;
      for (let i = 0; i < columns-1; i++) {
        for (let axis = 0; axis < 3; axis++) center[axis] += coords[(base+i)*3+axis]/(columns-1);
      }
      const cap = coords.length/3;
      coords.push(...center);
      for (let i = 0; i < columns-1; i++) {
        if (row === 0) faces.push(cap,base+i+1,base+i);
        else faces.push(cap,base+i,base+i+1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(coords,3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

function sectionAt(z) {
  const next = sections.findIndex((section) => section[0] >= z);
  if (next === 0) return sections[0];
  if (next < 0) return sections.at(-1);
  const a = sections[next-1];
  const b = sections[next];
  const f = (z-a[0])/(b[0]-a[0]);
  return a.map((value, i) => THREE.MathUtils.lerp(value,b[i],f));
}

function hullPoint([z,width,center,roof,belly], theta, extra = 0) {
  const height = Math.sin(theta);
  return [
    Math.cos(theta)*(width+extra),
    center + height*((height >= 0 ? roof : belly)+extra),
    z,
  ];
}

function panel(zStart, zEnd, fromAngle, toAngle, offset, rake) {
  return grid(7,15,(row,column) => {
    const theta = THREE.MathUtils.lerp(fromAngle,toAngle,column/14)*Math.PI/180;
    const z = THREE.MathUtils.lerp(zStart,zEnd,row/6) + rake*Math.sin(theta);
    return hullPoint(sectionAt(z),theta,offset);
  });
}

function airfoil(stations, thickness) {
  return grid(stations.length,25,(row,column) => {
    const [x, y, front, rear] = stations[row];
    const theta = column*Math.PI/12;
    const ratio = 0.5-0.5*Math.cos(theta);
    const cross = Math.sin(theta);
    const top = 0.27 + (cross > 0 ? 0.73 : 0.37)*Math.sin(Math.PI*ratio);
    const lift = thickness*cross*top + Math.sin(Math.PI*ratio)*thickness*0.20;
    return [x,y+lift,THREE.MathUtils.lerp(front,rear,ratio)];
  }, true);
}

function batch() {
  const coords = [];
  const normals = [];
  const pigments = [];
  const finishes = [];
  const faces = [];
  const normalMatrix = new THREE.Matrix3();
  const vector = new THREE.Vector3();
  const empty = new THREE.Matrix4();
  const color = new THREE.Color();
  return {
    add(geometry, pigment, finish = 3, matrix = empty) {
      const vertices = geometry.getAttribute('position');
      const directions = geometry.getAttribute('normal');
      const indices = geometry.getIndex();
      const start = coords.length/3;
      normalMatrix.getNormalMatrix(matrix);
      color.set(pigment);
      for (let i = 0; i < vertices.count; i++) {
        vector.fromBufferAttribute(vertices,i).applyMatrix4(matrix);
        coords.push(vector.x,vector.y,vector.z);
        vector.fromBufferAttribute(directions,i).applyNormalMatrix(normalMatrix);
        normals.push(vector.x,vector.y,vector.z);
        pigments.push(color.r,color.g,color.b);
        finishes.push(finish);
      }
      for (let i = 0; i < (indices?.count ?? vertices.count); i++) faces.push(start + (indices ? indices.getX(i) : i));
      geometry.dispose();
    },
    mesh(material) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      geometry.setAttribute('aPigment',new THREE.Float32BufferAttribute(pigments,3));
      geometry.setAttribute('aFinish',new THREE.Float32BufferAttribute(finishes,1));
      geometry.setIndex(faces);
      return new THREE.Mesh(geometry,material);
    },
  };
}

function matrixAt(x, y, z) {
  return new THREE.Matrix4().makeTranslation(x,y,z);
}

function rod(body, a, b, radius, color, finish = 3, tip = radius) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const axis = end.clone().sub(start);
  const length = axis.length();
  const rotation = new THREE.Quaternion().setFromUnitVectors(up,axis.normalize());
  const transform = new THREE.Matrix4().compose(start.lerp(end,0.5),rotation,new THREE.Vector3(1,1,1));
  body.add(new THREE.CylinderGeometry(tip,radius,length,8),color,finish,transform);
}

function wheel(body, x, y, z, radius, width) {
  const axis = new THREE.Matrix4().makeRotationZ(Math.PI/2).setPosition(x,y,z);
  body.add(new THREE.CylinderGeometry(radius*0.91,radius*0.91,width,16,1),tire,2,axis);
  for (const side of [-1,1]) {
    const rim = new THREE.Matrix4().makeRotationY(Math.PI/2).setPosition(x+side*width*0.33,y,z);
    body.add(new THREE.TorusGeometry(radius*0.85,radius*0.15,6,16),tire,2,rim);
  }
  body.add(new THREE.CylinderGeometry(radius*0.48,radius*0.48,width+0.026,12),steel,3,axis);
}

function buildAirframe(material) {
  const frame = batch();
  frame.add(grid(sections.length,33,(row,col) => hullPoint(sections[row],col*Math.PI/16),true),ivory,0);
  // Split windshield and side panes keep the cabin readable from the chase view.
  for (const [zStart,zEnd,rake,ranges] of [
    [-1.53,-1.07,0.24,[[31,85],[95,149]]],
    [-0.83,-0.23,0.055,[[10,53],[127,170]]],
    [-0.14,0.34,0.015,[[13,50],[130,167]]],
    [0.38,0.69,-0.06,[[36,87],[93,144]]],
  ]) {
    for (const [from,to] of ranges) {
      frame.add(panel(zStart,zEnd,from,to,0.009,rake),gasket,2);
      frame.add(panel(zStart+0.022,zEnd-0.022,from+1.8,to-1.8,0.015,rake),glass,1);
    }
  }

  frame.add(airfoil([
    [-3.30,0.785,-0.37,-0.20],[-3.28,0.785,-0.70,0.11],[-3.24,0.785,-0.94,0.34],[-2.90,0.762,-1.09,0.53],
    [-2.30,0.717,-1.155,0.59],[-1.44,0.67,-1.204,0.665],[-0.48,0.635,-1.228,0.70],
    [0.48,0.635,-1.228,0.70],[1.44,0.67,-1.204,0.665],[2.30,0.717,-1.155,0.59],
    [2.90,0.762,-1.09,0.53],[3.24,0.785,-0.94,0.34],[3.28,0.785,-0.70,0.11],[3.30,0.785,-0.37,-0.20],
  ],0.13),ivory,4);
  frame.add(airfoil([
    [-1.42,0.162,1.88,2.42],[-1.30,0.154,1.81,2.51],[-0.67,0.14,1.62,2.59],
    [0.67,0.14,1.62,2.59],[1.30,0.154,1.81,2.51],[1.42,0.162,1.88,2.42],
  ],0.065),ivory,3);
  frame.add(airfoil([
    [0,0,1.36,2.40],[0.19,0,1.45,2.46],[0.55,0,1.74,2.49],
    [0.92,0,1.95,2.47],[1.14,0,2.04,2.37],[1.16,0,2.12,2.32],
  ],0.074),ivory,5,new THREE.Matrix4().makeRotationZ(Math.PI/2).setPosition(0,0.105,0));

  for (const side of [-1,1]) {
    rod(frame,[side*0.481,-0.324,-0.26],[side*2.29,0.683,-0.61],0.038,ivory);
    rod(frame,[side*0.49,-0.314,0.06],[side*1.88,0.672,0.40],0.027,trim);
    rod(frame,[side*0.367,-0.36,-0.76],[side*0.742,-0.793,-0.56],0.058,spruce);
    rod(frame,[side*0.38,-0.323,-0.11],[side*0.742,-0.793,-0.56],0.029,steel);
    wheel(frame,side*0.748,-0.795,-0.56,0.253,0.162);
    const light = side < 0 ? '#805e56' : '#638071';
    frame.add(new THREE.SphereGeometry(0.038,10,6),light,3,matrixAt(side*3.307,0.786,-0.29));
    rod(frame,[side*0.308,-0.15,-1.59],[side*0.314,-0.18,-1.94],0.035,tire,2);
  }
  rod(frame,[0,0.64,0.20],[0,0.96,0.37],0.013,tire,2);
  rod(frame,[0,-0.039,2.09],[0,-0.275,2.37],0.026,steel);
  wheel(frame,0,-0.277,2.39,0.105,0.065);
  return frame.mesh(material);
}

function buildPropeller(material) {
  const assembly = new THREE.Group();
  assembly.position.set(0,0.035,-2.31);
  const hub = batch();
  rod(hub,[0,0,0.08],[0,0,-0.158],0.156,spinner,3,0.046);
  const blades = batch();
  for (let i = 0; i < 3; i++) {
    const blade = grid(5,2,(row,col) => {
      const marks = [[0.12,0.051,0],[0.25,0.085,0.014],[0.49,0.104,-0.011],[0.73,0.088,-0.060],[0.88,0.035,-0.081]];
      const [y, width, rake] = marks[row];
      return [rake + (col === 0 ? -width : width),y,0.024 + (col === 0 ? 0.007 : -0.021)*(1.0-y)];
    });
    blades.add(blade,tire,2,new THREE.Matrix4().makeRotationZ(i*Math.PI*2/3));
  }
  const rotor = blades.mesh(material);
  const power = { value: 0 };
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.886,40),new THREE.ShaderMaterial({
    vertexShader: propDiscVertex,
    fragmentShader: propDiscFragment,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    uniforms: { uPower: power },
  }));
  disc.visible = false;
  disc.position.z = 0.024;
  assembly.add(hub.mesh(material),rotor,disc);
  return { assembly, rotor, disc, power };
}

export function buildAircraft() {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Group();
  mesh.visible = false;
  const propeller = buildPropeller(material);
  mesh.add(buildAirframe(material),propeller.assembly);
  let lastTime = 0;
  let spin = 0.26;
  propeller.rotor.rotation.z = spin;
  return {
    mesh,
    update(timeSeconds, intensity = 1) {
      const power = THREE.MathUtils.clamp(intensity,0,1.35);
      const ticking = timeSeconds > 0;
      const delta = ticking ? THREE.MathUtils.clamp(timeSeconds-lastTime,0,0.18) : 0;
      lastTime = timeSeconds;
      spin = ticking ? (spin + delta*(86 + 73*power)) % (Math.PI*2) : 0.26;
      propeller.rotor.rotation.z = spin;
      // Exposure during normal motion spans a meaningful part of a turn, so the blades read as a disc.
      const blur = ticking && power > 0.1;
      propeller.rotor.visible = !blur;
      propeller.disc.visible = blur;
      propeller.power.value = 0.64 + 0.26*power;
    },
  };
}

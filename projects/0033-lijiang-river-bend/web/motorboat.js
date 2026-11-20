import * as THREE from 'three';
import { atmosphere, noise } from './shaders.js';

const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const { clamp, lerp } = THREE.MathUtils;
const helmSeat = [0.35,0.34];
const wheelCenter = [0.329,0.755,-0.210];
const wheelRadius = 0.135;
const tillerGrip = new THREE.Vector3(0.105,0.541,-0.968);
const palette = {
  shell: '#d0ccba',
  fiberglass: '#afa995',
  lining: '#9d998a',
  sole: '#67695f',
  rail: '#394c4e',
  cushion: '#706e64',
  piping: '#8f8b78',
  metal: '#8c9a97',
  rubber: '#313838',
  engine: '#364245',
  trim: '#577478',
  propeller: '#8b9797',
};

const vertexShader = /* glsl */ `
attribute vec3 finishColor;
attribute vec2 finish;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vColor;
varying vec2 vFinish;
void main() {
  vLocal = position;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vNormal = normalize(mat3(modelMatrix)*normal);
  vColor = finishColor;
  vFinish = finish;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vColor;
varying vec2 vFinish;
${noise}
${atmosphere}
void main() {
  vec3 normal = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 eye = normalize(cameraPosition-vWorld);
  float up = max(0.0, normal.y);
  float sunlight = max(0.0,dot(normal,sunDirection));
  float fresnel = pow(1.0-clamp(dot(normal,eye),0.0,1.0),4.0);
  float grain = noise2(vLocal.xz*vec2(47.0,28.0) + vLocal.y*12.0);
  float grainFade = 1.0-smoothstep(0.017,0.052,max(length(dFdx(vLocal)),length(dFdy(vLocal))));
  vec3 pigment = vColor*(1.0+(grain-0.5)*0.115*grainFade);
  float wall = step(0.5,vFinish.y) * (1.0-step(1.5,vFinish.y));
  float stripe = smoothstep(0.079,0.092,vLocal.y)*(1.0-smoothstep(0.168,0.179,vLocal.y));
  float lower = 1.0-smoothstep(0.012,0.034,vLocal.y);
  pigment = mix(pigment,vec3(0.075,0.126,0.129),wall*stripe);
  pigment = mix(pigment,pigment*vec3(0.65,0.73,0.74),wall*lower);
  float wet = (1.0-smoothstep(-0.04,0.16,vWorld.y))*wall;
  float sheen = vFinish.x + wet*0.2;
  vec3 diffuse = pigment*(cloudDiffuseTint*(0.54+up*0.33)
    + cloudKeyTint*(sunlight*0.40*cloudTransmission(vWorld.xz)));
  vec3 halfVector = normalize(eye + sunDirection);
  float glint = pow(max(0.0,dot(normal,halfVector)),mix(13.0,43.0,sheen));
  vec3 color = diffuse + vec3(0.59,0.68,0.70)*(glint*0.17 + fresnel*0.095)*sheen;
  float opacity = 1.0;
  if (vFinish.y > 1.5) {
    color = mix(vec3(0.093,0.142,0.152),vec3(0.57,0.66,0.69),clamp(0.27+up*0.26+fresnel*0.5,0.0,1.0));
    opacity = 0.18 + fresnel*0.36;
  }
  gl_FragColor = vec4(aerialPerspective(color,vWorld,distance(vWorld,cameraPosition)),opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function skinMaterial(name, glass = false) {
  return new THREE.ShaderMaterial({
    name, vertexShader, fragmentShader, side: THREE.DoubleSide,
    transparent: glass, depthWrite: !glass,
  });
}

// Fixtures are folded into one mesh per rigid assembly and share an atmospheric material.
function batch() {
  const positions = [], normals = [], colors = [], finishes = [], indices = [];
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  const matrix = new THREE.Matrix4();

  function add(geometry, shade, sheen = 0.2, position = new THREE.Vector3(), rotation = new THREE.Quaternion(), surface = 0) {
    const start = positions.length/3;
    const color = new THREE.Color(shade);
    const p = geometry.getAttribute('position');
    const n = geometry.getAttribute('normal');
    matrix.compose(position, rotation, new THREE.Vector3(1,1,1));
    normalMatrix.getNormalMatrix(matrix);
    for (let i = 0; i < p.count; i++) {
      point.fromBufferAttribute(p,i).applyMatrix4(matrix);
      normal.fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();
      positions.push(point.x,point.y,point.z);
      normals.push(normal.x,normal.y,normal.z);
      colors.push(color.r,color.g,color.b);
      finishes.push(sheen,surface);
    }
    if (geometry.index) {
      for (const i of geometry.index.array) indices.push(start + i);
    } else {
      for (let i = 0; i < p.count; i++) indices.push(start + i);
    }
    geometry.dispose();
  }

  function bake(material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geometry.setAttribute('finishColor',new THREE.Float32BufferAttribute(colors,3));
    geometry.setAttribute('finish',new THREE.Float32BufferAttribute(finishes,2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return new THREE.Mesh(geometry,material);
  }

  return { add, bake };
}

function surface(points, indices) {
  const mesh = new THREE.BufferGeometry();
  mesh.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
  mesh.setIndex(indices);
  mesh.computeVertexNormals();
  return mesh;
}

function panel(w, h, d, radius) {
  const x = w*0.5 - radius*0.59;
  const y = h*0.5 - radius*0.59;
  const r = Math.min(radius,x*0.68,y*0.68);
  const bevel = Math.min(radius*0.59,d*0.20);
  const depth = d - bevel*2;
  const shape = new THREE.Shape();
  shape.moveTo(-x + r,-y);
  shape.lineTo(x - r,-y);
  shape.quadraticCurveTo(x,-y,x,-y + r);
  shape.lineTo(x,y - r);
  shape.quadraticCurveTo(x,y,x - r,y);
  shape.lineTo(-x + r,y);
  shape.quadraticCurveTo(-x,y,-x,y - r);
  shape.lineTo(-x,-y + r);
  shape.quadraticCurveTo(-x,-y,-x + r,-y);
  return new THREE.ExtrudeGeometry(shape,{
    depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 3,
  }).translate(0,0,-depth/2);
}

function block(mesh, size, point, shade, sheen = 0.2, rounded = 0) {
  const solid = rounded > 0 ? panel(...size,rounded) : new THREE.BoxGeometry(...size);
  mesh.add(solid,shade,sheen,new THREE.Vector3(...point));
}

function cylinder(mesh, from, to, radius, shade, sheen = 0.4, top = radius) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(top,radius,direction.length(),10);
  const rotation = new THREE.Quaternion().setFromUnitVectors(UP,direction.normalize());
  mesh.add(geometry,shade,sheen,start.lerp(end,0.5),rotation);
}

function tube(mesh, points, radius, shade, sheen = 0.3, close = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)),close);
  mesh.add(new THREE.TubeGeometry(curve,Math.max(14,points.length*3),radius,7,close),shade,sheen);
}

// z, half beam, gunwale, keel. The broad aft V and squared transom form a planing hull.
const hull = [
  [-2.70,0.022,0.626,0.168],[-2.57,0.204,0.625,0.071],[-2.32,0.390,0.613,-0.031],
  [-1.94,0.598,0.583,-0.126],[-1.45,0.775,0.551,-0.204],[-0.85,0.880,0.526,-0.263],
  [-0.22,0.925,0.510,-0.268],[0.51,0.922,0.505,-0.252],[1.21,0.878,0.516,-0.229],
  [1.77,0.813,0.535,-0.193],[2.18,0.757,0.542,-0.157],
];
const V = [
  [-1,1],[-0.977,0.83],[-0.936,0.61],[-0.879,0.39],[-0.774,0.258],[-0.448,0.124],
  [0,0],[0.448,0.124],[0.774,0.258],[0.879,0.39],[0.936,0.61],[0.977,0.83],[1,1],
];

function crossSection(z) {
  const index = clamp(hull.findIndex((entry) => entry[0] >= z),1,hull.length-1);
  const a = hull[index-1], b = hull[index];
  const t = (z-a[0])/(b[0]-a[0]);
  return [z,...a.slice(1).map((value,i) => lerp(value,b[i+1],t))];
}

function top(z, across, inset = 0) {
  const [, beam, sheer] = crossSection(z);
  return [Math.sign(across)*Math.max(0,beam-inset)*Math.abs(across),sheer - 0.014*(1-Math.abs(across)),z];
}

function strips(mesh, rows, edges, shade, sheen, depth = 0) {
  const points = rows.flatMap((z) => edges.map(([across,inset]) => {
    const p = top(z,across,inset);
    p[1] -= depth;
    return p;
  }));
  const indices = [];
  for (let r = 0; r < rows.length-1; r++) {
    for (let c = 0; c < edges.length-1; c++) {
      const a = r*edges.length+c;
      const b = a + edges.length;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
  }
  mesh.add(surface(points,indices),shade,sheen);
}

function hullShell(mesh, inside) {
  const points = hull.flatMap(([z,b,ridge,keel]) => V.map(([s,h]) => [
    s*(inside ? Math.max(0.012,b-0.065) : b),
    inside ? lerp(0.173,ridge-0.043,h) : lerp(keel,ridge,h),z,
  ]));
  const indices = [];
  for (let r = 0; r < hull.length-1; r++) {
    for (let c = 0; c < V.length-1; c++) {
      const a = r*V.length+c;
      const b = a+V.length;
      if (inside) indices.push(a,b,a+1,a+1,b,b+1);
      else indices.push(a,a+1,b,a+1,b+1,b);
    }
  }
  mesh.add(surface(points,indices),inside ? palette.lining : palette.shell,inside ? 0.22 : 0.63,
    undefined,undefined,inside ? 0 : 1);
}

function endCap(mesh, section) {
  const [z, beam, topY, bottom] = section;
  const points = [[0,topY,z],...V.map(([x,y]) => [beam*x,lerp(bottom,topY,y),z])];
  const indices = [];
  for (let i = 1; i < points.length-1; i++) indices.push(0,i,i+1);
  mesh.add(surface(points,indices),palette.shell,0.51,undefined,undefined,1);
}

function cushion(mesh, center, width) {
  const [x,z] = center;
  block(mesh,[width*0.74,0.15,0.32],[x,0.245,z],palette.rubber,0.19,0.03);
  block(mesh,[width,0.111,0.433],[x,0.348,z],palette.cushion,0.15,0.045);
  block(mesh,[width*0.96,0.242,0.103],[x,0.484,z + 0.184],palette.cushion,0.15,0.037);
  tube(mesh,[[x-width*0.43,0.385,z+0.13],[x,0.395,z+0.14],[x+width*0.43,0.385,z+0.13]],0.005,palette.piping);
}

function coachwork() {
  const mesh = batch();
  hullShell(mesh,false);
  hullShell(mesh,true);
  endCap(mesh,hull[0]);
  endCap(mesh,hull[hull.length-1]);
  strips(mesh,[-2.70,-2.57,-2.32,-1.94,-1.45,-1.07],[[-1,0.007],[0,0],[1,0.007]],palette.fiberglass,0.61,0.008);
  const sides = [-1.07,-0.85,-0.22,0.51,1.21,1.77,2.18];
  strips(mesh,sides,[[-1,0.012],[-1,0.137]],palette.fiberglass,0.59);
  strips(mesh,sides,[[1,0.137],[1,0.012]],palette.fiberglass,0.59);
  strips(mesh,[1.85,2.03,2.18],[[-1,0.010],[-1,0.286],[1,0.286],[1,0.010]],palette.fiberglass,0.57);
  block(mesh,[1.263,0.055,2.794],[0,0.169,0.41],palette.sole,0.16,0.025);
  for (const side of [-1,1]) {
    tube(mesh,hull.map(([z,b,y]) => [side*(b-0.008),y-0.018,z]),0.019,palette.rail,0.46);
    tube(mesh,hull.slice(2,-1).map(([z,b,y]) => [side*(b-0.09),y+0.001,z]),0.006,palette.metal,0.57);
    tube(mesh, [[side*0.675,0.584,0.44],[side*0.677,0.636,0.53],[side*0.644,0.637,0.94],[side*0.635,0.594,1.04]],
      0.018,palette.metal,0.51);
  }
  cushion(mesh,[-0.352,0.59],0.46);
  cushion(mesh,helmSeat,0.46);
  cushion(mesh,[0,1.56],1.32);

  const hatch = [[-0.07,0.598,-2.20],[-0.25,0.579,-1.89],[-0.27,0.556,-1.58],[-0.15,0.550,-1.49],
    [0.15,0.550,-1.49],[0.27,0.556,-1.58],[0.25,0.579,-1.89],[0.07,0.598,-2.20]];
  tube(mesh,hatch,0.0055,palette.rail,0.28,true);
  tube(mesh,[[-0.071,0.63,-2.407],[-0.055,0.65,-2.408],[0.055,0.65,-2.408],[0.071,0.63,-2.407]],
    0.015,palette.metal,0.56);
  // Dashboard and gunwale-mounted throttle in front of the helm seat.
  block(mesh,[0.552,0.313,0.528],[0.329,0.458,-0.766],palette.fiberglass,0.29,0.057);
  block(mesh,[0.528,0.152,0.264],[0.329,0.656,-0.531],palette.rail,0.29,0.032);
  block(mesh,[0.429,0.169,0.43],[-0.354,0.423,-0.947],palette.fiberglass,0.27,0.035);
  block(mesh,[0.32,0.076,0.020],[-0.351,0.485,-0.723],palette.rail,0.28,0.009);
  for (const x of [0.22,0.329,0.433]) {
    cylinder(mesh,[x,0.685,-0.412],[x,0.685,-0.388],0.030,palette.metal,0.52);
    cylinder(mesh,[x,0.685,-0.394],[x,0.685,-0.384],0.024,palette.rubber,0.21);
    cylinder(mesh,[x-0.013,0.678,-0.382],[x+0.008,0.697,-0.382],0.0016,'#ddd2a8',0.19);
  }
  block(mesh,[0.105,0.095,0.171],[0.689,0.483,0.112],palette.rail,0.31,0.017);
  cylinder(mesh,[0.329,0.696,-0.410],wheelCenter,0.044,palette.rubber,0.36,0.030);
  return mesh;
}

function addWindshield(body, glass) {
  const posts = [
    { low:[-0.759,0.537,-0.646], high:[-0.646,0.697,-0.617] },
    { low:[-0.398,0.556,-1.129], high:[-0.377,0.783,-1.003] },
    { low:[0.000,0.553,-1.158], high:[0.000,0.790,-1.033] },
    { low:[0.398,0.556,-1.129], high:[0.377,0.783,-1.003] },
    { low:[0.759,0.537,-0.646], high:[0.646,0.697,-0.617] },
  ];
  for (let i = 0; i < posts.length-1; i++) {
    const a = posts[i], b = posts[i+1];
    glass.add(surface([a.low,a.high,b.high,b.low],[0,1,2,0,2,3]),palette.metal,0.72,undefined,undefined,2);
    cylinder(body,a.low,b.low,0.012,palette.rail,0.46);
    cylinder(body,a.high,b.high,0.012,palette.rail,0.46);
  }
  for (const post of posts) cylinder(body,post.low,post.high,0.009,palette.rail,0.42);
}

function trimAssembly(material, small) {
  const trim = batch();
  const width = small ? 0.226 : 0.363;
  const top = small ? 0.564 : 0.745;
  const center = small ? 0.448 : 0.573;
  const depth = small ? 0.230 : 0.319;
  block(trim,[width,top-center+0.137,depth],[0,center,0.086],palette.engine,0.52,0.042);
  block(trim,[width*0.925,0.056,depth*1.02],[0,center-0.094,0.086],palette.trim,0.62,0.014);
  block(trim,[width*0.75,0.064,0.026],[0,center+0.02,0.092+depth*0.5],palette.rubber,0.28,0.01);
  for (const side of [-1,1]) {
    for (let i = 0; i < 4; i++) {
      block(trim,[0.016,0.013,depth*0.36],[side*width*0.496,center+0.071-i*0.019,0.102],palette.rubber,0.25);
    }
    cylinder(trim,[side*width*0.53,center-0.171,-0.128],[side*width*0.53,center-0.171,0.127],
      0.017,palette.metal,0.58);
  }
  cylinder(trim,[0,center-0.131,0.076],[0,-0.180,0.111],width*0.20,palette.engine,0.46,width*0.16);
  block(trim,[width*0.93,0.023,0.249],[0,-0.078,0.103],palette.engine,0.48,0.004);
  cylinder(trim,[0,-0.164,0.001],[0,-0.164,0.231],width*0.121,palette.propeller,0.54,width*0.079);
  trim.add(surface([[0,-0.178,0.077],[0,-0.259,0.108],[0,-0.256,0.178],[0,-0.183,0.206]],[0,1,2,0,2,3]),palette.engine,0.33);
  if (small) {
    const gripStart = [tillerGrip.x,tillerGrip.y,tillerGrip.z+0.085];
    const gripEnd = [tillerGrip.x,tillerGrip.y,tillerGrip.z-0.075];
    const pivot = [0.072,center-0.016,-0.028];
    const elbow = [0.128,0.505,-0.402];
    cylinder(trim,[0.020,pivot[1],pivot[2]],[0.123,pivot[1],pivot[2]],0.026,palette.engine,0.42);
    tube(trim,[pivot,elbow,gripStart],0.016,palette.metal,0.43);
    cylinder(trim,gripStart,gripEnd,0.021,palette.rubber,0.18);
    for (const offset of [0.070,0.049,0.028,0.007,-0.014,-0.035,-0.056]) {
      const ring = new THREE.TorusGeometry(0.021,0.0018,5,12);
      trim.add(ring,palette.engine,0.20,new THREE.Vector3(tillerGrip.x,tillerGrip.y,tillerGrip.z+offset));
    }
  }

  const mount = new THREE.Group();
  mount.name = small ? 'Tour outboard pivot' : 'Steerable outboard pivot';
  mount.add(trim.bake(material));
  const blades = batch();
  const radius = small ? 0.087 : 0.115;
  for (let i = 0; i < 3; i++) {
    const solid = surface([
      [0.009,0.020,0],[-radius*0.14,radius*0.63,-0.011],[0.014,radius,0.006],
      [radius*0.29,radius*0.83,0.015],[radius*0.30,radius*0.29,0.009],
    ],[0,1,2,0,2,3,0,3,4]);
    blades.add(solid,palette.propeller,0.60,new THREE.Vector3(),new THREE.Quaternion().setFromAxisAngle(Z,i*2*Math.PI/3));
  }
  cylinder(blades,[0,0,-0.016],[0,0,0.025],radius*0.28,palette.metal,0.62,radius*0.21);
  const prop = blades.bake(material);
  prop.position.set(0,-0.164,0.245);
  mount.add(prop);
  let lastTime = null;
  return {
    mount,
    update(time, throttle, steering, reverse) {
      mount.rotation.y = clamp(steering,-1,1)*0.36;
      const dt = lastTime === null ? 0 : clamp(time-lastTime,0,0.1);
      lastTime = time;
      const power = clamp(throttle,0,1);
      const motorSpeed = (8+power*104)*THREE.MathUtils.smoothstep(power,0,0.18);
      prop.rotation.z = (prop.rotation.z + dt*motorSpeed*(reverse ? -1 : 1))%(Math.PI*2);
    },
  };
}

export function buildMotorboat() {
  const mesh = new THREE.Group();
  mesh.name = 'Ivory river runabout';
  mesh.visible = false;
  const material = skinMaterial('River runabout fiberglass and fittings');
  const body = coachwork();
  const glass = batch();
  addWindshield(body,glass);
  mesh.add(body.bake(material),glass.bake(skinMaterial('Smoked marine windshield',true)));

  const console = batch();
  console.add(new THREE.TorusGeometry(wheelRadius,0.015,7,28),palette.rubber,0.31);
  for (let i = 0; i < 3; i++) {
    const angle = i*2*Math.PI/3 - 0.30;
    cylinder(console,[0,0,0],[Math.cos(angle)*0.129,Math.sin(angle)*0.129,0],0.007,
      palette.metal,0.54);
  }
  cylinder(console,[0,0,-0.012],[0,0,0.014],0.038,palette.rail,0.37);
  const wheel = console.bake(material);
  wheel.name = 'Helm wheel';
  wheel.position.set(...wheelCenter);
  wheel.rotateX(-0.18);
  mesh.add(wheel);

  const controls = batch();
  cylinder(controls,[0,-0.015,0],[0,0.102,-0.016],0.009,palette.metal,0.54);
  block(controls,[0.042,0.032,0.036],[0,0.108,-0.016],palette.rubber,0.28,0.008);
  const throttleHandle = controls.bake(material);
  throttleHandle.name = 'Helm throttle';
  throttleHandle.position.set(0.687,0.52,0.097);
  mesh.add(throttleHandle);

  const engine = trimAssembly(material,false);
  engine.mount.position.set(0,0,2.237);
  mesh.add(engine.mount);
  const grips = [Math.PI*0.79,Math.PI*0.21].map((angle) => new THREE.Vector3(
    Math.cos(angle)*wheelRadius,Math.sin(angle)*wheelRadius,0,
  ));
  const hands = grips.map(() => new THREE.Vector3());
  const driverAnchors = {
    hips: new THREE.Vector3(helmSeat[0],0.486,helmSeat[1]),
    heels: [new THREE.Vector3(0.231,0.197,-0.080),new THREE.Vector3(0.475,0.197,-0.055)],
    hands,
  };
  function update(timeSeconds, throttle = 0, steering = 0, reverse = false) {
    const power = clamp(throttle,0,1);
    const wheelAngle = clamp(steering,-1,1);
    wheel.rotation.z = -wheelAngle*1.19;
    wheel.updateMatrix();
    for (let i = 0; i < grips.length; i++) hands[i].copy(grips[i]).applyMatrix4(wheel.matrix);
    throttleHandle.rotation.x = power*0.67*(reverse ? 1 : -1);
    engine.update(timeSeconds,power,wheelAngle,reverse);
  }
  update(0);
  return { mesh, driverAnchors, getDriverHands: () => hands, update };
}

export function createTourMotor() {
  const mesh = new THREE.Group();
  mesh.name = 'Wooden boat auxiliary motor';
  const material = skinMaterial('Auxiliary outboard fittings');
  const bracket = batch();
  block(bracket,[0.19,0.203,0.057],[0,0.337,2.269],palette.engine,0.41,0.013);
  for (const x of [-0.060,0.060]) {
    cylinder(bracket,[x,0.403,2.195],[x,0.403,2.294],0.013,palette.metal,0.58);
  }
  mesh.add(bracket.bake(material));
  const engine = trimAssembly(material,true);
  engine.mount.position.set(0,0,2.357);
  mesh.add(engine.mount);
  const hands = [new THREE.Vector3(-0.487,0.427,1.57),new THREE.Vector3()];
  const driverAnchors = {
    hips: new THREE.Vector3(-0.17,0.439,1.88),
    heels: [new THREE.Vector3(-0.252,0.091,1.485),new THREE.Vector3(-0.062,0.091,1.44)],
    hands,
  };
  function update(timeSeconds, throttle = 0, steering = 0, reverse = false) {
    engine.update(timeSeconds,throttle,steering,reverse);
    engine.mount.updateMatrix();
    hands[1].copy(tillerGrip).applyMatrix4(engine.mount.matrix);
  }
  update(0);
  return { mesh, driverAnchors, getDriverHands: () => hands, update };
}

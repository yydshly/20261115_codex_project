import * as THREE from 'three';
import { atmosphere, noise } from './shaders.js';

export const FLIGHT_COCKPIT_LAYER = 4;

const clamp = THREE.MathUtils.clamp;
const up = new THREE.Vector3(0,1,0);
const graphite = '#3d4644';
const leather = '#565d58';
const lining = '#92998d';
const paint = '#b4b9aa';
const dialRing = '#222e2c';
const marking = '#dddaca';
const panelDepth = -0.967;
const instrumentRow = 0.026;
const instrumentCenter = -0.176;

const bodyVertex = /* glsl */ `
attribute vec3 aTint;
attribute float aFinish;
varying vec3 vTint;
varying float vFinish;
varying vec3 vLocal;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vTint = aTint;
  vFinish = aFinish;
  vLocal = position;
  vWorld = (modelMatrix*vec4(position,1.0)).xyz;
  vNormal = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
`;

const bodyFragment = /* glsl */ `
varying vec3 vTint;
varying float vFinish;
varying vec3 vLocal;
varying vec3 vWorld;
varying vec3 vNormal;
${noise}
${atmosphere}

void main() {
  vec3 n = normalize(vNormal);
  vec3 eye = normalize(cameraPosition-vWorld);
  vec2 fabric = vec2(vLocal.x+vLocal.z*0.73,vLocal.y+vLocal.z*0.52)*94.0;
  float coverage = 1.0-smoothstep(0.57,1.95,length(fwidth(fabric)));
  float grain = (noise2(fabric)-0.5)*coverage;
  float softTrim = smoothstep(0.0,0.67,vFinish);
  float skylight = 0.49+0.35*(n.y*0.5+0.5);
  float fromWindow = 0.28*max(0.0,dot(n,sunDirection))*cloudTransmission(vWorld.xz);
  float footwell = smoothstep(-0.37,0.13,vLocal.y);
  vec3 light = skylight*(0.71+0.29*footwell)*cloudDiffuseTint+fromWindow*cloudKeyTint;
  float glint = pow(max(0.0,dot(n,normalize(eye+sunDirection))),18.0);
  vec3 color = vTint*(light + grain*mix(0.022,0.085,softTrim));
  color += vec3(0.026,0.031,0.032)*glint*(1.0-softTrim*0.82);
  gl_FragColor = vec4(color,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const glassVertex = /* glsl */ `
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vUV = uv;
  vNormal = normalize(mat3(modelMatrix)*normal);
  vWorld = (modelMatrix*vec4(position,1.0)).xyz;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
`;

const glassFragment = /* glsl */ `
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorld;
${atmosphere}

void main() {
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 view = normalize(cameraPosition-vWorld);
  vec3 reflection = reflect(-view,n);
  float facing = clamp(dot(n,view),0.0,1.0);
  float rim = pow(1.0-facing,2.7);
  float wash = smoothstep(-0.12,0.77,reflection.y);
  float scatter = 0.009*pow(max(0.0,dot(reflection,sunDirection)),7.0);
  float edge = 1.0-smoothstep(0.0,0.055,min(vUV.x,1.0-vUV.x));
  vec3 tint = mix(vec3(0.21,0.27,0.25),horizonLight*0.70,wash);
  gl_FragColor = vec4(tint,0.012 + rim*0.085 + scatter + edge*0.029);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const attitudeFragment = /* glsl */ `
uniform float uRoll;
uniform float uPitch;
varying vec2 vUV;

float ink(float distanceToLine, float width) {
  return 1.0-smoothstep(width,width+max(fwidth(distanceToLine),0.012),abs(distanceToLine));
}

void main() {
  vec2 point = vUV*2.0-1.0;
  float s = sin(uRoll);
  float c = cos(uRoll);
  vec2 local = vec2(c*point.x-s*point.y,s*point.x+c*point.y);
  float horizon = local.y + clamp(uPitch*3.1,-0.76,0.76);
  vec3 ground = vec3(0.24,0.19,0.14);
  vec3 sky = vec3(0.18,0.33,0.37);
  vec3 color = mix(ground,sky,smoothstep(-0.01,0.01,horizon));
  float ladder = max(ink(horizon-0.22,0.016),ink(horizon+0.22,0.016))*(1.0-smoothstep(0.25,0.33,abs(local.x)));
  float farLadder = max(ink(horizon-0.45,0.013),ink(horizon+0.45,0.013))*(1.0-smoothstep(0.14,0.22,abs(local.x)));
  color = mix(color,vec3(0.59,0.61,0.55),max(ink(horizon,0.025),max(ladder,farLadder)));
  float airframeMark = ink(point.y+0.026,0.025)*smoothstep(0.13,0.18,abs(point.x))*(1.0-smoothstep(0.48,0.56,abs(point.x)));
  airframeMark = max(airframeMark,1.0-smoothstep(0.057,0.079,length(point+vec2(0.0,0.026))));
  color = mix(color,vec3(0.88,0.63,0.29),airframeMark);
  float bezel = smoothstep(0.85,0.97,length(point));
  color *= 1.0-0.72*bezel;
  gl_FragColor = vec4(color,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function materialBatch() {
  const positions = [];
  const normals = [];
  const tints = [];
  const finishes = [];
  const elements = [];
  const transform = new THREE.Matrix4();
  const normalTransform = new THREE.Matrix3();
  const identity = new THREE.Quaternion();
  const unit = new THREE.Vector3(1,1,1);
  const sample = new THREE.Vector3();
  const pigment = new THREE.Color();
  return {
    add(geometry,color,center = [0,0,0],rotation = identity,finish = 0) {
      const vertex = geometry.getAttribute('position');
      const normal = geometry.getAttribute('normal');
      const first = positions.length/3;
      transform.compose(sample.fromArray(center),rotation,unit);
      normalTransform.getNormalMatrix(transform);
      pigment.set(color);
      for (let i = 0; i < vertex.count; i++) {
        sample.fromBufferAttribute(vertex,i).applyMatrix4(transform);
        positions.push(sample.x,sample.y,sample.z);
        sample.fromBufferAttribute(normal,i).applyNormalMatrix(normalTransform);
        normals.push(sample.x,sample.y,sample.z);
        tints.push(pigment.r,pigment.g,pigment.b);
        finishes.push(finish);
      }
      for (let i = 0; i < (geometry.index?.count ?? vertex.count); i++) elements.push(first+(geometry.index?.getX(i) ?? i));
      geometry.dispose();
    },
    mesh(material) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      geometry.setAttribute('aTint',new THREE.Float32BufferAttribute(tints,3));
      geometry.setAttribute('aFinish',new THREE.Float32BufferAttribute(finishes,1));
      geometry.setIndex(elements);
      return new THREE.Mesh(geometry,material);
    },
  };
}

function turn(axis, angle) {
  return new THREE.Quaternion().setFromAxisAngle(axis,angle);
}

function paddedBox(width, height, depth, corner) {
  const x = width*0.5-corner;
  const y = height*0.5-corner;
  const shape = new THREE.Shape();
  shape.moveTo(-x,-y);
  shape.lineTo(x,-y);
  shape.lineTo(x,y);
  shape.lineTo(-x,y);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape,{
    depth: depth-2*corner, bevelEnabled: true, bevelSegments: 2, bevelSize: corner,
    bevelThickness: corner, curveSegments: 3,
  }).translate(0,0,-depth*0.5+corner);
}

function strut(batch,a,b,radius,color) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const rotation = new THREE.Quaternion().setFromUnitVectors(up,direction.divideScalar(length));
  batch.add(new THREE.CylinderGeometry(radius,radius,length,8),color,start.lerp(end,0.5).toArray(),rotation);
}

function glassPane(corners, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(corners.flat(),3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
  geometry.setIndex([0,1,2,0,2,3]);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry,material);
  mesh.renderOrder = 8;
  return mesh;
}

function cowling() {
  const positions = [];
  const indices = [];
  const stations = [
    [-1.143,0.431,0.065,0.066], [-1.308,0.370,-0.008,0.112],
    [-1.476,0.281,-0.028,0.093], [-1.624,0.212,-0.045,0.077],
    [-1.748,0.121,-0.059,0.066], [-1.819,0.061,-0.067,0.046],
  ];
  const columns = 15;
  for (const [row,[z,width,base,arc]] of stations.entries()) {
    for (let i = 0; i < columns; i++) {
      const angle = Math.PI*i/(columns-1);
      positions.push(width*Math.cos(angle),base+arc*Math.sin(angle),z);
      if (row === stations.length-1 || i === columns-1) continue;
      const n = row*columns+i;
      indices.push(n,n+columns,n+1,n+1,n+columns,n+columns+1);
    }
  }
  for (const side of [1,-1]) {
    const baseIndex = positions.length/3;
    const edge = side > 0 ? 0 : columns-1;
    for (const [row,[z,width,base]] of stations.entries()) {
      positions.push(width*side,base-0.148,z);
      if (row === stations.length-1) continue;
      const top = row*columns+edge;
      const bottom = baseIndex+row;
      if (side > 0) indices.push(top,bottom,top+columns,top+columns,bottom,bottom+1);
      else indices.push(top,top+columns,bottom,top+columns,bottom+1,bottom);
    }
  }
  const cover = positions.length/3;
  const [back,halfWidth,backHeight] = stations[0];
  for (let i = 0; i < columns; i++) {
    positions.push(halfWidth*Math.cos(Math.PI*i/(columns-1)),backHeight-0.148,back);
    if (i < columns-1) indices.push(i,i+1,cover+i,i+1,cover+i+1,cover+i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildCabin(material, mesh) {
  const shell = materialBatch();
  const glazing = new THREE.ShaderMaterial({ vertexShader: glassVertex, fragmentShader: glassFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true });
  const foreBottom = (side) => [side*0.456,0.108,-1.215];
  const foreTop = (side) => [side*0.353,0.582,-0.745];
  const rearBottom = (side) => [side*0.481,0.095,0.285];
  const rearTop = (side) => [side*0.371,0.572,0.285];
  mesh.add(glassPane([foreBottom(-1),foreBottom(1),foreTop(1),foreTop(-1)],glazing));
  shell.add(paddedBox(0.937,0.255,0.074,0.012),graphite,[0,-0.031,-1.014],undefined,0.92);
  shell.add(paddedBox(0.949,0.044,0.192,0.019),leather,[0,0.102,-1.042],undefined,1);
  shell.add(paddedBox(0.925,0.241,0.088,0.021),'#373f39',[0,-0.237,-1.018],undefined,1);
  shell.add(paddedBox(0.923,0.059,1.20,0.021),'#454c47',[0,-0.319,-0.39],undefined,1);
  shell.add(paddedBox(0.771,0.053,1.025,0.018),lining,[0,0.598,-0.232],undefined,1);
  shell.add(cowling(),paint);
  for (const x of [-0.328,-0.092,0.117,0.353]) {
    strut(shell,[x,-0.299,-0.915],[x,-0.231,-0.971],0.008,graphite);
    shell.add(paddedBox(0.072,0.052,0.019,0.008),leather,[x,-0.233,-0.951],turn(new THREE.Vector3(1,0,0),0.41),1);
  }
  strut(shell,foreTop(-1),foreTop(1),0.015,graphite);
  strut(shell,[0.027,0.109,-1.22],[0.017,0.581,-0.74],0.0084,lining);
  for (const side of [-1,1]) {
    const foreLow = foreBottom(side);
    const foreHigh = foreTop(side);
    const rearLow = rearBottom(side);
    const rearHigh = rearTop(side);
    mesh.add(glassPane([foreLow,rearLow,rearHigh,foreHigh],glazing));
    strut(shell,foreLow,foreHigh,0.0175,lining);
    strut(shell,foreHigh,rearHigh,0.0135,graphite);
    strut(shell,foreLow,rearLow,0.018,lining);
    strut(shell,rearLow,rearHigh,0.018,lining);
    strut(shell,[side*0.481,-0.324,-0.26],[side*2.29,0.683,-0.61],0.034,paint);
    shell.add(paddedBox(2.70,0.072,1.55,0.032),'#aeb4a9',[side*1.706,0.711,-0.392],undefined,1);
    shell.add(paddedBox(0.047,0.394,1.434,0.018),lining,[side*0.454,-0.104,-0.448],undefined,1);
    shell.add(paddedBox(0.365,0.083,0.385,0.023),leather,[side*0.220,-0.238,-0.108],undefined,1);
    shell.add(paddedBox(0.364,0.432,0.090,0.026),graphite,[side*0.220,-0.014,0.109],
      turn(new THREE.Vector3(1,0,0),0.15),1);
    shell.add(paddedBox(0.207,0.145,0.075,0.022),leather,[side*0.220,0.254,0.164],undefined,1);
  }
  mesh.add(shell.mesh(material));
}

function createCanvas(width,height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { ctx: canvas.getContext('2d'),texture };
}

const firstMark = -2.35;
const lastMark = 2.35;
const gaugeAngle = (u) => THREE.MathUtils.lerp(firstMark,lastMark,u);

function drawDial(ctx, center, label, unit, min, max, step, normalArc) {
  const origin = 128;
  ctx.fillStyle = '#151e1e';
  ctx.fillRect(center-origin,0,256,256);
  const ray = (angle, radius) => [center+Math.sin(angle)*radius,origin-Math.cos(angle)*radius];
  ctx.strokeStyle = normalArc ? '#849b83' : '#7e9690';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(center,origin,111,gaugeAngle(0.17)-Math.PI*0.5,gaugeAngle(normalArc ? 0.81 : 0.93)-Math.PI*0.5);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const divisions = Math.round((max-min)/step)*4;
  for (let i = 0; i <= divisions; i++) {
    const angle = gaugeAngle(i/divisions);
    const large = i%4 === 0;
    ctx.strokeStyle = large ? marking : '#a0aaa4';
    ctx.lineWidth = large ? 3.7 : 2.1;
    ctx.beginPath();
    ctx.moveTo(...ray(angle,103));
    ctx.lineTo(...ray(angle,large ? 86 : 94));
    ctx.stroke();
    if (large) {
      ctx.fillStyle = marking;
      ctx.font = '600 21px Arial, sans-serif';
      ctx.fillText(String(min + i*(max-min)/divisions),...ray(angle,69));
    }
  }
  ctx.fillStyle = '#b7c7ba';
  ctx.font = '600 23px "Microsoft YaHei", sans-serif';
  ctx.fillText(label,center,171);
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText(unit,center,194);
}

function dialFaces() {
  const { ctx,texture } = createCanvas(512,256);
  drawDial(ctx,128,'航速','km/h',60,240,30,true);
  drawDial(ctx,384,'离地','m',0,300,50,false);
  return new THREE.MeshBasicMaterial({ map: texture });
}

function needle(radius) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.0038,-radius*0.21);
  shape.lineTo(0.0038,-radius*0.21);
  shape.lineTo(0.0027,radius*0.78);
  shape.lineTo(0,radius*0.925);
  shape.lineTo(-0.0027,radius*0.78);
  shape.closePath();
  return new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({ color: '#e2cba6' }));
}

function addGauge(batch, mesh, faceMaterial, x, radius, cell) {
  batch.add(new THREE.TorusGeometry(radius,0.0041,8,40),dialRing,[x,instrumentRow,panelDepth]);
  const disc = new THREE.CircleGeometry(radius,40);
  const uv = disc.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setX(i,(uv.getX(i)+cell)*0.5);
  const scale = new THREE.Mesh(disc,faceMaterial);
  scale.position.set(x,instrumentRow,panelDepth+0.0009);
  const pointer = needle(radius);
  pointer.position.set(x,instrumentRow,panelDepth+0.0044);
  mesh.add(scale,pointer);
  const spindle = new THREE.Mesh(new THREE.CircleGeometry(0.0058,12),new THREE.MeshBasicMaterial({ color: '#777c71' }));
  spindle.position.set(x,instrumentRow,panelDepth+0.0052);
  mesh.add(spindle);
  return pointer;
}

function headingDisplay(group) {
  const { ctx,texture } = createCanvas(256,64);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.123,0.032),new THREE.MeshBasicMaterial({ map: texture }));
  display.position.set(instrumentCenter,-0.057,panelDepth+0.004);
  display.name = 'Cockpit heading display';
  group.add(display);
  let previous = -1;
  return (yaw) => {
    const rounded = Math.round(THREE.MathUtils.radToDeg(yaw));
    const heading = THREE.MathUtils.euclideanModulo(rounded,360);
    if (heading === previous) return;
    previous = heading;
    ctx.fillStyle = '#1b2524';
    ctx.fillRect(0,0,256,64);
    ctx.strokeStyle = '#4f6055';
    ctx.lineWidth = 2;
    ctx.strokeRect(2,2,252,60);
    ctx.fillStyle = '#8fa79b';
    ctx.font = '600 27px "Microsoft YaHei", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('航向',16,34);
    ctx.font = '600 40px Consolas, monospace';
    ctx.fillStyle = '#c3d8c1';
    ctx.fillText(String(heading).padStart(3,'0')+'°',121,34);
    texture.needsUpdate = true;
  };
}

function buildYoke(material) {
  const batch = materialBatch();
  strut(batch,[0,-0.019,-0.161],[0,0.0,-0.002],0.018,graphite);
  for (const side of [-1,1]) {
    strut(batch,[side*0.020,0.003,0],[side*0.104,-0.016,0],0.018,graphite);
    const grip = paddedBox(0.043,0.091,0.041,0.017);
    batch.add(grip,leather,[side*0.108,0.022,0],turn(new THREE.Vector3(0,0,1),side*0.22),1);
  }
  batch.add(paddedBox(0.095,0.050,0.027,0.010),graphite,[0,0.004,0.003],undefined,1);
  batch.add(new THREE.SphereGeometry(0.0082,8,6),'#b09883',[-0.106,0.065,0.007]);
  const yoke = batch.mesh(material);
  yoke.position.set(-0.210,-0.114,-0.804);
  return yoke;
}

export function buildFlightCockpit() {
  const mesh = new THREE.Group();
  mesh.name = 'Sightseeing aircraft cockpit';
  mesh.visible = false;
  const eye = new THREE.Vector3(-0.205,0.385,-0.25);
  const material = new THREE.ShaderMaterial({ vertexShader: bodyVertex, fragmentShader: bodyFragment });
  buildCabin(material,mesh);
  const panel = materialBatch();
  const faceMaterial = dialFaces();
  const speedNeedle = addGauge(panel,mesh,faceMaterial,instrumentCenter-0.134,0.054,0);
  const altitudeNeedle = addGauge(panel,mesh,faceMaterial,instrumentCenter+0.132,0.054,1);
  speedNeedle.name = 'Cockpit airspeed needle';
  altitudeNeedle.name = 'Cockpit height needle';
  const attitude = { uRoll: { value: 0 }, uPitch: { value: 0 } };
  panel.add(new THREE.TorusGeometry(0.0581,0.0043,8,40),dialRing,[instrumentCenter,instrumentRow,panelDepth]);
  const horizon = new THREE.Mesh(new THREE.CircleGeometry(0.0581,52),new THREE.ShaderMaterial({
    vertexShader: glassVertex, fragmentShader: attitudeFragment, uniforms: attitude,
  }));
  horizon.position.set(instrumentCenter,instrumentRow,panelDepth+0.002);
  horizon.name = 'Cockpit artificial horizon';
  mesh.add(horizon);
  const setHeading = headingDisplay(mesh);
  panel.add(paddedBox(0.192,0.089,0.020,0.009),'#242f2e',[0.203,0.036,panelDepth],undefined,1);
  for (let i = 0; i < 3; i++) {
    const y = 0.009+i*0.024;
    panel.add(new THREE.BoxGeometry(0.096,0.004,0.003),'#46584c',[0.179,y,panelDepth+0.013]);
    panel.add(new THREE.SphereGeometry(0.0108,10,8),leather,[0.267,y,panelDepth+0.015],undefined,1);
  }
  for (const [i,x] of [-0.314,-0.280,-0.071,-0.040,0.039,0.074].entries()) {
    const base = [x,-0.064,panelDepth+0.007];
    strut(panel,base,[x,-0.056,panelDepth+0.020],0.0048,i === 4 ? '#9b7058' : lining);
  }
  mesh.add(panel.mesh(material));
  const yoke = buildYoke(material);
  mesh.add(yoke);
  mesh.traverse((object) => object.layers.set(FLIGHT_COCKPIT_LAYER));

  const update = ({ speed,altitude,yaw,pitch,roll }) => {
    speedNeedle.rotation.z = -gaugeAngle(clamp((speed*3.6-60)/180,0,1));
    altitudeNeedle.rotation.z = -gaugeAngle(clamp(altitude/300,0,1));
    attitude.uRoll.value = roll;
    attitude.uPitch.value = pitch;
    setHeading(yaw);
    yoke.rotation.z = -roll*0.52;
    yoke.position.z = -0.804+clamp(pitch,-0.45,0.44)*0.105;
  };
  update({ speed: 0,altitude: 0,yaw: 0,pitch: 0,roll: 0 });
  return { mesh,eye,update };
}

import * as THREE from 'three';
import { atmosphere, landscapeVertex, noise } from './shaders.js';
import { rng } from './river-layout.js';

const leafForms = [
  { width: 0.43, pointed: 0.76, veins: 6, tooth: 0.024 },
  { width: 0.24, pointed: 0.80, veins: 9, tooth: 0.044 },
  { width: 0.50, pointed: 0.60, veins: 5, tooth: 0.050 },
  { width: 0.35, pointed: 0.63, veins: 7, tooth: 0.032 },
];

function paintLeaf(ctx, x, y, angle, length, tone, form, random) {
  const half = length*form.width*(0.42+random()*0.13);
  const curve = length*(random()-0.5)*0.16;
  const twist = 0.11+random()*0.22;
  const rib = (u) => curve*u*u;
  const contour = (u) => Math.sin(Math.PI*u)**form.pointed * (1.15 - 0.37*u);
  const outline = (u, side) => {
    const serration = 1.0 + form.tooth*Math.sin(u*Math.PI*26+side*0.8);
    return rib(u)+half*side*contour(u)*serration*(1+side*twist*0.32);
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const chlorophyll = Math.floor(108 + random()*115);
  const wear = Math.floor(39 + random()**2*153);
  const pigment = ctx.createLinearGradient(0, -half, length*0.16, half);
  pigment.addColorStop(0, `rgb(${tone - 38},${chlorophyll-4},${wear})`);
  pigment.addColorStop(0.42, `rgb(${tone + 20},${chlorophyll+19},${wear-12})`);
  pigment.addColorStop(0.58, `rgb(${tone + 5},${chlorophyll + 8},${wear})`);
  pigment.addColorStop(1, `rgb(${tone - 48},${chlorophyll - 32},${wear + 22})`);
  ctx.fillStyle = pigment;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (const side of [-1,1]) {
    for (let i = 0; i <= 16; i++) {
      const u = side < 0 ? i/16 : 1-i/16;
      ctx.lineTo(u*length, outline(u, side));
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = `rgba(${tone+48},${chlorophyll},${wear+18},0.48)`;
  ctx.lineWidth = Math.max(0.48,length*0.021);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length*0.5, 0, length, curve);
  ctx.stroke();
  ctx.strokeStyle = `rgba(${tone+27},${chlorophyll+7},${wear+13},0.29)`;
  ctx.lineWidth = 0.48;
  ctx.beginPath();
  for (let i = 0; i < form.veins; i++) {
    const u = 0.17 + i*0.65/form.veins;
    const end = 0.15 + u*0.81;
    for (const side of [-1,1]) {
      ctx.moveTo(u*length, rib(u));
      ctx.quadraticCurveTo((end-0.036)*length, outline(end,side)*0.63, end*length, outline(end,side)*0.87);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function paintSpray(ctx, random, variant) {
  const form = leafForms[variant];
  const stem = (u) => [36 + 170*u + 16*Math.sin(u*2.6), 223 - 178*u + 28*u*(1-u)];
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#817158';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(...stem(0));
  ctx.quadraticCurveTo(119, 146, ...stem(1));
  ctx.stroke();

  for (let twig = 0; twig < 8; twig++) {
    const along = 0.14 + twig * 0.109;
    const side = twig % 2 ? 1 : -1;
    const [startX, startY] = stem(along);
    const angle = -0.82 + side * (0.86 + random() * 0.51);
    const reach = (75 - 34 * along) * (0.61+random()*0.66);
    const dx = Math.cos(angle) * reach;
    const dy = Math.sin(angle) * reach;
    ctx.strokeStyle = '#967c56';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(startX + dx * 0.57, startY + dy * 0.31, startX + dx, startY + dy);
    ctx.stroke();
    const shootPoint = [
      startX + dx * (0.95 + random() * 0.08),
      startY + dy * (0.95 + random() * 0.08),
    ];
    for (let leaf = 0; leaf < (variant === 1 ? 11 : 8); leaf++) {
      const u = 0.12 + 0.077 * leaf + random() * 0.06;
      const branchSide = leaf % 2 ? 1 : -1;
      const size = ((variant === 1) ? 37 : 31) * (1 - 0.25*u) * (0.62 + random()*0.80);
      const spread = 0.31 + random()*1.10;
      const leafAngle = angle + branchSide * spread;
      const px = startX + dx * (1.14 * u - 0.14 * u * u);
      const py = startY + dy * (0.62 * u + 0.38 * u * u);
      paintLeaf(ctx,px,py,leafAngle,size,128+Math.floor(86*random()),form,random);
    }
    paintLeaf(ctx,shootPoint[0],shootPoint[1],angle-0.13,26,206,form,random);
  }
}

function createSprays() {
  const canvas = document.createElement('canvas');
  const cellSize = 256;
  canvas.width = 2*cellSize;
  canvas.height = 2*cellSize;
  const ctx = canvas.getContext('2d');
  const random = rng(5301981);
  for (let cell = 0; cell < 4; cell++) {
    const x = (cell % 2) * cellSize;
    const y = Math.floor(cell / 2) * cellSize;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.rect(6,6,cellSize-12,cellSize-12);
    ctx.clip();
    paintSpray(ctx, random, cell);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  // Mip levels retain reflectance at blade edges when the atlas is filtered.
  texture.premultiplyAlpha = true;
  texture.anisotropy = 4;
  return texture;
}

const leafVertex = /* glsl */ `
attribute float exposure;
varying vec2 vLeafUV;
varying float vExposure;
#ifdef LEAF_GEOMETRY
  attribute float leafTint;
  varying float vLeafTint;
#endif
#define main placeCanopyVertex
${landscapeVertex}
#undef main
void main() {
  placeCanopyVertex();
  vLeafUV = uv;
  vExposure = exposure;
  #ifdef LEAF_GEOMETRY
    vLeafTint = leafTint;
  #endif
}
`;

const leafLighting = /* glsl */ `
varying vec2 vLeafUV;
varying float vExposure;
varying vec3 vWorld;
varying vec3 vNormalWorld;
varying vec3 vTint;
${atmosphere}

vec3 foliageLight(vec3 albedo, vec3 n, float membrane, float wax) {
  vec3 eye = cameraPosition-vWorld;
  float range = length(eye);
  vec3 view = eye/max(0.001,range);
  float light = dot(n,sunDirection);
  float crown = smoothstep(0.17,0.94,vExposure);
  float sky = n.y*0.5+0.5;
  vec3 indirect = mix(vec3(0.70,0.76,0.70),cloudDiffuseTint,sky);
  indirect *= mix(0.44,0.84,crown);
  vec3 direct = cloudKeyTint*mix(0.10,0.51,crown)*smoothstep(-0.27,1.0,light)*cloudTransmission(vWorld.xz);
  vec3 scatter = vec3(0.97,1.09,0.43)*mix(0.23,0.57,crown)*membrane*smoothstep(-0.19,1.0,-light);
  float broadHighlight = pow(max(0.0,dot(n,normalize(view+sunDirection))),mix(9.0,22.0,wax));
  float grazing = pow(1.0-max(0.0,dot(n,view)),2.0);
  vec3 skyGleam = vec3(0.27,0.34,0.36)*wax*(0.045+0.09*crown)*
    (0.68*broadHighlight+sky*grazing*0.32);
  float standDistance = smoothstep(38.0,180.0,range);
  vec3 pigment = mix(albedo,vec3(dot(albedo,vec3(0.2126,0.7152,0.0722))),0.15+0.10*standDistance);
  pigment *= 1.0-0.19*standDistance;
  return aerialPerspective(pigment*(indirect+direct+scatter)+skyGleam,vWorld,range);
}
`;

const leafFragment = /* glsl */ `
uniform sampler2D uSprays;
${leafLighting}

void main() {
  vec4 spray = texture2D(uSprays, vLeafUV);
  float footprint = max(length(dFdx(vLeafUV)), length(dFdy(vLeafUV)));
  float cutoff = mix(0.49,0.22,smoothstep(0.005,0.045,footprint));
  if (spray.a < cutoff) discard;
  vec3 blade = spray.rgb/max(spray.a,0.18);
  vec3 n = normalize(vNormalWorld)*(gl_FrontFacing ? 1.0 : -1.0);
  // A card's orientation represents a cluster of leaves with mixed orientations.
  n = normalize(mix(n,vec3(0.0,1.0,0.0),0.27));
  float dry = smoothstep(0.49,0.83,blade.b);
  vec3 pigment = vTint*(0.63+blade.r*0.65);
  pigment *= mix(vec3(0.91,1.06,0.91),vec3(1.27,0.89,0.53),dry*0.58);
  vec3 color = foliageLight(pigment,n,0.41+blade.g*0.59,0.21+blade.g*0.12);
  gl_FragColor = vec4(color,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const bladeFragment = /* glsl */ `
varying float vLeafTint;
${noise}
${leafLighting}

void main() {
  vec2 blade = vLeafUV;
  float lateral = abs(blade.y-0.5)*2.0;
  float veinPhase = (blade.x-lateral*0.13-lateral*lateral*0.04)*mix(7.0,10.5,vLeafTint);
  float detail = 1.0-smoothstep(0.05,0.24,length(fwidth(blade)));
  float vein = 1.0-smoothstep(0.012,0.096+0.66*fwidth(veinPhase),abs(fract(veinPhase)-0.41));
  vein *= smoothstep(0.1,0.23,blade.x)*(1.0-smoothstep(0.66,0.99,lateral))*detail;
  float rib = 1.0-smoothstep(0.013,0.039+fwidth(lateral)*0.46,lateral);
  rib *= mix(0.87,0.12,smoothstep(0.08,0.93,blade.x))*detail;
  float inner = noise2(blade*vec2(8.0,4.6)+vec2(vLeafTint*37.0,3.41));
  float pores = noise2(blade*vec2(35.0,21.0)+vec2(7.14,vLeafTint*7.2))*detail;
  float spot = smoothstep(0.72,0.89,inner)*smoothstep(0.72,0.94,lateral)*(-0.18+0.42*vLeafTint);
  float fresh = smoothstep(0.38,0.95,vLeafTint);
  float wax = 0.38+0.32*inner;
  vec3 tint = vTint*mix(vec3(0.85,0.91,1.05),vec3(1.15,1.17,0.74),fresh);
  vec3 pigment = tint*(0.84+0.21*inner+pores*0.08+spot);
  pigment += tint*vec3(0.44,0.34,0.19)*(rib*0.59+vein*0.29);
  if (!gl_FrontFacing) {
    // Less wax and paler mesophyll are visible on the underside.
    pigment = 0.88*pigment + vec3(0.022,0.035,0.019);
    wax *= 0.33;
  }
  vec3 n = normalize(vNormalWorld)*(gl_FrontFacing ? 1.0 : -1.0);
  float membrane = (0.69+0.16*fresh+0.09*inner)*(1.0-rib*0.46);
  gl_FragColor = vec4(foliageLight(pigment,n,membrane,wax),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const barkVertex = /* glsl */ `
varying vec3 vBarkNormal;
#define main placeBarkVertex
${landscapeVertex}
#undef main
void main() {
  placeBarkVertex();
  vBarkNormal = normal;
}
`;

const barkFragment = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalWorld;
varying vec3 vLocal;
varying vec3 vTint;
varying vec3 vBarkNormal;
${noise}
${atmosphere}

vec3 barkPlate(vec2 q, float coarse, float detail) {
  // Fractures bend and close at different heights along each growth plate.
  float twist = noise2(q*vec2(0.31,0.19))-0.5;
  float grain = q.x+twist*0.95+0.12*sin(q.y*1.19+q.x*0.27);
  float across = min(fract(grain),1.0-fract(grain));
  float plate = floor(grain);
  float id = mix(grainHash(vec2(plate,13.2)),noise2(vec2(plate*0.78,q.y*0.21)),0.63);
  float seam = (1.0-smoothstep(0.015,0.12+id*0.09,across))*coarse;
  seam *= smoothstep(0.10,0.59,noise2(vec2(plate+q.x*0.47,q.y*0.66+id)));
  float scales = noise2(q*vec2(2.63,1.07)+vec2(id*11.0,3.7));
  float fiber = noise2(q*vec2(8.9,2.36)+vec2(6.7,5.2));
  float grainTone = 0.53+(id-0.5)*0.42*coarse+(scales-0.5)*0.27*detail;
  float relief = (scales-0.5)*0.019*detail - seam*0.029;
  return vec3(grainTone+(fiber-0.5)*0.097*detail, seam, relief);
}

vec3 barkRelief(vec3 normal, float relief) {
  vec3 dx = dFdx(vWorld);
  vec3 dy = dFdy(vWorld);
  vec3 tx = cross(dy,normal);
  vec3 ty = cross(normal,dx);
  float area = dot(dx,tx);
  vec3 bump = (tx*dFdx(relief)+ty*dFdy(relief))*sign(area);
  return normalize(normal - bump / max(0.00001,abs(area)));
}

void main() {
  vec3 n = normalize(vNormalWorld);
  float range = distance(cameraPosition,vWorld);
  vec3 grainPoint = vLocal*vec3(104.0,28.0,104.0);
  float footprint = length(fwidth(grainPoint));
  float coarse = 1.0-smoothstep(0.24,1.05,footprint);
  float detail = 1.0-smoothstep(0.11,0.61,footprint);
  vec2 weights = max(abs(vBarkNormal.zx),0.001);
  weights *= weights*weights;
  weights /= weights.x+weights.y;
  vec3 bark = mix(barkPlate(grainPoint.xy,coarse,detail),
    barkPlate(grainPoint.zy+vec2(19.6,7.23),coarse,detail), weights.y);
  vec3 reliefNormal = barkRelief(n,bark.z);
  vec2 barkPatch = vec2(vWorld.x*0.83+vWorld.z*1.31,vWorld.y*2.94+vWorld.z*0.22);
  float moisture = noise2(barkPatch*0.26) * (1.0-smoothstep(0.12,0.63,vLocal.y));
  float growth = noise2(barkPatch*3.1)+0.45*noise2(barkPatch*0.92+2.3);
  float moss = smoothstep(0.65,0.98,growth)*smoothstep(0.20,0.66,moisture);
  float lichen = smoothstep(1.01,1.24,growth)*coarse*(0.12+(1.0-moisture)*0.21);
  vec3 wood = mix(vec3(0.056,0.047,0.036),vec3(0.205,0.173,0.138),bark.x);
  wood *= 1.0-bark.y*0.37-moisture*0.15;
  wood = mix(wood,vec3(0.077,0.115,0.037),moss*0.74);
  wood = mix(wood,vec3(0.22,0.249,0.204),lichen);
  vec3 light = mix(vec3(0.56,0.53,0.46),vec3(0.77,0.85,0.93),n.y*0.5+0.5);
  light += cloudKeyTint*max(0.0,dot(reliefNormal,sunDirection))*0.45*cloudTransmission(vWorld.xz);
  gl_FragColor = vec4(aerialPerspective(wood*light,vWorld,range),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const grassFragment = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalWorld;
varying vec3 vLocal;
varying vec3 vTint;
${noise}
${atmosphere}

void main() {
  vec3 n = normalize(vNormalWorld) * (gl_FrontFacing ? 1.0 : -1.0);
  float light = dot(n, sunDirection);
  float tip = smoothstep(0.16, 0.91, vLocal.y);
  float membrane = noise2(vec2(vLocal.x * 54.0 + vLocal.z * 84.0, vLocal.y * 13.0));
  vec3 color = mix(vTint * vec3(0.65, 0.67, 0.58), vTint * vec3(1.12, 1.06, 0.82), tip);
  color *= cloudDiffuseTint*(0.66+max(-light,0.0)*0.21+membrane*0.20)
    + cloudKeyTint*(max(light,0.0)*0.49*cloudTransmission(vWorld.xz));
  gl_FragColor = vec4(aerialPerspective(color, vWorld, distance(cameraPosition, vWorld)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function makeFoliageMaterials() {
  return {
    leaves: new THREE.ShaderMaterial({
      vertexShader: leafVertex,
      fragmentShader: leafFragment,
      uniforms: { uSprays: { value: createSprays() } },
      side: THREE.DoubleSide,
    }),
    blades: new THREE.ShaderMaterial({
      defines: { LEAF_GEOMETRY: 1 },
      vertexShader: leafVertex,
      fragmentShader: bladeFragment,
      side: THREE.DoubleSide,
    }),
    bark: new THREE.ShaderMaterial({ vertexShader: barkVertex, fragmentShader: barkFragment }),
    grass: new THREE.ShaderMaterial({
      vertexShader: landscapeVertex,
      fragmentShader: grassFragment,
      side: THREE.DoubleSide,
    }),
  };
}

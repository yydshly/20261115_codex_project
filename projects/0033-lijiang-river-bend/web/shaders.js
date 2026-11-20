export const noise = /* glsl */ `
float grainHash(vec2 p) {
  vec3 a = fract(vec3(p.xyx) * 0.1031);
  a += dot(a, a.yzx + 33.33);
  return fract((a.x + a.y) * a.z);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(grainHash(i), grainHash(i + vec2(1,0)), u.x),
             mix(grainHash(i + vec2(0,1)), grainHash(i + 1.0), u.x), u.y);
}

float fbm(vec2 p) {
  mat2 rotateOctave = mat2(0.8, 0.6, -0.6, 0.8);
  float sum = noise2(p)*0.53;
  p = rotateOctave*p*2.07 + 11.2;
  sum += noise2(p)*0.26;
  p = rotateOctave*p*2.11 + 7.8;
  sum += noise2(p)*0.13;
  p = rotateOctave*p*2.17 + 9.1;
  return sum + noise2(p)*0.08;
}
`;

export const sunPosition = [-0.44, 0.65, -0.46];
export const mistRadiance = [0.637,0.723,0.740];
export const atmosphere = /* glsl */ `
const vec3 sunDirection = normalize(vec3(${sunPosition.join(', ')}));
const vec3 horizonLight = vec3(0.604,0.700,0.772);
const vec3 mistLight = vec3(${mistRadiance.join(', ')});
const vec3 cloudDiffuseTint = vec3(0.86,0.946,1.055);
const vec3 cloudKeyTint = vec3(1.00,0.952,0.866);

float cloudTransmission(vec2 p) {
  // Broad areas of cloud attenuation in world space, shared by both cameras.
  float cover = sin(dot(p,vec2(0.0067,0.0038))+1.4) * sin(dot(p,vec2(-0.0029,0.0076))-0.8);
  return 0.78+0.16*cover+0.06*sin(dot(p,vec2(0.0016,-0.0041))+0.6);
}

float layerMean(float from, float to, float scale) {
  float a = exp(-abs(from)/scale);
  float b = exp(-abs(to)/scale);
  float span = abs(to-from);
  if (span < 0.25) return (a+b)*0.5;
  // A below-water virtual camera unfolds the two air segments of a reflected ray.
  return scale*(from*to < 0.0 ? 2.0-a-b : abs(b-a))/span;
}

vec3 aerialPerspective(vec3 color, vec3 point, float distanceToEye) {
  float y = max(0.0,point.y);
  vec2 middle = mix(cameraPosition.xz,point.xz,0.59);
  float pooled = (0.78+0.23*sin(dot(middle,vec2(0.013,0.010))+0.8))
    * (0.82+0.18*cos(dot(middle,vec2(0.024,-0.006))));
  float mist = 0.00155*layerMean(cameraPosition.y,y,13.8)*pooled;
  float haze = 0.00036 + 0.00046*layerMean(cameraPosition.y,y,73.0);
  float farAir = max(0.0,distanceToEye-360.0)*0.00054;
  float opticalDepth = distanceToEye*(haze+mist)+farAir;
  vec3 transmittance = exp(-vec3(1.03,0.98,0.91)*opticalDepth);
  vec3 scattered = mix(horizonLight,mistLight,mist/(haze+mist));
  return mix(scattered,color,transmittance);
}
`;

export const landscapeVertex = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalWorld;
varying vec3 vLocal;
varying vec3 vTint;
#ifdef ROCK_OUTCROP
attribute float rockCoverage;
attribute float rockSeam;
attribute float rootFooting;
varying float vRockCoverage;
varying float vRockSeam;
varying float vRootFooting;
#endif

void main() {
  vec4 local = vec4(position, 1.0);
  vec3 n = normal;
  vTint = vec3(1.0);
  #ifdef USE_INSTANCING
    mat3 basis = mat3(instanceMatrix);
    n /= vec3(dot(basis[0], basis[0]), dot(basis[1], basis[1]), dot(basis[2], basis[2]));
    n = basis * n;
    local = instanceMatrix * local;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vTint = instanceColor;
  #endif
  vWorld = (modelMatrix * local).xyz;
  vNormalWorld = normalize(mat3(modelMatrix) * n);
  vLocal = position;
  #ifdef ROCK_OUTCROP
    vRockCoverage = rockCoverage;
  vRockSeam = rockSeam;
  vRootFooting = rootFooting;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * local;
}
`;

export const skyVertex = /* glsl */ `
varying vec3 vSky;
void main() {
  vSky = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const skyRadiance = /* glsl */ `
vec3 skyAlongRay(vec3 direction) {
  float solar = max(dot(direction, sunDirection), 0.0);
  vec3 sunGlow = cloudKeyTint*0.072*pow(solar,12.0);
  float cloudVisibility = smoothstep(-0.055,0.14,direction.y);
  if (cloudVisibility <= 0.0) return horizonLight+sunGlow;
  float y = max(direction.y, 0.0);
  vec3 daylight = mix(horizonLight,vec3(0.27,0.47,0.68),pow(y,0.62));
  vec2 cloudPlane = direction.xz/(0.16+y);
  vec2 cirro = mat2(0.92,-0.39,0.39,0.92)*cloudPlane;
  float highVeil = fbm(cirro*vec2(1.75,4.0)+vec2(0.5,2.8));
  vec2 sheet = cloudPlane*1.81+vec2(9.2,14.4)+(highVeil-0.5)*0.83;
  float uneven = fbm(sheet);
  float texture = fbm(sheet*2.70+vec2(uneven,highVeil)*0.74);
  const float cloudHeight = 640.0;
  vec2 cloudPosition = cameraPosition.xz+direction.xz*(cloudHeight-cameraPosition.y)/max(y,0.14);
  float localCloud = cloudTransmission(cloudPosition-sunDirection.xz*(cloudHeight/sunDirection.y));
  float density = uneven*0.67+texture*0.33+(0.78-localCloud)*0.30;
  float cloud = smoothstep(0.29,0.62,density);
  float translucent = smoothstep(0.32,0.56,highVeil);
  vec3 cloudLight = mix(vec3(0.62,0.691,0.74),vec3(0.94,0.955,0.952),
    0.45+0.13*translucent+0.28*pow(solar,4.0)-0.24*smoothstep(0.56,0.78,density));
  vec3 sky = mix(daylight,cloudLight,0.18+0.77*cloud);
  return mix(horizonLight,sky,cloudVisibility)+sunGlow;
}
`;

export const skyFragment = /* glsl */ `
varying vec3 vSky;
${noise}
${atmosphere}
${skyRadiance}

void main() {
  gl_FragColor = vec4(skyAlongRay(normalize(vSky-cameraPosition)),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

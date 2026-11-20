import { atmosphere, noise, skyRadiance } from './shaders.js';
import { shoreSediment } from './pebbles.js';
import { limestoneFragment } from './limestone.js';

export const terrainFragment = /* glsl */ `
uniform sampler2D uTerrainLight;
uniform vec4 uTerrainDomain;
varying vec3 vWorld;
varying vec3 vNormalWorld;
#ifdef ROCK_OUTCROP
varying float vRockCoverage;
varying float vRockSeam;
varying float vRootFooting;
#endif
${noise}
${atmosphere}
#ifdef DISTANT_TERRAIN
${skyRadiance}
#endif
${shoreSediment}
${limestoneFragment}

vec3 reliefNormal(vec3 n, float elevation) {
  vec3 tangent = dFdx(vWorld);
  vec3 bitangent = dFdy(vWorld);
  vec3 alongX = cross(bitangent, n);
  vec3 alongY = cross(n, tangent);
  float determinant = dot(tangent, alongX);
  vec3 slope = dFdx(elevation)*alongX + dFdy(elevation)*alongY;
  return normalize(max(abs(determinant), 0.000001)*n - sign(determinant)*slope);
}

float brokenJoint(vec2 plane) {
  vec2 cell = floor(plane);
  float seed = grainHash(cell+vec2(4.8,12.0));
  vec2 local = fract(plane)-0.5;
  float lengthOnRock = 0.17+0.28*seed;
  float start = (grainHash(cell-7.9)-0.5)*0.39;
  float slope = (grainHash(cell+23.4)-0.52)*1.22;
  float across = local.x-start-local.y*slope;
  float hairline = abs(across+0.043*min(0.0,local.y*3.0+0.11));
  float width = 0.011+0.018*seed;
  float aa = min(0.057,length(fwidth(plane))*0.39);
  return (1.0-smoothstep(width*0.36,width+aa,hairline))
    * (1.0-smoothstep(lengthOnRock*0.55,lengthOnRock,abs(local.y)))
    * smoothstep(0.16,0.62,seed);
}

float beddingSeam(float bed, float along) {
  float band = floor(bed);
  float fill = noise2(vec2(band*0.74,along*0.093)+0.83);
  float seam = abs(fract(bed)-0.46-(fill-0.5)*0.22);
  float aa = min(0.14,fwidth(bed)*0.36);
  return (1.0-smoothstep(0.014,0.062+aa,seam))*smoothstep(0.38,0.76,fill)
    *(1.0-smoothstep(0.28,0.82,fwidth(bed)));
}

vec3 shadeTerrain(float range) {
  vec2 p = vWorld.xz;
  float height = vWorld.y;
  vec3 normal = normalize(vNormalWorld);
  float footprint = length(fwidth(vWorld));
  float outcrop = 0.0;
  float incision = 0.0;
  #ifdef ROCK_OUTCROP
  outcrop = clamp(vRockCoverage,0.0,1.0);
  incision = clamp(vRockSeam,0.0,1.0);
  #endif
  vec2 lightUV = (vec2(p.x, -p.y) - uTerrainDomain.xy)/uTerrainDomain.zw;
  vec2 baked = texture2D(uTerrainLight, lightUV).rg;
  vec2 lightMargin = min(lightUV,1.0-lightUV);
  float lightCoverage = smoothstep(0.0,0.024,min(lightMargin.x,lightMargin.y));
  // The bake is horizontal. At a headwall the canopy footprint cannot be projected up the rock.
  float wall = 1.0-smoothstep(0.24,0.63,normal.y);
  float canopyShade = baked.y*(1.0-wall)*lightCoverage;
  float terrainShade = mix(1.0,baked.x,(1.0-0.94*wall)*lightCoverage);

  float country = fbm(p*0.081);
  float district = noise2(p*0.012+vec2(13.1,5.2));
  float weather = noise2(p*0.029+vec2(8.5,-11.2));
  float bedMeters = limestoneBed(vWorld,district);
  vec3 formation = vec3(dot(p,vec2(0.076,0.048)),bedMeters*0.064,dot(p,vec2(-0.047,0.075)));
  formation += vec3(country,district,weather)*0.53;
  float blocks = stoneVolume(formation);
  float ledgePatch = stoneVolume(formation*2.78+vec3(3.6,1.2,6.4));
  float rubblePatch = stoneVolume(formation*6.19+vec3(2.3,8.3,0.9));
  vec3 flakeField = vec3(formation.z+0.34*formation.y,formation.x-0.43*formation.y,formation.y)*19.2;
  float flakeCoherence = 1.0-smoothstep(0.31,1.18,length(fwidth(flakeField)));
  float flakes = flakeCoherence*(stoneVolume(flakeField+vec3(6.3,12.5,8.2))-0.5);
  float bed = bedMeters*0.72+(district-0.5)*3.1+0.48*ledgePatch;
  vec2 faceXZ = p+vec2(weather-0.5,district-0.5)*4.1;
  vec2 jointPlane = vec2(dot(faceXZ,vec2(0.36,0.23))+height*0.11,
    bedMeters*0.36+dot(faceXZ,vec2(-0.033,0.085)))+vec2(country*0.41,ledgePatch*0.28);
  float jointsVisible = (1.0-smoothstep(30.0,104.0,range))
    *(1.0-smoothstep(0.16,0.62,footprint));
  float hairline = brokenJoint(jointPlane)*smoothstep(0.36,0.75,ledgePatch)*jointsVisible;
  float alongBedding = dot(faceXZ,vec2(0.57,0.46));
  float bedding = beddingSeam(bed,alongBedding);
  float offsetBed = beddingSeam(bed*0.54+0.77,alongBedding-16.0);
  float shelves = (bedding*0.83+offsetBed*0.45)*smoothstep(0.26,0.64,blocks)*jointsVisible;
  float wash = blocks*0.53+ledgePatch*0.32+weather*0.15;
  // Mix the stains from two fracture directions after sampling each one.
  vec2 runoffA = vec2(dot(faceXZ,vec2(0.14,0.22))+height*0.028,
    bedMeters*0.074+dot(faceXZ,vec2(0.018,-0.023)));
  vec2 runoffB = vec2(dot(faceXZ,vec2(-0.17,0.105))-height*0.052,
    bedMeters*0.091+dot(faceXZ,vec2(0.043,0.017)))+5.63;
  float stainA = mix(noise2(runoffA),0.5,smoothstep(0.42,1.22,length(fwidth(runoffA))));
  float stainB = mix(noise2(runoffB),0.5,smoothstep(0.42,1.22,length(fwidth(runoffB))));
  float stains = mix(stainA,stainB,smoothstep(0.32,0.68,district));
  float runoff = smoothstep(0.51,0.78,stains*0.67+wash*0.33);

  float steepness = 1.0 - max(0.0,normal.y);
  vec2 scrubUV = vec2(dot(p,vec2(0.28,0.23)), height*0.29+dot(p,vec2(-0.14,0.16)));
  scrubUV += vec2(wash,country)*0.61;
  float scrub = noise2(scrubUV)*0.70 + noise2(scrubUV*2.48+3.45)*0.30;
  float pockets = smoothstep(0.25,0.69,scrub);
  float terraces = smoothstep(0.37,0.76,ledgePatch)*smoothstep(0.17,0.79,normal.y);
  float gully = smoothstep(0.44,0.72,runoff*0.49+country*0.51);
  float fissureHabitat = terraces*0.21+gully*(0.06+0.31*pockets)+canopyShade*0.24;
  float rockCover = steepness+(district-0.5)*0.54+(blocks-0.50)*0.41+(0.45-pockets)*0.21-fissureHabitat;
  float exposed = smoothstep(0.25,0.66,rockCover);
  float cliffReach = smoothstep(217.0,227.0,-p.y)*(1.0-smoothstep(267.0,282.0,-p.y))
    *(1.0-smoothstep(-17.0,-4.0,p.x));
  float cliffFace = cliffReach*smoothstep(0.34,0.70,steepness)*smoothstep(2.8,7.1,height);
  exposed = max(exposed,cliffFace*mix(0.69,0.93,ledgePatch));
  exposed = mix(exposed,1.0,outcrop);
  vec2 canopyUV = p*0.94+vec2(height*0.51,height*0.62);
  float forestTexture = noise2(canopyUV+vec2(wash,country));
  float crownDetail = 1.0-smoothstep(0.28,1.39,length(fwidth(canopyUV)));
  float crowns = pow(forestTexture,1.8);
  float forestMix = clamp(0.17+0.38*country+0.22*district+0.21*gully+0.16*pockets+(crowns-0.32)*0.47*crownDetail,0.0,1.0);
  vec3 deepForest = mix(vec3(0.016,0.037,0.025),vec3(0.029,0.042,0.018),district);
  vec3 brightForest = mix(vec3(0.072,0.111,0.047),vec3(0.113,0.130,0.056),weather);
  vec3 forest = mix(deepForest,brightForest,forestMix);
  float canopyShadows = smoothstep(0.25,0.69,noise2(p*0.36)*0.66+country*0.34);
  forest *= mix(0.76,1.22,canopyShadows);
  float oxidized = smoothstep(0.22,0.80,0.48*district+0.35*blocks+0.17*weather);
  vec3 stone = mix(vec3(0.177,0.212,0.219),vec3(0.319,0.281,0.227),oxidized);
  float intactBed = smoothstep(0.27,0.62,0.58*ledgePatch+0.42*blocks);
  vec3 freshStone = mix(vec3(0.267,0.301,0.318),vec3(0.398,0.370,0.313),weather);
  stone = mix(stone,freshStone,intactBed*0.47);
  vec2 chipsUv = vec2(alongBedding*2.7,height*1.6+dot(p,vec2(1.11,0.52)));
  float chips = noise2(chipsUv);
  float crystal = (chips-0.5) * (1.0-smoothstep(0.30,1.45,length(fwidth(chipsUv))));
  stone *= (0.77+0.27*rubblePatch+0.23*shelves+0.21*crystal+0.25*flakes)*(1.0-0.23*hairline-0.28*runoff);
  float rockRelief = (rubblePatch-0.5)*0.14+(ledgePatch-0.5)*0.43+(blocks-0.5)*0.59;
  float sheltered = hairline*0.15+shelves*0.065;
  float detail = (1.0-smoothstep(48.0,124.0,range))*(1.0-smoothstep(0.18,0.58,footprint));
  if (detail > 0.0 && exposed > 0.03) {
    Limestone closeStone = sampleLimestone(vWorld,normal,footprint,bedMeters);
    float blend = detail*smoothstep(0.03,0.30,exposed);
    stone = mix(stone,closeStone.color,blend);
    rockRelief = mix(rockRelief,closeStone.relief,blend);
    sheltered = mix(sheltered,closeStone.shelter*0.79,blend);
  }
  float damp = 0.0;
  float grit = 0.0;
  float soil = 0.0;
  #ifdef ROCK_OUTCROP
    damp = shoreMoisture(p,height)*outcrop;
    float chipFace = smoothstep(0.07,0.30,incision)*(1.0-smoothstep(0.35,0.80,incision));
    stone = mix(stone,vec3(0.335,0.308,0.260),chipFace*0.36);
    stone *= mix(vec3(1.0),vec3(0.56,0.64,0.65),damp*0.87);
    float algae = smoothstep(0.42,0.72,scrub*0.56+rubblePatch*0.44)*damp
      * smoothstep(-0.28,-0.02,height)*(1.0-smoothstep(0.20,0.56,height));
    stone = mix(stone,vec3(0.077,0.111,0.072),algae*0.38);
    grit = damp*smoothstep(0.54,0.90,normal.y)*smoothstep(0.39,0.67,rubblePatch)*0.58;
    float litter = noise2(p*vec2(3.8,5.1)+0.25*height);
    soil = vRootFooting*smoothstep(0.19,0.64,normal.y)*smoothstep(0.23,0.65,litter);
    vec3 humus = mix(vec3(0.068,0.053,0.038),vec3(0.149,0.126,0.082),litter);
    stone = mix(stone,humus,soil*0.76);
  #endif
  sheltered = min(0.88,sheltered+incision*0.42+soil*0.14);
  vec3 talus = mix(vec3(0.112,0.103,0.073),vec3(0.246,0.230,0.175),wash);
  float scree = smoothstep(0.44,0.69,rubblePatch+0.13*shelves) *
    smoothstep(0.12,0.28,steepness) * (1.0-smoothstep(0.46,0.67,steepness));
  scree *= smoothstep(0.39,0.69,ledgePatch) * smoothstep(0.9,4.9,height) * (1.0-smoothstep(22.0,61.0,height));
  talus *= 0.81+0.30*chips;
  vec3 surface = mix(mix(forest,stone,exposed),talus,scree*(1.0-outcrop));

  float shore = (1.0-smoothstep(0.54,1.58,height+(country-0.5)*0.62))*(1.0-outcrop);
  shore = max(shore,grit);
  float sedimentFootprint = length(fwidth(p));
  vec4 sediment = shore > 0.0 ? shoreDeposit(p,height,country,sedimentFootprint) : vec4(0.0);
  surface = mix(surface,sediment.rgb,shore*(1.0-exposed*0.63)+grit*0.34);

  float relief = rockRelief*exposed
    + crowns*0.18*crownDetail*(1.0-exposed)*(1.0-shore)
    + sediment.a*shore;
  float reliefVisibility = 0.30+0.53*(1.0-smoothstep(0.14,0.94,footprint));
  vec3 bumped = normalize(mix(normal,reliefNormal(normal,relief),reliefVisibility));
  float sun = smoothstep(-0.15,0.94,dot(bumped,sunDirection));
  float shadow = mix(0.33,1.0,terrainShade)*(1.0-canopyShade*0.62);
  float occlusion = (1.0-canopyShade*0.39)*(1.0-sheltered*exposed);
  float bounce = (0.42+max(0.0,bumped.y)*0.24)*(0.90+0.10*terrainShade);
  vec3 fill = cloudDiffuseTint*bounce*occlusion;
  vec3 direct = cloudKeyTint*(0.62*sun*shadow*(1.0-0.29*incision)*cloudTransmission(p));
  vec3 color = surface*(fill+direct);
  vec3 eye = normalize(cameraPosition-vWorld);
  vec3 highlight = normalize(eye+sunDirection);
  color += vec3(0.086,0.097,0.104)*pow(max(0.0,dot(bumped,highlight)),21.0)*shadow*damp*(1.0-0.72*incision);
  return aerialPerspective(color,vWorld,range);
}

void main() {
  float range = distance(vWorld,cameraPosition);
  #ifdef DISTANT_TERRAIN
    vec2 domain = vec2(vWorld.x,-vWorld.z)-uTerrainDomain.xy;
    vec2 beyond = max(-domain,domain-uTerrainDomain.zw);
    float margin = max(beyond.x,beyond.y);
    // Veil valleys before crests and reach the exact sky radiance ahead of the rim.
    float veilStart = mix(460.0,710.0,smoothstep(18.0,120.0,vWorld.y));
    float rimVeil = smoothstep(veilStart,1820.0,margin);
    float rangeVeil = smoothstep(1040.0,2640.0,range)*smoothstep(35.0,390.0,margin);
    float veil = 1.0-(1.0-rimVeil)*(1.0-rangeVeil);
    vec3 color = veil < 1.0 ? shadeTerrain(range) : vec3(0.0);
    if (veil > 0.0) color = mix(color,skyAlongRay((vWorld-cameraPosition)/range),veil);
  #else
    vec3 color = shadeTerrain(range);
  #endif
  gl_FragColor = vec4(color,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

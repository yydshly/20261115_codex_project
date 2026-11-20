export const limestoneFragment = /* glsl */ `
struct Limestone {
  vec3 color;
  float relief;
  float shelter;
};

float limestoneBed(vec3 world, float basin) {
  vec2 p = world.xz;
  float uplift = (basin-0.5)*10.4+(noise2(p*0.019+vec2(4.1,12.9))-0.5)*4.2;
  return world.y+dot(p,vec2(0.118,-0.081))+uplift;
}

float stoneHash(vec3 p) {
  p = fract(p*vec3(0.1031,0.1030,0.0973));
  p += dot(p,p.yxz + 33.33);
  return fract((p.x+p.y)*p.z);
}

float stoneVolume(vec3 point) {
  vec3 cell = floor(point);
  vec3 u = fract(point);
  u *= u*(3.0-2.0*u);
  vec2 a = vec2(stoneHash(cell),stoneHash(cell+vec3(0,0,1)));
  vec2 b = vec2(stoneHash(cell+vec3(1,0,0)),stoneHash(cell+vec3(1,0,1)));
  vec2 c = vec2(stoneHash(cell+vec3(0,1,0)),stoneHash(cell+vec3(0,1,1)));
  vec2 d = vec2(stoneHash(cell+vec3(1,1,0)),stoneHash(cell+vec3(1,1,1)));
  vec2 depth = mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
  return mix(depth.x,depth.y,u.z);
}

// Bed heights are shared across rock faces, with uneven spacing and discontinuous seams.
vec3 sedimentaryLayer(float bed, vec2 reach, float footprint) {
  float band = floor(bed);
  float u = fract(bed);
  float thickness = grainHash(vec2(band,15.1));
  float stain = noise2(reach*0.78+vec2(band*0.73,2.8));
  float chippedRim = noise2(reach*2.73+vec2(band*1.38,0.4))-0.5;
  float edge = u-(0.20+0.58*thickness)+chippedRim*0.25;
  float apron = smoothstep(0.025,0.14,u)*(1.0-smoothstep(0.86,0.975,u));
  float presence = apron*smoothstep(0.47,0.74,stain)*smoothstep(0.16,0.68,thickness);
  float seam = (1.0-smoothstep(0.004,0.019+footprint*0.13,abs(edge)))*presence;
  float shoulder = smoothstep(-0.025,0.055,edge)*(1.0-smoothstep(0.070,0.24,edge))*presence;
  return vec3(shoulder,seam,(thickness-0.5)*apron);
}

// Two oblique fracture families with chipped edges and different termination lengths.
float limestoneFissure(vec2 p, float footprint) {
  vec2 tile = floor(p);
  vec2 u = fract(p)-0.5;
  float seed = grainHash(tile+vec2(3.4,7.8));
  float tip = 0.14+0.28*grainHash(tile+vec2(8.4,13.4));
  float entry = (grainHash(tile+vec2(17.1,1.4))-0.5)*0.49;
  float lean = (grainHash(tile+vec2(0.5,5.7))-0.5)*0.68;
  float ravel = (noise2(p*6.3+vec2(13.4,0.9))-0.5)*0.12;
  float kink = max(0.0, u.y + 0.032)*0.23*sign(seed-0.5);
  float distanceToSplit = abs(u.x-entry-lean*u.y-ravel-kink);
  float split = 1.0-smoothstep(0.004,0.011+seed*0.014+footprint*0.14,distanceToSplit);
  float chipped = smoothstep(0.23,0.57,noise2(p*vec2(4.9,8.7)+13.4));
  return split*(1.0-smoothstep(tip*0.32,tip,abs(u.y)))*smoothstep(0.29,0.55,seed)*chipped;
}

Limestone sampleLimestone(vec3 world, vec3 normal, float footprint, float bed) {
  vec2 reach = vec2(dot(world.xz,vec2(0.22,0.16)),dot(world.xz,vec2(-0.17,0.22)));
  float basin = noise2(reach*0.19+vec2(7.9,3.4));
  float grainVisibility = 1.0-smoothstep(0.055,0.27,footprint);
  float bedding = bed+(noise2(reach*0.82+4.6)-0.5)*0.69;
  vec3 shelves = sedimentaryLayer(bedding*0.86,reach*0.66,footprint)
    + 0.30*grainVisibility*sedimentaryLayer(bedding*1.91+0.47,reach*0.87+vec2(5.3,13.0),footprint*2.0);

  vec3 form = vec3(world.x*0.81 + world.z*0.21,bed*1.29,world.z*0.89 - world.x*0.16);
  float facet = stoneVolume(form*1.61);
  float facetGrain = stoneVolume(form*4.34+vec3(8.5,4.6,12.9));
  float shatter = smoothstep(0.33,0.56,facet);
  float ledge = (shatter-0.5)*0.061+(facetGrain-0.5)*0.036*grainVisibility;
  float fractureBlock = stoneVolume(form*vec3(0.45,0.60,0.35)+vec3(7.2,2.8,11.4));

  vec3 axisWeight = pow(abs(normal),vec3(4.0));
  axisWeight /= max(0.001,axisWeight.x+axisWeight.y+axisWeight.z);
  float primary = limestoneFissure(vec2(world.z*0.76+world.x*0.22,bed*0.48)*vec2(1.0,1.1),footprint);
  float transverse = limestoneFissure(vec2(world.x*0.69-world.z*0.16,bed*0.55)+vec2(8.9,3.7),footprint);
  float surfaceCut = limestoneFissure(reach*2.44+bed*0.063,footprint);
  float fissure = dot(vec3(primary,surfaceCut,transverse),axisWeight)*(0.56+0.44*facet);

  float flutes = noise2(vec2(reach.x*1.56 + (facet-0.5)*0.18,world.y*0.16+reach.y*0.41));
  float runoff = smoothstep(0.53,0.81,flutes*0.76 + basin*0.24);
  float fineVisibility = 1.0-smoothstep(0.015,0.086,footprint);
  float weathered = smoothstep(0.30,0.72,facetGrain*0.58+flutes*0.42);
  float pore = 0.0;
  float chip = 0.0;
  if (fineVisibility > 0.0) {
    // Rotate the mineral grain across the bedding so it does not inherit the grid of the larger facets.
    vec3 grainSpace = vec3(form.x*0.8-form.y*0.6,form.x*0.48+form.y*0.64-form.z*0.6,
      form.x*0.36+form.y*0.48+form.z*0.8);
    float grain = stoneVolume(grainSpace*18.7+vec3(1.1,9.7,4.5));
    float edge = stoneVolume(grainSpace.zxy*31.4+vec3(15.9,0.3,4.0));
    grain = grain*0.72 + edge*0.28;
    pore = (1.0-smoothstep(0.16,0.38,grain))*fineVisibility*weathered;
    chip = smoothstep(0.61,0.81,grain)*fineVisibility;
  }
  float dust = noise2(reach*0.68+vec2(world.y*0.31,0.0));
  float chalk = smoothstep(0.19,0.79,basin*0.20+fractureBlock*0.54+dust*0.26);
  vec3 patina = mix(vec3(0.151,0.174,0.179),vec3(0.371,0.346,0.303),chalk);
  vec3 fresh = mix(vec3(0.255,0.283,0.280),vec3(0.442,0.411,0.342),fractureBlock);
  patina = mix(patina,fresh,smoothstep(0.49,0.77,facet)*0.46);
  patina += vec3(0.067,0.029,-0.012)*dust*runoff;
  float lichen = smoothstep(0.53,0.72,facetGrain*0.67+flutes*0.19+fractureBlock*0.14);
  patina = mix(patina,vec3(0.210,0.231,0.169),lichen*weathered*grainVisibility*0.36);
  patina *= 1.0+0.10*shelves.z+0.32*(facetGrain-0.5)*grainVisibility+0.15*chip;
  patina *= 1.0-0.29*runoff-0.13*shelves.y-0.20*fissure-0.13*pore;

  Limestone result;
  result.color = patina;
  result.relief = ledge+0.051*shelves.x-0.014*shelves.y-0.023*fissure+0.0026*chip-0.0042*pore;
  result.shelter = min(1.0,0.42*fissure+0.34*shelves.y+0.15*pore+0.19*runoff);
  return result;
}
`;

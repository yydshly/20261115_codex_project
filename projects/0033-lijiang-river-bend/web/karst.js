import { coreBounds, riverBank, riverCenter } from './river-layout.js';

const mix = (a, b, t) => a + (b-a)*t;

function smooth(start, stop, value) {
  const t = Math.max(0, Math.min(1, (value-start)/(stop-start)));
  return t*t*(3-2*t);
}

function hash(x, y) {
  const code = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  const folded = Math.imul(code ^ (code >>> 13), 1274126177);
  return ((folded ^ (folded >>> 16)) >>> 0) / 4294967295;
}

function noise2(x, y) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const u = smooth(0, 1, x-i);
  const v = smooth(0, 1, y-j);
  return mix(
    mix(hash(i, j), hash(i+1, j), u),
    mix(hash(i, j+1), hash(i+1, j+1), u),
    v,
  );
}

// World metres, with negative t pointing upstream. Forms at the first bend are
// placed to leave room between the isolated towers and the hills with joined bases.
const corePeaks = [
  // x, t, rise, width, length, azimuth, crown width, lateral tilt, optional form
  [-8, -167, 52, 31, 40, 0.80, 0.31, 0.13, 'ridge'],
  [-46, -128, 26, 23, 19, -0.40, 0.52, 0.18, 'cone'],
  [-63, -101, 61, 25, 36, 0.28, 0.24, -0.13, 'tower'],
  [-79, -55, 34, 34, 33, -0.74, 0.32, 0.15, 'ridge'],
  [117, -165, 64, 32, 39, -0.53, 0.41, 0.08, 'cone'],
  [99, -123, 38, 27, 39, 0.47, 0.15, -0.24, 'ridge'],
  [55, -93, 30, 23, 26, -0.43, 0.52, 0.20, 'cone'],
  [66, -56, 39, 26, 36, 0.24, 0.30, -0.09, 'ridge'],
  [-108, 53, 24, 43, 54, -0.58, 0.28, 0.05, 'dome'],
  [-84, 74, 28, 25, 25, 0.43, 0.15, 0.20, 'cone'],
  [-81, 103, 53, 20, 24, -0.47, 0.31, -0.15, 'tower'],
  [-74, 125, 23, 23, 29, 0.55, 0.10, 0.18, 'cone'],
  [-124, 143, 64, 35, 52, 0.78, 0.32, -0.20, 'ridge'],
  [-62, 159, 54, 18, 23, -0.43, 0.28, -0.07, 'cone'],
  [-82, 187, 35, 25, 31, 1.06, 0.20, 0.11, 'ridge'],
  [-52, 212, 24, 19, 19, -0.48, 0.39, 0.14, 'cone'],
  [-116, 242, 78, 35, 59, -1.07, 0.35, -0.20, 'massif'],
  [-89, 270, 34, 24, 31, 0.41, 0.32, -0.08, 'cone'],
  [-66, 308, 32, 18, 28, 0.31, 0.25, 0.22, 'cone'],
  [-125, 331, 74, 45, 48, -0.73, 0.35, -0.14, 'shoulder'],
  [-67, 378, 61, 25, 33, 0.23, 0.39, 0.11, 'tower'],
  [-38, 426, 68, 38, 43, -0.33, 0.32, -0.18, 'cone'],

  [93, 39, 26, 30, 38, 0.44, 0.22, 0.18, 'ridge'],
  [75, 69, 29, 17, 24, -0.33, 0.13, -0.09, 'cone'],
  [117, 88, 50, 34, 43, 0.78, 0.31, 0.19, 'ridge'],
  [71, 110, 37, 24, 24, -0.45, 0.10, -0.06, 'cone'],
  [108, 133, 65, 19, 38, -0.28, 0.36, 0.25, 'tower'],
  [78, 156, 47, 17, 24, 0.36, 0.39, -0.15, 'tower'],
  [117, 173, 41, 36, 38, -0.34, 0.24, -0.16, 'ridge'],
  [82, 190, 23, 20, 23, 0.33, 0.14, 0.09, 'cone'],
  [64, 220, 53, 19, 24, -0.42, 0.30, 0.15, 'tower'],
  [65, 239, 24, 23, 26, 0.46, 0.21, -0.23, 'cone'],
  [49, 253, 39, 21, 31, -0.87, 0.41, -0.16, 'ridge'],
  [71, 282, 54, 25, 29, 0.43, 0.27, 0.17, 'cone'],
  [36, 310, 47, 20, 34, -0.59, 0.39, -0.11, 'ridge'],
  [46, 356, 56, 29, 32, 0.35, 0.42, -0.16, 'cone'],
  [76, 382, 74, 36, 56, -0.62, 0.32, 0.20, 'massif'],
  [32, 428, 34, 39, 43, 0.24, 0.47, -0.13, 'dome'],

  [-151, 112, 56, 41, 57, 0.62, 0.24, -0.13, 'cone'],
  [159, 133, 65, 40, 56, -0.49, 0.41, -0.11, 'ridge'],
  [-141, 206, 67, 34, 58, -0.22, 0.48, 0.19, 'ridge'],
  [122, 214, 90, 44, 65, 0.90, 0.43, -0.25, 'shoulder'],
  [-172, 315, 91, 46, 44, 0.24, 0.37, 0.19, 'cone'],
  [137, 338, 77, 44, 52, -0.35, 0.52, -0.12, 'ridge'],
  [-15, 390, 43, 31, 28, 0.44, 0.42, 0.10, 'tower'],
  [17, 451, 70, 29, 26, -0.31, 0.51, 0.15, 'cone'],
];

// New peaks are placed relative to the centerline so a mountain never closes a bend.
const upstreamPeaks = [
  [-94, -478, 78, 47, 54, -0.69, 0.52, -0.11],
  [-63, -428, 62, 37, 47, -0.32, 0.66, -0.09],
  [-105, -386, 98, 51, 38, 0.33, 0.53, 0.14],
  [-71, -338, 49, 23, 32, 0.12, 0.30, 0.24],
  [-112, -284, 73, 39, 40, -0.37, 0.48, 0.19],
  [-66, -232, 42, 21, 41, 0.50, 0.35, -0.15],
  [82, -482, 104, 53, 44, 0.53, 0.37, 0.17],
  [121, -420, 92, 44, 57, -0.29, 0.31, 0.08],
  [65, -379, 54, 26, 39, 0.44, 0.67, -0.11],
  [90, -325, 76, 37, 45, 0.34, 0.58, 0.16],
  [104, -263, 91, 33, 42, -0.48, 0.42, -0.18],
  [64, -222, 42, 29, 38, -0.32, 0.41, 0.19],
  [-184, -449, 128, 70, 51, -0.40, 0.37, 0.18],
  [212, -441, 105, 60, 70, 0.45, 0.31, -0.15],
  [-214, -330, 103, 63, 54, 0.31, 0.19, 0.12],
  [218, -303, 122, 70, 63, -0.36, 0.45, 0.09],
];

const downstreamPeaks = [
  // A rocky narrows gives way to a broad arc and two lines of peaks farther east.
  [-69, 504, 54, 25, 36, 0.39, 0.41, 0.15],
  [-74, 553, 88, 31, 39, -0.61, 0.58, -0.21],
  [-66, 585, 46, 28, 36, -0.32, 0.64, -0.09, 'dome'],
  [-104, 620, 81, 37, 36, 0.35, 0.44, 0.18],
  [-151, 665, 77, 40, 50, 0.31, 0.35, 0.14],
  [-96, 725, 33, 46, 67, -0.26, 0.19, 0.07, 'dome'],
  [-108, 782, 69, 42, 45, 0.22, 0.37, -0.11],
  [-94, 839, 74, 35, 35, -0.57, 0.61, -0.15],
  [-80, 884, 53, 29, 32, -0.25, 0.45, 0.11],
  [-61, 923, 67, 21, 40, 0.37, 0.44, -0.16],
  [-104, 967, 95, 43, 51, 0.52, 0.55, 0.18],
  [-74, 1029, 66, 31, 44, 0.39, 0.57, 0.08],
  [-109, 1085, 101, 52, 48, -0.43, 0.59, -0.11],
  [-94, 1153, 104, 51, 55, 0.48, 0.51, 0.09],
  [-86, 1199, 71, 35, 43, 0.14, 0.28, -0.15],
  [61, 513, 71, 29, 44, 0.22, 0.53, -0.12],
  [74, 568, 65, 20, 34, 0.43, 0.45, 0.12],
  [90, 600, 99, 40, 41, 0.38, 0.59, 0.19, 'shoulder'],
  [102, 662, 87, 38, 45, -0.63, 0.47, -0.10],
  [131, 721, 116, 45, 48, -0.37, 0.43, 0.21],
  [89, 789, 60, 26, 37, 0.36, 0.64, -0.13, 'tower'],
  [85, 836, 43, 38, 37, -0.43, 0.24, 0.09],
  [93, 902, 78, 33, 39, 0.55, 0.57, 0.16],
  [82, 953, 61, 33, 39, -0.23, 0.47, -0.14],
  [116, 1005, 114, 48, 52, 0.42, 0.41, 0.14],
  [78, 1051, 53, 28, 33, -0.53, 0.25, -0.08],
  [116, 1106, 99, 47, 49, -0.50, 0.49, 0.19],
  [91, 1173, 72, 35, 44, 0.39, 0.41, 0.10],
  [-203, 545, 115, 59, 51, 0.51, 0.31, 0.16],
  [-218, 671, 132, 58, 57, -0.48, 0.39, -0.18],
  [-266, 784, 123, 61, 69, 0.48, 0.35, 0.16],
  [-198, 874, 111, 55, 54, -0.55, 0.41, 0.09],
  [-213, 993, 124, 62, 56, 0.46, 0.35, 0.16],
  [-229, 1159, 116, 63, 48, 0.36, 0.47, -0.12],
  [192, 541, 119, 61, 60, -0.41, 0.51, 0.11],
  [249, 670, 131, 60, 58, 0.39, 0.37, 0.10],
  [205, 802, 119, 47, 57, -0.43, 0.47, -0.15],
  [194, 921, 121, 55, 62, 0.61, 0.43, 0.09],
  [231, 1046, 134, 63, 64, -0.39, 0.44, 0.14],
  [200, 1160, 116, 60, 71, -0.36, 0.36, 0.10],
];

// Outer ridges behind the established valley keep the side horizon continuous.
const outerPeaks = [
  [-232, -93, 77, 42, 71, 0.73, 0.38, 0.16, 'ridge'],
  [227, -79, 85, 37, 71, -0.79, 0.32, -0.11, 'ridge'],
  [247, 109, 107, 49, 53, 0.93, 0.33, 0.19, 'cone'],
  [-268, 175, 105, 40, 75, 0.66, 0.31, -0.18, 'ridge'],
  [265, 248, 76, 51, 59, -0.58, 0.44, -0.10, 'cone'],
  [-239, 348, 99, 48, 55, -0.23, 0.28, -0.17, 'ridge'],
  [235, 420, 89, 46, 54, 0.63, 0.45, 0.23, 'ridge'],
  [-303, -142, 114, 49, 54, -0.41, 0.43, -0.14],
  [-334, -32, 144, 67, 65, 0.28, 0.32, 0.17],
  [-290, 83, 104, 45, 72, -0.45, 0.47, -0.12],
  [-364, 230, 133, 71, 73, 0.36, 0.37, 0.14],
  [-307, 358, 119, 58, 60, -0.42, 0.36, -0.15],
  [-379, 448, 109, 73, 58, 0.40, 0.31, 0.12],
  [315, -155, 110, 68, 53, 0.23, 0.39, 0.16],
  [291, -50, 124, 56, 58, -0.36, 0.43, -0.12],
  [345, 76, 134, 72, 49, 0.53, 0.34, 0.14],
  [300, 190, 118, 54, 69, -0.48, 0.38, -0.15],
  [371, 316, 150, 64, 70, 0.54, 0.46, 0.20],
  [318, 419, 116, 56, 58, -0.39, 0.39, -0.10],
];

const regions = [
  { peaks: corePeaks, relative: false },
  { peaks: upstreamPeaks, relative: true },
  { peaks: downstreamPeaks, relative: true },
  { peaks: outerPeaks, relative: false },
];

function makePeak([offset, t, rise, width, length, angle, rim, tilt, form], region, relative) {
  const center = riverCenter(t);
  const x = offset + (relative ? center : 0);
  const variation = hash(offset+391, t-80);
  const stratum = noise2(x*0.012 + 3.2, t*0.009 - 5.7);
  const selection = hash(offset+918,t+207);
  const type = form ?? (selection < 0.18 ? 'dome' : selection < 0.34 ? 'shoulder'
    : selection < 0.49 ? 'ridge' : selection < 0.73 ? 'cone' : 'tower');
  const linked = type === 'ridge' || type === 'massif';
  const massif = type === 'massif';
  const reachWidth = width*(linked ? 1.06 : 0.82 + 0.38*stratum);
  const reachLength = length*(linked ? 1.13 + 0.3*variation : 0.91 + 0.19*stratum);
  const azimuth = angle + (stratum-0.5)*0.65;
  return {
    type, linked, x, t, rim, tilt, region, variation,
    rise: rise*(0.88 + 0.23*variation)*(type === 'dome' ? 0.78 : 1),
    width: reachWidth,
    length: reachLength,
    sine: Math.sin(azimuth),
    cosine: Math.cos(azimuth),
    reach: Math.max(reachWidth, reachLength)*2.65,
    riverSide: -Math.sign(x-center),
    lean: (hash(offset-714, t+293)-0.5)*0.60,
    shoulder: (hash(offset+111,t+427)-0.5)*0.6,
    faultAzimuth: (stratum-0.5)*1.42,
    limb: massif ? 0.50 + 0.20*variation : 0.17 + 0.36*variation,
    crestOffset: massif ? 0.39 : 0.31,
    crestRise: massif ? 0.28+0.20*variation : 0.41+0.21*variation,
    spurWidth: (massif ? 0.50 : 0.36)+0.24*stratum,
    saddle: (massif ? 0.49 : 0.19)+0.27*stratum,
    cleft: variation > 0.49 ? 1 : -1,
    bedOffset: hash(offset-53, t+315)*6.283,
    apron: linked || type === 'dome' ? 0.34 : type === 'cone' ? 0.23 : 0.12,
  };
}

const peaks = regions.flatMap(({ peaks, relative }, region) => peaks.map((peak) => makePeak(peak, region, relative)));

const bandLength = 80;
const peakBands = new Map();
const noPeaks = [];
for (const peak of peaks) {
  const first = Math.floor((peak.t - peak.reach - 11) / bandLength);
  const last = Math.floor((peak.t + peak.reach + 11) / bandLength);
  for (let band = first; band <= last; band++) {
    if (!peakBands.has(band)) peakBands.set(band, []);
    peakBands.get(band).push(peak);
  }
}

// A rounded maximum joins neighbouring aprons where their slopes meet, preserving
// individual summits without carving an artificial sharp valley along the join.
function roundJoin(a, b, width) {
  const blendWidth = Math.min(width, 2*Math.min(a,b));
  const overlap = Math.max(0, blendWidth-Math.abs(a-b));
  return Math.max(a, b) + overlap*overlap / Math.max(4*blendWidth, 0.0001);
}

function shapeHeight(peak, u, v, distanceSquared) {
  const facingRiver = smooth(-0.16, 0.64, u*peak.riverSide);
  if (!peak.linked) {
    const radius = Math.sqrt(distanceSquared);
    const inverseRadius = 1/Math.max(radius, 0.12);
    const acrossRim = u*inverseRadius;
    const alongRim = v*inverseRadius;
    const rib = acrossRim*(1-4*alongRim*alongRim) + 0.54*alongRim*(1-4*acrossRim*acrossRim);
    const skew = peak.shoulder*(0.42*acrossRim+0.8*alongRim);
    const erodedRadius = radius*(1 + skew+rib*(0.085+peak.lean*0.10));
    const fault = Math.sin((v+u*peak.faultAzimuth)*7.1+peak.bedOffset)*0.015;
    const r = erodedRadius + fault*facingRiver*smooth(0.24, 0.73, erodedRadius);
    if (peak.type === 'tower') {
      const face = 1.08 - 0.36*facingRiver+0.12*peak.variation;
      const ledge = (0.15+0.61*peak.rim)*(0.70+0.43*facingRiver);
      const headwall = 1-smooth(ledge, face, r);
      const top = 1-smooth(0.01, 0.39+peak.variation*0.32, Math.hypot(u-peak.shoulder*0.49,v+peak.lean*0.37));
      return (0.65*headwall+0.27*top)*(1+peak.lean*u*0.31);
    }
    if (peak.type === 'dome') return 0.74*(1-smooth(0.09,1.32,r));
    if (peak.type === 'shoulder') {
      const head = 1-smooth(0.26,1.04,r);
      const strike = 1-smooth(0.17,0.93,Math.abs(v+peak.cleft*0.31));
      const scarp = 1-smooth(0.13,0.49,Math.abs(u-0.16*peak.riverSide+v*peak.lean));
      return 0.62*head + 0.24*strike*scarp*(0.70+0.30*facingRiver);
    }
    const flank = 1.14 - 0.21*facingRiver+peak.variation*0.16;
    const tipRadius = 0.055+0.21*peak.variation;
    const roundedTip = Math.sqrt(r*r+tipRadius*tipRadius)-tipRadius;
    return Math.max(0,0.91-roundedTip*(0.69+peak.variation*0.26))*(1-smooth(0.68,flank,r));
  }

  // A narrow high crest and a broader flank share the same spine. Two offset
  // maxima leave an uneven saddle and a shorter spur above the main apron.
  const span = Math.abs(v);
  const spine = Math.abs(u + peak.tilt*(v*v-0.3) + v*peak.lean);
  const crest = 1-smooth(0.03+peak.rim*0.16,0.53+0.26*peak.variation+0.14*span,spine);
  const flank = 1-smooth(0.12,1.18-0.24*facingRiver,spine);
  const main = 1-smooth(0.04+peak.rim*0.26,0.53+peak.variation*0.27,Math.abs(v+peak.crestOffset*peak.cleft));
  const spur = 1-smooth(0.04, peak.spurWidth, Math.abs(v-peak.limb*peak.cleft));
  const ridgeHeight = peak.saddle + peak.crestRise*main + (0.18+0.29*peak.variation)*spur;
  return (0.63*crest+0.28*flank) * ridgeHeight * (1-smooth(0.63, 1.49, span));
}

export function groundHeight(x, t) {
  const bankNoise = (noise2(x*0.13, t*0.073)-0.5)*3.9;
  const side = x < riverCenter(t) ? -1 : 1;
  const edge = side*(x-riverBank(t, side)) + bankNoise;
  const gravel = noise2(x*0.72, t*0.61)-0.5;
  if (edge < 0) return -(0.04 + 4.7*smooth(0, 23, -edge) + 0.2*smooth(0, 3, -edge)*gravel);

  const knolls = 3.5*noise2(x*0.056, t*0.048);
  const terrace = 0.09 + 0.14*Math.min(edge, 15);
  const bank = terrace + (knolls+gravel*0.35)*smooth(0, 11, edge);
  if (edge < 2.2) return bank;

  const bentX = x + (noise2(x*0.029+18, t*0.025)-0.5)*14.0
    + (noise2(x*0.086, t*0.071+6.1)-0.5)*4.6;
  const bentT = t + (noise2(x*0.027, t*0.031+19)-0.5)*15.0
    + (noise2(x*0.079+1.7, t*0.063)-0.5)*5.4;
  const upstream = smooth(coreBounds.start, -251, t);
  const downstream = smooth(coreBounds.end, 527, t);
  const outer = smooth(coreBounds.right-23, 279, Math.abs(x));
  let summits = 0;
  let pediment = 0;
  for (const peak of peakBands.get(Math.floor(t / bandLength)) ?? noPeaks) {
    const strength = peak.region === 0 ? 1 : peak.region === 1 ? upstream : peak.region === 2 ? downstream : outer;
    if (strength <= 0) continue;
    const dx = bentX-peak.x;
    const dt = bentT-peak.t;
    if (Math.abs(dx) > peak.reach || Math.abs(dt) > peak.reach) continue;

    const crossValley = (dx*peak.cosine + dt*peak.sine)/peak.width;
    const alongValley = (dt*peak.cosine - dx*peak.sine)/peak.length;
    const bend = peak.tilt*alongValley*Math.min(1.5, Math.abs(alongValley));
    const u = crossValley+bend+peak.lean*alongValley*0.61;
    const v = alongValley;
    const squared = u*u+v*v;
    if (squared > 5.8) continue;

    const height = peak.rise*strength;
    const foot = Math.exp(-0.89*u*u-0.71*v*v)*height*peak.apron;
    const slope = height*shapeHeight(peak, u, v, squared);
    if (slope > 0.75) summits = roundJoin(summits, slope-0.75, peak.linked ? 8.1 : 3.6);
    if (foot > 1.2) pediment = roundJoin(pediment, foot-1.2, 3.7);
  }

  const reliefMask = smooth(4, 24, summits);
  const faultRun = noise2(bentX*0.063+bentT*0.029,bentT*0.056-bentX*0.022);
  const drainage = noise2(x*0.048-t*0.027, t*0.091+x*0.015);
  const erodedFlutes = noise2(bentX*0.114+bentT*0.072,bentT*0.091-bentX*0.085);
  const cuts = -Math.pow(1-Math.abs(faultRun*2-1), 7) * (1.7+3.4*drainage);
  const lip = (noise2(x*0.28, t*0.24)-0.5)*1.66;
  const asymmetric = (erodedFlutes-0.5)*5.0+gravel*0.32+cuts+lip;
  const apron = (pediment+Math.min(pediment*0.07, 0.65)*gravel)*smooth(2.2, 19, edge);
  const relief = (summits+asymmetric*reliefMask)*smooth(4.8, 26.5, edge);
  const expansion = Math.max(upstream, downstream, outer);
  const foothills = expansion > 0
    ? expansion*smooth(25, 143, edge)*(2.6+16.9*noise2(x*0.013+19, t*0.014))
    : 0;
  return bank+apron+relief+foothills;
}

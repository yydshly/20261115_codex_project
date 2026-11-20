export const coreBounds = { left: -225, right: 225, start: -188, end: 465 };
export const bounds = { left: -460, right: 460, start: -500, end: 1210 };
export const navigationBounds = { start: -320, end: 1000 };
export const DETAIL_LAYER = 1;
export const RIVERBED_LAYER = 2;

export function rng(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const upstreamCenter = [
  // Distance along the valley, cross-valley position, tangent.
  [-500, -226, 0.89],
  [-423, -148, 1.06],
  [-368, -88, 1.28],
  [-310, -13, 1.20],
  [-264, 41, 0.94],
  [-224, 69, 0.29],
  [-188, 62, -0.31],
];

const downstreamCenter = [
  [465, -24, -0.03],
  [516, -17, 0.51],
  [589, 34, 0.81],
  [657, 83, 0.66],
  [735, 117, 0.05],
  [804, 96, -0.62],
  [882, 44, -0.70],
  [959, -7, -0.42],
  [1017, -17, 0.24],
  [1103, 47, 1.03],
  [1164, 118, 1.19],
  [1210, 178, 1.27],
];

function centerline(points, t) {
  if (t <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index++) {
    const [end, b, tangentB] = points[index];
    if (t > end) continue;
    const [start, a, tangentA] = points[index-1];
    const length = end-start;
    const u = (t-start)/length;
    const progress = u*u*(3-2*u);
    return a+(b-a)*progress + length*u*(1-u)*((1-u)*tangentA-u*tangentB);
  }
  return points.at(-1)[1];
}

function coreCenter(t) {
  return 13*Math.sin(t*0.017) + 11*Math.sin(t*0.010 - 0.4) + 4.2
    - 57*smooth(178, 319, t) + 26*smooth(370, 460, t) + 66*smooth(48, 169, -t);
}

function mix(a, b, progress) {
  return a+(b-a)*progress;
}

export function riverCenter(t) {
  if (t < coreBounds.start) {
    return mix(coreCenter(t), centerline(upstreamCenter, t), smooth(coreBounds.start, -240, t));
  }
  if (t > coreBounds.end) {
    return mix(coreCenter(t), centerline(downstreamCenter, t), smooth(coreBounds.end, 525, t));
  }
  return coreCenter(t);
}

function bankFeature(t, center, width) {
  return Math.exp(-(((t-center)/width)**2));
}

export function riverHalfWidth(t) {
  const base = 33 + 5.3*Math.sin(t*0.018 + 0.12) + 2.4*Math.sin(t*0.044 + 1);
  if (t < coreBounds.start) {
    return mix(base, 35+12*bankFeature(t,-323,81)-7*bankFeature(t,-452,64), smooth(coreBounds.start,-251,t));
  }
  if (t > coreBounds.end) {
    const wideReach = 37 + 15*bankFeature(t,739,141) + 7*bankFeature(t,804,68);
    const narrows = 9*bankFeature(t,552,57) + 10*bankFeature(t,1122,88);
    return mix(base, wideReach-narrows, smooth(coreBounds.end,536,t));
  }
  return base;
}

export function riverBank(t, side) {
  let gravelBar = side < 0
    ? 7.7*bankFeature(t,26,14) - 4.2*bankFeature(t,63,19)
    : 6.3*bankFeature(t,105,23) - 3.6*bankFeature(t,146,20);
  if (t < coreBounds.start) {
    const wing = side < 0
      ? 8.2*bankFeature(t,-296,36) - 7.8*bankFeature(t,-358,61)
      : 5*bankFeature(t,-329,38) - 9.3*bankFeature(t,-276,33);
    gravelBar += wing*smooth(coreBounds.start,-233,t);
  } else if (t > coreBounds.end) {
    const wing = side < 0
      ? 13.5*bankFeature(t,654,32) - 8.7*bankFeature(t,742,67) + 7.2*bankFeature(t,901,42)
      : -8.2*bankFeature(t,714,51) + 9.4*bankFeature(t,824,41) - 11.5*bankFeature(t,989,82);
    gravelBar += wing*smooth(coreBounds.end,531,t);
  }
  return riverCenter(t) + side*(riverHalfWidth(t) - gravelBar);
}

function smooth(start, end, x) {
  const u = Math.max(0, Math.min(1, (x - start)/(end - start)));
  return u*u*(3 - 2*u);
}

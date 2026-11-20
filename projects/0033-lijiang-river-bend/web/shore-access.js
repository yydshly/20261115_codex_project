const dryHeight = 0.035;
const footSamples = [[-0.28,0],[0.28,0],[0,-0.28],[0,0.28]];

function standable(surfaceAt, x, t) {
  const y = surfaceAt(x,t);
  return y >= dryHeight && footSamples.every(([dx,dt]) => {
    const next = surfaceAt(x+dx,t+dt);
    return next >= dryHeight && Math.abs(next-y) <= 0.24;
  });
}

export function findWalkablePoint(surfaceAt, x, t) {
  if (standable(surfaceAt,x,t)) return { x,t };
  for (let distance = 0.75; distance <= 18; distance += 0.75) {
    const count = Math.max(8,Math.ceil(distance*4));
    for (let i = 0; i < count; i++) {
      const angle = 2*Math.PI*i/count;
      const px = x+Math.cos(angle)*distance;
      const pt = t+Math.sin(angle)*distance;
      if (standable(surfaceAt,px,pt)) return { x:px,t:pt };
    }
  }
  return null;
}

export function walkAlongShore(surfaceAt, from, to) {
  const dx = to.x-from.x;
  const dt = to.t-from.t;
  const steps = Math.max(1,Math.ceil(Math.hypot(dx,dt)/0.18));
  const sx = dx/steps;
  const st = dt/steps;
  let { x,t } = from;
  let height = surfaceAt(x,t);
  function tryStep(nextX, nextT) {
    const nextHeight = surfaceAt(nextX,nextT);
    const maximumRise = Math.hypot(nextX-x,nextT-t)*0.78+0.06;
    if (nextHeight < dryHeight || Math.abs(nextHeight-height) > maximumRise) return false;
    x = nextX;
    t = nextT;
    height = nextHeight;
    return true;
  }

  for (let i = 0; i < steps; i++) {
    if (tryStep(x+sx,t+st)) continue;
    if (Math.abs(sx) > Math.abs(st)) {
      if (sx && tryStep(x+sx,t)) continue;
      if (st && tryStep(x,t+st)) continue;
    } else {
      if (st && tryStep(x,t+st)) continue;
      if (sx && tryStep(x+sx,t)) continue;
    }
    break;
  }
  return { x,t };
}

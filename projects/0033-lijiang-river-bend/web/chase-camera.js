function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function surfaceAt(heightAt, x, t) {
  return Math.max(0, heightAt(x, t));
}

function clearSightLine(anchor, offsetX, offsetT, eye, focus, clearance, samples, heightAt) {
  let height = eye;
  for (let i = 1; i <= samples; i++) {
    const fraction = i / samples;
    const ground = surfaceAt(heightAt, anchor.x + offsetX*fraction, anchor.t + offsetT*fraction);
    // The sight line may approach the subject more closely than the camera approaches the ground.
    height = Math.max(height, focus + (ground - focus)/fraction + clearance);
  }
  return height;
}

export function resolveChasePose(anchor, options, heightAt) {
  const {
    distance, elevation, lookAhead = 0, focusHeight = 0, orbitYaw = 0, orbitPitch = 0, clearance = 1.2,
  } = options;
  const azimuth = anchor.yaw + orbitYaw;
  const radius = Math.hypot(distance, elevation);
  const tilt = clamp(Math.atan2(elevation, distance) + orbitPitch, 0.09, 1.04);
  const run = Math.cos(tilt)*radius;
  const eye = anchor.height + Math.sin(tilt)*radius;
  const focus = anchor.height + focusHeight;
  const samples = Math.max(6, Math.ceil(radius / 0.85));
  let offsetX = -Math.sin(azimuth)*run;
  let offsetT = -Math.cos(azimuth)*run;
  let height = clearSightLine(anchor, offsetX, offsetT, eye, focus, clearance, samples, heightAt);

  // Move in a little as the terrain pushes the eye up, keeping the subject prominent.
  const lift = height - eye;
  if (lift > 0) {
    const fraction = 1 - 0.35*lift/(lift + radius);
    offsetX *= fraction;
    offsetT *= fraction;
    height = clearSightLine(anchor, offsetX, offsetT, eye, focus, clearance, samples, heightAt);
  }
  const x = anchor.x + offsetX;
  const t = anchor.t + offsetT;

  // Look down the route from behind. As the view orbits to the side, keep the craft centered.
  const headingX = Math.sin(anchor.yaw);
  const headingT = Math.cos(anchor.yaw);
  const trailing = Math.max(0, Math.cos(orbitYaw));
  const requestedLead = lookAhead*trailing*trailing;
  const leadGround = surfaceAt(heightAt, anchor.x + headingX*requestedLead, anchor.t + headingT*requestedLead);
  const lead = requestedLead*clamp((focus - leadGround + 0.08)/0.36, 0, 1);
  const towardX = anchor.x + headingX*lead - x;
  const towardT = anchor.t + headingT*lead - t;
  return {
    x,
    t,
    height,
    yaw: Math.atan2(towardX, towardT),
    pitch: Math.atan2(focus-height, Math.hypot(towardX, towardT)),
  };
}

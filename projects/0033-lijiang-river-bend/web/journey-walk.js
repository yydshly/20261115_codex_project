import { riverCenter } from './river-layout.js';

const pace = 1.18;
const easeTime = 0.55;
const eyeHeight = 1.65;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (a, b, weight) => a + (b - a)*weight;
const heading = (from, to) => Math.atan2(to.x - from.x, to.t - from.t);
const separation = (a, b) => Math.hypot(b.x - a.x, b.t - a.t);

function smooth(value) {
  const u = clamp(value, 0, 1);
  return u*u*(3 - 2*u);
}

function turnToward(yaw, target, weight) {
  const change = target - yaw;
  return yaw + Math.atan2(Math.sin(change), Math.cos(change))*weight;
}

function rampDistance(seconds) {
  const u = seconds/easeTime;
  return pace*easeTime*u**3*(1 - 0.5*u);
}

function distanceAt(plan, seconds) {
  const time = clamp(seconds, 0, plan.duration);
  if (time <= easeTime) return rampDistance(time);
  if (time >= plan.duration - easeTime) return plan.length - rampDistance(plan.duration - time);
  return pace*(time - easeTime*0.5);
}

function pointAt(plan, distance) {
  const along = clamp(distance, 0, plan.length);
  const leg = plan.legs.find(({ end }) => along <= end) ?? plan.legs.at(-1);
  const u = (along - leg.start)/(leg.end - leg.start);
  return { x:mix(leg.from.x, leg.to.x, u), t:mix(leg.from.t, leg.to.t, u) };
}

export function planPierWalk(dock, returning = false) {
  const rampHead = dock.deckSegments[0].end;
  const points = [dock.footExit, dock.shore, rampHead, dock.boarding];
  if (returning) points.reverse();
  let length = 0;
  const legs = points.slice(1).map((to, index) => {
    const from = points[index];
    const start = length;
    length += separation(from, to);
    return { from, to, start, end:length };
  });

  const wood = dock.berths.wood;
  const upRiver = dock.footExit.t - 56;
  const viewTarget = returning ? { x:riverCenter(upRiver), t:upRiver } : {
    x:wood.x + Math.sin(wood.yaw)*1.45,
    t:wood.t + Math.cos(wood.yaw)*1.45,
  };
  const plan = {
    legs,
    length,
    duration:length/pace + easeTime,
    startYaw:heading(points[0], returning ? rampHead : dock.boarding),
    endYaw:heading(points.at(-1), viewTarget),
    returning,
  };
  return { ...plan, start:samplePierWalk(plan, 0), end:samplePierWalk(plan, plan.duration) };
}

export function samplePierWalk(plan, seconds) {
  const distance = distanceAt(plan, seconds);
  const point = pointAt(plan, distance);
  // Use the chord across a corner for the gaze, while the footsteps stay on the ramp centerline.
  const gazeDistance = plan.returning
    ? Math.min(distance, plan.legs.at(-1).start - 0.92)
    : Math.max(distance, plan.legs[0].end + 0.92);
  const pathYaw = heading(pointAt(plan,gazeDistance - 0.92), pointAt(plan,gazeDistance + 0.92));
  const opening = 1 - smooth(distance/(plan.returning ? 1.8 : 3.9));
  const arriving = 1 - smooth((plan.length - distance)/(plan.returning ? 4.0 : 1.9));
  const yaw = turnToward(turnToward(pathYaw, plan.startYaw, opening), plan.endYaw, arriving);
  const pitch = mix(-0.12, plan.returning ? -0.10 : -0.28, arriving);
  return { ...point, yaw, pitch, lift:eyeHeight };
}

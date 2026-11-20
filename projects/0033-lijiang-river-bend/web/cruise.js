import { riverBank, riverCenter } from './river-layout.js';

export const CRUISE_BOARDING_TIME = 5.4;

const bankClearance = 4.25;
const eyeHeight = 1.44;
const seatOffset = 1.05;

// t increases downriver. Lateral position is a fraction of the usable channel.
// Glance is relative to the bow. Negative values turn toward the left bank.
const stations = [
  [-22, 0.135, 0.0, 0.12, -0.040],
  [-9, 0.135, 3.7, -0.04, -0.080],
  [17, 0.040, 3.2, -0.39, -0.260],
  [38, 0.078, 3.8, -0.35, -0.165],
  [66, 0.324, 6.1, 0.03, -0.030],
  [104, 0.490, 6.9, 0.14, -0.010],
  [166, 0.530, 7.2, 0.11, 0.015],
  [205, 0.437, 6.7, -0.05, -0.022],
  [220, 0.190, 5.0, -0.20, 0.032],
  [235, 0.077, 4.4, -0.48, 0.120],
  [248, 0.075, 4.7, -0.44, 0.112],
  [263, 0.173, 5.6, -0.29, 0.055],
  [281, 0.354, 5.7, -0.12, -0.020],
  [296, 0.492, 5.5, -0.20, -0.033],
  [339, 0.405, 6.8, 0.05, 0.011],
  [410, 0.461, 7.2, 0.12, 0.024],
  [467, 0.536, 7.1, 0.12, 0.010],
  [527, 0.600, 6.5, 0.17, -0.015],
  [578, 0.555, 5.9, 0.06, 0.032],
  [618, 0.402, 6.0, -0.16, -0.061],
  [655, 0.148, 4.6, -0.35, -0.165],
  [682, 0.236, 6.1, -0.13, -0.058],
  [732, 0.441, 6.5, 0.12, -0.010],
  [759, 0.305, 5.1, 0.04, -0.024],
  [775, 0.120, 4.3, 0.02, -0.042],
  [788, 0.034, 0.0, 0.00, -0.048],
].map(([t, lateral, speed, glance, pitch]) => ({ t, lateral, speed, glance, pitch }));

const firstT = stations[0].t;
const lastT = stations.at(-1).t;
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (a, b, ratio) => a + (b - a)*ratio;
const smooth = (value) => value*value*(3 - 2*value);
const softMotion = (value) => value*value*value*(value*(value*6 - 15) + 10);
const shortAngle = (delta) => Math.atan2(Math.sin(delta), Math.cos(delta));
const turnRight = (delta) => (delta + Math.PI*2)%(Math.PI*2);

function interval(samples, key, value) {
  let left = 0;
  let right = samples.length - 1;
  while (right - left > 1) {
    const middle = Math.floor((left + right)/2);
    if (samples[middle][key] <= value) left = middle;
    else right = middle;
  }
  return [samples[left], samples[right]];
}

function profileAt(t) {
  const [from, to] = interval(stations, 't', t);
  const ratio = clamp01((t - from.t)/(to.t - from.t));
  const eased = smooth(ratio);
  // Linear interpolation in speed squared gives a smooth start and stop.
  const speedRatio = from.speed === 0 || to.speed === 0 ? ratio : eased;
  return {
    lateral: mix(from.lateral, to.lateral, eased),
    speed: Math.sqrt(mix(from.speed**2, to.speed**2, speedRatio)),
    glance: mix(from.glance, to.glance, eased),
    pitch: mix(from.pitch, to.pitch, eased),
  };
}

function vesselX(t, lateral = profileAt(t).lateral) {
  const left = riverBank(t, -1) + bankClearance;
  const right = riverBank(t, 1) - bankClearance;
  return mix(left, right, lateral);
}

function headingAt(t) {
  const before = Math.max(firstT, t - 0.13);
  const after = Math.min(lastT, t + 0.13);
  return Math.atan2(vesselX(after)-vesselX(before), after-before);
}

function buildTimetable() {
  const table = [];
  const count = Math.ceil((lastT - firstT)/0.85);
  for (let step = 0; step <= count; step++) {
    const t = mix(firstT, lastT, step/count);
    const profile = profileAt(t);
    const x = vesselX(t, profile.lateral);
    const previous = table.at(-1);
    const time = previous
      ? previous.time + 2*Math.hypot(x - previous.x, t - previous.t)/(profile.speed + previous.speed)
      : CRUISE_BOARDING_TIME;
    table.push({ t, x, speed: profile.speed, time });
  }
  return table;
}

const timetable = buildTimetable();
const sailingEnd = timetable.at(-1).time;
export const CRUISE_DURATION = sailingEnd + 3.2;

function progressAt(time) {
  if (time <= CRUISE_BOARDING_TIME) return { t: firstT, speed: 0 };
  if (time >= sailingEnd) return { t: lastT, speed: 0 };
  const [from, to] = interval(timetable, 'time', time);
  const progress = clamp01((time - from.time)/(to.time - from.time));
  const acceleration = to.speed - from.speed;
  const distanceRatio = (2*from.speed*progress + acceleration*progress**2)/(from.speed + to.speed);
  return { t: mix(from.t, to.t, distanceRatio), speed: mix(from.speed, to.speed, progress) };
}

function timeAt(t) {
  const [from, to] = interval(timetable, 't', t);
  const distanceRatio = clamp01((t - from.t)/(to.t - from.t));
  const speed = Math.sqrt(mix(from.speed**2, to.speed**2, distanceRatio));
  const elapsed = 2*Math.hypot(to.x - from.x, to.t - from.t)*distanceRatio/(from.speed + speed);
  return from.time + elapsed;
}

const lookBackStart = timeAt(741);

export const cruiseChapters = [
  { id: 'arrival', label: '鸟瞰入湾', time: 0 },
  { id: 'shallows', label: '贴水过浅滩', time: timeAt(12) },
  { id: 'peaks', label: '峰林倒映', time: timeAt(91) },
  { id: 'rockbank', label: '贴岸看岩壁', time: timeAt(233) },
  { id: 'bend', label: '转过河弯', time: timeAt(252) },
  { id: 'reach', label: '开阔河谷', time: timeAt(519) },
  { id: 'shoal', label: '沙洲水道', time: timeAt(637) },
  { id: 'lookback', label: '回望来路', time: lookBackStart },
];

export function sampleCruise(timeSeconds) {
  const time = Math.min(CRUISE_DURATION, Math.max(0, Number(timeSeconds) || 0));
  const { t: boatT, speed } = progressAt(time);
  const profile = profileAt(boatT);
  const boatX = vesselX(boatT, profile.lateral);
  const heading = headingAt(boatT);
  const courseChange = shortAngle(headingAt(Math.min(lastT,boatT+3.5)) - headingAt(Math.max(firstT,boatT-3.5)));
  const steering = Math.min(1, Math.max(-1, courseChange*1.85));
  const flight = 1 - softMotion(clamp01(time/CRUISE_BOARDING_TIME));
  const t = boatT - Math.cos(heading)*seatOffset - 26*flight;
  const seatX = boatX - Math.sin(heading)*seatOffset;
  const x = mix(seatX, riverCenter(t), flight);
  const lift = mix(eyeHeight, 31, flight);

  let yaw = heading + profile.glance;
  const airborneTarget = t + 68;
  const aerialYaw = Math.atan2(riverCenter(airborneTarget) - x, airborneTarget - t);
  yaw += flight*shortAngle(aerialYaw - yaw);

  // The final view turns back along the wide reach while the boat slows.
  const lookBack = softMotion(clamp01((time - lookBackStart)/(sailingEnd - lookBackStart - 1.5)));
  const behind = boatT - 89;
  const rearYaw = Math.atan2(riverCenter(behind) - x, behind - t);
  yaw += lookBack*turnRight(rearYaw - yaw);
  const pitch = mix(profile.pitch, -0.412, flight) + lookBack*0.021;
  const chapter = cruiseChapters.findLast((item) => item.time <= time).id;

  return { x, t, lift, yaw, pitch, steering, boat: { x: boatX, t: boatT, yaw: heading, speed }, chapter };
}

function joinAxis(from, to, fromVelocity, toVelocity, duration, u) {
  const offset = to-from;
  const start = fromVelocity*duration;
  const end = toVelocity*duration;
  const a = start+end-2*offset;
  const b = 3*offset-2*start-end;
  return {
    position: from+u*(start+u*(b+u*a)),
    velocity: (start+u*(2*b+u*3*a))/duration,
  };
}

export function sampleCruiseRejoin(plan, elapsed) {
  const { from, to, duration } = plan;
  const u = clamp01(elapsed/duration);
  const across = joinAxis(from.x,to.x,Math.sin(from.yaw)*from.speed,Math.sin(to.yaw)*to.speed,duration,u);
  const along = joinAxis(from.t,to.t,Math.cos(from.yaw)*from.speed,Math.cos(to.yaw)*to.speed,duration,u);
  const speed = Math.hypot(across.velocity,along.velocity);
  const tangent = speed > 0.00001 ? Math.atan2(across.velocity,along.velocity) : from.yaw;
  return {
    x: across.position,
    t: along.position,
    yaw: from.yaw + shortAngle(tangent-from.yaw)*smooth(clamp01(speed/0.65)),
    speed,
  };
}

export function planCruiseRejoin(boat, canFloat) {
  if (boat.t < firstT-1 || boat.t >= lastT-6 || boat.speed < -0.05) return null;
  const nearestT = Math.max(boat.t,firstT);
  if (Math.abs(boat.x-vesselX(nearestT)) > 6.5 || Math.abs(shortAngle(headingAt(nearestT)-boat.yaw)) > 1.05) {
    return null;
  }

  for (const lead of [6, 9, 12, 16]) {
    const targetT = boat.t+lead;
    if (targetT >= lastT-0.5) break;
    const time = timeAt(targetT);
    const to = sampleCruise(time).boat;
    const distance = Math.hypot(to.x-boat.x,to.t-boat.t);
    const from = { ...boat, speed: Math.max(0,boat.speed) };
    const duration = Math.max(1.55,2*distance/Math.max(0.9,from.speed+to.speed));
    if (duration > 5.4) continue;
    const plan = { from, to, time, duration };
    const probes = Math.ceil(duration*24);
    let previous = from;
    let valid = true;
    for (let sample = 0; sample <= probes; sample++) {
      const frame = sampleCruiseRejoin(plan,sample*duration/probes);
      const turn = Math.abs(shortAngle(frame.yaw-previous.yaw));
      if (frame.t < previous.t-0.001 || turn > 1.0*duration/probes || frame.speed > 8.4 || !canFloat(frame)) {
        valid = false;
        break;
      }
      previous = frame;
    }
    if (valid) return plan;
  }
  return null;
}

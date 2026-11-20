import { navigationBounds, riverBank } from './river-layout.js';
import { CRUISE_BOARDING_TIME, CRUISE_DURATION, sampleCruise } from './cruise.js';

export const DOCK_ASSIST_DISTANCE = 26;
export const DOCK_ASSIST_SPEED = 3.3;
export const MAX_DOCKED_SPEED = 0.5;

const hulls = {
  wood: { beam: 0.620, depth: 0.33, samples: [[2.42,0],[1.22,0.46],[0,0.62],[-1.74,0.43],[-2.60,0]] },
  fast: { beam: 0.925, depth: 0.39, samples: [[2.68,0],[1.46,0.78],[0,0.93],[-1.72,0.82],[-2.49,0]] },
};
const headWidth = 1.52;
const headHalfLength = 3.44;
const rampWidth = 1.40;
const deckY = 0.56;
const berthGap = 0.22;
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const mix = (a,b,u) => a+(b-a)*u;
const angleDifference = (a,b) => Math.atan2(Math.sin(b-a),Math.cos(b-a));
const distance = (a,b) => Math.hypot(a.x-b.x,a.t-b.t);
const heading = (yaw) => ({ x: Math.sin(yaw), t: Math.cos(yaw) });
const right = (yaw) => ({ x: Math.cos(yaw), t: -Math.sin(yaw) });
const offset = (point,axis,amount) => ({ x: point.x+axis.x*amount, t: point.t+axis.t*amount });

function finiteVessel(vessel) {
  return [vessel?.x,vessel?.t,vessel?.yaw,vessel?.speed].every(Number.isFinite);
}

function floorProbe(heightAt, point, minimum = 0.06) {
  const y = heightAt(point.x,point.t);
  if (y < minimum) return null;
  const radius = 0.34;
  const east = heightAt(point.x+radius,point.t);
  const west = heightAt(point.x-radius,point.t);
  const south = heightAt(point.x,point.t+radius);
  const north = heightAt(point.x,point.t-radius);
  if (Math.min(east,west,south,north) < 0.015 || Math.hypot(east-west,south-north) > 0.62*radius*2) {
    return null;
  }
  return { ...point, y };
}

function walkablePath(heightAt,start,end) {
  const steps = Math.ceil(distance(start,end)/0.28);
  for (let i = 0; i <= steps; i++) {
    if (!floorProbe(heightAt,{ x: mix(start.x,end.x,i/steps), t: mix(start.t,end.t,i/steps) })) return false;
  }
  return true;
}

function walkingExit(heightAt,start,along,across,side) {
  for (const advance of [3.2,-3.2,2,-2,4.5,-4.5]) {
    for (const inward of [0,0.25,0.45]) {
      const point = offset(offset(start,along,advance),across,side*inward);
      const floor = floorProbe(heightAt,point,0.15);
      if (floor && walkablePath(heightAt,start,point)) return floor;
    }
  }
  return null;
}

function dockHullAfloat(frame,kind,heightAt) {
  const hull = hulls[kind];
  const fore = heading(frame.yaw);
  const across = right(frame.yaw);
  if (frame.t < navigationBounds.start || frame.t > navigationBounds.end) return false;
  for (const [length,width] of hull.samples) {
    const axle = offset(frame,fore,length);
    for (const lateral of width ? [-width,0,width] : [0]) {
      const point = offset(axle,across,lateral);
      if (heightAt(point.x,point.t) >= -hull.depth) return false;
    }
  }
  return true;
}

function shoreConnection(heightAt,inlandEdge,fore,across,side) {
  for (let length = 3; length <= 15; length += 0.20) {
    const landing = offset(inlandEdge,across,side*length);
    const shore = floorProbe(heightAt,landing,0.28);
    if (!shore || shore.y > deckY+0.14) continue;
    const footExit = walkingExit(heightAt,shore,fore,across,side);
    if (!footExit) continue;
    const steps = Math.ceil(length/0.22);
    let rampClear = true;
    for (let step = 0; step <= steps && rampClear; step++) {
      const u = step/steps;
      const y = mix(deckY,shore.y+0.02,u);
      const point = offset(inlandEdge,across,side*length*u);
      for (const width of [-rampWidth*0.5,0,rampWidth*0.5]) {
        const plank = offset(point,fore,width);
        if (heightAt(plank.x,plank.t) > y+0.012) rampClear = false;
      }
    }
    if (rampClear) return { shore, footExit };
  }
  return null;
}

function makeDock(heightAt,id,label,wood,side) {
  const fore = heading(wood.yaw);
  const across = right(wood.yaw);
  const headOffset = hulls.wood.beam+berthGap+headWidth*0.5;
  const center = offset(wood,across,side*headOffset);
  const inlandEdge = { ...offset(center,across,side*headWidth*0.5), y: deckY };
  const connection = shoreConnection(heightAt,inlandEdge,fore,across,side);
  if (!connection) return null;
  const fast = { ...offset(wood,across,-side*(hulls.fast.beam-hulls.wood.beam)), yaw: wood.yaw, speed: 0 };
  if (!dockHullAfloat(wood,'wood',heightAt) || !dockHullAfloat(fast,'fast',heightAt)) return null;
  const { shore, footExit } = connection;
  const exitYaw = Math.atan2(footExit.x-shore.x,footExit.t-shore.t);
  const deckSegments = [
    { start: { ...shore,y: shore.y+0.02 }, end: inlandEdge, width: rampWidth },
    { start: { ...offset(center,fore,-headHalfLength),y: deckY },
      end: { ...offset(center,fore,headHalfLength),y: deckY }, width: headWidth },
  ];
  const boarding = { ...offset(center,across,-side*(headWidth*0.5-0.10)), y: deckY };
  const berths = { wood, fast };
  const dock = {
    id, label, side, deckSegments, boarding,
    shore: { ...shore,yaw: exitYaw,pitch: -0.03,lift: 2.04 },
    footExit: { ...footExit,yaw: exitYaw,pitch: -0.03,lift: 2.04 },
    berths,
    approaches: {},
  };
  for (const kind of ['wood','fast']) {
    const berth = berths[kind];
    const check = [11,13,15].flatMap((length) => [1.25,2.2,3.5].map((width) => ({
      ...offset(offset(berth,fore,-length),across,-side*width), yaw: berth.yaw, speed: 1.15,
    })));
    dock.approaches[kind] = check.find((frame) => planDockApproach(dock,frame,kind,heightAt)) ?? null;
  }
  return dock.approaches.wood && dock.approaches.fast ? dock : null;
}

export function buildDockLayout(heightAt) {
  const launchWood = sampleCruise(CRUISE_BOARDING_TIME).boat;
  const returnWood = sampleCruise(CRUISE_DURATION).boat;
  return [
    makeDock(heightAt,'origin','浅滩码头',launchWood,-1),
    makeDock(heightAt,'return','宽湾码头',returnWood,-1),
  ].filter(Boolean);
}

export function dockSurfaceAt(docks,x,t) {
  let floor = null;
  for (const dock of docks) {
    for (const { start,end,width } of dock.deckSegments) {
      const dx = end.x-start.x;
      const dt = end.t-start.t;
      const length = Math.hypot(dx,dt);
      const u = ((x-start.x)*dx+(t-start.t)*dt)/(length*length);
      const across = ((x-start.x)*dt-(t-start.t)*dx)/length;
      if (u >= -1e-7 && u <= 1+1e-7 && Math.abs(across) <= width*0.5) {
        floor = Math.max(floor ?? -Infinity,mix(start.y,end.y,clamp(u,0,1)));
      }
    }
  }
  return floor;
}

export function nearestDock(docks,vessel,kind = 'wood') {
  let nearest = null;
  let best = Infinity;
  for (const dock of docks) {
    const separation = distance(dock.berths[kind],vessel);
    if (separation < best) {
      best = separation;
      nearest = dock;
    }
  }
  return nearest;
}

export function isAtBerth(dock,vessel,kind = 'wood') {
  const berth = dock?.berths[kind];
  if (!berth || !finiteVessel(vessel) || Math.abs(vessel.speed) > MAX_DOCKED_SPEED) return false;
  return distance(vessel,berth) < 0.70 && Math.abs(angleDifference(vessel.yaw,berth.yaw)) < 0.25;
}

export function findDryLanding(docks,pose,heightAt) {
  const nearDock = nearestDock(docks,pose);
  if (nearDock && Math.abs(nearDock.footExit.t-pose.t) <= 28) return nearDock.footExit;
  const closeSide = Math.abs(pose.x-riverBank(pose.t,-1)) < Math.abs(pose.x-riverBank(pose.t,1)) ? -1 : 1;
  for (const delta of [0,-4,4,-9,9,-16,16,-25,25,-42,42]) {
    const t = clamp(pose.t+delta,navigationBounds.start+2,navigationBounds.end-2);
    for (const side of [closeSide,-closeSide]) {
      const x = riverBank(t,side);
      const yaw = Math.atan2(riverBank(t+2,side)-riverBank(t-2,side),4);
      const fore = heading(yaw);
      const across = right(yaw);
      for (let inward = 0; inward <= 8; inward += 0.45) {
        const floor = floorProbe(heightAt,offset({ x,t },across,side*inward),0.19);
        if (floor && walkingExit(heightAt,floor,fore,across,side)) {
          return { ...floor, yaw, pitch: -0.05, lift: 2.04 };
        }
      }
    }
  }
  return nearDock?.footExit ?? null;
}

function curvePoint(points,u) {
  const [a,b,c,d] = points;
  const v = 1-u;
  const weights = [v*v*v,3*v*v*u,3*v*u*u,u*u*u];
  return {
    x: a.x*weights[0]+b.x*weights[1]+c.x*weights[2]+d.x*weights[3],
    t: a.t*weights[0]+b.t*weights[1]+c.t*weights[2]+d.t*weights[3],
  };
}

function curveYaw([a,b,c,d],u) {
  const v = 1-u;
  const dx = (b.x-a.x)*v*v+2*(c.x-b.x)*v*u+(d.x-c.x)*u*u;
  const dt = (b.t-a.t)*v*v+2*(c.t-b.t)*v*u+(d.t-c.t)*u*u;
  return Math.atan2(dx,dt);
}

function makeLeg(from,to,handleFraction) {
  const span = distance(from,to);
  if (span < 0.04) return null;
  const handle = clamp(span*handleFraction,0.06,6);
  const points = [from,offset(from,heading(from.yaw),handle),offset(to,heading(to.yaw),-handle),to];
  const divisions = Math.max(42,Math.ceil(span/0.15));
  const lengths = [0];
  let previous = from;
  for (let i = 1; i <= divisions; i++) {
    const point = curvePoint(points,i/divisions);
    lengths.push(lengths.at(-1)+distance(previous,point));
    previous = point;
  }
  const length = lengths.at(-1);
  const duration = Math.max(0.65,2*length/Math.max(0.6,from.speed+to.speed+1.65));
  return { from,to,points,lengths,length,duration };
}

function curveUAtDistance(lengths,s) {
  let left = 0;
  let right = lengths.length-1;
  while (right-left > 1) {
    const middle = (left+right) >> 1;
    if (lengths[middle] <= s) left = middle;
    else right = middle;
  }
  const u = (s-lengths[left])/Math.max(0.00001,lengths[right]-lengths[left]);
  return (left+u)/(lengths.length-1);
}

function sampleLeg(leg,elapsed) {
  const { from,to,length,lengths,points,duration } = leg;
  if (elapsed <= 0) return from;
  if (elapsed >= duration) return to;
  const u = elapsed/duration;
  const a = (from.speed+to.speed)*duration-2*length;
  const b = 3*length-(2*from.speed+to.speed)*duration;
  const start = from.speed*duration;
  const s = u*(start+u*(b+u*a));
  const speed = (start+u*(2*b+u*3*a))/duration;
  const q = curveUAtDistance(lengths,clamp(s,0,length));
  return { ...curvePoint(points,q), yaw: curveYaw(points,q), speed };
}

function validateLeg(leg,safe) {
  if (!leg || leg.duration > 24) return false;
  const count = Math.ceil(leg.duration*30);
  const dt = leg.duration/count;
  let prior = leg.from;
  for (let i = 0; i <= count; i++) {
    const frame = sampleLeg(leg,i*dt);
    if (frame.speed < -0.001 || frame.speed > DOCK_ASSIST_SPEED+0.12
      || Math.abs(frame.speed-prior.speed) > 3.1*dt
      || Math.abs(angleDifference(prior.yaw,frame.yaw)) > 0.96*dt
      || !safe(frame)) return false;
    prior = frame;
  }
  return true;
}

function safeLeg(from,to,safe) {
  for (const fraction of [0.30,0.40,0.21,0.50]) {
    const candidate = makeLeg(from,to,fraction);
    if (validateLeg(candidate,safe)) return candidate;
  }
  return null;
}

export function planDockApproach(dock,vessel,kind,heightAt,canFloat) {
  const stop = dock?.berths[kind];
  if (!stop || !finiteVessel(vessel) || vessel.speed < -0.05 || vessel.speed > DOCK_ASSIST_SPEED
    || distance(vessel,stop) > DOCK_ASSIST_DISTANCE) return null;
  const from = { ...vessel, speed: Math.max(0,vessel.speed) };
  const floorAt = (x,t) => Math.max(heightAt(x,t),dockSurfaceAt([dock],x,t) ?? -Infinity);
  const safe = (frame) => dockHullAfloat(frame,kind,floorAt) && (!canFloat || canFloat(frame));
  if (!safe(from) || !safe(stop)) return null;
  if (distance(from,stop) < 0.04 && Math.abs(angleDifference(from.yaw,stop.yaw)) < 0.01
    && from.speed < 0.04) return { stop,segments: [],duration: 0 };
  const direct = safeLeg(from,stop,safe);
  if (direct) return { stop,segments: [direct],duration: direct.duration };

  // Use the surveyed water-side entry as an intermediate waypoint if the berth is screened by the pier.
  const entry = dock.approaches[kind];
  if (!entry || distance(from,entry) > DOCK_ASSIST_DISTANCE || distance(from,entry) < 1.2) return null;
  const join = safeLeg(from,entry,safe);
  const approach = join && safeLeg(entry,stop,safe);
  return approach ? { stop,segments: [join,approach],duration: join.duration+approach.duration } : null;
}

export function sampleDockApproach(plan,elapsed) {
  for (const leg of plan.segments) {
    if (elapsed < leg.duration) return sampleLeg(leg,elapsed);
    elapsed -= leg.duration;
  }
  return plan.stop;
}

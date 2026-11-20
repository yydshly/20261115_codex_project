import { bounds, navigationBounds, riverBank, riverCenter } from './river-layout.js';
import { createFlight, stepFlight } from './flight-motion.js';
import { findDryLanding } from './docks.js';
import { findWalkablePoint } from './shore-access.js';

export const AERIAL_ENTRY_SHIFT = 56;
const AERIAL_RETURN_RADIUS = 135;
const directMargin = 23;
const previewDuration = 4.2;
const previewStep = 0.07;

const landmarks = [
  { id:'north', label:'上游峡谷', from:-320, targets:[[-240,0,0],[-219,-1,-15],[-196,1,-12]] },
  { id:'shallows', label:'浅滩与木码头', from:-125, targets:[[23,-1,4],[56,1,-17],[83,-1,-18]] },
  { id:'cliff', label:'岩壁河弯', from:105, targets:[[248,-1,-12],[267,-1,-13],[288,-1,-16]] },
  { id:'reach', label:'开阔河谷', from:370, targets:[[515,0,0],[552,-1,-12],[598,1,-15]] },
  { id:'sandbars', label:'宽湾与沙洲', from:578, targets:[[651,-1,7],[704,-1,-5],[748,1,-14]] },
  { id:'south', label:'下游河湾', from:850, targets:[[943,0,0],[971,-1,-12],[922,1,-16]] },
];
const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));
const mix = (a,b,u) => a+(b-a)*u;
const angleDelta = (a,b) => Math.atan2(Math.sin(b-a),Math.cos(b-a));
const distance = (a,b) => Math.hypot(a.x-b.x,a.t-b.t);

function riverHeading(t) {
  return Math.atan2(riverCenter(t+11)-riverCenter(t-11),22);
}

function landmarksAt(source,heightAt) {
  const choice = source.dockId === 'origin' ? landmarks[1] : source.dockId === 'return' ? landmarks[4]
    : landmarks.findLast((landmark) => source.t >= landmark.from);
  const { id,label,targets } = choice;
  return targets.map(([t,bank,offset]) => {
    const x = bank ? riverBank(t,bank)-bank*offset : riverCenter(t);
    return { id,label,x,t,y:Math.max(0,heightAt(x,t)) };
  });
}

function directionFor(source,landmark) {
  if (source.t < navigationBounds.start+100) return 1;
  if (source.t > navigationBounds.end-135 || source.dockId === 'return') return -1;
  if (source.dockId === 'origin') return 1;
  if (Math.abs(landmark.t-source.t) > 24) return Math.sign(landmark.t-source.t);
  return Math.cos(angleDelta(source.yaw,riverHeading(source.t))) < -0.48 ? -1 : 1;
}

function groundClearance(flight,heightAt) {
  const { x,t,y,yaw } = flight;
  const dx = Math.sin(yaw);
  const dt = Math.cos(yaw);
  return y-Math.max(0,heightAt(x,t),heightAt(x+dx*2.5,t+dt*2.5),heightAt(x-dx*2.5,t-dt*2.5),
    heightAt(x+dt*3.45,t-dx*3.45),heightAt(x-dt*3.45,t+dx*3.45));
}

function previewFlight(flight,heightAt) {
  const planned = { ...flight };
  let minimum = Infinity;
  let airborneStep = 0;
  let riverDeviation = 0;
  for (let time = 0; time <= previewDuration+0.001; time += previewStep) {
    minimum = Math.min(minimum,groundClearance(planned,heightAt));
    if (time <= 2.1) {
      const left = riverBank(planned.t,-1), right = riverBank(planned.t,1);
      riverDeviation += Math.max(left-planned.x,planned.x-right,0);
    }
    const altitude = planned.y;
    stepFlight(planned,{},previewStep,heightAt);
    airborneStep = Math.max(airborneStep,planned.y-altitude);
  }
  return { minimum,airborneStep,riverDeviation };
}

function buildCandidate(x,t,direction,requestedAltitude,heightAt) {
  const ahead = clamp(t+direction*107,navigationBounds.start,navigationBounds.end);
  const heading = Math.atan2(riverCenter(ahead)-x,ahead-t);
  const altitude = Math.max(54,Math.max(0,heightAt(x,t))+46,requestedAltitude);
  let flight = createFlight(x,t,heading,altitude,heightAt);
  let preview = previewFlight(flight,heightAt);
  // Raise the starting frame instead of allowing clearance correction to produce a sudden climb in view.
  if (preview.minimum < directMargin || preview.airborneStep > 0.68) {
    const extra = Math.max(6,directMargin-preview.minimum+2);
    flight = createFlight(x,t,heading,flight.y+extra,heightAt);
    preview = previewFlight(flight,heightAt);
  }
  return { flight, preview };
}

function inspectLandmarkView(flight,landmark,heightAt) {
  const span = distance(flight,landmark);
  const yaw = Math.atan2(landmark.x-flight.x,landmark.t-flight.t);
  const yawDifference = angleDelta(flight.yaw,yaw);
  const pitch = Math.atan2(landmark.y-flight.y,Math.max(1,span));
  const lookPitch = clamp(pitch*0.44,-0.25,-0.11);
  let visible = Math.abs(yawDifference) < 0.64 && pitch > -0.68;
  for (let u = 0.14; visible && u < 0.93; u += 0.097) {
    const y = mix(flight.y,landmark.y,u);
    if (heightAt(mix(flight.x,landmark.x,u),mix(flight.t,landmark.t,u)) > y-0.8) visible = false;
  }
  return {
    yaw:flight.yaw+clamp(yawDifference,-0.20,0.20),
    pitch:lookPitch,
    score:Math.abs(yawDifference)*8+Math.max(0,lookPitch-pitch-0.40)*65+(visible ? 0 : 22),
  };
}

function anyValidHome(docks,source,heightAt) {
  const dock = docks.find(({ id }) => id === source.dockId);
  if (dock) return dock.footExit;
  const foot = findWalkablePoint(heightAt,source.x,source.t);
  return foot ? { ...foot,y:heightAt(foot.x,foot.t),yaw:source.yaw,pitch:-0.05,lift:1.65 }
    : findDryLanding(docks,source,heightAt);
}

export function planAerialEntry(source,heightAt,docks = []) {
  const t = Number.isFinite(source.t) ? clamp(source.t,navigationBounds.start,navigationBounds.end) : 0;
  const x = Number.isFinite(source.x) ? clamp(source.x,bounds.left+55,bounds.right-55) : riverCenter(t);
  const start = { x,t,yaw:Number.isFinite(source.yaw) ? source.yaw : riverHeading(t),dockId:source.dockId };
  const altitude = Number.isFinite(source.altitude) ? source.altitude : 0;
  const targets = landmarksAt(start,heightAt);
  const direction = directionFor(start,targets[0]);
  const reverseSetback = clamp(102-direction*(targets[0].t-t),0,47);
  const stations = [...new Set([reverseSetback,Math.max(0,reverseSetback-16),0]
    .map((lead) => clamp(t-direction*lead,navigationBounds.start,navigationBounds.end)))];

  let best = null;
  for (const station of stations) {
    const center = riverCenter(station);
    const halfWidth = (riverBank(station,1)-riverBank(station,-1))*0.5;
    const preferred = clamp(x,center-halfWidth*0.52,center+halfWidth*0.52);
    const crossBudget = Math.sqrt(AERIAL_ENTRY_SHIFT*AERIAL_ENTRY_SHIFT-(station-t)*(station-t));
    const starts = [preferred,mix(preferred,center,0.58)];
    for (const requested of starts) {
      const entryX = clamp(requested,x-crossBudget,x+crossBudget);
      const { flight,preview } = buildCandidate(entryX,station,direction,altitude,heightAt);
      const horizontalShift = distance(start,flight);
      const risk = horizontalShift*0.21+flight.y*0.10+preview.riverDeviation*0.026
        + Math.max(0,directMargin-preview.minimum)*18+Math.max(0,preview.airborneStep-0.65)*60;
      for (const landmark of targets) {
        const view = inspectLandmarkView(flight,landmark,heightAt);
        const score = risk+view.score+Math.abs(landmark.t-targets[0].t)*0.025;
        if (!best || score < best.score) best = { flight,preview,view,landmark,horizontalShift,score };
      }
    }
  }
  const { flight,preview,view,landmark,horizontalShift } = best;
  return {
    flight,landmark,look:{ yaw:view.yaw,pitch:view.pitch },
    returnPose:anyValidHome(docks,start,heightAt),start,horizontalShift,sampledClearance:preview.minimum,
  };
}

export function resolveAerialReturn(flight,entry,docks,heightAt) {
  if (entry?.returnPose && distance(entry.start,flight) <= AERIAL_RETURN_RADIUS) return entry.returnPose;
  // Project onto the nearest side of the same reach instead of sampling the distant scenery mesh.
  const t = clamp(flight.t,navigationBounds.start,navigationBounds.end);
  const x = clamp(flight.x,riverBank(t,-1),riverBank(t,1));
  return findDryLanding(docks,{ x,t },heightAt) ?? entry?.returnPose ?? null;
}

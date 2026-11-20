import { stepFlight } from './flight-motion.js';
import { riverBank, riverCenter } from './river-layout.js';

const chapters = [
  { id:'air-sandbars', label:'俯瞰宽湾与沙洲', x:riverBank(651,-1)+7, t:651 },
  { id:'air-reach', label:'越过开阔河谷', x:riverCenter(484), t:484 },
  { id:'air-cliff', label:'从空中重看岩壁河弯', x:riverBank(247,-1)-3, t:247 },
  { id:'air-shallows', label:'回望浅滩与出发岸', x:riverBank(22,-1)+3, t:22 },
  { id:'air-gorge', label:'飞过上游峡口', x:riverCenter(-194), t:-194 },
  { id:'air-turn', label:'绕过山脊', x:161, t:-104 },
  { id:'air-valley', label:'回望整段河谷', x:riverCenter(425), t:425 },
];

// Each station supplies x, valley distance, preferred flight altitude and chapter index.
// The aircraft banks above the valley with wider turns than the boat below.
const stations = [
  [riverCenter(672)-17,672,126,0],
  [riverCenter(552)-8,552,121,1],
  [riverCenter(440)-19,440,115,2],
  [riverCenter(305)-14,305,108,2],
  [riverCenter(193)+5,193,108,3],
  [riverCenter(55)+7,55,117,3],
  [43,-75,128,4],
  [81,-157,140,4],
  [143,-197,147,5],
  [203,-155,144,5],
  [226,-65,140,6],
  [198,58,142,6],
  [142,177,151,6],
  [76,287,154,6],
  [30,377,156,6],
];

const clamp = (value, low, high) => Math.min(high,Math.max(low,value));
const angleDelta = (from, to) => Math.atan2(Math.sin(to-from),Math.cos(to-from));
const distance = (a,b) => Math.hypot(a.x-b.x,a.t-b.t);

function catmull(a,b,c,d,u) {
  return b + 0.5*u*(c-a + u*(2*a-5*b+4*c-d + u*(3*(b-c)+d-a)));
}

function buildRoute(flight) {
  const start = [flight.x,flight.t,flight.y,0];
  const points = [start,...stations];
  // Match the take-over heading and a neutral bank while blending onto the plotted route.
  const behind = [flight.x-116*Math.sin(flight.yaw), flight.t-116*Math.cos(flight.yaw), flight.y];
  const route = [{ x:flight.x, t:flight.t, y:flight.y, chapter:0, distance:0 }];
  for (let i = 0; i < points.length-1; i++) {
    const a = points[i-1] ?? behind;
    const b = points[i];
    const c = points[i+1];
    const d = points[i+2] ?? c.map((value, axis) => value+(value-b[axis]));
    for (let n = 1; n <= 24; n++) {
      const u = n/24;
      const next = {
        x:catmull(a[0],b[0],c[0],d[0],u),
        t:catmull(a[1],b[1],c[1],d[1],u),
        y:catmull(a[2],b[2],c[2],d[2],u),
        chapter:u < 0.55 ? b[3] : c[3],
      };
      const previous = route.at(-1);
      next.distance = previous.distance + distance(previous,next);
      route.push(next);
    }
  }
  return route;
}

export function createGuidedFlight(flight) {
  const route = buildRoute(flight);
  const chapter = chapters[0];
  return {
    route, nearest:0, elapsed:0, complete:false, chapter,
    ...chapterLook(chapter,flight,0),
  };
}

function findNearest(guide, flight) {
  const { route,nearest } = guide;
  let nearestIndex = nearest;
  let nearestDistance = distance(route[nearest],flight);
  // Scan an advancing window so the returning leg cannot skip across a valley bend.
  const end = Math.min(nearest+23,route.length-1);
  for (let i = nearest+1; i <= end; i++) {
    const separation = distance(route[i],flight);
    if (separation >= nearestDistance) continue;
    nearestIndex = i;
    nearestDistance = separation;
  }
  return nearestIndex;
}

function pointAhead(route,nearest,meters) {
  const distanceAhead = route[nearest].distance+meters;
  let i = nearest;
  while (i < route.length-1 && route[i].distance < distanceAhead) i++;
  if (i === nearest || route[i].distance < distanceAhead) return route[i];
  const a = route[i-1], b = route[i];
  const u = (distanceAhead-a.distance)/(b.distance-a.distance);
  return { x:a.x+(b.x-a.x)*u, t:a.t+(b.t-a.t)*u, y:a.y+(b.y-a.y)*u };
}

function chapterLook({ x,t },flight,targetHeight) {
  const horizontal = Math.hypot(x-flight.x,t-flight.t);
  const azimuth = angleDelta(flight.yaw,Math.atan2(x-flight.x,t-flight.t));
  const weight = clamp((horizontal-48)/55,0,1)*clamp((1.0-Math.abs(azimuth))/0.48,0,1);
  const elevation = Math.atan2(flight.y-targetHeight,horizontal);
  return {
    lookYaw:clamp(azimuth*1.35,-0.46,0.46)*weight,
    lookPitch:0.13+clamp((elevation-0.28)*1.22,-0.08,0.30)*weight,
  };
}

function updateLook(guide,flight,seconds,heightAt) {
  const { x,t } = guide.chapter;
  const { lookYaw,lookPitch } = chapterLook(guide.chapter,flight,Math.max(0,heightAt(x,t)));
  const blend = 1-Math.exp(-seconds*1.7);
  guide.lookYaw += (lookYaw-guide.lookYaw)*blend;
  guide.lookPitch += (lookPitch-guide.lookPitch)*blend;
}

export function stepGuidedFlight(guide,flight,seconds,heightAt) {
  if (guide.complete || !(seconds > 0) || !Number.isFinite(seconds)) return guide;
  const dt = Math.min(seconds,0.25);
  const { route } = guide;
  const nearest = findNearest(guide,flight);
  const ahead = pointAhead(route,nearest,41);
  const heading = Math.atan2(ahead.x-flight.x,ahead.t-flight.t);
  const steer = clamp(angleDelta(flight.yaw,heading)*2.2,-0.88,0.88);
  const climb = clamp((ahead.y-flight.y)*0.036,-0.57,0.62);
  stepFlight(flight,{ throttle:-0.88, steer, climb },dt,heightAt);
  guide.elapsed += dt;
  guide.nearest = nearest;
  guide.chapter = chapters[route[nearest].chapter];
  updateLook(guide,flight,dt,heightAt);
  guide.complete = nearest >= route.length-2;
  return guide;
}

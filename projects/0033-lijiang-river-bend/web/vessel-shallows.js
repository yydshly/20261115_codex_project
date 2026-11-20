import { bounds, navigationBounds, riverBank, riverCenter } from './river-layout.js';

const stepLimit = 1/60;
const stopSpeed = 0.025;
const sweepSpacing = 0.22;
const endBuffer = 2.85;

// Offsets are along/athwart the hull, with positive along facing the bow.
// The last stern probes include the outboard skeg and moving propeller.
const hulls = {
  wood: {
    ahead: 7.3, astern: 2.3, acceleration: 2.4, deceleration: 3, response: 0.86, coast: 0.46,
    turnRate: 0.73, turnSpeed: 2.3, turnDrag: 0.087, braking: 3.1, softDepth: 0.88, sideDrag: 0.95,
    probes: [[2.38,0,0.14],[1.33,0,0.24],[0,0,0.30],[-1.1,0,0.25],[-2.62,0,0.33],
      [1.18,-0.42,0.20],[1.18,0.42,0.20],[0,-0.59,0.18],[0,0.59,0.18],
      [-1.72,-0.40,0.20],[-1.72,0.40,0.20],[-2.51,-0.16,0.31],[-2.51,0.16,0.31]],
  },
  runabout: {
    ahead: 21.5, astern: 4.2, acceleration: 8.1, deceleration: 10, response: 1.12, coast: 1.25,
    turnRate: 0.96, turnSpeed: 3.5, turnDrag: 0.048, braking: 9.6, softDepth: 1.42, sideDrag: 1.35,
    probes: [[2.61,0,0.12],[1.51,0,0.26],[0.24,0,0.37],[-1.33,0,0.35],[-2.59,0,0.43],
      [1.40,-0.69,0.21],[1.40,0.69,0.21],[0,-0.87,0.25],[0,0.87,0.25],
      [-1.79,-0.69,0.31],[-1.79,0.69,0.31],[-2.53,-0.20,0.41],[-2.53,0.20,0.41]],
  },
};

function clamp(value, low, high) {
  return Math.max(low,Math.min(high,value));
}

function smooth(low, high, value) {
  const u = clamp((value-low)/(high-low),0,1);
  return u*u*(3-2*u);
}

function limitAlongReach(t, velocity, braking) {
  const room = velocity > 0 ? navigationBounds.end-t : t-navigationBounds.start;
  const cap = Math.sqrt(2*braking*Math.max(0,room-endBuffer-0.30));
  return Math.sign(velocity)*Math.min(Math.abs(velocity),cap);
}

export function createVesselNavigation(heightAt) {
  function depthMargin(x, t, fx, ft, hull) {
    let clearance = Infinity;
    for (const [along, across, draft] of hull.probes) {
      const px = x+fx*along+ft*across;
      const pt = t+ft*along-fx*across;
      clearance = Math.min(clearance,-heightAt(px,pt)-draft);
    }
    return clearance;
  }

  function margin(x, t, fx, ft, hull) {
    const border = Math.min(t-navigationBounds.start,navigationBounds.end-t,x-bounds.left,bounds.right-x)-endBuffer;
    return Math.min(depthMargin(x,t,fx,ft,hull),border);
  }

  function clearance(pose, kind) {
    return margin(pose.x,pose.t,Math.sin(pose.yaw),Math.cos(pose.yaw),hulls[kind]);
  }

  function deeperDirection(x, t, fx, ft, hull, radius) {
    const gx = depthMargin(x+radius,t,fx,ft,hull)-depthMargin(x-radius,t,fx,ft,hull);
    const gt = depthMargin(x,t+radius,fx,ft,hull)-depthMargin(x,t-radius,fx,ft,hull);
    const length = Math.hypot(gx,gt);
    return length > 0.002 ? [gx/length,gt/length] : null;
  }

  function forecast(x, t, dx, dt, fx, ft, speed, depth, hull) {
    const horizon = 0.9 + speed*0.27 + speed*speed/(2*hull.braking);
    const sweeps = Math.ceil(horizon/1.18);
    let previous = depth;
    for (let i = 1; i <= sweeps; i++) {
      const distance = horizon*i/sweeps;
      const next = depthMargin(x+dx*distance,t+dt*distance,fx,ft,hull);
      if (next < 0) {
        const fraction = previous > 0 ? previous/(previous-next) : 0;
        return distance-horizon*(1-fraction)/sweeps;
      }
      previous = next;
    }
    return Infinity;
  }

  function sweptFraction(pose, dx, dt, turn, hull) {
    const parts = Math.max(1,Math.ceil((Math.hypot(dx,dt)+Math.abs(turn)*endBuffer)/sweepSpacing));
    function safeAt(fraction) {
      const angle = pose.yaw+turn*fraction;
      return margin(pose.x+dx*fraction,pose.t+dt*fraction,Math.sin(angle),Math.cos(angle),hull) >= 0;
    }
    for (let i = 1; i <= parts; i++) {
      if (safeAt(i/parts)) continue;
      let safe = (i-1)/parts;
      let blocked = i/parts;
      for (let iteration = 0; iteration < 7; iteration++) {
        const midpoint = (safe+blocked)*0.5;
        if (safeAt(midpoint)) safe = midpoint;
        else blocked = midpoint;
      }
      return safe;
    }
    return 1;
  }

  function advance(result, seconds, throttle, steering, hull) {
    const oldForwardX = Math.sin(result.yaw);
    const oldForwardT = Math.cos(result.yaw);
    const previousX = result.velocityX ?? oldForwardX*result.speed;
    const previousT = result.velocityT ?? oldForwardT*result.speed;
    const axial = previousX*oldForwardX+previousT*oldForwardT;
    const drift = (previousX*oldForwardT-previousT*oldForwardX)*Math.exp(-hull.sideDrag*seconds);
    const desiredSpeed = throttle < 0 ? hull.astern*throttle : hull.ahead*throttle;
    const response = throttle ? hull.response : hull.coast;
    const gain = (desiredSpeed-axial)*(1-Math.exp(-seconds*response));
    const speed = axial+clamp(gain,-hull.deceleration*seconds,hull.acceleration*seconds);
    const speedFloor = throttle ? 0.001 : stopSpeed;
    result.shoreLimited = false;
    result.endLimited = false;
    if (Math.hypot(speed,drift) < speedFloor) {
      result.speed = 0;
      result.velocityX = 0;
      result.velocityT = 0;
      return;
    }

    const direction = speed < 0 ? -1 : 1;
    const axialMagnitude = Math.abs(speed);
    const steeringAtSpeed = hull.turnRate*smooth(0.07,hull.turnSpeed,axialMagnitude)/(1+axialMagnitude*hull.turnDrag);
    const turn = steering*steeringAtSpeed*direction*seconds;
    const yaw = result.yaw+turn;
    const fx = Math.sin(yaw);
    const ft = Math.cos(yaw);
    let vx = fx*speed+ft*drift;
    let vt = ft*speed-fx*drift;
    // End limits have a fixed longitudinal normal, independent from the local bank slope.
    const bounded = limitAlongReach(result.t,vt,hull.braking);
    result.endLimited = bounded !== vt;
    vt = bounded;
    const magnitude = Math.hypot(vx,vt);
    if (magnitude < speedFloor) {
      result.speed = 0;
      result.velocityX = 0;
      result.velocityT = 0;
      return;
    }
    const dx = vx/magnitude;
    const dt = vt/magnitude;
    const localDepth = depthMargin(result.x,result.t,fx,ft,hull);
    const distance = forecast(result.x,result.t,dx,dt,fx,ft,magnitude,localDepth,hull);

    if (localDepth < hull.softDepth || Number.isFinite(distance)) {
      // Probe on both sides of the threatened footprint to find the direction of deeper water.
      const ahead = Number.isFinite(distance) ? Math.max(0,distance) : 0;
      const x = result.x+dx*ahead;
      const t = result.t+dt*ahead;
      const [normalX,normalT] = deeperDirection(x,t,fx,ft,hull,1.25)
        ?? (Number.isFinite(distance) ? [-dx,-dt] : [0,0]);
      const inward = -(dx*normalX+dt*normalT);
      if (inward > 0) {
        const approachSpeed = magnitude*inward;
        const usableDistance = Math.max(0,distance-0.30);
        const brakingCap = Math.sqrt(2*hull.braking*usableDistance)*inward;
        const depthCap = hull.ahead*smooth(0.015,hull.softDepth,localDepth);
        const target = Math.min(brakingCap,depthCap);
        const removed = Math.max(0,approachSpeed-target);
        // Retain the tangential component and never slow a boat already moving away from the bank.
        vx += normalX*removed;
        vt += normalT*removed;
        result.shoreLimited ||= removed > 0.004;

        // Around a bend the redirected path can meet a second rock or the other edge of a shoal.
        // Give the projected lane its own braking distance before spending this step on it.
        const redirected = Math.hypot(vx,vt);
        if (removed > 0.004 && redirected > 0.05) {
          const room = forecast(result.x,result.t,vx/redirected,vt/redirected,fx,ft,redirected,localDepth,hull);
          const cap = Math.sqrt(2*hull.braking*Math.max(0,room-0.30));
          const limit = Math.min(1,cap/redirected);
          vx *= limit;
          vt *= limit;
        }
      }
    }

    const redirectedAlong = limitAlongReach(result.t,vt,hull.braking);
    result.endLimited ||= redirectedAlong !== vt;
    vt = redirectedAlong;
    const moveX = vx*seconds;
    const moveT = vt*seconds;
    const fraction = sweptFraction(result,moveX,moveT,turn,hull);
    result.x += moveX*fraction;
    result.t += moveT*fraction;
    result.yaw += turn*fraction;
    let endX = vx*fraction;
    let endT = vt*fraction;
    if (fraction < 1) {
      const normal = deeperDirection(result.x,result.t,Math.sin(result.yaw),Math.cos(result.yaw),hull,0.34);
      if (normal) {
        const [nx,nt] = normal;
        const inward = Math.max(0,-vx*nx-vt*nt);
        const slidingX = vx+nx*inward;
        const slidingT = limitAlongReach(result.t,vt+nt*inward,hull.braking);
        const remaining = seconds*(1-fraction);
        const slide = sweptFraction(result,slidingX*remaining,slidingT*remaining,0,hull);
        result.x += slidingX*remaining*slide;
        result.t += slidingT*remaining*slide;
        endX = slidingX*slide;
        endT = slidingT*slide;
      }
    }
    const realized = Math.hypot(endX,endT);
    result.speed = realized < speedFloor ? 0 : realized*direction;
    result.velocityX = result.speed === 0 ? 0 : endX;
    result.velocityT = result.speed === 0 ? 0 : endT;
    result.shoreLimited ||= fraction < 1;
  }

  return {
    clearance,
    isAfloat(pose, kind) { return clearance(pose,kind) >= 0; },
    step(pose, seconds, throttle, steering, kind) {
      if (!(seconds > 0)) return pose;
      const elapsed = Math.min(seconds,0.24);
      const steps = Math.max(1,Math.ceil(elapsed/stepLimit-1e-8));
      const result = { ...pose };
      for (let i = 0; i < steps; i++) {
        advance(result,elapsed/steps,clamp(throttle,-1,1),clamp(steering,-1,1),hulls[kind]);
      }
      return result;
    },
    safeLaunch(pose, kind) {
      if (clearance(pose,kind) >= 0) return pose;
      const inset = endBuffer+0.5;
      const t = clamp(pose.t,navigationBounds.start+inset,navigationBounds.end-inset);
      const left = riverBank(t,-1);
      const right = riverBank(t,1);
      const center = (left+right)*0.5;
      const from = clamp(pose.x,left,right);
      const steps = Math.max(1,Math.ceil(Math.abs(center-from)/0.48));
      const candidate = { ...pose, t, speed: 0, velocityX: 0, velocityT: 0, shoreLimited: false, endLimited: false };
      for (let i = 0; i <= steps; i++) {
        candidate.x = from+(center-from)*i/steps;
        if (clearance(candidate,kind) >= 0.18) return candidate;
      }
      const flow = Math.atan2(riverCenter(t+2)-riverCenter(t-2),4);
      candidate.yaw = flow+(Math.cos(pose.yaw-flow) < 0 ? Math.PI : 0);
      return clearance(candidate,kind) >= 0 ? candidate : null;
    },
  };
}

import { bounds, navigationBounds } from './river-layout.js';

const flightBounds = {
  left: bounds.left + 55,
  right: bounds.right - 55,
  start: navigationBounds.start,
  end: navigationBounds.end,
};
const cruiseSpeed = 34;
const slowSpeed = 25;
const boostSpeed = 63;
const clearance = 18;
const forecastClearance = 20;
const maxBank = 0.83;
const maxClimb = 9;
const maxDescent = 7;
const predictionTimes = [0.45, 0.9, 1.45, 2.1, 2.85, 3.75, 4.8, 6, 7.35, 8.85, 10.5, 12.25];
const gravity = 9.81;
const clearanceFields = new WeakMap();
const fieldStep = 12;
const uphillGrade = 0.30;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smooth(start, end, value) {
  const u = clamp((value-start)/(end-start), 0, 1);
  return u*u*(3-2*u);
}

function approach(value, target, speed, seconds) {
  return value + (target-value)*(1-Math.exp(-speed*seconds));
}

function angleDelta(from, to) {
  return Math.atan2(Math.sin(to-from), Math.cos(to-from));
}

function groundAt(heightAt, x, t) {
  return Math.max(0, heightAt(x, t));
}

function airframeGround(heightAt, x, t, yaw) {
  const forwardX = Math.sin(yaw)*2.5;
  const forwardT = Math.cos(yaw)*2.5;
  const wingX = Math.cos(yaw)*3.45;
  const wingT = -Math.sin(yaw)*3.45;
  return Math.max(
    groundAt(heightAt, x, t),
    groundAt(heightAt, x+forwardX, t+forwardT),
    groundAt(heightAt, x-forwardX, t-forwardT),
    groundAt(heightAt, x+wingX, t+wingT),
    groundAt(heightAt, x-wingX, t-wingT),
  );
}

function surveyClearance(heightAt) {
  const { left, right, start, end } = flightBounds;
  const columns = Math.ceil((right-left)/fieldStep)+1;
  const rows = Math.ceil((end-start)/fieldStep)+1;
  const heights = new Float32Array(columns*rows);
  const halfCell = fieldStep/2;
  for (let row = 0; row < rows; row++) {
    const t = start + row*fieldStep;
    for (let col = 0; col < columns; col++) {
      const x = left + col*fieldStep;
      let peak = 0;
      for (const dx of [-halfCell, 0, halfCell]) {
        for (const dt of [-halfCell, 0, halfCell]) {
          peak = Math.max(peak, groundAt(heightAt, x+dx, t+dt));
        }
      }
      heights[row*columns + col] = peak + clearance;
    }
  }

  // Propagate ridge heights outward on a climbable grade. This safety floor varies
  // smoothly over the map rather than copying the steep slope directly beneath the craft.
  const travel = uphillGrade*fieldStep;
  const diagonal = travel*Math.SQRT2;
  for (const direction of [1, -1]) {
    for (let r = 0; r < rows; r++) {
      const row = direction > 0 ? r : rows-1-r;
      const previousRow = row-direction;
      for (let c = 0; c < columns; c++) {
        const col = direction > 0 ? c : columns-1-c;
        const index = row*columns + col;
        if (c > 0) heights[index] = Math.max(heights[index], heights[index-direction]-travel);
        if (r === 0) continue;
        const above = previousRow*columns + col;
        heights[index] = Math.max(heights[index], heights[above]-travel);
        if (col > 0) heights[index] = Math.max(heights[index], heights[above-1]-diagonal);
        if (col+1 < columns) heights[index] = Math.max(heights[index], heights[above+1]-diagonal);
      }
    }
  }
  return { columns, rows, heights };
}

function terrainClearanceAt(heightAt, x, t) {
  let field = clearanceFields.get(heightAt);
  if (!field) {
    field = surveyClearance(heightAt);
    clearanceFields.set(heightAt, field);
  }
  const { columns, rows, heights } = field;
  const u = clamp((x-flightBounds.left)/fieldStep, 0, columns-1.00001);
  const v = clamp((t-flightBounds.start)/fieldStep, 0, rows-1.00001);
  const col = Math.floor(u);
  const row = Math.floor(v);
  const i = row*columns + col;
  const blendX = u-col;
  const blendT = v-row;
  const near = heights[i]*(1-blendX) + heights[i+1]*blendX;
  const far = heights[i+columns]*(1-blendX) + heights[i+columns+1]*blendX;
  return near*(1-blendT) + far*blendT;
}

function boundaryGuidance(flight) {
  // A fast aircraft needs more room to turn, so begin its return farther from the edge.
  const turnRadius = flight.speed**2/(gravity*Math.tan(maxBank));
  const approachZone = clamp(turnRadius + flight.speed*2.4, 92, 345);
  const { left, right, start, end } = flightBounds;
  const west = 1 - smooth(0, approachZone, flight.x-left);
  const east = 1 - smooth(0, approachZone, right-flight.x);
  const south = 1 - smooth(0, approachZone, flight.t-start);
  const north = 1 - smooth(0, approachZone, end-flight.t);
  const inwardX = west-east;
  const inwardT = south-north;
  const pressure = Math.max(west, east, south, north);
  const outward = -(inwardX*Math.sin(flight.yaw) + inwardT*Math.cos(flight.yaw));
  const heading = Math.atan2(inwardX, inwardT);
  const turn = clamp(angleDelta(flight.yaw, heading)/0.75, -1, 1);
  return {
    heading,
    turn,
    weight: smooth(0.035, 0.54, pressure) * smooth(-0.68, 0.05, outward),
    speedLimit: boostSpeed - (boostSpeed-slowSpeed)*smooth(0.012, 0.52, outward),
  };
}

function forecastGround(flight, yawRate, time, heightAt) {
  const halfTurn = yawRate*time*0.5;
  const chord = flight.speed*time * (Math.abs(halfTurn) < 0.00001 ? 1 : Math.sin(halfTurn)/halfTurn);
  const heading = flight.yaw+halfTurn;
  const x = clamp(flight.x+Math.sin(heading)*chord, flightBounds.left, flightBounds.right);
  const t = clamp(flight.t+Math.cos(heading)*chord, flightBounds.start, flightBounds.end);
  return Math.max(airframeGround(heightAt, x, t, flight.yaw+2*halfTurn) + forecastClearance,
    terrainClearanceAt(heightAt, x, t) + 4);
}

function climbForTerrain(flight, yawRate, heightAt) {
  const floor = terrainClearanceAt(heightAt, flight.x, flight.t);
  let needed = (floor + 3 - flight.y)/0.6;
  for (const time of predictionTimes) {
    let ground = forecastGround(flight, yawRate, time, heightAt);
    if (time <= 2.2 && Math.abs(yawRate) > 0.01) {
      ground = Math.max(ground, forecastGround(flight, 0, time, heightAt));
    }
    needed = Math.max(needed, (ground - flight.y)/(time*0.78+0.3));
  }
  return needed + 0.24;
}

export function createFlight(x, t, heading, altitude, heightAt) {
  const flight = {
    x: clamp(x, flightBounds.left, flightBounds.right),
    t: clamp(t, flightBounds.start, flightBounds.end),
    y: Number.isFinite(altitude) ? altitude : 58,
    yaw: heading,
    pitch: 0.025,
    roll: 0,
    speed: cruiseSpeed,
    verticalSpeed: 0,
  };
  const { left, right, start, end } = flightBounds;
  const nearestEdge = Math.min(flight.x-left, right-flight.x, flight.t-start, end-flight.t);
  const entry = boundaryGuidance(flight);
  if (nearestEdge < 45 && entry.weight > 0.85) flight.yaw = entry.heading;
  flight.y = Math.max(flight.y, terrainClearanceAt(heightAt, flight.x, flight.t) + 4,
    airframeGround(heightAt, flight.x, flight.t, flight.yaw) + forecastClearance);
  for (const time of predictionTimes) {
    flight.y = Math.max(flight.y, forecastGround(flight, 0, time, heightAt) - 5.8*time);
  }
  return flight;
}

function advance(flight, input, seconds, heightAt) {
  const guidance = boundaryGuidance(flight);
  const manualSpeed = input.throttle < 0
    ? cruiseSpeed + (cruiseSpeed-slowSpeed)*input.throttle
    : cruiseSpeed + (47-cruiseSpeed)*input.throttle;
  const requestedSpeed = input.boost && input.throttle >= 0 ? boostSpeed : manualSpeed;
  const steering = input.steer*(1-guidance.weight) + guidance.turn*guidance.weight;
  flight.roll = approach(flight.roll, -steering*maxBank, 3.5, seconds);
  const yawRate = -gravity*Math.tan(flight.roll)/flight.speed;
  const safeClimb = climbForTerrain(flight, yawRate, heightAt);
  const terrainLimit = boostSpeed - (boostSpeed-28)*smooth(5.0, 9.4, safeClimb);
  const targetSpeed = Math.min(requestedSpeed, Math.max(slowSpeed, guidance.speedLimit), terrainLimit);
  const speedRate = targetSpeed > flight.speed ? (input.boost ? 8.4 : 5.9) : 9.4;
  flight.speed += clamp(targetSpeed-flight.speed, -speedRate*seconds, speedRate*seconds);

  const climbSpeed = input.climb < 0 ? input.climb*maxDescent : input.climb*maxClimb;
  const verticalTarget = clamp(Math.max(climbSpeed, safeClimb), -maxDescent, maxClimb);
  flight.verticalSpeed = approach(flight.verticalSpeed, verticalTarget, 2.65, seconds);

  const heading = flight.yaw + yawRate*seconds*0.5;
  flight.x = clamp(flight.x + Math.sin(heading)*flight.speed*seconds, flightBounds.left, flightBounds.right);
  flight.t = clamp(flight.t + Math.cos(heading)*flight.speed*seconds, flightBounds.start, flightBounds.end);
  flight.yaw += yawRate*seconds;

  // Keep a last-resort clearance independent of frame rate and terrain sampling resolution.
  const ground = airframeGround(heightAt, flight.x, flight.t, flight.yaw);
  const minimum = Math.max(ground + clearance, terrainClearanceAt(heightAt, flight.x, flight.t));
  const requestedY = flight.y + flight.verticalSpeed*seconds;
  flight.y = clamp(requestedY, minimum, Math.max(280, minimum));
  if (flight.y !== requestedY) flight.verticalSpeed = 0;
  flight.pitch = approach(flight.pitch, 0.025 + Math.atan2(flight.verticalSpeed, flight.speed), 3.5, seconds);
}

export function stepFlight(flight, { throttle = 0, steer = 0, climb = 0, boost = false }, dt, heightAt) {
  if (!(dt > 0) || !Number.isFinite(dt)) return flight;
  const seconds = Math.min(dt, 0.25);
  const steps = Math.ceil(seconds/0.045);
  const input = {
    throttle: clamp(throttle, -1, 1),
    steer: clamp(steer, -1, 1),
    climb: clamp(climb, -1, 1),
    boost,
  };
  for (let i = 0; i < steps; i++) advance(flight, input, seconds/steps, heightAt);
  return flight;
}

import * as THREE from 'three';
import { bounds, riverCenter } from './river-layout.js';

const capacity = 128;
const spacing = 1.4;
const lifetime = 6.8;
const foamLife = 2.9;
const maxSpread = 32;
const size = 320;
const cellSize = 0.6;
const extent = size*cellSize;
const interval = 1/20;
const { clamp, lerp, smoothstep } = THREE.MathUtils;

function depthReader(bathymetry) {
  const { data, width, height } = bathymetry.image;
  const scaleX = width/(bounds.right-bounds.left);
  const scaleT = height/(bounds.end-bounds.start);
  const heightAt = (index) => (data[index*2]*256 + data[index*2+1])*(8/65535) - 7;
  return (x, z) => {
    const u = clamp((x-bounds.left)*scaleX-0.5,0,width-1);
    const v = clamp((-z-bounds.start)*scaleT-0.5,0,height-1);
    const i = Math.floor(u);
    const j = Math.floor(v);
    const a = j*width+i;
    const right = i < width-1 ? 1 : 0;
    const down = j < height-1 ? width : 0;
    return -lerp(lerp(heightAt(a),heightAt(a+right),u-i),
      lerp(heightAt(a+down),heightAt(a+down+right),u-i),v-j);
  };
}

function wetReach(sampleDepth, x, z, dx, dz) {
  for (let s = 0.7; s < maxSpread; s += 0.85) {
    if (sampleDepth(x+dx*s,z+dz*s) < 0.16) return s;
  }
  return maxSpread;
}

export function createWakeHistory(bathymetry) {
  const sampleDepth = depthReader(bathymetry);
  const records = Array.from({ length: capacity }, () => ({}));
  const image = new Uint8Array(size*size*4);
  for (let index = 0; index < image.length; index += 4) {
    image[index] = 128;
    image[index+1] = 128;
    image[index+3] = 255;
  }
  const texture = new THREE.DataTexture(image,size,size);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const domain = new THREE.Vector4(0,0,0,1);
  const slopes = new Float32Array(size*size*3);
  const marks = new Uint8Array(size*size);
  const touched = new Uint32Array(size*size);
  let pixelCount = 0;
  let start = 0;
  let count = 0;
  let now = 0;
  let nextDraw = 0;
  let distanceUntilNext = spacing;
  const previous = {};
  let emitting = false;

  function emit(x, z, dx, dz, heading, speed, throttle, planing, age) {
    const item = records[(start+count)%capacity];
    if (count === capacity) start = (start+1)%capacity;
    else count++;
    const t = -z;
    const grade = (riverCenter(t+2)-riverCenter(t-2))*0.25;
    const current = 0.27/Math.hypot(grade,1);
    item.x = x;
    item.z = z;
    item.dx = dx;
    item.dz = dz;
    item.flowX = grade*current;
    item.flowZ = -current;
    item.washX = -Math.sin(heading);
    item.washZ = Math.cos(heading);
    item.speed = Math.abs(speed);
    item.throttle = throttle;
    item.planing = planing;
    item.time = now-age;
    const acrossX = -dz;
    const acrossZ = dx;
    item.portLimit = wetReach(sampleDepth,x,z,-acrossX,-acrossZ);
    item.starboardLimit = wetReach(sampleDepth,x,z,acrossX,acrossZ);
  }

  function addPatch(x, z, dx, dz, alongSize, acrossSize, slope, foam) {
    const nx = -dz;
    const nz = dx;
    const radiusX = Math.hypot(alongSize*dx,acrossSize*nx);
    const radiusZ = Math.hypot(alongSize*dz,acrossSize*nz);
    const col = (x-domain.x)/cellSize-0.5;
    const row = (z-domain.y)/cellSize-0.5;
    const minX = Math.max(0,Math.ceil(col-radiusX/cellSize));
    const maxX = Math.min(size-1,Math.floor(col+radiusX/cellSize));
    const minZ = Math.max(0,Math.ceil(row-radiusZ/cellSize));
    const maxZ = Math.min(size-1,Math.floor(row+radiusZ/cellSize));
    for (let j = minZ; j <= maxZ; j++) {
      const pz = (j-row)*cellSize;
      for (let i = minX; i <= maxX; i++) {
        const px = (i-col)*cellSize;
        const u = (px*dx+pz*dz)/alongSize;
        const v = (px*nx+pz*nz)/acrossSize;
        const weight = 1-u*u-v*v;
        if (weight <= 0) continue;
        const pixel = j*size+i;
        if (!marks[pixel]) {
          marks[pixel] = 1;
          touched[pixelCount++] = pixel;
        }
        const value = weight*weight;
        const elevationSlope = -2.3*v*value*slope;
        const from = pixel*3;
        slopes[from] += elevationSlope*nx;
        slopes[from+1] += elevationSlope*nz;
        slopes[from+2] += value*foam;
      }
    }
  }

  function drawRecord(item) {
    const age = now-item.time;
    const x = item.x+item.flowX*age;
    const z = item.z+item.flowZ*age;
    const fade = (1-smoothstep(3.8,lifetime,age))*Math.exp(-age*0.235);
    const waveSpeed = 0.43 + item.speed*lerp(0.215,0.174,item.planing);
    const spread = 0.6 + age*waveSpeed;
    const fan = Math.min(0.48,waveSpeed/Math.max(1.6,item.speed));
    const fanNorm = 1/Math.hypot(1,fan);
    const acrossX = -item.dz;
    const acrossZ = item.dx;
    const wave = fade*lerp(0.064,0.15,smoothstep(item.speed,1,16));
    for (const side of [-1,1]) {
      const limit = side < 0 ? item.portLimit : item.starboardLimit;
      if (spread >= limit) continue;
      const damp = 1-smoothstep(spread,Math.max(0,limit-1.7),limit);
      addPatch(x+side*acrossX*spread,z+side*acrossZ*spread,
        (item.dx-side*acrossX*fan)*fanNorm,(item.dz-side*acrossZ*fan)*fanNorm,
        1.73+age*0.22,0.91+age*0.13,wave*damp,0);
    }
    if (age >= foamLife || item.throttle < 0.035) return;
    const foamFade = (1-smoothstep(0.7,foamLife,age))*Math.exp(-age*0.46);
    const travel = 0.32 + age*(0.3+item.throttle*0.39);
    const foam = item.throttle*foamFade*lerp(0.62,0.92,item.planing);
    addPatch(x+item.washX*travel,z+item.washZ*travel,-item.washX,-item.washZ,
      1.49+age*0.26,0.89+age*0.20,foam*0.035,foam);
  }

  function rasterize() {
    let left = Infinity, right = -Infinity, near = Infinity, far = -Infinity;
    for (let i = 0; i < count; i++) {
      const item = records[(start+i)%capacity];
      left = Math.min(left,item.x);
      right = Math.max(right,item.x);
      near = Math.min(near,item.z);
      far = Math.max(far,item.z);
    }
    // Recenter the sampled patch on cell boundaries so texture motion cannot drag old wakes.
    domain.x = Math.floor(((left+right)*0.5-extent*0.5)/cellSize)*cellSize;
    domain.y = Math.floor(((near+far)*0.5-extent*0.5)/cellSize)*cellSize;
    domain.z = 1/extent;
    for (let i = 0; i < pixelCount; i++) {
      const index = touched[i];
      marks[index] = 0;
      slopes.fill(0,index*3,index*3+3);
      const to = index*4;
      image[to] = 128;
      image[to+1] = 128;
      image[to+2] = 0;
    }
    pixelCount = 0;
    for (let i = 0; i < count; i++) drawRecord(records[(start+i)%capacity]);
    for (let i = 0; i < pixelCount; i++) {
      const index = touched[i];
      const from = index*3;
      const to = index*4;
      image[to] = 128+Math.round(clamp(slopes[from]*5,-1,1)*127);
      image[to+1] = 128+Math.round(clamp(slopes[from+1]*5,-1,1)*127);
      image[to+2] = Math.round(255*clamp(slopes[from+2],0,1));
    }
    texture.needsUpdate = true;
  }

  return {
    texture,
    domain,
    clear() {
      count = 0;
      emitting = false;
      nextDraw = now;
      domain.z = 0;
    },
    advance(seconds, source, reducedMotion) {
      const strength = reducedMotion ? 0.64 : 1;
      const strengthChanged = domain.w !== strength;
      domain.w = strength;
      const running = source !== null && Math.abs(source.speed) >= 0.48;
      const travel = running && emitting ? Math.hypot(source.x-previous.x,source.z-previous.z) : 0;
      const dt = !reducedMotion || travel > 0.0001 ? seconds : 0;
      now += dt;
      const wasVisible = domain.z > 0;
      while (count > 0 && now-records[start].time >= lifetime) {
        start = (start+1)%capacity;
        count--;
      }
      const jumped = travel > 2.4 + Math.abs(source?.speed ?? 0)*seconds*2.4;
      if (!running || !emitting || jumped) distanceUntilNext = spacing;
      if (running && travel > 0 && !jumped) {
        const dx = (source.x-previous.x)/travel;
        const dz = (source.z-previous.z)/travel;
        const turn = Math.atan2(Math.sin(source.heading-previous.heading),Math.cos(source.heading-previous.heading));
        while (distanceUntilNext <= travel) {
          const f = distanceUntilNext/travel;
          emit(lerp(previous.x,source.x,f),lerp(previous.z,source.z,f),dx,dz,
            previous.heading+turn*f,lerp(previous.speed,source.speed,f),lerp(previous.throttle,source.throttle,f),
            lerp(previous.planing,source.planing,f),dt*(1-f));
          distanceUntilNext += spacing;
        }
        distanceUntilNext -= travel;
      }
      emitting = running;
      if (running) Object.assign(previous,source);
      if (count === 0) {
        domain.z = 0;
        return wasVisible || strengthChanged;
      }
      if (!wasVisible || (dt > 0 && now >= nextDraw)) {
        // Keep the raster clock aligned across display frame rates.
        nextDraw = (Math.floor(now/interval + 1e-6)+1)*interval;
        rasterize();
        return true;
      }
      return strengthChanged;
    },
  };
}

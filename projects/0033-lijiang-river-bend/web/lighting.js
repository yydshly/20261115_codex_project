import * as THREE from 'three';
import { bounds } from './river-layout.js';
import { sunPosition } from './shaders.js';

const width = 768;
const height = 1280;
const stepX = (bounds.right - bounds.left) / width;
const stepT = (bounds.end - bounds.start) / height;
const [sunX, sunY, sunZ] = sunPosition;
const tiltX = sunX / sunY;
const tiltT = -sunZ / sunY;
const sunSamples = [3, 6, 11, 19, 32, 55];

export function bakeTerrainLight(heightAt, crowns) {
  const pixels = new Uint8Array(width * height * 2);
  for (let row = 0; row < height; row++) {
    const t = bounds.start + (row + 0.5) * stepT;
    for (let col = 0; col < width; col++) {
      const x = bounds.left + (col + 0.5) * stepX;
      const ground = heightAt(x, t);
      let occlusion = 0;
      for (const rise of sunSamples) {
        const obstruction = heightAt(x + tiltX*rise, t + tiltT*rise) - ground - rise;
        occlusion = Math.max(occlusion, THREE.MathUtils.smoothstep(obstruction, -1.9, 4.7));
      }
      pixels[(row*width + col)*2] = Math.round(255*(1 - occlusion));
    }
  }

  for (const crown of crowns) {
    const heightAboveGround = crown.y - heightAt(crown.x, crown.t);
    const x = crown.x - tiltX*heightAboveGround;
    const t = crown.t - tiltT*heightAboveGround;
    const radiusX = Math.max(stepX*0.77, crown.rx*0.91 + crown.ry*0.29);
    const radiusT = Math.max(stepT*0.77, crown.rz*0.91 + crown.ry*0.29);
    const minX = Math.max(0, Math.floor((x - 2*radiusX - bounds.left) / stepX));
    const maxX = Math.min(width-1, Math.floor((x + 2*radiusX - bounds.left) / stepX));
    const minT = Math.max(0, Math.floor((t - 2*radiusT - bounds.start) / stepT));
    const maxT = Math.min(height-1, Math.floor((t + 2*radiusT - bounds.start) / stepT));
    for (let row = minT; row <= maxT; row++) {
      const dy = (bounds.start + (row + 0.5)*stepT - t) / radiusT;
      for (let col = minX; col <= maxX; col++) {
        const dx = (bounds.left + (col + 0.5)*stepX - x) / radiusX;
        const shade = Math.round(217 * Math.exp(-2.35*(dx*dx + dy*dy)));
        const index = (row*width + col)*2 + 1;
        pixels[index] = Math.max(pixels[index], shade);
      }
    }
  }

  const map = new THREE.DataTexture(pixels, width, height, THREE.RGFormat);
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

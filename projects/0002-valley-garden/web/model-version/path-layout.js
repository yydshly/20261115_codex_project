import * as THREE from 'three';

// A modest 1.3 m garden walk narrows as it turns towards the footbridge.
const curve=new THREE.CatmullRomCurve3([
  [0,-2.5],[.06,1],[.01,5.5],[-.02,8.5],[1.4,11.5],[5.6,14.7],[10.3,18]
].map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
const points=curve.getSpacedPoints(96),distances=[0];
for(let i=1;i<points.length;i++)distances.push(distances[i-1]+points[i].distanceTo(points[i-1]));
export const courtyardPathLength=distances.at(-1);
export function pathFrameAt(distance){
  const s=THREE.MathUtils.clamp(distance,0,courtyardPathLength);
  let i=1;while(i<distances.length-1&&distances[i]<s)i++;
  const a=points[i-1],b=points[i],t=(s-distances[i-1])/(distances[i]-distances[i-1]);
  const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);
  return {x:THREE.MathUtils.lerp(a.x,b.x,t)+.015*Math.sin(s*2.7),z:THREE.MathUtils.lerp(a.z,b.z,t),nx:dz/l,nz:-dx/l,
    halfWidth:.65-.10*THREE.MathUtils.smoothstep(s,13,20)+.026*Math.sin(s*2.3)+.013*Math.sin(s*5.7)};
}
export function pathSampleAt(x,z){
  let best=Infinity,along=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
    const d=Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
    if(d<best){best=d;along=THREE.MathUtils.lerp(distances[i-1],distances[i],t);}
  }
  return {distance:best,along,halfWidth:pathFrameAt(along).halfWidth};
}

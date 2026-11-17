const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smoothRange=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function groundNoise(x,z){
  const ix=Math.floor(x),iz=Math.floor(z),fx=smoothRange(0,1,x-ix),fz=smoothRange(0,1,z-iz);
  const h=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
  const mix=(a,b,t)=>a+(b-a)*t;
  return mix(mix(h(ix,iz),h(ix+1,iz),fx),mix(h(ix,iz+1),h(ix+1,iz+1),fx),fz);
}

/** Connected erosion scars, rather than independent spots on a lawn texture. */
export function surfaceFieldAt(x,z){
  const wild=smoothRange(0,7,Math.max(Math.abs(x)-12.8,-23-z,z-8));
  if(!wild)return {bare:0,stone:0,dry:0};
  const wx=x+(groundNoise(x*.028+9,z*.028)-.5)*8;
  const wz=z+(groundNoise(x*.035-4,z*.035+8)-.5)*7;
  let scar=0;
  for(const [cx,cz,rx,rz] of [[29,-29,12,5.5],[26,14,9,5],[23,24,5,11],[-2,-67,16,6],[-43,-48,12,7],[70,-75,18,9],[-78,-114,19,8],[15,-104,9,15],[104,-178,25,12]]){
    scar=Math.max(scar,Math.exp(-(((wx-cx)/rx)**2+((wz-cz)/rz)**2)*1.5));
  }
  const erosion=groundNoise(wx*.11,wz*.075)*.55+groundNoise(wx*.037+4,wz*.037)*.45;
  const broken=scar*.92+(erosion-.5)*.42;
  const bare=wild*smoothRange(.22,.76,broken);
  const stone=wild*smoothRange(.58,.94,broken)*.76;
  const dry=wild*clamp(erosion*.7+scar*.32);
  return {bare,stone,dry};
}

/** Metre-scale turf shelves and shallow, winding drainage depressions. */
export function localReliefAt(x,z){
  const wx=x+(groundNoise(x*.023+17,z*.023)-.5)*11;
  const wz=z+(groundNoise(x*.029,z*.029-8)-.5)*9;
  const ridge=(1-Math.abs(groundNoise(wx*.071,wz*.041)*2-1))**3;
  const terraces=(groundNoise(wx*.105+11,wz*.067)-.5)*.63;
  const micro=(groundNoise(x*.41,z*.41)-.5)*.16+(groundNoise(x*1.13,z*1.13)-.5)*.045;
  const drainX=24+Math.sin(z*.045)*10+(groundNoise(z*.05,12)-.5)*5;
  const drain=Math.exp(-(((x-drainX)/2.4)**2))*smoothRange(8,20,-z)*(1-smoothRange(92,125,-z));
  return ridge*.62+terraces+micro-drain*.72;
}

const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};

// Deliberate looks with a pause at each side, rather than a perpetual head oscillation.
export function cowLookAt(progress,variant=0){
  const keys=[[0,0],[.20,-.29],[.34,-.29],[.68,.27],[.82,.27],[1,0]],p=clamp(progress);
  const next=keys.findIndex(([t])=>t>=p),i=Math.max(1,next),a=keys[i-1],b=keys[i];
  return (a[1]+(b[1]-a[1])*ease((p-a[0])/(b[0]-a[0])))*(variant?-1:1);
}

export function cowAttention(time,{graze=0,walkBlend=0,headingRate=0,lookProgress=0}={},phaseOffset=0,animate=true){
  if(!animate)return {yaw:0,pitch:0};
  const variant=phaseOffset>15?1:0,look=cowLookAt(lookProgress,variant);
  // Bounded nibbling motion keeps the muzzle within its forage patch.
  const nibble=Math.sin(time*.61+phaseOffset)*.046+Math.sin(time*1.13+phaseOffset*.7)*.012;
  const turn=Math.max(-.18,Math.min(.18,headingRate*.70));
  const yaw=(look*(1-graze)+nibble*graze)*(1-walkBlend)+turn*walkBlend;
  const pitch=(Math.sin(time*3.3+phaseOffset)*.012)*walkBlend;
  return {yaw,pitch};
}

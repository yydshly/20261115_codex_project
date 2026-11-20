// Small coastal plot located off the existing polar trail.
export const coldGround={x:-638,z:-1199,rx:24,rz:16};
export const thawHollow={x:-624,z:-1197,rx:6.5,rz:4.2,level:15.2};
const ease=x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);};

export function coldGroundRelief(x,z,height){
  const {x:cx,z:cz,rx,rz,level}=thawHollow;
  if(Math.abs(x-cx)>=1.45*rx||Math.abs(z-cz)>=1.45*rz)return height;
  const r=Math.hypot((x-cx)/rx,(z-cz)/rz);
  if(r>=1.45)return height;
  const bed=level-.66+.66*Math.min(1,r*r)+.38*ease((r-1)/.45);
  return height+(bed-height)*(1-ease((r-1)/.45));
}

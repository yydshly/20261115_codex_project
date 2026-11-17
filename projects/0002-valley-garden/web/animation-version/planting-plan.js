import { pathSampleAt } from './path-layout.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
// One plan controls planting, exposed soil and the lawn edge.
export function borderDistanceAt(x,z){
  const side=x<0?-1:1,a=Math.abs(x);
  const pathCentre=2.05+.16*Math.sin(z*.76+side*.6);
  const pathWidth=.64+.09*Math.sin(z*1.17+side);
  const path=Math.max(Math.abs(a-pathCentre)-pathWidth,-2.35-z,z-6.15);
  const frontCentre=5.63+.13*Math.sin(a*1.2+side);
  const front=Math.max(Math.abs(z-frontCentre)-.88,2.8-a,a-11.15);
  const sideCentre=9.5+.20*Math.sin(z*.41+side*.7);
  const flank=Math.max(Math.abs(a-sideCentre)-(1.35+.12*Math.sin(z*.93)),-21.45-z,z-4.9);
  const back=Math.max(Math.abs(z+21.3+.14*Math.sin(x*.9))-.82,Math.abs(x)-10.9);
  return Math.min(path,front,flank,back);
}
export function borderWeightAt(x,z){return 1-smooth(-.08,.22,borderDistanceAt(x,z));}

/** Mixed, repeating drifts. Heights vary within a patch, not independently at every stem. */
export function createPlantingPlan(random){
  const plants=[],specimens=[[-8.7,-1.3],[9.5,-14.8],[-9.4,-22]];
  let patch=0;
  function add(kind,x,z,height,width=1){
    if(borderWeightAt(x,z)<.64)return;
    const route=pathSampleAt(x,z);
    if(route.distance<route.halfWidth+.28)return;
    if(specimens.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<.72))return;
    plants.push({kind,x,z,height,width,patch});
  }
  function drift(kind,x,z,rx,rz,count,height){
    const base=height*(.92+random()*.16),angle=(random()-.5)*.7;
    const accepted=[];
    for(let attempt=0;attempt<count*12&&accepted.length<count;attempt++){
      const a=random()*Math.PI*2,r=Math.sqrt(random()),dx=Math.cos(a)*r*rx,dz=Math.sin(a)*r*rz;
      const px=x+dx*Math.cos(angle)-dz*Math.sin(angle),pz=z+dx*Math.sin(angle)+dz*Math.cos(angle);
      if(accepted.some(([ax,az])=>Math.hypot(ax-px,az-pz)<(kind==='flower'?.145:.13)))continue;
      accepted.push([px,pz]);add(kind,px,pz,base*(.88+random()*.24),kind==='sorrel'?1.4:kind==='flower'?1.10:1);
    }
  }
  for(const side of [-1,1]){
    for(let i=0;i<5;i++){
      patch++;const z=-1.2+i*1.4+(side>0?.42:-.08),x=side*(2.05+.16*Math.sin(z*.76+side*.6));
      drift('flower',x,z,.40,.65,13,.38+random()*.10);
      drift('sorrel',x-side*.12,z-.06,.49,.69,22,.17+random()*.045);
      drift('daisy',x-side*.48,z-.2,.28,.56,9,.14+random()*.045);
      drift('fern',x+side*.35,z+.3,.24,.43,2,.23+random()*.07);
      if(i%2===0)add('hedge',x+side*.34,z+.42,.61+random()*.18);
    }
    for(let i=0;i<7;i++){
      patch++;const x=side*(3.4+i*1.08),z=5.53+.13*Math.sin(i*.9+side);
      add('hedge',x,z+.48,.66+random()*.24);
      drift('flower',x,z-.1,.53,.36,12,.39+random()*.10);
      drift('sorrel',x,z-.24,.54,.40,16,.17+random()*.04);
      drift('daisy',x,z-.65,.49,.25,8,.14+random()*.06);
    }
    for(let i=0;i<14;i++){
      patch++;const z=-19.65+i*1.75,x=side*(9.50+.20*Math.sin(z*.41+side*.7));
      add('hedge',x+side*.68,z+.2,.79+random()*.30);
      drift('flower',x-side*.45,z,.40,.74,12,.37+random()*.14);
      drift('sorrel',x-side*.55,z-.1,.52,.74,18,.17+random()*.04);
      drift('daisy',x-side*1.01,z-.15,.25,.65,8,.15+random()*.06);
      drift('fern',x+side*.1,z-.5,.40,.55,i%3===0?4:2,.24+random()*.09);
    }
  }
  for(let i=0;i<13;i++){
    patch++;const x=-9.7+i*1.62,z=-21.3-.14*Math.sin(x*.9);
    add('hedge',x,z-.08,.80+random()*.28);
    drift('flower',x,z+.38,.56,.27,6,.37+random()*.11);
    drift('sorrel',x,z+.36,.60,.30,10,.16+random()*.045);
    drift('daisy',x,z+.58,.53,.18,6,.14+random()*.06);
  }
  return {plants,patchCount:patch};
}

import * as THREE from 'three';

function seeded(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let v=Math.imul(seed^seed>>>15,1|seed);v^=v+Math.imul(v^v>>>7,61|v);return ((v^v>>>14)>>>0)/4294967296;};}

/** A checked, smooth pasture circuit. Heading follows travel; standing cattle never pivot. */
export function createCowRoaming({x,z,heading,isSafe,seed=41,phaseOffset=0}){
  const random=seeded(seed),radius=4.6,forward=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)),right=new THREE.Vector3(Math.cos(heading),0,-Math.sin(heading));
  let curve=null;
  outer:for(const r of [2.1,1.85,1.6,1.35,1.15])for(const sign of [-1,1])for(const aspect of [1,1.12,.90]){
    const centre=new THREE.Vector3(x,0,z).addScaledVector(right,sign*r),points=[];
    for(let i=0;i<128;i++){
      const a=i/128*Math.PI*2,p=centre.clone().addScaledVector(right,-sign*r*Math.cos(a)*(1+.055*(1-Math.cos(a*2)))).addScaledVector(forward,r*aspect*Math.sin(a));
      if(Math.hypot(p.x-x,p.z-z)>radius||!isSafe(p.x,p.z)){points.length=0;break;}points.push(p);
    }
    if(points.length){curve=new THREE.CatmullRomCurve3(points,true,'centripetal');curve.arcLengthDivisions=512;break outer;}
  }
  if(!curve)return null;
  const length=curve.getLength(),stops=[],stages=[];let duration=0,distance=0;
  function poseAt(u){const p=curve.getPointAt(((u%1)+1)%1),t=curve.getTangentAt(((u%1)+1)%1);return {x:p.x,z:p.z,heading:Math.atan2(t.x,t.z)};}
  for(let i=0;i<6;i++){const u=i?(i+(random()-.5)*.28)/6:0;stops.push({...poseAt(u),u});}
  function add(kind,seconds,data){stages.push({kind,start:duration,end:duration+seconds,distance,...data});duration+=seconds;}
  let index=0,lapU=0;
  for(let leg=0;leg<18;leg++){
    const current=stops[index];add('grazing',leg===0?20:22+random()*15,{point:current});add('raising',1.6,{point:current});
    const next=leg===17?0:(index+(random()<.25?2:1))%6;
    let endU=stops[next].u+Math.floor(lapU);if(endU<=lapU+.001)endU+=1;
    const travel=(endU-lapU)*length;add('walking',travel/.36+.8,{from:current,to:stops[next],startU:lapU,endU,travel});distance+=travel;
    add('lowering',1.6,{point:stops[next]});index=next;lapU=endU;
  }
  function sample(time,out={}){
    const clock=((time+phaseOffset)%duration+duration)%duration,stage=stages.find(s=>clock<s.end)||stages[0],t=clock-stage.start,d=stage.end-stage.start,f=t/d;
    let point=stage.point,graze=0,blend=0,speed=0,gaitDistance=stage.distance,headingRate=0,lookProgress=0;
    if(stage.kind==='walking'){
      const ramp=.8,total=d-ramp,travel=t<ramp?t*t/(2*ramp):t>d-ramp?total-(d-t)**2/(2*ramp):t-ramp/2,u=travel/total;
      const progress=THREE.MathUtils.lerp(stage.startU,stage.endU,u);point=poseAt(progress);
      speed=stage.travel/total*Math.min(1,t/ramp,(d-t)/ramp);blend=THREE.MathUtils.smoothstep(speed,0,.35);gaitDistance+=stage.travel*u;
      const a=poseAt(progress-.001),b=poseAt(progress+.001);headingRate=Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading))/(length*.002)*speed;
    }else if(stage.kind==='raising')graze=1-THREE.MathUtils.smoothstep(f,0,1);
    else if(stage.kind==='lowering')graze=THREE.MathUtils.smoothstep(f,0,1);
    else {graze=1-THREE.MathUtils.smoothstep(t,10,11.4)*(1-THREE.MathUtils.smoothstep(t,16.2,17.6));lookProgress=THREE.MathUtils.clamp((t-11.4)/4.8,0,1);}
    return Object.assign(out,{x:point.x,z:point.z,heading:point.heading,phase:stage.kind==='grazing'&&graze<.1?'looking':stage.kind,graze,walkBlend:blend,speed,gaitDistance,headingRate,lookProgress});
  }
  function lineSafe(a,b){
    for(let i=0;i<=128;i++){
      let p;if(a.u!==undefined&&b.u!==undefined){let end=b.u;if(end<=a.u)end+=1;p=poseAt(THREE.MathUtils.lerp(a.u,end,i/128));}else p={x:THREE.MathUtils.lerp(a.x,b.x,i/128),z:THREE.MathUtils.lerp(a.z,b.z,i/128)};
      if(!isSafe(p.x,p.z))return false;
    }return true;
  }
  return {stops,stages,duration,sample,bounds:{x,z,radius},curve,length,lineSafe};
}

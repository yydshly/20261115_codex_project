import * as THREE from 'three';
import { createHoofGrounding } from './cattle-grounding.js';

export const cowStride=.48;
const cycle=cowStride,step=cycle/4,order=[2,0,3,1];

/** Hold stance hooves in world space, including while the torso follows a curved path. */
export function createCowGait(mesh,body,legs,surfaceHeight){
  const point=new THREE.Vector3(),scale=new THREE.Vector3(),futureRotation=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3(),meshRotation=new THREE.Quaternion(),combined=new THREE.Quaternion(),roll=new THREE.Quaternion(),right=new THREE.Vector3(1,0,0);
  const grounding=createHoofGrounding(mesh,legs,surfaceHeight);
  const feet=legs.map(()=>({anchor:new THREE.Vector3(),from:new THREE.Vector3(),landing:new THREE.Vector3(),rotation:new THREE.Quaternion(),fromRotation:new THREE.Quaternion(),landingRotation:new THREE.Quaternion(),poseRotation:new THREE.Quaternion(),swing:false,u:0,start:0,duration:.42,clearance:0}));
  const targets=legs.map(()=>new THREE.Vector3());
  let active=false,lastTime=NaN,lastDistance=0,nextDistance=0,nextLeg=0,warmSteps=0,activatedAt=0,wasMoving=false;
  function reset(){active=false;wasMoving=false;for(const f of feet){f.swing=false;f.u=0;}for(const l of legs){l.upper.rotation.set(0,0,0);l.lower.rotation.set(0,0,0);l.hoof.rotation.set(0,0,0);}body.position.set(0,0,0);}
  function landingAt(seconds,motion,i,target,rotation){
    const leg=legs[i].leg;
    const future=motion.predict?motion.predict(seconds):{x:mesh.matrixWorld.elements[12]+Math.sin(motion.heading||0)*motion.speed*seconds,z:mesh.matrixWorld.elements[14]+Math.cos(motion.heading||0)*motion.speed*seconds,heading:motion.heading||0,walkBlend:1};
    const sx=(surfaceHeight(future.x+.6,future.z)-surfaceHeight(future.x-.6,future.z))/1.2,sz=(surfaceHeight(future.x,future.z+.6)-surfaceHeight(future.x,future.z-.6))/1.2;
    normal.set(-sx,1,-sz).normalize();futureRotation.setFromUnitVectors(up,normal).multiply(new THREE.Quaternion().setFromAxisAngle(up,future.heading));
    const underHip=leg.foot<-.7?(leg.hip-leg.foot)*.30:0;
    target.set(leg.x*scale.x,0,(leg.foot+underHip+.12*(future.walkBlend||0))*scale.z).applyQuaternion(futureRotation);target.x+=future.x;target.z+=future.z;
    target.y=surfaceHeight(target.x,target.z);grounding.orientation(target.x,target.z,future.heading,rotation);grounding.seat(i,target,rotation,scale);
  }
  function update(time,motion){
    if(!motion){reset();lastTime=time;return;}
    const moving=motion.speed>.002,blend=motion.walkBlend||0,dt=Number.isFinite(lastTime)?Math.max(0,time-lastTime):0;
    if(time<lastTime||dt>2||motion.gaitDistance+1e-5<lastDistance)reset();lastTime=time;lastDistance=motion.gaitDistance;
    mesh.getWorldScale(scale);
    if(!active){
      mesh.updateMatrixWorld(true);legs.forEach((l,i)=>{const f=feet[i];l.hoof.getWorldPosition(f.anchor);grounding.orientation(f.anchor.x,f.anchor.z,motion.heading||0,f.rotation);grounding.seat(i,f.anchor,f.rotation,scale);});
      active=true;activatedAt=time;nextDistance=motion.gaitDistance;nextLeg=0;warmSteps=0;
    }
    if(moving&&!wasMoving){nextDistance=motion.gaitDistance;nextLeg=0;warmSteps=0;}
    if(!moving&&!feet.some(f=>f.swing)){
      let chosen=-1,error=.07;
      for(let i=0;i<legs.length;i++){
        const leg=legs[i].leg,underHip=leg.foot<-.7?(leg.hip-leg.foot)*.30:0;
        point.set(leg.x,.04,leg.foot+underHip).applyMatrix4(mesh.matrixWorld);point.y=surfaceHeight(point.x,point.z);
        const d=Math.hypot(point.x-feet[i].anchor.x,point.z-feet[i].anchor.z);if(d>error){error=d;chosen=i;feet[i].landing.copy(point);}
      }
      if(chosen>=0){const f=feet[chosen];f.swing=true;f.from.copy(f.anchor);f.fromRotation.copy(f.rotation);grounding.orientation(f.landing.x,f.landing.z,motion.heading||0,f.landingRotation);grounding.seat(chosen,f.landing,f.landingRotation,scale);f.start=time;f.duration=.45;f.lift=.018;}
    }
    while(moving&&motion.gaitDistance+1e-8>=nextDistance){
      const i=order[nextLeg%4],f=feet[i];
      if(!f.swing){f.swing=true;f.from.copy(f.anchor);f.fromRotation.copy(f.rotation);f.start=time;f.duration=warmSteps<4?.34:THREE.MathUtils.clamp(step/Math.max(.2,motion.speed)*1.25,.40,.56);f.lift=warmSteps<4?.024:.032;landingAt(f.duration,motion,i,f.landing,f.landingRotation);}
      nextLeg++;warmSteps++;nextDistance+=warmSteps<4?.065:step;
    }
    for(let i=0;i<legs.length;i++){
      const f=feet[i];
      if(f.swing){
        const u=THREE.MathUtils.clamp((time-f.start)/f.duration,0,1),e=u*u*u*(u*(u*6-15)+10);f.u=u;point.lerpVectors(f.from,f.landing,e);point.y+=Math.sin(Math.PI*u)**2*f.lift*scale.y;
        f.poseRotation.slerpQuaternions(f.fromRotation,f.landingRotation,e).multiply(roll.setFromAxisAngle(right,.16*Math.sin(Math.PI*u*2)*Math.exp(-u*3)-.20*Math.sin(Math.PI*u)**2));
        // Flexing the hoof must not scrape terrain during liftoff or touchdown.
        const gap=grounding.clearance(i,point,f.poseRotation,scale);point.y+=Math.max(0,.0015-gap);f.clearance=Math.max(.0015,gap);
        if(u>=1){f.anchor.copy(f.landing);f.rotation.copy(f.landingRotation);f.swing=false;}
      }else{point.copy(f.anchor);f.poseRotation.copy(f.rotation);f.clearance=.0015;}
      targets[i].copy(point);mesh.worldToLocal(targets[i]);
    }
    const margin=.003+.007*THREE.MathUtils.smoothstep(time-activatedAt,0,.35)*blend;
    body.position.x=blend*Math.sin(motion.gaitDistance/cycle*Math.PI*2)*.004;
    let bodyY=blend*(-.018+Math.sin(motion.gaitDistance/cycle*Math.PI*4)*.002);
    for(let i=0;i<legs.length;i++){
      const {upper,lower,hoof,leg}=legs[i],p=targets[i],reach=lower.position.length()+hoof.position.length()-margin;
      const horizontal=(p.x-leg.x-body.position.x)**2+(p.z-leg.hip)**2;
      bodyY=Math.min(bodyY,p.y+Math.sqrt(Math.max(.05,reach*reach-horizontal))-upper.position.y);
    }
    body.position.y=Math.min(bodyY,body.position.y+dt*.04);
    for(let i=0;i<legs.length;i++){
      const {upper,lower,hoof,leg}=legs[i];point.copy(targets[i]);
      const dx=point.x-leg.x-body.position.x,dy=point.y-upper.position.y-body.position.y,dz=point.z-leg.hip,l1=lower.position.length(),l2=hoof.position.length(),distance=THREE.MathUtils.clamp(Math.hypot(dx,dy,dz),.1,l1+l2-margin);
      const sagittalY=-Math.hypot(dx,dy),direction=Math.atan2(-dz,-sagittalY),a=Math.acos(THREE.MathUtils.clamp((l1*l1+distance*distance-l2*l2)/(2*l1*distance),-1,1)),b=Math.acos(THREE.MathUtils.clamp((l1*l1+l2*l2-distance*distance)/(2*l1*l2),-1,1));
      const top=direction-leg.bend*a,bottom=top+leg.bend*(Math.PI-b),restTop=Math.atan2(-lower.position.z,-lower.position.y),restBottom=Math.atan2(-hoof.position.z,-hoof.position.y);
      upper.rotation.set(top-restTop,0,Math.atan2(dx,-dy),'ZXY');lower.rotation.set(bottom-restBottom-upper.rotation.x,0,0);
      mesh.getWorldQuaternion(meshRotation).invert();combined.copy(upper.quaternion).multiply(lower.quaternion).invert();hoof.quaternion.copy(combined).multiply(meshRotation).multiply(feet[i].poseRotation);
    }
    mesh.updateMatrixWorld(true);
    wasMoving=moving;
  }
  return {update,reset,feet,grounding,get active(){return active;}};
}

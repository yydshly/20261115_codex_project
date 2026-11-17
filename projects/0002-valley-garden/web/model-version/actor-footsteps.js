const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/** Short outdoor impacts: inverse falloff, a smooth far fade, and softer distant detail. */
export function actorSoundMixAt(source,listener,right={x:1,z:0},indoors=false){
  const dx=source.x-listener.x,dy=source.y-listener.y,dz=source.z-listener.z,distance=Math.hypot(dx,dy,dz);
  const t=clamp((distance-20)/12,0,1),fade=1-t*t*(3-2*t);
  return {distance,gain:fade/(1+(distance/5.5)**2)*(indoors?.32:1),
    pan:clamp((dx*right.x+dz*right.z)/Math.max(.5,Math.hypot(dx,dz)),-.88,.88),
    cutoff:(700+6300/(1+(distance/9)**2))*(indoors?.45:1)};
}

/** Observe existing poses; this never changes a bone, root, route or gait clock. */
export function createActorFootsteps(){
  let lastTime=null,previousHuman=null,humanFeet={},cowFeet=new Map();
  const counts={human:0,cow:0};
  function reset(){lastTime=null;previousHuman=null;humanFeet={};cowFeet.clear();}
  function update(dt,time,life,surfaceAt){
    const events=[],advance=lastTime===null?0:time-lastTime;
    const continuous=lastTime!==null&&dt>0&&advance>0&&advance<.25&&advance<=dt*5;
    lastTime=time;
    const visible=life.group.visible,root=life.gardener.position;
    const travel=previousHuman?Math.hypot(root.x-previousHuman.x,root.z-previousHuman.z):0;
    const walking=visible&&life.gardener.visible&&life.locomotion.walking&&life.locomotion.weight>.65&&continuous&&travel>.001&&travel<.15;
    for(const [side,sole]of Object.entries(life.footing.soles)){
      const foot=humanFeet[side]??={armed:false,last:-Infinity};
      if(!walking||!Number.isFinite(sole.clearance))foot.armed=false;
      else{
        if(sole.clearance>.024)foot.armed=true;
        if(foot.armed&&sole.clearance<.012&&time-foot.last>.3){
          events.push({kind:'human',position:{x:sole.x,y:sole.y,z:sole.z},surface:surfaceAt(sole.x,sole.z),speed:travel/dt,side:side==='left'?-1:1});foot.armed=false;foot.last=time;
        }
      }
    }
    previousHuman={x:root.x,z:root.z};
    life.cattle.forEach((cow,index)=>{
      const feet=cow.behavior.gait.feet,previous=cowFeet.get(cow)??[];
      feet.forEach((foot,leg)=>{
        const old=previous[leg],valid=continuous&&visible&&cow.group.visible&&old;
        let armed=valid&&old.armed;
        if(!valid)armed=false;
        else if(foot.swing&&!old.swing)armed=cow.motion?.phase==='walking'&&cow.motion.speed>.02;
        if(valid&&armed&&old.swing&&!foot.swing){
          const p=foot.anchor;
          events.push({kind:'cow',actor:index,leg,position:{x:p.x,y:p.y,z:p.z},surface:surfaceAt(p.x,p.z),speed:cow.motion?.speed||0});armed=false;
        }
        previous[leg]={swing:foot.swing,armed};
      });cowFeet.set(cow,previous);
    });
    for(const event of events)counts[event.kind]++;
    return events;
  }
  return {update,reset,inspect:()=>({...counts})};
}

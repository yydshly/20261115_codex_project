/** Footfall cadence follows real motion; teleports, blocked movement and idle reset it. */
export function createFootstepTracker(){
  let previous=null,phase=.65,index=0;
  return {get phase(){return phase;},reset(){previous=null;phase=.65;},update({x,z,dt,active=false,surface='grass'}){
    const old=previous;previous={x,z};
    if(!old||!active||dt<=0||dt>.15){phase=.65;return null;}
    const distance=Math.hypot(x-old.x,z-old.z),speed=distance/dt;
    if(distance>Math.max(.7,dt*9)||speed<.12){phase=.65;return null;}
    phase+=dt*(1.45+.27*Math.min(speed,6.3));
    if(phase<1)return null;phase%=1;
    return {surface,speed,side:index++%2?1:-1,index};
  }};
}

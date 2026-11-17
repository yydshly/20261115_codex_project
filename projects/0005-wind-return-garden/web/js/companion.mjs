import {catBenchSpots} from './arrangement.mjs';
import { findPath } from './navigation.mjs';
import { BEDS } from './garden-life.mjs';
import {HOUSE_DOOR,HOME_ENTRY,HOME_CUSHION,HOME_WINDOW,homeWalkable} from './home-model.mjs';

const SUN={x:413,y:547},NAP={x:392,y:513};
const WANDER=[{x:215,y:433},{x:344,y:415},{x:428,y:549},{x:629,y:470},{x:715,y:468},{x:845,y:415}];
export class CatCompanion {
  constructor(data,walkable,random=Math.random){
    this.data=data;this.walkable=walkable;this.random=random;this.path=[];this.timer=0;this.repath=0;this.target=null;this.reached=false;this.petAt=0;this.indoorPath=[];this.indoorTimer=0;
  }
  go(mode,target,duration){
    this.data.mode=mode;this.target=target;this.timer=duration;this.path=findPath(this.data,target,this.walkable);this.reached=false;this.repath=0;
  }
  choose(player,plots){
    const spots=this.layout?catBenchSpots(this.layout):{sun:SUN,nap:NAP};
    const d=Math.hypot(this.data.x-player.x,this.data.y-player.y),r=this.random();
    if(d>200||(this.data.affection>=2&&player.moving&&r<.45)){this.go('follow',player,10);return;}
    const flowers=BEDS.filter(b=>plots?.[b.id]?.kind);
    if(flowers.length&&r<.38){const b=flowers[Math.floor(this.random()*flowers.length)];this.go('watch',{x:b.x+35,y:b.y+18},12+this.random()*6);}
    else if(r<.58)this.go('sun',spots.sun,12+this.random()*8);
    else if(r<.76)this.go('nap',spots.nap,15+this.random()*9);
    else this.go('wander',WANDER[Math.floor(this.random()*WANDER.length)],7+this.random()*7);
  }
  updateIndoor(dt,player,now,context){
    const c=this.data,home=context.home||{},env=context.env||{},rest=env.rain>.2||env.night>.55;
    if(!homeWalkable(c.indoorX,c.indoorY)){c.indoorX=HOME_ENTRY.x;c.indoorY=HOME_ENTRY.y;}
    if(c.lastPetAt>this.petAt&&now-c.lastPetAt<8000){this.petAt=c.lastPetAt;this.indoorPath=[];this.indoorTimer=8;c.mode='affection';}
    if(!home.inside&&c.mode==='affection'){this.indoorTimer=0;c.mode='curl';}
    this.indoorTimer-=dt;
    if(this.indoorTimer<=0){
      let goal;
      if(!rest&&!home.inside&&!home.inviteCat){c.mode='homeleave';goal=HOME_ENTRY;}
      else if(rest||this.random()<.5){c.mode='curl';goal=HOME_CUSHION;}
      else{c.mode='homewatch';goal=HOME_WINDOW;}
      this.indoorPath=findPath({x:c.indoorX,y:c.indoorY},goal,homeWalkable);this.indoorTimer=15;
    }
    const target=this.indoorPath[0];
    if(target){
      const dx=target.x-c.indoorX,dy=target.y-c.indoorY,d=Math.hypot(dx,dy),step=Math.min(d,dt*43);
      if(d<1.5){this.indoorPath.shift();if(!this.indoorPath.length)this.indoorTimer=12;}
      else{const nx=c.indoorX+dx/d*step,ny=c.indoorY+dy/d*step;
        if(homeWalkable(nx,ny)){c.indoorX=nx;c.indoorY=ny;c.moving=true;if(Math.abs(dx)>.1)c.face=Math.sign(dx);}else{this.indoorPath=[];this.indoorTimer=0;}}
    }
    if(c.mode==='homeleave'&&Math.hypot(c.indoorX-HOME_ENTRY.x,c.indoorY-HOME_ENTRY.y)<15){
      c.space='outside';c.x=HOUSE_DOOR.x;c.y=HOUSE_DOOR.y+9;c.mode='wander';this.path=[];this.timer=0;return 'left';
    }
    return null;
  }
  update(dt,player,plots,now=Date.now(),context={}){
    const c=this.data;c.moving=false;this.layout=context.layout;
    if(!c.unlocked)return;
    if(c.space==='inside')return this.updateIndoor(dt,player,now,context);
    const env=context.env||{},home=context.home||{},shelter=env.rain>.2||env.night>.55||home.inviteCat||(home.inside&&c.affection>=2);
    if(!this.walkable(c.x,c.y)){
      const options=[{x:player.x+24,y:player.y+14},{x:player.x,y:player.y},{x:400,y:530}];
      const spawn=options.find(p=>this.walkable(p.x,p.y));if(spawn)Object.assign(c,spawn);this.path=[];
    }
    if(c.lastPetAt>this.petAt&&now-c.lastPetAt<8000){this.petAt=c.lastPetAt;this.path=[];this.target=null;this.timer=8;c.mode='affection';}
    if(home.inside&&c.mode==='affection'){this.timer=0;c.mode='wander';}
    if(shelter&&c.mode!=='shelter'&&c.mode!=='affection')this.go('shelter',HOUSE_DOOR,90);
    if(!shelter&&c.mode==='shelter'){this.timer=0;this.path=[];}
    this.timer-=dt;this.repath+=dt;
    if(this.timer<=0){if(shelter)this.go('shelter',HOUSE_DOOR,90);else this.choose(player,plots);}
    if(c.mode==='follow'){
      const d=Math.hypot(c.x-player.x,c.y-player.y);
      if(d<34){this.path=[];this.reached=true;}
      else if(this.repath>.65){this.repath=0;this.path=findPath(c,player,this.walkable);this.reached=false;}
    }
    if(c.mode==='shelter'&&Math.hypot(c.x-HOUSE_DOOR.x,c.y-HOUSE_DOOR.y)<16){
      c.space='inside';c.indoorX=HOME_ENTRY.x;c.indoorY=HOME_ENTRY.y;c.mode='curl';this.path=[];this.indoorPath=[];this.indoorTimer=0;return 'entered';
    }
    const target=this.path[0];if(!target)return;
    const dx=target.x-c.x,dy=target.y-c.y,d=Math.hypot(dx,dy),speed=c.mode==='follow'?94:c.mode==='shelter'?68:43;
    if(d<1.5){this.path.shift();if(!this.path.length){this.reached=true;this.timer= Math.max(this.timer,c.mode==='nap'?15:6);}return;}
    const step=Math.min(d,dt*speed),nx=c.x+dx/d*step,ny=c.y+dy/d*step;
    if(this.walkable(nx,ny)){c.x=nx;c.y=ny;c.moving=true;if(Math.abs(dx)>.1)c.face=Math.sign(dx);}
    else{this.path=[];this.timer=0;}
  }
}

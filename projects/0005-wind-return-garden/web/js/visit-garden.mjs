import {createGarden} from './garden-life.mjs';
import {setAtmosphere} from './atmosphere.mjs';
import {HOME_CUSHION} from './home-model.mjs';
// An explicitly labeled visit uses the real game, with its own session storage.
export function readVisitEntry(search=''){
 const query=new URLSearchParams(search),preview=query.get('visit')!=='home';
 return {preview,space:preview?(query.get('space')==='inside'?'inside':'outside'):null};
}
export function visitStorage(entry,host){return entry.preview?host.sessionStorage:host.localStorage;}
// Scene shortcuts affect only the visit. Long-term gardens keep their own room,
// position, plants, layout and story, even if a scene parameter is supplied.
export function applyVisitEntry(garden,entry){
 if(!entry.preview||!['outside','inside'].includes(entry.space))return false;
 const inside=entry.space==='inside';
 Object.assign(garden.home,{inside,resting:false,inviteCat:inside});
 garden.cat.unlocked=true;garden.cat.moving=false;
 if(inside){
  Object.assign(garden.home,{x:280,y:395,face:1});
  Object.assign(garden.cat,{space:'inside',indoorX:HOME_CUSHION.x,indoorY:HOME_CUSHION.y,mode:'curl'});
 }else{
  Object.assign(garden.player,{x:370,y:530,face:1});
  Object.assign(garden.cat,{space:'outside',x:400,y:530,mode:'wander'});
 }
 return true;
}
export function createVisitGarden(now=Date.now()){
 const g=createGarden(now);g.completed=['oak','stream','home'];g.ended=true;
 for(const [i,p] of Object.values(g.plots).entries())Object.assign(p,{kind:['daisy','amber','bellflower'][i],growth:1,plantedAt:now,wateredAt:now-60000});
 g.cat.unlocked=true;g.cat.affection=2;setAtmosphere(g.atmosphere,'time','afternoon',now);setAtmosphere(g.atmosphere,'weather','clear',now);return g;
}

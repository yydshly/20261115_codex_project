import {createGarden} from './garden-life.mjs';
import {setAtmosphere} from './atmosphere.mjs';
// An explicitly labeled visit uses the real game, with its own session storage.
export function createVisitGarden(now=Date.now()){
 const g=createGarden(now);g.completed=['oak','stream','home'];g.ended=true;
 for(const [i,p] of Object.values(g.plots).entries())Object.assign(p,{kind:['daisy','amber','bellflower'][i],growth:1,plantedAt:now,wateredAt:now-60000});
 g.cat.unlocked=true;g.cat.affection=2;setAtmosphere(g.atmosphere,'time','afternoon',now);setAtmosphere(g.atmosphere,'weather','clear',now);return g;
}

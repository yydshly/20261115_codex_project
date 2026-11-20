import {buildAnnualClimate} from './annual-climate.js';
import {terrainHeight} from './large-world.js';
import {NORTH_REACHES,northSample} from './northern-watershed.js';
import {fanProfile} from './fan-layout.js';
import {meltLines,iceLine} from './glacial-geography.js';
import {riverLines} from './water-system.js';
import {LAKE,inlandLines} from './inland-geography.js';
import {SALT_LAKE,SALT_MARSH} from './salt-layout.js';
import {tropicalChannel} from './tropical-layout.js';
import {linkSample} from './watershed-link.js';
import {UPLAND_POOLS,uplandChannel} from './upland-layout.js';

export const annualGrid = {x0:-1920,z0:-1600,cols:97,rows:81,step:40};
const sweep=(n,fn)=>Array.from({length:n+1},(_,i)=>fn(i/n));
const sampled=(n,arr)=>arr.filter((_,i)=>i%n===0);

const southernRiver=[
  ...UPLAND_POOLS.slice(1).map((_,i)=>sweep(38,t=>uplandChannel(i,t))),
  sweep(180,linkSample),
  sweep(230,tropicalChannel)
];
const northernRiver=[
  ...NORTH_REACHES.map(reach=>sweep(90,t=>northSample(reach.id,t))),
  ...[0,1,2].map(channel=>sweep(48,t=>{
    const z=-1030+180*t,p=fanProfile(z);
    return {x:p.channels[channel],z,level:p.level,half:3};
  }))
];
const mainRiver=riverLines.map(line=>sampled(5,line.points));
const inlandRiver=inlandLines.map(line=>sampled(3,line.points));
export const waterRoutes = [
  {id:'ice', paths:meltLines.map(line=>sampled(3,line))},
  {id:'north', paths:northernRiver},
  {id:'lake', paths:inlandRiver},
  {id:'main', paths:mainRiver},
  {id:'south', paths:southernRiver}
];

export function buildWorldAnnualModel(elevation=terrainHeight) {
  const outlets=waterRoutes.map(({id,paths})=>({id,points:paths.flat()}));
  outlets.find(r=>r.id==='ice').points.push(...sampled(10,iceLine));
  outlets.find(r=>r.id==='lake').points.push(LAKE);
  outlets.push({id:'salt',points:[SALT_LAKE,SALT_MARSH],radius:110});
  const model=buildAnnualClimate(annualGrid,elevation,outlets);
  // Each tributary's allocated hillslopes are disjoint. Add their inputs at the
  // central junction alongside the portion assigned directly to the main river.
  for(const frame of model.frames){
    const direct=frame.flow.main;
    for(const key of ['rain','snow','melt','runoff','cells']){
      direct[key]+=frame.flow.ice[key]+frame.flow.north[key]+frame.flow.lake[key];
    }
  }
  const mainPeak=Math.max(...model.frames.map(frame=>frame.flow.main.runoff),.001);
  for(const frame of model.frames)frame.flow.main.index=frame.flow.main.runoff/mainPeak;
  return model;
}

let worldAnnualModel;
export function getWorldAnnualModel(){
  return worldAnnualModel??=buildWorldAnnualModel();
}

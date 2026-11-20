import {karstMove} from './karst-navigation.js';
import {geologyMove} from './geology-navigation.js';
import {settlementInteriorAt} from './settlement-layout.js';
import {caveField,caveVoidAt,caveWalkable} from './cave-layout.js';
import {walkingSurface,walkable} from './large-world.js';

export function caveTravelPoint(p){const f=caveField(p.x,p.z),underground=!!p.underground&&!!f;return {...p,y:underground?f.floor:walkingSurface(p.x,p.z),underground};}
export function moveInWorld(from,x,z){const karst=karstMove(from,x,z);if(karst!==undefined)return karst;const geo=geologyMove(from,x,z);if(geo!==undefined)return geo;
 const f=caveField(x,z),distance=Math.hypot(x-from.x,z-from.z);
 if(from.underground){
  if(f){if(!caveWalkable(x,z)||Math.abs(f.floor-from.y)>distance*.8+.16)return null;return {x,z,y:f.floor,underground:true};}
  if(x<60&&x>48&&Math.abs(z-335)<7){const y=walkingSurface(x,z);if(Math.abs(y-from.y)<=distance*.9+.2)return {x,z,y,underground:false};}return null;
 }
 // Only enter through the mouth at its physical floor; walking on the roof stays outdoors.
 if(f&&x<65&&from.x<65&&Math.abs(from.y-f.floor)<2.2&&caveWalkable(x,z))return {x,z,y:f.floor,underground:true};
 const y=walkingSurface(x,z);if(caveVoidAt(x,y,z)||!walkable(x,z,from.x,from.z))return null;
 return {x,z,y,underground:false,indoor:!!settlementInteriorAt(x,z,y)};
}

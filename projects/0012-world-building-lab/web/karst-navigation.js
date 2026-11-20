import {karstField,karstLayerField,karstWaterAt,karstBridgeField,karstWeight} from './karst-layout.js';
import {walkingSurface,walkable} from './large-world.js';
export function karstWalkable(x,z,y){const f=karstField(x,z,y);return !!f&&f.layer!=='shaft'&&(f.edge>.7||f.open)&&f.ceiling-f.floor>2.3&&!(karstWaterAt(x,z)?.level>f.floor+.2);}
export function karstMove(from,x,z){if(karstWeight(from.x,from.z)<.2)return undefined;const old=karstField(from.x,from.z,from.y),f=karstField(x,z,from.y),d=Math.hypot(x-from.x,z-from.z);if(from.underground&&old){if(f&&karstWalkable(x,z,from.y)&&Math.abs(f.floor-from.y)<=d*.8+.16)return {x,z,y:f.floor,underground:true,karst:true,layer:f.layer,open:f.open};return null;}return undefined;}

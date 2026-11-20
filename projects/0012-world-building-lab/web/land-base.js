import {worldHeight} from './world-layout.js';
export const HORIZONTAL_SCALE=6,VERTICAL_SCALE=3;
export function naturalHeight(x,z){return worldHeight(x/HORIZONTAL_SCALE,z/HORIZONTAL_SCALE,false)*VERTICAL_SCALE+Math.sin(x*.047)*Math.sin(z*.039)*.23+Math.sin(x*.11+z*.071)*.065;}

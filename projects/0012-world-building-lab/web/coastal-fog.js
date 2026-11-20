import {terrainHeight} from './large-world.js';

export const fogBounds={x:1080,z:225,cols:85,rows:76,step:10};
export const coastalAir={upwind:22.6,dewPoint:19.4};
export const seaCases={cold:'冷流',warm:'较暖海面'};
export const windCases={onshore:'向岸风',offshore:'离岸风'};
export const defaultFogCase={sea:'cold',wind:'onshore',overlay:false,overview:false};
export const coastalFogSource='https://www.weather.gov/safety/fog-water';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
const bell=n=>Math.exp(-n*n);
const {x:x0,z:z0,cols,rows,step}=fogBounds;
const fieldCache=new Map();

export function coldCurrent(x,z){
  const center=498+.10*(x-1440)+14*Math.sin((x-1440)/152);
  return bell((z-center)/134)*bell((x-1470)/412);
}

function waterTemperature(x,z,sea){
  const open=22.1+.35*Math.sin((z-520)/212);
  return open-(sea==='cold'?8.4:.5)*coldCurrent(x,z);
}

export function buildCoastalFog(sea,wind){
  const key=sea+':'+wind;
  if(fieldCache.has(key))return fieldCache.get(key);
  const cells=Array(cols*rows),onshore=wind==='onshore';
  for(let i=0;i<cols;i++){
    const x=x0+i*step;
    let air=coastalAir.upwind,mist=0;
    for(let k=0;k<rows;k++){
      const j=onshore?rows-1-k:k,z=z0+j*step,bed=terrainHeight(x,z);
      const ocean=bed<-.08,sst=waterTemperature(x,z,sea);
      const land=Math.max(0,bed);
      const coolingLength=ocean?68:land>18?63:102;
      air=mix(air,ocean?sst:coastalAir.upwind,1-Math.exp(-step/coolingLength));
      const saturated=clamp((coastalAir.dewPoint-air)/3.6);
      const obstruction=clamp(1-land/40);
      mist=ocean?mix(mist,saturated,.19):Math.min(mix(mist,saturated,.14),mist*.90)*obstruction;
      cells[j*cols+i]={x,z,bed,sea:sst,air,mist};
    }
  }
  const field={cells,sea,wind};
  fieldCache.set(key,field);
  return field;
}

export function readCoastalFog(field,x,z){
  const u=(x-x0)/step,v=(z-z0)/step;
  if(u<0||u>cols-1||v<0||v>rows-1)return null;
  const i=Math.min(cols-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v)),k=j*cols+i;
  const quad=[field.cells[k],field.cells[k+1],field.cells[k+cols],field.cells[k+cols+1]];
  const sample=field=>mix(mix(quad[0][field],quad[1][field],u-i),mix(quad[2][field],quad[3][field],u-i),v-j);
  const mist=sample('mist'),density=.00040+.0112*mist;
  return {sea:sample('sea'),air:sample('air'),mist,dewPoint:coastalAir.dewPoint,visibility:1.6/density,density};
}

export const shoreFogSite={x:1490,z:338};
export const outerFogSite={x:1465,z:600};
export const isCoastalFogZone=(x,z)=>x>1190&&z>345&&z<780;

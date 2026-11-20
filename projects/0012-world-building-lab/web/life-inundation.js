import {channelSample} from './inland-geography.js';
import {connectedWetCells,wetlandPhases} from './wetland-layout.js';

export const outletRise=1.1;

export function outletFloodModel(elevation){
  const cols=72,rows=84,points=[],triangles=[];
  for(let j=0;j<=rows;j++){
    const p=channelSample(1,.255+.245*j/rows);
    const fade=Math.min(1,j/10,(rows-j)/10);
    for(let i=0;i<=cols;i++){
      const offset=(i/cols*2-1)*58;
      const x=p.x+p.nx*offset,z=p.z+p.nz*offset;
      points.push({x,z,bed:elevation(x,z),breadth:offset/p.half,
        low:p.level,high:p.level+outletRise*fade});
      if(j<rows&&i<cols){
        const k=j*(cols+1)+i;
        triangles.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);
      }
    }
  }
  const low=connectedWetCells(points,cols+1,p=>p.low-p.bed-.025);
  const high=connectedWetCells(points,cols+1,p=>p.high-p.bed-.025);
  return {points,triangles,levels:points.map((p,i)=>high[i]&&!low[i]?p.high:null),low,high};
}

export function wetlandFloodModel(model){
  const high=model.frameFor(wetlandPhases[0]);
  return {points:model.points,triangles:model.triangles,
    levels:model.points.map((p,i)=>high.readings[i].flooded&&!p.lowFlooded?p.bed+high.readings[i].depth:null),
    newlyFlooded:high.floodedBank};
}

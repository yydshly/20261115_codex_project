import {walkingSurface} from './large-world.js';
import {moveInWorld} from './cave-navigation.js';

export function surveyFoundationPassage(section,step=moveInWorld){
  let walked=0,total=0;
  const sections=[],minimumWalk=18;
  let from=null;
  for(let leg=1;leg<section.length;leg++){
    const a=section[leg-1],b=section[leg],length=Math.hypot(b.x-a.x,b.z-a.z),count=Math.ceil(length/.20);
    if(!from)from={...a,y:walkingSurface(a.x,a.z),underground:false,at:0};
    for(let j=1;j<=count;j++){
      const t=j/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=walkingSurface(x,z),at=total+length*t;
      const to={x,y,z,at,underground:false};
      const p=step(from,x,z),method=step(from,from.x,from.z)&&p&&!p.underground&&!p.indoor&&
        Math.abs(y-from.y)<=.14+(at-from.at)*.85?'walk':'air';
      const last=sections.at(-1);
      if(last?.method===method)last.points.push(to);
      else sections.push({method,points:[from,to]});
      from=to;
    }
    total+=length;
  }
  // Very short patches of dry ground are not usable walking links.
  const runs=[];
  for(const run of sections){
    const span=run.points.at(-1).at-run.points[0].at;
    const method=run.method==='walk'&&span>=minimumWalk?'walk':'air';
    if(method==='walk')walked+=span;
    const last=runs.at(-1);
    if(last?.method===method)last.points=last.points.concat(run.points.slice(1));
    else runs.push({...run,method});
  }
  const longest=runs.filter(run=>run.method==='walk').reduce((best,run)=>{
    const length=run.points.at(-1).at-run.points[0].at;
    return !best||length>best.length?{...run,length}:best;
  },null);
  return {runs,walked,total,longest};
}

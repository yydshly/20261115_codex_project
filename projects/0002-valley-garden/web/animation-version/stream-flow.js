import { streamBedProfileAt } from './stream-profile.js';

export function streamSurfaceOffset(z,side,time){
  const riffle=streamBedProfileAt(z,side*.5+.5).riffle,fade=Math.max(0,1-side*side);
  return fade*(.40+.60*riffle)*(Math.sin(z*2.1-time*3.4+side*2.3+Math.sin(z*.37)*.7)*.014+Math.sin(z*4.6-time*6.9-side*3.1)*.005);
}

export const streamSurfaceGLSL=`
  float movingSurface(float z,float side,float clock,float riffle){
    return max(0.,1.-side*side)*(.40+.60*riffle)*(sin(z*2.1-clock*3.4+side*2.3+sin(z*.37)*.7)*.014+sin(z*4.6-clock*6.9-side*3.1)*.005);
  }
`;

/** Travel time along the actual curved centreline; shallow riffles carry faster surface flow. */
export function createStreamFlow(riverX,riverWidth){
  const rows=[];let seconds=0,previous=null,obstacles=[];
  const speed=(z,side=0)=>(.78+streamBedProfileAt(z,.5).riffle*.48)*(1-.55*side*side);
  for(let z=-80;z<=90.001;z+=.25){
    const x=riverX(z);if(previous)seconds+=Math.hypot(x-previous.x,z-previous.z)/speed((z+previous.z)*.5);
    const row={x,z,seconds};rows.push(row);previous=row;
  }
  function timeAtZ(z){
    const f=Math.max(0,Math.min(rows.length-1,(z+80)*4)),i=Math.min(rows.length-2,Math.floor(f));
    return rows[i].seconds+(rows[i+1].seconds-rows[i].seconds)*(f-i);
  }
  function pointAt(z,side,out){
    const dz=.06,dx=riverX(z+dz)-riverX(z-dz),length=Math.hypot(dx,dz*2),tx=dx/length,tz=dz*2/length;
    let x=riverX(z)+side*riverWidth(z);
    for(const rock of obstacles){
      if(Math.abs(z-rock.z)>rock.radius*4+1)continue;
      const along=(x-rock.x)*tx+(z-rock.z)*tz,cross=(x-rock.x)*tz-(z-rock.z)*tx;
      const desired=rock.radius*1.22,push=Math.max(0,desired-Math.abs(cross))*Math.exp(-along*along/(desired*desired*2.6))*(cross<0?-1:1);
      x+=tz*push;z-=tx*push;
    }
    const width=riverWidth(z),centre=riverX(z);out.x=Math.max(centre-width*.88,Math.min(centre+width*.88,x));out.z=z;
    return out;
  }
  const ahead={},behind={};
  function sample(clock,side,out={}){
    const t=((clock%seconds)+seconds)%seconds;let low=0,high=rows.length-1;
    while(high-low>1){const mid=(low+high)>>1;if(rows[mid].seconds<t)low=mid;else high=mid;}
    const a=rows[low],b=rows[high],f=(t-a.seconds)/(b.seconds-a.seconds),z=a.z+f*(b.z-a.z);
    pointAt(z,side,out);pointAt(z+.025,side,ahead);pointAt(z-.025,side,behind);
    const dx=ahead.x-behind.x,dz=ahead.z-behind.z,length=Math.hypot(dx,dz);
    return Object.assign(out,{side:(out.x-riverX(out.z))/riverWidth(out.z),tx:dx/length,tz:dz/length,speed:speed(z,side)});
  }
  return {sample,speed,timeAtZ,duration:seconds,setObstacles(value){obstacles=value;}};
}

import {benchmarkLength,benchmarkNear,benchmarkPoint} from './benchmark-trail.js';
import {heightOnGrid,paleoCover} from './ice-age.js';

export const passageReasons={
  ice:'冰体覆盖',sea:'海水淹没',lake:'湖水淹没',river:'河道与融水',
  slope:'坡度过大',short:'干地过短',outside:'观察带之外'
};

const width=12,binSize=20;
const key=(i,j)=>i+','+j;
const cell=value=>Math.floor(value/binSize);

function indexWater(layers){
  const routeBins=new Set(),bins=new Map();
  const samples=Math.ceil(benchmarkLength/6);
  for(let i=0;i<=samples;i++){
    const {x,z}=benchmarkPoint(i/samples*benchmarkLength);
    for(let u=cell(x-width-6);u<=cell(x+width+6);u++){
      for(let v=cell(z-width-6);v<=cell(z+width+6);v++)routeBins.add(key(u,v));
    }
  }
  for(const {geometry,kind} of layers){
    const p=geometry.attributes.position.array,index=geometry.index?.array,count=index?.length??p.length/3;
    for(let i=0;i<count;i+=3){
      const a=(index?index[i]:i)*3,b=(index?index[i+1]:i+1)*3,c=(index?index[i+2]:i+2)*3;
      const minX=Math.min(p[a],p[b],p[c]),maxX=Math.max(p[a],p[b],p[c]);
      const minZ=Math.min(p[a+2],p[b+2],p[c+2]),maxZ=Math.max(p[a+2],p[b+2],p[c+2]);
      const dx=p[b]-p[a],dz=p[b+2]-p[a+2],ex=p[c]-p[a],ez=p[c+2]-p[a+2],area=dx*ez-dz*ex;
      if(Math.abs(area)<1e-7)continue;
      for(let u=cell(minX);u<=cell(maxX);u++){
        for(let v=cell(minZ);v<=cell(maxZ);v++){
          const id=key(u,v);
          if(!routeBins.has(id))continue;
          if(!bins.has(id))bins.set(id,[]);
          bins.get(id).push({p,a,b,c,dx,dz,ex,ez,area,kind});
        }
      }
    }
  }
  return (x,z)=>{
    let water=null;
    for(const {p,a,b,c,dx,dz,ex,ez,area,kind} of bins.get(key(cell(x),cell(z)))??[]){
      const ux=x-p[a],uz=z-p[a+2],u=(ux*ez-uz*ex)/area,v=(dx*uz-dz*ux)/area;
      if(u<-.00001||v<-.00001||u+v>1.00001)continue;
      const height=p[a+1]+(p[b+1]-p[a+1])*u+(p[c+1]-p[a+1])*v;
      if(!water||height>water.height)water={height,kind};
    }
    return water;
  };
}

export function createBenchmarkTimeNavigation(frame,waterGeometry){
  const waterAt=indexWater(waterGeometry),{grid,land,ice,covers,epoch}=frame;
  function inspect(x,z){
    const ground=heightOnGrid(grid,land,x,z),thickness=heightOnGrid(grid,ice,x,z);
    const surface=ground+thickness+(thickness>.01?.09:0);
    const water=waterAt(x,z),submerged=water?.height>surface+.02;
    const reason=submerged?water.kind:thickness>.45?'ice':benchmarkNear(x,z,width)===null?'outside':null;
    const i=Math.max(0,Math.min(grid.cols-1,Math.round((x-grid.x0)/grid.step)));
    const j=Math.max(0,Math.min(grid.rows-1,Math.round((z-grid.z0)/grid.step)));
    const coverId=covers[j*grid.cols+i];
    const cover=submerged?'水面':thickness>.45?'冰体':coverId==='ice'?'冰缘裸地':paleoCover[coverId]?.name??'岩土';
    return {x,z,y:surface,reason,cover,thickness,water:submerged?water:null,
      top:Math.max(surface,water?.height??epoch.sea)};
  }
  function reasonBetween(from,to,maxGrade=.80){
    if(from.reason||to.reason)return from.reason??to.reason;
    const span=Math.hypot(to.x-from.x,to.z-from.z);
    return Math.abs(to.y-from.y)>span*maxGrade+1e-6?'slope':null;
  }
  function step(from,x,z){
    const a=inspect(from.x,from.z),b=inspect(x,z),middle=inspect((from.x+x)/2,(from.z+z)/2);
    if(reasonBetween(a,middle)||reasonBetween(middle,b))return null;
    return {x,z,y:b.y,underground:false};
  }
  function shoreView(x,z){
    for(let distance=30;distance<=600;distance+=15){
      for(let i=0;i<24;i++){
        const angle=i*Math.PI/12,tx=x+distance*Math.cos(angle),tz=z+distance*Math.sin(angle);
        const y=heightOnGrid(grid,frame.surface,tx,tz);
        if(y>epoch.sea+1&&heightOnGrid(grid,frame.coldOcean,tx,tz)<.4)return {x:tx,y,z:tz};
      }
    }
    return null;
  }
  return {inspect,reasonBetween,step,shoreView};
}

export function surveyBenchmarkTime(navigation){
  const count=Math.ceil(benchmarkLength/.20);
  const points=Array.from({length:count+1},(_,i)=>{
    const {x,z,at}=benchmarkPoint(i/count*benchmarkLength);
    return {...navigation.inspect(x,z),at};
  });
  const causes=points.slice(1).map((b,i)=>{
    const a=points[i],m=navigation.inspect((a.x+b.x)/2,(a.z+b.z)/2);
    return navigation.reasonBetween(a,m,.77)??navigation.reasonBetween(m,b,.77);
  });
  const runs=[];
  for(let i=0;i<causes.length;i++){
    // Keep a small margin around unreliable lips and transitions.
    const cause=causes[i]??causes[i-1]??causes[i+1]??causes[i-2]??causes[i+2];
    const method=cause?'air':'walk',end=points[i+1].at;
    const last=runs.at(-1);
    if(last?.method===method){
      last.end=end;
      if(cause)last.reasons.add(cause);
    }else runs.push({method,start:points[i].at,end,reasons:new Set(cause?[cause]:[])});
  }
  const merged=[];
  for(const run of runs){
    if(run.method==='walk'&&run.end-run.start<12){
      run.method='air';run.reasons.add('short');
    }
    const last=merged.at(-1);
    if(last?.method===run.method){
      last.end=run.end;
      for(const reason of run.reasons)last.reasons.add(reason);
    }else merged.push(run);
  }
  const walked=merged.reduce((sum,run)=>sum+(run.method==='walk'?run.end-run.start:0),0);
  return {runs:merged,walked,total:benchmarkLength};
}

export function benchmarkRunAt(passage,distance){
  return passage.runs.find(run=>distance<run.end)??passage.runs.at(-1);
}

export const modernPassage={
  walked:benchmarkLength,total:benchmarkLength,runs:[{method:'walk',start:0,end:benchmarkLength,reasons:new Set()}]
};

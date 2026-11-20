// Surveyed centerline, in the existing map coordinates. Each row ends at an
// existing watershed station. The descent to the ice lake uses the moraine side.
const sections=[
  [[470,-590],[432.5,-545],[392.5,-502.5],[360,-455],[343.100,-425.601]],
  [[343.100,-425.601],[340.1,-410.601],[337.1,-398.601],[337.1,-374.601],[328.1,-365.601],[322.1,-353.601],[319.1,-347.601],[301.1,-329.601],[280.1,-308.601],[268.1,-296.601],[259.1,-287.601],[253.1,-281.601],[250.1,-278.601],[250.1,-266.601],[247.1,-263.601],[247.1,-257.601],[235.1,-245.601],[235.1,-242.601],[229.1,-236.601],[223.1,-233.601],[214.1,-233.601],[205.1,-227.601],[199.1,-227.601],[181.1,-218.601],[171,-215]],
  [[171,-215],[146,-177.5],[141.346,-138.531]],
  [[141.346,-138.531],[101.346,-98.531],[94.226,-91.735]],
  [[94.226,-91.735],[56.726,-121.735],[6.726,-141.735],[-50.774,-141.735],[-55.774,-141.735],[-58.274,-139.235],[-83.574,-121.328]],
  [[-83.574,-121.328],[-141.074,-131.328],[-198.574,-133.828],[-256.074,-133.828],[-313.574,-133.828],[-371.074,-133.828],[-428.574,-133.828],[-486.074,-133.828],[-543.574,-133.828],[-581.074,-131.328],[-583.574,-128.828],[-585.235,-128.916]],
  [[-585.235,-128.916],[-587.735,-131.416],[-635.235,-163.916],[-682.735,-196.416],[-730.235,-228.916],[-777.735,-263.916],[-827.735,-296.416],[-880.235,-321.416],[-932.735,-346.416],[-987.735,-366.416],[-1026.691,-381.434]],
  [[-1026.691,-381.434],[-1076.691,-388.934],[-1094.191,-388.934],[-1096.691,-388.934],[-1101.691,-388.934],[-1104.191,-388.934],[-1161.691,-388.934],[-1219.191,-388.934],[-1276.691,-386.434],[-1314.191,-378.934],[-1316.691,-378.934],[-1351.691,-381.434],[-1354.191,-381.434],[-1411.691,-381.434],[-1424.191,-386.434],[-1426.691,-388.934],[-1459.494,-394.817]],
  [[-1459.494,-394.817],[-1516.994,-394.817],[-1561.994,-397.317],[-1609.494,-389.817],[-1635.672,-389.902]]
];

export const trailHalfWidth=1.35;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const cells=new Map(),cellSize=24,segments=[],stations=[0];
let length=0;
for(const section of sections){
  for(let i=1;i<section.length;i++){
    const [x,z]=section[i-1],[x1,z1]=section[i],dx=x1-x,dz=z1-z,d=Math.hypot(dx,dz);
    const segment={x,z,dx,dz,d,at:length};
    segments.push(segment);
    length+=d;
    // Includes the verge used to clear procedural plants and rocks.
    for(let u=Math.floor((Math.min(x,x1)-12)/cellSize);u<=Math.floor((Math.max(x,x1)+12)/cellSize);u++){
      for(let v=Math.floor((Math.min(z,z1)-12)/cellSize);v<=Math.floor((Math.max(z,z1)+12)/cellSize);v++){
        const key=u+','+v;
        if(!cells.has(key))cells.set(key,[]);
        cells.get(key).push(segment);
      }
    }
  }
  stations.push(length);
}
export const benchmarkLength=length;
export const benchmarkStops=['雪岭起点','冰川侧坡','冰碛湖','融水溪','源池','跌水岸路','中央河谷','苇泽湿地','分汊河口','中央海湾']
  .map((name,i)=>({name,at:stations[i]}));

export function benchmarkPoint(distance){
  const at=clamp(distance,0,length);
  let low=0,high=segments.length-1;
  while(low<high){
    const mid=(low+high)>>1;
    if(segments[mid].at+segments[mid].d<at)low=mid+1;
    else high=mid;
  }
  const s=segments[low],t=(at-s.at)/s.d;
  return {x:s.x+s.dx*t,z:s.z+s.dz*t,at};
}

export function benchmarkNear(x,z,radius){
  const bin=cells.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize));
  if(!bin)return null;
  let best=null,nearest=radius*radius;
  for(const s of bin){
    const u=clamp(((x-s.x)*s.dx+(z-s.z)*s.dz)/(s.d*s.d),0,1);
    const distance=(x-s.x-s.dx*u)**2+(z-s.z-s.dz*u)**2;
    if(distance>nearest)continue;
    nearest=distance;
    best=s.at+u*s.d;
  }
  return best;
}

export function benchmarkNormal(at){
  const a=benchmarkPoint(at-.6),b=benchmarkPoint(at+.6),d=Math.hypot(b.x-a.x,b.z-a.z)||1;
  return {x:(b.z-a.z)/d,z:(a.x-b.x)/d};
}

let grade=null;
export function benchmarkElevation(at,support){
  const steps=Math.ceil(length/.32),stride=length/steps;
  if(!grade){
    const profile=new Float32Array(steps+1);
    for(let i=0;i<=steps;i++){
      const s=i*stride,p=benchmarkPoint(s),n=benchmarkNormal(s);
      profile[i]=Math.max(...[-trailHalfWidth,0,trailHalfWidth].map(offset=>
        support(p.x+offset*n.x,p.z+offset*n.z)))+.10;
    }
    // Raise low portions into a walkable grade, keeping the original catchment
    // and river bed. Raised sections are rendered as an actual deck.
    const maximumRise=.70*stride;
    for(let i=1;i<=steps;i++)profile[i]=Math.max(profile[i],profile[i-1]-maximumRise);
    for(let i=steps-1;i>=0;i--)profile[i]=Math.max(profile[i],profile[i+1]-maximumRise);
    grade=profile;
  }
  const u=clamp(at/stride,0,steps),i=Math.min(steps-1,Math.floor(u));
  return grade[i]+(grade[i+1]-grade[i])*(u-i);
}

export class FootpathWalk{
  constructor(length,point){this.length=length;this.point=point;}
  distance=0;
  playing=false;
  obstacle=null;
  reset(distance=0){this.distance=clamp(distance,0,this.length);this.playing=false;this.obstacle=null;}
  pause(){this.playing=false;}
  get done(){return this.distance>=this.length;}
  advance(metres,step){
    while(this.playing&&metres>0&&!this.done){
      const stride=Math.min(.22,metres),target=this.point(this.distance+stride);
      if(!step(target)){this.obstacle=target;this.pause();return;}
      this.distance=target.at;
      metres-=stride;
    }
    if(this.done)this.pause();
  }
}

export class BenchmarkWalk extends FootpathWalk{
  constructor(){super(benchmarkLength,benchmarkPoint);}
}

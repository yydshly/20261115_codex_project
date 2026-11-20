// Narrow bands connect the edges of the existing terrain and habitat districts.
export const transitionBelts=[
  {id:'north',name:'苔原—冷坡—林缘',width:79,
    points:[[-705,-1170],[-625,-1080],[-680,-956],[-790,-839],[-875,-776],[-980,-723]]},
  {id:'plain',name:'平原湿沟—暖坡竹林',width:72,
    points:[[-156,526],[-88,604],[7,660],[86,692],[173,700]]},
  {id:'lee',name:'湿林—山脊—林草坡',width:110,
    points:[[-910,944],[-837,979],[-758,1030],[-677,1095],[-625,1107],[-550,1109],[-464,1165],[-376,1198],[-256,1235]]}
];

const clamp=v=>Math.min(1,Math.max(0,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const bands=transitionBelts.map(belt=>{
  const legs=makeLegs(belt.points),length=legs.at(-1).start+legs.at(-1).length;
  return {...belt,legs,length,
    x0:Math.min(...belt.points.map(p=>p[0]))-belt.width,x1:Math.max(...belt.points.map(p=>p[0]))+belt.width,
    z0:Math.min(...belt.points.map(p=>p[1]))-belt.width,z1:Math.max(...belt.points.map(p=>p[1]))+belt.width};
});

function makeLegs(points){
  let start=0;
  return points.slice(1).map(([bx,bz],i)=>{
    const [x,z]=points[i],dx=bx-x,dz=bz-z,length=Math.hypot(dx,dz);
    const leg={x,z,dx,dz,length,start};
    start+=length;
    return leg;
  });
}

export function transitionClimate(climate,band){
  if(!band)return climate;
  const {id,position,strength}=band;
  const moisture=id==='north'?.39+.23*position:id==='plain'?.49+.23*position:.76-.44*position;
  return {...climate,moisture:climate.moisture+(moisture-climate.moisture)*strength*.62};
}

export function transitionAt(x,z){
  for(const band of bands){
    if(x<band.x0||x>band.x1||z<band.z0||z>band.z1)continue;
    let distance=band.width,position=0;
    for(const leg of band.legs){
      const {x:ax,z:az,dx,dz,length,start}=leg;
      const u=clamp(((x-ax)*dx+(z-az)*dz)/length**2);
      const d=Math.hypot(x-ax-dx*u,z-az-dz*u);
      if(d<distance){distance=d;position=(start+length*u)/band.length;}
    }
    const strength=(1-ease(distance/band.width))*ease(position/.16)*ease((1-position)/.18);
    if(strength>0)return {id:band.id,position,strength};
  }
  return null;
}

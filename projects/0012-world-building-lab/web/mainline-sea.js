import {benchmarkLength,benchmarkPoint} from './benchmark-trail.js';
import {benchmarkDeck,terrainHeight} from './large-world.js';
import {bottomLight,coastStops} from './coast-sea.js';

const end=benchmarkPoint(benchmarkLength);
const bed=({x,z})=>terrainHeight(x,z);
const inRange=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=v=>{const t=inRange(v,0,1);return t*t*(3-2*t);};
const coast=id=>coastStops.find(p=>p.id===id);
const xy=id=>{const {x,z}=coast(id);return [x,z,id];};

// Keep the surface leg in existing water at least two metres deep,
// existing water around the southern headlands and outside the island chain.
const waypoints=[
  [end.x,end.z],[-1875,-420],[-1908,-238],[-1908,1280],[-1908,1460],[-1870,1558],
  [-1550,1558],[-800,1560],[-360,1560],[300,1560],[1080,1560],[1225,1545],
  [1225,920],[1210,600],[1290,481],[1370,440,'current'],[1470,418],[1508,392,'rock'],
  xy('grass'),[1552,349],xy('coral'),[1602,385],[1560,448],[1533,515],[1509,578],
  [1495,650],[1495,754],[1500,930],xy('shelf'),[1544,1136],xy('slope'),
  [1719,1298],[1775,1370],xy('trench')
];
export const seaTrack=waypoints.map(([x,z,id],i,list)=>({x,z,id,d:i?Math.hypot(x-list[i-1][0],z-list[i-1][1]):0}));
let length=0;
for(const node of seaTrack){length+=node.d;node.at=length;}
export const seaLength=length;
export const seaStations=Object.fromEntries(seaTrack.filter(p=>p.id).map(p=>[p.id,p]));
export const seaEntry=seaStations.rock.at;

export function seaPoint(distance){
  const at=inRange(distance,0,seaLength);
  let lo=1,hi=seaTrack.length-1;
  while(lo<hi){
    const mid=(lo+hi)>>1;
    if(seaTrack[mid].at<at)lo=mid+1;
    else hi=mid;
  }
  const b=seaTrack[lo],a=seaTrack[lo-1],t=(at-a.at)/b.d;
  return {x:mix(a.x,b.x,t),z:mix(a.z,b.z,t),at};
}

function eyeHeight(point,depth){
  const at=point.at,harbor=benchmarkDeck(benchmarkLength)+1.72;
  if(at<=seaEntry)return mix(harbor,4.3,ease(at/85));
  const bottom=-depth,clearance=mix(1.34,5.4,ease((depth-5)/45));
  const submerged=Math.min(-.44,bottom+clearance);
  return Math.max(bottom+.82,mix(4.3,submerged,ease((at-seaEntry)/38)));
}

export function seaBottom(depth,at){
  if(at<seaEntry)return '近岸海床';
  if(depth<8)return at<seaStations.coral.at-24?'浅海砂底与海草':'岩礁与硬底群落';
  if(depth<72)return '陆架砂质与粉砂';
  if(depth<265)return '大陆坡岩面与沉积凹槽';
  return '海沟细粒沉积';
}

export function seaFrame(distance){
  const p=seaPoint(distance),depth=-bed(p),y=eyeHeight(p,depth);
  const immersed=ease((.06-y)/.85);
  const lead=p.at<seaEntry?mix(72,17,ease((p.at-seaEntry+140)/140)):mix(9,20,ease(depth/76));
  const target=seaPoint(p.at+lead);
  if(target.at-p.at<.8){
    const previous=seaPoint(p.at-12);
    const dx=p.x-previous.x,dz=p.z-previous.z,d=Math.hypot(dx,dz);
    target.x=p.x+dx/d*6;target.z=p.z+dz/d*6;
  }
  const floor=bed(target),targetY=y<0?Math.min(-.15,Math.max(floor+.48,y-mix(.62,5,ease(depth/100)))):Math.max(-.4,y-1.9);
  let lookY=targetY;
  if(y<-.24){
    for(let i=1;i<=18;i++){
      const u=i/18,ground=terrainHeight(mix(p.x,target.x,u),mix(p.z,target.z,u))+.30;
      lookY=Math.max(lookY,y+(ground-y)/u);
    }
  }
  return {p:{...p,y},target:{...target,y:Math.min(y<-.24?-.13:Infinity,lookY)},depth,immersed,
    light:bottomLight(depth,mix(.125,.091,ease(depth/85))),bottom:seaBottom(depth,p.at),
    mode:y<-.08?'水下观测':p.at>seaEntry?'入水':'沿岸航行'};
}

export function seaPace(at){
  if(at>seaStations.current.at-165&&at<seaEntry)return 29;
  if(at<seaEntry)return mix(42,192,ease(at/180)*(1-ease((at-seaEntry+240)/240)));
  if(at<seaStations.coral.at+60)return 10;
  return mix(25,41,ease((at-seaStations.coral.at-60)/410));
}

import {terrainHeight} from './large-world.js';
import {tropicalChannel,tropicalRiverField} from './tropical-layout.js';
import {tides} from './estuary-layout.js';
import {connectedWetCells} from './wetland-layout.js';

export const coastSeaHref='expedition.html?plan=coast-sea#build-1';
export const coastTides=tides;
export const coastHabitats={
  mud:{name:'河口细泥与粉砂',community:'耐盐度波动的底栖贝类、管栖动物',color:'#a3936e'},
  intertidal:{name:'潮间带硬岩',community:'岩面贝类、低矮藻和潮池附着生物',color:'#737e79'},
  sand:{name:'稳定细砂与浅海沉积',community:'有足够底光的扎根海草',color:'#d7c995'},
  reef:{name:'暖水礁坪硬底',community:'造礁珊瑚与礁区动物',color:'#889288'},
  shelf:{name:'陆架粉砂及砾屑',community:'海星、底栖贝类和小型底栖动物',color:'#a7a99a'},
  slope:{name:'坡面沉积与硬底出露',community:'硬底附着海绵与底栖动物',color:'#7c8a89'},
  trench:{name:'海沟细粒沉积',community:'海参等摄食沉积有机物的底栖动物',color:'#8b8b90'},
  transit:{name:'开阔水域下方的海床',community:'外海水体及过渡底质',color:'#a0a491'}
};

const stop=(id,name,x,z,range,habitat,clarity,detail)=>({id,name,x,z,range,habitat,clarity,detail});
const mouth=tropicalChannel(.86);
export const coastStops=[
  stop('mouth','西南浑浊河口',mouth.x,mouth.z,190,'mud',.82,'河流带来细泥，潮位改变水深和露滩。对照同样 3 米水深，浑浊水里的底光更弱。这里的底质与盐度波动适合部分底栖贝类，海草覆盖较稀。'),
  stop('open','南部外海 · 沿岸转场',-360,1560,840,'transit',.19,'沿南侧海域绕过陆地，再进入东部岩岸。路线上方是同一片海，浅海礁坪和深海海沟都使用同一个零米高程基准。'),
  stop('rock','东部岩岸 · 潮间带',1490,356,145,'intertidal',.16,'切到低潮，硬岩、贝类附着面与高处水线露出。高潮淹回岩脚。潮水能到达的高程决定潮间带，上下是否有光还要看水的透明度。'),
  stop('grass','清浅砂底 · 海草床',1522,349,158,'sand',.13,'这片稳定细砂可让海草扎根。水深与河口接近，清水把更多光送到底，海草能形成片状覆盖。往旁边的硬质礁坪对照，可看到同一水域里底质就能改变群落。'),
  stop('coral','暖水礁坪 · 造礁珊瑚',1587,342,155,'reef',.115,'暖水教学样区。清浅、稳定的硬底为造礁珊瑚提供附着面和光照。沙底和硬底在邻近深度形成不同群落。'),
  stop('shelf','大陆架 · 深处软底',1500,1030,335,'shelf',.095,'地形仍较平缓，水深已经让底光大幅衰减。局部有粉砂与砾屑，主要观察海星、贝类等底栖动物。'),
  stop('slope','大陆坡 · 硬底出露',1650,1190,320,'slope',.09,'海床坡降增大。细粒会在凹槽积存，裸岩给海绵等附着生物提供表面。观察灯可照亮局地底质。'),
  stop('trench','深海海沟 · 细粒底',1810,1400,340,'trench',.09,'海面光线传到沟底已低到接近零。细粒沉积和下落的有机碎屑可支持部分底栖动物。画面中的可见光来自观察灯，深度沿用现有地图压缩尺度。')
];
const p=(x,z)=>({x,z});
export const coastPath=[
  coastStops[0],p(-1745,1340),p(-1820,1382),p(-1840,1460),p(-1840,1560),coastStops[1],p(1225,1560),
  p(1225,920),p(1210,600),p(1290,481),p(1370,440),p(1470,418),p(1508,392),p(1498,370),
  ...coastStops.slice(2,5),p(1605,385),p(1542,555),p(1530,720),...coastStops.slice(5)
];
export const coastAuditPath=coastPath.map(({x,z})=>[x,z]);

const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const mix=(a,b,t)=>a+(b-a)*t;
const mouthSurface=(t,key)=>tropicalChannel(t).level+tides[key].height*clamp((t-.70)/.23);
export const bottomLight=(depth,k)=>Math.exp(-Math.max(0,depth)*k);

export function coastRead(site,tide,elevation=terrainHeight){
  const bed=elevation(site.x,site.z),surface=site.id==='mouth'?mouthSurface(.86,tide):tides[tide].height;
  const depth=Math.max(0,surface-bed),exposed=bed>=surface;
  const attenuation=site.clarity+(site.habitat==='mud'?({flood:-.05,high:0,ebb:.14,low:.08})[tide]:0);
  return {bed,surface,depth,attenuation,exposed,light:exposed?null:bottomLight(depth,attenuation),
    atThree:bottomLight(3,attenuation),habitat:coastHabitats[site.habitat]};
}

export function coastProfile(elevation=terrainHeight){
  let length=0;const points=[];
  for(let j=1;j<coastPath.length;j++){
    const a=coastPath[j-1],b=coastPath[j],span=Math.hypot(a.x-b.x,a.z-b.z),count=Math.ceil(span/9);
    for(let i=j===1?0:1;i<=count;i++){
      const u=i/count,x=mix(a.x,b.x,u),z=mix(a.z,b.z,u);
      points.push({x,z,y:elevation(x,z),distance:length+span*u});
    }
    length+=span;
  }
  return {points,length};
}

export function southwestTidePatch(elevation=terrainHeight){
  const bed=[],cells=[],rows=44,cols=38;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const t=mix(.805,.929,j/rows),q=tropicalChannel(t),breadth=(2*i/cols-1)*1.78,offset=q.half*breadth;
    const x=q.x+q.nx*offset,z=q.z+q.nz*offset;
    bed.push({x,z,t,breadth,bed:elevation(x,z)});
    if(i<cols&&j<rows){
      const k=j*(cols+1)+i;
      cells.push({indices:[k,k+1,k+cols+1,k+cols+2]});
    }
  }
  return key=>{
    const level=p=>mouthSurface(p.t,key);
    const wet=connectedWetCells(bed,cols+1,p=>level(p)-p.bed-.012);
    return {bed,cells,level,wet};
  };
}

const hash=(i,s)=>{const n=Math.sin(i*173.137+s*53.79)*43758.5453;return n-Math.floor(n);};
const radius={mud:25,intertidal:30,sand:25,reef:32,shelf:47,slope:54,trench:52};
export function coastPlacements(elevation=terrainHeight){
  return coastStops.filter(p=>p.habitat!=='transit').map(site=>{
    const records=[],r=radius[site.habitat];
    for(let i=0;i<(site.habitat==='sand'?310:site.habitat==='reef'?172:106);i++){
      const a=i*2.399963,radius=r*Math.sqrt(hash(i,1)),x=site.x+Math.cos(a)*radius,z=site.z+Math.sin(a)*radius*.72;
      const y=elevation(x,z),depth=-y,slope=Math.hypot(elevation(x+1,z)-elevation(x-1,z),elevation(x,z+1)-elevation(x,z-1))/2;
      const light=bottomLight(depth,site.clarity),v=hash(i,2);
      const conditions={
        mud:depth>.6&&depth<5&&tropicalRiverField(x,z).distance<tropicalRiverField(x,z).half*1.55,
        intertidal:y> -1.25&&y<.66,
        sand:depth>1.3&&depth<7&&light>.31&&slope<.45,
        reef:depth>2.2&&depth<10&&light>.25,
        shelf:depth>46,
        slope:depth>96,
        trench:depth>265
      };
      if(!conditions[site.habitat])continue;
      if(site.habitat==='sand'&&v<.35+.13*Math.sin(x*.65+z*.21))continue;
      const types={mud:v>.45?'shell':'worms',intertidal:v>.52?'algae':'mussel',
        sand:'grass',reef:v>.56?'coral':'massive',shelf:v>.46?'star':'shell',
        slope:v>.30?'sponge':'star',trench:v>.32?'cucumber':'shell'};
      records.push({kind:types[site.habitat],x,y,z,seed:hash(i,3),size:.60+.78*hash(i,4)});
    }
    return {site,records};
  });
}

export function coastDive(site,reading,elevation=terrainHeight){
  if(site.id==='open'||reading.depth<1.65)return null;
  const deep=reading.depth>30,mud=site.habitat==='mud';
  const distance=deep?18:mud?7.5:9.5,targetY=reading.bed+(deep?1.25:.55);
  // Prefer the downslope side in deep water so the view looks across the bed.
  const angles=deep?[.37,1.22,1.74,.10,2.3,3.4,5.42,4.1]:[1.54,2.12,.89,2.76,.38,3.4,5.42,4.1];
  for(const d of [distance,distance*.78,distance*.55,3.5]){
    for(const angle of angles){
      const x=site.x+Math.cos(angle)*d,z=site.z+Math.sin(angle)*d;
      const y=Math.min(reading.surface-.36,Math.max(elevation(x,z)+.9,targetY+(deep?10:1.9)));
      if(y-elevation(x,z)<.8||y-targetY<.1)continue;
      const eye={x,y,z,targetY};
      if(!diveSightline(eye,site,elevation))continue;
      return {...eye,surface:reading.surface,light:reading.light,deep,ambient:deep?.90:1.48,fill:deep?.52:.28,
        density:mud?.043:deep?.010:.016,
        color:mud?'#65705c':deep?'#233e51':'#428c9b'};
    }
  }
  return null;
}

export function diveSightline(eye,site,elevation=terrainHeight){
  for(let step=1;step<=18;step++){
    const t=step/18,x=mix(eye.x,site.x,t),z=mix(eye.z,site.z,t);
    if(mix(eye.y,eye.targetY,t)<elevation(x,z)+.25)return false;
  }
  return true;
}

export function divePoseClear(eye,target,surface,elevation=terrainHeight){
  if(eye.y>surface-.24||eye.y<elevation(eye.x,eye.z)+.62||target.y>surface-.12)return false;
  return diveSightline({x:eye.x,y:eye.y,z:eye.z,targetY:target.y},target,elevation);
}

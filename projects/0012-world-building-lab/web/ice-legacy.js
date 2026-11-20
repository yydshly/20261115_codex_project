import {terrainHeight} from './large-world.js';
import {comparisonBed,epochs,heightOnGrid,iceAgeLakes,paleoCover} from './ice-age.js';
import {glacialWaterAt,iceField,iceSurface,meltLines,ICE_LAKE,iceSample} from './glacial-geography.js';
import {riverSample} from './water-system.js';

export const legacyHref='expedition.html?plan=legacy#build-1';
export const legacyPeriods=['glacial','early','pulse','warming','holocene','now'];
export const legacyColors={ice:'#83c6e3',moraine:'#dbc186',retained:'#bad18e',exposed:'#7fe6d9',submerged:'#c9a5ee',fill:'#ceb59a'};
const stop=(id,name,p,range,detail)=>({id,name,p,range,detail});
const bank=(s,f)=>({x:s.x+s.nx*s.half*f,z:s.z+s.nz*s.half*f});
const moraine={x:181,z:-223};
const fromRiver=(t)=>riverSample(t);
const stations=[
  stop('ice-edge','雪岭 · 旧冰缘', {x:355,z:-280},302,'同一片山坡在盛冰期位于冰缘内。冰体变薄后，冰缘向上游收缩，留下裸岩和融水仍能利用的低槽。紫蓝线记录盛冰期冰缘，亮蓝线标当前冰缘。'),
  stop('moraine','旧冰碛 · 冰舌退后露出的砾脊',moraine,176,'这里是下段冰缘留下的冰碛示意。冰把砾石和细料带到边缘，冰退后这条砾脊仍留在岸边。剖面显示同一条脊在各期是被冰覆盖还是露出。'),
  stop('lake','冰碛湖 · 盆地留住融水',ICE_LAKE,208,'冰曾覆盖现在的湖盆。退冰后低洼处容纳融水，较高的岩槛和冰碛限制外泄，溢水沿原有出水溪进入中央河。'),
  stop('valley','中央河谷 · 宽谷与现河槽',fromRiver(.43),265,'较宽的谷地保留，下泄的水沿低处聚成较窄的现代河槽。地形既保留早期谷形，也可被流水切沟、搬运和沉积继续改造。'),
  stop('wetland','苇泽湿地 · 低滩和细粒沉积',bank(fromRiver(.673),-1.055),238,'低平河岸让洪水可以铺开，流速降低时易沉降细粒。退水后细泥仍保湿，高低不同的滩面分别支持挺水草、湿草或更耐短期淹水的植被。'),
  stop('mouth','中央河口 · 海水回到旧低谷',fromRiver(.85),255,'低海面时这里靠内陆，河继续越过出露海床。海面回升后，低谷先被占据，入海口向陆侧移动。细泥、潮汐和淡水共同改变岸边的湿地位置。'),
  stop('inner','内侧陆架 · 被淹的古河床',{x:-1810,z:-197.5},231,'这段沟槽在盛冰期仍走河水。沿时间节点看海水何时到达，再打开遗存剖面核对旧槽和现代床面。槽底与床面之间的棕色面积示意沉积回填的空间。'),
  stop('outer','较外侧陆架 · 较早被淹的河段',{x:-1890,z:-218},247,'外侧槽床较低，海水回升时比内侧河段更早被淹。观察远处入海圈如何向陆侧移动。紫线表示古槽仍可在海面以下按剖面追踪。')
];
export const legacyStops=stations;
export const legacyAuditPath=stations.map(({p})=>[p.x,p.z]);
const mix=(a,b,t)=>a+(b-a)*t;
const metres=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function marineAt(frame,p){
  const {grid,coldOcean,surface,epoch}=frame;
  return heightOnGrid(grid,surface,p.x,p.z)<=epoch.sea+.001&&heightOnGrid(grid,coldOcean,p.x,p.z)>.001;
}

function iceAt(frame,p){
  if(frame.ice)return heightOnGrid(frame.grid,frame.ice,p.x,p.z);
  const field=iceField(p.x,p.z);
  if(!field||field.normalized>=1)return 0;
  return Math.max(0,iceSurface(field,field.normalized)-terrainHeight(p.x,p.z));
}

export function legacyReading(base,frame,site){
  const {p,id}=site,{grid}=base;
  const former=heightOnGrid(grid,base.land,p.x,p.z);
  const present=comparisonBed(p.x,p.z);
  const ground=frame.id==='now'?present:heightOnGrid(grid,frame.land,p.x,p.z);
  const ice=iceAt(frame,p),ocean=marineAt(frame,p);
  const lake=frame.id==='now'?glacialWaterAt(p.x,p.z)?.lake:
    id==='lake'&&ground+ice<iceAgeLakes[0].level;
  const k=Math.round((p.z-grid.z0)/grid.step)*grid.cols+Math.round((p.x-grid.x0)/grid.step);
  const cover=paleoCover[frame.covers?.[k]]?.name;
  let status='露出陆地';
  if(ocean)status=id==='mouth'&&frame.id==='now'?'现代河口水域':'被海水覆盖';
  else if(ice>1.7)status='冰体覆盖';
  else if(lake)status='开阔冰碛湖';
  else if(id==='moraine')status='砾脊露出';
  else if(id==='wetland'&&frame.id==='now')status='现代湿地低滩';
  else if(['inner','outer','mouth'].includes(id))status='低海面古河段';
  return {former,present,ground,ice,ocean,lake,cover,status,level:frame.epoch.sea,
    fill:['mouth','inner','outer'].includes(id)?Math.max(0,present-former):null};
}

export function makeLegacySurvey(base){
  const central=base.channels.central,offshore=central.filter(p=>p.x>=-1920&&p.x< -1694);
  const inner=offshore.reduce((a,b)=>Math.abs(a.x+1810)<Math.abs(b.x+1810)?a:b);
  const outer=offshore.reduce((a,b)=>Math.abs(a.x+1890)<Math.abs(b.x+1890)?a:b);
  const stops=stations.map(s=>s.id==='inner'?{...s,p:inner}:s.id==='outer'?{...s,p:outer}:s);
  const path=[iceSample(.43),stops[0].p,stops[1].p,stops[2].p,
    ...meltLines[1].filter((_,i)=>i%15===0),...central.filter((p,i)=>p.x>=-1920&&(i%3===0||i===central.length-1))];
  const coastline=central.filter(p=>p.x>=-1912&&(p.t===undefined||p.t>.79));
  return {base,stops,path,coastline,offshore};
}

export function drownedShelfDistance(survey,frame){
  const {offshore}=survey;
  return offshore.slice(1).reduce((sum,p,i)=>{
    const a=offshore[i],pa=marineAt(frame,a),pb=marineAt(frame,p);
    return sum+metres(a,p)*(Number(pa)+Number(pb))*.5;
  },0);
}

export function legacyCrossSection(survey,site){
  const {base,coastline}=survey,{p,id}=site;
  let v=site.id==='valley'?riverSample(.43):site.id==='wetland'?riverSample(.673):null;
  if(!v){
    const nearest=coastline.reduce((a,b)=>metres(a,p)<metres(b,p)?a:b);
    const i=coastline.indexOf(nearest),a=coastline[Math.max(0,i-1)],b=coastline[Math.min(i+1,coastline.length-1)];
    const span=metres(a,b);
    v={nx:(b.z-a.z)/span,nz:(a.x-b.x)/span};
  }
  const half=id==='valley'?76:id==='wetland'?72:id==='mouth'?84:65;
  return Array.from({length:67},(_,i)=>{
    const d=mix(-half,half,i/66),x=p.x+v.nx*d,z=p.z+v.nz*d;
    return {x,z,d:d+half,former:heightOnGrid(base.grid,base.land,x,z),now:comparisonBed(x,z)};
  });
}

export function legacyEpochLabel(id){
  const {sea}=epochs[id];return sea>0?'+'+sea:String(sea);
}

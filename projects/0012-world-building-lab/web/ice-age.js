import {terrainHeight} from './large-world.js';
import {oceanConnected} from './watershed-balance.js';
import {environmentLines} from './environment-lines.js';
import {iceField,ICE_LAKE,meltLines} from './glacial-geography.js';
import {ICE_CAP,iceCapField} from './polar-layout.js';
import {regionalClimate} from './regional-geography.js';
import {SALT_LAKE} from './salt-layout.js';
import {oceanProfile} from './ocean-layout.js';
import {riverSample} from './water-system.js';
import {tropicalChannel} from './tropical-layout.js';
import {waterRoutes} from './world-climate-data.js';

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const ease=v=>{const t=clamp(v);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const sample=(steps,at)=>Array.from({length:steps+1},(_,i)=>at(i/steps));
export const iceAgeSources=[
  {name:'末次间冰期海平面与冰量 · Dutton、Lambeck',url:'https://doi.org/10.1126/science.1205749'},
  {name:'末次间冰期花粉与植被记录 · Väliranta 等',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC6054633/'},
  {name:'末次冰期开始时的冰量变化 · Bahadory 等',url:'https://doi.org/10.5194/cp-17-397-2021'},
  {name:'全球海平面重建与数据 · Spratt、Lisiecki',url:'https://doi.org/10.25921/rd66-5820'},
  {name:'古海平面重建 · Lambeck 等',url:'https://doi.org/10.1073/pnas.1411762111'},
  {name:'冰盖和山地冰川 · Clark 等',url:'https://doi.org/10.1126/science.1172873'},
  {name:'冰期植被重建 · BIOME 6000',url:'https://doi.org/10.1046/j.1365-2486.2003.00640.x'}
];
export const epochs={
  interglacial:{name:'末次间冰期',label:'间冰期',age:'约 12.5 万年前',sea:8,
    summary:'海水越过现在的岸线，沿中央河和西南河的低谷伸向内陆。雪岭和北境只保留小块冰体，较温暖的湿坡长出更多阔叶林。'},
  inception:{name:'末次冰期初期',label:'11 万年',age:'约 11 万年前',sea:-17,growth:.32,cooling:.095,drying:.049,
    summary:'冰体从高处和北境开始扩大，海面下降。西南浅岸出露，两条河向新的低海面延伸。'},
  earlyRebound:{name:'冰期早段回暖',label:'10 万年',age:'约 10 万年前',sea:-7,growth:.19,cooling:.035,drying:.025,
    summary:'部分冰缘后退，海面阶段性回升。低湾再次进水，湿坡上的疏林局部恢复。'},
  stadial:{name:'冰期再度扩张',label:'6.5 万年',age:'约 6.5 万年前',sea:-30,growth:.66,cooling:.156,drying:.085,
    summary:'冰舌变厚并下伸，北部冻原扩展。海岸再度外移，中央海湾成为河流贯穿的低地。'},
  midRebound:{name:'冰期中段海面回升',label:'5.1 万年',age:'约 5.1 万年前',sea:-23,growth:.47,cooling:.102,drying:.065,
    summary:'海面比前一帧回升，原河口向陆侧移动。山地冰缘略有收缩，较低河谷仍可保留草灌。'},
  approachMaximum:{name:'接近盛冰期',label:'3 万年',age:'约 3 万年前',sea:-38,growth:.88,cooling:.185,drying:.102,
    summary:'高山与北境冰体再次扩大，浅陆架进一步露出。冷草原和冻原铺开，河道延长到更远的岸线。'},
  glacial:{name:'末次盛冰期',label:'盛冰期',age:'2.1 万年前',sea:-48,thinning:0,cooling:.205,drying:.11,
    summary:'更多水封存在陆地冰体中，浅陆架出露。长河槽跨过现今的海湾，寒冷让冻原和冷草原扩张。'},
  early:{name:'退冰开始',label:'1.65 万年',age:'1.65 万年前',sea:-43,thinning:.16,cooling:.182,drying:.098,
    summary:'冰体开始变薄，薄冰边缘率先后退。海水淹过最外侧低地，宽阔陆架仍大多露在水面以上。'},
  pulse:{name:'快速海侵后',label:'1.4 万年',age:'1.4 万年前',sea:-27,thinning:.38,cooling:.134,drying:.078,
    summary:'前一段海平面快速上升，海水沿低处推入原河谷。融水湖逐渐露出，较暖的湿坡上疏林扩展。'},
  warming:{name:'全新世初',label:'1.15 万年',age:'1.15 万年前',sea:-20,thinning:.63,cooling:.079,drying:.05,
    summary:'跨入全新世初，河口继续向陆侧迁移，高山残冰收缩，原冰缘的新露地逐步被草本和灌丛占据。'},
  holocene:{name:'海岸渐近现今',label:'8200 年',age:'8200 年前',sea:-5,thinning:.86,cooling:.027,drying:.021,
    summary:'海水已进入中央低谷和西南旧河槽，海湾与岛间水道更接近现在。临海低地逐渐形成河口草沼。'},
  now:{name:'现在',label:'现在',sea:0,
    summary:'海水覆盖浅陆架，中央河和西南河在现在的湾岸入海，植被沿今天的水热梯度分布。'}
};
export const iceAdvanceIds=Object.keys(epochs).filter(id=>epochs[id].growth!==undefined);
export const paleoCover={
  ice:{name:'冰体',color:'#d9eff4'},
  tundra:{name:'冻原',color:'#87998e'},
  steppe:{name:'冷草原',color:'#a4a074'},
  refuge:{name:'稀疏耐冷林',color:'#5f7c61'},
  gravel:{name:'裸岩与砂砾',color:'#958574'},
  pioneer:{name:'新露地草灌',color:'#a19970'},
  woodland:{name:'混交林与暖湿林',color:'#3c674a'},
  wetland:{name:'河口草沼',color:'#668b68'},
  broadleaf:{name:'阔叶林',color:'#457e4f'},
  warmScrub:{name:'暖地草灌',color:'#9aa269'},
  alpine:{name:'高山草甸与裸岩',color:'#8d8875'}
};
export const epochGrid={x0:-2240,z0:-1920,cols:225,rows:193,step:20};
const worldExtent={x:1920,z:1600};

// Extend the outer submerged shelf only for the ice-age survey. The seam
// starts at the existing bed, with the same horizontal and vertical datum.
export function comparisonBed(x,z){
  const edgeX=clamp(x,-worldExtent.x,worldExtent.x),edgeZ=clamp(z,-worldExtent.z,worldExtent.z);
  const edge=terrainHeight(edgeX,edgeZ),d=Math.hypot(x-edgeX,z-edgeZ);
  if(d===0)return edge;
  const angle=Math.atan2(edgeZ/worldExtent.z,edgeX/worldExtent.x);
  const slope=.105+.060*Math.sin(angle*5+.8)+.036*Math.sin(angle*11-.72);
  return Math.min(edge,-16)+Math.max(0,edge+16)*Math.exp(-d/46)-slope*d-.00032*d*d
    +3.6*Math.sin(x*.012+z*.015)*ease(d/69);
}

function lowstandShelf(x,z,bed){
  // Continue the authored SE continental slope past the sample window.
  const east=ease((x-1470)/230)*ease((z-540)/240)*ease((-bed-2)/12);
  return mix(bed,Math.min(bed,oceanProfile(x,z)),east);
}

export function paleoIceThickness(x,z,ground){
  const cap=Math.hypot((x-ICE_CAP.x+37)/348,(z-ICE_CAP.z-46)/230);
  const polar=94*(1-ease(cap))*ease((ground+38)/58);
  const ridge=Math.hypot((x-1205)/555,(z+1044)/380);
  const alpine=76*(1-ease(ridge))*ease((ground-162)/218);
  const field=iceField(x,z);
  const glacier=field?72*(1-ease(field.distance/(field.half*2.35+19))):0;
  const dx=107,dz=-132,u=clamp(((x-163)*dx+(z+128)*dz)/(dx*dx+dz*dz));
  const distance=Math.hypot(x-163-u*dx,z+128-u*dz);
  const tongue=54*ease(u/.66)*(1-ease(distance/(24+82*u)));
  return Math.max(polar,alpine,glacier,tongue)*ease((ground+42)/45);
}

function shelfOutlet(route,start){
  const meander=route==='central'?28:34,turn=route==='central'?-.29:.12;
  const at=d=>({x:start.x-d,z:start.z+turn*d+meander*Math.sin(d/104)});
  let reach=0,p=at(0);
  for(let d=8;d<=start.x-epochGrid.x0;d+=8){
    p=at(d);reach=d;
    if(comparisonBed(p.x,p.z)<epochs.glacial.sea-2.5)break;
  }
  return sample(Math.ceil(reach/5),t=>({
    ...at(reach*t),level:mix(start.level,epochs.glacial.sea,t),half:mix(start.half,18,t)
  })).slice(1);
}

function riversForGlacial(){
  const main=sample(202,t=>{
    const p=riverSample(t);
    return {...p,level:p.level-12*ease((t-.76)/.24),half:mix(Math.min(22,p.half*.72+2),20,ease((t-.72)/.28))};
  });
  const south=sample(172,t=>{
    const p=tropicalChannel(t);
    return {...p,level:p.level-9*ease((t-.73)/.27),half:mix(p.half*.62,18,ease((t-.74)/.26))};
  });
  return [
    {id:'central',points:[...main,...shelfOutlet('central',main.at(-1))]},
    {id:'south',points:[...south,...shelfOutlet('south',south.at(-1))]},
    {id:'melt',points:meltLines[1].filter((_,i)=>i%6===0).map(p=>({...p,half:Math.max(8,p.half)}))},
    ...waterRoutes.filter(route=>route.id==='lake'||route.id==='north')
      .flatMap(route=>route.paths.map(points=>({id:route.id,points:points.map(p=>({...p,half:clamp(p.half??5,7,11)}))}))),
    ...waterRoutes.find(route=>route.id==='south').paths.slice(0,-1)
      .map(points=>({id:'highland',points:points.map(p=>({...p,half:clamp(p.half??4,7,11)}))}))
  ];
}

function channelIndex(rivers){
  const bins=new Map(),step=60;
  for(const {points} of rivers)for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
    if(!len||a.level===undefined||b.level===undefined)continue;
    const radius=Math.max(a.half,b.half)+31,segment={a,b,dx,dz,len};
    for(let j=Math.floor((Math.min(a.z,b.z)-radius)/step);j<=Math.floor((Math.max(a.z,b.z)+radius)/step);j++){
      for(let k=Math.floor((Math.min(a.x,b.x)-radius)/step);k<=Math.floor((Math.max(a.x,b.x)+radius)/step);k++){
        const key=k+','+j;
        if(!bins.has(key))bins.set(key,[]);
        bins.get(key).push(segment);
      }
    }
  }
  return (x,z)=>{
    let nearest=null,score=Infinity;
    for(const {a,b,dx,dz,len} of bins.get(Math.floor(x/step)+','+Math.floor(z/step))??[]){
      const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/len);
      const distance=Math.hypot(x-a.x-dx*t,z-a.z-dz*t),half=mix(a.half,b.half,t);
      if(distance-half>=score)continue;
      score=distance-half;nearest={distance,half,stage:mix(a.level,b.level,t)};
    }
    return nearest;
  };
}

function lowstandGround(bed,channel){
  if(!channel)return bed;
  const shoulder=channel.distance-channel.half;
  const target=channel.stage-2.1+Math.max(0,shoulder)*.34;
  return Math.min(bed,mix(bed,target,1-ease(shoulder/30)));
}

export function paleoCoverAt(x,z,y,ice,exposed,channel){
  if(ice>1.7)return 'ice';
  const {warmth,moisture}=regionalClimate(x,z,y,channel?channel.distance-channel.half:Infinity);
  const cold=warmth-.205,wetted=moisture-(exposed?.15:.11);
  if(cold<.12&&y>270)return 'gravel';
  if(cold<.30)return 'tundra';
  if(cold>.50&&wetted>.54&&!exposed)return 'refuge';
  return 'steppe';
}

export function gridPoint(grid,k){
  return {x:grid.x0+k%grid.cols*grid.step,z:grid.z0+Math.floor(k/grid.cols)*grid.step};
}

// The water and ice meshes use this same triangulation when sampling a height.
export function heightOnGrid(grid,field,x,z){
  const u=clamp((x-grid.x0)/grid.step,0,grid.cols-1),v=clamp((z-grid.z0)/grid.step,0,grid.rows-1);
  const i=Math.min(grid.cols-2,Math.floor(u)),j=Math.min(grid.rows-2,Math.floor(v)),k=j*grid.cols+i;
  const a=u-i,b=v-j;
  if(a+b<=1)return field[k]+(field[k+1]-field[k])*a+(field[k+grid.cols]-field[k])*b;
  const d=field[k+grid.cols+1];
  return d+(field[k+grid.cols]-d)*(1-a)+(field[k+1]-d)*(1-b);
}

export function epochTriangles(grid,visit){
  for(let j=0;j<grid.rows-1;j++)for(let i=0;i<grid.cols-1;i++){
    const k=j*grid.cols+i;
    visit(k,k+grid.cols,k+1);visit(k+1,k+grid.cols,k+grid.cols+1);
  }
}

export function buildIceAge(){
  const grid=epochGrid,count=grid.cols*grid.rows,rivers=riversForGlacial(),riverAt=channelIndex(rivers);
  const modern=new Float32Array(count),land=new Float32Array(count),ice=new Float32Array(count),surface=new Float32Array(count);
  for(let k=0;k<count;k++){
    const {x,z}=gridPoint(grid,k),channel=riverAt(x,z),bed=comparisonBed(x,z);
    modern[k]=bed;land[k]=lowstandGround(lowstandShelf(x,z,bed),channel);
    ice[k]=paleoIceThickness(x,z,land[k]);surface[k]=land[k]+ice[k];
  }
  const modernOcean=oceanConnected(grid,modern),coldOcean=oceanConnected(grid,surface.map(y=>y-epochs.glacial.sea));
  let exposedArea=0,iceArea=0;
  const covers=Array.from(land,(y,k)=>{
    const {x,z}=gridPoint(grid,k),exposed=modernOcean[k]&&!coldOcean[k];
    if(exposed&&Math.abs(x)<=worldExtent.x&&Math.abs(z)<=worldExtent.z)exposedArea+=grid.step**2;
    if(ice[k]>1.7&&!coldOcean[k])iceArea+=grid.step**2;
    return paleoCoverAt(x,z,y,ice[k],exposed,riverAt(x,z));
  });
  const channels=Object.fromEntries(rivers.filter(r=>r.id==='central'||r.id==='south').map(r=>[r.id,r.points]));
  return {grid,modern,land,ice,surface,modernOcean,coldOcean,covers,rivers,channels,exposedArea,iceArea,riverAt};
}

function isConnectedSea(grid,surface,ocean,sea,{x,z}){
  return heightOnGrid(grid,surface,x,z)<=sea&&heightOnGrid(grid,ocean,x,z)>.001;
}

function riverOutlet(points,grid,surface,ocean,sea){
  const firstWet=points.findIndex(p=>isConnectedSea(grid,surface,ocean,sea,p));
  if(firstWet<=0)return {points,mouth:points.at(-1)};
  const a=points[firstWet-1],b=points[firstWet];
  let dry=0,wet=1;
  for(let i=0;i<12;i++){
    const t=(dry+wet)/2,p={x:mix(a.x,b.x,t),z:mix(a.z,b.z,t)};
    if(isConnectedSea(grid,surface,ocean,sea,p))wet=t;
    else dry=t;
  }
  const mouth={x:mix(a.x,b.x,wet),z:mix(a.z,b.z,wet),level:sea,half:mix(a.half,b.half,wet)};
  return {points:[...points.slice(0,firstWet),mouth],mouth};
}

function shoreWetland(frame,x,z,height,bank,temperature,wetness){
  const {epoch,grid,coldOcean}=frame,aboveSea=height-epoch.sea,d=grid.step;
  return temperature>.44&&wetness>.55&&bank<70&&aboveSea>=0&&aboveSea<11&&
    [[-d,0],[d,0],[0,-d],[0,d]].some(([dx,dz])=>heightOnGrid(grid,coldOcean,x+dx,z+dz)>.5);
}

function vegetationAt(base,frame,k,x,z){
  const {epoch,land,ice,coldOcean,modernOcean}=frame;
  if(coldOcean[k])return 'water';
  if(ice[k]>1.7)return 'ice';
  const channel=frame.riverAt(x,z),bank=channel?channel.distance-channel.half:Infinity;
  const {warmth,moisture}=regionalClimate(x,z,land[k],bank);
  if(frame.id==='interglacial'){
    const temperature=warmth+.135;
    if(shoreWetland(frame,x,z,land[k],bank,temperature,moisture))return 'wetland';
    if(temperature<.34)return 'alpine';
    if(temperature>.51&&moisture>.51)return 'broadleaf';
    if(temperature>.42&&moisture>.56)return 'refuge';
    return 'warmScrub';
  }
  const temperature=warmth-epoch.cooling,wetness=moisture-epoch.drying;
  if(shoreWetland(frame,x,z,land[k],bank,temperature,wetness))return 'wetland';
  // Newly ice-free surfaces start with sparse cover. Older deglaciated ground
  // can fill in where slope, temperature and moisture allow.
  if(base.ice[k]>12&&epoch.thinning<.82&&temperature<.48)return temperature>.23?'pioneer':'gravel';
  if(temperature<.12&&land[k]>270)return 'gravel';
  if(temperature<.30)return 'tundra';
  if(modernOcean[k]&&wetness<.42)return 'gravel';
  if(!modernOcean[k]){
    if(epoch.growth!==undefined){
      if(temperature>.51&&wetness>.60&&epoch.growth<.55)return 'woodland';
      if(temperature>.35&&wetness>.52)return 'refuge';
    }
    if(temperature>.46&&wetness>.61&&epoch.thinning>.24)return 'woodland';
    if(temperature>(epoch.thinning>.75?.35:.49)&&wetness>.53)return 'refuge';
  }
  return 'steppe';
}

function warmIce(x,z){
  const polar=iceCapField(x,z);
  const cap=polar?polar.thickness*.45*(1-ease((polar.r-.16)/.52)):0;
  const glacier=iceField(x,z);
  if(!glacier)return cap;
  const width=glacier.half*.60,across=1-ease(glacier.distance/width);
  const tongue=glacier.thickness*.68*across*(1-ease((glacier.t-.16)/.34));
  return Math.max(cap,tongue);
}

function iceForEpoch(base,id){
  if(id==='glacial')return base.ice;
  const {grid,land}=base,{thinning,growth}=epochs[id];
  if(id==='interglacial')return land.map((_,k)=>{
    const {x,z}=gridPoint(grid,k);
    return warmIce(x,z);
  });
  if(growth!==undefined)return base.ice.map((height,k)=>{
    if(height===0)return 0;
    const {x,z}=gridPoint(grid,k),remnant=Math.min(height,warmIce(x,z));
    // Thick cores accumulate first. Thin lower margins enter later.
    const delay=.57*(1-clamp((height-6)/64))+.06*(1-ease((land[k]-80)/320));
    return mix(remnant,height,clamp((growth-delay)/(1-delay)));
  });
  // Retreat from the thin margins while preserving the thicker cores.
  return base.ice.map((height,k)=>{
    if(height===0)return 0;
    const {x,z}=gridPoint(grid,k),core=iceField(x,z);
    const mountain=core&&core.distance<core.half?core.thickness*(1-(core.distance/core.half)**2):0;
    const northern=ICE_CAP.thickness*clamp(1-Math.hypot((x-ICE_CAP.x)/ICE_CAP.rx,(z-ICE_CAP.z)/ICE_CAP.rz));
    const minimum=Math.min(height,Math.max(northern,mountain));
    const extra=height-minimum,ablation=thinning*61*(1-.28*ease((land[k]-190)/270));
    return minimum+Math.max(0,extra-ablation)*(1-.44*thinning);
  });
}

export function iceAgeFrame(base,id){
  const epoch=epochs[id],{grid,modern,modernOcean}=base;
  if(id==='now'){
    const mouths=Object.fromEntries(Object.entries(base.channels).map(([river,points])=>[
      river,riverOutlet(points,grid,modern,modernOcean,epoch.sea).mouth
    ]));
    return {id,epoch,grid,surface:modern,coldOcean:modernOcean,mouths};
  }
  const glacial=id==='glacial';
  // Raise the water on today's terrain for the highstand comparison. Keep
  // the deeper exposed-shelf channels specific to the low-sea-level snapshots.
  const land=id==='interglacial'?modern:base.land;
  const ice=iceForEpoch(base,id);
  const surface=glacial?base.surface:land.map((bed,k)=>bed+ice[k]);
  const coldOcean=glacial?base.coldOcean:oceanConnected(grid,surface.map(y=>y-epoch.sea));
  const frame={id,epoch,land,grid,ice,surface,coldOcean,modernOcean,riverAt:base.riverAt};
  const covers=glacial?base.covers:Array.from(land,(_,k)=>{
    const {x,z}=gridPoint(grid,k);
    return vegetationAt(base,frame,k,x,z);
  });
  const coverTypes=new Set(covers.filter((_,k)=>!coldOcean[k]));
  const mouths={};
  const rivers=base.rivers.map(river=>{
    if(!base.channels[river.id])return river;
    const {points,mouth}=riverOutlet(river.points,grid,surface,coldOcean,epoch.sea);
    mouths[river.id]=mouth;
    return {...river,points};
  });
  return {...frame,covers,coverTypes,rivers,mouths};
}

export function iceAgeStation(frame,station){
  const {x,z}=station.p,{id,epoch,grid,surface,coldOcean,ice,covers}=frame;
  if(isConnectedSea(grid,surface,coldOcean,epoch.sea,station.p))return '这个观察点已被海水覆盖。';
  if(id==='now')return '这个观察点位于现在的陆地。';
  if(station.id==='ice-lake'&&heightOnGrid(grid,surface,x,z)<iceAgeLakes[0].level){
    return id==='interglacial'||epoch.growth!==undefined?'同一地形对照中，这处湖盆可见开阔水面。':'这个点已露出湖面，湖水接通下游的出水溪。';
  }
  const thickness=heightOnGrid(grid,ice,x,z);
  if(thickness>1.7)return `观察点冰厚约 ${Math.round(thickness)} 米（场景值）。`;
  const k=Math.round((z-grid.z0)/grid.step)*grid.cols+Math.round((x-grid.x0)/grid.step);
  const cover=paleoCover[covers[k]];
  return cover&&cover!==paleoCover.ice?`观察点位于陆地，地表以${cover.name}为主。`:'这个观察点位于露出水面的陆地。';
}

const original=(route,id,details)=>({...environmentLines.find(r=>r.id===route).stops.find(s=>s.id===id),...details});
export function iceAgeRoutes(model){
  return [
    {id:'water',name:'顺水',stops:[
      original('water','snow',{interglacial:'雪岭只保留上段较窄的冰体，原冰舌下方的坡地露出。',cold:'雪岭冰舌变宽，并沿冰碛湖方向下伸。冰缘融水由下方谷槽继续汇入主河。',now:'现在的冰舌停在冰碛湖上方，融水沿两段溪流接入源池。'}),
      original('water','ice-lake',{interglacial:'暖期残冰离这处观察点更远。',cold:'冰舌下伸到现在的冰碛湖附近，部分原水面被冰覆盖。',now:'冰舌退离这里后，湖盆有开阔水面，湖水从下游一侧溢出。'}),
      original('water','source',{cold:'仍处在冰缘外的谷槽收集融水，并接入下游河网。',now:'裸露谷槽更长，冰碛湖的出水沿谷底汇进源池。'}),
      {id:'tidal-bank',name:'中央湾头低岸',p:{x:-960,z:-320},distance:970,
        interglacial:'海水已越过现在岸线，中央河口往上游移动。',
        cold:'海岸位于更远的陆架外侧，这里是一段内陆河谷。',
        now:'这段低岸现在位于河口上游，海水没有进入这处观察点。'},
      original('water','bay',{distance:915,cold:'中央海湾退成低地，河槽穿过露出海床，继续向新的海岸下切。',now:'较高的海面淹没一段低谷，形成中央海湾和现在的河口。'}),
      {id:'outer',name:'盛冰期河口附近',p:model.channels.central.at(-1),distance:610,
        cold:'融水走完外露陆架的河槽，在较远处汇入低海面。',now:'这个点位于现海岸以外的海床方向。河口已经退回中央海湾。'}
    ]},
    {id:'warmth',name:'南北冷暖',stops:[
      original('warmth','polar',{interglacial:'这里的草灌靠近仍然寒冷的北岸，冰帽缩到更高、较冷的核心。',cold:'北岸冰盖向外围扩张，低处裸地与冻原长在冰缘以外。',now:'现在的冰缘较小，浮冰湾与近岸低矮植被露出更多。'}),
      original('warmth','mixed',{interglacial:'较温暖的湿坡让阔叶林扩展，干坡和高处仍保有开阔植被。',cold:'原混交林坡的冷暖条件转到冻原或开阔冷草地，乔木覆盖显著减少。',now:'林台与支谷之间过渡为针阔混交林和较开阔的冷坡。'}),
      original('warmth','plain',{cold:'解冻时的浅谷仍能汇水，平原上主要是开阔草地与零散矮植被。',now:'较暖的河谷与平原有密度更高的草灌和湿岸群落。'}),
      original('warmth','forest',{cold:'南部较暖的湿谷保留稀疏耐冷林，开阔植被在干一些的坡面扩展。',now:'南部湿热林缘回到高冠层与茂密林下。'})
    ]},
    {id:'inland',name:'海岸到内陆',stops:[
      original('inland','ocean',{distance:810,cold:'原来的西南近海床露出成陆地，雨林河口向西延伸。',now:'这里是西南近海。潮沟和红树林位于它内侧。'}),
      original('inland','coast',{interglacial:'现在的红树林低岸被海水覆盖。河口草沼出现在靠河、有补水的较高岸段。',cold:'这一带离新海岸更远，原潮沟高于低海面，周边转为草地和稀疏耐冷林。',now:'海水回到低岸，形成潮沟与红树林生境。'}),
      original('inland','ridge',{cold:'山脊保留两侧的水汽差异，靠海的湿坡仍可留下小片耐冷林。',now:'同一座山脊组织迎风坡和背风坡，湿林接入草灌和干地。'}),
      original('inland','lee',{cold:'过了主山脊，背风坡水分更少，冷草原和裸露地表连成片。',now:'背风坡的树林渐成草地和砾土，水分更多的沟底仍能长出草带。'}),
      {id:'east-shelf',name:'东南陆架对照',p:{x:1450,z:895},distance:1050,
        cold:'宽缓陆架大片出露，原岛间浅海缩小，远处的大陆坡仍在海面以下。',now:'海水覆盖浅缓架面，只有海床凸起的三座岛体露出。'}
    ]}
  ];
}

export const iceAgeLakes=[{...ICE_LAKE,level:242.3},{...SALT_LAKE,level:22.2}];

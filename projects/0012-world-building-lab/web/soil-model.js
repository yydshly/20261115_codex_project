import {terrainHeight} from './large-world.js';
import {fanGuide,fanProfile} from './fan-layout.js';
import {northField,northSample} from './northern-watershed.js';
import {branchSample,riverField,riverSample} from './water-system.js';
import {seasonalRiverLevel} from './watershed-world.js';
import {hash} from './vegetation-rules.js';

const clamp=value=>Math.min(1,Math.max(0,value));
const mix=(a,b,u)=>a+(b-a)*u;
const mean=values=>values.reduce((sum,v)=>sum+v,0)/values.length;

export const soilStops=[
  {id:'head',name:'山口上游 · 山坡薄土',view:[-887,-1072,56,255],
    a:[-881,-1128],b:[-919,-1018],width:48,rock:'风化岩屑和残积土',
    detail:'岩体风化提供碎屑，陡坡上的细料被径流带走。土层往往薄而断续，浅根短草和矮灌集中在缓坡与坡脚。'},
  {id:'fan',name:'北部冲积扇 · 砂砾土',view:[-966,-951,31,310],
    a:[-970,-1017],b:[-1005,-883],width:54,rock:'分选后的砂砾与细料',
    detail:'近扇顶先留下粗砾，排水较快。扇缘和扇尾的细料更多，根区更容易保水，疏草逐渐接成草灌斑块。'},
  {id:'flood',name:'苇泽湿地 · 河漫滩泥土',view:[-1182,-300,2,270],
    a:null,b:null,width:50,rock:'越岸水沉积的粉砂与细泥',
    detail:'高水期越岸留下细泥，低滩反复受淹，深层容易缺氧。耐湿根系落在河边，略高、排水更好的地方才有更多草灌。'},
  {id:'mouth',name:'中央海湾 · 河口盐湿土',view:[-1450,-222,0,420],
    a:null,b:null,width:43,rock:'浅滩泥砂和含盐孔隙水',
    detail:'同样湿润的岸地，靠海的低滩还要耐盐和受淹。向淡水侧或较高地面，盐度压力减轻，盐生草逐渐让位于芦苇、莎草和草灌。'}
];

function riverBank(t,offset,branch=0){
  const p=branchSample(branch,t);
  return [p.x+p.nx*offset,p.z+p.nz*offset];
}
const endpoints={
  flood:[riverBank(.665,-60),riverBank(.683,-30)],
  mouth:[riverBank(.865,-40),riverBank(.716,-80)]
};

export function transectPosition(stop,along,across=0){
  const [a,b]=endpoints[stop.id]??[stop.a,stop.b];
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  return {x:mix(a[0],b[0],along)-dz/length*across,z:mix(a[1],b[1],along)+dx/length*across};
}

export function soilView(stop){
  const a=transectPosition(stop,0),b=transectPosition(stop,1);
  const dx=b.x-a.x,dz=b.z-a.z,side=dx<0?-1:1;
  return [...stop.view,Math.atan2(dx*side,-dz*side)];
}

function gridLookup(grid,x,z){
  const {x0,z0,step,cols,rows}=grid;
  const u=Math.min(cols-1,Math.max(0,(x-x0)/step)),v=Math.min(rows-1,Math.max(0,(z-z0)/step));
  const i=Math.min(cols-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v)),k=j*cols+i;
  return field=>mix(mix(field[k],field[k+1],u-i),mix(field[k+cols],field[k+cols+1],u-i),v-j);
}

export function createSoilModel(world,sedimentYear,elevation=terrainHeight){
  const {grid}=world.climate,cellArea=grid.step**2;
  const yearlyFlow=Math.max(...world.frames.map(f=>f.records.wetland.outflow),1);
  const parentSupply=sedimentYear.frames.at(-1).yearDeposits;

  function sample(stop,x,z){
    const y=elevation(x,z),slope=Math.hypot((elevation(x+2,z)-elevation(x-2,z))/4,
      (elevation(x,z+2)-elevation(x,z-2))/4);
    const at=gridLookup(grid,x,z),profile=fanProfile(z),north=northField(x,z),river=riverField(x,z);
    const band=.5+.5*Math.sin(y*.19+x*.014+z*.024);
    const fanChannel=Math.min(...profile.channels.map(cx=>Math.abs(cx-x)));
    const riverBank=river?Math.max(0,river.distance-river.half):110;
    const capacity=stop==='head'?0:stop==='fan'?14:stop==='flood'?145:50;
    const annualDeposit=parentSupply[stop];
    const fineSupply=annualDeposit?clamp(annualDeposit.fine/capacity):0;
    const baseFines=stop==='head'?.26+band*.27:stop==='fan'?.16+profile.t*.45:
      stop==='flood'?.65+fineSupply*.19:.49+fineSupply*.24;
    const fine=clamp(baseFines+Math.min(.12,riverBank*.002)*(stop==='flood'?.72:0));
    const gravel=clamp(1-fine-({head:.19,fan:.19,flood:.13,mouth:.22}[stop]));
    const baseLevel=stop==='head'?north?.groundLevel??y-6:
      stop==='fan'?profile.level:river?.level??0;
    const fanDistance=stop==='fan'?fanChannel:Math.max(0,(north?.distance??28)-(north?.half??4));
    const streamEdge=stop==='fan'?fanChannel<profile.half+2:stop==='head'?(north?.distance??30)<north?.half+1:
      river?.normalized<1.08;
    const coast=stop==='mouth'?clamp(((river?.t??.87)-.702)/.16):0;
    const lowGround=clamp((1.65-y)/1.45);
    const saltAccess=coast*clamp(.26+lowGround*.78)*Math.exp(-riverBank/55);
    const months=world.frames.map(frame=>{
      const stage=stop==='flood'&&river?seasonalRiverLevel(river.t,frame.records.main.stage,frame.records.wetland.stage):baseLevel;
      const depth=stage-y;
      const channelDistance=stop==='fan'||stop==='head'?fanDistance:riverBank;
      const flooded=depth>.025&&(streamEdge||stop==='flood'&&riverBank<24||stop==='mouth'&&depth>.14);
      const moisture=flooded?1:clamp(.14+.42*at(frame.cells.soil)/(cellArea*.048)+fine*.29-
        gravel*.13-clamp(slope)*.11+Math.exp(-Math.max(0,-depth)/1.9-channelDistance/44)*.48);
      const freshwater=clamp(frame.records.wetland.outflow/yearlyFlow);
      const salt=saltAccess*(1-.43*freshwater);
      return {moisture,salt,depth,flooded};
    });
    const wetness=mean(months.map(m=>m.moisture));
    const salt=mean(months.map(m=>m.salt));
    const inundated=mean(months.map(m=>Number(m.flooded)));
    const stable=clamp(1-slope/.8)*(streamEdge?.6:1);
    const rootDepth={head:6+22*stable+12*band*stable,
      fan:19+28*profile.t+15*stable+10*fineSupply,
      flood:45+21*stable+22*fineSupply,
      mouth:26+21*stable+16*fineSupply}[stop]*(1-.52*inundated);
    const organic=clamp((.22+.37*wetness+.26*fine)*stable*(1-.43*salt)*(1-.21*inundated));
    const topsoil=rootDepth*(.13+organic*.38);
    const altered=stop==='head'?.15+band*.34:stop==='fan'?.44:stop==='flood'?.62:.49;
    const subsoil=(rootDepth-topsoil)*altered;
    const material=rootDepth-topsoil-subsoil;
    const reduced=clamp((wetness-.64)*2.7+inundated*.45);
    return {x,y,z,slope,rockBand:band,riverBank,streamEdge,coast,fine,gravel,rootDepth,topsoil,subsoil,material,
      altered,reduced,organic,wetness,salt,inundated,months};
  }

  function freshDeposit(stop,month){
    const {reaches}=sedimentYear.frames[month-1];
    if(stop==='head')return {label:'本月坡面冲刷',volume:reaches.head.erosion};
    if(stop==='fan')return {label:'本月扇面新增砂砾',volume:reaches.fan.deposited.coarse};
    if(stop==='flood')return {label:'本月滩面新增细泥',volume:reaches.flood.overbank.fine};
    return {label:'本月河口新增细泥',volume:reaches.mouth.deposited.fine};
  }
  return {sample,freshDeposit};
}

export const soilPlants={
  moss:'苔垫',alpineTuft:'浅根短草',tuft:'草丛',dwarf:'矮灌',shrub:'草地灌丛',
  willow:'湿岸柳形树',sedge:'淡水莎草',reed:'芦苇',rush:'耐盐草丛',coastShrub:'耐盐矮灌'
};

export function soilPlant(s,stop,variation){
  const {inundated,rootDepth,wetness,salt,slope,gravel}=s;
  if(slope>.68||s.months.every(m=>m.depth>.46))return null;
  if(salt>.33){
    if(inundated>.08||wetness>.65)return variation<.69?'rush':null;
    return variation<.55?'coastShrub':variation<.80?'rush':null;
  }
  if(inundated>.15)return variation<.76?(salt>.22?'rush':variation<.42?'reed':'sedge'):null;
  if(rootDepth<21)return variation<.37?wetness>.51?'moss':'alpineTuft':null;
  if(salt>.22)return variation<.62?'rush':variation<.78?'coastShrub':null;
  if(wetness>.73)return variation<.48?'sedge':variation<.72?'reed':variation<.85?'tuft':null;
  if(stop==='flood'&&rootDepth>60&&wetness>.42&&variation<.038)return 'willow';
  if(gravel>.49)return variation<.30?'alpineTuft':variation<.42?'dwarf':null;
  return variation<.50?'tuft':variation<.66?'shrub':null;
}

export function soilPlacements(model,stop){
  const points=[];
  for(let i=0;i<30;i++)for(let j=0;j<22;j++){
    const along=(i+hash(i,j,1))/30,across=((j+hash(i,j,2))/22*2-1)*stop.width;
    if(Math.hypot((along-.5)*1.8,across/stop.width)>.96)continue;
    const {x,z}=transectPosition(stop,along,across);
    if(stop.id==='fan'&&fanGuide(x,z).distance<4)continue;
    const sample=model.sample(stop.id,x,z);
    const kind=soilPlant(sample,stop.id,hash(i,j,4));
    if(!kind)continue;
    const size=.72+hash(i,j,9)*.68;
    points.push({kind,x,y:sample.y,z,rotation:hash(i,j,6)*Math.PI*2,scale:size,
      sample});
  }
  return points;
}

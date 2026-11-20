import {basinGroup,terrainBoundaries} from './environment-lines.js';
import {regionalClimate} from './regional-geography.js';
import {groundwaterAfterDays,RAIN_DEPTH_SCALE} from './watershed-balance.js';
import {cellPosition} from './watershed-world.js';
import {formationMaterials,stormSlopeFactor} from './world-hydraulics.js';
import {simulateStorm,stormPresets} from './groundwater-layout.js';
import {SALT_CRUST,SALT_DRY,saltRadius} from './salt-layout.js';
import {riverSample} from './water-system.js';
import {tropicalChannel} from './tropical-layout.js';
import {waterRoutes} from './world-climate-data.js';

const clamp=value=>Math.max(0,Math.min(1,value));
export const drySpellDays=14;
export const lineFormation={water:'central',warmth:'south',inland:'closed'};
export const formationBasins=[
  {id:'central',name:'中央海湾',color:'#8edbec',view:[-1010,-681,45,1670],
    outlet:{...riverSample(.93),name:'中央海湾 · 出海'},record:'wetland',
    probes:[{name:'北部冲积扇',x:-960,z:-920},{name:'苇泽湿地岸带',x:-1160,z:-320}],
    lesson:'融雪和山沟径流汇合。扇面砂砾把部分雨水送入浅层，缓慢补给支流。下游坡缓、细泥易保水，淡水湿岸的草本带沿河展开。'},
  {id:'south',name:'西南雨林',color:'#a6e098',view:[-1250,923,50,1520],
    outlet:{...tropicalChannel(.965),name:'雨林河口 · 独立出海'},record:'south',
    probes:[{name:'高原塘溪上方',x:-1280,z:480},{name:'雨林淡水谷坡',x:-1440,z:1160}],
    lesson:'湿风越过高原，来水在窄谷集中。入渗水在浅层滞留并向谷地缓释。暖湿坡脚适合高覆盖林地，低处过渡到受盐水影响的岸带。'},
  {id:'closed',name:'西部内流盐盆',color:'#f1c385',view:[-1630,319,20,1050],
    outlet:{x:-1690,z:300,name:'盐湖与盐沼 · 盆内蓄水'},record:'salt',
    probes:[{name:'内流盆缘',x:-1520,z:320},{name:'浅洼盐壳与盐湿土',x:-1640,z:480}],
    lesson:'盆缘把地表水留在湖沼和洼底。细粒土排水慢，蒸发后盐分滞留，湿润岸缘适合耐盐低植被，盐壳高的地面覆盖较疏。'}
];
export const formationLayers=[
  {id:'rain',name:'降雨与融雪'},
  {id:'rock',name:'岩性与地表'},
  {id:'water',name:'汇流与地下补给'},
  {id:'plants',name:'植被分带'},
  {id:'natural',name:'原地实景'}
];
export const formationHabitat={
  rock:{name:'薄土／裸岩',color:'#c9b18a'},
  dry:{name:'疏草灌',color:'#c4c46b'},
  woodland:{name:'湿林',color:'#4cc17b'},
  marsh:{name:'淡水湿岸',color:'#81e1bf'},
  salt:{name:'耐盐草灌',color:'#e1ce92'},
  crust:{name:'稀疏盐壳',color:'#f9e0b2'}
};

export function formationCell(grid,x,z){
  const i=Math.min(grid.cols-1,Math.max(0,Math.round((x-grid.x0)/grid.step)));
  const j=Math.min(grid.rows-1,Math.max(0,Math.round((z-grid.z0)/grid.step)));
  return j*grid.cols+i;
}

function terrainPath(start,next){
  const path=[];
  for(let k=start;k>=0;k=next[k])path.push(k);
  return path;
}

function closedHollow(p){
  return Math.min(saltRadius(SALT_CRUST,p.x,p.z),saltRadius(SALT_DRY,p.x,p.z))<1.3;
}

// One rooting rule for all the basins. Months affect root-zone water; the
// cover is potential habitat at this scale, not time-lapse plant growth.
export function formationLand(profile,climate,frame,k,area,days=0){
  const {cells,weather}=frame;
  const ground=groundwaterAfterDays(cells.ground[k],profile.release,days);
  const moisture=clamp(.49*cells.soil[k]/(area*profile.capacity)*(.985**days)+.19*clamp(ground/(area*.022))
    +.4*profile.bankWet+.18*clamp(cells.local[k]/(area*.039))+(days?0:.12*clamp(weather.rain[k]/.06)));
  let habitat='dry';
  if(profile.salinity>.52)habitat=moisture>.39||profile.bankWet>.35?'salt':'crust';
  else if(profile.salinity>.23)habitat='salt';
  else if(profile.slope>.62||climate.warmth<.19)habitat='rock';
  else if(profile.bankWet>.37&&profile.material==='silt')habitat='marsh';
  else if(profile.slope<.33&&(climate.warmth>.59&&moisture>.22||moisture>.49))habitat='woodland';
  return {ground,moisture,habitat};
}

export function buildFormationStudy(world){
  const {climate,graph,bodies,hydraulics}=world,{grid,height}=climate,area=grid.step**2;
  const groups=hydraulics.map((profile,k)=>profile?basinGroup(graph.owner[k],bodies):null);
  const positions=hydraulics.map((profile,k)=>profile?cellPosition(grid,k):null);
  // The lowest western salt flats are small closed hollows adjacent to the
  // named lake and marsh. They keep their local stores in the water balance.
  groups.forEach((key,k)=>{
    if(key!=='unresolved')return;
    const p=positions[k];
    if(p.x< -1515&&p.z>340&&p.z<710&&height[k]<33&&closedHollow(positions[terrainPath(k,graph.next).at(-1)]))groups[k]='closed';
  });
  const warmth=positions.map((p,k)=>p?regionalClimate(p.x,p.z,height[k]):null);
  const frames=world.frames.map((frame,i)=>({...frame,weather:climate.frames[i]}));
  const basins=formationBasins.map(basin=>{
    const cells=groups.flatMap((id,k)=>id===basin.id?[k]:[]),selected=new Set(cells);
    const candidates=cells.filter(k=>graph.next[k]>=0&&!graph.waterCells[k])
      .sort((a,b)=>frames[6].cells.surface[b]-frames[6].cells.surface[a]);
    const paths=[];
    for(const k of candidates){
      if(paths.some(path=>path.includes(k)))continue;
      const path=terrainPath(k,graph.next);
      if(path.length<3||path.some(i=>!selected.has(i)))continue;
      paths.push(path);
      if(paths.length===8)break;
    }
    const probes=basin.probes.map(p=>({...p,k:formationCell(grid,p.x,p.z)}));
    const rivers=basin.id==='closed'?[]:waterRoutes.filter(r=>basin.id==='south'?r.id==='south':r.id!=='south').flatMap(r=>r.paths);
    return {...basin,cells,paths,probes,rivers};
  });

  function read(k,month,days=0){
    const frame=frames[month-1],profile=hydraulics[k],{cells,weather}=frame;
    const cover=formationLand(profile,warmth[k],frame,k,area,days);
    const baseflow=days?groundwaterAfterDays(cells.ground[k],profile.release,days-1)-cover.ground:cells.baseflow[k];
    return {...cover,baseflow,profile,
      rain:days?0:weather.rain[k]*RAIN_DEPTH_SCALE*area,
      snow:days?0:weather.snowfall[k]*RAIN_DEPTH_SCALE*area,
      melt:days?0:cells.melt[k],surface:days?0:cells.surface[k],recharge:days?0:cells.percolation[k]};
  }

  function stats(basin,month,days=0){
    const totals={rain:0,snow:0,melt:0,surface:0,recharge:0,ground:0,baseflow:0};
    for(const k of basin.cells){
      const p=read(k,month,days);
      for(const key of Object.keys(totals))totals[key]+=p[key];
    }
    const frame=frames[month-1],record=frame.records[basin.record],closed=basin.id==='closed';
    return {...totals,area:area*basin.cells.length,liquidRain:totals.rain-totals.snow,
      outflow:closed?record.outflow+frame.records.saltMarsh.outflow:days?null:record.outflow,
      stage:record.stage,evaporation:closed?record.waterEvaporation+frame.records.saltMarsh.waterEvaporation:null};
  }

  function sameStorm(basin){
    const {k}=basin.probes[0],p=hydraulics[k],material=formationMaterials[p.material];
    const adjusted={...material,intake:material.intake*stormSlopeFactor(p.slope)};
    return simulateStorm(stormPresets.steady,adjusted).at(-1);
  }

  return {world,grid,height,groups,positions,basins,frames,area,read,stats,sameStorm,
    boundary:terrainBoundaries(world)};
}

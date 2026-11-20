import {getWorldAnnualModel,waterRoutes} from './world-climate-data.js';
import {terrainHeight} from './large-world.js';
import {LAKE,inlandLines,lakeField} from './inland-geography.js';
import {ICE_LAKE,iceLine} from './glacial-geography.js';
import {SALT_LAKE,SALT_MARSH,saltRadius} from './salt-layout.js';
import {riverSample,riverLevel} from './water-system.js';
import {drainageGraph,makeStorageCurve,simulateWaterBalance,oceanConnected,MONTHLY_BASEFLOW_RELEASE} from './watershed-balance.js';
import {buildWorldHydraulics} from './world-hydraulics.js';

export const riverWindow=[.4,.735];
export const gauges={main:.47,wetland:.675};
export const basinStops=[
  {id:'ice',name:'雪岭 · 融雪入溪',view:[355,-340,235,930],detail:'降雪先进入积雪库。回暖后，融水与雨水一起沿坡汇入冰湖和中央河源。'},
  {id:'north',name:'北部支流 · 坡面与入渗',view:[-1000,-793,40,990],detail:'陡坡较快形成径流，能渗入土壤的部分会下渗到浅层地下水，再慢慢补给北部溪流。'},
  {id:'lake',name:'澄镜湖 · 入流与蓄水',view:[438,528,32,700],detail:'湖面会沿真实湖床退缩或扩张。超过出口参考高程后，蓄水的一部分从出湖河流向中央主河。'},
  {id:'main',name:'中央主河 · 多支汇流',view:[-752,-187,17,630],detail:'此处合计冰雪、入湖与本段来水。图上的水位取河谷断面，下游再接北部支流和湿地。'},
  {id:'wetland',name:'苇泽湿地 · 漫滩与缓释',view:[-1181,-327,2,530],detail:'低平湿地来水多时漫过低滩，来水少时留下露地。出水最终接到海湾，海平面仍为 0 米。'},
  {id:'south',name:'高原与雨林 · 独立入海',view:[-1240,855,65,1530],detail:'高原地表来水和浅层基流沿另一条溪谷进入雨林河网，经过潮沟后入海。'},
  {id:'salt',name:'西部盐盆 · 内流与蒸发',view:[-1691,173,25,900],detail:'盐湖和盐沼各自汇水，盆地保留高地围合。浅水因蒸发缩小，计算中的地表外流为零。'}
];

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,u)=>a+(b-a)*u;
const sweep=(n,fn)=>Array.from({length:n+1},(_,i)=>fn(i/n));

function stageWeight(t,start,peak,end){
  if(t<=start||t>=end)return 0;
  return t<=peak?(t-start)/(peak-start):(end-t)/(end-peak);
}
export function seasonalRiverLevel(t,main,wetland){
  const mainChange=main-riverLevel(gauges.main), wetlandChange=wetland-riverLevel(gauges.wetland);
  return riverLevel(t)+stageWeight(t,.4,gauges.main,.585)*mainChange
    +stageWeight(t,.62,gauges.wetland,riverWindow[1])*wetlandChange;
}

function levelGrid(body,step,accept,elevation){
  const edge=1.27, cols=Math.ceil(2*edge*body.rx/step), rows=Math.ceil(2*edge*body.rz/step);
  const x0=body.x-cols*step/2,z0=body.z-rows*step/2;
  const bed=[],cells=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const x=x0+i*step,z=z0+j*step;bed.push({x,z,bed:elevation(x,z)});
    if(i<cols&&j<rows&&accept(x+step/2,z+step/2)){
      const k=j*(cols+1)+i;
      cells.push({indices:[k,k+1,k+cols+1,k+cols+2],area:step**2});
    }
  }
  const samples=cells.map(cell=>({area:cell.area,
    bed:cell.indices.reduce((sum,k)=>sum+bed[k].bed,0)*.25}));
  return {bed,cells,samples};
}

function riverGrid(elevation){
  const rows=sweep(210,u=>riverSample(lerp(...riverWindow,u))),cols=30;
  const bed=[],cells=[],samples={main:[],wetland:[]};
  const widthAt=p=>{
    const [start,end]=riverWindow;
    const u=clamp(Math.min((p.t-start)/.026,(end-p.t)/.031),0,1);
    return p.half+23*u*u*(3-2*u);
  };
  for(const p of rows){
    const width=widthAt(p);
    for(let i=0;i<=cols;i++){
      const offset=(2*i/cols-1)*width,x=p.x+p.nx*offset,z=p.z+p.nz*offset;
      bed.push({x,z,bed:elevation(x,z),t:p.t,breadth:offset/p.half});
    }
  }
  for(let j=0;j<rows.length-1;j++){
    const a=rows[j],b=rows[j+1],t=(a.t+b.t)/2;
    const area=Math.hypot(a.x-b.x,a.z-b.z)*(widthAt(a)+widthAt(b))/cols;
    const main=t<.585, stage=riverLevel(main?gauges.main:gauges.wetland);
    const weight=main?stageWeight(t,.4,gauges.main,.585):stageWeight(t,.62,gauges.wetland,riverWindow[1]);
    for(let i=0;i<cols;i++){
      const k=j*(cols+1)+i, indices=[k,k+1,k+cols+1,k+cols+2];
      cells.push({indices,area});
      if(weight>0)samples[main?'main':'wetland'].push({area,weight,
        anchor:riverLevel(t)-weight*stage,bed:indices.reduce((sum,id)=>sum+bed[id].bed,0)*.25});
    }
  }
  return {bed,cells,samples};
}

function makeReceivers(climate,bodies){
  const {height,grid:{x0,z0,cols,rows,step}}=climate;
  const ocean=oceanConnected(climate.grid,height);
  const nearest=new Float64Array(height.length).fill(Infinity), receivers=new Int16Array(height.length).fill(-1);
  const waterCells=new Uint8Array(height.length);
  const key=Object.fromEntries(bodies.map(({id},i)=>[id,i]));
  function mark(id,points,radius=31){
    const range=Math.ceil(radius/step);
    for(const p of points){
      const col=Math.round((p.x-x0)/step),row=Math.round((p.z-z0)/step);
      for(let j=Math.max(0,row-range);j<=Math.min(rows-1,row+range);j++)for(let i=Math.max(0,col-range);i<=Math.min(cols-1,col+range);i++){
        const k=j*cols+i,d=Math.hypot(x0+i*step-p.x,z0+j*step-p.z);
        if(!ocean[k]&&d<=radius&&d<nearest[k]){
          nearest[k]=d;receivers[k]=key[id];
        }
      }
    }
  }
  for(const {id,paths} of waterRoutes){
    if(id==='main'){
      mark('upper',paths[0].filter(p=>p.t<.4));
      mark('main',paths[0].filter(p=>p.t>=.4&&p.t<.62));
      mark('wetland',paths.flat().filter(p=>p.t>=.62));
    }else if(id==='lake'){
      mark('lake',inlandLines[0].points);
      mark('main',inlandLines[1].points.filter(p=>p.t>.17));
    }else mark(id,paths.flat());
  }
  mark('ice',iceLine,65);
  for(let k=0;k<height.length;k++){
    if(ocean[k])continue;
    const x=x0+k%cols*step,z=z0+Math.floor(k/cols)*step;
    if(lakeField(x,z)?.normalized<1&&height[k]<31.8)receivers[k]=key.lake;
    else if(Math.hypot((x-ICE_LAKE.x)/ICE_LAKE.rx,(z-ICE_LAKE.z)/ICE_LAKE.rz)<1)receivers[k]=key.ice;
    else if(saltRadius(SALT_LAKE,x,z)<1.06)receivers[k]=key.salt;
    else if(saltRadius(SALT_MARSH,x,z)<1.14)receivers[k]=key.saltMarsh;
    else continue;
    waterCells[k]=1;
  }
  return {...drainageGraph(climate.grid,height,receivers,ocean),waterCells};
}

export function buildWorldWaterBalance(climate=getWorldAnnualModel(),elevation=terrainHeight){
  const patches={
    lake:levelGrid(LAKE,4,(x,z)=>lakeField(x,z)?.normalized<1.20,elevation),
    salt:levelGrid(SALT_LAKE,3,(x,z)=>saltRadius(SALT_LAKE,x,z)<1.23,elevation),
    saltMarsh:levelGrid(SALT_MARSH,3,(x,z)=>saltRadius(SALT_MARSH,x,z)<1.23,elevation),
    river:riverGrid(elevation)
  };
  const river=riverLevel(gauges.main),wetland=riverLevel(gauges.wetland);
  const bodies=[
    {id:'ice',downstream:'upper'},
    {id:'upper',downstream:'main'},
    {id:'north',downstream:'wetland'},
    {id:'south'},
    {id:'lake',downstream:'main',curve:makeStorageCurve(patches.lake.samples,18,33.1),
      sill:30.8,initial:31.66,release:.055,evaporation:.020},
    {id:'main',downstream:'wetland',curve:makeStorageCurve(patches.river.samples.main,river-1.26,river+1.1),
      sill:river-1.24,initial:river,release:.49,evaporation:.009},
    {id:'wetland',curve:makeStorageCurve(patches.river.samples.wetland,wetland-.41,wetland+.41),
      sill:wetland-.40,initial:wetland,release:.82,evaporation:.026},
    {id:'salt',curve:makeStorageCurve(patches.salt.samples,20,25.1),
      closed:true,initial:23.2,evaporation:.046},
    {id:'saltMarsh',curve:makeStorageCurve(patches.saltMarsh.samples,22.56,24.6),
      closed:true,initial:23.48,evaporation:.069}
  ];
  const graph=makeReceivers(climate,bodies);
  const hydraulics=buildWorldHydraulics(climate,graph,MONTHLY_BASEFLOW_RELEASE);
  const frames=simulateWaterBalance(climate,graph,bodies,graph.waterCells,{hydraulics});
  return {climate,graph,bodies,patches,frames,hydraulics};
}

export function cellPosition(grid,k){
  return {x:grid.x0+(k%grid.cols)*grid.step,z:grid.z0+Math.floor(k/grid.cols)*grid.step};
}

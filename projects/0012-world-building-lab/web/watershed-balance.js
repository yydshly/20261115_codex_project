const clamp=(v,low=0,high=1)=>Math.min(high,Math.max(low,v));
export const COAST=-2, LOCAL=-1;
export const MONTHLY_BASEFLOW_RELEASE=.19;
export const RAIN_DEPTH_SCALE=2.2;

export function groundwaterAfterDays(storage,release,days){
  return storage*(1-release)**(days/30);
}

export function oceanConnected(grid,height){
  const {cols,rows}=grid, ocean=new Uint8Array(height.length), queue=[];
  function add(k){if(height[k]<=0&&!ocean[k]){ocean[k]=1;queue.push(k);}}
  for(let x=0;x<cols;x++){add(x);add((rows-1)*cols+x);}
  for(let z=1;z<rows-1;z++){add(z*cols);add(z*cols+cols-1);}
  for(let i=0;i<queue.length;i++){
    const k=queue[i], x=k%cols,z=Math.floor(k/cols);
    if(x>0)add(k-1);
    if(x<cols-1)add(k+1);
    if(z>0)add(k-cols);
    if(z<rows-1)add(k+cols);
  }
  return ocean;
}

// Each raster cell has a single downhill edge. Strict descent rules out routing cycles.
export function drainageGraph(grid,height,receivers,ocean=oceanConnected(grid,height)) {
  const {cols,rows,step}=grid;
  const next=new Int32Array(height.length).fill(-1), owner=Int16Array.from(receivers);
  for(let k=0;k<height.length;k++){
    if(ocean[k]){owner[k]=COAST;continue;}
    if(owner[k]>=0)continue;
    const x=k%cols,z=Math.floor(k/cols);
    let gradient=0;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      if((!dx&&!dz)||x+dx<0||x+dx>=cols||z+dz<0||z+dz>=rows)continue;
      const n=k+dx+dz*cols,slope=(height[k]-height[n])/(step*Math.hypot(dx,dz));
      if(slope>gradient){gradient=slope;next[k]=n;}
    }
  }
  const sorted=Array.from(height.keys()).sort((a,b)=>height[a]-height[b]);
  for(const k of sorted)if(!ocean[k]&&owner[k]===LOCAL&&next[k]>=0)owner[k]=owner[next[k]];
  return {next,owner,ocean};
}

// Make a storage curve from the same bed samples used by the surveyed water surfaces.
export function makeStorageCurve(samples, minimum, maximum, increments=96) {
  const step=(maximum-minimum)/increments;
  const volumes=new Float64Array(increments+1),areas=new Float64Array(increments+1);
  for(let i=0;i<=increments;i++){
    const stage=minimum+i*step;
    for(const {bed,area,anchor=0,weight=1} of samples){
      const depth=anchor+weight*stage-bed;
      if(depth<=0)continue;
      volumes[i]+=depth*area;
      areas[i]+=area;
    }
  }
  function sample(values,stage){
    const at=clamp((stage-minimum)/step,0,increments), k=Math.min(increments-1,Math.floor(at));
    return values[k]+(values[k+1]-values[k])*(at-k);
  }
  return {minimum,maximum,capacity:volumes.at(-1),
    volumeAt:stage=>sample(volumes,stage),areaAt:stage=>sample(areas,stage),
    stageAt(volume){
      if(volume<=volumes[0])return minimum;
      if(volume>=volumes.at(-1))return maximum;
      let lo=0,hi=increments;
      while(hi-lo>1){const k=(lo+hi)>>1;if(volumes[k]<=volume)lo=k;else hi=k;}
      return minimum+step*(lo+(volume-volumes[lo])/(volumes[hi]-volumes[lo]));
    }
  };
}

function emptyFlux(){
  return {rain:0,snowfall:0,melt:0,infiltration:0,percolation:0,surface:0,baseflow:0,direct:0,
    landET:0,sublimation:0,deltaSnow:0,deltaSoil:0,deltaGround:0,incoming:0,
    waterEvaporation:0,outflow:0,deltaWater:0,stage:null,area:0,storage:0,residual:0};
}

function settleWater(body,volume,inputs,month) {
  const {curve,closed,sill,release,evaporation}=body;
  if(!curve)return {storage:0,stage:null,area:0,outflow:inputs,evaporation:0};
  let available=volume+inputs;
  const wetArea=curve.areaAt(curve.stageAt(available));
  const vapor=Math.min(available,wetArea*evaporation*(.58+month.wind.evaporation*2.8));
  available-=vapor;
  let outflow=0;
  if(!closed){
    const aboveSill=Math.max(0,available-curve.volumeAt(sill));
    outflow=Math.max(aboveSill*release,available-curve.capacity,0);
    available-=outflow;
  }
  return {storage:available,stage:curve.stageAt(available),area:curve.areaAt(curve.stageAt(available)),
    outflow,evaporation:vapor};
}

// Weather is a relative forcing. The depth scale converts it to scenario metres
// before multiplying by cell area. All transfers below are in scenario cubic metres.
export function simulateWaterBalance(climate, graph, bodies, waterCells, {years=30,depthScale=RAIN_DEPTH_SCALE,hydraulics=null}={}) {
  const {height,grid}=climate, {owner,next,ocean}=graph, area=grid.step**2,n=height.length;
  const snow=new Float64Array(n),soil=new Float64Array(n).fill(.014*area);
  const groundwater=new Float64Array(n).fill(.009*area), pond=new Float64Array(n);
  const landAltitude=height.map(y=>Math.max(0,y));
  const slopes=height.map((y,k)=>next[k]<0?0:Math.max(0,y-height[next[k]])/grid.step);
  const index=Object.fromEntries(bodies.map(({id},i)=>[id,i]));
  const landIndex=bodies.length, coastIndex=bodies.length+1;
  const storage=bodies.map(b=>b.curve?.volumeAt(b.initial)??0);
  const frames=[];
  for(let year=0;year<years;year++)for(const weather of climate.frames){
    const capture=year===years-1, flux=Array.from({length:bodies.length+2},emptyFlux);
    const initialStages=bodies.map((body,i)=>body.curve?.stageAt(storage[i])??Infinity);
    const cells=capture?{surface:new Float32Array(n),infiltration:new Float32Array(n),percolation:new Float32Array(n),
      baseflow:new Float32Array(n),ground:new Float32Array(n),soil:new Float32Array(n),
      melt:new Float32Array(n),local:new Float32Array(n),snow:new Float32Array(n)}:null;
    let localEvaporation=0, localDelta=0, localStorage=0;
    for(let k=0;k<n;k++){
      if(ocean[k])continue;
      const category=owner[k]>=0?owner[k]:owner[k]===COAST?coastIndex:landIndex;
      const bucket=flux[category], precipitation=weather.rain[k]*depthScale*area;
      const snowfall=Math.min(precipitation,weather.snowfall[k]*depthScale*area);
      bucket.rain+=precipitation-snowfall;
      bucket.snowfall+=snowfall;
      if(waterCells[k]&&owner[k]>=0&&height[k]<initialStages[owner[k]]){
        bucket.direct+=precipitation;continue;
      }
      const z=grid.z0+Math.floor(k/grid.cols)*grid.step;
      const heat=.44+z/5050-Math.max(0,landAltitude[k]-35)/1600+weather.wind.heat;
      const previousSnow=snow[k], previousSoil=soil[k], previousGround=groundwater[k];
      snow[k]+=snowfall;
      const melt=snow[k]*clamp(heat*2.2+.06,0,.85);
      const sublimation=(snow[k]-melt)*(.017+Math.max(0,heat)*.02);
      snow[k]-=melt+sublimation;
      const liquid=precipitation-snowfall+melt;
      const properties=hydraulics?.[k];
      const capacity=area*(properties?.capacity??(.063-.031*clamp(slopes[k]*1.7)));
      const room=Math.max(0,capacity-soil[k]);
      const bypass=properties?.bypass??0;
      const infiltrated=Math.min(liquid,room*(properties?.intake??(.89-.43*clamp(slopes[k]*2.5)))/(1-bypass));
      const surface=liquid-infiltrated;
      const directRecharge=infiltrated*bypass;
      soil[k]+=infiltrated-directRecharge;
      const landET=soil[k]*(.095+weather.wind.evaporation*.6);
      soil[k]-=landET;
      const soilDrain=soil[k]*(.10+.21*clamp(soil[k]/capacity))*(properties?.drainage??1);
      const percolation=soilDrain+directRecharge;
      soil[k]-=soilDrain;
      groundwater[k]+=percolation;
      const baseflow=groundwater[k]*(properties?.release??MONTHLY_BASEFLOW_RELEASE);
      groundwater[k]-=baseflow;
      bucket.melt+=melt;bucket.sublimation+=sublimation;
      bucket.infiltration+=infiltrated;bucket.percolation+=percolation;
      bucket.surface+=surface;bucket.baseflow+=baseflow;bucket.landET+=landET;
      bucket.deltaSnow+=snow[k]-previousSnow;bucket.deltaSoil+=soil[k]-previousSoil;
      bucket.deltaGround+=groundwater[k]-previousGround;
      if(category===landIndex){
        const old=pond[k], wet=old+surface+baseflow;
        const evap=wet*(.22+weather.wind.evaporation*.8);
        pond[k]=wet-evap;localDelta+=pond[k]-old;localEvaporation+=evap;localStorage+=pond[k];
      }
      if(cells){
        cells.surface[k]=surface;cells.infiltration[k]=infiltrated;cells.percolation[k]=percolation;cells.baseflow[k]=baseflow;
        cells.ground[k]=groundwater[k];cells.soil[k]=soil[k];cells.melt[k]=melt;
        cells.local[k]=pond[k];cells.snow[k]=snow[k];
      }
    }
    let sea=flux[coastIndex].surface+flux[coastIndex].baseflow;
    flux[coastIndex].outflow=sea;
    flux[landIndex].deltaWater=localDelta;flux[landIndex].waterEvaporation=localEvaporation;
    flux[landIndex].storage=localStorage;
    const records={};
    bodies.forEach((body,i)=>{
      const f=flux[i],inputs=f.direct+f.surface+f.baseflow+f.incoming;
      const start=storage[i], result=settleWater(body,start,inputs,weather);
      storage[i]=result.storage;
      f.storage=result.storage;f.deltaWater=result.storage-start;
      f.stage=result.stage;f.area=result.area;
      f.waterEvaporation=result.evaporation;f.outflow=result.outflow;
      f.residual=inputs-(f.waterEvaporation+f.outflow+f.deltaWater);
      if(body.downstream)flux[index[body.downstream]].incoming+=f.outflow;else sea+=f.outflow;
      records[body.id]=f;
    });
    if(capture){
      const sum=name=>flux.reduce((v,f)=>v+f[name],0);
      const rain=sum('rain'), snowfall=sum('snowfall'),landET=sum('landET'),sublimation=sum('sublimation');
      const waterEvaporation=sum('waterEvaporation'), deltaWater=sum('deltaWater');
      const deltaSnow=sum('deltaSnow'),deltaSoil=sum('deltaSoil'),deltaGround=sum('deltaGround');
      const residual=rain+snowfall-(landET+sublimation+waterEvaporation+sea+deltaSnow+deltaSoil+deltaGround+deltaWater);
      frames.push({month:weather.month,records,cells,local:flux[landIndex],coast:flux[coastIndex],
        totals:{rain,snowfall,landET,sublimation,waterEvaporation,sea,deltaWater,deltaSnow,deltaSoil,deltaGround,residual}});
    }
  }
  return frames;
}

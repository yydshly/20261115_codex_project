// Monthly teaching model. All atmospheric and surface stores are relative indices.
const clamp = (n, max = 1) => Math.min(max, Math.max(0, n));
const mix = (a, b, t) => a + (b - a) * t;
export const seasonMonths = [4, 7, 10, 1];
const anchors = [
  {bearing:315, source:.24, sea:.48, rain:.39, heat:-.27, evaporation:.13},
  {bearing:202.5, source:.57, sea:.80, rain:.65, heat:.04, evaporation:.22},
  {bearing:225, source:.91, sea:.98, rain:.92, heat:.20, evaporation:.37},
  {bearing:112.5, source:.66, sea:.83, rain:.69, heat:-.03, evaporation:.20}
];

export function monthlyWind(month) {
  const i = Math.floor((month - 1) / 3), u = ((month - 1) % 3) / 3;
  const a = anchors[i], b = anchors[(i + 1) % 4];
  const result = Object.fromEntries(Object.keys(a).map(key => [key, mix(a[key], b[key], u)]));
  const turn = ((b.bearing - a.bearing + 540) % 360) - 180;
  result.bearing = (a.bearing + turn * u + 360) % 360;
  const angle = result.bearing * Math.PI / 180;
  return {...result, dx:-Math.sin(angle), dz:Math.cos(angle)};
}

export function windName(bearing) {
  const compass=['北','北东北','东北','东东北','东','东东南','东南','南东南',
    '南','南西南','西南','西西南','西','西西北','西北','北西北'];
  return compass[Math.round(bearing / 22.5) % 16] + '风';
}

export function secondaryInflow(month,x,z) {
  const summer=clamp(1-Math.abs(month-7)/3);
  return summer*.72*Math.exp(-(((z-745)/340)**2))*clamp((x+390)/700);
}

// Plot the wind against the low-frequency profile. Local cliffs and road cuts must
// not generate atmospheric rain bands one terrain tile wide.
function smoothHeight(grid, height) {
  const {cols,rows} = grid, result = new Float32Array(height.length);
  for(let j=0;j<rows;j++) for(let i=0;i<cols;i++){
    const k=j*cols+i;
    const west=height[j*cols+Math.max(0,i-1)], east=height[j*cols+Math.min(cols-1,i+1)];
    const north=height[Math.max(0,j-1)*cols+i], south=height[Math.min(rows-1,j+1)*cols+i];
    result[k]=(4*height[k]+west+east+north+south)/8;
  }
  return result;
}

function advection(grid, height, relief, wind) {
  const {cols,rows,step} = grid;
  const moisture = new Float32Array(height.length), rain = new Float32Array(height.length);
  const lift = new Float32Array(height.length);
  const sx = wind.dx >= 0 ? 1 : -1, sz = wind.dz >= 0 ? 1 : -1;
  const wx = Math.abs(wind.dx)/(Math.abs(wind.dx)+Math.abs(wind.dz));
  for (let row=0;row<rows;row++) for(let col=0;col<cols;col++){
    const i = sx===1?col:cols-1-col, j = sz===1?row:rows-1-row;
    const k=j*cols+i, fromX=k-sx, fromZ=k-sz*cols;
    let vapor=mix(row?moisture[fromZ]:wind.source,col?moisture[fromX]:wind.source,wx);
    vapor=mix(vapor,wind.source,.027); // exchange with the air above the surface layer
    if(height[k]<0)vapor=mix(vapor,wind.sea,.29);
    const upwind=mix(row?relief[fromZ]:relief[k],col?relief[fromX]:relief[k],wx);
    const grade=(relief[k]-upwind)/step;
    lift[k]=grade;
    const rising=clamp(grade*2.5), falling=clamp(-grade*4);
    const fallen=vapor*wind.rain*(.021*(1-.86*falling)+.34*rising);
    rain[k]=fallen;
    moisture[k]=vapor-fallen;
  }
  return {moisture,rain,lift};
}

function drainageOwners(grid, height, outlets) {
  const {cols,rows,x0,z0,step} = grid;
  const owners=new Int16Array(height.length).fill(-1);
  const distances=new Float32Array(height.length).fill(Infinity);
  outlets.forEach(({points,radius=step*.75}, index)=>{
    const radiusInCells=Math.ceil(radius/step);
    for(const {x,z} of points){
      const i=Math.round((x-x0)/step),j=Math.round((z-z0)/step);
      for(let y=Math.max(0,j-radiusInCells);y<=Math.min(rows-1,j+radiusInCells);y++){
        for(let u=Math.max(0,i-radiusInCells);u<=Math.min(cols-1,i+radiusInCells);u++){
          const k=y*cols+u, d=Math.hypot(x-x0-u*step,z-z0-y*step);
          if(height[k]>=0&&d<=radius&&d<distances[k]){owners[k]=index;distances[k]=d;}
        }
      }
    }
  });
  const ascending=Array.from(height.keys()).sort((a,b)=>height[a]-height[b]);
  for(const k of ascending){
    if(owners[k]>=0||height[k]<=0)continue;
    const i=k%cols,j=Math.floor(k/cols);
    let downstream=-1,steepest=0;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      if((!dx&&!dz)||i+dx<0||i+dx>=cols||j+dz<0||j+dz>=rows)continue;
      const n=k+dx+dz*cols, slope=(height[k]-height[n])/Math.hypot(dx,dz);
      if(slope>steepest){steepest=slope;downstream=n;}
    }
    if(downstream>=0)owners[k]=owners[downstream];
  }
  return owners;
}

export function buildAnnualClimate(grid, elevation, outlets) {
  const {x0,z0,cols,rows,step}=grid, count=rows*cols;
  const height=Float32Array.from({length:count},(_,k)=>elevation(x0+k%cols*step,z0+Math.floor(k/cols)*step));
  // Air travels above the sea surface. Deep water does not create an
  // atmospheric climb over the submerged continental shelf.
  const surface=height.map(y=>Math.max(y,0));
  const relief=smoothHeight(grid,smoothHeight(grid,surface));
  const owners=drainageOwners(grid,height,outlets);
  const frames=Array.from({length:12},(_,i)=>{
    const wind=monthlyWind(i+1), fields=advection(grid,height,relief,wind);
    // The secondary summer inflow reaches the coastal bamboo and monsoon belt.
    const summer=Math.max(0,1-Math.abs(i-6)/3);
    if(summer>0){
      const local=advection(grid,height,relief,{...wind,dx:-Math.SQRT1_2,dz:-Math.SQRT1_2});
      for(let k=0;k<count;k++){
        const z=z0+Math.floor(k/cols)*step,x=x0+k%cols*step;
        const influence=secondaryInflow(i+1,x,z);
        for(const key of ['moisture','rain','lift'])fields[key][k]=mix(fields[key][k],local[key][k],influence);
      }
    }
    return {month:i+1,wind,...fields,snow:new Float32Array(count),snowfall:new Float32Array(count),
      melt:new Float32Array(count),soil:new Float32Array(count),runoff:new Float32Array(count),flow:{}};
  });
  const snowpack=new Float32Array(count), soil=new Float32Array(count).fill(.2);
  // Run successive annual cycles to settle into a comparable seasonal pattern.
  for(let year=0;year<6;year++)for(const frame of frames){
    const totals=Array.from({length:outlets.length},()=>({rain:0,snow:0,melt:0,runoff:0,cells:0}));
    for(let k=0;k<count;k++){
      if(height[k]<0)continue;
      const z=z0+Math.floor(k/cols)*step;
      const heat=.44+z/5050-Math.max(0,relief[k]-35)/1600+frame.wind.heat;
      const snowFraction=clamp((.19-heat)/.24);
      const fall=frame.rain[k]*snowFraction;
      snowpack[k]+=fall;
      const melt=snowpack[k]*clamp(heat*2.2+.06,.85);
      snowpack[k]=clamp(snowpack[k]-melt,3);
      const liquid=frame.rain[k]-fall+melt, before=soil[k];
      const fast=liquid*(.17+.5*before+.14*clamp(Math.abs(frame.lift[k])*2));
      const recharge=before+liquid-fast;
      const overflow=Math.max(0,recharge-.62), retained=Math.min(.62,recharge);
      const drainage=retained*.09, evaporation=Math.min(retained-drainage,retained*frame.wind.evaporation);
      soil[k]=retained-drainage-evaporation;
      frame.snow[k]=snowpack[k];frame.snowfall[k]=fall;frame.melt[k]=melt;
      frame.soil[k]=soil[k];frame.runoff[k]=fast+overflow+drainage;
      const basin=totals[owners[k]];
      if(basin){basin.rain+=frame.rain[k]-fall;basin.snow+=fall;basin.melt+=melt;basin.runoff+=frame.runoff[k];basin.cells++;}
    }
    outlets.forEach(({id},i)=>{frame.flow[id]=totals[i];});
  }
  const peaks=Object.fromEntries(outlets.map(({id})=>[id,Math.max(...frames.map(f=>f.flow[id].runoff),.001)]));
  for(const frame of frames)for(const {id} of outlets)frame.flow[id].index=frame.flow[id].runoff/peaks[id];
  return {grid,height,owners,frames};
}

export function climateAt(model, frame, x, z) {
  const {x0,z0,step,cols,rows}=model.grid;
  const u=clamp((x-x0)/step,cols-1),v=clamp((z-z0)/step,rows-1);
  const i=Math.min(cols-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v)),k=j*cols+i;
  const at=field=>mix(mix(field[k],field[k+1],u-i),mix(field[k+cols],field[k+cols+1],u-i),v-j);
  return {vapor:at(frame.moisture),rain:at(frame.rain)-at(frame.snowfall),snowfall:at(frame.snowfall),
    lift:at(frame.lift),snow:at(frame.snow),soil:at(frame.soil),melt:at(frame.melt),runoff:at(frame.runoff)};
}

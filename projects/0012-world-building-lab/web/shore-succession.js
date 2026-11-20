import {stormTideAt,tidePeriod} from './basin-storm.js';
import {sedimentReaches} from './storm-sediment.js';

export const successionYears=[0,1,3,8,12];
export const bankTestFloods=24;
const tidesPerSeason=16;
const clamp=(n,low=0,high=1)=>Math.max(low,Math.min(high,n));
const nearestReach=t=>sedimentReaches.reduce((best,reach,i)=>
  Math.abs(reach.t-t)<Math.abs(sedimentReaches[best].t-t)?i:best,0);

export function sampleShoreHabitat(model,survey,shape,indices,seaRise=0){
  const plots=indices.map(i=>{
    const {x,z,t,bed}=model.bed[i];
    return {i,x,z,t,reach:nearestReach(t),area:survey.area[i],height:bed+shape.bedChange[i],wet:0,saltSum:0};
  });
  if(plots.length){
    for(const season of ['dry','wet']){
      const records=model.frame(season,'ebb').records;
      for(let j=0;j<tidesPerSeason;j++){
        const phase=stormTideAt({id:'flood',referencePeak:0},j*tidePeriod/tidesPerSeason);
        const tide={...phase,height:phase.height+seaRise,saltReach:phase.saltReach+.42*seaRise};
        const frame=model.frame(season,'ebb',{tide,wetlandStage:records.wetland.stage},shape.bedChange);
        for(const p of plots){
          if(!frame.wet[p.i])continue;
          p.wet++;
          p.saltSum+=frame.salinityAt(frame.bed[p.i]);
        }
      }
    }
  }
  return plots.map(({wet,saltSum,...p})=>{
    const frequency=wet/(2*tidesPerSeason),salt=wet?saltSum/wet:null;
    // Suitability bands are demonstration parameters for this bay.
    const saltGrass=wet?clamp((frequency-.12)/.15)*clamp((.61-frequency)/.16)*clamp((14.7-salt)/3.1):0;
    const reed=wet?clamp((frequency-.12)/.13)*clamp((.55-frequency)/.13)*clamp((5.6-salt)/2):0;
    return {...p,frequency,salt,saltGrass,reed};
  });
}

export function surveyNewShore(model,survey,shape){
  const original=model.frame('dry','ebb');
  const start=model.frame('dry','ebb',null,shape.bedChange);
  const indices=[];
  for(const [i,p] of start.bed.entries()){
    if(!original.wet[i]||start.wet[i]||p.bed<start.levels[i]||shape.bedChange[i]<=0)continue;
    indices.push(i);
  }
  const cells=sampleShoreHabitat(model,survey,shape,indices);
  return {start,shape,cells,area:cells.reduce((n,p)=>n+p.area,0)};
}

export function growNewShore(habitat,years){
  const growth=1-Math.exp(-years*.75);
  const late=1-Math.exp(-Math.max(0,years-1)*.44);
  const patches=habitat.cells.map(site=>{
    const reed=site.reed*late*.96;
    const grass=site.saltGrass*growth*(1-reed)*.84;
    return {...site,reedCover:reed,grassCover:grass,cover:reed+grass};
  });
  let saltGrassArea=0,reedArea=0;
  for(const p of patches){
    saltGrassArea+=p.grassCover*p.area;
    reedArea+=p.reedCover*p.area;
  }
  return {patches,saltGrassArea,reedArea,bareArea:habitat.area-saltGrassArea-reedArea};
}

export function testNewShore(model,survey,habitat,growth,event,sediment){
  const peakRate=Math.max(...event.frames.map(f=>f.mouth));
  const stressByReach=sedimentReaches.map((_,i)=>Math.max(...sediment.frames.map(f=>Math.abs(f.velocity[i]))));
  const strength=peakRate/(peakRate+145);
  const budget=sediment.final.exportedFine*bankTestFloods;
  let weights=0;
  for(const p of growth.patches)weights+=p.area*p.frequency;

  function measure(withPlants){
    const moves=habitat.shape.bedChange.slice();
    const sandChange=habitat.shape.sandChange.slice();
    let retained=0,eroded=0;
    for(const p of growth.patches){
      const {i,area,frequency}=p;
      const lifted=moves[i];
      const cover=withPlants?p.cover:0;
      const bound=withPlants?(p.grassCover*.64+p.reedCover*.86):0;
      const wear=bankTestFloods*.022*strength*clamp((frequency-.015)*2.2)
        *clamp(stressByReach[p.reach],0,1.5)*(1-bound);
      const erosion=Math.min(lifted,wear);
      const contact=weights?area*frequency/weights:0;
      const supply=budget*contact*(.045+.38*cover);
      const room=Math.max(0,survey.high[i]+.07-model.bed[i].bed-lifted+erosion);
      const settled=Math.min(room*area,supply);
      moves[i]=lifted-erosion+settled/area;
      sandChange[i]*=(lifted-erosion)/lifted;
      retained+=settled;eroded+=erosion*area;
    }
    const coast=model.frame('dry','ebb',null,moves);
    const retreat=habitat.cells.reduce((n,p)=>n+(coast.wet[p.i]?p.area:0),0);
    const change={count:habitat.shape.count,bedChange:moves,sandChange};
    return {shape:change,wet:coast.wet,retained,eroded,retreat,exported:budget-retained+eroded};
  }
  return {bare:measure(false),grown:measure(true),budget};
}

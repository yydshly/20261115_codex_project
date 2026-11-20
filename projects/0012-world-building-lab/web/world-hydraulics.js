import {bedrockAt,hydroMaterials,parentAt} from './groundwater-layout.js';
import {SALT_LAKE,SALT_MARSH,SALT_CRUST,SALT_DRY,saltRadius} from './salt-layout.js';
import {riverField} from './water-system.js';
import {tropicalRiverField,tropicalWeight} from './tropical-layout.js';

const clamp=value=>Math.max(0,Math.min(1,value));
export const stormSlopeFactor=slope=>1-.47*clamp(slope*2.9);

export const formationMaterials={
  ...hydroMaterials,
  silt:{name:'滩地粉砂与细泥',color:'#b29671',soil:'细粒冲积土',host:'细孔隙与下伏砂层',
    intake:5.8,rootCapacity:21,hold:13,drain:.13,bypass:.07,fast:.045,slow:.014},
  saltSilt:{name:'含盐粉泥与盐壳',color:'#dcc8a3',soil:'盐湿粉泥与蒸发盐壳',host:'浅层细粒沉积物',
    intake:4.2,rootCapacity:17,hold:12,drain:.12,bypass:.05,fast:.04,slow:.012}
};

function depositsAt(x,z,y,slope){
  if(y<34&&x< -1515&&z> -80&&z<710){
    const radius=Math.min(saltRadius(SALT_LAKE,x,z),saltRadius(SALT_MARSH,x,z),
      saltRadius(SALT_CRUST,x,z),saltRadius(SALT_DRY,x,z));
    if(radius<1.27)return {id:'saltSilt',salinity:.39+.44*clamp(1.38-radius)};
  }
  let reach=riverField(x,z);
  if(!reach&&z>820&&x< -740&&tropicalWeight(x,z)>.16)reach=tropicalRiverField(x,z);
  if(reach&&slope<.48){
    const bank=reach.distance-reach.half,rise=y-reach.level;
    if(bank<39&&rise<5&&rise> -2){
      const salt=reach.salt??.67*clamp((reach.t-.77)/.18);
      return {id:reach.t>.56?'silt':'alluvium',salinity:salt*.82*Math.exp(-Math.max(0,bank)/42),
        bankWet:clamp(1-Math.max(0,rise)/5)*clamp(1-Math.max(0,bank)/42)};
    }
  }
  const id=parentAt(x,z);
  return id?{id,salinity:0}:null;
}

// The same material parameters are used by the hourly storm and monthly model.
// Hourly rates are scaled as relative modifiers for the compressed monthly grid.
export function monthlyHydraulics(material,slope,baseRelease){
  return {
    capacity:(.063-.031*clamp(slope*1.7))*(.91+.09*material.rootCapacity/16),
    intake:(.89-.43*clamp(slope*2.5))*(.84+.16*clamp(material.intake/18)),
    bypass:material.bypass*.22,
    drainage:.84+.54*material.drain,
    release:baseRelease*(.75+.25*clamp(material.fast/.26)+.27*clamp(material.slow/.05))
  };
}

export function buildWorldHydraulics(climate,graph,baseRelease){
  const {grid:{cols,step,x0,z0},height}=climate;
  return Array.from(height,(y,k)=>{
    if(graph.ocean[k])return null;
    const i=k%cols,j=Math.floor(k/cols),x=x0+i*step,z=z0+j*step,next=graph.next[k];
    const slope=next<0?0:Math.max(0,y-height[next])/(step*Math.hypot(next%cols-i,Math.floor(next/cols)-j));
    const bedrock=bedrockAt(x,z),deposit=depositsAt(x,z,y,slope),material=deposit?.id??bedrock;
    return {bedrock,material,slope,salinity:deposit?.salinity??0,bankWet:deposit?.bankWet??0,
      ...monthlyHydraulics(formationMaterials[material],slope,baseRelease)};
  });
}

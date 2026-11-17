import { groundNoise,smoothRange } from './surface-field.js';

/** Irregular grazed patches, shared by the grass volumes and the ground contact atlas. */
export function grazingInfluenceAt(x,z,sites){
  let crop=0;
  for(const site of sites){
    const dx=(x-site.x)*.86,dz=(z-site.z)*1.12,r=site.grazingRadius||2.8;
    if(Math.abs(dx)>r*1.5||Math.abs(dz)>r*1.5)continue;
    const edge=(groundNoise(x*.83+8,z*.83)-.5)*.8;
    crop=Math.max(crop,(1-smoothRange(r*.46,r,Math.hypot(dx,dz)+edge))*(site.grazing??1));
  }
  return crop;
}

export function meadowGrowthAt(x,z){
  const broad=groundNoise(x*.18+19,z*.18)*.65+groundNoise(x*.61,z*.61-4)*.35;
  return smoothRange(.23,.76,broad);
}

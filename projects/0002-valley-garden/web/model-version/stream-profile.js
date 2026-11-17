import * as THREE from 'three';
import { groundNoise,smoothRange } from './surface-field.js';

export const riffleCentres=[-31,-6,9,32,59];

/** One bed profile drives the mesh, water absorption, and pool/riffle roughness. */
export function streamBedProfileAt(z,u){
  const edge=Math.max(0,Math.sin(THREE.MathUtils.clamp(u,0,1)*Math.PI));
  const pool=.64+groundNoise(z*.035,12)*.62;
  let riffle=0;
  for(const centre of riffleCentres)riffle=Math.max(riffle,Math.exp(-(((z-centre)/4.8)**2)));
  const shoalCentre=.5+.24*Math.sin(z*.043+1.2),shoal=Math.exp(-(((u-shoalCentre)/.18)**2))*riffle;
  const depth=.055+Math.pow(edge,.77)*Math.max(.18,pool-riffle*.32-shoal*.34);
  return {depth,riffle:riffle*smoothRange(0,.4,edge),shoal};
}
export function createStreamProfileTexture(){
  const width=128,height=1024,data=new Uint8Array(width*height*4);
  for(let row=0;row<height;row++)for(let col=0;col<width;col++){
    const p=streamBedProfileAt(-650+row/(height-1)*1000,col/(width-1)),i=(row*width+col)*4;
    data[i]=Math.round(p.depth/1.6*255);data[i+1]=Math.round(p.riffle*255);data[i+2]=Math.round(p.shoal*255);data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}

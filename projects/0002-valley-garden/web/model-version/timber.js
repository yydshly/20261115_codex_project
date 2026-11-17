import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Millimetre edge wear and board-aligned grain, before world-space placement. */
export function timberGeometry(width,height,depth,seed=0){
  const geometry=new RoundedBoxGeometry(width,height,depth,1,.006),p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
  const dimensions=[width,height,depth],axis=dimensions.indexOf(Math.max(...dimensions)),other=[0,1,2].filter(i=>i!==axis);
  const uOffset=((seed*7)%5+.5)/5,vOffset=(Math.sin(seed*17.1)*.5+.5)*3;
  const shade=.80+(Math.sin(seed*9.7)*.5+.5)*.18,colours=[];
  for(let i=0;i<p.count;i++){
    const end=Math.abs(n.getComponent(i,axis))>.8;
    const cross=Math.abs(n.getComponent(i,other[0]))>.6?other[1]:other[0];
    uv.setXY(i,uOffset+p.getComponent(i,end?other[0]:cross)*.38,vOffset+p.getComponent(i,end?other[1]:axis)*.62);
    colours.push(shade,shade*.985,shade*.95);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));return geometry;
}

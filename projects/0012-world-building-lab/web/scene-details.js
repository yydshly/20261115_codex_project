import * as THREE from 'three';
import {geometry,material} from './models.js';

function mesh(g,type,args,c,x=0,y=0,z=0,rotation=[0,0,0],options={}){const m=new THREE.Mesh(geometry(type,args),material(c,options));m.position.set(x,y,z);m.rotation.set(...rotation);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
const box=(g,w,h,d,c,x=0,y=0,z=0)=>mesh(g,'box',[w,h,d],c,x,y,z);
export function detail(kind){const g=new THREE.Group();
 if(kind==='crate'){box(g,1.8,1.6,1.6,'#ac8e5d',0,.8);for(const x of [-.78,.78])box(g,.15,1.75,1.7,'#7d704e',x,.8);for(const y of [.2,1.4])box(g,1.9,.15,1.7,'#8a7851',0,y);}
 else if(kind==='barrel'){mesh(g,'cylinder',[.7,.65,1.8,10],'#9d7e52',0,.9);for(const y of [.3,1.45])mesh(g,'torus',[.7,.055,4,20],'#69736a',0,y,0,[Math.PI/2,0,0]);}
 else if(kind==='cart'){box(g,3,.28,4,'#947e56',0,1.15);for(const x of [-1.5,1.5]){box(g,.2,1,4,'#ad9262',x,1.6);for(const z of [-1.25,1.25])mesh(g,'cylinder',[.65,.65,.24,10],'#70664e',x,.7,z,[0,0,Math.PI/2]);}box(g,3,1,.2,'#a38a5c',0,1.6,-2);for(const x of [-.75,.75])box(g,.14,.14,3.8,'#827455',x,1,3);}
 else if(kind==='well'){mesh(g,'cylinder',[1.65,1.9,1,12],'#a59d84',0,.5);mesh(g,'cylinder',[1.15,1.15,.1,12],'#536f6b',0,1.03);for(const x of [-1.7,1.7])box(g,.2,3.5,.2,'#8f7957',x,2);box(g,3.8,.3,.5,'#a58b60',0,3.6);box(g,.06,2,.06,'#c0af85',0,2.45);}
 else if(kind==='sign'){box(g,.22,3.5,.22,'#8a785a',0,1.75);box(g,2.7,.7,.22,'#b4a071',.4,2.7);mesh(g,'cone',[.55,.9,3],'#b4a071',2.05,2.7,0,[0,0,-Math.PI/2]);}
 else if(kind==='camp'){for(let i=0;i<10;i++){const a=i*Math.PI/5;mesh(g,'ico',[.45,0],'#8b8a76',Math.cos(a)*1.7,.3,Math.sin(a)*1.7);}for(const a of [.6,-.6])mesh(g,'cylinder',[.18,.2,2.6,6],'#7c6344',0,.3,0,[0,a,Math.PI/2]);mesh(g,'cone',[.65,1.6,7],'#deb067',0,.9,0,[0,0,0],{emissive:'#9e4018',emissiveIntensity:.65});mesh(g,'cone',[.33,1.2,6],'#f0c982',.2,1,0,[0,0,0],{emissive:'#c05c22',emissiveIntensity:.8});}
 else if(kind==='cairn'){for(let i=0;i<4;i++){const m=mesh(g,'ico',[1-i*.17,0],i===3?'#d1d8c8':'#9b9e8b',i%2*.1,.4+i*.53,0);m.scale.set(1,.45,.85);}}
 else if(kind==='ruin'){for(let i=0;i<4;i++){box(g,1.2,1,1.3,'#af9f80',i*1.1,1.1,0);box(g,1.1,.9,1.2,'#b6a98b',i*1.1,.35,0);}mesh(g,'cylinder',[.65,.85,3.6,7],'#b9ab8d',-.4,1.8,0);}
 return g;
}

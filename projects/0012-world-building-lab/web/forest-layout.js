// Authored woodland footprint and spatial rules; independent of terrain and rendering.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const FOREST={x:-65,z:240,rx:140,rz:75};
export const FOREST_GAP={x:20,z:280,radius:25};
export const forestStages=['林地基底','树冠围合','林下层次','完整空间'];
export const FOREST_SITES=[
 {id:'forest-edge',name:'长风林缘',terrain:'林缘',x:-180,z:294,targetX:-145,targetZ:267,targetLift:9},
 {id:'forest-dense',name:'青栎密林',terrain:'密林',x:-112,z:245,targetX:-87,targetZ:244,targetLift:13},
 {id:'forest-understory',name:'蕨影林下',terrain:'林下',x:-40,z:230,targetX:-25,targetZ:214,targetLift:1},
 {id:'forest-gap',name:'晴光林窗',terrain:'林窗',x:20,z:280,targetX:56,targetZ:269,targetLift:6}
];
export function forestField(x,z){const r=Math.hypot((x-FOREST.x)/FOREST.rx,(z-FOREST.z)/FOREST.rz);if(r>=1.15)return null;const weight=1-smooth((r-.65)/.5),gapDistance=Math.hypot(x-FOREST_GAP.x,z-FOREST_GAP.z),gap=1-smooth((gapDistance-FOREST_GAP.radius)/12),under=Math.hypot(x+40,z-230)<35;return {r,weight,gap,gapDistance,zone:gap>.45?'林窗':r>.78?'林缘':under?'林下':'密林',canopy:weight*(1-gap),floor:weight};}
export function forestSurface(x,z){const f=forestField(x,z);if(!f||f.weight<.12)return null;const green=f.gap>.4,patch=Math.sin(x*.31+z*.09)*Math.cos(z*.27);return green?[126+patch*9,151+patch*7,91]:[103+patch*11,112+patch*8,78+patch*5];}
export const FOREST_LOGS=[
 {x:-30,z:219,length:5.4,angle:.2,radius:.25},
 {x:-50,z:217,length:4.6,angle:-.8,radius:.21},
 {x:-99,z:231,length:5.7,angle:.7,radius:.29},
 {x:-132,z:260,length:4.2,angle:1.2,radius:.24},
 {x:-73,z:273,length:6.1,angle:-.5,radius:.27},
 {x:39,z:252,length:4.7,angle:.3,radius:.23},
 {x:-15,z:198,length:5.2,angle:1.5,radius:.3}
];

// Authored underground volume, independent of the outdoor heightfield.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const CAVE_NODES=[
 {x:60,z:335,floor:36.392993725674856,half:6,height:9},
 {x:100,z:350,floor:34,half:5,height:6},
 {x:135,z:353,floor:32,half:9,height:10},
 {x:180,z:350,floor:30,half:22,height:19},
 {x:240,z:335,floor:29,half:26,height:14},
 {x:280,z:330,floor:29,half:16,height:10}
];
export const CAVE_WATER={x:235,z:335,rx:19,rz:14,level:27.8,depth:5};
export const caveStages=['空间骨架','岩层表面','地下水域','完整洞境'];
export const CAVE_SITES=[
 {id:'cave-mouth',name:'山缘洞口',terrain:'洞口',x:56,z:335,underground:false,targetX:78,targetZ:342,targetY:45},
 {id:'cave-tunnel',name:'回声洞道',terrain:'洞道',x:111,z:351,underground:true,targetX:129,targetZ:352,targetY:36},
 {id:'cave-hall',name:'石幔洞厅',terrain:'洞厅',x:174,z:349,underground:true,targetX:195,targetZ:345,targetY:41},
 {id:'cave-water',name:'静潭地下水域',terrain:'地下水域',x:235,z:315,underground:true,targetX:238,targetZ:335,targetY:27.9}
];
export function caveProfile(x){if(x<60||x>280)return null;let i=0;while(i<CAVE_NODES.length-2&&x>CAVE_NODES[i+1].x)i++;const a=CAVE_NODES[i],b=CAVE_NODES[i+1],t=(x-a.x)/(b.x-a.x),u=smooth(t);return {x,z:mix(a.z,b.z,u),floor:mix(a.floor,b.floor,u),half:mix(a.half,b.half,u),height:mix(a.height,b.height,u)};}
export function caveWaterField(x,z){const r=Math.hypot((x-CAVE_WATER.x)/CAVE_WATER.rx,(z-CAVE_WATER.z)/CAVE_WATER.rz);return r<1.4?{r,level:CAVE_WATER.level,depth:CAVE_WATER.depth}:null;}
export function caveField(x,z){const p=caveProfile(x);if(!p)return null;const lateral=z-p.z;let u=lateral/p.half;if(Math.abs(u)>1+1e-8)return null;u=clamp(u,-1,1);const crossSlope=.54*lateral*(1-smooth((x-60)/20)),rough=(Math.sin(x*.28)*Math.cos(z*.41)*.09)*smooth((x-60)/6);let floor=p.floor+crossSlope+Math.pow(u,4)*.8+rough;const w=caveWaterField(x,z);if(w){const bed=w.level-w.depth*Math.pow(Math.max(0,1-w.r*w.r),1.4);floor=w.r<=1?bed:mix(w.level+.04,floor,smooth((w.r-1)/.4));}const ceiling=p.floor+crossSlope+2.6+p.height*Math.sqrt(Math.max(0,1-u*u))+.18*Math.sin(x*.31+z*.18);return {...p,u,floor,ceiling,water:w&&w.r<=1?w:null};}
export function caveVoidAt(x,y,z){const f=caveField(x,z);return !!f&&y>f.floor+.1&&y<f.ceiling+.2;}
export function caveTerrainCut(x,y,z,cutaway=false){const p=caveProfile(clamp(x,60,280));return caveVoidAt(x,y,z)||(cutaway&&x>47&&x<293&&Math.abs(z-p.z)<p.half+45);}
export function caveNearTile(x,z,half=80){return x+half>47&&x-half<293&&z+half>300&&z-half<385;}
export function caveMouthTile(x,z,half=80){return x+half>55&&x-half<82&&z+half>322&&z-half<350;}
export function caveGuide(t){t=clamp(t);const s=Math.min(2,Math.floor(t*3)),u=t*3-s,a=CAVE_SITES[s],b=CAVE_SITES[s+1];return {x:mix(a.x,b.x,u),z:mix(a.z,b.z,u),underground:mix(a.x,b.x,u)>=60};}
export function nearCaveGuide(x,z,radius=2){for(let i=0;i<3;i++){const a=CAVE_SITES[i],b=CAVE_SITES[i+1],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));if(Math.hypot(x-a.x-dx*u,z-a.z-dz*u)<radius)return true;}return false;}
export const CAVE_FORMATIONS=[];
for(let x=125;x<=270;x+=13)for(const side of [-1,1]){const p=caveProfile(x),z=p.z+side*p.half*.7,f=caveField(x,z);if(!f||f.water||nearCaveGuide(x,z,3))continue;CAVE_FORMATIONS.push({x,z,radius:.4+(Math.sin(x*3)+1)*.17,height:1.4+(Math.cos(x)+1)*1.3,floor:f.floor,ceiling:f.ceiling});}
export function caveWalkable(x,z){const f=caveField(x,z);return !!f&&x<279.55&&Math.abs(f.u)<1-.42/f.half&&f.ceiling-f.floor>2.25&&!f.water&&!CAVE_FORMATIONS.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+.35);}

// Authored karst relief and height-aware underground layers. Not geological simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const KARST={minX:300,maxX:780,minZ:-1510,maxZ:-980};
export const SINK={x:630,z:-1250,radius:50,top:74,bottom:6,shaftRadius:10,shaftBottom:-34};
export const KARST_STAGES=['岩体与垂直骨架','地表与洞壁','地下水域','完整立体空间'];
export const KARST_SITES=[
 {id:'karst-peaks',terrain:'峰林',name:'高耸峰林与岩体轮廓',x:390,z:-1050,layer:'surface',targetX:410,targetZ:-1190,targetY:130},
 {id:'karst-stones',terrain:'石林',name:'细柱石林与地面通路',x:530,z:-1090,layer:'surface',targetX:540,targetZ:-1160,targetY:94},
 {id:'karst-sink',terrain:'天坑',name:'天坑边缘与向下打开的空间',x:630,z:-1205,layer:'surface',targetX:630,targetZ:-1250,targetY:6},
 {id:'karst-shaft',terrain:'竖井',name:'透空平台与竖井观察',x:630,z:-1250,layer:'surface',targetX:633,targetZ:-1251,targetY:-25},
 {id:'karst-layers',terrain:'多层洞穴',name:'同一位置上下叠置的洞廊',x:700,z:-1320,layer:'lower',underground:true,targetX:708,targetZ:-1352,targetY:-24},
 {id:'karst-river',terrain:'地下河',name:'下层洞廊中的地下河岸',x:700,z:-1400,layer:'lower',underground:true,targetX:720,targetZ:-1402,targetY:-35.25}
].map((r,index)=>({...r,index,karst:true}));
export const KARST_GROUND=[KARST_SITES[0],KARST_SITES[1],{x:630,z:-1190},KARST_SITES[2],KARST_SITES[3]];
const node=(x,z,y)=>({x,z,y});
export const UPPER=[node(670,-1250,38),node(700,-1290,38),node(710,-1340,36),node(675,-1340,36),node(670,-1290,38),node(670,-1250,38)];
export const LOWER=[node(630,-1250,-28),node(700,-1290,-28),node(700,-1340,-30),node(712,-1365,-33),node(712,-1440,-33.7)];
export const KARST_LINES=[...UPPER.slice(1).map((b,i)=>({a:UPPER[i],b,half:8,height:11,layer:'upper'})),...LOWER.slice(1).map((b,i)=>({a:LOWER[i],b,half:i>=2?17:8,height:12,layer:'lower'}))];
export const karstWeight=(x,z)=>smooth((x-300)/45)*smooth((780-x)/35)*smooth((z+1510)/40)*smooth((-980-z)/35);
export function karstSegment(a,b,x,z){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));return {t,distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t),lateral:Math.abs((x-a.x)*dz-(z-a.z)*dx)/Math.hypot(dx,dz),floor:a.y+(b.y-a.y)*t};}
export function karstGuideDistance(x,z){return Math.min(...KARST_GROUND.slice(1).map((b,i)=>karstSegment(KARST_GROUND[i],b,x,z).distance));}
export function riverProfile(z){const t=clamp((-1365-z)/65);return {level:-35-.6*t,bed:-38-.6*t,t};}
export function karstLayerField(layer,x,z,padding=0){if(x<620-padding||x>748+padding||z< -1458-padding||z> -1232+padding)return null;let floor=0,total=0,ceiling=-Infinity,edge=-Infinity;for(const line of KARST_LINES){if(line.layer!==layer)continue;const q=karstSegment(line.a,line.b,x,z);if(q.distance>=line.half+padding)continue;let y=q.floor+Math.pow(Math.min(1,q.lateral/line.half),4)*.3;if(layer==='lower'&&z< -1350){const k=1-smooth((Math.abs(x-720)-1.8)/1.2);y=y*(1-k)+riverProfile(z).bed*k;}const weight=(1-q.distance/(line.half+padding))**2;floor+=y*weight;total+=weight;ceiling=Math.max(ceiling,q.floor+3+line.height*Math.sqrt(Math.max(0,1-(Math.min(1,q.lateral/line.half))**2)));edge=Math.max(edge,line.half-q.distance);}return total>0?{floor:floor/total,ceiling,edge,layer,open:false}:null;}
export function karstBridgeField(x,z){return x>=633&&x<=676&&Math.abs(z+1250)<1.6?{floor:38,ceiling:82,edge:1.6-Math.abs(z+1250),layer:'upper',open:x<663}:null;}
export function karstLowerBridgeField(x,z){const q=karstSegment({x:630,z:-1250,y:-28},{x:646,z:-1259.14,y:-28},x,z);return q.distance<1.5&&Math.hypot(x-630,z+1250)>=3?{floor:-28,ceiling:82,edge:1.5-q.distance,layer:'lower',open:true}:null;}
export function karstField(x,z,y=74,guide=false){if(karstWeight(x,z)<.2)return null;const r=Math.hypot(x-630,z+1250),shaft={floor:-34,ceiling:82,edge:10-r,layer:'shaft',open:true};if(r<10&&Math.min(Math.abs(y-74),Math.abs(y-38),Math.abs(y+28))>2)return shaft;const fields=[r>=11?karstLayerField('upper',x,z):null,r>=11?karstLayerField('lower',x,z):null,karstBridgeField(x,z),karstLowerBridgeField(x,z)].filter(Boolean);if(r<10){for(const level of [74,38,-28])if(Math.abs(y-level)<2&&(guide||Math.abs(liftLevel-level)<.03)&&Math.abs(x-630)<=3.02&&Math.abs(z+1250)<=3.02)fields.push({floor:level,ceiling:82,edge:3,layer:level===74?'surface':level===38?'upper':'lower',open:true});fields.push(shaft);}fields.sort((a,b)=>Math.abs(a.floor-y)-Math.abs(b.floor-y));const best=fields[0];if(best)for(const f of fields)if(f.layer===best.layer&&Math.abs(f.floor-best.floor)<.5)best.edge=Math.max(best.edge,f.edge);return best||null;}

export function karstWaterAt(x,z){if(z< -1364&&z> -1431&&Math.abs(x-720)<2.45&&karstWeight(x,z)>.8){const p=riverProfile(z);return {...p,depth:3,karst:true,fresh:true,layer:'lower'};}return null;}
export function karstTerrain(x,z,h){const w=karstWeight(x,z);if(!w)return h;let y=74+3*Math.sin(x*.026)*Math.cos(z*.025),r=Math.hypot(x-630,z+1250);if(r<50)y=74-68*smooth((1-r/50)/.95);if(r<11)y=-34+40*smooth((r-10));const g=karstGuideDistance(x,z);if(g<12&&r>50){const k=1-smooth((g-3.5)/8.5);y=y*(1-k)+74*k;}return h*(1-w)+y*w;}
let liftLevel=74;export const setKarstLiftLevel=y=>{liftLevel=Math.max(-28,Math.min(74,y));};export const getKarstLiftLevel=()=>liftLevel;
export function karstSupport(x,z,h,guide=false){const r=Math.hypot(x-630,z+1250),gangway=Math.abs(x-630)<1.7&&z>=-1247&&z<=-1190,ring=r>=4.3&&r<8;if(gangway||ring||Math.abs(x-630)<3&&Math.abs(z+1250)<3&&(guide||Math.abs(liftLevel-74)<.03))return Math.max(h,74);return h;}
export function karstColor(x,z){if(karstWeight(x,z)<.25)return null;const r=Math.hypot(x-630,z+1250);return r<50?[132,131,113]:[151,149,128];}
export function karstTerrainCut(x,y,z,cutaway=false){if(karstWeight(x,z)<.2)return false;if(cutaway&&(Math.hypot(x-630,z+1250)<57||karstLayerField('upper',x,z,10)||karstLayerField('lower',x,z,10)))return true;for(const layer of ['upper','lower']){const f=karstLayerField(layer,x,z);if(f&&y>f.floor+.06&&y<f.ceiling+.3)return true;}const b=karstBridgeField(x,z);return !!b&&y>b.floor+.06&&y<52;}
export const karstReserved=(x,z)=>karstWeight(x,z)>.001;
export const karstNearTile=(x,z)=>x>220&&x<860&&z< -900;

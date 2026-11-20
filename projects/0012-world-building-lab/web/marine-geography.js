// Authored coast and bathymetry. Metres; the existing sea remains at zero.
export const MARINE={level:0,low:-.65,high:.65,xMin:-1850,xMax:-1110,zMin:-1200,zMax:-450};
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function marineWeight(x,z){return smooth((x+1850)/100)*smooth((-1110-x)/90)*smooth((z+1200)/100)*smooth((-450-z)/90);}
export function shoreX(z){return -1450+.38*(-z-500)+8*Math.sin((z+500)*.035)+4*Math.sin(z*.09)-25*Math.exp(-(((z+560)/55)**2))+20*Math.exp(-(((z+650)/65)**2));}
export function marineProfile(x,z){const d=shoreX(z)-x;let h=d<0?.7-d*.05:d<70?.7-d*.02:d<220?-.7-(d-70)*.065:-10.45-(d-220)*.10;
 h+=5.5*Math.exp(-(((d+25)/34)**2)-(((z+560)/48)**2)); // rocky headland
 h+=6.5*Math.exp(-(((d-104)/19)**2)-(((z+575)/23)**2))+3.3*Math.exp(-(((d-98)/17)**2)-(((z+716)/21)**2));
 h-=1.25*Math.exp(-(((d-18)/7)**2)-(((z+652)/8)**2)); // real tide-pool depression
 h+=.45*Math.exp(-(((Math.hypot(d-18,z+652)-11)/2.7)**2));
 h+=.35*Math.sin(d*.12+z*.025)*smooth((d-70)/40)+.06*Math.sin(d*.32+z*.05)*(1-smooth((d-55)/15));
 return Math.max(-34,h);
}
export function marineLandform(x,z,h){const w=marineWeight(x,z);return w?h*(1-w)+marineProfile(x,z)*w:h;}
export function marineWaterAt(x,z){if(marineWeight(x,z)<.01||marineProfile(x,z)>=0)return null;return {level:0,depth:-marineProfile(x,z),marine:true,salt:1};}
export function marineSurface(x,z,h){if(marineWeight(x,z)<.98)return null;const d=shoreX(z)-x;return d<0?[125,127,115]:h>.2?[159,151,123]:h>-1?[119,126,105]:d<145?[167,158,125]:d<230?[151,151,129]:[113,130,124];}
export function marineDepthColor(h){const d=Math.max(0,-h),a=d<2?[130,192,172]:d<10?[63,157,170]:[42,99,143];return a.map(v=>v/255);}
export const MARINE_SITES=[
 {id:'marine-reef',name:'岬角礁岸',terrain:'礁岸',x:-1415,z:-550,targetX:-1551,targetZ:-575},
 {id:'marine-tidal',name:'潮池与滩台',terrain:'潮间带',x:-1400,z:-630,targetX:-1388.602,targetZ:-652},
 {id:'marine-shallow',name:'浅海草甸',terrain:'浅海',x:-1510,z:-810,targetX:-1530,targetZ:-842,survey:true},
 {id:'marine-bed',name:'陆架海床',terrain:'海床',x:-1600,z:-1030,targetX:-1625,targetZ:-1062,survey:true}
].map(r=>({...r,marine:true}));

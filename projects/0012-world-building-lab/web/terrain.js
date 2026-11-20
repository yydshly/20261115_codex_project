import {terrains} from './world-data.js';
export const SIZE=96;
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function random(seed){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
function hash(x,z,seed){let n=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(seed,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x,z,seed){const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz;const a=u*u*(3-2*u),b=v*v*(3-2*v);return lerp(lerp(hash(ix,iz,seed),hash(ix+1,iz,seed),a),lerp(hash(ix,iz+1,seed),hash(ix+1,iz+1,seed),a),b)*2-1;}
function fbm(x,z,seed){let a=.55,v=0;for(let i=0;i<4;i++){v+=noise(x,z,seed+i*11)*a;x*=2.06;z*=2.06;a*=.5;}return v;}
const gaussian=(x,z,cx,cz,r)=>Math.exp(-((x-cx)**2+(z-cz)**2)/(r*r));
export const riverX=z=>-5+Math.sin(z*.075)*5;
export const pathX=z=>13+Math.sin(z*.065)*7;
export const surfaceVariation=(x,z,seed)=>.97+fbm(x*.28,z*.28,seed+22)*.18+fbm(x*.72,z*.72,seed+61)*.05;
export function rawHeight(id,x,z,seed=17){
 const n=fbm(x*.055,z*.055,seed),f=fbm(x*.12,z*.12,seed+101);
 if(id==='valley')return 4+Math.pow(Math.abs(x-riverX(z))*.15,1.3)+n*3+f*.55-3.5*Math.exp(-(((x-riverX(z))/3.1)**2));
 if(id==='hills')return 7+5*Math.sin(x*.065+1)*Math.cos(z*.06)+n*4-5*gaussian(x,z,-19,-10,10);
 if(id==='canyon'){const d=Math.abs(x-4*Math.sin(z*.04));return 1.1+smooth(4,13,d)*11+smooth(17,24,d)*5+smooth(28,35,d)*4+n*1.5+f*.5;}
 if(id==='dunes')return 5+3*Math.sin(x*.17+Math.sin(z*.05)*1.3)+1.5*Math.sin(x*.09+z*.08)+n*.8-4*gaussian(x,z,13,-10,9);
 if(id==='alpine')return 7+25*gaussian(x,z,-15,6,20)+20*gaussian(x,z,17,-17,17)+16*gaussian(x,z,18,24,15)+Math.abs(n)*7+f*1.5-7*gaussian(x,z,-4,-24,12);
 if(id==='volcano'){const r=Math.hypot(x,z);return 4+24*Math.max(0,1-r/43)-17*Math.exp(-(r*r)/70)+Math.abs(n)*2.7+f*.65;}
 if(id==='island'){const r=Math.hypot(x*.92,z);return 1+17*Math.exp(-(r*r)/650)-r*.035+n*2.2+f*.4;}
 if(id==='wetland')return 4.5+n*2+Math.sin(x*.12)*Math.cos(z*.1)*.4;
 if(id==='mesa'){const r=Math.hypot(x+6,z-3);return 3+smooth(40,27,r)*8+smooth(25,18,r)*8+n*1.8-3*gaussian(x,z,18,25,8);}
 if(id==='coast')return 1+smooth(-15,3,x)*4+smooth(8,15,x)*10+n*2.2+f*.35;
 return 0;
}
export function heightAt(state,x,z){return rawHeight(state.biome,x,z,state.seed)*state.height;}
export function slopeAt(state,x,z){const e=.5;return Math.hypot((heightAt(state,x+e,z)-heightAt(state,x-e,z))/(2*e),(heightAt(state,x,z+e)-heightAt(state,x,z-e))/(2*e));}
export function waterLevel(state){return terrains.find(t=>t.id===state.biome).water*state.height;}
export function materialAt(state,x,z){
 if(state.surface!=='auto')return state.surface;
 const h=heightAt(state,x,z),s=slopeAt(state,x,z),water=waterLevel(state),id=state.biome;
 if(id==='volcano')return 'basalt';
 if(id==='dunes')return Math.hypot(x-13,z+10)<8?'mud':'sand';
 if(id==='canyon')return s>.65?'rock':(h>14*state.height?'gravel':'sand');
 if(id==='alpine'&&h>20*state.height&&s<1.7)return 'snow';
 if((id==='island'||id==='coast')&&h<water+2.4*state.height)return 'sand';
 if(id==='wetland'&&h<water+.35*state.height)return 'mud';
 if(s>.72)return 'rock';
 if(id==='mesa')return h>12*state.height?'gravel':'soil';
 if(Math.abs(x-pathX(z))<1.5&&id!=='wetland')return 'soil';
 if(h<water+.7*state.height&&id!=='alpine')return 'mud';
 return 'grass';
}
export const palettes={grass:'#77915a',soil:'#9e7e5e',gravel:'#aba598',rock:'#92958d',sand:'#d6b782',snow:'#e5eeec',mud:'#687458',basalt:'#565450'};

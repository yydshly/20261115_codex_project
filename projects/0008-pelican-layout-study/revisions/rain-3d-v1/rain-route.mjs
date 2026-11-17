export const DURATION=68;
export const CHAPTERS=[{start:0,end:19,name:"檐下",subtitle:"一滴雨的细微",caption:"伸出手，先接住眼前这一滴。"},{start:19,end:45,name:"竹间",subtitle:"一片青绿的纵深",caption:"跟着石径，穿过雨里的青绿。"},{start:45,end:68,name:"空江",subtitle:"一江留白的远方",caption:"穿过最后一丛竹叶，天地在眼前打开。"}];
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const KNOTS=[[0,0,2],[2.1,0,-3.5],[1.6,0,-8.5],[-1.2,0,-14.5],[-.6,0,-20.8],[2.8,0,-26.5],[3.9,0,-32.5],[3.4,0,-35.3]];
function curve(t){const f=clamp(t)*(KNOTS.length-1),i=Math.min(KNOTS.length-2,Math.floor(f)),u=f-i;const a=KNOTS[Math.max(0,i-1)],b=KNOTS[i],c=KNOTS[i+1],d=KNOTS[Math.min(KNOTS.length-1,i+2)];return b.map((v,k)=>.5*((2*v)+(-a[k]+c[k])*u+(2*a[k]-5*v+4*c[k]-d[k])*u*u+(-a[k]+3*v-3*c[k]+d[k])*u*u*u));}
const arc=[{t:0,d:0,p:curve(0)}];
for(let i=1;i<=512;i++){const p=curve(i/512),prev=arc[i-1];arc.push({t:i/512,d:prev.d+Math.hypot(...p.map((v,k)=>v-prev.p[k])),p});}
export const PATH_LENGTH=arc.at(-1).d;
export function pathAt(distance){const d=clamp(distance,0,PATH_LENGTH);let lo=0,hi=arc.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(arc[m].d<d)lo=m;else hi=m;}const f=(d-arc[lo].d)/(arc[hi].d-arc[lo].d||1);return curve(mix(arc[lo].t,arc[hi].t,f));}
function travel(u){u=clamp(u);const r=.07,n=1-r;if(u<r)return u*u/(2*r*n);if(u>1-r)return 1-(1-u)*(1-u)/(2*r*n);return(u-r/2)/n;}
const CAMERAS=[
 {t:0,offset:[6.8,3.4,7.3],target:[-.7,1.25,-.3],fov:42},
 {t:7.5,offset:[5.9,3.1,6.7],target:[-.4,1.2,-.6],fov:43},
 {t:20,offset:[5.3,3.0,6.4],target:[0,1.2,-1.1],fov:45},
 {t:33,offset:[-4.4,3.1,6.0],target:[0,1.25,-1.5],fov:46},
 {t:45,offset:[-4.7,3.2,6.4],target:[0,1.1,-2.1],fov:46},
 {t:54,offset:[.8,4.4,5.0],target:[.2,1.0,-3.5],fov:48},
 {t:62,offset:[.2,9.5,9.0],target:[.3,.8,-7.0],fov:58},
 {t:68,offset:[.5,11.7,12.0],target:[.5,.8,-9.0],fov:64}
];
export function sampleJourney(time){
 const t=clamp(time,0,DURATION),u=clamp((t-7.5)/47.5),distance=PATH_LENGTH*travel(u),position=pathAt(distance),ahead=pathAt(Math.min(PATH_LENGTH,distance+.12)),behind=pathAt(Math.max(0,distance-.12));
 const yaw=Math.atan2(ahead[0]-behind[0],ahead[2]-behind[2]),walk=smooth((t-7.5)/2)*(1-smooth((t-53)/2));
 let right=CAMERAS.findIndex(k=>k.t>=t);if(right<1)right=1;const a=CAMERAS[right-1],b=CAMERAS[right],v=smooth((t-a.t)/(b.t-a.t));
 const reach=smooth((t-1.2)/1.5)*(1-smooth((t-6.0)/1.5)),river=smooth((position[2]+25)/-10);
 return{time:t,distance,position,yaw,walk,reach,river,chapter:t<19?0:t<45?1:2,camera:{offset:a.offset.map((x,i)=>mix(x,b.offset[i],v)),target:a.target.map((x,i)=>mix(x,b.target[i],v)),fov:mix(a.fov,b.fov,v)}};
}
export function legPose(distance,side=0,bob=0,walk=1){
 const phase=distance/1.18*Math.PI*2+(side?Math.PI:0),lift=Math.max(0,Math.sin(phase))*.13*walk,z=Math.cos(phase)*.23*walk,y=.075+lift-bob,dy=y-(.75+.04*(1-walk)),L=.36,d=clamp(Math.hypot(dy,z),.05,L*2-.0001),direction=Math.atan2(-z,-dy),bend=Math.acos(clamp((2*L*L-d*d)/(2*L*L),-1,1));
 const knee=Math.PI-bend,hip=direction-Math.acos(clamp(d/(2*L),-1,1));return{hip,knee,ankle:-hip-knee,footY:y,footZ:z,phase};
}

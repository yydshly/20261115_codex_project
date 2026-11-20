import {northWaterAt,northField} from './northern-watershed.js';
import {linkWaterAt} from './watershed-link.js';
import {warmWeight,warmWaterAt} from './warm-layout.js';
import {uplandWaterAt} from './upland-layout.js';
import {fanWaterAt} from './fan-layout.js';
import {strataWaterAt} from './strata-layout.js';
import {saltWaterAt} from './salt-layout.js';
import {karstWaterAt} from './karst-layout.js';
import {geologyWaterAt,eastShelfWaterAt} from './geology-layout.js';
import {drylandWaterAt} from './dryland-layout.js';
import {tropicalWaterAt} from './tropical-layout.js';
import {oceanWaterAt} from './ocean-layout.js';
import {polarWaterAt} from './polar-layout.js';
import {marineLandform,marineWaterAt} from './marine-geography.js';
import {glacialWaterAt,glacialHydro} from './glacial-geography.js';
import {inlandWaterAt,inlandHydro} from './inland-geography.js';
import {naturalHeight} from './land-base.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const mix=(a,b,u)=>a+(b-a)*u;
export const WATER_CONTROLS=[{x:90,z:-70},{x:-220,z:-130},{x:-590,z:-110},{x:-1035,z:-335},{x:-1430,z:-260},{x:-1700,z:-190}];
export const SOURCE_POOL={x:90,z:-70,rx:23,rz:17,level:212,depth:2.2};
export const BAY={x:-1485,z:-190,rx:235,rz:170,depth:8};
export const FALL_T=.115,FALL_TOP=163,FALL_BOTTOM=155;
const levels=[[0,212],[.025,212],[.115,163],[.115,155],[.128,155],[.2,76],[.4,25],[.6,2.4],[.8,.3],[1,0]];
const widths=[4,3.5,12,42,28,135],depths=[1.8,1.5,3.4,1.2,3.5,7];
export function riverPoint(t){const scaled=clamp(t)*5,index=Math.min(4,Math.floor(scaled)),u=scaled-index,p0=WATER_CONTROLS[Math.max(0,index-1)],p1=WATER_CONTROLS[index],p2=WATER_CONTROLS[index+1],p3=WATER_CONTROLS[Math.min(5,index+2)],u2=u*u,u3=u2*u;const c=k=>.5*((2*p1[k])+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u3);return {x:c('x'),z:c('z')};}
export function riverLevel(t,upper=false){t=clamp(t);if(upper&&Math.abs(t-FALL_T)<1e-8)return FALL_TOP;for(let i=levels.length-1;i>0;i--){const a=levels[i-1],b=levels[i];if(t>=a[0]&&b[0]>a[0])return mix(a[1],b[1],clamp((t-a[0])/(b[0]-a[0])));}return 212;}
function profile(values,t){const scaled=clamp(t)*5,i=Math.min(4,Math.floor(scaled));return mix(values[i],values[i+1],smooth(scaled-i));}
export function riverSample(t){t=clamp(t);const p=riverPoint(t),a=riverPoint(Math.max(0,t-.0006)),b=riverPoint(Math.min(1,t+.0006)),length=Math.hypot(b.x-a.x,b.z-a.z)||1,dx=(b.x-a.x)/length,dz=(b.z-a.z)/length;return {...p,t,dx,dz,nx:-dz,nz:dx,level:riverLevel(t),half:profile(widths,t)*(1+.045*Math.sin(t*113)),depth:profile(depths,t),bank:t<.4?26:t<.7?32:38,bankRise:t<.4?2.4:t<.7?1.3:.65};}
export function branchSample(branch,t){const p=riverSample(t);if(!branch)return p;const u=clamp((t-.70)/.27),side=branch===1?1:-1,offset=Math.sin(u*Math.PI)*94*side;return {...p,x:p.x+p.nx*offset,z:p.z+p.nz*offset,half:15+u*14,bank:23,bankRise:.55,branch};}
const binSize=32,segments=new Map();
export const riverLines=[];
for(const branch of [0,1,2]){const start=branch?.70:0,end=branch?.97:1,points=[];for(let i=0;i<=800;i++){const t=mix(start,end,i/800);points.push(branchSample(branch,t));}riverLines.push({branch,points});for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],radius=Math.max(a.half+a.bank+28,b.half+b.bank+28),seg={a,b,branch};for(let x=Math.floor((Math.min(a.x,b.x)-radius)/binSize);x<=Math.floor((Math.max(a.x,b.x)+radius)/binSize);x++)for(let z=Math.floor((Math.min(a.z,b.z)-radius)/binSize);z<=Math.floor((Math.max(a.z,b.z)+radius)/binSize);z++){const key=x+','+z;if(!segments.has(key))segments.set(key,[]);segments.get(key).push(seg);}}}
export function riverField(x,z){let best=null,score=Infinity;for(const s of segments.get(Math.floor(x/binSize)+','+Math.floor(z/binSize))||[]){const vx=s.b.x-s.a.x,vz=s.b.z-s.a.z,length=vx*vx+vz*vz,u=length?clamp(((x-s.a.x)*vx+(z-s.a.z)*vz)/length):0,px=s.a.x+vx*u,pz=s.a.z+vz*u,d2=(x-px)**2+(z-pz)**2,half=mix(s.a.half,s.b.half,u),bank=mix(s.a.bank,s.b.bank,u),normalized=d2/(half*half);if(normalized>=score||d2>(half+bank+28)**2)continue;score=normalized;const t=mix(s.a.t,s.b.t,u);best={x:px,z:pz,t,half,bank,bankRise:mix(s.a.bankRise,s.b.bankRise,u),depth:mix(s.a.depth,s.b.depth,u),level:riverLevel(t),distance:Math.sqrt(d2),normalized:Math.sqrt(normalized),branch:s.branch};}
 const ellipse=Math.hypot((x-SOURCE_POOL.x)/SOURCE_POOL.rx,(z-SOURCE_POOL.z)/SOURCE_POOL.rz);if(ellipse<1.8&&(!best||ellipse<=best.normalized)){best={x:SOURCE_POOL.x,z:SOURCE_POOL.z,t:0,half:20,bank:14,bankRise:2.2,depth:SOURCE_POOL.depth,level:SOURCE_POOL.level,distance:ellipse*20,normalized:ellipse,branch:0,pool:true};}return best;}
export function waterAt(x,z){const northern=northWaterAt(x,z);if(northern){const q=riverField(x,z);return q&&q.normalized<=1?q:northern;}const connected=linkWaterAt(x,z);if(connected)return connected;if(warmWeight(x,z)>.98)return warmWaterAt(x,z);const upland=uplandWaterAt(x,z);if(upland)return upland;const fan=fanWaterAt(x,z);if(fan)return fan;const strata=strataWaterAt(x,z);if(strata)return strata;const saline=saltWaterAt(x,z);if(saline)return saline;const karst=karstWaterAt(x,z);if(karst)return karst;const geo=geologyWaterAt(x,z);if(geo)return geo;const dryland=drylandWaterAt(x,z);if(dryland)return dryland;const tropical=tropicalWaterAt(x,z);if(tropical)return tropical;const ocean=eastShelfWaterAt(x,z)||oceanWaterAt(x,z);if(ocean)return ocean;const polar=polarWaterAt(x,z);if(polar)return polar;const marine=marineWaterAt(x,z);if(marine)return marine;const iceWater=glacialWaterAt(x,z);if(iceWater)return iceWater;const inland=inlandWaterAt(x,z);if(inland)return inland;const q=riverField(x,z);if(q&&q.normalized<=1)return q;const bay=Math.hypot((x-BAY.x)/BAY.rx,(z-BAY.z)/BAY.rz);return bay<1?{level:0,depth:BAY.depth,t:1,bay:true,normalized:bay}:null;}
export function hydroTerrain(x,z,original){let h=original;const bay=Math.hypot((x-BAY.x)/BAY.rx,(z-BAY.z)/BAY.rz);if(bay<1.15){const floor=-BAY.depth*Math.max(0,1-bay*bay);h=mix(h,Math.min(h,floor),1-smooth((bay-.88)/.27));}
 const q=riverField(x,z);if(q){let target,influence;if(q.normalized<=1){target=q.level-q.depth*Math.pow(Math.max(0,1-q.normalized*q.normalized),1.2);influence=1;}else{const d=q.distance-q.half;target=q.level+.12+q.bankRise*smooth(d/q.bank);influence=1-smooth((d-q.bank)/(28));}if(Math.abs(q.t-FALL_T)<.0045&&q.normalized<1.12)target=Math.min(target,FALL_BOTTOM-2.6+10*smooth((q.normalized-.85)/.27));const taper=q.pool?1:1-smooth((q.t-.86)/.11);h=mix(h,target,influence*taper);}
 for(const [cx,cz,rx,rz,top] of [[-1400,-242,30,12,.48],[-1460,-292,39,15,.38],[-1510,-215,27,12,.25]]){const d=((x-cx)/rx)**2+((z-cz)/rz)**2;if(d<1&&(!q||q.normalized>1.08))h=Math.max(h,top*(1-d)-.12);}
 return marineLandform(x,z,glacialHydro(x,z,inlandHydro(x,z,h,!!q&&q.normalized<=1),!!q&&q.normalized<=1));
}
export function bankPoint(t){const p=riverSample(t);let offset=p.half+7;if(t<.05){const radius=1/Math.hypot(p.nx/SOURCE_POOL.rx,p.nz/SOURCE_POOL.rz),u=clamp((t-.025)/.02),w=u*u*(3-2*u);offset=mix(radius+5,offset,w);}if(t>.69)offset+=Math.sin(clamp((t-.69)/.29)*Math.PI)*110;return {...p,x:p.x+p.nx*offset,z:p.z+p.nz*offset};}
export function waterRouteSample(t){const riverT=clamp(t)*.90,p=bankPoint(riverT),ground=hydroTerrain(p.x,p.z,naturalHeight(p.x,p.z));return {...p,t,riverT,y:riverT>.68?Math.max(ground+.12,p.level+1.25)+4*Math.exp(-(((riverT-.8)/.022)**2)):ground+.05};}
const lessons=[
 ['融雪源头','雪岭源头','先看水从哪里出现。雪岭凹地形成一汪源头水，溢流沿狭窄出口下行。',['凹地、出水口与两侧山坡共同确定水的起点；源头池有独立盆底。','浅水边缘与深处使用不同颜色和波纹，水面下有可隐藏水面检查的地形。','雪岩、出水口与观景点给山地水源提供尺度。'],['先做蓄水凹地和出口，再决定水面高度。','把水体与河床分别制作，检查两者是否真正相接。','围绕水的来源组织素材与观看方向。']],
 ['跌水溪流','溪流跌水','沿水向下，溪流在石质河床中加速，窄水道与跌水连接上游和河谷。',['纵向落差与窄河床决定溪流的形状，跌水处有明确台阶。','流纹与泡沫沿下游方向移动；跌水面连接上下两个水位。','岸边岩石、跌水飞沫和沿岸小径表现水流与空间的关系。'],['沿高差组织水路，检查水位始终向下。','用流向和局部泡沫帮助读懂流动，不能只换水的颜色。','在落差处加观察点，把地貌变化变成主线节点。']],
 ['河谷主河','河谷水道','溪流汇入更宽的河谷水道。两岸可以停留，道路在跨水处变成桥。',['河床由窄沟展开，深槽、浅滩和两岸高地有不同高度。','由浅到深的颜色、砾石岸和连续水面把河谷读成一条河。','木桥、岩滩和沿岸树木回应跨越、停留与通行需求。'],['先确定河床横断面，再安排桥与两岸内容。','用连续过渡连接水、湿岸和陆地覆盖。','先为跨越和视线留位置，再布置沿岸素材。']],
 ['苇泽湿地','湿地缓流','河流进入低平湿地，水面变宽，露地与浅水交错，芦苇和柳树围绕水岸分布。',['小幅高差形成浅水、草洲和弯曲水岸，主河仍保持连通。','水深变浅、流动变缓，湿泥与水面之间形成宽过渡带。','芦苇、柳树、木栈道与高脚观察点回应低平湿润环境。'],['把微地形作为内容分布的条件。','将湿泥、水体和立体水生植物分开，再检查组合。','使用栈道与抬高结构适应浅水，避免把陆地场景直接搬来。']],
 ['分汊河口','河口三角洲','水路在入海前分成多股，泥沙洲露出水面。主河、支汊与海水仍相互连通。',['分汊水道与泥沙洲共同形成河口，不能用一个蓝色圆面代替。','低水位、浅滩与沉积色带把河水过渡到海湾。','沿岸栈道和观察台让人能够接近水域边界。'],['用水道网络和沉积地形共同设计河口。','保留水路之间的露地，形成有用途的洲与滩。','把交通设施与潮湿、低平的环境条件联系起来。']],
 ['归水海湾','海湾入海','最后来到海湾。回望时，上游、主河、湿地与河口都属于同一条连续水系。',['河口接入更开阔的海湾，水面与海床延伸出近岸和远处空间。','河水接入统一海平面，岸线、波纹与浅滩保持连续。','码头、船只与远景为水域补上使用方式和距离感。'],['把水系放回完整世界，检查上下游与海岸的联系。','岸线决定水陆关系，水面材质只解决其中一部分。','以一条自然路线组织空间，再承载人物、交通与故事。']]
];
export const waterStops=lessons.map((a,index)=>{const t=index/5,riverT=index===1?.125:index===5?.90:t,p=bankPoint(riverT),target=index===5?riverSample(.91):riverSample(riverT);return {id:['source','stream','river','marsh','estuary','bay'][index],name:a[0],terrain:a[1],index,x:p.x,z:p.z,riverT,level:target.level,title:a[1],lead:a[2],shape:a[3][0],surface:a[3][1],elements:a[3][2],reuse:a[4],next:index===5?'水系主线完成，可以沿岸继续漫游，或查看河床与岸线。':'继续沿水向下，观察下一段水路怎样改变形状与用途。',targetX:target.x,targetZ:target.z,targetY:target.level+.05};});
export const waterPlatforms=waterStops.map(r=>{const h=hydroTerrain(r.x,r.z,naturalHeight(r.x,r.z));return {x:r.x,z:r.z,y:Math.max(h+.12,r.level+1.25)+(r.index===4?4:0),halfX:4,halfZ:3,index:r.index};});
export function waterObservation(index,stage){const r=waterStops[index];return r?{id:`water-${r.id}:${stage}`,index,stage,title:[r.terrain+' · 河床',r.terrain+' · 水面岸线',r.terrain+' · 生态使用'][stage],prompt:r.lead,explanation:[r.shape,r.surface,r.elements][stage],reuse:r.reuse[stage]}:null;}
export function waterNotebook(ids){const out=['# 山海之间 · 从源头到海湾','','六站水系主线的18处构建观察。浏览记录不代表掌握；水位与流向为场景规则，非水文模拟。',''];for(const r of waterStops){out.push(`## ${r.index+1} · ${r.name}`,'');for(let stage=0;stage<3;stage++){const p=waterObservation(r.index,stage);out.push(`### ${ids.has(p.id)?'✓ 已浏览':'○ 待观察'} · ${p.title}`,'',p.explanation,'',`参考方法：${p.reuse}`,'');}}return out.join('\n');}

// A real raised bank walk supports the downstream tour, including the tidal edge.
export const waterTrail=Array.from({length:221},(_,i)=>waterRouteSample((.68+(.90-.68)*i/220)/.90));
const trailBins=new Map();
for(let i=0;i<waterTrail.length-1;i++){const a=waterTrail[i],b=waterTrail[i+1];for(let x=Math.floor((Math.min(a.x,b.x)-2)/16);x<=Math.floor((Math.max(a.x,b.x)+2)/16);x++)for(let z=Math.floor((Math.min(a.z,b.z)-2)/16);z<=Math.floor((Math.max(a.z,b.z)+2)/16);z++){const k=x+','+z;if(!trailBins.has(k))trailBins.set(k,[]);trailBins.get(k).push({a,b});}}
export function nearestWaterTrail(x,z){let best=null,distance=1.55;for(const {a,b} of trailBins.get(Math.floor(x/16)+','+Math.floor(z/16))||[]){const dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),d=Math.hypot(x-a.x-u*dx,z-a.z-u*dz);if(d<distance){distance=d;best={x:a.x+u*dx,z:a.z+u*dz,y:mix(a.y,b.y,u),distance};}}return best;}

export const riverBridge=(()=>{const p=riverSample(.40);return {...p,y:p.level+3,length:(p.half+11)*2,width:3.6,rampLength:11};})();
export function riverBridgePoint(along,lateral=0){
 const b=riverBridge;
 return {x:b.x+b.nx*along+b.dx*lateral,z:b.z+b.nz*along+b.dz*lateral};
}

// Support the pre-existing bank route where the new tributary crosses it.
export function northBankPoint(t){return waterRouteSample(t/.9);}
export function northBankSupport(x,z,h){const f=northField(x,z);if(!f||f.reach!=='trunk'||f.distance>16||z< -405||z> -374)return h;let t=.62;for(let i=0;i<5;i++){const p=bankPoint(t),a=bankPoint(t-.0001),b=bankPoint(t+.0001),dx=(b.x-a.x)/.0002,dz=(b.z-a.z)/.0002;t=clamp(t+((x-p.x)*dx+(z-p.z)*dz)/(dx*dx+dz*dz),.60,.64);}const p=northBankPoint(t);return Math.hypot(x-p.x,z-p.z)<1.55?Math.max(h,p.y):h;}

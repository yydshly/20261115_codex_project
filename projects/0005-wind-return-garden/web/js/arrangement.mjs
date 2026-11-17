import {makeWalkable,findPath,riverX} from './navigation.mjs';
import {TREE_LAYOUT,BEDS} from './courtyard-config.mjs';
import {GARDEN_PROPS} from './free-assets.mjs';
export const MAILBOX={x:421,y:375};
export const ROUTES={welcome:'归家小径',flowers:'绕花慢行',brook:'沿溪散步'};
export const MATERIALS={earth:'暖土小径',stone:'旧石小径'};
export const layoutTrees=()=>TREE_LAYOUT.map(([kind,x,y,scale])=>({x,y,scale,rig:{kind}}));
export function createLayout(){return {bench:{x:366,y:500},pots:[{id:'clay',x:834,y:378},{id:'garden',x:390,y:352}],route:'welcome',material:'earth',moves:{bench:0,pots:0,path:0},previous:null};}
const snapshot=l=>({bench:{x:l.bench.x,y:l.bench.y},pots:l.pots.map(p=>({id:p.id,x:p.x,y:p.y})),route:l.route,material:l.material});
export const copyLayout=l=>JSON.parse(JSON.stringify(l));
export function layoutProps(l){return [...GARDEN_PROPS.filter(p=>!['pot','bread','apple'].includes(p.id)),...l.pots.map(p=>({...p,id:'pot',radius:12})),{id:'bench',x:l.bench.x,y:l.bench.y-9,rx:43,ry:17},{id:'table',x:l.bench.x+63,y:l.bench.y-9,rx:22,ry:11},{id:'mailbox',...MAILBOX,radius:11}];}
export function pathLines(l){
 const b=l.bench;
 const east={welcome:[[596,424],[650,438],[710,407],[770,350]],flowers:[[596,424],[620,449],[620,524],[720,527],[737,438],[770,350]],brook:[[596,424],[595,467],[609,540],[715,550],[750,424],[770,350]]}[l.route];
 return [[[370,578],[365,470],[425,441],[463,424]],[[365,470],[b.x,b.y+28]],[[365,470],[308,429],[240,414]],east];
}
export function distanceToPath(x,y,lines){let best=Infinity;for(const line of lines)for(let i=1;i<line.length;i++){const [ax,ay]=line[i-1],[bx,by]=line[i],t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)));best=Math.min(best,Math.hypot(x-ax-t*(bx-ax),y-ay-t*(by-ay)));}return best;}
export function makeGardenWalkable(trees,l){const walk=makeWalkable(trees,layoutProps(l)),lines=pathLines(l);walk.cost=(x,y)=>distanceToPath(x,y,lines)<18?.65:2.6;walk.minCost=.65;return walk;}
export const benchApproach=l=>({x:l.bench.x,y:l.bench.y+28});
export const catBenchSpots=l=>({nap:{x:l.bench.x+26,y:l.bench.y+26},sun:{x:l.bench.x-34,y:Math.min(560,l.bench.y+42)}});
function shapeValid(v){return v&&Number.isFinite(v.x)&&Number.isFinite(v.y);}
export function validateLayout(l,actors=[]){
 if(!l||!shapeValid(l.bench)||!Array.isArray(l.pots)||l.pots.length!==2||l.pots.some(p=>!shapeValid(p))||!Object.hasOwn(ROUTES,l.route)||!Object.hasOwn(MATERIALS,l.material))return {ok:false,text:'这份布置无法读取。'};
 if(l.bench.x<125||l.bench.x>395||l.bench.y<350||l.bench.y>520)return {ok:false,text:'长椅与茶桌请留在左岸的平地上。'};
 const moving=layoutProps(l).filter(p=>['pot','bench','table'].includes(p.id)),terrain=makeWalkable(layoutTrees(),layoutProps(createLayout()).filter(p=>!['pot','bench','table'].includes(p.id)));
 const fixed=[...layoutProps(createLayout()).filter(p=>!['pot','bench','table'].includes(p.id)).map(p=>({...p,rx:p.radius,ry:p.radius})),...layoutTrees().map(t=>({x:t.x,y:t.y,rx:(t.rig.kind==='pine'?9:13)*t.scale,ry:(t.rig.kind==='pine'?9:13)*t.scale}))];
 const protectedPoints=[...BEDS.map(b=>({x:b.x,y:b.y,rx:43,ry:29})),{x:770,y:356,rx:41,ry:27},{x:240,y:414,rx:22,ry:20},{x:610,y:448,rx:22,ry:19}];
 for(const p of moving){
  const rx=p.rx||p.radius,ry=p.ry||p.radius;
  if(fixed.some(q=>q.rx&&((q.x-p.x)/(q.rx+rx+4))**2+((q.y-p.y)/(q.ry+ry+4))**2<1))return {ok:false,text:'这里靠近树干或固定物件。请留一点空隙。'};
  for(let i=0;i<16;i++){const a=i*Math.PI/8,x=p.x+Math.cos(a)*(rx+2),y=p.y+Math.sin(a)*(ry+2);if(!terrain(x,y)||Math.abs(x-riverX(y))<40)return {ok:false,text:'这里靠近水、树干或固定物件。请留一点空隙。'};}
  if(protectedPoints.some(q=>Math.abs(q.x-p.x)<q.rx+rx+5&&Math.abs(q.y-p.y)<q.ry+ry+5))return {ok:false,text:'给花圃、风铃和小屋门口留一条路吧。'};
  if(actors.some(a=>shapeValid(a)&&((a.x-p.x)/(rx+12))**2+((a.y-p.y)/(ry+12))**2<1))return {ok:false,text:'这里有人或小猫在歇脚，换一个落点吧。'};
 }
 for(let i=0;i<moving.length;i++)for(let j=i+1;j<moving.length;j++){const a=moving[i],b=moving[j];if(a.id==='bench'&&b.id==='table')continue;if(((a.x-b.x)/((a.rx||a.radius)+(b.rx||b.radius)+8))**2+((a.y-b.y)/((a.ry||a.radius)+(b.ry||b.radius)+8))**2<1)return {ok:false,text:'物件之间再留一点空隙。'};}
 const walk=makeGardenWalkable(layoutTrees(),l),targets=[{x:216,y:414},{x:586,y:472},{x:758,y:387},...BEDS.map(b=>({x:b.x,y:b.y+32})),{x:770,y:362},{x:MAILBOX.x,y:MAILBOX.y+28},benchApproach(l)];
 if(targets.some(t=>!walk(t.x,t.y)||!findPath({x:370,y:550},t,walk).length))return {ok:false,text:'这会挡住常走的路。换一处，让大家还能走到花旁。'};
 return {ok:true,text:'这里放得下，也留得下散步的路。'};
}
export function applyLayout(g,draft,actors=[]){const check=validateLayout(draft,actors);if(!check.ok)return check;const old=g.layout;
 const moved={bench:JSON.stringify(old.bench)!==JSON.stringify(draft.bench),pots:JSON.stringify(old.pots)!==JSON.stringify(draft.pots),path:old.route!==draft.route||old.material!==draft.material};
 if(!Object.values(moved).some(Boolean))return {ok:false,text:'还没有改变。可以先选物件，再点一个落点。'};
 g.layout={...snapshot(draft),moves:Object.fromEntries(Object.keys(moved).map(k=>[k,old.moves[k]+Number(moved[k])])),previous:snapshot(old)};return {ok:true,text:'放好了。小庭会记住你留出的空间。'};
}
export function undoLayout(g,actors=[]){if(!g.layout.previous)return {ok:false,text:'还没有需要撤回的布置。'};const check=validateLayout(g.layout.previous,actors);if(!check.ok)return check;g.layout={...snapshot(g.layout.previous),moves:{...g.layout.moves},previous:null};return {ok:true,text:'回到上一次布置。已经发生的故事还会留下。'};}
export function readLayout(raw){const fresh=createLayout();if(!validateLayout(raw).ok)return fresh;Object.assign(fresh,snapshot(raw));fresh.pots.forEach((p,i)=>p.id=['clay','garden'][i]);for(const k of Object.keys(fresh.moves))fresh.moves[k]=Number.isInteger(raw.moves?.[k])?Math.max(0,Math.min(100000,raw.moves[k])):0;if(validateLayout(raw.previous).ok)fresh.previous=snapshot(raw.previous);return fresh;}

import {GOODS_PATHS,GOODS_NODES,samplePolyline} from './production-layout.js';
export const RECIPES={grain:{name:'谷物生活线',source:'farm',raw:'谷物',product:'口粮',batch:8,send:4,yield:4,color:'#d1b45d',stop:1},fish:{name:'渔获生活线',source:'fish',raw:'渔获',product:'鱼干',batch:8,send:4,yield:4,color:'#88a7a9',stop:2},wood:{name:'木材用具线',source:'resource',raw:'木材',product:'木用具',batch:6,send:4,yield:2,color:'#986e49',stop:0}};
export const FLOW_STEPS=[{name:'田边 / 岸边 / 林地备货',duration:4},{name:'原料送仓',duration:10,path:'source'},{name:'入库与分区储备',duration:4},{name:'出库送集市',duration:8,path:'market'},{name:'集市分配',duration:4},{name:'运往作坊',duration:8,path:'craft'},{name:'加工与成品整理',duration:5},{name:'成品送到住宅',duration:8,path:'home'},{name:'到家与家庭使用',duration:4}];
// One explicit demonstration batch. Stocks are recomputed only by phase-entry transactions, never by frame count.
export class ProductionFlow{
 constructor(){this.reset('grain');}
 reset(kind=this.kind){if(!RECIPES[kind])throw new Error('Unknown production recipe');this.kind=kind;this.origin='local';this.phase=0;this.time=0;this.playing=false;this.done=false;this.started=false;this.log=[];this.stock={source:0,cargo:0,store:0,market:0,rawCraft:0,usedRaw:0,crafted:0,home:0,consumed:0,produced:0};this.cargoProduct=false;}
 receiveDelivery(kind,units){if(!RECIPES[kind]||units!==RECIPES[kind].batch)throw new Error('Delivery must match the demonstration batch');this.reset(kind);this.started=true;this.origin='water-land';this.stock.produced=units;this.stock.cargo=units;this.enter(2);}
 start(){if(!this.started||this.done){const kind=this.kind;this.reset(kind);this.started=true;this.enter(0);}this.playing=true;}
 pause(){this.playing=false;}
 enter(phase){this.phase=phase;this.time=0;const s=this.stock,r=RECIPES[this.kind];
  if(phase===0){s.source=r.batch;s.produced=r.batch;}
  if(phase===1){s.cargo=s.source;s.source=0;this.cargoProduct=false;}
  if(phase===2){s.store+=s.cargo;s.cargo=0;}
  if(phase===3){s.store-=r.send;s.cargo=r.send;}
  if(phase===4){s.market+=s.cargo;s.cargo=0;}
  if(phase===5){s.cargo=s.market;s.market=0;}
  if(phase===6){s.rawCraft+=s.cargo;s.cargo=0;}
  if(phase===7){s.usedRaw+=s.rawCraft;s.rawCraft=0;s.crafted=r.yield;s.cargo=s.crafted;s.crafted=0;this.cargoProduct=true;}
  if(phase===8){s.home+=s.cargo;s.cargo=0;}
  this.log.push({phase,name:FLOW_STEPS[phase].name,stock:{...s}});
 }
 advance(dt){if(!this.playing||!Number.isFinite(dt)||dt<=0)return;let left=dt;while(left>1e-9&&!this.done){const step=FLOW_STEPS[this.phase],take=Math.min(left,step.duration-this.time);this.time+=take;left-=take;if(this.time>=step.duration-1e-9){if(this.phase===8){this.stock.consumed+=this.stock.home;this.stock.home=0;this.playing=false;this.done=true;this.log.push({phase:9,name:'家庭使用完成',stock:{...this.stock}});}else this.enter(this.phase+1);}}}
 frame(){const r=RECIPES[this.kind],step=FLOW_STEPS[this.phase],u=this.time/step.duration;let path=step.path==='source'?GOODS_PATHS[r.source]:GOODS_PATHS[step.path],node=this.phase===0?GOODS_NODES[r.source]:this.phase===2?GOODS_NODES.store:this.phase===4?GOODS_NODES.market:this.phase===6?GOODS_NODES.craft:GOODS_NODES.home;const point=path?samplePolyline(path,u):{...node,dx:0,dz:1},behind=path?samplePolyline(path,Math.max(0,u-.065)):{x:point.x,z:point.z+([2,6].includes(this.phase)?4:-4),dx:point.dx,dz:point.dz};return {point,behind,moving:!!path,phase:this.phase,progress:(FLOW_STEPS.slice(0,this.phase).reduce((s,p)=>s+p.duration,0)+this.time)/55,title:this.done?'这一批已送达并使用':step.name,stop:this.phase<2?r.stop:this.phase<4?3:this.phase<6?4:this.phase<8?5:6,recipe:r,cargoProduct:this.cargoProduct};}
}

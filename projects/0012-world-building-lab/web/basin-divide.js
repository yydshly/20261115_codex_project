import {formationCell} from './world-formation.js';
import {buildWaterExchange} from './water-exchange.js';
import {riverSample} from './water-system.js';
import {terrainHeight} from './large-world.js';
import {SALT_MARSH} from './salt-layout.js';
import {tropicalChannel} from './tropical-layout.js';

export const divideColors={divide:'#dec4f8',surface:'#86d8ff',shallow:'#8ce6b2',local:'#c4cfc1'};

const cases={
  central:{
    edge:[-1040,-920],outside:[-1080,-920],sample:[-960,-880],
    crest:'北支冲积扇分水坡',recharge:'扇面砂砾和泥岩夹层',
    rock:'坡面由砂岩与泥岩向扇面砂砾过渡。砂砾孔隙让更多雨水进入浅层，夹层中的泥岩可阻滞向下渗透。',
    release:'扇尾泉口',releaseNote:'现有场景中，浅层水在扇尾切到沟谷处出露，短泉溪汇入东支。读数为扇面样格的缓释量，泉口单独流量待校定。',
    outletNote:'北支和其他上游来水汇入中央河，经过苇泽湿地，再沿有落差的河道进入中央海湾。'
  },
  south:{
    edge:[-1360,560],outside:[-1400,560],sample:[-1360,600],
    crest:'西南高原塘溪分水坡',recharge:'结晶岩风化坡',
    rock:'结晶岩完整部分孔隙少，水主要从薄土、风化带和连通裂隙向下渗。坡陡时，更多雨水先沿地面进入塘溪。',
    release:'雨林谷脚 · 缓释示意',bank:{x:-1400,z:1160},
    releaseNote:'坡脚低于邻近岩坡，浅层储水可缓慢交给谷地。观察点显示脚下样格与河段的响应，具体裂隙路径和独立泉口待校定。',
    outletNote:'塘溪沿高原出口切入雨林谷地，继续经红树林河口独立入海。谷地有连续向海的低程水路。'
  },
  closed:{
    edge:[-1520,320],outside:[-1480,320],sample:[-1560,320],
    crest:'西部盐盆东侧分水坡',recharge:'砂岩泥岩坡与盐湿粉泥',
    rock:'雨水可从砂岩孔隙入渗，泥岩夹层可阻滞下渗。盆底含盐粉泥细孔多、排水慢，容易维持湿岸。',
    release:'盐沼湿岸 · 缓释示意',bank:{x:-1600,z:360},
    releaseNote:'盆缘浅层水可向脚下洼地缓释，潮湿岸缘随盆内存水变化。独立泉口和跨盆地下通道待校定。',
    outletNote:'这条坡水进入盐沼；同一封闭盆地的其他坡面可汇入盐湖或盐壳洼地。场景中没有连海地表出口，来水只能在盆内流转、存留或蒸发。'
  }
};

const channel=(first,last,sample,n=60)=>Array.from({length:n+1},(_,i)=>sample(first+(last-first)*i/n));
const surfaceHeight=p=>Math.max(terrainHeight(p.x,p.z),p.level??-Infinity);
const at=([x,z])=>({x,z});
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
const closest=(path,p)=>path.reduce((best,q,i)=>
  Math.hypot(q.x-p.x,q.z-p.z)<Math.hypot(path[best].x-p.x,path[best].z-p.z)?i:best,0);

export const divideAuditPaths=Object.values(cases).map(site=>[site.outside,site.edge,site.sample]);

export function buildBasinDivides(model){
  const {study}=model,{world,grid}=study;
  const exchange=buildWaterExchange(world,terrainHeight);
  return model.basins.map(basin=>{
    const site=cases[basin.id],edge=at(site.edge),outside=at(site.outside);
    const k=formationCell(grid,edge.x,edge.z),other=formationCell(grid,outside.x,outside.z);
    const byCell=new Map(basin.eventCells.map((p,i)=>[p.k,i]));
    const sample=at(site.sample),slope=[];
    for(let i=byCell.get(k);i>=0;i=basin.eventCells[i].next)slope.push(basin.eventCells[i]);
    const divide=mix(edge,outside,.5),side={x:(edge.z-outside.z)/2,z:(outside.x-edge.x)/2};
    const boundary=[-1,1].map(sign=>({x:divide.x+side.x*sign,z:divide.z+side.z*sign}));
    const local=[];
    for(let i=other;i>=0&&local.length<5&&study.groups[i]==='unresolved';i=world.graph.next[i])
      local.push(study.positions[i]);
    const hills=[outside,...slope],section=[];
    for(let i=1;i<hills.length;i++){
      const a=hills[i-1],b=hills[i],points=channel(0,1,t=>mix(a,b,t),8);
      for(const p of i===1?points:points.slice(1)){
        const {bedrock:rock,material:cover}=world.hydraulics[formationCell(grid,p.x,p.z)];
        section.push({...p,y:terrainHeight(p.x,p.z),rock,cover});
      }
    }
    const isCentral=basin.id==='central',isClosed=basin.id==='closed';
    const out=isClosed?SALT_MARSH:basin.outlet;
    const release=isCentral?exchange.spring:site.bank;
    const springCreek=isCentral?exchange.creek:[];
    const receiver=isCentral?[...exchange.runway,...exchange.routes.high]:
      isClosed?[out]:basin.rivers.flat();
    // Land-grid paths stop when they hand off to a named channel or water body.
    const first=closest(receiver,slope.at(-1));
    const handoff=[slope.at(-1),receiver[first]];
    const waterway=receiver.slice(first);
    if(isCentral)waterway.push(...channel(.724,basin.outlet.t,riverSample));
    if(basin.id==='south'){
      while(waterway.at(-1).t>basin.outlet.t)waterway.pop();
      waterway.push(out);
    }
    const stops=[
      {...divide,name:site.crest,distance:390,read:edge,detail:
        '紫线标出这段地表集水边界。蓝线汇向本流域，灰线示意界线另一侧的局地汇流。'},
      {...sample,name:site.recharge,distance:245,read:sample,detail:site.rock},
      {...release,name:site.release,distance:isCentral?175:260,read:isCentral?sample:release,detail:site.releaseNote},
      {...out,name:isClosed?'盐沼 · 盆内终点':basin.outlet.name,distance:isClosed?360:480,
        node:isClosed?'saltMarsh':isCentral?'centralMouth':'south',detail:site.outletNote}
    ];
    for(const stop of stops)stop.y=surfaceHeight(stop);
    return {basin,boundary,local,slope,section,handoff,waterway,
      springCreek,byCell,stops};
  });
}

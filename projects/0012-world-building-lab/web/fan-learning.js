import {FAN_SITES,FAN_STAGES} from './fan-layout.js';import {walkingSurface,LARGE_WORLD} from './large-world.js';import {strataView} from './strata-learning.js';export {FAN_STAGES};
const lessons=[
 ['山口较窄，扇面向下游展开，同时降低高程，不能只在平地上画一块扇形颜色。','较粗砾石集中在扇顶附近，下游逐渐转为细砾和浅色砂地；粒径是创作分布。','原扇面从40m向18m下降，分开再汇合；现有72米上游入口与扇尾出流，经东支谷汇入8米低谷，再到原中央主河。','山口与导览干岸留出观看空间，近景块石避开行走线路。'],
 ['同一扇面里切出三条有实际床底的通道，分汊之间保留露地。','砂砾洲、湿岸与通道颜色不同，但材质不代替真实河床。','常水和涨水参考相差1.1m，水面按同一地形裁切；分汊水位共用纵向高程，避免交点抬水。','岸上低草与灌丛避开主槽，观察点位于干岸，水道不会被树木填满。'],
 ['水道之间的沙砾洲是真实略高地面，中心高于常水位约0.55m。','砾石、砂地和洲缘坡面组成表面细节，颗粒大小沿上下游变化。','切换涨水参考后，低洲中心会被淹过、较高边缘部分保留；地形和砾石不重新生成。','较稳定的洲缘有稀疏低植被，活跃通道和低洲中心保持裸露。'],
 ['扇尾低地只有小幅起伏，干岸与浅洼在同一张地形里连续过渡。','细砂、湿泥、浅草和枯枝形态帮助辨认湿润地表。','常水时主要槽道有水，涨水参考会覆盖更多低地；两档手动状态不等于降雨、洪水演算或沉积过程。','洪泛地低草可在高水位下部分浸水，植被保持原位；以后可接季节生长、冲刷和地貌演变。']
];
export const fanStops=FAN_SITES.map((r,i)=>({...r,lead:['从岩层阶地以教学镜头转场来到山口，看窄谷如何接向展开的扇面。','沿干岸看水道分开又汇合，比较河床与中间露地。','来到沙砾洲侧面，对照真实洲面、砂砾覆盖与两档水位。','继续到低平扇尾，同景比较常水与涨水参考下的洪泛范围。'][i],next:i===3?'冲积四站完成，可原位切换两档水位，查看整个扇面与分汊水道。':'沿同一地面通路继续，比较沉积地形、水道与植被。'}));
export const fanPoint=(x,z)=>({x,z,y:walkingSurface(x,z),fan:true,underground:false,survey:false});export function fanView(i){const r=fanStops[i];return {...r,...fanPoint(r.x,r.z),y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye};}
export function fanPath(t){const f=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(f)),u=f-i,a=fanStops[i],b=fanStops[i+1];return {...fanPoint(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u),t};}
export function fanApproach(t){const a=strataView(3),b=fanView(0),u=Math.max(0,Math.min(1,t)),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;return {x,z,y:Math.max((a.y-1.72)*(1-u)+(b.y-1.72)*u+Math.sin(Math.PI*u)*350,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),fan:true,survey:true,transfer:true,underground:false};}
export function fanObservation(i,s){const r=fanStops[i];return {id:`build-${r.id}:${s}`,index:i,stage:s,title:r.terrain+' · '+FAN_STAGES[s],prompt:r.lead,explanation:lessons[i][s],reuse:['先建立扇面展开、纵向坡降与分汊床底。','颗粒与覆盖服从位置和尺度，保留真实沙砾洲。','共用水位和床底，比较淹没范围并明确手动参考边界。','用干岸、低洲和洪泛地差异组织群落，而非均匀铺树。'][s]};}

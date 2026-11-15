import {makeScene2D,Rect,Txt,Line,Circle} from '@motion-canvas/2d';
import {createSignal,linear,all} from '@motion-canvas/core';
export const REVISION=2;
export const DURATION=24;
const C={bg:'#f3f2eb',ink:'#203a35',muted:'#7a8880',panel:'#e9ede3',q:'#335e4b',a:'#d48b62',b:'#8390ba',grid:'#d7dfd0'};
const smooth=(v:number)=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
const xy=(x:number,y:number):[number,number]=>[x-640,y-360];
const point=(a:number,l=250):[number,number]=>xy(260+l*Math.cos(a*Math.PI/180),520-l*Math.sin(a*Math.PI/180));
export default makeScene2D(function*(view){
 const time=createSignal(0),angle=createSignal(0),finish=19;
 const question=()=>time()<13?'怎么让接口响应更快？':'退休年龄政策有什么变化？';
 const entry=()=>smooth(time()/1.1),show=()=>smooth((time()-3.5)/1.2),out=()=>smooth((time()-finish)/.8),swap=()=>smooth((angle()-44)/12);
 const label=(text:any,x:number,y:number,size=20,fill=C.ink,extra:any={})=><Txt text={text} position={xy(x,y)} offset={[-1,-1]} fontFamily="Microsoft YaHei" fontSize={size} fill={fill} {...extra}/>;
 const panel=(x:number,y:number,w:number,h:number,fill:string,r=16)=><Rect position={xy(x+w/2,y+h/2)} width={w} height={h} radius={r} fill={fill}/>;
 view.fill(C.bg);
 view.add(<>{label('MOTION ATLAS / EXPLAINER STUDY',76,39,11,C.muted)}{label('相似，来自方向。',73,65,48,C.ink,{fontWeight:600})}{label('语义检索 · 二维方向示意',983,88,13,C.muted)}{panel(76,164,760,423,C.panel,25)}{label('当前问题 / QUERY',108,194,11,C.muted)}{label(question,108,220,25,C.ink,{fontWeight:600,opacity:entry})}</>);
 const graphOpacity=()=>show()*(1-out()*.86);
 for(let i=0;i<14;i++)view.add(<Line points={[xy(208+i*40,280),xy(208+i*40,550)]} stroke={C.grid} lineWidth={1} opacity={graphOpacity}/>);
 for(let i=0;i<7;i++)view.add(<Line points={[xy(208,290+i*40),xy(740,290+i*40)]} stroke={C.grid} lineWidth={1} opacity={graphOpacity}/>);
 view.add(<><Line points={[xy(224,520),xy(760,520)]} stroke="#aab9a4" lineWidth={1} opacity={graphOpacity}/><Line points={[xy(260,280),xy(260,553)]} stroke="#aab9a4" lineWidth={1} opacity={graphOpacity}/></>);
 for(const [a,c] of [[20,C.a],[80,C.b]] as [number,string][])view.add(<Line points={[xy(260,520),point(a)]} stroke={c} lineWidth={6} endArrow arrowSize={17} opacity={graphOpacity}/>);
 view.add(<><Line points={()=>[xy(260,520),point(angle())]} stroke={C.q} lineWidth={6} endArrow arrowSize={17} opacity={graphOpacity}/><Line points={()=>Array.from({length:35},(_,i)=>{const a=(angle()+(20-angle())*i/34)*Math.PI/180;return xy(260+62*Math.cos(a),520-62*Math.sin(a))})} stroke={C.a} lineWidth={2} opacity={graphOpacity}/><Circle position={xy(260,520)} size={10} fill={C.ink} opacity={graphOpacity}/>{label('资料 A',507,409,16,C.a,{opacity:graphOpacity})}{label('资料 B',309,254,16,C.b,{opacity:graphOpacity})}<Txt text="问题向量" position={()=>{const p=point(angle());return [p[0]+12,p[1]+24]}} offset={[-1,-1]} fontFamily="Microsoft YaHei" fontSize={15} fill={C.q} opacity={graphOpacity}/>{label('夹角越小，方向越接近',540,314,13,C.muted,{opacity:graphOpacity})}</>);
 view.add(<>{label('一句话，',125,330,47,C.ink,{fontWeight:600,opacity:()=>1-show()})}{label('怎样找到对的资料？',125,396,47,C.ink,{fontWeight:600,opacity:()=>1-show()})}{label('从文字到方向，再从方向到排序。',125,481,15,C.muted,{opacity:()=>1-show()})}</>);
 for(let i=0;i<2;i++){
  const color=i?C.b:C.a,score=()=>Math.cos(([20,80][i]-angle())*Math.PI/180);
  view.add(<Rect x={1039-640} y={()=>187+(i?1-swap():swap())*166+71.5-360} width={330} height={143} radius={18} fill="#ffffff" stroke="#d9dfd2" lineWidth={1} opacity={entry}>
   <Txt text={i?'资料 B / 公共政策':'资料 A / 技术文档'} position={[-143,-53.5]} offset={[-1,-1]} fontFamily="Microsoft YaHei" fontSize={12} fill={C.muted}/>
   <Txt text={i?'退休年龄新规':'缓存与索引优化'} position={[-143,-28.5]} offset={[-1,-1]} fontFamily="Microsoft YaHei" fontSize={23} fontWeight={600} fill={C.ink}/>
   <Txt text={()=>score().toFixed(2)} position={[-143,6.5]} offset={[-1,-1]} fontFamily="Microsoft YaHei" fontSize={34} fontWeight={600} fill={color}/>
   <Txt text="方向接近度" position={[-39,19.5]} offset={[-1,-1]} fontFamily="Microsoft YaHei" fontSize={12} fill={C.muted}/>
   <Line points={()=>[[-143,56.5],[-143+286*score(),56.5]]} stroke={color} lineWidth={3}/>
  </Rect>);
 }
 view.add(<>{label('分数 = cos（示意夹角）',883,533,11,C.muted)}{label('示意数据，不是模型实测结果',883,553,11,C.muted)}{label('TAKEAWAY / 带走一个理解',130,326,13,C.muted,{opacity:out})}{label('问题变了，排序也会改变。',130,367,39,C.ink,{fontWeight:600,opacity:out})}{label('cos θ → 方向接近度 → 相关资料',130,436,18,C.q,{opacity:out})}{panel(76,609,1128,60,C.ink,13)}{label('解说',101,631,13,'#bcd28e')}</>);
 const caption=()=>time()<4?'把一句话变成向量，才能比较它与资料的接近程度。':time()<8?'这里用二维方向作示意；真实模型使用更高维的向量。':time()<13?'问题与资料 A 的夹角更小，所以它排在前面。':time()<finish?'问题改变后，方向转动；两份资料的接近度随之变化。':'核心区别：比较语义方向，而不是简单数关键词。';
 view.add(<>{label(caption,153,629,20,'#edf2df')}<Line points={[xy(76,686),xy(1204,686)]} stroke="#dce2d4" lineWidth={3}/><Line points={()=>[xy(76,686),xy(76+1128*time()/DURATION,686)]} stroke={C.q} lineWidth={3}/></>);
 yield*time(13,13,linear);
 yield*all(time(19,6,linear),angle(70,6,smooth));
 yield*time(24,5,linear);
});

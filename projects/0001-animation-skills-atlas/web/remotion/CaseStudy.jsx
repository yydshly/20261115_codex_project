import React from 'react';
import {AbsoluteFill,useCurrentFrame,useVideoConfig,interpolate} from 'remotion';
import brief from '../../comparison/brief.json';
export const REVISION=2;
export const DURATION=24;
const C={bg:'#f3f2eb',ink:'#203a35',muted:'#7a8880',panel:'#e9ede3',query:'#335e4b',a:'#d48b62',b:'#8390ba',line:'#d7dfd0'};
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n)};
const point=(angle,length=250)=>[260+length*Math.cos(angle*Math.PI/180),520-length*Math.sin(angle*Math.PI/180)];
function Arrow({angle,color,opacity=1}){const [x,y]=point(angle);return <g opacity={opacity}><line x1="260" y1="520" x2={x} y2={y} stroke={color} strokeWidth="6" strokeLinecap="round"/><path d="M0 0 -17 -7 -17 7Z" fill={color} transform={`translate(${x} ${y}) rotate(${-angle})`}/></g>}
function Card({name,index,score,y,alpha,label}){const color=index===0?C.a:C.b;return <div style={{position:'absolute',left:874,top:y,width:330,height:143,background:'#fff',border:'1px solid #d9dfd2',borderRadius:18,padding:'18px 22px',opacity:alpha,boxShadow:'0 8px 20px #203a3505'}}><div style={{fontSize:12,color:C.muted,display:'flex',justifyContent:'space-between'}}><span>资料 {index?'B':'A'} / {index?'公共政策':'技术文档'}</span><span style={{color}}>●</span></div><div style={{fontSize:23,fontWeight:600,marginTop:8}}>{name}</div><div style={{display:'flex',alignItems:'baseline',gap:10,marginTop:6}}><span style={{fontSize:34,fontWeight:600,color}}>{score.toFixed(2)}</span><span style={{fontSize:12,color:C.muted}}>{label}</span></div><div style={{position:'absolute',bottom:14,left:22,right:22,height:3,background:'#eef0e9'}}><div style={{width:`${score*100}%`,height:3,background:color}}/></div></div>}
export const CaseStudy=()=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),t=frame/fps;
 const angle=70*ease((t-13)/6);
 const finish=19;
 const question=t<13?brief.query:brief.revisedQuery;
 const swap=ease((angle-44)/12),scores=brief.angles.map(a=>Math.cos((a-angle)*Math.PI/180));
 const show=ease((t-3.5)/1.2),final=ease((t-finish)/.8),entry=ease(t/1.1);
 const caption=t<4?'把一句话变成向量，才能比较它与资料的接近程度。':t<8?'这里用二维方向作示意；真实模型使用更高维的向量。':t<13?'问题与资料 A 的夹角更小，所以它排在前面。':t<finish?'问题改变后，方向转动；两份资料的接近度随之变化。':'核心区别：比较语义方向，而不是简单数关键词。';
 return <AbsoluteFill style={{background:C.bg,color:C.ink,fontFamily:'Microsoft YaHei, sans-serif'}}>
  <div style={{position:'absolute',left:76,top:39,fontSize:11,letterSpacing:3,color:C.muted}}>MOTION ATLAS / EXPLAINER STUDY</div>
  <h1 style={{position:'absolute',left:73,top:57,fontSize:48,fontWeight:600,letterSpacing:-2,margin:0}}>{brief.title}</h1>
  <div style={{position:'absolute',right:76,top:88,fontSize:13,color:C.muted}}>{brief.subtitle}</div>
  <div style={{position:'absolute',left:76,top:164,width:760,height:423,borderRadius:25,background:C.panel}}/>
  <div style={{position:'absolute',left:108,top:194,fontSize:11,color:C.muted,letterSpacing:2}}>当前问题 / QUERY</div>
  <div style={{position:'absolute',left:108,top:220,fontSize:25,fontWeight:600,opacity:entry}}>{question}</div>
  <svg width="1280" height="720" style={{position:'absolute',inset:0,opacity:show*(1-final*.86)}}>
   {Array.from({length:14},(_,i)=><line key={'x'+i} x1={208+i*40} y1="280" x2={208+i*40} y2="550" stroke={C.line} strokeWidth="1"/>)}
   {Array.from({length:7},(_,i)=><line key={'y'+i} x1="208" y1={290+i*40} x2="740" y2={290+i*40} stroke={C.line} strokeWidth="1"/>)}
   <line x1="224" y1="520" x2="760" y2="520" stroke="#aab9a4"/><line x1="260" y1="280" x2="260" y2="553" stroke="#aab9a4"/>
   <Arrow angle={20} color={C.a}/><Arrow angle={80} color={C.b}/><Arrow angle={angle} color={C.query}/>
   <polyline points={Array.from({length:35},(_,i)=>{const a=(angle+(20-angle)*i/34)*Math.PI/180;return `${260+62*Math.cos(a)},${520-62*Math.sin(a)}`}).join(' ')} fill="none" stroke={C.a} strokeWidth="2"/>
   <circle cx="260" cy="520" r="5" fill={C.ink}/>
   <text x="507" y="423" fill={C.a} fontSize="16">资料 A</text><text x="309" y="268" fill={C.b} fontSize="16">资料 B</text>
   <text x={point(angle)[0]+12} y={point(angle)[1]+24} fill={C.query} fontSize="15">问题向量</text>
   <text x="540" y="327" fill={C.muted} fontSize="13">夹角越小，方向越接近</text>
  </svg>
  <div style={{position:'absolute',left:125,top:330,opacity:1-show,translate:`0px ${(1-entry)*20}px`}}><div style={{fontSize:47,fontWeight:600,lineHeight:1.4}}>一句话，<br/>怎样找到对的资料？</div><div style={{fontSize:15,color:C.muted,marginTop:19}}>从文字到方向，再从方向到排序。</div></div>
  <Card name={brief.documents[0]} index={0} score={scores[0]} y={187+swap*166} alpha={entry} label="方向接近度"/>
  <Card name={brief.documents[1]} index={1} score={scores[1]} y={353-swap*166} alpha={entry} label="方向接近度"/>
  <div style={{position:'absolute',left:883,top:533,fontSize:11,color:C.muted,lineHeight:1.8}}>分数 = cos（示意夹角）<br/>示意数据，不是模型实测结果</div>
  <div style={{position:'absolute',left:130,top:326,width:650,opacity:final}}><div style={{fontSize:13,color:C.muted,letterSpacing:2}}>TAKEAWAY / 带走一个理解</div><div style={{fontSize:39,fontWeight:600,lineHeight:1.5,marginTop:19}}>{REVISION===1?'方向越接近，得分越高。':'问题变了，排序也会改变。'}</div><div style={{fontSize:18,color:C.query,marginTop:15}}>cos θ → 方向接近度 → 相关资料</div></div>
  <div style={{position:'absolute',left:76,top:609,width:1128,height:60,borderRadius:13,background:C.ink,color:'#edf2df',display:'flex',alignItems:'center',padding:'0 25px',fontSize:20}}><span style={{color:'#bcd28e',marginRight:22,fontSize:13}}>解说</span>{caption}</div>
  <div style={{position:'absolute',left:76,top:686,width:1128,height:3,background:'#dce2d4'}}><div style={{height:3,width:`${t/DURATION*100}%`,background:C.query}}/></div>
 </AbsoluteFill>;
};

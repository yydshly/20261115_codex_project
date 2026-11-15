import React from 'react';
import {AbsoluteFill, Composition, Img, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import {spring} from 'motion';

// Motion computes the actual spring trajectory. Remotion only samples it by
// frame for a reproducible video preview of the gallery; no CSS timer is used.
const covers=['escape','papertales','quietcoast','push'];
function EffectGallery(){
 const frame=useCurrentFrame();
 const section=Math.floor(frame/60)%4;
 const progress=spring({keyframes:[0,1],stiffness:130,damping:23,mass:1}).next((frame%60)/30*1000).value;
 const position=section+progress;
 return <AbsoluteFill style={{background:'#11101a',overflow:'hidden',fontFamily:'Segoe UI,sans-serif',color:'#f8eadd'}}>
  <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 60%,#66416f66,transparent 66%)'}}/>
  <div style={{position:'absolute',left:50,top:36,fontSize:15,letterSpacing:5,color:'#ba9fb2'}}>MOTION / EDITORIAL GALLERY</div>
  <div style={{position:'absolute',right:50,top:36,fontSize:13,color:'#baa6b5'}}>SPRING · DEPTH · LAYOUT</div>
  {covers.map((name,i)=>{
   let distance=((i-position+6)%4)-2;
   const z=1-Math.min(1,Math.abs(distance)/2);
   return <div key={name} style={{position:'absolute',left:540+distance*290-170,top:120+(1-z)*45,width:340,height:360,zIndex:Math.round(z*100),transform:`perspective(1000px) rotateY(${-distance*25}deg) rotateZ(${distance*4}deg) scale(${.68+z*.32})`,filter:`blur(${Math.abs(distance)*.5}px) brightness(${.4+z*.6})`,boxShadow:'0 30px 65px #000b',borderRadius:12,overflow:'hidden',border:'1px solid #ffffff33'}}>
    <Img src={staticFile(`summary/effects/motion-${name}.jpg`)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
    <div style={{position:'absolute',inset:0,background:'linear-gradient(transparent 55%,#16101bcc)'}}/>
    <div style={{position:'absolute',left:22,bottom:20,fontSize:20,letterSpacing:2}}>{name.toUpperCase()}</div>
   </div>
  })}
  <div style={{position:'absolute',left:50,bottom:46}}><div style={{fontSize:40,letterSpacing:-1}}>Images find their rhythm.</div><div style={{fontSize:15,color:'#bba9ba',marginTop:12}}>Motion spring trajectory / original gallery composition / official repository photo assets</div></div>
  <div style={{position:'absolute',right:55,bottom:60,display:'flex',gap:9}}>{covers.map((_,i)=><span key={i} style={{display:'block',width:i===section?32:8,height:8,borderRadius:10,background:i===section?'#e2b3ff':'#705775'}}/>)}</div>
 </AbsoluteFill>;
}
registerRoot(()=> <Composition id="MotionGallery" component={EffectGallery} width={1080} height={660} fps={30} durationInFrames={240}/>);

import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
const Orb = () => {
  const frame=useCurrentFrame(); const {fps}=useVideoConfig();
  return <div style={{position:'absolute',width:140,height:140,borderRadius:30,background:'#cde98a',left:410,top:80,rotate:interpolate(frame,[0,3*fps],['-25deg','155deg']),scale:interpolate(frame,[0,.6*fps],[0,1],{extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)})}}/>;
};
const Title = () => {
  const frame=useCurrentFrame(); const {fps}=useVideoConfig();
  return <div style={{position:'absolute',left:55,top:140,opacity:interpolate(frame,[.25*fps,.85*fps],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),translate:interpolate(frame,[0,.9*fps],['0px 40px','0px 0px'],{extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)})}}><div style={{fontSize:12,color:'#8da780',letterSpacing:3}}>REMOTION / FRAME BY FRAME</div><h1 style={{fontSize:48,fontWeight:650,margin:'15px 0',letterSpacing:-2}}>让想法开始运动。</h1><div style={{fontSize:15,color:'#9caf91'}}>一个可编辑、可重播的动画小样</div></div>;
};
export const Sample=()=> <AbsoluteFill style={{background:'#162a23',color:'#e5efda',fontFamily:'Microsoft YaHei,Arial,sans-serif',overflow:'hidden'}}><div style={{position:'absolute',left:350,top:135,width:200,height:200,border:'30px solid #ea9f77',borderRadius:'50%'}}/><Orb/><Title/><div style={{position:'absolute',bottom:30,left:55,fontSize:11,color:'#7f9c75'}}>MOTION ATLAS · 3 SEC · 30 FPS</div></AbsoluteFill>;

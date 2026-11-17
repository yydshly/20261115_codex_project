export function drawSkyMood(c,env,cameraX,width,time){
  c.save();
  if(env.warmth){const glow=c.createLinearGradient(cameraX,0,cameraX+width,400);glow.addColorStop(0,`rgba(222,172,112,${env.warmth*.42})`);glow.addColorStop(1,'rgba(210,165,128,0)');c.fillStyle=glow;c.fillRect(cameraX,0,width,600);}
  c.fillStyle=`rgba(24,40,58,${env.night*.59+env.cloud*.15})`;c.fillRect(cameraX,0,width,600);
  if(env.night>.6){
    c.fillStyle=`rgba(238,231,196,${env.night*.55})`;
    for(let i=0;i<13;i++){const x=80+(i*71)%840,y=30+(i*17)%100;c.fillRect(x,y,1,1);}
    c.beginPath();c.arc(426,77,9,0,Math.PI*2);c.fill();c.fillStyle='rgba(40,57,70,.7)';c.beginPath();c.arc(430,73,8,0,Math.PI*2);c.fill();
  }
  c.restore();
}
export function drawRain(c,env,cameraX,width,time){
  if(env.rain<.02)return;
  c.save();c.strokeStyle='#d4e2d2';c.lineWidth=1;c.globalAlpha=.27*env.rain;
  const t=env.reduced?0:time,count=env.reduced?20:118;
  for(let i=0;i<count;i++){
    const x=(i*149+t*19)%1040-40,y=(i*71+t*153)%650-25;
    if(x<cameraX-15||x>cameraX+width+15)continue;
    c.beginPath();c.moveTo(Math.round(x),Math.round(y));c.lineTo(Math.round(x-3),Math.round(y+8+i%4));c.stroke();
  }
  c.globalAlpha=.13*env.rain;
  for(let i=0;i<24;i++){
    const x=65+i*37,y=310+(i*43)%255,r=2+(t*.8+i)%3;
    c.beginPath();c.ellipse(x,y,r,r*.35,0,0,Math.PI*2);c.stroke();
  }
  c.restore();
}

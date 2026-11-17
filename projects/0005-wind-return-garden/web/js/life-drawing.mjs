import { SEEDS, plantStage } from './garden-life.mjs';
const pixel=(c,color,x,y,w=1,h=1)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
const oval=(c,color,x,y,rx,ry)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
export function drawBed(c,bed,plot,time,wind,now=Date.now(),flowers=true,env={}){
  const {x,y}=bed;
  if(!flowers){
    oval(c,'#526d4d33',x,y+4,40,16);oval(c,'#9c8969',x,y,36,14);oval(c,env.rain>.2?'#5f6650':'#6f6950',x,y,31,11);
    for(let i=0;i<6;i++)pixel(c,'#a99573',x-25+i*10,y-5+(i%2)*9,3,1);
    for(const [dx,dy] of [[-33,-3],[-24,10],[-5,13],[17,11],[34,3],[25,-9],[0,-13],[-20,-10]]){
      pixel(c,'#a6a386',x+dx,y+dy,7,3);pixel(c,'#c6b99a',x+dx,y+dy,6,1);
    }
    pixel(c,'#857757',x-36,y-17,2,18);pixel(c,'#c9b88c',x-44,y-22,17,8);
    if(!plot.kind){pixel(c,'#779166',x-39,y-20,6,1);pixel(c,'#779166',x-36,y-22,1,6);}
    return;
  }
  if(!plot.kind)return;
  const seed=SEEDS.find(s=>s.id===plot.kind),stage=plantStage(plot),g=plot.growth;
  const energy=wind?.sample(x,y).energy||0;
  const wet=plot.waterUntil>now;
  if(wet)oval(c,'#607a7045',x,y,27,8);
  for(const [i,[dx,dy]] of [[-21,-2],[-9,4],[3,-5],[17,3],[24,-4]].entries()){
    const height=Math.round(7+g*15)+(i%2)*3;
    const sway=Math.round(Math.sin(time*2-i*.7)*energy*2+(env.rain||0)),px=x+dx+sway,py=y+dy+Math.round((env.rain||0)*1.5);
    pixel(c,seed.leaf,px,py-height,2,height);
    pixel(c,seed.leaf,px-4,py-height*.45,5,2);pixel(c,'#8a9b6b',px+2,py-height*.65,4,2);
    if(g>=.3){pixel(c,seed.leaf,px-6,py-height*.7,5,2);pixel(c,'#9eaf78',px+2,py-height*.35,5,2);}
    if(g>=.65){
      if(stage==='开花了'&&!(env.night>.6)){
        if(seed.id==='bellflower'){
          pixel(c,seed.color,px-3,py-height-3,8,5);pixel(c,seed.color,px-4,py-height+1,3,3);pixel(c,seed.color,px+3,py-height+1,3,3);
          pixel(c,seed.center,px,py-height,2,2);
        }else{
          pixel(c,seed.color,px-4,py-height-2,10,4);pixel(c,seed.color,px-1,py-height-5,4,10);
          pixel(c,seed.center,px,py-height-1,2,2);
        }
      }else{pixel(c,seed.color,px-1,py-height-3,4,5);pixel(c,seed.leaf,px,py-height+1,2,2);}
    }
  }
  const since=(now-plot.wateredAt)/1000;
  if(plot.wateredAt&&since>=0&&since<3){
    c.save();c.globalAlpha=1-since/3;
    for(let i=0;i<7;i++)pixel(c,'#cae4d9',x-24+i*8,y-27+(since*16+i*6)%24,1,3);
    c.restore();
  }
}

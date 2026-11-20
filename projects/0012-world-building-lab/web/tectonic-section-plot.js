import {tectonicLayers} from './tectonic-layout.js';
import {sectionRock,sectionCover} from './tectonic-section-data.js';

export function drawTectonicSection(canvas,profile,station,layers,structural,local){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const valley=local&&station?.id==='valley';
  const points=valley?profile.crossSection.points:local&&station?
    profile.points.filter(p=>Math.abs(p.distance-station.at)<=Math.max(95,station.distance*.42)):profile.points;
  const first=points[0].distance,last=points.at(-1).distance,span=last-first;
  const slab=structural&&!local?profile.slab:[];
  const upper=Math.max(...points.map(p=>Math.max(p.y,p.waterLevel??p.y)))+25;
  const lower=Math.min(...points.map(p=>p.y),slab.at(-1)?.top??Infinity)-(slab.length?134:39);
  const top=27,bottom=h-28,left=46,right=w-15;
  const x=d=>left+(right-left)*(d-first)/span;
  const y=v=>top+(bottom-top)*(upper-v)/(upper-lower);

  function shape(coords,color){
    c.beginPath();coords.forEach(([u,v],i)=>i?c.lineTo(u,v):c.moveTo(u,v));
    c.closePath();c.fillStyle=color;c.fill();
  }
  function stroke(coords,color,width=1){
    c.beginPath();coords.forEach(([u,v],i)=>i?c.lineTo(u,v):c.moveTo(u,v));
    c.lineWidth=width;c.strokeStyle=color;c.stroke();
  }
  function label(text,u,v,color,align='center'){
    c.font='600 12px system-ui';c.fillStyle=color;c.textAlign=align;c.fillText(text,u,v);
  }
  const ground=points.map(p=>[x(p.distance),y(p.y)]);
  c.clearRect(0,0,w,h);c.fillStyle='#213e3a';c.fillRect(0,0,w,h);
  c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();
  shape([...ground,[right,bottom],[left,bottom]],'#604f45');
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],xa=x(a.distance),xb=x(b.distance);
    const ya=y(a.y),yb=y(b.y),ca=y(a.y-a.coverDepth),cb=y(b.y-b.coverDepth);
    if(layers.has('rock')){
      const thickness=local?41:112;
      shape([[xa,ca],[xb,cb],[xb,y(b.y-b.coverDepth-thickness)],[xa,y(a.y-a.coverDepth-thickness)]],
        sectionRock[a.rock].color);
    }
    if(layers.has('cover')){
      shape([[xa,ya],[xb,yb],[xb,Math.max(yb+1.5,cb)],[xa,Math.max(ya+1.5,ca)]],sectionCover[a.cover].color);
    }
    if(layers.has('water')&&a.waterLevel!==null&&b.waterLevel!==null){
      shape([[xa,ya],[xb,yb],[xb,y(b.waterLevel)],[xa,y(a.waterLevel)]],'#417d99');
    }
  }
  if(slab.length){
    shape([...slab.map(p=>[x(p.distance),y(p.top)]),
      ...slab.slice().reverse().map(p=>[x(p.distance),y(p.top-102)])],'#ce935f');
    const arc=profile.stations.find(s=>s.id==='volcano'),arcX=x(arc.at),mantleY=y(profile.arcBase.top+28);
    shape([[arcX-22,mantleY-1],[arcX+4,mantleY-18],[arcX+31,mantleY+12],[arcX,mantleY+11]],'#a95749');
    c.setLineDash([4,3]);
    stroke([[arcX,mantleY],[arcX-4,y(-90)],[arcX,y(arc.y)]],'#ffc084',2.5);
    c.setLineDash([]);
    label('俯冲板片',x(slab.at(-1).distance*.52),y(profile.arcBase.top-158),'#f8d4a6');
  }
  stroke(ground,'#f4e2b5',1.6);
  if(layers.has('water')){
    let water=[];
    for(const p of points){
      if(p.waterLevel!==null)water.push([x(p.distance),y(p.waterLevel)]);
      else if(water.length){stroke(water,'#9aeaf8',1.5);water=[];}
    }
    if(water.length)stroke(water,'#9aeaf8',1.5);
  }
  c.restore();
  const tick=Math.max(5,Math.round((upper-lower)/35)*10);
  for(let value=Math.ceil(lower/tick)*tick;value<upper;value+=tick){
    const height=y(value);
    if(height<top+10||height>bottom-4)continue;
    stroke([[left-4,height],[right,height]],value===0?'#c6ded48c':'#d9ede02a');
    label(String(Math.round(value)),left-7,height+4,'#d2e4dd','right');
  }
  if(local&&station){
    const distance=valley?span/2:station.at;
    c.setLineDash([3,4]);
    stroke([[x(distance),top],[x(distance),bottom]],'#fff3c9',1.2);
    c.setLineDash([]);
  }else{
    for(const p of profile.stations){
      c.beginPath();c.arc(x(p.at),y(p.y),p===station?4.7:2.65,0,Math.PI*2);
      c.fillStyle=tectonicLayers.find(layer=>layer.id===p.layer).color;c.fill();
    }
  }
  stroke([[left,top],[left,bottom],[right,bottom]],'#c1d1c68c');
  label('高程 m',left-9,16,'#d2e4dd','right');
  const format=d=>valley?Math.round(d-span/2)+' m':(d/1000).toFixed(2)+' km';
  label(format(first),left,h-8,'#d2e4dd','left');
  label(format(last),right,h-8,'#d2e4dd','right');
  return {left,right,first,last};
}

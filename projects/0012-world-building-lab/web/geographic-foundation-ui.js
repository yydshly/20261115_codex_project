import {foundationBasins,foundationLayers,foundationRegions,foundationScale,foundationSeams,
  foundationWind,getGeographicFoundation} from './geographic-foundation.js';
import {environmentLines} from './environment-lines.js';
import {planBounds} from './world-logic-data.js';
import {environmentGaps,gapKinds} from './environment-gaps.js';

const {minX,minZ}=planBounds;
const themes=Object.fromEntries(foundationLayers.map(layer=>[layer.id,layer.color]));
const mapHref=(month,route,seam)=>'expedition.html?'+new URLSearchParams({
  plan:'foundation',month,...(route?{focus:route}:{}),...(seam?{seam:seam.id}:{})
})+'#build-1';

function drawFoundation(canvas,model,{month,route,seam,enabled}){
  const context=canvas.getContext('2d'),{width,height}=canvas;
  const sx=x=>(x-minX)*width/foundationScale.width,sz=z=>(z-minZ)*height/foundationScale.depth;
  const size=model.grid.step*width/foundationScale.width;
  function path(points){
    context.beginPath();
    points.forEach(({x,z},i)=>i?context.lineTo(sx(x),sz(z)):context.moveTo(sx(x),sz(z)));
  }
  function stroke(points,color,w,dashes=[]){
    context.strokeStyle=color;context.lineWidth=w;context.setLineDash(dashes);
    path(points);context.stroke();context.setLineDash([]);
  }
  function label(text,x,z,color='#eee8cc',font='600 18px system-ui'){
    context.font=font;context.textAlign='center';context.textBaseline='middle';
    const half=context.measureText(text).width/2+7,u=Math.max(half,Math.min(width-half,sx(x))),v=sz(z);
    context.lineWidth=5;context.strokeStyle='#182c2af1';context.lineJoin='round';
    context.strokeText(text,u,v);context.fillStyle=color;context.fillText(text,u,v);
  }
  const {grid,ocean,basins}=model;
  context.fillStyle='#203d45';context.fillRect(0,0,width,height);
  for(let j=0;j<grid.rows;j++)for(let i=0;i<grid.cols;i++){
    const k=j*grid.cols+i;
    if(ocean[k])continue;
    const relief=Math.max(0,model.height[k]),light=30+Math.min(19,Math.floor(relief/25));
    const color=enabled.has('divide')?foundationBasins[basins[k]].color:'#859079';
    const x=sx(grid.x0+(i-.5)*grid.step),z=sz(grid.z0+(j-.5)*grid.step);
    context.globalAlpha=.63;context.fillStyle=color;context.fillRect(x,z,size+1,size+1);
    context.globalAlpha=.48;context.fillStyle=`hsl(56 18% ${light}%)`;context.fillRect(x,z,size+1,size+1);
    context.globalAlpha=1;
  }
  if(enabled.has('shore'))for(const edge of model.coast.coast)stroke(edge,themes.shore,1.25);
  if(enabled.has('divide')){
    for(const edge of model.coast.divides)stroke(edge,themes.divide,2.1);
    context.globalAlpha=.53;
    for(const edge of model.coast.localDivides)stroke(edge,themes.divide,1,[3,3]);
    context.globalAlpha=1;
  }
  if(enabled.has('relief'))for(const belt of model.ridges)stroke(belt.points,themes.relief,3.6);
  for(const feeder of model.feeders)for(const points of feeder.paths)stroke(points,feeder.id==='south'?'#9be6b0':'#8bc6e4',1.5);
  for(const line of model.routes){
    context.globalAlpha=route&&route!==line.id?.24:1;
    stroke(line.path,'#253834',5.8);stroke(line.path,line.color,3.1);
    for(const {p} of line.stops){
      context.beginPath();context.arc(sx(p.x),sz(p.z),3.25,0,Math.PI*2);
      context.fillStyle=line.color;context.fill();context.strokeStyle='#253834';context.lineWidth=1;context.stroke();
    }
    context.globalAlpha=1;
  }
  for(const a of model.anchors)if(enabled.has(a.kind))label(a.label,a.x,a.z,themes[a.kind]);
  if(seam)stroke(seam.section,'#f7d596',3,[5,4]);
  if(enabled.has('wind')){
    for(const {x,z,dx,dz,length,text} of foundationWind(month).arrows){
      const tail={x,z},tip={x:x+dx*length,z:z+dz*length};
      stroke([tail,tip],themes.wind,4);
      const a={x:tip.x-dx*47+dz*20,z:tip.z-dz*47-dx*20};
      const b={x:tip.x-dx*47-dz*20,z:tip.z-dz*47+dx*20};
      path([a,tip,b]);context.fillStyle=themes.wind;context.fill();
      if(text)label(text,x+dx*length*.47,z+dz*length*.47-50,themes.wind);
    }
  }
  const {origin,length,north}=foundationScale,fore='#fff5d5';
  context.fillStyle='#1b302ee0';context.fillRect(sx(origin.x)-12,sz(origin.z)-18,sx(origin.x+length)-sx(origin.x)+24,43);
  stroke([origin,{x:origin.x+length,z:origin.z}],fore,3);
  for(const step of [0,length/2,length]){
    const x=origin.x+step;
    stroke([{x,z:origin.z-21},{x,z:origin.z+21}],fore,2);
  }
  label('0',origin.x,origin.z+61,fore);label('1 km',origin.x+length,origin.z+61,fore);
  const tip={x:north.x,z:north.z-105};
  stroke([north,tip],fore,2.5);
  stroke([{x:tip.x-27,z:tip.z+45},tip,{x:tip.x+27,z:tip.z+45}],fore,2.5);
  label('N',north.x,north.z+50,fore);
  if(enabled.has('gaps')){
    for(const gap of environmentGaps){
      const [x,z]=gap.anchor,color=gapKinds[gap.kind].color;
      context.beginPath();context.arc(sx(x),sz(z),12,0,Math.PI*2);
      context.fillStyle='#1c332f';context.fill();context.strokeStyle=color;context.lineWidth=2.5;context.stroke();
      context.fillStyle=color;context.font='700 14px system-ui';
      context.textAlign='center';context.textBaseline='middle';context.fillText(String(gap.rank),sx(x),sz(z));
    }
    return;
  }
  for(const [i,s] of model.seams.entries()){
    const selected=seam?.id===s.id;
    context.beginPath();context.arc(sx(s.x),sz(s.z),selected?13:10,0,Math.PI*2);
    context.fillStyle=selected?'#f7d596':'#243d36';context.fill();
    context.strokeStyle='#f7d596';context.lineWidth=2.5;context.stroke();
    context.fillStyle=selected?'#293829':'#f7d596';context.font='700 13px system-ui';
    context.textAlign='center';context.textBaseline='middle';context.fillText(String(i+1),sx(s.x),sz(s.z));
  }
}

export function mountFoundationMap(section){
  const canvas=section.querySelector('canvas'),enabled=new Set(foundationLayers.map(l=>l.id));
  const select=section.querySelector('#foundation-seam'),routes=section.querySelector('#foundation-routes'),
    monthOptions=section.querySelector('#foundation-month'),info=section.querySelector('#foundation-reading');
  const open=section.querySelector('#foundation-open'),toggles=section.querySelector('#foundation-layers');
  let month=7,route=null,seam=null;
  routes.innerHTML='<button type="button" data-foundation-route="">三线全图</button>'+environmentLines.map(
    ({id,name,color})=>`<button type="button" data-foundation-route="${id}" style="--route:${color}">${name}</button>`).join('');
  toggles.innerHTML=foundationLayers.map(({id,name,color})=>
    `<label><input type="checkbox" data-foundation-layer="${id}" checked><i style="--layer:${color}"></i>${name}</label>`).join('')
    +'<label><input type="checkbox" data-foundation-layer="gaps">环境缺口</label>';
  const mapNote=section.querySelector('#foundation-gap-note');
  const seamNote=section.querySelector('#foundation-seam-note');
  const basinKey=section.querySelector('#foundation-basins');
  basinKey.innerHTML=['central','south','closed'].map(key=>{
    const {name,color}=foundationBasins[key];
    return `<span><i style="--layer:${color}"></i>${name}</span>`;
  }).join('');
  select.innerHTML='<option value="">全图关系</option>'+foundationSeams.map(
    ({id,name},i)=>`<option value="${id}">${i+1} · ${name}</option>`).join('');
  section.querySelector('#foundation-regions').innerHTML=foundationRegions.map(({title,description,line})=>
    `<article><h3>${title}</h3><p>${description}</p>${line?`<a data-region-route="${line}" href="${mapHref(7,line)}">沿${environmentLines.find(r=>r.id===line).name}线进大地图 ↗</a>`:''}</article>`).join('');
  function refresh(){
    const label=environmentLines.find(r=>r.id===route);
    info.innerHTML=seam?`<h3>${seam.name}</h3><p>${seam.reason}</p><p><b>实景剖面</b> ${seam.connection}</p><p><b>沿线观察</b> ${seam.check}</p>`:
      `<h3>${label?.name??'地理底图'} </h3><p>${label?.lead??'两条出海河和西部内流盐盆，由现有分水界分开。水汽从外海跨过山脊，冷暖和湿度条件随位置变化。'}</p>`;
    if(seam){
      const links=seam.lines.map(id=>{
        const line=environmentLines.find(item=>item.id===id);
        return `<a href="${mapHref(month,id)}">${line.name} ↗</a>`;
      });
      info.insertAdjacentHTML('beforeend',`<div class="p-foundation-route-links">${links.join('')}</div>`);
    }
    for(const link of section.querySelectorAll('[data-region-route]'))link.href=mapHref(month,link.dataset.regionRoute);
    open.href=mapHref(month,route,seam);
  open.textContent=seam?'在 3D 地图看实景剖面 ↗':label?'在 3D 地图沿线查看 ↗':'打开 3D 地理底图 ↗';
    for(const b of routes.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.foundationRoute===(route??'')));
    for(const b of monthOptions.querySelectorAll('button'))b.setAttribute('aria-pressed',String(Number(b.dataset.foundationMonth)===month));
    basinKey.hidden=!enabled.has('divide');
    mapNote.hidden=!enabled.has('gaps');
    seamNote.hidden=enabled.has('gaps');
    drawFoundation(canvas,getGeographicFoundation(),{month,route,seam,enabled});
  }
  routes.addEventListener('click',e=>{
    const b=e.target.closest('button[data-foundation-route]');
    if(b){route=b.dataset.foundationRoute||null;seam=null;select.value='';refresh();}
  });
  monthOptions.addEventListener('click',e=>{
    const b=e.target.closest('button[data-foundation-month]');
    if(b){month=Number(b.dataset.foundationMonth);refresh();}
  });
  toggles.addEventListener('change',e=>{
    const id=e.target.dataset.foundationLayer;
    if(e.target.checked){
      enabled.add(id);
      if(id==='gaps'){seam=null;select.value='';}
    }else enabled.delete(id);
    refresh();
  });
  function chooseSeam(){
    seam=foundationSeams.find(s=>s.id===select.value)??null;route=null;
    if(seam){
      enabled.delete('gaps');toggles.querySelector('[data-foundation-layer="gaps"]').checked=false;
    }
    refresh();
  }
  select.addEventListener('change',chooseSeam);
  canvas.addEventListener('click',e=>{
    const box=canvas.getBoundingClientRect(),x=minX+(e.clientX-box.left)*foundationScale.width/box.width,
      z=minZ+(e.clientY-box.top)*foundationScale.depth/box.height;
    if(enabled.has('gaps')){
      const near=environmentGaps.find(gap=>Math.hypot(x-gap.anchor[0],z-gap.anchor[1])<75);
      if(near)location.hash='gap-'+near.id;
      return;
    }
    const near=foundationSeams.find(s=>Math.hypot(x-s.x,z-s.z)<75);
    if(near){select.value=near.id;chooseSeam();}
  });
  refresh();
}

const section=typeof document==='undefined'?null:document.getElementById('geographic-foundation');
if(section){
  const observer=new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting)){observer.disconnect();mountFoundationMap(section);}
  },{rootMargin:'220px'});
  observer.observe(section);
}

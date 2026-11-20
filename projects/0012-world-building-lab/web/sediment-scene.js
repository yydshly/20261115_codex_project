import * as THREE from 'three';
import {FAN_BARS,fanProfile} from './fan-layout.js';
import {northSample} from './northern-watershed.js';
import {terrainHeight} from './large-world.js';
import {branchSample,riverSample} from './water-system.js';
import {cellPosition,seasonalRiverLevel} from './watershed-world.js';
import {buildSedimentYear,sedimentVolume} from './sediment-model.js';

const clamp=value=>Math.min(1,Math.max(0,value));
const lerp=(a,b,t)=>a+(b-a)*t;
const ripple=(x,z)=>.58+.24*Math.sin(x*.29+z*.15)+.16*Math.sin(x*.65-z*.54);
const colors={
  sand:new THREE.Color('#e8b678'), silt:new THREE.Color('#e0aa88'),
  darkSand:new THREE.Color('#aa6740'),darkSilt:new THREE.Color('#93614d')
};

function sampleGrid(rows,cols,point){
  const points=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
    const p=point(row/rows,col/cols),y=terrainHeight(p.x,p.z);
    points.push({...p,y,grain:ripple(p.x,p.z)});
  }
  const triangles=[];
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const k=row*(cols+1)+col;
    triangles.push([k,k+1,k+cols+1],[k+1,k+cols+2,k+cols+1]);
  }
  return {points,triangles};
}

export function sedimentSurveys(world){
  const fan=sampleGrid(89,65,(u,v)=>{
    const z=lerp(-1024,-856,u),profile=fanProfile(z),offset=(v*2-1)*(11+61*u);
    const center=profile.channels[0],x=center+offset;
    const distance=Math.min(...profile.channels.map(cx=>Math.abs(x-cx)));
    const bars=Math.max(0,...FAN_BARS.map(b=>1-Math.hypot((x-b.x)/b.rx,(z-b.z)/b.rz)));
    const lobe=(1-Math.abs(v*2-1))*(1-u*.56);
    const shoulder=clamp((distance-profile.half+1)/5)*Math.exp(-((distance-8)**2)/210);
    return {x,z,strength:clamp(lobe*shoulder+bars*.65),grainMix:u*.8};
  });
  const flood=sampleGrid(84,56,(u,v)=>{
    const t=lerp(.641,.708,u),p=riverSample(t),breadth=(v*2-1)*(1+23/p.half);
    return {x:p.x+p.nx*p.half*breadth,z:p.z+p.nz*p.half*breadth,t,breadth,grainMix:1};
  });
  const mouth=sampleGrid(74,62,(u,v)=>{
    const t=lerp(.762,.877,u),p=riverSample(t),offset=(v*2-1)*93;
    const lobe=(side)=>Math.hypot((t-(side>0?.818:.828))/.049,(offset-side*(48+220*(t-.8)))/25);
    return {x:p.x+p.nx*offset,z:p.z+p.nz*offset,
      strength:clamp(1-Math.min(lobe(-1),lobe(1))),grainMix:Math.abs(offset)/155};
  });
  const stages=world.frames.map(({records})=>[records.main.stage,records.wetland.stage]);
  return {fan,flood,mouth,stages};
}

export function sedimentPatch(survey,id,frame,yearToDate){
  const {points,triangles}=survey[id];
  const deposits=yearToDate?frame.yearDeposits[id]:
    id==='flood'?frame.reaches.flood.overbank:frame.reaches[id].deposited;
  const volume=id==='mouth'?deposits.coarse:sedimentVolume(deposits);
  const position=[],color=[];
  const reference=id==='fan'?1.45:id==='flood'?75:1.7;
  const intensity=1-Math.exp(-1.8*volume/reference);
  if(volume<.01)return {position,color,intensity};
  const levels=survey.stages[frame.month-1];
  const bankStages=yearToDate?levels.map((_,index)=>
    Math.max(...survey.stages.slice(0,frame.month).map(stage=>stage[index]))):levels;
  const strengths=points.map(p=>{
    if(id==='flood'){
      const stage=seasonalRiverLevel(p.t,...bankStages);
      return clamp((stage-p.y)/.4)*clamp((Math.abs(p.breadth)-1)/.10);
    }
    if(id==='mouth')return p.strength*clamp((p.y+1.75)/.70);
    return p.strength;
  });
  const limit=id==='flood'?.05:.61-intensity*.5;
  const height=id==='fan'?.92:id==='flood'?.32:.72;
  const tone=new THREE.Color(),sand=new THREE.Color(),silt=new THREE.Color();
  for(const triangle of triangles){
    if(triangle.some(k=>strengths[k]<=limit))continue;
    for(const k of triangle){
      const p=points[k],strength=strengths[k],edge=clamp((strength-limit)/.32);
      const y=p.y+.07+height*intensity*edge;
      position.push(p.x,y,p.z);
      sand.copy(colors.darkSand).lerp(colors.sand,p.grain*.65+.27);
      silt.copy(colors.darkSilt).lerp(colors.silt,p.grain*.54+.26);
      tone.copy(sand).lerp(silt,p.grainMix).multiplyScalar(.74+.25*intensity);
      color.push(tone.r,tone.g,tone.b);
    }
  }
  return {position,color,intensity};
}

function path(sample,start,end,items,lateral=0){
  return Array.from({length:items+1},(_,i)=>{
    const p=sample(lerp(start,end,i/items)),x=p.x+p.nx*lateral,z=p.z+p.nz*lateral;
    return {x,z,y:Math.max(p.level,terrainHeight(x,z))+1.4,t:p.t};
  });
}

function buildPaths(){
  const north=(id,offset=0)=>path(t=>northSample(id,t),0,1,60,offset);
  const river=(start,end,branch,offset=0)=>path(t=>branchSample(branch,t),start,end,80,offset);
  const fan=index=>path(t=>{
    const p=fanProfile(lerp(-1030,-850,t));
    return {x:p.channels[index],z:p.z,level:p.level,nx:1,nz:0};
  },0,1,68);
  return {
    head:[north('fan-head')],
    fan:[fan(0),fan(1),fan(2)],
    north:[north('fan-out'),north('strata-out'),north('trunk')],
    flood:[river(.624,.735,0,-9),river(.624,.735,0,9)],
    mouth:[river(.735,.97,0),river(.735,.97,1),river(.735,.97,2)]
  };
}

function slopePaths(world,year){
  const routes=[];
  for(let k=0;k<year.toFanHead.length;k++){
    const to=world.graph.next[k];
    if(!year.toFanHead[k]||to<0)continue;
    const a=cellPosition(world.climate.grid,k),b=cellPosition(world.climate.grid,to);
    if(a.z> -1021||Math.hypot(a.x+880,a.z+1080)>153)continue;
    const length=Math.hypot(a.x-b.x,a.z-b.z);
    const nx=(b.z-a.z)/length,nz=(a.x-b.x)/length;
    const points=[];
    for(let i=0;i<=12;i++){
      const x=lerp(a.x,b.x,i/12),z=lerp(a.z,b.z,i/12);
      points.push({x,z,y:terrainHeight(x,z)+.95});
    }
    routes.push({k,points,nx,nz});
  }
  return routes;
}

function scourTraces(slopes,frames){
  const positions=[],colors=[];
  const worn=new THREE.Color('#b8744a'),dark=new THREE.Color('#76513b');
  for(const {k,points,nx,nz} of slopes){
    const amount=frames.reduce((sum,frame)=>sum+frame.incision[k],0);
    if(amount<.025)continue;
    const width=.8+2.8*clamp(Math.sqrt(amount/2.7));
    const edges=points.map(({x,z},i)=>{
      const w=width*(.22+Math.sin(Math.PI*i/(points.length-1))*.78)*(1+.15*Math.sin(i*2+k));
      return [-1,1].map(side=>{
        const px=x+nx*w*side,pz=z+nz*w*side;
        return [px,terrainHeight(px,pz)+.22,pz];
      });
    });
    for(let i=1;i<edges.length;i++){
      const [a,b]=edges[i-1],[c,d]=edges[i];
      positions.push(...a,...b,...c,...b,...d,...c);
      for(let j=0;j<6;j++){
        const tone=worn.clone().lerp(dark,.13+.42*ripple(k,i+j*.17));
        colors.push(tone.r,tone.g,tone.b);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  return geometry;
}

function traceStrokes(root){
  const max=480,position=new THREE.BufferAttribute(new Float32Array(max*6),3);
  const color=new THREE.BufferAttribute(new Float32Array(max*6),3);
  position.setUsage(THREE.DynamicDrawUsage);color.setUsage(THREE.DynamicDrawUsage);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',position);geometry.setAttribute('color',color);
  geometry.setDrawRange(0,0);
  const strokes=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({
    vertexColors:true,transparent:true,opacity:.94,depthWrite:false
  }));
  strokes.frustumCulled=false;strokes.renderOrder=33;root.add(strokes);
  const orange=new THREE.Color('#ff9251'), pale=new THREE.Color('#ffe1a5'),fine=new THREE.Color('#eabc9f');
  let traces=[];
  function setPoint(k,points,u){
    const along=clamp(u)*(points.length-1),j=Math.min(points.length-2,Math.floor(along));
    const a=points[j],b=points[j+1],v=along-j;
    position.setXYZ(k,lerp(a.x,b.x,v),lerp(a.y,b.y,v),lerp(a.z,b.z,v));
  }
  return {
    choose(frame,focus,paths,slopes,peak){
      traces=[];
      function add(points,count,dye,pace,length){
        for(let i=0;i<count;i++){
          traces.push({points,dye,pace,length,phase:(i/count+traces.length*.381966)%1});
        }
      }
      for(const [id,segments] of Object.entries(paths)){
        if(focus!=='all'&&focus!==id)continue;
        const reach=frame.reaches[id],ratio=clamp(sedimentVolume(reach.out)/Math.max(.001,peak[id]));
        const count=Math.round(Math.sqrt(ratio)*42/segments.length);
        for(const route of segments){
          const n=Math.min(count,Math.round(count*reach.out.coarse/Math.max(.001,sedimentVolume(reach.out))));
          const pace=.09+ratio*.11;
          add(route,n,pale,pace,.031);add(route,count-n,fine,pace,.021);
        }
      }
      if(focus==='head'||focus==='all'){
        for(const {k,points} of slopes){
          const source=frame.incision[k];
          if(source>.01)add(points,Math.ceil(clamp(source/.33)*4),orange,.22+clamp(source)*.2,.25);
        }
      }
      traces=traces.slice(0,max);
      geometry.setDrawRange(0,traces.length*2);
      traces.forEach(({dye},i)=>{
        color.setXYZ(i*2,dye.r*.55,dye.g*.55,dye.b*.55);
        color.setXYZ(i*2+1,dye.r,dye.g,dye.b);
      });
      color.needsUpdate=true;
    },
    update(time){
      traces.forEach(({points,phase,pace,length},i)=>{
        const head=(phase+time*pace)%1;
        setPoint(i*2,points,head-length);setPoint(i*2+1,points,head);
      });
      position.needsUpdate=true;
    },
    set visible(value){strokes.visible=value;}
  };
}

export function createSedimentScene(scene,balance,{reduced=false}={}){
  const root=new THREE.Group();
  root.name='seasonal sediment';root.visible=false;scene.add(root);
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
  const scour=new THREE.Mesh(new THREE.BufferGeometry(),material);
  scour.name='sediment hillslope scour traces';root.add(scour);
  const patches=Object.fromEntries(['fan','flood','mouth'].map(id=>{
    const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material);
    mesh.name='sediment '+id;mesh.visible=false;root.add(mesh);
    return [id,mesh];
  }));
  const strokes=traceStrokes(root);
  let world,year,surveys,paths,slopes,peak,time=0,animated=false;
  function getYear(){
    if(!year){world=balance.model;year=buildSedimentYear(world);}
    return year;
  }
  function init(){
    getYear();
    surveys=sedimentSurveys(world);paths=buildPaths();slopes=slopePaths(world,year);
    peak=Object.fromEntries(Object.keys(paths).map(id=>
      [id,Math.max(...year.frames.map(frame=>sedimentVolume(frame.reaches[id].out)))]));
  }
  return {
    get model(){return getYear();},
    show(month,focus,layer){
      if(!surveys)init();
      root.visible=true;
      balance.show(month,'all','water');
      const frame=year.frames[month-1];
      scour.visible=layer!=='base'&&(focus==='head'||focus==='all');
      if(scour.visible){
        scour.geometry.dispose();
        scour.geometry=scourTraces(slopes,layer==='year'?year.frames.slice(0,month):[frame]);
      }
      for(const [id,mesh] of Object.entries(patches)){
        mesh.visible=layer!=='base'&&(id===focus||focus==='all');
        if(!mesh.visible)continue;
        const {position,color}=sedimentPatch(surveys,id,frame,layer==='year');
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
        geometry.setAttribute('color',new THREE.Float32BufferAttribute(color,3));
        mesh.geometry.dispose();mesh.geometry=geometry;
      }
      animated=layer==='month';
      strokes.visible=animated;
      if(animated){
        strokes.choose(frame,focus,paths,slopes,peak);strokes.update(time);
      }
      return {frame,year:year.frames};
    },
    hide(){
      if(!root.visible)return;
      root.visible=false;balance.hide();
    },
    update(dt){if(root.visible&&animated&&!reduced){time+=dt;strokes.update(time);}}
  };
}

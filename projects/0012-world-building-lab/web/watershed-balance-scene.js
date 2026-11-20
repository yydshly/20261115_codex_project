import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {LAKE} from './inland-geography.js';
import {inlandChannelGeometry} from './inland-scene.js';
import {riverGeometry} from './water-scene.js';
import {buildWorldWaterBalance,cellPosition,riverWindow,seasonalRiverLevel} from './watershed-world.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,u)=>a+(b-a)*u;

// Intersect each bed triangle against its local water plane. Shore vertices are
// intersections with the bed, rather than an ellipse scaled on the screen.
export function clippedWaterGeometry(patch,levelAt,{saline=false,waterMask=null,minX=null,colorAt=null,heightAt=terrainHeight,referenceAt=null}={}){
  const vertices=[], colors=[],shore=[],uv=[];
  const levels=patch.bed.map(levelAt);
  const isRiver=patch.bed[0]?.t!==undefined;
  const shallow=saline?[.24,.40,.33]:[.25,.45,.45],deep=saline?[.042,.20,.18]:[.033,.24,.32];
  const riverColor=['#498d84','#8aa88c','#5b9e9a','#aac3a8']
    .map(hex=>new THREE.Color(hex).toArray());
  function intersect(a,b){
    const point=u=>{
      const p={x:mix(a.x,b.x,u),z:mix(a.z,b.z,u),level:mix(a.level,b.level,u),depth:0,
        t:mix(a.t,b.t,u),breadth:mix(a.breadth,b.breadth,u),branch:u<.5?a.branch:b.branch};
      if(referenceAt)p.referenceDry=p.level-referenceAt(p);
      return p;
    };
    const depth=p=>p.level-heightAt(p.x,p.z);
    const approximate=point(a.depth/(a.depth-b.depth));
    if(Math.abs(depth(approximate))<.07)return approximate;
    // Close to an outlet mouth, the authored channels can cut through one cell.
    // Refine the intersection against the continuous bed rather than a flat edge.
    let wet=a.depth>0?0:1, dry=1-wet;
    for(let n=0;n<9;n++){
      const t=(wet+dry)/2;
      if(depth(point(t))>=0)wet=t;else dry=t;
    }
    return point(wet);
  }
  function emit(p){
    vertices.push(p.x,p.level+.05,p.z);
    const t=clamp(p.depth/3.8);
    if(colorAt){
      colors.push(...colorAt(p));
      if(isRiver)uv.push(p.breadth/2+.5,p.t*380);
    }else if(isRiver){
      const base=p.t<.7?0:2;
      const mixEdge=clamp((Math.abs(p.breadth)-.70)/.23);
      colors.push(...riverColor[base].map((v,i)=>mix(v,riverColor[base+1][i],mixEdge)));
      uv.push(p.breadth/2+.5,p.t*380);
    }else colors.push(...shallow.map((v,i)=>mix(v,deep[i],t)));
  }
  function triangle(indices){
    if(waterMask&&!indices.some(k=>waterMask[k]))return;
    const poly=indices.map(k=>{
      const p={...patch.bed[k],level:levels[k],depth:levels[k]-patch.bed[k].bed};
      if(referenceAt)p.referenceDry=p.bed-referenceAt(p);
      return p;
    });
    let clipped=[];
    const contour=[];
    for(let i=0;i<3;i++){
      const a=poly[i],b=poly[(i+1)%3],inside=a.depth>0, after=b.depth>0;
      if(inside)clipped.push(a);
      if(inside!==after){
        const point=intersect(a,b);
        clipped.push(point);contour.push(point);
      }
    }
    if(referenceAt){
      // Draw only ground that was dry at the reference level.
      const land=[];
      for(let i=0;i<clipped.length;i++){
        const a=clipped[i],b=clipped[(i+1)%clipped.length],inside=a.referenceDry>=0,after=b.referenceDry>=0;
        if(inside)land.push(a);
        if(inside!==after){
          const u=a.referenceDry/(a.referenceDry-b.referenceDry);
          land.push({x:mix(a.x,b.x,u),z:mix(a.z,b.z,u),level:mix(a.level,b.level,u),
            depth:mix(a.depth,b.depth,u),t:mix(a.t,b.t,u),breadth:mix(a.breadth,b.breadth,u),
            branch:u<.5?a.branch:b.branch,referenceDry:0});
        }
      }
      clipped=land;
    }
    if(minX!==null){
      const retained=[];
      for(let i=0;i<clipped.length;i++){
        const a=clipped[i],b=clipped[(i+1)%clipped.length],inside=a.x>=minX;
        if(inside)retained.push(a);
        if(inside!==(b.x>=minX)){
          const u=(minX-a.x)/(b.x-a.x);
          retained.push({x:minX,z:mix(a.z,b.z,u),t:mix(a.t,b.t,u),breadth:mix(a.breadth,b.breadth,u),
            level:mix(a.level,b.level,u),depth:mix(a.depth,b.depth,u)});
        }
      }
      clipped=retained;
    }
    for(let i=1;i<clipped.length-1;i++){emit(clipped[0]);emit(clipped[i]);emit(clipped[i+1]);}
    if(contour.length===2)for(const p of contour)shore.push(p.x,p.level+.19,p.z);
  }
  for(const {indices:[a,b,c,d]} of patch.cells){triangle([a,c,b]);triangle([b,c,d]);}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  if(isRiver)g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.computeVertexNormals();
  g.userData.shoreline=shore;
  return g;
}

const branchColors={surface:[.22,.88,1],baseflow:[.61,.64,1],infiltration:[1,.71,.27],melt:[.84,.96,1]};
function buildParticles(root){
  const geometry=new THREE.BufferGeometry();
  const count=320;
  const positions=new THREE.BufferAttribute(new Float32Array(count*12),3);
  const colors=new THREE.BufferAttribute(new Float32Array(count*12),3);
  positions.setUsage(THREE.DynamicDrawUsage);colors.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position',positions);geometry.setAttribute('color',colors);
  const flow=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({
    vertexColors:true,transparent:true,opacity:.92,depthWrite:false
  }));
  flow.frustumCulled=false;flow.renderOrder=43;root.add(flow);
  let traces=[];
  return {
    choose(model,frame,focus,layer){
      flow.visible=layer!=='water';
      if(!flow.visible)return;
      const {climate:{grid,height},graph,bodies}=model;
      const matching=focus==='main'?['ice','upper','lake','main']:
        focus==='wetland'?['north','wetland','main']:
          focus==='salt'?['salt','saltMarsh']:[focus];
      const chosen=[];
      for(let k=0;k<height.length;k++){
        const owner=graph.owner[k],to=graph.next[k];
        if(owner<0||focus!=='all'&&!matching.includes(bodies[owner].id))continue;
        const {surface,infiltration,baseflow,melt}=frame.cells;
        const kind=layer==='ground'?(infiltration[k]>(baseflow[k]*.8)?'infiltration':'baseflow'):
          focus==='ice'&&melt[k]>surface[k]*.42?'melt':'surface';
        const strength=frame.cells[kind][k];
        if(strength<(kind==='baseflow'?.8:1.6)||kind!=='infiltration'&&to<0)continue;
        const phase=(k*.61803398875)%1;
        chosen.push({k,to,kind,strength,phase,rank:strength*(.5+phase)});
      }
      traces=chosen.sort((a,b)=>b.rank-a.rank).slice(0,count).map(trace=>{
        const from=cellPosition(grid,trace.k),to=trace.to<0?from:cellPosition(grid,trace.to);
        const ground=Array.from({length:5},(_,i)=>terrainHeight(mix(from.x,to.x,i/4),mix(from.z,to.z,i/4)));
        return {...trace,from,to,ground};
      });
      geometry.setDrawRange(0,traces.length*4);
    },
    update(time){
      if(!flow.visible)return;
      function point(trace,u){
        const v=clamp(u),i=Math.min(3,Math.floor(v*4));
        const {from,to,ground}=trace;
        return [mix(from.x,to.x,v),mix(ground[i],ground[i+1],v*4-i)+3,mix(from.z,to.z,v)];
      }
      traces.forEach((trace,i)=>{
        const {kind,phase,strength}=trace,k=i*4, u=(phase+time*(.30+Math.min(.7,strength*.018)))%1;
        const c=branchColors[kind];
        if(kind==='infiltration'){
          const {x,z}=trace.from, y=trace.ground[0]+3+(1-u)*31;
          positions.setXYZ(k,x,y+12,z);positions.setXYZ(k+1,x,y,z);
          positions.setXYZ(k+2,x+4,y+4,z);positions.setXYZ(k+3,x,y,z);
        }else{
          const front=point(trace,u),back=point(trace,u-.55),wing=point(trace,u-.24);
          const dx=trace.to.x-trace.from.x,dz=trace.to.z-trace.from.z,length=Math.hypot(dx,dz)||1;
          wing[0]+=6*dz/length;wing[2]-=6*dx/length;
          positions.setXYZ(k,...back);positions.setXYZ(k+1,...front);
          positions.setXYZ(k+2,...wing);positions.setXYZ(k+3,...front);
        }
        for(let j=0;j<4;j++)colors.setXYZ(k+j,...c.map(v=>v*(j%2?.99:.57)));
      });
      positions.needsUpdate=true;colors.needsUpdate=true;
    }
  };
}

export function createWatershedBalanceScene(scene,{water,inland,salt,weather,reduced=false}){
  const root=new THREE.Group();
  root.name='watershed monthly water surfaces and flow';root.visible=false;scene.add(root);
  let model=null,mesh=null,oldVisibility=null,texture=null,particles=null,shownMonth=-1,shownSurvey=null,time=0;
  const outlines=new Map();
  const waterMaterial=new THREE.MeshStandardMaterial({
    vertexColors:true,roughness:.38,metalness:.12,side:THREE.DoubleSide,transparent:true,opacity:.93
  });

  function init(){
    model=buildWorldWaterBalance();
    const {cols,rows}=model.climate.grid;
    texture=new THREE.DataTexture(new Uint8Array(cols*rows*4),cols,rows);
    texture.magFilter=texture.minFilter=THREE.LinearFilter;
    const make=material=>{
      const m=new THREE.Mesh(new THREE.BufferGeometry(),material);
      m.renderOrder=9;root.add(m);return m;
    };
    mesh={river:make(water.flowMaterial),lake:make(waterMaterial),salt:make(waterMaterial),
      saltMarsh:make(waterMaterial),inland:make(inland.channels.material),
      otherRiver:make(water.flowMaterial),upstream:make(water.flowMaterial)};
    mesh.upstream.visible=false;
    mesh.otherRiver.geometry.dispose();
    mesh.otherRiver.geometry=riverGeometry(false,riverWindow);
    particles=buildParticles(root);
  }
  function replace(id,g){mesh[id].geometry.dispose();mesh[id].geometry=g;}
  function publishRiver(frame,survey){
    const {records}=frame;
    const stage=survey?.stage??records.wetland.stage;
    const minX=survey?.downstreamX??null;
    replace('river',clippedWaterGeometry(model.patches.river,
      survey?.levelAt??(p=>seasonalRiverLevel(p.t,records.main.stage,stage)),
      {waterMask:survey?.waterMask,minX}));
    if(minX!==null&&!mesh.upstream.geometry.attributes.position)replace('upstream',riverGeometry(false,null,riverWindow[0]));
    mesh.upstream.visible=minX!==null;
    mesh.otherRiver.visible=minX===null;
    shownSurvey=survey;
  }
  function publishFrame(frame,survey){
    const {records}=frame;
    for(const id of ['lake','salt','saltMarsh']){
      replace(id,clippedWaterGeometry(model.patches[id],()=>records[id].stage,{saline:id!=='lake'}));
    }
    publishRiver(frame,survey);
    const lakeChange=records.lake.stage-LAKE.level;
    replace('inland',inlandChannelGeometry(p=>p.level+lakeChange*(p.channel==='outlet'?clamp(1-p.t/.38):clamp((p.t-.55)/.45))));
    const snow=frame.cells.snow,data=texture.image.data, cellArea=model.climate.grid.step**2;
    for(let k=0;k<frame.cells.soil.length;k++){
      data[k*4+1]=Math.round(clamp(frame.cells.soil[k]/(cellArea*.048))*255);
      data[k*4+2]=Math.round(clamp(snow[k]/(cellArea*.09))*255);
    }
    texture.needsUpdate=true;
    weather.setAnnualClimate(texture,model.climate.grid,'response');
  }
  function showHighWater(focus,enabled){
    for(const line of outlines.values())line.visible=false;
    if(!enabled)return;
    const id=focus==='main'||focus==='wetland'?'river':focus;
    if(!['lake','salt','river'].includes(id))return;
    if(!outlines.has(id)){
      const max=key=>Math.max(...model.frames.map(f=>f.records[key].stage));
      const maxMain=max('main'),maxWetland=max('wetland');
      const maxLake=max('lake'),maxSalt=max('salt'),maxMarsh=max('saltMarsh');
      const trace=(key,level)=>{
        const g=clippedWaterGeometry(model.patches[key],level);
        const points=g.userData.shoreline;g.dispose();return points;
      };
      const points=id==='river'?trace('river',p=>seasonalRiverLevel(p.t,maxMain,maxWetland)):
        id==='salt'?[...trace('salt',()=>maxSalt),...trace('saltMarsh',()=>maxMarsh)]:
        trace('lake',()=>maxLake);
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
      const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({
        color:'#e6b769',transparent:true,opacity:.84,depthWrite:false
      }));
      line.renderOrder=14;root.add(line);outlines.set(id,line);
    }
    outlines.get(id).visible=true;
  }
  const originals=[water.river,inland.lake,inland.channels,salt.water];
  return {
    get model(){if(!model)init();return model;},
    show(month,focus,layer,{riverSurvey=null}={}){
      if(!model)init();
      if(!root.visible){
        oldVisibility=originals.map(o=>o.visible);
        originals.forEach(o=>{o.visible=false;});
        root.visible=true;
      }
      const frame=model.frames[month-1];
      if(shownMonth!==month){publishFrame(frame,riverSurvey);shownMonth=month;}
      else if(shownSurvey!==riverSurvey)publishRiver(frame,riverSurvey);
      showHighWater(focus,layer==='water');
      particles.choose(model,frame,focus,layer);
      particles.update(time);
      return {frame,year:model.frames};
    },
    update(dt){if(root.visible&&!reduced){time+=dt;particles.update(time);}},
    hide(){
      if(!root.visible)return;
      root.visible=false;shownMonth=-1;
      originals.forEach((o,i)=>{o.visible=oldVisibility[i];});
      weather.setAnnualClimate(null);
    }
  };
}

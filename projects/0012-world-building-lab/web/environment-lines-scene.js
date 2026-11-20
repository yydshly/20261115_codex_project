import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {transitionBelts} from './environment-transitions.js';
import {sampleLine,sweep} from './environment-lines.js';
import {buildGeographicFoundation,foundationLayers,foundationScale,foundationWind} from './geographic-foundation.js';
import {karstSeaGeometry} from './karst-scene.js';
import {surveyFoundationPassage} from './foundation-passage.js';

export const lineThemes=foundationLayers;

function lineMaterial(color,opacity=.85){
  return new THREE.LineBasicMaterial({color,transparent:true,opacity,depthTest:false,depthWrite:false,toneMapped:false});
}

function vector(p,offset){
  return new THREE.Vector3(p.x,Math.max(0,p.level??0,terrainHeight(p.x,p.z))+offset,p.z);
}

function edgeStrokes(edges,color,offset,opacity){
  const points=edges.flatMap(edge=>edge.map(p=>vector(p,offset)));
  const object=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),lineMaterial(color,opacity));
  object.renderOrder=30;
  return object;
}

function lineStroke(points,color,offset,opacity=.9){
  const object=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>vector(p,offset))),
    lineMaterial(color,opacity));
  object.renderOrder=32;
  return object;
}

function outline(points,half,offset,color,opacity=.9){
  const position=[],indices=[];
  for(let i=0;i<points.length;i++){
    const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
    const d=Math.hypot(b.x-a.x,b.z-a.z)||1;
    const y=Math.max(0,p.y,p.level)+offset,nx=(b.z-a.z)/d,nz=(a.x-b.x)/d;
    position.push(p.x+nx*half,y,p.z+nz*half,p.x-nx*half,y,p.z-nz*half);
    if(i){const k=i*2;indices.push(k-2,k-1,k,k-1,k+1,k);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setIndex(indices);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
    color,transparent:true,opacity,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false
  }));
  mesh.renderOrder=34;
  return mesh;
}

function groundPolyline(positions){
  return positions.flatMap(([x,z],i)=>{
    if(!i)return [{x,z}];
    const [ax,az]=positions[i-1],steps=Math.ceil(Math.hypot(x-ax,z-az)/18);
    return sweep(steps,t=>({x:ax+(x-ax)*t,z:az+(z-az)*t})).slice(1);
  }).map(p=>({...p,y:terrainHeight(p.x,p.z),level:0}));
}

function windArrows(month){
  const {arrows,name}=foundationWind(month);
  const positions=[],labels=[];
  function arrow(x,z,di,dj,length){
    const y=Math.max(0,terrainHeight(x,z),terrainHeight(x+di*length,z+dj*length))+59;
    const at=(s,w)=>[x+s*di+w*dj,y,z+s*dj-w*di];
    const a=at(0,8),b=at(0,-8),c=at(length-38,8),d=at(length-38,-8);
    positions.push(...a,...b,...c,...b,...d,...c,...at(length-42,22),...at(length-42,-22),...at(length,0));
    return {x:x+di*length*.36,y:y+10,z:z+dj*length*.36};
  }
  arrows.forEach(({x,z,dx,dz,length,text})=>{
    const p=arrow(x,z,dx,dz,length);
    if(text)labels.push({kind:'wind',text,...p});
  });
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  return {geometry:g,labels,name};
}

function scaleMarks(){
  const {origin,north,length}=foundationScale,y=100,points=[];
  const edge=(a,b)=>points.push(new THREE.Vector3(a.x,y,a.z),new THREE.Vector3(b.x,y,b.z));
  edge(origin,{x:origin.x+length,z:origin.z});
  for(const step of [0,length/2,length]){
    const x=origin.x+step;edge({x,z:origin.z-21},{x,z:origin.z+21});
  }
  const point={x:north.x,z:north.z-105};
  edge(north,point);
  edge(point,{x:point.x-24,z:point.z+34});edge(point,{x:point.x+24,z:point.z+34});
  const mesh=new THREE.Group();
  const backing=new THREE.Mesh(new THREE.PlaneGeometry(length+72,90),
    new THREE.MeshBasicMaterial({color:'#28433b',transparent:true,opacity:.93,depthTest:false,depthWrite:false,toneMapped:false}));
  backing.rotation.x=-Math.PI/2;
  backing.position.set(origin.x+length/2,y-1,origin.z);
  backing.renderOrder=38;
  const ticks=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),lineMaterial('#fff5d5',1));
  ticks.renderOrder=39;
  mesh.add(backing,ticks);
  return {mesh,labels:[
    {kind:'scale',text:'1 km',x:origin.x+length,y:y+15,z:origin.z+65},
    {kind:'scale',text:'N 北',x:point.x,y:y+32,z:point.z}
  ]};
}

export function createEnvironmentLinesScene(scene,balance,sea=null,groundStep){
  const root=new THREE.Group();
  root.name='three environmental transects';root.visible=false;scene.add(root);
  const layers=Object.fromEntries(lineThemes.map(({id})=>{
    const group=new THREE.Group();root.add(group);return [id,group];
  }));
  const wind=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({
    color:lineThemes[2].color,transparent:true,opacity:.87,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false
  }));
  wind.renderOrder=36;layers.wind.add(wind);
  const marks=new THREE.Group(),feeders=new THREE.Group();root.add(marks,feeders);
  const scale=scaleMarks();root.add(scale.mesh);
  const seamMarker=new THREE.Mesh(new THREE.TorusGeometry(16,1.6,8,36),new THREE.MeshBasicMaterial({
    color:'#f8dc98',depthTest:false,depthWrite:false,toneMapped:false
  }));
  seamMarker.rotation.x=-Math.PI/2;seamMarker.renderOrder=40;root.add(seamMarker);
  const routeMeshes=new Map(),sections=new Map();
  let savedSeaGeometry,cutSeaGeometry;
  let world,foundation,routes,windState,shownMonth,localRidge;
  const location=(kind,text,x,z)=>({kind,text,x,z,y:Math.max(0,terrainHeight(x,z))+23});
  function init(){
    world=balance.model;
    foundation=buildGeographicFoundation(world);
    const {coast,divides,localDivides}=foundation.coast;
    layers.shore.add(edgeStrokes(coast,lineThemes[0].color,4,.79));
    layers.divide.add(edgeStrokes(divides,lineThemes[3].color,8,.93));
    const dashes=localDivides.map(([a,b])=>[
      {x:a.x+(b.x-a.x)*.14,z:a.z+(b.z-a.z)*.14},
      {x:a.x+(b.x-a.x)*.82,z:a.z+(b.z-a.z)*.82}
    ]);
    layers.divide.add(edgeStrokes(dashes,'#d4afff',10,.67));
    const ridgeDistance=p=>Math.hypot(p.x+625,p.z-1107);
    localRidge=localDivides.map(([a,b])=>({x:(a.x+b.x)*.5,z:(a.z+b.z)*.5}))
      .sort((a,b)=>ridgeDistance(a)-ridgeDistance(b))[0];
    for(const belt of foundation.ridges){
      const points=groundPolyline(belt.points.map(p=>[p.x,p.z]));
      layers.relief.add(outline(points,3.1,5,lineThemes[1].color,.76));
    }
    for(const {id,paths} of foundation.feeders){
      for(const points of paths)feeders.add(lineStroke(points,id==='south'?'#9be6b0':'#8bc6e4',6,.7));
    }
    for(const belt of transitionBelts){
      const points=groundPolyline(belt.points);
      const trace=outline(points,14,1.4,belt.id==='lee'?'#d7c294':'#b4d197',.14);
      trace.material.depthTest=true;
      trace.name='transition '+belt.id;
      marks.add(trace);
    }
    routes=foundation.routes.map(route=>sampleLine(route,terrainHeight));
    for(const route of routes){
      const group=new THREE.Group();
      const track=outline(route.points,5,10,route.color);
      group.add(track);
      const points=route.stations.map(station=>vector(station.p,15));
      const dots=new THREE.Points(new THREE.BufferGeometry().setFromPoints(points),
        new THREE.PointsMaterial({color:route.color,size:8,sizeAttenuation:false,depthTest:false,depthWrite:false,toneMapped:false}));
      dots.renderOrder=37;group.add(dots);root.add(group);routeMeshes.set(route.id,group);
    }
    for(const seam of foundation.seams){
      const profile=sampleLine({id:seam.id,color:'#ffd898',path:seam.section,stops:[]},terrainHeight);
      const trace=new THREE.Group();
      trace.name=seam.name;trace.visible=false;root.add(trace);
      sections.set(seam.id,{profile,trace});
    }
  }
  function passageFor(seam){
    if(!seam)return null;
    const section=sections.get(seam.id);
    if(section.passage)return section.passage;
    const passage=surveyFoundationPassage(seam.section,groundStep);
    for(const run of passage.runs){
      // Subsample the inspected trace for drawing, retaining end points.
      const points=run.points.filter((_,i)=>i%16===0||i===run.points.length-1)
        .map(p=>new THREE.Vector3(p.x,p.y+5,p.z));
      const geometry=new THREE.BufferGeometry().setFromPoints(points);
      const material=run.method==='walk'
        ?lineMaterial('#adf4b2',1)
        :new THREE.LineDashedMaterial({color:'#ffd898',dashSize:12,gapSize:6,depthTest:false,depthWrite:false,toneMapped:false});
      const line=new THREE.Line(geometry,material);
      line.computeLineDistances();line.renderOrder=41;section.trace.add(line);
    }
    section.passage=passage;
    return passage;
  }
  function annotation(station,enabled,seam,whole){
    const reference=foundation.anchors.filter(p=>enabled.has(p.kind))
      .map(({kind,text,x,z})=>location(kind,text,x,z));
    if(enabled.has('divide')&&localRidge)reference.push(location('divide','估算局地分水界',localRidge.x,localRidge.z));
    if(enabled.has('wind'))reference.unshift(...windState.labels);
    if(whole)reference.unshift(...scale.labels);
    if(station)reference.unshift(location('station',station.name,station.p.x,station.p.z));
    if(seam)reference.unshift(location('seam',seam.name,seam.x,seam.z));
    return reference;
  }
  function showSeaBed(show){
    if(!sea)return;
    if(show&&!savedSeaGeometry){
      savedSeaGeometry=sea.geometry;
      cutSeaGeometry??=karstSeaGeometry(30000,false,true);
      sea.geometry=cutSeaGeometry;
    }else if(!show&&savedSeaGeometry){
      sea.geometry=savedSeaGeometry;
      savedSeaGeometry=null;
    }
  }
  return {
    get routes(){if(!routes)init();return routes;},
    show(route,station,month,enabled,seam=null,seaBed=false){
      if(!routes)init();
      root.visible=true;
      balance.show(month,'all','water');
      if(shownMonth!==month){
        windState=windArrows(month);
        wind.geometry.dispose();wind.geometry=windState.geometry;
        shownMonth=month;
      }
      for(const [id,group] of routeMeshes)group.visible=route===null||id===route.id;
      for(const [id,group] of Object.entries(layers))group.visible=enabled.has(id);
      feeders.visible=route===null||route.id==='water'||enabled.has('divide');
      showSeaBed(seam?.id==='east'&&seaBed);
      const passage=passageFor(seam);
      for(const [id,{trace}] of sections)trace.visible=id===seam?.id;
      seamMarker.visible=!!seam;
      if(seam)seamMarker.position.copy(vector(seam,10));
      const whole=!route&&!seam;
      scale.mesh.visible=whole;
      return {annotations:annotation(station,enabled,seam,whole),climate:world.climate,frame:world.climate.frames[month-1],
        wind:windState.name,section:sections.get(seam?.id)?.profile,passage};
    },
    hide(){if(root.visible){root.visible=false;showSeaBed(false);balance.hide();}}
  };
}

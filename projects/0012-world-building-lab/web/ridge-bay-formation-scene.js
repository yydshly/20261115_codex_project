import * as THREE from 'three';
import {formationHabitat} from './world-formation.js';
import {formationMaterials} from './world-hydraulics.js';
import {wetlandBands} from './wetland-layout.js';

const colors={route:'#f8d28a',ground:'#fff1d0',compare:'#edc8ff',water:'#73d8f3',
  surface:'#79d9ff',runoff:'#a0f4e5'};

function mesh(positions,{color='#ffffff',opacity=1,order=40,vertexColors=null}){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  if(vertexColors)geometry.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));
  // Survey overlays stay readable through the terrain and never write to its depth buffer.
  const material=new THREE.MeshBasicMaterial({color,opacity,transparent:true,
    vertexColors:!!vertexColors,depthTest:false,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  const object=new THREE.Mesh(geometry,material);
  object.renderOrder=order;
  return object;
}

function stroke(points,color,order,dashed=false){
  const geometry=new THREE.BufferGeometry().setFromPoints(points);
  const style={color,transparent:true,depthTest:false,depthWrite:false,toneMapped:false};
  const material=dashed?new THREE.LineDashedMaterial({...style,dashSize:4,gapSize:2.8}):new THREE.LineBasicMaterial(style);
  const object=new THREE.Line(geometry,material);
  if(dashed)object.computeLineDistances();
  object.renderOrder=order;
  return object;
}

function stripEdges(points,width,lift,offset=0){
  return points.map((p,i)=>{
    const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
    const edge=side=>[p.x+dz*side/len,p.y+lift,p.z-dx*side/len];
    return [edge(offset-width),edge(offset+width)];
  });
}

function addQuad(vertices,a,b,c,d){
  vertices.push(...a,...b,...c,...b,...d,...c);
}

function ribbon(points,width,lift,style){
  const vertices=[],edges=stripEdges(points,width,lift);
  for(let i=1;i<edges.length;i++)addQuad(vertices,...edges[i-1],...edges[i]);
  return mesh(vertices,style);
}

function sampleBands(points){
  const vertices=[],tints=[],color=new THREE.Color();
  const addBand=(edges,pick)=>{
    for(let i=1;i<edges.length;i++){
      const tint=pick(points[i-1]);
      if(!tint)continue;
      addQuad(vertices,...edges[i-1],...edges[i]);
      color.set(tint);
      for(let j=0;j<6;j++)tints.push(color.r,color.g,color.b);
    }
  };
  addBand(stripEdges(points,1.25,.52,-1.45),p=>formationMaterials[p.material]?.color);
  addBand(stripEdges(points,1.25,.56,1.45),p=>(wetlandBands[p.habitat]??formationHabitat[p.habitat])?.color);
  return mesh(vertices,{vertexColors:tints,opacity:.83,order:43});
}

function sectionWater(points){
  const water=[],rim=[];
  const surface=p=>Number.isFinite(p.water)?Math.max(p.water,p.y):p.y;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],za=surface(a),zb=surface(b);
    if(Math.max(za-a.y,zb-b.y)<.04)continue;
    addQuad(water,[a.x,a.y+.39,a.z],[a.x,za+.39,a.z],[b.x,b.y+.39,b.z],[b.x,zb+.39,b.z]);
    rim.push(new THREE.Vector3(a.x,za+.40,a.z),new THREE.Vector3(b.x,zb+.40,b.z));
  }
  if(!water.length)return [];
  const geometry=new THREE.BufferGeometry().setFromPoints(rim);
  const edge=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:colors.water,transparent:true,
    depthTest:false,depthWrite:false,toneMapped:false}));
  edge.renderOrder=46;
  return [mesh(water,{color:colors.water,opacity:.30,order:44}),edge];
}

function sectionComparison(points){
  const shapes=[],face=[],segments=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    if(!Number.isFinite(a.compareY)||!Number.isFinite(b.compareY)){
      if(segments.length>1)shapes.push(stroke(segments,colors.compare,47,true));
      segments.length=0;
      continue;
    }
    const v=(p,y)=>new THREE.Vector3(p.x,y+.18,p.z);
    if(!segments.length)segments.push(v(a,a.compareY));
    segments.push(v(b,b.compareY));
    addQuad(face,[a.x,a.y,a.z],[a.x,a.compareY,a.z],[b.x,b.y,b.z],[b.x,b.compareY,b.z]);
  }
  if(segments.length>1)shapes.push(stroke(segments,colors.compare,47,true));
  if(face.length)shapes.push(mesh(face,{color:colors.compare,opacity:.14,order:42}));
  return shapes;
}

function flowArrows({kind,points}){
  const color=colors[kind]??colors.surface;
  const flow=ribbon(points,.56,1.15,{color,opacity:.84,order:48});
  const arrows=[];
  const lift=1.25;
  let distance=0,arrowAt=9;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z;
    const span=Math.hypot(dx,dz);
    if(span<.001)continue;
    const nx=dx/span,nz=dz/span,slope=(b.y-a.y)/span;
    while(arrowAt<=distance+span){
      const at=arrowAt-distance,x=a.x+nx*at,z=a.z+nz*at,y=a.y+slope*at+lift;
      arrows.push(x,y,z,x-nx*4+nz*1.85,y-slope*4,z-nz*4-nx*1.85,
        x-nx*4-nz*1.85,y-slope*4,z-nz*4+nx*1.85);
      arrowAt+=23;
    }
    distance+=span;
  }
  return arrows.length?[flow,mesh(arrows,{color,opacity:.97,order:49})]:[flow];
}

function release(group){
  for(const object of group.children){
    object.geometry.dispose();
    object.material.dispose();
  }
  group.clear();
}

export function createRidgeBayFormationScene(scene){
  const root=new THREE.Group(),route=new THREE.Group(),section=new THREE.Group(),comparison=new THREE.Group();
  root.name='雪岭到中央海湾形成剖面';
  route.name='雪岭到中央海湾导览线';
  section.name='当前站实景横断面';
  comparison.name='同坐标对照地形';
  root.add(route,section,comparison);
  root.visible=false;
  scene.add(root);
  let lastRoute,lastReading;

  function show(model,reading,{compare=false}={}){
    root.visible=true;
    comparison.visible=compare;
    if(model.route!==lastRoute){
      release(route);
      route.add(ribbon(model.route,4.6,1.8,{color:'#344444',opacity:.82,order:38}),
        ribbon(model.route,2.5,1.9,{color:colors.route,order:39}));
      lastRoute=model.route;
    }
    if(reading===lastReading)return;
    release(section);
    release(comparison);
    const {points,flows=[]}=reading;
    section.add(sampleBands(points),...sectionWater(points),
      stroke(points.map(p=>new THREE.Vector3(p.x,p.y+.61,p.z)),colors.ground,45));
    for(const flow of flows){
      if(flow.points.length>1)section.add(...flowArrows(flow));
    }
    const references=sectionComparison(points);
    if(references.length)comparison.add(...references);
    lastReading=reading;
  }

  function hide(){
    root.visible=false;
    release(route);
    release(section);
    release(comparison);
    lastRoute=null;
    lastReading=null;
  }
  return {show,hide};
}

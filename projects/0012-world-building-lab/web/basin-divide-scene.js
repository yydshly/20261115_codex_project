import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {buildBasinDivides,divideColors} from './basin-divide.js';
import {basinCellWater} from './basin-event-model.js';
import {formationCell} from './world-formation.js';
import {formationMaterials} from './world-hydraulics.js';

const material=(color,opacity=1)=>new THREE.MeshBasicMaterial({
  color,opacity,transparent:opacity<1,side:THREE.DoubleSide,toneMapped:false,depthTest:false,depthWrite:false
});
const point=(p,lift=3)=>new THREE.Vector3(p.x,Math.max(terrainHeight(p.x,p.z),p.y??p.level??-Infinity)+lift,p.z);

function ribbon(path,color,width,order,lift=4){
  const positions=[];
  for(let i=1;i<path.length;i++){
    const a=point(path[i-1],lift),b=point(path[i],lift);
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    if(length<.001)continue;
    const p=width*dz/length,q=-width*dx/length;
    const left=v=>[v.x+p,v.y,v.z+q],right=v=>[v.x-p,v.y,v.z-q];
    positions.push(...left(a),...right(a),...left(b),...right(a),...right(b),...left(b));
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const mesh=new THREE.Mesh(geometry,material(color,.91));mesh.renderOrder=order;
  return mesh;
}

function dashed(path,color){
  const geometry=new THREE.BufferGeometry().setFromPoints(path.map(p=>point(p,6)));
  const line=new THREE.Line(geometry,new THREE.LineDashedMaterial({
    color,dashSize:8,gapSize:5,depthTest:false,depthWrite:false,toneMapped:false
  }));
  line.computeLineDistances();line.renderOrder=52;return line;
}

function rockSection(points){
  const geometry=new THREE.BufferGeometry(),vertices=[],colors=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],surface=4,cover=a.cover===a.rock?1.6:4;
    for(const [upper,lower,key] of [[surface,surface-cover,a.cover],[surface-cover,surface-17,a.rock]]){
      const v=(p,dy)=>[p.x,p.y+dy,p.z];
      vertices.push(...v(a,upper),...v(a,lower),...v(b,upper),...v(a,lower),...v(b,lower),...v(b,upper));
      const tint=new THREE.Color(formationMaterials[key].color).multiplyScalar(upper===surface?1:.67);
      for(let j=0;j<6;j++)colors.push(...tint.toArray());
    }
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const skin=material('#ffffff',.79);skin.vertexColors=true;
  const mesh=new THREE.Mesh(geometry,skin);mesh.renderOrder=50;
  return mesh;
}

export function createBasinDivideScene(parent,model){
  const root=new THREE.Group();root.name='rainfall along the three drainage divides';
  root.visible=false;parent.add(root);
  const cases=buildBasinDivides(model),ring=new THREE.RingGeometry(.67,1,32);
  ring.rotateX(-Math.PI/2);
  const active=new THREE.Mesh(ring,material('#f4edd0',.88));
  active.renderOrder=56;root.add(active);
  const down=new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),new THREE.Vector3(),1,divideColors.shallow);
  const up=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),1,divideColors.shallow);
  for(const item of [down,up]){
    for(const child of item.children){
      child.material.depthTest=false;child.material.depthWrite=false;child.renderOrder=55;
    }
    root.add(item);
  }

  const groups=cases.map(entry=>{
    const group=new THREE.Group(),{boundary,local,slope,section,waterway,handoff,springCreek,stops}=entry;
    group.name=entry.basin.id;root.add(group);
    const rock=rockSection(section);
    const water=ribbon(waterway,divideColors.surface,3.3,51);
    const markers=stops.map((p,i)=>{
      const marker=new THREE.Mesh(ring,material(i===2?divideColors.shallow:entry.basin.color,.85));
      marker.position.copy(point(p,i===0?9:5));marker.scale.setScalar(i===0?12:8);marker.renderOrder=54;
      return marker;
    });
    group.add(rock,water,...markers,ribbon(boundary,divideColors.divide,4,53,7),
      ribbon(local,divideColors.local,1.7,51,6),
      ribbon(slope,divideColors.surface,2.8,52,7),dashed(handoff,divideColors.surface));
    if(springCreek.length)group.add(ribbon(springCreek,divideColors.shallow,1.6,55,6));
    return {group,rock,entry};
  });

  function show(event,focus,index,hour){
    root.visible=true;
    const all=focus==='all';
    for(const {group,rock,entry} of groups){
      group.visible=all||entry.basin.id===focus;
      rock.visible=!all&&index===1;
    }
    active.visible=!all;down.visible=false;up.visible=false;
    const entry=cases.find(item=>item.basin.id===focus);
    if(!entry)return {cases,entry:null,stop:null,water:null};
    const stop=entry.stops[index];
    active.position.copy(point(stop,8));active.scale.setScalar(index===3?19:13);
    const frame=event.results.find(r=>r.basin.id===focus).frames[hour];
    const read=stop.read??stop,k=formationCell(model.study.grid,read.x,read.z),i=entry.byCell.get(k);
    const water=stop.read&&i!==undefined?basinCellWater(frame,i):null;
    if(water&&index===1&&water.infiltration>.01){
      const size=11+Math.min(10,water.infiltration);
      down.position.copy(point(stop,size*.7));down.setLength(size,4,4);down.visible=true;
    }
    if(water&&index===2&&!entry.springCreek.length&&water.baseflow>.01){
      const size=9+Math.min(9,water.baseflow*15);
      up.position.copy(point(stop,-1));up.setLength(size,3.5,4);up.visible=true;
    }
    return {cases,entry,stop,water,stage:frame.readings[stop.node]};
  }

  return {show,hide(){root.visible=false;}};
}

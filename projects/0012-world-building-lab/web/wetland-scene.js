import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {riverSample} from './water-system.js';
import {createPlantBatcher} from './vegetation-scene.js';
import {buildWetlandModel,wetlandPlotAt,wetlandBands} from './wetland-layout.js';

const tones={
  flooded:new THREE.Color('#53bef8'),damp:new THREE.Color('#ab6c41'),saturated:new THREE.Color('#76bfa5'),
  eventMud:new THREE.Color('#db9a57'),
  ...Object.fromEntries(Object.entries(wetlandBands).map(([id,b])=>[id,new THREE.Color(b.color)]))
};

function overlayGeometry(model){
  const geometry=new THREE.BufferGeometry(),pos=[],colors=new Float32Array(model.points.length*4);
  for(const p of model.points)pos.push(p.x,p.bed+.13,p.z);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,4));
  geometry.setIndex(model.triangles);
  return geometry;
}

function tintSurface(geometry,model,frame,layer){
  const position=geometry.getAttribute('position'),color=geometry.getAttribute('color');
  for(const [i,p] of model.points.entries()){
    const r=frame.readings[i],edge=Math.min(1,p.row/4,(model.rows-p.row)/4,p.col/4,(model.cols-p.col)/4);
    const y=r.flooded?p.bed+r.depth+.12:p.bed+.15;
    let tone=tones[p.band],alpha=p.band==='channel'?.26:.66;
    if(layer==='water'){
      tone=r.flooded?tones.flooded:r.exposed?tones.damp:tones.saturated;
      alpha=r.flooded?(p.lowFlooded?0:.69):r.exposed?.77:r.damp?.40:0;
    }
    if(layer==='storm'){
      tone=r.flooded?tones.flooded:tones.eventMud;
      alpha=r.newFlood?.84:r.retreated?.84:0;
    }
    if(layer==='sediment'){
      tone=tones.eventMud;
      alpha=r.eventTouched?.78:0;
    }
    position.setY(i,y);
    color.setXYZW(i,tone.r,tone.g,tone.b,alpha*edge);
  }
  position.needsUpdate=true;color.needsUpdate=true;
}

function makePlants(root,model){
  const byKind=new Map(),batch=createPlantBatcher(),tint=new THREE.Color();
  for(const p of model.plants){
    if(!byKind.has(p.kind))byKind.set(p.kind,[]);
    byKind.get(p.kind).push(p);
  }
  const groups=[...byKind].map(([kind,plants])=>{
    const object=batch(kind,plants);
    for(const mesh of object.children)mesh.castShadow=false;
    root.add(object);return {kind,plants,meshes:object.children};
  });
  return frame=>{
    const winter=frame.phase.month===1?.24:0;
    for(const {kind,plants,meshes} of groups){
      for(const mesh of meshes){
        plants.forEach(({index},i)=>{
          const r=frame.readings[index];
          const dryness=Math.min(.65,Math.max(0,.71-r.moisture)*.82+winter);
          tint.setRGB(kind==='reed'?1:.92,1-dryness*.44,1-dryness*.64);
          mesh.setColorAt(i,tint);
        });
        mesh.instanceColor.needsUpdate=true;
      }
    }
  };
}

function sectionTrack(t){
  const p=riverSample(t);
  return Array.from({length:38},(_,i)=>{
    const d=p.half*(-1.43+2.86*i/37),x=p.x+p.nx*d,z=p.z+p.nz*d;
    return new THREE.Vector3(x,terrainHeight(x,z)+.46,z);
  });
}

export function createWetlandScene(scene,balance,originalPlants){
  const root=new THREE.Group();root.visible=false;root.name='river flooding and wetland vegetation zones';scene.add(root);
  const plants=new THREE.Group();root.add(plants);
  let model,ground,labels,tintPlants,lastFrame,lastLayer,ownsBalance=false,ownsPlants=false;
  const mark=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({
    color:'#fef2cc',transparent:true,opacity:.79,depthTest:false,depthWrite:false
  }));
  mark.renderOrder=18;root.add(mark);
  let sectionT=null;

  function init(){
    if(model)return;
    model=buildWetlandModel(balance.model,terrainHeight);
    ground=new THREE.Mesh(overlayGeometry(model),new THREE.MeshBasicMaterial({
      vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
    }));
    ground.name='connected flood and exposed mud survey';
    ground.renderOrder=11;ground.frustumCulled=false;root.add(ground);
    tintPlants=makePlants(plants,model);
    labels=model.stations.map(s=>{
      const p=s.point,level=Math.max(p.bed,p.high);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(3.3,.39,6,24),new THREE.MeshBasicMaterial({
        color:s.color,toneMapped:false
      }));
      ring.position.set(p.x,level+1.35,p.z);ring.rotation.x=-Math.PI/2;root.add(ring);
      return {id:s.id,text:s.name,x:p.x,z:p.z,y:level+7.7,color:s.color,ring};
    });
  }

  return {
    get model(){init();return model;},
    show({phase,station,layer='water',peak=true,overlay=false,event=null,source=null,managePlants=true}){
      init();
      const frame=event?model.frameForEvent(source,event):model.frameFor(phase);
      if(!root.visible){
        if(managePlants){originalPlants?.setLocalMask(wetlandPlotAt);ownsPlants=true;}
        root.visible=true;
      }
      if(!overlay){
        balance.show(phase.month,peak?'wetland':'all','water',{riverSurvey:frame.survey});
        ownsBalance=true;
      }
      if(frame!==lastFrame)tintPlants(frame);
      if(layer!=='natural'&&(frame!==lastFrame||layer!==lastLayer))tintSurface(ground.geometry,model,frame,layer);
      lastFrame=frame;lastLayer=layer;
      ground.visible=layer!=='natural';
      mark.visible=!!station&&!overlay;
      if(mark.visible&&station.point.t!==sectionT){
        mark.geometry.dispose();
        mark.geometry=new THREE.BufferGeometry().setFromPoints(sectionTrack(station.point.t));
        sectionT=station.point.t;
      }
      for(const p of labels)p.ring.visible=!overlay&&(!station||station.id===p.id);
      return {frame,labels:overlay?labels.filter(p=>['seasonal','permanent'].includes(p.id)):
        station?labels.filter(p=>p.id===station.id):labels};
    },
    hide(){
      if(!root.visible)return;
      root.visible=false;
      if(ownsPlants){originalPlants?.setLocalMask(null);ownsPlants=false;}
      if(ownsBalance){balance.hide();ownsBalance=false;}
    }
  };
}

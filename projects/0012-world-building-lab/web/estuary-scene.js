import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {clippedWaterGeometry} from './watershed-balance-scene.js';
import {createPlantBatcher} from './vegetation-scene.js';
import {buildEstuaryModel,estuaryBounds,estuaryPlantPlot,saltColors,seaSalinity,tidalCourse,estuarySeasons} from './estuary-layout.js';
import {sedimentPlume} from './storm-sediment.js';

const palette=saltColors.map(c=>new THREE.Color(c));
const bands=[0,5,15,seaSalinity];
const smooth=t=>{const u=Math.max(0,Math.min(1,t));return u*u*(3-2*u);};
const saltColor=(value,out)=>{
  const i=value<5?0:value<15?1:2;
  return out.copy(palette[i]).lerp(palette[i+1],Math.max(0,Math.min(1,(value-bands[i])/(bands[i+1]-bands[i]))));
};
const markerColors={fresh:'#81deab',fork:'#7fcce5',flat:'#ecc787',bay:'#bcbee9',salt:'#ffc28d',tide:'#edf2cb'};

export function seaAroundEstuary(geometry){
  const shape=geometry.parameters.shapes.clone(),b=estuaryBounds;
  const hole=new THREE.Path();
  hole.moveTo(b.minX,-b.maxZ);hole.lineTo(b.minX,-b.minZ);
  hole.lineTo(b.maxX,-b.minZ);hole.lineTo(b.maxX,-b.maxZ);hole.closePath();
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape,64);
}

function mudGeometry(model){
  const positions=[],indices=[],colors=new Float32Array(model.bed.length*4);
  for(const p of model.bed)positions.push(p.x,p.bed+.12,p.z);
  for(const {indices:[a,b,c,d]} of model.cells)indices.push(a,c,b,b,c,d);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new THREE.BufferAttribute(colors,4));g.setIndex(indices);
  return g;
}

function makeArrows(root,color,count){
  const geometry=new THREE.ConeGeometry(1.9,7,6),material=new THREE.MeshBasicMaterial({color,toneMapped:false});
  const arrows=Array.from({length:count},()=>new THREE.Mesh(geometry,material));
  root.add(...arrows);return arrows;
}

function updateArrows(arrows,course,tide,state,time){
  const reverse=tide<0;
  for(const [i,arrow] of arrows.entries()){
    arrow.visible=tide!==0;
    if(!arrow.visible)continue;
    const u=(i/arrows.length+time*.24+.09)%1;
    const along=(reverse?1-u:u)*(course.length-2),k=Math.floor(along);
    const point=course[k],next=course[k+1];
    const mix=THREE.MathUtils.lerp,t=along-k;
    arrow.position.set(mix(point.x,next.x,t),
      mix(Math.max(state.survey.levelAt(point),point.bed),Math.max(state.survey.levelAt(next),next.bed),t)+.75,
      mix(point.z,next.z,t));
    const yaw=Math.atan2(next.x-point.x,next.z-point.z)+(reverse?Math.PI:0);
    arrow.rotation.set(Math.PI/2,0,-yaw,'YXZ');
  }
}

export function createEstuaryScene(scene,balance,{sea,water,vegetation,reduced=false}){
  const root=new THREE.Group(),plants=new THREE.Group(),arrows=new THREE.Group();
  root.visible=false;root.name='estuary tide, tidal flats and salt mixing';root.add(plants,arrows);scene.add(root);
  const originalSea=sea.geometry;
  const saltMaterial=new THREE.MeshBasicMaterial({
    vertexColors:true,transparent:true,opacity:.79,depthWrite:false,toneMapped:false,side:THREE.DoubleSide
  });
  const sectionMaterial=new THREE.MeshBasicMaterial({color:'#ded8a7',transparent:true,opacity:.8,depthWrite:false});
  const tint=new THREE.Color(),mudTone=new THREE.Color('#b08358'),eventMudTone=new THREE.Color('#db9a57');
  let model,localSea,body,saltCover,mud,labels,plantLabels,fronts,mark,waterArrows,tideArrows,courses,lastFrame,lastMudFrame,state;
  let time=0,standalone=false,ownsPlants=false,lastPlume=null;
  const plumeTone=new THREE.Color('#b98e59').toArray();

  function initialize(){
    if(model)return;
    model=buildEstuaryModel(balance.model,terrainHeight);
    localSea=seaAroundEstuary(originalSea);
    body=new THREE.Mesh(new THREE.BufferGeometry(),sea.material);
    body.renderOrder=10;root.add(body);
    saltCover=new THREE.Mesh(body.geometry,saltMaterial);
    saltCover.position.y=.06;saltCover.renderOrder=11;root.add(saltCover);
    mud=new THREE.Mesh(mudGeometry(model),new THREE.MeshBasicMaterial({
      vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
    }));
    mud.renderOrder=8;root.add(mud);
    const batch=createPlantBatcher(),groups=new Map();
    for(const p of model.plants){
      if(!groups.has(p.kind))groups.set(p.kind,[]);
      groups.get(p.kind).push(p);
    }
    for(const [kind,points] of groups){
      const group=batch(kind,points);
      for(const mesh of group.children)mesh.castShadow=false;
      plants.add(group);
    }
    plantLabels=[['reed',-1408,-223,'芦苇 · 低盐浅岸','#bce6aa'],['rush',-1485,-190,'耐盐草 · 潮湿泥岸','#e1c390']]
      .map(([kind,x,z,text,color])=>{
        const cost=p=>Math.hypot(p.x-x,p.z-z);
        const p=groups.get(kind).reduce((a,b)=>cost(a)<cost(b)?a:b);
        return {id:kind,text,color,x:p.x,z:p.z,y:p.y+8};
      });
    labels=model.stations.map(p=>{
      const y=Math.max(p.level??0,p.bed)+9;
      const ring=new THREE.Mesh(new THREE.TorusGeometry(5.8,.67,6,30),
        new THREE.MeshBasicMaterial({color:markerColors[p.id],toneMapped:false}));
      ring.rotation.x=-Math.PI/2;ring.position.set(p.x,y-7,p.z);root.add(ring);
      return {id:p.id,x:p.x,z:p.z,y,text:p.name,color:markerColors[p.id],ring};
    });
    fronts=Object.fromEntries(['tide','salt'].map(id=>{
      const pin=new THREE.Group(),block=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,10,8),
        new THREE.MeshBasicMaterial({color:markerColors[id],toneMapped:false}));
      const ball=new THREE.Mesh(new THREE.SphereGeometry(2.6,9,6),block.material);
      block.position.y=5;ball.position.y=10.4;pin.add(block,ball);root.add(pin);
      return [id,pin];
    }));
    mark=new THREE.Line(new THREE.BufferGeometry(),sectionMaterial);root.add(mark);
    waterArrows=makeArrows(arrows,'#b8edff',7);
    tideArrows=[makeArrows(arrows,'#ffe1a4',7),makeArrows(arrows,'#ffe1a4',7)];
    courses=[tidalCourse(0).slice(0,35),tidalCourse(1),tidalCourse(2)]
      .map(course=>course.map(p=>({...p,bed:terrainHeight(p.x,p.z)})));
  }

  function installWater(frame,shore,plume){
    if(frame!==lastFrame||plume!==lastPlume){
      const levels=new Map(frame.bed.map((p,i)=>[p,frame.levels[i]]));
      body.geometry.dispose();
      const densities=[];
      const heightAt=frame.bedChange?(x,z)=>terrainHeight(x,z)+model.deltaAt(frame.bedChange,x,z):terrainHeight;
      const geometry=clippedWaterGeometry({bed:frame.bed,cells:model.cells},p=>levels.get(p),{waterMask:frame.wet,heightAt,
        colorAt:p=>{
          if(!plume)return saltColor(frame.salinityAt(p),tint).toArray();
          densities.push(sedimentPlume(plume,p.t,p.breadth));
          return plumeTone;
        }});
      const positions=geometry.getAttribute('position'),rgb=geometry.getAttribute('color'),uv=geometry.getAttribute('uv');
      const rgba=new Float32Array(positions.count*4),b=estuaryBounds;
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),z=positions.getZ(i);
        const edge=smooth(Math.min(x-b.minX,b.maxX-x,z-b.minZ,b.maxZ-z)/100);
        rgba.set([rgb.getX(i),rgb.getY(i),rgb.getZ(i),edge*(plume?densities[i]:1)],i*4);
        uv.setXY(i,x,-z);
      }
      geometry.setAttribute('color',new THREE.BufferAttribute(rgba,4));
      body.geometry=saltCover.geometry=geometry;
      lastFrame=frame;lastPlume=plume;
    }
    if(frame!==lastMudFrame){
      const attribute=mud.geometry.getAttribute('color');
      const tone=shore?eventMudTone:mudTone;
      for(let i=0;i<model.bed.length;i++){
        const dry=shore?shore.damp[i]:model.referenceHigh.wet[i]&&!model.referenceLow.wet[i]&&!frame.wet[i];
        attribute.setXYZW(i,tone.r,tone.g,tone.b,dry?(shore?.86:.78):0);
      }
      attribute.needsUpdate=true;lastMudFrame=frame;
    }
  }

  function animate(){
    updateArrows(waterArrows,courses[0],1,state,time*.66);
    tideArrows.forEach((group,i)=>updateArrows(group,courses[i+1],state.tide.direction,state,time));
  }
  return {
    get model(){initialize();return model;},
    show({season,tide,layer='salt',station,overlay=false,event=null,source=null,managePlants=true,bedChange=null,plume=null}){
      initialize();
      state=model.frame(season,tide,source,bedChange);root.visible=true;
      const shore=event?model.eventShore(event,source,state):null;
      if(!overlay){
        if(!standalone){
          if(managePlants){vegetation?.setLocalMask(estuaryPlantPlot);ownsPlants=true;}
          sea.geometry=localSea;standalone=true;
        }
        balance.show(estuarySeasons[season].month,'all','water',{riverSurvey:state.survey});
        water?.setEstuaryTide(state.tide.height);
        installWater(state,shore,plume);
      }
      body.visible=!overlay;plants.visible=!overlay&&layer!=='succession';
      saltCover.visible=!overlay&&(layer==='salt'||!!plume);
      mud.visible=!overlay&&layer==='salt';
      arrows.visible=!overlay&&layer==='salt';
      if(!overlay)animate();
      const points=[['tide',state.tideLine,state.tide.height>0?'潮位顶托前缘':'低潮水位响应界'],
        ['salt',state.saltLine,'5‰ 盐度前缘']];
      const frontLabels=points.flatMap(([id,p,text])=>{
        const pin=fronts[id];pin.visible=!!p&&(overlay||layer==='salt');
        if(!pin.visible)return [];
        pin.position.set(p.x,state.survey.levelAt(p)+.52,p.z);
        return [{id,x:p.x,z:p.z,y:pin.position.y+15.8,text,color:markerColors[id]}];
      });
      if(shore?.marker){
        const {x,z,bed}=shore.marker;
        frontLabels.push({id:'shore',x,z,y:bed+16,text:'退水后仍湿的岸带',color:'#efb478'});
      }
      for(const p of labels)p.ring.visible=!overlay&&layer!=='sediment'&&layer!=='succession'&&(!station||p.id===station.id);
      mark.visible=!overlay&&station?.id==='flat';
      if(mark.visible){
        mark.geometry.dispose();
        const p=station;
        const pts=Array.from({length:28},(_,i)=>{
          const x=p.x-50+i*3.5,z=p.z+i*.12;
          return new THREE.Vector3(x,terrainHeight(x,z)+.2,z);
        });
        mark.geometry=new THREE.BufferGeometry().setFromPoints(pts);
      }
      return {frame:state,shore,shoreline:body.geometry.userData.shoreline,labels:overlay?frontLabels:
        [...frontLabels,...(station?labels.filter(p=>p.id===station.id):labels),
          ...(layer==='natural'?plantLabels:[])]};
    },
    hide(){
      if(!root.visible)return;
      root.visible=false;
      if(standalone){
        standalone=false;
        sea.geometry=originalSea;
        water?.setEstuaryTide(null);
        if(ownsPlants){vegetation?.setLocalMask(null);ownsPlants=false;}
        balance.hide();
      }
    },
    update(dt){
      if(root.visible&&standalone&&!reduced){time+=dt;animate();}
    }
  };
}

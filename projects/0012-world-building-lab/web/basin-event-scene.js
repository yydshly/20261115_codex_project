import * as THREE from 'three';
import {basinEventStride,createBasinEventModel} from './basin-event-model.js';
import {createBasinDivideScene} from './basin-divide-scene.js';
import {clippedWaterGeometry} from './watershed-balance-scene.js';
import {terrainHeight} from './large-world.js';

const clamp=n=>Math.max(0,Math.min(1,n));
const flowColor='#8bd9ff',soilColor='#79e1b1',sandColor='#ffd391',saltColor='#f2b2ff';
const flooded=new THREE.Color('#5bbde6'),reference=new THREE.Color('#598a98');
const saline=new THREE.Color('#9b8bb0');
const nodeBasins={
  wetland:'central',centralMouth:'central',southValley:'south',south:'south',
  salt:'closed',saltMarsh:'closed',crust:'closed',dry:'closed'
};

function trace(root,positions,color,dashed=false){
  const geometry=new THREE.BufferGeometry().setFromPoints(positions);
  const Material=dashed?THREE.LineDashedMaterial:THREE.LineBasicMaterial;
  const material=new Material({color,transparent:true,opacity:.86,depthTest:false,depthWrite:false,
    ...(dashed?{dashSize:10,gapSize:7}:{})});
  const line=dashed?new THREE.LineSegments(geometry,material):new THREE.Line(geometry,material);
  line.computeLineDistances();line.renderOrder=41;root.add(line);
  return line;
}

export function createBasinEventScene(scene,balance){
  const root=new THREE.Group(),rivers=new THREE.Group(),effects=new THREE.Group();
  root.name='same rain in three basins';root.visible=false;root.add(rivers,effects);scene.add(root);
  const waterMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,
    transparent:true,opacity:.91,depthWrite:false});
  const borderMat=new THREE.LineBasicMaterial({color:'#a5e8f1',depthTest:false,depthWrite:false});
  const markerMat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,transparent:true,
    opacity:.82,depthTest:false,depthWrite:false});
  const dotGeometry=new THREE.CircleGeometry(1,10);dotGeometry.rotateX(-Math.PI/2);
  const marker=new THREE.InstancedMesh(dotGeometry,markerMat,3300),pose=new THREE.Object3D();
  marker.count=0;marker.frustumCulled=false;marker.renderOrder=47;root.add(marker);
  const channels=new Map(),slopeRoutes=new Map();
  const surfaceMeshes=new Map();
  let model,event,divideScene,eventKey,renderKey,monthShown=null,selectedMarks=[];
  const pColor=new THREE.Color(),point=(x,z,lift)=>new THREE.Vector3(x,terrainHeight(x,z)+lift,z);

  function prepare(study){
    if(model)return;
    model=createBasinEventModel(study);
    for(const b of model.basins){
      const known=b.rivers.map(path=>trace(rivers,path.map(p=>point(p.x,p.z,6)),b.color));
      channels.set(b.id,known);
      for(const edge of b.paths){
        slopeRoutes.set(edge,trace(rivers,edge.slice(1).flatMap((k,i)=>[edge[i],k].map(id=>{
          const p=study.positions[id];return point(p.x,p.z,8);
        })),flowColor,true));
      }
    }
    const edges=study.boundary.divides.flatMap(edge=>edge.map(p=>point(p.x,p.z,5)));
    if(edges.length)trace(rivers,edges,'#e5cdf9',true);
  }

  function wipeSurfaces(){
    for(const {mesh,border} of surfaceMeshes.values()){
      effects.remove(mesh,border);mesh.geometry.dispose();border.geometry.dispose();
    }
    surfaceMeshes.clear();
  }

  function addMark(x,y,z,r,color){
    if(marker.count>=marker.instanceMatrix.count)return;
    pose.position.set(x,y,z);pose.scale.set(r,1,r);pose.updateMatrix();
    marker.setMatrixAt(marker.count,pose.matrix);
    marker.setColorAt(marker.count++,pColor.set(color));
  }

  function makeSurface(id,surface,reading){
    const level=p=>surface.baseLevel(p)+surface.weight(p)*reading.rise;
    const geometry=clippedWaterGeometry(surface.patch,level,{referenceAt:surface.baseLevel,colorAt:p=>{
      const tint=nodeBasins[id]==='closed'?reference.clone().lerp(saline,.47):reference.clone();
      return tint.lerp(flooded,.68+.22*clamp(p.depth/.22)).toArray();
    }});
    if(!geometry.attributes.position.count){geometry.dispose();return;}
    const mesh=new THREE.Mesh(geometry,waterMat);mesh.renderOrder=38;
    const edge=new THREE.BufferGeometry();
    edge.setAttribute('position',new THREE.Float32BufferAttribute(geometry.userData.shoreline,3));
    const border=new THREE.LineSegments(edge,borderMat);border.renderOrder=43;
    effects.add(mesh,border);surfaceMeshes.set(id,{mesh,border});
  }

  function bankMarkers(surface,history,hour,layer,id){
    const now=history[hour].readings[id];
    const recent=history.slice(Math.max(0,hour-32),hour+1).reduce((peak,f)=>Math.max(peak,f.readings[id].rise),0);
    const record=history.slice(0,hour+1).reduce((peak,f)=>Math.max(peak,f.readings[id].rise),0);
    const limit=layer==='bank'?recent:record;
    const {patch,baseLevel,weight}=surface;
    for(let i=0;i<patch.bed.length;i+=5){
      const p=patch.bed[i],baseline=baseLevel(p),influence=weight(p);
      if(influence<.06||p.bed<baseline-.01)continue;
      const current=baseline+influence*now.rise;
      if(layer==='bank'){
        if(p.bed<current+.015||p.bed>baseline+influence*limit)continue;
        addMark(p.x,p.bed+.13,p.z,3.4,nodeBasins[id]==='closed'?saltColor:soilColor);
      }else if(layer==='sediment'&&now.deposit>.1&&p.bed<baseline+influence*limit+.09){
        addMark(p.x,Math.max(p.bed,current)+.13,p.z,2.5+Math.min(3,Math.sqrt(now.deposit)*.22),sandColor);
      }
    }
  }

  function fieldMarks(result,hour,layer){
    const {basin,frames}=result,{observations,rainRate}=frames[hour];
    const field=basin.eventCells;
    for(let i=0;i<field.length;i++){
      const c=field[i],base=i*basinEventStride;
      if(layer==='water'){
        const water=observations[base],ground=observations[base+1];
        if(water>1&&c.next>=0&&i%2===0){
          const end=field[c.next];
          const from=new THREE.Vector3(c.x,model.study.height[c.k]+7,c.z);
          const to=new THREE.Vector3(end.x,model.study.height[end.k]+7,end.z);
          selectedMarks.push({from,to,size:clamp(water/120)*7+.95,phase:(i*.618)%1});
        }
        if(!c.water&&i%4===0&&ground>1)
          addMark(c.x,model.study.height[c.k]+3,c.z,Math.min(11,2+Math.sqrt(ground)*.65),soilColor);
        if(rainRate>0&&i%5===0)addMark(c.x,model.study.height[c.k]+17,c.z,2.9,flowColor);
      }else if(layer==='sediment'&&observations[base+2]>.06){
        addMark(c.x,model.study.height[c.k]+3,c.z,Math.min(12,2+Math.sqrt(observations[base+2])*5),sandColor);
      }
    }
  }

  function show({study,settings,focus,hour,layer,divide=null}){
    prepare(study);
    const key=[settings.month,settings.rain,settings.duration].join('/');
    if(eventKey!==key){event=model.run(settings);eventKey=key;renderKey=null;}
    if(monthShown!==settings.month){
      balance.show(settings.month,'all','water');
      monthShown=settings.month;
    }
    root.visible=true;rivers.visible=divide===null;
    const drawKey=[focus,hour,layer].join('/');
    const shown=event.results.filter(r=>focus==='all'||r.basin.id===focus);
    if(renderKey!==drawKey){
      wipeSurfaces();marker.count=0;selectedMarks=[];
      for(const result of event.results){
        const {basin,frames}=result,active=shown.includes(result),frame=frames[hour];
        for(const line of channels.get(basin.id)){
          line.visible=active;line.material.opacity=frame.rainTotal>0?.55:.29;
        }
        for(const path of basin.paths)slopeRoutes.get(path).visible=active&&layer==='water';
        if(!active)continue;
        fieldMarks(result,hour,layer);
        for(const [id,reading] of Object.entries(frame.readings)){
          const surface=event.surfaces[id];
          if(!surface||reading.rise<.003&&layer==='water')continue;
          if(reading.rise>=.003)makeSurface(id,surface,reading);
          if(layer!=='water')bankMarkers(surface,frames,hour,layer,id);
        }
      }
      edgeMarkers=marker.count;
      renderKey=drawKey;
      drawPulses(0);
    }
    let survey=null;
    if(divide===null)divideScene?.hide();
    else{
      divideScene??=createBasinDivideScene(root,model);
      survey=divideScene.show(event,focus,divide,hour);
    }
    return {model,event,survey};
  }

  let motion=0,edgeMarkers=0;
  const movingPoint=new THREE.Vector3();
  function drawPulses(dt){
    if(!root.visible)return;
    motion+=dt;
    marker.count=edgeMarkers;
    for(const {from,to,size,phase} of selectedMarks){
      movingPoint.copy(from).lerp(to,(phase+motion*.8)%1);
      addMark(movingPoint.x,movingPoint.y,movingPoint.z,size,flowColor);
    }
    marker.instanceMatrix.needsUpdate=true;
    if(marker.instanceColor)marker.instanceColor.needsUpdate=true;
  }

  return {show,update:drawPulses,hide(){
    if(!root.visible)return;
    root.visible=false;divideScene?.hide();wipeSurfaces();renderKey=null;monthShown=null;balance.hide();
  }};
}

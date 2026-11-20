import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {buildFormationStudy,formationHabitat} from './world-formation.js';
import {formationMaterials} from './world-hydraulics.js';
import {createBasinEventScene} from './basin-event-scene.js';

const clamp=value=>Math.max(0,Math.min(1,value));
const color=value=>new THREE.Color(value);
const materialColors=Object.fromEntries(Object.entries(formationMaterials).map(([id,m])=>[id,color(m.color)]));
const coverColors=Object.fromEntries(Object.entries(formationHabitat).map(([id,m])=>[id,color(m.color)]));
const coast=color('#638b8e'),background=color('#566052'),dark=color('#233d38');
const dry=color('#bfa579'),rain=color('#4289d9'),snow=color('#e5f6ff'),ground=color('#278968');

function lifted(p,offset=7){
  return new THREE.Vector3(p.x,Math.max(terrainHeight(p.x,p.z),p.level??0)+offset,p.z);
}

function trail(points,width,material){
  const path=new THREE.CurvePath();
  for(let i=1;i<points.length;i++){
    if(points[i].distanceToSquared(points[i-1])>.001)path.add(new THREE.LineCurve3(points[i-1],points[i]));
  }
  const line=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(8,points.length*2),width,4,false),material);
  return line;
}

export function createFormationScene(scene,balance,tiles){
  const root=new THREE.Group();
  root.name='world formation comparison';root.visible=false;scene.add(root);
  const event=createBasinEventScene(scene,balance);
  const groups=new Map(),pose=new THREE.Object3D(),painted=color('#ffffff');
  let model,texture,marks,borders,lastTexture,lastMonth,lastFocus;

  function init(){
    const study=buildFormationStudy(balance.model),{grid,basins,boundary}=study;
    texture=new THREE.DataTexture(new Uint8Array(grid.cols*grid.rows*4),grid.cols,grid.rows);
    texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=texture.minFilter=THREE.NearestFilter;
    texture.repeat.set(7/(grid.step*grid.cols),7/(grid.step*grid.rows));
    texture.offset.set((.5-grid.x0/grid.step)/grid.cols,(.5-grid.z0/grid.step)/grid.rows);
    const edges=boundary.divides.flatMap(edge=>edge.map(p=>lifted(p,7)));
    borders=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edges),
      new THREE.LineBasicMaterial({color:'#e4caff',transparent:true,opacity:.83,depthWrite:false,depthTest:false}));
    borders.renderOrder=31;
    root.add(borders);
    for(const basin of basins){
      const group=new THREE.Group(),network=new THREE.Group(),rills=new THREE.Group();
      const channelMaterial=new THREE.MeshBasicMaterial({
        color:basin.color,transparent:true,opacity:.78,depthTest:false,depthWrite:false
      });
      for(const points of basin.rivers){
        const line=trail(points.map(p=>lifted(p,6)),1.9,channelMaterial);
        line.renderOrder=32;network.add(line);
      }
      const rillMaterial=new THREE.MeshBasicMaterial({color:'#87caff',depthTest:false,depthWrite:false});
      const paths=basin.paths.map(path=>{
        const points=path.map(k=>lifted(study.positions[k],9)),line=trail(points,2.3,rillMaterial);
        const tip=points.at(-1),direction=tip.clone().sub(points.at(-2)).normalize();
        const arrow=new THREE.ArrowHelper(direction,tip.clone().addScaledVector(direction,-16),19,'#a3d8ff',10,8);
        line.renderOrder=33;arrow.line.material.depthTest=arrow.cone.material.depthTest=false;
        rills.add(line,arrow);
        return {line,arrow,path};
      });
      const pin=new THREE.Mesh(new THREE.TorusGeometry(14,2.2,6,30),channelMaterial);
      pin.rotation.x=-Math.PI/2;pin.position.copy(lifted(basin.outlet,10));pin.renderOrder=36;
      group.add(network,rills,pin);root.add(group);
      const recharge=basin.cells.filter(k=>!study.world.graph.waterCells[k])
        .sort((a,b)=>study.frames[6].cells.percolation[b]-study.frames[6].cells.percolation[a]).slice(0,22);
      groups.set(basin.id,{group,network,paths,channelMaterial,recharge});
    }
    const torus=new THREE.TorusGeometry(1,.17,6,14);torus.rotateX(-Math.PI/2);
    marks=new THREE.InstancedMesh(torus,new THREE.MeshBasicMaterial({
      color:'#90f1c4',transparent:true,opacity:.93,depthWrite:false,depthTest:false
    }),22*groups.size);
    marks.frustumCulled=false;marks.renderOrder=34;root.add(marks);
    model=study;
  }

  function tint(month,days,layer,focus){
    const data=texture.image.data;
    for(let k=0;k<model.height.length;k++){
      const group=model.groups[k],active=focus==='all'||group===focus;
      if(!group)painted.copy(coast);
      else if(!active)painted.copy(background).lerp(dark,.30);
      else {
        const value=model.read(k,month,days);
        if(layer==='rock')painted.copy(materialColors[value.profile.material]);
        else if(layer==='plants')painted.copy(coverColors[value.habitat]);
        else if(layer==='rain')painted.copy(dry).lerp(rain,clamp(value.rain/(model.area*.15)))
          .lerp(snow,value.rain>0?.7*clamp(value.snow/value.rain):0);
        else {
          painted.copy(dry).lerp(ground,clamp(value.ground/(model.area*.027)));
          if(group==='unresolved'||group==='coast')painted.lerp(background,.73);
        }
        painted.lerp(dark,.12*Math.min(1,Math.max(0,model.height[k])/440)).multiplyScalar(.63);
      }
      painted.getRGB(painted,THREE.SRGBColorSpace);
      const at=k*4;
      data[at]=Math.round(painted.r*255);data[at+1]=Math.round(painted.g*255);
      data[at+2]=Math.round(painted.b*255);data[at+3]=255;
    }
    texture.needsUpdate=true;
  }

  function show({month,days,layer,focus,probe}){
    event.hide();
    if(!model)init();
    if(lastMonth!==month||lastFocus!==focus){
      const basin=model.basins.find(b=>b.id===focus);
      balance.show(month,basin?.id==='central'?'wetland':basin?.record??'all','water');
      lastMonth=month;lastFocus=focus;
    }
    const textureKey=[month,days,layer,focus].join('/');
    if(lastTexture!==textureKey){
      if(layer!=='natural')tint(month,days,layer,focus);
      if(!lastTexture||layer==='natural'||lastTexture.includes('/natural/')){
        tiles.setLithologyMap(layer==='natural'?null:texture);
      }
      lastTexture=textureKey;
    }
    root.visible=true;
    borders.visible=layer!=='natural';
    marks.visible=layer==='water';marks.count=0;
    const shown=model.basins.filter(b=>focus==='all'||focus===b.id);
    const totals=model.basins.map(b=>model.stats(b,month,days));
    for(const [id,record] of groups){
      const basin=shown.find(b=>b.id===id);
      record.group.visible=!!basin&&layer!=='natural';
      if(!basin)continue;
      record.network.visible=layer==='water';
      const flux=totals[model.basins.indexOf(basin)];
      const flow=days?flux.baseflow*30:flux.outflow;
      record.channelMaterial.opacity=.42+.50*clamp(flow/(basin.id==='south'?20000:32000));
      for(const {line,arrow,path} of record.paths){
        line.visible=arrow.visible=layer==='water'&&model.read(path[0],month,days).surface>1;
      }
      if(layer!=='water')continue;
      for(const k of record.recharge){
        const p=model.read(k,month,days),extent=(days?p.baseflow*30:p.recharge)/model.area;
        if(extent<.0005)continue;
        pose.position.copy(lifted(model.positions[k],8));
        pose.scale.setScalar(4+17*clamp(extent/.02));
        pose.updateMatrix();marks.setMatrixAt(marks.count++,pose.matrix);
      }
    }
    marks.instanceMatrix.needsUpdate=true;
    const labels=shown.flatMap(b=>[
      {...b.outlet,color:b.color,y:lifted(b.outlet,29).y,text:b.outlet.name},
      ...(focus===b.id?b.probes.filter((p,i)=>probe==null||i===probe).map(p=>({
        ...p,color:b.color,y:lifted(p,35).y,text:p.name
      })):[])
    ]);
    return {model,labels,totals};
  }

  function hideSeasonal(){
    if(!root.visible)return;
    root.visible=false;lastTexture=null;lastMonth=null;lastFocus=null;
    tiles.setLithologyMap(null);balance.hide();
  }
  return {show,
    showEvent(options){
      hideSeasonal();
      if(!model)init();
      return event.show({...options,study:model});
    },
    updateEvent:event.update,
    hideEvent:event.hide,
    hide(){hideSeasonal();event.hide();}
  };
}

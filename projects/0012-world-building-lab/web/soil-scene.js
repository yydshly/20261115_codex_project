import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {fanProfile} from './fan-layout.js';
import {northSample} from './northern-watershed.js';
import {riverSample} from './water-system.js';
import {createPlantBatcher} from './vegetation-scene.js';
import {createSoilModel,soilPlacements,soilPlant,soilStops,transectPosition} from './soil-model.js';

const clamp=v=>Math.min(1,Math.max(0,v));
const lerp=(a,b,u)=>a+(b-a)*u;
export const soilProbes=[.14,.50,.86];
const slate=new THREE.Color('#9caaa6'),ochre=new THREE.Color('#cfa36c');
const earth=new THREE.Color('#ac7451'),saturated=new THREE.Color('#58adb5'),salty=new THREE.Color('#cc91c6');
const dark=new THREE.Color('#604135'),rust=new THREE.Color('#b37c55'),gley=new THREE.Color('#658c91');
const hardRock=new THREE.Color('#62696b'),softRock=new THREE.Color('#998880');
const habitatColors=Object.fromEntries(Object.entries({
  moss:'#638953',alpineTuft:'#8b9c58',tuft:'#789447',dwarf:'#667e4c',shrub:'#557e43',
  willow:'#52804a',sedge:'#699964',reed:'#557f4c',rush:'#78a078',coastShrub:'#538573'
}).map(([kind,color])=>[kind,new THREE.Color(color)]));

function replace(mesh,geometry){
  mesh.geometry.dispose();
  mesh.geometry=geometry;
}

function meshData(position,color,size=3,index=null){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(color,size));
  if(index)geometry.setIndex(index);
  return geometry;
}

function surveyedArea(model,stop){
  const cols=30,rows=35,points=[],triangles=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const along=j/rows,across=i/cols*2-1;
    const {x,z}=transectPosition(stop,along,across*stop.width);
    const edge=Math.hypot((along-.5)*1.83,across);
    const sample=model.sample(stop.id,x,z);
    const habitat=soilPlant(sample,stop.id,.28);
    points.push({...sample,habitat,alpha:.85*clamp((1.01-edge)/.20)*(1-.75*clamp((sample.slope-.65)/1.2))});
    if(j<rows&&i<cols){
      const k=j*(cols+1)+i;
      triangles.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);
    }
  }
  return {points,triangles};
}

export function soilSurface(area,month,layer){
  const pos=[],col=[],tone=new THREE.Color();
  for(const p of area.points){
    const {moisture,salt}=p.months[month-1];
    if(layer==='water'){
      tone.copy(ochre).lerp(saturated,clamp((moisture-.23)*1.5)).lerp(salty,clamp(salt*1.7));
    }else{
      tone.copy(ochre).lerp(earth,p.fine*.94)
        .lerp(slate,clamp((25-p.rootDepth)/25))
        .lerp(gley,p.reduced*.57)
        .lerp(salty,salt*.34);
      if(layer==='plants'&&p.habitat)tone.lerp(habitatColors[p.habitat],.78);
    }
    tone.multiplyScalar(.92+.12*Math.sin(p.x*.31+p.z*.37));
    pos.push(p.x,p.y+.21,p.z);col.push(tone.r,tone.g,tone.b,p.alpha*(layer==='plants'?.65:1));
  }
  return meshData(pos,col,4,area.triangles);
}

export function soilSection(section){
  const position=[],color=[];
  const lift=17,scale=.165,width=2.4;
  const direction=section.at(-1);
  const dx=direction.x-section[0].x,dz=direction.z-section[0].z,d=Math.hypot(dx,dz);
  const nx=-dz/d,nz=dx/d;
  const sub=new THREE.Color(),parent=new THREE.Color(),bed=new THREE.Color();
  function elevation(p){
    return [0,p.topsoil,p.topsoil+p.subsoil,p.rootDepth,
      Math.max(p.rootDepth+5,(lift-.25)/scale)].map(depth=>p.y+lift-depth*scale);
  }
  for(let i=1;i<section.length;i++){
    const a=section[i-1],b=section[i],y1=elevation(a),y2=elevation(b);
    sub.copy(rust).lerp(gley,(a.reduced+b.reduced)*.45);
    parent.copy(ochre).lerp(slate,(a.gravel+b.gravel)*.29+(a.reduced+b.reduced)*.13);
    bed.copy(hardRock).lerp(softRock,(a.rockBand+b.rockBand)*.5);
    const tones=[dark,sub,parent,bed];
    function face(vertices,tone){
      position.push(...vertices[0],...vertices[1],...vertices[2],
        ...vertices[1],...vertices[3],...vertices[2]);
      for(let k=0;k<6;k++)color.push(tone.r,tone.g,tone.b);
    }
    for(const side of [-1,1]){
      const point=(p,y)=>[p.x+nx*width*.5*side,y,p.z+nz*width*.5*side];
      for(let j=0;j<tones.length;j++){
        face([point(a,y1[j]),point(b,y2[j]),point(a,y1[j+1]),point(b,y2[j+1])],tones[j]);
      }
    }
    face([[a.x+nx,a.y+lift,a.z+nz],[b.x+nx,b.y+lift,b.z+nz],
      [a.x-nx,a.y+lift,a.z-nz],[b.x-nx,b.y+lift,b.z-nz]],dark);
  }
  return {geometry:meshData(position,color),lift};
}

const sweep=(n,fn)=>Array.from({length:n+1},(_,i)=>fn(i/n));
function wholeRoute(){
  return [
    ...sweep(34,t=>northSample('fan-head',t)),
    ...sweep(45,t=>{const p=fanProfile(-1030+180*t);return {x:p.channels[0],z:p.z,level:p.level};}),
    ...sweep(67,t=>northSample('fan-out',t)),
    ...sweep(45,t=>northSample('trunk',t)),
    ...sweep(90,t=>riverSample(lerp(.62,.87,t)))
  ].map(p=>new THREE.Vector3(p.x,Math.max(p.level,terrainHeight(p.x,p.z))+4.5,p.z));
}

function colorPlants(batches,month,warmth){
  const tint=new THREE.Color();
  for(const {object,points} of batches){
    for(const mesh of object.children){
      points.forEach(({sample,kind},i)=>{
        const {moisture,depth,salt}=sample.months[month-1];
        const aquatic=['reed','sedge','rush'].includes(kind),tolerant=kind==='rush'||kind==='coastShrub';
        const stress=clamp((.49-moisture)*2+(tolerant?0:salt*.46)
          +Math.max(0,depth-(aquatic?.37:.025))*.51);
        const dull=clamp(stress*.84+warmth*.33);
        tint.setRGB(.95+.05*dull,1-.42*dull,1-.36*dull);
        mesh.setColorAt(i,tint);
      });
      mesh.instanceColor.needsUpdate=true;
    }
  }
}

export function createSoilScene(scene,balance,sediment,{originalPlants=[]}={}){
  const root=new THREE.Group();
  root.name='soil and plant transitions';root.visible=false;scene.add(root);
  const surfaceMaterial=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,
    depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
  const sectionMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
  const route=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#e7cc95'}));
  route.visible=false;root.add(route);
  const pointer=new THREE.Group(),pointerBeam=new THREE.Mesh(
    new THREE.CylinderGeometry(.22,.22,17,7),new THREE.MeshBasicMaterial({color:'#ffe4af'}));
  const pin=new THREE.Mesh(new THREE.SphereGeometry(1.55,10,8),pointerBeam.material);
  pointer.add(pointerBeam,pin);root.add(pointer);
  const batch=createPlantBatcher(),plots=new Map();
  let model=null,visibility=null;

  function buildPlot(stop){
    const group=new THREE.Group(),area=surveyedArea(model,stop);
    group.visible=false;root.add(group);
    const section=sweep(42,t=>{
      const {x,z}=transectPosition(stop,t);
      return model.sample(stop.id,x,z);
    });
    const probes=soilProbes.map(t=>{
      const {x,z}=transectPosition(stop,t);
      return model.sample(stop.id,x,z);
    });
    const surface=new THREE.Mesh(new THREE.BufferGeometry(),surfaceMaterial);
    surface.name='soil surface '+stop.id;surface.renderOrder=7;group.add(surface);
    const {geometry,lift}=soilSection(section),cut=new THREE.Mesh(geometry,sectionMaterial);
    cut.name='soil profile '+stop.id;group.add(cut);
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(section.map(
      s=>new THREE.Vector3(s.x,s.y+.55,s.z))),new THREE.LineBasicMaterial({color:'#ffffd4'}));
    group.add(line);
    const plantRoot=new THREE.Group();
    plantRoot.name='soil plants '+stop.id;group.add(plantRoot);
    const species=new Map();
    for(const point of soilPlacements(model,stop)){
      if(!species.has(point.kind))species.set(point.kind,[]);
      const enlargement=point.kind==='willow'?1.35:2.7;
      species.get(point.kind).push({...point,scale:point.scale*enlargement});
    }
    const batches=Array.from(species,([kind,points])=>{
      const object=batch(kind,points);
      for(const mesh of object.children)mesh.castShadow=false;
      plantRoot.add(object);
      return {object,points};
    });
    const plot={group,area,surface,cut,plantRoot,probes,lift,batches,month:null,layer:null,
      counts:Array.from(species,([kind,points])=>[kind,points.length]).sort((a,b)=>b[1]-a[1])};
    plots.set(stop.id,plot);
    return plot;
  }

  return {
    show(month,focus,layer,probe){
      if(!model){
        model=createSoilModel(balance.model,sediment.model);
        replace(route,new THREE.BufferGeometry().setFromPoints(wholeRoute()));
      }
      if(!root.visible){
        visibility=originalPlants.map(group=>group.visible);
        originalPlants.forEach(group=>{group.visible=false;});
        root.visible=true;
      }
      balance.show(month,'all','water');
      for(const plot of plots.values())plot.group.visible=false;
      route.visible=focus==='all';pointer.visible=focus!=='all';
      const visible=focus==='all'?soilStops:soilStops.filter(stop=>stop.id===focus);
      let current=null;
      for(const stop of visible){
        const plot=plots.get(stop.id)??buildPlot(stop);
        const mode=focus==='all'&&layer==='profile'?'water':layer;
        const {group,area,surface,cut,plantRoot,probes,lift,batches}=plot;
        group.visible=true;cut.visible=mode==='profile';plantRoot.visible=mode==='plants';
        if(plot.layer!==mode||plot.month!==month){
          replace(surface,soilSurface(area,month,mode));
          const cold=clamp((.15-balance.model.climate.frames[month-1].wind.heat)/.48);
          if(mode==='plants')colorPlants(batches,month,cold);
          plot.layer=mode;plot.month=month;
        }
        if(focus!=='all'){
          const s=probes[probe],pinY=cut.visible?lift+1.4:2.1;
          pointer.position.set(s.x,s.y,s.z);
          pointerBeam.visible=cut.visible;pointerBeam.position.y=lift*.5;pin.position.y=pinY;
          current={probes,counts:plot.counts,deposit:model.freshDeposit(focus,month)};
        }
      }
      return current;
    },
    hide(){
      if(!root.visible)return;
      root.visible=false;
      originalPlants.forEach((group,i)=>{group.visible=visibility[i];});
      balance.hide();
    }
  };
}

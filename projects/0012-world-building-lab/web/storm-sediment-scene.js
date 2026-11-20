import * as THREE from 'three';
import {branchSample} from './water-system.js';
import {terrainHeight} from './large-world.js';
import {clippedWaterGeometry} from './watershed-balance-scene.js';
import {eventBed,sedimentReaches} from './storm-sediment.js';

const clamp=(n,low=0,high=1)=>Math.max(low,Math.min(high,n));
const blend=THREE.MathUtils.lerp;
const sand=new THREE.Color('#ffda84'),mud=new THREE.Color('#c99173');
const suspendedColors=[new THREE.Color('#ffc866'),new THREE.Color('#f9e2c4')];

function line(root,color){
  const mesh=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({
    color,toneMapped:false,transparent:true,opacity:.92,depthTest:false,depthWrite:false
  }));
  mesh.renderOrder=19;root.add(mesh);return mesh;
}

function transportPaths(){
  return sedimentReaches.map(({t},i)=>{
    const start=i?(sedimentReaches[i-1].t+t)/2:.724;
    const end=i<sedimentReaches.length-1?(sedimentReaches[i+1].t+t)/2:.995;
    return [0,1,2].map(branch=>Array.from({length:43},(_,k)=>{
      const p=branchSample(branch,blend(start,end,k/42));
      const offset=p.half*.29*Math.sin(k*.12+i);
      const x=p.x+offset*p.nx,z=p.z+offset*p.nz;
      return {...p,x,z,bed:terrainHeight(x,z)};
    }));
  });
}

export function createStormSedimentScene(scene){
  const root=new THREE.Group();root.visible=false;root.name='storm sediment and accumulated shoreline';scene.add(root);
  let surface,oldShore,newShore,stream,pos,colors,paths,model,survey,lastShape,lastShoreline,flow,time=0;

  function initialize(coast,plots){
    if(surface)return;
    model=coast;survey=plots;
    paths=transportPaths();
    const ground=new THREE.BufferGeometry();
    ground.setAttribute('position',new THREE.BufferAttribute(new Float32Array(model.bed.length*3),3));
    ground.setAttribute('color',new THREE.BufferAttribute(new Float32Array(model.bed.length*4),4));
    ground.setIndex(model.cells.flatMap(({indices:[a,b,c,d]})=>[a,c,b,b,c,d]));
    surface=new THREE.Mesh(ground,new THREE.MeshBasicMaterial({
      vertexColors:true,transparent:true,side:THREE.DoubleSide,toneMapped:false,depthWrite:true,alphaTest:.025
    }));
    surface.frustumCulled=false;surface.renderOrder=7;root.add(surface);
    oldShore=line(root,'#8fe4ec');newShore=line(root,'#ffe3a1');
    const geometry=new THREE.BufferGeometry();
    const vertices=sedimentReaches.length*3*24*2;
    pos=new THREE.BufferAttribute(new Float32Array(vertices*3),3);
    colors=new THREE.BufferAttribute(new Float32Array(vertices*3),3);
    geometry.setAttribute('position',pos);geometry.setAttribute('color',colors);
    stream=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({
      vertexColors:true,toneMapped:false,depthWrite:false,transparent:true,opacity:.95
    }));
    stream.frustumCulled=false;stream.renderOrder=18;root.add(stream);
  }

  function groundShape(shape,physical,wet,newLand=null){
    const p=surface.geometry.getAttribute('position'),rgba=surface.geometry.getAttribute('color');
    const tone=new THREE.Color();
    for(const [i,point] of model.bed.entries()){
      const lift=shape.bedChange[i],grain=shape.sandChange[i]/Math.max(1e-8,lift);
      tone.copy(mud).lerp(sand,grain);
      p.setXYZ(i,point.x,point.bed+.075+(physical?lift:0),point.z);
      const amount=physical?lift/.15:lift/.004;
      const alpha=newLand?.[i]?1:amount>.015?clamp(amount,.18,.86)*(physical&&wet[i]?.62:1):0;
      rgba.setXYZW(i,tone.r,tone.g,tone.b,alpha);
    }
    p.needsUpdate=true;rgba.needsUpdate=true;
  }

  function trace(mesh,raw,shape){
    const vertices=[];
    for(let i=0;i<raw.length;i+=6){
      const [x,y,z,nx,ny,nz]=raw.slice(i,i+6);
      if(model.deltaAt(shape.bedChange,(x+nx)/2,(z+nz)/2)<.018)continue;
      vertices.push(x,y,z,nx,ny,nz);
    }
    mesh.geometry.dispose();
    mesh.geometry=new THREE.BufferGeometry();
    mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  }

  function move(){
    if(!flow)return;
    const {sediment,coast}=flow;
    let index=0;
    for(const [i,load] of sediment.moving.entries()){
      const speed=sediment.velocity[i];
      for(const [j,path] of paths[i].entries())for(let grain=0;grain<2;grain++){
        const count=Math.min(12,Math.floor(56*Math.sqrt(load[grain])*(j===0?.37:.22)));
        const color=suspendedColors[grain];
        for(let n=0;n<count;n++){
          const phase=THREE.MathUtils.euclideanModulo(n/Math.max(1,count)+i*.32+j*.27+grain*.16+time*speed*.24,1);
          const k=Math.floor(phase*40),u=phase*40-k;
          const a=path[k],b=path[k+1];
          const y=Math.max(blend(a.bed,b.bed,u),coast.survey.levelAt(a))+1.35+n%3*.16;
          const x=blend(a.x,b.x,u),z=blend(a.z,b.z,u),sign=Math.sign(speed);
          pos.setXYZ(index,x,y,z);colors.setXYZ(index++,color.r,color.g,color.b);
          pos.setXYZ(index,x-sign*(b.x-a.x)*.73,y+.06,z-sign*(b.z-a.z)*.73);
          colors.setXYZ(index++,color.r,color.g,color.b);
        }
      }
    }
    stream.geometry.setDrawRange(0,index);pos.needsUpdate=true;colors.needsUpdate=true;
  }

  return {
    event(coast,plots,sediment){
      initialize(coast.model,plots);
      root.visible=true;oldShore.visible=false;newShore.visible=false;stream.visible=true;
      groundShape(eventBed(model,survey,sediment.bed),false,coast.frame.wet);
      lastShape=null;flow={sediment,coast:coast.frame};move();
      return sedimentReaches.slice(0,4).flatMap((reach,i)=>{
        if(sediment.moving[i][0]+sediment.moving[i][1]<.075&&sediment.bed[i][0]+sediment.bed[i][1]<.16)return [];
        const p=branchSample(i===1?1:i===2?2:0,reach.t);
        const v=sediment.velocity[i];
        return [{text:reach.name+(Math.abs(v)<.13?' · 缓流':v<0?' · 回推':' · 向海'),
          x:p.x,z:p.z,y:Math.max(terrainHeight(p.x,p.z),p.level)+13,color:'#ffe0a1'}];
      });
    },
    evolution(coast,plots,base,shape){
      initialize(coast.model,plots);
      root.visible=true;stream.visible=false;flow=null;
      oldShore.visible=shape.count>0;newShore.visible=shape.count>0;
      let area=0,barArea=0;
      const markers=[null,null],newLand=new Uint8Array(model.bed.length);
      for(const [i,p] of model.bed.entries()){
        const lift=shape.bedChange[i];
        if(!base.wet[i]||coast.frame.wet[i]||lift<=0||p.bed+lift<coast.frame.levels[i])continue;
        newLand[i]=1;
        area+=survey.area[i];
        const kind=shape.sandChange[i]>.5*lift?1:0;
        if(kind===1)barArea+=survey.area[i];
        if(!markers[kind]||lift>markers[kind].lift)markers[kind]={...p,lift};
      }
      if(lastShape!==shape||lastShoreline!==coast.shoreline){
        groundShape(shape,true,coast.frame.wet,newLand);
        const original=clippedWaterGeometry({bed:base.bed,cells:model.cells},
          p=>base.levels[p.row*model.cols+p.col],{waterMask:base.wet});
        trace(oldShore,original.userData.shoreline,shape);original.dispose();
        trace(newShore,coast.shoreline,shape);lastShape=shape;lastShoreline=coast.shoreline;
      }
      const labels=markers.flatMap((p,i)=>p?[{
        text:i?'露出水面的沙脊':'向水面扩展的潮滩',x:p.x,z:p.z,y:p.bed+p.lift+12,color:i?'#ffe0a0':'#e9af92'
      }]:[]);
      return {labels,area,barArea};
    },
    hide(){root.visible=false;flow=null;},
    update(dt){if(root.visible){time+=dt;move();}}
  };
}

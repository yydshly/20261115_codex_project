import * as THREE from 'three';
import {seaMask} from './shore-sea-change.js';

const shades={
  rise:{color:'#6ccce1',text:'抬升后重淹'},
  surge:{color:'#cfb7ff',text:'风暴潮暂淹'},
  scour:{color:'#ef9b71',text:'沉积层冲低'}
};
const courseColors={grass:'#e1ed82',reed:'#83efb9'};
const courseNames={grass:'耐盐草迁入',reed:'芦苇迁入'};
const tone=new THREE.Color();

export function createShoreSeaScene(scene){
  const root=new THREE.Group();root.name='sea level inundation, surge erosion and marsh migration';root.visible=false;scene.add(root);
  const paths=new THREE.Group();root.add(paths);
  let film,lastCoastal,lastPhase,lastRoutes,marks=[];
  function clearPaths(){
    const materials=new Set();
    for(const part of paths.children){part.geometry.dispose();materials.add(part.material);}
    paths.clear();for(const material of materials)material.dispose();
  }
  function initialize(model){
    if(film)return;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(model.bed.length*3),3));
    g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(model.bed.length*4),4));
    g.setIndex(model.cells.flatMap(({indices:[a,b,c,d]})=>[a,c,b,b,c,d]));
    film=new THREE.Mesh(g,new THREE.MeshBasicMaterial({
      side:THREE.DoubleSide,transparent:true,vertexColors:true,alphaTest:.025,depthWrite:false,toneMapped:false
    }));
    film.frustumCulled=false;film.renderOrder=17;root.add(film);
  }
  function paintFilm(coastal,coast,phase){
    const positions=film.geometry.getAttribute('position'),rgba=film.geometry.getAttribute('color');
    const points={};
    for(const [i,p] of coast.bed.entries()){
      const code=coastal.masks[i],wet=coast.wet[i];
      let type;
      if(phase==='peak'&&(code&seaMask.temporary))type='surge';
      else if(phase==='after'&&(code&seaMask.erosion))type='scour';
      else if(code&seaMask.permanent)type='rise';
      const y=Math.max(p.bed,wet?coast.levels[i]:-Infinity)+.18;
      positions.setXYZ(i,p.x,y,p.z);
      if(type){
        const alpha=phase==='migration'?.23:type==='scour'?.46:.58;
        tone.set(shades[type].color);rgba.setXYZW(i,tone.r,tone.g,tone.b,alpha);
        const center=type==='rise'?[-1430,-210]:type==='surge'?[-1510,-342]:[-1515,-295];
        const rank=Math.hypot(p.x-center[0],p.z-center[1]);
        if(!points[type]||rank<points[type].rank)points[type]={x:p.x,y:y+11,z:p.z,rank,...shades[type]};
      }else rgba.setXYZW(i,0,0,0,0);
    }
    positions.needsUpdate=true;rgba.needsUpdate=true;
    return phase==='migration'?[]:Object.values(points);
  }
  function makeRoutes(migration,coast){
    clearPaths();
    const labels=[];
    for(const {kind,corridor} of migration?.routes??[]){
      const nodes=corridor.map(i=>{
        const p=coast.bed[i];
        return new THREE.Vector3(p.x,Math.max(p.bed,coast.wet[i]?coast.levels[i]:p.bed)+2.25,p.z);
      });
      const route=new THREE.CatmullRomCurve3(nodes);
      const material=new THREE.MeshBasicMaterial({
        color:courseColors[kind],toneMapped:false,depthTest:false,depthWrite:false
      });
      const ribbon=new THREE.Mesh(new THREE.TubeGeometry(route,nodes.length*5,1.04,7,false),material);
      ribbon.renderOrder=22;paths.add(ribbon);
      const origin=new THREE.Mesh(new THREE.TorusGeometry(2.4,.47,6,20),material);
      origin.position.copy(nodes[0]);origin.rotation.x=-Math.PI/2;origin.renderOrder=23;paths.add(origin);
      const end=nodes.at(-1),tangent=end.clone().sub(nodes.at(-2)).normalize();
      const head=new THREE.Mesh(new THREE.ConeGeometry(2.4,5.4,8),material);
      head.position.copy(end);head.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP,tangent);
      head.renderOrder=23;paths.add(head);
      labels.push({text:courseNames[kind],x:end.x,z:end.z,y:end.y+20,color:courseColors[kind]});
    }
    return labels;
  }
  return {
    show(model,coastal,coast,phase,migration){
      initialize(model);
      root.visible=phase!=='before';
      if(lastCoastal!==coastal||lastPhase!==phase||lastRoutes!==migration){
        marks=phase==='before'?[]:paintFilm(coastal,coast,phase);
        marks.push(...makeRoutes(migration,coast));
        lastCoastal=coastal;lastPhase=phase;lastRoutes=migration;
      }
      return marks;
    },
    hide(){root.visible=false;}
  };
}

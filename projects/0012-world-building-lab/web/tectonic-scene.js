import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {LAVA_CRATER} from './volcanic-layout.js';
import {rockBand,tectonicLayers,tectonicProfile} from './tectonic-layout.js';
import {sectionRock,sectionCover} from './tectonic-section-data.js';
import {riverSample} from './water-system.js';

const palette=['#5f504e','#a36e60','#997e66','#caa981','#ece0a0','#a6775f','#80615a'];
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const mix=(a,b,t)=>a+(b-a)*t;
const samples=(count,fn)=>Array.from({length:count+1},(_,i)=>fn(i/count));

function rockExposure(station){
  const {id,x,z}=station;
  const root=new THREE.Group();
  const faceZ=u=>z-2.3*Math.cos(u/16)-u*.16;
  const base=Math.max(...samples(36,t=>{
    const u=(t-.5)*98;
    return terrainHeight(x+u,faceZ(u));
  }));
  const point=(layer,block,t)=> {
    const q=rockBand(id,layer,block,t);
    return [x+q.x,base+q.y+5,faceZ(q.x)];
  };
  for(let block=0;block<(id==='fault'?2:1);block++){
    for(let band=-2;band<5;band++){
      const v=[],indices=[];
      const top=band===4;
      for(let i=0;i<=32;i++){
        const a=point(band,block,i/32),b=point(band+1,block,i/32);
        if(band===-2)a[1]=Math.min(a[1],terrainHeight(a[0],a[2])-1);
        v.push(...a,...b);
        if(top){
          const backX=b[0],backZ=b[2]-31;
          v.push(backX,terrainHeight(backX,backZ)-1,backZ);
        }
        if(i){
          const j=(i-1)*(top?3:2),next=j+(top?3:2);
          indices.push(j,next,j+1,j+1,next,next+1);
          if(top)indices.push(j+1,next+1,j+2,j+2,next+1,next+2);
        }
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
      geometry.setIndex(indices);geometry.computeVertexNormals();
      root.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
        color:palette[band+2],roughness:.9,side:THREE.DoubleSide
      })));
    }
    for(const end of [0,1]){
      const a=point(-2,block,end),b=point(5,block,end),backZ=b[2]-31;
      a[1]=Math.min(a[1],terrainHeight(a[0],a[2])-1);
      const vertices=[...a,...b,b[0],terrainHeight(b[0],backZ)-1,backZ];
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      geometry.computeVertexNormals();
      root.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
        color:palette[0],roughness:.9,side:THREE.DoubleSide
      })));
    }
  }
  return root;
}

function sectionFace(points,layer,includeMarine){
  const positions=[],colors=[],tint=new THREE.Color();
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],marine=a.rock==='offshore'&&b.rock==='offshore';
    if(marine!==includeMarine)continue;
    if(layer==='water'&&(a.waterLevel===null||b.waterLevel===null))continue;
    const face=p=>{
      const top=p.y+.24;
      if(layer==='water')return [top,p.waterLevel+.25,'#82d7f1'];
      if(layer==='cover')return [top-p.coverDepth,top,sectionCover[p.cover].color];
      return [top-p.coverDepth-31,top-p.coverDepth,sectionRock[p.rock].color];
    };
    const va=face(a),vb=face(b);
    for(const [p,edge,side] of [[a,va,0],[b,vb,0],[a,va,1],[b,vb,0],[b,vb,1],[a,va,1]]){
      positions.push(p.x,edge[side],p.z);
      tint.set(edge[2]);colors.push(tint.r,tint.g,tint.b);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
    vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:layer==='water'?.47:.85,
    depthTest:false,depthWrite:false,toneMapped:false
  }));
  mesh.name='continuous section '+layer+(includeMarine?' sea floor':' land');
  mesh.renderOrder=layer==='water'?33:layer==='cover'?32:31;
  return mesh;
}

function buildSectionEvidence(root,profile){
  const strips=new Map();
  for(const layer of ['rock','cover','water']){
    const group=new THREE.Group();
    const land=sectionFace(profile.points,layer,false),marine=sectionFace(profile.points,layer,true);
    group.add(land,marine);root.add(group);strips.set(layer,{group,marine});
  }
  const arrows=new THREE.Group();
  for(const t of [.151,.204,.262,.32,.373,.421,.459,.503,.552]){
    const p=riverSample(t),origin=new THREE.Vector3(p.x,p.level+6,p.z);
    const arrow=new THREE.ArrowHelper(new THREE.Vector3(p.dx,0,p.dz),origin,31,'#89e7ff',10,6);
    arrow.name='flow along the central river';
    for(const segment of [arrow.line,arrow.cone]){
      segment.material.depthTest=false;segment.material.depthWrite=false;segment.renderOrder=37;
    }
    arrows.add(arrow);
  }
  root.add(arrows);
  return (layers,hideSea,guide)=>{
    for(const [id,{group,marine}] of strips){
      group.visible=guide&&layers.has(id);marine.visible=hideSea;
    }
    arrows.visible=guide&&layers.has('water');
  };
}

export function createTectonicScene(scene,sea){
  const root=new THREE.Group();
  root.name='tectonic setting and outcrops';
  root.visible=false;
  scene.add(root);
  const groups=new Map(),labels=new Map(),exposures=new Map();
  let profile,route,selection,structures,priorSea,showEvidence;
  let seabed=false;
  const position=(x,z,floor=seabed)=>new THREE.Vector3(x,Math.max(floor?-Infinity:3,terrainHeight(x,z))+9,z);

  function tube(group,points,radius,color){
    const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(8,points.length*2),radius,5,false);
    const stroke=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color}));
    group.add(stroke);
    return stroke;
  }
  function mapTrace(group,from,to,fn,color,depth=false,radius=4){
    const points=samples(Math.round((to-from)/17),t=>{
      const [x,z]=fn(mix(from,to,t));return position(x,z,depth);
    });
    return tube(group,points,radius,color);
  }
  function initialize(){
    if(profile)return;
    profile=tectonicProfile(terrainHeight);
    for(const {id,color} of tectonicLayers){
      const group=new THREE.Group(),wet=new THREE.Group(),dry=new THREE.Group();
      groups.set(id,{group,wet,dry,color});
      group.add(wet,dry);root.add(group);
    }
    const b=groups.get('boundary');
    const trench=z=>[1810+Math.sin((z-1400)/180)*9,z];
    mapTrace(b.wet,1165,1540,trench,b.color);
    mapTrace(b.dry,1165,1540,trench,b.color,true);
    for(const z of [1230,1370,1500]){
      for(const group of [b.wet,b.dry]){
        const p=position(1890,z,group===b.dry);p.y+=19;
        group.add(new THREE.ArrowHelper(new THREE.Vector3(-.97,0,-.24).normalize(),p,65,b.color,20,14));
      }
    }
    const m=groups.get('margin');
    for(const [x,radius] of [[1455,3],[1650,3.5]])mapTrace(m.dry,685,1455,z=>[x+Math.sin(z/118)*8,z],m.color,true,radius);
    const a=groups.get('volcano');
    mapTrace(a.group,-175,223,z=>[LAVA_CRATER.x-13+6*Math.sin(z/76),z],a.color,false,3.6);
    const f=groups.get('fold');
    structures=new THREE.Group();f.group.add(structures);
    const thrust=x=>[x,-1050-(x-998)*.46+11*Math.sin(x/46)];
    mapTrace(structures,917,1288,thrust,f.color,false,3.3);
    for(const x of [952,1016,1092,1169,1241]){
      const [,z]=thrust(x);
      const points=[[x-11,z-15],[x+7,z-20],[x+13,z-3]].map(([xx,zz])=>position(xx,zz));
      tube(structures,points,2.9,f.color);
    }
    for(const phase of [0,58,111]){
      mapTrace(structures,1093,1480,x=>[x,-1118-(x-1093)*.51-phase+22*Math.sin((x-1120)/90)],
        f.color,false,2.8);
    }
    for(const station of profile.stations){
      const {id,layer,x,z,name}=station;
      const g=groups.get(layer);
      const beacon=new THREE.Mesh(new THREE.TorusGeometry(15,2.8,6,32),new THREE.MeshBasicMaterial({color:g.color}));
      beacon.rotation.x=-Math.PI/2;g.group.add(beacon);
      labels.set(id,{station,beacon,text:name});
      if(id==='fault'||id==='fold'){
        const rock=rockExposure(station);
        exposures.set(id,rock);f.group.add(rock);
      }
    }
    route=new THREE.Group();
    const points=profile.points.filter((_,i)=>i%3===0||i===profile.points.length-1);
    for(const floor of [false,true]){
      const stroke=tube(route,points.map(p=>position(p.x,p.z,floor)),2.3,'#f3e4b7');
      stroke.userData.seabed=floor;
    }
    root.add(route);
    showEvidence=buildSectionEvidence(root,profile);
    selection=new THREE.Mesh(new THREE.TorusGeometry(23,2.5,6,36),new THREE.MeshBasicMaterial({color:'#fff0af'}));
    selection.rotation.x=-Math.PI/2;root.add(selection);
  }

  return {
    get profile(){initialize();return profile;},
    show({layers,station,hideSea=false,guide=true,sectionLayers=new Set()}){
      initialize();
      root.visible=true;seabed=hideSea;
      if(seabed){
        priorSea??=sea.visible;
        sea.visible=false;
      }else if(priorSea!==undefined){
        sea.visible=priorSea;priorSea=undefined;
      }
      for(const [id,{group,wet,dry}] of groups){
        group.visible=layers.has(id);
        wet.visible=!seabed;dry.visible=seabed;
      }
      const exposure=station?.id==='fault'||station?.id==='fold';
      route.visible=guide&&!exposure;
      showEvidence(sectionLayers,seabed,guide);
      structures.visible=!exposure;
      exposures.forEach((rock,id)=>{rock.visible=!exposure||station.id===id;});
      route.children.forEach(o=>{o.visible=o.userData.seabed===seabed;});
      for(const {station:p,beacon} of labels.values()){
        beacon.position.copy(position(p.x,p.z));
        beacon.visible=!exposure;
      }
      selection.visible=!!station&&!exposure;
      if(station)selection.position.copy(position(station.x,station.z));
      return [...labels.values()].filter(({station:p})=>p===station||!exposure&&layers.has(p.layer)).map(({station:p,beacon,text})=>({
        x:p.x,z:p.z,y:beacon.position.y+(exposure?65:clamp(p.distance*.045,12,24)),color:groups.get(p.layer).color,text,id:p.id
      }));
    },
    hide(){
      root.visible=false;
      if(priorSea!==undefined){sea.visible=priorSea;priorSea=undefined;}
    }
  };
}

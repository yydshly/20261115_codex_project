import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {geyserState,ventBed,ventRoutes} from './fluid-vents.js';

const tau=Math.PI*2;
function rand(i,s){
  const value=Math.sin(i*127.1+s*311.7)*43758.5453;
  return value-Math.floor(value);
}
const palette=new Map();
function skin(color){
  if(!palette.has(color))palette.set(color,new THREE.MeshStandardMaterial({color,roughness:.82}));
  return palette.get(color);
}
const stone=new THREE.IcosahedronGeometry(1,0),oval=new THREE.SphereGeometry(1,9,7);
const tube=new THREE.CylinderGeometry(.72,1,1,7);

function scatter(group,geometry,color,items){
  const mesh=new THREE.InstancedMesh(geometry,skin(color),items.length),pose=new THREE.Object3D(),tint=new THREE.Color();
  items.forEach(({x,y,z,a,b,c,turn=0,roll=0},i)=>{
    pose.position.set(x,y,z);pose.rotation.set(0,turn,roll);pose.scale.set(a,b,c);pose.updateMatrix();
    mesh.setMatrixAt(i,pose.matrix);mesh.setColorAt(i,tint.setScalar(.74+rand(i,9)*.40));
  });
  group.add(mesh);
  return mesh;
}

// Each radius and height pair describes one ring in the surface profile.
function radial(group,x,z,rx,rz,profile,color,base=terrainHeight,roughness=.8){
  const points=[],indices=[],segments=52;
  for(const [r,h] of profile)for(let i=0;i<=segments;i++){
    const a=i/segments*tau,edge=r*(1+.06*Math.cos(5*a)+.035*Math.sin(8*a));
    const px=x+rx*edge*Math.cos(a),pz=z+rz*edge*Math.sin(a);
    points.push(px,base(px,pz)+h,pz);
  }
  for(let r=0;r<profile.length-1;r++)for(let i=0;i<segments;i++){
    const a=r*(segments+1)+i,b=a+segments+1;
    indices.push(a,a+1,b,b,a+1,b+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness,side:THREE.DoubleSide}));
  group.add(mesh);return mesh;
}

function particles(group,count,color,opacity,move){
  const mat=new THREE.MeshBasicMaterial({color,opacity,transparent:true,depthWrite:false});
  const mesh=new THREE.InstancedMesh(oval,mat,count),pose=new THREE.Object3D();
  const samples=Array.from({length:count},(_,i)=>[rand(i,3),rand(i,5)*tau,rand(i,6),rand(i,8)]);
  mesh.frustumCulled=false;mesh.renderOrder=3;group.add(mesh);
  return (time,state)=>{
    samples.forEach(([start,angle,r,rate],i)=>{
      const age=(start+time*(.23+.16*rate))%1;
      move(pose,age,angle,r,rate,state);
      pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;
  };
}

function seaFeature(group,p){
  const vent=p.id==='vent',animations=[];
  if(vent){
    const chimneys=[[0,0,6.2,1.36],[-3.8,2.2,3.9,.87],[2.7,-3.1,4.4,.94],[-5.3,-2.8,2.3,.71],[1.6,4.1,3,.74]];
    for(const [dx,dz,h,r] of chimneys){
      const x=p.x+dx,z=p.z+dz,y=terrainHeight(x,z)-.15;
      radial(group,x,z,r,r*.90,[[1.95,0],[1.30,h*.29],[.99,h*.51],[1.14,h*.66],[.70,h*.95],[.51,h],[.27,h*.91]],
        '#56413a',()=>y);
      radial(group,x,z,r,r*.9,[[.66,h*.82],[.70,h*.95],[.51,h],[.27,h*.91],[.25,h*.85]],'#221f22',()=>y);
      animations.push(particles(group,dx===0?106:28,'#231e21',.24,(pose,age,angle,radius)=>{
        const spread=(.25+age*1.75)*radius,size=.15+age*.45;
        pose.position.set(x+Math.cos(angle)*spread+4*age**2,y+h+age*10,z+Math.sin(angle)*spread+age);
        pose.scale.set(size,size*1.16,size);
      }));
    }
  }else{
    for(const [dx,dz,r] of [[0,0,5.5],[-3.1,4.0,2.7],[3.4,-4,3.7],[5.9,4.4,2.0]]){
      radial(group,p.x+dx,p.z+dz,r,r*.72,[[0,.16],[.4,.22],[.67,.28],[.86,.20],[1,.10]],
        '#ddd9bc');
    }
    for(const [dx,dz] of [[0,0],[2.7,-3],[-2.5,3.5]]){
      const x=p.x+dx,z=p.z+dz,y=terrainHeight(x,z)+.20;
      animations.push(particles(group,38,'#a4c8d5',.44,(pose,age,angle,r,rate)=>{
        const s=.065+.095*r;
        pose.position.set(x+Math.sin(age*7+angle)*(.12+age*.58)+1.15*age**2,y+age*(5.8+rate*2.5),z+Math.cos(age*6+angle)*age*.7);
        pose.scale.set(s,s*.84,s);
      }));
    }
  }

  const rocks=[],organisms=[];
  for(let i=0;i<280;i++){
    const a=i*2.39996,d=2.6+13*rand(i,13)**1.6;
    const x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;
    const y=terrainHeight(x,z),size=.2+rand(i,12)*.76,turn=rand(i,7)*tau;
    if(i%5===0)rocks.push({x,y:y+size*.24,z,a:size*1.1,b:size*.62,c:size*.78,turn});
    if(vent&&d>4.3&&d<10.5&&Math.sin(a*8+d)>.03){
      const h=.49+rand(i,2)*1.1;
      organisms.push({x,y:y+h*.48,z,a:.075,b:h,c:.076,turn,roll:(rand(i,16)-.5)*.45});
    }
    if(!vent&&d<10.2&&Math.sin(x*2.68+z*.79)>-.36){
      organisms.push({x,y:y+.19,z,a:size*.31,b:size*.42,c:size*.21,turn,roll:.42});
    }
  }
  scatter(group,stone,vent?'#50464b':'#9a9b8d',rocks);
  if(vent){
    scatter(group,tube,'#dfd4bd',organisms);
    scatter(group,oval,'#b54547',organisms.map(p=>({
      ...p,x:p.x-Math.sin(p.roll)*p.b*.43,y:p.y+p.b*.48,a:.11,b:.145,c:.103
    })));
  }else scatter(group,oval,'#353442',organisms);
  return (time,state)=>{for(const animate of animations)animate(time,state);};
}

function geyser(group,p){
  const y=ventBed(p),base=()=>y;
  radial(group,p.x,p.z,5.9,4.8,[[.14,1.25],[.21,1.72],[.33,1.65],[.54,.98],[.78,.60],[1,.17]],
    '#e1cc9c',base);
  radial(group,p.x,p.z,.99,.8,[[0,1.39],[1,1.39]],'#4b9da8',base,.24);
  const jet=new THREE.Mesh(new THREE.CylinderGeometry(.18,.72,1,12),
    new THREE.MeshBasicMaterial({color:'#c5eef3',transparent:true,opacity:.63,depthWrite:false}));
  jet.renderOrder=2;group.add(jet);
  const spray=particles(group,128,'#d7f4f6',.77,(pose,age,angle,r,rate,state)=>{
    const height=state.lift*13.6,arc=4*age*(1-age),radius=.23+age*height*r*.38;
    pose.position.set(p.x+Math.cos(angle)*radius+arc*r,p.y+1.44+height*arc*(.53+.66*rate),
      p.z+Math.sin(angle)*radius);
    const size=state.lift<.015?0:.048+r*.13;
    pose.scale.set(size,size*(2.1-age),size);
  });
  const steam=steamCloud(group,p.x,y+1.55,p.z,.76);
  return (time,state)=>{
    const height=state.lift*10.7;
    jet.visible=height>.08;
    jet.position.set(p.x,y+1.4+height*.5,p.z);jet.scale.y=height;
    spray(time,state);steam(time,state);
  };
}

function steamCloud(group,x,y,z,width){
  return particles(group,40,'#eee9d7',.17,(pose,age,a,r)=>{
    const w=width*(.48+age*1.30)*r,s=.14+age*.39;
    pose.position.set(x+Math.cos(a)*w+age**2*1.7,y+age*3.6,z+Math.sin(a)*w);
    pose.scale.set(s,s*1.6,s);
  });
}

function terrace(group,p){
  const base=ventBed(p);
  const basins=[[-9,-5,3.85,4.5],[-3,-2,2.9,5.7],[3,1,1.87,6.5],[10,3,.83,7.1]];
  const levels=basins.map(([dx,dz,h,r])=>({x:p.x+dx,z:p.z+dz,level:base+h,r}));
  levels.forEach(({x,z,level,r},i)=>{
    radial(group,x,z,r*1.17,r*.76,[[0,0],[.73,.04],[.84,.30],[.91,.21],[1,.09]],
      i%2?'#ebc889':'#eee0b0',()=>level);
    // Mineral skirts extend down until they meet the actual slope.
    radial(group,x,z,r*1.17,r*.76,[[.86,.18],[.94,.02],[1.06,-.30],[1.16,-.65],[1.24,-1.18],[1.30,-2.45]],
      i%2?'#bc8f60':'#d6b080',()=>level);
    radial(group,x,z,r*.94,r*.60,[[0,.12],[.7,.12],[1,.12]],i<2?'#5eabad':'#9bbc9d',()=>level,.23);
  });
  const vertices=[],indices=[];
  levels.forEach(({x,z,level},i)=>{
    vertices.push(x,level+.26,z-.65,x,level+.27,z+.65);
    if(i){const a=(i-1)*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#c1e4ce',side:THREE.DoubleSide,transparent:true,opacity:.76})));
  const steam=steamCloud(group,levels[0].x,levels[0].level+.24,levels[0].z,1.5);
  return (time,state)=>steam(time,state);
}

function mudpot(group,p){
  const y=ventBed(p);
  radial(group,p.x,p.z,9.4,7.2,[[0,.23],[.45,.25],[.64,.28],[.76,.57],[.89,.24],[1,.08]],
    '#d4ba79');
  radial(group,p.x,p.z,6.0,4.1,[[0,.40],[.52,.39],[.77,.42],[.94,.30],[1,.26]],
    '#827568',terrainHeight,.36);
  const animate=particles(group,29,'#afa18f',.86,(pose,age,a,r)=>{
    const x=p.x+4.2*Math.cos(a)*r,z=p.z+2.9*Math.sin(a)*r;
    const s=Math.sin(Math.PI*age)**2*(.095+.22*r);
    pose.position.set(x,terrainHeight(x,z)+.40+s*.6,z);pose.scale.set(s,s*.68,s);
  });
  const steam=steamCloud(group,p.x+4,y+.65,p.z-2,1.03);
  return (time,state)=>{animate(time,state);steam(time,state);};
}

function routeLine(route){
  const list=ventRoutes[route].stops,points=[];
  for(let i=1;i<list.length;i++){
    const a=list[i-1],b=list[i],n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/6);
    for(let j=0;j<n;j++){
      const t=j/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      points.push(new THREE.Vector3(x,terrainHeight(x,z)+(route==='ocean'?5:.8),z));
    }
  }
  const end=list.at(-1);points.push(new THREE.Vector3(end.x,ventBed(end)+(route==='ocean'?5:.8),end.z));
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({color:'#f4c283',depthTest:false,depthWrite:false,toneMapped:false}));
  line.renderOrder=51;return line;
}

export function createFluidVentScene(scene,{sea,oceanGuides}){
  const root=new THREE.Group();
  root.name='Fluid outlets on east coast and southeast seabed';root.visible=false;scene.add(root);
  const lamp=new THREE.SpotLight('#d6eefb',0,80,.56,.57,2);
  root.add(lamp,lamp.target);
  function followDive(eye,focus){
    if(lamp.intensity<=0)return;
    lamp.position.set(eye.x-.45,Math.min(eye.y+1,-.1),eye.z-.55);
    if(focus){
      lamp.target.position.set(focus.x,focus.y-.75,focus.z);
      lamp.intensity=Math.min(1600,3.2*lamp.position.distanceToSquared(lamp.target.position));
    }
  }
  let plots=null,tracks,saved=null,route='ocean',station=null,time=0,animation=null;
  const builders={vent:seaFeature,seep:seaFeature,geyser,terrace,acid:mudpot};
  function prepare(){
    plots=new Map();
    for(const config of Object.values(ventRoutes))for(const p of config.stops){
      const build=builders[p.id];
      if(!build)continue;
      const group=new THREE.Group();group.name=p.id;
      const update=build(group,{...p,y:ventBed(p)});
      root.add(group);plots.set(p.id,{group,update});
    }
    tracks=Object.fromEntries(Object.keys(ventRoutes).map(id=>[id,routeLine(id)]));
    root.add(...Object.values(tracks));
  }
  return {
    show(id,p,view){
      if(!plots)prepare();
      route=id;station=p;
      saved??={sea:sea.visible,guides:oceanGuides.visible};
      sea.visible=route==='land'&&saved.sea;
      oceanGuides.visible=route==='land'&&saved.guides;
      root.visible=true;
      for(const [key,{group}] of plots)group.visible=p?p.id===key:ventRoutes[route].stops.some(s=>s.id===key);
      for(const [key,line] of Object.entries(tracks))line.visible=!station&&route===key;
      const dive=route==='ocean'&&view?.[5];
      lamp.intensity=dive?Math.min(1440,480+11*(view[0]-dive.x)**2/4):0;
      if(dive){
        lamp.target.position.set(p.x,dive.targetY-1,p.z);
        followDive(dive);
      }
      animation=p?plots.get(p.id)?.update:null;
    },
    followDive,
    update(dt,progress){
      time=(time+dt)%240;
      const state=geyserState(progress);
      if(station)animation?.(time,state);
      else for(const {group,update} of plots.values())if(group.visible)update(time,state);
    },
    hide(){
      root.visible=false;lamp.intensity=0;
      if(!saved)return;
      sea.visible=saved.sea;oceanGuides.visible=saved.guides;saved=null;
    }
  };
}

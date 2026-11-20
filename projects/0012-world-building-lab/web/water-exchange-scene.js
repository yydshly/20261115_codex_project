import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {cellPosition} from './watershed-world.js';
import {buildWaterExchange,exchangeLayers,exchangeState} from './water-exchange.js';

const colors=Object.fromEntries(exchangeLayers.map(p=>[p.id,p.color]));
const clamp=value=>Math.max(0,Math.min(1,value));
const mix=(a,b,t)=>a+(b-a)*t;
const points=(n,fn)=>Array.from({length:n+1},(_,i)=>fn(i/n));
const lift=(p,offset=4)=>new THREE.Vector3(p.x,Math.max(p.level??-Infinity,terrainHeight(p.x,p.z))+offset,p.z);
const mat=(color,opacity)=>new THREE.MeshBasicMaterial({
  color,opacity,transparent:opacity<1,depthWrite:opacity>=1,toneMapped:false,side:THREE.DoubleSide
});

function tube(group,positions,width,material){
  const unique=positions.filter((v,i)=>i===0||v.distanceToSquared(positions[i-1])>1e-6);
  const curve=new THREE.CatmullRomCurve3(unique);
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(10,unique.length*2),width,5,false),material);
  group.add(mesh);
  return {mesh,curve};
}

function shade(group,model){
  // Tessellate each contributing cell against the real terrain and retain the grid outline.
  const vertices=[],indices=[],g=model.grid,half=g.step/2,step=g.step/4;
  for(const k of model.cells){
    const p=cellPosition(g,k),base=vertices.length/3;
    for(let j=0;j<=4;j++)for(let i=0;i<=4;i++){
      const x=p.x-half+i*step,z=p.z-half+j*step;
      vertices.push(x,terrainHeight(x,z)+1.1,z);
      if(i<4&&j<4){
        const n=base+j*5+i;indices.push(n,n+5,n+1,n+1,n+5,n+6);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
  group.add(new THREE.Mesh(geometry,mat(colors.recharge,.36)));
}

function tracer(group,curve,count,color,size){
  const geometry=new THREE.ConeGeometry(size*.55,size*2.35,5),material=mat(color,1);
  const meshes=Array.from({length:count},()=>new THREE.Mesh(geometry,material));
  group.add(...meshes);
  const up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
  return (time,speed,density)=>{
    meshes.forEach((arrow,i)=>{
      arrow.visible=i<density;
      if(!arrow.visible)return;
      const base=(i+.39)/count,t=(base+time*speed)%1;
      curve.getPointAt(t,arrow.position);
      curve.getTangentAt(t,direction);
      arrow.quaternion.setFromUnitVectors(up,direction.normalize());
    });
  };
}

export function createWaterExchangeScene(scene,balance,{reduced=false}={}){
  const root=new THREE.Group();
  root.name='recharge and runoff meeting the northern tributary';
  root.visible=false;scene.add(root);
  const groups=Object.fromEntries(exchangeLayers.map(l=>{
    const group=new THREE.Group();root.add(group);return [l.id,group];
  }));
  let model,overlays,runoff,ground,springFlow,rain,beacon,wetRoute,dryRoute,marks,time=0,viewState,ownsBalance=false;
  let runoffArrows,groundArrows,springArrows,wetArrows,dryArrows;

  function initialize(){
    if(model)return;
    model=buildWaterExchange(balance.model,terrainHeight);
    const divide=mat(colors.divide,.75);
    for(const [a,b] of model.divides)tube(groups.divide,points(4,t=>lift({
      x:mix(a.x,b.x,t),z:mix(a.z,b.z,t)
    },5)),1.35,divide);
    shade(groups.recharge,model);
    rain=new THREE.Group();groups.recharge.add(rain);
    const rainMaterial=mat(colors.recharge,.85);
    for(const k of model.cells){
      const p=cellPosition(model.grid,k),v=lift(p,12);
      const inlet=new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),v.clone().add(new THREE.Vector3(0,13,0)),
        20,colors.recharge,6,6);
      const tip=new THREE.Mesh(new THREE.TorusGeometry(4.9,.8,4,14),rainMaterial);
      tip.position.copy(v);tip.position.y-=10;tip.rotation.x=-Math.PI/2;
      rain.add(inlet,tip);
    }
    const rillMaterial=mat(colors.surface,.83);
    for(const path of model.rills){
      const route=path.map(k=>cellPosition(model.grid,k));
      tube(groups.surface,route.map(p=>lift(p,5)),1.75,rillMaterial);
    }
    runoff=new THREE.Group();groups.surface.add(runoff);
    const over=tube(runoff,model.runway.map(p=>lift(p,4.4)),1.9,mat(colors.surface,.87));
    runoffArrows=tracer(runoff,over.curve,8,colors.surface,4.4);
    const start=model.center,end=model.spring;
    const projection=points(30,t=>lift({x:mix(start.x,end.x,t)+8*Math.sin(t*Math.PI),z:mix(start.z,end.z,t)},8));
    ground=new THREE.Group();groups.ground.add(ground);
    const subsurface=mat(colors.ground,.9);
    for(let i=0;i<projection.length-2;i+=3)tube(ground,projection.slice(i,i+3),1.2,subsurface);
    const groundCurve=new THREE.CatmullRomCurve3(projection);
    groundArrows=tracer(ground,groundCurve,6,colors.ground,4);
    const point=model.spring,stone=new THREE.Mesh(new THREE.IcosahedronGeometry(.9,0),
      new THREE.MeshStandardMaterial({color:'#697a68',roughness:.96}));
    stone.position.set(point.x,point.y-.24,point.z);
    stone.scale.set(2.7,1.06,1.9);groups.ground.add(stone);
    springFlow=new THREE.Group();groups.ground.add(springFlow);
    const creek=tube(springFlow,model.creek.map(p=>new THREE.Vector3(p.x,p.y+.25,p.z)),.55,mat(colors.ground,.92));
    springArrows=tracer(springFlow,creek.curve,4,'#c4ffde',1.1);
    beacon=new THREE.Mesh(new THREE.TorusGeometry(2,.22,5,24),mat('#bbffdc',.9));
    beacon.rotation.x=-Math.PI/2;beacon.position.set(point.x,point.y+.1,point.z);groups.ground.add(beacon);

    wetRoute=new THREE.Group();dryRoute=new THREE.Group();
    groups.merged.add(wetRoute,dryRoute);
    const routes=[[wetRoute,model.routes.high],[dryRoute,model.routes.low]];
    [wetArrows,dryArrows]=routes.map(([group,route])=>{
      const path=tube(group,route.map(p=>lift(p,3.1)),1.3,mat(colors.merged,.67));
      return tracer(group,path.curve,12,colors.merged,4.7);
    });
    marks=new THREE.Group();root.add(marks);
    overlays=model.stations.map(p=>{
      const keys={divide:'divide',recharge:'recharge',spring:'ground',join:'merged',wetland:'merged'};
      const y=terrainHeight(p.x,p.z);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(p.id==='spring'?7:12,1.45,5,26),mat(colors[keys[p.id]],.94));
      ring.rotation.x=-Math.PI/2;ring.position.set(p.x,Math.max(y,p.level??-100)+6,p.z);
      marks.add(ring);
      return {id:p.id,text:p.name,x:p.x,z:p.z,y:ring.position.y+18,color:colors[keys[p.id]],ring};
    });
  }

  function animate(){
    const {state,season,close}=viewState;
    const ratio=state.baseflow/(state.unit==='m³/时'?22:state.unit==='m³/日'?4:130);
    runoffArrows(time,.13+clamp(state.surface/240)*.2,6);
    groundArrows(time,.085+clamp(ratio)*.085,4);
    springArrows(time,.16+clamp(ratio)*.16,close?4:2);
    if(season==='wet')wetArrows(time,state.unit==='m³/日'?.08:.16,state.unit==='m³/日'?8:12);
    else dryArrows(time,.08,8);
    beacon.scale.setScalar(1+Math.sin(time*2.1)*.12);
  }

  return {
    get model(){initialize();return model;},
    show({season,noRain=false,station,layers,overlay=false,source=null}){
      initialize();
      const reference=exchangeState(model,season,noRain);
      const state=source?{...reference,surface:source.runoff,baseflow:source.baseflow,unit:'m³/时'}:reference;
      const close=station?.id==='spring';
      viewState={state,season,close};
      if(!overlay){balance.show(state.month,'wetland','water');ownsBalance=true;}
      root.visible=true;
      for(const [id,group] of Object.entries(groups)){
        group.visible=layers.has(id)&&(id!=='surface'||state.surface>1);
      }
      // Wider teaching traces lift off the ground. Close-up retains the actual spring ribbon.
      ground.visible=!close;
      springFlow.visible=!source||source.baseflow>.02;
      marks.visible=!overlay;
      rain.visible=!overlay&&season==='wet'&&!noRain;
      runoff.visible=!close;
      wetRoute.visible=season==='wet';
      dryRoute.visible=season==='dry';
      for(const p of overlays)p.ring.visible=!station||station.id===p.id;
      if(!reduced||time===0)animate();
      return {
        state,
        labels:overlay?overlays.filter(p=>p.id==='recharge'||p.id==='spring'||p.id==='wetland'):
          station?overlays.filter(p=>p.id===station.id):overlays
      };
    },
    hide(){
      if(!root.visible)return;
      root.visible=false;
      if(ownsBalance){balance.hide();ownsBalance=false;}
    },
    update(dt){
      if(!root.visible||reduced)return;
      time+=dt;animate();
    }
  };
}

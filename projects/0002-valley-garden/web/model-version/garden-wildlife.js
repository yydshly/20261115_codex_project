import * as THREE from 'three';
import { createWildlifeSurfaces } from './wildlife-surfaces.js';
import { butterflyShapes,birdShapes } from './wildlife-shapes.js';

const TAU=Math.PI*2,up=new THREE.Vector3(0,1,0);
const smooth=THREE.MathUtils.smoothstep;
const mod=(a,b)=>(a%b+b)%b;
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const wingStroke=phase=>{const p=mod(phase,1);return p<.40?THREE.MathUtils.lerp(1.08,-.76,smooth(p,0,.40)):THREE.MathUtils.lerp(-.76,1.08,smooth(p,.40,1));};

/** A few modest animals, made locally; no downloaded assets or transparent cards. */
export function createGardenWildlife(scene,{flowerPerches,heightAt,random,animate=true,wind=null}){
  const group=new THREE.Group();group.name='Occasional valley birds and flower butterflies';group.userData.omitFromReflection=true;scene.add(group);
  const surfaces=createWildlifeSurfaces(),butterflyGeometry=butterflyShapes(),birdGeometry=birdShapes();
  const butterflies=[],birds=[];
  let high=true,lastTime=0;
  function mesh(geometry,parent,name,material=surfaces.body){const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=false;m.receiveShadow=true;parent.add(m);return m;}
  for(const [index,cx,cz] of [[0,-2.05,1.4],[1,2.05,2.5],[2,6.8,5.4]]){
    const candidates=flowerPerches.filter(p=>Math.hypot(p.x-cx,p.z-cz)<1.8&&p.y-heightAt(p.x,p.z)>.12)
      .sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz));
    if(candidates.length<3)continue;
    const stops=[];
    for(const p of candidates){if(stops.every(q=>Math.hypot(q.x-p.x,q.z-p.z)>.25)){const stop=v(p.x,p.y,p.z);stop.plant=p;stops.push(stop);}if(stops.length===5)break;}
    if(stops.length<3)continue;
    const root=new THREE.Group();root.name=`Flower butterfly ${index+1}`;group.add(root);
    mesh(butterflyGeometry.body,root,'Segmented butterfly body, fine legs and antennae');
    const foreMaterial=surfaces.butterfly(index===1),hindMaterial=surfaces.butterfly(index===1);
    const wings=[-1,1].map(side=>{
      const hinge=new THREE.Group();hinge.scale.x=side;root.add(hinge);
      const fore=new THREE.Group();fore.position.set(.0017,.0006,.0055);hinge.add(fore);mesh(butterflyGeometry.fore,fore,'Cambered forewing with microscopic scales',foreMaterial);
      const hind=new THREE.Group();hind.position.set(.0014,.0004,-.0025);hinge.add(hind);mesh(butterflyGeometry.hind,hind,'Cambered hindwing with a separate stroke',hindMaterial);
      return {hinge,side,fore,hind};
    });
    const schedule=[];let clock=0;
    for(let i=0;i<stops.length;i++){
      const a=stops[i],b=stops[(i+1)%stops.length],rest=9+random()*10,duration=3.5+a.distanceTo(b)*1.7;
      const control1=a.clone().lerp(b,.28).add(v((random()-.5)*.24,.22+random()*.15,(random()-.5)*.20));
      const control2=a.clone().lerp(b,.70).add(v((random()-.5)*.24,.24+random()*.20,(random()-.5)*.20));
      schedule.push({start:clock,rest,end:clock+rest+duration,duration,a,b,curve:new THREE.CatmullRomCurve3([a,control1,control2,b],false,'centripetal')});clock+=rest+duration;
    }
    butterflies.push({root,wings,stops,schedule,foreMaterial,hindMaterial,period:clock,phase:index*14,frequency:7.5+index*.8,index,state:{}});
  }
  for(let i=0;i<2;i++){
    const root=new THREE.Group();root.name=`Valley swallow ${i+1}`;group.add(root);
    const featherMaterial=surfaces.feathers(),bodyMaterial=surfaces.feathers();
    mesh(birdGeometry.body,root,'Continuous feathered body, neck and head',bodyMaterial);
    const tail=new THREE.Group();tail.position.z=-.06;root.add(tail);
    const tailGeometry=birdGeometry.tail.clone().translate(0,0,.06);mesh(tailGeometry,tail,'Fanned forked tail feathers',bodyMaterial);
    const wings=[-1,1].map(side=>{
      const hinge=new THREE.Group();hinge.position.x=side*.018;hinge.scale.x=side;root.add(hinge);mesh(birdGeometry.inner,hinge,'Cambered wing coverts and secondary feathers',bodyMaterial);
      const wrist=new THREE.Group();wrist.position.set(.082,0,-.01);hinge.add(wrist);mesh(birdGeometry.outer,wrist,'Overlapping tapered primary feathers',featherMaterial);return {hinge,wrist,side};
    });
    const routes=Array.from({length:3},(_,cycle)=>{
      const direction=i? -1:1,shift=(random()-.5)*7;
      return new THREE.CatmullRomCurve3([[-72,18,-23],[-38,20,-18],[-4,18.5,-13],[32,20.5,-17],[72,22,-34]].map(([x,y,z],n)=>v(x*direction,y+random()*1.5,z+shift+Math.sin(n+cycle)*3)),false,'centripetal');
    });
    birds.push({root,wings,tail,featherMaterial,bodyMaterial,routes,index:i,start:i?14:0,period:i?101:67,duration:i?16:19,state:{}});
  }
  const direction=new THREE.Vector3(),ahead=new THREE.Vector3(),behind=new THREE.Vector3(),lookTarget=new THREE.Vector3();
  const flowerOffset=point=>{const p=point.plant;return wind&&p?.windRoot?wind.plantOffset(p.windRoot,p.windHeight,p.plantHeight,.12):{x:0,y:0,z:0};};
  function sampleButterfly(b,time){
    const phase=mod(time+b.phase,b.period),segment=b.schedule.find(s=>phase<s.end)||b.schedule.at(-1),local=phase-segment.start;
    const flight=local>=segment.rest;
    let bank=0,lift=0;
    if(!flight){
      b.root.position.copy(segment.a);
      const previous=b.schedule[mod(b.schedule.indexOf(segment)-1,b.schedule.length)],incoming=previous.curve.getTangent(1),outgoing=segment.curve.getTangent(0);
      const start=Math.atan2(incoming.x,incoming.z),end=Math.atan2(outgoing.x,outgoing.z),delta=Math.atan2(Math.sin(end-start),Math.cos(end-start));
      const heading=start+delta*smooth(local,segment.rest*.28,segment.rest*.82);direction.set(Math.sin(heading),0,Math.cos(heading));
    }
    else{
      const u=THREE.MathUtils.clamp((local-segment.rest)/segment.duration,0,1),ease=u*u*(3-2*u),envelope=Math.sin(Math.PI*u)**2;
      lift=envelope;
      segment.curve.getPoint(ease,b.root.position);segment.curve.getTangent(ease,direction);
      b.root.position.x+=Math.sin(time*5.7+b.index)*.022*envelope;b.root.position.z+=Math.sin(time*4.1)*.018*envelope;
      b.root.position.y+=Math.sin(time*8.3)*.014*envelope;
      bank=Math.sin(time*3.1+b.index)*.10*envelope;
    }
    const oa=flowerOffset(segment.a),ob=flowerOffset(segment.b),s=flight?smooth(local,segment.rest,segment.end-segment.start):0;
    b.root.position.x+=THREE.MathUtils.lerp(oa.x,ob.x,s);b.root.position.z+=THREE.MathUtils.lerp(oa.z,ob.z,s);
    const heading=Math.atan2(direction.x,direction.z);b.root.rotation.set(0,heading,bank);
    // Ease the wing stroke in and out while the body remains seated on the scan.
    const takeoff=smooth(local,segment.rest-.55,segment.rest),landing=1-smooth(local,segment.rest+segment.duration-.6,segment.rest+segment.duration);
    const stroke=takeoff*landing,fold=1.28+Math.sin(time*.8+b.index)*.025,beat=time*b.frequency+b.index*.31+.025*Math.sin(time*1.2);
    const angle=THREE.MathUtils.lerp(fold,wingStroke(beat),stroke),hindAngle=THREE.MathUtils.lerp(fold-.075,wingStroke(beat-.085)*.94,stroke);
    for(const w of b.wings){w.fore.rotation.set(.06*Math.sin(beat*TAU)*stroke,0,angle);w.hind.rotation.set(.10*Math.sin((beat-.1)*TAU)*stroke,.035*Math.sin(beat*TAU)*stroke,hindAngle);}
    b.foreMaterial.userData.flex.value=Math.sin((beat-.16)*TAU)*stroke;b.hindMaterial.userData.flex.value=Math.sin((beat-.23)*TAU)*stroke;
    b.root.rotation.x=flight?THREE.MathUtils.clamp(Math.atan2(direction.y,Math.hypot(direction.x,direction.z))*.22,-.20,.20)*lift:0;
    Object.assign(b.state,{phase:flight?'flying':'resting',x:b.root.position.x,y:b.root.position.y,z:b.root.position.z,wing:angle});
  }
  function sampleBird(b,time){
    const age=time-b.start,cycle=Math.floor(age/b.period),phase=mod(age,b.period),flying=age>=0&&phase<b.duration;
    const u=THREE.MathUtils.clamp(phase/b.duration,0,1),curve=b.routes[mod(cycle,b.routes.length)];
    curve.getPointAt(u,b.root.position);curve.getTangentAt(u,direction);
    const ground=heightAt(b.root.position.x,b.root.position.z);b.root.position.y=Math.max(b.root.position.y,ground+13);
    curve.getTangentAt(Math.max(0,u-.012),behind);curve.getTangentAt(Math.min(1,u+.012),ahead);
    const bank=THREE.MathUtils.clamp((ahead.x*behind.z-ahead.z*behind.x)*7,-.35,.35);
    b.root.up.copy(up);b.root.lookAt(lookTarget.copy(b.root.position).add(direction));b.root.rotateZ(bank);
    const beat=time*(4.8+b.index*.35),burst=smooth(Math.sin(time*1.6+b.index*2),-.28,.32),stroke=wingStroke(beat)*.60;
    for(const w of b.wings){w.hinge.rotation.z=w.side*(.065+stroke*burst);w.wrist.rotation.set(.14*Math.sin((beat-.13)*TAU)*burst,.12*Math.sin((beat-.08)*TAU)*burst,-Math.max(0,wingStroke(beat-.1))*.30*burst);}
    b.featherMaterial.userData.flex.value=Math.sin((beat-.18)*TAU)*burst;b.bodyMaterial.userData.flex.value=0;
    b.tail.rotation.set(.07+burst*.025*Math.sin(beat*TAU),bank*.15,-bank*.18);
    Object.assign(b.state,{phase:flying?(burst>.5?'flapping':'gliding'):'away',flying,x:b.root.position.x,y:b.root.position.y,z:b.root.position.z,bank});
  }
  function update(time,camera){
    lastTime=time;
    for(const b of butterflies){
      sampleButterfly(b,animate?time:0);
      if(!animate){b.root.position.copy(b.stops[0]);const offset=flowerOffset(b.stops[0]);b.root.position.x+=offset.x;b.root.position.z+=offset.z;b.root.rotation.x=b.root.rotation.z=0;for(const w of b.wings){w.fore.rotation.set(0,0,1.28);w.hind.rotation.set(0,0,1.205);}b.foreMaterial.userData.flex.value=b.hindMaterial.userData.flex.value=0;Object.assign(b.state,{phase:'resting',x:b.root.position.x,y:b.root.position.y,z:b.root.position.z});}
      b.root.visible=(high||b.index<2)&&b.root.position.distanceTo(camera.position)<(high?28:18);
    }
    for(const b of birds){sampleBird(b,time);b.root.visible=animate&&b.state.flying&&(high||b.index===0)&&b.root.position.distanceTo(camera.position)<180;}
  }
  function inspect(){return {enabled:group.visible,butterflies:butterflies.filter(b=>group.visible&&b.root.visible).length,birds:birds.filter(b=>group.visible&&b.root.visible).length,
    phases:butterflies.map(b=>b.state.phase),birdPhases:birds.map(b=>b.state.phase),time:lastTime};}
  return {group,butterflies,birds,update,inspect,setVisible(value){group.visible=value;},setQuality(value){high=value;},
    reviewCamera(kind,camera){
      const actor=kind==='birds'?birds.find(b=>b.state.flying)||birds[0]:butterflies[0];if(!actor)return;
      const offset=kind==='birds'?v(.50,.17,.65):v(.12,.10,.23);
      camera.position.copy(actor.root.position).add(offset);camera.lookAt(actor.root.position);
    }
  };
}


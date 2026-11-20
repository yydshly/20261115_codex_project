import * as THREE from 'three';
import {CHINLE_BAR,MORRISON_LAKE,mesoRiverZ,mesozoicPoint,mesozoicWater} from './mesozoic-rivers.js';
import {frondGeometry} from './paleo-wetland-scene.js';

const mix=(a,b,t)=>a+(b-a)*t;
const random=(i,s)=>{const v=Math.sin(i*87.71+s*29.97)*43758.5453;return v-Math.floor(v);};
const ground={
  sandstone:new THREE.Color('#c4a47e'),redMud:new THREE.Color('#a8785b'),wetClay:new THREE.Color('#756457'),
  thinSilt:new THREE.Color('#ab8368'),shore:new THREE.Color('#b19f7a'),lakeMud:new THREE.Color('#73766a'),
  dryPlain:new THREE.Color('#a69a6d'),dampPlain:new THREE.Color('#737951')
};

export function mesozoicBedColor(id,q,color,phase){
  if(id==='triassic'){
    color.copy(ground.redMud).lerp(ground.sandstone,q.bar*.87);
    color.lerp(ground.wetClay,q.damp*.50);
    if(phase==='retreat')color.lerp(ground.thinSilt,q.deposited*.73);
  }else{
    const shore=Math.max(0,1-Math.abs(q.lake-.96)*3.7);
    color.copy(ground.dryPlain).lerp(ground.dampPlain,q.damp*.72);
    color.lerp(ground.shore,shore*.68);
    if(q.lake<.9)color.lerp(ground.lakeMud,(.9-q.lake)*.70);
  }
}

function makeDriftwood(bedAt,{reduced}){
  const root=new THREE.Group();root.name='triassic-driftwood';
  const bark=new THREE.MeshStandardMaterial({color:'#694631',roughness:.98});
  const faded=new THREE.MeshStandardMaterial({color:'#9e7954',roughness:.96});
  const rings=['#b89163','#805a3b','#b0885a'].map(color=>new THREE.MeshBasicMaterial({color}));
  const trunkGeo=new THREE.CylinderGeometry(.75,1,1,10).rotateZ(-Math.PI/2);
  const branchGeo=new THREE.CylinderGeometry(.32,1,1,7).rotateZ(-Math.PI/2);
  const diskGeo=new THREE.CircleGeometry(1,16).rotateY(-Math.PI/2);
  const wood=[];
  for(let i=0;i<150&&wood.length<28;i++){
    const x=CHINLE_BAR.x+(random(i,1)-.51)*164;
    const z=mesoRiverZ(x)+15+random(i,2)*33;
    const base=mesozoicPoint('triassic','retreat',x,z);
    const high=mesozoicWater('triassic','peak',x,z);
    if(base.depth>0||base.bed+.17>high||base.bar<.32)continue;
    const object=new THREE.Group(),length=5+random(i,3)*9,radius=.26+random(i,4)*.54;
    const trunk=new THREE.Mesh(trunkGeo,i%4===0?faded:bark);
    trunk.scale.set(length,radius,radius);object.add(trunk);
    for(let j=0;j<3;j++){
      const end=new THREE.Mesh(diskGeo,rings[j]);
      end.position.x=-length/2-.013-j*.01;
      end.scale.setScalar(radius*(.98-j*.29));
      object.add(end);
    }
    for(let j=0;j<3;j++){
      const stub=new THREE.Mesh(branchGeo,j%2===0?faded:bark);
      stub.rotation.set(0,(j-1)*.52,.42+(j%2)*.46);
      stub.scale.set(.8+random(i,5+j)*2.3,radius*.34,radius*.34);
      stub.position.set(length*(-.12+j*.17),radius*.87,(j%2-.5)*radius*.82);
      object.add(stub);
    }
    root.add(object);
    wood.push({object,x,z,i,radius,start:x+44+random(i,9)*103,turn:(random(i,8)-.5)*1.3});
  }
  let phase=null,time=0;
  function paint(){
    for(const p of wood){
      const {object,radius}=p,progress=Math.min(1,time/(13+random(p.i,11)*7));
      const floating=phase==='peak',settled=phase==='retreat';
      object.visible=floating||settled||p.i%5===0;
      const x=floating?mix(p.start,p.x,progress):p.x;
      const bias=floating?Math.max(0,(progress-.47)/.53):1;
      const z=floating?mesoRiverZ(x)+(1-bias)*(random(p.i,10)-.5)*22+bias*(p.z-mesoRiverZ(p.x)):p.z;
      const y=floating?mesozoicWater('triassic',phase,x,z)+radius*.35+Math.sin(time*.99+p.i)*radius*.15:
        bedAt(x,z)+radius*.67;
      object.position.set(x,y,z);
      const tangent=Math.atan2(mesoRiverZ(x+3)-mesoRiverZ(x-3),6);
      object.rotation.set(0,-tangent+p.turn*(floating?.42:1),floating?Math.sin(time*.76+p.i)*.039:.012);
    }
  }
  return {
    root,
    show(next){if(phase!==next)time=reduced?8:0;phase=next;paint();},
    update(dt){if(phase==='peak'&&time<23){time+=dt;paint();}},
    replay(){if(phase==='peak'){time=0;paint();}}
  };
}

function riverVegetation(id,bedAt){
  const root=new THREE.Group(),conifers=[],dry=[],wet=[];
  const jurassic=id==='jurassic';
  root.name=jurassic?'morrison-lakeshore-and-floodplain':'chinle-riverbank-woodland';
  const tint=new THREE.Color(),dummy=new THREE.Object3D();
  for(let i=0;i<9700;i++){
    const x=-1494+random(i,1)*870,z=-590+random(i,2)*737;
    const low=mesozoicPoint(id,jurassic?'dry':'low',x,z),high=mesozoicPoint(id,jurassic?'wet':'peak',x,z);
    if(low.depth>.04)continue;
    const patch=.56+.24*Math.sin(x*.038+z*.025)+.20*Math.cos(z*.043-x*.028);
    const near=Math.abs(z-mesoRiverZ(x)),edge=jurassic?Math.abs(low.lake-1.04):Math.abs(near-74)/140;
    if(near>280&&edge>.68)continue;
    const y=bedAt(x,z),angle=random(i,4)*6.283;
    const opensView=Math.abs(x-CHINLE_BAR.x)<24&&z>CHINLE_BAR.z-12&&z<CHINLE_BAR.z+81;
    const density=jurassic?(edge<.32?.29:.18):(edge<.24?.21:.11);
    if(!opensView&&!high.depth&&(!jurassic||low.lake>1.02)&&random(i,3)<patch*density&&near>45){
      conifers.push({i,x,y,z,angle,size:6+random(i,5)*13});
    }else if(high.depth<.41&&high.damp>.24&&random(i,6)<.68*high.damp*patch){
      const p={i,x,y,z,angle,size:.65+random(i,5)*2.2};
      wet.push(p);
      if(!high.depth&&random(i,7)<low.damp*.66)dry.push({...p,size:p.size*.58});
    }
  }

  for(let i=0;jurassic&&i<330;i++){
    const turn=i*.071,patch=.37+.63*Math.abs(Math.sin(turn*4+1.3));
    const radius=1.00+random(i,18)*.27*patch;
    const x=MORRISON_LAKE.x+MORRISON_LAKE.rx*Math.cos(turn)*radius;
    const z=MORRISON_LAKE.z+MORRISON_LAKE.rz*Math.sin(turn)*radius;
    const q=mesozoicPoint('jurassic','wet',x,z);
    if(q.depth>.05)continue;
    const y=bedAt(x,z),size=1.5+random(i,19)*2.5,angle=random(i,21)*6.28;
    wet.push({x,y,z,size,angle,i:i+14000});
    if(i%5===0)dry.push({x,y,z,size:size*.62,angle,i:i+14000});
  }

  function batch(items,name,geometry,pose,shade,target=root,side=THREE.FrontSide){
    if(!items.length){geometry.dispose();return;}
    const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({roughness:.94,side}),items.length);
    mesh.name=name;
    items.forEach((p,i)=>{
      dummy.rotation.set(0,0,0);
      pose(p);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,tint.set(shade).multiplyScalar(.72+.45*random(p.i,8)));
    });
    mesh.computeBoundingSphere();
    target.add(mesh);
  }
  batch(conifers,'persistent-woody-stems',new THREE.CylinderGeometry(.31,1,1,9),p=>{
    dummy.position.set(p.x,p.y+p.size*.44,p.z);
    dummy.scale.set(p.size*.055,p.size*.93,p.size*.055);
  },'#786444');
  for(const [height,width,hex] of [[.63,.22,'#476249'],[.82,.183,'#4f6d4d'],[.99,.118,'#638259']]){
    batch(conifers,'conifer-branch-crowns',new THREE.ConeGeometry(1,1,9),p=>{
      dummy.position.set(p.x,p.y+p.size*height,p.z);
      dummy.rotation.y=p.angle;dummy.scale.set(p.size*width,p.size*.43,p.size*width);
    },hex);
  }
  function ferns(items,id,hex){
    const group=new THREE.Group();group.name=id;root.add(group);
    const whorls=items.filter(p=>jurassic&&p.i%5===0);
    const fronds=items.filter(p=>!jurassic||p.i%5!==0).flatMap(p=>
      [0,1.26,2.52,3.78,5.04].map(turn=>({...p,turn:p.angle+turn})));
    batch(whorls,id+'-stems',new THREE.CylinderGeometry(.027,.051,1,6),p=>{
      dummy.position.set(p.x,p.y+p.size*.61,p.z);
      dummy.scale.set(1,p.size*1.23,1);
    },hex,group);
    for(const p of whorls)for(let j=1;j<5;j++)for(let k=0;k<3;k++){
      fronds.push({...p,y:p.y+j*p.size*.203,turn:p.angle+j*.12+k*2.094,size:p.size*.34});
    }
    batch(fronds,id+'-fronds',frondGeometry(),p=>{
      dummy.position.set(p.x,p.y+.12,p.z);
      dummy.rotation.set(0,-p.turn,.27,'YXZ');
      dummy.scale.set(p.size*.79,p.size*1.08,p.size*.86);
    },hex,group,THREE.DoubleSide);
    return group;
  }
  const dryFerns=ferns(dry,'dry-season-ferns','#82865d'),wetFerns=ferns(wet,'wet-season-ferns','#517744');
  return {root,show(phase){wetFerns.visible=phase==='wet';dryFerns.visible=!wetFerns.visible;}};
}

export function createMesozoicProps(id,bedAt,options){
  const vegetation=riverVegetation(id,bedAt);
  if(id==='jurassic')return vegetation;
  const driftwood=makeDriftwood(bedAt,options);
  vegetation.show('low');
  driftwood.root.add(vegetation.root);
  return driftwood;
}

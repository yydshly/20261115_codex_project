import {
  BufferGeometry,Color,CylinderGeometry,DoubleSide,Float32BufferAttribute,Group,
  IcosahedronGeometry,InstancedMesh,MeshStandardMaterial,Object3D
} from 'three';
import {scrubBounds,scrubHabitat,scrubPlantPlan,scrubPlantState,scrubResponse} from './scrub-recovery.js';

function tuftGeometry(){
  const positions=[];
  for(let i=0;i<7;i++){
    const angle=i*2.4,x=Math.cos(angle),z=Math.sin(angle);
    positions.push(-z*.08,0,x*.08,z*.08,0,-x*.08,x*.49,.55+(i%3)*.19,z*.49);
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  return geometry;
}

function shrubGeometry(){
  const lobe=new IcosahedronGeometry(1,1);
  const points=lobe.getAttribute('position');
  const positions=[];
  for(let i=0;i<5;i++){
    const angle=i*2.4;
    const radius=i===0?0:.48;
    const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    for(let j=0;j<points.count;j++){
      positions.push(x+points.getX(j)*.55,.65+(i%3)*.15+points.getY(j)*.47,z+points.getZ(j)*.55);
    }
  }
  lobe.dispose();
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  return geometry;
}

const palette={
  scrubDry:new Color('#657440'),scrubWet:new Color('#344e31'),
  shootDry:new Color('#879650'),shootWet:new Color('#527938'),
  straw:new Color('#b78c56'),grass:new Color('#789a49'),youngHerbs:new Color('#a7b749'),
  warmStone:new Color('#a99b7f'),dampSoil:new Color('#635740'),
  litter:new Color('#777051'),darkAsh:new Color('#302b29'),grayAsh:new Color('#77716a')
};

export function makeScrubRecoveryScene(scene,{tiles,dryland}){
  const group=new Group();
  group.name='dry-valley-scrub-recovery';
  group.visible=false;
  scene.add(group);
  const dummy=new Object3D(),color=new Color(),surface=new Color();
  let records;
  let plants,stems,herbs;

  function batch(name,geometry,capacity,colour='#ffffff',side){
    const material=new MeshStandardMaterial({color:colour,roughness:.96,side});
    const mesh=new InstancedMesh(geometry,material,capacity);
    mesh.name=name;
    mesh.receiveShadow=true;
    mesh.frustumCulled=false;
    mesh.count=0;
    group.add(mesh);
    return mesh;
  }

  function build(){
    records=scrubPlantPlan();
    plants=batch('scrub-crowns-and-new-shoots',shrubGeometry(),records.length);
    stems=batch('charred-stems',new CylinderGeometry(.031,.078,1,5),records.length*3,'#292525');
    herbs=batch('seasonal-grass-and-herbs',tuftGeometry(),records.length,'#ffffff',DoubleSide);
  }

  function place(mesh,p,angle,scale,tint){
    dummy.position.set(p.x,p.y,p.z);
    dummy.rotation.set(0,angle,0);
    dummy.scale.set(...scale);
    dummy.updateMatrix();
    if(tint)mesh.setColorAt(mesh.count,tint);
    mesh.setMatrixAt(mesh.count++,dummy.matrix);
  }

  function placeStems(p,state){
    for(let i=0;i<3;i++){
      const angle=p.angle+i*2.4,spread=.31+i*.095;
      const size=state.stemHeight*(1-i*.21);
      dummy.position.set(p.x+Math.cos(angle)*spread*size/2,p.y+size*.44,p.z+Math.sin(angle)*spread*size/2);
      dummy.rotation.set(Math.sin(angle)*spread,0,-Math.cos(angle)*spread,'YXZ');
      dummy.scale.set(.7+p.vigor*.5,size,.7+p.vigor*.5);
      dummy.updateMatrix();
      stems.setMatrixAt(stems.count++,dummy.matrix);
    }
  }

  function paint(stage,season){
    plants.count=stems.count=herbs.count=0;
    for(const p of records){
      const state=scrubPlantState(p,stage,season);
      if(state.stems)placeStems(p,state);
      if(state.shrub){
        const fresh=state.shoot||state.seed;
        color.lerpColors(fresh?palette.shootDry:palette.scrubDry,
          fresh?palette.shootWet:palette.scrubWet,p.habitat.retention*.62+state.moisture*.33);
        color.multiplyScalar(.83+p.vigor*.26);
        const size=state.shrub;
        place(plants,p,p.angle,[size*.87,size*.74,size*.94],color);
      }
      if(state.herbs){
        color.lerpColors(palette.straw,stage==='first'?palette.youngHerbs:palette.grass,
          Math.min(1,state.moisture*1.52));
        color.multiplyScalar(.86+p.vigor*.28);
        const width=1.4+p.vigor*1.9, height=.19+p.vigor*.28+state.moisture*.42;
        place(herbs,p,p.angle,[width,height,width],color);
      }
    }
    for(const mesh of [plants,stems,herbs]){
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }
    tiles.setSurfaceTint(scrubBounds,(x,z,base)=>{
      const habitat=scrubHabitat(x,z);
      if(!habitat)return;
      const {edge,bed,patch,scorch}=habitat;
      const {moisture}=scrubResponse(habitat,stage,season);
      const residual=stage==='burned'?.97:stage==='first'?.62:stage==='later'?.13:0;
      surface.lerpColors(palette.warmStone,stage==='before'?palette.litter:palette.dampSoil,
        Math.min(1,.22+.56*moisture+.18*patch));
      color.lerpColors(palette.darkAsh,palette.grayAsh,patch*.94);
      surface.lerp(color,residual*scorch*(1-.84*bed));
      base.lerp(surface,edge*(1-.51*bed)*.92);
    });
  }

  return {
    show(stage,season){
      if(!records)build();
      if(!group.visible)dryland.setScrubComparison(true);
      group.visible=true;
      paint(stage,season);
    },
    hide(){
      if(!group.visible)return;
      group.visible=false;
      tiles.setSurfaceTint(null);
      dryland.setScrubComparison(false);
    }
  };
}

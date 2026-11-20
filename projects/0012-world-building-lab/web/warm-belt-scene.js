import * as THREE from 'three';
import {clippedWaterGeometry} from './watershed-balance-scene.js';
import {terrainHeight} from './large-world.js';
import {rainDivideX} from './regional-geography.js';
import {makeWarmBelt,warmColors,warmPlantPlan,warmStops} from './warm-belt.js';

const colors={
  damp:new THREE.Color(warmColors.damp),
  dry:new THREE.Color('#ad8556'),wet:new THREE.Color('#76bc66'),
  straw:new THREE.Color('#cba86b'),sedge:new THREE.Color('#87b747')
};
const clamp=x=>Math.max(0,Math.min(1,x));
const tint=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,opacity,transparent:opacity<1,
  side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
const place=(p,lift=0)=>new THREE.Vector3(p.x,(p.y??terrainHeight(p.x,p.z))+lift,p.z);
const warmLine=(points,color,lift,width)=>{
  const verts=[];
  for(let i=1;i<points.length;i++){
    const a=place(points[i-1],lift),b=place(points[i],lift),dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
    if(d<=.001)continue;
    const v=(p,s)=>[p.x+s*dz/d*width,p.y,p.z-s*dx/d*width];
    verts.push(...v(a,1),...v(a,-1),...v(b,1),...v(b,1),...v(a,-1),...v(b,-1));
  }
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  const material=tint(color,.87);material.depthTest=false;
  const mesh=new THREE.Mesh(geom,material);mesh.renderOrder=51;return mesh;
};

function grassGeometry(){
  const positions=[];
  for(let i=0;i<7;i++){
    const angle=i*2.4,dx=Math.cos(angle),dz=Math.sin(angle),r=.1+(i%3)*.07;
    const v=(t,s)=>[dx*(.07+t*r)+s*dz*.085*(1-t),t*(1-i*.047),dz*(.07+t*r)-s*dx*.085*(1-t)];
    positions.push(...v(0,-1),...v(0,1),...v(.59,-1),...v(.59,-1),...v(0,1),...v(.59,1),...v(.59,-1),...v(.59,1),...v(1,0));
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.computeVertexNormals();return g;
}

function coverMeshes(group,{grass,banks,wood}){
  const palm=new THREE.MeshStandardMaterial({vertexColors:false,roughness:.96,side:THREE.DoubleSide});
  const blades=new THREE.InstancedMesh(grassGeometry(),palm,grass.length+banks.length);
  blades.name='fixed seasonal grass and sedges';group.add(blades);
  const bark=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.26,1,6),
    new THREE.MeshStandardMaterial({color:'#74664b',roughness:1}),wood.length);
  const crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),
    new THREE.MeshStandardMaterial({roughness:.91}),wood.length*3);
  crowns.name='fixed sparse tree crowns';group.add(bark,crowns);
  const pose=new THREE.Object3D(),color=new THREE.Color(),tufts=[...grass,...banks];
  wood.forEach((p,i)=>{
    pose.position.set(p.x,p.y+p.height*.49,p.z);pose.rotation.set(.022,p.seed*6.28,-.08);
    pose.scale.set(1,p.height,1);pose.updateMatrix();bark.setMatrixAt(i,pose.matrix);
    for(let j=0;j<3;j++){
      const angle=(j+p.seed)*2.4;
      pose.position.set(p.x+Math.cos(angle)*1.75,p.y+p.height*(.98+j*.055),p.z+Math.sin(angle)*1.75);
      pose.scale.set(2.8+p.seed,1.15+j*.09,2.45+p.seed);pose.rotation.y=angle;
      pose.updateMatrix();crowns.setMatrixAt(i*3+j,pose.matrix);
    }
  });
  return season=>{
    tufts.forEach((p,i)=>{
      const moist=p[season],low=p.flooded,mult=Math.max(.26,.68+moist*.91);
      const stems=season==='wet'?1:low?.72:.57;
      pose.position.set(p.x,p.y+.025,p.z);pose.rotation.set(0,p.seed*6.28,0);
      pose.scale.set(1.5+p.seed*.9,mult*stems*(low?1.8:1.35+p.seed*.7),1.5+p.seed*.9);
      pose.updateMatrix();blades.setMatrixAt(i,pose.matrix);
      color.copy(colors.straw).lerp(low?colors.sedge:colors.wet,
        clamp((moist-.24)*(season==='wet'?1.7:1.05)+(low?.12:0)));
      blades.setColorAt(i,color);
    });
    wood.forEach((p,i)=>{
      color.set(season==='wet'?'#79994d':'#a09b61').multiplyScalar(.90+.17*p.seed);
      for(let j=0;j<3;j++)crowns.setColorAt(i*3+j,color);
    });
    blades.instanceMatrix.needsUpdate=true;blades.instanceColor.needsUpdate=true;crowns.instanceColor.needsUpdate=true;
    blades.computeBoundingSphere();
  };
}

function pool(view,color,name){
  const geometry=view.area>0?clippedWaterGeometry(view.ground,view.level,{waterMask:view.mask,referenceAt:view.referenceAt}):
    new THREE.BufferGeometry().setFromPoints([]);
  const m=new THREE.Mesh(geometry,tint(color,.83));
  m.name=name;m.renderOrder=32;return m;
}

function surfaceDots(points,shade,name){
  const disc=new THREE.CircleGeometry(1,9);disc.rotateX(-Math.PI/2);
  const material=new THREE.MeshBasicMaterial({vertexColors:false,transparent:true,opacity:.58,
    depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  const dots=new THREE.InstancedMesh(disc,material,points.length),pose=new THREE.Object3D();
  dots.name=name;
  points.forEach((p,i)=>{
    const s=shade(p,i);
    pose.position.copy(place(p,.31));pose.scale.set(s.radius,1,s.radius);pose.updateMatrix();
    dots.setMatrixAt(i,pose.matrix);dots.setColorAt(i,s.color);
  });
  dots.renderOrder=35;
  return dots;
}

export function makeWarmBeltScene(scene,worldSource){
  const root=new THREE.Group();root.name='southwest rainforest to lee grassland';root.visible=false;scene.add(root);
  let cached=null,phase=null;
  function build(){
    const model=makeWarmBelt(worldSource()),{points}=model.profile,plants=new THREE.Group();
    root.add(plants);
    const cover=coverMeshes(plants,warmPlantPlan(model));
    const path=warmLine(points,'#ebd590',7,3.3);root.add(path);
    const ridge=warmLine(Array.from({length:26},(_,i)=>{
      const z=1018+i*6;return {x:rainDivideX(z),z};
    }),warmColors.ridge,5,2.1);root.add(ridge);
    const ring=new THREE.RingGeometry(.68,1,32);ring.rotateX(-Math.PI/2);
    const pin=new THREE.Mesh(ring,tint('#f6e7ba',.91));pin.material.depthTest=false;pin.renderOrder=54;root.add(pin);
    const seasonGroups={};
    for(const [season,view] of Object.entries(model.views)){
      const group=new THREE.Group(),climate=new THREE.Group(),wet=new THREE.Group();root.add(group);
      group.add(climate,wet,pool(view.river,warmColors.water,'rainforest connected overbank water'),
        pool(view.swale,'#70b8bc','lee swale seasonal water'));
      const locations=[];
      for(let x=-1208;x<140;x+=19)for(let z=1030;z<1288;z+=17){
        const z2=z+7*Math.sin(x*.31+z*.13),bed=terrainHeight(x,z2);
        if(bed<0||points.every(p=>Math.hypot(p.x-x,p.z-z2)>96))continue;
        locations.push({x,z:z2,y:bed});
      }
      climate.add(surfaceDots(locations,p=>{
        const r=model.read(p,season);
        return {radius:2.8+1.7*r.moisture,color:colors.dry.clone().lerp(colors.wet,clamp(r.moisture*1.38))};
      },'root-zone moisture samples'));
      const wind=view.wind;
      for(const [x,z] of [[-825,1110],[-749,1070],[-653,1107],[-544,1119]]){
        const r=model.read({x,z},season);
        const direction=new THREE.Vector3(wind.dx,r.lift*2,wind.dz).normalize();
        const a=new THREE.ArrowHelper(direction,place({x,z},14),40,season==='wet'?'#a6e5fa':'#dac8a4',8,6);
        for(const child of a.children){child.material.depthTest=false;child.renderOrder=53;}
        climate.add(a);
      }
      for(const key of ['river','swale']){
        const v=view[key],other=model.views.wet[key];
        const damp=v.ground.bed.filter((p,i)=>i%3===0&&!v.extra[i]&&
          (other.extra[i]||p.bed>=v.referenceAt(p)&&p.bed-v.level(p)<.24&&Math.abs(p.breadth)>1));
        wet.add(surfaceDots(damp.map(p=>({...p,y:p.bed})),()=>({radius:.65,color:colors.damp}),'damp bank points'));
      }
      seasonGroups[season]={group,climate,wet};
    }
    return {model,path,ridge,pin,cover,seasonGroups};
  }
  function show({season,layer,stop}){
    cached??=build();root.visible=true;
    const {model,path,ridge,pin,cover,seasonGroups}=cached;
    path.visible=!stop;ridge.visible=!stop||['ridge','windward'].includes(stop.id);
    pin.visible=!!stop;
    if(stop){pin.position.copy(place(stop,4));pin.scale.setScalar(stop.id==='forest'?4.5:6);}
    if(phase!==season){cover(season);phase=season;}
    for(const [key,state] of Object.entries(seasonGroups)){
      state.group.visible=key===season;
      state.climate.visible=layer==='climate';state.wet.visible=layer==='water';
    }
    return model;
  }
  return {show,hide(){root.visible=false;}};
}

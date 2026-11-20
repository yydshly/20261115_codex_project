import * as THREE from 'three';
import {deepTimeCases,deepTimePoint,deepTimeProfile,deepTimeWaterLevel,forestWater} from './deep-time.js';
import {clippedWaterGeometry} from './watershed-balance-scene.js';
import {epochTriangles,gridPoint} from './ice-age.js';
import {isPaleoWetland} from './paleo-wetlands.js';
import {makePaleoPlants,makePaleoSection} from './paleo-wetland-scene.js';
import {cambrianBedColor,cambrianWaterColor,createCambrianProps} from './cambrian-scene.js';
import {isMesozoicRiver} from './mesozoic-rivers.js';
import {createMesozoicProps,mesozoicBedColor} from './mesozoic-river-scene.js';

const clamp=value=>Math.max(0,Math.min(1,value));
function random(k,salt){
  const n=Math.sin(k*127.1+salt*311.7)*43758.5453;
  return n-Math.floor(n);
}
const palette={
  seaway:['#778259','#a08969','#d2b382','#85827a'],
  forest:['#657c48','#304e36','#928564','#68594a'],
  devonian:['#7c8155','#a38761','#bd9f74','#7d614d'],
  coal:['#636f4a','#77624a','#ab9976','#4a3a31']
};

function landscape(id){
  const cambrian=id==='cambrian',paleo=isPaleoWetland(id),meso=isMesozoicRiver(id);
  const highResolution=paleo||cambrian||meso,step=highResolution?12:16;
  const grid={x0:-1920,z0:-1560,step,cols:3840/step+1,rows:3120/step+1};
  const start=deepTimeCases[id].start;
  const bed=Array.from({length:grid.cols*grid.rows},(_,k)=>{
    const {x,z}=gridPoint(grid,k);
    return {x,z,...deepTimePoint(id,start,x,z)};
  });
  const positions=[],colors=[],indices=[],cells=[],tint=new THREE.Color();
  const [green,brown,sand,mud]=(palette[id]??[]).map(hex=>new THREE.Color(hex));
  bed.forEach(point=>{
    const {x,z,bed:y,level,peat}=point;
    const grain=.89+.09*Math.sin(x*.23+z*.09)*Math.cos(z*.16-x*.08)+.09*Math.sin(x*.039+z*.053);
    if(cambrian)cambrianBedColor(point,tint);
    else if(meso)mesozoicBedColor(id,point,tint,start);
    else if(id==='seaway'){
      tint.copy(mud).lerp(sand,clamp((y+41)/52));
      tint.lerp(brown,clamp((y-17)/24)).lerp(green,clamp((y-38)/60)*.8);
      tint.lerp(sand,clamp((y-130)/170)*(.2+.22*Math.sin(y*.25+z*.024)));
    }else if(paleo){
      const dry=y-level;
      tint.copy(sand).lerp(brown,clamp((dry+1.4)/4));
      tint.lerp(mud,peat*.79).lerp(green,clamp((dry-3)/11)*.92);
    }else{
      const dry=y-forestWater({x});
      tint.copy(mud).lerp(sand,clamp((dry+3)/4)*.7).lerp(brown,clamp((dry-.5)/3)*.6);
      tint.lerp(green,clamp((dry-1.4)/4)*.93);
    }
    positions.push(x,y,z);colors.push(tint.r*grain,tint.g*grain,tint.b*grain);
  });
  epochTriangles(grid,(a,b,c)=>indices.push(a,b,c));
  for(let j=0;j<grid.rows-1;j++)for(let i=0;i<grid.cols-1;i++){
    const k=j*grid.cols+i;
    cells.push({indices:[k,k+1,k+grid.cols,k+grid.cols+1]});
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
  if(highResolution){
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 paleoGround;\n'+shader.vertexShader.replace(
        '#include <begin_vertex>','#include <begin_vertex>\npaleoGround=position.xz;'
      );
      shader.fragmentShader='varying vec2 paleoGround;\n'+shader.fragmentShader.replace(
        '#include <color_fragment>',`#include <color_fragment>
        float uneven=sin(paleoGround.x*.31+paleoGround.y*.12)*cos(paleoGround.y*.26-paleoGround.x*.17);
        float grains=sin(paleoGround.y*5.3-paleoGround.x*7.8+sin(paleoGround.x*3.8))*cos(paleoGround.y*8.9+paleoGround.x*5.2);
        diffuseColor.rgb*=.97+.055*uneven+.046*grains;`
      );
    };
  }
  const surface=new THREE.Mesh(geometry,material);
  function meshHeight(x,z){
    const u=(x-grid.x0)/step,v=(z-grid.z0)/step,i=Math.floor(u),j=Math.floor(v);
    if(i<0||j<0||i>=grid.cols-1||j>=grid.rows-1)return deepTimePoint(id,start,x,z).bed;
    const a=u-i,b=v-j,k=j*grid.cols+i;
    const y0=bed[k].bed,y1=bed[k+1].bed,y2=bed[k+grid.cols].bed,y3=bed[k+grid.cols+1].bed;
    return a+b<=1?y0+(y1-y0)*a+(y2-y0)*b:y3+(y2-y3)*(1-a)+(y1-y3)*(1-b);
  }
  return {surface,bed,cells,bedAt:highResolution?meshHeight:(x,z)=>deepTimePoint(id,start,x,z).bed};
}

function waterLayer(id,phase,{bed,cells,bedAt}){
  const cambrian=id==='cambrian',isSea=id==='seaway'||cambrian;
  const shallow=new THREE.Color(isSea?'#88c2a8':phase==='burial'?'#88755b':id==='coal'?'#697963':'#718974');
  const deep=new THREE.Color(isSea?'#24637d':phase==='burial'?'#685748':id==='coal'?'#434f47':'#355c57');
  if(id==='triassic'){
    shallow.set(phase==='peak'?'#8d8565':'#937e62');
    deep.set(phase==='peak'?'#535b50':'#526c60');
  }
  if(id==='jurassic'){
    shallow.set(phase==='wet'?'#8e9770':'#7fa08b');
    deep.set('#396264');
  }
  const tint=new THREE.Color();
  const levelAt=({x,z})=>deepTimeWaterLevel(id,phase,x,z);
  const geometry=clippedWaterGeometry({bed,cells},levelAt,{
    heightAt:bedAt,
    colorAt:({x,z,depth})=>{
      const bands=.94+.05*Math.sin(x*.16+z*.36+Math.sin(z*.07))+.025*Math.sin(x*.4-z*.23);
      if(cambrian){
        cambrianWaterColor(phase,x,z,depth,tint);
        return tint.multiplyScalar(bands).toArray();
      }
      return tint.copy(shallow).lerp(deep,clamp(depth/(isSea?42:3.1))).multiplyScalar(bands).toArray();
    }
  });
  const top=new THREE.MeshStandardMaterial({
    vertexColors:true,roughness:cambrian?.44:.58,metalness:.06,emissive:'#264345',emissiveIntensity:.075
  });
  if(isMesozoicRiver(id)){
    top.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 riverSkin;\n'+shader.vertexShader.replace(
        '#include <begin_vertex>','#include <begin_vertex>\nriverSkin=position.xz;'
      );
      shader.fragmentShader='varying vec2 riverSkin;\n'+shader.fragmentShader.replace(
        '#include <color_fragment>',`#include <color_fragment>
        float crosswaves=sin(riverSkin.x*.17-riverSkin.y*.39)*.84+sin(riverSkin.y*.26)*.47;
        float crests=smoothstep(.60,1.0,sin(riverSkin.y*.75+riverSkin.x*.19+crosswaves));
        diffuseColor.rgb=diffuseColor.rgb*(.91+crosswaves*.085)+vec3(.024,.035,.034)*crests;`
      );
    };
  }
  const surface=new THREE.Mesh(geometry,top);
  const underside=cambrian?new THREE.MeshBasicMaterial({
    color:'#9dc1b3',vertexColors:true,side:THREE.BackSide
  }):null;
  const edgeGeometry=new THREE.BufferGeometry();
  const edge=Float32Array.from(geometry.userData.shoreline,(n,i)=>i%3===1?n+.18:n);
  edgeGeometry.setAttribute('position',new THREE.BufferAttribute(edge,3));
  const shore=new THREE.LineSegments(edgeGeometry,new THREE.LineBasicMaterial({
    color:isSea?'#d4dec0':'#93a88a',transparent:true,opacity:isSea?.62:.3
  }));
  return {surface,shore,top,underside};
}

function showBurialSurface(terrain,buried){
  const geometry=terrain.surface.geometry;
  terrain.originalColors??=geometry.getAttribute('color');
  if(buried&&!terrain.burialColors){
    terrain.burialColors=terrain.originalColors.clone();
    const silt=new THREE.Color('#b39d81'),color=new THREE.Color();
    terrain.bed.forEach(({x,z},k)=>{
      const q=deepTimePoint('coal','burial',x,z);
      if(!q.fines)return;
      color.fromBufferAttribute(terrain.originalColors,k).lerp(silt,q.fines*.68);
      terrain.burialColors.setXYZ(k,color.r,color.g,color.b);
    });
  }
  geometry.setAttribute('color',buried?terrain.burialColors:terrain.originalColors);
}

function showStudyBed(terrain,id,phase){
  const geometry=terrain.surface.geometry,start=deepTimeCases[id].start;
  terrain.phaseColors??=new Map([[start,geometry.getAttribute('color')]]);
  if(!terrain.phaseColors.has(phase)){
    const colors=terrain.phaseColors.get(start).clone(),tint=new THREE.Color();
    terrain.bed.forEach((point,k)=>{
      const q=deepTimePoint(id,phase,point.x,point.z);
      if(id==='cambrian'){
        if(phase==='flood'&&q.plume<.01||phase==='slide'&&q.runout<.05)return;
        cambrianBedColor({...point,...q},tint,phase);
      }else mesozoicBedColor(id,q,tint,phase);
      const grain=.89+.09*Math.sin(point.x*.23+point.z*.09)*Math.cos(point.z*.16-point.x*.08)+
        .09*Math.sin(point.x*.039+point.z*.053);
      colors.setXYZ(k,tint.r*grain,tint.g*grain,tint.b*grain);
    });
    terrain.phaseColors.set(phase,colors);
  }
  geometry.setAttribute('color',terrain.phaseColors.get(phase));
}

function planting(id){
  const root=new THREE.Group(),deciduous=new THREE.Group();
  const hardwood=[],evergreen=[],ferns=[],wood=[];
  const forest=id==='forest',step=forest?9:23,spanX=forest?1280:1830;
  const start=deepTimeCases[id].start;
  let k=0;
  for(let z=forest?-1490:-1495;z<(forest?-505:1505);z+=step){
    for(let x=-spanX;x<spanX;x+=step){
      k++;
      const px=x+step*random(k,1),pz=z+step*random(k,2);
      const sample=deepTimePoint(id,start,px,pz),dry=sample.bed-sample.level;
      const patch=.57+.27*Math.sin(px/123+pz/54)+.15*Math.sin(px/43-pz/74);
      if(forest){
        if(dry<.36||dry>36||random(k,3)>(dry<2.2?.53:patch))continue;
        const plant={x:px,y:sample.bed,z:pz,k,s:7+random(k,4)*15};
        if(dry<2.2||random(k,6)<.23){
          ferns.push({...plant,s:.9+random(k,7)*2.3});
          continue;
        }
        if(dry>16)plant.s*=.73;
        (random(k,7)>.32?hardwood:evergreen).push(plant);
        wood.push(plant);
      }else if(px< -350&&dry>6&&dry<148&&random(k,3)<patch*.47){
        const plant={x:px,y:sample.bed,z:pz,k,s:3+random(k,4)*7};
        evergreen.push(plant);wood.push(plant);
      }
    }
  }
  const dummy=new THREE.Object3D(),tint=new THREE.Color(),up=new THREE.Vector3(0,1,0);
  function instances(group,items,geometry,color,pose){
    if(!items.length){geometry.dispose();return;}
    const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({roughness:1}),items.length);
    items.forEach((plant,i)=>{
      dummy.rotation.set(0,0,0);pose(plant);dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,tint.set(color).multiplyScalar(.72+.51*random(plant.k,7)));
    });
    group.add(mesh);
  }
  const cylinder=()=>new THREE.CylinderGeometry(.18,1,1,6);
  instances(root,wood,cylinder(),'#6d553e',({x,y,z,s})=>{
    dummy.position.set(x,y+s*.47,z);dummy.scale.set(s*.046,s*.99,s*.046);
  });
  instances(root,hardwood.flatMap(p=>[.2,2.3,4.5].map((angle,i)=>({...p,angle:angle+random(p.k,5)*6.28,i}))),
    cylinder(),'#6d553e',({x,y,z,s,angle,i})=>{
      const lean=new THREE.Vector3(.53*Math.cos(angle),1,.53*Math.sin(angle)).normalize();
      dummy.position.set(x+lean.x*s*.17,y+s*(.53+i*.1),z+lean.z*s*.17);
      dummy.quaternion.setFromUnitVectors(up,lean);dummy.scale.set(s*.023,s*.44,s*.023);
    });
  const crown=[
    {turn:0,h:.90,r:.13},{turn:2.1,h:.77,r:.14},{turn:4.2,h:.82,r:.15}
  ];
  instances(deciduous,hardwood.flatMap(p=>crown.map(part=>({...p,...part}))),
    new THREE.IcosahedronGeometry(1,0),'#668b45',({x,y,z,s,k,turn,h,r})=>{
      const angle=turn+random(k,8)*6.28;
      dummy.position.set(x+Math.cos(angle)*s*r,y+s*h,z+Math.sin(angle)*s*r);
      dummy.rotation.y=angle;dummy.scale.set(s*.23,s*.19,s*.22);
    });
  for(const [h,r,ht,color] of [[.62,.24,.54,'#3c6b4e'],[.82,.18,.46,'#4b7b58'],[.99,.12,.37,'#60865c']]){
    instances(root,evergreen,new THREE.ConeGeometry(1,1,8),color,({x,y,z,s,k})=>{
      dummy.position.set(x,y+s*h,z);dummy.rotation.y=random(k,8)*6.28;dummy.scale.set(s*r,s*ht,s*r);
    });
  }
  instances(root,ferns.flatMap(p=>[0,1.6,3.2,4.8].map(turn=>({...p,turn}))),
    new THREE.IcosahedronGeometry(1,0),'#82a657',({x,y,z,s,k,turn})=>{
      const a=turn+random(k,9)*6.28;
      dummy.position.set(x+Math.cos(a)*s*.24,y+s*.37,z+Math.sin(a)*s*.24);
      dummy.rotation.set(0,-a,.63);dummy.scale.set(s*.67,s*.07,s*.15);
    });
  root.add(deciduous);
  return {root,deciduous};
}

function routeTrace(id,phase,bedView){
  const points=deepTimeProfile(id,phase).map(p=>new THREE.Vector3(p.x,
    (bedView?p.bed:Math.max(p.bed,p.level??p.bed))+2.1,p.z));
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({
    color:'#ffdda2',depthTest:false,transparent:true,opacity:.85,toneMapped:false
  }));
}

export function createDeepTimeScene(scene,modernRoots,{reduced=false}={}){
  const root=new THREE.Group();
  root.name='Deep-time landscape comparisons';root.visible=false;scene.add(root);
  const cache=new Map();
  const pin=new THREE.Mesh(new THREE.RingGeometry(.75,1,32),new THREE.MeshBasicMaterial({
    color:'#ffe0a9',side:THREE.DoubleSide,depthTest:false,toneMapped:false
  }));
  pin.rotation.x=-Math.PI/2;pin.renderOrder=7;root.add(pin);
  let saved=null,lastTrace=null,traceKey=null,effects=null;
  function conceal(){for(const [object] of saved??[])object.visible=false;}
  function restore(){
    for(const [object,visible] of saved??[])object.visible=visible;
    saved=null;
  }
  function prepare(id){
    if(!cache.has(id)){
      const terrain=landscape(id),paleo=isPaleoWetland(id),layers=new Map();
      const plants=id==='cambrian'?createCambrianProps(terrain.bedAt):isMesozoicRiver(id)?
        createMesozoicProps(id,terrain.bedAt,{reduced}):paleo?makePaleoPlants(id,terrain.bedAt):planting(id);
      const section=paleo?makePaleoSection(id,terrain.bedAt):null;
      const group=new THREE.Group();group.name=id;group.add(terrain.surface,plants.root);
      if(section)group.add(section.group);
      root.add(group);cache.set(id,{group,terrain,plants,layers,section});
    }
    return cache.get(id);
  }
  function show(id,phase,station,bedView,sectionView=false,diveView=false){
    const past=phase!=='now';
    effects=null;
    if(past){
      saved??=modernRoots.map(object=>[object,object.visible]);
      conceal();
      const {group,terrain,plants,layers,section}=prepare(id),waterId=id==='forest'?'day':id==='cambrian'&&phase==='slide'?'usual':phase;
      if(!layers.has(waterId)){
        const layer=waterLayer(id,waterId,terrain);
        layers.set(waterId,layer);group.add(layer.surface,layer.shore);
      }
      for(const [key,{surface,shore,top,underside}] of layers){
        surface.visible=key===waterId&&!bedView;
        shore.visible=surface.visible&&!diveView;
        surface.material=diveView&&underside?underside:top;
      }
      if(plants.deciduous)plants.deciduous.visible=phase!=='night';
      if(id==='cambrian'){
        plants.show(phase,bedView);
        showStudyBed(terrain,id,bedView?phase:'usual');
        effects=plants;
      }
      if(isMesozoicRiver(id)){
        plants.show(phase);
        showStudyBed(terrain,id,phase);
        effects=plants;
      }
      if(section){
        section.group.visible=sectionView;
        if(section.cap)section.cap.visible=phase==='burial';
        plants.roots.visible=sectionView&&phase!=='burial';
        plants.cracks.visible=phase==='exposed';
        if(id==='coal')showBurialSurface(terrain,phase==='burial');
      }
    }else restore();
    for(const [key,entry] of cache)entry.group.visible=past&&key===id;
    root.visible=true;
    const key=id+':'+phase+':'+bedView;
    if(key!==traceKey){
      if(lastTrace){
        root.remove(lastTrace);lastTrace.geometry.dispose();lastTrace.material.dispose();
      }
      lastTrace=routeTrace(id,phase,bedView);lastTrace.renderOrder=6;root.add(lastTrace);traceKey=key;
    }
    lastTrace.visible=!station||bedView;
    pin.visible=!!station&&!sectionView&&!diveView;
    if(station){
      const p=deepTimePoint(id,phase,station.x,station.z);
      pin.position.set(station.x,(bedView?p.bed:Math.max(p.bed,p.level??p.bed))+2.1,station.z);
      pin.scale.setScalar(station.range*.062);
    }
  }
  return {
    show,conceal,replay(){if(!reduced)effects?.replay?.();},
    update(dt){if(!reduced)effects?.update?.(dt);},
    hide(){effects=null;root.visible=false;restore();}
  };
}

import * as THREE from 'three';
import {buildIceAge,iceAgeFrame,epochTriangles,gridPoint,heightOnGrid,iceAgeLakes,iceAgeRoutes,paleoCover} from './ice-age.js';
import {clippedWaterGeometry} from './watershed-balance-scene.js';

const waterBase=new THREE.Color('#2f758a'),waterEdge=new THREE.Color('#769999');
const floodedLowland=new THREE.Color('#80b5b0');
const snowColor=new THREE.Color('#def0f5'),blueIce=new THREE.Color('#75b1c9');
const clamp=v=>Math.max(0,Math.min(1,v));
const seabed=new THREE.Color('#9d947d');

function surfaceMesh(model,frozen){
  const {grid,land,ice,surface,covers,modernOcean,coldOcean}=model;
  const vertices=[],colors=[],indices=[],color=new THREE.Color();
  const palette=Object.fromEntries(Object.entries(paleoCover).map(([id,entry])=>[id,new THREE.Color(entry.color)]));
  for(let k=0;k<land.length;k++){
    const {x,z}=gridPoint(grid,k);
    vertices.push(x,frozen?surface[k]+.09:land[k],z);
    const grain=.5+.28*Math.sin(x*.037+z*.013)*Math.cos(z*.047-x*.011)+.17*Math.sin(x*.075)*Math.sin(z*.083);
    if(frozen){
      const bands=.5+.24*Math.sin(x*.051+z*.033+Math.sin(z*.028)*1.5)+.16*Math.sin(x*.079-z*.058);
      color.copy(blueIce).lerp(snowColor,clamp(.23+ice[k]/135+.32*bands));
    }else{
      color.copy(palette[covers[k]]??seabed);
      if(covers[k]==='ice')color.copy(palette.gravel);
      if(modernOcean[k]&&!coldOcean[k]&&covers[k]!=='wetland')color.lerp(seabed,.76);
      color.multiplyScalar(.66+.34*grain);
      color.multiplyScalar(.87+.13*clamp((land[k]+48)/110));
    }
    colors.push(color.r,color.g,color.b);
  }
  epochTriangles(grid,(a,b,c)=>{
    if(!frozen||Math.max(ice[a],ice[b],ice[c])>.45)indices.push(a,b,c);
  });
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  return new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:frozen?.63:1}));
}

function waterGeometry(model,field,level,mask,{tint=waterBase,highlightLowland=false}={}){
  const {grid}=model,bed=Array.from(field,(height,k)=>({...gridPoint(grid,k),bed:height})),cells=[];
  for(let j=0;j<grid.rows-1;j++)for(let i=0;i<grid.cols-1;i++){
    const k=j*grid.cols+i;
    cells.push({indices:[k,k+1,k+grid.cols,k+grid.cols+1]});
  }
  return clippedWaterGeometry({bed,cells},()=>level,{
    waterMask:mask,heightAt:(x,z)=>heightOnGrid(grid,field,x,z),
    colorAt:p=>{
      const color=waterEdge.clone().lerp(tint,clamp(p.depth/27));
      if(highlightLowland)color.lerp(floodedLowland,clamp((level-p.depth)/3)*.75);
      return color.toArray();
    }
  });
}

function distantSea(model,material){
  const {grid,epoch}=model;
  const right=grid.x0+(grid.cols-1)*grid.step,back=grid.z0+(grid.rows-1)*grid.step,extent=15000;
  const group=new THREE.Group();
  for(const [x0,x1,z0,z1] of [[-extent,extent,-extent,grid.z0],[-extent,extent,back,extent],
    [-extent,grid.x0,grid.z0,back],[right,extent,grid.z0,back]]){
    const geo=new THREE.PlaneGeometry(x1-x0,z1-z0);
    const colors=[];
    for(let i=0;i<4;i++)colors.push(...waterBase.toArray());
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const mesh=new THREE.Mesh(geo,material);
    mesh.rotation.x=-Math.PI/2;
    mesh.position.set((x0+x1)/2,epoch.sea+.05,(z0+z1)/2);
    group.add(mesh);
  }
  return group;
}

function coastline(coords,color,{dashed=false,model=null}={}){
  const vertices=Array.from(coords);
  for(let i=0;i<vertices.length;i+=3){
    vertices[i+1]=model?Math.max(model.epoch.sea,heightOnGrid(model.grid,model.surface,vertices[i],vertices[i+2]))+2.9
      :vertices[i+1]+1.3;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  const mat=dashed?new THREE.LineDashedMaterial({color,dashSize:10,gapSize:5,transparent:true,opacity:.87})
    :new THREE.LineBasicMaterial({color,transparent:true,opacity:.93});
  const line=new THREE.LineSegments(geo,mat);
  if(dashed)line.computeLineDistances();
  return line;
}

function riverMesh(model,points,hasMouth){
  const {grid,land,epoch}=model,vertices=[],indices=[];
  points=points.filter(p=>Number.isFinite(p.level));
  points.forEach((p,i)=>{
    const prev=points[Math.max(i-1,0)],next=points[Math.min(i+1,points.length-1)];
    const dx=next.x-prev.x,dz=next.z-prev.z,length=Math.hypot(dx,dz)||1;
    const half=Math.min(p.half,14);
    for(const u of [-1,0,1]){
      const x=p.x+dz/length*half*u,z=p.z-dx/length*half*u;
      const bed=heightOnGrid(grid,land,x,z);
      // Let high banks occlude the ribbon and keep shelf reaches close to the bed.
      const surface=Math.min(p.level+.28,bed+1.5);
      // Tributaries under a highstand stay under its water surface.
      const y=hasMouth?Math.max(epoch.sea+.052,surface):surface;
      vertices.push(x,y,z);
    }
    if(i===0)return;
    for(let j=0;j<2;j++){
      const a=(i-1)*3+j,b=i*3+j;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
  });
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  return new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#66bcc5',side:THREE.DoubleSide}));
}

function plants(model){
  const root=new THREE.Group(),{grid,land,ice,coldOcean,covers,epoch,riverAt}=model,bushes=[],trees=[],broadleaf=[],rushes=[];
  const random=k=>{const n=Math.sin(k*127.1+73.8)*43758.5453;return n-Math.floor(n);};
  const density={tundra:.18,steppe:.20,refuge:.40,woodland:.76,wetland:.75,pioneer:.13,
    broadleaf:.83,warmScrub:.35,alpine:.12};
  for(let k=0;k<land.length;k++){
    const cover=covers[k],seed=random(k);
    if(coldOcean[k]||ice[k]>.45||seed>=(density[cover]??0))continue;
    const p=gridPoint(grid,k),x=p.x+(random(k+84)-.5)*13,z=p.z+(random(k+512)-.5)*13;
    const y=heightOnGrid(grid,land,x,z);
    if(y<epoch.sea+.4||heightOnGrid(grid,ice,x,z)>.5)continue;
    if(iceAgeLakes.some(lake=>y<lake.level&&Math.hypot((x-lake.x)/lake.rx,(z-lake.z)/lake.rz)<1.25))continue;
    const channel=riverAt(x,z);
    if(channel&&channel.distance<Math.min(channel.half,14)+2&&y<channel.stage+.28)continue;
    const hardwood=cover==='broadleaf';
    const tree=hardwood||((cover==='woodland'||cover==='refuge')&&random(k+105)>.31);
    const scale=tree?8+8*random(k+51)+(cover==='refuge'?0:4):1.1+2.5*random(k+51);
    const cluster=hardwood?broadleaf:tree?trees:cover==='wetland'?rushes:bushes;
    cluster.push({x,y,z,scale,seed,cover});
  }
  const dummy=new THREE.Object3D();
  function instances(items,geo,color,offset,scale){
    if(!items.length){geo.dispose();return;}
    const objects=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({roughness:1}),items.length);
    items.forEach(({x,y,z,scale:s,seed,cover},i)=>{
      dummy.position.set(x,y+s*offset,z);
      dummy.scale.set(s*scale[0],s*scale[1],s*scale[0]);dummy.rotation.y=seed*19;dummy.updateMatrix();
      objects.setMatrixAt(i,dummy.matrix);
      objects.setColorAt(i,new THREE.Color(color??paleoCover[cover].color).multiplyScalar(.82+.36*seed));
    });
    root.add(objects);
  }
  instances(bushes,new THREE.IcosahedronGeometry(.55,0),null,.30,[1.2,.66]);
  instances(rushes,new THREE.ConeGeometry(.28,1,5),'#627f50',.54,[1.9,1.1]);
  instances(trees,new THREE.ConeGeometry(.29,1,5),'#47684e',.55,[1,.75]);
  instances(trees,new THREE.ConeGeometry(.23,1,5),'#729475',.85,[1,.66]);
  instances(broadleaf,new THREE.SphereGeometry(.33,7,5),'#41754a',.69,[1,1]);
  return root;
}

function prehistoricScene(model,modernShore){
  const view=new THREE.Group(),waterMaterial=new THREE.MeshBasicMaterial({vertexColors:true}),water=[];
  const sea=waterGeometry(model,model.surface,model.epoch.sea,model.coldOcean,{highlightLowland:model.id==='interglacial'});
  const reference=coastline(modernShore,'#f2d093',{dashed:true,model});
  const seaViews=[new THREE.Mesh(sea,waterMaterial),distantSea(model,waterMaterial)];
  view.add(surfaceMesh(model,false),surfaceMesh(model,true),...seaViews,
    coastline(sea.userData.shoreline,'#94f2ef'),reference,plants(model));
  water.push({geometry:sea,kind:'sea'});
  for(const {id,points} of model.rivers){
    const river=riverMesh(model,points,Object.hasOwn(model.mouths,id));
    water.push({geometry:river.geometry,kind:'river'});
    view.add(river);
  }
  for(const lake of iceAgeLakes){
    const mask=Uint8Array.from(model.surface,(_,k)=>{
      const {x,z}=gridPoint(model.grid,k);
      return Number(Math.hypot((x-lake.x)/lake.rx,(z-lake.z)/lake.rz)<=1.25);
    });
    const geometry=waterGeometry(model,model.surface,lake.level,mask,{tint:new THREE.Color('#51888c')});
    if(geometry.attributes.position.count){
      water.push({geometry,kind:'lake'});
      view.add(new THREE.Mesh(geometry,waterMaterial));
    }else geometry.dispose();
  }
  return {view,reference,water,seaViews};
}

export function createIceAgeScene(scene,modernRoots,modernSeaSurface=null){
  const root=new THREE.Group();
  root.name='Climate timeline';root.visible=false;scene.add(root);
  let data=null,modernShore,shown=null,visibility=null,seaVisible=null;
  const snapshots=new Map(),rings=new THREE.Group();
  const ringGeometry=new THREE.RingGeometry(13,21,32);
  const ringMaterial=new THREE.MeshBasicMaterial({color:'#ffb76f',side:THREE.DoubleSide,depthTest:false,depthWrite:false});
  const markers=Object.fromEntries(['central','south'].map(id=>{
    const ring=new THREE.Mesh(ringGeometry,ringMaterial);
    ring.renderOrder=2;
    ring.rotation.x=-Math.PI/2;
    rings.add(ring);
    return [id,ring];
  }));
  root.add(rings);
  function prepare(){
    if(data)return data;
    const model=buildIceAge(),routes=iceAgeRoutes(model);
    const modernSea=waterGeometry(model,model.modern,0,model.modernOcean);
    modernShore=modernSea.userData.shoreline;
    const view=coastline(modernShore,'#f2d093');
    view.visible=false;
    root.add(view);
    snapshots.set('now',{view,frame:iceAgeFrame(model,'now')});
    modernSea.dispose();
    data={model,routes};
    return data;
  }
  function discard(entry){
    const materials=new Set();
    entry.view.traverse(object=>{
      object.geometry?.dispose();
      if(object.material)materials.add(object.material);
    });
    for(const material of materials)material.dispose();
    root.remove(entry.view);
  }
  function snapshot(id){
    const {model}=prepare();
    if(!snapshots.has(id)){
      const frame=iceAgeFrame(model,id),geometry=prehistoricScene(frame,modernShore);
      snapshots.set(id,{frame,...geometry});
      root.add(geometry.view);
    }
    const entry=snapshots.get(id);
    snapshots.delete(id);snapshots.set(id,entry);
    // Keep the modern reference and up to three rendered prehistoric frames.
    if(snapshots.size>4){
      const oldest=[...snapshots.keys()].find(key=>key!=='now');
      discard(snapshots.get(oldest));snapshots.delete(oldest);
    }
    return entry;
  }
  function restore(){
    for(const [object,visible] of visibility??[])object.visible=visible;
    visibility=null;
  }
  function concealModern(){
    if(visibility)for(const [object] of visibility)object.visible=false;
  }
  function restoreSea(){
    if(seaVisible===null)return;
    modernSeaSurface.visible=seaVisible;seaVisible=null;
  }
  return {
    prepare,
    show(id,showReference,focus,{cutaway=false}={}){
      const next=snapshot(id),past=id!=='now';
      restoreSea();
      if(shown&&shown!==next)shown.view.visible=false;
      shown=next;
      if(past&&!visibility)visibility=modernRoots.map(object=>[object,object.visible]);
      if(!past)restore();
      concealModern();
      root.visible=true;next.view.visible=true;
      for(const mesh of next.seaViews??[])mesh.visible=!cutaway;
      if(cutaway&&!past&&modernSeaSurface){
        seaVisible=modernSeaSurface.visible;modernSeaSurface.visible=false;
      }
      if(next.reference)next.reference.visible=showReference;
      for(const [river,ring] of Object.entries(markers)){
        const {x,z,level}=next.frame.mouths[river];
        ring.visible=!focus||focus===(river==='central'?'water':'inland');
        ring.position.set(x,level+2.5,z);
      }
      return next.frame;
    },
    hide(){root.visible=false;restoreSea();restore();},
    update:concealModern,
    get water(){return shown?.water??[];}
  };
}

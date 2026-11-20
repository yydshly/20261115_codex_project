import * as THREE from 'three';
import {groundColor,terrainHeight} from './large-world.js';
import {comparisonBed,epochTriangles,gridPoint,heightOnGrid} from './ice-age.js';
import {benchmarkNear,trailHalfWidth} from './benchmark-trail.js';
import {iceLine} from './glacial-geography.js';
import {drownedShelfDistance,legacyColors,legacyCrossSection,legacyReading,makeLegacySurvey,marineAt} from './ice-legacy.js';

const material=(color,opacity=1)=>new THREE.MeshBasicMaterial({
  color,opacity,transparent:opacity<1,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false
});
const hash=(i,s)=>{const n=Math.sin(i*119.31+s*48.73)*43758.5453;return n-Math.floor(n);};

function trace(points,color,order=52,segments=false,dashed=false){
  const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p.x,p.y,p.z)));
  const lineMaterial=dashed?new THREE.LineDashedMaterial({
    color,dashSize:12,gapSize:7,depthTest:false,depthWrite:false,toneMapped:false
  }):new THREE.LineBasicMaterial({color,depthTest:false,depthWrite:false,toneMapped:false});
  const line=segments?new THREE.LineSegments(geometry,lineMaterial):new THREE.Line(geometry,lineMaterial);
  line.computeLineDistances();line.renderOrder=order;return line;
}

function mesh(vertices,skin,order){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  const m=new THREE.Mesh(geometry,skin);m.renderOrder=order;return m;
}

function footprint(frame,lift){
  if(frame.id==='now'){
    return [-1,1].flatMap(side=>iceLine.filter((_,i)=>i%5===0).slice(1).flatMap((p,i)=>
      [iceLine[i*5],p].map(q=>{
        const x=q.x+q.nx*q.half*side,z=q.z+q.nz*q.half*side;
        return {x,z,y:terrainHeight(x,z)+lift};
      })
    ));
  }
  const {ice,grid,surface}=frame,cache=new Map(),out=[];
  function at(k){
    if(!cache.has(k))cache.set(k,{...gridPoint(grid,k),ice:ice[k],y:surface[k]+lift});
    return cache.get(k);
  }
  epochTriangles(grid,(a,b,c)=>{
    if(ice[a]>1.7&&ice[b]>1.7&&ice[c]>1.7||ice[a]<=1.7&&ice[b]<=1.7&&ice[c]<=1.7)return;
    const vertices=[at(a),at(b),at(c)];
    if(vertices.some(p=>p.x<102||p.x>722||p.z< -735||p.z> -58))return;
    const ends=[];
    for(let i=0;i<3;i++){
      const u=vertices[i],v=vertices[(i+1)%3];
      if((u.ice>1.7)===(v.ice>1.7))continue;
      const t=(1.7-u.ice)/(v.ice-u.ice);
      ends.push({x:u.x+(v.x-u.x)*t,z:u.z+(v.z-u.z)*t,y:u.y+(v.y-u.y)*t});
    }
    if(ends.length===2)out.push(...ends);
  });
  return out;
}

function ridgeHeight(x,z,center){
  const dx=x-center.x,dz=z-center.z,along=(dx-.34*dz)/23,cross=(dz+.34*dx)/7.3;
  const bump=Math.max(0,1-along**2-cross**2);
  if(bump===0||benchmarkNear(x,z,trailHalfWidth+1)!==null)return 0;
  return 2.7*bump**1.45*(.89+.11*Math.sin(x*.63+z*.16));
}

function morainePlot(base,site){
  const {x,z}=site.p,root=new THREE.Group();root.name='old moraine gravel ridge';
  const rows=24,cols=44,bed=[],stoneGeo=new THREE.IcosahedronGeometry(1,0);
  const fill=(x,z)=>ridgeHeight(x,z,site.p);
  const floor=(x,z,id)=>id==='now'?terrainHeight(x,z):heightOnGrid(base.grid,base.land,x,z);
  const sediment=new THREE.MeshStandardMaterial({color:'#9c8873',roughness:.94,vertexColors:true});
  const colors=new THREE.Color(),pose=new THREE.Object3D(),samples=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const px=x-25+50*i/cols,pz=z-16+32*j/rows;
    bed.push({x:px,z:pz});
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const k=j*(cols+1)+i,indices=[k,k+1,k+cols+1,k+cols+2];
    if(indices.every(index=>fill(bed[index].x,bed[index].z)<.05))continue;
    samples.push(...[k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2]);
  }
  let physical=null;
  function build(id){
    const geo=[],rgb=[];
    for(const i of samples){
      const p=bed[i],height=fill(p.x,p.z);
      geo.push(p.x,floor(p.x,p.z,id)+height+.075,p.z);
      const shade=.72+.35*hash(i,7);
      rgb.push(shade,shade,shade);
    }
    const surface=mesh(geo,sediment,0);surface.geometry.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
    const gravel=[];
    for(let i=0;i<141;i++){
      const px=x-24+48*hash(i,1),pz=z-13+26*hash(i,2),h=fill(px,pz);
      if(h<.22)continue;
      gravel.push({x:px,z:pz,h,size:.32+.81*hash(i,3)});
    }
    const cobbles=new THREE.InstancedMesh(stoneGeo,new THREE.MeshStandardMaterial({color:'#807a6d',roughness:1}),gravel.length);
    gravel.forEach((p,i)=>{
      pose.position.set(p.x,floor(p.x,p.z,id)+p.h+p.size*.31,p.z);
      pose.rotation.set(hash(i,6),hash(i,5)*6.3,hash(i,7));pose.scale.set(p.size*1.6,p.size*.78,p.size);
      pose.updateMatrix();cobbles.setMatrixAt(i,pose.matrix);
      cobbles.setColorAt(i,colors.set(i%3?'#a6a294':'#d9c5a3'));
    });
    root.add(surface,cobbles);
    return {surface,cobbles};
  }
  let current=null;
  function show(id){
    const key=id==='now'?'now':'past';
    if(key===current)return;
    if(physical){
      root.remove(physical.surface,physical.cobbles);
      physical.surface.geometry.dispose();physical.cobbles.material.dispose();
    }
    current=key;physical=build(id);
  }
  return {root,show};
}

function transectMesh(points,site){
  const group=new THREE.Group();group.name='legacy sediment cross section '+site.id;
  const v=[];
  function p(point,y){return [point.x,y+.45,point.z];}
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    if(a.now<=a.former&&b.now<=b.former)continue;
    const at=Math.max(a.former,a.now),bt=Math.max(b.former,b.now);
    v.push(...p(a,a.former),...p(a,at),...p(b,bt),...p(a,a.former),...p(b,bt),...p(b,b.former));
  }
  group.add(mesh(v,material(legacyColors.fill,.84),55),
    trace(points.map(p=>({...p,y:p.former+.55})),'#cbb9f4',57),
    trace(points.map(p=>({...p,y:p.now+.65})),'#f8dfac',56));
  return group;
}

function wetlandBand(wetlandSource){
  const source=wetlandSource(),p=source.stations.find(s=>s.id==='seasonal').point;
  const points=source.points.filter((s,i)=>i%6===0&&Math.hypot(s.x-p.x,s.z-p.z)<66&&
    ['floodplain','seasonal','permanent'].includes(s.band));
  const colors={floodplain:'#e6c482',seasonal:'#b5d686',permanent:'#81d8c0'};
  const geo=new THREE.CircleGeometry(1.03,8);geo.rotateX(-Math.PI/2);
  const plane=new THREE.InstancedMesh(geo,material('#ffffff',.70),points.length),pose=new THREE.Object3D();
  points.forEach((q,i)=>{
    pose.position.set(q.x,q.bed+.22,q.z);pose.updateMatrix();plane.setMatrixAt(i,pose.matrix);
    plane.setColorAt(i,new THREE.Color(colors[q.band]));
  });
  plane.renderOrder=55;return plane;
}

function westernShelf(){
  const vertices=[],rgb=[];
  const tint=new THREE.Color(),deep=new THREE.Color('#827a66'),edgeColors=new Map();
  for(let z=-990;z<=530;z+=10){
    const edge=groundColor(-1920,z);
    edgeColors.set(z,new THREE.Color().setRGB(edge[0]/255,edge[1]/255,edge[2]/255,THREE.SRGBColorSpace));
  }
  for(let x=-2500;x< -1920;x+=10)for(let z=-990;z<530;z+=10){
    for(const [px,pz] of [[x,z],[x,z+10],[x+10,z],[x+10,z],[x,z+10],[x+10,z+10]]){
      const y=comparisonBed(px,pz);
      tint.copy(edgeColors.get(pz)).lerp(deep,Math.min(.9,(-1920-px)/220));
      vertices.push(px,y-.025,pz);rgb.push(tint.r,tint.g,tint.b);
    }
  }
  const shelf=mesh(vertices,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1}),0);
  shelf.geometry.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
  shelf.name='west shelf comparison continuation';
  return shelf;
}

export function createLegacyScene(scene,timeline,wetlandSource){
  const root=new THREE.Group();root.name='glacial landform legacy survey';root.visible=false;scene.add(root);
  let survey,moraine=null,wetland=null,shelf=null,cached=null;
  const outline=new THREE.Group(),dynamic=new THREE.Group(),sections=new Map();
  root.add(outline,dynamic);
  const pin=new THREE.Mesh(new THREE.RingGeometry(.72,1,32),material('#f8e4a6',.94));
  pin.rotation.x=-Math.PI/2;pin.renderOrder=60;root.add(pin);
  function prepare(){
    if(!survey){
      const {model}=timeline.prepare();
      survey=makeLegacySurvey(model);
      moraine=morainePlot(model,survey.stops[1]);root.add(moraine.root);
    }
    return survey;
  }
  function clear(group){
    for(const child of [...group.children]){
      child.geometry.dispose();child.material.dispose();group.remove(child);
    }
  }
  function show(epoch,site,evidence,reference){
    const data=prepare(),inlet=['mouth','inner','outer'].includes(site?.id),cutaway=evidence&&inlet;
    const frame=timeline.show(epoch,reference,'water',{cutaway});
    root.visible=true;
    const extended=cutaway&&epoch==='now';
    if(extended&&!shelf){shelf=westernShelf();root.add(shelf);}
    if(shelf)shelf.visible=extended;
    const observed=site?legacyReading(data.base,frame,site):null;
    const y=p=>heightOnGrid(frame.grid,frame.surface,p.x,p.z);
    const coastY=(p,sub)=>sub&&!cutaway?frame.epoch.sea+2:
      cutaway?heightOnGrid(data.base.grid,data.base.land,p.x,p.z)+.58:y(p)+.92;
    const proofKey=[epoch,site?.id,evidence,reference].join('/');
    const nearIce=site&&['ice-edge','moraine','lake'].includes(site.id);
    if(cached!==proofKey){
      clear(outline);clear(dynamic);cached=proofKey;
      if(nearIce||!site){
        if(reference||evidence)outline.add(trace(footprint({...frame,id:'glacial',ice:data.base.ice,surface:data.base.surface},3),
          '#c1a5e9',53,true,true));
        outline.add(trace(footprint(frame,2.2),legacyColors.ice,54,true));
      }
      if(!site){
        dynamic.add(trace(data.path.map(p=>({...p,y:Math.max(frame.epoch.sea,y(p))+6})),'#e4d09f',49));
      }
      if(inlet||!site){
        const visible=[],hidden=[];
        for(let i=1;i<data.coastline.length;i++){
          const a=data.coastline[i-1],b=data.coastline[i],sub=marineAt(frame,b);
          const points=[a,b].map(p=>({...p,y:coastY(p,sub)}));
          (sub?hidden:visible).push(...points);
        }
        dynamic.add(trace(visible,legacyColors.exposed,54,true),
          trace(hidden,legacyColors.submerged,54,true,true));
      }
      if(site?.id==='valley'){
        const cross=legacyCrossSection(data,site);
        dynamic.add(trace(cross.map(p=>({...p,y:(epoch==='now'?p.now:p.former)+1.26})),legacyColors.retained));
      }
    }
    moraine.root.visible=Boolean(nearIce)&&legacyReading(data.base,frame,data.stops[1]).ice<1.7;
    if(moraine.root.visible)moraine.show(epoch);
    pin.visible=!!site;
    if(site){
      pin.position.set(site.p.x,(cutaway?observed.former:observed.ocean?observed.level:
        observed.lake?(epoch==='now'?244:242.3):observed.ground+observed.ice)+2.65,site.p.z);
      pin.scale.setScalar(site.range<215?6:9);
    }
    const sectionName=evidence&&['mouth','inner','outer','valley','wetland'].includes(site?.id)?site.id:null;
    if(sectionName&&!sections.has(sectionName)){
      const object=transectMesh(legacyCrossSection(data,site),site);sections.set(sectionName,object);root.add(object);
    }
    for(const [key,g] of sections)g.visible=key===sectionName;
    if(evidence&&site?.id==='wetland'&&epoch==='now'&&!wetland){
      wetland=wetlandBand(wetlandSource);root.add(wetland);
    }
    if(wetland)wetland.visible=evidence&&site?.id==='wetland'&&epoch==='now';
    return {frame,observed,survey:data,drowned:drownedShelfDistance(data,frame),cutaway};
  }
  return {prepare,show,hide(){root.visible=false;timeline.hide();},update:timeline.update};
}

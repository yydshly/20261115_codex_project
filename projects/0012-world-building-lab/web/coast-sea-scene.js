import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {clippedWaterGeometry} from './watershed-balance-scene.js';
import {coastDive,coastPlacements,coastProfile,coastRead,coastTides,southwestTidePatch} from './coast-sea.js';
import {seaFrame,seaLength,seaPoint,seaStations} from './mainline-sea.js';

const tint=(color,opacity=1)=>new THREE.MeshBasicMaterial({
  color,opacity,transparent:opacity<1,side:THREE.DoubleSide,depthWrite:false,toneMapped:false
});
const material=(color,roughness=.86)=>new THREE.MeshStandardMaterial({color,roughness,side:THREE.DoubleSide});
const hash=(i,s)=>{const n=Math.sin(i*127.1+s*71.37)*43758.5453;return n-Math.floor(n);};

function geometryFrom(vertices){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.computeVertexNormals();return g;
}

function leaves(n,length,width){
  const v=[];
  for(let k=0;k<n;k++){
    const a=k*2.39996,dx=Math.cos(a),dz=Math.sin(a),size=length*(.59+.38*hash(k,3));
    const points=(t,s)=>[dx*(t*t*.55+.064)+dz*s*width*(1-.72*t),
      size*(t-.09*t*t),dz*(t*t*.55+.064)-dx*s*width*(1-.72*t)];
    for(let j=0;j<4;j++){
      const a=j/4,b=(j+1)/4;
      v.push(...points(a,-1),...points(b,-1),...points(a,1),...points(a,1),...points(b,-1),...points(b,1));
    }
  }
  return geometryFrom(v);
}

function benthicAssets(){
  const coral=new THREE.Group(),branchMat=material('#d98a68'),tipMat=material('#edbd9a');
  const a=new THREE.Vector3(),b=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  function branch(from,to,r){
    a.set(...from);b.set(...to);const d=b.clone().sub(a);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.53,r,d.length(),6),branchMat);
    mesh.position.copy(a).lerp(b,.5);mesh.quaternion.setFromUnitVectors(up,d.normalize());
    coral.add(mesh);
  }
  for(let i=0;i<6;i++){
    const az=i*2.39996,x=Math.cos(az),z=Math.sin(az),h=.72+hash(i,6)*.72;
    branch([0,.08,0],[x*.4,h,z*.4],.112);
    branch([x*.23,h*.5,z*.23],[x*.8,h*.8+.22,z*.83],.084);
    branch([x*.36,h*.88,z*.36],[x*.49,h+.43,z*.39],.067);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(.069,6,5),tipMat);
    tip.position.set(x*.49,h+.42,z*.39);coral.add(tip);
  }
  const sponge=new THREE.Group(),spongeMat=material('#d1a27b');
  for(let i=0;i<3;i++){
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(.24,.13,.64+i*.27,8,1,true),spongeMat);
    tube.position.set(.3*Math.cos(i*2.3),(.64+i*.27)*.5,.25*Math.sin(i*2.3));sponge.add(tube);
  }
  const star=new THREE.Shape();
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5,d=i%2?.20:.64;
    if(i===0)star.moveTo(d,0);else star.lineTo(d*Math.cos(a),d*Math.sin(a));
  }
  star.closePath();
  const starGeo=new THREE.ExtrudeGeometry(star,{depth:.11,bevelEnabled:true,bevelSize:.05,bevelThickness:.045,bevelSegments:1,steps:1});
  starGeo.rotateX(-Math.PI/2);
  const shell=new THREE.SphereGeometry(.46,8,6,0,Math.PI*2,0,Math.PI*.59);shell.scale(1,.58,.72);
  const dome=new THREE.DodecahedronGeometry(.81,2);dome.scale(1,.61,.84);
  const cucumber=new THREE.CapsuleGeometry(.21,.92,3,8);cucumber.rotateZ(Math.PI/2);cucumber.translate(0,.19,0);
  const rock=new THREE.DodecahedronGeometry(1,0);rock.scale(1,.47,.91);
  return {
    batches:{
      rock:[rock,material('#767d74')],grass:[leaves(10,1.43,.08),material('#539b52')],
      algae:[leaves(6,.41,.11),material('#70853e')],mussel:[shell,material('#555957')],
      shell:[shell,material('#c7ba9e')],worms:[new THREE.CylinderGeometry(.065,.087,.48,5),material('#b2a17f')],
      massive:[dome,material('#dbb478')],star:[starGeo,material('#cf9a70')],cucumber:[cucumber,material('#938078')]
    },coral,sponge
  };
}

function seabedPatch(site,r,color){
  const vertices=[],rgb=[],steps=31,base=new THREE.Color(color);
  for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){
    const x0=site.x-r+2*r*i/steps,z0=site.z-r*.72+1.44*r*j/steps;
    const u=(x0-site.x)/r,v=(z0-site.z)/(r*.72);
    if(u*u+v*v>1)continue;
    const dx=2*r/steps,dz=1.44*r/steps;
    for(const [x,z] of [[x0,z0],[x0,z0+dz],[x0+dx,z0],[x0+dx,z0],[x0,z0+dz],[x0+dx,z0+dz]]){
      const tone=base.clone().multiplyScalar(.92+.053*Math.sin(x*.56+z*.15)+.035*Math.cos(z*.71-x*.42)).toArray();
      vertices.push(x,terrainHeight(x,z)+.067,z);rgb.push(...tone);
    }
  }
  const geometry=geometryFrom(vertices);
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
  return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.98,side:THREE.DoubleSide}));
}

function scenePlot({site,records},assets,cover=true){
  const group=new THREE.Group();group.name='coast community '+site.id;
  const {batches,coral,sponge}=assets;
  const hard=['reef','intertidal','slope'].includes(site.habitat);
  const base=records.filter((p,i)=>hard&&(i%2===0||p.kind==='coral'||p.kind==='massive'||p.kind==='sponge'));
  const radii={mouth:26,rock:31,grass:26,coral:35,shelf:48,slope:52,trench:50};
  if(cover)group.add(seabedPatch(site,radii[site.id],coastRead(site,'high').habitat.color));
  const pose=new THREE.Object3D();
  const placements=new Map();
  for(const p of [...base.map(p=>({...p,kind:'rock'})),...records]){
    if(!placements.has(p.kind))placements.set(p.kind,[]);
    placements.get(p.kind).push(p);
  }
  for(const [kind,asset] of [['coral',coral],['sponge',sponge]]){
    const points=placements.get(kind);
    if(!points)continue;
    const matrix=new THREE.Matrix4();
    for(const part of asset.children){
      part.updateMatrix();
      const mesh=new THREE.InstancedMesh(part.geometry,part.material,points.length);
      mesh.name=kind;
      points.forEach((p,i)=>{
        pose.position.set(p.x,p.y+(kind==='sponge'?.17:.22),p.z);
        pose.scale.setScalar(p.size*.8);pose.rotation.set(0,p.seed*6.28,0);pose.updateMatrix();
        mesh.setMatrixAt(i,matrix.multiplyMatrices(pose.matrix,part.matrix));
      });
      group.add(mesh);
    }
    placements.delete(kind);
  }
  for(const [kind,points] of placements){
    const mesh=new THREE.InstancedMesh(...batches[kind],points.length);
    mesh.name=kind;
    points.forEach((p,i)=>{
      const y=kind==='rock'?.16:kind==='worms'?.24:kind==='massive'?.43:kind==='star'?.12:.04;
      pose.position.set(p.x,p.y+y*p.size,p.z);pose.rotation.set(0,p.seed*6.283,0);
      pose.scale.setScalar((kind==='rock'?1.27:1)*p.size);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
    });
    group.add(mesh);
  }
  return group;
}

export function createMainlineSeaScene(scene,water){
  const root=new THREE.Group();
  root.name='Continuous shallow sea to trench';root.visible=false;scene.add(root);
  const lamp=new THREE.SpotLight('#e2f5f7',0,125,.65,.56,2);
  const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(430,430),tint('#7395a2'));
  ceiling.rotation.x=-Math.PI/2;ceiling.material.depthWrite=true;ceiling.visible=false;
  root.add(lamp,lamp.target,ceiling);
  let communities=null,oldSea=null;
  function prepare(){
    const assets=benthicAssets(),allowed=['rock','grass','coral','shelf','slope','trench'];
    communities=new THREE.Group();
    for(const plot of coastPlacements())if(allowed.includes(plot.site.id))communities.add(scenePlot(plot,assets));
    const representatives=Object.values(seaStations),records=[];
    for(let at=seaStations.coral.at+28,i=0;at<seaLength;at+=8,i++){
      const p=seaPoint(at),a=seaPoint(at-1),b=seaPoint(at+1);
      const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
      for(let j=0;j<4;j++){
        const k=i*4+j,offset=(hash(k,8)-.5)*22,x=p.x+dz/d*offset,z=p.z-dx/d*offset;
        if(representatives.some(s=>Math.hypot(s.x-x,s.z-z)<23))continue;
        const y=terrainHeight(x,z),depth=-y;
        if(depth<5)continue;
        const r=hash(k,11);
        const kind=depth>245?r>.4?'cucumber':'shell':depth>78?r>.63?'sponge':'rock':r>.45?'star':'shell';
        records.push({x,y,z,kind,size:.55+hash(k,5)*.70,seed:r});
      }
    }
    const {p,target}=seaFrame(seaLength),heading=new THREE.Vector2(target.x-p.x,target.z-p.z).normalize();
    const trenchCluster=[[2.5,-1.4],[3.8,.8],[5.8,-1.4],[6.2,1.1],[7.2,-2.0],[8.7,1.6],[9.8,-2.5]];
    trenchCluster.forEach(([distance,lateral],i)=>{
      const x=p.x+heading.x*distance+heading.y*lateral,z=p.z+heading.y*distance-heading.x*lateral;
      records.push({x,y:terrainHeight(x,z),z,kind:i%3?'cucumber':'shell',size:.88+hash(i,14)*.56,seed:hash(i,16)});
    });
    communities.add(scenePlot({site:{id:'transition',habitat:'transit'},records},assets,false));
    root.add(communities);
  }
  return {
    show(frame,eye,target){
      if(!communities)prepare();
      oldSea??=water.visible;
      const submerged=eye.y<-.025;
      water.visible=oldSea&&!submerged;
      root.visible=true;communities.visible=submerged;
      ceiling.visible=submerged&&eye.y> -24;
      ceiling.position.set(eye.x,.025,eye.z);
      lamp.position.set(eye.x,Math.min(-.06,eye.y+.22),eye.z);
      lamp.target.position.set(target.x,target.y-.45,target.z);
      const distance=lamp.position.distanceToSquared(lamp.target.position);
      lamp.intensity=submerged?Math.min(2300,distance*(1.7+2.3*frame.immersed)):0;
    },
    hide(){
      if(oldSea!==null)water.visible=oldSea;
      oldSea=null;root.visible=false;lamp.intensity=0;
    }
  };
}

function drawTracks(points){
  function trace(floor){
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>
      new THREE.Vector3(p.x,floor?p.y+2.5:Math.max(p.y,.8)+3,p.z)
    )),new THREE.LineBasicMaterial({color:'#c6efe8',depthTest:false,depthWrite:false,toneMapped:false}));
    line.renderOrder=56;return line;
  }
  return {surface:trace(false),bed:trace(true)};
}

export function createCoastSeaScene(scene,{sea,tropicalWater,oceanLife,oceanGuides}){
  const root=new THREE.Group();root.name='coastal sea transect';root.visible=false;scene.add(root);
  const lamp=new THREE.SpotLight('#e6f3f7',0,75,.63,.56,2);
  root.add(lamp,lamp.target);
  const ceilingGeo=new THREE.PlaneGeometry(460,460,92,92);
  ceilingGeo.rotateX(-Math.PI/2);
  const ripples=[],surface=ceilingGeo.attributes.position;
  for(let i=0;i<surface.count;i++){
    const x=surface.getX(i),z=surface.getZ(i);
    const wave=Math.sin(x*.45+Math.sin(z*.73))+Math.cos(z*.39+x*.19);
    surface.setY(i,.042*wave);
    const shine=.77+.10*wave; ripples.push(shine,shine,shine);
  }
  ceilingGeo.setAttribute('color',new THREE.Float32BufferAttribute(ripples,3));
  const ceiling=new THREE.Mesh(ceilingGeo,tint('#91bec4'));ceiling.material.vertexColors=true;
  ceiling.material.depthWrite=true;ceiling.name='submerged water ceiling';ceiling.visible=false;root.add(ceiling);
  let data=null,restore=null,activeDive=null;
  function followDive(eye,focus){
    if(!activeDive)return;
    lamp.position.set(eye.x,Math.min(eye.y+.24,activeDive.surface-.1),eye.z);
    if(focus)lamp.target.position.set(focus.x,focus.y-.33,focus.z);
    lamp.intensity=(activeDive.deep?4.2:1.4)*lamp.position.distanceToSquared(lamp.target.position);
  }
  function build(){
    const profile=coastProfile(),plots=new Map(),assets=benthicAssets();
    for(const item of coastPlacements()){
      const group=scenePlot(item,assets);plots.set(item.site.id,group);root.add(group);
    }
    const tracks=drawTracks(profile.points);root.add(tracks.surface,tracks.bed);
    const tidal=southwestTidePatch(),tideMeshes=new Map(),color=new THREE.Color('#77938a');
    for(const key of Object.keys(coastTides)){
      const state=tidal(key);
      const m=new THREE.Mesh(clippedWaterGeometry(state,state.level,{waterMask:state.wet,colorAt:()=>color.toArray()}),
        tint('#85a79a',.87));
      m.renderOrder=29;root.add(m);tideMeshes.set(key,m);
    }
    const ring=new THREE.Mesh(new THREE.RingGeometry(.77,1,32),tint('#f6dc9d',.96));
    ring.rotation.x=-Math.PI/2;ring.material.depthTest=false;ring.renderOrder=56;root.add(ring);
    const ray=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#a8e3f3',depthTest:false}));
    ray.renderOrder=55;root.add(ray);
    return {profile,plots,tracks,tideMeshes,ring,ray};
  }
  function show(site,tide,mode){
    data??=build();
    restore??={areaVisible:sea.visible,areaY:sea.position.y,tropical:tropicalWater.visible,
      ocean:oceanLife.visible,guides:oceanGuides.visible};
    const viewing=site?coastRead(site,tide):null;
    const dive=mode==='dive'&&site?coastDive(site,viewing):null;
    activeDive=dive;
    const dryBed=mode==='bed',cameraBelow=Boolean(dive);
    sea.visible=restore.areaVisible&&!dryBed&&!cameraBelow;sea.position.y=restore.areaY+coastTides[tide].height;
    ceiling.visible=cameraBelow;
    if(dive){
      ceiling.position.set(site.x,viewing.surface,site.z);
      ceiling.material.color.set(site.id==='mouth'?'#a7ae91':dive.deep?'#40748d':'#8cc7d0');
    }
    tropicalWater.visible=restore.tropical&&site?.id!=='mouth';
    oceanLife.visible=restore.ocean&&!['shelf','slope','trench'].includes(site?.id);
    oceanGuides.visible=restore.guides&&!site;
    root.visible=true;
    for(const [id,g] of data.plots)g.visible=id===site?.id;
    for(const [id,m] of data.tideMeshes)m.visible=site?.id==='mouth'&&id===tide&&!dryBed&&!cameraBelow;
    data.tracks.surface.visible=!site&&!dryBed;data.tracks.bed.visible=!site&&dryBed;
    data.ring.visible=!!site&&!cameraBelow;
    data.ray.visible=!!site&&dryBed&&viewing.depth>.01;
    if(site){
      data.ring.position.set(site.x,(dryBed?viewing.bed:Math.max(viewing.surface,viewing.bed))+.45,site.z);
      data.ring.scale.setScalar(site.range<200?4:11);
      if(data.ray.visible){
        data.ray.geometry.dispose();
        data.ray.geometry=new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(site.x,viewing.surface,site.z),new THREE.Vector3(site.x,viewing.bed,site.z)
        ]);
      }
    }
    lamp.intensity=0;
    if(dive){
      lamp.target.position.set(site.x,viewing.bed+.2,site.z);
      followDive(dive);
    }
    return {profile:data.profile,reading:viewing,dive};
  }
  return {show,followDive,hide(){
    root.visible=false;lamp.intensity=0;activeDive=null;
    if(!restore)return;
    sea.visible=restore.areaVisible;sea.position.y=restore.areaY;
    tropicalWater.visible=restore.tropical;oceanLife.visible=restore.ocean;oceanGuides.visible=restore.guides;restore=null;
  }};
}

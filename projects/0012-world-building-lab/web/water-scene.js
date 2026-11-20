import * as THREE from 'three';
import {asset,batch,geometry,material} from './models.js';
import {terrainHeight,random,riverBridgeHeight} from './large-world.js';
import {riverSample,branchSample,riverLines,SOURCE_POOL,FALL_T,FALL_TOP,FALL_BOTTOM,waterPlatforms,waterStops,waterTrail,waterRouteSample,waterAt,bankPoint,riverBridge,riverBridgePoint} from './water-system.js';

// Geometry and flow direction come from the same longitudinal water profile as the carved bed.
export function riverGeometry(minimap=false,omitReach=null,endAt=1){
 const vertices=[],colors=[],uv=[],indices=[],color=new THREE.Color();let row=0;
 for(const {branch,points} of riverLines){
  if(points[0].t>endAt)continue;
  let ts=points.filter((p,i)=>p.t<=endAt&&(!minimap||i%4===0)).map(p=>p.t);
  if(!branch){ts.push(...[FALL_T,...(omitReach??[]),endAt].filter(t=>t<=endAt));ts=[...new Set(ts)].sort((a,b)=>a-b);}
  let previous=-1;
  for(const t of ts){
   if(!branch&&omitReach&&t>omitReach[0]&&t<omitReach[1])continue;
   if(!branch&&omitReach&&t===omitReach[1])previous=-1;
   const p=branchSample(branch,t),levels=!branch&&Math.abs(t-FALL_T)<1e-8?[FALL_TOP,FALL_BOTTOM]:[p.level];
   for(const level of levels){const start=row*9;for(let j=0;j<=8;j++){const v=j/4-1,edge=Math.abs(v),rgb=t<.3?(edge>.8?'#87b6ad':'#477f83'):t<.7?(edge>.8?'#8aa88c':'#498d84'):(edge>.8?'#aac3a8':'#5b9e9a');color.set(rgb);vertices.push(p.x+p.nx*p.half*v,level+.035,p.z+p.nz*p.half*v);colors.push(color.r,color.g,color.b);uv.push(j/8,t*380);}
    if(previous>=0)for(let j=0;j<8;j++)indices.push(previous+j,start+j,previous+j+1,previous+j+1,start+j,start+j+1);previous=start;row++;
   }
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function flowTexture(){const c=document.createElement('canvas');c.width=128;c.height=256;const ctx=c.getContext('2d'),rng=random(312);ctx.fillStyle='#9baba5';ctx.fillRect(0,0,128,256);for(let i=0;i<260;i++){const x=rng()*128,y=rng()*256;ctx.strokeStyle=`rgba(245,253,240,${.08+rng()*.32})`;ctx.lineWidth=.4+rng()*1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+3,y+5,x+1,y+8+rng()*24);ctx.stroke();}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;return tex;}
export function buildWaterSystem(scene,registerObstacle,sea){
 const waterGroup=new THREE.Group(),ecology=new THREE.Group(),structures=new THREE.Group();scene.add(waterGroup,ecology,structures);
 const texture=flowTexture(),flowMaterial=new THREE.MeshStandardMaterial({vertexColors:true,map:texture,bumpMap:texture,bumpScale:.035,roughness:.32,metalness:.17,side:THREE.DoubleSide,transparent:true,opacity:.88});
 const seaTexture=texture.clone();seaTexture.repeat.set(4500,4500);if(sea){sea.material.map=seaTexture;sea.material.bumpMap=seaTexture;sea.material.bumpScale=.045;sea.material.transparent=true;sea.material.opacity=.9;sea.material.depthWrite=false;sea.material.needsUpdate=true;}
 const river=new THREE.Mesh(riverGeometry(),flowMaterial);river.receiveShadow=true;waterGroup.add(river);
 const poolMaterial=new THREE.MeshStandardMaterial({color:'#6b9d9c',map:texture,bumpMap:texture,bumpScale:.035,roughness:.3,metalness:.16,side:THREE.DoubleSide});
 const pool=new THREE.Mesh(new THREE.CircleGeometry(1,64),poolMaterial);pool.rotation.x=-Math.PI/2;pool.scale.set(SOURCE_POOL.rx,SOURCE_POOL.rz,1);pool.position.set(SOURCE_POOL.x,SOURCE_POOL.level+.04,SOURCE_POOL.z);waterGroup.add(pool);
 const pathPoints=Array.from({length:501},(_,i)=>{const p=waterRouteSample(i/500);return new THREE.Vector3(p.x,p.y+5,p.z);}),route=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pathPoints),new THREE.LineDashedMaterial({color:'#efcf8a',dashSize:9,gapSize:6,depthTest:false}));route.computeLineDistances();route.visible=false;route.renderOrder=10;scene.add(route);
 const rng=random(19023),rocks=[];
 // Local bank rocks emphasize narrow upper reaches; vegetation follows the actual shallow edge.
 for(let i=0;i<520;i++){const t=.02+rng()*.84,p=riverSample(t),side=rng()<.5?-1:1,offset=p.half+1+rng()*(t<.35?10:18),x=p.x+p.nx*side*offset,z=p.z+p.nz*side*offset,h=terrainHeight(x,z);if(t<.43){const clear=waterStops.every(r=>Math.hypot(x-r.x,z-r.z)>13);const base=Math.min(h,terrainHeight(x-2.5,z),terrainHeight(x+2.5,z),terrainHeight(x,z-2.5),terrainHeight(x,z+2.5));if(clear&&h-base<2)rocks.push({x,y:base-.2,z,scale:.35+rng()*.9,rotation:rng()*6.28});}}
 ecology.add(batch(asset('rock','valley'),rocks));
 const plankMat=material('#9c8d6b',{roughness:.9}),postMat=material('#756b54'),railMat=material('#b3a183');
 function box(w,h,d,x,y,z,mat=plankMat){const m=new THREE.Mesh(geometry('box',[w,h,d]),mat);m.position.set(x,y,z);m.receiveShadow=true;structures.add(m);return m;}
 function post(x,z,top,r=.13){const ground=terrainHeight(x,z),h=Math.max(.4,top-ground),m=new THREE.Mesh(geometry('cylinder',[r,r*1.2,h,6]),postMat);m.position.set(x,top-h/2,z);structures.add(m);}
 for(const p of waterPlatforms){box(8,.22,6,p.x,p.y-.11,p.z);for(let x=-3.5;x<=3.5;x+=1.75)box(.035,.018,6,p.x+x,p.y+.006,p.z,postMat);for(const dx of [-3.6,3.6])for(const dz of [-2.6,2.6])post(p.x+dx,p.z+dz,p.y);}
 // Raised downstream walk; rendering and walking collision share these exact samples.
 for(let i=0;i<waterTrail.length-1;i++){const a=waterTrail[i],b=waterTrail[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),m=box(3.1,.2,len+.09,(a.x+b.x)/2,(a.y+b.y)/2-.1,(a.z+b.z)/2);m.rotation.y=Math.atan2(dx,dz);if(i%5===0){const nx=-dz/len,nz=dx/len;for(const side of [-1.3,1.3])post(a.x+nx*side,a.z+nz*side,a.y);}}
 const b=riverBridge,bridge=box(b.length,.26,b.width,b.x,b.y-.13,b.z);bridge.rotation.y=-Math.atan2(b.nz,b.nx);
 for(const side of [-1,1]){
  const start=b.length/2*side,end=start+b.rampLength*side,mid=riverBridgePoint((start+end)/2);
  const rise=riverBridgeHeight(end)-b.y;
  const ramp=box(Math.hypot(b.rampLength,rise),.18,b.width,mid.x,(b.y+riverBridgeHeight(end))/2-.088,mid.z);
  ramp.rotation.order='YXZ';ramp.rotation.y=bridge.rotation.y;ramp.rotation.z=Math.atan2(rise*side,b.rampLength);
  const lateral=1.65*side,rail=box(b.length,.09,.09,b.x+b.dx*lateral,b.y+1.05,b.z+b.dz*lateral,railMat);
  rail.rotation.y=bridge.rotation.y;
  for(let d=-b.length/2;d<=b.length/2;d+=4){const {x,z}=riverBridgePoint(d,lateral);post(x,z,b.y+1.05,.09);}
 }
 const boat=asset('boat','island');const bp=riverSample(.92);boat.position.set(bp.x+35,bp.level+.2,bp.z-15);boat.rotation.y=.8;boat.scale.setScalar(1.6);structures.add(boat);
 // White breakup at the real eight-metre drop, plus moving foam strokes on the surface.
 const foamMaterial=new THREE.MeshBasicMaterial({color:'#eef6df',transparent:true,opacity:.62,depthWrite:false,side:THREE.DoubleSide});const fall=riverSample(FALL_T+.0015),foam=new THREE.Mesh(new THREE.CircleGeometry(1,24),foamMaterial);foam.rotation.x=-Math.PI/2;foam.scale.set(2.8,3.5,1);foam.position.set(fall.x,FALL_BOTTOM+.09,fall.z);waterGroup.add(foam);
 const fp=riverSample(FALL_T),dropGeo=new THREE.BufferGeometry(),dv=[];for(const y of [FALL_TOP+.04,FALL_BOTTOM+.04])for(const side of [-1,1])dv.push(fp.x+fp.nx*fp.half*side,y,fp.z+fp.nz*fp.half*side);dropGeo.setAttribute('position',new THREE.Float32BufferAttribute(dv,3));dropGeo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,2,1,2],2));dropGeo.setIndex([0,2,1,1,2,3]);const drop=new THREE.Mesh(dropGeo,new THREE.MeshBasicMaterial({color:'#c1e4da',map:texture,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));drop.position.set(fp.dx*.025,0,fp.dz*.025);waterGroup.add(drop);
 const streaks=[];for(let i=0;i<110;i++){const t=.03+i/110*.84,p=riverSample(t),m=new THREE.Mesh(new THREE.PlaneGeometry(.12+(p.t>.4?.17:0),1.2+p.half*.07),foamMaterial);m.rotation.x=-Math.PI/2;m.rotation.z=-Math.atan2(p.dx,p.dz);waterGroup.add(m);streaks.push({mesh:m,t,side:(rng()-.5)*1.5});}
 const mistGeo=new THREE.BufferGeometry(),mist=[];for(let i=0;i<70;i++)mist.push(fall.x+(rng()-.5)*9,FALL_BOTTOM+.2+rng()*3,fall.z+(rng()-.5)*7);mistGeo.setAttribute('position',new THREE.Float32BufferAttribute(mist,3));const spray=new THREE.Points(mistGeo,new THREE.PointsMaterial({color:'#edf4e5',size:.2,transparent:true,opacity:.25,depthWrite:false}));waterGroup.add(spray);
 let estuaryTide=null;
 return {waterGroup,river,flowMaterial,poolMaterial,
  setEstuaryTide(height){estuaryTide=height;boat.position.y=bp.level+.2+(height??0);
   if(height===null)for(const s of streaks)s.mesh.visible=true;
   else for(const s of streaks)if(s.t>.71)s.mesh.visible=false;
  },
  setOverview(value,sampler=waterRouteSample){route.visible=value;if(value){const points=Array.from({length:501},(_,i)=>{const p=sampler(i/500);return new THREE.Vector3(p.x,p.y+5,p.z);});route.geometry.dispose();route.geometry=new THREE.BufferGeometry().setFromPoints(points);route.computeLineDistances();}},setStage(stage){waterGroup.visible=stage>0;ecology.visible=stage===2;structures.visible=stage===2;},update(time){texture.offset.y=-time*.000018;seaTexture.offset.y=time*.000004;foamMaterial.opacity=.45+Math.sin(time*.0015)*.1;for(const s of streaks){const t=(s.t+time*.0000025)%.94,p=riverSample(t);s.mesh.visible=estuaryTide===null||t<=.71;s.mesh.position.set(p.x+p.nx*p.half*s.side,p.level+.075,p.z+p.nz*p.half*s.side);s.mesh.rotation.z=-Math.atan2(p.dx,p.dz);}boat.position.y=bp.level+.2+(estuaryTide??0)+Math.sin(time*.0007)*.045;},counts:{rocks:rocks.length,waterStops:waterPlatforms.length}};
}

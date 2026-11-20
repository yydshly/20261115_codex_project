import {reliefBelts, snowHeadwaters} from './regional-geography.js';
import {NORTH_REACHES,northSample} from './northern-watershed.js';
import {linkSample} from './watershed-link.js';import {tropicalChannel} from './tropical-layout.js';
import {riverSample} from './water-system.js';
import {UPLAND_POOLS,uplandChannel} from './upland-layout.js';
import {fanProfile} from './fan-layout.js';
import {strataRiver} from './strata-layout.js';
import * as THREE from 'three';import {spatialZones} from './world-logic-data.js';import {terrainHeight} from './large-world.js';
export function buildWorldPlan(scene,rows){const root=new THREE.Group();root.name='actual-world-navigation-zones-not-climate-boundaries';root.visible=false;scene.add(root);const lines=[];for(const z of spatialZones){const points=[],corners=[[z.minX,z.minZ],[z.maxX,z.minZ],[z.maxX,z.maxZ],[z.minX,z.maxZ],[z.minX,z.minZ]];for(let i=0;i<4;i++){const a=corners[i],b=corners[i+1];for(let j=0;j<70;j++){const t=j/70,x=a[0]+(b[0]-a[0])*t,pz=a[1]+(b[1]-a[1])*t;points.push(new THREE.Vector3(x,Math.max(0,terrainHeight(x,pz))+10,pz));}}points.push(points[0].clone());const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:z.color,transparent:true,opacity:.85,depthTest:false}));line.renderOrder=30;root.add(line);lines.push(line);}const waterLines=[];function waterLine(name,samples,local=false,color='#82dbef'){const points=samples.map(p=>new THREE.Vector3(p.x,Math.max(p.level??0,terrainHeight(p.x,p.z))+15,p.z)),g=new THREE.BufferGeometry().setFromPoints(points),m=local?new THREE.LineDashedMaterial({color:'#e8ae64',dashSize:14,gapSize:9,depthTest:false}):new THREE.LineBasicMaterial({color,depthTest:false}),line=new THREE.Line(g,m);line.name=name;if(local)line.computeLineDistances();line.renderOrder=33;root.add(line);waterLines.push(line);}waterLine('existing-main-river',Array.from({length:401},(_,i)=>riverSample(i/400)));for(let i=0;i<UPLAND_POOLS.length-1;i++)waterLine('connected-upland-'+i,Array.from({length:81},(_,j)=>uplandChannel(i,j/80)),false,'#83e3b1');waterLine('connected-upland-foothill',Array.from({length:501},(_,i)=>linkSample(i/500)),false,'#83e3b1');waterLine('connected-tropical-estuary',Array.from({length:401},(_,i)=>tropicalChannel(i/400)),false,'#83e3b1');for(let i=0;i<3;i++)waterLine('connected-fan-'+i,Array.from({length:121},(_,j)=>{const z=-1030+j*180/120,p=fanProfile(z);return {x:p.channels[i],z,level:p.level};}),false);waterLine('connected-strata',Array.from({length:101},(_,j)=>strataRiver(-1460+j*2)),false);for(const r of NORTH_REACHES)waterLine('connected-north-'+r.id,Array.from({length:241},(_,i)=>northSample(r.id,i/240)),false);
 const reliefLines = new Map(reliefBelts.map(({id, points}) => {
  const samples = [];
  for (let i=1; i<points.length; i++) {
   const a=points[i-1], b=points[i];
   for (let j=0; j<40; j++) {
    const t=j/40;
    const x=a.x+(b.x-a.x)*t, z=a.z+(b.z-a.z)*t;
    samples.push(new THREE.Vector3(x,terrainHeight(x,z)+12,z));
   }
  }
  const end=points.at(-1);
  samples.push(new THREE.Vector3(end.x,terrainHeight(end.x,end.z)+12,end.z));
  const geometry=new THREE.BufferGeometry().setFromPoints(samples);
  const material=new THREE.LineBasicMaterial({color:'#ffd183',depthTest:false});
  const line=new THREE.Line(geometry,material);
  line.name='relief-'+id;
  line.renderOrder=31;
  line.visible=false;
  root.add(line);
  return [id,line];
 }));
 const firstFeeder=waterLines.length;
 snowHeadwaters.forEach((reach,i)=>waterLine('glacier-reach-'+i,reach));
 const iceLines=waterLines.splice(firstFeeder);
 iceLines.forEach(line=>{line.visible=false;});
 const g=new THREE.BufferGeometry(),positions=new Float32Array(rows.flatMap(r=>[r.x,Math.max(0,terrainHeight(r.x,r.z))+22,r.z]));g.setAttribute('position',new THREE.BufferAttribute(positions,3));const dots=new THREE.Points(g,new THREE.PointsMaterial({color:'#fff2b5',size:4,sizeAttenuation:false,depthTest:false,transparent:true,opacity:.85}));dots.renderOrder=35;root.add(dots);const selected=new THREE.Mesh(new THREE.RingGeometry(24,35,28),new THREE.MeshBasicMaterial({color:'#ffdb82',side:THREE.DoubleSide,depthTest:false}));selected.rotation.x=-Math.PI/2;selected.renderOrder=40;root.add(selected);return {root,lines,waterLines,iceLines,reliefLines,dots,selected,
 setGeography(active, focus, showLines=true) {
  for (const line of lines) line.visible=!active;
  for (const line of waterLines) line.visible=!active||showLines;
  for (const [id,line] of reliefLines) line.visible=active&&showLines&&(!focus||focus===id||focus==='south'&&id==='west');
  for (const line of iceLines) line.visible=active&&showLines;
  dots.visible=!active;
  if (active) selected.visible=false;
 },
 select(row){selected.visible=!!row;if(row)selected.position.set(row.x,Math.max(0,terrainHeight(row.x,row.z))+34,row.z);},filter(visible){const p=new Float32Array(visible.flatMap(r=>[r.x,Math.max(0,terrainHeight(r.x,r.z))+22,r.z]));dots.geometry.setAttribute('position',new THREE.BufferAttribute(p,3));dots.geometry.computeBoundingSphere();},setVisible(v){root.visible=!!v;}};}

import * as THREE from 'three';
import {asset,batch,geometry,material} from './models.js';
import {terrainHeight,LARGE_WORLD} from './large-world.js';
import {waterStops,waterPlatforms} from './water-system.js';
import {vegetationPlacements,plantTypes,VEGETATION_BAY_VIEW,countNear} from './vegetation-rules.js';
import {forestField} from './forest-layout.js';

function template(kind){
 const group=new THREE.Group();
 const part=(shape,args,color,x,y,z,scale=[1,1,1],rot=[0,0,0])=>{const m=new THREE.Mesh(geometry(shape,args),material(color,{flatShading:false,side:THREE.DoubleSide}));m.position.set(x,y,z);m.scale.set(...scale);m.rotation.set(...rot);group.add(m);return m;};
 const leaf=(color,x,y,z,sx,sy,sz)=>part('sphere',[1,7,5],color,x,y,z,[sx,sy,sz]);
 if(kind==='forestOak'||kind==='forestBirch'){
  const birch=kind==='forestBirch';part('cylinder',[birch?.16:.24,birch?.32:.52,14,8],birch?'#c5c8b4':'#746953',0,7,0);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.3;part('cylinder',[.07,.2,5.5,6],birch?'#b5bba6':'#776e56',Math.sin(a)*1.1,12.3,Math.cos(a)*1.1,[1,1,1],[Math.cos(a)*.45,0,-Math.sin(a)*.45]);}
  const radius=birch?4.3:5.6;leaf(birch?'#78966c':'#456e53',0,16,0,radius,2.8,radius*.85);
  for(let i=0;i<5;i++){const a=i*2.4;leaf(i%2?'#63865c':'#557b53',Math.sin(a)*radius*.5,16.5+i*.45,Math.cos(a)*radius*.42,radius*.55,2.3,radius*.55);}
  for(let i=0;i<4;i++){const a=i*Math.PI/2;part('cone',[.3,1.8,5],'#786d54',Math.cos(a)*.5,.35,Math.sin(a)*.5,[1,1,.7],[Math.sin(a)*.5,0,Math.cos(a)*.5]);}
 }else if(kind==='pine'||kind==='coastPine'){
  part('cylinder',[.19,.4,7,7],'#756b54',0,3.5,0,[1,1,1],[0,0,kind==='coastPine'?.1:0]);
  for(let i=0;i<4;i++)part('cone',[3-i*.52,4.3-i*.35,9],['#3f6450','#507657','#648965','#7a9971'][i],kind==='coastPine'?.55:0,5.2+i*1.65,0,[1,.9,kind==='coastPine'?.75:1]);
 }else if(kind==='birch'){
  part('cylinder',[.1,.22,8,7],'#d7d8c5',0,4,0);part('cylinder',[.06,.1,4,6],'#b9bba5',.7,5,0,[1,1,1],[0,0,-.3]);
  for(let i=0;i<5;i++){const a=i*2.4;leaf(i%2?'#9baa6d':'#7f9c66',Math.sin(a)*1.2,6+i*.48,Math.cos(a),1.8,1.4,1.65);}
 }else if(['oak','willow','palm','dead'].includes(kind))return asset(kind,'valley');
 else if(['dwarf','shrub','coastShrub','cactus'].includes(kind)){
  if(kind==='cactus'){const object=asset('cactus','dunes');object.scale.setScalar(.45);return object;}
  const size=kind==='dwarf'?.38:kind==='coastShrub'?.65:1;
  for(let i=0;i<4;i++){const a=i*2.4,x=Math.sin(a)*size*.55,z=Math.cos(a)*size*.55;part('cylinder',[.025,.055,size*.8,5],'#7d7253',x,size*.4,z);leaf(kind==='dwarf'?'#919c7b':kind==='coastShrub'?'#97a17c':'#718d5e',x,size*.8,z,size*.7,size*.55,size*.65);}
 }else if(kind==='fern'){
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7,m=part('cone',[.2,1.2,4],i%2?'#66916a':'#83a26f',Math.sin(a)*.35,.42,Math.cos(a)*.35,[.6,1,.15],[Math.sin(a)*.6,a,Math.cos(a)*.6]);m.geometry.computeVertexNormals();}
 }else if(kind==='moss')leaf('#92a16a',0,.045,0,.55,.09,.45);
 else if(kind==='lily'){
  for(let i=0;i<3;i++){const x=Math.sin(i*2.3)*.35,z=Math.cos(i*2.3)*.35;part('cylinder',[.25,.25,.02,10],'#6c976a',x,.025,z);}
  leaf('#e7c6be',0,.09,0,.12,.08,.12);
 }else{
  const aquatic=['reed','sedge','rush','seagrass'].includes(kind),height=plantTypes[kind].height;
  for(let i=0;i<(kind==='reed'?6:5);i++){const a=i*2.4,x=Math.sin(a)*.2,z=Math.cos(a)*.2,h=height*(.65+i*.09);
   if(kind==='reed'){part('cylinder',[.015,.023,h,4],i%2?'#8a9c68':'#a6a978',x,h/2,z);part('cylinder',[.05,.065,.24,5],'#8a7959',x,h+.02,z);}
   else part('cone',[.11,h,3],kind==='alpineTuft'?'#a8b089':kind==='seagrass'?'#4c8f79':aquatic?'#92a06b':'#89a86b',x,h*.48,z,[.65,1,.35],[.15*Math.sin(a),a,.25*Math.cos(a)]);
   if(kind==='flowers'){leaf(i%2?'#e5d493':'#d0bdd5',x,h,z,.08,.05,.08);}
  }
 }
 return group;
}

export function createPlantBatcher(){
 const templates=new Map();
 return (kind,points)=>{
  if(!templates.has(kind))templates.set(kind,template(kind));
  return batch(templates.get(kind),points);
 };
}

export async function buildVegetation(scene,registerObstacle,progress){
 const root=new THREE.Group();root.name='habitat-vegetation';scene.add(root);
 const records=[],chunks=new Map(),groups=[],counts={canopy:0,understory:0,ground:0,aquatic:0},species={};let scanned=0;
 for(const p of vegetationPlacements()){
  records.push(p);counts[p.layer]++;species[p.kind]=(species[p.kind]||0)+1;
  const size=p.layer==='canopy'?320:160,key=[p.layer,p.kind,Math.floor(p.x/size),Math.floor(p.z/size),p.transitionBelt].join(':');
  if(!chunks.has(key))chunks.set(key,{points:[],kind:p.kind,layer:p.layer,transitionBelt:p.transitionBelt,x:Math.floor(p.x/size)*size+size/2,z:Math.floor(p.z/size)*size+size/2});chunks.get(key).points.push(p);
  if(p.layer==='canopy'&&p.kind!=='dead')registerObstacle?.(p.x,p.z,(p.kind==='forestOak'?.55:p.kind==='forestBirch'?.36:.3)*p.scale);
  if(++scanned%1200===0){progress?.(Math.min(.7,scanned/30000));await new Promise(r=>setTimeout(r,0));}
 }
 let built=0;const plants=createPlantBatcher(),placementsByGroup=new Map();
 for(const c of chunks.values()){
  const group=plants(c.kind,c.points);group.userData={center:{x:c.x,z:c.z},layer:c.layer,kind:c.kind,transitionBelt:c.transitionBelt,count:c.points.length,range:c.layer==='canopy'?2300:c.layer==='understory'?520:c.layer==='aquatic'?410:190};root.add(group);groups.push(group);
  placementsByGroup.set(group,c.points);
  if(++built%60===0){progress?.(.7+built/chunks.size*.3);await new Promise(r=>setTimeout(r,0));}
 }
 const layers={canopy:true,understory:true,ground:true,aquatic:true};
 const byStop=waterStops.map((r,i)=>{const view=i===5?VEGETATION_BAY_VIEW:r;return records.filter(p=>Math.hypot(p.x-view.x,p.z-view.z)<130);});
 function viewTarget(index,stage){
  const r=index===5?VEGETATION_BAY_VIEW:waterStops[index],eye=Math.max(terrainHeight(r.x,r.z),index===5?0:waterPlatforms[index].y)+LARGE_WORLD.eye;
  const preferred=stage===1?['canopy','understory']:stage===2?['aquatic','ground','understory']:['ground','understory'];
  let best=null,score=Infinity;
  for(const p of byStop[index]){const d=Math.hypot(p.x-r.x,p.z-r.z);if(d<8||d>95||!preferred.includes(p.layer))continue;const y=p.y+Math.min(plantTypes[p.kind].height*.45,4),cost=d+preferred.indexOf(p.layer)*(stage===1?110:18);let clear=true;for(let k=1;k<14;k++){const u=k/14;if(terrainHeight(r.x+(p.x-r.x)*u,r.z+(p.z-r.z)*u)>eye+(y-eye)*u-.15){clear=false;break;}}if(clear&&cost<score){score=cost;best={x:p.x,y,z:p.z,kind:p.kind};}}
  return best||{x:r.x-14,y:terrainHeight(r.x-14,r.z)+.6,z:r.z};
 }
 const forestTrees=records.filter(p=>p.layer==='canopy'&&forestField(p.x,p.z));
 let masked=[];
 function setLocalMask(predicate){
   for(const {attribute,indices,data} of masked){
     indices.forEach((id,i)=>attribute.array.set(data.subarray(i*12,i*12+12),id*16));
     attribute.needsUpdate=true;
   }
   masked=[];
   if(!predicate)return;
   for(const [group,points] of placementsByGroup){
     const indices=[];
     points.forEach((p,i)=>{if(predicate(p.x,p.z))indices.push(i);});
     if(!indices.length)continue;
     for(const {instanceMatrix:attribute} of group.children){
       const data=new Float32Array(indices.length*12);
       indices.forEach((id,i)=>{
         const offset=id*16;
         data.set(attribute.array.subarray(offset,offset+12),i*12);
         attribute.array.fill(0,offset,offset+12);
       });
       attribute.needsUpdate=true;
       masked.push({attribute,indices,data});
     }
   }
 }
 function canopyCoverAt(x,z){let covered=0;const radius=10,steps=9;for(let i=0;i<steps;i++)for(let j=0;j<steps;j++){const px=x-radius+2*radius*i/(steps-1),pz=z-radius+2*radius*j/(steps-1);if(forestTrees.some(p=>Math.hypot(p.x-px,p.z-pz)<(p.kind==='forestBirch'?4.5:6)*p.scale))covered++;}return covered/(steps*steps);}
 return {root,groups,counts,species,records,layers,viewTarget,canopyCoverAt,setLocalMask,
  setLayer(layer,value){layers[layer]=value;},
  setVisible(value){root.visible=value;},
  update(position,overview=false){for(const g of groups){const c=g.userData,d=Math.hypot(c.center.x-position.x,c.center.z-position.z);g.visible=layers[c.layer]&&(overview?c.layer==='canopy'||c.layer==='understory'||!!c.transitionBelt:d<c.range);if(c.layer==='canopy')g.traverse(o=>{if(o.isMesh)o.castShadow=!overview&&d<400;});}},
  nearbyAt(x,z){return countNear(records,x,z);},nearby(index){const result={canopy:0,understory:0,ground:0,aquatic:0};for(const p of byStop[index])result[p.layer]++;return result;}
 };
}

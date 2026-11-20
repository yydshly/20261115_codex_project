import * as THREE from 'three';
import {PRODUCTION_SITES,PRODUCTION_OBSTACLES,FARM,RESOURCE,FISH_PIER,GOODS_PATHS,GOODS_NODES,LIFE_LEGS} from './production-layout.js';
import {terrainHeight,walkingSurface} from './large-world.js';
import {townBuildings,WORKSHOP} from './settlement-layout.js';
import {asset} from './models.js';
export function buildProduction(scene,{textures=true,registerObstacle}={}){
 const root=new THREE.Group(),sites=new THREE.Group(),facilities=new THREE.Group(),links=new THREE.Group(),goods=new THREE.Group();root.name='production-and-household-chain';root.add(sites,facilities,links,goods);scene.add(root);const mats=new Map();
 const material=c=>{if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.88}));return mats.get(c);};
 function box(g,w,h,d,x,y,z,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
 function prop(kind,x,z,scale=1){const q=asset(kind,'valley');q.position.set(x,walkingSurface(x,z),z);q.scale.setScalar(scale);facilities.add(q);registerObstacle?.(x,z,kind==='cart'?1.2:.65);return q;}
 function path(points,width,parent=links,color='#b4a07b'){const v=[],idx=[];for(let j=1;j<points.length;j++){const a=points[j-1],b=points[j],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),n=Math.max(1,Math.ceil(len/1.5)),base=v.length/3;for(let i=0;i<=n;i++){for(const side of [-1,1]){const x=a.x+dx*i/n-dz/len*width/2*side,z=a.z+dz*i/n+dx/len*width/2*side;v.push(x,walkingSurface(x,z)+.045,z);}if(i<n){const k=base+i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,material(color));m.material.side=THREE.DoubleSide;m.receiveShadow=true;parent.add(m);}
 for(const leg of LIFE_LEGS)path(leg,2.5);
 // Small terrain-following plots leave the north-side guide clear.
 const crops=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.043,.52,4),material('#a5a05b'),360);
 const ears=new THREE.InstancedMesh(new THREE.ConeGeometry(.125,.28,5),material('#d6b76a'),360);
 const dummy=new THREE.Object3D();
 let cropCount=0;
 for(let block=0;block<4;block++){
  const cx=FARM.x-23+block*15;
  // Sample the beds across their width so an uneven slope cannot clip the soil surface.
  const soil=new THREE.PlaneGeometry(12,32,12,32);soil.rotateX(-Math.PI/2);
  const vertices=soil.getAttribute('position');
  for(let i=0;i<vertices.count;i++){
   const x=vertices.getX(i)+cx-1,z=vertices.getZ(i)+465.5;
   vertices.setXYZ(i,x,terrainHeight(x,z)+.055,z);
  }
  soil.computeVertexNormals();
  const bed=new THREE.Mesh(soil,material(block%2?'#87714d':'#9a8057'));
  bed.receiveShadow=true;sites.add(bed);
  for(let row=0;row<5;row++)for(let j=0;j<18;j++){
   const x=cx-5.7+row*2.22+.12*Math.sin(j*4.1),z=451+j*1.65,y=terrainHeight(x,z);
   const size=.86+.21*(1+Math.sin(j*5.7+row*1.68))/2;
   dummy.scale.setScalar(size);dummy.position.set(x,y+.26*size,z);dummy.updateMatrix();
   crops.setMatrixAt(cropCount,dummy.matrix);
   dummy.position.y=y+.60*size;dummy.updateMatrix();ears.setMatrixAt(cropCount++,dummy.matrix);
  }
 }
 crops.count=ears.count=cropCount;
 crops.castShadow=ears.castShadow=true;facilities.add(crops,ears);
 const resourceBatch=new THREE.Group();goods.add(resourceBatch);for(let i=0;i<6;i++){const log=new THREE.Mesh(new THREE.CylinderGeometry(.38,.45,5,9),material('#94734f'));log.rotation.z=Math.PI/2;log.position.set(-677,walkingSurface(-677,467)+.5+Math.floor(i/3)*.7,466+(i%3)*.85);resourceBatch.add(log);}
 for(const [x,z] of [[-692,454],[-702,476],[-680,493],[-653,489],[-653,462]]){const tree=asset('pine','valley');tree.position.set(x,terrainHeight(x,z),z);tree.scale.setScalar(1.2);facilities.add(tree);registerObstacle?.(x,z,.6);box(facilities,.8,.5,.8,x+4,terrainHeight(x+4,z)+.25,z,'#9d8258');}
 box(facilities,3,.25,2,-653,walkingSurface(-653,470)+1.1,470,'#8a7052');for(const x of [-654,-652])box(facilities,.15,1,.15,x,walkingSurface(x,470)+.5,470,'#655d45');prop('barrel',-597,439,.75);prop('cart',-552,447,.9);
 path(FISH_PIER.points,FISH_PIER.width,sites,'#a88c65');for(const p of FISH_PIER.points.slice(1)){const bottom=terrainHeight(p.x,p.z);for(const x of [-1.2,1.2])box(facilities,.18,FISH_PIER.level-bottom+1,.18,p.x+x,bottom+(FISH_PIER.level-bottom+1)/2,p.z,'#756347');}
 for(const x of [-134,-127])box(facilities,.13,2.7,.13,x,walkingSurface(x,405)+1.35,405,'#806d4c');const net=new THREE.Mesh(new THREE.PlaneGeometry(7,1.9,7,4),new THREE.MeshBasicMaterial({color:'#818d7e',wireframe:true,side:THREE.DoubleSide}));net.position.set(-130.5,walkingSurface(-130.5,405)+1.6,405);facilities.add(net);
 const boat=new THREE.Group(),r=FISH_PIER.points[2];const hull=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),material('#816b50'));hull.scale.set(1.25,.45,3);boat.add(hull);boat.position.set(r.x+5,FISH_PIER.level-1.2,r.z-3);facilities.add(boat);
 const store=townBuildings.find(b=>b.id==='store'),home=townBuildings.find(b=>b.id==='house-d');
 for(const p of PRODUCTION_OBSTACLES.slice(0,2)){const y=store.floor;for(const x of [-p.w/2,p.w/2])for(const z of [-p.d/2,p.d/2])box(facilities,.14,2.8,.14,p.x+x,y+1.4,p.z+z,'#78694f');for(const h of [.25,1.3,2.5])box(facilities,p.w+.3,.14,p.d,p.x,y+h,p.z,'#9a805c');}
 const table=PRODUCTION_OBSTACLES[2];box(facilities,table.w,.18,table.d,table.x,home.floor+1,table.z,'#987852');for(const dx of [-1,1])for(const dz of [-.8,.8])box(facilities,.14,1,.14,table.x+dx,home.floor+.5,table.z+dz,'#726148');box(facilities,2.3,.6,4,-239.7,home.floor+.3,442,'#7f725a');box(facilities,2.1,.2,3.8,-239.7,home.floor+.7,442,'#7f9682');box(facilities,2.3,2.4,1.7,-239.7,home.floor+1.2,437,'#887150');
 const lamp=new THREE.PointLight('#f5cf91',12,16,2);lamp.position.set(-244,home.floor+3.4,439);facilities.add(lamp);box(facilities,.3,.35,.3,-244,home.floor+3.4,439,'#e3c596');
 const stacks={};function stack(key,x,z,y,count=8){const group=new THREE.Group();goods.add(group);stacks[key]=[];for(let i=0;i<count;i++){const q=key==='home'?new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),material('#d8b16c')):box(group,.65,.55,.7,x+(i%2)*.8,y+.3+Math.floor(i/4)*.58,z+Math.floor(i%4/2)*.9,'#c7b37c');if(key==='home'){q.position.set(x+(i%2)*.65,y+.2,z+Math.floor(i/2)*.55);q.scale.set(1,.55,.75);group.add(q);}stacks[key].push(q);}}
 stack('source',-133,397,walkingSurface(-133,397));stack('store',-394,378,store.floor+.3);stack('market',-355,419,walkingSurface(-355,419)+1.1,4);stack('rawCraft',-275,378,WORKSHOP.floor+1.1,4);stack('home',-248,440,home.floor+1.1,4);
 const cart=new THREE.Group();goods.add(cart);box(cart,1.6,.25,2,0,.75,0,'#8a6b48');for(const side of [-1,1]){box(cart,.12,.5,2,side*.8,1,0,'#a58a62');for(const z of [-.65,.65]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.16,12),material('#4a4b3d'));wheel.rotation.z=Math.PI/2;wheel.position.set(side*.85,.38,z);cart.add(wheel);}}const cargo=new THREE.Group();cart.add(cargo);const rawCargo=[],productCargo=[];for(let i=0;i<8;i++){rawCargo.push(box(cargo,.55,.45,.6,(i%2-.5)*.65,1+Math.floor(i/4)*.5,(Math.floor(i%4/2)-.5)*.7,'#c5ae71'));const q=new THREE.Mesh(new THREE.SphereGeometry(.3,8,6),material('#d8b16c'));q.scale.set(1,.55,.75);q.position.set((i%2-.5)*.65,1+Math.floor(i/4)*.4,(Math.floor(i%4/2)-.5)*.7);cargo.add(q);productCargo.push(q);}
 for(const p of PRODUCTION_SITES){const y=walkingSurface(p.x+3,p.z);box(facilities,.13,2,.13,p.x+3,y+1,p.z,'#8b7652');if(textures){const canvas=document.createElement('canvas');canvas.width=384;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#385747';ctx.fillRect(0,0,384,96);ctx.fillStyle='#f2ddb2';ctx.textAlign='center';ctx.font='38px Microsoft YaHei';ctx.fillText(p.terrain,192,61);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Mesh(new THREE.PlaneGeometry(3,.75),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));label.position.set(p.x+3,y+1.8,p.z);facilities.add(label);}}
 let stage=3;return {root,sites,facilities,links,goods,cart,stacks,crops,boat,lamp,setStage(s){stage=s;facilities.visible=s>=1;links.visible=s>=2;goods.visible=s>=3;},update(flow,time=0){const f=flow.frame(),p=f.point;cart.position.set(p.x,walkingSurface(p.x,p.z),p.z);cart.rotation.y=Math.atan2(p.dx||0,p.dz||1);cart.visible=flow.started&&!flow.done;rawCargo.forEach((q,i)=>{q.visible=!f.cargoProduct&&i<flow.stock.cargo;q.material=material(f.recipe.color);});productCargo.forEach((q,i)=>{q.visible=f.cargoProduct&&i<flow.stock.cargo;q.material=material(flow.kind==='wood'?'#9c7753':flow.kind==='fish'?'#91aaa4':'#d8b16c');if(flow.kind==='wood')q.scale.set(1.5,.3,.4);else q.scale.set(1,.55,.75);});
  for(const [key,list]of Object.entries(stacks))list.forEach((q,i)=>{if(key==='source'){const node=GOODS_NODES[f.recipe.source];q.position.set(node.x-4+(i%2)*.8,walkingSurface(node.x-4,node.z-3)+.3+Math.floor(i/4)*.58,node.z-3+Math.floor(i%4/2)*.9);}q.visible=flow.started&&i<(flow.stock[key]+(key==='home'&&flow.kind==='wood'?flow.stock.consumed:0))&&!(key==='source'&&flow.kind==='wood');if(key==='home')q.scale.set(...(flow.kind==='wood'?[1.5,.3,.4]:[1,.55,.75]));q.material=material(key==='home'?(flow.kind==='wood'?'#9c7753':'#d8b16c'):f.recipe.color);});resourceBatch.visible=flow.kind!=='wood'||!flow.started||flow.stock.source>0;crops.count=flow.kind==='grain'&&flow.started&&flow.phase>0?90:cropCount;boat.rotation.z=Math.sin(time*.0007)*.025;lamp.visible=stage>=1;return f;}};
}

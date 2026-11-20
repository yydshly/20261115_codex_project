import * as THREE from 'three';
const geometryCache=new Map(),materialCache=new Map();
export function geometry(kind,args=[]){const key=kind+JSON.stringify(args);if(!geometryCache.has(key)){const constructors={box:THREE.BoxGeometry,cylinder:THREE.CylinderGeometry,cone:THREE.ConeGeometry,sphere:THREE.SphereGeometry,ico:THREE.IcosahedronGeometry,torus:THREE.TorusGeometry,plane:THREE.PlaneGeometry};geometryCache.set(key,new constructors[kind](...args));}return geometryCache.get(key);}
export function material(color,options={}){const key=color+JSON.stringify(options);if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true,...options}));return materialCache.get(key);}
function part(parent,kind,args,color,pos=[0,0,0],scale=[1,1,1],rotation=[0,0,0],options={}){const m=new THREE.Mesh(geometry(kind,args),material(color,options));m.position.set(...pos);m.scale.set(...scale);m.rotation.set(...rotation);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const box=(p,w,h,d,c,x=0,y=0,z=0,r=[0,0,0])=>part(p,'box',[w,h,d],c,[x,y,z],[1,1,1],r);
const cyl=(p,a,b,h,c,x=0,y=0,z=0,r=[0,0,0],n=8)=>part(p,'cylinder',[a,b,h,n],c,[x,y,z],[1,1,1],r);
const blob=(p,r,c,x,y,z,s=[1,1,1])=>part(p,'ico',[r,1],c,[x,y,z],s);

function tree(kind,theme){const g=new THREE.Group();
 if(kind==='pine'){
  cyl(g,.22,.38,4.2,'#70604c',0,2.1);
  [[2.7,4.3,4.2],[2.1,3.8,6.1],[1.45,3.2,7.9]].forEach(([r,h,y],i)=>{part(g,'cone',[r,h,8],['#4f725d','#63866c','#7b9777'][i],[0,y,0]);if(theme==='alpine')part(g,'cone',[r*.94,h*.9,8],'#d8e5df',[0,y+.3,0]);});
 }else if(kind==='palm'){
  cyl(g,.18,.32,5.3,'#967958',0,2.65,0,[0,0,.07]);
  for(let i=0;i<8;i++){const r=i*Math.PI/4;const crown=new THREE.Group();crown.position.set(-.2,5.2,0);crown.rotation.y=r;part(crown,'cone',[.72,4,4],i%2?'#7f9863':'#65865a',[0,-.3,1.65],[.7,1,.2],[Math.PI*.45,0,0]);g.add(crown);}blob(g,.35,'#87734b',-.1,5.1,.3);
 }else if(kind==='cactus'){
  cyl(g,.42,.5,5.2,'#6b8b70',0,2.6);blob(g,.43,'#7c987a',0,5.2,0,[1,.7,1]);
  cyl(g,.23,.25,1.5,'#749277',.7,2.6,0,[0,0,-Math.PI/2]);cyl(g,.23,.25,1.8,'#749277',1.4,3.35);blob(g,.24,'#749277',1.4,4.3,0);
  cyl(g,.2,.23,1.2,'#6c8a70',-.7,1.8,0,[0,0,Math.PI/2]);cyl(g,.2,.23,1.5,'#6c8a70',-1.2,2.45);blob(g,.21,'#6c8a70',-1.2,3.2,0);
 }else if(kind==='dead'){
  cyl(g,.12,.38,6,'#786657',0,3,0,[0,0,.1]);cyl(g,.07,.2,3.2,'#786657',1.1,4,0,[0,0,-.7]);cyl(g,.05,.13,2.5,'#786657',-.85,3.7,.4,[.2,0,.7]);cyl(g,.03,.09,1.8,'#786657',1.7,5.4,.1,[0,0,.2]);
 }else if(kind==='willow'){
  cyl(g,.27,.5,5.3,'#786c55',0,2.65);blob(g,2.8,'#78916d',0,5.5,0,[1.3,.75,1]);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;blob(g,1.25,i%2?'#8b9c76':'#708a6d',Math.cos(a)*2.3,3.4,Math.sin(a)*2.3,[.75,1.7,.75]);}
 }else if(kind==='scrub'){
  cyl(g,.1,.2,1.6,'#8c7557',0,.8);blob(g,1.25,'#91a079',0,1.9,0,[1.5,.65,1]);blob(g,.85,'#84946b',.9,1.8,.4,[1,.7,1]);
 }else{
  cyl(g,.18,.38,4.6,'#806f56',0,2.3);cyl(g,.08,.18,2.7,'#806f56',.7,3.6,0,[0,0,-.55]);cyl(g,.08,.16,2.2,'#806f56',-.6,3.5,.3,[.1,0,.6]);
  blob(g,2.8,'#6e8d5b',0,5.2,0,[1.2,.83,1]);blob(g,2.2,'#849f69',1.5,5.1,.4,[1,.9,1]);blob(g,2,'#93a775',-1.3,5.1,-.7,[1,.85,1]);blob(g,1.8,'#7b9a64',.2,6.6,-.2,[1,.8,1]);
 }
 return g;
}
function cottage(kind){const g=new THREE.Group(),stilt=kind==='stilt',lift=stilt?2.2:0,wood=kind==='cabin';
 if(stilt){for(const x of [-2.7,2.7])for(const z of [-2.1,2.1])cyl(g,.16,.2,3,'#75664f',x,.4,z);}
 box(g,7.8,.65,6,'#9b9782',0,lift+.1);box(g,7,3.8,5,wood?'#947c59':'#e0d3b8',0,lift+2.15);
 part(g,'cone',[5.2,2.8,4],wood?'#768e88':kind==='hut'?'#b39d68':'#6f807d',[0,lift+5.45,0],[1,1,.82],[0,Math.PI/4,0]);
 box(g,1.15,2.6,.13,'#665e4b',0,lift+1.6,2.58);box(g,.85,.9,.16,'#b9c7bc',-2.1,lift+2.6,2.6);box(g,.85,.9,.16,'#b9c7bc',2.1,lift+2.6,2.6);
 for(const x of [-2.1,2.1]){box(g,1.08,.1,.2,'#716753',x,lift+3.1,2.64);box(g,.1,1.05,.2,'#716753',x,lift+2.65,2.64);}
 box(g,1.1,2.7,1,'#a39a85',2,lift+5,-.7);box(g,1.3,.25,1.2,'#8a8171',2,lift+6.4,-.7);
 box(g,2.8,.3,1.7,'#a8a18c',0,lift+.3,3.2);return g;
}
function windmill(){const g=new THREE.Group();cyl(g,1.5,2.4,9,'#ded7bd',0,4.5,0,[0,0,0],12);part(g,'cone',[2.3,3.2,8],'#7e8975',[0,10.2,0]);box(g,.8,1.8,.1,'#655a48',0,.9,2.1);const rotor=new THREE.Group();rotor.position.set(0,7.8,1.8);rotor.userData.spin='z';for(let i=0;i<4;i++){const blade=new THREE.Group();blade.rotation.z=i*Math.PI/2;box(blade,.24,5,.2,'#887456',0,2.3);box(blade,1.1,3.4,.1,'#c9bea0',.4,2.8,.03);rotor.add(blade);}cyl(rotor,.4,.4,.5,'#6e624a',0,0,0,[Math.PI/2,0,0]);g.add(rotor);return g;}
function tower(lighthouse=false){const g=new THREE.Group();if(lighthouse){cyl(g,1.3,2.3,13,'#e4e4d5',0,6.5,0,[0,0,0],12);cyl(g,1.65,1.8,1.5,'#b77d64',0,8);cyl(g,2.1,2.1,.45,'#7b8a7e',0,13);cyl(g,1.35,1.35,2.5,'#e6cc84',0,14.4,0,[0,0,0],8);part(g,'cone',[2.2,2.1,8],'#7e8b7f',[0,16.3,0]);box(g,.9,2,.1,'#667060',0,1,2.1);}else{cyl(g,1.75,2.3,8.5,'#aa9e86',0,4.25,0,[0,0,0],8);box(g,5,.6,5,'#968971',0,8.7);for(const x of [-1.9,1.9])for(const z of [-1.9,1.9])cyl(g,.12,.12,3.2,'#7a6e54',x,10.4,z);part(g,'cone',[3.8,2.1,4],'#7c8775',[0,12.7,0],[1,1,1],[0,Math.PI/4,0]);box(g,.8,1.7,.1,'#5c5b4c',0,.85,2.1);}return g;}
function bridge(boardwalk=false){const g=new THREE.Group(),span=boardwalk?17:15;for(let i=0;i<18;i++){const x=(i/17-.5)*span,y=boardwalk?.3:Math.cos(x/span*Math.PI)*1.6;box(g,.79,.2,2.8,'#a8956e',x,y,0);if(i%3===0){for(const z of [-1.35,1.35])cyl(g,.1,.1,2,'#88785c',x,y+.5,z);}}for(const z of [-1.35,1.35]){const points=[];for(let i=0;i<20;i++){let x=(i/19-.5)*span;points.push(new THREE.Vector3(x,(boardwalk?.3:Math.cos(x/span*Math.PI)*1.6)+1.35,z));}const curve=new THREE.CatmullRomCurve3(points);const geo=new THREE.TubeGeometry(curve,25,.06,4,false);const mesh=new THREE.Mesh(geo,material('#897b5d'));mesh.userData.uniqueGeometry=true;g.add(mesh);}return g;}
function person(){const g=new THREE.Group();for(const x of [-.18,.18]){cyl(g,.09,.1,.75,'#4e5a58',x,.45);box(g,.2,.15,.38,'#5f6558',x,.1,.07);}cyl(g,.23,.3,.7,'#a77e5b',0,1.17);blob(g,.22,'#d1b08a',0,1.82,0);cyl(g,.28,.28,.08,'#7b8164',0,2.02);part(g,'cone',[.23,.26,8],'#7b8164',[0,2.17,0]);for(const x of [-.38,.38])cyl(g,.065,.09,.7,'#99795d',x,1.25,0,[0,0,x>0?.25:-.25]);box(g,.55,.65,.3,'#6b715c',0,1.3,-.35);return g;}
function flowers(reed=false){const g=new THREE.Group();for(let i=0;i<5;i++){const x=Math.sin(i*2.4)*.65,z=Math.cos(i*2.4)*.65,h=reed?1.7+(i%3)*.3:.5+(i%3)*.17;cyl(g,.018,.025,h,'#789360',x,h/2,z,[0,0,(i-2)*.05],4);if(reed)cyl(g,.08,.08,.5,'#9b8b63',x,h,z,[0,0,0],6);else{blob(g,.18,i%2?'#d5b6c1':'#cab1cc',x,h,z,[1.5,.5,1]);blob(g,.07,'#ddc58b',x,h+.04,z);}}return g;}
function grass(){const g=new THREE.Group();for(let i=0;i<4;i++)part(g,'cone',[.15,.9,3],i%2?'#8eaa6c':'#7d9c5e',[Math.sin(i*2.4)*.3,.4,Math.cos(i*2.4)*.3],[.5,1,.2],[.1,0,(i-1.5)*.2]);return g;}
function rock(theme){const g=new THREE.Group(),c=theme==='volcano'?'#5d5b55':theme==='canyon'?'#b58e6b':theme==='alpine'?'#a5b3ae':'#a7a998';blob(g,1.5,c,0,1,0,[1.4,.9,1]);if(theme==='alpine')blob(g,1.4,'#e1e9e1',0,1.6,0,[1.3,.4,1]);return g;}
function arch(){const g=new THREE.Group();box(g,1.7,4,2,'#ac9d7f',-4.2,2);box(g,1.7,4,2,'#ac9d7f',4.2,2);part(g,'torus',[4.2,.9,6,18,Math.PI],'#b4a387',[0,3.7,0],[1,1,1.2]);return g;}
function tent(){const g=new THREE.Group();part(g,'cone',[4.5,5,4],'#c5aa7f',[0,2.5,0],[1,1,1.4],[0,Math.PI/4,0]);box(g,1.3,2,.15,'#7f745d',0,1,3.7);cyl(g,.08,.08,6,'#8a7554',0,3);return g;}
function boat(){const g=new THREE.Group();blob(g,2,'#927f5b',0,.3,0,[.7,.38,1.6]);box(g,2.2,.2,4.5,'#b5a17b',0,.6);cyl(g,.07,.09,6.5,'#9c8762',0,3.8);const key='sail';if(!geometryCache.has(key)){const shape=new THREE.Shape();shape.moveTo(.1,0);shape.lineTo(.1,5.2);shape.lineTo(2.8,.2);shape.closePath();geometryCache.set(key,new THREE.ShapeGeometry(shape));}const sail=new THREE.Mesh(geometryCache.get(key),material('#e4dfc8',{side:THREE.DoubleSide}));sail.position.set(0,1,0);g.add(sail);return g;}
function bird(){const g=new THREE.Group();blob(g,.22,'#e4e5d6',0,0,0,[1,.8,1.5]);for(let i=0;i<2;i++){const wing=part(g,'cone',[.22,1.2,3],'#e7e8dc',[i?-.65:.65,0,0],[.3,1,1],[0,0,i?-Math.PI/2:Math.PI/2]);wing.name='wing'+i;}return g;}
function deer(){const g=new THREE.Group();blob(g,.75,'#b39773',0,1.2,0,[.7,.75,1.3]);for(const x of [-.3,.3])for(const z of [-.55,.55])cyl(g,.06,.09,.95,'#9a8466',x,.5,z);cyl(g,.14,.24,.8,'#b39b78',0,1.7,.65,[.3,0,0]);blob(g,.3,'#baa27f',0,2.1,.9,[.65,1,1]);for(const x of [-.16,.16])cyl(g,.02,.035,.55,'#907e61',x,2.6,.88,[0,0,x*2]);return g;}
function fence(){const g=new THREE.Group();for(const x of [-2,0,2])box(g,.2,1.8,.2,'#8f7d5b',x,.9);for(const y of [.65,1.35])box(g,4.4,.16,.16,'#ac9770',0,y);return g;}
export function asset(kind,theme='valley'){
 if(['oak','pine','palm','cactus','dead','willow','scrub'].includes(kind))return tree(kind,theme);
 if(['cottage','cabin','hut','stilt'].includes(kind))return cottage(kind);
 if(kind==='windmill')return windmill();if(kind==='tower'||kind==='outpost')return tower();if(kind==='lighthouse')return tower(true);
 if(kind==='bridge'||kind==='boardwalk')return bridge(kind==='boardwalk');if(kind==='person')return person();if(kind==='flowers'||kind==='reeds')return flowers(kind==='reeds');if(kind==='grass')return grass();if(kind==='rock')return rock(theme);if(kind==='arch')return arch();if(kind==='tent')return tent();if(kind==='boat')return boat();if(kind==='bird')return bird();if(kind==='deer')return deer();if(kind==='fence')return fence();return rock(theme);
}
export function batch(template,placements){const g=new THREE.Group();if(!placements.length)return g;template.updateMatrixWorld(true);const matrix=new THREE.Matrix4(),base=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),position=new THREE.Vector3();template.traverse(o=>{if(!o.isMesh)return;const mesh=new THREE.InstancedMesh(o.geometry,o.material,placements.length);mesh.castShadow=placements.length<100;mesh.receiveShadow=true;placements.forEach((p,i)=>{position.set(p.x,p.y,p.z);q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,p.rotation||0);scale.setScalar(p.scale||1);base.compose(position,q,scale);matrix.multiplyMatrices(base,o.matrixWorld);mesh.setMatrixAt(i,matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();g.add(mesh);});return g;}
export function clearGroup(group){group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.uniqueGeometry)o.geometry?.dispose();if(o.userData.uniqueMaterial)o.material?.dispose();});group.clear();}

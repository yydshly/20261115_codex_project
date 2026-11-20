import {lifePathVerge} from './life-route.js';
import {benchmarkNear} from './benchmark-trail.js';
import {northReserved,northNearTile} from './northern-watershed.js';
import {linkReserved,linkNearTile} from './watershed-link.js';
import {warmReserved,warmNearTile} from './warm-layout.js';
import {borealReserved,borealNearTile} from './boreal-layout.js';
import {uplandReserved,uplandNearTile} from './upland-layout.js';
import {yardangReserved,yardangNearTile} from './yardang-layout.js';
import {volcanicReserved,volcanicNearTile} from './volcanic-layout.js';
import {fanReserved,fanNearTile} from './fan-layout.js';
import {strataReserved,strataNearTile} from './strata-layout.js';
import {saltReserved,saltNearTile} from './salt-layout.js';
import {karstReserved,karstNearTile} from './karst-layout.js';
import {cutKarstTerrain} from './karst-scene.js';
import {geologyReserved,geologyNearTile} from './geology-layout.js';
import {cutGeologyTerrain} from './geology-scene.js';
import {drylandReserved,drylandNearTile} from './dryland-layout.js';
import {tropicalReserved,tropicalNearTile} from './tropical-layout.js';
import {oceanReserved,oceanNearTile} from './ocean-layout.js';
import {polarReserved,polarNearTile} from './polar-layout.js';
import {transportReserved} from './transport-layout.js';
import {productionReserved} from './production-layout.js';
import {mountainNearTile,mountainReserved} from './mountain-layout.js';
import {settlementReserved} from './settlement-layout.js';
import {marineWeight,marineDepthColor} from './marine-geography.js';
import {glacialNearTile} from './glacial-geography.js';
import {caveNearTile,caveMouthTile,caveVoidAt} from './cave-layout.js';
import {cutCaveTerrain} from './cave-scene.js';
import {forestField} from './forest-layout.js';
import * as THREE from 'three';
import {inlandNearWaterTile} from './inland-geography.js';
import {nearConstructionPath} from './construction-learning.js';
import {buildVegetation} from './vegetation-scene.js';
import {environmentAt,candidateFor,clearanceAt,habitatColor,hash} from './vegetation-rules.js';
export let vegetationScene;
let ecologyColors=false;
import {waterAt,riverField,waterStops,waterPlatforms,riverSample} from './water-system.js';
import {asset,batch,geometry,material} from './models.js';
import {detail} from './scene-details.js';
import {LARGE_WORLD,VOLCANO,stops,plots,decks,terrainHeight,baseHeight,biomeIndex,groundColor,nearestRoad,roadSample,random} from './large-world.js';

export const terrainGroup=new THREE.Group(),floraGroup=new THREE.Group(),buildingGroup=new THREE.Group(),roadGroup=new THREE.Group();
const materials=new Map(),forest=[],obstacleCells=new Map(),windmills=[],boats=[];
let groundMaterial,clayMaterial,grassMesh,grassMaterial,lastGrassX=Infinity,lastGrassZ=Infinity;
const yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0));

function noiseTexture(kind){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d'),rng=random(kind.length*357+99);ctx.fillStyle=kind==='roof'?'#bcc0bb':kind==='wood'?'#d0c3a8':'#e0e2d6';ctx.fillRect(0,0,256,256);for(let i=0;i<22000;i++){const v=Math.floor(160+rng()*95);ctx.fillStyle=`rgba(${v},${v},${v},${.12+rng()*.3})`;ctx.fillRect(rng()*256,rng()*256,kind==='wood'?.5:1,kind==='wood'?5+rng()*18:1+rng()*2);}if(kind==='roof'){ctx.lineWidth=2;ctx.strokeStyle='#6b777a88';for(let y=0;y<256;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();for(let x=(y/25%2)*20;x<256;x+=40){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3,y+25);ctx.stroke();}}}const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;return tex;}
const surfaceMap=noiseTexture('ground'),wallMap=noiseTexture('wall'),roofMap=noiseTexture('roof'),woodMap=noiseTexture('wood');
function decorateBuilding(object){object.traverse(o=>{if(!o.isMesh)return;const roof=o.geometry.type==='ConeGeometry',key=o.material.uuid+(roof?'roof':'wall');if(!materials.has(key)){const mat=o.material.clone();mat.flatShading=false;mat.map=roof?roofMap:wallMap;mat.bumpMap=mat.map;mat.bumpScale=roof?.09:.035;mat.roughness=.94;materials.set(key,mat);}o.material=materials.get(key);});}
export function addObstacle(x,z,radius){const key=`${Math.floor(x/16)},${Math.floor(z/16)}`;if(!obstacleCells.has(key))obstacleCells.set(key,[]);obstacleCells.get(key).push({x,z,radius});}
export function blockedAt(x,z){for(const p of plots)if(Math.abs(x-p.x)<p.halfX+.3&&Math.abs(z-p.z)<p.halfZ+.3)return true;const cx=Math.floor(x/16),cz=Math.floor(z/16);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const o of obstacleCells.get(`${cx+dx},${cz+dz}`)||[])if(Math.hypot(x-o.x,z-o.z)<o.radius+.32)return true;return false;}

export class TerrainTiles{
 constructor(scene){this.tiles=[];this.queue=[];groundMaterial=new THREE.MeshStandardMaterial({vertexColors:true,map:surfaceMap,bumpMap:surfaceMap,bumpScale:.16,roughness:.98});clayMaterial=new THREE.MeshStandardMaterial({color:'#aaa99a',roughness:1});scene.add(terrainGroup);this.stage=2;this.lithologyMaterial=null;this.lithologyActive=false;this.karstCutaway=false;this.geologyCutaway=false;this.caveCutaway=false;this.marineDepth=false;for(let x=-1920;x<1920;x+=160)for(let z=-1600;z<1600;z+=160)this.tiles.push({x,z,centerX:x+80,centerZ:z+80,res:0,mesh:null,cave:caveNearTile(x+80,z+80),portal:caveMouthTile(x+80,z+80),fan:fanNearTile(x+80,z+80),saline:saltNearTile(x+80,z+80),karst:karstNearTile(x+80,z+80),geo:geologyNearTile(x+80,z+80),hydro:northNearTile(x+80,z+80)||linkNearTile(x+80,z+80)||warmNearTile(x+80,z+80)||borealNearTile(x+80,z+80)||uplandNearTile(x+80,z+80)||yardangNearTile(x+80,z+80)||volcanicNearTile(x+80,z+80)||fanNearTile(x+80,z+80)||strataNearTile(x+80,z+80)||saltNearTile(x+80,z+80)||karstNearTile(x+80,z+80)||geologyNearTile(x+80,z+80)||drylandNearTile(x+80,z+80)||tropicalNearTile(x+80,z+80)||oceanNearTile(x+80,z+80)||polarNearTile(x+80,z+80)||mountainNearTile(x+80,z+80)||marineWeight(x+80,z+80)>.001||glacialNearTile(x+80,z+80)||inlandNearWaterTile(x+80,z+80)||Array.from({length:121},(_,i)=>riverSample(i/120)).some(p=>Math.abs(p.x-(x+80))<145+p.half&&Math.abs(p.z-(z+80))<145+p.half)});}
 make(tile,res){const g=new THREE.PlaneGeometry(160,160,res,res);g.rotateX(-Math.PI/2);const p=g.attributes.position,c=new Float32Array(p.count*3),uv=g.attributes.uv,color=new THREE.Color();for(let i=0;i<p.count;i++){const x=p.getX(i)+tile.centerX,z=p.getZ(i)+tile.centerZ;const height=terrainHeight(x,z);p.setXYZ(i,x,height,z);uv.setXY(i,x/7,z/7);const rgb=groundColor(x,z,height);color.setRGB(...rgb.map(v=>v/255),THREE.SRGBColorSpace);c.set([color.r,color.g,color.b],i*3);}g.setAttribute('color',new THREE.BufferAttribute(c,3));if(tile.cave)cutCaveTerrain(g,this.caveCutaway);if(tile.geo)cutGeologyTerrain(g,this.geologyCutaway);if(tile.karst)cutKarstTerrain(g,this.karstCutaway);g.computeVertexNormals();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,this.terrainMaterial);mesh.receiveShadow=true;tile.baseColors=c.slice();if(ecologyColors)this.tintGeometry(g);if(this.marineDepth)this.tintMarine(g);
  const points=[],idx=[],sides=[];for(let i=0;i<res;i++)sides.push([tile.x+i*160/res,tile.z]);for(let i=0;i<res;i++)sides.push([tile.x+160,tile.z+i*160/res]);for(let i=0;i<res;i++)sides.push([tile.x+160-i*160/res,tile.z+160]);for(let i=0;i<res;i++)sides.push([tile.x,tile.z+160-i*160/res]);for(let i=0;i<sides.length;i++){const [x,z]=sides[i],h=terrainHeight(x,z)-.06;points.push(x,h,z,x,h-3.5,z);const a=i*2,b=(i+1)%sides.length*2;idx.push(a,b,a+1,b,b+1,a+1);}const skirtGeo=new THREE.BufferGeometry();skirtGeo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));skirtGeo.setIndex(idx);skirtGeo.computeVertexNormals();const skirt=new THREE.Mesh(skirtGeo,new THREE.MeshStandardMaterial({color:'#888c72',roughness:1,side:THREE.DoubleSide}));skirt.visible=!(tile.cave&&this.caveCutaway||tile.geo&&this.geologyCutaway||tile.karst&&this.karstCutaway);mesh.add(skirt);
  if(tile.mesh){terrainGroup.remove(tile.mesh);tile.mesh.traverse(o=>{o.geometry?.dispose();if(o!==tile.mesh)o.material?.dispose();});}tile.mesh=mesh;tile.res=res;this.refreshSurfaceTint(tile);terrainGroup.add(mesh);this.onWeatherMesh?.(mesh);
 }
 async initialize(position,progress){for(let i=0;i<this.tiles.length;i++){this.make(this.tiles[i],this.tiles[i].portal?128:this.tiles[i].hydro?48:8);if(i%24===0){progress?.(i/this.tiles.length);await yieldFrame();}}this.update(position,true);for(let i=0;i<18&&this.queue.length;i++){const item=this.queue.shift();this.make(item.tile,item.res);if(i%2===0)await yieldFrame();}}
 update(position,force=false){this.queue=[];for(const tile of this.tiles){const d=Math.hypot(tile.centerX-position.x,tile.centerZ-position.z),res=Math.max(tile.portal?128:tile.hydro?48:8,d<165?128:d<370?64:d<800?32:d<1450?16:8);if(res!==tile.res)this.queue.push({tile,res,d});}this.queue.sort((a,b)=>a.d-b.d);if(force)this.queue=this.queue.filter(item=>item.d<430);}
 tick(){if(this.queue.length){const next=this.queue.shift();this.make(next.tile,next.res);}}
 refreshSurfaceTint(tile,study=this.surfaceTint){
  if(!study||!tile.mesh)return;
  const {bounds,tint}=study;
  if(tile.x>bounds.maxX||tile.x+160<bounds.minX||tile.z>bounds.maxZ||tile.z+160<bounds.minZ)return;
  const geometry=tile.mesh.geometry,positions=geometry.attributes.position,colors=geometry.attributes.color;
  colors.array.set(tile.baseColors);
  if(ecologyColors)this.tintGeometry(geometry);
  if(this.marineDepth)this.tintMarine(geometry);
  if(this.surfaceTint){
   const color=new THREE.Color();
   for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i);
    if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)continue;
    color.setRGB(colors.getX(i),colors.getY(i),colors.getZ(i));
    tint(x,z,color);
    colors.setXYZ(i,color.r,color.g,color.b);
   }
  }
  colors.needsUpdate=true;
 }
 setSurfaceTint(bounds,tint){
  const touched=this.surfaceTint;
  this.surfaceTint=null;
  if(touched&&touched.bounds!==bounds)for(const tile of this.tiles)this.refreshSurfaceTint(tile,touched);
  if(bounds){
   this.surfaceTint={bounds,tint};
   for(const tile of this.tiles)this.refreshSurfaceTint(tile);
  }
 }
 tintGeometry(g){const p=g.attributes.position,c=g.attributes.color,col=new THREE.Color();for(let i=0;i<p.count;i++){col.set(habitatColor(p.getX(i),p.getZ(i)));c.setXYZ(i,col.r,col.g,col.b);}c.needsUpdate=true;}
 setEcology(value){ecologyColors=value;for(const tile of this.tiles){if(!tile.mesh)continue;if(value)this.tintGeometry(tile.mesh.geometry);else{tile.mesh.geometry.attributes.color.array.set(tile.baseColors);tile.mesh.geometry.attributes.color.needsUpdate=true;}}}
 tintMarine(g){const p=g.attributes.position,c=g.attributes.color;for(let i=0;i<p.count;i++)if(marineWeight(p.getX(i),p.getZ(i))>.98&&p.getY(i)<.8)c.setXYZ(i,...marineDepthColor(p.getY(i)));c.needsUpdate=true;}
 setMarineDepth(value){this.marineDepth=value;for(const t of this.tiles){if(!t.mesh)continue;t.mesh.geometry.attributes.color.array.set(t.baseColors);if(ecologyColors)this.tintGeometry(t.mesh.geometry);if(value)this.tintMarine(t.mesh.geometry);t.mesh.geometry.attributes.color.needsUpdate=true;}}
 setCaveCutaway(value){this.caveCutaway=value;for(const tile of this.tiles)if(tile.cave&&tile.mesh){cutCaveTerrain(tile.mesh.geometry,value);for(const child of tile.mesh.children)child.visible=!value;}}
 refreshFanWater(){const color=new THREE.Color();for(const tile of this.tiles){if(!tile.fan||!tile.mesh)continue;const g=tile.mesh.geometry,p=g.attributes.position,c=g.attributes.color;for(let i=0;i<p.count;i++){color.setRGB(...groundColor(p.getX(i),p.getZ(i),p.getY(i)).map(v=>v/255),THREE.SRGBColorSpace);c.setXYZ(i,color.r,color.g,color.b);}tile.baseColors=c.array.slice();c.needsUpdate=true;}}
 refreshSaltWater(){const color=new THREE.Color();for(const tile of this.tiles){if(!tile.saline||!tile.mesh)continue;const g=tile.mesh.geometry,p=g.attributes.position,c=g.attributes.color;for(let i=0;i<p.count;i++){color.setRGB(...groundColor(p.getX(i),p.getZ(i),p.getY(i)).map(v=>v/255),THREE.SRGBColorSpace);c.setXYZ(i,color.r,color.g,color.b);}tile.baseColors=c.array.slice();c.needsUpdate=true;}}
 setKarstCutaway(value){this.karstCutaway=value;for(const tile of this.tiles)if(tile.karst&&tile.mesh){cutKarstTerrain(tile.mesh.geometry,value);for(const child of tile.mesh.children)child.visible=!value;}}
 setGeologyCutaway(value){this.geologyCutaway=value;for(const tile of this.tiles)if(tile.geo&&tile.mesh){cutGeologyTerrain(tile.mesh.geometry,value);for(const child of tile.mesh.children)child.visible=!value;}}
 get terrainMaterial(){return this.lithologyActive?this.lithologyMaterial:this.stage===0?clayMaterial:groundMaterial;}
 setLithologyMap(texture){
   if(texture&&!this.lithologyMaterial)this.lithologyMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:.92});
   if(texture&&this.lithologyMaterial.map!==texture)this.lithologyMaterial.map=texture;
   this.lithologyActive=!!texture;
   this.setStage(this.stage);
 }
 setStage(stage){this.stage=stage;for(const tile of this.tiles)if(tile.mesh){tile.mesh.material=this.terrainMaterial;this.onWeatherMesh?.(tile.mesh);}}
}

export async function buildForests(scene,progress){scene.add(floraGroup);vegetationScene=await buildVegetation(floraGroup,addObstacle,progress);const rng=random(7193);
 const rocks=[];for(let i=0;i<2100;i++){const x=(rng()-.5)*3400,z=(rng()-.5)*2750,h=terrainHeight(x,z);if(northReserved(x,z)||linkReserved(x,z)||warmReserved(x,z)||borealReserved(x,z)||uplandReserved(x,z)||yardangReserved(x,z)||volcanicReserved(x,z)||fanReserved(x,z)||strataReserved(x,z)||saltReserved(x,z)||karstReserved(x,z)||geologyReserved(x,z)||drylandReserved(x,z)||tropicalReserved(x,z)||oceanReserved(x,z)||polarReserved(x,z)||transportReserved(x,z)||productionReserved(x,z)||mountainReserved(x,z)||settlementReserved(x,z,5)||(x>58&&x<95&&Math.abs(z-340)<24&&caveVoidAt(x,h,z))||(waterAt(x,z)?.level??-Infinity)>h-.2||h<.3||benchmarkNear(x,z,4)!==null||lifePathVerge(x,z,2.1)||nearConstructionPath(x,z,forestField(x,z)?2.5:4)||nearestRoad(x,z,7)||plots.some(p=>Math.hypot(p.x-x,p.z-z)<p.radius+8))continue;const support=Math.min(h,terrainHeight(x-3,z),terrainHeight(x+3,z),terrainHeight(x,z-3),terrainHeight(x,z+3));if(h-support>2)continue;rocks.push({x,y:support-.3,z,scale:.4+rng()*1.8,rotation:rng()*6.28});}const rockChunks=new Map();for(const p of rocks){const key=`${Math.floor(p.x/160)},${Math.floor(p.z/160)}`;if(!rockChunks.has(key))rockChunks.set(key,[]);rockChunks.get(key).push(p);}for(const points of rockChunks.values()){const group=batch(asset('rock','valley'),points);group.userData.center={x:Math.floor(points[0].x/160)*160+80,z:Math.floor(points[0].z/160)*160+80};group.userData.smallRocks=true;floraGroup.add(group);forest.push(group);}
}

export function buildSettlements(scene){scene.add(buildingGroup,roadGroup);
 for(const p of plots){const r=stops[p.index],object=asset(p.kind,r.id);object.position.set(p.x,p.y+.04,p.z);if(p.kind==='arch')object.scale.setScalar(1.6);object.rotation.y=-.15;decorateBuilding(object);buildingGroup.add(object);object.traverse(o=>{if(o.userData.spin)windmills.push(o);});const foundation=new THREE.Mesh(geometry('box',[p.kind==='arch'?13:8.2,1.3,p.kind==='arch'?4:6.4]),material('#a69d86'));foundation.position.set(p.x,p.y-.55,p.z);foundation.receiveShadow=true;buildingGroup.add(foundation);}
 const place=(kind,x,z,scale=1)=>{const object=['person','fence','boat','deer'].includes(kind)?asset(kind,'valley'):detail(kind);object.position.set(x,Math.max(.5,terrainHeight(x,z)),z);object.scale.setScalar(scale);buildingGroup.add(object);return object;};
 for(const r of stops){place('sign',r.x+5,r.z-5,.9);place('person',r.x+5,r.z+6,.8);const m=plots.find(p=>p.index===r.index&&p.main);if([0,1,2,6,9].includes(r.index)){place('crate',m.x+7,m.z+4);place('barrel',m.x+9,m.z+3);place('cart',m.x+13,m.z+6);}
  if([1,6].includes(r.index))place('well',r.x-14,r.z+8);if([2,6].includes(r.index))place('camp',r.x-13,r.z+12,.9);if(r.index===5){place('ruin',r.x+15,r.z+9,1.7);place('ruin',r.x-21,r.z-8,1.3);}if(r.index===8)for(let i=0;i<6;i++)place('cairn',r.x+i*7-20,r.z+13+i*2,1.1);
  if([0,9].includes(r.index)){for(let i=0;i<2;i++){let x=r.x-35-i*17,z=r.z+35+i*14;for(let n=0;n<90&&baseHeight(x,z)>.1;n++){x-=4;z+=4;}const boat=asset('boat','island');boat.position.set(x,.16,z);boat.scale.setScalar(1.35);boat.rotation.y=.6;buildingGroup.add(boat);boats.push({object:boat,phase:i});}}
 }
 for(const d of decks){const bridge=asset('boardwalk','coast');bridge.position.set(d.x,d.y-.4,d.z);bridge.scale.setScalar(d.length/17);bridge.rotation.y=d.angle;buildingGroup.add(bridge);for(const a of [-7,0,7])for(const side of [-1.3,1.3]){const x=d.x+a*Math.cos(d.angle)+side*Math.sin(d.angle),z=d.z-a*Math.sin(d.angle)+side*Math.cos(d.angle),bottom=terrainHeight(x,z),height=Math.max(.5,d.y-bottom+.1);const post=new THREE.Mesh(geometry('cylinder',[.16,.22,height,7]),material('#827456'));post.position.set(x,d.y-height/2,z);buildingGroup.add(post);}}
 const vertices=[],indices=[],uvs=[];for(let i=0;i<=1600;i++){const p=roadSample(i/1800),a=roadSample(Math.max(0,(i-1)/1800)),b=roadSample((i+1)/1800),dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;for(const side of [-3.3,3.3]){vertices.push(p.x+nx*side,p.y+.15,p.z+nz*side);uvs.push(side<0?0:1,i*.6);}if(i<1600&&(baseHeight(p.x,p.z)<.6||waterAt(p.x,p.z))){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();const road=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#a18c68',roughness:.95,side:THREE.DoubleSide,map:woodMap,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));road.receiveShadow=true;roadGroup.add(road);
 for(let i=0;i<=1600;i+=12){const p=roadSample(i/1800);if(baseHeight(p.x,p.z)>.2&&!waterAt(p.x,p.z))continue;const pole=new THREE.Mesh(geometry('cylinder',[.18,.25,p.y+5,7]),material('#88785b'));pole.position.set(p.x,p.y/2-2.5,p.z);buildingGroup.add(pole);}
 const r=stops[1];for(let row=0;row<6;row++)for(let i=0;i<20;i++){const x=r.x-44+row*2,z=r.z+16+i*1.4,object=asset('grass','hills');object.position.set(x,terrainHeight(x,z),z);object.scale.setScalar(.8);buildingGroup.add(object);}
}

function grassTexture(){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d'),rng=random(33);for(let i=0;i<11;i++){const x=rng()*128,w=3+rng()*8,h=50+rng()*75;c.fillStyle=i%2?'#b3c88e':'#77964e';c.beginPath();c.moveTo(x,128);c.quadraticCurveTo(x+w,100-h*.4,x+12*(rng()-.5),128-h);c.lineTo(x+w*.3,128);c.fill();}const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;}
export function makeGrass(scene){const g=new THREE.PlaneGeometry(.9,.75);g.translate(0,.375,0);grassMaterial=new THREE.MeshStandardMaterial({map:grassTexture(),alphaTest:.4,side:THREE.DoubleSide,roughness:1,color:'#b8c991'});grassMesh=new THREE.InstancedMesh(g,grassMaterial,3800);grassMesh.receiveShadow=true;grassMesh.frustumCulled=false;grassMesh.count=0;scene.add(grassMesh);}
export function weatherGrass(){return grassMesh;}
export function updateGrass(position,force=false){if(!force&&Math.hypot(position.x-lastGrassX,position.z-lastGrassZ)<32)return;lastGrassX=position.x;lastGrassZ=position.z;const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),color=new THREE.Color();let count=0;
 const cx=Math.floor(position.x/2.3),cz=Math.floor(position.z/2.3);
 for(let ix=cx-27;ix<=cx+27;ix++)for(let iz=cz-27;iz<=cz+27;iz++){const x=ix*2.3+hash(ix,iz,1)*1.7,z=iz*2.3+hash(ix,iz,2)*1.7;if(Math.hypot(x-position.x,z-position.z)>60||!clearanceAt(x,z,'ground'))continue;const e=environmentAt(x,z),kind=candidateFor(e,'ground',hash(ix,iz,3));if(!kind)continue;q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,hash(ix,iz,4)*6.28);const short=kind==='alpineTuft'||kind==='moss';scale.setScalar((short?.35:.8)*( .65+hash(ix,iz,5)*.65));matrix.compose(new THREE.Vector3(x,e.height-.025,z),q,scale);grassMesh.setMatrixAt(count,matrix);color.set(short?'#c0c6a3':e.moisture>.8?'#8cb28b':'#b8c88c');grassMesh.setColorAt(count,color);count++;}if(grassMesh.instanceColor)grassMesh.instanceColor.needsUpdate=true;grassMesh.count=count;grassMesh.instanceMatrix.needsUpdate=true;}
export function updateForest(position,overview=false){vegetationScene?.update(position,overview);if(grassMesh)grassMesh.visible=floraGroup.visible&&vegetationScene.layers.ground;for(const group of forest){const c=group.userData.center,d=Math.hypot(c.x-position.x,c.z-position.z);group.visible=d<(group.userData.smallRocks?210:2300);group.traverse(o=>{if(o.isMesh)o.castShadow=d<230;});}}
export function sceneStage(stage){floraGroup.visible=stage===2;buildingGroup.visible=stage===2;roadGroup.visible=stage>=1;if(grassMesh)grassMesh.visible=stage===2&&vegetationScene.layers.ground;}
export function animateDetails(time){for(const o of windmills)o.rotation[o.userData.spin]=time*.0003;for(const b of boats){b.object.position.y=.16+Math.sin(time*.0008+b.phase)*.06;b.object.rotation.z=Math.sin(time*.0006+b.phase)*.018;}}

export function makeSky(){return new THREE.Mesh(new THREE.SphereGeometry(16000,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{topColor:{value:new THREE.Color('#7faac5')},bottomColor:{value:new THREE.Color('#dce5d4')},sunDirection:{value:new THREE.Vector3(-.45,.65,.4).normalize()},cloudCover:{value:0},weatherTime:{value:0},sunVisibility:{value:1},opticalMode:{value:0},opticalStrength:{value:0},opticalRadius:{value:new THREE.Vector2()}},vertexShader:'varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 skyDirection;uniform vec3 topColor;uniform vec3 bottomColor;uniform vec3 sunDirection;uniform float cloudCover;uniform float weatherTime;uniform float sunVisibility;uniform int opticalMode;uniform float opticalStrength;uniform vec2 opticalRadius;void main(){vec3 d=normalize(skyDirection);float h=pow(max(0.0,d.y),0.55);vec3 c=mix(bottomColor,topColor,h);float s=pow(max(0.0,dot(d,sunDirection)),350.0);c+=vec3(1.0,0.76,0.42)*s*0.9*sunVisibility;float cloud=sin(d.x*23.0+weatherTime*0.06+sin(d.z*13.0))*sin(d.z*34.0);cloud=smoothstep(0.55,0.95,cloud)*exp(-pow((d.y-0.22)/0.07,2.0));float highCloud=sin(d.x*49.0-weatherTime*0.025+sin(d.z*31.0))*sin(d.z*58.0+weatherTime*0.015);highCloud=smoothstep(0.1,0.85,highCloud)*exp(-pow((d.y-0.55)/0.19,2.0));cloud=max(cloud,highCloud*0.4);c=mix(c,mix(vec3(0.07,0.09,0.14),vec3(0.95,0.96,0.91),sunVisibility),cloud*(0.12+cloudCover*0.65));if(opticalStrength>0.0&&opticalMode==1&&d.y>0.001){\nfloat angle=degrees(acos(clamp(dot(d,-sunDirection),-1.0,1.0)));\nfloat outer=opticalRadius.x;float u=clamp((angle-(outer-2.4))/2.4,0.0,1.0);\nvec3 spectrum=mix(vec3(.30,.14,1.0),vec3(.16,1.0,.33),smoothstep(0.0,.51,u));\nspectrum=mix(spectrum,vec3(1.0,.87,.21),smoothstep(.47,.77,u));\nspectrum=mix(spectrum,vec3(1.0,.18,.088),smoothstep(.73,1.0,u));\nfloat bow=smoothstep(outer-2.55,outer-2.20,angle)*(1.0-smoothstep(outer-.12,outer+.24,angle));\nc=mix(c,c*.40+spectrum*.85,bow*opticalStrength*.83*smoothstep(0.0,.040,d.y));\n}\nif(opticalStrength>0.0&&opticalMode==2){\nfloat angle=degrees(acos(clamp(dot(d,sunDirection),-1.0,1.0)));\nfloat difference=angle-opticalRadius.y;\nfloat halo=smoothstep(-.45,.22,difference)*(1.0-smoothstep(.30,2.6,difference));\nfloat cirrus=smoothstep(.1,.83,highCloud+.2)*(1.0-smoothstep(.64,1.0,d.y));\nc=mix(c,vec3(.88,.92,.99),cirrus*.29*opticalStrength);\nvec3 tint=mix(vec3(1.0,.48,.31),vec3(.97,.99,1.0),smoothstep(0.0,1.25,difference));\nc+=tint*halo*opticalStrength*.86;\n}\ngl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));}

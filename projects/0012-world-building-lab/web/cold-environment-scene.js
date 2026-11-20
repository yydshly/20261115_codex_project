import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {iceSample} from './glacial-geography.js';
import {coldGround,thawHollow} from './cold-ground.js';
import {activeLayer,coldColors,coldProfile,coldReading,coldRoutes,glacierCrossSection} from './cold-environment.js';

const clamp=x=>Math.min(1,Math.max(0,x));
const mix=(a,b,t)=>a+(b-a)*t;
const tint=(color,opacity=1,depthTest=false,vertexColors=false)=>new THREE.MeshBasicMaterial({
  color,opacity,transparent:opacity<1,side:THREE.DoubleSide,depthTest,depthWrite:false,toneMapped:false,vertexColors
});

function mesh(positions,material,order,colors){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  if(colors)geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const shape=new THREE.Mesh(geometry,material);shape.renderOrder=order;
  return shape;
}

function line(points,color,order=52){
  const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p.x,p.y,p.z)));
  const shape=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,depthTest:false,depthWrite:false,toneMapped:false}));
  shape.renderOrder=order;return shape;
}

function ribbon(points,width,color,order,lift,opacity=.9){
  const vertices=[],colors=[],fixed=typeof color==='string';
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
    if(d<.005)continue;
    const x=dz/d*width,z=-dx/d*width;
    const v=(p,side)=>[p.x+side*x,Math.max(0,p.y)+lift,p.z+side*z];
    vertices.push(...v(a,1),...v(a,-1),...v(b,1),...v(b,1),...v(a,-1),...v(b,-1));
    if(!fixed){
      const rgb=new THREE.Color(color(b,i)).toArray();
      for(let j=0;j<6;j++)colors.push(...rgb);
    }
  }
  return mesh(vertices,tint(fixed?color:'#ffffff',opacity,false,!fixed),order,fixed?null:colors);
}

function drape(a,b,step=2,offset=.22){
  const count=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/step));
  return Array.from({length:count+1},(_,i)=>{
    const x=mix(a.x,b.x,i/count),z=mix(a.z,b.z,i/count);
    return {x,z,y:terrainHeight(x,z)+offset};
  });
}

function surfaceGrid(bounds,height,order,mat,pigment=null){
  const {x0,x1,z0,z1,step}=bounds,verts=[],colors=[];
  const nx=Math.ceil((x1-x0)/step),nz=Math.ceil((z1-z0)/step);
  const sample=(i,j)=>{
    const x=mix(x0,x1,i/nx),z=mix(z0,z1,j/nz);
    return {x,z,y:height(x,z)};
  };
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
    const a=sample(i,j),b=sample(i+1,j),c=sample(i,j+1),d=sample(i+1,j+1);
    const rgb=pigment?.(a.x,a.z,a.y);
    if(pigment&&!rgb)continue;
    for(const p of [a,c,b,b,c,d]){
      verts.push(p.x,p.y,p.z);
      if(rgb)colors.push(...rgb);
    }
  }
  return mesh(verts,mat,order,pigment?colors:null);
}

function coastalGround(group){
  const {x,z,rx,rz}=coldGround,h=thawHollow;
  const earth=surfaceGrid({x0:x-rx,x1:x+rx,z0:z-rz,z1:z+rz,step:.85},
    (x,z)=>terrainHeight(x,z)+.12,49,tint('#ffffff',.88,false,true),(px,pz,y)=>{
      const edge=Math.hypot((px-x)/rx,(pz-z)/rz);
      if(edge>1||y< h.level+.1&&Math.hypot((px-h.x)/h.rx,(pz-h.z)/h.rz)<1)return null;
      const variation=.45+.17*Math.sin(px*2.53+pz*.37)+.18*Math.cos(pz*.92-px*.53);
      return new THREE.Color('#6d7d56').lerp(new THREE.Color('#b6a982'),clamp(variation+Math.max(0,edge-.65))).toArray();
    });
  group.add(earth);
  const groupCracks=new THREE.Group();
  const radius=4.7,spacing=Math.sqrt(3)*radius;
  for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){
    const cx=x+spacing*(col+(Math.abs(row)%2)*.5),cz=z+row*radius*1.5;
    if(Math.hypot((cx-x)/(rx-3),(cz-z)/(rz-3))>1||Math.hypot(cx-h.x,cz-h.z)<8)continue;
    const ring=Array.from({length:7},(_,i)=>{
      const angle=(i%6)*Math.PI/3+Math.PI/6;
      const x=cx+Math.cos(angle)*radius,z=cz+Math.sin(angle)*radius;
      return {x:x+.68*Math.sin(x*1.7+z*.47),z:z+.58*Math.sin(z*1.2-x*.71)};
    });
    const boundary=ring.slice(1).flatMap((b,i)=>drape(ring[i],b,.9,.3));
    groupCracks.add(ribbon(boundary,.43,'#454539',52,0,.93),
      ribbon(boundary,.12,'#8baeb2',53,.055,.85));
  }
  group.add(groupCracks);
  const water=new THREE.Mesh(new THREE.CircleGeometry(1,56),tint('#4c9fa9',.96));
  water.name='thaw hollow surface';
  water.rotation.x=-Math.PI/2;water.scale.set(h.rx,h.rz,1);water.position.set(h.x,h.level+.18,h.z);
  water.renderOrder=51;group.add(water);

  // Enlarged depth allows the seasonal active layer/wedge to be read in the aerial section.
  const section=new THREE.Group(),cut=drape({x:x-16,z:z-8},{x:x+16,z:z-8},1,.34);
  section.name='permafrost cutaway';
  const soil=tint('#9c805e',.96),frozen=tint('#597f91',.96),wedge=tint('#a6deeb',.96);
  const fill=(top,bottom,material,order)=>{
    const vertices=[];
    for(let i=1;i<cut.length;i++){
      const a=cut[i-1],b=cut[i];
      const v=(p,d)=>[p.x,p.y-d,p.z];
      vertices.push(...v(a,top),...v(a,bottom),...v(b,top),...v(b,top),...v(a,bottom),...v(b,bottom));
    }
    return mesh(vertices,material,order);
  };
  const layers={};
  for(const season of ['winter','summer']){
    const depth=activeLayer(season,coldReading(coldGround,season).warmth)*5;
    const body=new THREE.Group(),vertices=[];
    body.name=season+' active layer';
    for(const i of [7,16,25]){
      const a=cut[i],b=cut[i+2],c=cut[i+1];
      vertices.push(a.x,a.y-depth,a.z,b.x,b.y-depth,b.z,c.x,c.y-6.8,c.z);
    }
    body.add(fill(0,depth,soil,56),fill(depth,7.5,frozen,56),mesh(vertices,wedge,58));
    layers[season]=body;section.add(body);
  }
  section.add(line(cut,'#efdec4',59));group.add(section);
  return {groupCracks,water,section,layers};
}

function coldScree(){
  const group=new THREE.Group(),x=782,z=-789;
  const angular=new THREE.DodecahedronGeometry(1,0);
  const bank=new THREE.InstancedMesh(angular,new THREE.MeshStandardMaterial({color:'#a39889',roughness:.92}),88);
  const pose=new THREE.Object3D(),color=new THREE.Color();
  for(let i=0;i<bank.count;i++){
    const u=i/87,phi=i*2.39996,r=27*Math.sqrt(u),px=x+Math.cos(phi)*r,pz=z+Math.sin(phi)*r*.65;
    const size=.45+1.6*(.5+.5*Math.sin(i*5.735))**2;
    pose.position.set(px,terrainHeight(px,pz)+size*.36,pz);
    pose.rotation.set(i*.47,i*.93,i*.21);
    pose.scale.set(size,size*.62,size*.89);pose.updateMatrix();
    bank.setMatrixAt(i,pose.matrix);
    color.set(i%4===0?'#d0c2b1':i%3===0?'#938980':'#b5a592');bank.setColorAt(i,color);
  }
  group.add(bank);
  return group;
}

function iceSection(){
  const points=glacierCrossSection(),vertices=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    vertices.push(a.x,a.y,a.z,b.x,b.y,b.z,b.x,b.ice,b.z,a.x,a.y,a.z,b.x,b.ice,b.z,a.x,a.ice,a.z);
  }
  const group=new THREE.Group();
  group.name='glacier valley cutaway';
  group.add(mesh(vertices,tint('#90d8ef',.83),55),
    line(points.map(p=>({...p,y:p.y+.7})),'#ffd9a6',59),
    line(points.map(p=>({...p,y:p.ice+.8})),'#eafdff',59));
  return group;
}

function cirqueRim(){
  const p=iceSample(0);
  const path=Array.from({length:60},(_,i)=>{
    const angle=i/59*Math.PI,across=Math.cos(angle)*63,back=Math.sin(angle)*76,
      x=p.x+p.nx*across-p.dx*back,z=p.z+p.nz*across-p.dz*back;
    return {x,z,y:terrainHeight(x,z)};
  });
  return ribbon(path,1.7,'#e3c984',51,2,.83);
}

export function createColdEnvironmentScene(scene){
  const root=new THREE.Group();root.name='coast to alpine cold environments';root.visible=false;scene.add(root);
  let prepared=null;
  function build(){
    const groups=new Map(),ring=new THREE.RingGeometry(.67,1,32);ring.rotateX(-Math.PI/2);
    for(const route of coldRoutes){
      const plot=coldProfile(route.path),group=new THREE.Group();
      group.name=route.id;root.add(group);
      const base=ribbon(plot.points,2.8,route.color,52,6);
      const belts=ribbon(plot.points,3.3,p=>coldColors[coldReading(p,'summer').band],53,7);
      group.add(base,belts);
      const snow=Object.fromEntries(['winter','summer'].map(season=>{
        const value=(x,z,y)=>coldReading({x,z,y},season).snow;
        const centers=route.id==='alpine'?[
          {x0:433,x1:545,z0:-645,z1:-548,step:4},
          {x0:738,x1:826,z0:-830,z1:-750,step:5}
        ]:[{x0:-700,x1:-578,z0:-1233,z1:-1160,step:5}];
        const layer=new THREE.Group();
        const min=season==='summer'?.0015:.006;
        const material=tint('#fff',.52,false,true);
        const pale=new THREE.Color('#dff4fc'),deep=new THREE.Color('#99c7e6');
        for(const bounds of centers){
          layer.add(surfaceGrid(bounds,(x,z)=>terrainHeight(x,z)+.47,46,material,(x,z,y)=>{
            const v=value(x,z,y);
            return y>0&&v>min?pale.clone().lerp(deep,clamp(v/.045)).toArray():null;
          }));
        }
        group.add(layer);return [season,layer];
      }));
      const pins=route.stops.map(p=>{
        const m=new THREE.Mesh(ring,tint(route.color,.96));
        m.renderOrder=60;m.position.set(p.x,p.surface??Math.max(0,terrainHeight(p.x,p.z))+5,p.z);
        m.position.y+=2;m.scale.setScalar(p.range<100?2.3:7);group.add(m);return m;
      });
      groups.set(route.id,{route,plot,group,base,belts,snow,pins});
    }
    const north=groups.get('north').group,alpine=groups.get('alpine').group;
    const ground=new THREE.Group(),frost=coastalGround(ground);
    const rocks=coldScree(),section=iceSection(),rim=cirqueRim();
    north.add(ground);alpine.add(rocks,section,rim);
    return {groups,ground,frost,rocks,section,rim};
  }

  function show({route,stop,season,layer}){
    prepared??=build();root.visible=true;
    const {groups,ground,frost,rocks,section,rim}=prepared;
    const local=['tundra','thaw','scree','cirque','trough'].includes(stop);
    for(const [id,data] of groups){
      data.group.visible=!route||id===route;
      data.base.visible=!stop&&layer==='land';
      data.belts.visible=!local&&layer!=='land';
      for(const [key,snow] of Object.entries(data.snow))
        snow.visible=key===season&&layer==='climate'&&Boolean(route);
      data.pins.forEach((pin,i)=>{
        const selected=data.route.stops[i].id===stop;
        pin.visible=!local||selected;
        pin.scale.setScalar((data.route.stops[i].range<100?2.3:7)*(selected?1.48:1));
      });
    }
    ground.visible=route==='north'&&['tundra','thaw'].includes(stop);
    frost.water.material.color.set(season==='winter'?'#c7e8f3':'#4c9fa9');
    frost.section.visible=layer==='section'&&stop==='tundra';
    for(const [key,g] of Object.entries(frost.layers))g.visible=key===season;
    rocks.visible=route==='alpine'&&stop==='scree';
    section.visible=route==='alpine'&&stop==='trough'&&layer==='section';
    rim.visible=route==='alpine'&&stop==='cirque';
    return {plot:groups.get(route)?.plot};
  }
  return {show,hide(){root.visible=false;}};
}

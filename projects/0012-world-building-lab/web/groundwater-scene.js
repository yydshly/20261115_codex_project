import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {waterAt} from './water-system.js';
import {hash} from './vegetation-rules.js';
import {karstSeaGeometry} from './karst-scene.js';
import {bedrockAt,parentAt,hydroMaterials,groundStops,spring,springCreek,storagePath,cavePath} from './groundwater-layout.js';

const bright={
  crystalline:[161,143,181],layered:[219,167,104],volcanic:[161,112,104],
  carbonate:[164,183,121],alluvium:[240,217,133]
};
export function lithologyTexture(){
  const width=256,height=216,data=new Uint8Array(width*height*4);
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){
    const x=((i+.5)/width-.5)*3840,z=((j+.5)/height-.5)*3200;
    const cover=parentAt(x,z),[r,g,b]=bright[bedrockAt(x,z)],mark=cover&&((i+j)%5<2);
    data.set(mark?bright.alluvium.concat(255):[r,g,b,255],4*(j*width+i));
  }
  const texture=new THREE.DataTexture(data,width,height);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=texture.minFilter=THREE.LinearFilter;
  texture.repeat.set(7/3840,7/3200);
  texture.offset.set(.5,.5);
  texture.needsUpdate=true;
  return texture;
}

const flowColor='#74dced';
const vector=p=>new THREE.Vector3(p.x,p.y,p.z);
const meshMat=(color,opacity=1)=>new THREE.MeshBasicMaterial({
  color,opacity,transparent:opacity!==1,depthWrite:opacity===1,side:THREE.DoubleSide
});
function flowTube(points,radius,material){
  const curve=new THREE.CurvePath();
  for(let n=1;n<points.length;n++)curve.add(new THREE.LineCurve3(vector(points[n-1]),vector(points[n])));
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(12,points.length*6),radius,6,false),material);
  return {mesh,curve};
}

// Follow the local steepest downhill direction. Surface paths stop at standing water.
function runoffPath(x,z){
  const read=(x,z)=>({x,z,y:terrainHeight(x,z)+1.2});
  const points=[read(x,z)];
  for(let i=0;i<14;i++){
    const p=points.at(-1),w=waterAt(p.x,p.z);
    if(w&&w.level>p.y-1.25)break;
    let best=p;
    for(let heading=0;heading<8;heading++){
      const a=heading*Math.PI/4,q=read(p.x+4*Math.cos(a),p.z+4*Math.sin(a));
      if(q.y<best.y-.075)best=q;
    }
    if(best===p)break;
    points.push(best);
  }
  return points;
}

function aquiferSection(){
  const root=new THREE.Group(),nodes=[];
  for(let i=0;i<=36;i++){
    const leg=Math.min(storagePath.length-2,Math.floor(i/12)),t=(i-leg*12)/12;
    const a=storagePath[leg],b=storagePath[leg+1];
    const x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t)+23;
    const ground=terrainHeight(x,z);
    const bed=THREE.MathUtils.lerp(a.y,b.y,t)+17;
    nodes.push({x,z,base:bed,top:Math.max(ground+12,bed+10)});
  }
  function band(lower,upper,color,topCap=false){
    const vertices=[],indices=[];
    for(let i=0;i<nodes.length;i++){
      const p=nodes[i],y=upper(p,i);
      vertices.push(p.x,lower(p,i),p.z,p.x,y,p.z);
      if(topCap)vertices.push(p.x+4,Math.max(y-1,terrainHeight(p.x+4,p.z-16)+9),p.z-16);
      if(i){
        const step=topCap?3:2,j=(i-1)*step,k=j+step;
        indices.push(j,j+1,k,k,j+1,k+1);
        if(topCap)indices.push(j+1,j+2,k+1,k+1,j+2,k+2);
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);
    const mesh=new THREE.Mesh(g,meshMat(color));
    root.add(mesh);
    return mesh;
  }
  band(p=>terrainHeight(p.x,p.z)-.5,p=>p.base,'#675e58');
  band(p=>p.base,p=>p.top-3,'#ceaa72');
  band(p=>p.top-3,p=>p.top,'#967c56',true);
  const water=band(p=>p.base+.1,p=>p.base+1,flowColor);
  const storageAttribute=water.geometry.getAttribute('position');
  for(let i=0;i<storageAttribute.count;i++)storageAttribute.setZ(i,storageAttribute.getZ(i)+.35);
  water.frustumCulled=false;
  return {root,marker:{x:217,z:1346,y:62,text:'砂岩蓄水带 · 放大剖面',color:'#a6e6ed'},
    set(level){
      water.visible=level>.12;
      nodes.forEach((p,i)=>{
        const height=Math.min(p.top-p.base-3,.55+level*.38)*(1-i/70);
        storageAttribute.setY(i*2+1,p.base+height);
      });
      storageAttribute.needsUpdate=true;
    }
  };
}

export function createGroundwaterScene(scene,{tiles,karst,sea,reduced}){
  const root=new THREE.Group(),effects=new THREE.Group(),markers=new THREE.Group();
  root.visible=false;root.name='lithology and groundwater';root.add(markers,effects);scene.add(root);
  const byStation=new Map(),annotations=[];
  const seaSurface=sea.geometry;
  let section,texture,cave,springFlow,seep,ripples,rain,rainBuffer,current,measurement,cutaway=false,mapVisible=false,clock=0,tracer,sectionSea,caveBase;

  function initialize(){
    if(section)return;
    for(const station of groundStops){
      const {x,z,id,material,name}=station;
      const y=Math.max(terrainHeight(x,z),waterAt(x,z)?.level??-Infinity);
      const color=hydroMaterials[material].color;
      const ring=new THREE.Mesh(new THREE.TorusGeometry(16,2.6,5,30),meshMat(color));
      ring.position.set(x,y+5,z);ring.rotation.x=-Math.PI/2;markers.add(ring);
      annotations.push({id,text:name,x,y:y+28,z,color,ring});
    }
    section=aquiferSection();effects.add(section.root);
    cave=flowTube(cavePath,1.55,meshMat('#85f2e3',.8));effects.add(cave.mesh);
    caveBase=new THREE.Mesh(new THREE.PlaneGeometry(510,620),meshMat('#344343'));
    caveBase.rotation.x=-Math.PI/2;caveBase.position.set(635,-52,-1305);effects.add(caveBase);
    springFlow=flowTube(springCreek,.7,meshMat('#a2e6f2',.8));effects.add(springFlow.mesh);
    ripples=new THREE.Group();effects.add(ripples);
    for(let i=0;i<3;i++){
      const r=new THREE.Mesh(new THREE.RingGeometry(.87,1,32),meshMat('#9fe9ec',.58));
      r.position.set(springCreek.at(-1).x,12.18,springCreek.at(-1).z);r.rotation.x=-Math.PI/2;ripples.add(r);
    }
    seep=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),meshMat('#d3faf7'));
    seep.position.set(spring.x,spring.y,spring.z);effects.add(seep);
    tracer=new THREE.Group();effects.add(tracer);
    const bead=new THREE.SphereGeometry(1.55,8,6),glow=meshMat('#b7ffe5');
    for(let i=0;i<8;i++)tracer.add(new THREE.Mesh(bead,glow));
    rainBuffer=new THREE.BufferAttribute(new Float32Array(112*6),3);
    const g=new THREE.BufferGeometry();g.setAttribute('position',rainBuffer);
    rain=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#ccecff',transparent:true,opacity:.58,depthWrite:false}));
    rain.frustumCulled=false;effects.add(rain);
  }

  function siteEffects(site){
    if(byStation.has(site.id))return byStation.get(site.id);
    const group=new THREE.Group(),runs=[],streaks=[];
    const rainCenter=site.id==='cave'?cavePath[0]:site;
    for(let i=0;i<112;i++){
      const x=rainCenter.x+(hash(i,1,11)-.5)*100,z=rainCenter.z+(hash(i,2,14)-.5)*86;
      streaks.push({x,z,y:Math.max(terrainHeight(x,z),waterAt(x,z)?.level??-Infinity),phase:hash(i,3,17)});
    }
    if(site.id!=='cave'&&site.id!=='spring')for(const [dx,dz] of [[-25,13],[-6,12],[14,-17],[22,20],[-14,-9]]){
      const points=runoffPath(site.x+dx,site.z+dz);
      if(points.length>1){
        const flow=flowTube(points,.8,meshMat(flowColor,.65));
        group.add(flow.mesh);runs.push(flow);
      }
    }
    effects.add(group);
    const record={group,streaks,runs};
    byStation.set(site.id,record);
    return record;
  }

  function setCutaway(value){
    if(cutaway===value)return;
    cutaway=value;
    tiles.setKarstCutaway(value);
    karst.setCutaway(value);
    if(value)sectionSea??=karstSeaGeometry(30000,true);
    sea.geometry=value?sectionSea:seaSurface;
  }
  function setMap(value){
    if(mapVisible===value)return;
    mapVisible=value;
    if(value)texture??=lithologyTexture();
    tiles.setLithologyMap(value?texture:null);
  }
  function paintRain(){
    if(!rain.visible)return;
    const count=Math.min(112,40+measurement.amount*3);
    rain.geometry.setDrawRange(0,Math.floor(count)*2);
    current.streaks.forEach(({x,y,z,phase},i)=>{
      const lift=4+THREE.MathUtils.euclideanModulo(phase-clock*1.42,1)*48;
      rainBuffer.setXYZ(2*i,x,y+lift,z);
      rainBuffer.setXYZ(2*i+1,x-.8,y+lift-4.3,z+.7);
    });
    rainBuffer.needsUpdate=true;
  }
  function paintFlow(){
    if(ripples.visible){
      ripples.children.forEach((mesh,i)=>{
        const phase=(i/3+clock*(.42+measurement.outflow))%1;
        mesh.scale.setScalar(.7+phase*(2.2+measurement.outflow*3.1));
        mesh.material.opacity=(1-phase)*Math.min(.8,measurement.outflow*1.1);
      });
    }
    if(cave.mesh.visible){
      cave.mesh.material.opacity=.38+.39*Math.min(1,measurement.outflow/2)+.11*Math.sin(clock*6);
      tracer.children.forEach((mesh,i)=>{
        const t=(i/8+clock*(.12+Math.min(.54,measurement.outflow*.15)))%1;
        mesh.position.copy(cave.curve.getPoint(t));
      });
    }
  }
  return {
    setMap,
    show({station,frame,map=true,openCave=true}){
      initialize();
      root.visible=true;measurement=frame;
      setMap(map);
      const isCave=station?.id==='cave',isStorage=station?.id==='storage',isSpring=station?.id==='spring';
      setCutaway(isCave&&openCave);
      current=station?siteEffects(station):null;
      for(const record of byStation.values())record.group.visible=record===current&&frame.recentRunoff>.12;
      if(current)for(const {mesh} of current.runs)mesh.material.opacity=Math.min(.9,.3+frame.recentRunoff*.14);
      for(const p of annotations)p.ring.visible=!station||p.id===station.id;
      section.root.visible=isStorage;
      if(isStorage)section.set(frame.groundwater);
      caveBase.visible=isCave&&openCave;
      cave.mesh.visible=isCave&&openCave&&frame.discharge>.01;
      tracer.visible=cave.mesh.visible&&frame.outflow>.04;
      springFlow.mesh.visible=seep.visible=ripples.visible=isSpring&&frame.outflow>.025;
      if(isSpring){
        seep.scale.setScalar(.8+Math.min(2,frame.outflow*2.2));
        springFlow.mesh.material.opacity=Math.min(.95,.24+frame.outflow*1.3);
      }
      rain.visible=!!station&&frame.amount>0;
      paintRain();paintFlow();
      return isStorage?[section.marker]:station?annotations.filter(p=>p.id===station.id):annotations;
    },
    hide(){
      root.visible=false;setCutaway(false);
      setMap(false);
    },
    update(dt){
      if(!root.visible||reduced)return;
      clock+=dt;paintRain();paintFlow();
    }
  };
}

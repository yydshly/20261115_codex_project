import * as THREE from 'three';
import {terrainHeight,walkingSurface} from './large-world.js';
import {lifeLength,lifeNewWalks,lifePoint} from './life-route.js';
import {outletFloodModel,wetlandFloodModel} from './life-inundation.js';

function walkSurface(start,end,material){
  const positions=[],indices=[],count=Math.ceil((end-start)/.9);
  for(let i=0;i<=count;i++){
    const at=start+(end-start)*i/count,p=lifePoint(at),a=lifePoint(at-.45),b=lifePoint(at+.45);
    const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||1;
    for(const side of [-.79,.79]){
      const x=p.x-dz/d*side,z=p.z+dx/d*side;
      positions.push(x,walkingSurface(x,z)+.026,z);
    }
    if(i<count){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;
  return mesh;
}

function floodMesh({points,triangles,levels}){
  const positions=[],colors=[],color=new THREE.Color('#57c8f3');
  for(let i=0;i<triangles.length;i+=3){
    const ids=[triangles[i],triangles[i+1],triangles[i+2]];
    if(ids.every(id=>levels[id]===null))continue;
    for(const id of ids){
      const p=points[id],level=levels[id];
      positions.push(p.x,(level??p.bed)+.12,p.z);
      colors.push(color.r,color.g,color.b,level===null?0:.7);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
  const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({
    vertexColors:true,transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide
  }));
  mesh.renderOrder=12;
  return mesh;
}

export function buildLifeConnections(scene){
  const root=new THREE.Group();root.name='Life route bank footpaths';scene.add(root);
  const material=new THREE.MeshStandardMaterial({color:'#b5a489',roughness:.95,side:THREE.DoubleSide});
  for(const [start,end] of lifeNewWalks)root.add(walkSurface(start,end,material));
  return root;
}

export function createLifeVisuals(scene,wetland){
  const root=new THREE.Group();root.name='Life route guidance and connected inundation';scene.add(root);
  const count=Math.ceil(lifeLength/.8),points=[];
  for(let i=0;i<=count;i++){
    const p=lifePoint(i*lifeLength/count);
    points.push(new THREE.Vector3(p.x,walkingSurface(p.x,p.z)+.11,p.z));
  }
  const guide=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineDashedMaterial({color:'#f4cf87',dashSize:2.4,gapSize:1.6,toneMapped:false}));
  guide.computeLineDistances();root.add(guide);
  const water=new THREE.Group();water.visible=false;root.add(water);root.visible=false;
  return {
    show(on){root.visible=on;},
    flood(on){
      if(on&&!water.children.length){
        water.add(floodMesh(outletFloodModel(terrainHeight)),floodMesh(wetlandFloodModel(wetland.model)));
      }
      water.visible=on;
    }
  };
}

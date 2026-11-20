import * as THREE from 'three';
import {benchmarkLength,benchmarkNormal,benchmarkPoint,benchmarkStops,trailHalfWidth} from './benchmark-trail.js';
import {benchmarkDeck,terrainHeight} from './large-world.js';

export function buildBenchmarkTrail(scene){
  const root=new THREE.Group();
  root.name='Snow ridge to central bay footpath';
  const count=Math.ceil(benchmarkLength/.65),positions=[],colors=[],indices=[],rails=[],posts=[];
  const pale=new THREE.Color('#bdaf8b'),wood=new THREE.Color('#a58d65');
  let previous=null;
  for(let i=0;i<=count;i++){
    const at=i*benchmarkLength/count,p=benchmarkPoint(at),n=benchmarkNormal(at),y=benchmarkDeck(at);
    const lift=y-terrainHeight(p.x,p.z);
    const sides=[-trailHalfWidth,trailHalfWidth].map(side=>{
      const x=p.x+n.x*side,z=p.z+n.z*side;
      positions.push(x,y+.025,z);
      const color=(lift>.36?wood:pale).clone().multiplyScalar(1+.07*Math.sin(i*.91+side*.22));
      colors.push(color.r,color.g,color.b);
      return {x,z,y:y+.83};
    });
    if(i<count){
      const a=i*2;
      indices.push(a,a+2,a+1,a+1,a+2,a+3);
    }
    if(lift>1.1&&previous?.lift>1.1){
      for(let side=0;side<2;side++){
        const a=previous.sides[side],b=sides[side];
        rails.push(a.x,a.y,a.z,b.x,b.y,b.z);
      }
    }
    if(lift>.38&&i%4===0){
      for(const s of sides){
        const ground=terrainHeight(s.x,s.z),top=lift>1.1?y+.87:y;
        if(top-ground>.15)posts.push({x:s.x,z:s.z,y:(top+ground)/2,height:top-ground,width:.095});
      }
    }
    previous={sides,lift};
  }
  for(const stop of benchmarkStops){
    const p=benchmarkPoint(stop.at),n=benchmarkNormal(stop.at),y=benchmarkDeck(stop.at);
    const x=p.x+n.x*1.65,z=p.z+n.z*1.65;
    posts.push({x,z,y:y+.35,height:.95,width:.14});
    posts.push({x,z,y:y+.76,height:.19,width:.24,marked:true});
  }
  const deck=new THREE.BufferGeometry();
  deck.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  deck.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  deck.setIndex(indices);deck.computeVertexNormals();
  const surface=new THREE.Mesh(deck,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,side:THREE.DoubleSide}));
  surface.receiveShadow=true;root.add(surface);
  const rail=new THREE.BufferGeometry();
  rail.setAttribute('position',new THREE.Float32BufferAttribute(rails,3));
  root.add(new THREE.LineSegments(rail,new THREE.LineBasicMaterial({color:'#786752'})));
  const uprights=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({roughness:1}),posts.length);
  const dummy=new THREE.Object3D(),brown=new THREE.Color('#786752'),gold=new THREE.Color('#e0bc82');
  posts.forEach(({x,y,z,height,width,marked},i)=>{
    dummy.position.set(x,y,z);dummy.scale.set(width,height,width);dummy.updateMatrix();
    uprights.setMatrixAt(i,dummy.matrix);uprights.setColorAt(i,marked?gold:brown);
  });
  root.add(uprights);
  scene.add(root);
  return root;
}

export function createBenchmarkTimeTrace(scene){
  const root=new THREE.Group();
  root.name='Time-layer route passage';
  scene.add(root);
  const walk=new THREE.LineBasicMaterial({color:'#adf4b2',depthTest:false,depthWrite:false,toneMapped:false});
  const air=new THREE.LineDashedMaterial({color:'#ffd898',dashSize:8,gapSize:5,depthTest:false,depthWrite:false,toneMapped:false});
  function clear(){
    for(const line of [...root.children]){
      root.remove(line);
      line.geometry.dispose();
    }
  }
  return {
    show(passage,navigation){
      clear();
      for(const run of passage.runs){
        const samples=Math.ceil((run.end-run.start)/3),points=[];
        for(let i=0;i<=samples;i++){
          const p=benchmarkPoint(run.start+(run.end-run.start)*i/samples);
          points.push(new THREE.Vector3(p.x,navigation.inspect(p.x,p.z).top+1.5,p.z));
        }
        const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),run.method==='walk'?walk:air);
        line.computeLineDistances();line.renderOrder=39;
        root.add(line);
      }
    },
    hide:clear
  };
}

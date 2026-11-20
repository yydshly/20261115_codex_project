import * as THREE from 'three';
import {cambrianAxis,cambrianPoint} from './cambrian-margin.js';

const clamp=n=>Math.max(0,Math.min(1,n));
const noise=(i,s)=>{const n=Math.sin(i*68.39+s*142.19)*43758.5453;return n-Math.floor(n);};
const tones={
  upland:new THREE.Color('#a28b69'),bar:new THREE.Color('#c4ab80'),
  mud:new THREE.Color('#616a64'),carbonate:new THREE.Color('#acb1a1'),
  silt:new THREE.Color('#ac9670'),freshMud:new THREE.Color('#948878'),
  clear:new THREE.Color('#5baba4'),open:new THREE.Color('#246e7b'),plume:new THREE.Color('#ad8c4f')
};

export function cambrianBedColor(p,color,phase='usual'){
  const {x,z,bed,depth,sand,carbonate}=p;
  if(!depth){
    color.copy(tones.bar).lerp(tones.upland,clamp(bed/46));
    return;
  }
  const ledge=.72+.24*Math.cos(bed*.62+.30*Math.sin(z*.065));
  color.copy(tones.mud).lerp(tones.bar,sand*.81).lerp(tones.carbonate,carbonate*ledge);
  if(phase==='flood')color.lerp(tones.silt,p.plume*.73);
  if(phase==='slide')color.lerp(tones.freshMud,p.runout*.74);
  color.multiplyScalar(1+.08*Math.sin(x*.061+z*.043)*Math.cos(z*.078));
}

export function cambrianWaterColor(phase,x,z,depth,color){
  const {plume}=cambrianPoint(phase,x,z);
  color.copy(tones.clear).lerp(tones.open,clamp(depth/53));
  color.lerp(tones.plume,Math.min(.89,plume*1.14));
}

function cloudTexture(){
  const size=64,rgb=new Uint8Array(size*size*4);
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){
    const r=Math.hypot((i+.5-size/2)/(size/2),(j+.5-size/2)/(size/2));
    const alpha=Math.max(0,1-r*r)**2.7;
    rgb.set([255,255,255,Math.round(alpha*255)],(j*size+i)*4);
  }
  const texture=new THREE.DataTexture(rgb,size,size);
  texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
  return texture;
}

function sedimentFlow(phase,bedAt,texture){
  const near=phase==='flood',count=330;
  const points=Array.from({length:count},(_,i)=>({
    u:noise(i,1),side:2*noise(i,2)-1,
    lift:noise(i,3),sidestep:noise(i,4)*2*Math.PI
  }));
  const positions=new THREE.Float32BufferAttribute(new Float32Array(count*3),3);
  positions.setUsage(THREE.DynamicDrawUsage);
  const geo=new THREE.BufferGeometry().setAttribute('position',positions);
  const material=new THREE.PointsMaterial({
    map:texture,color:near?'#bc9a6b':'#b7a68f',transparent:true,opacity:near?.16:.18,
    depthWrite:false,size:near?12.5:16.5
  });
  const mesh=new THREE.Points(geo,material);
  mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=4;
  function update(time){
    points.forEach((p,i)=>{
      const t=(p.u+time*(near?.050:.055))%1;
      const span=near?(22+90*t):(8+39*t);
      const x=(near?1065:1578)+t*(near?362:269);
      const z=(near?cambrianAxis(x)+16*Math.sin(t*4):743+140*t)+span*p.side;
      const bed=bedAt(x,z);
      const y=near?Math.min(-.45,Math.max(bed+.34,-1.25-p.lift*(6+t*2))):
        Math.min(-.7,bed+1.1+p.lift*(3+4*t));
      const ripple=Math.sin(time*.46+p.sidestep);
      positions.setXYZ(i,x,y,z+ripple*3.7);
    });
    positions.needsUpdate=true;
  }
  return {mesh,update};
}

function rockField(bedAt){
  const limestone=[],darkMud=[];
  for(let i=0;i<1270;i++){
    const x=1400+noise(i,1)*472,z=350+noise(i,2)*835;
    const y=bedAt(x,z),seam=Math.abs(z-(cambrianAxis(x)+30));
    if(y>-10||seam>268)continue;
    const q=cambrianPoint('usual',x,z),base=1.2+noise(i,3)*3.9;
    const point={x,y,z,base,turn:noise(i,5)*6.283,i};
    if(q.carbonate>.66&&x<1634)limestone.push(point);
    else if(noise(i,7)>.67&&x>1641)darkMud.push({...point,base:base*.43});
  }
  for(let i=0;i<82;i++){
    const x=1629+noise(i,13)*51,z=740+noise(i,15)*82;
    const y=bedAt(x,z),base=1.1+noise(i,9)*3.5;
    limestone.push({x,y,z,base,turn:noise(i,8)*6.28,i});
  }
  for(let i=0;i<430;i++){
    const x=1120+noise(i,9)*244,z=cambrianAxis(x)+(noise(i,11)-.5)*129,y=bedAt(x,z);
    if(y>-.7)continue;
    darkMud.push({x,y,z,base:.23+noise(i,4)*.95,turn:noise(i,10)*6.28,i});
  }
  const group=new THREE.Group(),dummy=new THREE.Object3D(),color=new THREE.Color();
  const geom=new THREE.DodecahedronGeometry(1,0);
  for(const [items,hex,scale] of [[limestone,'#a4af9e',.65],[darkMud,'#6d6a59',.32]]){
    const mesh=new THREE.InstancedMesh(geom,new THREE.MeshStandardMaterial({roughness:.95}),items.length);
    items.forEach(({x,y,z,base,turn,i},k)=>{
      dummy.position.set(x,y+base*scale*.42,z);
      dummy.rotation.set(.04,turn,.12);
      dummy.scale.set(base*(.83+noise(i,6)*.91),base*scale,base*(.65+noise(i,7)*.64));
      dummy.updateMatrix();mesh.setMatrixAt(k,dummy.matrix);
      mesh.setColorAt(k,color.set(hex).multiplyScalar(.76+.26*noise(i,8)));
    });
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

function bottomRipples(bedAt){
  const positions=[],indices=[];
  for(let i=0;i<205;i++){
    const x=1143+noise(i,5)*189,z=cambrianAxis(x)+105*(noise(i,6)-.5);
    const width=1.8+noise(i,7)*4.3,angle=(noise(i,8)-.5)*1.07;
    const start=positions.length/3;
    for(let j=0;j<=12;j++){
      const u=2*j/12-1,px=x+Math.sin(angle)*u*width,pz=z+Math.cos(angle)*u*width;
      for(const side of [-.42,0,.42]){
        const nx=px+side*Math.cos(angle),nz=pz-side*Math.sin(angle);
        const y=bedAt(nx,nz)+(side===0?.14*(1-u*u)+.029:.026);
        positions.push(nx,y,nz);
      }
      if(j<12){
        const k=start+j*3;
        indices.push(k,k+1,k+3,k+1,k+4,k+3,k+1,k+2,k+4,k+2,k+5,k+4);
      }
    }
  }
  const geo=new THREE.BufferGeometry().setIndex(indices);
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
  const result=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#ac956e',roughness:1,side:THREE.DoubleSide}));
  result.name='sandy ripple crests across delta front';
  return result;
}

export function createCambrianProps(bedAt){
  const root=new THREE.Group();
  root.name='cambrian-seafloor-and-sediment';
  root.add(rockField(bedAt),bottomRipples(bedAt));
  const texture=cloudTexture();
  const flows={flood:sedimentFlow('flood',bedAt,texture),slide:sedimentFlow('slide',bedAt,texture)};
  root.add(flows.flood.mesh,flows.slide.mesh);
  let flow=null,time=0,visible=false;
  return {
    root,
    show(phase,bedView){
      const next=flows[phase]??null;
      if(next!==flow)time=0;
      flow=next;visible=!!flow&&!bedView;
      for(const item of Object.values(flows))item.mesh.visible=item===flow&&visible;
      if(visible)flow.update(time);
    },
    update(dt){
      if(!visible||dt<=0)return;
      time+=dt;
      flow.update(time);
    }
  };
}

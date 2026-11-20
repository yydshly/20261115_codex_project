import * as THREE from 'three';
import {paleoRiverZ,paleoWetlandCases,paleoWetlandPoint} from './paleo-wetlands.js';

const random=(i,s)=>{const n=Math.sin(i*127.1+s*311.7)*43758.5453;return n-Math.floor(n);};
const up=new THREE.Vector3(0,1,0);
const tau=Math.PI*2;
const foliage=['#456648','#60804a','#79945c','#385e44'];

export function frondGeometry(){
  const positions=[];
  for(let i=0;i<9;i++){
    const t=i/9,x=.14+t*.86,y=t*(.77-.84*t),span=.18*(1-t*.79);
    for(const side of [-1,1]){
      positions.push(x,y,0,x+.16,y+.005,side*span,x+.19,y-.032,side*span*.23);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.computeVertexNormals();
  return geo;
}

function barkTexture(){
  const side=96,data=new Uint8Array(side*side*4);
  for(let y=0;y<side;y++)for(let x=0;x<side;x++){
    const u=x/side*4,v=y/side*5;
    const row=Math.floor(v),dx=Math.abs((((u+row*.5+.5)%1)+1)%1-.5),dy=Math.abs(v%1-.5);
    const diamond=2.0*dx+2.0*dy;
    const scar=diamond>.68&&diamond<.92?33:diamond<.46?11:-15;
    const striation=9*Math.sin(x*.39)+8*(random(x+y*side,1)-.5);
    const k=(y*side+x)*4;
    data.set([118+scar+striation,104+scar+striation,73+scar*.85+striation,255],k);
  }
  const texture=new THREE.DataTexture(data,side,side);
  texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  return texture;
}

export function makePaleoPlants(id,bedAt){
  const c=paleoWetlandCases[id],coal=id==='coal';
  const root=new THREE.Group(),roots=new THREE.Group(),cracks=new THREE.Group();
  roots.name='fossil-root-overlay';root.add(roots,cracks);
  const trees=[],lowPlants=[],sticks=[],h=coal?9:11;
  const sectionAt=c.stops.find(p=>p.id===c.sectionStation);
  let i=0;
  for(let z=-765;z<62;z+=h){
    for(let x=-1880;x<-490;x+=h){
      i++;
      const px=x+h*random(i,1),pz=z+h*random(i,2);
      const ridge=Math.hypot(px-sectionAt.x,pz-sectionAt.z);
      const q=paleoWetlandPoint(id,c.start,px,pz);
      const distance=Math.abs(pz-paleoRiverZ(px)),dry=q.bed-q.level;
      const openBank=pz>sectionAt.z-8&&pz<sectionAt.z+86&&Math.abs(px-sectionAt.x)<24;
      if(openBank||ridge<21||dry>24||distance<36||q.depth>.42)continue;
      const patch=.57+.20*Math.cos(px*.042+pz*.019)+.20*Math.sin(pz*.056);
      const near=1-Math.min(1,Math.abs(px+1170)/950);
      const treeChance=(coal?.66:.35)*patch*near*(dry>12?.52:1);
      const pick=random(i,3),y=bedAt(px,pz);
      const p={x:px,z:pz,y,i,turn:random(i,9)*tau};
      if(pick<treeChance){
        const type=coal?'lycopsid':random(i,4)>.49?'archaeopteris':'wattieza';
        trees.push({...p,type,s:(coal?13:8)+random(i,5)*(coal?16:9)});
      }else if(pick>.81&&dry<6){
        lowPlants.push({...p,s:coal?2.2+random(i,5)*5:.7+random(i,5)*1.3});
      }else if(coal&&pick>.72&&dry<3){
        sticks.push({...p,s:1.3+random(i,5)*3});
      }
    }
  }
  // Two tree forms stay visible alongside the section at the observation point.
  for(const [index,dx,dz] of [[0,-24,-8],[1,24,-17],[2,-31,-37]]){
    const x=sectionAt.x+dx,z=sectionAt.z+dz;
    trees.push({x,z,y:bedAt(x,z),s:(coal?19:11)+index*2,i:20000+index,turn:index*1.7,
      type:coal?'lycopsid':index===1?'wattieza':'archaeopteris'});
  }

  const dummy=new THREE.Object3D(), tint=new THREE.Color(),dir=new THREE.Vector3();
  const timber=[],crowns=[],bark=[],sprays=[],rootPieces=[];
  function branch(list,base,start,end,r,color){
    list.push({a:[base.x+start[0],base.y+start[1],base.z+start[2]],
      b:[base.x+end[0],base.y+end[1],base.z+end[2]],r,color,i:base.i});
  }
  for(const p of trees){
    const {s,turn,type}=p;
    const forked=type==='lycopsid',broad=type==='archaeopteris';
    branch(forked?bark:timber,p,[0,-.3,0],[0,s*(broad?.97:.86),0],s*(broad?.040:forked?.041:.031),
      forked?'#dfd1b2':broad?'#6c4c35':'#836047');
    const rounds=broad?8:6;
    for(let j=0;j<rounds;j++){
      const a=turn+j*2.399,dx=Math.cos(a),dz=Math.sin(a);
      const h=broad?s*(.48+j*.060):s*(.77+(j%3)*.039);
      const spread=s*(broad?(.29-j*.017):forked?.174:.19);
      const top=broad?h+s*.10:h+s*.18;
      const tip=[dx*spread,top,dz*spread];
      branch(timber,p,[0,h,0],tip,s*(forked?.016:.010),forked?'#624c34':'#765a3e');
      if(forked||broad){
        for(const turnOffset of [-.47,.42]){
          const fx=Math.cos(a+turnOffset),fz=Math.sin(a+turnOffset);
          const tip2=[tip[0]+fx*s*.087,top+s*.058,tip[2]+fz*s*.087];
          branch(timber,p,tip,tip2,s*.006,'#74613d');
          crowns.push({x:p.x+tip2[0],y:p.y+tip2[1],z:p.z+tip2[2],size:s*(forked?.108:.115),angle:a,i:p.i+j});
        }
      }
      sprays.push({x:p.x+tip[0]*.47,y:p.y+top-s*.015,z:p.z+tip[2]*.47,
        size:s*(broad?.205:.23),angle:a,i:p.i+j,fall:broad?.12:forked?.35:.68});
    }
    if(Math.hypot(p.x-sectionAt.x,p.z-sectionAt.z)>65)continue;
    const rays=type==='wattieza'?12:forked?5:7;
    for(let j=0;j<rays;j++){
      const a=p.turn+j*tau/rays,span=p.s*(type==='wattieza'?.22:forked?.44:.66)*(1+.35*random(p.i,j+21));
      const dx=Math.cos(a)*span,dz=Math.sin(a)*span;
      const origin=[p.x+Math.cos(a)*.3,p.y+.18,p.z+Math.sin(a)*.3];
      const joint=[p.x+dx*.53,bedAt(p.x+dx*.53,p.z+dz*.53)+.16,p.z+dz*.53];
      const tip=[p.x+dx,bedAt(p.x+dx,p.z+dz)+.14,p.z+dz];
      const color=type==='wattieza'?'#a46739':forked?'#ae8461':'#d3af77';
      rootPieces.push({a:origin,b:joint,r:p.s*.015,color,i:p.i},{a:joint,b:tip,r:p.s*.008,color,i:p.i});
      if(type==='wattieza')continue;
      for(const side of [-1,1]){
        const x=joint[0]+dx*.45-side*dz*.28,z=joint[2]+dz*.45+side*dx*.28;
        rootPieces.push({a:joint,b:[x,bedAt(x,z)+.14,z],r:p.s*.0055,color,i:p.i});
      }
    }
  }

  for(const p of lowPlants){
    if(coal){
      branch(timber,p,[0,-.09,0],[0,p.s,0],p.s*.049,'#63734a');
      for(let j=0;j<5;j++){
        for(let k=0;k<4;k++)sprays.push({x:p.x,y:p.y+p.s*(.24+j*.16),z:p.z,size:p.s*(.27-j*.021),
          angle:p.turn+k*tau/4+j*.25,fall:.07,i:p.i+j});
      }
    }else{
      for(let j=0;j<5;j++)sprays.push({x:p.x,y:p.y+.22,z:p.z,size:p.s*.67,angle:p.turn+j*tau/5,fall:.24,i:p.i+j});
    }
  }
  for(const p of sticks){
    const x=p.x+Math.cos(p.turn)*p.s,z=p.z+Math.sin(p.turn)*p.s;
    timber.push({a:[p.x,p.y+.16,p.z],b:[x,bedAt(x,z)+.22,z],r:p.s*.085,color:'#624b38',i:p.i});
  }

  function instances(target,name,items,geometry,material,pose){
    if(!items.length){geometry.dispose();material.dispose();return;}
    const mesh=new THREE.InstancedMesh(geometry,material,items.length);
    mesh.name=name;
    items.forEach((p,index)=>{
      dummy.rotation.set(0,0,0);
      pose(p);dummy.updateMatrix();
      mesh.setMatrixAt(index,dummy.matrix);
      mesh.setColorAt(index,tint.set(p.color??foliage[p.i%foliage.length]).multiplyScalar(.79+random(p.i,7)*.33));
    });
    mesh.computeBoundingSphere();
    target.add(mesh);
  }
  function cylinders(target,name,branches,ratio,map=null){
    instances(target,name,branches,new THREE.CylinderGeometry(ratio,1,1,9),new THREE.MeshStandardMaterial({roughness:.96,map}),({a,b,r})=>{
      dir.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
      dummy.position.set((a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5);
      dummy.scale.set(r,dir.length(),r);
      dummy.quaternion.setFromUnitVectors(up,dir.normalize());
    });
  }
  if(bark.length)cylinders(root,'leaf-scarred-lycopsid-trunks',bark,.57,barkTexture());
  cylinders(root,'upright-stems-and-branches',timber,.43);
  cylinders(roots,'surface-root-traces',rootPieces,.38);
  instances(root,'forked-tree-crowns',crowns,new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({roughness:.98}),p=>{
    dummy.position.set(p.x,p.y,p.z);
    dummy.rotation.y=p.angle;
    dummy.scale.set(p.size*1.13,p.size*.59,p.size*.83);
  });
  instances(root,'pinnate-fronds-and-whorls',sprays,frondGeometry(),new THREE.MeshStandardMaterial({side:THREE.DoubleSide,roughness:.94}),p=>{
    dummy.position.set(p.x,p.y,p.z);
    dummy.rotation.set(0,-p.angle,-p.fall,'YXZ');
    dummy.scale.setScalar(p.size);
  });

  if(!coal){
    const joints=[];
    const point=(col,row)=>{
      const key=row*81+col;
      const x=-1320+col*3.3+2.0*random(key,3);
      const z=paleoRiverZ(x)+44+row*3.7+2.3*random(key,4);
      return [x,bedAt(x,z)+.027,z];
    };
    for(let row=0;row<33;row++)for(let col=0;col<59;col++){
      const key=row*81+col,a=point(col,row);
      const patch=Math.sin(a[0]*.12+a[2]*.044)+Math.cos(a[2]*.13-a[0]*.07);
      if(patch<-.18||paleoWetlandPoint(id,'exposed',a[0],a[2]).depth>.02)continue;
      for(const b of [point(col+1,row),point(col,row+1)]){
        if(paleoWetlandPoint(id,'exposed',b[0],b[2]).depth>.02)continue;
        joints.push({a,b,r:.012+.020*random(key,b[0]),color:'#795e45',i:key});
      }
    }
    cylinders(cracks,'desiccation-cracks-on-mud',joints,.91);
  }
  return {root,roots,cracks};
}

export function makePaleoSection(id,bedAt){
  const {x,z}=paleoWetlandCases[id].stops[2],y=bedAt(x,z);
  const group=new THREE.Group(),width=25,depth=7;
  group.name='sampling-block';group.position.set(x,y+.08,z);
  const coal=id==='coal';
  const layers=coal?
    [[1.33,'#a58a64'],[1.0,'#70604c'],[1.55,'#493528'],[.47,'#6b5136']]:
    [[1.48,'#b3946b'],[1.02,'#967552'],[.70,'#745737'],[.74,'#986e47']];
  let base=0;
  function band(height,color,i){
    const positions=[],indices=[],cols=36;
    const bounds=(u,s)=>base+s*height+.075*Math.sin(u*21+i*.44)+.047*Math.sin(u*78+i*.6);
    for(let j=0;j<=cols;j++){
      const t=j/cols,x=(t-.5)*width;
      for(const z of [-depth/2,depth/2])positions.push(x,bounds(t,0),z,x,bounds(t,1),z);
      if(j<cols){
        const k=j*4;
        indices.push(k,k+4,k+1,k+1,k+4,k+5,k+2,k+3,k+6,k+3,k+7,k+6,
          k+1,k+5,k+3,k+3,k+5,k+7);
      }
    }
    const tail=cols*4;
    indices.push(0,1,2,1,3,2,tail,tail+2,tail+1,tail+1,tail+2,tail+3);
    const geometry=new THREE.BufferGeometry().setIndex(indices);
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.91,side:THREE.DoubleSide}));
    base+=height;group.add(mesh);return mesh;
  }
  layers.forEach(([height,color],i)=>band(height,color,i));
  const cap=coal?band(.93,'#b7aaa0',4):null;
  return {group,cap};
}

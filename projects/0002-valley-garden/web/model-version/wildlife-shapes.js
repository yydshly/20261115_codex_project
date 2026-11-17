import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const v=(x,y,z)=>new THREE.Vector3(x,y,z),up=v(0,1,0);
function finish(positions,colours,uvs){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));return g;}
function combine(parts){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g;}
function paint(g,colour){const c=new THREE.Color(colour),p=g.attributes.position;g.setAttribute('color',new THREE.Float32BufferAttribute(Array.from({length:p.count},()=>[c.r,c.g,c.b]).flat(),3));if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(p.count*2),2));return g;}
function oval(x,y,z,sx,sy,sz,colour){const g=new THREE.SphereGeometry(1,12,8).toNonIndexed();g.scale(sx,sy,sz);g.translate(x,y,z);return paint(g,colour);}
function twig(a,b,r,colour){const av=v(...a),bv=v(...b),d=bv.clone().sub(av),g=new THREE.CylinderGeometry(r,r*.7,d.length(),5).toNonIndexed();g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,d.normalize()));g.translate(...av.add(bv).multiplyScalar(.5).toArray());return paint(g,colour);}

/** A closed, cambered membrane with smooth normals and a thin edge wall. */
function membrane(shape,centre,{camber=.002,thickness=.00018,butterfly=false}={}){
  const outline=shape.getPoints(7).slice(0,-1);if(!THREE.ShapeUtils.isClockWise(outline))outline.reverse();
  const rings=7,n=outline.length,positions=[],colours=[],uvs=[],indices=[];
  for(const side of [1,-1])for(let r=0;r<=rings;r++)for(let i=0;i<n;i++){
    const t=r/rings,x=THREE.MathUtils.lerp(centre[0],outline[i].x,t),z=THREE.MathUtils.lerp(centre[1],outline[i].y,t);
    const y=camber*Math.sin(Math.PI*t)*(.65+.35*Math.sin(i/n*Math.PI*2))+.00045*x/.04+side*thickness/2;
    positions.push(x,y,z);const shade=side===1?1:.90;colours.push(shade,shade,shade*.985);
    uvs.push(butterfly?x/.041:(x/.11),butterfly?(z+.034)/.075:(z+.07)/.12);
  }
  const layer=(rings+1)*n;
  for(let r=0;r<rings;r++)for(let i=0;i<n;i++){
    const j=(i+1)%n,a=r*n+i,b=r*n+j,c=(r+1)*n+i,d=(r+1)*n+j;
    // Clockwise XZ contours make the upper face point upwards.
    indices.push(a,c,b,b,c,d,layer+a,layer+b,layer+c,layer+b,layer+d,layer+c);
  }
  for(let i=0;i<n;i++){const j=(i+1)%n,a=rings*n+i,b=rings*n+j;indices.push(a,b,layer+a,b,layer+b,layer+a);}
  const g=finish(positions,colours,uvs);g.setIndex(indices);g.computeVertexNormals();return g.toNonIndexed();
}
export function butterflyShapes(){
  const front=new THREE.Shape();front.moveTo(.001,.006);front.bezierCurveTo(.006,.017,.019,.034,.030,.036);front.quadraticCurveTo(.036,.037,.037,.030);front.bezierCurveTo(.033,.017,.022,.003,.006,-.005);front.quadraticCurveTo(.001,-.004,.001,.006);
  const rear=new THREE.Shape();rear.moveTo(.002,.002);rear.bezierCurveTo(.011,.002,.029,-.003,.028,-.013);rear.bezierCurveTo(.028,-.023,.015,-.029,.008,-.025);rear.quadraticCurveTo(.001,-.019,.002,.002);
  const fore=membrane(front,[.008,.009],{butterfly:true,camber:.0018}),hind=membrane(rear,[.007,-.006],{butterfly:true,camber:.0016});
  fore.translate(-.0017,-.0006,-.0055);hind.translate(-.0014,-.0004,.0025);
  const parts=[oval(0,0,-.008,.0018,.0018,.009,'#6b614b'),oval(0,.0005,.004,.0025,.0028,.005,'#716a55'),oval(0,.001,.012,.0021,.0020,.0027,'#645e49')];
  for(const s of [-1,1]){
    parts.push(oval(s*.0017,.0018,.013,.001,.0012,.0013,'#403e32'));
    parts.push(twig([s*.001,.003,.013],[s*.0045,.008,.023],.00018,'#746c53'),twig([s*.0045,.008,.023],[s*.006,.0085,.025],.00019,'#625c47'));
    parts.push(oval(s*.006,.0085,.025,.0004,.00035,.00065,'#70654f'));
    for(let i=0;i<3;i++)parts.push(twig([s*.001,-.001,.006-i*.004],[s*.004,-.004,.008-i*.006],.00016,'#746c53'),twig([s*.004,-.004,.008-i*.006],[s*.006,-.008,.010-i*.006],.00012,'#746c53'));
    for(let i=0;i<14;i++){const z=-.012+i*.0014;parts.push(twig([s*.0017,.001,z],[s*.0025,.0025,z-.0005],.000055,'#a69770'));}
  }
  return {body:combine(parts),fore,hind};
}

/** Individually cambered feathers, with their texture running along the shaft. */
function feather(a,b,width,colour){
  const axis=v(b[0]-a[0],0,b[2]-a[2]),length=axis.length();axis.normalize();const cross=v(-axis.z,0,axis.x),positions=[],colours=[],uvs=[],indices=[];
  const c=new THREE.Color(colour),along=9,across=5;
  for(const side of [1,-1])for(let j=0;j<=along;j++)for(let i=0;i<=across;i++){
    const t=j/along,s=i/across*2-1,w=width*(.08+.92*Math.sin(Math.PI*t)**.48)*(1-t*.65),p=v(...a).lerp(v(...b),t).addScaledVector(cross,s*w);
    p.y+=Math.sin(Math.PI*t)*.0015*(1-s*s)+side*.00013*(1-t*.8);
    positions.push(...p.toArray());const shade=1-.06*Math.abs(s)+.035*Math.sin(j*1.7);colours.push(c.r*shade,c.g*shade,c.b*shade);uvs.push(i/across,t);
  }
  const layer=(along+1)*(across+1);
  for(let j=0;j<along;j++)for(let i=0;i<across;i++){
    const a=j*(across+1)+i,b=a+1,c=a+across+1,d=c+1;indices.push(a,b,c,b,d,c,layer+a,layer+c,layer+b,layer+b,layer+c,layer+d);
  }
  const edge=[];for(let i=0;i<=across;i++)edge.push(i);for(let j=1;j<=along;j++)edge.push(j*(across+1)+across);for(let i=across-1;i>=0;i--)edge.push(along*(across+1)+i);for(let j=along-1;j>0;j--)edge.push(j*(across+1));
  for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,layer+a,b,b,layer+a,layer+b);}
  // Double-sided normals remain meaningful on the two feather surfaces.
  const g=finish(positions,colours,uvs);g.setIndex(indices);g.computeVertexNormals();return g.toNonIndexed();
}
export function birdShapes(){
  const positions=[],colours=[],uvs=[],indices=[],profile=[[-.078,.006,.008,-.002],[-.058,.016,.018,-.003],[-.025,.023,.026,0],[.022,.024,.027,.002],[.052,.015,.019,.008],[.073,.018,.019,.015],[.091,.014,.015,.014],[.104,.006,.006,.010],[.122,.0004,.0006,.008]],rings=[],n=24;
  for(let step=0;step<=(profile.length-1)*6;step++){
    const k=Math.min(profile.length-2,Math.floor(step/6)),t=step/6-k;
    rings.push([0,1,2,3].map(channel=>{
      const a=profile[Math.max(0,k-1)][channel],b=profile[k][channel],c=profile[k+1][channel],d=profile[Math.min(profile.length-1,k+2)][channel];
      const value=.5*(2*b+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
      return channel===1||channel===2?Math.max(.0002,value):value;
    }));
  }
  const back=new THREE.Color('#35434b'),belly=new THREE.Color('#d1ccba'),throat=new THREE.Color('#987657');
  for(let j=0;j<rings.length;j++)for(let i=0;i<=n;i++){
    const [z,rx,ry,cy]=rings[j],a=i/n*Math.PI*2,ny=Math.sin(a);positions.push(Math.cos(a)*rx,cy+ny*ry,z);
    const c=belly.clone().lerp(back,THREE.MathUtils.smoothstep(ny,-.22,.45));if(z>.052&&ny<-.2)c.lerp(throat,.65);
    colours.push(c.r,c.g,c.b);uvs.push(i/n,j/(rings.length-1));
  }
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+1,c=a+n+1,d=c+1;indices.push(a,b,c,b,d,c);}
  const core=finish(positions,colours,uvs);core.setIndex(indices);core.computeVertexNormals();const bodyParts=[core.toNonIndexed()];
  for(const side of [-1,1])bodyParts.push(oval(side*.0145,.022,.083,.0014,.0015,.0016,'#111b20'));
  const tailParts=[];
  for(const side of [-1,1])for(let i=0;i<4;i++)tailParts.push(feather([side*(.001+i*.003),-.003,-.060],[side*(.009+i*.009),-.006,-.112-i*.012],.0055,'#39464b'));
  const cover=new THREE.Shape();cover.moveTo(0,.031);cover.bezierCurveTo(.032,.035,.074,.025,.091,.009);cover.lineTo(.089,-.024);cover.bezierCurveTo(.070,-.022,.025,-.018,0,-.021);cover.lineTo(0,.031);
  const innerParts=[membrane(cover,[.026,.005],{camber:.0027,thickness:.0006})];
  paint(innerParts[0],'#3f5059');
  for(let i=0;i<7;i++)innerParts.push(feather([.010+i*.010,.001,.013-i*.001],[.010+i*.011,-.001,-.039+i*.001],.0069,'#4b5860'));
  const primaryCover=new THREE.Shape();primaryCover.moveTo(-.009,.022);primaryCover.quadraticCurveTo(.052,.025,.109,-.053);primaryCover.quadraticCurveTo(.071,-.056,.010,-.033);primaryCover.lineTo(-.009,-.026);primaryCover.lineTo(-.009,.022);
  const underlay=membrane(primaryCover,[.026,-.010],{camber:.0013,thickness:.00035});underlay.translate(0,-.0025,0);paint(underlay,'#40515a');
  const primaryParts=[underlay];
  for(let i=0;i<9;i++)primaryParts.push(feather([-.003+i*.003,.001,.014-i*.0035],[.038+i*.009,-.001,-.023-i*.005],.0100-i*.00035,i%3?'#404f57':'#4a5960'));
  return {body:combine(bodyParts),tail:combine(tailParts),inner:combine(innerParts),outer:combine(primaryParts)};
}

import * as THREE from 'three';
import {buildCoastalFog,coldCurrent,fogBounds} from './coastal-fog.js';

const {cols,rows}=fogBounds;
const clamp=n=>Math.min(1,Math.max(0,n));
const index=[];
for(let j=0;j<rows-1;j++)for(let i=0;i<cols-1;i++){
  const k=j*cols+i;
  index.push(k,k+cols,k+1,k+cols,k+cols+1,k+1);
}

function surfaceColors(field){
  const positions=[],colors=[];
  const warm=new THREE.Color('#67b4a7'),cold=new THREE.Color('#3687a3'),tint=new THREE.Color();
  field.cells.forEach(({x,z,sea,bed},k)=>{
    const i=k%cols,j=Math.floor(k/cols),edge=clamp(Math.min(i,j,cols-1-i,rows-1-j)/4);
    const cool=clamp((22.2-sea)/8.4);
    tint.copy(warm).lerp(cold,cool);
    positions.push(x,.12,z);
    colors.push(tint.r,tint.g,tint.b,bed<-.14?edge*(.10+.74*cool):0);
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
    vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide
  }));
  mesh.renderOrder=2;
  return mesh;
}

function bankLayer(field,height,opacity,order){
  const points=[],amount=[];
  field.cells.forEach(({x,z,bed,mist},k)=>{
    const i=k%cols,j=Math.floor(k/cols),edge=clamp(Math.min(i,j,cols-1-i,rows-1-j)/5);
    points.push(x,height,z);
    amount.push(mist*edge*clamp((height-bed)/6));
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  geometry.setAttribute('mist',new THREE.Float32BufferAttribute(amount,1));
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{opacity:{value:opacity},time:{value:0},wind:{value:field.wind==='onshore'?-1:1}},
    vertexShader:`
      attribute float mist;
      varying float amount;
      varying vec2 cell;
      void main(){
        amount=mist;
        cell=position.xz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
      }`,
    fragmentShader:`
      uniform float opacity;
      uniform float time;
      uniform float wind;
      varying float amount;
      varying vec2 cell;
      void main(){
        float z=cell.y-wind*time*5.2;
        float pattern=.74+.16*sin(cell.x*.025+sin(z*.028))+.10*cos(z*.042-cell.x*.017);
        gl_FragColor=vec4(.68,.77,.80,amount*opacity*pattern);
        #include <colorspace_fragment>
      }`
  });
  const plane=new THREE.Mesh(geometry,material);
  plane.renderOrder=order;
  return plane;
}

function flowArrows(samples,color){
  const points=[];
  for(const {x,y,z,dx,dz} of samples){
    points.push(x,y,z,x+dx,y,z+dz);
    for(const sign of [-1,1])points.push(x+dx,y,z+dz,x+dx*.75+sign*dz*.18,y,z+dz*.75-sign*dx*.18);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const arrows=new THREE.LineSegments(geometry,
    new THREE.LineBasicMaterial({color,transparent:true,opacity:.86,depthWrite:false}));
  arrows.renderOrder=12;
  return arrows;
}

export function createCoastalFogScene(scene){
  const root=new THREE.Group();
  root.name='Coastal current and advection fog';root.visible=false;scene.add(root);
  const bundles=new Map();
  let active=null;
  function prepare({sea,wind}){
    const key=sea+':'+wind;
    if(!bundles.has(key)){
      const field=buildCoastalFog(sea,wind),group=new THREE.Group();
      const water=surfaceColors(field);
      const layerProfiles=field.cells.some(p=>p.mist>.01)?[[2.1,.28],[5.9,.25],[10.2,.22],[15.8,.17],[23,.10]]:[];
      const layers=layerProfiles.map(([h,opacity],i)=>bankLayer(field,h,opacity,8-i));
      const currents=[],air=[];
      for(let x=1180;x<1820;x+=83)for(const z of [429,506,586]){
        if(coldCurrent(x,z)<.34)continue;
        const point=field.cells.find(p=>Math.abs(p.x-x)<6&&Math.abs(p.z-z)<6);
        if(!point||point.bed>-.4)continue;
        currents.push({x,y:1.25,z,dx:44,dz:4});
        air.push({x:x+20,y:23,z,dx:0,dz:wind==='onshore'?-42:42});
      }
      const arrows=new THREE.Group();
      arrows.add(flowArrows(currents,'#68d8ff'),flowArrows(air,'#ffe29c'));
      group.add(water,...layers,arrows);
      group.visible=false;root.add(group);
      bundles.set(key,{field,group,water,arrows,layers});
    }
    return bundles.get(key);
  }
  return {
    show(settings,time){
      const next=prepare(settings);
      if(active&&next!==active)active.group.visible=false;
      active=next;root.visible=true;next.group.visible=true;
      next.water.material.opacity=settings.overlay?.79:.32;
      next.arrows.visible=settings.overlay;
      for(const layer of next.layers)layer.material.uniforms.time.value=time;
    },
    hide(){root.visible=false;}
  };
}

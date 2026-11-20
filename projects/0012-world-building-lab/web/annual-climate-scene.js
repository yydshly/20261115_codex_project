import * as THREE from 'three';
import {climateAt,secondaryInflow} from './annual-climate.js';
import {getWorldAnnualModel,waterRoutes} from './world-climate-data.js';
export {annualGrid,waterRoutes,buildWorldAnnualModel,getWorldAnnualModel} from './world-climate-data.js';

function flowBand(points) {
  const positions=[],uv=[],indices=[];
  let distance=0, previous=null;
  for(let i=0;i<points.length;i++){
    const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
    const length=Math.hypot(b.x-a.x,b.z-a.z)||1, nx=p.nx??(a.z-b.z)/length,nz=p.nz??(b.x-a.x)/length;
    const breadth=Math.max(1.7,(p.half??3)*.83);
    if(i)distance+=Math.hypot(p.x-a.x,p.z-a.z);
    const row=positions.length/3;
    for(const side of [-1,1]) {
      const x=p.x+nx*breadth*side,z=p.z+nz*breadth*side;
      positions.push(x,p.level+.125,z);
      uv.push(distance,side);
    }
    if(previous!==null)indices.push(previous,row,previous+1,previous+1,row,row+1);
    previous=row;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);
  return geometry;
}

function windArrows(model) {
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([
    -32,0,-4, 13,0,-4, 13,0,4, -32,0,-4, 13,0,4, -32,0,4,
    9,0,-13, 34,0,0, 9,0,13
  ],3));
  const locations=[];
  const {x0,z0,cols,rows,step}=model.grid;
  for(let j=3;j<rows-2;j+=5)for(let i=3;i<cols-2;i+=5){
    const k=j*cols+i;
    locations.push({x:x0+i*step,z:z0+j*step,y:Math.max(0,model.height[k])+42,k});
  }
  const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({
    transparent:true,opacity:.83,side:THREE.DoubleSide,depthWrite:false,depthTest:false
  }),locations.length);
  mesh.name='monthly wind vectors';mesh.frustumCulled=false;mesh.renderOrder=42;
  return {mesh,locations};
}

function rainStreaks(model) {
  const seeds=[];
  const {x0,z0,cols,rows,step}=model.grid;
  for(let j=1;j<rows-1;j+=2)for(let i=1;i<cols-1;i+=2){
    const k=j*cols+i;
    if(model.height[k]<0)continue;
    const phase=(k*.61803399)%1;
    seeds.push({x:x0+i*step+(phase-.5)*34,z:z0+j*step+(.5-(k*.414213)%1)*36,k,phase});
  }
  const g=new THREE.BufferGeometry(),p=new THREE.BufferAttribute(new Float32Array(seeds.length*6),3);
  const c=new THREE.BufferAttribute(new Float32Array(seeds.length*6),3);
  p.setUsage(THREE.DynamicDrawUsage);c.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('position',p);g.setAttribute('color',c);
  const mesh=new THREE.LineSegments(g,new THREE.LineBasicMaterial({
    vertexColors:true,transparent:true,opacity:.85,depthWrite:false
  }));
  mesh.frustumCulled=false;mesh.renderOrder=41;
  return {mesh,seeds,p,c,g};
}

export function createAnnualClimateScene(scene,{weather,setFlood,readFlood,reduced=false}) {
  let model=null, texture=null, arrows=null, streaks=null, savedFlood=null, frame=null, mode='wind', time=0;
  const root=new THREE.Group(), flow=new THREE.Group(), routes=new Map();
  root.name='monthly regional climate';root.visible=false;root.add(flow);scene.add(root);
  const pose=new THREE.Object3D(),color=new THREE.Color();
  const humidColor=new THREE.Color('#67f3ee');

  function init(){
    model=getWorldAnnualModel();
    const {cols,rows}=model.grid;
    texture=new THREE.DataTexture(new Uint8Array(cols*rows*4),cols,rows);
    texture.magFilter=texture.minFilter=THREE.LinearFilter;
    arrows=windArrows(model);streaks=rainStreaks(model);
    root.add(arrows.mesh,streaks.mesh);
    for(const route of waterRoutes){
      const material=new THREE.ShaderMaterial({
        transparent:true,depthWrite:false,side:THREE.DoubleSide,
        uniforms:{elapsed:{value:0},strength:{value:0}},
        vertexShader:'varying vec2 band; void main(){ band=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader:`uniform float elapsed; uniform float strength; varying vec2 band;
          void main(){
            float width=.24+.73*strength;
            float edge=1.-smoothstep(width-.18,width,abs(band.y));
            float pulse=smoothstep(.12,.7,fract(band.x*.043-elapsed*(.3+.9*strength)));
            gl_FragColor=vec4(mix(vec3(.31,.52,.72),vec3(.64,1.,.99), strength),
              edge*(.19+.69*pulse*strength));
          }`
      });
      for(const path of route.paths){
        const mesh=new THREE.Mesh(flowBand(path),material);
        mesh.renderOrder=38;flow.add(mesh);
      }
      routes.set(route.id,material);
    }
  }

  function updateVisuals(){
    arrows.mesh.visible=mode==='wind';
    streaks.mesh.visible=mode==='rain';
    flow.visible=mode==='response';
    const {wind,moisture,rain,soil,snow,snowfall}=frame;
    const data=texture.image.data;
    for(let i=0;i<rain.length;i++){
      data[i*4]=Math.round(Math.min(1,rain[i]*10)*255);
      data[i*4+1]=Math.round(Math.min(1,soil[i]/.19)*255);
      data[i*4+2]=Math.round(Math.min(1,snow[i]*7)*255);
      data[i*4+3]=Math.round(Math.min(1,snowfall[i]*5)*255);
    }
    texture.needsUpdate=true;
    weather.setAnnualClimate(texture,model.grid,mode);
    for(const [id,mat] of routes)mat.uniforms.strength.value=frame.flow[id].index;
    // Reuse the original two actual water-surface geometries and restore the prior preset on exit.
    const flooded=frame.flow.north.index>=.73;
    if(readFlood()!==flooded)setFlood(flooded);
    streaks.active=streaks.seeds.filter(({k,phase})=>rain[k]>.012&&phase<rain[k]*11);
    streaks.g.setDrawRange(0,streaks.active.length*2);
    for(const [i,{x,z,y,k}] of arrows.locations.entries()){
      const coastal=secondaryInflow(frame.month,x,z);
      const dx=THREE.MathUtils.lerp(wind.dx,-Math.SQRT1_2,coastal);
      const dz=THREE.MathUtils.lerp(wind.dz,-Math.SQRT1_2,coastal);
      pose.position.set(x,y,z);pose.rotation.y=-Math.atan2(dz,dx);pose.scale.setScalar(.68+.9*moisture[k]);pose.updateMatrix();
      arrows.mesh.setMatrixAt(i,pose.matrix);
      arrows.mesh.setColorAt(i,color.set('#ffe3ad').lerp(humidColor,moisture[k]));
    }
    arrows.mesh.instanceMatrix.needsUpdate=true;arrows.mesh.instanceColor.needsUpdate=true;
  }
  return {
    show(month,layer){
      if(!model)init();
      if(!root.visible){savedFlood=readFlood();root.visible=true;}
      frame=model.frames[month-1];mode=layer;
      updateVisuals();
      return {frame,flooded:readFlood(),at:(x,z)=>climateAt(model,frame,x,z)};
    },
    hide(){
      if(!root.visible)return;
      root.visible=false;
      weather.setAnnualClimate(null);
      if(readFlood()!==savedFlood)setFlood(savedFlood);
      savedFlood=null;
    },
    update(dt){
      if(!root.visible)return;
      if(!reduced)time+=dt;
      if(flow.visible)for(const m of routes.values())m.uniforms.elapsed.value=time;
      if(arrows.mesh.visible)arrows.mesh.material.opacity=.78+.13*Math.sin(time*1.9);
      if(!streaks.mesh.visible)return;
      const {active,p,c}=streaks;
      for(let i=0;i<active.length;i++){
        const {x,z,k,phase}=active[i];
        const flakes=frame.snowfall[k]>frame.rain[k]*.52;
        const cycle=(phase+time*(flakes?.38:.99))%1,base=Math.max(0,model.height[k]);
        const y=base+22+cycle*195,dx=frame.wind.dx*(flakes?11:24),dz=frame.wind.dz*(flakes?11:24);
        p.setXYZ(i*2,x+dx*cycle,y,z+dz*cycle);
        p.setXYZ(i*2+1,x+dx*(cycle-.23),y+(flakes?7:26),z+dz*(cycle-.23));
        c.setXYZ(i*2,flakes?.85:.38,flakes?.93:.7,1);c.setXYZ(i*2+1,.72,.87,1);
      }
      p.needsUpdate=c.needsUpdate=true;
    }
  };
}

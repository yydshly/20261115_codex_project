import * as THREE from 'three';

/** Calibrate each hoof from its retained mesh, rather than an assumed ankle-to-ground height. */
export function createHoofGrounding(mesh,legs,surfaceHeight){
  const p=mesh.geometry.attributes.position,skin=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
  const profiles=legs.map((leg,i)=>{
    const cells=new Map(),inverse=mesh.skeleton.boneInverses[7+i*3];
    for(let index=0;index<p.count;index++){
      if(p.getY(index)>.085)continue;
      let influence=0;for(let j=0;j<4;j++)if(skin.getComponent(index,j)===7+i*3)influence+=weights.getComponent(index,j);
      if(influence<.999)continue;
      const key=Math.floor(p.getX(index)/.02)+':'+Math.floor(p.getZ(index)/.02),old=cells.get(key);
      if(old===undefined||p.getY(index)<p.getY(old))cells.set(key,index);
    }
    if(!cells.size)throw new Error('牛蹄缺少真实蹄底采样点');
    return [...cells.values()].map(index=>new THREE.Vector3().fromBufferAttribute(p,index).applyMatrix4(inverse));
  });
  const point=new THREE.Vector3(),normal=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),yaw=new THREE.Quaternion(),terrain=new Map();
  // The pasture is rendered on 0.5 m triangles. An aligned subdivision preserves that surface
  // while keeping repeated sole probes from rebuilding procedural terrain at every vertex.
  const vertex=(ix,iz)=>{const key=ix+':'+iz;if(!terrain.has(key))terrain.set(key,surfaceHeight(ix/8,iz/8));return terrain.get(key);};
  function height(x,z){
    const ix=Math.floor(x*8),iz=Math.floor(z*8),u=x*8-ix,v=z*8-iz;
    if(u+v<=1){const a=vertex(ix,iz);return a+(vertex(ix+1,iz)-a)*u+(vertex(ix,iz+1)-a)*v;}
    const d=vertex(ix+1,iz+1);return d+(vertex(ix,iz+1)-d)*(1-u)+(vertex(ix+1,iz)-d)*(1-v);
  }
  function orientation(x,z,heading,out){
    const e=.09,sx=(height(x+e,z)-height(x-e,z))/(e*2),sz=(height(x,z+e)-height(x,z-e))/(e*2);
    normal.set(-sx,1,-sz).normalize();return out.setFromUnitVectors(up,normal).multiply(yaw.setFromAxisAngle(up,heading));
  }
  function clearance(i,position,rotation,scale){
    let minimum=Infinity;
    for(const sample of profiles[i]){point.copy(sample).multiply(scale).applyQuaternion(rotation).add(position);minimum=Math.min(minimum,point.y-height(point.x,point.z));}
    return minimum;
  }
  function seat(i,position,rotation,scale){position.y+=.0015-clearance(i,position,rotation,scale);return position;}
  return {profiles,orientation,clearance,seat};
}

/** Small ambient contact patches complement the wider, lower-resolution moving sun shadow. */
export function createHoofContacts(parent,cattle,surfaceHeight){
  const strengths=new THREE.InstancedBufferAttribute(new Float32Array(cattle.length*4),1),geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);geometry.setAttribute('contactStrength',strengths);
  const material=new THREE.ShaderMaterial({
    uniforms:{contactColour:{value:new THREE.Color('#243021')},contactDebug:{value:0}},
    vertexShader:'attribute float contactStrength;varying vec2 contactUv;varying float contactFade;void main(){contactUv=uv;contactFade=contactStrength;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 contactColour;uniform float contactDebug;varying vec2 contactUv;varying float contactFade;void main(){vec2 q=(contactUv-.5)*2.;float alpha=pow(max(0.,1.-dot(q,q)),1.3)*contactFade*.50;if(alpha<.002)discard;gl_FragColor=vec4(mix(contactColour,vec3(0.,1.,.15),contactDebug),mix(alpha,.9,contactDebug));\n#include <colorspace_fragment>\n}',
    transparent:true,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,toneMapped:false
  });
  const patches=new THREE.InstancedMesh(geometry,material,cattle.length*4);patches.name='Actual hoof contacts · fade during swing';patches.frustumCulled=false;patches.castShadow=false;patches.userData.contactCaster=false;parent.add(patches);
  const dummy=new THREE.Object3D(),point=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  const centres=cattle.map(c=>c.behavior.gait.grounding.profiles.map(profile=>new THREE.Box3().setFromPoints(profile).getCenter(new THREE.Vector3())));
  function update(){
    for(let k=0;k<cattle.length;k++){
      const c=cattle[k];c.behavior.mesh.getWorldScale(scale);
      c.behavior.legBones.forEach(({hoof},i)=>{
        hoof.getWorldQuaternion(rotation);hoof.getWorldPosition(point);dummy.position.copy(centres[k][i]).multiply(scale).applyQuaternion(rotation).add(point);
        dummy.position.y=surfaceHeight(dummy.position.x,dummy.position.z)+.0015;dummy.quaternion.copy(rotation);dummy.scale.set(.21*scale.x,1,.26*scale.z);dummy.updateMatrix();patches.setMatrixAt(k*4+i,dummy.matrix);
        strengths.setX(k*4+i,c.group.visible?1-THREE.MathUtils.smoothstep(c.behavior.gait.feet[i].clearance,.006,.045):0);
      });
    }
    patches.instanceMatrix.needsUpdate=true;strengths.needsUpdate=true;
  }
  return {patches,update};
}

import * as THREE from 'three';

/** Share a bounded reflection capture across the main and glass transmission passes. */
export function budgetReflections(water,scene){
  const capture=water.onBeforeRender,position=new THREE.Vector3(),rotation=new THREE.Quaternion();
  const glassCache=new Map();let last=-Infinity,interval=.075,capturing=false;
  water.userData.reflectionCaptures=0;
  function reflectedGlass(material){
    if(!material.transmission)return material;
    if(!glassCache.has(material))glassCache.set(material,new THREE.MeshStandardMaterial({color:'#647a72',roughness:.14,metalness:.15,envMapIntensity:.7,side:THREE.FrontSide}));
    return glassCache.get(material);
  }
  water.onBeforeRender=function(renderer,world,camera,...rest){
    const time=water.material.uniforms.time.value;
    // Repeated calls at exactly the same animation time are offscreen passes.
    if(capturing||time===last)return;
    const moved=camera.position.distanceToSquared(position)>.75**2||camera.quaternion.angleTo(rotation)>.06;
    if(time-last<interval&&!moved){water.material.uniforms.eye.value.setFromMatrixPosition(camera.matrixWorld);return;}
    last=time;position.copy(camera.position);rotation.copy(camera.quaternion);capturing=true;
    const hidden=[],materials=[];
    scene.traverse(object=>{
      if(object.userData.omitFromReflection&&object.visible){hidden.push(object);object.visible=false;}
      if(!object.isMesh)return;
      const source=object.material,parts=Array.isArray(source)?source:[source];
      if(parts.some(m=>m.transmission>0)){
        materials.push([object,source]);object.material=Array.isArray(source)?parts.map(reflectedGlass):reflectedGlass(source);
      }
    });
    try{capture.call(water,renderer,world,camera,...rest);water.userData.reflectionCaptures++;}
    finally{for(const [object,material] of materials)object.material=material;for(const object of hidden)object.visible=true;capturing=false;}
  };
  return {setQuality(high){interval=high?.075:.12;last=-Infinity;}};
}

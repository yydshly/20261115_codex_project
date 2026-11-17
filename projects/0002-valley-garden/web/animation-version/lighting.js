import * as THREE from 'three';

export const foliageLighting={
  direction:{value:new THREE.Vector3(-48,65,40).normalize()},
  colour:{value:new THREE.Color('#fff4e6')},
  strength:{value:2.15}
};

/** One lighting state drives the scene, water highlights and leaf backlighting. */
export function createLightingRig(scene,renderer){
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const sun=new THREE.DirectionalLight('#fff1df',2.15);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-33,right:33,top:33,bottom:-33,near:1,far:180});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.007;sun.shadow.bias=-.000025;
  sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
  sun.target.position.set(0,0,-8);scene.add(sun,sun.target);
  const ambient=new THREE.HemisphereLight('#d8e3e9','#6c6651',.45);scene.add(ambient);
  const fill=new THREE.DirectionalLight('#d4e2e8',.08);fill.position.set(40,28,-60);scene.add(fill);
  const daySun=new THREE.Color('#fff1df'),eveningSun=new THREE.Color('#ffca95');
  const dayFog=new THREE.Color('#bbcdd1'),eveningFog=new THREE.Color('#b6a99e');
  let lastShadowLight=-Infinity;
  const shadowEye=new THREE.Vector3(Infinity,0,0),shadowRotation=new THREE.Quaternion();
  const shadowCentre=new THREE.Vector3(),lookAhead=new THREE.Vector3(),sunOffset=new THREE.Vector3();
  const lightDirection=new THREE.Vector3(),lightRight=new THREE.Vector3(),lightUp=new THREE.Vector3(),worldUp=new THREE.Vector3(0,1,0);
  let wasWalking=false;
  function update(t,landscape,camera){
    sunOffset.set(-48,65-t*37,40-t*10);
    const walking=Boolean(camera),moved=camera&&(camera.position.distanceToSquared(shadowEye)>.8**2||camera.quaternion.angleTo(shadowRotation)>.12);
    if(walking!==wasWalking||Math.abs(t-lastShadowLight)>.005||moved){
      if(camera){
        lookAhead.set(0,0,-1).applyQuaternion(camera.quaternion);lookAhead.y=0;lookAhead.normalize();
        shadowCentre.copy(camera.position).addScaledVector(lookAhead,10);shadowCentre.y=camera.position.y-1.7;
        // Align in the light's image plane, so recentering does not slide the shadow texels.
        lightDirection.copy(sunOffset).normalize();lightRight.crossVectors(worldUp,lightDirection).normalize();lightUp.crossVectors(lightDirection,lightRight);
        const texel=(sun.shadow.camera.right-sun.shadow.camera.left)/sun.shadow.mapSize.x;
        const u=Math.round(shadowCentre.dot(lightRight)/texel)*texel,v=Math.round(shadowCentre.dot(lightUp)/texel)*texel,w=shadowCentre.dot(lightDirection);
        shadowCentre.copy(lightRight).multiplyScalar(u).addScaledVector(lightUp,v).addScaledVector(lightDirection,w);
      }else shadowCentre.set(0,0,-8);
      sun.target.position.copy(shadowCentre);
      sun.shadow.needsUpdate=true;lastShadowLight=t;
      if(camera){shadowEye.copy(camera.position);shadowRotation.copy(camera.quaternion);}
    }
    wasWalking=walking;
    sun.position.copy(sunOffset).add(sun.target.position);sun.color.copy(daySun).lerp(eveningSun,t);sun.intensity=2.15-t*1.10;
    ambient.intensity=.45-t*.16;fill.intensity=.08-t*.035;
    scene.environmentIntensity=.75-t*.31;renderer.toneMappingExposure=1.-t*.08;
    if(scene.fog)scene.fog.color.copy(dayFog).lerp(eveningFog,t);
    foliageLighting.direction.value.copy(sun.position).sub(sun.target.position).normalize();
    foliageLighting.colour.value.copy(sun.color);foliageLighting.strength.value=sun.intensity;
    if(landscape){
      landscape.setEvening(t);
      landscape.water.material.uniforms.sunDirection.value.copy(foliageLighting.direction.value);
      landscape.water.material.uniforms.sunColor.value.copy(sun.color);
    }
  }
  update(0);return {sun,ambient,fill,update,invalidateShadows(){sun.shadow.needsUpdate=true;},setQuality(high){
    const size=high?2048:1024;sun.shadow.mapSize.set(size,size);
    sun.shadow.map?.setSize(size,size);sun.shadow.needsUpdate=true;lastShadowLight=-Infinity;
  }};
}

import * as THREE from 'three';

/** Thin architecture panes need full refraction only at inspection distance. */
export function createGlassBudget(scene){
  const entries=[],substitutes=new Set();let high=true,cheapCount=0,physicalCount=0;
  function cheap(material){
    const pane=new THREE.MeshPhysicalMaterial({name:material.name+' · thin pane',color:material.color,roughness:material.roughness,metalness:0,transparent:true,opacity:.12,premultipliedAlpha:true,depthWrite:false,side:THREE.FrontSide,ior:material.ior,envMapIntensity:material.envMapIntensity,specularIntensity:material.specularIntensity});
    pane.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        float paneF0=max3(material.specularColor);
        float paneFresnel=paneF0+(1.-paneF0)*pow(1.-clamp(abs(dot(normal,normalize(vViewPosition))),0.,1.),5.);
        diffuseColor.a=opacity+(1.-opacity)*paneFresnel;
        outgoingLight=totalSpecular+totalDiffuse*opacity;
        #include <opaque_fragment>
      `);
      // Reflection already carries its Fresnel weight; alpha must not dim it a second time.
      shader.fragmentShader=shader.fragmentShader.replace('#include <premultiplied_alpha_fragment>','');
    };
    pane.customProgramCacheKey=()=> 'thin-architecture-fresnel-1';
    substitutes.add(pane);return pane;
  }
  scene.traverse(object=>{
    if(!object.isMesh)return;const original=object.material,parts=Array.isArray(original)?original:[original];
    if(!parts.some(m=>m.transmission>0))return;
    const distant=Array.isArray(original)?parts.map(m=>m.transmission>0?cheap(m):m):cheap(original);
    object.geometry.computeBoundingBox();
    entries.push({object,original,distant,panes:(Array.isArray(distant)?distant:[distant]).filter(m=>substitutes.has(m)),physical:true,bounds:object.geometry.boundingBox.clone(),worldBounds:new THREE.Box3()});
  });
  function update(camera){
    cheapCount=0;physicalCount=0;
    for(const e of entries){
      e.object.updateWorldMatrix(true,false);
      const distance=e.worldBounds.copy(e.bounds).applyMatrix4(e.object.matrixWorld).distanceToPoint(camera.position),near=high?6:4,far=near+2;
      if(e.physical&&distance>far){e.object.material=e.distant;e.physical=false;}
      else if(!e.physical&&distance<near){e.object.material=e.original;e.physical=true;}
      for(const material of e.panes)material.opacity=THREE.MathUtils.lerp(.12,.26,THREE.MathUtils.smoothstep(distance,8,24));
      let visible=true;for(let parent=e.object;parent;parent=parent.parent)visible&&=parent.visible;
      if(visible){if(e.physical)physicalCount++;else cheapCount++;}
    }
  }
  return {update,get cheapCount(){return cheapCount;},get physicalCount(){return physicalCount;},get count(){return entries.length;},physical(){for(const e of entries){e.object.material=e.original;e.physical=true;}cheapCount=0;},setQuality(value){high=value;},dispose(){for(const e of entries)e.object.material=e.original;for(const material of substitutes.values())material.dispose();}};
}

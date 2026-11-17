import * as THREE from 'three';

/** Outdoor courtyard terrain uses the same 0.5 m triangles as the rendered near mesh. */
export function createCourtyardFooting(pathHeight,groundHeight){
  const cache=new Map();
  const vertex=(x,z)=>{const key=x+':'+z;if(!cache.has(key))cache.set(key,groundHeight(x,z));return cache.get(key);};
  return (x,z)=>{
    const cap=pathHeight(x,z);if(cap!==null)return cap;
    if(Math.max(Math.abs(x),Math.abs(z))>=60)return groundHeight(x,z);
    const gx=Math.floor(x*2)/2,gz=Math.floor(z*2)/2,u=(x-gx)*2,v=(z-gz)*2;
    const a=vertex(gx,gz),b=vertex(gx+.5,gz),c=vertex(gx,gz+.5),d=vertex(gx+.5,gz+.5);
    return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
  };
}

/** Follow the animated shoe soles without reskinning the whole character on the CPU. */
export function createFootGrounding(actor,surfaceHeight){
  actor.updateWorldMatrix(true,false);actor.updateMatrixWorld(true);
  const probes=[],point=new THREE.Vector3(),cells=new Map();
  actor.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    const skin=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
    const footBones=new Set(mesh.skeleton.bones.flatMap((bone,index)=>/Foot|Toe/.test(bone.name)?[index]:[]));
    if(!footBones.size)return;
    const candidates=[],bottom={left:Infinity,right:Infinity};
    for(let index=0;index<skin.count;index++){
      let footWeight=0;for(let i=0;i<4;i++)if(footBones.has(skin.getComponent(index,i)))footWeight+=weights.getComponent(index,i);
      if(footWeight<.5)continue;
      let left=0;for(let i=0;i<4;i++)if(/Left(?:Foot|Toe)/.test(mesh.skeleton.bones[skin.getComponent(index,i)]?.name))left+=weights.getComponent(index,i);
      const side=left>footWeight*.5?'left':'right';
      mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);bottom[side]=Math.min(bottom[side],point.y);
      candidates.push({index,side,x:point.x,y:point.y,z:point.z});
    }
    for(const {index,side,x,y,z}of candidates){
      if(y>bottom[side]+.13)continue;
      const key=mesh.uuid+':'+side+':'+Math.floor(x/.018)+':'+Math.floor(z/.018);
      const previous=cells.get(key);if(!previous||y<previous.y)cells.set(key,{mesh,index,y});
    }
  });
  for(const probe of cells.values())probes.push(probe);
  if(!probes.length)throw new Error('人物缺少可用于鞋底接地的蒙皮采样点');
  const state={samples:probes.length,clearance:0,correction:0,target:0};let initialized=false;
  return {state,update(dt){
    // The caller first places the root at its uncorrected route height.
    actor.updateWorldMatrix(true,false);actor.updateMatrixWorld(true);
    let minimum=Infinity;
    for(const {mesh,index}of probes){
      mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);
      minimum=Math.min(minimum,point.y-surfaceHeight(point.x,point.z));
    }
    state.target=THREE.MathUtils.clamp(.0015-minimum,-.10,.10);
    state.correction=initialized?THREE.MathUtils.lerp(state.correction,state.target,1-Math.exp(-dt*32)):state.target;
    initialized=true;actor.position.y+=state.correction;state.clearance=minimum+state.correction;
    actor.updateMatrixWorld(true);
  }};
}

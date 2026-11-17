import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const element=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let renderer;
try{
  const loaded=await window.loadResearchCatalog();if(loaded.mode==='static')throw Error('需要本机或公开媒体服务。');
  const catalog=loaded.catalog;const id=new URLSearchParams(location.search).get('asset');
  const file=catalog.files.find(f=>f.id===id&&f.extension==='glb');if(!file)throw Error('此工程没有登记为可用 GLB。');
  element('mesh-title').textContent=file.name;document.title=file.name+' · 只读结构预览';element('mesh-download').href=file.url+'?download=1';
  const container=element('mesh-view');renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x14271f);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  container.append(renderer.domElement);const scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1,.01,5000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
  scene.add(new T.HemisphereLight(0xdce9ff,0x514b31,2.5));const sun=new T.DirectionalLight(0xffe9cb,3);sun.position.set(8,15,7);scene.add(sun);
  const model=await new GLTFLoader().loadAsync(file.url);scene.add(model.scene);model.scene.updateMatrixWorld(true);
  const meshes=[],originalMaterials=new Map();let triangles=0;
  model.scene.traverse(object=>{if(object.isLight)object.visible=false;if(object.isMesh){meshes.push(object);originalMaterials.set(object,object.material);triangles+=(object.geometry.index?.count||object.geometry.attributes.position?.count||0)/3;}});
  element('mesh-count').textContent=`${meshes.length.toLocaleString()} 个网格 · 约 ${Math.round(triangles).toLocaleString()} 个三角形`;
  let selected=null,helper=null;const gray=new T.MeshStandardMaterial({color:0xbac1ad,roughness:.85,side:T.DoubleSide});
  function fit(object=model.scene){const bounds=new T.Box3().setFromObject(object),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const extent=Math.max(size.x,size.y,size.z,.05);controls.target.copy(center);camera.near=Math.max(.001,extent/10000);camera.far=Math.max(100,extent*100);camera.position.copy(center).add(new T.Vector3(.9,.5,.9).multiplyScalar(extent));camera.updateProjectionMatrix();controls.update();}
  function choose(object){selected=object;if(helper){scene.remove(helper);helper.geometry.dispose();helper.material.dispose();}helper=new T.BoxHelper(object,0xf0c479);scene.add(helper);element('selected-object').textContent=`所选：${object.name||'未命名部件'} · ${object.geometry.attributes.position.count.toLocaleString()} 顶点`;}fit();
  element('fit-model').onclick=()=>fit();element('focus-selected').onclick=()=>{if(selected)fit(selected);};
  function materials(){const wire=element('mesh-wire').checked,useGray=element('mesh-gray').checked;gray.wireframe=wire;for(const mesh of meshes){mesh.material=useGray?gray:originalMaterials.get(mesh);for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.wireframe=wire;}}
  element('mesh-wire').onchange=materials;element('mesh-gray').onchange=materials;
  const cameras=model.cameras||[];cameras.forEach((c,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=c.name||'导出相机 '+(i+1);element('mesh-camera').append(option);});
  element('mesh-camera').onchange=()=>{const value=element('mesh-camera').value;if(value==='fit'){fit();return;}const original=cameras[Number(value)];original.getWorldPosition(camera.position);original.getWorldQuaternion(camera.quaternion);if(original.isPerspectiveCamera)camera.fov=original.fov;camera.updateProjectionMatrix();controls.target.copy(camera.position).addScaledVector(new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion),5);controls.update();};
  function list(){const query=element('object-search').value.toLowerCase().trim();const items=meshes.map((object,index)=>({object,index})).filter(item=>(item.object.name||'未命名').toLowerCase().includes(query));element('object-list').innerHTML=`<p>显示前 ${Math.min(items.length,200)} / ${items.length} 个匹配物体；输入名称可定位其余部件。</p><ul>${items.slice(0,200).map(item=>`<li><button data-object="${item.index}">${escape(item.object.name||'未命名部件')}</button></li>`).join('')}</ul>`;}
  element('object-search').oninput=list;list();element('object-list').onclick=e=>{const button=e.target.closest('[data-object]');if(button){choose(meshes[Number(button.dataset.object)]);fit(selected);}};
  const raycaster=new T.Raycaster(),pointer=new T.Vector2();let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(meshes,false)[0];if(hit)choose(hit.object);});
  const resize=()=>{const width=container.clientWidth,height=container.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(container);resize();
  renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
  element('mesh-status').textContent='网格已加载 · '+file.group_title+' · 拖动可检查三维';
  window.addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);renderer.dispose();});
}catch(error){element('mesh-status').textContent='无法读取预览：'+error.message;element('mesh-status').classList.add('mesh-status-error');renderer?.dispose();}

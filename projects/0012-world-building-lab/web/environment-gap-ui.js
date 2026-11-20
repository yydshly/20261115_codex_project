import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {environmentGaps,gapKinds,gapFor} from './environment-gaps.js';

function routeGeometry(path){
  const points=[];
  for(let j=1;j<path.length;j++){
    const [ax,az]=path[j-1],[bx,bz]=path[j];
    const steps=Math.ceil(Math.hypot(bx-ax,bz-az)/32);
    for(let i=j===1?0:1;i<=steps;i++){
      const t=i/steps,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
      points.push(new THREE.Vector3(x,Math.max(0,terrainHeight(x,z))+19,z));
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function cameraFor(gap){
  const positions=gap.paths.length?gap.paths.flat():[gap.anchor];
  const xs=positions.map(p=>p[0]),zs=positions.map(p=>p[1]);
  const left=Math.min(...xs),right=Math.max(...xs),north=Math.min(...zs),south=Math.max(...zs);
  const x=(left+right)/2,z=(north+south)/2;
  return [x,z,Math.max(0,terrainHeight(x,z)),Math.max(770,(right-left)*1.18,(south-north)*1.04)];
}

export function mountEnvironmentGapSurvey(root,scene,onTopic){
  const document=root.ownerDocument;
  const pins=document.createElement('div');
  pins.id='plan-gap-pins';pins.hidden=true;pins.setAttribute('aria-label','地图上的环境缺口位置');
  document.body.append(pins);
  const overlay=new THREE.Group();
  overlay.name='Environment gap audit';overlay.visible=false;scene.add(overlay);
  root.innerHTML=`
    <h3>环境缺口与补全顺序</h3>
    <p class="plan-note">按对环境基座的影响排序。编号定位现有对照区，虚线标出剖面和待对照的关系。</p>
    <div class="plan-gap-key">${Object.values(gapKinds).map(({name,color})=>
      `<span style="--gap-tone:${color}">${name}</span>`).join('')}</div>
    <button type="button" data-gap-id="" id="plan-gap-all">查看全部位置</button>
    <label for="plan-gap-select">定位缺口</label>
    <select id="plan-gap-select"><option value="">全图</option>${environmentGaps.map(gap=>
      `<option value="${gap.id}">${gap.rank}. ${gap.name}</option>`).join('')}</select>
    <section id="plan-gap-detail" aria-live="polite"></section>
    <a class="plan-catalog-link" href="journey.html#next-steps">总览里的完整顺序与图谱条目 ↗</a>`;
  const select=root.querySelector('#plan-gap-select'),detail=root.querySelector('#plan-gap-detail');
  const ring=new THREE.RingGeometry(19,22,36);
  const marks=environmentGaps.map(gap=>{
    const [x,z]=gap.anchor,y=Math.max(0,terrainHeight(x,z))+23,color=gapKinds[gap.kind].color;
    const marker=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({
      color,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false
    }));
    marker.rotation.x=-Math.PI/2;marker.renderOrder=42;marker.position.set(x,y,z);
    overlay.add(marker);
    const button=document.createElement('button');
    button.type='button';button.dataset.gapId=gap.id;button.style.setProperty('--gap-tone',color);
    button.textContent=gap.rank+' '+gap.mapName;
    button.setAttribute('aria-label',gap.rank+'. '+gap.name);
    pins.append(button);
    return {gap,marker,button,labelY:y+33};
  });
  const paths=new Map(),vector=new THREE.Vector3();
  let selected=null,view=null;

  function selection(gap){
    selected=gap;view=gap?cameraFor(gap):null;select.value=gap?.id??'';
    root.querySelector('#plan-gap-all').setAttribute('aria-pressed',String(!gap));
    if(gap&&!paths.has(gap.id)){
      const lines=new THREE.Group();
      const material=new THREE.LineDashedMaterial({
        color:gapKinds[gap.kind].color,dashSize:24,gapSize:16,depthTest:false,depthWrite:false,toneMapped:false
      });
      for(const path of gap.paths){
        const line=new THREE.Line(routeGeometry(path),material);
        line.renderOrder=41;line.computeLineDistances();lines.add(line);
      }
      overlay.add(lines);paths.set(gap.id,lines);
    }
    for(const [id,lines] of paths)lines.visible=id===gap?.id;
    for(const item of marks){
      const current=item.gap===gap;
      item.marker.scale.setScalar(current?1.45:1);
      item.marker.material.opacity=!gap||current?1:.5;
      item.marker.material.transparent=!!gap&&!current;
      item.button.setAttribute('aria-pressed',String(current));
    }
    detail.innerHTML=gap?`
      <span class="plan-gap-kind" style="--gap-tone:${gapKinds[gap.kind].color}">${gapKinds[gap.kind].name}</span>
      <h4>${gap.rank}. ${gap.name}</h4><p class="plan-gap-region">${gap.region}</p>
      <dl><dt>已有</dt><dd>${gap.have}</dd><dt>${gap.kind==='connected'?'展示范围':'仍缺'}</dt><dd>${gap.gap}</dd>
        <dt>顺序依据</dt><dd>${gap.why}</dd><dt>${gap.kind==='connected'?'沿线观察':'补齐后应看到'}</dt><dd>${gap.check}</dd></dl>
      <button type="button" id="plan-gap-sample">${gap.sample.label} ↗</button>`:
      '<p class="plan-note">选择地图标记或下拉项，查看现有部分、待补内容和验收标准。</p>';
  }
  select.addEventListener('change',()=>selection(gapFor(select.value)));
  root.querySelector('#plan-gap-all').addEventListener('click',()=>selection(null));
  detail.addEventListener('click',event=>{
    if(event.target.closest('#plan-gap-sample')){
      const {mode,...context}=selected.sample;
      onTopic(mode,{...context,back:{mode:'gaps',name:'环境缺口',focus:selected.id}});
    }
  });
  pins.addEventListener('click',event=>{
    const pin=event.target.closest('button[data-gap-id]');
    if(pin)selection(gapFor(pin.dataset.gapId));
  });

  return {
    show(context={}){
      overlay.visible=true;pins.hidden=false;
      selection(Object.hasOwn(context,'focus')?gapFor(context.focus):selected);
    },
    hide(){overlay.visible=false;pins.hidden=true;},
    get view(){return view;},
    project(camera){
      for(const {marker,button,labelY} of marks){
        const {x,z}=marker.position;
        vector.set(x,labelY,z).project(camera);
        button.hidden=vector.z<=0||vector.z>=1||Math.abs(vector.x)>.95||Math.abs(vector.y)>.89;
        button.style.left=(vector.x*.5+.5)*100+'%';
        button.style.top=(.5-vector.y*.5)*100+'%';
      }
    }
  };
}

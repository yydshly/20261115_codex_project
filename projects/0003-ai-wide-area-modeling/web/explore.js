'use strict';
(() => {
  const D=window.RESEARCH,A=window.RESEARCH_ATLAS,C=window.RESEARCH_CONTEXT,I=window.INTEGRATED_RESEARCH_MAP;
  const $=s=>document.querySelector(s),escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const record=(file,label='原始实验记录 ↗')=>`<a href="records.html?file=${encodeURIComponent(file)}">${escape(label)}</a>`;
  const params=new URLSearchParams(location.search),byId=new Map(D.experiments.map(e=>[e.id,e]));
  let activeExperiment=byId.has(params.get('experiment'))?params.get('experiment'):'bridge',catalog=null,local=false,records=[];
  let knowledgeMode='overview',catalogFilter=['all','tested','code','product','read'].includes(params.get('catalog'))?params.get('catalog'):'all',knowledgeSections={};

  class ZoomCanvas {
    constructor(name,width,height,fit){
      this.name=name;this.width=width;this.height=height;this.scale=1;this.mode=fit;this.viewport=$(`#${name}-viewport`);this.surface=$(`#${name}-surface`);this.slider=$(`#${name}-scale`);this.output=$(`#${name}-zoom`);
      this.slider.addEventListener('input',()=>this.set(Number(this.slider.value)/100));
      this.viewport.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const r=this.viewport.getBoundingClientRect();this.set(this.scale*Math.exp(-e.deltaY*.004),e.clientX-r.left,e.clientY-r.top);},{passive:false});
      let pointer=null,moved=false;
      this.viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,left:this.viewport.scrollLeft,top:this.viewport.scrollTop};moved=false;});
      this.viewport.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(!moved&&Math.hypot(dx,dy)<5)return;moved=true;this.viewport.setPointerCapture(e.pointerId);this.viewport.classList.add('dragging');this.viewport.scrollLeft=pointer.left-dx;this.viewport.scrollTop=pointer.top-dy;});
      const stop=()=>{pointer=null;this.viewport.classList.remove('dragging');};
      this.viewport.addEventListener('pointerup',stop);this.viewport.addEventListener('pointercancel',stop);
      this.viewport.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}},true);
      this.viewport.addEventListener('keydown',e=>{if(e.target!==this.viewport)return;if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')this.fit('all');else this.set(this.scale*(e.key==='-'?1/1.25:1.25));}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();this.viewport.scrollBy({left:({ArrowLeft:-60,ArrowRight:60}[e.key]||0),top:({ArrowUp:-60,ArrowDown:60}[e.key]||0),behavior:'instant'});}});
      new ResizeObserver(()=>{if(this.mode)this.fit(this.mode,false);}).observe(this.viewport);
      this.fit(fit);
    }
    set(value,x=this.viewport.clientWidth/2,y=this.viewport.clientHeight/2,mode=null){
      const next=Math.max(Number(this.slider.min)/100,Math.min(Number(this.slider.max)/100,value));
      const anchorX=(this.viewport.scrollLeft+x)/this.scale,anchorY=(this.viewport.scrollTop+y)/this.scale;
      this.scale=next;this.mode=mode;this.surface.style.width=this.width*next+'px';this.surface.style.height=this.height*next+'px';this.surface.style.setProperty('--canvas-scale',next);this.slider.value=String(Math.round(next*100));this.output.textContent=Math.round(next*100)+'%';
      this.viewport.scrollLeft=anchorX*next-x;this.viewport.scrollTop=anchorY*next-y;
    }
    fit(mode,reset=true){const w=(this.viewport.clientWidth-26)/this.width,h=(this.viewport.clientHeight-26)/this.height;const value=mode==='width'?w:Math.min(w,h);if(!reset){this.set(value,this.viewport.clientWidth/2,this.viewport.clientHeight/2,mode);return;}this.set(value,0,0,mode);this.viewport.scrollLeft=0;this.viewport.scrollTop=0;}
    top(y){this.fit('width');this.viewport.scrollTop=y*this.scale;}
    focusRect(rect){this.set((this.viewport.clientWidth-38)/(rect.width+30),0,0);this.viewport.scrollLeft=Math.max(0,(rect.x-14)*this.scale);this.viewport.scrollTop=Math.max(0,(rect.y-14)*this.scale);}
  }
  $('#poster-surface img').src=I.image;$('#poster-surface img').width=I.width;$('#poster-surface img').height=I.height;$('#integrated-size').textContent=I.width+' × '+I.height;
  const canvases={poster:new ZoomCanvas('poster',I.width,I.height,'all'),graph:new ZoomCanvas('graph',1120,1040,'width')};
  document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{const [name,action]=button.dataset.zoom.split(':'),c=canvases[name];if(['all','width'].includes(action))c.fit(action);else c.set(action==='actual'?1:c.scale*(action==='in'?1.3:1/1.3));}));
  const integratedStages=new Map(I.stages.map(s=>[s.id,s]));
  const stageShort={input:'01 输入证据',geometry:'02 相机几何',completion:'03 空间补全',validate:'04 空间检验',sharp:'A 单图 SHARP',gaussian:'05A 高斯外观',mesh:'05B 实体结构',viewer:'C 渲染检查',binding:'06 对齐绑定',lighting:'07 材质换光',delivery:'08 交付验收'};
  $('#integrated-stage-links').innerHTML='<span>放大步骤</span>'+I.stages.map(s=>`<button data-integrated-focus="${s.id}">${escape(stageShort[s.id])}</button>`).join('');
  for(const s of I.stages){const option=document.createElement('option');option.value=s.id;option.textContent=stageShort[s.id];$('#integrated-stage-select').append(option);}
  function focusIntegratedStage(id){const rect=integratedStages.get(id);if(rect){canvases.poster.focusRect(rect);$('#integrated-stage-select').value=id;if(!$('#poster-shell').classList.contains('expanded'))$('#poster-viewport').scrollIntoView({block:'center'});}}
  $('#integrated-stage-select').addEventListener('change',e=>focusIntegratedStage(e.target.value));
  $('#integrated-stage-links').addEventListener('click',e=>{const b=e.target.closest('[data-integrated-focus]');if(b)focusIntegratedStage(b.dataset.integratedFocus);});
  function expandPoster(expanded){$('#poster-shell').classList.toggle('expanded',expanded);document.body.classList.toggle('poster-is-expanded',expanded);$('#close-poster-expanded').hidden=!expanded;$('#expand-poster').setAttribute('aria-expanded',String(expanded));(expanded?$('#close-poster-expanded'):$('#expand-poster')).focus();}
  $('#expand-poster').addEventListener('click',()=>expandPoster(true));$('#close-poster-expanded').addEventListener('click',()=>expandPoster(false));
  function expandGraph(expanded){$('#graph-shell').classList.toggle('expanded',expanded);document.body.classList.toggle('graph-is-expanded',expanded);$('#close-graph-expanded').hidden=!expanded;$('#expand-graph').setAttribute('aria-expanded',String(expanded));canvases.graph.fit(expanded&&knowledgeMode==='flow'?'all':'width');(expanded?$('#close-graph-expanded'):$('#expand-graph')).focus();}
  $('#expand-graph').addEventListener('click',()=>expandGraph(true));$('#close-graph-expanded').addEventListener('click',()=>expandGraph(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#graph-shell').classList.contains('expanded'))expandGraph(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#poster-shell').classList.contains('expanded'))expandPoster(false);});
  $('#poster-hotspots').innerHTML=I.stages.map(s=>`<a class="poster-hotspot" data-integrated-node="${s.id}" href="?node=${s.id}#architecture" style="left:${s.x/I.width*100}%;top:${s.y/I.height*100}%;width:${s.width/I.width*100}%;height:${s.height/I.height*100}%" aria-label="查看${escape(stageShort[s.id])}对应的技术、库、复盘与实验证据"><span>${escape(stageShort[s.id].split(' ')[0])} → 证据</span></a>`).join('');

  const ns='http://www.w3.org/2000/svg',svg=$('#architecture-svg'),nodeWidth=225,nodeHeight=135;
  function element(tag,attrs={},text=''){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;}
  const defs=element('defs'),marker=element('marker',{id:'graph-arrow',viewBox:'0 0 10 10',refX:'9',refY:'5',markerWidth:'7',markerHeight:'7',orient:'auto-start-reverse'});marker.append(element('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#81937e'}));defs.append(marker);svg.append(defs);
  svg.append(element('rect',{width:1120,height:1040,fill:'#edf0e7'}));
  svg.append(element('text',{x:25,y:35,class:'graph-label'},'目标路线：先共同空间，再让高斯与实体协作'));
  svg.append(element('text',{x:25,y:550,class:'graph-label'},'已实测支线（不经 VGGT）'));
  svg.append(element('text',{x:565,y:274,class:'graph-gap-label'},'未通过 → 返回补全；本批图没有训练高斯'));
  svg.append(element('path',{d:'M 918 225 C 918 247 687 247 687 225',fill:'none',stroke:'#a86c48','stroke-width':2,'stroke-dasharray':'6 5','marker-end':'url(#graph-arrow)'}));
  const nodeMap=new Map(A.nodes.map(n=>[n.id,n]));
  function edgePath(a,b,type){
    if(type==='photo')return `M ${a.x+110} ${a.y} C ${a.x+110} 48 ${b.x+110} 48 ${b.x+110} ${b.y}`;
    if(a.y!==b.y){const sx=a.x+112,sy=a.y+135,tx=b.x+112,ty=b.y,my=(sy+ty)/2;return `M ${sx} ${sy} C ${sx} ${my} ${tx} ${my} ${tx} ${ty}`;}
    const sx=a.x+225,sy=a.y+67,tx=b.x,ty=b.y+67,mx=(sx+tx)/2;
    return `M ${sx} ${sy} C ${mx} ${sy} ${mx} ${ty} ${tx} ${ty}`;
  }
  for(const [from,to,type,label]of A.edges){const a=nodeMap.get(from),b=nodeMap.get(to),g=element('g',{class:`graph-edge ${type==='quick'?'quick':'pending'}`,'data-from':from,'data-to':to,'data-edge-route':type});g.append(element('path',{d:edgePath(a,b,type)}));let x=(a.x+225+b.x)/2,y=(a.y+b.y)/2+51;if(a.y!==b.y){x=(a.x+b.x)/2+140;y=(a.y+135+b.y)/2+6;}if(type==='photo'){x=650;y=52;}g.append(element('text',{x,y,'text-anchor':'middle'},label));svg.append(g);}
  for(const node of A.nodes){const g=element('g',{class:`graph-node ${node.state}`,transform:`translate(${node.x} ${node.y})`,'data-node':node.id,role:'button',tabindex:'0','aria-label':`${node.title}，${node.tag}，点击查看输入输出和实验证据`,'aria-pressed':'false'});g.append(element('title',{},node.capability));g.append(element('rect',{width:nodeWidth,height:nodeHeight,rx:10}));g.append(element('circle',{cx:18,cy:22,r:5,class:'state-dot'}));g.append(element('text',{x:30,y:28,class:'node-state'},node.tag));g.append(element('text',{x:16,y:68,class:'node-title'},node.title));g.append(element('text',{x:16,y:104,class:'node-sub'},node.sub));svg.append(g);}
  const pipelineLayer=element('g',{id:'pipeline-layer'});
  for(const child of [...svg.children])if(!['title','desc','defs'].includes(child.tagName.toLowerCase()))pipelineLayer.append(child);
  svg.append(pipelineLayer);const knowledgeLayer=element('g',{id:'research-knowledge'});svg.append(knowledgeLayer);
  $('#node-list').innerHTML=A.nodes.map(n=>`<button data-node="${n.id}" aria-pressed="false">${escape(n.title)}</button>`).join('');
  let route='target',selectedNode='completion';
  function showNode(id){
    const n=nodeMap.get(id);if(!n)return;selectedNode=id;
    $('#node-detail').hidden=false;$('#knowledge-detail').hidden=true;
    document.querySelectorAll('[data-node]').forEach(e=>{const selected=e.dataset.node===id;e.setAttribute('aria-pressed',String(selected));e.classList.toggle('selected',selected);});
    $('#node-detail').innerHTML=`<div class="node-meta"><span class="badge ${n.state==='gap'?'warn':n.state==='tested'?'ok':'neutral'}">${escape(n.tag)}</span><span>${escape(n.kind)}</span></div><h3>${escape(n.title)}</h3><p>${escape(n.capability)}</p><div class="io-grid"><div><h4>输入什么</h4><p>${escape(n.input)}</p></div><div><h4>输出什么</h4><p>${escape(n.output)}</p></div></div><h4>涉及的库、模型与工具</h4><div class="library-tags">${n.libs.map(l=>`<span>${escape(l)}</span>`).join('')}</div><div class="node-limit"><b>能力边界 / 当前状态</b><p>${escape(n.limit)}</p></div><div class="node-links"><span>关联实验</span>${n.experiments.map(id=>`<button data-experiment-link="${id}">${escape(byId.get(id).title)}</button>`).join('')}${record(n.record,'依据与原文 ↗')}</div>`;
    $('#node-detail').innerHTML+=`<div class="node-research"><h4>本环节的复盘、技术与探索目录</h4><div>${C.failures.filter(f=>f.nodes.includes(id)).map(f=>`<button data-failure="${f.id}">${escape(f.title)}</button>`).join('')}${C.technologies.filter(t=>t.nodes.includes(id)).map(t=>`<button data-technology="${t.id}">已用：${escape(t.title)}</button>`).join('')}${D.products.filter(p=>C.productNodes[p.name]?.includes(id)).map(p=>`<button data-product="${escape(p.name)}">${escape(p.name)} · ${p.status==='tested'?'实测':p.status==='read'?'调研':'提及'}</button>`).join('')}</div></div>`;
  }
  function showRoute(id){route=id;const r=A.routes[id],included=new Set(r.nodes.length?r.nodes:A.nodes.map(n=>n.id));$('#route-note').textContent=r.note;
    if(!['overview','flow'].includes(knowledgeMode))showKnowledgeMode('flow');
    document.querySelectorAll('[data-route]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.route===id)));
    svg.querySelectorAll('[data-node]').forEach(g=>g.classList.toggle('dimmed',!included.has(g.dataset.node)));
    svg.querySelectorAll('.graph-edge').forEach(g=>{const t=g.dataset.edgeRoute;g.classList.toggle('dimmed',id!=='all'&&!(included.has(g.dataset.from)&&included.has(g.dataset.to)&&(id==='photo'?t!=='quick'&&!(g.dataset.from==='geometry'&&g.dataset.to==='completion'):t!=='photo')));});
    showNode(r.select);
  }
  document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>showRoute(b.dataset.route)));
  const selectNode=e=>{const n=e.target.closest('[data-node]');if(n){showNode(n.dataset.node);if($('#graph-shell').classList.contains('expanded')){expandGraph(false);$('#node-detail').scrollIntoView({block:'start'});}else if(e.currentTarget===$('#node-list'))$('#node-detail').scrollIntoView({block:'nearest'});}};
  svg.addEventListener('click',selectNode);$('#node-list').addEventListener('click',selectNode);svg.addEventListener('keydown',e=>{if(e.target.closest('[data-node]')&&['Enter',' '].includes(e.key)){e.preventDefault();selectNode(e);}});
  showRoute('target');
  function showKnowledgeMode(mode){
    knowledgeMode=mode;const built=C.build(D,mode,catalogFilter),height=mode==='flow'?1040:built.height;
    pipelineLayer.setAttribute('display',['overview','flow'].includes(mode)?'inline':'none');
    knowledgeLayer.innerHTML=mode==='flow'?'':`<rect x="0" y="${mode==='overview'?1040:0}" width="1120" height="${height-(mode==='overview'?1040:0)}" fill="#edf0e7"/>`+built.markup;
    knowledgeSections=built.sections;canvases.graph.height=height;svg.setAttribute('viewBox',`0 0 1120 ${height}`);canvases.graph.fit('width');
    const names={overview:'流程 + 7 项复盘 + 6 组已用技术 + 29 项探索目录',flow:'流程分工与两条实际／目标路线',failures:'7 项未通过、未改善与未验证复盘',used:'6 组实际用过的技术与方法',catalog:'库、模型、产品与服务目录'};
    $('#knowledge-status').textContent=names[mode]+'。图内卡片可点击查看完整说明与证据；目录沿用既有研究快照，不表示已调用所有产品。';
    $('#catalog-filters').hidden=!['overview','catalog'].includes(mode);$('#node-list').hidden=!['overview','flow'].includes(mode);
    $('#node-detail').hidden=!['overview','flow'].includes(mode);$('#knowledge-detail').hidden=true;
    document.querySelectorAll('[data-knowledge-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.knowledgeMode===mode)));
    document.querySelectorAll('[data-catalog-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.catalogFilter===catalogFilter)));
    $('#graph-title').textContent='单图到 3D 的研究全景 · '+names[mode];
    const address=new URL(location.href);address.searchParams.set('layer',mode);address.searchParams.set('catalog',catalogFilter);address.searchParams.delete('node');history.replaceState(null,'',address);
  }
  function jumpKnowledge(section){if(section==='flow'){if(!['overview','flow'].includes(knowledgeMode))showKnowledgeMode('overview');canvases.graph.viewport.scrollTop=0;return;}if(!(section in knowledgeSections))showKnowledgeMode('overview');canvases.graph.viewport.scrollTop=knowledgeSections[section]*canvases.graph.scale;}
  const contextExperimentLinks=ids=>ids.map(id=>`<button data-experiment-link="${id}">${escape(byId.get(id).title)}</button>`).join('');
  const contextNodeLinks=ids=>`<div class="context-links"><span>对应流程</span>${ids.map(id=>`<button data-context-node="${id}">${escape(nodeMap.get(id).title)}</button>`).join('')}</div>`;
  function showKnowledgeDetail(kind,id){
    const panel=$('#knowledge-detail');let html='';
    if(kind==='failure'){const f=C.failures.find(f=>f.id===id);if(!f)return;html=`<span class="badge warn">${escape(f.status)}</span><h3>${escape(f.title)}</h3><div class="context-copy"><h4>实际证据</h4><p>${escape(f.evidence)}</p><h4>哪些能力仍然成立</h4><p>${escape(f.retained)}</p><h4>原因候选与判断边界</h4><p>${escape(f.cause)}</p><h4>下一道验收</h4><p>${escape(f.next)}</p></div>${contextNodeLinks(f.nodes)}<div class="context-links"><span>实际效果 / 三维 / 工程</span>${contextExperimentLinks(f.experiments)}</div>`;}
    if(kind==='technology'){const t=C.technologies.find(t=>t.id===id);if(!t)return;html=`<span class="badge ok">本研究实际用过</span><h3>${escape(t.title)}</h3><div class="library-tags">${t.tools.map(x=>`<span>${escape(x)}</span>`).join('')}</div><div class="context-copy"><h4>负责的能力</h4><p>${escape(t.ability)}</p><h4>没有自动解决什么</h4><p>${escape(t.boundary)}</p></div>${contextNodeLinks(t.nodes)}<div class="context-links">${contextExperimentLinks(t.experiments)}</div>`;}
    if(kind==='product'){const p=D.products.find(p=>p.name===id);if(!p)return;const labels={tested:'本运河图已实测',read:'仅调研 · 本图未运行',mentioned:'仅提及 / 接口待核对'};const sources=p.sources.map(id=>D.sources.find(s=>s[0]===id)).filter(Boolean);html=`<span class="badge ${p.status==='tested'?'ok':'neutral'}">${labels[p.status]}</span><h3>${escape(p.name)}</h3><p>${escape(p.kind)} / ${escape(p.category)}</p><div class="context-copy"><h4>输入 → 输出</h4><p>${escape(p.io)}</p><h4>对我们的价值</h4><p>${escape(p.value)}</p><h4>当前限制与尚未解决的部分</h4><p>${escape(p.limit)}</p><h4>已有成本与条件记录</h4><p>${escape(p.cost)}</p><small>沿用既有研究快照；本次未确认最新价格、账户额度或许可变更。代码、权重与商业服务许可需分别核对。</small></div>${contextNodeLinks(C.productNodes[p.name]||[])}<div class="context-links">${sources.map(s=>`<a href="${escape(s[2])}" target="_blank" rel="noopener">${escape(s[1])} ↗</a>`).join('')}${p.record?record(p.record):''}</div>`;}
    if(!html)return;panel.innerHTML=html;panel.hidden=false;$('#node-detail').hidden=true;if($('#graph-shell').classList.contains('expanded'))expandGraph(false);panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});
  }
  document.querySelectorAll('[data-knowledge-mode]').forEach(b=>b.addEventListener('click',()=>showKnowledgeMode(b.dataset.knowledgeMode)));
  document.querySelectorAll('[data-catalog-filter]').forEach(b=>b.addEventListener('click',()=>{catalogFilter=b.dataset.catalogFilter;showKnowledgeMode(knowledgeMode);jumpKnowledge('catalog');}));
  $('.graph-expanded-tools').insertAdjacentHTML('beforeend','<button data-knowledge-jump="flow">流程</button><button data-knowledge-jump="failures">未通过</button><button data-knowledge-jump="used">已用技术</button><button data-knowledge-jump="catalog">库与产品</button>');
  document.addEventListener('click',e=>{const jump=e.target.closest('[data-knowledge-jump]');if(jump)jumpKnowledge(jump.dataset.knowledgeJump);for(const kind of ['failure','technology','product']){const trigger=e.target.closest(`[data-${kind}]`);if(trigger)showKnowledgeDetail(kind,trigger.dataset[kind]);}const node=e.target.closest('[data-context-node]');if(node){showKnowledgeMode('flow');showNode(node.dataset.contextNode);$('#node-detail').scrollIntoView({block:'start'});}});
  knowledgeLayer.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){const trigger=e.target.closest('[data-failure],[data-technology],[data-product]');if(trigger){e.preventDefault();trigger.dispatchEvent(new MouseEvent('click',{bubbles:true}));}}});
  showKnowledgeMode(['overview','flow','failures','used','catalog'].includes(params.get('layer'))?params.get('layer'):'overview');
  function openIntegratedNode(id){if(!nodeMap.has(id))return;if($('#poster-shell').classList.contains('expanded'))expandPoster(false);showKnowledgeMode('flow');showNode(id);$('#node-detail').scrollIntoView({block:'start'});const address=new URL(location.href);address.searchParams.set('node',id);address.hash='architecture';history.replaceState(null,'',address);}
  document.addEventListener('click',e=>{const link=e.target.closest('[data-integrated-node]');if(link&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();openIntegratedNode(link.dataset.integratedNode);}});
  if(params.get('node'))openIntegratedNode(params.get('node'));
  $('#download-architecture').addEventListener('click',()=>{const clone=svg.cloneNode(true);clone.setAttribute('width','1120');clone.setAttribute('height',String(canvases.graph.height));clone.querySelectorAll('.dimmed').forEach(e=>e.classList.remove('dimmed'));clone.querySelectorAll('.selected').forEach(e=>e.classList.remove('selected'));const style=element('style');style.textContent=Array.from(document.styleSheets).filter(s=>s.href?.endsWith('explore.css')).flatMap(s=>Array.from(s.cssRules).filter(r=>r.selectorText?.split(',').some(v=>v.trim().startsWith('.graph-'))).map(r=>r.cssText)).join('\n');clone.prepend(style);const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='canal-image-to-3d-'+knowledgeMode+'.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});

  const size=b=>b>=1048576?(b/1048576).toFixed(1)+' MiB':(b/1024).toFixed(1)+' KiB';
  function effectUrl(id,section,extra=''){const m=A.experiments[id];return `effects.html?experiment=${encodeURIComponent(id)}&group=${encodeURIComponent(m.group)}${extra}#${section}`;}
  function fileRow(f){return `<tr><td>${escape(f.name)}<small>${escape(f.group_title)} · ${escape(f.extension.toUpperCase())} / ${size(f.bytes)}</small></td><td><div class="file-links">${f.preview?`<a href="${escape(f.preview)}" target="_blank" rel="noopener">${f.extension==='blend'?'关联 GLB 结构预览':'拖动查看结构'} ↗</a>`:''}${f.extension==='ply'?'<span>高斯／几何数据，不能直接当网格</span>':''}${window.researchPublication.downloadLink(f)}</div></td></tr>`;}
  function showExperiment(id,jump=false){
    if(!byId.has(id))return;activeExperiment=id;const exp=byId.get(id),m=A.experiments[id];
    document.querySelectorAll('[data-evidence]').forEach(b=>{const active=b.dataset.evidence===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
    const images=catalog?.images.filter(x=>x.group===m.group)||[],projects=catalog?.files.filter(f=>(f.group===m.group&&f.kind==='project')||(f.group==='previews'&&m.previews?.includes(f.name)))||[],data=catalog?.files.filter(f=>f.group===m.group&&f.kind==='data')||[];
    const videos=m.videos.map(i=>({index:i,...catalog?.videos[i]})).filter(v=>v.available),scene=catalog?.scenes.find(s=>s.id===m.scene);
    const reports=records.filter(file=>file.startsWith('assets/'+m.group+'/'));
    const panel=$('#evidence-detail');panel.setAttribute('aria-labelledby','evidence-'+id);
    panel.innerHTML=`<div class="evidence-overview"><figure><a href="${escape(exp.image)}" target="_blank" rel="noopener" aria-label="打开${escape(exp.title)}的实际效果原图"><img src="${escape(exp.image)}" alt="${escape(exp.alt)}"></a><figcaption>${escape(exp.alt)} · 点击查看原图</figcaption><div class="extra-evidence">${exp.extra.map(([title,url])=>`<a href="${escape(url)}" target="_blank" rel="noopener">${escape(title)} ↗</a>`).join('')}</div></figure><div><span class="badge ${escape(exp.tone)}">${escape(exp.status)}</span><h3>${escape(exp.title)}</h3><p class="flow">${escape(exp.flow)}</p><p>${escape(exp.result)}</p><div class="limit"><b>证据边界</b><p>${escape(exp.limit)}</p></div><div class="evidence-direct">${record(exp.doc)}<a href="${escape(effectUrl(id,'images'))}">本实验全部效果 ${images.length?`(${images.length})`:''} ↗</a><button class="text-button" data-locate-poster="${id}">在总图定位 ↑</button></div></div></div><div class="evidence-products"><div class="artifact-grid"><div class="artifact-tile"><h4>完整视频</h4>${videos.length?videos.map(v=>`<a href="${escape(effectUrl(id,'videos','&video='+v.index))}">播放：${escape(v.title)} · ${v.duration} 秒 ↗</a><small>${escape(v.note)}</small>`).join(''):`<p>${m.videos.length&&!local?'需要本机服务读取已有 MP4。':'本次没有独立 MP4；效果图与诊断记录保留。'}</p>`}</div><div class="artifact-tile"><h4>三维场景 / 结构预览</h4>${scene?`<a href="${escape(effectUrl(id,'scenes','&scene='+scene.id))}">进入：${escape(scene.title)} ↗</a><small>${escape(scene.note)} · 按需加载</small>`:`<p>${m.scene&&!local?'需要本机服务读取三维查看器。':'没有独立的高斯漫游场景。'}</p>`}${projects.filter(f=>f.preview&&f.extension==='glb').map(f=>`<a href="${escape(f.preview)}" target="_blank" rel="noopener">拖动查看 ${escape(f.name)} ↗</a>`).join('')}</div></div>${m.none?`<p class="empty-artifact">${escape(m.none)}${m.source?` <button class="text-button" data-experiment-link="${m.source}">查看来源实验 →</button>`:''}</p>`:''}<div class="evidence-files"><h4>工程与几何文件 ${projects.length?`· ${projects.length} 份`:''}</h4>${projects.length?`<div class="table-wrap"><table class="artifact-table"><thead><tr><th>实际文件与来源</th><th>预览 / 下载</th></tr></thead><tbody>${projects.map(fileRow).join('')}</tbody></table></div>`:`<p class="explore-help">${local?'本次没有独立的 .blend / GLB / PLY 工程产物。':'静态导出不复制本机大型工程；请使用本项目 start.cmd 启动只读媒体服务。'}</p>`}<p class="explore-help">.blend 用 Blender 编辑；关联 GLB 只预览结构，材质和灯光可能与原工程不同。高斯外观请进对应高斯场景查看。</p></div><details class="evidence-data"><summary>配置、诊断数据与实验脚本 ${data.length+reports.length?`· ${data.length+reports.length} 份`:''}</summary>${data.length?`<ul>${data.map(f=>`<li><a href="${escape(f.url)}?${['json','md','py','cjs','html','srt'].includes(f.extension)?'as=text':'download=1'}" target="_blank" rel="noopener">${escape(f.name)} ${['npz','bin'].includes(f.extension)?'↓':'↗'}</a><small>${escape(f.relative)} / ${size(f.bytes)}</small></li>`).join('')}</ul>`:`<p>${record(exp.doc,'查看原始实验记录 ↗')}</p>`}${reports.length?`<h4>诊断与统计报告 · 网页存档</h4><ul>${reports.map(file=>`<li>${record(file,file.split('/').pop()+' ↗')}<small>${escape(file)}</small></li>`).join('')}</ul>`:''}<a href="${escape(effectUrl(id,'files','&kind=data'))}">统一文件表中查看本实验全部数据 ↗</a></details></div>`;
    const url=new URL(location.href);url.searchParams.set('experiment',id);if(jump)url.hash='evidence';history.replaceState(null,'',url);
    if(jump){if($('#poster-shell').classList.contains('expanded'))expandPoster(false);if($('#graph-shell').classList.contains('expanded'))expandGraph(false);$('#evidence').scrollIntoView();panel.focus({preventScroll:true});}
  }
  $('#evidence-tabs').innerHTML=D.experiments.map(e=>`<button id="evidence-${e.id}" data-evidence="${e.id}" role="tab" aria-controls="evidence-detail" aria-selected="false" tabindex="-1">${escape(e.title)}<span>${escape(e.status)}</span></button>`).join('');
  $('#evidence-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-evidence]');if(b)showExperiment(b.dataset.evidence);});
  $('#evidence-tabs').addEventListener('keydown',e=>{const b=e.target.closest('[data-evidence]');if(!b)return;const current=D.experiments.findIndex(x=>x.id===b.dataset.evidence);let next;if(['ArrowRight','ArrowDown'].includes(e.key))next=(current+1)%D.experiments.length;if(['ArrowLeft','ArrowUp'].includes(e.key))next=(current+9)%10;if(e.key==='Home')next=0;if(e.key==='End')next=9;if(next!==undefined){e.preventDefault();showExperiment(D.experiments[next].id);$('[data-evidence="'+D.experiments[next].id+'"]').focus();}});
  document.addEventListener('click',e=>{const trigger=e.target.closest('[data-experiment-link]');if(trigger&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();showExperiment(trigger.dataset.experimentLink,true);}const locate=e.target.closest('[data-locate-poster]');if(locate){focusIntegratedStage(I.experimentStages[locate.dataset.locatePoster]);$('#poster').scrollIntoView();}});
  showExperiment(activeExperiment);
  async function init(){
    const manifestPromise=fetch('records/manifest.json').then(r=>r.ok?r.json():{files:[]}).then(m=>m.files||[]).catch(()=>[]);
    try{const loaded=await window.loadResearchCatalog();catalog=loaded.catalog;local=loaded.mode!=='static';$('#evidence-status').textContent=local?`${loaded.mode==='published'?'公开':'本机'}证据已关联 · ${D.experiments.length} 次实验 · ${catalog.videos.filter(v=>v.available).length} 段视频 · ${catalog.scenes.length} 个三维／诊断入口 · 原文件只读`:'当前为静态图册模式；大型媒体需要本机服务。';}catch{$('#evidence-status').textContent='媒体目录暂未载入；总图、架构与原始实验记录仍可查看。';}
    records=await manifestPromise;
    showExperiment(activeExperiment);
  }
  init();
})();

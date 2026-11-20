import {progressItems,progressStatuses,progressGroups,progressCounts,progressRoadmap,worldSummary,progressVersion,filterProgress,sceneHref} from './world-progress-data.js';
import {auditCounts,auditPriorities,auditRegions,auditSeams,coverageAudit,formationAudit} from './world-audit-data.js';
import {environmentGaps,gapKinds,gapMapHref} from './environment-gaps.js';
import {ancient,modern} from './environment-catalog.js';
import {resumeExpedition} from './expedition-url.js';
const resumeKey='shan-hai-world.resume.v1';
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function progressCard(item){const status=progressStatuses[item.status];return `<article class="p-card" id="item-${item.id}" data-status="${item.status}"><div class="p-card-head"><span class="p-category">${progressGroups[item.group]}</span><span class="p-badge ${item.status}">${status.label}</span></div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.have)}</p><p class="p-missing"><b>${item.status==='planned'?'目标':'还需补全'}</b>${escapeHTML(item.missing)}</p>${item.evidence?`<small class="p-evidence">${escapeHTML(item.evidence)}</small>`:''}<a class="p-card-link" href="${sceneHref(item)}">${item.scene?'去大地图查看':'查看补全顺序'} <span aria-hidden="true">↗</span></a></article>`;}
export function roadmapHTML(){return progressRoadmap.map(r=>`<article class="p-phase" id="phase-${r.step}"><div class="p-step">${String(r.step).padStart(2,'0')}</div><div><span class="p-category">${r.status}</span><h3>${r.title}</h3><p class="p-phase-focus">${r.focus}</p><p>${r.reason}</p><dl><div><dt>依赖</dt><dd>${r.depends}</dd></div><div><dt>完成时应能看到</dt><dd>${r.acceptance}</dd></div></dl></div></article>`).join('');}
function countHTML(){const counts=progressCounts();return Object.entries(progressStatuses).map(([key,v])=>`<div class="p-count"><span class="p-badge ${key}">${v.label}</span><strong>${counts[key]}</strong><small>项清单</small></div>`).join('');}

export function renderWorldAudit(){
 const coverage=coverageAudit.map(r=>`<article class="p-audit-entry"><span class="p-badge ${r.status}">${progressStatuses[r.status].label}</span>
  <h3>${escapeHTML(r.title)}</h3><p>${escapeHTML(r.present)}</p><p class="p-audit-limit">${escapeHTML(r.boundary)}</p>
  <a href="${escapeHTML(r.href)}">${escapeHTML(r.action)} ↗</a></article>`).join('');
 const regions=auditRegions.map(r=>`<a href="expedition.html?plan=1&amp;zone=${r.id}#build-1" style="--region:${r.color}">
  <strong>${r.name}</strong><span>${r.note}</span></a>`).join('');
 const seams=auditSeams.map(r=>`<article class="p-seam" id="seam-${r.id}"><a href="assets/progress/world-audit-${r.id}.jpg" target="_blank" rel="noopener" aria-label="放大${escapeHTML(r.title)}的修整前画面">
  <img src="assets/progress/world-audit-${r.id}.jpg" loading="lazy" width="1029" height="870" alt="${escapeHTML(r.alt)}"></a>
  <div><h3>${escapeHTML(r.title)}</h3><p class="p-audit-limit"><b>修整前</b> ${escapeHTML(r.seen)}</p><p>${escapeHTML(r.issue)}</p>
  <a href="expedition.html?plan=foundation&amp;seam=${r.id}#build-1">查看修整后的 3D 剖面 ↗</a></div></article>`).join('');
 const formation=formationAudit.map(r=>`<article class="p-audit-entry"><h3>${escapeHTML(r.title)}</h3><p>${escapeHTML(r.baseline)}</p>
  <p class="p-audit-limit">${escapeHTML(r.gap)}</p><a href="${escapeHTML(r.href)}">${escapeHTML(r.action)} ↗</a></article>`).join('');
 const priorities=environmentGaps.map(gap=>`<li class="p-gap-row" id="gap-${gap.id}" style="--gap-tone:${gapKinds[gap.kind].color}">
  <div class="p-gap-heading"><span class="p-gap-number" aria-label="优先级 ${gap.rank}">${gap.rank}</span><div>
   <small>${gapKinds[gap.kind].name}</small><h3>${escapeHTML(gap.name)}</h3><p>${escapeHTML(gap.region)}</p></div></div>
  <dl><dt>已有</dt><dd>${escapeHTML(gap.have)}</dd><dt>${gap.kind==='connected'?'展示范围':'仍缺'}</dt><dd>${escapeHTML(gap.gap)}</dd>
   <dt>排序依据</dt><dd>${escapeHTML(gap.why)}</dd><dt>${gap.kind==='connected'?'沿线观察':'补齐后应看到'}</dt><dd>${escapeHTML(gap.check)}</dd></dl>
  <a class="p-secondary" href="${escapeHTML(gapMapHref(gap.id))}">在 3D 地图定位 ↗</a></li>`).join('');
 const gapNav=environmentGaps.map(gap=>`<a href="#gap-${gap.id}">${gap.rank}. ${escapeHTML(gap.mapName)}</a>`).join('');
 const modernMissing=modern.filter(item=>!item.href),ancientMissing=ancient.filter(item=>!item.href);
 const missing=`<details class="p-audit-library">
  <summary>现代图谱 ${modernMissing.length} 项缺专门 3D 入口</summary><ul>${modernMissing.map(item=>{
   const owner=environmentGaps.find(gap=>gap.modern?.includes(item.title));
   return `<li><span>${escapeHTML(item.title)}</span>${owner?` <a href="#gap-${owner.id}">优先项 ${owner.rank}</a>`:''}</li>`;
  }).join('')}</ul><a href="environment.html#modern">对照现代图谱 ↗</a></details>
 <details class="p-audit-library"><summary>史前图谱 ${ancientMissing.length} 个案例待做 3D</summary>
  <ul>${ancientMissing.map(item=>`<li><b>${escapeHTML(item.era)}</b> · ${escapeHTML(item.title)}</li>`).join('')}</ul>
  <a href="environment.html#ancient">查看史前资料与剖面 ↗</a></details>`;
 return {coverage,regions,seams,formation,priorities,'gap-nav':gapNav,missing};
}

function overviewResume(document,params){
 const read=context=>resumeExpedition(context.get('from'),context.get('view'));
 const current=read(params);
 try{
  const storage=document.defaultView?.sessionStorage;
  if(current)storage?.setItem(resumeKey,current.context);
  else if(!params.has('from'))return read(new URLSearchParams(storage?.getItem(resumeKey)));
 }catch{}
 return current;
}

export function mountOverview(document,location){const params=new URLSearchParams(location.search);let state={status:Object.hasOwn(progressStatuses,params.get('status'))?params.get('status'):'all',group:'all',query:''};const $=id=>document.getElementById(id);
 $('progress-counts').innerHTML=countHTML();$('progress-legend').innerHTML=Object.entries(progressStatuses).map(([key,s])=>`<div><span class="p-badge ${key}">${s.label}</span><p>${s.description}</p></div>`).join('');
 $('progress-roadmap').innerHTML=roadmapHTML();$('progress-version').textContent=progressVersion;
 const audit=renderWorldAudit();
 for(const [key,html] of Object.entries(audit))$('audit-'+key).innerHTML=html;
 $('audit-counts').textContent=`现代图谱 ${auditCounts.groups} 类、${auditCounts.modern} 项。${auditCounts.linked} 项有 3D 入口，${auditCounts.unlinked} 项缺专门入口。史前图谱 ${auditCounts.ancient} 个资料案例，其中 ${auditCounts.ancientLinked} 个已有 3D 入口。`;
 const guideCoverage=$('guide-coverage');
 if(guideCoverage)guideCoverage.textContent=`现代 ${auditCounts.linked}/${auditCounts.modern} 项有 3D 入口 · 史前 ${auditCounts.ancientLinked}/${auditCounts.ancient} 项有 3D 入口`;
 $('progress-group').innerHTML='<option value="all">所有层次</option>'+Object.entries(progressGroups).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
 $('world-scale').textContent=`${worldSummary.stations}个观察站 · ${worldSummary.observations}处构建讲解`;$('water-scale').textContent=`水系专线 ${worldSummary.waterStations}站 / ${worldSummary.waterObservations}处`;
 if(location.pathname?.endsWith('/journey.html')&&/^#(?:stop-(?:[1-9]|10)|complete)$/.test(location.hash)){const notice=document.createElement('aside');notice.className='p-next';notice.textContent='这个链接来自早期十境样本。';const link=document.createElement('a');link.href='legacy-journey.html'+location.hash;link.textContent=' 打开对应存档 ↗';notice.append(link);$('world-progress-view').prepend(notice);}
 const resume=overviewResume(document,params);
 if(resume){
  $('continue-scene').href=resume.href;
  $('continue-scene').textContent='继续上次导览 ↗';
  $('continue-scene').hidden=false;
  $('return-context').textContent='从上次的站点或专题继续。';
  $('return-context').hidden=false;
 }
 function render(){const rows=filterProgress(state);$('progress-cards').innerHTML=rows.map(progressCard).join('');$('progress-result').textContent=`显示 ${rows.length} / ${progressItems.length} 项`;$('progress-empty').hidden=rows.length>0;document.querySelectorAll('[data-progress-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.progressFilter===state.status)));}
 document.querySelectorAll('[data-progress-filter]').forEach(b=>b.addEventListener('click',()=>{state.status=b.dataset.progressFilter;render();}));$('progress-group').addEventListener('change',()=>{state.group=$('progress-group').value;render();});$('progress-search').addEventListener('input',()=>{state.query=$('progress-search').value;render();});
 function reset(){state={status:'all',group:'all',query:''};$('progress-group').value='all';$('progress-search').value='';render();}
 $('progress-clear').addEventListener('click',reset);$('progress-pipeline').addEventListener('click',e=>{if(e.target.closest('[data-item-jump]'))reset();});render();
}

export function mountMapProgress({document,getScene,getResumeSearch,onOpen}){
 const dialog=document.createElement('dialog');dialog.id='map-progress-dialog';dialog.className='p-dialog';dialog.setAttribute('aria-labelledby','map-progress-title');
 dialog.innerHTML=`<header class="p-dialog-head"><div><h2 id="map-progress-title">世界导览</h2></div><button type="button" class="p-close" aria-label="关闭世界导览">×</button></header><p class="p-lead">回到导览可选择路线、查看缺口，并从当前站点继续。</p><footer class="p-dialog-footer"><a class="p-primary" data-world-overview href="journey.html">返回世界导览 ↗</a><a class="p-secondary" data-full-overview href="journey.html#environment-coverage">查看全图盘点 ↗</a><button type="button" class="p-return">留在当前场景</button></footer><div class="p-counts">${countHTML()}</div><aside class="p-next"><small>环境基座当前状态</small><h3>${auditPriorities[0].title}</h3><p>${auditPriorities[0].detail}</p></aside>`;
 document.body.append(dialog);
 const overviewLinks=[...document.querySelectorAll('[data-world-overview]')];
 const auditLink=dialog.querySelector('[data-full-overview]');
 function refresh(){
  const resume=resumeExpedition(getScene(),getResumeSearch?.());
  const href='journey.html'+(resume?'?'+resume.context:'');
  overviewLinks.forEach(a=>a.href=href);
  auditLink.href=href+'#environment-coverage';
 }
 for(const link of [...overviewLinks,auditLink]){
  link.addEventListener('focus',refresh);
  link.addEventListener('pointerdown',refresh);
  link.addEventListener('click',refresh);
 }
 document.getElementById('world-progress').addEventListener('click',()=>{refresh();onOpen?.();dialog.showModal();});
 dialog.querySelector('.p-close').addEventListener('click',()=>dialog.close());
 dialog.querySelector('.p-return').addEventListener('click',()=>dialog.close());
 refresh();return {refresh,dialog};
}
if(typeof document!=='undefined'&&document.getElementById('world-progress-view'))mountOverview(document,location);

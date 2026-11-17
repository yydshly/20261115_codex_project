/* Buildless, offline-first research reader. No third-party runtime or analytics. */
'use strict';
const D = window.RESEARCH;
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const recordLink = (file, label = '完整实验记录 ↗') => `<a href="records.html?file=${encodeURIComponent(file)}">${esc(label)}</a>`;
const sourceMap = new Map(D.sources.map(source => [source[0], source]));
const sourceLink = (id) => { const s = sourceMap.get(id); return s ? `<a href="${esc(s[2])}" target="_blank" rel="noopener noreferrer">${esc(s[1])} ↗</a>` : ''; };
const statusLabels = {tested:'本图已实测',read:'仅资料研究',mentioned:'仅提及 / 待核对'};
const imageButton = (image, caption, alt = caption) => `<button class="image-button" data-image="${esc(image)}" data-caption="${esc(caption)}" aria-label="放大：${esc(alt)}"><img src="${esc(image)}" alt="${esc(alt)}" loading="lazy"><span class="zoom-hint">查看原图 ↗</span></button>`;

function showStage(index) {
  $('#pipeline-detail').innerHTML = `<span class="label">${esc(D.stages[index].type)}</span><h3>${esc(D.stages[index].title)}</h3><p>${esc(D.stages[index].text)}</p><div class="detail-bottom"><span>${esc(D.stages[index].examples)}</span>${recordLink(D.stages[index].record,'依据 ↗')}</div>`;
  document.querySelectorAll('[data-stage]').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
}
$('#pipeline').innerHTML = D.stages.map((stage,i) => `<button data-stage="${i}" aria-pressed="false"><span>0${i+1}</span><b>${esc(stage.name)}</b><small>${esc(stage.type)}</small></button>`).join('');
$('#pipeline').addEventListener('click', event => { const button = event.target.closest('[data-stage]'); if(button) showStage(Number(button.dataset.stage)); });
showStage(0);
$('#corrections').innerHTML = D.corrections.map((item,i) => `<article><span>认识修正 0${i+1}</span><h3>${esc(item[0])}</h3><p>${esc(item[1])}</p></article>`).join('');
$('#timeline').innerHTML = D.journey.map((item,i) => `<article><div class="timeline-index">${String(i+1).padStart(2,'0')}</div><div><span class="label">${esc(item.phase)}</span><h3>${esc(item.q)}</h3><p>${esc(item.a)}</p>${item.link ? recordLink(item.link,'查看这一阶段的记录 ↗') : `<a href="#${esc(item.anchor)}">进入相关章节 ↓</a>`}</div></article>`).join('');

function selectExperiment(index, focus = false) {
  const exp = {...D.experiments[index]};
  const sceneForExperiment={sharp:'sharp',diagnosis:'diagnosis',hybrid:'hybrid',bound:'bound',cg:'world',consistency:'consistency'};
  const groupForExperiment={vggt:'canal-single-vggt','left-right':'canal-imagegen-multiview',interior:'canal-imagegen-interior',bridge:'canal-entry-bridge-test'};
  exp.viewer=sceneForExperiment[exp.id]?'effects.html?scene='+sceneForExperiment[exp.id]+'#scenes':'effects.html?group='+groupForExperiment[exp.id]+(exp.id==='vggt'?'#files':'#images');
  document.querySelectorAll('[data-experiment]').forEach((tab,i) => {tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});
  const panel = $('#experiment-detail');
  panel.setAttribute('aria-labelledby',`experiment-${exp.id}`);
  panel.innerHTML = `<div class="experiment-title"><span class="badge ${esc(exp.tone)}">${esc(exp.status)}</span><h3>${esc(exp.title)}</h3><p class="flow">${esc(exp.flow)}</p></div>${imageButton(exp.image,exp.alt)}<div class="experiment-copy"><h4>实际结果</h4><p>${esc(exp.result)}</p><ul>${exp.lessons.map(text=>`<li>${esc(text)}</li>`).join('')}</ul><div class="limit"><b>证据边界</b><p>${esc(exp.limit)}</p></div><div class="extra-images">${exp.extra.map(([name,image])=>`<button class="text-button" data-image="${esc(image)}" data-caption="${esc(name)}">${esc(name)} ↗</button>`).join('')}</div><div class="experiment-links">${recordLink(exp.doc)}<a href="explore.html?experiment=${encodeURIComponent(exp.id)}#evidence">总图关联：视频、三维与工程 ↗</a>${exp.viewer?`<a class="local-viewer" href="${esc(exp.viewer)}" target="_blank" rel="noopener noreferrer">进入本实验全部产物 ↗ <small>统一效果与工程入口</small></a>`:''}</div></div>`;
  if(focus) panel.focus({preventScroll:true});
}
$('#experiment-tabs').innerHTML=D.experiments.map((exp,i)=>`<button role="tab" aria-controls="experiment-detail" aria-selected="false" tabindex="-1" id="experiment-${esc(exp.id)}" data-experiment="${i}"><b>${esc(exp.title)}</b><small>${esc(exp.status)}</small></button>`).join('');
$('#experiment-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-experiment]');if(b) selectExperiment(Number(b.dataset.experiment));});
$('#experiment-tabs').addEventListener('keydown',e=>{const b=e.target.closest('[data-experiment]');if(!b)return;const i=Number(b.dataset.experiment);let next;if(['ArrowDown','ArrowRight'].includes(e.key))next=(i+1)%D.experiments.length;if(['ArrowUp','ArrowLeft'].includes(e.key))next=(i+D.experiments.length-1)%D.experiments.length;if(e.key==='Home')next=0;if(e.key==='End')next=D.experiments.length-1;if(next!==undefined){e.preventDefault();selectExperiment(next);document.querySelector(`[data-experiment="${next}"]`).focus();}});
selectExperiment(9);

function selectView(index) {
  const view = D.views[index];
  document.querySelectorAll('[data-view]').forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});
  $('#view-stage').setAttribute('aria-labelledby',`view-${index}`);
  $('#view-stage').innerHTML=`${imageButton(view.image,view.caption,view.name+'：'+view.type)}<figcaption><span class="badge neutral">${esc(view.type)}</span><b>${esc(view.name)}</b><p>${esc(view.caption)}</p></figcaption>`;
}
$('#view-stage').setAttribute('role','tabpanel');
$('#view-tabs').innerHTML=D.views.map((view,i)=>`<button role="tab" id="view-${i}" data-view="${i}" aria-controls="view-stage" aria-selected="false" tabindex="-1">${esc(view.name)}</button>`).join('');
$('#view-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)selectView(Number(b.dataset.view));});
$('#view-tabs').addEventListener('keydown',e=>{const b=e.target.closest('[data-view]');if(!b)return;let next;const i=Number(b.dataset.view);if(e.key==='ArrowRight')next=(i+1)%D.views.length;if(e.key==='ArrowLeft')next=(i+D.views.length-1)%D.views.length;if(e.key==='Home')next=0;if(e.key==='End')next=D.views.length-1;if(next!==undefined){e.preventDefault();selectView(next);document.querySelector(`[data-view="${next}"]`).focus();}});
selectView(0);

for(const category of [...new Set(D.products.map(p=>p.category))]){const option=document.createElement('option');option.value=category;option.textContent=category;$('#product-category').append(option);}
function renderProducts() {
  const query=$('#product-search').value.toLocaleLowerCase().trim();
  const category=$('#product-category').value;
  const status=$('#product-status').value;
  const products=D.products.filter(p=>(category==='all'||p.category===category)&&(status==='all'||p.status===status)&&[p.name,p.category,p.kind,p.io,p.value,p.limit,p.cost].join(' ').toLocaleLowerCase().includes(query));
  $('#product-count').textContent=`显示 ${products.length} / ${D.products.length} 项 · 按本轮研究深度标记，非能力排名`;
  $('#product-empty').hidden=products.length>0;
  $('#product-grid').innerHTML=products.map(p=>`<article class="product-card"><div class="product-meta"><span>${esc(p.category)}</span><span class="badge ${p.status==='tested'?'ok':'neutral'}">${statusLabels[p.status]}</span></div><h3>${esc(p.name)}</h3><p class="product-kind">${esc(p.kind)}</p><p class="product-io">${esc(p.io)}</p><p>${esc(p.value)}</p><details><summary>限制、费用与来源</summary><div class="product-more"><h4>尚未解决什么</h4><p>${esc(p.limit)}</p><h4>成本与本机条件</h4><p>${esc(p.cost)}</p><div class="source-links">${p.sources.map(sourceLink).join('')}${p.record?recordLink(p.record,'本轮记录 ↗'):''}</div></div></details></article>`).join('');
}
['#product-search','#product-category','#product-status'].forEach(selector=>$(selector).addEventListener(selector.includes('search')?'input':'change',renderProducts));
renderProducts();
function renderQuestions(){const q=$('#question-search').value.toLocaleLowerCase().trim();const items=D.questions.filter(item=>item.slice(0,2).join(' ').toLocaleLowerCase().includes(q));$('#question-empty').hidden=items.length>0;$('#question-list').innerHTML=items.map(item=>`<details><summary>${esc(item[0])}</summary><div><p>${esc(item[1])}</p>${item[2]?recordLink(item[2],'依据与详细说明 ↗'):'<a href="#products">查看产品卡片与官方来源 ↑</a>'}</div></details>`).join('');}
$('#question-search').addEventListener('input',renderQuestions);renderQuestions();
$('#record-list').innerHTML=D.records.map(([name,file],i)=>`<a href="records.html?file=${encodeURIComponent(file)}"><span>${String(i+1).padStart(2,'0')}</span><b>${esc(name)}</b><small>阅读原始记录 ↗</small></a>`).join('');
$('#source-list').innerHTML=D.sources.map(s=>`<article>${sourceLink(s[0])}<p>${esc(s[3])}</p></article>`).join('');
fetch('records/manifest.json').then(response=>{if(!response.ok)throw new Error('missing manifest');return response.json();}).then(manifest=>{
  const labels={'prompts.json':'原始提示词与输入角色','manifest.json':'推理输入配置','manifest-aux.json':'子集控制配置','analysis.json':'空间检查原始统计','inference.json':'推理环境与哈希记录','manual-review.json':'人工误配核对','verification.json':'产物与保护检查','illustrated-points.json':'图上抽样标注点','correspondence-report.json':'二维对应筛查报告','image-check.json':'开关灯图像检查'};
  $('#artifact-list').innerHTML=manifest.files.filter(file=>file.endsWith('.json')).map(file=>{const parts=file.split('/');const name=parts.pop();const group=parts.pop()||'项目';return `<article>${recordLink(file,labels[name]||name)}<p>${esc(group+' / '+name)}</p></article>`;}).join('');
}).catch(()=>{$('#artifact-list').textContent='原始数据目录未加载，请先构建网页；主阅读入口仍可查看。';});
const lightbox=$('#lightbox');
let lastTrigger=null;
document.addEventListener('click',e=>{const trigger=e.target.closest('[data-image]');if(!trigger)return;lastTrigger=trigger;lightbox.querySelector('img').src=trigger.dataset.image;lightbox.querySelector('img').alt=trigger.dataset.caption;lightbox.querySelector('p').textContent=trigger.dataset.caption;$('#image-original').href=trigger.dataset.image;lightbox.showModal();});
$('#close-lightbox').addEventListener('click',()=>lightbox.close());
lightbox.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close();});
lightbox.addEventListener('close',()=>{lightbox.querySelector('img').removeAttribute('src');lastTrigger?.focus({preventScroll:true});});
$('#print-button').addEventListener('click',()=>window.print());
const sections=[...document.querySelectorAll('main>section')];
const navLinks=[...document.querySelectorAll('.sidebar nav a')];
let navPending=false;
function updateNavigation(){
  navPending=false;
  const cursor=innerHeight*.3;
  let current=sections[0];
  for(const section of sections){if(section.getBoundingClientRect().top<=cursor)current=section;}
  for(const link of navLinks){const active=link.hash==='#'+current.id;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}
}
function scheduleNavigation(){if(!navPending){navPending=true;requestAnimationFrame(updateNavigation);}}
window.addEventListener('scroll',scheduleNavigation,{passive:true});
window.addEventListener('resize',scheduleNavigation,{passive:true});
document.addEventListener('click',scheduleNavigation);
updateNavigation();

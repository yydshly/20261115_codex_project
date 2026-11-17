'use strict';
const E=selector=>document.querySelector(selector);
const safe=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bytes=value=>value>=1048576?(value/1048576).toFixed(1)+' MiB':(value/1024).toFixed(1)+' KiB';
let catalog,activeScene=null,loadedScene=null,lastFocus=null;
const params=new URLSearchParams(location.search);
async function init(){
  const loaded=await window.loadResearchCatalog();catalog=loaded.catalog;
  E('#library-status').textContent=loaded.mode==='static'?'当前仅有静态图册，请通过本机服务查看大型产物。':`${loaded.mode==='published'?'公开':'本机'}产物已接入 · ${catalog.videos.filter(v=>v.available).length} 段完整视频 · ${catalog.scenes.length} 个三维查看器 · ${catalog.images.length} 项去重效果图 · ${catalog.files.filter(f=>f.kind==='project').length} 份工程／几何文件`;
  for(const [id,title]of Object.entries(catalog.groups)){for(const selector of ['#image-group','#file-group']){const option=document.createElement('option');option.value=id;option.textContent=title;E(selector).append(option);}}
  E('#library-scope').textContent=catalog.scope;
  E('#video-tabs').innerHTML=catalog.videos.map((v,i)=>`<button role="tab" aria-selected="false" data-video="${i}" ${v.available?'':'disabled'}>${safe(v.title)}</button>`).join('');
  const preferred=Number(params.get('video')??1);
  const first=Number.isInteger(preferred)&&catalog.videos[preferred]?.available?preferred:catalog.videos.findIndex(v=>v.available);
  if(first>=0)selectVideo(first);else E('#video-title').textContent='需要本机媒体服务';
  E('#video-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-video]');if(b)selectVideo(Number(b.dataset.video));});
  for(const scene of catalog.scenes){const option=document.createElement('option');option.value=scene.id;option.textContent=scene.title;E('#scene-select').append(option);}
  if(params.get('scene')&&catalog.scenes.some(s=>s.id===params.get('scene')))E('#scene-select').value=params.get('scene');
  if(catalog.scenes.length)selectScene();else E('#load-scene').disabled=true;
  if(params.get('group')&&catalog.groups[params.get('group')]){E('#image-group').value=params.get('group');E('#file-group').value=params.get('group');}
  if(['project','data','video','all'].includes(params.get('kind')))E('#file-kind').value=params.get('kind');
  if(/^[a-z-]+$/.test(params.get('experiment')||'')){const back=E('#experiment-return'),link=document.createElement('a');link.href='explore.html?experiment='+encodeURIComponent(params.get('experiment'))+'#evidence';link.textContent='← 返回这次实验的总图、结论和产物关联';back.append(link);back.hidden=false;}
  renderImages();renderFiles();
}
function selectVideo(index){
  const v=catalog.videos[index],video=E('#result-video');video.pause();video.src=v.url;video.poster=v.poster;video.load();
  E('#video-title').textContent=v.title;E('#video-note').textContent=v.note;E('#video-meta').textContent=`原始成片 · ${v.duration} 秒 · ${catalog.groups[v.group]}`;
  E('#video-download').href=v.url+'?download=1';
  E('#video-seek').value=0;E('#video-toggle').textContent='播放视频';
  document.querySelectorAll('[data-video]').forEach((b,i)=>b.setAttribute('aria-selected',String(i===index)));
}
function releaseScene(){const frame=E('#scene-frame');frame.src='about:blank';frame.hidden=true;E('#scene-placeholder').hidden=false;loadedScene=null;E('#scene-status').textContent='三维已释放；原始文件保持不变。';}
function selectScene(){
  releaseScene();activeScene=catalog.scenes.find(s=>s.id===E('#scene-select').value);if(!activeScene)return;
  E('#scene-title').textContent=activeScene.title;E('#scene-note').textContent=activeScene.note;E('#scene-size').textContent=activeScene.size;
  E('#scene-poster').src=activeScene.poster;E('#scene-poster').alt=activeScene.title+'的实际预览';
  E('#scene-variant').innerHTML=activeScene.variants.map(([value,label])=>`<option value="${safe(value)}">${safe(label)}</option>`).join('');
  E('#load-scene').disabled=!activeScene.available;updateSceneLink();
  E('#scene-status').textContent=activeScene.available?'预览图已就绪，点击加载后开始三维检查。':'本机依赖或原始产物不可用；没有替换为假三维。';
}
function updateSceneLink(){if(activeScene)E('#scene-direct').href=activeScene.url+E('#scene-variant').value;}
E('#scene-select').addEventListener('change',selectScene);E('#scene-variant').addEventListener('change',()=>{releaseScene();updateSceneLink();});
E('#load-scene').addEventListener('click',()=>{if(!activeScene)return;E('#scene-frame').src=activeScene.url+E('#scene-variant').value;E('#scene-frame').hidden=false;E('#scene-placeholder').hidden=true;loadedScene=activeScene.id;E('#scene-status').textContent='正在加载几何／高斯，等待上传与排序…';});
E('#stop-scene').addEventListener('click',releaseScene);
function expandScene(expanded){E('#scene-shell').classList.toggle('expanded',expanded);document.body.classList.toggle('media-expanded',expanded);E('#exit-expanded').hidden=!expanded;E('#fullscreen-scene').setAttribute('aria-expanded',String(expanded));if(expanded)E('#exit-expanded').focus();}
E('#fullscreen-scene').addEventListener('click',()=>{if(!E('#scene-frame').hidden)expandScene(true);});
E('#exit-expanded').addEventListener('click',()=>{expandScene(false);E('#fullscreen-scene').focus();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&E('#scene-shell').classList.contains('expanded'))expandScene(false);});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==E('#scene-frame').contentWindow)return;if(e.data?.type==='canal-viewer-ready'&&e.data.scene===loadedScene)E('#scene-status').textContent='三维资源已载入。可拖动、缩放，或使用场景内的机位与门控制。';if(e.data?.type==='canal-viewer-height'&&Number.isFinite(e.data.height))E('#scene-frame').style.height=Math.max(430,Math.min(1600,e.data.height+16))+'px';});
const video=E('#result-video');
E('#video-toggle').addEventListener('click',()=>{if(video.paused)video.play().catch(error=>E('#video-clock').textContent=error.message);else video.pause();});
video.addEventListener('play',()=>E('#video-toggle').textContent='暂停视频');video.addEventListener('pause',()=>E('#video-toggle').textContent='播放视频');
video.addEventListener('loadedmetadata',()=>E('#video-seek').max=video.duration);
video.addEventListener('timeupdate',()=>{E('#video-seek').value=video.currentTime;E('#video-clock').textContent=video.currentTime.toFixed(1)+' / '+video.duration.toFixed(1)+' 秒';});
E('#video-seek').addEventListener('input',e=>{video.currentTime=Number(e.target.value);});
function renderImages(){
  const group=E('#image-group').value,q=E('#image-search').value.toLowerCase().trim();
  const images=catalog.images.filter(x=>(group==='all'||x.group===group)&&[x.title,x.group_title,x.note].join(' ').toLowerCase().includes(q));
  E('#image-count').textContent=`显示 ${images.length} / ${catalog.images.length} 项 · 相同图片内容去重 · 原尺寸查看`;
  E('#image-grid').innerHTML=images.length?images.map(x=>`<article><button data-image-id="${safe(x.id)}"><img src="${safe(x.url)}" alt="${safe(x.title)}" loading="lazy"><span>查看原图 ↗</span></button><div><small>${safe(x.group_title)}</small><h3>${safe(x.title)}</h3><p>${safe(x.note)}</p></div></article>`).join(''):'<p>没有匹配的效果图。</p>';
}
E('#image-group').addEventListener('change',renderImages);E('#image-search').addEventListener('input',renderImages);
E('#image-grid').addEventListener('click',e=>{const button=e.target.closest('[data-image-id]');if(!button)return;const item=catalog.images.find(x=>x.id===button.dataset.imageId);lastFocus=button;const dialog=E('#media-lightbox');dialog.querySelector('img').src=item.url;dialog.querySelector('img').alt=item.title;dialog.querySelector('h3').textContent=item.title;dialog.querySelector('p').textContent=item.note;dialog.querySelector('a').href=item.url;dialog.showModal();});
function renderFiles(){
  const kind=E('#file-kind').value,group=E('#file-group').value,q=E('#file-search').value.toLowerCase().trim();
  const files=catalog.files.filter(f=>(kind==='all'||f.kind===kind)&&(group==='all'||f.group===group)&&[f.name,f.group_title,f.extension].join(' ').toLowerCase().includes(q));
  E('#file-count').textContent=`显示 ${files.length} / ${catalog.files.length} 个已登记文件 · 下载还原原文件，保持原内容`;
  const readable=new Set(['json','md','py','cjs','html','srt']);
  E('#file-rows').innerHTML=files.map(f=>`<tr><td><b>${safe(f.name)}</b><small>${safe(f.group_title)}</small></td><td>${safe(f.extension.toUpperCase())}<small>${bytes(f.bytes)}</small></td><td><div class="file-actions">${f.preview?`<a href="${safe(f.preview)}" target="_blank" rel="noopener noreferrer">${f.extension==='blend'?'关联 GLB 预览':'拖动查看模型'} ↗</a>`:''}${f.extension==='ply'?plyLink(f):''}${readable.has(f.extension)?`<button class="text-button" data-read-file="${safe(f.id)}">网页阅读</button>`:''}${window.researchPublication.downloadLink(f)}</div></td></tr>`).join('')||'<tr><td colspan="3">没有匹配文件。</td></tr>';
}
function plyLink(file){const scene=catalog.scenes.find(s=>s.group===file.group);if(!scene)return'';return `<button class="text-button" data-open-scene="${safe(scene.id)}">进入所属高斯场景</button>`;}
['#file-kind','#file-group'].forEach(s=>E(s).addEventListener('change',renderFiles));E('#file-search').addEventListener('input',renderFiles);
E('#file-rows').addEventListener('click',async e=>{
  const scene=e.target.closest('[data-open-scene]');if(scene){E('#scene-select').value=scene.dataset.openScene;selectScene();E('#scenes').scrollIntoView();E('#load-scene').focus({preventScroll:true});return;}
  const button=e.target.closest('[data-read-file]');if(!button)return;lastFocus=button;const file=catalog.files.find(f=>f.id===button.dataset.readFile),dialog=E('#file-reader');dialog.querySelector('h3').textContent=file.name;dialog.querySelector('p').textContent=file.group_title+' · '+bytes(file.bytes);dialog.querySelector('pre').textContent='正在读取原文…';dialog.querySelector('a').href=file.url+'?download=1';dialog.showModal();
  try{const r=await fetch(file.url+'?as=text');if(!r.ok)throw Error('文件读取失败');dialog.querySelector('pre').textContent=await r.text();}catch(error){dialog.querySelector('pre').textContent=error.message;}
});
for(const [button,id]of [['#close-media-image','#media-lightbox'],['#close-file-reader','#file-reader']])E(button).addEventListener('click',()=>E(id).close());
for(const id of ['#media-lightbox','#file-reader']){E(id).addEventListener('click',e=>{if(e.target===E(id))E(id).close();});E(id).addEventListener('close',()=>lastFocus?.focus({preventScroll:true}));}
init().catch(error=>{E('#library-status').textContent='产物目录读取失败：'+error.message;});

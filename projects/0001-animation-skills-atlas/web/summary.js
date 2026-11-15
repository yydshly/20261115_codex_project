import aiVideoSection from './ai-video-section.html?raw';
import data from '../understanding.json';
import media from '../effect-media.json';
import posterUrl from '../assets/technology-understanding.svg?url';
const $=s=>document.querySelector(s);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('#learning-details').innerHTML=aiVideoSection;
document.querySelectorAll('#learning-details [data-ai-case]').forEach(a=>{a.href='./cases.html#'+a.dataset.aiCase});
const mediaRoot='./summary/effects/';
const movie=(id,m)=>m.type==='gif'?mediaRoot+id+'-loop.mp4':m.type==='video'?(m.play||mediaRoot+m.file):'';
const studios={ola:'ola',shifty:'shifty',tweenjs:'tween',anime:'anime',lottie:'lottie',gifenc:'gifenc'};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let playing=!reduced.matches, observer;
const visibleVideos=new Set();
$('#effect-masthead').innerHTML=['blender','godot','proton'].map(id=>`<button type="button" data-hero-effect="${id}" aria-label="查看 ${safe(media[id].title)}"><img src="${mediaRoot+media[id].poster}" alt="${safe(media[id].title)}"><span><b>${safe(media[id].title)}</b><small>${safe(media[id].credit)}</small></span></button>`).join('');
$('#conclusions').innerHTML=data.principles.map((p,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><h3>${safe(p.title)}</h3><p>${safe(p.text)}</p></article>`).join('');
$('#svg-download').href=posterUrl;$('#svg-open').href=posterUrl;
const viewport=$('#map-viewport'),poster=$('#summary-map'),slider=$('#map-zoom');let fitted=true;
function zoom(percent){const p=Math.max(5,Math.min(100,percent));poster.style.width=3600*p/100+'px';poster.style.height='auto';slider.value=String(Math.round(p));$('#zoom-value').textContent=Math.round(p)+'%'}
function fit(){fitted=true;zoom((viewport.clientWidth-2)/3600*100)}
$('#fit-map').onclick=fit;$('#actual-map').onclick=()=>{fitted=false;zoom(100)};slider.oninput=()=>{fitted=false;zoom(+slider.value)};new ResizeObserver(()=>{if(fitted&&!$('#static-map').hidden)fit()}).observe(viewport);
// Both map views use the same records, artwork and attribution.
$('#live-map').append($('#technologies'));
function mode(which){const live=which==='live';$('#live-map').hidden=!live;$('#static-map').hidden=live;document.querySelectorAll('[data-map-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapMode===which)));if(!live){if(!poster.getAttribute('src'))poster.src=posterUrl;fit()}syncPlayback()}
document.querySelectorAll('[data-map-mode]').forEach(b=>b.onclick=()=>mode(b.dataset.mapMode));
function syncPlayback(){
 document.querySelectorAll('.effect-cover video').forEach(video=>{
  const go=playing&&!document.hidden&&!$('#live-map').hidden&&visibleVideos.has(video)&&!$('#effect-dialog').open;
  if(go)video.play().catch(()=>{video.dataset.blocked='true'});else video.pause();
 });
 $('#motion-toggle').textContent=playing?'暂停动态预览 Ⅱ':'播放动态预览 ▶';$('#motion-toggle').setAttribute('aria-pressed',String(playing));
}
$('#motion-toggle').onclick=()=>{playing=!playing;syncPlayback()};document.addEventListener('visibilitychange',syncPlayback);
reduced.addEventListener('change',e=>{playing=!e.matches;syncPlayback()});
const groups=['全部',...new Set(data.tools.map(t=>t.category))];let category='全部';
$('#summary-filters').innerHTML=groups.map(g=>`<button type="button" data-group="${safe(g)}" aria-pressed="${g===category}">${safe(g)}</button>`).join('');
function render(){
 observer?.disconnect();visibleVideos.clear();document.querySelectorAll('.effect-cover video').forEach(v=>v.pause());
 const query=$('#summary-search').value.trim().toLowerCase();
 const tools=data.tools.filter(t=>(category==='全部'||t.category===category)&&(Object.values(t).join(' ')+Object.values(media[t.id]).join(' ')).toLowerCase().includes(query));
 $('#summary-count').textContent=`${tools.length} / 18 项 · 当前 ${tools.filter(t=>movie(t.id,media[t.id])).length} 项可播放 · 点击画面放大、查看归因与原作`;
 $('#summary-tools').innerHTML=tools.map(t=>{
  const m=media[t.id],video=movie(t.id,m);
  return `<article class="technology-card tone-${t.color}" id="effect-${t.id}">
   <div class="tool-top"><span>${safe(t.category)}</span><small>${safe(t.evidence)}</small></div>
   <h3>${safe(t.name)}</h3><p class="kind">${safe(t.kind)}</p>
   <button class="effect-cover" type="button" data-view="${t.id}" aria-label="放大查看 ${safe(t.name)}：${safe(m.title)}">
    ${video?`<video muted loop playsinline preload="none" poster="${mediaRoot+m.poster}" aria-hidden="true" tabindex="-1"><source src="${safe(video)}" type="video/mp4"></video>`:`<img loading="lazy" src="${mediaRoot+m.poster}" alt="${safe(m.title)}">`}
    <span class="effect-tag">${video?'▶ 动态预览':'↗ 原作预览'}</span><span class="effect-expand">放大查看 ↗</span>
   </button>
   <div class="effect-caption"><h4>${safe(m.title)}</h4><p>${safe(m.focus)}</p><small>${safe(m.credit)}</small></div>
   <div class="io"><span>${safe(t.input)}</span><i>→</i><strong>${safe(t.output)}</strong></div>
   <dl>${[['作用','role'],['场景','when'],['效果','effect'],['成本','cost']].map(([label,key])=>`<div><dt>${label}</dt><dd>${safe(t[key])}</dd></div>`).join('')}</dl>
   <div class="recommendation">AI 视频：${safe(t.advice)}</div><p class="case-note">${safe(m.note)}</p>
   <div class="card-links"><button type="button" data-view="${t.id}">看效果与归因 ↗</button><a href="${safe(m.source)}" target="_blank" rel="noopener noreferrer">${m.source.startsWith('https:')?'原作 / 来源':'实际成片 / 作品'} ↗</a><a href="${safe(t.repository)}" target="_blank" rel="noopener noreferrer">仓库 ↗</a></div>
  </article>`;
 }).join('');
 if(!tools.length)$('#summary-tools').innerHTML='<p class="empty-results">没有匹配项，试试其他关键词或选择“全部”。</p>';
 observer=new IntersectionObserver(entries=>{entries.forEach(({target,isIntersecting})=>{if(isIntersecting)visibleVideos.add(target);else visibleVideos.delete(target)});syncPlayback()},{threshold:.35});
 document.querySelectorAll('.effect-cover video').forEach(v=>observer.observe(v));syncPlayback();
}
$('#summary-filters').onclick=e=>{const b=e.target.closest('[data-group]');if(b){category=b.dataset.group;document.querySelectorAll('[data-group]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));render()}};
$('#summary-search').oninput=render;
const dialog=$('#effect-dialog');let currentId;
function openEffect(id){
 const t=data.tools.find(t=>t.id===id),m=media[id],video=movie(id,m);currentId=id;
 $('#effect-dialog-title').textContent=t.name+' / '+m.title;
 $('#effect-dialog-stage').innerHTML=video?`<video src="${safe(video)}" poster="${mediaRoot+m.poster}" controls loop muted playsinline ${reduced.matches?'':'autoplay'}></video>`:`<img src="${mediaRoot+m.poster}" alt="${safe(m.title)}">`;
 $('#effect-dialog-credit').textContent=m.credit;$('#effect-dialog-note').textContent=m.note;
 $('#effect-dialog-focus').textContent=m.focus;$('#effect-source').href=m.source;$('#effect-repository').href=t.repository;
 $('#effect-studio').hidden=!studios[id];$('#effect-studio').textContent='另看本站交互实验 ↗';$('#effect-dialog-tools').textContent=t.role+' '+t.cost;
 dialog.showModal();syncPlayback();
}
$('#effect-masthead').onclick=e=>{const b=e.target.closest('[data-hero-effect]');if(b)openEffect(b.dataset.heroEffect)};
$('#summary-tools').onclick=e=>{const b=e.target.closest('[data-view]');if(b)openEffect(b.dataset.view)};
$('#effect-close').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
dialog.addEventListener('close',()=>{$('#effect-dialog-stage').replaceChildren();syncPlayback()});
$('#effect-studio').onclick=()=>{
 $('#effect-dialog-title').textContent='本站交互实验 / '+data.tools.find(t=>t.id===currentId).name;
 $('#effect-dialog-stage').innerHTML=`<iframe title="本站 ${safe(currentId)} 交互实验" src="./showcase.html?embed=1#${studios[currentId]}" allow="autoplay" loading="eager"></iframe>`;
 $('#effect-dialog-credit').textContent='本站原创交互实验 / 实际 npm 运行库';
 $('#effect-dialog-note').textContent='这是本站另一件交互实验，用于亲手操作；与上面标注的上游原作分别归因。';
 $('#effect-studio').hidden=true;
};
render();mode('live');
function skills(){const list=window.ANIMATION_ATLAS?.skills;if(!list)return;$('#summary-skill-list').innerHTML=list.map(([id,name,description])=>`<div><code>${safe(id)}</code><b>${safe(name)}</b><p>${safe(description)}</p></div>`).join('')}
document.addEventListener('DOMContentLoaded',skills,{once:true});skills();

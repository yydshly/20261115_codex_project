import { ELEMENTS, USES, PITFALLS } from './understanding-data.mjs';
const catalog = document.getElementById('element-catalog');
catalog.innerHTML = ELEMENTS.map(e => `<article class="element-card" id="element-${e.id}" data-category="${e.category}"><header><span class="element-number">${e.number}</span><span class="element-category">${e.category}</span></header><h3>${e.title}</h3><p class="element-origin">${e.origin}</p><dl><dt>是什么</dt><dd>${e.seen}</dd><dt>价值在哪里</dt><dd>${e.value}</dd><dt>对我们的意义</dt><dd>${e.ours}</dd><dt>当前边界</dt><dd>${e.limit}</dd></dl></article>`).join('');
document.getElementById('use-panels').innerHTML = USES.map((u,i) => `<section class="use-panel" id="use-${u.id}" role="tabpanel" aria-labelledby="tab-${u.id}" tabindex="0" ${i?'hidden':''}><span class="eyebrow">${u.eyebrow}</span><h3>${u.title}</h3><p class="use-lead">${u.lead}</p><dl><dt>可以交付什么</dt><dd>${u.deliver}</dd><dt>放到具体作品里</dt><dd>${u.example}</dd><dt>接入还需要什么</dt><dd>${u.needs}</dd><dt>怎样检验价值</dt><dd>${u.criterion}</dd></dl></section>`).join('');
document.getElementById('pitfall-list').innerHTML = PITFALLS.map(([title,problem,check])=>`<article><h4>${title}</h4><p>${problem}</p><p><strong>检查：</strong>${check}</p></article>`).join('');

const filters = [...document.querySelectorAll('[data-filter]')];
function filterElements(category) {
  filters.forEach(b=>{const on=b.dataset.filter===category;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
  let count=0;
  catalog.querySelectorAll('.element-card').forEach(card=>{const show=category==='all'||card.dataset.category===category;card.hidden=!show;if(show)count++;});
  document.getElementById('element-result').textContent=`${count} 项${category==='all'?'元素':category+'元素'}`;
}
filters.forEach(b=>b.addEventListener('click',()=>filterElements(b.dataset.filter)));

document.querySelectorAll('[data-element]').forEach(b=>b.addEventListener('click',()=>{
  const e=ELEMENTS.find(e=>e.id===b.dataset.element);
  document.querySelectorAll('[data-element]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  document.getElementById('element-spotlight').innerHTML=`<span class="eyebrow">${e.number} / ${e.category}</span><h3>${e.title}</h3><p>${e.spotlight}</p><a href="#element-${e.id}">查看完整说明 ↓</a>`;
  if(document.getElementById(`element-${e.id}`).hidden)filterElements('all');
}));
const tabs=[...document.querySelectorAll('[data-use]')];
function showUse(tab, focus=false) {
  tabs.forEach(b=>{const on=b===tab;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;document.getElementById(`use-${b.dataset.use}`).hidden=!on;});
  expand.setAttribute('aria-pressed','false');expand.textContent='同时展开四个方向';
  if(focus)tab.focus();
}
tabs.forEach((tab,i)=>{
  tab.addEventListener('click',()=>showUse(tab));
  tab.addEventListener('keydown',e=>{
    let n;
    if(e.key==='ArrowRight')n=(i+1)%tabs.length;
    if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;
    if(e.key==='Home')n=0;
    if(e.key==='End')n=tabs.length-1;
    if(n!==undefined){e.preventDefault();showUse(tabs[n],true);}
  });
});
// A full-reading option keeps the four directions available side by side.
const expand = document.createElement('button');expand.className='show-all-uses';expand.type='button';expand.textContent='同时展开四个方向';expand.setAttribute('aria-pressed','false');
document.querySelector('.use-tabs').after(expand);
expand.addEventListener('click',()=>{
  const open=expand.getAttribute('aria-pressed')!=='true';expand.setAttribute('aria-pressed',String(open));expand.textContent=open?'收起为单方向阅读':'同时展开四个方向';
  if(open)document.querySelectorAll('.use-panel').forEach(p=>p.hidden=false);else showUse(tabs.find(t=>t.getAttribute('aria-selected')==='true')||tabs[0]);
});
const chapters=[...document.querySelectorAll('.chapter-nav a')];
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){chapters.forEach(a=>{if(a.hash===`#${entry.target.id}`)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}},{rootMargin:'-90px 0px -60% 0px'});
  document.querySelectorAll('.guide-section').forEach(s=>observer.observe(s));
}

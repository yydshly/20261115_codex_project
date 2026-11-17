"use strict";
(()=>{
 const $=id=>document.getElementById(id),dialog=$('research-search'),input=$('research-query'),results=$('research-results'),status=$('search-status');
 const entries=window.RESEARCH_INDEX||[],base=new URL(document.body.dataset.base||'./',location.href);
 let returnFocus=null;
 function showSearch(){returnFocus=document.activeElement;dialog.showModal();input.focus();search();}
 for(const button of document.querySelectorAll('[data-open-search]'))button.addEventListener('click',showSearch);
 $('close-search').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>returnFocus?.focus({preventScroll:true}));
 addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!dialog.open)showSearch();else input.focus();}});
 function search(){
  const query=input.value.trim().toLocaleLowerCase(),words=query.split(/\s+/).filter(Boolean);results.replaceChildren();
  if(!query){status.textContent=`可检索 ${entries.length} 条首页、场景、专题与档案段落。资料在本地检索，不发送到外部服务。`;const p=document.createElement('p');p.className='search-empty';p.textContent='试试“主角”“历史主线”“传送”“艺术质量”“素材”或某个场景名称。';results.append(p);return;}
  const matches=entries.map(entry=>{const title=entry.title.toLocaleLowerCase(),text=entry.text.toLocaleLowerCase();let score=0;for(const word of words){if(!title.includes(word)&&!text.includes(word))return null;score+=title.includes(word)?8:1;}return{entry,score};}).filter(Boolean).sort((a,b)=>b.score-a.score);
  status.textContent=`找到 ${matches.length} 条匹配${matches.length>30?'，显示前30条':''}。`;
  for(const {entry}of matches.slice(0,30)){
   const a=document.createElement('a');a.className='search-result';a.href=new URL(entry.href,base).href;const type=document.createElement('small');type.textContent=entry.kind;const h=document.createElement('strong');h.textContent=entry.title;
   const p=document.createElement('p'),text=entry.text.replace(/\s+/g,' '),at=text.toLocaleLowerCase().indexOf(words[0]),start=Math.max(0,at-36);p.textContent=(start?'…':'')+text.slice(start,start+150)+(text.length>start+150?'…':'');a.append(type,h,p);a.addEventListener('click',()=>dialog.close());results.append(a);
  }
  if(!matches.length){const p=document.createElement('p');p.className='search-empty';p.textContent='没有找到。可以减少关键词，或到“完整档案”按专题浏览。';results.append(p);}
 }
 input.addEventListener('input',search);
 const details=document.querySelector('.research-toc details');if(details&&matchMedia('(max-width:760px)').matches)details.open=false;
 const sections=[...document.querySelectorAll('[data-chapter]')],links=[...document.querySelectorAll('.research-toc nav a')];
 let scheduled=false;
 function updateChapter(){
  if(!sections.length)return;
  let current=sections[0];const edge=matchMedia('(max-width:760px)').matches?155:Math.min(230,innerHeight*.25);
  for(const section of sections)if(section.getBoundingClientRect().top<=edge)current=section;
  for(const link of links){if(link.hash==='#'+current.id)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');}
  if($('current-chapter'))$('current-chapter').textContent=current.dataset.chapter;
 }
 if(sections.length){
  for(const link of links)link.addEventListener('click',()=>{if(matchMedia('(max-width:760px)').matches)details.open=false;});
 }
 function progress(){const total=document.documentElement.scrollHeight-innerHeight;const bar=document.querySelector('.reading-progress');if(bar)bar.style.width=(total>0?Math.min(100,scrollY/total*100):0)+'%';updateChapter();scheduled=false;}
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(progress);}}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);progress();
})();

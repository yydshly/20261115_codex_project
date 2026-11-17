import { loadFreeAssets, drawSample } from './free-assets.mjs';
const grid=document.getElementById('material-grid'), toggle=document.getElementById('motion-toggle');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let paused=reduced, time=0, last=performance.now();
function syncToggle(){toggle.textContent=paused?'播放预览动画':'暂停预览动画';toggle.setAttribute('aria-pressed',String(paused));}
syncToggle();toggle.addEventListener('click',()=>{paused=!paused;syncToggle();});
try {
  const free=await loadFreeAssets();
  const previews=[];
  for(const [i,a] of free.manifest.assets.entries()) {
    const card=document.createElement('article');card.className='material-card';card.dataset.pack=a.pack;
    const animations=Object.keys(a.states);
    card.innerHTML=`<div class="material-preview"><canvas width="320" height="240" role="img" aria-label="${a.title}实际素材放大预览"></canvas><span>${a.pack==='characters'?'原始精灵帧 · 游戏统一色调':'原始 PNG · 游戏统一色调'}</span></div><div class="material-copy"><span class="material-number">${String(i+1).padStart(2,'0')} / ${a.license}</span><h3>${a.title}</h3><dl><dt>在游戏里做什么</dt><dd>${a.purpose}</dd><dt>为什么选它</dt><dd>${a.emotion}</dd><dt>去哪里看</dt><dd>${a.placement}</dd></dl><div class="preview-states">${animations.length>1?animations.map(s=>`<button data-state="${s}" aria-pressed="${s==='idle'}">${s==='walk'?'走动':'待机'}预览</button>`).join(''):''}</div><details><summary>原文件与接入细节</summary><ul>${Object.entries(a.states).map(([s,p])=>`<li><code>${p.file}</code><br>${p.frames} 帧 · 每帧 ${p.frameWidth} × ${p.frameHeight} · ${s==='walk'?'走动':p.frames>1?'待机':'静态'}${p.frames>1?` · 本站播放 ${p.fps} fps`:''}</li>`).join('')}</ul><p>${a.adaptation}</p></details><div class="material-credit"><span>SpriteCook 免费样例</span><a href="${a.sourceUrl}" target="_blank" rel="noreferrer">官方原例 ↗</a></div></div>`;
    const preview={card,canvas:card.querySelector('canvas'),id:a.id,state:'idle'};previews.push(preview);
    card.querySelectorAll('[data-state]').forEach(b=>b.addEventListener('click',()=>{
      preview.state=b.dataset.state;card.querySelectorAll('[data-state]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    }));grid.append(card);
  }
  document.querySelectorAll('.material-filters [data-pack]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.material-filters [data-pack]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    let count=0;for(const p of previews){p.card.hidden=b.dataset.pack!=='all'&&p.card.dataset.pack!==b.dataset.pack;if(!p.card.hidden)count++;}
    document.getElementById('catalog-count').textContent=`显示 ${count} 项实际素材`;
  }));
  function frame(now){
    if(!paused&&!document.hidden)time+=Math.min((now-last)/1000,.05);last=now;
    for(const p of previews){
      if(p.card.hidden)continue;
      const c=p.canvas.getContext('2d'),pose=free.entries[p.id].states[p.state],b=pose.bounds;
      const scale=Math.min(168/(b[3]-b[1]),235/(b[2]-b[0]));
      c.clearRect(0,0,320,240);c.fillStyle='#6a805220';c.beginPath();c.ellipse(160,201,Math.min(60,(b[2]-b[0])*scale*.4),8,0,0,Math.PI*2);c.fill();
      drawSample(c,free,p.id,160,202,{time,state:p.state,scale});
    }
    requestAnimationFrame(frame);
  }requestAnimationFrame(frame);
} catch(error) {const out=document.getElementById('material-error');out.hidden=false;out.textContent=error.message;console.error(error);}

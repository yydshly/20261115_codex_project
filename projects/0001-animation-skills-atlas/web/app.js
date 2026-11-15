(() => {
  'use strict';
  const data = window.ANIMATION_ATLAS;
  const $ = (selector) => document.querySelector(selector);
  const escape = (text) => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const paths = {
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    spark: '<path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z"/><path d="M20 2v4m-2-2h4"/>',
    route: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h8a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h8"/>',
    book: '<path d="M12 5c-2-2-6-2-9-1v15c3-1 7-1 9 1 2-2 6-2 9-1V4c-3-1-7-1-9 1zM12 5v15"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4m-4 6h4M17 9h4m-4 6h4m-10-6 4 3-4 3z"/>',
    nodes: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M6 9v6m3 3h6M9 6h9v9"/>',
    wave: '<path d="M2 13c4-14 6 14 10 0s6 14 10 0"/><path d="M3 20h18"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8zM3 13l9 5 9-5M3 18l9 5 9-5"/>',
    cube: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M8 4l9 5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="m8 4 12 8-12 8z"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4 4L19 6"/>'
  };
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  const hydrateIcons = (root = document) => root.querySelectorAll('[data-icon]').forEach(node => node.innerHTML = icon(node.dataset.icon));
  const colors = {
    video:['#e7efd9','#6d8747'], explain:['#ece7f5','#9b88b3'], motion:['#e7ecfb','#7787b8'],
    canvas:['#f8ebe2','#c28e70'], three:['#e5efe9','#7a9989'], finish:['#f4edda','#b39b60']
  };
  const monograms = {remotion:'R', 'motion-canvas':'MC', motion:'≋', ola:'o', anime:'a', manim:'M', shifty:'S', two:'2', lottie:'L', tweenjs:'Tw', lume:'◈', gifenc:'gif', konva:'K', blender:'◉', three:'△', godot:'G', babylon:'B', proton:'✳'};
  const logo = (tool) => `<span class="tool-monogram" aria-hidden="true" style="--tint:${colors[tool.group][0]};--color:${colors[tool.group][1]};${tool.id==='motion-canvas'||tool.id==='gifenc'?'font-size:11px;':''}">${monograms[tool.id]}</span>`;
  const groupFor = (tool) => data.groups.find(group => group.id === tool.group);
  const repositoryUrl = (tool) => `https://github.com/${tool.repo}`;
  const sourceUrl = (tool) => tool.ref ? `${repositoryUrl(tool)}/blob/${tool.ref}/${tool.id === 'babylon' ? 'readme.md' : 'README.md'}` : repositoryUrl(tool);
  let activeGroup = 'all';
  let activeRoute = data.routes[0].id;
  let previousFocus = null;
  let toastTimer;
  const dialog = $('#tool-dialog');

  function renderFilters() {
    const entries = [{id:'all',name:'全部资源',icon:'grid'},...data.groups];
    $('#group-filters').innerHTML = entries.map(group => `<button type="button" class="group-button ${activeGroup === group.id ? 'active' : ''}" aria-pressed="${activeGroup === group.id}" data-group="${group.id}">${icon(group.icon)}${escape(group.name)}<span>${group.id === 'all' ? data.tools.length : data.tools.filter(tool => tool.group === group.id).length}</span></button>`).join('');
  }

  function renderTools() {
    const query = $('#search').value.trim().toLocaleLowerCase();
    const kind = $('#kind-filter').value;
    const filtered = data.tools.filter(tool => {
      const searchText = [tool.name,tool.repo,tool.tagline,tool.description,tool.stack,tool.shape,tool.usecase,tool.aiUsage,tool.output,...tool.capabilities,groupFor(tool).name].join(' ').toLocaleLowerCase();
      return (activeGroup === 'all' || tool.group === activeGroup) && (kind === 'all' || (kind === 'official' ? tool.officialSkill : tool.kind === kind)) && (!query || searchText.includes(query));
    });
    $('#tool-grid').innerHTML = filtered.map(tool => `<article class="tool-card"><div class="card-top">${logo(tool)}${tool.officialSkill ? '<span class="pill green">官方 Skill</span>' : `<span class="pill">${escape(tool.shape)}</span>`}<span class="tool-number">${tool.number}</span></div><h3><button type="button" class="card-title" data-tool="${tool.id}" aria-haspopup="dialog">${escape(tool.name)}</button></h3><p class="card-description">${escape(tool.tagline)}</p><div class="card-tags">${tool.capabilities.map(tag=>`<span>${escape(tag)}</span>`).join('')}</div><div class="card-bottom"><span>${escape(tool.stack)}</span><span class="card-arrow" aria-hidden="true">↗</span></div></article>`).join('');
    $('#empty-state').hidden = filtered.length !== 0;
    $('#result-count').textContent = query || kind !== 'all' || activeGroup !== 'all' ? `找到 ${filtered.length} 项资源 / 共 ${data.tools.length} 项` : `显示全部 ${data.tools.length} 项`;
    $('#reset-filters').hidden = !query && kind === 'all' && activeGroup === 'all';
  }

  function resetFilters() {
    activeGroup = 'all'; $('#search').value = ''; $('#kind-filter').value = 'all'; renderFilters(); renderTools();
  }

  function showDetail(id, changeHash = true) {
    const tool = data.tools.find(item => item.id === id);
    if (!tool) return;
    previousFocus = document.activeElement;
    $('#detail-content').innerHTML = `<div class="detail-header">${logo(tool)}<div><h2 id="detail-title">${escape(tool.name)}</h2><p>${escape(tool.shape)} · ${escape(tool.stack)}</p></div><button type="button" class="close-dialog" aria-label="关闭项目详情">${icon('close')}</button></div><div class="detail-body"><div class="card-tags">${tool.capabilities.map(tag=>`<span>${escape(tag)}</span>`).join('')}${tool.officialSkill?'<span class="pill green">已确认官方 Skill 入口</span>':''}</div><p class="detail-description">${escape(tool.description)}</p><div class="detail-grid"><div class="detail-block"><h3>适合做什么</h3><p>${escape(tool.usecase)}</p></div><div class="detail-block"><h3>得到什么</h3><p>${escape(tool.output)}</p></div><div class="detail-block full"><h3>怎样配合 AI 使用</h3><p>${escape(tool.aiUsage)}</p></div><div class="detail-block full"><h3>使用边界</h3><p>${escape(tool.boundary)}</p></div></div><div class="detail-prompt"><div><h3>试着这样描述需求 · 本站示例</h3><button type="button" class="copy-button" data-copy="${escape(tool.prompt)}" aria-label="复制 ${escape(tool.name)} 示例提示词">${icon('copy')}</button></div><p>${escape(tool.prompt)}</p></div>${tool.command ? `<div class="command-block"><code>${escape(tool.command)}</code><button type="button" class="copy-button" data-copy="${escape(tool.command)}" aria-label="复制安装命令">${icon('copy')}</button></div>` : ''}<div class="detail-links"><a class="button primary" href="${repositoryUrl(tool)}" target="_blank" rel="noopener noreferrer">原始仓库 ↗</a><a class="button secondary" href="${sourceUrl(tool)}" target="_blank" rel="noopener noreferrer">阅读官方说明 ↗</a>${tool.skillRepo?`<a class="button secondary" href="${tool.skillRepo}" target="_blank" rel="noopener noreferrer">官方 AI Kit ↗</a>`:''}</div><p class="source-note">文档核对：${escape(data.checkedAt)} · ${escape(tool.sourceNote)}<br>研究范围：${tool.ref ? `${escape(tool.ref)} 分支 README` : '默认分支 README'}；未逐一安装或运行上游项目。<br>许可及商业使用条件以原仓库和关联产品的当前条款为准。</p></div>`;
    if (!dialog.open) dialog.showModal();
    $('.close-dialog').addEventListener('click', () => dialog.close());
    if (changeHash) history.replaceState(null,'',`#tool-${id}`);
  }

  function renderRoute() {
    $('#route-tabs').innerHTML = data.routes.map(route => `<button type="button" class="route-tab" id="route-tab-${route.id}" role="tab" aria-selected="${route.id===activeRoute}" aria-controls="route-panel" tabindex="${route.id===activeRoute?'0':'-1'}" data-route="${route.id}">${icon(route.icon)}${escape(route.label)}<span aria-hidden="true">↗</span></button>`).join('');
    const route = data.routes.find(item=>item.id===activeRoute);
    $('#route-panel').setAttribute('aria-labelledby',`route-tab-${route.id}`);
    $('#route-panel').innerHTML = `<h3>${escape(route.title)}</h3><div class="card-tags">${route.tools.map(tool=>`<span>${escape(tool)}</span>`).join('')}</div><p>${escape(route.text)}</p><div class="prompt-preview"><p>${escape(route.prompt)}</p><button type="button" class="copy-button" data-copy="${escape(route.prompt)}" aria-label="复制${escape(route.label)}制作需求">${icon('copy')}</button></div>`;
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      toast('已复制，可粘贴给你的编码助手');
    } catch (_) {
      // Local file pages may not expose Clipboard API. A selected text field is the fallback.
      const originalFocus = document.activeElement;
      const field = document.createElement('textarea');
      field.value = value; field.style.cssText='position:fixed;opacity:0;left:0;top:0';
      const parent = dialog.open ? dialog : document.body;
      parent.append(field); field.focus(); field.select();
      const copied = document.execCommand('copy'); field.remove();
      if (originalFocus?.isConnected) originalFocus.focus({preventScroll:true});
      toast(copied ? '已复制，可粘贴给你的编码助手' : '浏览器未允许复制，请手动选择文字');
    }
  }
  function toast(message) {
    const node = $('#toast'); clearTimeout(toastTimer); node.textContent=message; node.classList.add('visible');
    toastTimer=setTimeout(()=>node.classList.remove('visible'),2800);
  }

  hydrateIcons(); renderFilters(); renderTools(); renderRoute();
  $('#skill-list').innerHTML=data.skills.map(([name,title,description])=>`<details><summary><code>/${escape(name)}</code><span>${escape(title)}</span></summary><p>${escape(description)}</p></details>`).join('');
  $('#search').addEventListener('input',renderTools);
  $('#kind-filter').addEventListener('change',renderTools);
  $('#reset-filters').addEventListener('click',resetFilters);
  $('#empty-reset').addEventListener('click',resetFilters);
  $('#group-filters').addEventListener('click',event=>{
    const button = event.target.closest('[data-group]'); if(!button) return;
    activeGroup=button.dataset.group; renderFilters(); renderTools();
    $(`[data-group="${activeGroup}"]`).focus({preventScroll:true});
  });
  $('#tool-grid').addEventListener('click',event=>{
    const button=event.target.closest('[data-tool]'); if(button) showDetail(button.dataset.tool);
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-copy]'); if(button) copyText(button.dataset.copy);
  });
  $('#route-tabs').addEventListener('click',event=>{
    const button=event.target.closest('[data-route]'); if(!button)return;
    activeRoute=button.dataset.route; renderRoute(); $(`#route-tab-${activeRoute}`).focus({preventScroll:true});
  });
  $('#route-tabs').addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault(); let index=data.routes.findIndex(route=>route.id===activeRoute);
    if(event.key==='Home') index=0; else if(event.key==='End') index=data.routes.length-1;
    else index=(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+data.routes.length)%data.routes.length;
    activeRoute=data.routes[index].id; renderRoute(); $(`#route-tab-${activeRoute}`).focus({preventScroll:true});
  });
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const bounds=dialog.getBoundingClientRect();
    if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
  });
  dialog.addEventListener('close',()=>{
    if(location.hash.startsWith('#tool-')) history.replaceState(null,'','#resources');
    if(previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='/'&&!dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault(); $('#search').focus();}
  });
  $('#motion-toggle').addEventListener('click',()=>{
    const paused=$('.motion-art').classList.toggle('paused');
    $('#motion-toggle').innerHTML=icon(paused?'play':'pause');
    $('#motion-toggle').setAttribute('aria-label',paused?'播放示意动画':'暂停示意动画');
    $('#motion-toggle').setAttribute('aria-pressed',String(paused));
  });
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){$('.motion-art').classList.add('paused');$('#motion-toggle').innerHTML=icon('pause');$('#motion-toggle').disabled=true;$('#motion-toggle').setAttribute('aria-label','已按系统设置减少动态效果');$('#motion-toggle').setAttribute('aria-pressed','true');}
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
    if(!visible.length)return;
    document.querySelectorAll('.nav-link').forEach(link=>link.classList.toggle('active',link.dataset.section===visible[0].target.id));
  },{rootMargin:'-10% 0px -65% 0px',threshold:0});
  document.querySelectorAll('.section-anchor').forEach(section=>observer.observe(section));
  function handleHash(){if(location.hash.startsWith('#tool-'))showDetail(location.hash.slice(6),false);}
  window.addEventListener('hashchange',handleHash); handleHash();
})();

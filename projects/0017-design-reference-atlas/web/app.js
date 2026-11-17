"use strict";

const $ = (selector) => document.querySelector(selector);
const storageKey = "guanshi-design-atlas-v1-favorites";
let catalog, analysis = {}, readingGuide = {}, previews = {}, favoriteIds = new Set(), state = {category:"all", query:"", favorites:false, preview:false, sort:"original", view:"grid", expanded:true}, filtered = [], currentSite = null, returnFocus = null, toastTimer;
const categoryEnglish = {awards:"AWARDS & COMPETITIONS",motion:"MOTION & VIDEO","three-d":"3D & RENDERING",cinema:"CINEMATOGRAPHY",ui:"UI DESIGN",web:"WEB INSPIRATION",frontend:"FRONTEND & INTERACTION","type-color":"TYPE & COLOR",collect:"COLLECTING INSPIRATION"};
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = (value) => {try {const u=new URL(value);return ["https:","http:"].includes(u.protocol) ? u.href : "#";} catch {return "#";}};
const domain = (url) => {try{return new URL(url).hostname.replace(/^www\./,"");}catch{return "";}};
const categoryOf = (site) => catalog.categories.find(c=>c.id===site.category);
const analysisOf = (site) => analysis[String(site.id)] || null;
const analysisText = (site) => {const a=analysisOf(site);return a ? [a.subject,a.effect,a.mechanism,a.value,a.practice].join(" ") : "";};
const previewOf = (site) => previews[String(site.id)] || {};
const imageOf = (site) => {const p=previewOf(site);return (p.status === "ok" || p.status === "success") && p.src ? p.src : "";};
const shortKind = (site) => {const p=previewOf(site);return p.kind || "暂缺预览";};
const exampleOf = (site) => {const p=previewOf(site);return {url:safeUrl(p.example_url || site.example?.url || site.url),title:p.example_title || site.example?.title || "官方示例入口",kind:site.example?.kind || "官方站点"};};

function readFavorites(){try {const ids=JSON.parse(localStorage.getItem(storageKey)||"[]");if(Array.isArray(ids))favoriteIds=new Set(ids.filter(n=>Number.isInteger(n)&&n>=1&&n<=100));}catch{favoriteIds=new Set();}}
function saveFavorites(){try{localStorage.setItem(storageKey,JSON.stringify([...favoriteIds]));}catch{toast("当前浏览器不能保存收藏，可导出目录留存。");}}
function toast(message){$("#toast").textContent=message;$("#toast").classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("#toast").classList.remove("visible"),2400);}
function readHash(){const p=new URLSearchParams(location.hash.slice(1));const category=p.get("category")||"all";state.category=catalog.categories.some(c=>c.id===category)?category:"all";state.query=(p.get("q")||"").slice(0,200);state.favorites=p.get("saved")==="1";state.preview=p.get("preview")==="1";state.sort=p.get("sort")==="name"?"name":"original";state.view=p.get("view")==="list"?"list":"grid";state.expanded=p.get("compact")!=="1";$("#search").value=state.query;$("#sort").value=state.sort;}
function updateHash(){const p=new URLSearchParams();if(state.category!=="all")p.set("category",state.category);if(state.query)p.set("q",state.query);if(state.favorites)p.set("saved","1");if(state.preview)p.set("preview","1");if(state.sort!=="original")p.set("sort",state.sort);if(state.view!=="grid")p.set("view",state.view);if(!state.expanded)p.set("compact","1");const hash=p.toString();try{history.replaceState(null,"",`${location.pathname}${location.search}${hash?"#"+hash:""}`);}catch{/* File readers may restrict history updates. */}}

function renderCategories(){const categories=[{id:"all",name:"全部网站",count:100},...catalog.categories];$("#categories").innerHTML=categories.map((c,i)=>`<button class="category-button" data-category="${escapeHtml(c.id)}" aria-pressed="${state.category===c.id}"><span><i>${i?String(i).padStart(2,"0"):"✳"}</i>${escapeHtml(c.name)}</span><b>${String(c.count).padStart(2,"0")}</b></button>`).join("");}
function imageMarkup(site,detail=false){const src=imageOf(site);return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(site.name)} · ${escapeHtml(shortKind(site))}" ${detail?"":"loading=\"lazy\""} decoding="async"><span class="image-badge">${escapeHtml(shortKind(site))}</span>` : `<div class="fallback"><strong>${escapeHtml(site.name)}</strong><span>暂未取得预览 · 可打开官方示例</span></div>`;}
function cardMarkup(site){
  const cat=categoryOf(site), example=exampleOf(site), saved=favoriteIds.has(site.id), a=analysisOf(site);
  const interpretation=a&&state.expanded ? `<dl class="card-analysis"><div><dt>效果</dt><dd>${escapeHtml(a.effect)}</dd></div><div><dt>实现</dt><dd>${escapeHtml(a.mechanism)}</dd></div><div><dt>价值</dt><dd>${escapeHtml(a.value)}</dd></div></dl>` : "";
  return `<article class="site-card" data-id="${site.id}"><button class="preview" data-detail="${site.id}" aria-label="查看 ${escapeHtml(site.name)} 的效果解析">${imageMarkup(site)}</button><div class="card-top"><span class="category-tag">${String(site.id).padStart(3,"0")} / ${escapeHtml(cat?.name)}</span><button class="bookmark" data-save="${site.id}" aria-label="${saved?"取消收藏":"收藏"} ${escapeHtml(site.name)}" aria-pressed="${saved}">${saved?"♥":"♡"}</button></div><h3><a href="${safeUrl(site.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site.name)}</a></h3><p class="card-purpose">${escapeHtml(site.purpose)}</p>${interpretation}<div class="card-bottom"><span class="card-domain" title="${escapeHtml(site.url)}">${escapeHtml(domain(site.url))}</span><a href="${example.url}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(example.title)}" aria-label="查看 ${escapeHtml(site.name)} 的${escapeHtml(example.kind)}">看示例 ↗</a><button data-detail="${site.id}" aria-label="查看 ${escapeHtml(site.name)} 完整解析">看解析 ＋</button></div></article>`;
}
function bindImageFailures(root){root.querySelectorAll("img").forEach(img=>img.addEventListener("error",()=>{const box=img.parentElement;if(!box)return;const fallback=document.createElement("div");fallback.className="fallback";const title=document.createElement("strong");title.textContent=img.alt.split(" · ")[0];const note=document.createElement("span");note.textContent="图片未能读取 · 可打开官方示例";fallback.append(title,note);img.remove();box.querySelector(".image-badge")?.remove();box.append(fallback);},{once:true}));}
function renderGuide(){
  const g=readingGuide.categories?.[state.category] || readingGuide.categories?.all;
  if(!g)return;
  const name=state.category==="all"?"读懂这份目录":`${catalog.categories.find(c=>c.id===state.category)?.name}，应该怎么用？`;
  $("#category-guide").hidden=!state.expanded;
  $("#category-guide").innerHTML=`<div class="guide-heading"><p class="eyebrow">READ THE EFFECT</p><h3 id="guide-title">${escapeHtml(name)}</h3><span>${escapeHtml(g.role)}</span></div><div class="guide-columns"><div><b>01 / 效果是什么</b><p>${escapeHtml(g.effect)}</p></div><div><b>02 / 如何实现</b><p>${escapeHtml(g.mechanism)}</p></div><div><b>03 / 对我们的价值</b><p>${escapeHtml(g.value)}</p></div></div><p class="guide-note">分类解读为本库综合判断；每个条目的具体依据与适用范围，见「看解析」。</p>`;
}

function renderApplications(){
  $("#application-grid").innerHTML=(readingGuide.applications||[]).map((a,i)=>`<article class="application"><div class="application-title"><span>${String(i+1).padStart(2,"0")}</span><h3>${escapeHtml(a.title)}</h3></div><p class="application-effect">${escapeHtml(a.effect)}</p><dl><div><dt>实现路线</dt><dd>${escapeHtml(a.route)}</dd></div><div><dt>先带回一个成果</dt><dd>${escapeHtml(a.output)}</dd></div></dl><div class="application-sites">${a.sites.map(id=>{const site=catalog.sites.find(s=>s.id===id);return `<button data-detail="${id}" aria-label="查看 ${escapeHtml(site.name)} 完整解析">${escapeHtml(site.name)} ↗</button>`;}).join("")}</div></article>`).join("");
}

function detailAnalysisMarkup(site){
  const a=analysisOf(site);if(!a)return "";
  return `<section class="full-analysis" aria-label="效果、实现与价值解析"><div class="analysis-context"><p><span>解析对象</span>${escapeHtml(a.subject)}</p><small>依据：${escapeHtml(a.evidence_level)}</small></div><div class="analysis-sections"><section><h3><em>01</em>效果是什么？</h3><p>${escapeHtml(a.effect)}</p></section><section><h3><em>02</em>如何实现？</h3><p>${escapeHtml(a.mechanism)}</p></section><section><h3><em>03</em>对我们的价值是什么？</h3><p>${escapeHtml(a.value)}</p></section></div><div class="practice-task"><span>可以先做这个</span><p>${escapeHtml(a.practice)}</p></div><p class="analysis-boundary"><b>判断范围</b>${escapeHtml(a.boundary)}</p><details class="analysis-sources"><summary>解析依据与原始资料 <span>${a.sources.length}</span></summary><ul>${a.sources.map(source=>`<li><a href="${safeUrl(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)} ↗</a><p>${escapeHtml(source.note)}</p></li>`).join("")}</ul></details></section>`;
}

function render(){const tokens=state.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);filtered=catalog.sites.filter(s=>(state.category==="all"||s.category===state.category)&&(!state.favorites||favoriteIds.has(s.id))&&(!state.preview||imageOf(s))&&tokens.every(t=>`${s.id} ${s.name} ${s.url} ${s.purpose} ${s.look_for} ${s.tags.join(" ")} ${categoryOf(s)?.name} ${analysisText(s)}`.toLocaleLowerCase().includes(t)));if(state.sort==="name")filtered.sort((a,b)=>a.name.localeCompare(b.name,"en"));else filtered.sort((a,b)=>a.id-b.id);const cat=catalog.categories.find(c=>c.id===state.category);$("#category-title").innerHTML=`${escapeHtml(cat?.name||"所有网站")} <span>${cat?.count||100}</span>`;$("#section-label").textContent=categoryEnglish[state.category]||"ALL RESOURCES / 001—100";$("#category-description").textContent=cat?.subtitle||"跨越设计、影像与代码，打开你的参考视野。";$("#result-count").textContent=`${filtered.length} 个结果`;$("#favorite-count").textContent=favoriteIds.size;$("#favorites").setAttribute("aria-pressed",String(state.favorites));$("#only-preview").setAttribute("aria-pressed",String(state.preview));$("#clear").hidden=state.category==="all"&&!state.query&&!state.favorites&&!state.preview;$("#empty").hidden=filtered.length>0;$("#end-note").hidden=!filtered.length;$("#site-grid").className=`site-grid${state.view==="list"?" list":""}${!state.expanded?" is-compact":""}`;$("#site-grid").innerHTML=filtered.map(cardMarkup).join("");$("#grid-view").classList.toggle("active",state.view==="grid");$("#list-view").classList.toggle("active",state.view==="list");$("#grid-view").setAttribute("aria-pressed",String(state.view==="grid"));$("#list-view").setAttribute("aria-pressed",String(state.view==="list"));renderGuide();$("#show-analysis").setAttribute("aria-pressed",String(state.expanded));renderCategories();bindImageFailures($("#site-grid"));updateHash();}
function reset(){state={category:"all",query:"",favorites:false,preview:false,sort:"original",view:state.view,expanded:state.expanded};$("#search").value="";$("#sort").value="original";render();}
function toggleSave(id){const saved=favoriteIds.has(id);saved?favoriteIds.delete(id):favoriteIds.add(id);saveFavorites();render();if(currentSite===id&&$("#detail-dialog").open){const b=$("#detail-content [data-save]");if(b){b.textContent=saved?"♡":"♥";b.setAttribute("aria-pressed",String(!saved));b.setAttribute("aria-label",`${saved?"收藏":"取消收藏"} ${catalog.sites.find(s=>s.id===id).name}`);}}toast(saved?"已移出收藏":"已收藏，可在「我的收藏」中查看。");}

function showDetail(id){const s=catalog.sites.find(s=>s.id===id);if(!s)return;currentSite=id;returnFocus=document.activeElement;const p=previewOf(s),cat=categoryOf(s),example=exampleOf(s);$("#detail-content").innerHTML=`<div class="detail-image">${imageMarkup(s,true)}</div><div class="detail-body"><p class="detail-meta">${String(s.id).padStart(3,"0")} / ${escapeHtml(cat?.name)} / ${escapeHtml(shortKind(s))}</p><div class="detail-title-row"><h2 id="detail-title">${escapeHtml(s.name)}</h2><button class="bookmark" data-save="${s.id}" aria-label="${favoriteIds.has(s.id)?"取消收藏":"收藏"} ${escapeHtml(s.name)}" aria-pressed="${favoriteIds.has(s.id)}">${favoriteIds.has(s.id)?"♥":"♡"}</button></div><p class="detail-purpose">${escapeHtml(s.purpose)}</p>${detailAnalysisMarkup(s)}<div class="detail-columns"><div><h3>打开之后，重点看什么</h3><p>${escapeHtml(s.look_for)}</p><div class="detail-tags">${s.tags.map(t=>`<span>${escapeHtml(t)}</span>`).join("")}</div></div><div><h3>示例入口 / ${escapeHtml(example.kind)}</h3><p>${escapeHtml(example.title)}</p><p style="margin-top:9px;font-size:10px;color:#829374">${escapeHtml(s.access)}；当前规则以官网为准。</p></div></div><div class="detail-actions"><a class="solid-button" href="${example.url}" target="_blank" rel="noopener noreferrer">打开对应示例 <span>↗</span></a><a class="text-link" href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">前往网站 ↗</a><button class="text-link" data-copy="${s.id}">复制网站链接</button><button class="text-link" data-close-detail>返回目录</button></div><div class="detail-source"><p>${escapeHtml(p.caption || "本轮未能取得可用预览；可通过上方官方入口查看效果。")}</p>${p.page_url?`<p>预览来源：<a href="${safeUrl(p.page_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.page_url)}</a></p>`:""}${p.image_source?`<p>图像原址：<a href="${safeUrl(p.image_source)}" target="_blank" rel="noopener noreferrer">查看原图 ↗</a></p>`:""}<p>采集日期：${escapeHtml(p.fetched_at || p.accessed_at || "2026-11-16")} · 图片权利归原站及相关权利人。引用不代表素材可商用。</p></div></div>`;bindImageFailures($("#detail-content"));$("#detail-dialog").showModal();}
function closeDetail(){$("#detail-dialog").close();}
function renderHero(){$("#hero-overview-image").src=$("#overview-image").src;}

function exportCurrent(){
  const lines=["# 观式 · 设计与影像网站：效果、实现与价值","",`原始清单：${catalog.source.url}`,`原作者：${catalog.source.author}；用途与解析为本库整理，具体事实与复用建议以每条依据和范围为准。`,"",`当前筛选结果：${filtered.length} 个。图片版权及当前收费规则以原站为准。`,""];
  for(const c of catalog.categories){
    const group=filtered.filter(s=>s.category===c.id);if(!group.length)continue;
    lines.push(`## ${c.name}`,"");
    for(const s of group){
      const e=exampleOf(s),a=analysisOf(s);
      lines.push(`### ${String(s.id).padStart(3,"0")} · ${s.name}`,"",`- 网站：${s.url}`,`- 资源用途：${s.purpose}`,`- 示例：${e.title} — ${e.url}`,"");
      if(a)lines.push(`解析对象：${a.subject}`,`依据类型：${a.evidence_level}`,"","#### 效果是什么",a.effect,"","#### 如何实现",a.mechanism,"","#### 对我们的价值",a.value,"","#### 可以先做这个",a.practice,"",`判断范围：${a.boundary}`,"","解析依据：",...a.sources.map(x=>`- [${x.title}](${x.url})：${x.note}`),"");
      lines.push(`- 观察：${s.look_for}`,`- 访问说明：${s.access}`,"");
    }
  }
  const blob=new Blob([lines.join("\n")],{type:"text/markdown;charset=utf-8"});const anchor=document.createElement("a");const url=URL.createObjectURL(blob);anchor.href=url;anchor.download=`观式-${filtered.length}个网站-效果解析.md`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`已导出当前 ${filtered.length} 个网站及完整解析。`);
}

function downloadOverview(){
  const source=$("#overview-image").src;
  let url=source;
  if(source.startsWith("data:image/png;base64,")){
    const bytes=Uint8Array.from(atob(source.slice(source.indexOf(",")+1)),c=>c.charCodeAt(0));
    url=URL.createObjectURL(new Blob([bytes],{type:"image/png"}));
  }
  const link=document.createElement("a");
  link.href=url;link.download="观式-效果原理价值总览.png";
  document.body.append(link);link.click();link.remove();
  if(url!==source)setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function openOverview(){const panel=$("#overview-panel");panel.open=true;panel.scrollIntoView({block:"start",behavior:"smooth"});}

function events(){$("#show-overview").addEventListener("click",openOverview);$("#hero-open-overview").addEventListener("click",openOverview);$("#download-overview").addEventListener("click",downloadOverview);document.addEventListener("click",async e=>{if(e.target.closest("[data-close-detail]")){closeDetail();return;}const detail=e.target.closest("[data-detail]");if(detail){showDetail(Number(detail.dataset.detail));return;}const save=e.target.closest("[data-save]");if(save){toggleSave(Number(save.dataset.save));return;}const cat=e.target.closest("[data-category]");if(cat){state.category=cat.dataset.category;render();return;}const copy=e.target.closest("[data-copy]");if(copy){const url=catalog.sites.find(s=>s.id===Number(copy.dataset.copy))?.url;try{await navigator.clipboard.writeText(url);toast("已复制网站链接。");}catch{toast("复制不可用，请使用「前往网站」查看链接。");}}});$("#search").addEventListener("input",e=>{state.query=e.target.value;render();});$("#show-analysis").addEventListener("click",()=>{state.expanded=!state.expanded;render();});$("#sort").addEventListener("change",e=>{state.sort=e.target.value;render();});$("#favorites").addEventListener("click",()=>{state.favorites=!state.favorites;render();});$("#only-preview").addEventListener("click",()=>{state.preview=!state.preview;render();});$("#clear").addEventListener("click",reset);$("#empty-clear").addEventListener("click",reset);$("#grid-view").addEventListener("click",()=>{state.view="grid";render();});$("#list-view").addEventListener("click",()=>{state.view="list";render();});$("#detail-close").addEventListener("click",closeDetail);$("#detail-dialog").addEventListener("close",()=>{const id=currentSite;currentSite=null;if(returnFocus?.isConnected)returnFocus.focus();else document.querySelector(`.site-card[data-id="${id}"] .preview`)?.focus();});for(const id of ["detail-dialog","about-dialog"]){$("#"+id).addEventListener("click",e=>{if(e.target===$("#"+id)){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});}$("#about").addEventListener("click",()=>$("#about-dialog").showModal());$("#about-close").addEventListener("click",()=>$("#about-dialog").close());$("#export").addEventListener("click",exportCurrent);document.addEventListener("keydown",e=>{if(e.key==="/"&&!e.ctrlKey&&!e.metaKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!document.querySelector("dialog[open]")){e.preventDefault();$("#search").focus();}});window.addEventListener("hashchange",()=>{if(location.hash==="#explore"||location.hash==="#practice"||location.hash==="#applications"||location.hash==="#understanding")return;readHash();render();});window.addEventListener("storage",e=>{if(e.key===storageKey){readFavorites();render();}});}

async function init(){
  try{
    if(window.ATLAS_PAYLOAD){
      catalog=window.ATLAS_PAYLOAD.catalog;previews=window.ATLAS_PAYLOAD.previews.previews;analysis=window.ATLAS_PAYLOAD.analysis.sites;readingGuide=window.ATLAS_PAYLOAD.analysis.guide;
    }else{
      const paths=["catalog.json","previews.json","reading-guide.json","analysis-001-035.json","analysis-036-068.json","analysis-069-100.json"];
      const responses=await Promise.all(paths.map(path=>fetch(`data/${path}`)));
      for(let i=0;i<responses.length;i++)if(!responses[i].ok)throw new Error(`未能读取 ${paths[i]}`);
      const [c,p,g,...chunks]=await Promise.all(responses.map(response=>response.json()));
      catalog=c;previews=p.previews;readingGuide=g;analysis=Object.assign({},...chunks.map(chunk=>chunk.sites));
    }
    readFavorites();readHash();events();render();renderHero();renderApplications();
    const n=catalog.sites.filter(s=>imageOf(s)).length;
    $("#coverage").textContent=`本地目录共 ${catalog.sites.length} 个网站、${catalog.categories.length} 类，附 ${Object.keys(analysis).length} 份效果、实现与价值解析和 ${n} 个站点的真实预览。整理及采集日期：2026 年 11 月 16 日。`;
    $("#preview-note").textContent=`${Object.keys(analysis).length} 份效果解析 · ${n}/100 个站点有图。卡片为摘要；点击「看解析」阅读实现依据、项目价值与小练习。`;
  }catch(error){
    $("#result-count").textContent="目录暂未读取成功";
    $("#site-grid").innerHTML=`<div class="empty"><h3>目录资料未能载入。</h3><p>请双击离线版 dist/index.html，或运行项目中的 start.cmd。</p><p>${escapeHtml(error.message)}</p></div>`;
  }
}
init();

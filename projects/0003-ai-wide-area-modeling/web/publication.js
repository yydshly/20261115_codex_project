/* One catalogue API for local preview and the published, backend-free site. */
'use strict';
(() => {
  const root=new URL('.',document.currentScript.src),absolute=url=>new URL(url,root).href;
  let configPromise,catalogPromise,assetsPromise,assetMap={};
  const safe=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function config(){return configPromise??=fetch(absolute('media-config.json')).then(r=>r.ok?r.json():{mode:'local'}).catch(()=>({mode:'local'}));}
  async function loadCatalog(){
    if(catalogPromise)return catalogPromise;
    catalogPromise=(async()=>{const settings=await config();if(settings.mode==='published'){const r=await fetch(absolute(settings.catalog));if(!r.ok)throw Error('公开媒体目录无法读取');return{catalog:await r.json(),mode:'published'};}try{const r=await fetch(absolute('local-api/catalog'));if(!r.ok)throw Error();return{catalog:await r.json(),mode:'local'};}catch{const r=await fetch(absolute('image-library.json'));if(!r.ok)throw Error('图册无法读取');return{catalog:await r.json(),mode:'static'};}})();
    return catalogPromise;
  }
  async function ready(){return assetsPromise??=(async()=>{const settings=await config();if(settings.mode==='published'){const r=await fetch(absolute(settings.assets));if(!r.ok)throw Error('公开资源映射无法读取');assetMap=await r.json();}return assetMap;})();}
  function describe(url){const resolved=new URL(url,location.href),path=resolved.pathname.startsWith(root.pathname)?resolved.pathname.slice(root.pathname.length):'';return assetMap[path];}
  function asset(url){const entry=describe(url);return entry?absolute(entry.url):url;}
  async function decoded(entry){
    const response=await fetch(absolute(entry.url));if(!response.ok)throw Error('资源读取失败：'+response.status);
    const bytes=new Uint8Array(await response.arrayBuffer());let blob;
    if(entry.compressed&&bytes[0]===31&&bytes[1]===139){
      if(typeof DecompressionStream==='function')blob=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).blob();
      else{const {gunzipSync}=await import(absolute('engine/three/examples/jsm/libs/fflate.module.js'));blob=new Blob([gunzipSync(bytes)]);}
    }else blob=new Blob([bytes]);
    const buffer=await blob.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',buffer),hex=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(hex!==entry.sha256)throw Error('解压后文件校验不一致，已停止加载');
    return blob;
  }
  async function splat(SplatMesh,options){
    await ready();const entry=describe(options.url);
    if(!entry?.compressed)return new SplatMesh({...options,url:asset(options.url)});
    const blob=await decoded(entry),url=URL.createObjectURL(blob),mesh=new SplatMesh({...options,url,fileType:'ply',fileName:'recorded-output.ply'});
    mesh.initialized.then(()=>URL.revokeObjectURL(url),()=>URL.revokeObjectURL(url));return mesh;
  }
  function downloadLink(file){
    if(file.archiveOnly)return `<a href="${safe(file.url)}" target="_blank" rel="noopener">下载原始数据归档 ↗</a>`;
    if(file.compressed)return `<button class="text-button" data-public-download="${safe(file.id)}">下载原文件 ↓</button>`;
    return `<a href="${safe(file.url)}${file.url.includes('?')?'&':'?'}download=1" download="${safe(file.name)}">下载原文件 ↓</a>`;
  }
  document.addEventListener('click',async event=>{
    const trigger=event.target.closest('[data-public-download]');if(!trigger)return;
    trigger.disabled=true;const label=trigger.textContent;trigger.textContent='正在还原并校验…';
    try{const {catalog}=await loadCatalog(),file=catalog.files.find(f=>f.id===trigger.dataset.publicDownload);if(!file)throw Error('未登记此文件');const blob=await decoded(file),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);trigger.textContent='原文件已还原 ✓';}catch(error){trigger.textContent='下载失败：'+error.message;}finally{trigger.disabled=false;setTimeout(()=>trigger.textContent=label,5000);}
  });
  window.loadResearchCatalog=loadCatalog;
  window.researchPublication={ready,asset,splat,downloadLink,fetch:(url,options)=>fetch(asset(url),options),decoded};
})();

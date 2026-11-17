'use strict';
(async()=>{
  const title=document.querySelector('#record-title');
  const body=document.querySelector('#record-body');
  try {
    const response=await fetch('records/manifest.json');
    if(!response.ok)throw new Error('记录目录未加载，请先构建网页并通过本机服务打开。');
    const manifest=await response.json();
    const file=new URLSearchParams(location.search).get('file')||'README.md';
    if(!manifest.files.includes(file))throw new Error('此文件不在本次网页的公开证据清单中。请从研究手记的资料目录进入。');
    const path='records/'+file.split('/').map(encodeURIComponent).join('/');
    const record=await fetch(path);
    if(!record.ok)throw new Error('记录文件读取失败。');
    const text=await record.text();
    title.textContent=text.split('\n').find(line=>line.startsWith('# '))?.slice(2)||file;
    document.title=title.textContent+' · 研究原文';
    body.textContent=text;
    const download=document.querySelector('#record-download');download.href=path;download.hidden=false;
  } catch(error){title.textContent='未能读取记录';body.textContent=error.message;}
})();

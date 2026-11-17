const $=id=>document.getElementById(id),results=$('source-results');
const categoryOrder=['建筑与室内','植物与树木','岩石与地表','天空与高程','人物与动物','水流与声音','引擎与工具','记录与截图'];
const websites={'Poly Haven':'https://polyhaven.com/','Innerscene':'https://www.innerscene.com/tools/library','ambientCG':'https://ambientcg.com/','Grab3D':'https://grab3d.com/','Mapzen / AWS':'https://registry.opendata.aws/terrain-tiles/','Three.js / GitHub':'https://threejs.org/','GitHub':'https://github.com/'};
let catalog=null,origin='external';
const text=(tag,value,className)=>{const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;};
const normalize=value=>String(value).normalize('NFKC').toLocaleLowerCase();
function link(value,url,{download=false,label}={}){
  const node=text('a',value);
  if(url.startsWith('https://')){node.href=url;node.target='_blank';node.rel='noopener';}
  else if(url.startsWith('../')||url.startsWith('#'))node.href=url;
  else throw new Error('来源索引含无效链接');
  if(download)node.setAttribute('download','');if(label)node.setAttribute('aria-label',label);return node;
}
function localURL(path){if(!path.startsWith('web/')||path.includes('..'))throw new Error('来源记录路径无效');return '../'+path.slice(4);}
function applicable(item){return origin==='all'||item.origin===origin;}
function clearDeepLink(){if(location.hash.startsWith('#source-item-'))history.replaceState(null,'','#asset-sources');}
function searchable(item){
  const related=(item.dependencies||[]).map(id=>{const asset=catalog.items.find(a=>a.id===id);return [asset.id,asset.name,asset.element,asset.provider].join(' ');}).join(' ');
  return normalize([item.id,item.element,item.name,item.category,item.provider,item.authors,item.notes,item.license.label,...item.local_paths,related].join(' '));
}

function updateCategoryOptions(){
  const select=$('source-category'),previous=select.value;
  const categories=new Set(catalog.items.filter(applicable).map(item=>item.category));
  select.replaceChildren(Object.assign(document.createElement('option'),{value:'all',textContent:'全部分类'}));
  for(const category of categoryOrder.filter(c=>categories.has(c)))select.append(Object.assign(document.createElement('option'),{value:category,textContent:category}));
  select.value=categories.has(previous)?previous:'all';
}
function updateExpandLabel(){
  const groups=[...results.querySelectorAll('.source-group')];
  $('source-expand').disabled=groups.length===0;$('source-expand').textContent=groups.length&&groups.every(group=>group.open)?'收起分类':'展开分类';
}
function entry(item){
  const article=document.createElement('article');article.className='source-item';article.id='source-item-'+item.id;
  const identity=document.createElement('div');identity.className='source-identity';
  const marks=document.createElement('div');marks.className='source-marks';
  marks.append(text('span',item.origin==='procedural'?'程序内容':item.category==='引擎与工具'?'外部依赖':'外部素材','source-origin-mark'));
  marks.append(text('span',item.usage,'source-usage'));
  identity.append(marks,text('h4',item.element));
  identity.append(text('p',item.editions.map(v=>v==='code'?'V1 代码版':'V2 素材版').join(' / '),'source-editions'));
  identity.append(link('此项链接','#source-item-'+item.id,{label:'定位来源记录：'+item.element}));
  const source=document.createElement('div');source.className='source-attribution';
  const provider=text('p','来源网站 / ','source-provider');
  provider.append(websites[item.provider]?link(item.provider+' ↗',websites[item.provider]):text('span',item.provider));
  source.append(provider);
  if(item.source_url)source.append(text('span','原始链接 / ','source-link-label'),link(item.name+' ↗',item.source_url,{label:'原始链接：'+item.name}));
  else source.append(text('p',item.name+' · 原始实现见下方源码记录','source-local-name'));
  if(item.authors)source.append(text('p',item.authors,'source-author'));
  const license=text('p','许可 / ','source-license');
  license.append(item.license.url?link(item.license.label+' ↗',item.license.url):text('span',item.license.label));source.append(license);
  const details=document.createElement('details');details.className='source-records';details.append(text('summary','使用说明与本地记录'));
  details.append(text('p',item.notes,'source-notes'));
  if(item.dependencies?.length){
    const base=text('p','关联来源：','source-dependencies');
    item.dependencies.forEach((id,index)=>{const asset=catalog.items.find(a=>a.id===id);if(index)base.append(document.createTextNode(' · '));base.append(link(asset.name,'#source-item-'+id,{label:'查看关联来源：'+asset.name}));});details.append(base);
  }
  details.append(text('p','记录日期：'+(item.recorded_on||'详见原始说明与文件清单'),'source-date'));
  const paths=document.createElement('ul');paths.className='source-paths';
  for(const path of item.local_paths){const li=document.createElement('li');li.append(text('code',path));paths.append(li);}details.append(paths);
  const downloads=document.createElement('div');downloads.className='source-record-links';
  for(const record of item.records)downloads.append(link(record.label+' ↓',localURL(record.path),{download:true,label:record.label+'：'+item.element}));
  details.append(downloads);article.append(identity,source,details);return article;
}
function render(){
  if(!catalog)return;
  const query=normalize($('source-search').value.trim()),category=$('source-category').value;
  const list=catalog.items.filter(item=>applicable(item)&&(category==='all'||item.category===category)&&(!query||searchable(item).includes(query)));
  results.replaceChildren();
  for(const groupName of categoryOrder){
    const groupItems=list.filter(item=>item.category===groupName);if(!groupItems.length)continue;
    const group=document.createElement('details');group.className='source-group';group.open=Boolean(query)||category!=='all';
    const summary=document.createElement('summary'),heading=text('h3',groupName),count=text('span',groupItems.length+' 条','source-group-count');
    summary.append(heading,count);group.append(summary);const body=document.createElement('div');body.className='source-group-body';for(const item of groupItems)body.append(entry(item));group.append(body);results.append(group);
  }
  for(const button of document.querySelectorAll('[data-source-origin]'))button.setAttribute('aria-pressed',String(button.dataset.sourceOrigin===origin));
  $('source-empty').hidden=list.length>0;
  $('source-status').textContent=`显示 ${list.length} / ${catalog.items.length} 条记录 · 按获取时本地记录整理`;
  $('source-kind-note').textContent=origin==='procedural'?'这里记录本地几何、材质派生、动作与合成声音。涉及外部源模型或数据的处理，会保留关联来源；程序生成不等于无需记录原始素材许可。':origin==='all'?'外部素材与本地实现共同组成场景。按分类展开，查看原始链接、许可与本地记录。':'外部来源包含模型、贴图、高程数据，以及运行与离线处理依赖。按分类展开可查看每一项。';
  updateExpandLabel();
}
function revealHash(){
  if(!catalog||!location.hash.startsWith('#source-item-'))return;
  let id;try{id=decodeURIComponent(location.hash.slice('#source-item-'.length));}catch{return;}
  const item=catalog.items.find(i=>i.id===id);if(!item)return;
  origin=item.origin;$('source-search').value='';updateCategoryOptions();$('source-category').value=item.category;render();
  const article=document.getElementById('source-item-'+id);article.closest('.source-group').open=true;article.scrollIntoView({block:'start'});
}

for(const button of document.querySelectorAll('[data-source-origin]'))button.addEventListener('click',()=>{if(!catalog)return;clearDeepLink();origin=button.dataset.sourceOrigin;updateCategoryOptions();render();});
$('source-search').addEventListener('input',()=>{clearDeepLink();render();});
$('source-category').addEventListener('change',()=>{clearDeepLink();render();});
$('source-reset').addEventListener('click',()=>{clearDeepLink();origin='external';$('source-search').value='';$('source-category').value='all';updateCategoryOptions();render();});
$('source-expand').addEventListener('click',()=>{const groups=[...results.querySelectorAll('.source-group')],open=groups.some(group=>!group.open);for(const group of groups)group.open=open;updateExpandLabel();});
results.addEventListener('toggle',updateExpandLabel,true);window.addEventListener('hashchange',revealHash);
try{
  const response=await fetch(new URL('./assets/source-catalog.json',import.meta.url));if(!response.ok)throw new Error('本地来源索引加载失败');
  catalog=await response.json();if(catalog.schema_version!==1||!Array.isArray(catalog.items))throw new Error('来源索引格式不匹配');
  for(const kind of ['external','procedural','all'])document.querySelector(`[data-source-count="${kind}"]`).textContent=catalog.items.filter(item=>kind==='all'||item.origin===kind).length;
  for(const id of ['source-search','source-category','source-reset'])$(id).disabled=false;
  updateCategoryOptions();render();revealHash();
}catch(error){$('source-error').hidden=false;$('source-status').textContent='来源索引尚未载入';console.error(error);}

const editions={
  code:{label:'代码生成版',url:'../',poster:'./assets/code-overview.jpg',title:'看看这片溪谷最初的构造。',description:'代码生成版：程序化房屋、花木和山谷，结合实拍地表材质；体验空间布局与基础漫游。'},
  models:{label:'精致素材版',url:'../model-version/',poster:'./assets/models-overview.jpg',title:'在花径与溪水之间，走一走。',description:'精致素材版：窗内陈设、自然地表、水流与生活元素；风声、脚步和蹄声按场景变化。'}
};
const $=id=>document.getElementById(id),stage=$('scene-stage'),viewer=$('viewer');
let edition='models',frame=null,observer=null,timeout=null,generation=0;
let backgroundInert=[];
const prefersReducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

function setExpanded(expanded){
  viewer.classList.toggle('is-expanded',expanded);document.documentElement.classList.toggle('scene-expanded',expanded);
  $('fullscreen').textContent=expanded?'还原画面':'放大画面 ⛶';$('fullscreen').setAttribute('aria-pressed',String(expanded));
  if(expanded){
    viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');viewer.setAttribute('aria-label','溪谷花园漫游体验台');
    for(let node=viewer;node.parentElement&&node!==document.body;node=node.parentElement)for(const sibling of node.parentElement.children){if(sibling!==node){backgroundInert.push([sibling,sibling.inert]);sibling.inert=true;}}
  }else{
    for(const [node,wasInert]of backgroundInert)node.inert=wasInert;backgroundInert=[];
    viewer.removeAttribute('role');viewer.removeAttribute('aria-modal');viewer.removeAttribute('aria-label');
  }
}

function stopScene({announce=true}={}){
  generation++;observer?.disconnect();observer=null;clearTimeout(timeout);frame?.remove();frame=null;
  $('scene-start').hidden=false;$('scene-poster').hidden=false;$('scene-loading').hidden=true;$('scene-error').hidden=true;
  $('stop-scene').disabled=true;$('fullscreen').disabled=true;stage.setAttribute('aria-busy','false');
  if(announce)$('viewer-status').textContent='漫游已结束';
}
function chooseEdition(next){
  if(!editions[next])return;const resume=Boolean(frame);stopScene({announce:false});edition=next;const data=editions[next];
  document.querySelectorAll('[data-edition]').forEach(button=>{const selected=button.dataset.edition===next;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
  stage.setAttribute('aria-labelledby',next+'-tab');$('scene-poster').src=data.poster;$('scene-poster').alt=data.label+'预览';
  $('start-scene').replaceChildren(document.createTextNode('启动'+data.label+' '),Object.assign(document.createElement('span'),{textContent:'↗'}));
  $('scene-title').textContent=data.title;$('edition-description').textContent=data.description;$('scene-direct').href=data.url;
  $('viewer-status').textContent='已选择'+data.label;if(resume)startScene();
}
function showError(message,token){
  if(token!==generation)return;generation++;observer?.disconnect();clearTimeout(timeout);frame?.remove();frame=null;$('fullscreen').disabled=true;$('scene-loading').hidden=true;$('scene-error').hidden=false;$('scene-error-text').textContent=message;
  stage.setAttribute('aria-busy','false');$('viewer-status').textContent='场景尚未就绪';
}
function startScene(){
  stopScene({announce:false});const token=generation,data=editions[edition];
  $('scene-start').hidden=true;$('scene-loading').hidden=false;$('scene-loading-text').textContent='正在载入'+data.label+'，首次进入需要一些时间…';
  $('viewer-status').textContent='正在准备场景…';$('stop-scene').disabled=false;stage.setAttribute('aria-busy','true');
  frame=document.createElement('iframe');frame.title=data.label+'三维漫游';frame.src=data.url;frame.allow='fullscreen; autoplay';
  frame.addEventListener('load',()=>{
    if(token!==generation)return;
    try{
      const doc=frame.contentDocument,root=doc.querySelector('#experience');if(!root){showError('没有读取到三维场景，请使用独立打开入口检查。',token);return;}
      const inspect=()=>{
        if(token!==generation)return;
        if(!doc.querySelector('#failure')?.hidden){showError(doc.querySelector('#failure-detail')?.textContent||'场景加载失败，请重试。',token);return;}
        if(root.dataset.ready==='true'){
          clearTimeout(timeout);observer?.disconnect();$('scene-loading').hidden=true;$('scene-poster').hidden=true;$('fullscreen').disabled=false;
          stage.setAttribute('aria-busy','false');$('viewer-status').textContent=data.label+' · 已就绪';
        }
      };
      observer=new MutationObserver(inspect);observer.observe(root,{attributes:true,subtree:true,attributeFilter:['data-ready','hidden']});inspect();
      doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&!doc.pointerLockElement&&viewer.classList.contains('is-expanded')){setExpanded(false);$('fullscreen').focus();}});
    }catch{showError('嵌入预览无法读取场景状态，请使用独立打开入口。',token);}
  });
  stage.append(frame);
  timeout=setTimeout(()=>showError('场景载入时间较长，可重新载入或独立打开。',token),120000);
}

document.querySelectorAll('[data-edition]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.edition!==edition)chooseEdition(button.dataset.edition);}));
document.querySelector('.edition-switch').addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
  const next=event.key==='Home'?'models':event.key==='End'?'code':edition==='models'?'code':'models';chooseEdition(next);$(next+'-tab').focus();
});
document.querySelectorAll('[data-launch]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();stopScene({announce:false});chooseEdition(link.dataset.launch);startScene();
  viewer.scrollIntoView({behavior:prefersReducedMotion?'auto':'smooth',block:'start'});history.replaceState(null,'','#viewer');
}));
$('start-scene').addEventListener('click',startScene);$('retry-scene').addEventListener('click',startScene);
$('stop-scene').addEventListener('click',()=>{setExpanded(false);stopScene();$('start-scene').focus();});
$('fullscreen').addEventListener('click',()=>setExpanded(!viewer.classList.contains('is-expanded')));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&viewer.classList.contains('is-expanded')){setExpanded(false);$('fullscreen').focus();}});
window.addEventListener('pagehide',()=>{setExpanded(false);stopScene();});

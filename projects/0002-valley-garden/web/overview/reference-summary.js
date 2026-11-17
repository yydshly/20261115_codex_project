const $=id=>document.getElementById(id),postURL='https://x.com/siradisidekor/status/2121702120852492788';
const preview=$('reference-preview'),slot=$('reference-widget'),card=$('reference-card');
let generation=0,library=null;
function stopReference(announce=true){
  generation++;slot.replaceChildren();slot.hidden=true;preview.hidden=false;$('load-reference').disabled=false;$('close-reference').hidden=true;card.setAttribute('aria-busy','false');
  if(announce)$('reference-status').textContent='原帖已收起，可再次载入或直接在 X 打开。';
}
function widgetLibrary(){
  if(window.twttr?.widgets)return Promise.resolve(window.twttr);
  if(library)return library;
  library=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://platform.x.com/widgets.js';script.async=true;script.charset='utf-8';
    const timer=setTimeout(()=>{script.remove();reject(new Error('原帖嵌入加载超时'));},15000);
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('原帖嵌入暂时不可用'));};
    script.onload=()=>{
      if(window.twttr?.widgets){clearTimeout(timer);resolve(window.twttr);}
      else if(window.twttr?.ready)window.twttr.ready(value=>{clearTimeout(timer);resolve(value);});
      else{clearTimeout(timer);reject(new Error('原帖嵌入未就绪'));}
    };document.head.append(script);
  }).catch(error=>{library=null;throw error;});return library;
}
$('load-reference').addEventListener('click',async()=>{
  stopReference(false);const token=generation;$('load-reference').disabled=true;$('close-reference').hidden=false;card.setAttribute('aria-busy','true');
  $('reference-status').textContent='正在连接 X 官方嵌入…封面与原帖入口仍可使用。';
  let timer;
  try{
    const widgets=await widgetLibrary();if(token!==generation)return;
    slot.hidden=false;
    const content=await Promise.race([
      widgets.widgets.createTweet('2121702120852492788',slot,{conversation:'none',dnt:true,theme:'light',lang:'zh-cn',width:Math.min(550,Math.max(250,slot.clientWidth))}),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('原帖嵌入加载超时')),20000);})
    ]);
    clearTimeout(timer);if(token!==generation)return;if(!content||!slot.querySelector('iframe'))throw new Error('原帖嵌入暂未返回内容');
    preview.hidden=true;card.setAttribute('aria-busy','false');$('reference-status').textContent='原帖已嵌入，点击播放器播放；可随时收起。';
  }catch{
    clearTimeout(timer);if(token!==generation)return;stopReference(false);
    $('reference-status').textContent='原帖嵌入暂不可用。可查看封面，或通过“在 X 打开原帖”观看。';
  }
});
$('close-reference').addEventListener('click',()=>stopReference());
const poster=$('reference-poster');
function posterState(){const failed=poster.complete&&!poster.naturalWidth;poster.hidden=failed;$('reference-poster-fallback').hidden=!failed;}
poster.addEventListener('load',posterState);poster.addEventListener('error',posterState);if(poster.complete)posterState();

const dialog=$('summary-dialog');
if(typeof dialog.showModal==='function')for(const link of document.querySelectorAll('[data-open-summary]'))link.addEventListener('click',event=>{event.preventDefault();if(!dialog.open)dialog.showModal();});
$('close-summary').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
window.addEventListener('pagehide',()=>{stopReference(false);if(dialog.open)dialog.close();});

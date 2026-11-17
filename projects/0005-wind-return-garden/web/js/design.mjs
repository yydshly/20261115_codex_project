import {loadFreeAssets,drawSample} from './free-assets.mjs';

// Reading controls are deliberately independent of the game's save and clock.
function selectReading(buttons,panels,key,value){
 for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset[key]===value));
 for(const panel of panels)panel.hidden=panel.dataset[key+'Panel']!==value;
}
for(const key of ['place','day','agreement','mode']){
 const buttons=[...document.querySelectorAll(`[data-${key}]`)];
 const panels=[...document.querySelectorAll(`[data-${key}-panel]`)];
 for(const button of buttons)button.addEventListener('click',()=>selectReading(buttons,panels,key,button.dataset[key]));
 if(buttons.length)selectReading(buttons,panels,key,buttons[0].dataset[key]);
}
const scopeButtons=[...document.querySelectorAll('[data-scope]')];
const rows=[...document.querySelectorAll('[data-scope-row]')];
for(const button of scopeButtons)button.addEventListener('click',()=>{
 const scope=button.dataset.scope;
 for(const control of scopeButtons)control.setAttribute('aria-pressed',String(control===button));
 for(const row of rows)row.hidden=scope!=='all'&&row.dataset.scopeRow!==scope;
 const built=rows.filter(row=>row.dataset.scopeRow==='built').length,future=rows.filter(row=>row.dataset.scopeRow==='future').length;
 document.getElementById('scope-count').textContent=scope==='all'?`${rows.length} 项 · ${built} 项已实现，${future} 项后续构想`:`${rows.filter(row=>!row.hidden).length} 项${scope==='built'?'已实现':'后续构想'}`;
});

try{
 const assets=await loadFreeAssets();
 for(const canvas of document.querySelectorAll('[data-portrait]')){
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.translate(canvas.width/2,canvas.height-16);c.scale(3.5,3.5);
  drawSample(c,assets,canvas.dataset.portrait,0,0,{time:0});
 }
}catch(error){
 // The role descriptions remain readable if the optional sample portraits fail.
 for(const canvas of document.querySelectorAll('[data-portrait]')){canvas.hidden=true;const note=document.createElement('small');note.textContent='角色图像暂未载入，文字设定可继续阅读。';canvas.after(note);}
 console.warn('Design portraits could not load:',error.message);
}

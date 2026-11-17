import {copyLayout,applyLayout,undoLayout,validateLayout,MAILBOX,ROUTES,MATERIALS} from './arrangement.mjs';
import {LETTER_IDS,letterText,readLetter,replyLetter,recordStoryEvent,updateLetters,storyHint} from './letters.mjs';
import {drawLayoutPreview} from './arranging-drawing.mjs';
const $=id=>document.getElementById(id);
export function setupCourtyard({garden,ensureOutdoor,ensureStarted,save,changed,walk,actors,say}){
 let editing=false,draft=null,selected='clay',camera=834,valid=true,signature='';
 const dialog=$('neighbor-letter'),shell=document.querySelector('.game-shell');
 const chosen=()=>selected==='bench'?draft.bench:draft.pots.find(p=>p.id===selected);
 function check(){const result=validateLayout(draft,actors());valid=result.ok;$('placement-note').textContent=result.text;$('place-layout').disabled=!result.ok;return result;}
 function syncControls(){for(const id of ['layout-route','layout-material'])$(id).value=draft[id==='layout-route'?'route':'material'];$('layout-object').value=selected;check();}
 function start(){if(!ensureOutdoor())return;editing=true;draft=copyLayout(garden.layout);camera=selected==='bench'?draft.bench.x:draft.pots.find(p=>p.id===selected).x;syncControls();shell.classList.add('is-arranging');$('design-panel').hidden=false;say('选物件，再点地面预览。放好才会保存；可以撤回。',6);$('garden').scrollIntoView({block:'center',behavior:'smooth'});}
 function finish(){editing=false;draft=null;$('design-panel').hidden=true;shell.classList.remove('is-arranging');$('garden').focus({preventScroll:true});}
 function update(){const added=updateLetters(garden);if(added.length)say('信箱里又有一封信。等你愿意时，再慢慢读。',7);save();sync();}
 function sync(){
  const s=garden.story,l=garden.layout,key=JSON.stringify([s,l]);if(key===signature)return;signature=key;
  $('arrangement-summary').textContent=`两只陶盆，长椅与点心都已安顿 · ${ROUTES[l.route]} · ${MATERIALS[l.material]}`;
  $('undo-layout').disabled=!l.previous;
  $('story-hint').textContent=storyHint(garden);$('letter-progress').textContent=`${s.read.length} / 5 封已读`;
  $('letter-archive').replaceChildren(...LETTER_IDS.map((id,i)=>{const arrived=s.delivered.includes(id),article=document.createElement('article');article.className='letter-tile'+(arrived?' arrived':'');const small=document.createElement('small');small.textContent=`LETTER 0${i+1} · ${arrived?(s.read.includes(id)?'已读':'新来信'):'还在路上'}`;const title=document.createElement('h3');title.textContent=arrived?letterText(id,garden).title:'日子慢慢有回音';article.append(small,title);if(arrived){const b=document.createElement('button');b.textContent=s.read.includes(id)?'重读这封信':'拆开来信';b.addEventListener('click',()=>open(id));article.append(b);}else{const p=document.createElement('p');p.textContent='没有期限，照自己的步调生活。';article.append(p);}return article;}));
 }
 function open(id){if(editing)finish();if(!ensureStarted())return;id=id||garden.story.delivered.find(x=>!garden.story.read.includes(x))||garden.story.delivered.at(-1);if(!readLetter(garden,id))return;
  const text=letterText(id,garden);$('letter-title').textContent=text.title;$('letter-from').textContent=`${text.from} · 第 ${LETTER_IDS.indexOf(id)+1} 封`;
  $('letter-copy').replaceChildren(...text.paragraphs.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));
  const picked=garden.story.replies[id];$('reply-choices').replaceChildren(...text.choices.map(([choice,label])=>{const b=document.createElement('button');b.textContent=label;b.disabled=!!picked;b.classList.toggle('chosen',picked===choice);b.addEventListener('click',()=>{if(replyLetter(garden,id,choice)){update();open(id);}});return b;}));
  $('reply-note').textContent=picked?'这句话已经留在信里。回音会随你的日常慢慢到来。':text.choices.length?'留一句话给阿岚。选择后会保存，不用急着回复。':'信读完了，日子还会继续。随时可以回来重读。';
  if(!dialog.open)dialog.showModal();save();sync();
 }
 $('close-letter').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{$('garden').focus({preventScroll:true});});
 $('start-arranging').addEventListener('click',start);$('finish-arranging').addEventListener('click',finish);
 $('layout-object').addEventListener('change',e=>{selected=e.target.value;camera=chosen().x;check();});
 for(const id of ['layout-route','layout-material'])$(id).addEventListener('change',e=>{draft[id==='layout-route'?'route':'material']=e.target.value;check();});
 document.querySelectorAll('[data-nudge]').forEach(b=>b.addEventListener('click',()=>{const [dx,dy]=b.dataset.nudge.split(',').map(Number);chosen().x+=dx;chosen().y+=dy;camera=chosen().x;check();}));
 document.querySelectorAll('[data-pan]').forEach(b=>b.addEventListener('click',()=>{camera=Math.max(0,Math.min(960,camera+Number(b.dataset.pan)));}));
 document.querySelectorAll('[data-layout-spot]').forEach(b=>b.addEventListener('click',()=>{if(!editing)start();if(!editing)return;const [object,x,y]=b.dataset.layoutSpot.split(',');selected=object;Object.assign(chosen(),{x:Number(x),y:Number(y)});camera=Number(x);syncControls();}));
 $('place-layout').addEventListener('click',()=>{const result=applyLayout(garden,draft,actors());$('placement-note').textContent=result.text;if(result.ok){draft=copyLayout(garden.layout);changed();update();check();$('placement-note').textContent=result.text;}});
 $('undo-layout').addEventListener('click',()=>{if(!ensureOutdoor())return;const result=undoLayout(garden,actors());say(result.text,6);if(result.ok){if(editing){draft=copyLayout(garden.layout);syncControls();}changed();update();}});
 $('visit-mailbox').addEventListener('click',()=>walk({x:MAILBOX.x,y:MAILBOX.y+30}));$('rest-bench').addEventListener('click',()=>walk({x:garden.layout.bench.x,y:garden.layout.bench.y+30}));
 sync();
 return {get editing(){return editing;},get dialogOpen(){return dialog.open;},get camera(){return camera;},get renderLayout(){return editing?draft:garden.layout;},pointer(p){if(dialog.open)return true;if(!editing)return false;chosen().x=Math.round(p.x/12)*12;chosen().y=Math.round(p.y/12)*12;check();return true;},drawPreview(c){if(editing)drawLayoutPreview(c,draft,selected,valid);},openLetter:open,sync,event(name){recordStoryEvent(garden,name);update();},finish};
}

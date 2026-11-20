import {mainlineLessons} from './mainline-lessons.js';
import {seaEntry} from './mainline-sea.js';
import {epochs} from './ice-age.js';
import {coastalFogSource,seaCases,windCases} from './coastal-fog.js';
import {ridgeBayStations} from './ridge-bay-formation.js';

const voiceDirectory=new URL('./assets/mainline/',document.baseURI);
const phaseControls={
  walk:['地面步行','WASD 或方向键步行，左键拖动转向。'],
  time:['史前步行与航拍','干地用 WASD 或方向键步行。跨冰面、水域和陡坡时随导览航拍。'],
  boat:['引导航行','由导览沿岸航行。到站后可查看本段讲解，或继续前往下一站。'],
  entry:['从岩岸入水','由导览从海面进入水下。入水后暂停，可在小范围内潜游。'],
  dive:['水下观察','停留时用 WASD 或方向键局部潜游，E 上浮、Q 下潜，左键拖动转向，R 复位。']
};

function guidePhase(lesson,next,epoch){
  if(lesson.seaAt===undefined&&next?.seaAt===undefined)return epoch==='now'?'walk':'time';
  if(lesson.seaAt>seaEntry)return 'dive';
  return next?.seaAt>seaEntry?'entry':'boat';
}

async function voiceCatalog(){
  try{
    const response=await fetch(new URL('minimax.json',voiceDirectory),{cache:'no-cache'});
    return response.ok?(await response.json()).clips:{};
  }catch{return {};}
}

export function mountMainlineGuide(panel,{onPoint,onTravel,onPause,onStudy,onCompare,onCoastalChange}){
  panel.innerHTML=`
    <label for="mainline-chapter" class="mainline-chapter-label">主线站点</label>
    <select id="mainline-chapter">${mainlineLessons.map(({name},i)=>`<option value="${i}">${i+1} / ${mainlineLessons.length} · ${name}</option>`).join('')}</select>
    <div class="mainline-navigation" role="group" aria-label="主线行程操作">
      <button type="button" id="mainline-prev">上一站</button>
      <button type="button" id="mainline-next"></button>
      <button type="button" id="mainline-continuous" aria-pressed="false">连续导览</button>
    </div>
    <p class="benchmark-help"><strong id="mainline-phase"></strong> · <span id="mainline-control-hint"></span></p>
    <p id="mainline-travel" role="status"></p>
    <h3 id="mainline-title"></h3>
    <p id="mainline-reading"></p>
    <p id="mainline-task"></p>
    <div class="mainline-studies" id="mainline-studies"></div>
    <section id="mainline-coastal" aria-label="海流与沿岸海雾" hidden>
      <div class="mainline-studies" role="group" aria-label="海温对照">
        ${Object.entries(seaCases).map(([key,name])=>`<button type="button" data-sea-case="${key}">${name}</button>`).join('')}
      </div>
      <div class="mainline-studies" role="group" aria-label="海雾输送方向">
        ${Object.entries(windCases).map(([key,name])=>`<button type="button" data-wind-case="${key}">${name}</button>`).join('')}
        <button id="mainline-flow" type="button" aria-pressed="false">显示温度带和流向</button>
        <button id="mainline-fog-map" type="button" aria-pressed="false">俯看雾带</button>
      </div>
      <p id="mainline-sea-reading"></p>
      <p id="mainline-shore-reading"></p>
      <small id="mainline-flow-key" hidden>蓝色箭头标海流，金色箭头标风向。温度带越偏蓝，海面越冷。</small>
      <a href="${coastalFogSource}" target="_blank" rel="noopener">海雾形成参考 ↗</a>
    </section>
    <div class="mainline-voice">
      <button type="button" id="mainline-listen" disabled>播放本站讲解</button>
      <label><input id="mainline-autoplay" type="checkbox"> 到站自动讲解</label>
      <p id="mainline-voice-status" aria-live="polite"></p>
      <audio id="mainline-audio" controls hidden></audio>
    </div>`;
  const get=id=>panel.querySelector('#mainline-'+id);
  const audio=get('audio'),listen=get('listen'),select=get('chapter');
  const seaChoices=panel.querySelectorAll('[data-sea-case]'),windChoices=panel.querySelectorAll('[data-wind-case]');
  seaChoices.forEach(button=>button.addEventListener('click',()=>onCoastalChange({sea:button.dataset.seaCase})));
  windChoices.forEach(button=>button.addEventListener('click',()=>onCoastalChange({wind:button.dataset.windCase})));
  get('flow').addEventListener('click',()=>onCoastalChange({overlay:get('flow').getAttribute('aria-pressed')!=='true'}));
  get('fog-map').addEventListener('click',()=>onCoastalChange({overview:get('fog-map').getAttribute('aria-pressed')!=='true'}));
  let index=0,epoch='now',stage='reading',active=false,loaded=false,hasClip=false;
  let clips={},continuous=false,timer;
  const lesson=()=>mainlineLessons[index];

  function syncControls(){
    get('prev').disabled=index===0;
    listen.disabled=stage!=='reading'||!hasClip;
    get('studies').inert=stage!=='reading';
    get('fog-map').disabled=stage==='ahead';
    const next=mainlineLessons[index+1];
    const [phase,hint]=phaseControls[guidePhase(lesson(),stage==='reading'?null:next,epoch)];
    get('phase').textContent=phase;
    get('control-hint').textContent=hint;
    get('next').textContent=stage==='ahead'?'暂停前往':stage==='paused'?'继续前往 '+next.name:
      next?'前往 '+next.name+' →':'从雪岭重新开始';
    get('travel').textContent=stage==='ahead'?'正在沿实际路线前往 '+next.name:
      stage==='paused'?'已暂停，继续前往会从当前位置接上。':
      continuous?'短暂停留后继续沿线前往下一站。':'';
    get('continuous').setAttribute('aria-pressed',String(continuous));
    get('continuous').textContent=continuous?'暂停连续导览':'连续导览';
  }

  function loadReading(){
    audio.pause();audio.hidden=true;
    const id=lesson().id,file=clips?.[id]?.file;
    hasClip=typeof file==='string'&&new RegExp('^'+id+'-[a-f0-9]{12}\\.mp3$').test(file);
    if(hasClip)audio.src=new URL(file,voiceDirectory).href;
    else audio.removeAttribute('src');
    get('voice-status').textContent=hasClip?'MiniMax · 本站讲解':
      loaded?'本站可阅读讲稿。':'正在加载 MiniMax 音频。';
    syncControls();
  }

  function play(){
    if(!active||listen.disabled)return;
    audio.hidden=false;
    if(audio.ended)audio.currentTime=0;
    const source=audio.src;
    audio.play().catch(error=>{
      if(audio.src===source&&error.name!=='AbortError'){
        get('voice-status').textContent='音频未开始播放。可使用下方播放器重试。';
      }
    });
  }
  listen.addEventListener('click',()=>{if(audio.paused)play();else audio.pause();});
  audio.addEventListener('play',()=>{listen.textContent='暂停本站讲解';});
  for(const event of ['pause','ended'])audio.addEventListener(event,()=>{listen.textContent='播放本站讲解';});
  function paintStudies(){
    get('studies').replaceChildren();
    const current=lesson(),buttons=[...(current.studies??[])];
    if(epoch==='now'&&ridgeBayStations.some(station=>station.id===current.id)){
      buttons.unshift({label:'读本站地形剖面',plan:{ridgeBayStudy:{station:current.id}}});
    }
    if(current.compare&&epoch==='now')buttons.push({...current.compare});
    if(epoch!=='now')buttons.push({epoch:'now',label:'回现在'});
    for(const target of buttons){
      const button=document.createElement('button');
      button.type='button';button.textContent=target.label;
      button.addEventListener('click',()=>{
        audio.pause();
        if(target.epoch)onCompare(target.epoch);
        else onStudy(target.plan,index,epoch);
      });
      get('studies').append(button);
    }
    if(epoch!=='now'){
      const period=document.createElement('span');
      period.textContent=epochs[epoch].name;
      get('studies').append(period);
    }
  }

  function present(nextIndex,{locate=false,arrived=false}={}){
    index=nextIndex;stage='reading';
    if(index===mainlineLessons.length-1)stopContinuous();
    const {title,script,task}=lesson();
    select.value=String(index);
    get('title').textContent=title;
    get('reading').textContent=script;
    get('task').textContent=task;
    paintStudies();loadReading();
    if(locate)onPoint(lesson());
    if(arrived&&get('autoplay').checked)play();
    schedule();
  }

  function stopContinuous(){continuous=false;clearTimeout(timer);}
  function schedule(){
    clearTimeout(timer);
    if(active&&continuous&&stage==='reading'){
      timer=setTimeout(()=>audio.paused?advance():schedule(),3300);
    }
  }
  function advance(){
    clearTimeout(timer);
    if(index===mainlineLessons.length-1){present(0,{locate:true});return;}
    audio.pause();audio.hidden=true;stage='ahead';syncControls();
    const next=index+1;
    if(!onTravel(lesson(),mainlineLessons[next],()=>{
      present(next,{arrived:true});
    },()=>{
      if(stage==='ahead'){stopContinuous();stage='paused';syncControls();}
    })){
      stopContinuous();stage='reading';syncControls();
      get('travel').textContent='当前位置无法接上这一段。可在「主线站点」重新定位。';
    }
  }
  select.addEventListener('change',()=>{stopContinuous();present(Number(select.value),{locate:true});});
  get('prev').addEventListener('click',()=>{stopContinuous();present(index-1,{locate:true});});
  get('next').addEventListener('click',()=>{
    if(stage==='ahead'){onPause();return;}
    advance();
  });
  get('continuous').addEventListener('click',()=>{
    if(continuous){stopContinuous();if(stage==='ahead')onPause();syncControls();return;}
    if(index===mainlineLessons.length-1)present(0,{locate:true});
    continuous=true;
    if(stage==='ahead')syncControls();else advance();
  });

  voiceCatalog().then(catalog=>{
    clips=catalog;loaded=true;
    if(active)loadReading();
  });
  function renderCoastal(reading,settings){
    get('coastal').hidden=!reading;
    if(!reading)return;
    const {sea,air,dewPoint,visibility,shoreMist,outerMist}=reading;
    const update=(id,text)=>{const node=get(id);if(node.textContent!==text)node.textContent=text;};
    update('sea-reading',`海温 ${sea.toFixed(1)} °C · 近海面气温 ${air.toFixed(1)} °C · 露点 ${dewPoint.toFixed(1)} °C`);
    update('shore-reading',`航线能见度约 ${Math.round(visibility/10)*10} m · 岩岸${shoreMist>.10?'有雾':'清晰'} · 外侧海面${outerMist>.10?'有雾':'清晰'}`);
    seaChoices.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.seaCase===settings.sea)));
    windChoices.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.windCase===settings.wind)));
    get('flow').setAttribute('aria-pressed',String(settings.overlay));
    get('fog-map').setAttribute('aria-pressed',String(settings.overview));
    update('fog-map',settings.overview?'回到航行视角':'俯看雾带');
    get('flow-key').hidden=!settings.overlay;
  }
  return {
    show(i){panel.hidden=false;active=true;present(i,{locate:true});},
    hide(){stopContinuous();active=false;panel.hidden=true;stage='reading';audio.pause();},
    setEpoch(id){epoch=id;if(active){paintStudies();syncControls();}},
    renderCoastal,
    get active(){return active;},
    get index(){return index;}
  };
}

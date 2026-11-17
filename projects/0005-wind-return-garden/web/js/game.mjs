import { loadAssets } from './assets.mjs';
import { WindField, clamp } from './wind.mjs';
import { STATIONS, SAVE_KEY, chargeQuality, canRing } from './state.mjs';
import { findPath } from './navigation.mjs';
import { GardenScene } from './scene.mjs';
import { GardenAudio } from './audio.mjs';
import { CARE_SPOTS } from './free-assets.mjs';
import { BEDS, SEEDS, catActivity, WATER_COOLDOWN, PET_COOLDOWN, loadGarden, advanceGarden, plantSeed, waterPlant, petCat, plantStage, gardenPayload, addMemory } from './garden-life.mjs';
import { CatCompanion } from './companion.mjs';
import { drawBed } from './life-drawing.mjs';
import {environmentAt,setAtmosphere} from './atmosphere.mjs';
import {HOUSE_DOOR,HOME_ENTRY,HOME_PLACES,homeWalkable,nearestHomePlace} from './home-model.mjs';
import {setupCourtyard} from './courtyard-ui.mjs';
import {makeGardenWalkable,MAILBOX} from './arrangement.mjs';
import {createVisitGarden} from './visit-garden.mjs';
import {InteriorScene} from './interior-scene.mjs';

const $ = id => document.getElementById(id), canvas = $('garden'), ctx = canvas.getContext('2d', { alpha: false });
const sound = new GardenAudio(), wind = new WindField();
const previewVisit=new URLSearchParams(location.search).get('visit')==='preview';
let loaded,store;
try { store=previewVisit?sessionStorage:localStorage;loaded=loadGarden(store);if(previewVisit&&!store.getItem(SAVE_KEY))loaded.garden=createVisitGarden(); } catch { store={getItem(){return null;},setItem(){throw Error('unavailable');}};loaded=loadGarden(store);loaded.warning='浏览器暂时无法保存，当前散步仍可继续。'; }
if(previewVisit){const banner=document.createElement('div');banner.className='preview-banner';banner.textContent='独立体验庭院 · 初始花已开、风铃已响 · 刷新可继续，关闭此标签后结束 · 不影响你的主庭院';document.querySelector('main').prepend(banner);}
const garden=loaded.garden, stored=garden;
let interior, companion, nearBed=null, saveClock=0, externalChange=false, journalText='';
let completed = new Set(stored.completed), read = new Set(stored.completed);
let started = false, paused = false, ended = stored.ended, sitting = false, scene, walkable;
let indoorPlayer={x:garden.home.x,y:garden.home.y,face:garden.home.face,moving:false};
const activePlayer=()=>garden.home.inside?indoorPlayer:player;
const activeWalkable=()=>garden.home.inside?homeWalkable:walkable;
let player = { ...garden.player, moving: false }, path = [], keys = new Set(), chargeStart = null, charge = 0, simulationTime = 0;
let last = performance.now(), cameraX = 0, toastUntil = 0, closest = null, careSpot = null, uiClock = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduced) wind.ambient = false;
let bench = garden.layout.bench;
let courtyard;
const frozen=()=>courtyard?.editing||courtyard?.dialogOpen;
function leaveBench(){if(sitting&&!garden.home.inside){player.x=bench.x;player.y=bench.y+28;}sitting=false;}
function save() {
  if(!started||externalChange)return;
  try {
    const now=Date.now();advanceGarden(garden,now);
    Object.assign(garden.home,{x:indoorPlayer.x,y:indoorPlayer.y,face:indoorPlayer.face});
    store.setItem(SAVE_KEY,gardenPayload(garden,completed,ended,player,now));
    garden.savedAt=now;
    $('save-status').textContent='小庭已记住这次照料 · '+new Date(now).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
  }catch{$('save-status').textContent='浏览器暂时无法保存。当前散步仍可继续，离开前请留意此提示。';}
}
window.addEventListener('pagehide',save);
window.addEventListener('storage',e=>{
  if(e.storageArea!==store||e.key!==SAVE_KEY||!e.newValue)return;
  externalChange=true;courtyard?.finish();$('neighbor-letter').close();if(started)setPaused(true);
  $('pause-shade').querySelector('span').textContent='小庭在另一扇窗口有了新变化。';
  $('resume').textContent='载入更新的庭院 →';
  $('save-status').textContent='另一扇窗口更新了小庭，载入后再继续，避免覆盖彼此的照料。';$('reload-garden').hidden=false;
});
$('reload-garden').addEventListener('click',()=>location.reload());
function say(text, seconds = 5) { $('toast').textContent = text; $('toast').classList.add('visible'); toastUntil = simulationTime + seconds; }
function syncQuests() {
  $('progress-count').textContent = `${completed.size} / 3`;
  $('quest-caption').textContent = completed.size === 3 ? '三声风铃都响了。去树下的长椅坐一会儿。' : '点纸笺名称，也能循着小径走过去。';
  for (const s of STATIONS) {
    const b = document.querySelector(`[data-station="${s.id}"]`);
    b.classList.toggle('done', completed.has(s.id)); b.setAttribute('aria-label', `${completed.has(s.id) ? '已唤醒' : '前往'}${s.place}：${s.name}`);
    b.querySelector('small').textContent = completed.has(s.id) ? '风铃已经记住你' : `前往${s.place} →`;
  }
}
$('quest-list').innerHTML = STATIONS.map(s => `<button data-station="${s.id}"><i aria-hidden="true"></i><span>${s.name}<small>前往${s.place} →</small></span></button>`).join('');
syncQuests();
document.querySelectorAll('[data-station]').forEach(b => b.addEventListener('click', () => {
  if (!started || paused || !scene||frozen()) return;
  const s = STATIONS.find(s => s.id === b.dataset.station);
  if(garden.home.inside)leaveHouse();
  moveTo({ x: s.x - 24, y: s.y + 24 });
  say(`沿着小径，去${s.place}。`, 2.4);
}));
function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(280, Math.round(600 * rect.width / rect.height)); canvas.height = 600;
  ctx.imageSmoothingEnabled = false;
}
new ResizeObserver(resize).observe(canvas);
function moveTo(p) { if (!walkable||frozen()) return; leaveBench(); garden.home.resting=false;path = findPath(activePlayer(), p, activeWalkable()); if (!path.length) say('那边暂时走不过去，换一处落脚吧。', 3); }
canvas.addEventListener('pointerdown', e => {
  if (!started || paused || chargeStart !== null) return;
  const r = canvas.getBoundingClientRect(),p={x:(e.clientX-r.left)/r.width*canvas.width+cameraX,y:(e.clientY-r.top)/r.height*600};
  if(!courtyard?.pointer(p))moveTo(p);
  canvas.focus({ preventScroll: true });
});
function begin() {
  if (!scene) return;
  if (externalChange) { location.reload(); return; }
  started = true; sitting = false; $('story').hidden = true; $('hud').hidden = false;
  say(garden.home.inside?'屋里还留着灯。可以看看窗外，或在炉边停一会儿。':loaded.blooms.length?`回来时，${loaded.blooms.map(b=>b.name).join('、')}已经开了花。`:completed.size===3?'小庭记得你的脚步。可以种一点花，或看看小猫在做什么。':'可以先去听风铃，也可以走近小径旁的花圃，按 F 种下一株花。',7);
  save();
  canvas.focus({ preventScroll: true });
}
$('begin').addEventListener('click', begin);
$('new-game').addEventListener('click', () => { completed.clear(); read.clear(); ended = false; save(); syncQuests(); begin(); });
if (completed.size) { $('new-game').hidden = false; }
function interact() {
  if (!started || paused || !scene||frozen()) return;
  if(garden.home.inside){interactHome();return;}
  if(Math.hypot(player.x-MAILBOX.x,player.y-MAILBOX.y)<52){path=[];courtyard.openLetter();return;}
  if (careSpot && !(Math.hypot(player.x-bench.x,player.y-bench.y)<Math.hypot(player.x-careSpot.x,player.y-careSpot.y))) {
    path=[];say(careSpot.note,8);return;
  }
  if (Math.hypot(player.x - bench.x, player.y - bench.y) < 68) {
    player.x = bench.x; player.y = bench.y-11; path = []; sitting = true; courtyard.event('benchRest');
    if(completed.size!==3||ended){say('在这里坐一会儿，风会替你把今天放慢。',7);save();return;}
    ended = true; save(); $('ending').hidden = false; $('hud').hidden = true;
    sound.chime(523.25); return;
  }
  if (!closest) { if (careSpot) { path=[]; say(careSpot.note,8); } return; }
  path = [];
  read.add(closest.id);
  say(`${closest.note}${completed.has(closest.id) ? '' : '  按住空格，进入柔风区时松开。'}`, 7);
}
$('interact').addEventListener('click', interact);
function startCharge() {
  if (!started || paused || frozen() || garden.home.inside || $('ending').hidden === false || chargeStart !== null) return;
  leaveBench(); path = []; chargeStart = simulationTime; charge = .001;
  $('charging').hidden = false; $('toast').classList.remove('visible'); $('breathe').classList.add('holding');
}
function releaseCharge() {
  if (chargeStart === null) return;
  const seconds = simulationTime - chargeStart;
  chargeStart = null; charge = 0; $('charging').hidden = true; $('breathe').classList.remove('holding');
  if (paused) return;
  const target = closest;
  const dx = target ? target.x - player.x : player.face, dy = target ? target.y - player.y : -.2;
  wind.emit(player.x, player.y - 12, dx, dy, chargeQuality(seconds) === 'strong' ? 2.0 : chargeQuality(seconds) === 'gentle' ? 1.05 : .35);
  if (!target) { say('树叶收到了。走近一处风铃，还能听到它的回应。', 4); return; }
  if (!read.has(target.id)) { say('风铃下有一张纸笺。先按 E 读读它。', 4); return; }
  if (completed.has(target.id)) { sound.chime(target.pitch); say('它还记得这阵风。', 3); return; }
  if (canRing(target, player, seconds, true)) {
    completed.add(target.id); save(); syncQuests(); sound.chime(target.pitch);
    say(completed.size === 3 ? `${target.reply} 三声风铃都响了，去树下长椅歇歇吧。` : target.reply, 7);
  } else say(chargeQuality(seconds) === 'soft' ? '风轻轻停在了半途。再多留一口气，松开时让标记落在柔风区。' : '纸笺翻得有点急。下一阵风，轻一点就好。', 5);
}
$('breathe').addEventListener('pointerdown', e => { e.preventDefault(); $('breathe').setPointerCapture(e.pointerId); startCharge(); });
$('breathe').addEventListener('pointerup', releaseCharge);
$('breathe').addEventListener('pointercancel', () => { chargeStart = null; charge = 0; $('charging').hidden = true; $('breathe').classList.remove('holding'); });
function setPaused(value) {
  if(!value&&externalChange){location.reload();return;}
  paused = value; keys.clear(); chargeStart = null; charge = 0; $('charging').hidden = true; $('breathe').classList.remove('holding');
  $('pause-shade').hidden = !paused; $('pause').setAttribute('aria-pressed', String(paused));
  $('pause').setAttribute('aria-label', paused ? '继续游戏' : '暂停游戏');
}
$('pause').addEventListener('click', () => setPaused(!paused)); $('resume').addEventListener('click', () => setPaused(false));
$('continue').addEventListener('click', () => { $('ending').hidden = true; $('hud').hidden = false; say('今天，就到这里也很好。想再走走时，点一下小径。', 6); });
$('sound').addEventListener('click', async () => {
  try { const enabled = await sound.toggle(); $('sound').textContent = `声音 · ${enabled ? '开' : '关'}`; $('sound').setAttribute('aria-pressed', String(enabled)); if (enabled) sound.chime(); }
  catch { say('这个浏览器暂时无法播放声音，仍可继续散步。', 4); }
});
window.addEventListener('keydown', e => {
  if (frozen()){if(e.code==='Escape'&&courtyard.editing)courtyard.finish();return;}
  if (!started || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
  if ((e.code==='Space'||e.code.startsWith('Arrow')) && e.target instanceof Element && e.target.closest('button,a,summary')) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') { if (!$('ending').hidden) { $('ending').hidden = true; $('hud').hidden = false; } else setPaused(!paused); return; }
  if (paused || !$('ending').hidden) return;
  if (e.code === 'KeyE' && !e.repeat) interact();
  if (e.code === 'KeyF' && !e.repeat) tend();
  if (e.code === 'KeyR' && !e.repeat) toggleHouse();
  if (e.code === 'KeyL' && !e.repeat) toggleLamp();
  if (e.code === 'Space' && !e.repeat) startCharge();
  if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) { keys.add(e.code); path = []; leaveBench();garden.home.resting=false; }
});
window.addEventListener('keyup', e => { keys.delete(e.code); if (e.code === 'Space') releaseCharge(); });
window.addEventListener('blur', () => { save();if (started && !paused&&!frozen()) setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) {save();if(started&&!paused&&!frozen())setPaused(true);} });
function prepareWalk(target,indoors=false){
  if(frozen()){say('先结束布置或收好来信，再继续散步。',4);return;}
  if(!scene)return;
  if(!started)begin();if(paused&&!externalChange)setPaused(false);
  if(externalChange)return;
  if(garden.home.inside&&!indoors)leaveHouse();
  moveTo(target);canvas.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});canvas.focus({preventScroll:true});
}
function tendBed(id){
  if(frozen())return;
  if(!started||paused||externalChange||garden.home.inside)return;
  const bed=BEDS.find(b=>b.id===id);if(!bed)return;
  if(Math.hypot(player.x-bed.x,player.y-bed.y)>51){say('先沿小径走近一点，再伸手照料。',4);return;}
  path=[];const result=garden.plots[id].kind?waterPlant(garden,id):plantSeed(garden,id);
  say(result.text,6);if(result.ok)save();syncLife(Date.now());
}
function touchCat(){
  if(frozen())return;
  if(!started||paused||externalChange)return;
  path=[];const result=petCat(garden,activePlayer());say(result.text,5);if(result.ok)save();syncLife(Date.now());
}
function tend(){if(!garden.home.inside&&nearBed)tendBed(nearBed.id);else touchCat();}
$('tend').addEventListener('click',tend);
$('visit-cat').addEventListener('click',()=>{
  if(!garden.cat.unlocked)return;
  if(garden.cat.space==='inside'){
    if(garden.home.inside)prepareWalk({x:garden.cat.indoorX,y:garden.cat.indoorY+20},true);
    else{prepareWalk(HOUSE_DOOR);say('小猫在屋里歇脚。走到小屋门前，按 R 进去看看它。',6);}
  }else prepareWalk({x:garden.cat.x,y:garden.cat.y+22});
});
$('pet-cat').addEventListener('click',touchCat);
$('seed-options').innerHTML=SEEDS.map(s=>`<button data-seed="${s.id}" aria-pressed="${s.id===garden.selectedSeed}"><i style="--seed:${s.color}" aria-hidden="true"></i>${s.name}</button>`).join('');
$('seed-options').querySelectorAll('[data-seed]').forEach(b=>b.addEventListener('click',()=>{garden.selectedSeed=b.dataset.seed;save();syncLife(Date.now());}));
$('bed-cards').innerHTML=BEDS.map(b=>`<article class="bed-card" id="bed-${b.id}"><canvas width="260" height="150" role="img" aria-label="${b.name}实时种植状态"></canvas><div class="bed-copy"><span class="bed-stage"></span><h3>${b.name}</h3><p class="bed-detail"></p><p class="bed-note">${b.note}</p><div class="life-buttons"><button data-walk-bed="${b.id}">沿小径过去</button><button data-tend-bed="${b.id}" disabled>走近后种植</button></div></div></article>`).join('');
$('bed-cards').querySelectorAll('[data-walk-bed]').forEach(b=>b.addEventListener('click',()=>{const bed=BEDS.find(x=>x.id===b.dataset.walkBed);prepareWalk({x:bed.x,y:bed.y+22});say(`沿小径去${bed.name}，靠近后按 F。`,4);}));
$('bed-cards').querySelectorAll('[data-tend-bed]').forEach(b=>b.addEventListener('click',()=>tendBed(b.dataset.tendBed)));
$('life-welcome').textContent=loaded.blooms.length?`回来时，${loaded.blooms.map(b=>b.name).join('、')}已经开花。小庭接着上一次照料，慢慢长大了。`:BEDS.some(b=>garden.plots[b.id].kind)?'你留下的花与小事，都还在这里。离开期间没有枯萎，也没有失去进度。':'空花圃等着一株花。种下、浇水，再按自己的步调散步。';
if(loaded.warning)$('save-status').textContent=loaded.warning;
if(garden.home.inside)$('welcome-copy').textContent='小屋还为你留着位置，窗外仍是你照料过的小庭。可以接着看一会儿，也可以再去散步。';
else if(BEDS.some(b=>garden.plots[b.id].kind))$('welcome-copy').textContent='你种下的花还在这里，小猫也有自己的下午。小庭接着上一次的照料，慢慢成为生活。';
function syncLife(now){
  const env=environmentAt(garden.atmosphere,now);
  nearBed=garden.home.inside?null:BEDS.filter(b=>Math.hypot(player.x-b.x,player.y-b.y)<51).sort((a,b)=>Math.hypot(player.x-a.x,player.y-a.y)-Math.hypot(player.x-b.x,player.y-b.y))[0]||null;
  const seed=SEEDS.find(s=>s.id===garden.selectedSeed);
  $('seed-options').querySelectorAll('[data-seed]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.seed===garden.selectedSeed)));
  $('seed-meaning').textContent=seed.meaning;
  for(const bed of BEDS){
    const p=garden.plots[bed.id],card=$('bed-'+bed.id),name=SEEDS.find(s=>s.id===p.kind)?.name;
    card.querySelector('.bed-stage').textContent=p.kind?`${name} · ${plantStage(p)}${p.growth>=1&&env.night>.6?' · 夜里合拢':''}`:'还留着一小片土';
    card.querySelector('.bed-detail').textContent=!p.kind?'选一株喜欢的花，给它一个留下来的地方。':env.rain?'细雨正在润湿花圃。你可以去小屋里，听雨慢慢落下。':env.night>.6&&p.growth>=1?'花朵夜里轻轻合拢，天亮会再舒展。开花的进度完整保留。':p.growth>=1?'花会一直留在这里。可以看看它，也可以继续散步。':p.waterUntil>now?'土还是润的，叶子在慢慢长大。离开期间也会延续这轮生长。':'一株安稳的小苗。浇一点水，可以继续慢慢长大。';
    const nearby=!garden.home.inside&&started&&!paused&&!externalChange&&Math.hypot(player.x-bed.x,player.y-bed.y)<51;
    const b=card.querySelector('[data-tend-bed]');b.disabled=!nearby;b.textContent=!p.kind?(nearby?'种下'+seed.name:'走近后种植'):p.growth>=1?'看看花':'浇一点水';
    const c=card.querySelector('canvas').getContext('2d');c.clearRect(0,0,260,150);c.save();c.translate(130,110);c.scale(2,2);drawBed(c,{...bed,x:0,y:0},p,simulationTime,wind,now,false,env);drawBed(c,{...bed,x:0,y:0},p,simulationTime,wind,now,true,env);c.restore();
  }
  const cat=garden.cat,actor=activePlayer(),sameSpace=(cat.space==='inside')===garden.home.inside,nearCat=cat.unlocked&&sameSpace&&Math.hypot(actor.x-(cat.space==='inside'?cat.indoorX:cat.x),actor.y-(cat.space==='inside'?cat.indoorY:cat.y))<45;
  $('visit-cat').disabled=!cat.unlocked||externalChange;
  $('pet-cat').disabled=!nearCat||!started||paused||externalChange;
  $('pet-cat').textContent=cat.lastPetAt&&now-cat.lastPetAt<PET_COOLDOWN?'陪它待一会儿':'轻轻摸摸';
  $('cat-status').textContent=cat.unlocked?`它${catActivity(cat)}。${cat.moving?'脚步慢一点，它也有想去的地方。':'可以走近，看看它愿不愿意亲近。'}`:'第一次浇水，或第二声风铃，会让它来小庭歇脚。';
  $('cat-familiar').textContent=cat.affection>=3?'它已经熟悉你的脚步，散步时也更愿意陪你走一段。':cat.affection?'它记得你伸出过手，这份熟悉下次回来也还在。':'不必催它靠近，陪伴可以慢慢发生。';
  const p=nearBed&&garden.plots[nearBed.id];
  $('tend').disabled=!started||paused||externalChange||(!nearBed&&!nearCat);
  $('tend').innerHTML=nearBed?`${!p.kind?'种下'+seed.name:p.growth>=1?'看看花':env.rain?'雨在替花浇水':p.wateredAt&&now-p.wateredAt<WATER_COOLDOWN?'让花歇一歇':'浇一点水'} <kbd>F</kbd>`:nearCat?'轻轻摸摸猫 <kbd>F</kbd>':(garden.home.inside?'小猫歇一歇 <kbd>F</kbd>':'走近花圃 <kbd>F</kbd>');
  const journal=garden.journal.slice(-5).reverse(),signature=JSON.stringify(journal);
  if(signature!==journalText){
    journalText=signature;$('life-journal').replaceChildren();
    for(const entry of journal){const li=document.createElement('li'),stamp=document.createElement('time'),text=document.createElement('span');stamp.textContent=new Date(entry.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});stamp.dateTime=new Date(entry.at).toISOString();text.textContent=entry.text;li.append(stamp,text);$('life-journal').append(li);}
    if(!journal.length){const li=document.createElement('li');li.textContent='还没有记录。种下一株花，就是一个开始。';$('life-journal').append(li);}
  }
}
function leaveHouse(){
  garden.home.inside=false;garden.home.inviteCat=false;garden.home.resting=false;
  player.x=HOUSE_DOOR.x;player.y=HOUSE_DOOR.y+12;path=[];keys.clear();sitting=false;save();
}
function toggleHouse(){
  if(frozen())return;
  if(!started||paused||externalChange)return;
  if(garden.home.inside){leaveHouse();say('门外还是你的小庭。花和小径都在。',5);}
  else{
    if(Math.hypot(player.x-HOUSE_DOOR.x,player.y-HOUSE_DOOR.y)>62){say('先沿小径走到小屋门前，再按 R 进屋。',5);return;}
    garden.home.inside=true;garden.home.resting=false;path=[];keys.clear();chargeStart=null;charge=0;$('charging').hidden=true;
    indoorPlayer.x=HOME_ENTRY.x;indoorPlayer.y=HOME_ENTRY.y;cameraX=clamp(indoorPlayer.x-canvas.width*.5,0,Math.max(0,960-canvas.width));
    addMemory(garden,'first-home','推开小屋的门，屋里还有一盏灯。');save();say('屋里没有需要赶着完成的事。去窗边、炉边或书桌旁，按 E 看看。',7);
  }
  syncLife(Date.now());syncHomeWeather(Date.now());canvas.focus({preventScroll:true});
}
function toggleLamp(){
  if(frozen())return;
  if(!started||paused||externalChange||!garden.home.inside)return;
  garden.home.lampOn=!garden.home.lampOn;
  if(garden.home.lampOn)addMemory(garden,'home-lamp','点亮桌灯，暖光落在一封旧信旁。');
  save();syncHomeWeather(Date.now());say(garden.home.lampOn?'留一盏灯，给暂时不赶路的人。':'灯歇一歇，炉火仍留着暖意。',5);
}
function interactHome(){
  const place=nearestHomePlace(indoorPlayer);if(!place)return;
  path=[];
  const env=environmentAt(garden.atmosphere);
  if(place.id==='window'){
    courtyard.event('windowVisit');
    addMemory(garden,'home-window','在窗边，看同一座小庭慢慢变化。');
    say(env.rain?'窗外细雨落进花圃。屋里安静地听一会儿，也算照料自己。':env.night>.5?'花朵夜里轻轻合拢。窗灯还为小径留着一点亮。':'花圃、溪桥和树都在窗外。你不必离开，才能看见它们。',8);
  }else if(place.id==='hearth'){
    garden.home.resting=true;addMemory(garden,'home-rest','在炉边停了一会儿，把赶路留在门外。');say('炉火暖着。你不必立刻出发，也不用再完成什么。',8);
  }else{
    courtyard.openLetter();
  }
  save();
}
$('lamp-hud').addEventListener('click',toggleLamp);
$('door-action').addEventListener('click',toggleHouse);$('enter-home').addEventListener('click',toggleHouse);$('lamp').addEventListener('click',toggleLamp);
$('visit-home').addEventListener('click',()=>{if(garden.home.inside){canvas.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});return;}prepareWalk(HOUSE_DOOR);say('沿小径到小屋门前，按 R 进屋。',5);});
$('invite-cat').addEventListener('click',()=>{if(!started||paused||externalChange||!garden.home.inside||!garden.cat.unlocked)return;garden.home.inviteCat=true;save();say('轻轻唤了它一声。小猫会沿自己的路线走到门口，再进屋。',6);});
document.querySelectorAll('[data-home-place]').forEach(b=>b.addEventListener('click',()=>{
  if(!garden.home.inside)return;const place=HOME_PLACES.find(p=>p.id===b.dataset.homePlace);prepareWalk(place,true);
}));
function changeClimate(type,mode){
  if(externalChange)return;
  if(scene&&!started)begin();
  const now=Date.now();advanceGarden(garden,now);setAtmosphere(garden.atmosphere,type,mode,now);
  if(type==='weather'&&mode==='rain')addMemory(garden,'first-rain','细雨落进小庭，花圃也得到了天气的照料。',now);
  if(type==='time'&&mode==='night')addMemory(garden,'first-night','夜色慢慢落下，花朵轻轻合拢，小屋还留着灯。',now);
  save();syncLife(now);syncHomeWeather(now);
}
$('time-mode').value=garden.atmosphere.timeMode;$('weather-mode').value=garden.atmosphere.weatherMode;
$('time-mode').addEventListener('change',e=>changeClimate('time',e.target.value));$('weather-mode').addEventListener('change',e=>changeClimate('weather',e.target.value));
function syncHomeWeather(now){
  const env=environmentAt(garden.atmosphere,now),inside=garden.home.inside,atDoor=Math.hypot(player.x-HOUSE_DOOR.x,player.y-HOUSE_DOOR.y)<62;
  document.querySelector('.game-shell').classList.toggle('is-inside',inside);
  $('outdoor-quest').hidden=inside;$('home-locations').hidden=!inside;
  $('scene-title').textContent=inside?'屋里，慢慢来。':'让风，记得归途。';
  $('scene-eyebrow').textContent=inside?`蓝瓦小屋 · 窗外${env.label}`:`一座庭院 · ${env.label}`;
  $('scene-sub').textContent=inside?'看一会儿窗外，或者在炉边歇息。':'种一点花，陪一只猫。小庭会记得。';
  $('environment-status').textContent=env.label+(inside?' · 屋里':' · 庭院');
  $('climate-note').textContent=env.rain?'细雨正在润湿花圃，小猫会沿小径回屋避雨。':env.night>.55?'花朵夜里轻轻合拢，小猫会回屋歇息，天亮后又可以出来走走。':env.cloud?'薄云让光线柔和一些，花与小猫仍按自己的步调生活。':'晴光照着小径，花朵舒展，小猫可以去晒太阳。';
  $('plant-weather-note').textContent=env.rain?'细雨正在替花浇水，离开期间也按这轮天气结算。':env.night>.55?'夜里花朵轻轻合拢，开花进度不会倒退；天亮会再舒展。':'花朵在白日舒展，已留下的照料和开花都会保留。';
  $('door-action').hidden=!started||(!inside&&!atDoor);$('door-action').innerHTML=inside?'回庭院 <kbd>R</kbd>':'进小屋 <kbd>R</kbd>';
  $('enter-home').disabled=!started||paused||externalChange||(!inside&&!atDoor);$('enter-home').textContent=inside?'回到庭院':atDoor?'推开小屋的门':'走近后进屋';
  $('lamp').disabled=!inside||!started||paused||externalChange;$('lamp').textContent=garden.home.lampOn?'熄灭桌灯 · L':'点亮桌灯 · L';
  $('invite-cat').disabled=!started||!inside||!garden.cat.unlocked||garden.cat.space==='inside'||paused||externalChange;
  $('house-status').textContent=inside?`你在小屋里。${garden.cat.space==='inside'?'小猫也进来了，暖垫与窗边都能容它歇脚。':'小猫可以沿小径走到门口，再进屋歇脚。'}`:'沿小径到蓝瓦小屋前，靠近后按 R 进屋。';
  $('breathe').disabled=inside;$('breathe').hidden=inside;
  $('lamp-hud').hidden=!inside;$('lamp-hud').disabled=!started||paused||externalChange;$('lamp-hud').innerHTML=garden.home.lampOn?'熄灭桌灯 <kbd>L</kbd>':'点亮桌灯 <kbd>L</kbd>';
  if(inside){const place=nearestHomePlace(indoorPlayer);$('interact').disabled=!place;$('interact').innerHTML=place?`${place.action} <kbd>E</kbd>`:'走近窗、炉或书桌 <kbd>E</kbd>';$('location').textContent=garden.home.resting?'炉边 · 可以多歇一会儿':place?place.name:'小屋里';}
  const actor=activePlayer();
  $('state-status').textContent=`${inside?'小屋':'庭院'}位置 ${Math.round(actor.x)},${Math.round(actor.y)}；风铃 ${completed.size}/3；花圃 ${BEDS.filter(b=>garden.plots[b.id].kind).length}/3；${env.label}；小猫${catActivity(garden.cat)}；${garden.cat.space==='inside'?'猫在屋里':'猫在庭院'}；${paused?'暂停':'行走'}；长椅 ${bench.x},${bench.y}；陶盆 ${garden.layout.pots.map(p=>`${p.x},${p.y}`).join("/")}；小径 ${garden.layout.route}/${garden.layout.material}；来信 ${garden.story.read.length}/5；布置${courtyard?.editing?'中':'已保存'}`;
}
function step(dt) {
  simulationTime += dt; wind.update(dt); scene.update(dt, wind);
  if (started && $('ending').hidden&&!frozen()) {
    let dx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    let dy = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    if (chargeStart !== null) { dx = 0; dy = 0; }
    else if (path.length && !dx && !dy) {
      const target = path[0],a=activePlayer(),d = Math.hypot(target.x-a.x,target.y-a.y);
      if (d < 2.5) path.shift(); else { dx = (target.x-a.x)/d;dy=(target.y-a.y)/d; }
    }
    const actor=activePlayer(),walk=activeWalkable();
    const n = Math.hypot(dx, dy) || 1, speed = garden.home.inside?75:84;
    const nx=actor.x+dx/n*speed*dt,ny=actor.y+dy/n*speed*dt,px=actor.x,py=actor.y;
    if(walk(nx,actor.y))actor.x=nx;
    if(walk(actor.x,ny))actor.y=ny;
    actor.moving=Math.hypot(actor.x-px,actor.y-py)>.01;
    if(dx)actor.face=Math.sign(dx);
  } else {player.moving=false;indoorPlayer.moving=false;}
  const now=Date.now();
  const blooms=advanceGarden(garden,now);
  if(completed.size>=2&&!garden.cat.unlocked){garden.cat.unlocked=true;addMemory(garden,'cat-arrived','第二声风铃后，一只橘猫留在小庭里。',now);save();}
  if(frozen())garden.cat.moving=false;
  if(companion&&!frozen()){const event=companion.update(dt,player,garden.plots,now,{env:environmentAt(garden.atmosphere,now),home:garden.home,actor:indoorPlayer,layout:garden.layout});
    if(event==='entered'){addMemory(garden,'cat-shelter','小猫沿小径回到屋里，在暖意旁歇脚。',now);save();}
  }
  if(blooms.length){if(started)say(`${blooms.map(b=>b.name).join('、')}开了。你的那壶水，慢慢成了一簇花。`,7);save();}
  saveClock+=dt;if(saveClock>4){saveClock=0;save();}
  if (chargeStart !== null) {
    charge = simulationTime - chargeStart;
    $('charge-fill').style.width = `${clamp(charge / 2.4) * 100}%`;
    $('charge-text').textContent = chargeQuality(charge) === 'gentle' ? '现在松开 · 柔风' : chargeQuality(charge) === 'soft' ? '再留一口气…' : '这阵风太急了';
    if (charge > 2.4) releaseCharge();
  }
  if (simulationTime > toastUntil) $('toast').classList.remove('visible');
  uiClock += dt;
  if (uiClock > .15) {
    uiClock = 0;
    closest = STATIONS.filter(s => Math.hypot(s.x - player.x, s.y - player.y) < 83).sort((a,b) => Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0] || null;
    careSpot = CARE_SPOTS.map(s=>s.id==='picnic'?{...s,x:bench.x+61,y:bench.y+9}:s.id==='pantry'?{...s,note:'木桶与木箱留在屋前。花盆可以慢慢安顿，归来的地方也有自己的变化。'}:s).filter(s=>Math.hypot(s.x-player.x,s.y-player.y)<48).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0] || null;
    if (careSpot && closest && Math.hypot(player.x-careSpot.x,player.y-careSpot.y)+10>Math.hypot(player.x-closest.x,player.y-closest.y)) careSpot=null;
    const byBench = Math.hypot(player.x - bench.x, player.y - bench.y) < 68 && (!careSpot || Math.hypot(player.x-bench.x,player.y-bench.y)<Math.hypot(player.x-careSpot.x,player.y-careSpot.y));
    const byMail=Math.hypot(player.x-MAILBOX.x,player.y-MAILBOX.y)<52;
    $('interact').disabled = !closest && !byBench && !careSpot&&!byMail;
    $('interact').innerHTML = byMail?'读邻居来信 <kbd>E</kbd>':byBench ? '坐下听风 <kbd>E</kbd>' : careSpot ? `${careSpot.name} <kbd>E</kbd>` : closest ? `${read.has(closest.id) ? '再读纸笺' : '读一读纸笺'} <kbd>E</kbd>` : '走近风铃读纸笺 <kbd>E</kbd>';
    $('location').textContent = byBench ? '树下 · 留给你的长椅' : careSpot ? careSpot.name : closest ? closest.place : player.x > 600 ? '小屋花径' : player.x > 460 ? '溪上的石桥' : '小庭南径';
    $('state-status').textContent = `位置 ${Math.round(player.x)},${Math.round(player.y)}；风铃 ${completed.size}/3；${closest ? '附近：' + closest.place : '散步中'}；${paused ? '暂停' : '行走'}；${ended ? '已完成庭院故事' : '故事进行中'}；花圃 ${BEDS.filter(b=>garden.plots[b.id].kind).length}/3；${garden.cat.unlocked?'小猫'+catActivity(garden.cat):'等待小猫'}`;
    syncLife(now);syncHomeWeather(now);courtyard?.sync();
    sound.setEnvironment(wind.sample(player.x,player.y).energy,environmentAt(garden.atmosphere,now),garden.home.inside);
  }
}
function frame(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  if (scene) {
    if (!paused) step(dt);
    const target = clamp((courtyard?.editing?courtyard.camera:activePlayer().x) - canvas.width * .5, 0, Math.max(0, 960 - canvas.width));
    cameraX += (target - cameraX) * Math.min(1, dt * 4);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const env={...environmentAt(garden.atmosphere,Date.now()),reduced};
    const args={time:simulationTime,wind,player:activePlayer(),outdoorPlayer:player,completed,read,charge,cameraX,width:canvas.width,path,sitting,life:courtyard?.editing?{...garden,layout:courtyard.renderLayout}:garden,env,now:Date.now()};
    if(garden.home.inside)interior.draw(ctx,args);else scene.draw(ctx,args);
    if(courtyard?.editing){ctx.save();ctx.translate(-cameraX,0);courtyard.drawPreview(ctx);ctx.restore();}
  }
  requestAnimationFrame(frame);
}
try {
  const assets = await loadAssets(); scene = new GardenScene(assets); walkable = makeGardenWalkable(scene.trees,garden.layout);
  if(!walkable(player.x,player.y)){const end=findPath({x:370,y:530},player,walkable).at(-1);Object.assign(player,end||{x:370,y:530});}
  interior=new InteriorScene(assets,scene);companion=new CatCompanion(garden.cat,walkable);resize();syncLife(Date.now());syncHomeWeather(Date.now());
  courtyard=setupCourtyard({garden,save,say,walk:prepareWalk,actors:()=>[...(!garden.home.inside?[player]:[]),...(garden.cat.unlocked&&garden.cat.space!=='inside'?[garden.cat]:[])],
    ensureStarted(){if(!scene||externalChange)return false;if(!started)begin();if(paused)setPaused(false);$('ending').hidden=true;$('hud').hidden=false;path=[];keys.clear();leaveBench();return true;},
    ensureOutdoor(){if(!scene||externalChange)return false;if(!started)begin();if(paused)setPaused(false);if(garden.home.inside)leaveHouse();$('ending').hidden=true;$('hud').hidden=false;path=[];keys.clear();leaveBench();chargeStart=null;return true;},
    changed(){bench=garden.layout.bench;walkable=makeGardenWalkable(scene.trees,garden.layout);companion.walkable=walkable;companion.path=[];companion.timer=0;path=[];}
  });
  $('begin').disabled = false; $('begin').innerHTML = `${completed.size||BEDS.some(b=>garden.plots[b.id].kind) ? '继续这次散步' : '推开庭院的门'} <span>→</span>`;
  requestAnimationFrame(frame);
} catch (error) { $('error').hidden = false; $('error').textContent = error.message; console.error(error); }

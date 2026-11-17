import { readSave, SAVE_KEY } from './state.mjs';
import {createAtmosphere,readAtmosphere,rainSpans,unionDuration,lastRainAt,environmentAt} from './atmosphere.mjs';
import {createHome,readHome,HOME_ENTRY,homeWalkable} from './home-model.mjs';

import {BEDS} from './courtyard-config.mjs';
export {BEDS} from './courtyard-config.mjs';
import {createLayout,readLayout} from './arrangement.mjs';
import {createStory,readStory,updateLetters} from './letters.mjs';
export const SEEDS = [
  { id:'daisy', name:'小雏菊', color:'#f0e4bd', center:'#c8a062', leaf:'#597c51', meaning:'留一点明亮，给寻常的一天。' },
  { id:'amber', name:'金盏花', color:'#d9ac73', center:'#a97c4e', leaf:'#647d52', meaning:'把暖意留在归途上。' },
  { id:'bellflower', name:'风铃草', color:'#b5a6bc', center:'#e4d3ad', leaf:'#587c67', meaning:'安静地开，也会被看见。' }
];
export const WATER_COOLDOWN = 45000, WATER_TIME = 180000;
export const PET_COOLDOWN = 20000;
export const BACKUP_KEY = 'wind-return-garden:before-life-v2';
export const LETTER_BACKUP_KEY='wind-return-garden:before-letters-v4';
export const LIFE_BACKUP_KEY = 'wind-return-garden:before-home-v3';
const bounded=(n, fallback, min, max)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
const point=(p,fallback)=>({x:bounded(p?.x,fallback.x,38,925),y:bounded(p?.y,fallback.y,282,571),face:p?.face===-1?-1:1});
const seedExists=id=>SEEDS.some(s=>s.id===id);
const catModes=['wander','watch','sun','nap','follow','affection','shelter','curl','homewatch','homeleave'];
export const CAT_LABELS={wander:'在小径散步',watch:'在花旁驻足',sun:'在晒太阳',nap:'在长椅边打盹',follow:'来陪你走走',affection:'在你身旁蹭蹭',shelter:'在屋檐下避雨',curl:'在屋里蜷着歇息',homewatch:'在窗边听风雨',homeleave:'准备回庭院走走'};
const CAT_TRAVEL={wander:'在小径散步',watch:'正去花旁看看',sun:'正走向有阳光的地方',nap:'正去长椅边歇息',follow:'正来陪你走走',affection:'在你身旁蹭蹭',shelter:'正沿小径回小屋',curl:'正走向屋里的软垫',homewatch:'正去窗边看看',homeleave:'正走向庭院门口'};
export const catActivity=cat=>(cat.moving?CAT_TRAVEL:CAT_LABELS)[cat.mode]||'在小庭歇脚';

export function createGarden(now=Date.now()) {
  return { version:4, completed:[], ended:false, selectedSeed:'daisy', player:{x:370,y:530,face:1},
    plots:Object.fromEntries(BEDS.map(b=>[b.id,{kind:null,growth:0,plantedAt:0,wateredAt:0,waterUntil:0,lastGrowthAt:now}])),
    cat:{unlocked:false,x:400,y:530,face:1,mode:'wander',affection:0,lastPetAt:0,space:'outside',indoorX:HOME_ENTRY.x,indoorY:HOME_ENTRY.y},
    atmosphere:createAtmosphere(now),home:createHome(),layout:createLayout(),story:createStory(),
    journal:[],savedAt:now };
}
export function plantStage(plot) {
  return !plot?.kind?'空花圃':plot.growth>=1?'开花了':plot.growth>=.65?'含苞':plot.growth>=.3?'抽叶':'嫩芽';
}
export function addMemory(garden,id,text,now=Date.now()) {
  if(garden.journal.some(e=>e.id===id))return;
  garden.journal.push({id,text,at:now});garden.journal=garden.journal.slice(-18);
}
export function advanceGarden(garden,now=Date.now()) {
  const blooms=[];
  for(const bed of BEDS){
    const p=garden.plots[bed.id],until=Math.max(p.lastGrowthAt,now);
    const climate=rainSpans(garden.atmosphere,p.lastGrowthAt,until);
    const wet=unionDuration([[p.lastGrowthAt,Math.min(until,p.waterUntil)],...climate]);
    const before=p.growth;
    if(p.kind)p.growth=Math.min(1,p.growth+wet/100000);
    const rainAt=lastRainAt(garden.atmosphere,p.lastGrowthAt,until);
    if(rainAt)p.waterUntil=Math.max(p.waterUntil,rainAt+WATER_TIME);
    p.lastGrowthAt=until;
    if(p.kind&&before<1&&p.growth>=1){
      blooms.push(bed);addMemory(garden,`bloom-${bed.id}`,`${bed.name}的${SEEDS.find(s=>s.id===p.kind).name}开了。`,now);
    }
  }
  return blooms;
}
export function plantSeed(garden,id,kind= garden.selectedSeed,now=Date.now()) {
  const bed=BEDS.find(b=>b.id===id),p=garden.plots[id];
  if(!bed||!p||p.kind||!seedExists(kind))return {ok:false,text:'这里已经有一株在慢慢长大。'};
  Object.assign(p,{kind,growth:.12,plantedAt:now,wateredAt:0,waterUntil:Math.max(0,p.waterUntil),lastGrowthAt:now});
  const name=SEEDS.find(s=>s.id===kind).name;
  addMemory(garden,`plant-${id}`,`在${bed.name}种下了${name}。`,now);
  return {ok:true,text:`${name}在这里安了家。再浇一点水，让这次照料慢慢延续。`};
}
export function waterPlant(garden,id,now=Date.now()) {
  advanceGarden(garden,now);
  const bed=BEDS.find(b=>b.id===id),p=garden.plots[id];
  if(!bed||!p?.kind)return {ok:false,text:'先在松软的土里种下一株花。'};
  if(p.growth>=1)return {ok:false,text:'花开着，就已经很好。可以在这里多看一会儿。'};
  if(environmentAt(garden.atmosphere,now).rain)return {ok:false,text:'细雨正替花浇水。让这次照料交给天气，你可以进小屋歇歇。'};
  if(p.wateredAt&&now-p.wateredAt<WATER_COOLDOWN)return {ok:false,text:'土还是润的，让它按自己的步调长大吧。'};
  p.growth=Math.min(.99,p.growth+(p.wateredAt ? .04 : .18));
  p.wateredAt=now;p.waterUntil=now+WATER_TIME;p.lastGrowthAt=now;
  addMemory(garden,`water-${id}`,`给${bed.name}浇了第一壶水，叶子舒展开来。`,now);
  if(!garden.cat.unlocked){garden.cat.unlocked=true;addMemory(garden,'cat-arrived','水落进土里，一只橘猫也来小庭歇脚了。',now);}
  return {ok:true,text:'水慢慢渗进土里。你可以去散步，或下次回来再看它。'};
}
export function petCat(garden,player,now=Date.now()) {
  const cat=garden.cat;
  const inside=garden.home.inside,cx=inside?cat.indoorX:cat.x,cy=inside?cat.indoorY:cat.y;
  if(!cat.unlocked||(cat.space==='inside')!==inside||Math.hypot(player.x-cx,player.y-cy)>45)return {ok:false,text:'先轻轻走近它，再伸出手。'};
  if(cat.lastPetAt&&now-cat.lastPetAt<PET_COOLDOWN)return {ok:false,text:'它还在你身边，陪它安静待一会儿就好。'};
  cat.affection=Math.min(5,cat.affection+1);cat.lastPetAt=now;cat.mode='affection';
  addMemory(garden,cat.affection===1?'cat-touch':'cat-familiar',cat.affection===1?'第一次伸出手，橘猫轻轻靠了过来。':'橘猫已经熟悉你的脚步，愿意在你身边停一会儿。',now);
  return {ok:true,text:cat.affection<3?'它靠过来，轻轻蹭了蹭你的手。':'它认得你的脚步了，愿意在你身边多待一会儿。'};
}
export function readGardenSave(text,now=Date.now()) {
  const fresh=createGarden(now);
  try {
    if(typeof text!=='string'||text.length>200000)return fresh;
    const s=JSON.parse(text);
    if(!s||![1,2,3,4].includes(s.version)||!Array.isArray(s.completed))return fresh;
    const old=readSave(JSON.stringify({...s,version:1}));Object.assign(fresh,old);
    if(s.version===1){fresh.cat.unlocked=old.completed.length>=2;return fresh;}
    fresh.player=point(s.player,fresh.player);
    if(s.version>=3){fresh.atmosphere=readAtmosphere(s.atmosphere,now);fresh.home=readHome(s.home);}
    fresh.selectedSeed=seedExists(s.selectedSeed)?s.selectedSeed:'daisy';
    fresh.savedAt=bounded(s.savedAt,now,0,now);
    for(const bed of BEDS){
      const p=s.plots?.[bed.id];if(!p||!seedExists(p.kind))continue;
      Object.assign(fresh.plots[bed.id],{kind:p.kind,growth:bounded(p.growth,0,0,1),
        plantedAt:bounded(p.plantedAt,now,0,now),wateredAt:bounded(p.wateredAt,0,0,now),
        waterUntil:bounded(p.waterUntil,0,0,now+WATER_TIME),lastGrowthAt:bounded(p.lastGrowthAt,fresh.savedAt,0,now)});
    }
    const c=s.cat||{};
    fresh.cat={...fresh.cat,...point(c,fresh.cat),unlocked:c.unlocked===true||old.completed.length>=2||BEDS.some(b=>fresh.plots[b.id].wateredAt>0),
      mode:catModes.includes(c.mode)?c.mode:'wander',affection:Math.round(bounded(c.affection,0,0,5)),lastPetAt:bounded(c.lastPetAt,0,0,now)};
    fresh.cat.space=c.space==='inside'?'inside':'outside';
    if(homeWalkable(c.indoorX,c.indoorY)){fresh.cat.indoorX=c.indoorX;fresh.cat.indoorY=c.indoorY;}
    if(Array.isArray(s.journal))fresh.journal=s.journal.filter(e=>typeof e?.id==='string'&&typeof e.text==='string'&&Number.isFinite(e.at))
      .slice(-18).map(e=>({id:e.id.slice(0,80),text:e.text.slice(0,160),at:bounded(e.at,now,0,now)}));
    if(s.version<4){fresh.story.events.benchRest=fresh.ended;fresh.story.events.windowVisit=fresh.journal.some(e=>e.id==='home-window');}
    if(s.version===4){fresh.layout=readLayout(s.layout);fresh.story=readStory(s.story,fresh);updateLetters(fresh);}
    return fresh;
  } catch {return fresh;}
}
export function gardenPayload(garden,completed,ended,player,now=Date.now()) {
  return JSON.stringify({...garden,version:4,completed:[...completed],ended:!!ended,player:{x:player.x,y:player.y,face:player.face},savedAt:now});
}
export function loadGarden(storage,now=Date.now()) {
  let text=null,warning='',restored=false;
  try{
    text=storage.getItem(SAVE_KEY);
    if(text){
      let parsed;try{parsed=JSON.parse(text);}catch{}
      if(!parsed||![1,2,3,4].includes(parsed.version)||!Array.isArray(parsed.completed)){
        const backup=storage.getItem(LETTER_BACKUP_KEY)||storage.getItem(LIFE_BACKUP_KEY)||storage.getItem(BACKUP_KEY);if(backup){text=backup;restored=true;}
        warning=restored?'已从保留的升级前存档恢复庭院。':'旧存档无法读取，这次散步会重新记录。';
      }
      if(!restored&&parsed?.version===1&&!storage.getItem(BACKUP_KEY))storage.setItem(BACKUP_KEY,text);
      if(!restored&&parsed?.version===3&&!storage.getItem(LETTER_BACKUP_KEY))storage.setItem(LETTER_BACKUP_KEY,text);
      if(!restored&&parsed?.version===2&&!storage.getItem(LIFE_BACKUP_KEY))storage.setItem(LIFE_BACKUP_KEY,text);
    }
  }catch{warning='浏览器暂时无法保存；当前散步仍可继续。';}
  const garden=readGardenSave(text,now),previous= garden.savedAt;
  const blooms=advanceGarden(garden,now);
  return {garden,warning,away:Math.max(0,now-previous),blooms};
}

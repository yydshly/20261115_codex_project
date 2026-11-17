import {BEDS,createGarden,readGardenSave,advanceGarden,plantSeed,waterPlant,plantStage} from './garden-life.mjs';
import {SAVE_KEY} from './state.mjs';
import {drawBed} from './life-drawing.mjs';
import {loadFreeAssets,drawSample} from './free-assets.mjs';
const $=id=>document.getElementById(id),trial=createGarden(),hero=$('life-illustration').getContext('2d'),sample=$('trial-bed').getContext('2d');
const gentle={sample:()=>({energy:.25})};let now=Date.now(),time=0,last=performance.now(),free;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
loadFreeAssets().then(a=>{free=a;}).catch(()=>{});
function syncTrial(){
  const p=trial.plots.south;$('trial-stage').textContent=plantStage(p);
  $('trial-copy').textContent=!p.kind?'试着种下一株小雏菊，看看一次照料怎样留下变化。':p.growth>=1?'花开了。实际游戏里，它会保留下来，下次回来也还在。':p.wateredAt?'叶子舒展开来。可以去散步，让这壶水慢慢延续。':'小苗已经在这里了，再浇一点水。';
  $('trial-action').textContent=!p.kind?'种下小雏菊':p.growth>=1?'花在这里，慢慢看':'浇一点水';
  $('trial-action').disabled=p.growth>=1||!!p.wateredAt;$('trial-later').disabled=!p.wateredAt||p.growth>=1;
}
$('trial-action').addEventListener('click',()=>{if(!trial.plots.south.kind)plantSeed(trial,'south','daisy',now);else waterPlant(trial,'south',now);syncTrial();});
$('trial-later').addEventListener('click',()=>{now+=90000;advanceGarden(trial,now);syncTrial();});
$('trial-reset').addEventListener('click',()=>{now=Date.now();Object.assign(trial,createGarden(now));syncTrial();});
function readSnapshot(){
  try{const g=readGardenSave(localStorage.getItem(SAVE_KEY));advanceGarden(g);const n=BEDS.filter(b=>g.plots[b.id].kind).length,bloom=BEDS.filter(b=>g.plots[b.id].growth>=1).length;
    $('saved-garden-summary').textContent=`这台浏览器的小庭：已种 ${n} 处，开花 ${bloom} 处，${g.cat.unlocked?'橘猫已经留下':'还在等小猫来歇脚'}。本页只读；进入游戏继续照料。`;
  }catch{$('saved-garden-summary').textContent='此浏览器暂时无法读取存档，进入游戏后可查看保存提示。';}
}readSnapshot();window.addEventListener('storage',e=>{if(e.key===SAVE_KEY)readSnapshot();});
function frame(t){
  if(!document.hidden&&!reduced)time+=Math.min(.05,(t-last)/1000);last=t;
  hero.clearRect(0,0,440,330);hero.fillStyle='#dae4ce';hero.fillRect(0,0,440,330);
  for(let i=0;i<3;i++){
    const p={kind:['daisy','bellflower','amber'][i],growth:[.12,.7,1][i],wateredAt:0,waterUntil:0},b={x:85+i*135,y:182};
    hero.save();hero.translate(b.x,b.y);hero.scale(1.5,1.5);
    drawBed(hero,{x:0,y:0},p,time,gentle,now,false);drawBed(hero,{x:0,y:0},p,time,gentle,now);hero.restore();
    hero.fillStyle='#839273';hero.font='11px "Microsoft YaHei"';hero.textAlign='center';hero.fillText(['嫩芽','含苞','开花'][i],b.x,226);
  }
  if(free)drawSample(hero,free,'cat',290+Math.sin(time*.2)*26,286,{time,scale:.45});
  sample.clearRect(0,0,400,240);sample.save();sample.translate(200,172);sample.scale(2.2,2.2);
  drawBed(sample,{x:0,y:0},trial.plots.south,time,gentle,now,false);drawBed(sample,{x:0,y:0},trial.plots.south,time,gentle,now);sample.restore();
  requestAnimationFrame(frame);
}syncTrial();requestAnimationFrame(frame);

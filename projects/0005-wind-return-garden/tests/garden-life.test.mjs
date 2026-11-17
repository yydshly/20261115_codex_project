import test from 'node:test';
import assert from 'node:assert/strict';
import {BEDS,createGarden,plantSeed,waterPlant,advanceGarden,plantStage,readGardenSave,gardenPayload,loadGarden,BACKUP_KEY,petCat,PET_COOLDOWN} from '../web/js/garden-life.mjs';
import {SAVE_KEY} from '../web/js/state.mjs';
import {CatCompanion} from '../web/js/companion.mjs';
import {makeWalkable,findPath,riverX} from '../web/js/navigation.mjs';
import {TREE_LAYOUT} from '../web/js/scene.mjs';
import {GARDEN_PROPS} from '../web/js/free-assets.mjs';
const NOW=1800000000000;
const trees=TREE_LAYOUT.map(([kind,x,y,scale])=>({x,y,scale,rig:{kind}})),walk=makeWalkable(trees,GARDEN_PROPS);

test('one real watering grows a seed through visible stages and leaves a lasting flower',()=>{
  const g=createGarden(NOW);assert.equal(plantSeed(g,'south','daisy',NOW).ok,true);assert.equal(plantStage(g.plots.south),'嫩芽');
  assert.equal(waterPlant(g,'south',NOW).ok,true);assert.equal(plantStage(g.plots.south),'抽叶');
  advanceGarden(g,NOW+40000);assert.equal(plantStage(g.plots.south),'含苞');
  const blooms=advanceGarden(g,NOW+71000);assert.equal(blooms.length,1);assert.equal(plantStage(g.plots.south),'开花了');
  advanceGarden(g,NOW+86400000*20);assert.equal(g.plots.south.growth,1);assert.equal(g.journal.filter(e=>e.id==='bloom-south').length,1);
});
test('an untended seed waits safely, wet soil rejects repeated watering without rewards',()=>{
  const g=createGarden(NOW);g.atmosphere.weatherMode='clear';plantSeed(g,'south','amber',NOW);advanceGarden(g,NOW+86400000);
  assert.equal(g.plots.south.growth,.12);assert.equal(waterPlant(g,'south',NOW+86400000).ok,true);
  const before=g.plots.south.growth,entries=g.journal.length;
  assert.equal(waterPlant(g,'south',NOW+86400001).ok,false);assert.ok(g.plots.south.growth-before<.0001);assert.equal(g.journal.length,entries);
  assert.equal(plantSeed(g,'south','bellflower',NOW+86400002).ok,false);assert.equal(g.plots.south.kind,'amber');
});
test('a saved garden resumes plants, location, cat familiarity and memories after an offline interval',()=>{
  const g=createGarden(NOW);plantSeed(g,'brook','bellflower',NOW);waterPlant(g,'brook',NOW);g.cat.affection=3;g.cat.x=644;g.cat.y=468;
  const text=gardenPayload(g,new Set(['oak','stream']),false,{x:600,y:480,face:-1},NOW+1000);
  const storage={getItem:key=>key===SAVE_KEY?text:null};
  const loaded=loadGarden(storage,NOW+72000);
  assert.deepEqual(loaded.garden.completed,['oak','stream']);assert.equal(loaded.garden.player.x,600);assert.equal(loaded.garden.player.face,-1);
  assert.equal(loaded.garden.cat.affection,3);assert.equal(loaded.garden.cat.x,644);assert.equal(plantStage(loaded.garden.plots.brook),'开花了');
  assert.equal(loaded.blooms.length,1);assert.ok(loaded.garden.journal.some(e=>e.id==='plant-brook'));
});
test('legacy wind progress is preserved and the exact original is backed up once',()=>{
  const old=JSON.stringify({version:1,completed:['oak','stream','home'],ended:true}),map=new Map([[SAVE_KEY,old]]);
  const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
  const {garden:g}=loadGarden(storage,NOW);assert.equal(g.version,4);assert.deepEqual(g.completed,['oak','stream','home']);assert.equal(g.ended,true);assert.equal(g.cat.unlocked,true);
  assert.equal(map.get(SAVE_KEY),old);assert.equal(map.get(BACKUP_KEY),old);
  map.set(SAVE_KEY,'{broken');const restored=loadGarden(storage,NOW+100);assert.equal(restored.garden.completed.length,3);assert.match(restored.warning,/恢复/);assert.equal(map.get(BACKUP_KEY),old);
});
test('malformed or future fields are bounded without discarding valid parts of a garden',()=>{
  assert.equal(readGardenSave('{broken',NOW).completed.length,0);
  const g=createGarden(NOW);plantSeed(g,'south','daisy',NOW);g.completed=['oak','bad','oak'];g.player={x:Infinity,y:-100,face:-5};
  g.plots.south.growth=999;g.plots.south.waterUntil=NOW+1e12;g.plots.porch={kind:'evil',growth:1};g.cat.affection=999;
  const read=readGardenSave(JSON.stringify(g),NOW);assert.deepEqual(read.completed,['oak']);assert.equal(read.plots.south.growth,1);assert.equal(read.plots.porch.kind,null);
  assert.ok(read.plots.south.waterUntil<=NOW+180000);assert.equal(read.player.y,282);assert.equal(read.cat.affection,5);
});
test('petting requires proximity, has a gentle cooldown, and familiarity survives a reload',()=>{
  const g=createGarden(NOW);g.cat.unlocked=true;
  assert.equal(petCat(g,{x:50,y:300},NOW).ok,false);assert.equal(g.cat.affection,0);
  const near={x:g.cat.x,y:g.cat.y+15};assert.equal(petCat(g,near,NOW).ok,true);assert.equal(g.cat.mode,'affection');
  assert.equal(petCat(g,near,NOW+1).ok,false);assert.equal(g.cat.affection,1);
  assert.equal(petCat(g,near,NOW+PET_COOLDOWN+1).ok,true);assert.equal(g.cat.affection,2);
  const read=readGardenSave(gardenPayload(g,[],false,near,NOW+PET_COOLDOWN+2),NOW+PET_COOLDOWN+3);assert.equal(read.cat.affection,2);assert.ok(read.journal.some(e=>e.id==='cat-touch'));
});
test('all flower approaches are reachable and fit the existing creek collision rules',()=>{
  for(const b of BEDS){const goal={x:b.x,y:b.y+22};const path=findPath({x:370,y:530},goal,walk);assert.ok(path.length,b.id);assert.ok(path.every(p=>walk(p.x,p.y)));assert.ok(Math.hypot(path.at(-1).x-b.x,path.at(-1).y-b.y)<51);}
});
test('the production cat selects its own destinations and settles at the bench',()=>{
  const g=createGarden(NOW);g.cat.unlocked=true;
  const cat=new CatCompanion(g.cat,walk,()=>.65),player={x:370,y:530,moving:false};
  cat.choose(player,g.plots);assert.equal(g.cat.mode,'nap');assert.ok(cat.path.length);
  for(let i=0;i<120;i++){cat.update(.05,player,g.plots,NOW+i*50);assert.ok(walk(g.cat.x,g.cat.y));}
  assert.ok(Math.hypot(g.cat.x-392,g.cat.y-513)<15);assert.equal(g.cat.moving,false);
  plantSeed(g,'south','daisy',NOW);const observer=new CatCompanion(g.cat,walk,()=>.2);observer.choose(player,g.plots);assert.equal(g.cat.mode,'watch');assert.ok(observer.path.length);
});
test('the autonomous cat follows over the real bridge instead of crossing water',()=>{
  const g=createGarden(NOW);Object.assign(g.cat,{unlocked:true,x:610,y:465,affection:3});
  const cat=new CatCompanion(g.cat,walk,()=>.1),player={x:610,y:465,moving:true};cat.go('follow',player,60);
  const route=findPath(player,{x:215,y:414},walk);let crossed=false,t=0;
  for(const waypoint of route)for(let i=0;i<12;i++){
    const dx=waypoint.x-player.x,dy=waypoint.y-player.y,d=Math.hypot(dx,dy),step=Math.min(d,84/60);
    if(d){player.x+=dx/d*step;player.y+=dy/d*step;}
    t++;cat.update(1/60,player,g.plots,NOW+t*1000/60);assert.ok(walk(g.cat.x,g.cat.y));
    if(Math.abs(g.cat.x-riverX(g.cat.y))<39){crossed=true;assert.ok(g.cat.y>407&&g.cat.y<437);}
  }
  for(let i=0;i<300;i++)cat.update(1/60,player,g.plots,NOW+(t+i)*1000/60);
  assert.ok(crossed);assert.ok(Math.hypot(g.cat.x-player.x,g.cat.y-player.y)<36);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createAtmosphere,environmentAt,setAtmosphere,RAIN_START,RAIN_END,WEATHER_MS,rainSpans} from '../web/js/atmosphere.mjs';
import {createGarden,plantSeed,advanceGarden,readGardenSave,gardenPayload,loadGarden,LIFE_BACKUP_KEY} from '../web/js/garden-life.mjs';
import {HOME_ENTRY,HOUSE_DOOR,HOME_PLACES,HOME_CUSHION,homeWalkable} from '../web/js/home-model.mjs';
import {CatCompanion} from '../web/js/companion.mjs';
import {makeWalkable,findPath,riverX} from '../web/js/navigation.mjs';
import {TREE_LAYOUT} from '../web/js/scene.mjs';
import {GARDEN_PROPS} from '../web/js/free-assets.mjs';
import {SAVE_KEY} from '../web/js/state.mjs';
const NOW=1800000000000;
const trees=TREE_LAYOUT.map(([kind,x,y,scale])=>({x,y,scale,rig:{kind}})),walk=makeWalkable(trees,GARDEN_PROPS);

test('the shared clock distinguishes daylight and night, and a chosen time stays in place',()=>{
  const e=createAtmosphere(NOW);assert.equal(environmentAt(e,NOW).period,'午后');
  setAtmosphere(e,'time','night',NOW);assert.equal(environmentAt(e,NOW+9999999).night,1);
  setAtmosphere(e,'time','dawn',NOW+1000);assert.equal(environmentAt(e,NOW+1000).period,'清晨');assert.ok(environmentAt(e,NOW+1000).night<.5);
  setAtmosphere(e,'time','auto',NOW+2000);const before=environmentAt(e,NOW+2000).hour;
  assert.ok(Math.abs(environmentAt(e,NOW+47000).hour-before-1)<.001);
});
test('automatic weather and its rain integration use the same interval boundaries',()=>{
  const e=createAtmosphere(NOW);
  assert.equal(environmentAt(e,NOW+RAIN_START-1).weather,'cloudy');assert.equal(environmentAt(e,NOW+RAIN_START).rain,1);
  assert.equal(environmentAt(e,NOW+RAIN_END).rain,0);assert.equal(environmentAt(e,NOW+WEATHER_MS+RAIN_START).rain,1);
  assert.equal(rainSpans(e,NOW,NOW+RAIN_START).length,0);
  assert.ok(rainSpans(e,NOW+RAIN_END,NOW+RAIN_END+30000).length>0);
});
test('rain actually grows dry plants, without applying a newly chosen shower retroactively',()=>{
  const g=createGarden(NOW);g.atmosphere.weatherMode='clear';plantSeed(g,'south','daisy',NOW);
  advanceGarden(g,NOW+20000);assert.equal(g.plots.south.growth,.12);
  setAtmosphere(g.atmosphere,'weather','rain',NOW+20000);advanceGarden(g,NOW+50000);
  assert.ok(Math.abs(g.plots.south.growth-.42)<.001);assert.ok(g.plots.south.waterUntil>=NOW+230000);
  setAtmosphere(g.atmosphere,'weather','clear',NOW+50000);advanceGarden(g,NOW+120000);assert.equal(g.plots.south.growth,1);
});
test('offline rain and repeated small updates agree, and a long absence stays bounded',()=>{
  const a=createGarden(NOW),b=createGarden(NOW);plantSeed(a,'south','amber',NOW);plantSeed(b,'south','amber',NOW);
  for(let t=10000;t<=650000;t+=10000)advanceGarden(a,NOW+t);advanceGarden(b,NOW+650000);
  assert.equal(a.plots.south.growth,b.plots.south.growth);assert.equal(b.plots.south.growth,1);
  assert.ok(rainSpans(b.atmosphere,NOW,NOW+1e12).length<6);advanceGarden(b,NOW+1e12);assert.equal(b.plots.south.growth,1);
});
test('a seed planted into rain-moistened soil keeps that moisture without inventing earlier growth',()=>{
  const g=createGarden(NOW);setAtmosphere(g.atmosphere,'weather','rain',NOW);advanceGarden(g,NOW+10000);
  const until=g.plots.south.waterUntil;setAtmosphere(g.atmosphere,'weather','clear',NOW+10000);
  plantSeed(g,'south','daisy',NOW+10000);assert.equal(g.plots.south.growth,.12);assert.equal(g.plots.south.waterUntil,until);
  advanceGarden(g,NOW+30000);assert.ok(Math.abs(g.plots.south.growth-.32)<.001);
});
test('interior, lamp, weather and the cat room survive a reload along with the old garden',()=>{
  const g=createGarden(NOW);plantSeed(g,'brook','bellflower',NOW);g.cat.affection=3;g.cat.space='inside';g.cat.indoorX=HOME_CUSHION.x;g.cat.indoorY=HOME_CUSHION.y;
  Object.assign(g.home,{inside:true,lampOn:false,x:697,y:389});setAtmosphere(g.atmosphere,'time','night',NOW);setAtmosphere(g.atmosphere,'weather','rain',NOW);
  const read=readGardenSave(gardenPayload(g,['oak','stream','home'],true,{x:770,y:350,face:1},NOW),NOW+1000);
  assert.equal(read.home.inside,true);assert.equal(read.home.lampOn,false);assert.equal(read.home.x,697);assert.equal(read.cat.space,'inside');assert.equal(read.cat.affection,3);
  assert.equal(read.atmosphere.timeMode,'night');assert.equal(read.atmosphere.weatherMode,'rain');assert.equal(read.plots.brook.kind,'bellflower');assert.equal(read.completed.length,3);
});
test('version 2 is backed up exactly before adding rooms and climate, preserving flowers',()=>{
  const old=createGarden(NOW);old.version=2;plantSeed(old,'porch','amber',NOW);delete old.home;delete old.atmosphere;
  const text=JSON.stringify(old),map=new Map([[SAVE_KEY,text]]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
  const {garden:g}=loadGarden(storage,NOW+1000);assert.equal(g.version,4);assert.equal(g.plots.porch.kind,'amber');assert.equal(map.get(LIFE_BACKUP_KEY),text);assert.equal(map.get(SAVE_KEY),text);
  map.set(SAVE_KEY,'bad');assert.equal(loadGarden(storage,NOW+2000).garden.plots.porch.kind,'amber');
});
test('indoor targets are reachable, furniture and invalid coordinates remain blocked',()=>{
  assert.equal(homeWalkable(undefined,undefined),false);assert.equal(homeWalkable(200,300),false);assert.equal(homeWalkable(730,345),false);
  for(const place of [...HOME_PLACES,HOME_CUSHION]){const path=findPath(HOME_ENTRY,place,homeWalkable);assert.ok(path.length);assert.ok(path.every(p=>homeWalkable(p.x,p.y)));}
});
test('a shower sends the real cat over the bridge to the doorway before it enters',()=>{
  const g=createGarden(NOW);Object.assign(g.cat,{unlocked:true,x:395,y:540});
  const cat=new CatCompanion(g.cat,walk,()=>.5);let crossed=false,entered=false,last={x:g.cat.x,y:g.cat.y};
  for(let i=0;i<2400;i++){
    const event=cat.update(1/60,{x:500,y:500},g.plots,NOW+i*1000/60,{env:{rain:1,night:0},home:g.home});
    if(event==='entered'){entered=true;assert.ok(Math.hypot(g.cat.x-HOUSE_DOOR.x,g.cat.y-HOUSE_DOOR.y)<17);break;}
    assert.equal(g.cat.space,'outside');assert.ok(walk(g.cat.x,g.cat.y));assert.ok(Math.hypot(g.cat.x-last.x,g.cat.y-last.y)<=68/60+.001);last={x:g.cat.x,y:g.cat.y};
    if(Math.abs(g.cat.x-riverX(g.cat.y))<39){crossed=true;assert.ok(g.cat.y>407&&g.cat.y<437);}
  }
  assert.ok(crossed);assert.ok(entered);assert.equal(g.cat.space,'inside');
});
test('the cat settles inside at night, then leaves through the door when daylight returns',()=>{
  const g=createGarden(NOW);Object.assign(g.cat,{unlocked:true,space:'inside',indoorX:480,indoorY:510});
  const cat=new CatCompanion(g.cat,walk,()=>.5);
  for(let i=0;i<450;i++){cat.update(.05,{x:400,y:500},g.plots,NOW+i*50,{env:{night:1,rain:0},home:g.home});assert.equal(g.cat.space,'inside');assert.ok(homeWalkable(g.cat.indoorX,g.cat.indoorY));}
  assert.equal(g.cat.mode,'curl');assert.ok(Math.hypot(g.cat.indoorX-HOME_CUSHION.x,g.cat.indoorY-HOME_CUSHION.y)<15);
  let left=false;for(let i=0;i<1200;i++)if(cat.update(.05,{x:400,y:500},g.plots,NOW+30000+i*50,{env:{night:0,rain:0},home:g.home})==='left'){left=true;break;}
  assert.ok(left);assert.equal(g.cat.space,'outside');assert.ok(walk(g.cat.x,g.cat.y));
});

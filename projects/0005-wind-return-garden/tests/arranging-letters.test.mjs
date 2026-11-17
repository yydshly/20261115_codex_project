import test from 'node:test';
import assert from 'node:assert/strict';
import {createLayout,copyLayout,validateLayout,applyLayout,undoLayout,makeGardenWalkable,layoutTrees,catBenchSpots,benchApproach,distanceToPath,pathLines} from '../web/js/arrangement.mjs';
import {createGarden,readGardenSave,gardenPayload,loadGarden,LETTER_BACKUP_KEY} from '../web/js/garden-life.mjs';
import {readLetter,replyLetter,updateLetters,recordStoryEvent,readStory} from '../web/js/letters.mjs';
import {findPath} from '../web/js/navigation.mjs';
import {CatCompanion} from '../web/js/companion.mjs';
import {SAVE_KEY} from '../web/js/state.mjs';
const now=1800000000000;
const movePot=g=>{const d=copyLayout(g.layout);Object.assign(d.pots[0],{x:375,y:415});assert.ok(applyLayout(g,d).ok);updateLetters(g);};
test('default and a combined furnished layout keep every daily destination reachable',()=>{
 const l=createLayout();assert.ok(validateLayout(l).ok);l.bench={x:125,y:420};l.pots[0]={id:'clay',x:375,y:415};l.route='flowers';l.material='stone';assert.ok(validateLayout(l).ok);
 const w=makeGardenWalkable(layoutTrees(),l);assert.equal(w(125,411),false);assert.equal(w(375,415),false);assert.ok(findPath({x:370,y:550},benchApproach(l),w).length);
});
test('placement rejects water, blocked doors, flower beds, tree interiors and overlapping furniture',()=>{
 for(const p of [{x:522,y:500},{x:770,y:355},{x:665,y:493},{x:142,y:352},{x:366,y:491}]){const l=createLayout();Object.assign(l.pots[0],p);assert.equal(validateLayout(l).ok,false,JSON.stringify(p));}
 const l=createLayout();l.bench={x:320,y:390};assert.equal(validateLayout(l).ok,false,'a wide bench cannot contain the fixed well');
});
test('a candidate cannot be placed on an actor or cat, and failed placement is atomic',()=>{
 const g=createGarden(now),d=copyLayout(g.layout);d.pots[0].x=375;d.pots[0].y=415;const before=JSON.stringify(g.layout);
 assert.equal(applyLayout(g,d,[{x:375,y:415}]).ok,false);assert.equal(JSON.stringify(g.layout),before);
 assert.equal(applyLayout(g,d,[{x:800,y:550}]).ok,true);
});
test('undo restores geometry once while keeping evidence and delivered letters',()=>{
 const g=createGarden(now);readLetter(g,'welcome');replyLetter(g,'welcome','pot');const before=copyLayout(g.layout);movePot(g);assert.deepEqual(g.story.delivered,['welcome','place']);
 assert.ok(undoLayout(g).ok);assert.deepEqual(g.layout.pots,before.pots);assert.equal(g.layout.moves.pots,1);assert.equal(g.layout.previous,null);assert.equal(undoLayout(g).ok,false);updateLetters(g);assert.ok(g.story.delivered.includes('place'));
});
test('selected paths change real route costs while the bridge stays the only water crossing',()=>{
 const a=createLayout(),b=createLayout();b.route='brook';const wa=makeGardenWalkable(layoutTrees(),a),wb=makeGardenWalkable(layoutTrees(),b),start={x:600,y:424},goal={x:770,y:362};
 const pa=findPath(start,goal,wa),pb=findPath(start,goal,wb);assert.notDeepEqual(pa,pb);assert.ok(pb.some(p=>p.y>=516),'brook route takes a slower detour');
 const across=findPath({x:370,y:550},goal,wb);assert.ok(across.length);for(const p of across)assert.ok(wb(p.x,p.y));assert.ok(across.some(p=>p.x>=490&&p.x<=550&&p.y>407&&p.y<437));
 assert.ok(distanceToPath(600,520,pathLines(b))<distanceToPath(600,520,pathLines(a)));
});
test('the production cat walks to the moved bench rather than its old nap spot',()=>{
 const g=createGarden(now);g.layout.bench={x:125,y:420};Object.assign(g.cat,{unlocked:true,x:370,y:550,affection:0});const w=makeGardenWalkable(layoutTrees(),g.layout),cat=new CatCompanion(g.cat,w,()=>.66);cat.layout=g.layout;cat.choose({x:370,y:550,moving:false},{});
 assert.deepEqual(cat.target,catBenchSpots(g.layout).nap);
 for(let i=0;i<500;i++)cat.update(.05,{x:150,y:450,moving:false},{},now+i*50,{layout:g.layout,env:{},home:{}});
 assert.ok(Math.hypot(g.cat.x-catBenchSpots(g.layout).nap.x,g.cat.y-catBenchSpots(g.layout).nap.y)<18);
});
for(const branch of [['pot','flowers','bench'],['bench','brook','window']])test(`five letters follow actual actions for ${branch.join('/')}`,()=>{
 const [first,route,rest]=branch,g=createGarden(now);assert.equal(replyLetter(g,'welcome',first),false);assert.equal(readLetter(g,'afterword'),false);readLetter(g,'welcome');assert.ok(replyLetter(g,'welcome',first));assert.equal(replyLetter(g,'welcome',first==='pot'?'bench':'pot'),false);
 updateLetters(g);assert.deepEqual(g.story.delivered,['welcome']);const d=copyLayout(g.layout);if(first==='pot')Object.assign(d.pots[0],{x:375,y:415});else d.bench={x:125,y:420};assert.ok(applyLayout(g,d).ok);updateLetters(g);
 assert.ok(readLetter(g,'place'));assert.ok(replyLetter(g,'place',route));assert.equal(g.story.delivered.includes('path'),false);const r=copyLayout(g.layout);r.route=route;assert.ok(applyLayout(g,r).ok);updateLetters(g);
 assert.ok(readLetter(g,'path'));replyLetter(g,'path',rest);recordStoryEvent(g,rest==='bench'?'windowVisit':'benchRest');assert.equal(g.story.delivered.includes('light'),false);recordStoryEvent(g,rest==='bench'?'benchRest':'windowVisit');assert.ok(readLetter(g,'light'));replyLetter(g,'light','seat');assert.ok(readLetter(g,'afterword'));assert.equal(g.story.read.length,5);
 const restored=readGardenSave(gardenPayload(g,new Set(g.completed),false,g.player,now),now);assert.deepEqual(restored.story,g.story);assert.deepEqual(restored.layout,g.layout);
});
test('past actions count and delivered mail remains after changing route or undoing',()=>{
 const g=createGarden(now);movePot(g);recordStoryEvent(g,'windowVisit');readLetter(g,'welcome');replyLetter(g,'welcome','pot');readLetter(g,'place');replyLetter(g,'place','flowers');const d=copyLayout(g.layout);d.route='flowers';assert.ok(applyLayout(g,d).ok);updateLetters(g);readLetter(g,'path');replyLetter(g,'path','window');assert.ok(g.story.delivered.includes('light'));undoLayout(g);updateLetters(g);assert.ok(g.story.delivered.includes('light'));
});
test('version 3 is backed up byte for byte once and all earlier life survives migration',()=>{
 const g=createGarden(now);g.version=3;delete g.layout;delete g.story;g.completed=['oak','stream','home'];g.home.inside=true;g.home.lampOn=false;g.cat.affection=4;g.plots.south.kind='daisy';g.plots.south.growth=1;
 const text=JSON.stringify(g,null,2),map=new Map([[SAVE_KEY,text]]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};const loaded=loadGarden(storage,now).garden;
 assert.equal(loaded.version,4);assert.equal(map.get(LETTER_BACKUP_KEY),text);assert.equal(loaded.home.inside,true);assert.equal(loaded.home.lampOn,false);assert.equal(loaded.cat.affection,4);assert.equal(loaded.plots.south.growth,1);assert.deepEqual(loaded.completed,g.completed);assert.equal(loaded.story.read.length,0);
 storage.setItem(SAVE_KEY,'broken');assert.equal(loadGarden(storage,now).garden.plots.south.kind,'daisy');assert.equal(map.get(LETTER_BACKUP_KEY),text);
});
test('damaged new fields recover independently and cannot jump the story chain',()=>{
 const g=createGarden(now);g.home.inside=true;g.cat.affection=3;const raw=JSON.parse(gardenPayload(g,new Set(['oak']),false,g.player,now));raw.layout.route='toString';raw.story={delivered:['welcome','afterword'],read:['welcome','afterword'],replies:{welcome:'invalid',light:'seat'}};const loaded=readGardenSave(JSON.stringify(raw),now);
 assert.equal(loaded.home.inside,true);assert.equal(loaded.cat.affection,3);assert.deepEqual(loaded.layout,createLayout());assert.deepEqual(loaded.story.read,['welcome']);assert.equal(loaded.story.replies.light,undefined);
 assert.deepEqual(readStory({delivered:{includes:false},read:8},g),{...g.story});
});

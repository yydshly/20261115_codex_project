import test from 'node:test';
import assert from 'node:assert/strict';
import {readVisitEntry,visitStorage,applyVisitEntry,createVisitGarden} from '../web/js/visit-garden.mjs';
import {homeWalkable,nearestHomePlace} from '../web/js/home-model.mjs';

test('the homepage starts a visit, and only an explicit personal entry uses a long-term garden',()=>{
 assert.deepEqual(readVisitEntry(''),{preview:true,space:'outside'});
 assert.deepEqual(readVisitEntry('?visit=preview&space=inside'),{preview:true,space:'inside'});
 assert.deepEqual(readVisitEntry('?space=unknown'),{preview:true,space:'outside'});
 assert.deepEqual(readVisitEntry('?visit=home&space=inside'),{preview:false,space:null});
});
test('a demonstration never even reads the personal storage getter',()=>{
 const session={};let personalReads=0;
 const host={sessionStorage:session,get localStorage(){personalReads++;throw Error('personal garden must not be accessed');}};
 assert.equal(visitStorage(readVisitEntry(''),host),session);assert.equal(personalReads,0);
 const personal={};assert.equal(visitStorage(readVisitEntry('?visit=home'),{localStorage:personal,get sessionStorage(){throw Error('wrong store');}}),personal);
});
test('a room shortcut starts on a walkable spot with an immediately usable hearth and visible cat',()=>{
 const g=createVisitGarden(1000),before=structuredClone({plots:g.plots,layout:g.layout,story:g.story,atmosphere:g.atmosphere,completed:g.completed});
 assert.equal(applyVisitEntry(g,readVisitEntry('?space=inside')),true);
 assert.equal(g.home.inside,true);assert.ok(homeWalkable(g.home.x,g.home.y));assert.equal(nearestHomePlace(g.home).id,'hearth');
 assert.equal(g.cat.space,'inside');assert.ok(homeWalkable(g.cat.indoorX,g.cat.indoorY));assert.ok(Math.hypot(g.home.x-g.cat.indoorX,g.home.y-g.cat.indoorY)<45);
 assert.deepEqual({plots:g.plots,layout:g.layout,story:g.story,atmosphere:g.atmosphere,completed:g.completed},before);
});
test('switching back to the courtyard preserves care, weather, layout and letter choices',()=>{
 const g=createVisitGarden(1000);g.story.read=['arrival'];g.layout.route='brook';
 applyVisitEntry(g,readVisitEntry('?space=inside'));const before=structuredClone({plots:g.plots,layout:g.layout,story:g.story,atmosphere:g.atmosphere});
 applyVisitEntry(g,readVisitEntry('?space=outside'));
 assert.equal(g.home.inside,false);assert.equal(g.cat.space,'outside');assert.deepEqual(g.player,{x:370,y:530,face:1});
 assert.deepEqual({plots:g.plots,layout:g.layout,story:g.story,atmosphere:g.atmosphere},before);
});
test('scene parameters cannot relocate or alter a personal saved garden',()=>{
 const g=createVisitGarden(1000);g.home.inside=true;g.home.x=600;g.layout.route='flowers';
 const original=structuredClone(g);
 assert.equal(applyVisitEntry(g,readVisitEntry('?visit=home&space=outside')),false);
 assert.deepEqual(g,original);
});

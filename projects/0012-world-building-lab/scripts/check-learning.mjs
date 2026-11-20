import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {regions} from '../web/world-layout.js';
import {observationFor,notebookMarkdown} from '../web/journey-learning.js';

const points=regions.flatMap((r,index)=>[0,1,2].map(stage=>observationFor(index,stage)));
assert.equal(points.length,30);assert.equal(new Set(points.map(p=>p.id)).size,30);
for(const p of points){assert.ok([p.x,p.z,p.height].every(Number.isFinite));for(const key of ['prompt','reuse','explanation'])assert.ok(p[key].length>15,`${p.id}: incomplete ${key}`);}
assert.equal(observationFor(-1,0),null);
assert.ok(Math.abs(observationFor(0,0).height-.35)<.65,'Coast observation should point near the shoreline');
for(const index of [0,9])assert.ok(Math.abs(observationFor(index,1).height-3.9)<.8,'Coastal surface observation should straddle sand and grass');
assert.ok(Math.abs(observationFor(8,1).height-35)<1,'Snow-line observation should point at the coverage boundary');
const farm=observationFor(1,1),hill=regions[1];
for(const [dx,dz] of [[13,10],[23,18],[13,26]])assert.ok(Math.hypot(farm.x-hill.x-dx,farm.z-hill.z-dz)>12,'Farm surface observation must not sit inside a farmhouse');
const recorded=new Set(['coast:2','valley:0']),markdown=notebookMarkdown(recorded);
assert.equal((markdown.match(/^### /gm)||[]).length,30);
assert.equal((markdown.match(/✓ 已浏览/g)||[]).length,2);
assert.equal((markdown.match(/○ 待观察/g)||[]).length,28);
for(const r of regions)assert.ok(markdown.includes(r.name));
assert.equal((markdown.match(/对我们的参考价值：/g)||[]).length,30);
let actualExport=false;
if(process.argv[2]){const actual=readFileSync(process.argv[2],'utf8').replace(/^\ufeff/,'');assert.ok(actual===notebookMarkdown(new Set(['coast:2'])),'Actual browser download differs from the one-record notebook');actualExport=true;}
console.log(JSON.stringify({result:'passed',observationPoints:points.length,referenceMethods:30,markdownSections:30,browserExportVerified:actualExport},null,2));

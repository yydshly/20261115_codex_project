import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {vegetationStops as waterStops,vegetationObservation as waterObservation,vegetationNotebook as waterNotebook} from '../web/vegetation-learning.js';
const file=process.argv[2];if(!file)throw new Error('Pass the actual browser-downloaded Markdown path as the first argument.');
const data=readFileSync(file),ids=new Set(waterStops.flatMap(r=>[0,1,2].map(s=>waterObservation(r.index,s).id))),text=data.toString('utf8').replace(/^\uFEFF/,'');assert.equal(text,waterNotebook(ids));
const proof={result:'passed',actualBrowserDownload:true,observations:18,recorded:(text.match(/✓ 已浏览/g)||[]).length,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length};writeFileSync(new URL('../assets/vegetation-notes-export-check.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));

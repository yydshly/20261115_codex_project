import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const baseline=JSON.parse(await readFile(new URL('./preserved-model-version.json',import.meta.url),'utf8'));
for(const [name,hash]of Object.entries(baseline)){
  const data=await readFile(new URL('../model-version/'+name,import.meta.url));
  assert.equal(createHash('sha256').update(data).digest('hex'),hash,'Existing model edition changed: '+name);
}
console.log('Preserved existing model edition: '+Object.keys(baseline).length+' root files unchanged');

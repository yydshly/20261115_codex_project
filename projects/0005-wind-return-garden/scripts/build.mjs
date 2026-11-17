import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),web=join(root,'web'),publication=process.argv.includes('--publication'),out=publication?join(root,'dist'):join(web,'dist');
const manifest=JSON.parse(await readFile(join(web,'assets/trees/manifest.json'),'utf8'));
await mkdir(out,{recursive:true});
for(const file of ['index.html','demo-home.css','overview.html','overview.css','design.html','design.css','lab.html','understanding.html','assets.html','life.html','shelter.html','arranging.html','arranging.css','style.css','understanding.css','materials.css','life.css','shelter.css','js'])await cp(join(web,file),join(out,file),{recursive:true});
await cp(join(web,'assets/free-samples'),join(out,'assets/free-samples'),{recursive:true});
if(publication){
  await mkdir(join(out,'assets/journal'),{recursive:true});
  for(const name of ['garden-scene.jpg','arranging-story-scene.jpg','home-night-scene.jpg','garden-night-rain.jpg','lab-layered-live.jpg','understanding-overview-v1.png','understanding-overview-v1.svg','understanding-research-map-v2-public.png','understanding-research-map-v2-public.svg'])await cp(join(web,'assets/journal',name),join(out,'assets/journal',name));
}else await cp(join(web,'assets/journal'),join(out,'assets/journal'),{recursive:true});
await mkdir(join(out,'assets/local-source'),{recursive:true});
for(const name of ['oak-diagram.png','pine-diagram.png'])await cp(join(web,'assets/local-source',name),join(out,'assets/local-source',name));
await mkdir(join(out,'assets/trees'),{recursive:true});
await cp(join(web,'assets/trees/manifest.json'),join(out,'assets/trees/manifest.json'));
for(const {file} of manifest.files)await cp(join(web,'assets/trees',file),join(out,'assets/trees',file));
await cp(join(root,'THIRD_PARTY_NOTICES.md'),join(out,'THIRD_PARTY_NOTICES.md'));
if(publication){
  for(const name of ['understanding-research-map-v2-public.png','understanding-research-map-v2-public.svg','understanding-research-map-v2-public.json'])await cp(join(root,'assets',name),join(out,'assets',name));
}
await writeFile(join(out,'RESEARCH-NOTICE.txt'),'Research presentation and playable prototype. Third-party material retains its source/license; no standalone asset pack or third-party relicensing. See THIRD_PARTY_NOTICES.md. AI residents and target modes are not implemented.\n');
console.log(`Built ${publication?'publication':'local'} research: ${out} (${manifest.files.length} source-derived PNG assets; relative URLs).`);

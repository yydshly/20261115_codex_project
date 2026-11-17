import { mkdir, copyFile, readFile, writeFile, access, cp } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url)),out=resolve(root,'dist'),engine=resolve(root,'../node_modules/three');
await mkdir(out,{recursive:true});
const files=['index.html','credits.html','style.css','main.js','landscape.js','terrain.js','timber.js','ground.js','fine-grass.js','path-layout.js','courtyard-path.js','planting-plan.js','contact-shadows.js','lighting.js','mountains.js','stream.js','reflection-budget.js','woodland.js','valley-woodland.js','valley-vegetation.js','nature.js','cottage.js','interior.js','vegetation.js','model-assets.js'];
files.push('surface-field.js','valley-geology.js','stream-profile.js','valley-life.js','character-shadows.js','glass-budget.js','foot-grounding.js','cattle-behavior.js','cattle-attention.js','cattle-grounding.js','meadow-field.js','stream-flow.js','stream-motion.js','cattle-roaming.js','cattle-mouth.js','motion-review.js','cattle-gait.js');
files.push('ambience.js','garden-moments.js');
files.push('garden-wildlife.js');
files.push('wildlife-shapes.js','wildlife-surfaces.js');
files.push('wind-field.js','footsteps.js');
files.push('actor-footsteps.js');
for(const name of files){
  let source=await readFile(resolve(root,name),'utf8');
  if(name==='index.html')source=source.replaceAll('../node_modules/three/','./node_modules/three/');
  if(name==='nature.js')source=source.replaceAll('../assets/materials/','./assets/materials/');
  await writeFile(resolve(out,name),source);
}
await cp(resolve(root,'../assets/materials'),resolve(out,'assets/materials'),{recursive:true});
await copyFile(resolve(root,'../assets/materials/SOURCES.md'),resolve(out,'assets/materials/SHARED-SOURCES.md'));
await cp(resolve(root,'assets'),resolve(out,'assets'),{recursive:true});
for(const name of ['three.module.js','three.core.js']){
  await mkdir(resolve(out,'node_modules/three/build'),{recursive:true});
  await copyFile(resolve(engine,'build',name),resolve(out,'node_modules/three/build',name));
}
for(const name of ['objects/Water.js','utils/BufferGeometryUtils.js','geometries/RoundedBoxGeometry.js','loaders/HDRLoader.js','loaders/GLTFLoader.js']){
  await mkdir(dirname(resolve(out,'node_modules/three/examples/jsm',name)),{recursive:true});
  await copyFile(resolve(engine,'examples/jsm',name),resolve(out,'node_modules/three/examples/jsm',name));
}
await copyFile(resolve(engine,'LICENSE'),resolve(out,'node_modules/three/LICENSE'));
for(const file of files.filter(name=>name.endsWith('.js'))){
  for(const match of (await readFile(resolve(out,file),'utf8')).matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))await access(resolve(out,match[1]));
}
console.log('Model edition built independently in model-version/dist/; original build and assets were not changed.');
